import { ObjectId, type Filter } from "mongodb";
import { HttpError } from "../../middleware/error.middleware.js";
import { applyDateRange, escapeTextSearch, paginationMeta, paginationOptions, patientListQuerySchema } from "../common/query.js";
import { appointments, type Appointment } from "../appointments/appointment.repository.js";
import { createPatientAppointment, deletePatientAppointments, includeDoctorDetails, listPatientAppointments, type AppointmentWithDoctorDetails } from "../appointments/appointment.service.js";
import { doctorExists } from "../doctors/doctor.service.js";
import { patients, type Patient } from "./patient.repository.js";
import type { CreatePatientInput, UpdatePatientInput } from "./patient.schema.js";
import type { z } from "zod";

export type PatientListQuery = z.infer<typeof patientListQuerySchema>;
export type PatientWithAppointments = Patient & { appointments: AppointmentWithDoctorDetails[] };
export type PatientListItem = Patient & { appointments: AppointmentWithDoctorDetails[]; upcomingAppointmentCount: number };

function isDuplicatePhoneError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

function throwPhoneConflict(error: unknown): never {
  if (isDuplicatePhoneError(error)) {
    throw new HttpError(409, "PATIENT_PHONE_EXISTS", "A patient with this phone number already exists");
  }
  throw error;
}

async function ensurePhoneAvailable(phone: string | undefined, patientId?: ObjectId): Promise<void> {
  if (!phone) return;
  const filter: Filter<Patient> = { phone };
  if (patientId) filter._id = { $ne: patientId };
  if (await patients.findOne(filter, { projection: { _id: 1 } })) {
    throw new HttpError(409, "PATIENT_PHONE_EXISTS", "A patient with this phone number already exists");
  }
}

export async function createPatient(input: CreatePatientInput): Promise<PatientWithAppointments> {
  const doctorId = new ObjectId(input.doctorId);
  if (!(await doctorExists(doctorId))) throw new HttpError(404, "DOCTOR_NOT_FOUND", "Doctor was not found");
  await ensurePhoneAvailable(input.phone);

  const now = new Date();
  const patient: Patient = {
    _id: new ObjectId(),
    name: input.name,
    condition: input.condition,
    ...(input.phone ? { phone: input.phone } : {}),
    createdAt: now,
    updatedAt: now,
  };
  try {
    await patients.insertOne(patient);
  } catch (error) {
    throwPhoneConflict(error);
  }

  try {
    const appointment = await createPatientAppointment(patient._id, {
      doctorId: doctorId.toHexString(),
      appointmentAt: input.appointmentAt,
      status: input.status,
    });
    return { ...patient, appointments: await includeDoctorDetails([appointment]) };
  } catch (error) {
    await deletePatientAppointments(patient._id).catch(() => undefined);
    await patients.deleteOne({ _id: patient._id }).catch(() => undefined);
    throw error;
  }
}

function appointmentFilter(query: PatientListQuery, doctorId?: ObjectId): Pick<Filter<Appointment>, "doctorId" | "status"> {
  const filter: Pick<Filter<Appointment>, "doctorId" | "status"> = {};
  if (doctorId) filter.doctorId = doctorId;
  else if (query.doctorId) filter.doctorId = new ObjectId(query.doctorId);
  if (query.status) filter.status = query.status;
  return filter;
}

function profileFilter(query: PatientListQuery): Filter<Patient> {
  let filter: Filter<Patient> = {};
  if (query.search) filter = { ...filter, $text: { $search: escapeTextSearch(query.search) } };
  if (query.condition) filter.condition = query.condition;
  return applyDateRange(filter, query.from, query.to);
}

