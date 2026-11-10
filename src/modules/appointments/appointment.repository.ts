import { database } from "../../config/database.js";
import type { ObjectId } from "mongodb";
import type { AppointmentStatus } from "./appointment.schema.js";

export interface Appointment {
  _id: ObjectId;
  patientId: ObjectId;
  doctorId: ObjectId;
  appointmentAt?: Date;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const appointments = database.collection<Appointment>("appointments");
