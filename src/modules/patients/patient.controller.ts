import type { RequestHandler } from "express";
import { doctorIdSchema, patientIdSchema, patientListQuerySchema, parseObjectId } from "../common/query.js";
import { createPatientSchema, updatePatientSchema } from "./patient.schema.js";
import { createPatient, deletePatient, listPatients, updatePatient } from "./patient.service.js";
import { doctorExists } from "../doctors/doctor.service.js";

export const getDoctorPatients: RequestHandler = async (req, res) => {
  const { doctorId } = doctorIdSchema.parse(req.params);
  if (!(await doctorExists(parseObjectId(doctorId)))) {
    res.status(404).json({ error: { code: "DOCTOR_NOT_FOUND", message: "Doctor was not found" } });
    return;
  }
  const query = patientListQuerySchema.parse(req.query);
  const result = await listPatients(query, parseObjectId(doctorId));
  res.json({ data: result.items, pagination: result.pagination });
};

export const postDoctorPatient: RequestHandler = async (req, res) => {
  const { doctorId } = doctorIdSchema.parse(req.params);
  const input = createPatientSchema.parse(req.body);
  const patient = await createPatient(parseObjectId(doctorId), input);
  res.status(201).json({ data: patient });
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
