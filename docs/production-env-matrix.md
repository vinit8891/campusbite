# CampusBite Production Environment Variables Matrix

This document provides the definitive configuration matrix for staging and production deployments.

> **CRITICAL SECURITY RULE**: Never commit real secrets to Git or share them in public channels.

---

## 1. Frontend Environment Variables (Vercel)

| Variable | Required? | Nature | Example / Expected Format | Where to Configure | Failure Mode if Missing / Invalid |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | Public | `https://api.yourdomain.com` (no trailing slash) | Vercel Project Settings → Environment Variables | Frontend defaults to `http://localhost:8000`, causing CORS/network failure on live domain |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Public (Key) | `AIzaSyD-xxxxxxxxxxxxxxxxxxxxx` | Vercel Project Settings → Environment Variables | Live delivery driver map tracking falls back to static milestone progress cards |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Optional | Public (Key) | `rzp_test_xxxxxx` / `rzp_live_xxxxxx` | Vercel Project Settings → Environment Variables | Falls back to dynamic key retrieval from backend `/payments/razorpay/config` |

---

## 2. Backend Environment Variables (Render / Railway)

| Variable | Required? | Nature | Example / Expected Format | Where to Configure | Failure Mode if Missing / Invalid |
|---|---|---|---|---|---|
| `MONGODB_URL` | **Yes** | **Secret** | `mongodb+srv://app_user:StrongPass@cluster.mongodb.net/?retryWrites=true&w=majority` | Render / Railway Dashboard → Environment | Backend crashes on boot with `EnvironmentValidationError` |
| `DATABASE_NAME` | **Yes** | Public | `campusbite` | Render / Railway Dashboard → Environment | Backend crashes on boot with `EnvironmentValidationError` |
| `SECRET_KEY` | **Yes** | **Secret** | `64+ char random hex string` (generate via `openssl rand -hex 32`) | Render / Railway Dashboard → Environment | Backend crashes on boot; JWT authentication is disabled |
| `JWT_ALGORITHM` | Optional | Public | `HS256` | Render / Railway Dashboard → Environment | Defaults internally to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Optional | Public | `1440` (24 hours) | Render / Railway Dashboard → Environment | Defaults internally to `1440` |
| `ADMIN_EMAIL` | Optional | Public | `admin@campusbite.com` | Render / Railway Dashboard → Environment | Defaults to internal initial admin credential |
| `ADMIN_PASSWORD` | Optional | **Secret** | `StrongAdminPassword#2026` | Render / Railway Dashboard → Environment | Defaults to internal initial admin credential |
| `ALLOWED_ORIGINS` | **Yes** | Public | `https://campusbite.vercel.app,https://campusbite.com` (comma-separated) | Render / Railway Dashboard → Environment | Browsers block all client API calls with CORS preflight errors |
| `RAZORPAY_MOCK` | Optional | Public | `0` (for real Razorpay) or `1` (for local mock) | Render / Railway Dashboard → Environment | Defaults to `1` (Simulated checkout mode) |
| `RAZORPAY_KEY_ID` | Conditional | Public (Key) | `rzp_test_xxxxxx` or `rzp_live_xxxxxx` | Render / Railway Dashboard → Environment | Required if `RAZORPAY_MOCK=0`; boot fails if omitted |
| `RAZORPAY_KEY_SECRET` | Conditional | **Secret** | `RazorpaySecretKeyString` | Render / Railway Dashboard → Environment | Required if `RAZORPAY_MOCK=0`; payment capture fails |
| `RAZORPAY_WEBHOOK_SECRET` | Optional | **Secret** | `WebhookSecretStringFromDashboard` | Render / Railway Dashboard → Environment | Incoming webhook signatures will fail verification |
| `PORT` | Optional | Public | `8000` (auto-injected by Render/Railway) | Runtime injected | Defaults to `8000` |
