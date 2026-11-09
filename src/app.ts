import express from "express";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/auth.js";
import { requireAdmin, requireAuth } from "./auth/auth.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { doctorRouter } from "./modules/doctors/doctor.routes.js";
import { patientRouter } from "./modules/patients/patient.routes.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());

// Better Auth reads the original request stream, so mount it before express.json().
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: "32kb", type: "application/json" }));
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/v1", requireAuth, requireAdmin);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/doctors", doctorRouter);
app.use("/api/v1/patients", patientRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route was not found" } });
});
app.use(errorMiddleware);
