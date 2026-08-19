# CampusBite Release Certification & Operations Checklist

## Release Status: GREEN (Certified for Production)

### 1. Pre-Deployment Verification
- [ ] Run `npm run lint` — Confirm 0 lint errors.
- [ ] Run `npm test` — Confirm 141/141 tests pass across 36 test files.
- [ ] Run `npm run test:coverage` — Verify coverage metrics.
- [ ] Run `npx tsc --noEmit` — Confirm 0 TypeScript compilation errors.
- [ ] Run `npm run build` — Verify static and dynamic route generation for all 47 routes.

---

### 2. Environment Variables Checklist
Ensure the following variables are configured in the hosting environment (e.g., Vercel / AWS / Docker):

| Variable | Required | Description | Example / Recommended |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend REST API Base URL | `https://api.campusbite.com` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Google Maps JS API Key | `AIzaSy...` (Restricted by domain) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Optional | Razorpay Key ID | `rzp_live_...` |
| `NODE_ENV` | Yes | Node execution environment | `production` |

---

### 3. Production Deployment Steps
1. **Repository Tagging**:
   ```bash
   git tag -a v1.0.0 -m "CampusBite Production Release v1.0.0"
   git push origin v1.0.0
   ```
2. **Build & Containerization**:
   ```bash
   npm ci
   npm run build
   npm start
   ```
3. **Domain & SSL Binding**:
   - Verify HTTPS certificates and HTTP -> HTTPS redirects.
   - Configure DNS records (A/CNAME) pointing to the production load balancer / CDN.
4. **Security Header Verification**:
   - Confirm `X-Content-Type-Options: nosniff`
   - Confirm `X-Frame-Options: DENY`
   - Confirm `Referrer-Policy: strict-origin-when-cross-origin`

---

### 4. Production Smoke Test Verification Checklist
Perform manual smoke testing against production deployment:

- [ ] **Customer Journey**:
  - [ ] Customer registration & login.
  - [ ] Restaurant catalog browsing and dish search.
  - [ ] Add dishes to cart, navigate to checkout, submit order.
  - [ ] Live order tracking page & OTP display.
  - [ ] View order history and order rating dialog.
  - [ ] Customer meal subscription browsing and status management.
- [ ] **Restaurant Dashboard**:
  - [ ] Restaurant login & metrics overview.
  - [ ] Live order status progression (Accept -> Prepare -> Ready for Pickup).
  - [ ] Menu CRUD (Create, Read, Update, Delete dish items).
  - [ ] Meal subscription plans configuration.
- [ ] **Delivery Partner Flow**:
  - [ ] Partner login & available orders list.
  - [ ] Order acceptance, route navigation link, and OTP handover verification.
  - [ ] Daily delivery metrics and earnings summary.
- [ ] **Admin Portal**:
  - [ ] Admin login & overall campus stats dashboard.
  - [ ] Restaurant verification and approvals.
  - [ ] Global orders and user management pagination.

---

### 5. Rollback Plan
In the event of a critical issue during production release:
1. **Immediate Traffic Switch**: Re-route CDN/DNS traffic to the previous stable release artifact.
2. **Container / Instance Rollback**:
   ```bash
   docker stop campusbite-current
   docker run -d --name campusbite-prev -p 3000:3000 campusbite:v0.9.x
   ```
3. **Database Migration State**: Verify backward compatibility with the backend API.
4. **Incident Post-Mortem**: Collect server logs via CloudWatch/Datadog and review Sentry exception telemetry.

---

### 6. Monitoring & Health Checklist
- [ ] Uptime monitor configured for `/` and `/api/health` (HTTP 200 ping).
- [ ] Sentry / Error monitoring enabled for unhandled client exceptions.
- [ ] Real User Monitoring (RUM) for Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms).
- [ ] API latency alerting (p95 < 500ms).
