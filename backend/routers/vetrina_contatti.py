"""Form di contatto del sito vetrina di Ciak Start.

La vetrina vive sul dominio del CLIENTE e questo endpoint e' pubblico: niente
token, niente sessione, chiunque puo' chiamarlo. Le difese sono quindi parte del
requisito, non un extra: honeypot, tetto orario per IP, consenso obbligatorio,
lunghezze limitate.

⚠️ Perche' `application/x-www-form-urlencoded` e non JSON: il form della vetrina
e' nativo (`<form method="post">`) e deve funzionare **senza JavaScript**. Il
browser fa una NAVIGAZIONE, non una fetch: CORS non entra in gioco (ed e' un
bene, visto che il dominio del cliente non e' nella allowlist) e la risposta
dev'essere una pagina, non JSON.

⛔ La vetrina non vende: qui non si crea nessun contatto commerciale, nessun tag
CRM, nessuna sequenza automatica. Arriva un messaggio, lo si consegna. Il
confine col funnel Partnership passa anche da qui.
"""
from __future__ import annotations

import html as html_lib
import logging
import os
import re
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/vetrina", tags=["vetrina-contatti"])

db = None


def set_db(database) -> None:
    global db
    db = database


MAX_MESSAGGI_ORA = 5      # per singolo IP, su una singola vetrina
MAX_NOME = 120
MAX_MESSAGGIO = 4000
_EMAIL = re.compile(r"^[^@\s]+@[^@\s.]+\.[^@\s]+$")


def _ora() -> datetime:
    return datetime.now(timezone.utc)


def _ip(request: Request) -> str:
    """IP del chiamante dietro il proxy di Cloud Run."""
    inoltrato = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    if inoltrato:
        return inoltrato[:45]
    client = getattr(request, "client", None)
    return (getattr(client, "host", "") or "sconosciuto")[:45]


def _testo(valore: Any, massimo: int) -> str:
    return " ".join(str(valore or "").split())[:massimo]


def _pagina(titolo: str, messaggio: str, codice: int) -> HTMLResponse:
    """Risposta leggibile da un essere umano: qui arriva una navigazione, non una fetch.

    Nessuno script: se il visitatore ha JS disattivato deve comunque capire
    cosa e' successo.
    """
    corpo = f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>{html_lib.escape(titolo)}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Poppins',system-ui,-apple-system,sans-serif;background:#F8FAFC;color:#0F172A;
