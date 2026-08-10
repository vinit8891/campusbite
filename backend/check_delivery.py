import asyncio

from app.db.database import database


async def main():
    partners = database["delivery_partners"].find({})

    async for partner in partners:
        partner.pop("password", None)
        print(partner)


asyncio.run(main())