import { ObjectId } from "mongodb";
import { database } from "../../config/database.js";
import type { CreateDoctorInput } from "./doctor.schema.js";

export interface Doctor {
  _id: import("mongodb").ObjectId;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export const doctors = database.collection<Doctor>("doctors");

export async function insertDoctor(input: CreateDoctorInput): Promise<Doctor> {
  const now = new Date();
  const doctor: Doctor = { _id: new ObjectId(), ...input, createdAt: now, updatedAt: now };
  await doctors.insertOne(doctor);
  return doctor;
}
