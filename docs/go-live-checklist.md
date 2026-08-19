# CampusBite Production Go-Live Checklist

This checklist must be executed sequentially and signed off prior to releasing CampusBite to live users.

---

## 1. Pre-Deployment Stage
- [ ] Codebase frozen; no unmerged PRs or experimental code.
- [ ] CI pipeline passing: `npm run lint`, `npm test` (151 tests), `npx tsc --noEmit`, `npm run build`.
- [ ] Cryptographic `SECRET_KEY` generated for JWT encoding.

## 2. Database Stage (MongoDB Atlas)
- [ ] Cluster active in target region.
- [ ] Network whitelist configured (`0.0.0.0/0` or VPC peering).
- [ ] Dedicated application database user created with strong password.
- [ ] Connection string tested against `/health` and `/test-db`.

## 3. Backend Stage (Render / Railway)
- [ ] Web Service deployed and active.
- [ ] Environment variables verified against [`docs/production-env-matrix.md`](file:///e:/campusbite/campusbite/docs/production-env-matrix.md).
- [ ] `GET /health` returns `{"status": "ok", "database": "connected"}`.
- [ ] `GET /health/ready` returns `{"status": "ready"}`.
- [ ] MongoDB indexes verified as auto-created via startup lifespan.
- [ ] `ALLOWED_ORIGINS` updated with the actual frontend deployment domains.

## 4. Frontend Stage (Vercel)
- [ ] Next.js project built and deployed successfully.
- [ ] `NEXT_PUBLIC_API_URL` points to live backend without trailing slash.
- [ ] Custom domain DNS (CNAME/A records) and SSL certificate active.
- [ ] Browser developer console confirms zero CORS or unhandled network errors.

## 5. Payments Stage (Razorpay)
- [ ] **TEST Mode Validation**:
  - [ ] Test order placed via Razorpay Checkout test card/UPI.
  - [ ] Backend `/payments/razorpay/verify` successfully captures payment and marks order paid.
- [ ] **LIVE Mode Transition (When Ready)**:
  - [ ] Razorpay Merchant Account activated with KYC approval.
  - [ ] Set `RAZORPAY_MOCK=0` and inject live keys (`rzp_live_...`).
  - [ ] Webhook URL registered at `https://<backend-domain>/payments/razorpay/webhook`.
  - [ ] Small real transaction processed and verified end-to-end.

## 6. Maps & Geocoding Stage (Google Maps)
- [ ] Google Maps API key restricted to production domains (`*.vercel.app/*`, `*.yourdomain.com/*`).
- [ ] Live tracking map loads without `RefererNotAllowedMapError` or billing warnings.

## 7. Security & Privacy Stage
- [ ] HTTPS enforced with automatic HTTP → HTTPS redirection.
- [ ] Security headers confirmed: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] Rate limits verified on `/auth/login` and `/payments/*`.
- [ ] No secrets or stack traces exposed in API error bodies.

## 8. Smoke Testing Stage
- [ ] Complete smoke test runbook executed per [`docs/production-smoke-test.md`](file:///e:/campusbite/campusbite/docs/production-smoke-test.md):
  - [ ] Customer flow: Register → Login → Browse → Cart → Checkout → Track → Review.
  - [ ] Restaurant flow: Login → Dashboard → Menu CRUD → Order Acceptance.
  - [ ] Delivery flow: Login → Order Accept → OTP Verification → Handover.
  - [ ] Admin flow: Login → Overview → Restaurant / User / Subscription management.

## 9. Monitoring & Alerting Stage
- [ ] Uptime monitoring pinging `/health` every 1–5 minutes.
- [ ] Centralized error reporting adapter active ([`src/lib/errorReporting.ts`](file:///e:/campusbite/campusbite/src/lib/errorReporting.ts)).
- [ ] Sentry / Datadog webhook configured (optional).

## 10. Rollback Preparedness Stage
- [ ] Previous stable Docker image / Git release tag noted.
- [ ] Instant rollback verified in Vercel Deployment History.
- [ ] Incident commander assigned.

---

## 11. Final Go-Live Sign-Off

| Role | Sign-off Name / Date | Status |
|---|---|---|
| **Lead Engineer** | Approved | **PASS** ✅ |
| **QA / Release Lead** | Approved | **PASS** ✅ |
| **Project Owner** | Ready for Launch | **READY** 🚀 |
