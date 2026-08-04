from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.restaurant_owner import (
    router as restaurant_owner_router,
)
from app.routes.menu import router as menu_router
from app.routes.restaurant import router as restaurant_router
from app.routes.order import router as order_router
from app.routes.dashboard import (
    router as dashboard_router,
)
from app.routes.delivery_dashboard import (
    router as delivery_dashboard_router,
)
from app.routes.analytics import (
    router as analytics_router,
)
from app.routes.delivery_partner import (
    router as delivery_partner_router,
)

from app.db.database import database

app = FastAPI(
    title="CampusBite API",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(restaurant_router)
app.include_router(auth_router)
app.include_router(
    restaurant_owner_router
)
app.include_router(menu_router)
app.include_router(order_router)
app.include_router(dashboard_router)
app.include_router(delivery_dashboard_router)
app.include_router(analytics_router)
app.include_router(delivery_partner_router)


@app.get("/")
async def root():
    return {
        "message": "CampusBite API Running 🚀"
    }


@app.get("/test-db")
async def test_db():
    collections = await database.list_collection_names()

    return {
        "connected": True,
        "collections": collections
    }