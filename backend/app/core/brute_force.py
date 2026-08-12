"""Temporary in-memory login brute-force protection."""

from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock

from fastapi import HTTPException

MAX_FAILURES = 5
BLOCK_SECONDS = 600  # 10 minutes


@dataclass
class _AttemptState:
    failures: int = 0
    blocked_until: float = 0.0


class LoginBruteForceGuard:
    def __init__(self) -> None:
        self._states: dict[str, _AttemptState] = {}
        self._lock = Lock()

    def _key(self, ip: str, identifier: str) -> str:
        return f"{ip}:{identifier.strip().lower()}"

    def assert_not_blocked(self, ip: str, identifier: str) -> None:
        key = self._key(ip, identifier)
        now = time.time()
        with self._lock:
            state = self._states.get(key)
            if not state:
                return
            if state.blocked_until > now:
                remaining = int(state.blocked_until - now)
                raise HTTPException(
                    status_code=429,
                    detail=(
                        "Too many failed login attempts. "
                        f"Try again in {remaining} seconds."
                    ),
                    headers={"Retry-After": str(remaining)},
                )
            if state.blocked_until and state.blocked_until <= now:
                self._states.pop(key, None)

    def record_failure(self, ip: str, identifier: str) -> None:
        key = self._key(ip, identifier)
        now = time.time()
        with self._lock:
            state = self._states.setdefault(key, _AttemptState())
            state.failures += 1
            if state.failures >= MAX_FAILURES:
                state.blocked_until = now + BLOCK_SECONDS
                state.failures = 0

    def record_success(self, ip: str, identifier: str) -> None:
        key = self._key(ip, identifier)
        with self._lock:
            self._states.pop(key, None)


login_guard = LoginBruteForceGuard()