export async function listPatients(query: PatientListQuery, doctorId?: ObjectId) {
  const filter = profileFilter(query);
  const visitsFilter = appointmentFilter(query, doctorId);
  if (Object.keys(visitsFilter).length > 0) {
    const matchingPatientIds = await appointments.distinct("patientId", visitsFilter) as ObjectId[];
    filter._id = { $in: matchingPatientIds };
  }

  const [items, total] = await Promise.all([
    patients.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(paginationOptions(query).skip).limit(query.pageSize).toArray(),
    patients.countDocuments(filter),
  ]);
  const patientIds = items.map(({ _id }) => _id);
  const upcomingSummaries = patientIds.length === 0 ? [] : await appointments.aggregate<{
    _id: ObjectId;
    count: number;
    next: Appointment;
  }>([
    { $match: {
      patientId: { $in: patientIds },
      ...(doctorId ? { doctorId } : {}),
      status: { $in: ["upcoming", "rescheduled"] },
      appointmentAt: { $gte: new Date() },
    } },
    { $sort: { appointmentAt: 1, createdAt: 1, _id: 1 } },
    { $group: { _id: "$patientId", count: { $sum: 1 }, next: { $first: "$$ROOT" } } },
  ]).toArray();
  const upcomingCounts = new Map(upcomingSummaries.map(({ _id, count }) => [_id.toHexString(), count]));
  const closestVisits = await includeDoctorDetails(upcomingSummaries.map(({ next }) => next));
  const closestVisitByPatientWithDoctor = new Map(closestVisits.map((visit) => [visit.patientId.toHexString(), visit]));

  return {
    items: items.map((patient): PatientListItem => {
      const patientKey = patient._id.toHexString();
      const closestVisit = closestVisitByPatientWithDoctor.get(patientKey);
      return {
        ...patient,
        appointments: closestVisit ? [closestVisit] : [],
        upcomingAppointmentCount: upcomingCounts.get(patientKey) ?? 0,
      };
    }),
    pagination: paginationMeta(query.page, query.pageSize, total),
  };
}

export async function listPatientAppointmentPage(patientId: ObjectId, page: number, pageSize: number) {
  if (!(await patients.findOne({ _id: patientId }, { projection: { _id: 1 } }))) {
    throw new HttpError(404, "PATIENT_NOT_FOUND", "Patient was not found");
  }
  const [items, total] = await Promise.all([
    appointments.find({ patientId })
      .sort({ appointmentAt: 1, createdAt: 1, _id: 1 })
      .skip(paginationOptions({ page, pageSize }).skip)
      .limit(pageSize)
      .toArray(),
    appointments.countDocuments({ patientId }),
  ]);
  return {
    items: await includeDoctorDetails(items),
    pagination: paginationMeta(page, pageSize, total),
  };
}

export async function getPatientWithAppointments(patientId: ObjectId): Promise<PatientWithAppointments | null> {
  const patient = await patients.findOne({ _id: patientId });
  if (!patient) return null;
  const visits = await includeDoctorDetails(await listPatientAppointments([patientId]));
  return { ...patient, appointments: visits };
}

export async function updatePatient(patientId: ObjectId, input: UpdatePatientInput): Promise<PatientWithAppointments> {
  await ensurePhoneAvailable(input.phone, patientId);
  const { phone, ...profile } = input;
  const update: { $set: Record<string, unknown>; $unset?: Record<string, ""> } = {
    $set: { ...profile, updatedAt: new Date() },
  };
  if (phone === "") update.$unset = { phone: "" };
  else if (phone !== undefined) update.$set.phone = phone;

  let updated: Patient | null;
  try {
    updated = await patients.findOneAndUpdate(
      { _id: patientId },
      update,
      { returnDocument: "after" },
    );
  } catch (error) {
    throwPhoneConflict(error);
  }
  if (!updated) throw new HttpError(404, "PATIENT_NOT_FOUND", "Patient was not found");
  return (await getPatientWithAppointments(patientId))!;
}

export async function deletePatient(patientId: ObjectId): Promise<void> {
  if (!(await patients.findOne({ _id: patientId }, { projection: { _id: 1 } }))) {
    throw new HttpError(404, "PATIENT_NOT_FOUND", "Patient was not found");
  }
  await deletePatientAppointments(patientId);
  await patients.deleteOne({ _id: patientId });
}
