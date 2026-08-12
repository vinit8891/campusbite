"""Central application logging configuration."""

from __future__ import annotations

import logging
import sys


DEFAULT_LOG_FORMAT = (
    "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
DEFAULT_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(level: int = logging.INFO) -> None:
    """
    Configure root logging once for the CampusBite API.

    INFO by default, with timestamps, module name, and level.
    """
    root = logging.getLogger()
    if getattr(root, "_campusbite_configured", False):
        return

    root.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(
        logging.Formatter(DEFAULT_LOG_FORMAT, datefmt=DEFAULT_DATE_FORMAT)
    )

    # Replace existing handlers to avoid duplicate lines under uvicorn reload
    root.handlers.clear()
    root.addHandler(handler)

    # Keep noisy third-party loggers quieter unless debugging
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    root._campusbite_configured = True  # type: ignore[attr-defined]


def get_logger(name: str) -> logging.Logger:
    """Return a named logger for a module."""
    return logging.getLogger(name)
