"""Orders route module alias and financial serialization hardening.

Re-exports router and provides financial normalization guaranteeing non-null float defaults:
- items_subtotal: float (default 0.0)
- gst: float (default 0.0)
- delivery_fee: float (default 0.0)
- platform_fee: float (default 0.0)
- commission_amount: float (default 0.0)
- net_payout: float (default 0.0)
- total_amount: float (default 0.0)
"""

from app.models.order import normalize_order_financials
from app.routes.order import *  # noqa: F401, F403
from app.routes.order import router

__all__ = ["router", "normalize_order_financials"]
