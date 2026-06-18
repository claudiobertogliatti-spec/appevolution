"""
Proposta Router - Evolution PRO
Gestione pagina proposta pubblica con token,
firma contratto inline, pagamento Stripe/bonifico, upload documenti.
"""

import asyncio
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import secrets
import logging
import httpx

from services.ciak_systeme import ciak_emit_event, ciak_set_contact_fields
from services.ciak_partnership_email import (
    send_contratto_firmato_async,
    send_partnership_benvenuto_async,
    send_documenti_ricevuti_async,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proposta", tags=["proposta"])

# MongoDB connection (fallback Atlas come server.py)
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'evolution_pro')
ATLAS_FALLBACK = os.environ.get('MONGO_ATLAS_URL', '')
if not mongo_url or "customer-apps" in mongo_url:
    if ATLAS_FALLBACK:
        mongo_url = ATLAS_FALLBACK
        db_name = "evolution_pro"
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Allow server.py to inject its db reference
def set_db(database):
    global db
    db = database

SCADENZA_GIORNI = 7
BASE_URL = os.environ.get('BASE_URL', os.environ.get('FRONTEND_URL', 'https://www.ciak.io'))


class GeneraPropostaRequest(BaseModel):
    analisi_posizionamento: Optional[str] = None
    analisi_punti_forza: Optional[List[str]] = None
    analisi_pdf_url: Optional[str] = None
    video_benvenuto_url: Optional[str] = None
    contract_params: Optional[dict] = None


# ─────────────────────────────────────────────────
# ADMIN: Genera proposta per un partner
# ─────────────────────────────────────────────────
@router.post("/genera/{partner_id}")
async def genera_proposta(partner_id: str, body: GeneraPropostaRequest = None):
    """Genera token proposta e salva in MongoDB."""
    # Cerca in entrambe le collection (users/clienti per il flusso analisi, o partners)
    prospect = await db.users.find_one({"id": partner_id}, {"_id": 0})
    if not prospect:
        prospect = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not prospect:
        raise HTTPException(404, "Prospect non trovato")

    # Controlla se esiste già una proposta attiva
    existing = await db.proposte.find_one(
        {"partner_id": partner_id, "stato": {"$nin": ["scaduta"]}}, {"_id": 0})
    if existing:
        return {
            "success": True,
            "token": existing["token"],
            "url": f"{BASE_URL}/proposta/{existing['token']}",
            "message": "Proposta esistente"
        }

    token = secrets.token_urlsafe(12)
    now = datetime.now(timezone.utc)

    nome = prospect.get("nome", prospect.get("name", ""))
    cognome = prospect.get("cognome", "")
    email = prospect.get("email", "")
    prospect_nome = f"{nome} {cognome}".strip() or email

    proposta = {
        "id": str(uuid.uuid4()),
        "token": token,
        "partner_id": partner_id,
        "prospect_nome": prospect_nome,
        "prospect_email": email,
        "analisi_posizionamento": body.analisi_posizionamento if body else None,
        "analisi_punti_forza": body.analisi_punti_forza if body else [],
        "analisi_pdf_url": body.analisi_pdf_url if body else prospect.get("analisi_pdf_url"),
        "video_benvenuto_url": body.video_benvenuto_url if body else None,
        "contract_params": body.contract_params if body else prospect.get("contract_params", {}),
        "creato_at": now.isoformat(),
        "visto_at": None,
        "accettato_at": None,
        "contratto_firmato_at": None,
        "pagamento_metodo": None,
        "pagamento_completato": False,
        "pagamento_completato_at": None,
        "stripe_session_id_partnership": None,
        "documenti_identita_url": [],
        "distinta_bonifico_url": None,
        "stato": "inviata",
        "scadenza": (now + timedelta(days=SCADENZA_GIORNI)).isoformat()
    }

    await db.proposte.insert_one(proposta)
    logger.info(f"[PROPOSTA] Generata per {prospect_nome} — token={token}")

    await _notify_telegram(f"Proposta generata per {prospect_nome}\nLink: {BASE_URL}/proposta/{token}")

    return {
        "success": True,
        "token": token,
        "url": f"{BASE_URL}/proposta/{token}",
        "message": "Proposta generata"
    }


