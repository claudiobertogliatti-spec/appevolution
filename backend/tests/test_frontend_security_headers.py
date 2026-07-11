import json
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit
ROOT = Path(__file__).resolve().parents[2]

REQUIRED_HEADERS = {
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Content-Security-Policy",
}


def test_vercel_applies_security_headers_globally():
    config = json.loads((ROOT / "frontend" / "vercel.json").read_text(encoding="utf-8"))
    global_rules = [rule for rule in config["headers"] if rule["source"] == "/(.*)"]
    assert len(global_rules) == 1
    headers = {item["key"]: item["value"] for item in global_rules[0]["headers"]}
    assert REQUIRED_HEADERS <= headers.keys()
    assert headers["X-Content-Type-Options"] == "nosniff"
    assert "frame-ancestors 'self'" in headers["Content-Security-Policy"]
    assert "https://www.youtube.com" in headers["Content-Security-Policy"]
    assert "https://js.stripe.com" in headers["Content-Security-Policy"]


def test_nginx_applies_same_security_header_set():
    nginx = (ROOT / "frontend" / "nginx.conf").read_text(encoding="utf-8")
    for header in REQUIRED_HEADERS:
        assert f"add_header {header}" in nginx
    assert "frame-ancestors 'self'" in nginx
    assert "https://www.youtube.com" in nginx
    assert "https://js.stripe.com" in nginx
    assert nginx.count(" always;") >= len(REQUIRED_HEADERS)
