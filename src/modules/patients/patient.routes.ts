import { Router } from "express";
import { getPatients, patchPatient, removePatient } from "./patient.controller.js";

export const patientRouter = Router();
patientRouter.get("/", getPatients);
patientRouter.patch("/:patientId", patchPatient);
patientRouter.delete("/:patientId", removePatient);
