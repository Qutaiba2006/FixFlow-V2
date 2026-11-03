# FixFlow frontend

React, TypeScript, and Vite application for the existing FixFlow Express backend. OpenAI Codex generated the experimental frontend and assisted with its integration and verification.

Read the [project README](../README.md) for installation, architecture, features, environment configuration, deployment requirements, and acknowledgement. The frontend and backend directories must remain siblings for the isolated local harness.

After installing both projects' dependencies, run from this directory:

```powershell
npm.cmd run dev:connected
```

Open http://localhost:5173 and register a student account. Run `npm.cmd run local-accounts` separately to view the generated local staff credentials. Stop the workspace before running tests.

```powershell
npm.cmd test
npm.cmd run test:persistence
npm.cmd run test:config
npm.cmd run check:startup
npm.cmd run lint
npm.cmd run build
npm.cmd run check-backend
npm.cmd run check:publication
```

Production defaults to a same-origin `/api` reverse proxy. Copy [.env.example](.env.example) for public browser settings when needed. Database and service secrets belong only on the backend host.

See [API details](docs/API-CONTRACT.md) and [verification results](docs/VERIFICATION.md). The application has no demo mode or fallback records. Photo and email delivery need configured external services and remain unverified.
