import { ObjectId, type Filter } from "mongodb";
import { HttpError } from "../../middleware/error.middleware.js";
import { applyDateRange, escapeTextSearch, paginationMeta, paginationOptions, patientListQuerySchema } from "../common/query.js";
import { appointments, type Appointment } from "../appointments/appointment.repository.js";
import { createPatientAppointment, deletePatientAppointments, listPatientAppointments } from "../appointments/appointment.service.js";
import { doctorExists } from "../doctors/doctor.service.js";
import { patients, type Patient } from "./patient.repository.js";
import type { CreatePatientInput, UpdatePatientInput } from "./patient.schema.js";
import type { z } from "zod";

export type PatientListQuery = z.infer<typeof patientListQuerySchema>;
export type PatientWithAppointments = Patient & { appointments: Appointment[] };

export async function createPatient(input: CreatePatientInput): Promise<PatientWithAppointments> {
  const doctorId = new ObjectId(input.doctorId);
  if (!(await doctorExists(doctorId))) throw new HttpError(404, "DOCTOR_NOT_FOUND", "Doctor was not found");

  const now = new Date();
  const patient: Patient = {
    _id: new ObjectId(),
    name: input.name,
    condition: input.condition,
    createdAt: now,
    updatedAt: now,
  };
  await patients.insertOne(patient);

  try {
    const appointment = await createPatientAppointment(patient._id, {
      doctorId: doctorId.toHexString(),
      appointmentAt: input.appointmentAt,
      status: input.status,
    });
    return { ...patient, appointments: [appointment] };
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
  const visits = await listPatientAppointments(patientIds, visitsFilter);
  const visitsByPatient = new Map<string, Appointment[]>();
  for (const visit of visits) {
    const key = visit.patientId.toHexString();
    const group = visitsByPatient.get(key) ?? [];
    group.push(visit);
    visitsByPatient.set(key, group);
  }

  return {
    items: items.map((patient) => ({ ...patient, appointments: visitsByPatient.get(patient._id.toHexString()) ?? [] })),
    pagination: paginationMeta(query.page, query.pageSize, total),
  };
}

export async function getPatientWithAppointments(patientId: ObjectId): Promise<PatientWithAppointments | null> {
  const patient = await patients.findOne({ _id: patientId });
  if (!patient) return null;
  const visits = await listPatientAppointments([patientId]);
  return { ...patient, appointments: visits };
}

export async function updatePatient(patientId: ObjectId, input: UpdatePatientInput): Promise<PatientWithAppointments> {
  const updated = await patients.findOneAndUpdate(
    { _id: patientId },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
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