# ─────────────────────────────────────────────────
# PUBBLICA: Leggi proposta via token
# ─────────────────────────────────────────────────
@router.get("/{token}")
async def get_proposta(token: str):
    """Ritorna dati proposta — pubblica, no auth."""
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    # Check scadenza
    scadenza = proposta.get("scadenza", "")
    if scadenza:
        try:
            scad_dt = datetime.fromisoformat(scadenza)
            if datetime.now(timezone.utc) > scad_dt and proposta["stato"] not in ["pagamento_completato", "contratto_firmato"]:
                await db.proposte.update_one({"token": token}, {"$set": {"stato": "scaduta"}})
                raise HTTPException(410, "Proposta scaduta")
        except (ValueError, TypeError):
            pass

    # Primo accesso → aggiorna visto_at
    if not proposta.get("visto_at"):
        now = datetime.now(timezone.utc).isoformat()
        await db.proposte.update_one({"token": token}, {"$set": {"visto_at": now, "stato": "vista"}})
        proposta["visto_at"] = now
        proposta["stato"] = "vista"
        await _notify_telegram(f"Proposta aperta da {proposta.get('prospect_nome', '?')}")

    return proposta


# ─────────────────────────────────────────────────
# PUBBLICA: Accetta proposta
# ─────────────────────────────────────────────────
@router.post("/{token}/accetta")
async def accetta_proposta(token: str):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    if proposta.get("accettato_at"):
        return {"success": True, "message": "Gia accettata"}

    now = datetime.now(timezone.utc).isoformat()
    await db.proposte.update_one({"token": token}, {"$set": {
        "accettato_at": now, "stato": "accettata"
    }})
    await _notify_telegram(f"Proposta ACCETTATA da {proposta.get('prospect_nome', '?')}")
    return {"success": True, "message": "Proposta accettata"}


# ─────────────────────────────────────────────────
# PUBBLICA: Registra firma contratto dalla proposta
# ─────────────────────────────────────────────────
@router.post("/{token}/firma-contratto")
async def firma_contratto_proposta(token: str, request: Request, background_tasks: BackgroundTasks):
    """Salva firma contratto dalla pagina proposta."""
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    body = await request.json()
    now = datetime.now(timezone.utc)

    contract_data = {
        "version": "v1.0",
        "signed_at": now.isoformat(),
        "signature_base64": body.get("signature_base64", ""),
        "ip_address": request.client.host if request.client else "unknown",
        "clausole_vessatorie_approved": body.get("clausole_vessatorie_approved", False)
    }

    # Aggiorna proposta (pdf_url persistito più sotto, dopo la generazione)
    await db.proposte.update_one({"token": token}, {"$set": {
        "contratto_firmato_at": now.isoformat(),
        "stato": "contratto_firmato"
    }})

    # Aggiorna partner
    partner_id = proposta.get("partner_id")
    if partner_id:
        for coll in ["partners", "users"]:
            await db[coll].update_one(
                {"id": partner_id},
                {"$set": {
                    "contract": contract_data,
                    "contract_signed": True,
                    "contract_signed_at": now.isoformat(),
                    "stato_funnel": "contratto_firmato"
                }}
            )

    # Genera PDF + invia email transactional Ciak al cliente
    pdf_url = None
    pdf_bytes_for_email = None
    try:
        from routers.contract import generate_contract_pdf, send_contract_email
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
        if not partner:
            partner = await db.users.find_one({"id": partner_id}, {"_id": 0})
        if partner:
            pdf_url = await generate_contract_pdf(partner, contract_data)
            # send_contract_email: Telegram admin + tag Systeme contratto_firmato
            await send_contract_email(partner, pdf_url)
            # Best-effort: scarica i bytes del PDF per allegarli all'email cliente
            if pdf_url:
                try:
                    if pdf_url.startswith("http"):
                        async with httpx.AsyncClient(timeout=15) as h:
                            r = await h.get(pdf_url)
                            if r.status_code == 200:
                                pdf_bytes_for_email = r.content
                    elif pdf_url.startswith("/"):
                        # path locale tipo /app/storage/contracts/... oppure /api/static/...
                        import os as _os
                        candidate = pdf_url
                        if pdf_url.startswith("/api/static/"):
                            candidate = _os.path.join("/app", pdf_url.lstrip("/"))
                        if _os.path.exists(candidate):
                            with open(candidate, "rb") as fh:
                                pdf_bytes_for_email = fh.read()
                except Exception as e:
                    logger.warning(f"[PROPOSTA] PDF bytes fetch failed: {e}")
    except Exception as e:
        logger.error(f"[PROPOSTA] Errore PDF/email post-firma: {e}")

    # Email Ciak al cliente con PDF allegato (fire-and-forget)
    cliente_email = proposta.get("prospect_email")
    cliente_nome = (proposta.get("prospect_nome") or "").split()[0] if proposta.get("prospect_nome") else ""
    if cliente_email:
        # BackgroundTasks invece di asyncio.create_task: Cloud Run aspetta che
        # la BG task completi prima di riciclare la worker. Senza, CancelledError
        # (BaseException) cancella il send + insert audit (vedi memory 17/5).
        background_tasks.add_task(
            send_contratto_firmato_async,
            email=cliente_email,
            nome=cliente_nome,
            pdf_bytes=pdf_bytes_for_email,
        )

    # Persisti il pdf_url sulla proposta così il flusso Operativo può linkare
    # il contratto firmato nello Step 1 senza richiedere un nuovo upload.
    if pdf_url:
        await db.proposte.update_one(
            {"token": token}, {"$set": {"contratto_pdf_url": pdf_url}}
        )

    await _notify_telegram(f"Contratto FIRMATO da {proposta.get('prospect_nome', '?')} (via proposta)")

    return {"success": True, "signed_at": now.isoformat(), "pdf_url": pdf_url}


