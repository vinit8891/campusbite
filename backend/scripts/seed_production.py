#!/usr/bin/env python3
"""Clean Production Seeder & Purge CLI for CampusBite.

Usage:
    python backend/scripts/seed_production.py --purge-only
    python backend/scripts/seed_production.py --seed-canteens
    python backend/scripts/seed_production.py --full-reset

Options:
    --purge-only: Wipes development transaction records (orders, settlements, ledgers).
    --seed-canteens: Seeds canonical Zeal College campus eateries and default admin.
    --full-reset: Purges transactions and seeds canonical production eateries.
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone
import os
from pathlib import Path
import sys

from dotenv import load_dotenv

# Ensure backend root is on Python path
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(BACKEND_DIR / ".env")

from motor.motor_asyncio import AsyncIOMotorClient
from app.auth.security import get_password_hash
from app.core.logging import get_logger

logger = get_logger("seed_production")


ZEAL_CANTEENS = [
    {
        "slug": "zeal-central-canteen",
        "name": "Zeal Central Canteen",
        "email": "central.canteen@zeal.edu.in",
        "description": "Campus central canteen serving fresh North & South Indian dishes, full meal thalis, breakfast snacks, and hot/cold beverages.",
        "address": "Ground Floor, Central Amenities Building, Zeal College Campus, Narhe, Pune - 411041",
        "phone": "9822011223",
        "cuisine": "North Indian, South Indian, Thalis, Snacks",
        "opening_hours": "08:00",
        "closing_hours": "21:30",
        "delivery_time": "15-20 min",
        "distance": "0.1 km",
        "rating": 4.5,
        "price_for_two": 160,
        "commission_rate": 0.18,
        "gst_rate": 0.05,
        "is_verified": True,
        "verification_status": "approved",
        "is_active": True,
        "is_accepting_orders": True,
        "is_open": True,
        "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
        "menu": [
            {
                "id": "zcc_item_1",
                "name": "Special Veg Thali",
                "price": 90.0,
                "counter_price": 90.0,
                "category": "Thalis",
                "description": "2 Chapatis, Dal Tadka, Paneer Sabji, Jeera Rice, Pickle & Papad.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "zcc_item_2",
                "name": "Masala Dosa",
                "price": 55.0,
                "counter_price": 55.0,
                "category": "South Indian",
                "description": "Crispy golden dosa stuffed with spiced potato masala, served with coconut chutney & sambar.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "zcc_item_3",
                "name": "Idli Sambar (2 Pcs)",
                "price": 40.0,
                "counter_price": 40.0,
                "category": "South Indian",
                "description": "Steamed fluffy rice idlis with piping hot aromatic sambar and chutney.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "zcc_item_4",
                "name": "Pav Bhaji",
                "price": 60.0,
                "counter_price": 60.0,
                "category": "Snacks",
                "description": "Spiced buttery vegetable mash served with 2 toasted butter pavs.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "zcc_item_5",
                "name": "Special Masala Chai",
                "price": 15.0,
                "counter_price": 15.0,
                "category": "Beverages",
                "description": "Freshly brewed milk tea infused with crushed ginger and cardamom.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "zcc_item_6",
                "name": "Cold Coffee with Ice Cream",
                "price": 35.0,
                "counter_price": 35.0,
                "category": "Beverages",
                "description": "Chilled blended coffee topped with vanilla ice cream scoop.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
            },
        ],
    },
    {
        "slug": "pragati-kitchen",
        "name": "Pragati Kitchen",
        "email": "pragati.kitchen@zeal.edu.in",
        "description": "Wholesome student mess meals, daily tiffin subscriptions, and authentic homestyle Maharashtrian dishes.",
        "address": "Near Girls Hostel 2, Zeal Educational Complex, Pune - 411041",
        "phone": "9822044556",
        "cuisine": "Maharashtrian, Mess & Tiffins, Homestyle",
        "opening_hours": "07:30",
        "closing_hours": "22:00",
        "delivery_time": "10-15 min",
        "distance": "0.2 km",
        "rating": 4.7,
        "price_for_two": 140,
        "commission_rate": 0.18,
        "gst_rate": 0.05,
        "is_verified": True,
        "verification_status": "approved",
        "is_active": True,
        "is_accepting_orders": True,
        "is_open": True,
        "image": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80",
        "menu": [
            {
                "id": "pk_item_1",
                "name": "Daily Maharashtrian Thali",
                "price": 80.0,
                "counter_price": 80.0,
                "category": "Mess Meals",
                "description": "3 Soft Chapatis, Dry Vegetable, Dal/Usal, Steamed Rice, Thecha & Salad.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "pk_item_2",
                "name": "Chapati Bhaji Box",
                "price": 60.0,
                "counter_price": 60.0,
                "category": "Tiffins",
                "description": "4 Fresh Wheat Chapatis with choice of seasonal Sukhi Bhaji.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "pk_item_3",
                "name": "Pithla Bhakri Combo",
                "price": 65.0,
                "counter_price": 65.0,
                "category": "Special",
                "description": "Traditional gram flour besan pithla, 2 jowar bhakris, green chilli thecha & onions.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "pk_item_4",
                "name": "Kanda Poha with Sev",
                "price": 30.0,
                "counter_price": 30.0,
                "category": "Breakfast",
                "description": "Light beaten rice flakes tempered with mustard, turmeric, fried peanuts, and fresh coriander.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "pk_item_5",
                "name": "Kolhapuri Misal Pav",
                "price": 50.0,
                "counter_price": 50.0,
                "category": "Special",
                "description": "Spicy sprouted moth bean curry topped with farsan, chopped onions, and lemon with 2 pavs.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=80",
            },
        ],
    },
    {
        "slug": "campus-cafe-pizza-hub",
        "name": "Campus Cafe / Pizza Hub",
        "email": "cafe.pizzahub@zeal.edu.in",
        "description": "Trendy campus cafe offering wood-fired style pizzas, paneer wraps, loaded burgers, and cold brews.",
        "address": "Student Plaza, Food Court Stall 3, Zeal College Campus, Pune - 411041",
        "phone": "9822077889",
        "cuisine": "Pizzas, Fast Food, Wraps & Burgers, Beverages",
        "opening_hours": "09:30",
        "closing_hours": "23:00",
        "delivery_time": "15-25 min",
        "distance": "0.15 km",
        "rating": 4.6,
        "price_for_two": 220,
        "commission_rate": 0.18,
        "gst_rate": 0.05,
        "is_verified": True,
        "verification_status": "approved",
        "is_active": True,
        "is_accepting_orders": True,
        "is_open": True,
        "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
        "menu": [
            {
                "id": "ccp_item_1",
                "name": "Margherita Classic Pizza (7-inch)",
                "price": 110.0,
                "counter_price": 110.0,
                "category": "Pizzas",
                "description": "Hand-stretched crust, marinara herb sauce, 100% mozzarella cheese, fresh basil.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "ccp_item_2",
                "name": "Tandoori Paneer Wrap",
                "price": 75.0,
                "counter_price": 75.0,
                "category": "Wraps",
                "description": "Smoky marinated paneer cubes wrapped with crunchy veggies and mint mayo.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "ccp_item_3",
                "name": "Crispy Veg Cheese Burger",
                "price": 65.0,
                "counter_price": 65.0,
                "category": "Burgers",
                "description": "Golden crumbed vegetable patty, melted cheese slice, tomato and lettuce on toasted sesame bun.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "ccp_item_4",
                "name": "Peri Peri French Fries",
                "price": 50.0,
                "counter_price": 50.0,
                "category": "Sides",
                "description": "Crispy potato fries tossed in fiery African peri peri spice blend.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
            },
            {
                "id": "ccp_item_5",
                "name": "Hazelnut Cold Brew",
                "price": 60.0,
                "counter_price": 60.0,
                "category": "Beverages",
                "description": "Slow-steeped Arabica cold coffee flavored with toasted hazelnut essence.",
                "is_veg": True,
                "available": True,
                "image": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
            },
        ],
    },
]


async def purge_transactional_data(db) -> dict[str, int]:
    """
    Wipes development orders, settlements, payment logs, and clears ledger balances to ₹0.00.
    """
    print("Purging transactional and settlement data...")
    counts = {}

    for collection_name in [
        "orders",
        "settlements",
        "canteen_settlements",
        "payments",
        "refunds",
        "meal_redemptions",
        "courier_shift_reservations",
    ]:
        col = db[collection_name]
        res = await col.delete_many({})
        counts[collection_name] = res.deleted_count
        print(f"  - Deleted {res.deleted_count} records from {collection_name}")

    # Reset courier accounting ledgers to ₹0.00
    if "delivery_partners" in await db.list_collection_names():
        partner_res = await db["delivery_partners"].update_many(
            {},
            {
                "$set": {
                    "cash_in_hand": 0.0,
                    "net_cash_due": 0.0,
                    "net_cash_due_to_admin": 0.0,
                    "unremitted_cod_balance": 0.0,
                    "wages_earned": 0.0,
                    "total_payout_earned": 0.0,
                    "is_locked": False,
                    "orders_completed": 0,
                    "total_deliveries": 0,
                }
            },
        )
        print(f"  - Reset {partner_res.modified_count} delivery partner accounting ledgers to pure ₹0.00")

    print("Transactional purge complete.\n")
    return counts


async def seed_canteens_and_admin(db) -> None:
    """
    Seeds production Zeal College eateries, menu items, and master admin credentials.
    """
    print("Seeding production campus eateries & admin account...")
    now_utc = datetime.now(timezone.utc)

    # 1. Master Admin Setup
    admin_col = db["users"]
    admin_doc = await admin_col.find_one({"email": "admin@campusbite.com"})
    if not admin_doc:
        await admin_col.insert_one({
            "full_name": "Zeal Campus Admin",
            "name": "Zeal Campus Admin",
            "email": "admin@campusbite.com",
            "password_hash": get_password_hash("Admin@CampusBite2026!"),
            "role": "admin",
            "phone": "9800000001",
            "is_active": True,
            "created_at": now_utc,
            "updated_at": now_utc,
        })
        print("  ✓ Created master admin account (admin@campusbite.com)")
    else:
        await admin_col.update_one(
            {"_id": admin_doc["_id"]},
            {
                "$set": {
                    "role": "admin",
                    "is_active": True,
                    "updated_at": now_utc,
                }
            },
        )
        print("  ✓ Ensured master admin role (admin@campusbite.com)")

    # 2. Campus Eateries & Initial Menus
    rest_col = db["restaurants"]
    menu_col = db["menu"]

    for eatery in ZEAL_CANTEENS:
        slug = eatery["slug"]
        menu_items = eatery.get("menu", [])

        # Eatery document without inline menu for normalized storage
        doc_data = {k: v for k, v in eatery.items() if k != "menu"}
        doc_data["updated_at"] = now_utc

        existing = await rest_col.find_one({"$or": [{"slug": slug}, {"email": eatery["email"]}]})
        if existing:
            await rest_col.update_one({"_id": existing["_id"]}, {"$set": doc_data})
            rest_id = existing["_id"]
            print(f"  ✓ Updated eatery '{eatery['name']}' ({slug})")
        else:
            doc_data["created_at"] = now_utc
            res = await rest_col.insert_one(doc_data)
            rest_id = res.inserted_id
            print(f"  ✓ Created eatery '{eatery['name']}' ({slug})")

        # Seed Menu Items for this eatery
        for item in menu_items:
            item_doc = {
                "restaurant_id": str(rest_id),
                "restaurant_email": eatery["email"],
                "name": item["name"],
                "price": item["price"],
                "counter_price": item.get("counter_price", item["price"]),
                "category": item["category"],
                "description": item.get("description", ""),
                "is_veg": item.get("is_veg", True),
                "available": item.get("available", True),
                "image": item.get("image", ""),
                "updated_at": now_utc,
            }
            existing_item = await menu_col.find_one({
                "restaurant_email": eatery["email"],
                "name": item["name"],
            })
            if existing_item:
                await menu_col.update_one({"_id": existing_item["_id"]}, {"$set": item_doc})
            else:
                item_doc["created_at"] = now_utc
                await menu_col.insert_one(item_doc)

        print(f"    - Ensured {len(menu_items)} menu items for {eatery['name']}")

    # 3. Ensure global platform configuration is active
    sys_col = db["system_settings"]
    await sys_col.update_one(
        {"_id": "global_config"},
        {
            "$setOnInsert": {
                "is_platform_active": True,
                "maintenance_message": "CampusBite is currently paused for scheduled maintenance.",
                "max_cod_limit": 500.0,
                "surge_fee": 0.0,
                "operating_hours": {"start": "08:00", "end": "02:00"},
                "created_at": now_utc,
            }
        },
        upsert=True,
    )
    print("  ✓ System settings initialized (global_config)")

    print("\nProduction canteens seeding complete.")


async def run_seeder(purge_only: bool = False, seed_canteens: bool = False, full_reset: bool = False):
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    database_name = os.getenv("DATABASE_NAME", "campusbite")

    client = AsyncIOMotorClient(mongodb_url)
    db = client[database_name]

    print(f"Connecting to MongoDB database: '{database_name}' on {mongodb_url.split('@')[-1]}")

    try:
        if full_reset:
            await purge_transactional_data(db)
            await seed_canteens_and_admin(db)
        elif purge_only:
            await purge_transactional_data(db)
        elif seed_canteens:
            await seed_canteens_and_admin(db)
        else:
            print("No action specified. Use --help to view options.")
    finally:
        client.close()


def main():
    parser = argparse.ArgumentParser(
        description="Clean Production Seeder & Purge CLI for Zeal College CampusBite"
    )
    parser.add_argument(
        "--purge-only",
        action="store_true",
        help="Wipe orders, settlements, and reset ledgers to pure ₹0.00.",
    )
    parser.add_argument(
        "--seed-canteens",
        action="store_true",
        help="Seed canonical Zeal College campus eateries and admin.",
    )
    parser.add_argument(
        "--full-reset",
        action="store_true",
        help="Purge all transactional data and re-seed production campus eateries.",
    )

    args = parser.parse_args()

    if not (args.purge_only or args.seed_canteens or args.full_reset):
        parser.print_help()
        sys.exit(1)

    asyncio.run(run_seeder(
        purge_only=args.purge_only,
        seed_canteens=args.seed_canteens,
        full_reset=args.full_reset,
    ))


if __name__ == "__main__":
    main()
