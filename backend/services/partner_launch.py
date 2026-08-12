"""Verifica sicura e minimale dell'URL pubblico usato per il lancio."""
import ipaddress
from urllib.parse import urlparse


def is_safe_public_http_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            return False
        if parsed.hostname.lower() in ("localhost", "localhost.localdomain"):
            return False
        try:
            address = ipaddress.ip_address(parsed.hostname)
            return not (address.is_private or address.is_loopback or address.is_link_local or address.is_reserved)
        except ValueError:
            return True
    except Exception:
        return False


async def probe_launch_url(url: str) -> bool:
    if not is_safe_public_http_url(url):
        return False
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            response = await client.get(url)
        return 200 <= response.status_code < 400
    except httpx.HTTPError:
        return False
