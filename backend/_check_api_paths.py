"""Compare frontend authFetch paths with FastAPI OpenAPI routes."""
from __future__ import annotations

import re
from pathlib import Path

from app.main import app

code_paths = set(app.openapi()["paths"].keys())
root = Path(__file__).resolve().parents[1] / "src"

patterns: list[tuple[str, str]] = []
for path in root.rglob("*"):
    if path.suffix not in {".ts", ".tsx"}:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    for match in re.finditer(
        r'(?:authJson|authFetch|publicFetch)\s*(?:<[^>]*>)?\s*\(\s*[`"]([^`"?\s]+)',
        text,
    ):
        api_path = match.group(1)
        if api_path.startswith("http"):
            continue
        patterns.append((str(path.relative_to(root)), api_path))


def normalize(path: str) -> str:
    return re.sub(r"\$\{[^}]+\}", "{param}", path)


def matches_code(path: str) -> bool:
    if path in code_paths:
        return True
    path_parts = path.strip("/").split("/")
    for candidate in code_paths:
        candidate_parts = candidate.strip("/").split("/")
        if len(candidate_parts) != len(path_parts):
            continue
        if all(
            a == b or (a.startswith("{") and b == "{param}")
            for a, b in zip(candidate_parts, path_parts)
        ):
            return True
    return False


seen: set[str] = set()
missing: list[tuple[str, str]] = []
for file, api_path in patterns:
    normalized = normalize(api_path)
    if normalized in seen:
        continue
    seen.add(normalized)
    if not matches_code(normalized):
        missing.append((file, normalized))

print("FRONTEND PATHS NOT IN CODE OPENAPI:")
for file, api_path in sorted(missing):
    print(f"  {api_path}  ({file})")