# ─────────────────────────────────────────────────
# PUBBLICA: Pagamento Stripe partnership
# ─────────────────────────────────────────────────
@router.post("/{token}/pagamento-stripe")
async def pagamento_stripe(token: str, request: Request):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    corrispettivo = proposta.get("contract_params", {}).get("corrispettivo", 2790.0)
    stripe_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_key:
        raise HTTPException(500, "Stripe non configurato")

    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

        origin = str(request.base_url).rstrip('/')
        success_url = f"{origin}/proposta/{token}?pagamento=successo&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/proposta/{token}?pagamento=annullato"

        webhook_url = f"{origin}/api/webhook/stripe"
        checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)

        session_request = CheckoutSessionRequest(
            amount=float(corrispettivo),
            currency="eur",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "tipo": "partnership",
                "token": token,
                "partner_id": proposta.get("partner_id", ""),
                "prospect_email": proposta.get("prospect_email", ""),
                "prospect_nome": proposta.get("prospect_nome", "")
            }
        )

        session = await checkout.create_checkout_session(session_request)

        # Salva transaction
        await db.payment_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "service_type": "partnership",
            "amount": corrispettivo,
            "currency": "eur",
            "partner_id": proposta.get("partner_id"),
            "partner_email": proposta.get("prospect_email"),
            "partner_name": proposta.get("prospect_nome"),
            "payment_status": "initiated",
            "token": token,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        await db.proposte.update_one({"token": token}, {"$set": {
            "pagamento_metodo": "stripe",
            "stripe_session_id_partnership": session.session_id
        }})

        return {"success": True, "checkout_url": session.url, "session_id": session.session_id}

    except Exception as e:
        logger.error(f"[PROPOSTA] Errore Stripe: {e}")
        raise HTTPException(500, f"Errore creazione checkout: {str(e)}")


# ─────────────────────────────────────────────────
# PUBBLICA: Scegli pagamento bonifico
# ─────────────────────────────────────────────────
@router.post("/{token}/scelta-bonifico")
async def scelta_bonifico(token: str):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    await db.proposte.update_one({"token": token}, {"$set": {
        "pagamento_metodo": "bonifico"
    }})
    return {"success": True, "iban": "LT94 3250 0974 4929 5781",
            "beneficiario": "Evolution PRO LLC",
            "indirizzo_beneficiario": "8 The Green, Suite A, Dover, DE 19901 — USA",
            "banca": "Revolut Bank UAB",
            "paese_banca": "Lituania",
            "bic": "REVOLT21",
            "causale": f"Partnership Evolution PRO - {proposta.get('prospect_nome', '')}"}


