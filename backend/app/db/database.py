import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

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