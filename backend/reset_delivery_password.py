import asyncio

from app.db.database import database
from app.auth.security import hash_password


async def main():
    email = "rahul.sharma@example.com"
    new_password = "Rahul@123"

    hashed_password = hash_password(new_password)

    result = await database["delivery_partners"].update_one(
        {"email": email},
        {
            "$set": {
                "password": hashed_password
            }
        }
    )

    if result.matched_count == 0:
        print("Delivery partner not found.")
        return

    print("Password updated successfully.")
    print("Email:", email)
    print("New password:", new_password)


asyncio.run(main())