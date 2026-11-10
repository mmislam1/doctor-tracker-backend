import { z } from "zod";
import { doctorSpecializationSchema } from "./specializations.js";

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const createDoctorSchema = z.object({
  name: trimmed(120),
  specialization: doctorSpecializationSchema,
  hospital: trimmed(150),
  phone: trimmed(40),
  email: z.email().trim().max(254).transform((email) => email.toLowerCase()),
}).strict();

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
