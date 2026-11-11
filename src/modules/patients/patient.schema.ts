import { z } from "zod";
import { appointmentStatusSchema } from "../appointments/appointment.schema.js";

const trimmed = (max: number) => z.string().trim().min(1).max(max);
const patientPhone = z.string().trim().max(40).refine((value) => !value || value.length >= 5, "Enter a valid phone number");
const doctorId = z.string().regex(/^[a-f\d]{24}$/i, "doctorId must be a valid MongoDB ObjectId");

export const createPatientSchema = z.object({
  name: trimmed(120),
  condition: trimmed(120),
  phone: patientPhone.optional(),
  doctorId,
  appointmentAt: z.iso.datetime().transform((value) => new Date(value)),
  status: appointmentStatusSchema.default("upcoming"),
}).strict();

export const updatePatientSchema = z.object({
  name: trimmed(120).optional(),
  condition: trimmed(120).optional(),
  phone: patientPhone.optional(),
}).strict().refine((data) => data.name !== undefined || data.condition !== undefined || data.phone !== undefined, {
  message: "At least one patient profile field must be provided",
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
