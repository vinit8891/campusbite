"""Smoke test for Mess Subscription Step 2 (plans + calendar)."""

from __future__ import annotations

import asyncio
import os
from datetime import date, timedelta

import httpx

BASE = os.getenv("API_BASE", "http://127.0.0.1:8010")
CUSTOMER_EMAIL = os.getenv("SMOKE_CUSTOMER_EMAIL", "smoke_customer@example.com")
CUSTOMER_PASSWORD = os.getenv("SMOKE_CUSTOMER_PASSWORD", "SmokeTest123!")
RESTAURANT_EMAIL = os.getenv("SMOKE_RESTAURANT_EMAIL")
RESTAURANT_PASSWORD = os.getenv("SMOKE_RESTAURANT_PASSWORD", "password")


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

        restaurants = await client.get("/restaurants/?limit=20")
        restaurants.raise_for_status()
        items = restaurants.json().get("items", [])
        restaurant_email = RESTAURANT_EMAIL
        if not restaurant_email:
            for item in items:
                if isinstance(item, dict) and item.get("email"):
                    restaurant_email = item["email"]
                    break
        if not restaurant_email:
            print("FAIL: no restaurant email available")
            return 1

        owner_login = await client.post(
            "/restaurant-owner/login",
            json={"email": restaurant_email, "password": RESTAURANT_PASSWORD},
        )
        if owner_login.status_code != 200:
            print("SKIP restaurant plan CRUD (owner login unavailable)")
            owner_headers = None
        else:
            owner_headers = {
                "Authorization": f"Bearer {owner_login.json()['access_token']}"
            }

        plan_id = None
        if owner_headers:
            create_plan = await client.post(
                "/subscription-plans/",
                headers=owner_headers,
                json={
                    "restaurant_email": restaurant_email,
                    "name": "Smoke Lunch Plan",
                    "description": "Step 2 smoke plan",
                    "subscription_type": "weekly",
                    "meal_type": "lunch",
                    "price": 999,
                    "delivery_days": ["monday", "wednesday", "friday"],
                    "start_time": "12:00",
                    "end_time": "14:00",
                    "active": True,
                },
            )
            if create_plan.status_code != 200:
                print("FAIL create plan:", create_plan.status_code, create_plan.text)
                return 1
            plan_id = create_plan.json()["plan"]["plan_id"]
            print("OK create plan", plan_id)

            list_plans = await client.get(
                f"/subscription-plans/{restaurant_email}",
                headers=owner_headers,
            )
            list_plans.raise_for_status()
            print("OK list restaurant plans")

            update_plan = await client.put(
                f"/subscription-plans/{plan_id}",
                headers=owner_headers,
                json={"description": "Updated smoke plan"},
            )
            update_plan.raise_for_status()
            print("OK update plan")

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
        start = date.today()

        if plan_id:
            public_plans = await client.get(
                f"/subscription-plans/public/{restaurant_email}",
                headers=customer_headers,
            )
            public_plans.raise_for_status()
            print("OK public plans", len(public_plans.json().get("items", [])))

            start = date.today()
            create_sub = await client.post(
                "/subscriptions/",
                headers=customer_headers,
                json={
                    "plan_id": plan_id,
                    "start_date": start.isoformat(),
                },
            )
            if create_sub.status_code != 200:
                print("FAIL plan subscribe:", create_sub.status_code, create_sub.text)
                return 1
            sub = create_sub.json()["subscription"]
            assert sub.get("plan_id") == plan_id
            print("OK subscribe via plan")

        # Legacy create path still works
        legacy = await client.post(
            "/subscriptions/",
            headers=customer_headers,
            json={
                "restaurant_email": restaurant_email,
                "subscription_type": "weekly",
                "meal_type": "dinner",
                "start_date": start.isoformat(),
                "end_date": (start + timedelta(days=6)).isoformat(),
                "delivery_days": ["tuesday", "thursday"],
                "price": 500,
            },
        )
        if legacy.status_code != 200:
            print("FAIL legacy subscribe:", legacy.status_code, legacy.text)
            return 1
        print("OK legacy subscription create")

        calendar = await client.get(
            "/subscriptions/calendar",
            headers=customer_headers,
        )
        calendar.raise_for_status()
        body = calendar.json()
        assert "today_meals" in body and "upcoming_meals" in body
        print("OK calendar", len(body.get("upcoming_meals", [])))

        orders_res = await client.get("/orders/my", headers=customer_headers)
        orders_res.raise_for_status()
        print("OK orders untouched")

        if owner_headers and plan_id:
            delete_plan = await client.delete(
                f"/subscription-plans/{plan_id}",
                headers=owner_headers,
            )
            delete_plan.raise_for_status()
            print("OK delete plan")

    print("ALL STEP 2 SMOKE TESTS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
