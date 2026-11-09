# Doctor Tracker API

Standalone Express 5 REST API for the Doctor Tracker admin portal. It uses TypeScript, MongoDB Atlas, and Better Auth. The frontend remains a separate Next.js repository.

## Local setup

1. Use Node.js 26 or newer and npm.
2. From the backend repository root, install dependencies with `npm ci`.
3. Copy `.env.example` to `.env` and fill in the MongoDB Atlas connection string, database name, a random Better Auth secret of at least 32 characters, and the frontend origin. Keep `.env` private.
4. For local development, use `http://localhost:3000` for both `BETTER_AUTH_URL` and `FRONTEND_ORIGIN`, then run `npm run dev`.
5. Open the frontend through its same-origin `/api/*` proxy. The browser should not call the Render API hostname directly.

The backend validates all required environment variables at startup. `BETTER_AUTH_URL` and `FRONTEND_ORIGIN` must be the same origin with no path or trailing slash. No CORS allow-all policy is enabled because browser API requests are expected to be proxied by the frontend.

## Environment variables

| Name | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | HTTP listen port; Render supplies this in production |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Database used by auth and application collections |
| `BETTER_AUTH_SECRET` | Random secret with at least 32 characters |
| `BETTER_AUTH_URL` | Public frontend origin used by Better Auth, not the Render URL |
| `FRONTEND_ORIGIN` | Exact allowed frontend origin, including the production custom domain if that is where the app is served |

The example environment is for local development. Set the deployed frontend origin exactly in both auth URL variables in Render. Do not include Netlify preview origins unless they are intentionally trusted.

## Initial administrator

There is no public sign-up route. Configure the backend environment and a persistent MongoDB database first, then run this from the backend repository root:

```sh
npx auth@latest create-admin --email admin@example.com --name "Admin" --role admin --config ./src/auth/auth.ts
```

Replace `admin@example.com` with the administrator's email. If `--password` is omitted, the CLI prompts for it. This provisions an administrator account; it does not provide a login page. Better Auth uses its standard password hashing and persistent sessions.

## API

All business routes require a valid Better Auth session for a user with the `admin` role. Better Auth routes are under `/api/auth/*`; its handler is mounted before JSON parsing.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Render health check |
| `GET` | `/api/v1/dashboard/summary` | Doctor and patient totals, counts per doctor, and the latest 30 days of daily totals |
| `GET` | `/api/v1/doctors` | Search and filter doctors with pagination |
| `POST` | `/api/v1/doctors` | Create a doctor |
| `GET` | `/api/v1/doctors/:doctorId/patients` | List a doctor's patients with filters and pagination |
| `POST` | `/api/v1/doctors/:doctorId/patients` | Create a patient under a doctor |
| `GET` | `/api/v1/patients` | Search/filter all patients with pagination |
| `PATCH` | `/api/v1/patients/:patientId` | Update a patient's name and/or condition |
| `DELETE` | `/api/v1/patients/:patientId` | Delete a patient (works from either patient list) |

List routes accept `page` (default `1`) and `pageSize` (default `20`, max `100`). Doctor listing accepts `search` (name/email text search), `specialization`, `hospital`, `from`, and `to`. Patient listing accepts `search` (name/condition text search), `condition`, `doctorId`, `from`, and `to`. Date filters use inclusive `YYYY-MM-DD` UTC calendar dates. Search uses MongoDB text indexes; user-supplied values are validated and never interpreted as MongoDB operators.

`POST /api/v1/doctors` accepts `{ "name", "specialization", "hospital", "phone", "email" }`. The doctor-scoped patient create route accepts `{ "name", "condition" }`. Patient updates accept one or both of `{ "name", "condition" }`; the doctor relationship cannot be changed through a patient update. Dashboard `data` contains `totals` (`doctors`, `patients`), `patientsPerDoctor` (including doctors with zero patients), and `dailyStats` (UTC daily doctor/patient creation counts for 30 days).

List responses have `{ "data": [...], "pagination": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 } }`. Single-resource and dashboard responses have a `data` property. Errors use `{ "error": { "code": "...", "message": "..." } }`; validation errors also include safe field paths. Create routes return `201`, deletes return `204`, and missing resources return `404`.

## Render deployment

- Create a Node web service from this repository, set Node to version 26, use `npm ci` as the build preparation command, `npm run build` as the build command, and `npm start` as the start command.
- Add the production variables listed above. Set `PORT` only if required; Render provides it. Set `NODE_ENV=production`.
- Configure `/health` as the health-check path.
- In MongoDB Atlas, allow the Render service to connect and keep credentials in Render environment settings.
- Configure the frontend's Netlify rewrite `/api/*` to `https://YOUR-BACKEND-NAME.onrender.com/api/:splat`. This preserves a first-party browser cookie on the frontend origin. Use the exact public Netlify/custom frontend origin for both `BETTER_AUTH_URL` and `FRONTEND_ORIGIN`.

The app listens on `0.0.0.0`, reuses a single MongoDB client, and creates the required application indexes on startup. Better Auth stores rate limits in MongoDB so the auth limits are shared across service instances.
