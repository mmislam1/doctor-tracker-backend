# Doctor Tracker API

Standalone Node.js 26+, TypeScript, and Express 5 REST API for doctor and patient records, dashboard aggregates, appointments and administrator authentication. MongoDB Atlas stores the application and Better Auth data.

## Local setup

From this repository root:

```sh
npm ci
cp .env.example .env
```

Set the Atlas URI and database name, generate a Better Auth secret with at least 32 characters, and set `BETTER_AUTH_URL` and `FRONTEND_ORIGIN` to `http://localhost:3000`. The example sets `PORT=4000` for local API access. Start the server with:

```sh
npm run dev
```

Production scripts are `npm run build` and `npm start`.

## Environment variables

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production`. |
| `PORT` | HTTP listen port; local example is `4000`, Render provides the production value. |
| `MONGODB_URI` | MongoDB Atlas connection URI. |
| `MONGODB_DB_NAME` | Database used for auth and application collections. |
| `BETTER_AUTH_SECRET` | Random server secret, at least 32 characters. |
| `BETTER_AUTH_URL` | Public application origin used by Better Auth. |
| `FRONTEND_ORIGIN` | Exact trusted browser origin; must match `BETTER_AUTH_URL`. |

Keep `.env` and production values private. Use Render environment settings in production.

## Authentication and initial administrator

Better Auth uses the MongoDB adapter, email/password sign-in, disabled public sign-up, the Admin plugin, database-backed rate limits, and server-managed sessions. Protected business routes check the session and admin role. The auth handler is mounted at `/api/auth/*` before JSON parsing.

After setting a persistent MongoDB database and backend environment, run from the repository root. Replace the placeholder email; if `--password` is omitted, the CLI prompts for it.

```sh
npx auth@latest create-admin --email admin@example.com --name "Admin" --role admin --config ./src/auth/auth.ts
```

## API routes

All business routes require an administrator session. Lists use `data` plus `pagination` metadata; dates are inclusive `YYYY-MM-DD` UTC dates.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health check. |
| `GET` | `/api/v1/dashboard/summary` | Totals, patients per doctor, and 30-day daily counts. |
| `GET`, `POST` | `/api/v1/doctors` | Search/filter/page doctors; create a doctor. |
| `GET`, `POST` | `/api/v1/doctors/:doctorId/patients` | List patients associated with a doctor, or create a patient profile and its first appointment. Create payloads include `name`, `condition`, and `appointmentAt` as an ISO 8601 date-time. |
| `GET`, `POST` | `/api/v1/patients` | Search/filter/page patient profiles, or create a profile with its first doctor appointment. |
| `PATCH`, `DELETE` | `/api/v1/patients/:patientId` | Edit a patient's name, condition, or phone; deleting a patient also deletes their appointments. |
| `GET`, `POST` | `/api/v1/patients/:patientId/appointments` | Page through a patient's appointment history, or attach an appointment to the profile. Create payload: `doctorId`, `appointmentAt`, optional `status`. |
| `PATCH` | `/api/v1/patients/:patientId/appointments/:appointmentId` | Update the appointment date/time or status. |
| Better Auth | `/api/auth/*` | Sign-in, session, and sign-out endpoints. |

Doctor filters: `search`, `specialization`, `hospital`, `from`, `to`, `page`, `pageSize`. Patient filters: `search` (name/condition), `condition`, `doctorId`, `status`, `from`, `to`, `page`, `pageSize`. Appointment statuses are `upcoming`, `completed`, `incomplete`, `rescheduled`, `cancelled`, and `unknown` (used for migrated historical visits with an unspecified status).

Patient profiles are stored in `patients`; each visit is stored separately in `appointments`, linked by `patientId` and `doctorId`. Patient list responses include the closest future appointment with status `upcoming` or `rescheduled`, resolved doctor name and specialization, plus `upcomingAppointmentCount`. Full appointment history is available through the paginated patient appointments route. Appointment dates are returned as ISO 8601 date-times. Appointment create and update responses also include doctor display fields; these are response data, not stored in appointment documents. On startup, legacy doctor/date fields on patient records are copied into `appointments` with status `unknown` and removed from the profile after the copy succeeds. This migration is idempotent.

Doctor specialization must be one of the predefined values in `src/modules/doctors/specializations.ts`; the API rejects other values before saving a doctor.

## Render deployment

Deploy this repository as a Node web service using Node 26, `npm ci`, `npm run build`, and `npm start`. Set `NODE_ENV=production`, `MONGODB_URI`, `MONGODB_DB_NAME`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `FRONTEND_ORIGIN` in Render; Render supplies `PORT`. Set `/health` as the health-check path. Configure Atlas network access for the service and keep database credentials in Render settings.
