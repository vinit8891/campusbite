#!/usr/bin/env python3
"""Create a MongoDB backup using mongodump (restore not implemented here)."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv


def main() -> int:
    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")

    mongodb_url = (os.getenv("MONGODB_URL") or "").strip()
    database_name = (os.getenv("DATABASE_NAME") or "").strip()

    if not mongodb_url or not database_name:
        print(
            "Missing MONGODB_URL or DATABASE_NAME in backend/.env",
            file=sys.stderr,
        )
        return 1

    if shutil.which("mongodump") is None:
        print(
            "mongodump not found. Install MongoDB Database Tools and retry.",
            file=sys.stderr,
        )
        return 1

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    backup_dir = backend_dir / "backups" / timestamp
    backup_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        "mongodump",
        f"--uri={mongodb_url}",
        f"--db={database_name}",
        f"--out={backup_dir}",
    ]

    print(f"Running backup to {backup_dir}")
    subprocess.run(cmd, check=True)
    print("Backup completed successfully")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
