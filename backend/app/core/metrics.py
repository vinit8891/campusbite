"""In-process request metrics (JSON /metrics endpoint; no Prometheus)."""

from __future__ import annotations

import threading
import time
from collections import defaultdict

_start_time = time.time()
_lock = threading.Lock()
_total_requests = 0
_total_duration_ms = 0.0
_route_counts: dict[str, int] = defaultdict(int)


def record_request(*, method: str, path: str, duration_ms: float) -> None:
    route_key = f"{method.upper()} {path}"
    with _lock:
        global _total_requests, _total_duration_ms
        _total_requests += 1
        _total_duration_ms += duration_ms
        _route_counts[route_key] += 1


def uptime_seconds() -> float:
    return max(0.0, time.time() - _start_time)


def snapshot(*, active_rate_limit_entries: int = 0) -> dict:
    with _lock:
        total = _total_requests
        avg_ms = (_total_duration_ms / total) if total else 0.0
        per_route = dict(sorted(_route_counts.items(), key=lambda item: (-item[1], item[0])))
    return {
        "total_requests": total,
        "requests_per_route": per_route,
        "average_response_time_ms": round(avg_ms, 2),
        "active_rate_limit_entries": active_rate_limit_entries,
        "uptime_seconds": round(uptime_seconds(), 2),
    }
