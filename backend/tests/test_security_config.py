import importlib
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit


def _module(monkeypatch, **env):
    for key in (
        "APP_ENV",
        "JWT_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "CORS_ORIGINS",
        "REACT_APP_BACKEND_URL",
    ):
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    import security_config
    return importlib.reload(security_config)


def test_missing_app_env_defaults_to_production(monkeypatch):
    security = _module(monkeypatch)
    assert security.get_app_env() == "production"


@pytest.mark.parametrize("secret", [None, "", "short", "evolution-pro-os-secret-key-2026"])
def test_production_rejects_missing_weak_or_legacy_jwt_secret(monkeypatch, secret):
    env = {"APP_ENV": "production"}
    if secret is not None:
        env["JWT_SECRET_KEY"] = secret
    security = _module(monkeypatch, **env)
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        security.require_jwt_secret()


def test_test_env_accepts_explicit_test_secret(monkeypatch):
    security = _module(
        monkeypatch,
        APP_ENV="test",
        JWT_SECRET_KEY="ci-test-secret",
    )
    assert security.require_jwt_secret() == "ci-test-secret"


def test_production_rejects_wildcard_cors(monkeypatch):
    security = _module(monkeypatch, APP_ENV="production")
    with pytest.raises(RuntimeError, match="wildcard"):
        security.build_cors_origins("*", "")


def test_production_rejects_http_dynamic_origin(monkeypatch):
    security = _module(monkeypatch, APP_ENV="production")
    with pytest.raises(RuntimeError, match="HTTPS"):
        security.build_cors_origins("http://attacker.example", "")


def test_test_env_allows_localhost_and_deduplicates(monkeypatch):
    security = _module(monkeypatch, APP_ENV="test")
    origins = security.build_cors_origins(
        "http://localhost:3000,http://localhost:3000",
        "http://localhost:5173",
    )
    assert origins.count("http://localhost:3000") == 1
    assert "http://localhost:5173" in origins


def test_unknown_app_env_is_rejected(monkeypatch):
    security = _module(monkeypatch, APP_ENV="staging")
    with pytest.raises(RuntimeError, match="APP_ENV"):
        security.get_app_env()


def test_ci_runs_secret_scan_and_security_regressions():
    workflow = (
        Path(__file__).resolve().parents[2] / ".github" / "workflows" / "ci.yml"
    ).read_text(encoding="utf-8")
    assert "fetch-depth: 0" in workflow
    assert "gitleaks/gitleaks-action@" in workflow
    assert "gitleaks/gitleaks-action@v" not in workflow
    for test_file in (
        "tests/test_security_config.py",
        "tests/test_stripe_webhook_security.py",
        "tests/test_document_admin_auth.py",
        "tests/test_partner_journey_auth_unittest.py",
        "tests/test_no_shadow_routes.py",
        "tests/test_proposta_security.py",
    ):
        assert test_file in workflow
