# FixFlow verification report

Date: **3 November 2026**. Work was limited to this experimental project. No production database, real user credentials, external email recipients, Cloudinary credentials, commits, pushes, publication, or deployment were used.

## Demo removal

| File | Change |
| --- | --- |
| `src/lib/demo.ts` | Deleted the complete browser data store, hardcoded role accounts, locations/reports/technicians, simulated REST actions, data URL photo handling, reset function and localStorage persistence |
| `src/lib/api.ts` | Removed the demo import and request branch; all application operations now use HTTP |
| `src/lib/context.tsx` | Removed demo authentication, demo role switching and session mode; new `fixflow-session` storage accepts only token-bearing sessions and restores the user through the backend |
| `src/pages/Auth.tsx` | Removed “Explore the interactive demo,” the “Just looking around?” entry point, demo divider/caption and decorative account initials; real sign-in and registration are the only entry paths |
| `src/components/Layout.tsx` | Removed the role switcher and browser-demo banner; the header shows the signed-in role without claiming an unverified live connection |
| `src/pages/Settings.tsx` | Removed demo reset, confirmation modal, sample-data messaging and mode-dependent controls; retained profile, sign-out, connection check and all appearance controls |
| `src/components/ApiConnection.tsx` | Replaced experiment/demo copy and local-only connection details with an actual service availability check |
| Stylesheets | Removed selectors for `.demo-btn`, `.demo-caption`, `.auth-demo-link`, `.auth-divider`, `.role-switch` and `.mini-avatars`, preserving shared layout and theme rules |
| `scripts/local-api.mjs` | Removed automatic creation of six synthetic reports; kept isolated local login fixtures and campus location initialization |
| `tests/workflows.spec.ts`, `tests/themes-and-database.spec.ts` | Replaced obsolete/demo-dependent suites with `api.spec.ts`, `browser.spec.ts`, `theme.spec.ts` and `regressions.spec.ts`; mocked HTTP response tests were removed |
| `scripts/remove-demo.mjs` | Removed the temporary migration script after use |
| `docs/screenshots/` | Removed eight stale captures: `auth-{light,dark}-{desktop,mobile}.png`, `feed-desktop.png`, `feed-desktop-full.png`, `feed-mobile.png`, `feed-mobile-full.png`; retained eight fresh feed/analytics captures from real API tests |

No separate demo-only route or page existed. The shared campus illustration, favicon, React pages, icons, fonts and dependencies remain in use. No demo-only npm package needed removal. Local historical backups remain outside the application and are excluded from publication.

## API and database integration

The frontend communicates with the existing Express REST API and has no MongoDB client. Local verification mounts the original backend route modules, controllers, authentication/authorization middleware and models. It uses only `mongodb://127.0.0.1:27029/fixflow_frontend_experiment`, backed by `.local/mongo-verification`.

Both application and tests obtain real reports, locations, technicians, assignments, statuses, timelines, interactions and analytics from the backend. Student registration always creates a student, including when a request attempts to supply an admin role. HTTP checks cover real authorization responses rather than trusting hidden controls.

Normal runtime defaults to same-origin `/api`, or a configured hosted HTTPS API. Only the isolated local/test commands enable harness identity checks. Production builds reject the isolated flag, loopback API URLs, insecure absolute URLs and credential-bearing API URLs. The bundled application contains no local test accounts, demo records, database connection strings or hardcoded localhost API URL.

Sessions use JWTs issued by the backend, with user validation on refresh. Tests include a genuinely expired JWT signed with the local harness secret. Connection failures preserve the session and offer retry; 401 responses clear it. The restart test stops and restarts **both MongoDB and Express**, then verifies the same JWT, complete report document, score, timeline and summary counts.

## Final test inventory

| Command | Executed | Passed | Failed |
| --- | ---: | ---: | ---: |
| `npm test` | 52 | 52 | 0 |
| `npm run test:persistence` | 1 | 1 | 0 |
| `npm run test:config` | 6 | 6 | 0 |
| **Total automated tests** | **59** | **59** | **0** |

The 52 Playwright executions are 26 cases across desktop Chrome at 1440 × 1000 and Chromium emulating iPhone 13. Twenty-two executions are real HTTP checks; thirty exercise browser behavior. The configuration tests are local policy tests, not hosted API integration results. Counts represent the final suite and separate final checks, not the cumulative number of attempts while fixing issues.

Earlier runs exposed test synchronization/selector mistakes, unavailable totals rendered as zero, and the local database shutdown issue. The affected tests were corrected and rerun. No known failing test is omitted or skipped from the final suite. API error tests use actual backend failures, network disconnection or aborted requests. The loading test delays a request and then forwards it to the real API. No API response is fulfilled with fabricated data.

## Verified coverage

