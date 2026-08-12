"""Smoke test for Mess Subscription Step 1 APIs."""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import date, timedelta

import httpx

BASE = os.getenv("API_BASE", "http://127.0.0.1:8000")
CUSTOMER_EMAIL = os.getenv("SMOKE_CUSTOMER_EMAIL", "smoke_customer@example.com")
CUSTOMER_PASSWORD = os.getenv("SMOKE_CUSTOMER_PASSWORD", "SmokeTest123!")
ADMIN_EMAIL = os.getenv("SMOKE_ADMIN_EMAIL", "admin@campusbite.com")
ADMIN_PASSWORD = os.getenv("SMOKE_ADMIN_PASSWORD", "admin123")
RESTAURANT_EMAIL = os.getenv("SMOKE_RESTAURANT_EMAIL")


async def login(client: httpx.AsyncClient, path: str, email: str, password: str) -> str:
    res = await client.post(path, json={"email": email, "password": password})
    if res.status_code != 200:
        raise RuntimeError(f"Login failed for {email}: {res.status_code} {res.text}")
    return res.json()["access_token"]


async def main() -> int:
    async with httpx.AsyncClient(base_url=BASE, timeout=30.0) as client:
        health = await client.get("/health")
        if health.status_code == 404:
            health = await client.get("/")
        if health.status_code != 200:
            print("FAIL: API not reachable at", BASE)
            return 1

        # Register customer (ignore if exists)
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

        restaurants = await client.get("/restaurants/?limit=20")
        restaurants.raise_for_status()
        payload = restaurants.json()
        items = payload.get("items") if isinstance(payload, dict) else payload
        if not isinstance(items, list):
            items = []

        restaurant_email = RESTAURANT_EMAIL
        if not restaurant_email:
            for item in items:
                if isinstance(item, dict) and item.get("email"):
                    restaurant_email = item["email"]
                    break

        if not restaurant_email:
            print("FAIL: No restaurant with email found for subscription create test")
            return 1
        start = date.today()
        end = start + timedelta(days=27)

        create_res = await client.post(
            "/subscriptions/",
            headers=customer_headers,
            json={
                "restaurant_email": restaurant_email,
                "subscription_type": "monthly",
                "meal_type": "lunch",
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "delivery_days": ["monday", "wednesday", "friday"],
                "price": 2500,
                "payment_status": "pending",
                "auto_renew": False,
            },
        )
        if create_res.status_code != 200:
            print("FAIL create:", create_res.status_code, create_res.text)
            return 1

        subscription = create_res.json()["subscription"]
        sub_id = subscription["subscription_id"]
        print("OK create", sub_id)

        my_res = await client.get("/subscriptions/my", headers=customer_headers)
        my_res.raise_for_status()
        assert any(
            s["subscription_id"] == sub_id for s in my_res.json().get("items", [])
        )
        print("OK my subscriptions")

        detail_res = await client.get(
            f"/subscriptions/{sub_id}", headers=customer_headers
        )
        detail_res.raise_for_status()
        print("OK detail")

        pause_from = (start + timedelta(days=2)).isoformat()
        pause_to = (start + timedelta(days=5)).isoformat()
        pause_res = await client.put(
            f"/subscriptions/{sub_id}/pause",
            headers=customer_headers,
            json={"pause_from": pause_from, "pause_to": pause_to},
        )
        if pause_res.status_code != 200:
            print("FAIL pause:", pause_res.status_code, pause_res.text)
            return 1
        assert pause_res.json()["subscription"]["status"] == "paused"
        print("OK pause")

        resume_res = await client.put(
            f"/subscriptions/{sub_id}/resume", headers=customer_headers
        )
        resume_res.raise_for_status()
        assert resume_res.json()["subscription"]["status"] == "active"
        print("OK resume")

        cancel_res = await client.put(
            f"/subscriptions/{sub_id}/cancel", headers=customer_headers
        )
        cancel_res.raise_for_status()
        assert cancel_res.json()["subscription"]["status"] == "cancelled"
        print("OK cancel")

        admin_login = await client.post(
            "/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        if admin_login.status_code == 200:
            admin_headers = {
                "Authorization": f"Bearer {admin_login.json()['access_token']}"
            }
            admin_res = await client.get("/subscriptions/", headers=admin_headers)
            admin_res.raise_for_status()
            print("OK admin list", len(admin_res.json().get("items", [])))
        else:
            print("SKIP admin list (admin credentials unavailable)")

        unauth = await client.get("/subscriptions/my")
        if unauth.status_code == 401:
            print("OK auth required for customer list")
        else:
            print("FAIL expected 401 for unauthenticated my subscriptions", unauth.status_code)
            return 1

        # Restaurant list requires restaurant owner token — skip if unavailable
        owner_login = await client.post(
            "/restaurant-owner/login",
            json={"email": restaurant_email, "password": "password"},
        )
        if owner_login.status_code == 200:
            owner_headers = {
                "Authorization": f"Bearer {owner_login.json()['access_token']}"
            }
            rest_res = await client.get(
                f"/subscriptions/restaurant/{restaurant_email}",
                headers=owner_headers,
            )
            rest_res.raise_for_status()
            print("OK restaurant list", len(rest_res.json().get("items", [])))
        else:
            print("SKIP restaurant list (owner login unavailable)")

        orders_res = await client.get("/orders/my", headers=customer_headers)
        orders_res.raise_for_status()
        print("OK existing orders endpoint untouched")

    print("ALL SUBSCRIPTION SMOKE TESTS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
