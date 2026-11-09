import { z } from "zod";

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const createPatientSchema = z.object({
  name: trimmed(120),
  condition: trimmed(120),
}).strict();

export const updatePatientSchema = z.object({
  name: trimmed(120).optional(),
  condition: trimmed(120).optional(),
}).strict().refine((data) => data.name !== undefined || data.condition !== undefined, {
  message: "At least one of name or condition must be provided",
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