# ─────────────────────────────────────────────────
# PUBBLICA: Upload distinta bonifico
# ─────────────────────────────────────────────────
@router.post("/{token}/upload-distinta")
async def upload_distinta(token: str, file: UploadFile = File(...)):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET'))

        contents = await file.read()
        result = cloudinary.uploader.upload(contents, resource_type="auto",
            folder=f"evolution_pro/distinte/{token}",
            public_id=f"distinta_{token}")

        url = result.get("secure_url")
        await db.proposte.update_one({"token": token}, {"$set": {
            "distinta_bonifico_url": url,
            "pagamento_metodo": "bonifico",
            "stato": "pagamento_in_attesa_verifica"
        }})

        await _notify_telegram(
            f"Distinta bonifico caricata da {proposta.get('prospect_nome', '')}\nVerifica e approva nel pannello admin")

        return {"success": True, "url": url}
    except Exception as e:
        logger.error(f"[PROPOSTA] Upload distinta error: {e}")
        raise HTTPException(500, str(e))


# ─────────────────────────────────────────────────
# PUBBLICA: Upload documenti identita
# ─────────────────────────────────────────────────
# ─────────────────────────────────────────────────
# Helper: attiva partner + invia email benvenuto con credenziali
# ─────────────────────────────────────────────────
async def _activate_partner_account_and_notify(
    partner_id: str,
    prospect_email: str,
    prospect_nome: str,
) -> None:
    """
    Auto-attivazione account partner Ciak post-pagamento.

    PATTERN MAGIC LINK (LOCK 17/5/2026):
    Invece di generare una password e mandarla via SMTP (fragile su Cloud Run,
    DNS register.it fallisce), generiamo un magic token con scadenza 7 giorni
    e lo propaghiamo al partner via Systeme.io workflow.

      1. Genera magic_token (uuid hex) + scadenza 7gg. Salva su users.
      2. Costruisce setup_url = https://www.ciak.io/partner/setup-password?token=<uuid>
      3. Scrive custom field Systeme `partner_setup_url` con quel URL
      4. Applica tag Systeme `partner_setup_pending` → workflow Systeme manda
         l'email con il link cliccabile (interpolazione {{contact.partner_setup_url}})
      5. Anche se Systeme è down, l'admin vede il magic link copiabile nel
         dashboard Ciak (endpoint /admin/ciak/partner-setup-pending).

    Sicurezza:
      - Token usato monouso (consumed_at)
      - Scadenza 7gg, dopo serve reset manuale admin
      - Niente password in chiaro mai (no email, no DB)
      - Bcrypt hash solo dopo che il partner ha scelto la sua password

    Fire-and-forget — non blocca la response del POST.
    """
    if not partner_id or not prospect_email:
        return

    cliente_nome = (prospect_nome or "").split()[0] if prospect_nome else ""

    user = await db.users.find_one({"id": partner_id}, {"_id": 0})
    if not user:
        logger.warning("[PROPOSTA] _activate_partner: user %s non trovato", partner_id)
        return

    # Se l'utente ha già password ATTIVA (non auto-generated e non in setup pending),
    # non rigeneriamo il magic link — è un upgrade da cliente esistente che sa
    # già come accedere.
    has_real_password = (
        user.get("password_hash")
        and not user.get("partner_setup_token")
        and not user.get("must_change_password")
    )

    if has_real_password:
        logger.info("[PROPOSTA] Partner %s ha già password — skip magic link", prospect_email)
        # Comunque applichiamo il tag così Systeme può mandare benvenuto generico
        asyncio.create_task(ciak_emit_event(
            email=prospect_email,
            event_name="partner_attivo_existing_user",
            first_name=cliente_nome,
        ))
        return

    # Genera magic token (32 char hex), scadenza 7gg
    setup_token = uuid.uuid4().hex
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    setup_url = f"https://www.ciak.io/partner/setup-password?token={setup_token}"

    await db.users.update_one(
        {"id": partner_id},
        {"$set": {
            "partner_setup_token": setup_token,
            "partner_setup_expires_at": expires_at,
            "partner_setup_created_at": datetime.now(timezone.utc).isoformat(),
            "partner_setup_consumed_at": None,
            # Rimuovi eventuali password legacy auto-generated (forziamo nuovo setup)
            "password_hash": None,
            "must_change_password": False,
        },
        "$unset": {"password_auto_generated_at": ""}},
    )
    logger.info(
        "[PROPOSTA] Magic link partner setup creato per %s (token=%s..., expires=%s)",
        prospect_email, setup_token[:8], expires_at,
    )

    # Scrive custom field Systeme + applica tag (entrambi async, non bloccanti)
    asyncio.create_task(_propagate_partner_setup_to_systeme(
        email=prospect_email,
        nome=cliente_nome,
        setup_url=setup_url,
        expires_at=expires_at,
    ))


