"""
Ciak — Iscrizione pubblica alla masterclass dal funnel di un partner.

  POST /api/partner-optin/{partner_id}

Serve ai funnel in bozza ospitati fuori da Systeme (es. il sito statico su Vercel di
Daniele Andolfi). Salva il contatto in `partner_leads` — la stessa collezione che alimenta
l'elenco lead e l'export CSV del partner — cosi' i contatti si possono trasferire in Systeme
quando il dominio sara' collegato.

Perche' non `/api/partner-journey/leads/webhook/{partner_id}`: accetta qualsiasi JSON, non
valida l'email, non registra il consenso e avvisa Telegram a ogni chiamata. Qui l'endpoint e'
pubblico, quindi:
  - il partner deve aver acceso `partners.public_optin.enabled` (gli id sono numeri
    progressivi: senza il flag chiunque potrebbe inserire lead finti a qualunque partner);
  - email validata, campi con lunghezza massima, nessun JSON grezzo salvato;
  - consenso obbligatorio e registrato con data;
  - campo trappola `website`: se compilato non si salva nulla (risposta identica);
  - tetto orario per partner e tetto per IP (in memoria), cosi' un abuso non diventa spam su
    Telegram ne' riempie la lista lead; quando scatta il 429 resta un log.

Sincronizzazione Systeme (opzionale, per partner): con `partners.public_optin.systeme_sync` a True
e la chiave del partner in `SYSTEME_API_KEY_PARTNER_<id>`, l'iscritto viene creato anche nel
Systeme del partner con il tag `public_optin.systeme_tag` (vedi services/partner_systeme.py).
Parte in background: se Systeme non risponde l'iscrizione riesce comunque e l'esito resta nel
campo `systeme` del lead. Tetti: 3 tentativi per lead, 15 minuti tra l'uno e l'altro, 5
sincronizzazioni contemporanee per istanza.

Limiti noti (dichiarati, non risolti): il tetto per IP e' per istanza Cloud Run; senza un
indice unico su (partner_id, email) due richieste simultanee con la stessa email nuova possono
creare due lead; non c'e' double opt-in, quindi il consenso registrato e' quello dichiarato da
chi compila il modulo.
"""
import asyncio
import logging
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from services import partner_systeme
from services.proposta_chat import ChatRateLimiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner-optin", tags=["partner-optin"])
security = HTTPBearer(auto_error=False)

# Iniettato da server.py via set_db()
db = None

SOURCE = "funnel_bozza_vercel"
DEFAULT_ORIGIN = "masterclass"
MAX_PER_HOUR = 120
MAX_PER_IP = 10          # richieste ogni 10 minuti, per IP
IP_WINDOW_SECONDS = 600
MAX_INTERACTIONS = 20    # storico tenuto per lead: l'array non cresce senza limite
_ip_limiter = ChatRateLimiter(max_messages=MAX_PER_IP, window_seconds=IP_WINDOW_SECONDS)
_tasks: set = set()      # riferimenti forti ai task Telegram, altrimenti Python puo' scartarli
_PHONE_RE = re.compile(r"[^0-9+ ()./-]")


def set_db(database) -> None:
    global db
    db = database


class OptinRequest(BaseModel):
    nome: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    telefono: Optional[str] = Field(None, max_length=40)
    consenso: bool = False
    # Campo trappola: un utente vero non lo vede, un bot lo compila.
    website: Optional[str] = Field(None, max_length=200)
    pagina: Optional[str] = Field(None, max_length=300)
    referrer: Optional[str] = Field(None, max_length=500)
    utm_source: Optional[str] = Field(None, max_length=80)
    utm_medium: Optional[str] = Field(None, max_length=80)
    utm_campaign: Optional[str] = Field(None, max_length=80)


class OptinResponse(BaseModel):
    ok: bool


def _keep(coro) -> None:
    """Task in background con riferimento forte (altrimenti Python puo' scartarlo)."""
    task = asyncio.create_task(coro)
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


# Sincronizzazione Systeme: tetti che impediscono di usare la rotta pubblica per martellare
# l'account Systeme del partner (3-6 chiamate in uscita per ogni sincronizzazione).
SYSTEME_MAX_ATTEMPTS = 3        # tentativi totali per lead
SYSTEME_RETRY_MINUTES = 15      # pausa minima tra un tentativo e il successivo
SYSTEME_MAX_INFLIGHT = 5        # sincronizzazioni contemporanee, per istanza
_systeme_inflight = 0


