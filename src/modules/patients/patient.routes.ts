import { Router } from "express";
import { getPatients, patchPatient, removePatient, postPatient, postPatientAppointment, patchPatientAppointment } from "./patient.controller.js";

export const patientRouter = Router();
patientRouter.get("/", getPatients);
patientRouter.post("/", postPatient);
patientRouter.post("/:patientId/appointments", postPatientAppointment);
patientRouter.patch("/:patientId/appointments/:appointmentId", patchPatientAppointment);
patientRouter.patch("/:patientId", patchPatient);
patientRouter.delete("/:patientId", removePatient);
