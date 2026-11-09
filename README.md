# Doctor Tracker API

Standalone Node.js 26+, TypeScript, and Express 5 REST API for doctor and patient records, dashboard aggregates, and administrator authentication. MongoDB Atlas stores the application and Better Auth data.

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
| `GET`, `POST` | `/api/v1/doctors/:doctorId/patients` | List or create patients for a doctor. |
| `GET` | `/api/v1/patients` | Search/filter/page all patients. |
| `PATCH`, `DELETE` | `/api/v1/patients/:patientId` | Edit a patient's name/condition or delete the patient. |
| Better Auth | `/api/auth/*` | Sign-in, session, and sign-out endpoints. |

Doctor filters: `search`, `specialization`, `hospital`, `from`, `to`, `page`, `pageSize`. Patient filters: `search`, `condition`, `doctorId`, `from`, `to`, `page`, `pageSize`.

## Render deployment

Deploy this repository as a Node web service using Node 26, `npm ci`, `npm run build`, and `npm start`. Set `NODE_ENV=production`, `MONGODB_URI`, `MONGODB_DB_NAME`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `FRONTEND_ORIGIN` in Render; Render supplies `PORT`. Set `/health` as the health-check path. Configure Atlas network access for the service and keep database credentials in Render settings.