display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;line-height:1.6}}
.scheda{{background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:44px;max-width:520px;text-align:center}}
h1{{font-size:24px;font-weight:600;margin-bottom:12px}}
p{{color:#475569;font-size:16.5px}}
a{{display:inline-block;margin-top:28px;min-height:44px;line-height:44px;padding:0 26px;background:#0F172A;
color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px}}
</style>
</head>
<body><div class="scheda">
  <h1>{html_lib.escape(titolo)}</h1>
  <p>{html_lib.escape(messaggio)}</p>
  <a href="javascript:history.back()">Torna al sito</a>
</div></body>
</html>"""
    return HTMLResponse(content=corpo, status_code=codice)


def _invia_notifica(*, destinatario: str, nome: str, email: str, messaggio: str, sito: str) -> bool:
    """Notifica al professionista. Il `Reply-To` e' il visitatore: risponde da li'."""
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASSWORD", "")
    if not user or not password:
        return False

    testo = (
        f"Hai ricevuto un messaggio dal tuo sito.\n\n"
        f"Da: {nome}\nEmail: {email}\n\n"
        f"Messaggio:\n{messaggio}\n\n"
        f"Rispondi a questa email per scrivergli direttamente.\n"
        f"— {sito}\n"
    )
    mail = MIMEMultipart("alternative")
    mail["From"] = os.environ.get("CIAK_EMAIL_FROM", f"Ciak <{user}>")
    mail["To"] = destinatario
    mail["Reply-To"] = email
    mail["Subject"] = f"Messaggio dal tuo sito: {nome}"
    mail.attach(MIMEText(testo, "plain", "utf-8"))
    try:
        with smtplib.SMTP(os.environ.get("SMTP_HOST", "smtp.register.it"),
                          int(os.environ.get("SMTP_PORT", "587")), timeout=15) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(mail)
        return True
    except Exception as exc:  # noqa: BLE001 — il messaggio resta a DB comunque
        logger.warning("[VETRINA] Notifica non inviata a %s: %s", destinatario, exc)
        return False


@router.post("/{client_id}/contatto")
async def ricevi_contatto(
    client_id: str,
    request: Request,
    nome: str = Form(default=""),
    email: str = Form(default=""),
    messaggio: str = Form(default=""),
    consenso: str | None = Form(default=None),
    azienda: str = Form(default=""),   # honeypot: invisibile agli umani
):
    if db is None:
        return _pagina("Servizio non disponibile", "Riprova fra qualche minuto.", 503)

    # Honeypot: si risponde come a un invio riuscito. Dire a un bot che e' stato
    # riconosciuto gli insegna solo a riprovare in modo diverso.
    if _testo(azienda, 200):
        logger.info("[VETRINA] Invio scartato (honeypot) su %s", client_id)
        return _pagina("Messaggio inviato", "Grazie, ti risponderemo il prima possibile.", 200)

    cliente = await db.ciak_clients.find_one({"id": client_id}, {"_id": 0})
    attivo = bool(cliente) and (
        cliente.get("access_level") in ("cliente_start", "partner")
        or cliente.get("start_purchased_at")
    )
    if not attivo:
        # Stessa risposta per "non esiste" e "non ha la vetrina": un endpoint
        # pubblico non deve dire a un estraneo quali id esistono.
        return _pagina("Pagina non trovata", "Questo modulo di contatto non e' attivo.", 404)

    nome_pulito = _testo(nome, MAX_NOME)
    email_pulita = _testo(email, 200).lower()
    testo_messaggio = _testo(messaggio, MAX_MESSAGGIO)
    if not nome_pulito or not _EMAIL.match(email_pulita) or len(testo_messaggio) < 2:
        return _pagina("Controlla i dati", "Nome, email e messaggio sono tutti necessari per poterti rispondere.", 400)
    if not consenso:
        return _pagina(
            "Manca il consenso",
            "Senza la spunta sul trattamento dei dati non possiamo conservare il messaggio per risponderti.",
            400,
        )

    ip = _ip(request)
    da_unora = (_ora() - timedelta(hours=1)).isoformat()
    recenti = await db.vetrina_messaggi.count_documents(
        {"client_id": client_id, "ip": ip, "created_at": {"$gte": da_unora}}
    )
    if recenti >= MAX_MESSAGGI_ORA:
        logger.info("[VETRINA] Tetto orario raggiunto da %s su %s", ip, client_id)
        return _pagina(
            "Troppi messaggi",
            "Hai gia' scritto piu' volte nell'ultima ora. Aspetta un momento, oppure usa i recapiti diretti.",
            429,
        )

    notificato = _invia_notifica(
        destinatario=cliente.get("email", ""),
        nome=nome_pulito,
        email=email_pulita,
        messaggio=testo_messaggio,
        sito=_testo(cliente.get("name"), 120) or "il tuo sito",
    )
    await db.vetrina_messaggi.insert_one({
        "id": str(uuid4()),
        "client_id": client_id,
        "nome": nome_pulito,
        "email": email_pulita,
        "messaggio": testo_messaggio,
        "consenso": True,
        "consenso_at": _ora().isoformat(),
        "ip": ip,
        "notificato": notificato,
        "letto": False,
        "created_at": _ora().isoformat(),
    })
    if not notificato:
        # Il messaggio c'e' comunque: si recupera dall'admin invece di perderlo.
        logger.error("[VETRINA] Messaggio salvato ma non notificato — client %s", client_id)

    return _pagina(
        "Messaggio inviato",
        "Grazie, il messaggio e' arrivato. Ti rispondiamo all'indirizzo che hai lasciato.",
        200,
    )
