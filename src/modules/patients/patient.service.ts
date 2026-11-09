import { ObjectId, type Filter } from "mongodb";
import { HttpError } from "../../middleware/error.middleware.js";
import { applyDateRange, escapeTextSearch, paginationMeta, paginationOptions, patientListQuerySchema } from "../common/query.js";
import { doctorExists } from "../doctors/doctor.service.js";
import { patients, type Patient } from "./patient.repository.js";
import type { CreatePatientInput, UpdatePatientInput } from "./patient.schema.js";
import type { z } from "zod";

export type PatientListQuery = z.infer<typeof patientListQuerySchema>;

export async function createPatient(doctorId: ObjectId, input: CreatePatientInput): Promise<Patient> {
  if (!(await doctorExists(doctorId))) throw new HttpError(404, "DOCTOR_NOT_FOUND", "Doctor was not found");
  const now = new Date();
  const patient: Patient = { _id: new ObjectId(), doctorId, ...input, createdAt: now, updatedAt: now };
  await patients.insertOne(patient);
  return patient;
}

function patientFilter(query: PatientListQuery, doctorId?: ObjectId): Filter<Patient> {
  let filter: Filter<Patient> = {};
  if (doctorId) filter.doctorId = doctorId;
  else if (query.doctorId) filter.doctorId = new ObjectId(query.doctorId);
  if (query.condition) filter.condition = query.condition;
  if (query.search) filter = { ...filter, $text: { $search: escapeTextSearch(query.search) } };
  return applyDateRange(filter, query.from, query.to);
}

export async function listPatients(query: PatientListQuery, doctorId?: ObjectId) {
  const filter = patientFilter(query, doctorId);
  const [items, total] = await Promise.all([
    patients.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(paginationOptions(query).skip).limit(query.pageSize).toArray(),
    patients.countDocuments(filter),
  ]);
  return { items, pagination: paginationMeta(query.page, query.pageSize, total) };
}

export async function updatePatient(patientId: ObjectId, input: UpdatePatientInput): Promise<Patient> {
  const updated = await patients.findOneAndUpdate(
    { _id: patientId },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) throw new HttpError(404, "PATIENT_NOT_FOUND", "Patient was not found");
  return updated;
}

export async function deletePatient(patientId: ObjectId): Promise<void> {
  const result = await patients.deleteOne({ _id: patientId });
  if (result.deletedCount === 0) throw new HttpError(404, "PATIENT_NOT_FOUND", "Patient was not found");
}
