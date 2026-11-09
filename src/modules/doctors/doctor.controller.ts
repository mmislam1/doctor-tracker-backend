import type { RequestHandler } from "express";
import { doctorListQuerySchema } from "../common/query.js";
import { createDoctorSchema } from "./doctor.schema.js";
import { createDoctor, listDoctors } from "./doctor.service.js";

export const getDoctors: RequestHandler = async (req, res) => {
  const query = doctorListQuerySchema.parse(req.query);
  const result = await listDoctors(query);
  res.json({ data: result.items, pagination: result.pagination });
};

export const postDoctor: RequestHandler = async (req, res) => {
  const input = createDoctorSchema.parse(req.body);
  const doctor = await createDoctor(input);
  res.status(201).json({ data: doctor });
};
