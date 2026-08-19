# CampusBite Production Deployment Runbook

This runbook outlines the step-by-step procedure for deploying CampusBite across Vercel, Render/Railway, MongoDB Atlas, and Razorpay.

---

## 1. MongoDB Atlas Setup

1. **Create Cluster**:
   - Provision an M0 (Free) or M10+ (Production) cluster in your target cloud region (e.g. AWS `ap-south-1` Mumbai).
2. **Configure Database User**:
   - Navigate to **Security → Database Access** → Add New Database User.
   - Set Authentication Method to `Password` with `Read and write to any database` privileges.
3. **Configure Network Access**:
   - Navigate to **Security → Network Access** → Add IP Address.
   - Add `0.0.0.0/0` (Allow Access from Anywhere) to permit Render/Vercel dynamic egress IPs.
4. **Obtain Connection String**:
   - Click **Connect → Drivers → Python** (version 3.12+).
   - Copy connection URI: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`.

---

## 2. Backend Deployment on Render

1. **Create Web Service**:
   - Log into [Render Dashboard](https://dashboard.render.com/) → **New + → Web Service**.
   - Connect your Git repository (`vinit8891/campusbite`).
2. **Configure Service Settings**:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Set Environment Variables**:
   - Add all backend variables from [`docs/production-env-matrix.md`](file:///e:/campusbite/campusbite/docs/production-env-matrix.md):
     - `MONGODB_URL`, `DATABASE_NAME`, `SECRET_KEY`, `ALLOWED_ORIGINS`, `RAZORPAY_MOCK`, etc.
4. **Deploy & Verify Health**:
   - Click **Create Web Service**.
   - Wait for deployment to complete.
   - Test endpoint in browser/curl: `https://<your-backend-slug>.onrender.com/health`.
   - Verify response: `{"status": "ok", "database": "connected"}`.

---

## 3. Frontend Deployment on Vercel

1. **Import Project**:
   - Log into [Vercel Dashboard](https://vercel.com/) → **Add New Project**.
   - Import your Git repository (`vinit8891/campusbite`).
2. **Configure Build Settings**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./` (Root)
   - **Build Command**: `next build` (or default)
   - **Output Directory**: `.next` (default)
3. **Set Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: `https://<your-backend-slug>.onrender.com` (no trailing slash).
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Your restricted Google Maps API key.
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`: `rzp_test_...` or `rzp_live_...`.
4. **Deploy**:
   - Click **Deploy**. Vercel will build and assign a production URL (e.g. `https://campusbite.vercel.app`).

---

## 4. Post-Deployment Linking (CORS & Webhooks)

1. **Update Backend CORS**:
   - In Render Dashboard → Environment Variables, update `ALLOWED_ORIGINS` with the real Vercel URL and any custom domains:
     `ALLOWED_ORIGINS=https://campusbite.vercel.app,https://campusbite.com`
   - Trigger a manual redeploy on Render.
2. **Razorpay Webhook Setup**:
   - Log into [Razorpay Dashboard](https://dashboard.razorpay.com/) → **Settings → Webhooks → Add New Webhook**.
   - **Webhook URL**: `https://<your-backend-slug>.onrender.com/payments/razorpay/webhook`
   - **Secret**: Enter a secret string and save it to backend `RAZORPAY_WEBHOOK_SECRET`.
   - **Active Events**: `payment.authorized`, `payment.failed`, `payment.captured`, `refund.created`.
3. **Google Maps API Key Restrictions**:
   - In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**.
   - Under **Application Restrictions**, select **Websites (HTTP referrers)**.
   - Add: `https://*.vercel.app/*` and `https://*.yourdomain.com/*`.
   - Under **API Restrictions**, restrict key to **Maps JavaScript API** and **Places API**.
