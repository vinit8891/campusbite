# Infrastructure must initialize before route imports (env + logging).
from app.core.logging import setup_logging, get_logger
from app.core.env import validate_environment

setup_logging()
validate_environment()

from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.auth.auth import require_roles
from app.auth.roles import ADMIN
from app.core.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.middleware import RequestLoggingMiddleware
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

from app.routes.delivery_auth import (
    router as delivery_auth_router,
)
from app.routes.review import (
    router as review_router,
)
from app.routers.admin import router as admin_router
from app.routes.payment import router as payment_router

from app.db.database import database

logger = get_logger(__name__)

app = FastAPI(
    title="CampusBite API",
    version="1.0.0",
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# ----------------------------------------
# CORS
# ----------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestLoggingMiddleware)

# ----------------------------------------
# API Routes
# ----------------------------------------
app.include_router(auth_router)

app.include_router(
    restaurant_owner_router
)

app.include_router(
    restaurant_router
)

app.include_router(
    menu_router
)

app.include_router(
    order_router
)

app.include_router(payment_router)

app.include_router(
    dashboard_router
)

app.include_router(
    delivery_dashboard_router
)

app.include_router(
    analytics_router
)

app.include_router(
    delivery_auth_router
)

app.include_router(
    delivery_partner_router
)

# ⭐ Review Routes
app.include_router(
    review_router
)

app.include_router(admin_router)


@app.on_event("startup")
async def on_startup():
    logger.info("CampusBite API startup complete")


# ----------------------------------------
# Root
# ----------------------------------------
@app.get("/")
async def root():
    return {
        "message": "CampusBite API Running 🚀"
    }


# ----------------------------------------
# Database Test
# ----------------------------------------
@app.get("/test-db")
async def test_db(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
):
    collections = await database.list_collection_names()

    return {
        "connected": True,
        "collections": collections,
    }
