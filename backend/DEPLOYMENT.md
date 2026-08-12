# CampusBite Backend — Deployment Guide

Operational notes for running the FastAPI API in production.

## Required environment variables

Set these in `backend/.env` before starting the server.

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URL` | Yes | MongoDB connection string |
| `DATABASE_NAME` | Yes | Database name |
| `SECRET_KEY` or `JWT_SECRET` | Yes | JWT signing secret |
| `RAZORPAY_KEY_ID` | Yes* | Razorpay key (*skipped in mock mode) |
| `RAZORPAY_KEY_SECRET` | Yes* | Razorpay secret (*skipped in mock mode) |
| `RAZORPAY_WEBHOOK_SECRET` | Recommended | Webhook signature verification |
| `ADMIN_EMAIL` | Recommended | Admin login email |
| `ADMIN_PASSWORD` | Recommended | Admin login password |
| `ALLOWED_ORIGINS` | Production | Comma/newline-separated frontend origins |
| `APP_NAME` | Optional | Shown in `/health` (default: CampusBite API) |
| `APP_VERSION` | Optional | Shown in `/health` (default: 1.0.0) |
| `ENVIRONMENT` | Optional | e.g. `production`, `staging` (default: development) |
| `RAZORPAY_MOCK` | Optional | `1` to skip live Razorpay credential checks at boot |

## Production startup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Use a process manager (systemd, Docker, PM2) to keep uvicorn running and restart on failure.

### Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness — process up, MongoDB ping |
| `GET /health/ready` | Readiness — required env + MongoDB (503 when not ready) |
| `GET /metrics` | Simple JSON request metrics |

Configure your load balancer or orchestrator to use `/health/ready` for traffic routing.

## Nginx reverse proxy

Example upstream block:

```nginx
upstream campusbite_api {
    server 127.0.0.1:8000;
}

server {
    listen 443 ssl http2;
    server_name api.campusbite.in;

    ssl_certificate     /etc/letsencrypt/live/api.campusbite.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.campusbite.in/privkey.pem;

    location / {
        proxy_pass http://campusbite_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 5m;
    }
}
```

Set `ALLOWED_ORIGINS` to your frontend URL(s), e.g. `https://campusbite.in`.

## HTTPS

Terminate TLS at Nginx (or your cloud load balancer). The API sets `Strict-Transport-Security` when `X-Forwarded-Proto: https` is present.

## Backups

From the `backend` directory:

```bash
python scripts/backup_database.py
```

Requires [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/) (`mongodump` on PATH).

Backups are written to:

```
backend/backups/YYYY-MM-DD_HH-MM/
```

Schedule with cron or your platform scheduler, e.g. daily at 02:00:

```cron
0 2 * * * cd /opt/campusbite/backend && ./venv/bin/python scripts/backup_database.py
```

## Restoring backups

Restore is not automated in this repo. Use `mongorestore` against a backup folder:

```bash
mongorestore --uri="$MONGODB_URL" --db="$DATABASE_NAME" --drop \
  backend/backups/2026-08-13_02-00/$DATABASE_NAME
```

**Warning:** `--drop` removes existing collections in the target database. Test restores on a staging cluster first.

## Monitoring endpoints

- **`GET /health`** — status, database, version, uptime, app name, environment
- **`GET /health/ready`** — readiness for load balancers
- **`GET /metrics`** — total requests, per-route counts, average response time, active rate-limit buckets, uptime

Every response includes `X-Request-ID` for log correlation. Error JSON bodies include `request_id` when available.

## Logs

Application logs use the centralized logger (`app.core.logging`). Request logs include `request_id`, method, path, status, and duration — never passwords or payment secrets.
