import httpx
import json
import os
from dotenv import load_dotenv
from app.auth.security import create_access_token
from app.auth.roles import DELIVERY_PARTNER, CUSTOMER, ADMIN

load_dotenv()

BASE_URL = "https://campusbite-backend123.onrender.com"
order_id = "6a9c76a0e962f034af185d68"

courier_token = create_access_token({
    "sub": "6a9c7694e962f034af185d67",
    "name": "Rahul Sharma",
    "email": "courier@campus.edu",
    "phone": "9876543210",
    "role": DELIVERY_PARTNER,
})

courier_headers = {"Authorization": f"Bearer {courier_token}"}

def test_live():
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        print(f"--- Fetching Order {order_id} with Courier Token ---")
        res = client.get(f"/orders/{order_id}", headers=courier_headers)
        print("Status:", res.status_code)
        if res.status_code == 200:
            order_data = res.json()
            print("Current status in DB:", repr(order_data.get("status")))
            print("Delivery partner:", order_data.get("delivery_partner"))
            print("Payment status:", order_data.get("payment_status"))
        else:
            print("Error:", res.text)

if __name__ == "__main__":
    test_live()
