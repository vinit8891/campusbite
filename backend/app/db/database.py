import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.logging import get_logger

load_dotenv()

logger = get_logger(__name__)

MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME")

client = AsyncIOMotorClient(MONGODB_URL)

database = client[DATABASE_NAME]

# ======================================
# Collections
# ======================================

user_collection = database["users"]

restaurant_collection = database["restaurants"]

order_collection = database["orders"]

review_collection = database["reviews"]

delivery_collection = database["delivery_partners"]

cart_collection = database["carts"]

wishlist_collection = database["wishlist"]

coupon_collection = database["coupons"]

notification_collection = database["notifications"]


async def ping_database() -> bool:
    """Return True when MongoDB responds to a ping."""
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        logger.exception("MongoDB ping failed")
        return False


def close_mongo_client() -> None:
    """Close the Motor client on application shutdown."""
    try:
        client.close()
        logger.info("MongoDB client closed")
    except Exception:
        logger.exception("Error closing MongoDB client")