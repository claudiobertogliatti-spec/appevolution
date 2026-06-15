"""
Meta Conversions API (server-side) — invio evento Purchase per Ciak.

Affianca il Meta Pixel browser (frontend: src/ciak/lib/metaPixel.js).
La deduplica lato Meta avviene per (event_name + event_id): qui usiamo come
event_id lo **Stripe checkout session id**, lo stesso valore che il pixel
browser passa come `eventID` sulla pagina /ciak-blueprint/grazie
(success_url = .../grazie?session_id={CHECKOUT_SESSION_ID}). Così l'evento
Purchase non viene contato due volte anche se arrivano sia dal browser sia dal
server.

Perché server-side: è affidabile (non dipende da adblocker né dal fatto che
l'utente torni sulla thank-you page); il webhook Stripe conferma il pagamento
reale.

Config (env, Cloud Run):
  META_CAPI_ACCESS_TOKEN     token Conversions API (Events Manager → Impostazioni
                             → Conversions API → Genera token di accesso)
  META_PIXEL_ID              opzionale, default 1662308485029469 (pixel Ciak.io)
  META_CAPI_TEST_EVENT_CODE  opzionale, per il pannello "Test degli eventi"
  META_GRAPH_VERSION         opzionale, default v19.0

Se META_CAPI_ACCESS_TOKEN non è configurato → no-op silenzioso: la funzione
non solleva e non blocca il webhook.
"""
import hashlib
import logging
import os
import time

logger = logging.getLogger(__name__)

DEFAULT_PIXEL_ID = "1662308485029469"
DEFAULT_GRAPH_VERSION = "v19.0"


def _hash(value):
    """SHA-256 dei dati utente come richiesto da Meta (lowercase + trim)."""
    if not value:
        return None
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


async def send_purchase_event(
    *,
    event_id,
    email=None,
    value=67.0,
    currency="EUR",
    event_source_url=None,
    client_ip=None,
    client_user_agent=None,
    fbp=None,
    fbc=None,
):
    """
    Invia un evento Purchase alla Conversions API di Meta.

    Idempotenza/dedup: passare come `event_id` lo Stripe checkout session id
    (stesso valore dell'eventID del pixel browser).

    Ritorna un dict con esito; non solleva eccezioni (errori solo loggati).
    """
    token = os.environ.get("META_CAPI_ACCESS_TOKEN")
    if not token:
        logger.info("[META_CAPI] META_CAPI_ACCESS_TOKEN non configurato — skip Purchase")
        return {"skipped": True, "reason": "token_missing"}

    pixel_id = os.environ.get("META_PIXEL_ID", DEFAULT_PIXEL_ID)
    graph_version = os.environ.get("META_GRAPH_VERSION", DEFAULT_GRAPH_VERSION)

    user_data = {}
    hashed_email = _hash(email)
    if hashed_email:
        user_data["em"] = [hashed_email]
    if fbp:
        user_data["fbp"] = fbp
    if fbc:
        user_data["fbc"] = fbc
    if client_ip:
        user_data["client_ip_address"] = client_ip
    if client_user_agent:
        user_data["client_user_agent"] = client_user_agent

    event = {
        "event_name": "Purchase",
        "event_time": int(time.time()),
        "action_source": "website",
        "event_id": str(event_id) if event_id is not None else None,
        "custom_data": {
            "value": round(float(value), 2),
            "currency": (currency or "EUR").upper(),
        },
        "user_data": user_data,
    }
    if event_source_url:
        event["event_source_url"] = event_source_url

    payload = {"data": [event]}
    test_code = os.environ.get("META_CAPI_TEST_EVENT_CODE")
    if test_code:
        payload["test_event_code"] = test_code

    url = f"https://graph.facebook.com/{graph_version}/{pixel_id}/events"

    try:
        import httpx

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, params={"access_token": token}, json=payload)
            if resp.is_success:
                logger.info(
                    "[META_CAPI] Purchase inviato (event_id=%s, value=%s %s)",
                    event_id, event["custom_data"]["value"], event["custom_data"]["currency"],
                )
                return {"success": True, "response": resp.json()}
            logger.error(
                "[META_CAPI] Purchase fallito (%s): %s", resp.status_code, resp.text
            )
            return {"success": False, "status": resp.status_code, "body": resp.text}
    except Exception as exc:  # noqa: BLE001 — non deve mai bloccare il webhook
        logger.error("[META_CAPI] Errore invio Purchase: %s", exc)
        return {"success": False, "error": str(exc)}
