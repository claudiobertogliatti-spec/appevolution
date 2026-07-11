"""Policy di sicurezza fail-closed condivisa dal backend Ciak."""

from __future__ import annotations

import os
from urllib.parse import urlparse


VALID_APP_ENVS = {"production", "development", "test"}
LEGACY_JWT_SECRET = "evolution-pro-os-secret-key-2026"
PRODUCTION_ORIGINS = (
    "https://evolution-pro.it",
    "https://www.evolution-pro.it",
    "https://ciak.io",
    "https://www.ciak.io",
)
LOCAL_ORIGINS = (
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8001",
)


def get_app_env() -> str:
    app_env = os.environ.get("APP_ENV", "production").strip().lower()
    if app_env not in VALID_APP_ENVS:
        raise RuntimeError(
            "APP_ENV non valido: usare production, development o test"
        )
    return app_env


def require_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET_KEY", "")
    if get_app_env() == "production":
        if len(secret) < 32 or secret == LEGACY_JWT_SECRET:
            raise RuntimeError(
                "JWT_SECRET_KEY production assente, debole o uguale al fallback storico"
            )
    elif not secret:
        raise RuntimeError("JWT_SECRET_KEY deve essere esplicito anche fuori produzione")
    return secret


def require_stripe_webhook_secret() -> str:
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    if not secret or secret == "whsec_YOUR_WEBHOOK_SECRET_HERE" or not secret.startswith("whsec_"):
        raise RuntimeError("STRIPE_WEBHOOK_SECRET assente o non valido")
    return secret


def _validate_origin(origin: str, app_env: str) -> str:
    value = origin.strip().rstrip("/")
    if not value:
        raise RuntimeError("Origine CORS vuota")
    if value == "*":
        raise RuntimeError("Il wildcard CORS non è consentito")

    parsed = urlparse(value)
    if not parsed.scheme or not parsed.netloc or parsed.path not in ("", "/"):
        raise RuntimeError(f"Origine CORS non valida: {value}")
    if app_env == "production" and parsed.scheme != "https":
        raise RuntimeError("Le origini CORS production devono usare HTTPS")
    if app_env == "production" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
        raise RuntimeError("localhost non è consentito nel CORS production")
    return value


def build_cors_origins(cors_env: str = "", react_backend_url: str = "") -> list[str]:
    app_env = get_app_env()
    candidates = list(PRODUCTION_ORIGINS)
    if app_env != "production":
        candidates.extend(LOCAL_ORIGINS)
    candidates.extend(part for part in cors_env.split(",") if part.strip())
    if react_backend_url.strip():
        candidates.append(react_backend_url)

    origins: list[str] = []
    for candidate in candidates:
        origin = _validate_origin(candidate, app_env)
        if origin not in origins:
            origins.append(origin)
    return origins