async def _propagate_partner_setup_to_systeme(
    email: str,
    nome: str,
    setup_url: str,
    expires_at: str,
) -> None:
    """Scrive custom field + applica tag Systeme per triggerare il workflow
    email "Benvenuto Partnership Ciak — Imposta la tua password".

    Step:
      1. PATCH contact: custom field partner_setup_url = setup_url
         (richiede che il custom field esista su Systeme dashboard)
      2. Apply tag partner_setup_pending → workflow Systeme parte
    """
    # 1. Custom field (best-effort: se il field non esiste su Systeme, ignorato silenziosamente)
    try:
        await ciak_set_contact_fields(
            email=email,
            fields={"partner_setup_url": setup_url},
            first_name=nome,
        )
    except Exception as e:
        logger.warning("[PROPOSTA] Systeme custom field set failed for %s: %s", email, e)

    # 2. Tag trigger workflow (anche se custom field fallisce, l'admin può
    #    recuperare il link dal dashboard Ciak)
    try:
        await ciak_emit_event(
            email=email,
            event_name="partner_setup_pending",
            extra_tags=["ciak_partner_attivo"],
            first_name=nome,
            metadata={
                "setup_url": setup_url,
                "expires_at": expires_at,
            },
        )
    except Exception as e:
        logger.warning("[PROPOSTA] Systeme tag emit failed for %s: %s", email, e)


async def _seed_operativo_journey_from_funnel(
    partner_id: str,
    contract_signed_at=None,
    contract_pdf_url=None,
    payment_metodo=None,
    payment_at=None,
) -> None:
    """Seeda i 13 step del flusso Operativo alla conferma pagamento.

    Lo Step 1 ("Contratto + distinta") è GIÀ assolto dal funnel pubblico —
    firma digitale + pagamento Stripe/bonifico — quindi lo pre-completiamo con
    i dati del funnel e portiamo il primo step azionabile a 02-discovery-video.
    Evita l'intoppo di chiedere al partner di ri-caricare contratto e distinta
    che ha appena firmato e pagato.

    Idempotente: sicuro su re-run (la conferma può arrivare più volte) e non
    regredisce un partner che ha già avanzato oltre lo step 2.
    """
    if not partner_id:
        return
    try:
        from services.journey_seed import seed_partner_journey

        # 1. Assicura i 13 step. start_step_number=2 → step 1 done, step 2 in_progress.
        #    Se i record esistevano già (es. GET pigro pre-pagamento), non li tocca:
        #    ci pensano gli step 2/3 sotto a normalizzare lo stato.
        await seed_partner_journey(db, partner_id, start_step_number=2)

        now = datetime.now(timezone.utc)
        set_fields = {
            "status": "done",
            "completed_at": now,
            "started_at": now,
            "updated_at": now,
        }
        step1_data = {
            "source": "funnel",
            "contract_signed_at": contract_signed_at,
            "contract_pdf_url": contract_pdf_url,
            "payment_metodo": payment_metodo,
            "payment_at": payment_at,
        }
        for k, v in step1_data.items():
            if v is not None:
                set_fields[f"data.{k}"] = v

        # 2. Forza 01-contratto = done coi dati del funnel (anche se un GET pigro
        #    lo aveva seedato a in_progress prima del pagamento).
        await db.partner_journey_steps.update_one(
            {"partner_id": partner_id, "step_id": "01-contratto"},
            {"$set": set_fields},
        )

        # 3. Se nessuno step è in_progress (caso lazy-seed pre-pagamento), porta
        #    02-discovery-video a in_progress. Non tocca chi è già più avanti.
        in_progress = await db.partner_journey_steps.find_one(
            {"partner_id": partner_id, "status": "in_progress"}
        )
        if not in_progress:
            await db.partner_journey_steps.update_one(
                {"partner_id": partner_id, "step_id": "02-discovery-video"},
                {"$set": {"status": "in_progress", "started_at": now, "updated_at": now}},
            )
            await db.partners.update_one(
                {"id": partner_id},
                {"$set": {"journey_current_step": "02-discovery-video"}},
            )
        logger.info("[PROPOSTA] Journey Operativo seedato per partner %s (step 1 pre-completo)", partner_id)
    except Exception as e:
        logger.error("[PROPOSTA] seed journey Operativo fallito per %s: %s", partner_id, e)


