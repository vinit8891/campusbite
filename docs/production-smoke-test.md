# CampusBite Production Smoke Test Plan

This document details step-by-step verification procedures for staging and production deployments.

---

## 1. Customer End-to-End Smoke Test Flow

1. **Registration & Auth**:
   - Navigate to `/register`.
   - Submit name, valid email, 10-digit phone, and password (≥6 chars).
   - Confirm immediate redirect to login or auto-authenticated session.
   - Test `/login` with registered credentials; confirm JWT token is stored.
2. **Catalog & Restaurant Selection**:
   - Navigate to `/restaurants`.
   - Filter by cuisine and search by keyword.
   - Click a restaurant card to visit `/restaurants/[slug]`.
3. **Menu & Cart Operations**:
   - Browse menu categories.
   - Click "Add to Cart" on at least 2 dishes.
   - Adjust quantities in floating cart bar; verify subtotal updates in real time.
4. **Checkout & Order Placement**:
   - Navigate to `/checkout`.
   - Enter delivery address and phone number.
   - Select payment method:
     - **Cash on Delivery**: Submits directly → redirects to `/order-success`.
     - **Razorpay (Online)**: Opens Razorpay Checkout modal → validates payment signature → redirects to `/order-success`.
5. **Live Tracking & Handover OTP**:
   - Open `/track-order/[id]` or `/orders/[id]`.
   - Verify 5-digit delivery confirmation OTP is rendered.
   - Confirm status changes dynamically via polling/real-time updates.
6. **Post-Delivery Review**:
   - Once order reaches "Delivered", open rating dialog.
   - Submit star rating (1–5) and review comment; verify submission success.

---

## 2. Restaurant Owner Smoke Test Flow

1. **Authentication**:
   - Navigate to `/restaurant/login`.
   - Log in with verified restaurant credentials.
2. **Dashboard & KPIs**:
   - Verify `/restaurant/dashboard` displays today's sales, active orders, and menu counts.
3. **Menu Management (CRUD)**:
   - Navigate to `/restaurant/dashboard/menu`.
   - Click "Add Item" (`/restaurant/dashboard/menu/add`).
   - Create a test dish; verify it renders in menu list.
   - Edit item price/availability; toggle status.
4. **Order Processing Lifecycle**:
   - Navigate to `/restaurant/dashboard/orders`.
   - Locate pending incoming order.
   - Advance status: `Pending` → `Accepted` → `Preparing` → `Ready for Pickup`.
5. **Subscription Plans**:
   - Navigate to `/restaurant/dashboard/subscription-plans`.
   - View active meal subscription tiers.

---

## 3. Delivery Partner Smoke Test Flow

1. **Authentication**:
   - Navigate to `/delivery/login`.
   - Log in with verified delivery partner credentials.
2. **Available Orders & Acceptance**:
   - Navigate to `/delivery/dashboard/available-orders`.
   - View orders marked `Ready for Pickup`.
   - Click "Accept Delivery" on an available order.
3. **Navigation & Handover**:
   - Open `/delivery/dashboard/orders`.
   - Click external Google Maps direction link to verify `rel="noopener noreferrer"`.
   - Prompt customer for 5-digit OTP.
   - Enter OTP in `/delivery/dashboard/orders` verification input; click "Verify & Complete".
4. **Delivery Completion & Earnings**:
   - Confirm order moves to `Delivered`.
   - Check `/delivery/earnings` to verify payout increment.

---

## 4. Admin Portal Smoke Test Flow

1. **Authentication**:
   - Navigate to `/admin/login`.
   - Log in with configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
2. **Campus Overview**:
   - Verify `/admin` displays campus-wide metrics (total revenue, active orders, total restaurants).
3. **Restaurant Administration**:
   - Navigate to `/admin/restaurants`.
   - Approve, toggle active state, or add new restaurant (`/admin/add-restaurant`).
4. **User & Order Audit**:
   - Navigate to `/admin/orders` and `/admin/users`.
   - Test pagination controls (`Page X of Y`).
5. **Subscription Management**:
   - Navigate to `/admin/subscriptions`.
   - Review active campus meal subscriptions and payment settlement statuses.

---

## 5. Payment Methods Verification

### 5.1 Cash on Delivery (COD)
- Select COD at checkout.
- Order created with `payment_method: "cod"` and `payment_status: "pending"`.
- Mark delivered → payment status transitions to `paid`.

### 5.2 Razorpay TEST Mode
- Pre-requisites: `RAZORPAY_MOCK=0` with `RAZORPAY_KEY_ID=rzp_test_...` and `RAZORPAY_KEY_SECRET=...`.
- Initiate payment → Razorpay test checkout opens.
- Use Razorpay Test Card/UPI credentials.
- Signature verified by backend `/payments/razorpay/verify`.
- Order marked `payment_status: "paid"`.

### 5.3 Razorpay LIVE Mode Prerequisites
- Production Razorpay Merchant Account activated and KYC approved.
- Live API keys (`rzp_live_...`) configured in hosting environment.
- Webhook endpoint `https://api.yourdomain.com/payments/razorpay/webhook` registered in Razorpay Dashboard with `RAZORPAY_WEBHOOK_SECRET`.
- HTTPS enabled across frontend and backend.
