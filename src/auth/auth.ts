import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { env } from "../config/env.js";
import { database } from "../config/database.js";

export const auth = betterAuth({
  database: mongodbAdapter(database),
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_ORIGIN],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  plugins: [admin()],
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  },
});