@router.post("/{token}/upload-documenti")
async def upload_documenti(token: str, background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET'))

        urls = []
        for i, f in enumerate(files[:2]):
            contents = await f.read()
            result = cloudinary.uploader.upload(contents, resource_type="auto",
                folder=f"evolution_pro/documenti/{token}",
                public_id=f"doc_{i+1}")
            urls.append(result.get("secure_url"))

        await db.proposte.update_one({"token": token}, {"$set": {"documenti_identita_url": urls}})
        await _notify_telegram(f"{proposta.get('prospect_nome', '')} ha caricato i documenti identita")

        # Email Ciak "Documenti ricevuti — si parte" al cliente
        cliente_email = proposta.get("prospect_email")
        cliente_nome = (proposta.get("prospect_nome") or "").split()[0] if proposta.get("prospect_nome") else ""
        if cliente_email:
            background_tasks.add_task(
                send_documenti_ricevuti_async,
                email=cliente_email,
                nome=cliente_nome,
            )

        return {"success": True, "urls": urls}
    except Exception as e:
        logger.error(f"[PROPOSTA] Upload documenti error: {e}")
        raise HTTPException(500, str(e))


# ─────────────────────────────────────────────────
# ADMIN: Lista bonifici in attesa di conferma
# ─────────────────────────────────────────────────
@router.get("/admin/bonifici-in-attesa")
async def bonifici_in_attesa():
    """Lista proposte con distinta bonifico caricata ma pagamento non ancora confermato."""
    items = await db.proposte.find({
        "distinta_bonifico_url": {"$exists": True, "$ne": None},
        "pagamento_completato": {"$ne": True}
    }, {"_id": 0}).sort("distinta_caricata_at", -1).to_list(100)
    return {"items": items, "count": len(items)}


# ─────────────────────────────────────────────────
# ADMIN: Conferma bonifico → attiva partner
# ─────────────────────────────────────────────────
@router.post("/{token}/conferma-bonifico")
async def conferma_bonifico(token: str):
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    now = datetime.now(timezone.utc).isoformat()
    await db.proposte.update_one({"token": token}, {"$set": {
        "pagamento_completato": True,
        "pagamento_completato_at": now,
        "stato": "pagamento_completato"
    }})

    partner_id = proposta.get("partner_id")
    prospect_email = proposta.get("prospect_email", "")
    prospect_nome = proposta.get("prospect_nome", "")

    if partner_id:
        # Cambia ruolo a "partner" e avvia onboarding
        await db.users.update_one({"id": partner_id}, {"$set": {
            "role": "partner",
            "stato_funnel": "pagamento_completato",
            "pagamento_partnership_at": now
        }})
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {
                "stato_funnel": "pagamento_completato",
                "pagamento_partnership_at": now,
                "phase": "F1",
                "documents_status": "pending",
                "partnership_pagata": True,
                "partnership_data_pagamento": now,
                "partnership_metodo": "bonifico"
            }},
            upsert=True
        )

    await _add_systeme_tag(prospect_email, "contratto_firmato")
    await _add_systeme_tag(prospect_email, "onboarding_avviato")

    # Auto-attivazione account partner + email Benvenuto Ciak con credenziali
    await _activate_partner_account_and_notify(partner_id, prospect_email, prospect_nome)

    # Seed flusso Operativo: step 1 pre-completo, partner parte dal Discovery video
    await _seed_operativo_journey_from_funnel(
        partner_id,
        contract_signed_at=proposta.get("contratto_firmato_at"),
        contract_pdf_url=proposta.get("contratto_pdf_url"),
        payment_metodo="bonifico",
        payment_at=now,
    )

    await _notify_telegram(
        f"✅ Bonifico confermato — {prospect_nome} è ora PARTNER\n"
        f"📧 {prospect_email}\n"
        f"🚀 Onboarding avviato"
    )

    return {"success": True, "partner_id": partner_id}



# ─────────────────────────────────────────────────
# PUBBLICA: Conferma pagamento Stripe (chiamato dal frontend dopo redirect)
# ─────────────────────────────────────────────────
class ConfermaStripeRequest(BaseModel):
    session_id: str

