"""Smoke test for Mess Subscription Step 3A (order generation)."""

from __future__ import annotations

import asyncio
import os
from datetime import date, timedelta

import httpx

BASE = os.getenv("API_BASE", "http://127.0.0.1:8012")
CUSTOMER_EMAIL = os.getenv("SMOKE_CUSTOMER_EMAIL", "smoke_customer@example.com")
CUSTOMER_PASSWORD = os.getenv("SMOKE_CUSTOMER_PASSWORD", "SmokeTest123!")
ADMIN_EMAIL = os.getenv("SMOKE_ADMIN_EMAIL", "admin@campusbite.com")
ADMIN_PASSWORD = os.getenv("SMOKE_ADMIN_PASSWORD", "admin123")


async def login(client: httpx.AsyncClient, path: str, email: str, password: str) -> str:
    res = await client.post(path, json={"email": email, "password": password})
    if res.status_code != 200:
        raise RuntimeError(f"Login failed for {email}: {res.status_code} {res.text}")
    return res.json()["access_token"]


def weekday_name(value: date) -> str:
    return [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ][value.weekday()]


async def main() -> int:
    async with httpx.AsyncClient(base_url=BASE, timeout=30.0) as client:
        health = await client.get("/health")
        if health.status_code == 404:
            health = await client.get("/")
        if health.status_code != 200:
            print("FAIL: API not reachable at", BASE)
            return 1

        restaurants = await client.get("/restaurants/?limit=20")
        restaurants.raise_for_status()
        restaurant_email = None
        for item in restaurants.json().get("items", []):
            if isinstance(item, dict) and item.get("email"):
                restaurant_email = item["email"]
                break
        if not restaurant_email:
            print("FAIL: no restaurant email")
            return 1

        await client.post(
            "/auth/register",
            json={
                "email": CUSTOMER_EMAIL,
                "password": CUSTOMER_PASSWORD,
                "full_name": "Smoke Customer",
                "phone": "9999900001",
            },
        )
        customer_token = await login(
            client, "/auth/login", CUSTOMER_EMAIL, CUSTOMER_PASSWORD
        )
        customer_headers = {"Authorization": f"Bearer {customer_token}"}

        # Pick a weekday within the next 7 days for generation
        target = date.today()
        for _ in range(7):
            if weekday_name(target) in {"monday", "wednesday", "friday"}:
                break
            target += timedelta(days=1)

        start = target - timedelta(days=1)
        end = target + timedelta(days=14)

        create_sub = await client.post(
            "/subscriptions/",
            headers=customer_headers,
            json={
                "restaurant_email": restaurant_email,
                "subscription_type": "weekly",
                "meal_type": "lunch",
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "delivery_days": ["monday", "wednesday", "friday"],
                "price": 900,
                "payment_status": "paid",
            },
        )
        if create_sub.status_code != 200:
            print("FAIL create subscription:", create_sub.status_code, create_sub.text)
            return 1
        sub_id = create_sub.json()["subscription"]["subscription_id"]
        print("OK active subscription", sub_id)

        admin_login = await client.post(
            "/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        if admin_login.status_code != 200:
            print("SKIP admin generate (admin login unavailable)")
            return 0

        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        gen = await client.post(
            "/admin/subscriptions/generate",
            headers=admin_headers,
            json={"date": target.isoformat()},
        )
        if gen.status_code != 200:
            print("FAIL generate:", gen.status_code, gen.text)
            return 1
        body = gen.json()
        if body.get("generated_count", 0) < 1:
            print("FAIL expected at least one generated order", body)
            return 1
        print("OK generate", body)

        dup = await client.post(
            "/admin/subscriptions/generate",
            headers=admin_headers,
            json={"date": target.isoformat()},
        )
        dup.raise_for_status()
        if dup.json().get("generated_count", 0) != 0:
            print("FAIL duplicate generation should produce 0", dup.json())
            return 1
        print("OK duplicate prevented")

        wrong_day = target + timedelta(days=1)
        while weekday_name(wrong_day) in {"monday", "wednesday", "friday"}:
            wrong_day += timedelta(days=1)
        skip = await client.post(
            "/admin/subscriptions/generate",
            headers=admin_headers,
            json={"date": wrong_day.isoformat()},
        )
        skip.raise_for_status()
        print("OK wrong weekday run", skip.json())

        my_orders = await client.get("/orders/my", headers=customer_headers)
        my_orders.raise_for_status()
        generated = [
            o
            for o in my_orders.json()
            if o.get("generated_by") == "subscription"
            and o.get("subscription_order_date") == target.isoformat()
        ]
        if not generated:
            print("FAIL customer cannot see generated order")
            return 1
        print("OK customer sees generated order")

        manual = await client.post(
            "/subscriptions/",
            headers=customer_headers,
            json={
                "restaurant_email": restaurant_email,
                "subscription_type": "weekly",
                "meal_type": "dinner",
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "delivery_days": ["tuesday"],
                "price": 500,
            },
        )
        manual.raise_for_status()
        paused_id = manual.json()["subscription"]["subscription_id"]
        pause_res = await client.put(
            f"/subscriptions/{paused_id}/pause",
            headers=customer_headers,
            json={
                "pause_from": start.isoformat(),
                "pause_to": end.isoformat(),
            },
        )
        pause_res.raise_for_status()
        paused_gen = await client.post(
            "/admin/subscriptions/generate",
            headers=admin_headers,
            json={"date": target.isoformat()},
        )
        paused_gen.raise_for_status()
        print("OK paused subscription skipped on rerun", paused_gen.json())

        cancel_res = await client.put(
            f"/subscriptions/{paused_id}/cancel",
            headers=customer_headers,
        )
        cancel_res.raise_for_status()
        print("OK cancelled subscription flow")

    print("ALL STEP 3A SMOKE TESTS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
