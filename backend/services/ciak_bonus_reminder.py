"""
Promemoria della finestra bonus 48h (guida videocorso in omaggio con Ciak Start).

Chi ha ricevuto il Blueprint (call_done) ha 48h per attivare Ciak Start e ricevere
la guida in omaggio (vedi ciak_clients `_offer_payload` / ciak_start_delivery). Questo
servizio manda UN promemoria quando restano ~24h e il cliente non ha ancora comprato.
Onesto: la scadenza e' reale, il promemoria non la sposta. Idempotente
(`bonus_reminder_sent_at`), non blocca nulla, girato orario dallo scheduler.
"""
import logging
import os
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

REMINDER_HOURS_BEFORE = 24


def _parse_iso(value):
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None


def _send_reminder(email: str, nome: str | None, ore: int, link: str) -> bool:
    host = os.environ.get("SMTP_HOST", "smtp.register.it")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASSWORD", "")
    if not user or not password:
        return False
    primo = (nome or "").strip().split(" ")[0] or "ciao"
    plain = f"""Ciao {primo},

un promemoria veloce: la guida in omaggio "Come creare un videocorso che vende
davvero" (40 pagine) e' inclusa con Ciak Start solo per ancora circa {ore} ore.

Se vuoi approfittarne, puoi attivare Ciak Start dalla tua area riservata:
{link}

Nessuna fretta forzata: la finestra e' quella che avevamo detto in call, e dopo
la guida non sara' piu' inclusa. I 390 euro restano comunque un credito garantito
verso la Partnership.

A presto,
Claudio
Evolution PRO
"""
    html = plain.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
    msg = MIMEMultipart("alternative")
    msg["From"] = (
        os.environ.get("CIAK_EMAIL_FROM")
        or os.environ.get("SMTP_FROM")
        or f"Claudio Bertogliatti <{user}>"
    )
    msg["To"] = email
    msg["Reply-To"] = os.environ.get("CIAK_EMAIL_REPLY_TO", "info@evolution-pro.it")
    msg["Subject"] = f"{primo}, la guida in omaggio scade tra poche ore"
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
        return True
    except Exception as exc:  # noqa: BLE001 - l'esito e' loggato, il job riprova al giro dopo
        logger.warning("[BONUS_REMINDER] invio fallito a %s: %s", email, exc)
        return False


async def invia_promemoria_bonus(db) -> dict:
    """Manda il promemoria a chi ha la finestra bonus che si chiude entro ~24h e
    non ha ancora comprato Ciak Start. Un solo invio per cliente. Ritorna i conteggi.
    """
    if db is None:
        return {"inviati": 0, "errori": 0, "candidati": 0, "error": "no_db"}

    now = datetime.now(timezone.utc)
    soglia = now + timedelta(hours=REMINDER_HOURS_BEFORE)
    link = os.environ.get("CIAK_BASE_URL", "https://www.ciak.io").rstrip("/") + "/cliente"

    query = {
        "bonus_expires_at": {"$nin": [None, ""]},
        "bonus_reminder_sent_at": {"$in": [None, ""]},
        "start_purchased_at": {"$in": [None, ""]},
        "access_level": {"$nin": ["cliente_start", "partner"]},
    }
    try:
        candidati = await db.ciak_clients.find(query).to_list(1000)
    except Exception as exc:  # noqa: BLE001
        logger.error("[BONUS_REMINDER] query fallita: %s", exc)
        return {"inviati": 0, "errori": 0, "candidati": 0, "error": str(exc)}

    inviati = errori = validi = 0
    for c in candidati:
        exp = _parse_iso(c.get("bonus_expires_at"))
        # solo chi e' nelle ultime REMINDER_HOURS_BEFORE ore e non e' gia' scaduto
        if not exp or not (now < exp <= soglia):
            continue
        email = (c.get("email") or "").strip()
        if not email or "@" not in email:
            continue
        validi += 1
        ore = max(1, int((exp - now).total_seconds() // 3600))
        ok = _send_reminder(email, c.get("name"), ore, link)
        if not ok:
            errori += 1
            continue
        try:
            await db.ciak_clients.update_one(
                {"id": c.get("id"), "bonus_reminder_sent_at": {"$in": [None, ""]}},
                {"$set": {"bonus_reminder_sent_at": now.isoformat()}},
            )
        except Exception as exc:  # noqa: BLE001 - il flag e' informativo
            logger.warning("[BONUS_REMINDER] flag non salvato per %s: %s", c.get("id"), exc)
        inviati += 1

    logger.info("[BONUS_REMINDER] candidati=%s validi=%s inviati=%s errori=%s",
                len(candidati), validi, inviati, errori)
    return {"inviati": inviati, "errori": errori, "candidati": validi}
