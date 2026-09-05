import httpx
import json
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://campusbite-backend123.onrender.com"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@campusbite.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "CampusBiteAdmin!ChangeMe")

def query_order():
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        print(f"Logging in as admin ({ADMIN_EMAIL})...")
        login_res = client.post("/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_res.status_code != 200:
            print(f"Admin login failed: {login_res.status_code} {login_res.text}")
            # Try alternate admin email
            login_res = client.post("/auth/admin/login", json={
                "email": "admin@campusbite.local",
                "password": ADMIN_PASSWORD
            })
            if login_res.status_code != 200:
                print(f"Second admin login attempt failed: {login_res.status_code} {login_res.text}")
                return
        
        token = login_res.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        print("Admin login successful. Token acquired.")

        order_id = "6a9c76a0e962f034af185d68"
        print(f"\nFetching order {order_id}...")
        order_res = client.get(f"/orders/{order_id}", headers=headers)
        print(f"GET /orders/{order_id} status: {order_res.status_code}")
        if order_res.status_code == 200:
            order = order_res.json()
            print("=" * 60)
            print("ORDER DETAILS FROM LIVE SERVER:")
            print("=" * 60)
            print(json.dumps(order, indent=2))
        else:
            print("Response:", order_res.text)
            
            # Fetch all orders to see if 6a9c76a exists or what orders are present
            print("\nListing all orders via GET /orders/...")
            orders_res = client.get("/orders/", headers=headers)
            if orders_res.status_code == 200:
                orders_data = orders_res.json()
                items = orders_data.get("items", []) if isinstance(orders_data, dict) else orders_data
                print(f"Total orders found: {len(items)}")
                for ord_item in items[:10]:
                    print(f"ID: {ord_item.get('_id')} | Status: {repr(ord_item.get('status'))} | Total: {ord_item.get('total')} | Created: {ord_item.get('created_at')}")
                    if "6a9c76a" in str(ord_item.get("_id")):
                        print("MATCH FOUND:")
                        print(json.dumps(ord_item, indent=2))

if __name__ == "__main__":
    query_order()
