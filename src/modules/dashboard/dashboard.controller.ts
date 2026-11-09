import type { RequestHandler } from "express";
import { getDashboardSummary } from "./dashboard.service.js";

export const getSummary: RequestHandler = async (_req, res) => {
  res.json({ data: await getDashboardSummary() });
};