| Area | Evidence |
| --- | --- |
| Registration and login | Browser registration and sign-in; HTTP validation, duplicate email, normalization, attempted role escalation, all local staff roles and incorrect credentials |
| JWT and permissions | Expired/malformed credentials; protected endpoint access; role restrictions; ownership checks; unassigned/former technicians rejected after reassignment; direct browser management routes guarded |
| Reports | Real creation, retrieval, populated location, personal collection, invalid/missing IDs, validation, owner edit/delete, other-user rejection and edit/delete conflicts after resolution |
| Community priority | Multiple users toggle both Support and Affected; exact scores and persisted formula; returned feed priority ordering; failed interaction does not change UI or database score |
| Maintenance | Assignment, reassignment, assigned collections, in-progress/resolved/reopened statuses, repeated status no-op and timeline actions/actors/dates |
| Complete workflow | Student creates in browser → Admin signs in and assigns → Technician signs in and updates both statuses → Student sees resolution/timeline → Admin analytics matches backend counts |
| Search and views | Report text, location/status filters, sorting, 8-to-10 incremental feed pagination, personal list/board views and empty filtered results |
| Locations | Admin HTTP/browser creation, duplicate/invalid input rejection, authorization, browser search and persistence after refresh |
| Analytics | Counts independently compared with actual reports; full workflow deltas; browser totals; JSON download; all location groups exported while the chart shows only seven |
| Failure handling | Offline reads, writes and interactions; retry; retained session during restoration failure; explicit partial upload failure with the report still saved; missing report/page and empty states; loading display |
| Theme and layout | Light/Dark/System preferences, persistence, cross-tab synchronization, pre-React bootstrap, blocked localStorage, system changes, no horizontal page overflow across main pages, desktop/mobile captures and no page errors in the layout test |
| Persistence | Browser refresh retains real records; complete report, interactions, timeline, analytics and JWT survive a clean API/database restart |

`npm run check:startup` separately verifies combined service startup and shutdown. `npm run build` passes TypeScript and production bundling. `npm run lint` passes without warnings. `npm run check-backend` verifies **all 31 original Backend files** against their unchanged SHA-256 hashes. `npm run check:publication` checks 13 private/local path exclusions using Git, preserves the environment example, scans publishable text for high-confidence credential patterns without reading production environment files, and inspects the built JavaScript.

## Frontend and local tooling fixes

1. Removed the localhost-only production restriction and harness-header dependency from normal API mode. Environment-based hosted API configuration and a same-origin default now work without special backend headers.
2. Removed the runtime demo request/authentication paths and replaced the old mixed-mode session format. Real login/registration is required for protected pages.
3. Corrected login error copy so invalid credentials do not surface the backend's misspelled message.
4. Fixed analytics export truncation: all location groups are exported even when the visualization displays only the top seven.
5. Fixed failed reads appearing as zero report totals. Metrics display an unavailable placeholder; a failed feed also avoids fabricated zero-percent summary data.
6. Fixed local sessions being invalidated by every API restart by persisting only the generated local JWT secret in ignored runtime storage.
7. Fixed Windows MongoDB shutdown: the runner now requests a clean database shutdown before closing the driver and waiting for the owned process. The restart test initially detected lost recent changes under forced termination and passes after this fix.
8. Stopped the connected runner from reusing a frontend with unknown API settings. It refuses an occupied frontend port and always starts its own explicitly isolated frontend.
9. Added production configuration guards and removed local default URLs from published configuration.
10. Replaced stale demo documentation/screenshots, sanitized absolute machine paths in the backend hash baseline, added root publication exclusions and a repeatable publication audit.

Existing report/photo partial-failure behavior, ownership controls, layouts and themes were preserved and verified where listed above. The analytics download helper was moved outside render to eliminate an Oxlint purity warning.

## Limitations and deployment requirements

- **Photo service:** the local harness deliberately returns 503 before Cloudinary. The original upload handler's successful cloud delivery, image-route authorization/validation, and deletion of cloud-hosted assets have not been verified. Browser file type/size/count validation and saved-report/failed-photo messaging passed.
- **Email:** original assignment/status notification attempts run against a closed local SMTP port; the workflow persists despite that handled failure. Actual email delivery is unverified.
- **Backend bootstrap:** tests mount original routes directly; they do not start `Backend/server.js`, load its production environment, connect to Atlas, or validate hosted infrastructure.
- **Unsupported operations:** the backend has no user/role-management, profile-editing, password reset, comments or location update/delete API. These features were not added or presented as working.
- **Scale and devices:** filtering and incremental pagination are client-side. Concurrent interaction updates, load behavior, unexpected server crashes, real mobile hardware, Safari and Firefox were not tested. Mobile coverage is Chrome/Chromium device emulation.
- **Hosting:** serve `Frontend/dist` with SPA rewrites and HTTPS. Configure `/api` as a reverse proxy to the separately hosted Node backend, or set a hosted HTTPS API URL at build time. A separate frontend origin requires the existing backend CORS allowlist to permit it. The fixed allowlist was inspected and left unchanged.
- **Operations:** provision a MongoDB deployment, a stable private JWT secret, initial staff accounts, and optional Cloudinary/SMTP services. The repository does not contain production credentials or a staff-provisioning endpoint. Public-service security hardening and staging smoke tests remain deployment work.

## Readiness

**GitHub:** ready for source review and manual upload with the supplied exclusions and documented limitations. The workspace is not initialized as a project Git repository, and no project commit or push was performed. Excluded runtime/generated files remain local; do not upload the entire directory by drag-and-drop without applying the exclusions.

**Public deployment:** not yet verified or provisioned. The frontend builds with production-safe configuration, but hosting, backend environment/CORS or proxy routing, staff provisioning, and external service verification remain. No backend source was changed and nothing was deployed.

## Run commands

From the repository root after installing dependencies:

```powershell
cd Frontend
npm.cmd run dev:connected
```

Open `http://localhost:5173`. In another terminal from `Frontend`, `npm.cmd run local-accounts` displays the generated local accounts. Use real registration for a new local student. Use `npm.cmd run build` for `dist/` and follow the root README's hosting instructions for a configured production environment.
