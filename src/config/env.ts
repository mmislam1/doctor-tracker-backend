import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  FRONTEND_ORIGIN: z.url(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid environment configuration: ${fields}`);
}

const authOrigin = new URL(parsed.data.BETTER_AUTH_URL).origin;
const frontendOrigin = new URL(parsed.data.FRONTEND_ORIGIN).origin;
if (authOrigin !== parsed.data.BETTER_AUTH_URL || frontendOrigin !== parsed.data.FRONTEND_ORIGIN) {
  throw new Error("BETTER_AUTH_URL and FRONTEND_ORIGIN must be origins without paths or trailing slashes");
}
if (authOrigin !== frontendOrigin) {
  throw new Error("BETTER_AUTH_URL must match FRONTEND_ORIGIN");
}

export const env = parsed.data;
