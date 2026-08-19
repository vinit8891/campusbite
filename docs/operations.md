# CampusBite Production Operations & Observability Guide

## 1. Observability & Monitoring Architecture

### Error Reporting Adapter Layer
CampusBite uses a unified error reporting interface defined in [`src/lib/errorReporting.ts`](file:///e:/campusbite/campusbite/src/lib/errorReporting.ts):
- Standardized `reportError(error, context)` and `reportMessage(message, level, context)`.
- Plug-and-play adapter support for Sentry, Datadog, or OpenTelemetry via `setErrorReporter(adapter)`.
- Reusable [`ErrorBoundary`](file:///e:/campusbite/campusbite/src/components/common/ErrorBoundary.tsx) automatically dispatches caught render anomalies through this layer.

### Application Logging
Standardized environment-aware logger in [`src/lib/logger.ts`](file:///e:/campusbite/campusbite/src/lib/logger.ts):
- Log levels: `debug`, `info`, `warn`, `error`.
- Production safety: `debug` and `info` statements are automatically suppressed in production builds.

---

## 2. Health & Runtime Verification

### Browser Capabilities & Diagnostics
Runtime capability health checks are provided in [`src/lib/browserCapabilities.ts`](file:///e:/campusbite/campusbite/src/lib/browserCapabilities.ts):
- `checkBrowserCapabilities()` validates `localStorage`, `sessionStorage`, `geolocation`, and network state.
- Monitoring hooks in [`src/hooks/monitoring`](file:///e:/campusbite/campusbite/src/hooks/monitoring) (`useOnlineStatus`, `usePageVisibility`, `useNetworkInformation`) allow dynamic recovery on connection drops.

### Automated Quality Gates
Every code commit and pull request runs:
1. `npm run lint` — ESLint 9 quality check.
2. `npm test` — Unit, E2E journey, and accessibility suites.
3. `npm run test:coverage` — Code coverage tracking.
4. `npx tsc --noEmit` — Strict TypeScript type checks.
5. `npm run build` — Turbopack production compilation.

---

## 3. Incident Response & Triage Runbook

### Severity Levels
- **P0 (Outage)**: Users cannot complete checkout or authentication fails campus-wide.
  - *Action*: Trigger rollback immediately, investigate server metrics.
- **P1 (Degraded Performance)**: Specific payment provider or map tracking is intermittently failing.
  - *Action*: Toggle fallback providers (e.g. Cash on Delivery), review logs.
- **P2 (Minor / Cosmetic)**: Non-blocking visual or filtering bug.
  - *Action*: Create ticket, patch in standard release cadence.

---

## 4. Backup & Disaster Recovery Strategy
- **Static Assets**: Hosted on globally distributed CDN with immutable content-hash versioning.
- **State & Data**: All persistent transaction and user data resides in MongoDB / PostgreSQL managed databases with automated continuous backups and point-in-time recovery (PITR).
- **Client Cache**: Local storage tokens are gracefully validated against server JWT expiration.

---

## 5. Rollback Procedure
If a production deployment encounters critical failures:
1. **Rollback Deployment**:
   ```bash
   # Revert to previous image or Vercel instant rollback
   vercel rollback [deployment-id]
   ```
2. **Verify Restored Traffic**:
   - Access landing page `/` and perform user login test.
   - Verify health of `/orders` and `/cart`.
3. **Conduct Post-Mortem**: Document root cause and add regression test to CI pipeline.