def _systeme_due(state: Optional[dict], now: datetime) -> bool:
    """True se per questo lead si puo' (ri)provare la sincronizzazione ora."""
    state = state or {}
    if state.get("ok") is True:
        return False
    if int(state.get("attempts") or 0) >= SYSTEME_MAX_ATTEMPTS:
        return False
    try:
        last = datetime.fromisoformat(str(state.get("at")))
    except (TypeError, ValueError):
        return True
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    return now - last >= timedelta(minutes=SYSTEME_RETRY_MINUTES)


async def _launch_sync(pid: str, email: str, nome: str, cfg: dict, state: Optional[dict] = None) -> None:
    """Prenota il tentativo sul lead (cosi' una raffica di richieste ne avvia uno solo) e lo lancia.

    Non parte se manca la chiave del partner o se sono gia' in corso troppe sincronizzazioni.
    """
    global _systeme_inflight
    now = datetime.now(timezone.utc)
    if not partner_systeme.api_key_for(pid):
        logger.info("[PARTNER-OPTIN] sync Systeme acceso ma manca SYSTEME_API_KEY_PARTNER_%s", pid)
        return
    if _systeme_inflight >= SYSTEME_MAX_INFLIGHT or not _systeme_due(state, now):
        return
    attempts = int((state or {}).get("attempts") or 0) + 1
    await db.partner_leads.update_one(
        {"partner_id": pid, "email": email},
        {"$set": {"systeme": {"ok": False, "reason": "in_corso", "contact_id": None,
                              "attempts": attempts, "at": now.isoformat()}}},
    )
    _systeme_inflight += 1
    _keep(_sync_systeme(pid, email, nome, cfg, attempts))


async def _sync_systeme(pid: str, email: str, nome: str, cfg: dict, attempts: int) -> None:
    """Riflette l'iscritto nel Systeme del partner e registra l'esito sul lead.

    L'esito (`systeme`: ok, motivo, tentativi, data, id contatto) non contiene mai la chiave.
    Non solleva.
    """
    global _systeme_inflight
    try:
        result = await partner_systeme.sync_contact(
            partner_systeme.api_key_for(pid), email, nome, partner_systeme.clean_tag(cfg.get("systeme_tag")))
        await db.partner_leads.update_one(
            {"partner_id": pid, "email": email},
            {"$set": {"systeme": {
                "ok": bool(result.get("ok")),
                "reason": result.get("reason"),
                "contact_id": result.get("contact_id"),
                "attempts": attempts,
                "at": datetime.now(timezone.utc).isoformat(),
            }}},
        )
    except Exception:  # noqa: BLE001
        logger.warning("[PARTNER-OPTIN] sync Systeme non riuscita", exc_info=True)
    finally:
        _systeme_inflight = max(0, _systeme_inflight - 1)


async def _find_partner(partner_id: str):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        try:
            partner = await db.partners.find_one({"id": int(partner_id)}, {"_id": 0})
        except ValueError:
            partner = None
    return partner


def _client_ip(request: Request) -> str:
    """IP del visitatore per il tetto per IP.

    La richiesta arriva da browser -> Vercel -> www.ciak.io -> Cloud Run: l'indirizzo di
    connessione e' quello di un proxy, uguale per tutti. Se lo usassimo, 10 iscrizioni di
    persone diverse nello stesso quarto d'ora si bloccherebbero a vicenda. Si usa quindi il
    primo valore di X-Forwarded-For, anche senza TRUST_PROXY_HEADERS. Il rovescio e' dichiarato:
    un attaccante puo' falsificare l'intestazione e aggirare il tetto per IP; resta il tetto
    orario per partner, che non dipende dall'IP.
    """
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    if forwarded:
        return forwarded[:64]
    return request.client.host if request.client else "unknown"


