from app.db.database import database

order_collection = database["orders"]
menu_collection = database["menu"]


async def get_dashboard(email: str):
    total_orders = await order_collection.count_documents(
        {"restaurant_email": email}
    )

    delivered_orders = await order_collection.find(
        {
            "restaurant_email": email,
            "status": "Delivered",
        }
    ).to_list(None)

    revenue = sum(
        order["total"]
        for order in delivered_orders
    )

    menu_items = await menu_collection.count_documents(
        {"restaurant_email": email}
    )

    return {
        "orders": total_orders,
        "revenue": revenue,
        "menu_items": menu_items,
        "rating": 4.8,
    }