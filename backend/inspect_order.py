import asyncio
import os
import json
from bson import ObjectId
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "CampusBite")

async def inspect_order():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    order_id_str = "6a9c76a0e962f034af185d68"
    try:
        oid = ObjectId(order_id_str)
    except Exception as e:
        print("Invalid ObjectId:", e)
        return

    order = await db["orders"].find_one({"_id": oid})
    if not order:
        # Also try searching as string _id or partial
        print(f"Order {order_id_str} not found with ObjectId.")
        order = await db["orders"].find_one({"_id": order_id_str})
    
    if not order:
        print("Searching recent orders...")
        cursor = db["orders"].find().sort("_id", -1).limit(5)
        recent = await cursor.to_list(length=5)
        for r in recent:
            print("Recent order ID:", str(r.get("_id")), "Status:", repr(r.get("status")))
        return

    print("=" * 60)
    print("INSPECTION OF ORDER:", order_id_str)
    print("=" * 60)
    print("Raw Order Document Keys:", list(order.keys()))
    print("status:", repr(order.get("status")))
    print("delivery_partner:", json.dumps(order.get("delivery_partner"), default=str, indent=2))
    print("delivery_otp:", repr(order.get("delivery_otp")))
    print("otp_verified:", repr(order.get("otp_verified")))
    print("failed_otp_attempts:", repr(order.get("failed_otp_attempts")))
    print("payment_method:", repr(order.get("payment_method")))
    print("payment_status:", repr(order.get("payment_status")))
    print("total:", repr(order.get("total")))
    print("created_at:", repr(order.get("created_at")))
    print("accepted_at / delivered_at:", repr(order.get("delivered_at")))
    print("=" * 60)
    client.close()

if __name__ == "__main__":
    asyncio.run(inspect_order())
