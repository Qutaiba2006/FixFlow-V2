# Backend contract and implementation notes

Inspected `Backend/server.js`, every route, controller, model and middleware, plus the database, Cloudinary and email configuration source. No production environment files were opened. Backend source remains unchanged; the SHA-256 baseline uses portable paths relative to Backend.

All paths below are relative to `VITE_API_BASE_URL`, default `/api`. Local connected/test commands explicitly use `http://localhost:5001/api`. Protected endpoints require `Authorization: Bearer <token>`. The token expires after one hour. A 401 clears the frontend session and returns to sign-in. The server remains the authority for all permissions.

| Method | Path | Access | Request / response |
|---|---|---|---|
| GET | `/health` | Public | `{ message }` |
| POST | `/auth/register` | Public | `{ name, email, password }` → `{ message, user }`; always creates a student; password minimum 8 characters |
| POST | `/auth/login` | Public | `{ email, password }` → `{ message, user: { id, name, email, role }, token }` |
| GET | `/auth/me` | Signed in | `{ user: { id, name, email, role } }` |
| GET | `/auth/admin` | Admin | `{ message }`; authorization probe, no UI action needed |
| GET | `/locations` | Signed in | Bare array of locations |
| POST | `/locations` | Admin | Required `name`; optional string `buildingCode`, `building`, `floor`, `roomNumber`, `mapCode`, `codeType`, `symbol` → `{ message, location }` |
| GET | `/reports` | Signed in | Bare array; populated `reportedBy.name` and `location.name/buildingCode/floor`; ordered by priority score then creation |
| POST | `/reports` | Signed in | `{ title, description, location: ObjectId }` → `{ message, report }`; title minimum 5 characters, description minimum 10 |
| GET | `/reports/mine` | Signed in | Bare array of owned reports; location populated; newest first |
| GET | `/reports/assigned` | Technician | Bare array of reports assigned to current technician; location populated |
| GET | `/reports/:id` | Signed in | `{ report }`; only location populated, user references are IDs |
| PATCH | `/reports/:id` | Owner, open only | `{ title, description }` → `{ message, report }` |
| DELETE | `/reports/:id` | Owner, open only | `{ message }`; also deletes attached Cloudinary assets |
| PATCH | `/reports/:id/support` | Signed in | No body → `{ message, supportCount, affectedCount, priorityScore }` |
| PATCH | `/reports/:id/affected` | Signed in | No body → `{ message, supportCount, affectedCount, priorityScore }` |
| PATCH | `/reports/:id/assign` | Admin | `{ technicianId }` → `{ message, report }`; active technician required |
| PATCH | `/reports/:id/status` | Admin or assigned technician | `{ status: 'open' \| 'in_progress' \| 'resolved' }` → `{ message, status }` |
| POST | `/reports/:id/images` | Owner | Multipart `images`, maximum two total, JPEG/PNG/WebP, maximum 5 MB each → `{ message, images }` |
| GET | `/users/technicians` | Admin | Bare array of active technicians, `{ _id, name, email }` |
| GET | `/analytics/summary` | Admin | `{ totalReports, openReports, inProgressReports, resolvedReports }` |

## Frontend behavior grounded in the API

- Community priority is exactly `supporters.length * 2 + affectedUsers.length * 5`. Supporting and being affected are independent toggles. The frontend refreshes server state after mutations instead of treating an interaction count response as a report.
- Report priority (`low/medium/high`) exists in the model, but there is no endpoint to set it. The UI uses the actual community score.
- A timeline contains `created`, `assigned`, and `status_changed` entries, each with `performedBy`, `details`, and `at`. Names are not populated in report detail timelines, so the UI does not fabricate attribution.
- Reassignment and reopening are supported because the backend permits them. The UI does not impose an invented one-way status transition.
- Images are uploaded after report creation. If upload fails, the report remains saved and the UI explicitly says so. Upload can be retried from the detail page.
- The maintenance board organizes reports by actual status. It opens details for status updates; it does not imply unsupported drag-and-drop behavior.
- Summary totals come from `/analytics/summary`. Location distribution, interaction totals, resolution percentage, and unassigned count are derived from `/reports`. No historical metrics, response-time claims, categories, or trend comparisons are invented.
- The backend has no user CRUD, role-management, comments, notification inbox, profile editing, password reset, or location update/delete endpoints. None are simulated as live functionality.
- Search, status/location filtering, sorting and incremental display are client-side because there are no corresponding backend query parameters.
- Error responses generally contain `{ message }`. Multer can return non-JSON errors; the request layer provides a fallback message.

## Isolated local verification environment

`scripts/local-api.mjs` starts a dedicated MongoDB instance on `127.0.0.1:27029` using only `Frontend/.local/mongo-verification`, and an Express instance on `127.0.0.1:5001`. It mounts the existing route modules and therefore executes the original controllers, models and middleware. It does not import `Backend/server.js` or `dotenv`, read actual environment files, start the original database, or edit backend files. Earlier local database files are left untouched. The runner refuses occupied database and API ports.

The runner generates a JWT secret in ignored `.local/jwt-secret` and reuses it across restarts. Random local credentials live in ignored `.local/test-accounts.json`. It seeds the backend campus location JSON and local student/admin/two-technician accounts, with no seed reports. A genuinely expired, locally signed JWT fixture is written to `.local/expired-session.json` for testing. Reports used in verification are created through real HTTP endpoints. Email is directed to closed loopback port 1 and Cloudinary configuration is empty. Assignment and status changes still execute the original notification code and succeed despite the handled email failure. MongoDB receives a clean shutdown command so acknowledged writes are flushed before a restart.

No production secrets or data are used. The isolated runner rejects `POST /reports/:id/images` with an explicit 503 before contacting Cloudinary; authentication is still required. This is a deliberate external-service boundary, not a successful upload integration result. Report creation remains a separate real database write, so the frontend reports the saved report and failed attachment accurately. Successful photo uploads, image authorization/validation through the original upload route, cloud photo deletion, and external email delivery remain unverified.

Normal application mode uses the configured REST API without harness-specific headers. Local connected/test commands explicitly enable `VITE_REQUIRE_ISOLATED_API`; this mode verifies the isolated database identity through `/health` before sending credentials or mutations and checks the response headers too. The harness exposes `X-FixFlow-Experiment` and `X-FixFlow-Database` through CORS. Browser tests additionally check a path-derived API identity before reading local test accounts. Production builds reject the isolated flag and loopback/insecure absolute API URLs. No request path substitutes browser records or simulated successful operations.

Session tokens stay in `sessionStorage` under `fixflow-session`. API outages during restoration offer retry while preserving the session; an actual 401 clears it. Theme preferences retain the existing independent `fixflow-experiment-theme` key for continuity and are applied before React loads. The key stores only appearance preferences.

## Deployment boundary

Verification executes the existing routes, controllers, models and middleware against local MongoDB. It does not start the production `Backend/server.js` bootstrap or test a hosted MongoDB connection. The original server has a fixed CORS allowlist; use a same-origin `/api` reverse proxy or obtain approval to update that allowlist for a new frontend origin. Photo and SMTP services need separate staging verification. No hosting or production data changes were made.