@router.post("/{partner_id}", response_model=OptinResponse)
async def partner_optin(partner_id: str, payload: OptinRequest, request: Request):
    if db is None:
        raise HTTPException(503, "Database non configurato")

    # Il consenso si controlla prima di cercare il partner: il 422 non rivela quale funnel e' acceso.
    if payload.consenso is not True:
        raise HTTPException(422, "Serve il consenso al trattamento dei dati")

    # Per IP, prima di qualunque lettura sul database (anche le richieste con email gia' presente).
    if not _ip_limiter.allow(f"{partner_id}:{_client_ip(request)}"):
        logger.warning("[PARTNER-OPTIN] limite per IP raggiunto partner=%s", partner_id)
        raise HTTPException(429, "Troppe richieste, riprova tra poco")

    # 404 identico per "non esiste" e "non abilitato": non si indovina chi ha il funnel acceso.
    partner = await _find_partner(partner_id)
    cfg = (partner or {}).get("public_optin") or {}
    if not partner or cfg.get("enabled") is not True:
        raise HTTPException(404, "Non trovato")

    if payload.website:  # bot: finge successo, non salva
        return OptinResponse(ok=True)

    pid = str(partner.get("id", partner_id))
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    recenti = await db.partner_leads.count_documents({
        "partner_id": pid, "source": SOURCE,
        "created_at": {"$gte": (now - timedelta(hours=1)).isoformat()},
    })
    if recenti >= MAX_PER_HOUR:
        logger.warning("[PARTNER-OPTIN] tetto orario raggiunto partner=%s", pid)
        raise HTTPException(429, "Troppe richieste, riprova tra poco")

    email = str(payload.email).lower()
    telefono = _PHONE_RE.sub("", payload.telefono or "").strip() or None
    utm = {k: v for k, v in {
        "utm_source": payload.utm_source,
        "utm_medium": payload.utm_medium,
        "utm_campaign": payload.utm_campaign,
    }.items() if v}
    origin = str(cfg.get("funnel_origin") or DEFAULT_ORIGIN)[:60]
    consent = {"accepted": True, "at": now_iso, "informativa": "privacy.html"}

    # Un'unica scrittura: o crea il lead o lo trova. `upserted_id` dice quale dei due.
    result = await db.partner_leads.update_one(
        {"partner_id": pid, "email": email},
        {"$setOnInsert": {
            "id": str(uuid.uuid4()),
            "partner_id": pid,
            "email": email,
            "name": payload.nome.strip(),
            "phone": telefono,
            "funnel_origin": origin,
            "status": "new",
            "source": SOURCE,
            "utm": utm,
            "referrer": payload.referrer,
            "pagina": payload.pagina,
            "consent": consent,
            "created_at": now_iso,
        }},
        upsert=True,
    )
    if getattr(result, "upserted_id", None) is None:
        # Gia' presente (anche da un altro canale): si registra l'interazione, con storico
        # limitato, e il consenso dato ora se il lead non ne ha uno.
        await db.partner_leads.update_one(
            {"partner_id": pid, "email": email},
            {
                "$set": {"last_interaction": now_iso},
                "$push": {"interactions": {
                    "$each": [{"timestamp": now_iso, "type": "optin"}],
                    "$slice": -MAX_INTERACTIONS,
                }},
            },
        )
        await db.partner_leads.update_one(
            {"partner_id": pid, "email": email, "consent": {"$exists": False}},
            {"$set": {"consent": consent}},
        )
        if cfg.get("systeme_sync") is True:  # riprova se la sincronizzazione precedente non e' andata
            lead = await db.partner_leads.find_one({"partner_id": pid, "email": email}, {"_id": 0, "systeme": 1})
            await _launch_sync(pid, email, payload.nome.strip(), cfg, (lead or {}).get("systeme"))
        return OptinResponse(ok=True)

    try:  # l'avviso non deve mai far fallire l'iscrizione, e non porta l'email
        from routers.partner_journey import notify_telegram
        task = asyncio.create_task(notify_telegram(
            f"🎯 Nuova iscrizione masterclass\n👤 Partner: {partner.get('name')}\n📍 Origine: {origin}"
        ))
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)
    except Exception:  # noqa: BLE001
        logger.warning("[PARTNER-OPTIN] avviso Telegram non inviato", exc_info=True)

    if cfg.get("systeme_sync") is True:
        await _launch_sync(pid, email, payload.nome.strip(), cfg)

    return OptinResponse(ok=True)


