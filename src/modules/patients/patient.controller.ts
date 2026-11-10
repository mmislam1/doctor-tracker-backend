import type { RequestHandler } from "express";
import { createAppointmentSchema, updateAppointmentSchema } from "../appointments/appointment.schema.js";
import { createPatientSchema, updatePatientSchema } from "./patient.schema.js";
import { createPatient, deletePatient, listPatients, updatePatient } from "./patient.service.js";
import { createPatientAppointment, updatePatientAppointment } from "../appointments/appointment.service.js";
import { doctorExists } from "../doctors/doctor.service.js";
import { doctorIdSchema, patientAppointmentIdSchema, patientIdSchema, parseObjectId, patientListQuerySchema } from "../common/query.js";

export const getDoctorPatients: RequestHandler = async (req, res) => {
  const { doctorId } = doctorIdSchema.parse(req.params);
  const doctorObjectId = parseObjectId(doctorId);
  if (!(await doctorExists(doctorObjectId))) {
    res.status(404).json({ error: { code: "DOCTOR_NOT_FOUND", message: "Doctor was not found" } });
    return;
  }
  const query = patientListQuerySchema.parse(req.query);
  const result = await listPatients(query, doctorObjectId);
  res.json({ data: result.items, pagination: result.pagination });
};

export const postDoctorPatient: RequestHandler = async (req, res) => {
  const { doctorId } = doctorIdSchema.parse(req.params);
  const input = createPatientSchema.omit({ doctorId: true }).parse(req.body);
  const patient = await createPatient({ ...input, doctorId });
  res.status(201).json({ data: patient });
};

export const postPatient: RequestHandler = async (req, res) => {
  const input = createPatientSchema.parse(req.body);
  const patient = await createPatient(input);
  res.status(201).json({ data: patient });
};

export const postPatientAppointment: RequestHandler = async (req, res) => {
  const { patientId } = patientIdSchema.parse(req.params);
  const input = createAppointmentSchema.parse(req.body);
  const appointment = await createPatientAppointment(parseObjectId(patientId), input);
  res.status(201).json({ data: appointment });
};

export const patchPatientAppointment: RequestHandler = async (req, res) => {
  const { patientId, appointmentId } = patientAppointmentIdSchema.parse(req.params);
  const input = updateAppointmentSchema.parse(req.body);
  const appointment = await updatePatientAppointment(parseObjectId(patientId), parseObjectId(appointmentId), input);
  res.json({ data: appointment });
};

export const getPatients: RequestHandler = async (req, res) => {
  const query = patientListQuerySchema.parse(req.query);
  const result = await listPatients(query);
  res.json({ data: result.items, pagination: result.pagination });
};

export const patchPatient: RequestHandler = async (req, res) => {
  const { patientId } = patientIdSchema.parse(req.params);
  const input = updatePatientSchema.parse(req.body);
  const patient = await updatePatient(parseObjectId(patientId), input);
  res.json({ data: patient });
};

export const removePatient: RequestHandler = async (req, res) => {
  const { patientId } = patientIdSchema.parse(req.params);
  await deletePatient(parseObjectId(patientId));
  res.status(204).end();
};
