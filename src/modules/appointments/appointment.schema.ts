import { z } from "zod";

export const appointmentStatuses = [
  "upcoming",
  "completed",
  "incomplete",
  "rescheduled",
  "cancelled",
  "unknown",
] as const;

export const appointmentStatusSchema = z.enum(appointmentStatuses);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

const appointmentAtSchema = z.iso.datetime().transform((value) => new Date(value));
const doctorIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "doctorId must be a valid MongoDB ObjectId");

export const createAppointmentSchema = z.object({
  doctorId: doctorIdSchema,
  appointmentAt: appointmentAtSchema,
  status: appointmentStatusSchema.default("upcoming"),
}).strict();

export const updateAppointmentSchema = z.object({
  appointmentAt: appointmentAtSchema.optional(),
  status: appointmentStatusSchema.optional(),
}).strict().refine((input) => input.appointmentAt !== undefined || input.status !== undefined, {
  message: "Provide an appointment date/time or status to update",
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
