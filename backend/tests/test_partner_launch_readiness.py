import pytest

from services.partner_launch import is_safe_public_http_url


pytestmark = pytest.mark.unit


def test_launch_probe_rejects_local_and_non_http_targets():
    assert is_safe_public_http_url("http://127.0.0.1/admin") is False
    assert is_safe_public_http_url("http://localhost/admin") is False
    assert is_safe_public_http_url("file:///etc/passwd") is False
    assert is_safe_public_http_url("https://academy.systeme.io/offerta") is True