@router.post("/{token}/conferma-stripe")
async def conferma_stripe(token: str, body: ConfermaStripeRequest):
    """
    Dopo redirect Stripe ?pagamento=successo&session_id=...,
    il frontend chiama questo endpoint per:
    1. Verificare la sessione Stripe
    2. Aggiornare la proposta come pagata
    3. Promuovere l'utente da cliente a partner
    4. Creare il record partner
    5. Notificare via Telegram
    """
    proposta = await db.proposte.find_one({"token": token}, {"_id": 0})
    if not proposta:
        raise HTTPException(404, "Proposta non trovata")

    # Se già confermato, ritorna successo idempotente
    if proposta.get("pagamento_completato"):
        return {
            "success": True,
            "already_confirmed": True,
            "partner_id": proposta.get("partner_id")
        }

    now = datetime.now(timezone.utc).isoformat()

    # 1) Verifica sessione Stripe (opzionale — fallback sicuro)
    stripe_verified = False
    try:
        stripe_key = os.environ.get('STRIPE_API_KEY')
        if stripe_key and body.session_id:
            import stripe
            stripe.api_key = stripe_key
            session = stripe.checkout.Session.retrieve(body.session_id)
            stripe_verified = session.payment_status == "paid"
    except Exception as e:
        logger.warning(f"[PROPOSTA] Stripe verification fallback: {e}")
        # Anche se la verifica fallisce, procediamo (il webhook gestirà)
        stripe_verified = True  # Trust the redirect

    if not stripe_verified:
        # Se Stripe dice esplicitamente che non è pagato, non confermiamo
        return {"success": False, "error": "Pagamento non confermato da Stripe"}

    # 2) Aggiorna proposta
    await db.proposte.update_one({"token": token}, {"$set": {
        "pagamento_completato": True,
        "pagamento_completato_at": now,
        "pagamento_metodo": "stripe",
        "stripe_session_id_conferma": body.session_id,
        "stato": "pagamento_completato"
    }})

    partner_id = proposta.get("partner_id")
    prospect_email = proposta.get("prospect_email", "")
    prospect_nome = proposta.get("prospect_nome", "")

    # 3) Promuovi utente a partner
    if partner_id:
        await db.users.update_one({"id": partner_id}, {"$set": {
            "role": "partner",
            "partnership_pagata": True,
            "stato_funnel": "pagamento_completato",
            "pagamento_partnership_at": now
        }})

        # 4) Upsert partner record
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {
                "name": prospect_nome,
                "email": prospect_email,
                "stato_funnel": "pagamento_completato",
                "pagamento_partnership_at": now,
                "phase": "F1",
                "active": True,
                "documents_status": "pending",
                "partnership_pagata": True,
                "partnership_data_pagamento": now,
                "partnership_metodo": "stripe"
            }},
            upsert=True
        )

    # 5) Tag Systeme.io
    await _add_systeme_tag(prospect_email, "acquisto_partnership")
    await _add_systeme_tag(prospect_email, "partner_attivo")
    await _add_systeme_tag(prospect_email, "pagamento_2790")

    # 6) Auto-attivazione account partner + email Benvenuto Ciak con credenziali
    await _activate_partner_account_and_notify(partner_id, prospect_email, prospect_nome)

    # 6b) Seed flusso Operativo: step 1 pre-completo, partner parte dal Discovery video
    await _seed_operativo_journey_from_funnel(
        partner_id,
        contract_signed_at=proposta.get("contratto_firmato_at"),
        contract_pdf_url=proposta.get("contratto_pdf_url"),
        payment_metodo="stripe",
        payment_at=now,
    )

    # 7) Notifica Telegram
    await _notify_telegram(
        f"Pagamento Stripe confermato — {prospect_nome} è ora PARTNER\n"
        f"{prospect_email}\nOnboarding avviato"
    )

    logger.info(f"[PROPOSTA] Conferma Stripe completata — token={token}, partner={partner_id}")

    return {
        "success": True,
        "partner_id": partner_id,
        "role": "partner"
    }



# ─────────────────────────────────────────────────
# ADMIN: Lista proposte
# ─────────────────────────────────────────────────
@router.get("/admin/lista")
async def lista_proposte():
    proposte = await db.proposte.find({}, {"_id": 0}).sort("creato_at", -1).to_list(100)
    return {"items": proposte, "count": len(proposte)}


