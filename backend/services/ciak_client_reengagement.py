"""
Re-engagement dell'area cliente Ciak (ponte verso la Partnership).

Il cliente accede via magic-link (niente password), riutilizzabile entro 30 giorni:
per farlo tornare quando vuole serve un modo di rimandargli l'accesso, e per
tenerlo dentro conviene richiamarlo quando un deliverable e' pronto. Due funzioni,
entrambe robuste: NON sollevano mai (loggano e ritornano bool), cosi' non possono
rompere ne' l'endpoint pubblico ne' l'approvazione admin.
"""
import asyncio
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from services.ciak_client_accounts import create_magic_login_token

logger = logging.getLogger(__name__)

# Come si dice, in parole semplici, che un materiale Start e' pronto:
# (soggetto con articolo, verbo concordato). Niente "brand kit" o "deliverable".
_FRASI = {
    "positioning": ("Il tuo posizionamento", "e' pronto"),
    "brand_kit": ("Il tuo marchio", "e' pronto"),
    "social_profiles": ("I testi per i tuoi profili social", "sono pronti"),
    "showcase": ("La tua pagina web", "e' pronta"),
    "content_plan_90d": ("Il tuo calendario dei 60 giorni", "e' pronto"),
    "partnership_readiness": ("Il tuo controllo finale", "e' pronto"),
}
_FRASE_GENERICA = ("Un tuo nuovo materiale", "e' pronto")


# I cinque materiali che il cliente Start si aspetta (le 3 tappe promesse per
# iscritto), con parole semplici. La verifica finale non c'e': non ha data promessa.
_AVANZAMENTO = (
    ("positioning", "Posizionamento"),
    ("brand_kit", "Marchio"),
    ("social_profiles", "Profili social"),
    ("showcase", "Sito vetrina"),
    ("content_plan_90d", "Calendario dei 60 giorni"),
)


async def _avanzamento_lavori(db, client_id: str, appena_approvato: str) -> str:
    """Blocco "a che punto siamo" per la mail di approvazione: solo materiali
    APPROVATI contano come pronti (una bozza non e' un lavoro consegnato).

    Accessorio: se la lettura fallisce ritorna "" e la mail parte comunque."""
    if appena_approvato not in {tipo for tipo, _ in _AVANZAMENTO}:
        return ""
    try:
        pronti = {
            d["type"]
            async for d in db.ciak_start_deliverables.find(
                {"partner_id": client_id, "approval_status": "approved"}, {"_id": 0, "type": 1}
            )
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("[REENGAGE] avanzamento lavori non letto per %s: %s", client_id, exc)
        return ""
    pronti.add(appena_approvato)  # l'approvazione e' gia' scritta, ma non dipendiamo dall'ordine
    righe = [
        f"{'✓' if tipo in pronti else '•'} {nome}: {'pronto' if tipo in pronti else 'in lavorazione'}"
        for tipo, nome in _AVANZAMENTO
    ]
    n, tot = len(pronti & {t for t, _ in _AVANZAMENTO}), len(_AVANZAMENTO)
    titolo = (
        f"Avanzamento lavori: tutti e {tot} i materiali sono pronti."
        if n == tot
        else f"Avanzamento lavori: {n} materiali su {tot} pronti. Gli altri sono in lavorazione."
    )
    return f"{titolo}\n" + "\n".join(righe)


def _base_url() -> str:
    return (os.environ.get("CIAK_BASE_URL") or os.environ.get("FRONTEND_URL_PROD", "https://ciak.io")).rstrip("/")


def _send(email: str, nome: str | None, subject: str, corpo: str, link: str) -> bool:
    host = os.environ.get("SMTP_HOST", "smtp.register.it")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASSWORD", "")
    if not user or not password:
        logger.info("[REENGAGE] SMTP non configurato: email non inviata a %s", email)
        return False
    primo = (nome or "").strip().split(" ")[0] or "ciao"
    plain = f"{corpo.format(primo=primo)}\n\nEntra qui:\n{link}\n\nA presto,\nClaudio\nEvolution PRO\n"
    html = plain.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
    msg = MIMEMultipart("alternative")
    msg["From"] = (
        os.environ.get("CIAK_EMAIL_FROM")
        or os.environ.get("SMTP_FROM")
        or f"Claudio Bertogliatti <{user}>"
    )
    msg["To"] = email
    msg["Reply-To"] = os.environ.get("CIAK_EMAIL_REPLY_TO", "info@evolution-pro.it")
    msg["Subject"] = subject
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
        return True
    except Exception as exc:  # noqa: BLE001 - logga, non solleva
        logger.warning("[REENGAGE] invio fallito a %s: %s", email, exc)
        return False


async def _magic_link(db, client_id: str, email: str) -> str | None:
    try:
        login = await create_magic_login_token(db, client_id, email)
        return f"{_base_url()}/cliente/accesso?token={login['token']}"
    except Exception as exc:  # noqa: BLE001
        logger.warning("[REENGAGE] magic-link fallito per %s: %s", client_id, exc)
        return None


async def invia_link_accesso(db, email: str) -> bool:
    """Il cliente ha chiesto "rimandami l'accesso": se esiste, gli manda un link
    fresco. NON dice mai al chiamante se l'email esiste (anti-enumeration a monte).
    """
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        return False
    try:
        client = await db.ciak_clients.find_one({"email": email})
    except Exception as exc:  # noqa: BLE001
        logger.warning("[REENGAGE] lookup cliente fallito: %s", exc)
        return False
    if not client:
        return False  # il chiamante risponde 200 comunque
    link = await _magic_link(db, client["id"], email)
    if not link:
        return False
    return await asyncio.to_thread(
        _send, email, client.get("name"),
        "Il tuo accesso all'area Ciak",
        "Ciao {primo}, ecco il tuo accesso all'area riservata Ciak.",
        link,
    )


async def invia_deliverable_pronto(db, client_id: str, tipo: str) -> bool:
    """Richiamo: un deliverable Start e' stato approvato ed e' visibile in area."""
    try:
        client = await db.ciak_clients.find_one({"id": client_id})
    except Exception as exc:  # noqa: BLE001
        logger.warning("[REENGAGE] lookup cliente fallito: %s", exc)
        return False
    if not client or not (client.get("email") or "").strip():
        return False
    email = client["email"].strip().lower()
    soggetto, verbo = _FRASI.get(tipo, _FRASE_GENERICA)
    link = await _magic_link(db, client_id, email)
    if not link:
        return False
    # Il pronome si accorda con il soggetto: "lo trovi", "la trovi", "li trovi".
    pronome = {"sono pronti": "li", "e' pronta": "la"}.get(verbo, "lo")
    corpo = f"Ciao {{primo}}, {soggetto[0].lower()}{soggetto[1:]} {verbo}: {pronome} trovi nella tua area Ciak."
    avanzamento = await _avanzamento_lavori(db, client_id, tipo)
    if avanzamento:
        corpo = f"{corpo}\n\n{avanzamento}"
    return await asyncio.to_thread(
        _send, email, client.get("name"),
        f"{soggetto} {verbo}",
        corpo,
        link,
    )
