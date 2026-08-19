# CampusBite – Production Readiness Guide

## 1. Build Process

CampusBite is built on Next.js 16 (App Router) with React 19 and Tailwind CSS.

### Local & Production Build Commands
```bash
# Install dependencies with locked versions
npm ci

# Typecheck TypeScript source
npx tsc --noEmit

# Run ESLint quality checks
npm run lint

# Run unit and accessibility tests
npm test

# Generate production build bundle
npm run build

# Start production server
npm start
```

---

## 2. Environment Variables

| Variable Name | Required | Default / Target | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes (Prod)** | `http://127.0.0.1:8000` | Base URL for FastAPI backend endpoints |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | None | Google Maps API key for Live Tracking & address geocoding |
| `RAZORPAY_KEY_ID` | Optional | Backend configured | Razorpay public key ID for online payments |
| `RAZORPAY_KEY_SECRET` | Backend only | N/A | Never expose in frontend |
| `NODE_ENV` | Automatic | `production` | Set by deployment platform |

---

## 3. CI Pipeline (`.github/workflows/ci.yml`)

The automated CI pipeline runs on every `push` and `pull_request`:
1. **Checkout**: Checks out source code.
2. **Setup Node**: Sets up Node.js 20 with npm caching.
3. **Dependency Install**: Runs `npm ci`.
4. **Linting**: Runs `npm run lint` (ESLint 9).
5. **Testing**: Runs `npm test` (30 test suites, 122+ tests).
6. **Coverage**: Runs `npm run test:coverage`.
7. **Type Check**: Runs `npx tsc --noEmit`.
8. **Production Build**: Executes `npm run build` (Turbopack).

---

## 4. Deployment Checklist

- [ ] Environment variables provisioned in hosting provider (Vercel, AWS Amplify, Docker).
- [ ] Backend API (`NEXT_PUBLIC_API_URL`) is healthy and reachable over HTTPS.
- [ ] CORS headers on backend permit the production frontend domain.
- [ ] Google Maps API key domain restrictions configured in Google Cloud Console.
- [ ] Razorpay webhook endpoints configured on backend for payment confirmation.
- [ ] Security headers active (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- [ ] Assets and remote images allowed in `next.config.ts`.

---

## 5. Production Verification (Smoke Test)

1. **Homepage & Navigation**: Verify landing page, categories, and navbar links load properly.
2. **Authentication Flow**:
   - Customer login & registration.
   - Restaurant owner dashboard authentication.
   - Delivery partner login & order queue.
   - Admin management access.
3. **Order Lifecycle**:
   - Add items to cart.
   - Complete checkout with address and payment method (Cash on Delivery or Online).
   - Verify order status updates from "Pending" through "Delivered".
   - Test delivery OTP handshake.
4. **Subscriptions**:
   - View meal plans, subscribe, pause/resume, and view monthly calendar.
5. **Accessibility**:
   - Full keyboard navigation (Tab/Shift+Tab/Escape).
   - Screen reader compatibility on OTP cards and live notifications.

---

## 6. Rollback Checklist

In the event of a production incident:
1. **Instant Rollback**: Trigger rollback to previous deployment commit/tag in Vercel or cloud provider.
2. **Verify Cached Assets**: Purge CDN/Edge cache if static chunks fail to load.
3. **Database & API Compatibility**: Verify backend compatibility with previous frontend payload schema.
4. **Incident Post-Mortem**: Document root cause, affected user segments, and add automated test coverage.
