# Infrastructure must initialize before route imports (env + logging).
from contextlib import asynccontextmanager

from app.core.logging import setup_logging, get_logger
from app.core.env import get_allowed_origins, validate_environment

setup_logging()
validate_environment()

from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.auth.auth import require_roles
from app.auth.roles import ADMIN
from app.core.config import app_name, app_version
from app.core.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.middleware import RequestLoggingMiddleware
from app.core.request_id import RequestIdMiddleware
from app.core.security_middleware import (
    RateLimitMiddleware,
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
)
from app.db.database import close_mongo_client
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
from app.routes.health import router as health_router
from app.routers.admin import router as admin_router
from app.routes.payment import router as payment_router
from app.routes.subscription import router as subscription_router
from app.routes.subscription_billing import router as subscription_billing_router
from app.routes.subscription_plan import router as subscription_plan_router
from app.routes.admin_subscription import router as admin_subscription_router
from app.routes.subscription_payment import (
    admin_router as subscription_payment_admin_router,
    customer_router as subscription_payment_customer_router,
    restaurant_router as subscription_payment_restaurant_router,
)

from app.db.database import database

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db.indexes import ensure_app_indexes
    from app.services.subscription_scheduler import (
        start_subscription_scheduler,
        stop_subscription_scheduler,
    )

    logger.info("application started app=%s version=%s", app_name(), app_version())
    await ensure_app_indexes()
    logger.info("indexes ensured")
    await start_subscription_scheduler()
    yield
    logger.info("shutting down")
    await stop_subscription_scheduler()
    close_mongo_client()


app = FastAPI(
    title=app_name(),
    version=app_version(),
    lifespan=lifespan,
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# ----------------------------------------
# Security middleware (CORS registered last = outermost)
# ----------------------------------------
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Razorpay-Signature",
        "X-Requested-With",
        "X-Request-ID",
    ],
    expose_headers=["X-Request-ID"],
)

# ----------------------------------------
# API Routes
# ----------------------------------------
app.include_router(health_router)

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

app.include_router(subscription_router)
app.include_router(subscription_billing_router)

app.include_router(subscription_plan_router)

app.include_router(admin_subscription_router)

app.include_router(subscription_payment_customer_router)
app.include_router(subscription_payment_admin_router)
app.include_router(subscription_payment_restaurant_router)

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
