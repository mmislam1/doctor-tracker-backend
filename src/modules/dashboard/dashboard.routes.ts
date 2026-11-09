import { Router } from "express";
import { getSummary } from "./dashboard.controller.js";

export const dashboardRouter = Router();
dashboardRouter.get("/summary", getSummary);
