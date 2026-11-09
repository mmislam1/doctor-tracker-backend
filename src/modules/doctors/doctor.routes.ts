import { Router } from "express";
import { getDoctors, postDoctor } from "./doctor.controller.js";
import { getDoctorPatients, postDoctorPatient } from "../patients/patient.controller.js";

export const doctorRouter = Router();
doctorRouter.get("/", getDoctors);
doctorRouter.post("/", postDoctor);
doctorRouter.get("/:doctorId/patients", getDoctorPatients);
doctorRouter.post("/:doctorId/patients", postDoctorPatient);