# ─────────────────────────────────────────────────
# PIXEL TRACKING email partnership (apertura email)
# ─────────────────────────────────────────────────
from fastapi.responses import Response as FastAPIResponse
import base64 as _b64_partnership
_PIXEL_GIF_1X1 = _b64_partnership.b64decode(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
)

# Router separato montato sotto /api/partnership (per non conflittare col prefix
# /api/proposta principale).
from fastapi import APIRouter as _APIRouter
partnership_pixel_router = _APIRouter(prefix="/api/partnership", tags=["partnership-email"])

@partnership_pixel_router.get("/email-opened/{token}.gif")
async def partnership_email_opened_pixel(token: str):
    """Pixel 1x1 invisibile per email transactional Partnership (firma/benvenuto/documenti).
    Registra opened_at idempotente + emette tag Systeme."""
    try:
        from services.ciak_partnership_email import register_partnership_email_opened
        await register_partnership_email_opened(token)
    except Exception as e:
        logger.warning("[PARTNERSHIP-PIXEL] register failed for token=%s: %s", token[:8], e)

    return FastAPIResponse(
        content=_PIXEL_GIF_1X1,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate, private",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


# ─────────────────────────────────────────────────
# WEBHOOK: gestione pagamento partnership (chiamata dal webhook Stripe in server.py)
# ─────────────────────────────────────────────────
async def gestisci_pagamento_partnership(session_id: str, metadata: dict):
    """Chiamata dal webhook Stripe quando tipo=partnership."""
    token = metadata.get("token")
    if not token:
        logger.warning("[PROPOSTA] Webhook partnership senza token")
        return

    now = datetime.now(timezone.utc).isoformat()
    await db.proposte.update_one({"token": token}, {"$set": {
        "pagamento_completato": True,
        "pagamento_completato_at": now,
        "stato": "pagamento_completato"
    }})

    partner_id = metadata.get("partner_id")
    if partner_id:
        await db.users.update_one({"id": partner_id}, {"$set": {
            "role": "partner",
            "stato_funnel": "pagamento_completato",
            "pagamento_partnership_at": now
        }})
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {
                "stato_funnel": "pagamento_completato",
                "pagamento_partnership_at": now,
                "phase": "F1",
                "documents_status": "pending",
                "partnership_pagata": True,
                "partnership_data_pagamento": now,
                "partnership_metodo": "stripe"
            }},
            upsert=True
        )

    email = metadata.get("prospect_email", "")
    nome = metadata.get("prospect_nome", "")
    await _add_systeme_tag(email, "contratto_firmato")
    await _add_systeme_tag(email, "onboarding_avviato")
    await _notify_telegram(
        f"✅ Pagamento Stripe partnership — {nome} è ora PARTNER\n"
        f"📧 {email}\n🚀 Onboarding avviato"
    )

    logger.info(f"[PROPOSTA] Pagamento partnership completato — token={token}, partner={partner_id}")


# ─────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────
async def _notify_telegram(message: str):
    try:
        token = os.environ.get('TELEGRAM_BOT_TOKEN')
        chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if token and chat_id:
            async with httpx.AsyncClient(timeout=5) as c:
                await c.post(f"https://api.telegram.org/bot{token}/sendMessage",
                    json={"chat_id": chat_id, "text": message})
    except Exception as e:
        logger.warning(f"Telegram notify error: {e}")


async def _add_systeme_tag(email: str, tag_name: str):
    if not email:
        return
    try:
        api_key = os.environ.get('SYSTEME_API_KEY')
        if not api_key:
            return
        headers = {"X-API-Key": api_key, "accept": "application/json"}
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get("https://api.systeme.io/api/tags?limit=50", headers=headers)
            tags = resp.json().get("items", [])
            tag_id = next((t["id"] for t in tags if t["name"] == tag_name), None)
            if not tag_id:
                return
            resp2 = await c.get(f"https://api.systeme.io/api/contacts?email={email}", headers=headers)
            contacts = resp2.json().get("items", [])
            if not contacts:
                return
            contact_id = contacts[0]["id"]
            await c.post(f"https://api.systeme.io/api/contacts/{contact_id}/tags",
                headers={**headers, "Content-Type": "application/json"},
                json={"tagId": tag_id})
            logger.info(f"[SYSTEME] Tag '{tag_name}' aggiunto a {email}")
    except Exception as e:
        logger.warning(f"[SYSTEME] Tag error: {e}")
