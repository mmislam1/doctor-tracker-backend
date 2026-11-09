import { ObjectId, type Filter } from "mongodb";
import { HttpError } from "../../middleware/error.middleware.js";
import { applyDateRange, escapeTextSearch, paginationMeta, paginationOptions, doctorListQuerySchema } from "../common/query.js";
import { doctors, insertDoctor, type Doctor } from "./doctor.repository.js";
import type { CreateDoctorInput } from "./doctor.schema.js";
import type { z } from "zod";

export type DoctorListQuery = z.infer<typeof doctorListQuerySchema>;

export async function createDoctor(input: CreateDoctorInput): Promise<Doctor> {
  const existing = await doctors.findOne({ email: input.email }, { projection: { _id: 1 } });
  if (existing) throw new HttpError(409, "DOCTOR_EMAIL_EXISTS", "A doctor with this email already exists");
  try {
    return await insertDoctor(input);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new HttpError(409, "DOCTOR_EMAIL_EXISTS", "A doctor with this email already exists");
    }
    throw error;
  }
}

export async function listDoctors(query: DoctorListQuery) {
  let filter: Filter<Doctor> = {};
  if (query.search) filter = { ...filter, $text: { $search: escapeTextSearch(query.search) } };
  if (query.specialization) filter.specialization = query.specialization;
  if (query.hospital) filter.hospital = query.hospital;
  filter = applyDateRange(filter, query.from, query.to);

  const [items, total] = await Promise.all([
    doctors.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(paginationOptions(query).skip).limit(query.pageSize).toArray(),
    doctors.countDocuments(filter),
  ]);
  return { items, pagination: paginationMeta(query.page, query.pageSize, total) };
}

export async function doctorExists(doctorId: ObjectId): Promise<boolean> {
  return (await doctors.findOne({ _id: doctorId }, { projection: { _id: 1 } })) !== null;
}