async def _require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Solo admin/superadmin (stesso schema di routers/evo_booster.py)."""
    from auth import decode_token
    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")
    data = decode_token(credentials.credentials)
    if not data:
        raise HTTPException(status_code=401, detail="Token non valido o scaduto")
    if data.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return data


SYNC_BATCH_MAX = 10         # lead per chiamata: ognuno costa 3-6 chiamate verso Systeme
SYNC_TIME_BUDGET_S = 100    # si ferma prima del timeout di Cloud Run (300 s); i lead restanti alla chiamata dopo
SYNC_LOCK_MINUTES = 5       # un lead "in_corso" da meno di cosi' lo sta lavorando qualcun altro


def _in_progress(state: Optional[dict], now: datetime) -> bool:
    state = state or {}
    if state.get("reason") != "in_corso":
        return False
    try:
        at = datetime.fromisoformat(str(state.get("at")))
    except (TypeError, ValueError):
        return False
    if at.tzinfo is None:
        at = at.replace(tzinfo=timezone.utc)
    return now - at < timedelta(minutes=SYNC_LOCK_MINUTES)


@router.post("/{partner_id}/sync-systeme")
async def sync_existing_leads(partner_id: str, _admin=Depends(_require_admin)):
    """Admin: porta nel Systeme del partner i lead del funnel in bozza non ancora sincronizzati.

    Per chi si e' iscritto prima di accendere `systeme_sync`. Prende solo i lead di questa
    origine, con consenso registrato, non `lost` e senza `systeme.ok`. Al massimo 10 per chiamata
    e non oltre ~100 secondi: se ne restano, si rilancia. La risposta ha solo conteggi e motivi:
    niente email.

    L'admin puo' volutamente ritentare lead gia' falliti: qui NON valgono il tetto di 3 tentativi
    ne' la pausa di 15 minuti del percorso pubblico (il contatore `attempts` continua a salire).
    Un doppio clic non duplica il lavoro: ogni lead viene riletto e prenotato (`in_corso`) subito
    prima di essere sincronizzato; la prenotazione non e' atomica, quindi due chiamate esattamente
    simultanee possono ancora sovrapporsi sul primo lead (Systeme non crea doppioni: cerca per email).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    partner = await _find_partner(partner_id)
    if not partner:
        raise HTTPException(404, "Partner non trovato")
    cfg = partner.get("public_optin") or {}
    pid = str(partner.get("id", partner_id))
    if cfg.get("systeme_sync") is not True:
        raise HTTPException(409, "Sincronizzazione Systeme non attiva per questo partner")
    key = partner_systeme.api_key_for(pid)
    if not key:
        raise HTTPException(409, f"Manca la chiave SYSTEME_API_KEY_PARTNER_{pid} nell'ambiente")

    leads = await db.partner_leads.find({"partner_id": pid, "source": SOURCE}, {"_id": 0}).to_list(length=1000)
    todo, already, no_consent, lost = [], 0, 0, 0
    for lead in leads:
        if lead.get("status") == "lost":
            lost += 1
        elif not ((lead.get("consent") or {}).get("accepted") is True):
            no_consent += 1
        elif (lead.get("systeme") or {}).get("ok") is True:
            already += 1
        else:
            todo.append(lead)

    tag = partner_systeme.clean_tag(cfg.get("systeme_tag"))
    deadline = time.monotonic() + SYNC_TIME_BUDGET_S
    synced = failed = busy = done = 0
    reasons: dict = {}
    for lead in todo[:SYNC_BATCH_MAX]:
        if time.monotonic() > deadline:
            break
        email = str(lead.get("email") or "").lower()
        now = datetime.now(timezone.utc)
        fresh = await db.partner_leads.find_one({"partner_id": pid, "email": email}, {"_id": 0, "systeme": 1})
        state = (fresh or {}).get("systeme") or {}
        if state.get("ok") is True or _in_progress(state, now):
            busy += 1
            done += 1
            continue
        attempts = int(state.get("attempts") or 0) + 1
        await db.partner_leads.update_one(
            {"partner_id": pid, "email": email},
            {"$set": {"systeme": {"ok": False, "reason": "in_corso", "contact_id": None,
                                  "attempts": attempts, "at": now.isoformat()}}},
        )
        result = await partner_systeme.sync_contact(key, email, str(lead.get("name") or ""), tag)
        ok = bool(result.get("ok"))
        synced += ok
        failed += not ok
        done += 1
        if not ok:
            reasons[result.get("reason")] = reasons.get(result.get("reason"), 0) + 1
        await db.partner_leads.update_one(
            {"partner_id": pid, "email": email},
            {"$set": {"systeme": {
                "ok": ok, "reason": result.get("reason"), "contact_id": result.get("contact_id"),
                "attempts": attempts, "at": datetime.now(timezone.utc).isoformat(),
            }}},
        )
    return {
        "ok": True, "lead_totali": len(leads), "da_sincronizzare": len(todo),
        "sincronizzati": synced, "falliti": failed, "motivi": reasons,
        "gia_sincronizzati": already, "senza_consenso": no_consent, "persi_esclusi": lost,
        "saltati_gia_in_corso": busy, "rimasti": max(0, len(todo) - done),
    }
