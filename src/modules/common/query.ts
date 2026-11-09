import { ObjectId, type Filter, type Document } from "mongodb";
import { z } from "zod";
import { HttpError } from "../../middleware/error.middleware.js";

const pageNumber = z.coerce.number().int().min(1).default(1);
const pageSizeNumber = z.coerce.number().int().min(1).max(100).default(20);
const searchText = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).max(100).optional());
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, "Expected a valid YYYY-MM-DD date").optional();

export const paginationSchema = z.object({ page: pageNumber, pageSize: pageSizeNumber });
export const doctorListQuerySchema = paginationSchema.extend({
  search: searchText,
  specialization: z.string().trim().min(1).max(100).optional(),
  hospital: z.string().trim().min(1).max(150).optional(),
  from: dateOnly,
  to: dateOnly,
}).refine((query) => !query.from || !query.to || query.from <= query.to, {
  path: ["to"], message: "to must be the same as or later than from",
});

export const patientListQuerySchema = paginationSchema.extend({
  search: searchText,
  condition: z.string().trim().min(1).max(100).optional(),
  doctorId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  from: dateOnly,
  to: dateOnly,
}).refine((query) => !query.from || !query.to || query.from <= query.to, {
  path: ["to"], message: "to must be the same as or later than from",
});

export const doctorIdSchema = z.object({ doctorId: z.string().regex(/^[a-f\d]{24}$/i) });
export const patientIdSchema = z.object({ patientId: z.string().regex(/^[a-f\d]{24}$/i) });

export type PaginationInput = z.infer<typeof paginationSchema>;

export function escapeTextSearch(search: string): string {
  return search.trim().split(/\s+/).map((term) => `"${term.replace(/["\\]/g, "\\$&")}"`).join(" ");
}

export function applyDateRange<T extends Document>(filter: Filter<T>, from?: string, to?: string): Filter<T> {
  if (!from && !to) return filter;
  const range: { $gte?: Date; $lt?: Date } = {};
  if (from) range.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) {
    const end = new Date(`${to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    range.$lt = end;
  }
  return { ...filter, createdAt: range } as Filter<T>;
}

export function paginationOptions({ page, pageSize }: PaginationInput) {
  return { skip: (page - 1) * pageSize, limit: pageSize };
}

export function paginationMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export function parseObjectId(id: string): ObjectId {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new HttpError(400, "INVALID_ID", "ID must be a valid MongoDB ObjectId");
  return new ObjectId(id);
}
