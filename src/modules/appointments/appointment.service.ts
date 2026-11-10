import { ObjectId, type Filter } from "mongodb";
import { HttpError } from "../../middleware/error.middleware.js";
import { doctorExists } from "../doctors/doctor.service.js";
import { patients } from "../patients/patient.repository.js";
import { appointments, type Appointment } from "./appointment.repository.js";
import type { CreateAppointmentInput, UpdateAppointmentInput } from "./appointment.schema.js";

export async function createPatientAppointment(patientId: ObjectId, input: CreateAppointmentInput): Promise<Appointment> {
  if (!(await patients.findOne({ _id: patientId }, { projection: { _id: 1 } }))) {
    throw new HttpError(404, "PATIENT_NOT_FOUND", "Patient was not found");
  }
  const doctorId = new ObjectId(input.doctorId);
  if (!(await doctorExists(doctorId))) throw new HttpError(404, "DOCTOR_NOT_FOUND", "Doctor was not found");

  const now = new Date();
  const appointment: Appointment = {
    _id: new ObjectId(),
    patientId,
    doctorId,
    appointmentAt: input.appointmentAt,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };
  await appointments.insertOne(appointment);
  await patients.updateOne({ _id: patientId }, { $set: { updatedAt: now } });
  return appointment;
}

export async function listPatientAppointments(patientIds: ObjectId[], filter: Pick<Filter<Appointment>, "doctorId" | "status"> = {}): Promise<Appointment[]> {
  if (patientIds.length === 0) return [];
  return appointments.find({ patientId: { $in: patientIds }, ...filter })
    .sort({ appointmentAt: 1, createdAt: 1, _id: 1 })
    .toArray();
}

export async function updatePatientAppointment(patientId: ObjectId, appointmentId: ObjectId, input: UpdateAppointmentInput): Promise<Appointment> {
  const now = new Date();
  const updated = await appointments.findOneAndUpdate(
    { _id: appointmentId, patientId },
    { $set: { ...input, updatedAt: now } },
    { returnDocument: "after" },
  );
  if (!updated) throw new HttpError(404, "APPOINTMENT_NOT_FOUND", "Appointment was not found for this patient");
  await patients.updateOne({ _id: patientId }, { $set: { updatedAt: now } });
  return updated;
}

export async function deletePatientAppointments(patientId: ObjectId): Promise<void> {
  await appointments.deleteMany({ patientId });
}
