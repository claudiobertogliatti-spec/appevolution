"""
Partner Journey Router
Gestisce il percorso guidato del partner: Posizionamento, Masterclass, Videocorso, Funnel, Lancio
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form, Query, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import os
import uuid
import logging
import json
from pathlib import Path

router = APIRouter(prefix="/api/partner-journey", tags=["partner-journey"])

# Database reference (set from main server)
db = None

def set_db(database):
    global db
    db = database

# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class PosizionamentoData(BaseModel):
    partner_id: str
    step_1_studente_ideale: Optional[str] = None
    step_2_obiettivo: Optional[str] = None
    step_3_trasformazione: Optional[str] = None
    step_4_metodo: Optional[str] = None
    step_5_obiezioni: Optional[str] = None

class PosizionamentoSaveRequest(BaseModel):
    partner_id: str
    step_number: int
    content: str

class PosizionamentoInputs(BaseModel):
    partner_id: str
    competenza: str = ""
    target: str = ""
    problema_cliente: str = ""
    risultato: str = ""
    differenziazione: str = ""
    esperienza: str = ""
    esclusioni: str = ""

class VideocorsoInputs(BaseModel):
    partner_id: str
    durata: str = "medio"
    include_bonus: bool = True
    contenuti_pronti: bool = False

class GenerateCourseStructureRequest(BaseModel):
    partner_id: str

class MasterclassScriptBlock(BaseModel):
    block_id: int
    title: str
    content: str

class MasterclassSaveRequest(BaseModel):
    partner_id: str
    blocks: List[MasterclassScriptBlock]

class MasterclassGenerateRequest(BaseModel):
    partner_id: str

class VideocorsoLessonUpload(BaseModel):
    partner_id: str
    module_id: int
    lesson_id: str
    video_url: str

class FunnelGenerateRequest(BaseModel):
    partner_id: str
    bio_partner: str = ""
    garanzia: str = ""

class FunnelPublishRequest(BaseModel):
    partner_id: str

class LancioActivateRequest(BaseModel):
    partner_id: str

class LancioGenerateRequest(BaseModel):
    partner_id: str


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def get_partner_or_404(partner_id: str):
    """Helper per recuperare un partner o lanciare 404"""
    if db is None:
        logging.error(f"[PARTNER_JOURNEY] Database non inizializzato per partner_id={partner_id}")
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    logging.info(f"[PARTNER_JOURNEY] Cercando partner con id={partner_id}")
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    
    if not partner:
        # Try numeric ID conversion
        logging.warning(f"[PARTNER_JOURNEY] Partner non trovato con id={partner_id}, provo conversione")
        try:
            partner = await db.partners.find_one({"id": int(partner_id)}, {"_id": 0})
        except ValueError:
            pass
    
    if not partner:
        logging.error(f"[PARTNER_JOURNEY] Partner non trovato: {partner_id}")
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    logging.info(f"[PARTNER_JOURNEY] Partner trovato: {partner.get('name')}")
    return partner

async def get_llm_chat(session_id: str = None, system_message: str = None):
    """Helper per ottenere istanza LLM con Emergent Key"""
    from services.ciak_llm import LlmChat, UserMessage
    import uuid
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM Key non configurata")
    
    if session_id is None:
        session_id = str(uuid.uuid4())
    
    if system_message is None:
        system_message = "Sei un assistente AI professionale per Evolution PRO. Rispondi in italiano."
    
    return LlmChat(api_key=api_key, session_id=session_id, system_message=system_message)

# Import UserMessage for use in LLM calls
try:
    from services.ciak_llm import UserMessage
except ImportError:
    UserMessage = None

async def notify_telegram(message: str):
    """Helper per notifiche Telegram admin"""
    try:
        import httpx
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": message}
                )
    except Exception as e:
        logging.warning(f"Telegram notification failed: {e}")

# ═══════════════════════════════════════════════════════════════════════════════
# POSIZIONAMENTO ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/posizionamento/{partner_id}")
async def get_posizionamento(partner_id: str):
    """Recupera i dati di posizionamento del partner"""
    partner = await get_partner_or_404(partner_id)
    
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    return {
        "success": True,
        "partner_id": partner_id,
        "partner_name": partner.get("name"),
        "posizionamento": posizionamento or {},
        "is_completed": posizionamento.get("completed", False) if posizionamento else False,
        "course_structure": posizionamento.get("course_structure") if posizionamento else None,
        "positioning_output": posizionamento.get("positioning_output") if posizionamento else None
    }

@router.post("/posizionamento/save-step")
async def save_posizionamento_step(request: PosizionamentoSaveRequest):
    """Salva un singolo step del wizard di posizionamento"""
    partner = await get_partner_or_404(request.partner_id)
    
    step_field = f"step_{request.step_number}"
    step_fields_map = {
        1: "studente_ideale",
        2: "obiettivo",
        3: "trasformazione",
        4: "metodo",
        5: "obiezioni"
    }
    
    if request.step_number not in step_fields_map:
        raise HTTPException(status_code=400, detail="Step non valido (1-5)")
    
    field_name = f"step_{request.step_number}_{step_fields_map[request.step_number]}"
    
    # Upsert del documento posizionamento
    result = await db.partner_posizionamento.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                field_name: request.content,
                f"{field_name}_saved_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "partner_id": request.partner_id,
                "partner_name": partner.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "step": request.step_number,
        "field": field_name,
        "message": f"Step {request.step_number} salvato"
    }

@router.post("/posizionamento/save-all")
async def save_posizionamento_all(request: PosizionamentoData):
    """Salva tutti i dati di posizionamento in una volta"""
    partner = await get_partner_or_404(request.partner_id)
    
    posizionamento_data = {
        "partner_id": request.partner_id,
        "partner_name": partner.get("name"),
        "step_1_studente_ideale": request.step_1_studente_ideale,
        "step_2_obiettivo": request.step_2_obiettivo,
        "step_3_trasformazione": request.step_3_trasformazione,
        "step_4_metodo": request.step_4_metodo,
        "step_5_obiezioni": request.step_5_obiezioni,
        "wizard_completed": True,
        "wizard_completed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partner_posizionamento.update_one(
        {"partner_id": request.partner_id},
        {"$set": posizionamento_data, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Posizionamento salvato completamente"
    }

@router.post("/posizionamento/generate-structure")
async def generate_course_structure(request: GenerateCourseStructureRequest):
    """Genera la struttura del corso usando AI basandosi sul posizionamento"""
    partner = await get_partner_or_404(request.partner_id)
    
    # Recupera posizionamento
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    if not posizionamento:
        raise HTTPException(status_code=400, detail="Completa prima il wizard di posizionamento")
    
    # Prepara contesto per AI
    studente = posizionamento.get("step_1_studente_ideale", "")
    obiettivo = posizionamento.get("step_2_obiettivo", "")
    trasformazione = posizionamento.get("step_3_trasformazione", "")
    metodo = posizionamento.get("step_4_metodo", "")
    obiezioni = posizionamento.get("step_5_obiezioni", "")
    
    prompt = f"""Sei Stefania, Growth Planner di Evolution PRO. Devi generare la struttura di un videocorso.

DATI DEL PARTNER:
- Nome: {partner.get('name')}
- Nicchia: {partner.get('niche', 'N/D')}

POSIZIONAMENTO:
1. STUDENTE IDEALE: {studente}
2. OBIETTIVO STUDENTE: {obiettivo}
3. TRASFORMAZIONE: {trasformazione}
4. METODO/FRAMEWORK: {metodo}
5. OBIEZIONI PRINCIPALI: {obiezioni}

Genera una struttura corso con 5 moduli, ognuno con 3 lezioni.
Rispondi SOLO in formato JSON valido con questa struttura esatta:
{{
  "corso_titolo": "Titolo del corso",
  "corso_sottotitolo": "Sottotitolo breve",
  "modules": [
    {{
      "id": 1,
      "title": "Modulo 1 — Titolo",
      "description": "Descrizione breve",
      "lessons": [
        {{"id": "1-1", "title": "Titolo lezione", "duration": "5-8 min"}},
        {{"id": "1-2", "title": "Titolo lezione", "duration": "6-10 min"}},
        {{"id": "1-3", "title": "Titolo lezione", "duration": "5-8 min"}}
      ]
    }}
  ]
}}

La struttura deve seguire una progressione logica che porta lo studente dal problema alla soluzione usando il metodo del partner."""

    try:
        llm = await get_llm_chat()
        
        
        response = await llm.send_message(UserMessage(text=prompt))
        
        # Parse JSON dalla risposta
        import json
        response_text = response.strip()
        
        # Trova il JSON nella risposta
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        
        course_structure = json.loads(response_text)
        
        # Salva la struttura generata
        await db.partner_posizionamento.update_one(
            {"partner_id": request.partner_id},
            {"$set": {
                "course_structure": course_structure,
                "structure_generated_at": datetime.now(timezone.utc).isoformat(),
                "completed": False  # Non ancora approvata
            }}
        )
        
        return {
            "success": True,
            "course_structure": course_structure
        }
        
    except json.JSONDecodeError as e:
        logging.error(f"JSON parse error: {e}, response: {response_text[:500]}")
        raise HTTPException(status_code=500, detail="Errore nel parsing della struttura generata")
    except Exception as e:
        logging.error(f"Course structure generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione struttura: {str(e)}")

@router.post("/posizionamento/approve-structure")
async def approve_course_structure(partner_id: str):
    """Approva la struttura del corso e completa la fase Posizionamento"""
    partner = await get_partner_or_404(partner_id)
    
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    if not posizionamento or not posizionamento.get("course_structure"):
        raise HTTPException(status_code=400, detail="Nessuna struttura da approvare")
    
    # Marca come completato
    await db.partner_posizionamento.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "completed": True,
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Aggiorna fase partner
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "posizionamento_completato": True,
            "posizionamento_completato_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notifica
    await notify_telegram(
        f"✅ POSIZIONAMENTO COMPLETATO\n\n👤 {partner.get('name')}\n📚 Struttura corso approvata"
    )
    
    return {
        "success": True,
        "message": "Struttura approvata! Puoi procedere alla Masterclass."
    }

# ═══════════════════════════════════════════════════════════════════════════════
# FUNNEL LIGHT — Attiva il tuo primo funnel
# ═══════════════════════════════════════════════════════════════════════════════

class FunnelLightRequest(BaseModel):
    partner_id: str


@router.get("/funnel-light/{partner_id}")
async def get_funnel_light(partner_id: str):
    """Recupera il funnel light generato per il partner"""
    await get_partner_or_404(partner_id)

    record = await db.funnel_light.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )

    return {
        "success": True,
        "funnel_light": record if record else None,
    }


@router.post("/funnel-light/generate")
async def generate_funnel_light(request: FunnelLightRequest):
    """Genera il funnel light dai dati del posizionamento"""
    partner = await get_partner_or_404(request.partner_id)

    # Recupera posizionamento
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )

    # Estrai dati posizionamento (wizard o AI-driven)
    nome = partner.get("name", "Partner")
    niche = partner.get("niche", "")
    studente = ""
    obiettivo = ""
    trasformazione = ""
    metodo = ""

    if posizionamento:
        # Prova output AI-driven
        pos_output = posizionamento.get("positioning_output", {})
        if isinstance(pos_output, dict) and pos_output:
            studente = pos_output.get("studente_ideale", pos_output.get("target", ""))
            obiettivo = pos_output.get("obiettivo", pos_output.get("trasformazione", ""))
            trasformazione = pos_output.get("promessa", pos_output.get("big_idea", ""))
            metodo = pos_output.get("metodo", pos_output.get("proposta_unica", ""))
        else:
            # Fallback su wizard classico
            studente = posizionamento.get("step_1_studente_ideale", "")
            obiettivo = posizionamento.get("step_2_obiettivo", "")
            trasformazione = posizionamento.get("step_3_trasformazione", "")
            metodo = posizionamento.get("step_4_metodo", "")

        # Anche i campi AI-driven
        if not studente:
            studente = posizionamento.get("inputs", {}).get("target", "")
        if not obiettivo:
            obiettivo = posizionamento.get("inputs", {}).get("risultato", "")

    # Genera testi template-based (veloce, senza LLM)
    studente_short = studente[:200] if studente else "il tuo studente ideale"
    obiettivo_short = obiettivo[:200] if obiettivo else "raggiungere i propri obiettivi"
    trasformazione_short = trasformazione[:200] if trasformazione else f"il percorso completo di {nome}"

    landing_text = f"""HEADLINE: Webinar Gratuito con {nome}

SOTTOTITOLO: Scopri come {obiettivo_short}

TESTO PRINCIPALE:
Se sei {studente_short} e vuoi ottenere risultati concreti, questo webinar fa per te.

Ti mostrero esattamente:
- Come funziona il mio metodo
- Gli errori piu comuni da evitare
- I primi passi per iniziare subito

PROMESSA: {trasformazione_short}

CTA: Iscriviti gratis al webinar"""

    form_text = f"""CAMPI DEL FORM:
- Nome (obbligatorio)
- Email (obbligatorio)
- Numero di telefono (opzionale)

TESTO SOPRA IL FORM:
Inserisci i tuoi dati per riservare il tuo posto al webinar gratuito con {nome}.

TESTO SOTTO IL FORM:
I tuoi dati sono al sicuro. Riceverai solo le informazioni relative al webinar."""

    thankyou_text = f"""HEADLINE: Perfetto, ci sei!

TESTO:
Grazie per esserti iscritto al webinar con {nome}.

COSA SUCCEDE ORA:
1. Riceverai un'email di conferma con il link per partecipare
2. 24h prima del webinar riceverai un reminder
3. Presentati puntuale per non perdere nulla

NOTA: Controlla anche la cartella spam se non vedi l'email."""

    funnel_data = {
        "partner_id": request.partner_id,
        "landing": landing_text,
        "form": form_text,
        "thankyou": thankyou_text,
        "published": False,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.funnel_light.update_one(
        {"partner_id": request.partner_id},
        {"$set": funnel_data, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

    return {"success": True, "funnel_light": funnel_data}


@router.post("/funnel-light/publish")
async def publish_funnel_light(request: FunnelLightRequest):
    """Pubblica il funnel light — lo rende attivo"""
    partner = await get_partner_or_404(request.partner_id)

    funnel = await db.funnel_light.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )

    if not funnel:
        raise HTTPException(status_code=400, detail="Genera prima il funnel")

    systeme_subdomain = partner.get("systeme_subdomain", "")
    url = f"https://{systeme_subdomain}.systeme.io/webinar-gratuito" if systeme_subdomain else ""

    await db.funnel_light.update_one(
        {"partner_id": request.partner_id},
        {"$set": {
            "published": True,
            "published_at": datetime.now(timezone.utc).isoformat(),
            "url": url,
        }},
    )

    # Notifica
    url_display = url if url else "(subdomain Systeme non ancora configurato)"
    await notify_telegram(
        f"🚀 FUNNEL LIGHT PUBBLICATO\n\n👤 {partner.get('name')}\n🔗 {url_display}"
    )

    return {
        "success": True,
        "message": "Funnel pubblicato!",
        "url": url,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# FUNNEL DISTRIBUTION — Systeme.io Share Link Workflow (Admin)
# ═══════════════════════════════════════════════════════════════════════════════

FUNNEL_TEMPLATES = [
    {
        "id": "webinar-evergreen",
        "name": "Webinar Evergreen",
        "share_link": "https://systeme.io/share/webinar-evergreen",
        "desc": "Landing iscrizione + Thank You + Reminder email + Replay",
        "includes": ["landing_iscrizione", "thank_you", "email_reminder", "replay_page"],
        "default_for": "funnel-light",
    },
    {
        "id": "masterclass-transformation",
        "name": "Masterclass Transformation",
        "share_link": "https://systeme.io/share/masterclass-transformation",
        "desc": "Opt-in + Watch page + Email sequence post-visione",
        "includes": ["opt_in", "watch_page", "email_sequence", "thank_you"],
        "default_for": "masterclass",
    },
    {
        "id": "sales-page-pro",
        "name": "Sales Page PRO",
        "share_link": "https://systeme.io/share/sales-page-pro",
        "desc": "Sales page lunga + Checkout + Upsell + Thank You",
        "includes": ["sales_page", "checkout", "upsell", "thank_you"],
        "default_for": "funnel-vendita",
    },
    {
        "id": "lead-gen-basic",
        "name": "Lead Gen Freebie",
        "share_link": "https://systeme.io/share/lead-gen-basic",
        "desc": "Landing freebie + Thank You + Email nurturing",
        "includes": ["landing", "thank_you", "email_sequence"],
        "default_for": "lead-gen",
    },
]

# Distribution statuses
DIST_STATUSES = ["da_importare", "importato", "personalizzato", "live", "consegnato"]


class FunnelDistributionRequest(BaseModel):
    partner_id: str
    template_id: str
    notes: str = ""


class FunnelDistributionUpdateRequest(BaseModel):
    partner_id: str
    distribution_id: str
    status: str
    live_url: str = ""
    notes: str = ""


@router.get("/funnel-distribution/templates")
async def get_funnel_templates():
    """Lista dei funnel master disponibili con share link"""
    return {"success": True, "templates": FUNNEL_TEMPLATES}


@router.get("/funnel-distribution/all-pending")
async def get_all_pending_distributions():
    """Lista tutte le distribuzioni non ancora consegnate (vista team)"""
    distributions = await db.funnel_distributions.find(
        {"status": {"$ne": "consegnato"}}, {"_id": 0}
    ).sort("assigned_at", -1).to_list(100)

    # Anche quelle consegnate di recente (ultime 20)
    recent_delivered = await db.funnel_distributions.find(
        {"status": "consegnato"}, {"_id": 0}
    ).sort("updated_at", -1).to_list(20)

    # Arricchisce con systeme_subdomain dal profilo partner
    all_dists = distributions + recent_delivered
    partner_ids = list({d["partner_id"] for d in all_dists})
    partners_map = {}
    if partner_ids:
        partner_records = await db.partners.find(
            {"id": {"$in": partner_ids}}, {"id": 1, "systeme_subdomain": 1, "_id": 0}
        ).to_list(200)
        partners_map = {p["id"]: p.get("systeme_subdomain", "") for p in partner_records}

    for d in distributions:
        subdomain = partners_map.get(d["partner_id"], "")
        d["systeme_subdomain"] = subdomain
        if subdomain and not d.get("live_url"):
            d["suggested_url"] = f"https://{subdomain}.systeme.io/webinar-gratuito"

    for d in recent_delivered:
        subdomain = partners_map.get(d["partner_id"], "")
        d["systeme_subdomain"] = subdomain
        if subdomain and not d.get("live_url"):
            d["suggested_url"] = f"https://{subdomain}.systeme.io/webinar-gratuito"

    return {
        "success": True,
        "pending": distributions,
        "delivered": recent_delivered,
        "templates": FUNNEL_TEMPLATES,
    }


@router.get("/funnel-distribution/{partner_id}")
async def get_funnel_distributions(partner_id: str):
    """Recupera tutte le distribuzioni funnel per un partner"""
    await get_partner_or_404(partner_id)

    distributions = await db.funnel_distributions.find(
        {"partner_id": partner_id}, {"_id": 0}
    ).to_list(50)

    return {"success": True, "distributions": distributions}


@router.post("/funnel-distribution/assign")
async def assign_funnel_distribution(request: FunnelDistributionRequest):
    """Assegna un template funnel a un partner (avvia distribuzione)"""
    partner = await get_partner_or_404(request.partner_id)

    template = next((t for t in FUNNEL_TEMPLATES if t["id"] == request.template_id), None)
    if not template:
        raise HTTPException(status_code=400, detail="Template non trovato")

    dist_id = f"{request.partner_id}-{request.template_id}-{int(datetime.now(timezone.utc).timestamp())}"

    subdomain = partner.get("systeme_subdomain", "")
    distribution = {
        "distribution_id": dist_id,
        "partner_id": request.partner_id,
        "partner_name": partner.get("name", ""),
        "template_id": request.template_id,
        "template_name": template["name"],
        "share_link": template["share_link"],
        "status": "da_importare",
        "live_url": "",
        "systeme_subdomain": subdomain,
        "suggested_url": f"https://{subdomain}.systeme.io/webinar-gratuito" if subdomain else "",
        "notes": request.notes,
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "history": [
            {
                "status": "da_importare",
                "at": datetime.now(timezone.utc).isoformat(),
                "note": f"Template '{template['name']}' assegnato",
            }
        ],
    }

    await db.funnel_distributions.insert_one(distribution)

    await notify_telegram(
        f"📦 FUNNEL ASSEGNATO\n\n👤 {partner.get('name')}\n📋 {template['name']}\n🔗 {template['share_link']}\n\nImportare nel sub-account del partner."
    )

    # Remove _id before returning
    distribution.pop("_id", None)
    return {"success": True, "distribution": distribution}


@router.post("/funnel-distribution/update-status")
async def update_funnel_distribution(request: FunnelDistributionUpdateRequest):
    """Aggiorna lo stato di una distribuzione funnel"""
    await get_partner_or_404(request.partner_id)

    update_data = {
        "status": request.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if request.live_url:
        update_data["live_url"] = request.live_url
    if request.notes:
        update_data["notes"] = request.notes

    history_entry = {
        "status": request.status,
        "at": datetime.now(timezone.utc).isoformat(),
        "note": request.notes or f"Stato aggiornato a {request.status}",
    }

    result = await db.funnel_distributions.update_one(
        {"distribution_id": request.distribution_id, "partner_id": request.partner_id},
        {
            "$set": update_data,
            "$push": {"history": history_entry},
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Distribuzione non trovata")

    # Se consegnato, aggiorna anche il funnel_light con l'URL live
    if request.status == "consegnato" and request.live_url:
        await db.funnel_light.update_one(
            {"partner_id": request.partner_id},
            {"$set": {
                "published": True,
                "url": request.live_url,
                "published_at": datetime.now(timezone.utc).isoformat(),
                "systeme_url": request.live_url,
            }},
            upsert=True,
        )

    return {"success": True, "message": f"Stato aggiornato a {request.status}"}







@router.post("/posizionamento/save-inputs")
async def save_posizionamento_inputs(request: PosizionamentoInputs):
    """Salva i 7 input del partner per il posizionamento AI-driven"""
    partner = await get_partner_or_404(request.partner_id)

    await db.partner_posizionamento.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "inputs": {
                    "competenza": request.competenza,
                    "target": request.target,
                    "problema_cliente": request.problema_cliente,
                    "risultato": request.risultato,
                    "differenziazione": request.differenziazione,
                    "esperienza": request.esperienza,
                    "esclusioni": request.esclusioni,
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "partner_id": request.partner_id,
                "partner_name": partner.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )

    return {"success": True, "message": "Input salvati"}


@router.post("/posizionamento/generate-positioning")
async def generate_positioning(request: GenerateCourseStructureRequest):
    """Genera il posizionamento usando AI basandosi sui 7 input del partner"""
    partner = await get_partner_or_404(request.partner_id)

    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )

    if not posizionamento or not posizionamento.get("inputs"):
        raise HTTPException(status_code=400, detail="Completa prima le domande")

    inputs = posizionamento.get("inputs", {})

    prompt = f"""Sei un esperto di business strategy e posizionamento per accademie digitali.
Genera un documento di posizionamento professionale basato sugli input del partner.

PARTNER: {partner.get('name')}

INPUT DEL PARTNER:
1. IN COSA È COMPETENTE: {inputs.get('competenza', 'N/D')}
2. CHI VUOLE AIUTARE (TARGET): {inputs.get('target', 'N/D')}
3. PROBLEMA PRINCIPALE DEL CLIENTE: {inputs.get('problema_cliente', 'N/D')}
4. RISULTATO CHE VUOLE FAR OTTENERE: {inputs.get('risultato', 'N/D')}
5. COSA LO RENDE DIVERSO: {inputs.get('differenziazione', 'N/D')}
6. ESPERIENZA E RISULTATI: {inputs.get('esperienza', 'N/D')}
7. COSA NON VUOLE FARE: {inputs.get('esclusioni', 'N/D')}

Genera un posizionamento strutturato in formato JSON con questa struttura esatta:
{{
  "sintesi_progetto": "Un paragrafo chiaro (3-4 frasi) che riassume il progetto e la sua proposta di valore unica",
  "target_ideale": "Descrizione dettagliata e specifica del cliente ideale (chi è, cosa fa, quali sfide ha)",
  "problema_principale": "Il problema principale che il target affronta e perché è urgente risolverlo",
  "risultato_promesso": "Il risultato concreto e misurabile che il partner promette di far ottenere",
  "differenziazione": "Cosa rende unico questo progetto rispetto alla concorrenza e perché il partner è la persona giusta",
  "posizionamento_finale": "Aiuto [target specifico] a [risultato concreto] anche se [problema/obiezione principale]"
}}

REGOLE:
- Il posizionamento_finale DEVE seguire ESATTAMENTE il formato: Aiuto [target] a [risultato] anche se [problema]
- Ogni sezione deve essere chiara, concisa e professionale (2-4 frasi)
- Usa un linguaggio diretto e orientato ai risultati
- Non usare gergo tecnico
- Rispondi SOLO con il JSON, senza altro testo"""

    try:
        llm = await get_llm_chat()
        response = await llm.send_message(UserMessage(text=prompt))
        response_text = response.strip()

        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()

        positioning_output = json.loads(response_text)

        await db.partner_posizionamento.update_one(
            {"partner_id": request.partner_id},
            {"$set": {
                "positioning_output": positioning_output,
                "positioning_generated": True,
                "positioning_generated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        return {
            "success": True,
            "positioning_output": positioning_output
        }

    except json.JSONDecodeError as e:
        logging.error(f"JSON parse error in positioning: {e}, response: {response_text[:500]}")
        raise HTTPException(status_code=500, detail="Errore nel parsing del posizionamento generato")
    except Exception as e:
        logging.error(f"Positioning generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione posizionamento: {str(e)}")


@router.post("/posizionamento/approve-positioning")
async def approve_positioning(partner_id: str):
    """Approva il posizionamento generato e completa la fase"""
    partner = await get_partner_or_404(partner_id)

    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )

    if not posizionamento or not posizionamento.get("positioning_output"):
        raise HTTPException(status_code=400, detail="Nessun posizionamento da approvare")

    await db.partner_posizionamento.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "completed": True,
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "posizionamento_completato": True,
            "posizionamento_completato_at": datetime.now(timezone.utc).isoformat(),
            "phase": "F2",
        }}
    )

    await notify_telegram(
        f"✅ POSIZIONAMENTO COMPLETATO\n\n👤 {partner.get('name')}\n📋 Posizionamento approvato dal partner — fase avanzata a F2"
    )

    return {
        "success": True,
        "message": "Posizionamento approvato! Puoi procedere al Funnel Light."
    }

# ═══════════════════════════════════════════════════════════════════════════════
# MASTERCLASS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

# IMPORTANTE: Endpoint GET specifici DEVONO essere definiti PRIMA di /{partner_id}
# altrimenti FastAPI matcha tutto come partner_id

@router.get("/masterclass/genera")
async def generate_masterclass_script_get(partner_id: str):
    """Alias GET per generare script masterclass (retrocompatibilità con il brief)"""
    request = MasterclassGenerateRequest(partner_id=partner_id)
    return await generate_masterclass_script(request)


@router.post("/masterclass/genera")
async def generate_masterclass_script_post(request: MasterclassGenerateRequest):
    """POST per generare script masterclass"""
    return await generate_masterclass_script(request)


@router.get("/masterclass/{partner_id}")
async def get_masterclass(partner_id: str):
    """Recupera i dati della masterclass del partner"""
    partner = await get_partner_or_404(partner_id)
    
    masterclass = await db.partner_masterclass.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    return {
        "success": True,
        "partner_id": partner_id,
        "masterclass": masterclass or {},
        "script_completed": masterclass.get("script_completed", False) if masterclass else False,
        "video_uploaded": masterclass.get("video_uploaded", False) if masterclass else False,
        "video_approved": masterclass.get("video_approved", False) if masterclass else False
    }

@router.post("/masterclass/save-blocks")
async def save_masterclass_blocks(request: MasterclassSaveRequest):
    """Salva i blocchi dello script della masterclass"""
    partner = await get_partner_or_404(request.partner_id)
    
    blocks_data = {block.block_id: {"title": block.title, "content": block.content} for block in request.blocks}
    
    await db.partner_masterclass.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "script_blocks": blocks_data,
                "script_updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "partner_id": request.partner_id,
                "partner_name": partner.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Script salvato"}


@router.post("/masterclass/generate-script")
async def generate_masterclass_script(request: MasterclassGenerateRequest):
    """Genera lo script completo della masterclass usando AI"""
    partner = await get_partner_or_404(request.partner_id)
    
    # Recupera posizionamento
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    # Recupera blocchi esistenti
    masterclass = await db.partner_masterclass.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    blocks = masterclass.get("script_blocks", {}) if masterclass else {}
    
    prompt = f"""Sei Stefania, Copy Strategist di Evolution PRO. Devi generare uno script completo per una masterclass gratuita.

PARTNER: {partner.get('name')}
NICCHIA: {partner.get('niche', 'N/D')}

POSIZIONAMENTO:
- Studente ideale: {posizionamento.get('step_1_studente_ideale', 'N/D') if posizionamento else 'N/D'}
- Obiettivo: {posizionamento.get('step_2_obiettivo', 'N/D') if posizionamento else 'N/D'}
- Trasformazione: {posizionamento.get('step_3_trasformazione', 'N/D') if posizionamento else 'N/D'}
- Metodo: {posizionamento.get('step_4_metodo', 'N/D') if posizionamento else 'N/D'}

BLOCCHI INSERITI DAL PARTNER:
{json.dumps(blocks, ensure_ascii=False, indent=2) if blocks else 'Nessun blocco inserito'}

Genera uno script completo per una masterclass di 30-40 minuti.
Lo script deve includere questi 5 blocchi:
1. INTRO + STORIA - Presentazione e storia personale
2. IL PROBLEMA DEL PUBBLICO - Descrizione del problema principale
3. IL METODO - Presentazione del framework/metodo
4. CASO STUDIO - Un esempio di successo
5. INVITO AL CORSO - Call to action per il corso completo

Rispondi in formato JSON:
{{
  "masterclass_title": "Titolo della masterclass",
  "duration": "35-40 minuti",
  "script_blocks": [
    {{
      "id": 1,
      "title": "Intro + Storia",
      "content": "Script completo del blocco...",
      "speaking_time": "5-7 minuti"
    }}
  ]
}}"""

    try:
        llm = await get_llm_chat()
        
        import json
        
        response = await llm.send_message(UserMessage(text=prompt))
        response_text = response.strip()
        
        # Parse JSON
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        
        generated_script = json.loads(response_text)
        
        # Salva
        await db.partner_masterclass.update_one(
            {"partner_id": request.partner_id},
            {"$set": {
                "generated_script": generated_script,
                "script_generated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "script": generated_script
        }
        
    except Exception as e:
        logging.error(f"Masterclass script generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione script: {str(e)}")

@router.post("/masterclass/approve-script")
async def approve_masterclass_script(partner_id: str):
    """Approva lo script della masterclass"""
    partner = await get_partner_or_404(partner_id)
    
    await db.partner_masterclass.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "script_completed": True,
            "script_approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Script approvato"}

@router.post("/masterclass/upload-video")
async def upload_masterclass_video(
    file: UploadFile = File(...),
    partner_id: str = Form(...)
):
    """Carica il video della masterclass"""
    partner = await get_partner_or_404(partner_id)
    
    # Directory upload
    upload_dir = Path("/app/backend/uploads/masterclass")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Salva file
    ext = Path(file.filename).suffix
    stored_name = f"{partner_id}_masterclass_{uuid.uuid4().hex[:8]}{ext}"
    file_path = upload_dir / stored_name
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Aggiorna database
    await db.partner_masterclass.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "video_uploaded": True,
            "video_file": stored_name,
            "video_path": str(file_path),
            "video_original_name": file.filename,
            "video_size": len(content),
            "video_uploaded_at": datetime.now(timezone.utc).isoformat(),
            "video_status": "uploaded"  # uploaded -> in_review -> approved
        }},
        upsert=True
    )
    
    # Notifica
    await notify_telegram(
        f"🎬 VIDEO MASTERCLASS CARICATO\n\n👤 {partner.get('name')}\n📁 {file.filename}\n📊 {len(content) / 1024 / 1024:.1f} MB"
    )
    
    return {
        "success": True,
        "message": "Video masterclass caricato",
        "video_file": stored_name
    }

# ═══════════════════════════════════════════════════════════════════════════════
# VIDEOCORSO ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/videocorso/{partner_id}")
async def get_videocorso(partner_id: str):
    """Recupera lo stato del videocorso del partner"""
    partner = await get_partner_or_404(partner_id)
    
    # Recupera struttura corso da posizionamento
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    course_structure = posizionamento.get("course_structure") if posizionamento else None
    
    # Recupera stato lezioni
    videocorso = await db.partner_videocorso.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    return {
        "success": True,
        "partner_id": partner_id,
        "course_structure": course_structure,
        "lessons_status": videocorso.get("lessons", {}) if videocorso else {},
        "is_completed": videocorso.get("completed", False) if videocorso else False,
        "inputs": videocorso.get("inputs") if videocorso else None,
        "course_data": videocorso.get("course_data") if videocorso else None,
        "course_generated": videocorso.get("course_generated", False) if videocorso else False,
        "course_approved": videocorso.get("course_approved", False) if videocorso else False,
    }

@router.post("/videocorso/upload-lesson")
async def upload_videocorso_lesson(
    file: UploadFile = File(...),
    partner_id: str = Form(...),
    module_id: str = Form(...),
    lesson_id: str = Form(...)
):
    """Carica un video di una lezione del corso"""
    partner = await get_partner_or_404(partner_id)
    
    # Directory upload
    upload_dir = Path("/app/backend/uploads/videocorso") / partner_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Salva file
    ext = Path(file.filename).suffix
    stored_name = f"{lesson_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = upload_dir / stored_name
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Aggiorna stato lezione
    lesson_key = f"lessons.{lesson_id}"
    await db.partner_videocorso.update_one(
        {"partner_id": partner_id},
        {
            "$set": {
                lesson_key: {
                    "status": "uploaded",
                    "video_file": stored_name,
                    "video_path": str(file_path),
                    "original_name": file.filename,
                    "size": len(content),
                    "uploaded_at": datetime.now(timezone.utc).isoformat(),
                    "module_id": module_id
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "partner_id": partner_id,
                "partner_name": partner.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "lesson_id": lesson_id,
        "message": f"Video lezione {lesson_id} caricato"
    }

@router.post("/videocorso/approve-lesson")
async def approve_videocorso_lesson(partner_id: str, lesson_id: str):
    """Approva una lezione del videocorso (admin)"""
    partner = await get_partner_or_404(partner_id)
    
    lesson_key = f"lessons.{lesson_id}.status"
    await db.partner_videocorso.update_one(
        {"partner_id": partner_id},
        {"$set": {
            lesson_key: "approved",
            f"lessons.{lesson_id}.approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Recupera dati lezione
    vc_doc = await db.partner_videocorso.find_one({"partner_id": partner_id})
    lesson = (vc_doc or {}).get("lessons", {}).get(lesson_id, {})
    youtube_url = lesson.get("video_youtube_url", "")
    youtube_id = lesson.get("video_youtube_id", "") or (youtube_url.split("v=")[-1] if "v=" in youtube_url else "")
    lesson_title = lesson.get("title", f"Lezione {lesson_id}")

    # Pubblica su Systeme.io se configurato
    systeme_course_id = partner.get("systeme_course_id")
    systeme_cookie = partner.get("systeme_session_cookie") or os.environ.get("SYSTEME_SESSION_COOKIE_DEFAULT")
    if systeme_course_id and systeme_cookie and youtube_id:
        try:
            from video_pipeline_task import systeme_publish_lesson
            parts = lesson_id.split("_")
            mod_num = parts[0].replace("m", "") if parts else "1"
            course_data = (vc_doc or {}).get("course_data", {})
            moduli = course_data.get("moduli", [])
            module_title = f"Capitolo {mod_num}"
            for mod in moduli:
                if str(mod.get("numero")) == mod_num:
                    module_title = mod.get("titolo", module_title)
                    break
            await systeme_publish_lesson(partner_id=partner_id, lesson_title=lesson_title, lesson_description=lesson.get("description",""), youtube_url=youtube_url, youtube_id=youtube_id, module_title=module_title, course_id=int(systeme_course_id), systeme_session_cookie=systeme_cookie)
            logging.info(f"[SYSTEME] Lezione {lesson_id} pubblicata")
        except Exception as se:
            logging.warning(f"[SYSTEME] Pubblicazione lezione fallita: {se}")

    return {"success": True, "message": f"Lezione {lesson_id} approvata e pubblicata su Systeme.io"}

@router.post("/videocorso/complete")
async def complete_videocorso(partner_id: str):
    """Marca il videocorso come completato"""
    partner = await get_partner_or_404(partner_id)
    
    await db.partner_videocorso.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "completed": True,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "videocorso_completato": True,
            "videocorso_completato_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await notify_telegram(
        f"📹 VIDEOCORSO COMPLETATO\n\n👤 {partner.get('name')}\n✅ Tutte le lezioni caricate"
    )
    
    return {"success": True, "message": "Videocorso completato"}


# ═══════════════════════════════════════════════════════════════════════════════
# VIDEO PIPELINE — SUBMIT LINK + STATUS + APPROVE
# ═══════════════════════════════════════════════════════════════════════════════

class VideoLinkRequest(BaseModel):
    partner_id: str
    video_url: str
    lesson_id: Optional[str] = None  # solo per videocorso


@router.post("/masterclass/submit-video-link")
async def submit_masterclass_video_link(req: VideoLinkRequest, background_tasks: BackgroundTasks):
    """Partner invia link Drive/WeTransfer del video masterclass grezzo"""
    await get_partner_or_404(req.partner_id)

    await db.masterclass_factory.update_one(
        {"partner_id": req.partner_id},
        {"$set": {
            "video_raw_url": req.video_url,
            "video_pipeline_status": "queued",
            "video_pipeline_error": None,
            "video_submitted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    # Usa Celery (task in Redis) invece di FastAPI BackgroundTasks:
    # i task Celery sopravvivono allo scale-down di Cloud Run perché
    # sono persistiti nel broker Redis prima di essere eseguiti.
    try:
        from video_pipeline_task import process_partner_video
        process_partner_video.delay(
            partner_id=req.partner_id,
            video_url=req.video_url,
            video_type="masterclass",
        )
    except Exception:
        # Fallback a BackgroundTasks se Celery non è disponibile
        from video_pipeline_task import run_pipeline_background
        background_tasks.add_task(
            run_pipeline_background,
            partner_id=req.partner_id,
            video_url=req.video_url,
            video_type="masterclass",
        )

    return {"success": True, "message": "Video in elaborazione. Ti notificheremo quando è pronto."}


class SetLessonYoutubeUrlRequest(BaseModel):
    partner_id: str
    lesson_id: str
    youtube_url: str
    youtube_id: Optional[str] = None


@router.post("/videocorso/set-lesson-youtube-url")
async def set_lesson_youtube_url(req: SetLessonYoutubeUrlRequest):
    """Admin imposta manualmente l'URL YouTube di una lezione del videocorso
    (bypass pipeline, usato dopo editing manuale del video).
    Aggiunge il video alla playlist partner e imposta status=ready_for_review.
    """
    import asyncio
    partner = await get_partner_or_404(req.partner_id)

    yt_id = req.youtube_id
    if not yt_id and "v=" in req.youtube_url:
        yt_id = req.youtube_url.split("v=")[-1].split("&")[0]
    elif not yt_id and "youtu.be/" in req.youtube_url:
        yt_id = req.youtube_url.split("youtu.be/")[-1].split("?")[0]

    embed_url = f"https://www.youtube.com/embed/{yt_id}" if yt_id else ""
    systeme_embed = f'<iframe src="{embed_url}" width="560" height="315" frameborder="0" allowfullscreen></iframe>' if yt_id else ""
    now = datetime.now(timezone.utc).isoformat()

    # NB: il video NON entra nella playlist qui. L'aggiunta avviene solo
    # all'approvazione admin (approve_videocorso_video), cosi' la playlist
    # contiene solo video approvati.
    playlist_note = ""

    # Aggiorna la singola lezione
    lk = f"lessons.{req.lesson_id}"
    await db.partner_videocorso.update_one(
        {"partner_id": req.partner_id},
        {"$set": {
            f"{lk}.video_youtube_url": req.youtube_url,
            f"{lk}.video_youtube_id": yt_id,
            f"{lk}.video_embed_url": embed_url,
            f"{lk}.video_systeme_embed": systeme_embed,
            f"{lk}.pipeline_status": "ready_for_review",
            f"{lk}.status": "ready_for_review",
            f"{lk}.video_approved": False,
            f"{lk}.pipeline_completed_at": now,
            "updated_at": now,
        }},
        upsert=True
    )

    await notify_telegram(
        f"📺 <b>YouTube URL lezione videocorso impostato manualmente</b>\n"
        f"👤 {partner.get('name', req.partner_id)} — Lezione {req.lesson_id}\n"
        f"🔗 {req.youtube_url}{playlist_note}"
    )

    return {
        "success": True,
        "message": "URL YouTube lezione impostato — pronto per approvazione",
        "lesson_id": req.lesson_id,
        "youtube_id": yt_id,
        "playlist_id": playlist_id,
    }


@router.post("/videocorso/submit-video-link")
async def submit_videocorso_video_link(req: VideoLinkRequest, background_tasks: BackgroundTasks):
    """Partner invia link Drive/WeTransfer per una lezione del videocorso"""
    if not req.lesson_id:
        raise HTTPException(status_code=400, detail="lesson_id obbligatorio per videocorso")
    await get_partner_or_404(req.partner_id)

    lk = f"lessons.{req.lesson_id}"
    await db.partner_videocorso.update_one(
        {"partner_id": req.partner_id},
        {"$set": {
            f"{lk}.video_raw_url": req.video_url,
            f"{lk}.pipeline_status": "queued",
            f"{lk}.status": "queued",
            f"{lk}.video_submitted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    try:
        from video_pipeline_task import process_partner_video
        process_partner_video.delay(
            partner_id=req.partner_id,
            video_url=req.video_url,
            video_type="videocorso",
            lesson_id=req.lesson_id,
        )
    except Exception:
        from video_pipeline_task import run_pipeline_background
        background_tasks.add_task(
            run_pipeline_background,
            partner_id=req.partner_id,
            video_url=req.video_url,
            video_type="videocorso",
            lesson_id=req.lesson_id,
        )

    return {"success": True, "message": f"Lezione {req.lesson_id} in elaborazione."}


@router.get("/masterclass/video-status/{partner_id}")
async def get_masterclass_video_status(partner_id: str):
    """Stato pipeline video masterclass"""
    await get_partner_or_404(partner_id)
    doc = await db.masterclass_factory.find_one({"partner_id": partner_id}, {"_id": 0})
    if not doc:
        return {"success": True, "pipeline_status": None}
    return {
        "success": True,
        "pipeline_status": doc.get("video_pipeline_status"),
        "pipeline_error": doc.get("video_pipeline_error"),
        "video_raw_url": doc.get("video_raw_url"),
        "video_youtube_url": doc.get("video_youtube_url"),
        "video_youtube_id": doc.get("video_youtube_id"),
        "video_embed_url": doc.get("video_embed_url"),
        "video_systeme_embed": doc.get("video_systeme_embed"),
        "video_approved": doc.get("video_approved", False),
        "video_raw_duration_s": doc.get("video_raw_duration_s"),
        "video_final_duration_s": doc.get("video_final_duration_s"),
        "video_time_saved_s": doc.get("video_time_saved_s"),
        "video_filler_report": doc.get("video_filler_report"),
        "pipeline_completed_at": doc.get("pipeline_completed_at"),
        "video_submitted_at": doc.get("video_submitted_at"),
        # Diagnostica Shotstack ENHANCE — popolato dalla pipeline solo in caso di errore enhance.
        # Se popolato, il video YouTube è stato uploadato senza intro/musica/zoom/overlay/outro.
        "video_enhance_error": doc.get("video_enhance_error"),
        "video_enhance_failed_at": doc.get("video_enhance_failed_at"),
        "video_enhance_ok_at": doc.get("video_enhance_ok_at"),
    }


@router.post("/masterclass/approve-video")
async def approve_masterclass_video(partner_id: str):
    """Admin approva il video masterclass pulito"""
    await get_partner_or_404(partner_id)
    doc = await db.masterclass_factory.find_one({"partner_id": partner_id})
    if not doc or doc.get("video_pipeline_status") != "ready_for_review":
        raise HTTPException(status_code=400, detail="Nessun video pronto per approvazione")

    await db.masterclass_factory.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "video_approved": True,
            "video_pipeline_status": "approved",
            "video_approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {"masterclass_video_approved": True}}
    )

    partner = await db.partners.find_one({"id": partner_id})

    # Aggiungi alla playlist YouTube del partner SOLO ora (approvazione admin):
    # la playlist contiene solo video approvati, mai gli scarti in review.
    playlist_note = ""
    yt_id = doc.get("video_youtube_id")
    if yt_id:
        try:
            import asyncio
            from video_pipeline_task import create_youtube_playlist_sync, add_to_youtube_playlist_sync
            loop = asyncio.get_event_loop()
            playlist_id = (partner or {}).get("youtube_playlist_id")
            if not playlist_id:
                playlist_id = await loop.run_in_executor(
                    None, create_youtube_playlist_sync, (partner or {}).get("name", partner_id)
                )
                if playlist_id:
                    await db.partners.update_one(
                        {"id": partner_id},
                        {"$set": {
                            "youtube_playlist_id": playlist_id,
                            "youtube_playlist_url": f"https://www.youtube.com/playlist?list={playlist_id}",
                        }},
                    )
            if playlist_id:
                ok = await loop.run_in_executor(None, add_to_youtube_playlist_sync, yt_id, playlist_id)
                playlist_note = "\n📋 Aggiunto a playlist partner" if ok else ""
        except Exception as e:
            logging.warning(f"[MASTERCLASS] Playlist add (approve) non bloccante: {e}")

    await notify_telegram(
        f"✅ VIDEO MASTERCLASS APPROVATO\n\n"
        f"👤 {partner.get('name', partner_id)}\n"
        f"📺 {doc.get('video_youtube_url', 'N/A')}{playlist_note}"
    )

    return {"success": True, "message": "Video approvato"}


@router.post("/masterclass/reset-pipeline")
async def reset_masterclass_pipeline(partner_id: str):
    """Admin resetta una pipeline bloccata (stuck in downloading/cleaning/etc.)"""
    await get_partner_or_404(partner_id)
    await db.masterclass_factory.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "video_pipeline_status": None,
            "video_pipeline_error": "Reset manuale admin",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True, "message": "Pipeline resettata — il partner può ricaricare il link"}


@router.post("/masterclass/reject-video")
async def reject_masterclass_video(partner_id: str, reason: Optional[str] = None):
    """Admin rigetta il video editato (qualità non accettabile) e ri-triggera la pipeline.

    Pulisce i campi YouTube/embed cosicché la nuova esecuzione parta pulita,
    archivia l'ID YouTube rigettato in `video_rejected_youtube_ids` per audit
    e ri-accoda la pipeline con `video_raw_url` originale.

    Risponde con il task_id Celery e l'ID YouTube vecchio (utile per cancellazione manuale
    su YouTube se l'admin vuole rimuovere l'unlisted obsoleto).
    """
    partner = await get_partner_or_404(partner_id)

    mc = await db.masterclass_factory.find_one({"partner_id": partner_id})
    if not mc:
        raise HTTPException(status_code=404, detail="Nessun record masterclass")
    raw_url = mc.get("video_raw_url")
    if not raw_url:
        raise HTTPException(status_code=400, detail="Nessun video_raw_url su cui ripartire")

    rejected_id = mc.get("video_youtube_id")
    rejected_url = mc.get("video_youtube_url")
    # Elimina il video rifiutato da YouTube (decisione: niente scarti sul canale).
    if rejected_id:
        try:
            import asyncio
            from video_pipeline_task import delete_youtube_video_sync
            loop = asyncio.get_event_loop()
            _ok = await loop.run_in_executor(None, delete_youtube_video_sync, rejected_id)
            logging.info(f"[MASTERCLASS] reject: delete YouTube {rejected_id} -> {_ok}")
        except Exception as e:
            logging.warning(f"[MASTERCLASS] reject: delete YouTube fallito: {e}")
    rejected_history = list(mc.get("video_rejected_youtube_ids") or [])
    if rejected_id:
        rejected_history.append({
            "youtube_id": rejected_id,
            "youtube_url": rejected_url,
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "reason": (reason or "").strip() or None,
        })

    await db.masterclass_factory.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "video_pipeline_status": "queued",
            "video_pipeline_error": None,
            "video_youtube_url": None,
            "video_youtube_id": None,
            "video_embed_url": None,
            "video_systeme_embed": None,
            "video_rejected_youtube_ids": rejected_history,
            "video_last_reject_reason": (reason or "").strip() or None,
            "video_last_reject_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    # Ri-accoda la pipeline. Import locale per evitare circular imports.
    task_id = None
    try:
        from video_pipeline_task import process_partner_video
        task = process_partner_video.delay(
            partner_id=partner_id,
            video_url=raw_url,
            video_type="masterclass",
            lesson_id=None,
        )
        task_id = task.id if task else None
    except Exception as e:
        # Se Celery è giù, manteniamo lo status "queued" — il prossimo retrigger lo prenderà
        return {
            "success": False,
            "message": f"Reject applicato ma retrigger fallito: {e}",
            "rejected_youtube_id": rejected_id,
        }

    return {
        "success": True,
        "message": "Video rigettato — pipeline ri-accodata. Nuovo render in arrivo.",
        "rejected_youtube_id": rejected_id,
        "rejected_youtube_url": rejected_url,
        "task_id": task_id,
    }


class SetYoutubeUrlRequest(BaseModel):
    partner_id: str
    youtube_url: str
    youtube_id: Optional[str] = None


@router.post("/masterclass/set-youtube-url")
async def set_masterclass_youtube_url(req: SetYoutubeUrlRequest):
    """Admin imposta manualmente l'URL YouTube della masterclass (bypass pipeline automatica).
    Crea automaticamente la playlist partner su YouTube se non esiste e aggiunge il video."""
    import asyncio
    partner = await get_partner_or_404(req.partner_id)

    yt_id = req.youtube_id
    if not yt_id and "v=" in req.youtube_url:
        yt_id = req.youtube_url.split("v=")[-1].split("&")[0]
    elif not yt_id and "youtu.be/" in req.youtube_url:
        yt_id = req.youtube_url.split("youtu.be/")[-1].split("?")[0]

    embed_url = f"https://www.youtube.com/embed/{yt_id}" if yt_id else ""
    systeme_embed = f'<iframe src="{embed_url}" width="560" height="315" frameborder="0" allowfullscreen></iframe>' if yt_id else ""
    now = datetime.now(timezone.utc).isoformat()
    partner_name = partner.get("name", req.partner_id)

    # Playlist YouTube: crea se non esiste, poi aggiungi il video
    playlist_id = partner.get("youtube_playlist_id")
    playlist_url = partner.get("youtube_playlist_url")
    playlist_note = ""

    if yt_id:
        try:
            from video_pipeline_task import create_youtube_playlist_sync, add_to_youtube_playlist_sync
            loop = asyncio.get_event_loop()

            if not playlist_id:
                playlist_id = await loop.run_in_executor(
                    None, create_youtube_playlist_sync, partner_name
                )
                if playlist_id:
                    playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"
                    await db.partners.update_one(
                        {"id": req.partner_id},
                        {"$set": {"youtube_playlist_id": playlist_id, "youtube_playlist_url": playlist_url}}
                    )
                    playlist_note = f"\n📋 Playlist creata: {playlist_url}"

            if playlist_id:
                ok = await loop.run_in_executor(
                    None, add_to_youtube_playlist_sync, yt_id, playlist_id
                )
                if ok and not playlist_note:
                    playlist_note = f"\n📋 Video aggiunto alla playlist partner"
        except Exception as e:
            logging.warning(f"[MASTERCLASS] Playlist error (non bloccante): {e}")

    await db.masterclass_factory.update_one(
        {"partner_id": req.partner_id},
        {"$set": {
            "video_youtube_url": req.youtube_url,
            "video_youtube_id": yt_id,
            "video_embed_url": embed_url,
            "video_systeme_embed": systeme_embed,
            "video_pipeline_status": "ready_for_review",
            "video_approved": False,
            "pipeline_completed_at": now,
            "updated_at": now
        }},
        upsert=True
    )

    await notify_telegram(
        f"📺 <b>YouTube URL masterclass impostato manualmente</b>\n"
        f"👤 {partner_name}\n"
        f"🔗 {req.youtube_url}{playlist_note}"
    )

    return {
        "success": True,
        "message": "URL YouTube impostato — pronto per approvazione admin",
        "playlist_url": playlist_url
    }


@router.post("/videocorso/approve-video")
async def approve_videocorso_video(partner_id: str, lesson_id: str):
    """Admin approva il video di una lezione del videocorso"""
    await get_partner_or_404(partner_id)

    lk = f"lessons.{lesson_id}"
    await db.partner_videocorso.update_one(
        {"partner_id": partner_id},
        {"$set": {
            f"{lk}.video_approved": True,
            f"{lk}.pipeline_status": "approved",
            f"{lk}.status": "approved",
            f"{lk}.video_approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    # Aggiungi alla playlist YouTube del partner SOLO ora (approvazione admin).
    try:
        import asyncio
        partner = await db.partners.find_one({"id": partner_id})
        vc = await db.partner_videocorso.find_one({"partner_id": partner_id})
        lesson = ((vc or {}).get("lessons") or {}).get(lesson_id, {})
        yt_id = lesson.get("video_youtube_id") or ""
        if yt_id:
            from video_pipeline_task import create_youtube_playlist_sync, add_to_youtube_playlist_sync
            loop = asyncio.get_event_loop()
            playlist_id = (partner or {}).get("youtube_playlist_id")
            if not playlist_id:
                playlist_id = await loop.run_in_executor(
                    None, create_youtube_playlist_sync, (partner or {}).get("name", partner_id)
                )
                if playlist_id:
                    await db.partners.update_one(
                        {"id": partner_id},
                        {"$set": {
                            "youtube_playlist_id": playlist_id,
                            "youtube_playlist_url": f"https://www.youtube.com/playlist?list={playlist_id}",
                        }},
                    )
            if playlist_id:
                await loop.run_in_executor(None, add_to_youtube_playlist_sync, yt_id, playlist_id)
    except Exception as e:
        logging.warning(f"[VIDEOCORSO] Playlist add (approve) non bloccante: {e}")

    return {"success": True, "message": f"Lezione {lesson_id} approvata"}


# ═══════════════════════════════════════════════════════════════════════════════
# VIDEOCORSO AI-DRIVEN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/videocorso/save-inputs")
async def save_videocorso_inputs(request: VideocorsoInputs):
    """Salva le preferenze del partner per la generazione del videocorso"""
    partner = await get_partner_or_404(request.partner_id)

    await db.partner_videocorso.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "inputs": {
                    "durata": request.durata,
                    "include_bonus": request.include_bonus,
                    "contenuti_pronti": request.contenuti_pronti,
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "partner_id": request.partner_id,
                "partner_name": partner.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )

    return {"success": True, "message": "Preferenze salvate"}


@router.post("/videocorso/generate-course")
async def generate_videocorso_ai(request: VideocorsoInputs):
    """Genera la struttura completa del videocorso usando AI, basandosi su posizionamento e masterclass"""
    partner = await get_partner_or_404(request.partner_id)

    # Leggi dati posizionamento
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    positioning_output = posizionamento.get("positioning_output", {}) if posizionamento else {}

    # Leggi dati masterclass
    masterclass = await db.masterclass_factory.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    masterclass_answers = masterclass.get("answers", {}) if masterclass else {}

    durata_rules = {
        "breve": "Genera ESATTAMENTE 3 moduli con 3 lezioni ciascuno. Corso compatto e veloce.",
        "medio": "Genera ESATTAMENTE 4 moduli con 4 lezioni ciascuno. Corso bilanciato.",
        "avanzato": "Genera ESATTAMENTE 5 moduli con 5 lezioni ciascuno. Corso completo e approfondito."
    }
    durata_rule = durata_rules.get(request.durata, durata_rules["medio"])

    prompt = f"""Sei un esperto di formazione digitale e corsi online.
Genera la struttura completa di un videocorso vendibile in italiano.

POSIZIONAMENTO DEL PARTNER ({partner.get('name')}):
- Sintesi progetto: {positioning_output.get('sintesi_progetto', 'N/D')}
- Target ideale: {positioning_output.get('target_ideale', 'N/D')}
- Problema principale: {positioning_output.get('problema_principale', 'N/D')}
- Risultato promesso: {positioning_output.get('risultato_promesso', 'N/D')}
- Differenziazione: {positioning_output.get('differenziazione', 'N/D')}
- Posizionamento finale: {positioning_output.get('posizionamento_finale', 'N/D')}

MASTERCLASS (input del partner):
- Risultato: {masterclass_answers.get('risultato_principale', 'N/D')}
- Problema pubblico: {masterclass_answers.get('problema_pubblico', 'N/D')}
- Metodo: {masterclass_answers.get('metodo_semplice', 'N/D')}
- Esempio: {masterclass_answers.get('esempio_concreto', 'N/D')}

PREFERENZE:
- Durata: {request.durata}
- Include bonus: {'Si' if request.include_bonus else 'No'}
- Ha contenuti pronti: {'Si' if request.contenuti_pronti else 'No'}

{durata_rule}

Genera un JSON con questa struttura ESATTA:
{{
  "titolo": "Titolo chiaro e orientato al risultato",
  "sottotitolo": "Frase che spiega il beneficio principale",
  "descrizione": "2-3 frasi: cosa impara lo studente e per chi e' il corso",
  "moduli": [
    {{
      "numero": 1,
      "titolo": "Titolo del modulo",
      "obiettivo": "Cosa lo studente impara in questo modulo",
      "lezioni": [
        {{"numero": "1.1", "titolo": "Titolo orientato all'azione", "durata": "5-10 min", "contenuto": ["punto chiave 1", "punto chiave 2", "punto chiave 3"]}}
      ]
    }}
  ],
  "bonus": ["Checklist pratica", "Template operativo", "Esercizi guidati"],
  "risorse": ["Workbook del corso", "Slide riassuntive"],
  "prezzo_base": "€XXX",
  "prezzo_motivazione": "Motivazione del prezzo consigliato",
  "offerta_lancio": "€XXX",
  "offerta_motivazione": "Es: prezzo early access per i primi 50 iscritti",
  "per_chi_e": "Descrizione specifica del target ideale del corso",
  "per_chi_non_e": "Chi NON dovrebbe acquistare questo corso"
}}

REGOLE:
- Ogni lezione deve avere un titolo orientato all'azione (es: 'Come creare...', 'Costruisci il tuo...')
- Il prezzo deve essere realistico per il mercato italiano della formazione online (range €97-€497)
- Se bonus e' No, restituisci un array vuoto per bonus
- Rispondi SOLO con il JSON, senza altro testo"""

    try:
        # Salva inputs
        await db.partner_videocorso.update_one(
            {"partner_id": request.partner_id},
            {
                "$set": {
                    "inputs": {
                        "durata": request.durata,
                        "include_bonus": request.include_bonus,
                        "contenuti_pronti": request.contenuti_pronti,
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$setOnInsert": {
                    "partner_id": request.partner_id,
                    "partner_name": partner.get("name"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )

        llm = await get_llm_chat()
        response = await llm.send_message(UserMessage(text=prompt))
        response_text = response.strip()

        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()

        # Pulizia robusta: rimuovi virgole trailing prima di } o ]
        import re
        response_text = re.sub(r',\s*([}\]])', r'\1', response_text)

        course_data = json.loads(response_text)

        await db.partner_videocorso.update_one(
            {"partner_id": request.partner_id},
            {"$set": {
                "course_data": course_data,
                "course_generated": True,
                "course_generated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        return {
            "success": True,
            "course_data": course_data
        }

    except json.JSONDecodeError as e:
        logging.error(f"JSON parse error in videocorso: {e}")
        raise HTTPException(status_code=500, detail="Errore nel parsing del videocorso generato")
    except Exception as e:
        logging.error(f"Videocorso generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione videocorso: {str(e)}")


class VideocorsoUpdateRequest(BaseModel):
    partner_id: str
    course_data: Dict[str, Any]

@router.post("/videocorso/update-course")
async def update_videocorso_course(request: VideocorsoUpdateRequest):
    """Aggiorna la struttura del videocorso (modifica manuale moduli/lezioni)"""
    partner = await get_partner_or_404(request.partner_id)

    await db.partner_videocorso.update_one(
        {"partner_id": request.partner_id},
        {"$set": {
            "course_data": request.course_data,
            "course_edited_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {
        "success": True,
        "message": "Struttura videocorso aggiornata"
    }

@router.post("/videocorso/approve-course")
async def approve_videocorso_ai(partner_id: str):
    """Approva la struttura del videocorso generata e completa la fase"""
    partner = await get_partner_or_404(partner_id)

    videocorso = await db.partner_videocorso.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )

    if not videocorso or not videocorso.get("course_data"):
        raise HTTPException(status_code=400, detail="Nessun videocorso da approvare")

    await db.partner_videocorso.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "course_approved": True,
            "completed": True,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "videocorso_completato": True,
            "videocorso_completato_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    await notify_telegram(
        f"🎬 VIDEOCORSO COMPLETATO\n\n👤 {partner.get('name')}\n📋 Struttura videocorso approvata dal partner"
    )

    return {
        "success": True,
        "message": "Videocorso approvato! Puoi procedere al Funnel."
    }

# ═══════════════════════════════════════════════════════════════════════════════
# FUNNEL ENDPOINTS (AI Course Factory)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/funnel/{partner_id}")
async def get_funnel(partner_id: str):
    """Recupera lo stato del funnel del partner"""
    partner = await get_partner_or_404(partner_id)
    
    funnel = await db.partner_funnel.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    return {
        "success": True,
        "partner_id": partner_id,
        "funnel": funnel or {},
        "is_generated": funnel.get("generated", False) if funnel else False,
        "is_published": funnel.get("published", False) if funnel else False,
        "blueprint": funnel.get("blueprint") if funnel else None,
        "inputs": funnel.get("inputs") if funnel else None,
        "is_approved": funnel.get("blueprint_approved", False) if funnel else False,
    }

@router.post("/funnel/generate")
async def generate_funnel(request: FunnelGenerateRequest):
    """
    Genera l'Academy Blueprint completo: landing page, email sequence, area studenti.
    Usa dati da posizionamento, masterclass e videocorso.
    """
    partner = await get_partner_or_404(request.partner_id)

    # Recupera posizionamento
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    positioning = posizionamento.get("positioning_output", {}) if posizionamento else {}

    if not positioning:
        raise HTTPException(status_code=400, detail="Completa prima il posizionamento")

    # Recupera masterclass
    masterclass = await db.masterclass_factory.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    mc_answers = masterclass.get("answers", {}) if masterclass else {}

    # Recupera videocorso
    videocorso = await db.partner_videocorso.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    course = videocorso.get("course_data", {}) if videocorso else {}

    # Salva inputs
    await db.partner_funnel.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "inputs": {
                    "bio_partner": request.bio_partner,
                    "garanzia": request.garanzia,
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "partner_id": request.partner_id,
                "partner_name": partner.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )

    # Costruisci il moduli summary per il prompt
    moduli_summary = ""
    for m in course.get("moduli", []):
        lezioni_list = ", ".join([l.get("titolo", "") for l in m.get("lezioni", [])])
        moduli_summary += f"- Modulo {m.get('numero', '')}: {m.get('titolo', '')} ({len(m.get('lezioni', []))} lezioni: {lezioni_list})\n"

    prompt = f"""Sei un esperto di funnel marketing e copywriting per corsi online.
Genera un ACADEMY BLUEPRINT completo per il partner {partner.get('name')}.

═══ DATI DEL PARTNER ═══

POSIZIONAMENTO:
- Target: {positioning.get('target_ideale', 'N/D')}
- Problema: {positioning.get('problema_principale', 'N/D')}
- Risultato: {positioning.get('risultato_promesso', 'N/D')}
- Differenziazione: {positioning.get('differenziazione', 'N/D')}
- Posizionamento finale: {positioning.get('posizionamento_finale', 'N/D')}

MASTERCLASS INPUT:
- Risultato principale: {mc_answers.get('risultato_principale', 'N/D')}
- Errore comune: {mc_answers.get('errore_comune', 'N/D')}
- Metodo: {mc_answers.get('metodo_semplice', 'N/D')}

VIDEOCORSO:
- Titolo: {course.get('titolo', 'N/D')}
- Sottotitolo: {course.get('sottotitolo', 'N/D')}
- Descrizione: {course.get('descrizione', 'N/D')}
- Moduli:
{moduli_summary or 'N/D'}
- Bonus: {', '.join(course.get('bonus', [])) or 'N/D'}
- Risorse: {', '.join(course.get('risorse', [])) or 'N/D'}
- Prezzo base: {course.get('prezzo_base', 'N/D')}
- Offerta lancio: {course.get('offerta_lancio', 'N/D')}
- Per chi e': {course.get('per_chi_e', 'N/D')}
- Per chi NON e': {course.get('per_chi_non_e', 'N/D')}

BIO PARTNER: {request.bio_partner or 'Non fornita'}
GARANZIA: {request.garanzia or 'Soddisfatti o rimborsati entro 30 giorni'}

═══ OUTPUT RICHIESTO ═══

Genera un JSON con questa struttura ESATTA:
{{
  "landing_sections": {{
    "hero": {{
      "headline": "Headline principale della sales page - orientata al risultato",
      "subheadline": "Sottotitolo che espande il beneficio",
      "cta_text": "Testo del bottone CTA principale"
    }},
    "problema": {{
      "headline": "Titolo sezione problema",
      "body": "Paragrafo che descrive il problema del target (3-4 frasi persuasive)"
    }},
    "promessa": {{
      "headline": "Titolo sezione promessa/soluzione",
      "body": "Paragrafo che descrive la trasformazione promessa (3-4 frasi)"
    }},
    "moduli": {{
      "headline": "Cosa imparerai nel corso",
      "items": ["Modulo 1: descrizione breve", "Modulo 2: descrizione breve", "..."]
    }},
    "bonus": {{
      "headline": "Bonus inclusi",
      "items": ["Bonus 1: descrizione e valore", "Bonus 2: descrizione e valore"]
    }},
    "garanzia": {{
      "headline": "La nostra garanzia",
      "body": "Testo garanzia rassicurante"
    }},
    "faq": [
      {{"question": "Domanda frequente 1?", "answer": "Risposta dettagliata"}},
      {{"question": "Domanda frequente 2?", "answer": "Risposta dettagliata"}},
      {{"question": "Domanda frequente 3?", "answer": "Risposta dettagliata"}},
      {{"question": "Domanda frequente 4?", "answer": "Risposta dettagliata"}},
      {{"question": "Domanda frequente 5?", "answer": "Risposta dettagliata"}}
    ],
    "bio": {{
      "name": "{partner.get('name', 'Partner')}",
      "bio": "Biografia professionale del partner (3-4 frasi)"
    }},
    "cta_finale": {{
      "headline": "Headline CTA finale urgente",
      "body": "Breve paragrafo di urgenza e scarsita'",
      "cta_text": "Testo bottone finale",
      "prezzo": "{course.get('prezzo_base', '€297')}",
      "offerta": "{course.get('offerta_lancio', '€197')}"
    }}
  }},
  "email_sequence": [
    {{
      "id": 1,
      "type": "consegna",
      "delay": "Immediata",
      "subject": "Subject email 1 - benvenuto e accesso",
      "body": "Corpo completo email 1 (5-8 frasi). Benvenuto, contesto, link accesso, aspettative."
    }},
    {{
      "id": 2,
      "type": "problema",
      "delay": "+24 ore",
      "subject": "Subject email 2 - problema",
      "body": "Corpo completo email 2 (5-8 frasi). Approfondisci il problema, crea empatia."
    }},
    {{
      "id": 3,
      "type": "errore",
      "delay": "+48 ore",
      "subject": "Subject email 3 - errore comune",
      "body": "Corpo completo email 3 (5-8 frasi). L'errore che fanno tutti, perche' non funziona."
    }},
    {{
      "id": 4,
      "type": "soluzione",
      "delay": "+72 ore",
      "subject": "Subject email 4 - soluzione",
      "body": "Corpo completo email 4 (5-8 frasi). Presenta il metodo, i risultati, testimonianze."
    }},
    {{
      "id": 5,
      "type": "urgenza",
      "delay": "+96 ore",
      "subject": "Subject email 5 - urgenza e CTA",
      "body": "Corpo completo email 5 (5-8 frasi). Urgenza, scarsita', call to action finale."
    }}
  ],
  "student_area": {{
    "welcome_message": "Messaggio di benvenuto per l'area studenti (3-4 frasi motivazionali)",
    "modules": [
      {{
        "title": "Titolo modulo",
        "lessons": ["Titolo lezione 1", "Titolo lezione 2", "..."]
      }}
    ],
    "bonus_section": ["Titolo bonus 1", "Titolo bonus 2"],
    "resources_section": ["Risorsa scaricabile 1", "Risorsa scaricabile 2"]
  }}
}}

REGOLE:
- Copy persuasivo, specifico per la nicchia del partner
- Linguaggio diretto, orientato ai risultati
- Ogni email deve avere un corpo COMPLETO (non placeholder)
- Le FAQ devono essere realistiche per questo tipo di corso
- La bio deve essere professionale e autorevole
- Se la bio del partner non e' fornita, inventane una coerente col posizionamento
- Il prezzo e l'offerta devono riflettere i dati del videocorso
- Rispondi SOLO con il JSON, senza altro testo"""

    try:
        llm = await get_llm_chat()
        response = await llm.send_message(UserMessage(text=prompt))
        response_text = response.strip()

        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()

        blueprint = json.loads(response_text)

        await db.partner_funnel.update_one(
            {"partner_id": request.partner_id},
            {"$set": {
                "blueprint": blueprint,
                "generated": True,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "content": blueprint.get("landing_sections", {}),
                "email_sequence": blueprint.get("email_sequence", []),
            }}
        )

        return {
            "success": True,
            "blueprint": blueprint
        }

    except json.JSONDecodeError as e:
        logging.error(f"Blueprint JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="Errore nel parsing del blueprint generato")
    except Exception as e:
        logging.error(f"Blueprint generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione blueprint: {str(e)}")

@router.post("/funnel/approve-blueprint")
async def approve_funnel_blueprint(partner_id: str):
    """Approva il blueprint dell'academy e completa la fase funnel"""
    partner = await get_partner_or_404(partner_id)

    funnel = await db.partner_funnel.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )

    if not funnel or not funnel.get("blueprint"):
        raise HTTPException(status_code=400, detail="Nessun blueprint da approvare")

    await db.partner_funnel.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "blueprint_approved": True,
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "funnel_completato": True,
            "funnel_completato_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    await notify_telegram(
        f"📊 BLUEPRINT APPROVATO\n\n👤 {partner.get('name')}\n📋 Academy Blueprint approvato dal partner"
    )

    return {
        "success": True,
        "message": "Blueprint approvato! Puoi procedere al Lancio."
    }

@router.post("/funnel/publish")
async def publish_funnel(request: FunnelPublishRequest):
    """
    Pubblica il funnel su Systeme.io tramite OpenClaw
    Invia un task a Telegram per l'automazione locale
    """
    partner = await get_partner_or_404(request.partner_id)
    
    funnel = await db.partner_funnel.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    if not funnel or not funnel.get("generated"):
        raise HTTPException(status_code=400, detail="Genera prima il funnel")
    
    # Invia task a OpenClaw via Telegram
    openclaw_chat_id = os.environ.get('OPENCLAW_CHAT_ID')
    telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    
    if openclaw_chat_id and telegram_token:
        task_message = f"""🤖 OPENCLAW TASK: PUBBLICA FUNNEL

PARTNER: {partner.get('name')}
PARTNER_ID: {request.partner_id}

AZIONE: Duplica template funnel standard su Systeme.io
TEMPLATE: Evolution PRO - Funnel Standard
NOME_FUNNEL: Funnel_{partner.get('name', 'Partner').replace(' ', '_')}

CONTENUTI DA INSERIRE:
- Opt-in: {funnel.get('content', {}).get('optin_page', {}).get('headline', 'N/D')}
- Sales: {funnel.get('content', {}).get('sales_page', {}).get('headline', 'N/D')}

STATUS: PENDING"""

        try:
            import httpx
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={
                        "chat_id": openclaw_chat_id,
                        "text": task_message,
                        "parse_mode": "HTML"
                    }
                )
        except Exception as e:
            logging.warning(f"OpenClaw notification failed: {e}")
    
    # Marca come pubblicato (pending automazione)
    await db.partner_funnel.update_one(
        {"partner_id": request.partner_id},
        {"$set": {
            "published": True,
            "publish_status": "pending_automation",
            "published_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.partners.update_one(
        {"id": request.partner_id},
        {"$set": {
            "funnel_approvato": True,
            "funnel_pubblicato_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Task di pubblicazione inviato a OpenClaw",
        "status": "pending_automation"
    }

# ═══════════════════════════════════════════════════════════════════════════════
# LANCIO ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/lancio/generate-plan")
async def generate_lancio_plan(request: LancioGenerateRequest):
    """Genera il piano di lancio completo AI-driven: calendario, contenuti, ads, webinar"""
    partner = await get_partner_or_404(request.partner_id)
    
    # Raccogli tutto il contesto del partner
    positioning = await db.partner_positioning.find_one({"partner_id": request.partner_id}, {"_id": 0})
    masterclass = await db.partner_masterclass.find_one({"partner_id": request.partner_id}, {"_id": 0})
    videocorso = await db.partner_videocorso.find_one({"partner_id": request.partner_id}, {"_id": 0})
    funnel = await db.partner_funnel.find_one({"partner_id": request.partner_id}, {"_id": 0})

    pos_data = positioning.get("generated_positioning", {}) if positioning else {}
    mc_data = masterclass.get("answers", {}) if masterclass else {}
    course = videocorso.get("course_data", {}) if videocorso else {}
    blueprint = funnel.get("blueprint", {}) if funnel else {}
    landing = blueprint.get("landing_sections", {}) if blueprint else {}

    # Riassunto moduli
    moduli_summary = ""
    for m in course.get("moduli", []):
        moduli_summary += f"- {m.get('titolo', 'N/D')}\n"

    # Riassunto landing
    landing_headline = landing.get("hero", {}).get("headline", "N/D")
    landing_problema = landing.get("problema", {}).get("body", "N/D")

    prompt = f"""Sei un esperto di marketing digitale e lanci di corsi online.
Genera un PIANO DI LANCIO COMPLETO per il partner {partner.get('name')}.

MODELLO DI VENDITA: Traffico → Landing → Webinar → Offerta → Follow-up

═══ DATI DEL PARTNER ═══

POSIZIONAMENTO:
- Target: {pos_data.get('target_ideale', 'N/D')}
- Problema: {pos_data.get('problema_principale', 'N/D')}
- Risultato: {pos_data.get('risultato_promesso', 'N/D')}
- Differenziazione: {pos_data.get('differenziazione', 'N/D')}
- Frase chiave: {pos_data.get('posizionamento_finale', 'N/D')}

VIDEOCORSO:
- Titolo: {course.get('titolo', 'N/D')}
- Descrizione: {course.get('descrizione', 'N/D')}
- Prezzo: {course.get('prezzo_base', 'N/D')}
- Offerta lancio: {course.get('offerta_lancio', 'N/D')}
- Moduli: {moduli_summary or 'N/D'}

FUNNEL:
- Headline landing: {landing_headline}
- Problema landing: {landing_problema[:300] if landing_problema != 'N/D' else 'N/D'}

MASTERCLASS:
- Risultato: {mc_data.get('risultato_principale', 'N/D')}
- Errore comune: {mc_data.get('errore_comune', 'N/D')}
- Metodo: {mc_data.get('metodo_semplice', 'N/D')}

═══ OUTPUT RICHIESTO ═══

Genera un JSON con questa struttura ESATTA. Ogni contenuto deve essere COMPLETO e OPERATIVO.

{{
  "landing_page": {{
    "headline": "headline principale della landing (orientata al risultato)",
    "sub_headline": "sotto-titolo che espande la promessa",
    "promessa": "promessa chiara e specifica di cosa ottiene chi si iscrive al webinar",
    "problema": "descrizione del problema principale del target (3-4 frasi che creano identificazione)",
    "soluzione_preview": "anticipazione della soluzione senza rivelare tutto (2-3 frasi)",
    "benefici": [
      "beneficio 1 concreto e misurabile",
      "beneficio 2 concreto e misurabile",
      "beneficio 3 concreto e misurabile",
      "beneficio 4 concreto e misurabile"
    ],
    "cta_iscrizione": "testo del bottone di iscrizione al webinar",
    "social_proof": "frase di riprova sociale o credibilita"
  }},
  "webinar": {{
    "titolo": "titolo del webinar accattivante e orientato al risultato",
    "promessa": "cosa il partecipante otterra alla fine del webinar",
    "durata": "durata consigliata (es. 60-90 minuti)",
    "scaletta": [
      {{
        "momento": "Apertura (0-5 min)",
        "contenuto": "cosa dire esattamente in questa fase",
        "obiettivo": "obiettivo di questa fase"
      }},
      {{
        "momento": "Il Problema (5-15 min)",
        "contenuto": "come presentare il problema del target",
        "obiettivo": "creare consapevolezza del problema"
      }},
      {{
        "momento": "La Soluzione (15-30 min)",
        "contenuto": "presentare il metodo/framework",
        "obiettivo": "posizionarsi come esperto"
      }},
      {{
        "momento": "Caso Studio (30-40 min)",
        "contenuto": "mostrare risultati concreti",
        "obiettivo": "costruire fiducia"
      }},
      {{
        "momento": "L'Offerta (40-55 min)",
        "contenuto": "presentare il corso come soluzione completa",
        "obiettivo": "transizione alla vendita"
      }},
      {{
        "momento": "Q&A e Chiusura (55-70 min)",
        "contenuto": "rispondere alle obiezioni e chiudere con urgenza",
        "obiettivo": "superare le obiezioni e convertire"
      }}
    ],
    "cta_vendita": "CTA di vendita specifica con offerta e urgenza",
    "obiezioni_comuni": [
      {{
        "obiezione": "obiezione tipica del target",
        "risposta": "come rispondere in modo efficace"
      }}
    ]
  }},
  "offerta": {{
    "nome_prodotto": "nome commerciale del corso",
    "prezzo_pieno": "prezzo pieno del corso",
    "prezzo_lancio": "prezzo speciale di lancio",
    "sconto_percentuale": "percentuale di sconto",
    "bonus": [
      {{
        "nome": "nome del bonus",
        "descrizione": "cosa include il bonus",
        "valore": "valore percepito del bonus"
      }}
    ],
    "garanzia": "tipo e durata della garanzia (es. soddisfatti o rimborsati 30 giorni)",
    "urgenza": "elemento di urgenza/scarsita per spingere all'azione",
    "riepilogo_valore": "frase che riassume il valore totale dell'offerta"
  }},
  "email_followup": [
    {{
      "numero": 1,
      "timing": "subito dopo il webinar",
      "tipo": "replay",
      "subject": "oggetto email",
      "body": "corpo completo dell'email (300-500 parole)"
    }},
    {{
      "numero": 2,
      "timing": "giorno dopo",
      "tipo": "valore",
      "subject": "oggetto email",
      "body": "email che aggiunge valore e rinforza la decisione"
    }},
    {{
      "numero": 3,
      "timing": "2 giorni dopo",
      "tipo": "caso_studio",
      "subject": "oggetto email",
      "body": "email con caso studio o testimonianza"
    }},
    {{
      "numero": 4,
      "timing": "3 giorni dopo",
      "tipo": "obiezioni",
      "subject": "oggetto email",
      "body": "email che supera le obiezioni principali"
    }},
    {{
      "numero": 5,
      "timing": "5 giorni dopo",
      "tipo": "bonus",
      "subject": "oggetto email",
      "body": "email che presenta un bonus esclusivo a tempo"
    }},
    {{
      "numero": 6,
      "timing": "7 giorni dopo (ultimo giorno)",
      "tipo": "urgenza",
      "subject": "oggetto email",
      "body": "email finale con urgenza e scadenza offerta"
    }}
  ],
  "calendario_30g": [
    {{
      "giorno": 1,
      "tipo": "REEL",
      "obiettivo": "attenzione",
      "titolo": "titolo specifico e accattivante",
      "cta": "CTA che porta alla landing del webinar"
    }}
  ],
  "contenuti_pronti": {{
    "reel": [
      {{
        "titolo": "titolo reel",
        "hook": "frase iniziale che cattura nei primi 2 secondi",
        "script": "script completo (60-90 secondi)",
        "cta": "CTA verso la landing del webinar"
      }}
    ],
    "carousel": [
      {{
        "titolo": "titolo carousel",
        "slide": ["Slide 1", "Slide 2", "Slide 3", "Slide 4", "Slide 5 CTA"],
        "cta": "CTA verso la landing del webinar"
      }}
    ],
    "post": [
      {{
        "titolo": "titolo post",
        "testo": "testo completo (200-400 parole) con formattazione e hashtag",
        "cta": "CTA verso la landing del webinar"
      }}
    ]
  }},
  "piano_ads": {{
    "obiettivo_campagna": "obiettivo specifico Meta Ads",
    "pubblico_target": "descrizione pubblico target dettagliata",
    "budget_consigliato": "budget giornaliero/mensile con range",
    "creativita": [
      {{
        "tipo": "tipo (immagine/video/carousel)",
        "descrizione": "descrizione dettagliata",
        "headline": "headline dell'ad",
        "testo_primario": "testo primario completo"
      }}
    ],
    "copy_ads": [
      {{
        "angolo": "angolo comunicazione (dolore/aspirazione/prova sociale)",
        "headline": "headline",
        "testo_primario": "testo primario completo",
        "cta_button": "testo bottone CTA"
      }}
    ]
  }}
}}

REGOLE IMPORTANTI:
- MODELLO: Traffico (social+ads) → Landing (iscrizione webinar) → Webinar (vendita) → Offerta → Follow-up (6 email)
- La landing DEVE portare al webinar, il webinar DEVE vendere il corso
- L'offerta deve avere almeno 3 bonus con valore percepito
- Le 6 email follow-up devono coprire: replay, valore, caso studio, obiezioni, bonus, urgenza
- Il calendario deve avere 30 giorni con CTA che portano ALLA LANDING del webinar
- I contenuti social devono portare traffico alla landing
- Le ads devono portare traffico alla landing
- Almeno 4 reel, 3 carousel, 3 post pronti
- Almeno 3 creativita e 3 copy ads
- La scaletta webinar deve avere almeno 6 momenti dettagliati
- Almeno 3 obiezioni comuni con risposte
- Tutto OPERATIVO: il partner copia e incolla
- Scrivi tutto in ITALIANO
- Rispondi SOLO con il JSON, senza commenti o markdown"""

    try:
        chat = await get_llm_chat(
            session_id=f"lancio-plan-{request.partner_id}-{uuid.uuid4()}",
            system_message="Sei un esperto di digital marketing e lanci di corsi online. Generi piani di lancio operativi e completi. Rispondi SOLO in JSON valido."
        )

        response = await chat.send_message(UserMessage(text=prompt))
        response_text = response.strip()

        # Estrai JSON dalla risposta
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()

        import re
        response_text = re.sub(r',\s*([}\]])', r'\1', response_text)

        plan_data = json.loads(response_text)

        # Salva nel database
        await db.partner_lancio.update_one(
            {"partner_id": request.partner_id},
            {
                "$set": {
                    "plan_data": plan_data,
                    "plan_generated": True,
                    "plan_generated_at": datetime.now(timezone.utc).isoformat(),
                    "plan_approved": False,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$setOnInsert": {
                    "partner_id": request.partner_id,
                    "partner_name": partner.get("name"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )

        return {
            "success": True,
            "plan_data": plan_data,
            "message": "Piano di lancio generato!"
        }

    except json.JSONDecodeError as e:
        logging.error(f"JSON parse error in lancio plan: {e}")
        raise HTTPException(status_code=500, detail="Errore nel parsing del piano generato")
    except Exception as e:
        logging.error(f"Error generating lancio plan: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")


@router.post("/lancio/approve-plan")
async def approve_lancio_plan(partner_id: str):
    """Approva il piano di lancio generato"""
    partner = await get_partner_or_404(partner_id)

    lancio = await db.partner_lancio.find_one({"partner_id": partner_id}, {"_id": 0})
    if not lancio or not lancio.get("plan_generated"):
        raise HTTPException(status_code=400, detail="Genera prima il piano di lancio")

    await db.partner_lancio.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "plan_approved": True,
            "plan_approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {
        "success": True,
        "message": "Piano di lancio approvato!"
    }


@router.get("/lancio/email-followup/{partner_id}")
async def get_lancio_email_followup(partner_id: str):
    """Restituisce le 6 email follow-up del piano di lancio con subject e body pronti da copiare"""
    await get_partner_or_404(partner_id)
    lancio = await db.partner_lancio.find_one({"partner_id": partner_id}, {"_id": 0})

    if not lancio or not lancio.get("plan_generated"):
        return {"success": True, "emails": [], "plan_generated": False}

    plan_data = lancio.get("plan_data", {})
    # Supporta sia email_followup (nuovo formato lancio) che email_sequence (formato blueprint)
    emails = plan_data.get("email_followup") or plan_data.get("email_sequence") or []

    return {
        "success": True,
        "emails": emails,
        "plan_generated": True,
        "plan_approved": lancio.get("plan_approved", False),
        "generated_at": lancio.get("plan_generated_at")
    }


@router.get("/lancio/{partner_id}")
async def get_lancio_status(partner_id: str):
    """Recupera lo stato di preparazione al lancio"""
    partner = await get_partner_or_404(partner_id)
    
    # Verifica prerequisiti
    masterclass = await db.partner_masterclass.find_one({"partner_id": partner_id}, {"_id": 0})
    videocorso = await db.partner_videocorso.find_one({"partner_id": partner_id}, {"_id": 0})
    funnel = await db.partner_funnel.find_one({"partner_id": partner_id}, {"_id": 0})
    lancio = await db.partner_lancio.find_one({"partner_id": partner_id}, {"_id": 0})
    
    system_checks = {
        "masterclass_completata": masterclass.get("video_approved", False) if masterclass else False,
        "videocorso_completato": videocorso.get("completed", False) if videocorso else False,
        "funnel_approvato": funnel.get("published", False) if funnel else False,
        "email_attive": funnel.get("published", False) if funnel else False,
    }
    
    all_ready = all(system_checks.values())
    
    return {
        "success": True,
        "partner_id": partner_id,
        "system_checks": system_checks,
        "all_ready": all_ready,
        "is_launched": lancio.get("launched", False) if lancio else False,
        "funnel_url": lancio.get("funnel_url") if lancio else None,
        "plan_data": lancio.get("plan_data") if lancio else None,
        "plan_generated": lancio.get("plan_generated", False) if lancio else False,
        "plan_approved": lancio.get("plan_approved", False) if lancio else False
    }

@router.post("/lancio/publish-funnel")
async def publish_funnel_for_launch(partner_id: str):
    """Pubblica il funnel finale per il lancio"""
    partner = await get_partner_or_404(partner_id)
    
    # Verifica prerequisiti
    lancio_status = await get_lancio_status(partner_id)
    if not lancio_status.get("all_ready"):
        raise HTTPException(status_code=400, detail="Completa tutti i prerequisiti prima del lancio")
    
    # Simula URL funnel (in produzione verrebbe da Systeme.io)
    funnel_url = f"https://systeme.io/funnel/{partner_id}"
    
    await db.partner_lancio.update_one(
        {"partner_id": partner_id},
        {
            "$set": {
                "funnel_published": True,
                "funnel_url": funnel_url,
                "funnel_published_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "partner_id": partner_id,
                "partner_name": partner.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "funnel_url": funnel_url,
        "message": "Funnel pubblicato"
    }

@router.post("/lancio/activate")
async def activate_launch(request: LancioActivateRequest):
    """Attiva il lancio dell'Accademia Digitale"""
    partner = await get_partner_or_404(request.partner_id)
    
    # Verifica prerequisiti
    lancio_status = await get_lancio_status(request.partner_id)
    if not lancio_status.get("all_ready"):
        raise HTTPException(status_code=400, detail="Completa tutti i prerequisiti prima del lancio")
    
    # Attiva lancio
    await db.partner_lancio.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "launched": True,
                "launched_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Aggiorna fase partner
    await db.partners.update_one(
        {"id": request.partner_id},
        {"$set": {
            "phase": "LIVE",
            "launch_date": datetime.now(timezone.utc).isoformat(),
            "accademia_live": True
        }}
    )
    
    # Notifica
    await notify_telegram(
        f"🚀 LANCIO ATTIVATO!\n\n👤 {partner.get('name')}\n💼 {partner.get('niche', 'N/D')}\n\n✅ Accademia Digitale ora LIVE!"
    )
    
    return {
        "success": True,
        "message": "Lancio attivato! L'Accademia Digitale è ora live.",
        "launched_at": datetime.now(timezone.utc).isoformat()
    }

# ═══════════════════════════════════════════════════════════════════════════════
# PROGRESS OVERVIEW ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/progress/{partner_id}")
async def get_partner_journey_progress(partner_id: str):
    """Recupera il progresso complessivo del percorso partner"""
    partner = await get_partner_or_404(partner_id)
    
    # Recupera tutti gli stati
    posizionamento = await db.partner_posizionamento.find_one({"partner_id": partner_id}, {"_id": 0})
    masterclass = await db.partner_masterclass.find_one({"partner_id": partner_id}, {"_id": 0})
    videocorso = await db.partner_videocorso.find_one({"partner_id": partner_id}, {"_id": 0})
    funnel = await db.partner_funnel.find_one({"partner_id": partner_id}, {"_id": 0})
    lancio = await db.partner_lancio.find_one({"partner_id": partner_id}, {"_id": 0})
    
    progress = {
        "posizionamento": {
            "started": posizionamento is not None,
            "completed": posizionamento.get("completed", False) if posizionamento else False,
            "has_structure": posizionamento.get("course_structure") is not None if posizionamento else False
        },
        "masterclass": {
            "started": masterclass is not None,
            "script_completed": masterclass.get("script_completed", False) if masterclass else False,
            "video_uploaded": masterclass.get("video_uploaded", False) if masterclass else False,
            "video_approved": masterclass.get("video_approved", False) if masterclass else False,
            "completed": masterclass.get("video_approved", False) if masterclass else False
        },
        "videocorso": {
            "started": videocorso is not None,
            "lessons_uploaded": len(videocorso.get("lessons", {})) if videocorso else 0,
            "completed": videocorso.get("completed", False) if videocorso else False
        },
        "funnel": {
            "started": funnel is not None,
            "generated": funnel.get("generated", False) if funnel else False,
            "published": funnel.get("published", False) if funnel else False,
            "completed": funnel.get("published", False) if funnel else False
        },
        "lancio": {
            "ready": lancio.get("funnel_published", False) if lancio else False,
            "launched": lancio.get("launched", False) if lancio else False,
            "completed": lancio.get("launched", False) if lancio else False
        }
    }
    
    # Calcola step corrente
    if lancio and lancio.get("launched"):
        current_step = "completed"
    elif funnel and funnel.get("published"):
        current_step = "lancio"
    elif videocorso and videocorso.get("completed"):
        current_step = "funnel"
    elif masterclass and masterclass.get("video_approved"):
        current_step = "videocorso"
    elif posizionamento and posizionamento.get("completed"):
        current_step = "masterclass"
    else:
        current_step = "posizionamento"
    
    return {
        "success": True,
        "partner_id": partner_id,
        "partner_name": partner.get("name"),
        "current_step": current_step,
        "progress": progress
    }


# ═══════════════════════════════════════════════════════════════════════════════
# OTTIMIZZAZIONE ENDPOINTS (Fase 6 - Post Lancio)
# ═══════════════════════════════════════════════════════════════════════════════

class AzioneConsigliata(BaseModel):
    id: int
    label: str
    status: str  # not_started, in_progress, completed
    category: Optional[str] = None

class SalvaAzioniRequest(BaseModel):
    partner_id: str
    azioni: List[AzioneConsigliata]

class GeneraReportRequest(BaseModel):
    partner_id: str

class CreaCasoStudioRequest(BaseModel):
    partner_id: str


class GeneraCasoStudioRequest(BaseModel):
    """Risultato grezzo di UNO studente (da Survey Systeme o inserito a mano dal team)."""
    partner_id: str
    nome: Optional[str] = None
    prima: Optional[str] = None
    dopo: Optional[str] = None
    citazione: Optional[str] = None
    tempo: Optional[str] = None
    prova: Optional[str] = None
    prova_visiva_url: Optional[str] = None  # ripiego: Systeme non fa upload file


class SalvaProtocolloRequest(BaseModel):
    partner_id: str
    settimana: str
    checklist: List[Dict[str, Any]]


@router.get("/ottimizzazione/{partner_id}")
async def get_ottimizzazione(partner_id: str):
    """
    Recupera tutti i dati della fase Ottimizzazione:
    - KPI da Systeme.io
    - Ultimo report AI
    - Stato azioni
    - Dati caso studio
    - Stato partnership (scadenza)
    """
    partner = await get_partner_or_404(partner_id)
    
    # Recupera dati ottimizzazione salvati
    ottimizzazione = await db.partner_ottimizzazione.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    # Calcola stato partnership (12 mesi)
    from dateutil.relativedelta import relativedelta
    data_pagamento = partner.get("data_pagamento_partnership") or partner.get("conversion_date")
    
    partnership_data = {
        "stato": "attiva",
        "data_attivazione": data_pagamento,
        "data_scadenza": None,
        "giorni_rimanenti": 365
    }
    
    if data_pagamento:
        try:
            if isinstance(data_pagamento, str):
                data_attivazione = datetime.fromisoformat(data_pagamento.replace("Z", "+00:00"))
            else:
                data_attivazione = data_pagamento
            
            data_scadenza = data_attivazione + relativedelta(months=12)
            oggi = datetime.now(timezone.utc)
            
            giorni_rimanenti = (data_scadenza - oggi).days
            
            partnership_data = {
                "stato": "scaduto" if giorni_rimanenti < 0 else "attiva",
                "data_attivazione": data_attivazione.isoformat(),
                "data_scadenza": data_scadenza.isoformat(),
                "giorni_rimanenti": max(0, giorni_rimanenti)
            }
        except Exception as e:
            logging.warning(f"Error calculating partnership dates: {e}")
    
    # Recupera KPI da Systeme.io
    kpi_data = await get_partner_kpi_from_systeme(partner_id, partner)
    
    # Recupera azioni salvate o usa default
    default_actions = [
        {"id": 1, "label": "Pubblica 3 contenuti social sulla masterclass", "status": "not_started", "category": "marketing"},
        {"id": 2, "label": "Ripromuovi la masterclass alla tua lista", "status": "not_started", "category": "marketing"},
        {"id": 3, "label": "Raccogli 2 testimonianze dagli studenti", "status": "not_started", "category": "social_proof"},
        {"id": 4, "label": "Aggiorna headline della opt-in page", "status": "not_started", "category": "conversion"},
        {"id": 5, "label": "Rispondi ai commenti e messaggi", "status": "not_started", "category": "engagement"},
        {"id": 6, "label": "Analizza i dati del funnel", "status": "not_started", "category": "analytics"},
    ]
    
    azioni = ottimizzazione.get("azioni", default_actions) if ottimizzazione else default_actions

    kpi = {
        "visite": kpi_data.get("visite_raw", kpi_data.get("lead_generati", 0)),
        "visite_trend": 0,
        "contatti": kpi_data.get("lead_generati", 0),
        "contatti_trend": 0,
        "vendite": kpi_data.get("vendite_mese", 0),
        "vendite_trend": 0,
        "conversione": kpi_data.get("conversione_funnel", 0),
        "conversione_trend": 0,
        "fonte": kpi_data.get("fonte", "nessuna"),
        "aggiornato_at": kpi_data.get("aggiornato_at"),
    }

    # Motore Marco: ritmo + accountability (UNA prossima azione + giorni di inattivita).
    from services.marco_accountability import compute_ritmo
    ritmo = compute_ritmo(ottimizzazione, kpi, riferimento_attivazione=data_pagamento)

    # Metriche Dati academy-side (LTV derivato; completion/churn flaggate non disponibili).
    from services.academy_metrics import compute_academy_metrics
    academy = compute_academy_metrics(kpi_data)

    return {
        "success": True,
        "partner_id": partner_id,
        "partner_name": partner.get("name"),
        "kpi": kpi,
        "prossima_azione": ritmo["prossima_azione"],
        "giorni_da_ultima_azione": ritmo["giorni_da_ultima_azione"],
        "nudge_level": ritmo["nudge_level"],
        "pubblica_con_costanza": ritmo["pubblica_con_costanza"],
        "iscritti_webinar": ritmo["iscritti_webinar"],
        "academy": academy,
        "ultimo_report": ottimizzazione.get("ultimo_report") if ottimizzazione else None,
        "azioni": azioni,
        "protocollo_settimana": ottimizzazione.get("protocollo_settimana") if ottimizzazione else None,
        "protocollo_checklist": ottimizzazione.get("protocollo_checklist") if ottimizzazione else None,
        "caso_studio": {
            "studenti": kpi_data.get("studenti_totali", 0),
            "fatturato": kpi_data.get("fatturato_totale", 0),
            "recensioni": kpi_data.get("recensioni", 0),
            "caso_studio_creato": ottimizzazione.get("caso_studio_creato", False) if ottimizzazione else False,
            "caso_studio_id": ottimizzazione.get("caso_studio_id") if ottimizzazione else None
        },
        "partnership": partnership_data
    }


async def get_partner_kpi_from_systeme(partner_id: str, partner: dict) -> dict:
    """
    Recupera KPI del partner con questa priorità:
    1. KPI manuali salvati dall'admin (fonte principale finché non c'è Systeme configurato)
    2. Dati interni aggregati (visite da tracking pixel, contatti da systeme_contacts)
    3. Systeme.io API (se configurata per questo partner)
    """
    # ── 1. KPI manuali (admin li aggiorna dal modal) ──────────────────────────
    kpi_manual = partner.get("kpi_manual")
    if kpi_manual and any(kpi_manual.get(k, 0) > 0 for k in ["visite", "contatti", "vendite"]):
        return {
            "studenti_totali": int(kpi_manual.get("contatti", 0)),
            "vendite_mese": float(kpi_manual.get("vendite", 0)),
            "lead_generati": int(kpi_manual.get("contatti", 0)),
            "conversione_funnel": float(kpi_manual.get("conversione", 0)),
            "fatturato_totale": float(kpi_manual.get("vendite", 0)),
            "recensioni": 0,
            "fonte": "manuale",
            "aggiornato_at": kpi_manual.get("aggiornato_at", ""),
        }

    # ── 2. Dati interni aggregati ─────────────────────────────────────────────
    try:
        # Visite dal tracking pixel
        visite = await db.partner_visits.count_documents({"partner_id": str(partner_id)})

        # Contatti: systeme_contacts filtrati per partner
        contatti = await db.systeme_contacts.count_documents({"partner_id": str(partner_id)})
        if contatti == 0:
            # Fallback: contatti con subdomain tag
            subdomain = partner.get("systeme_subdomain", "")
            if subdomain:
                contatti = await db.systeme_contacts.count_documents({"source_subdomain": subdomain})

        # Vendite: da db.payments (unica collezione, popolata da Systeme webhook new_sale)
        partner_email = partner.get("email", "")
        vendite_query = {
            "$or": [
                {"partner_id": str(partner_id)},
                {"partner_email": partner_email},
            ],
            "status": "completed",
            "type": {"$ne": "analisi_strategica"},  # esclude acquisti analisi (nostri, non del partner)
        }
        # Conta vendite
        vendite_count = await db.payments.count_documents(vendite_query) if partner_email else 0
        # Somma fatturato
        fatturato_agg = await db.payments.aggregate([
            {"$match": vendite_query},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]).to_list(1) if partner_email else []
        fatturato_totale = float(fatturato_agg[0]["total"]) if fatturato_agg else 0.0

        if visite > 0 or contatti > 0 or vendite_count > 0:
            conversione = round((contatti / visite * 100), 1) if visite > 0 else 0
            return {
                "studenti_totali": contatti,
                "vendite_mese": float(vendite_count),
                "lead_generati": contatti,
                "conversione_funnel": conversione,
                "fatturato_totale": fatturato_totale,
                "recensioni": 0,
                "fonte": "interno",
                "visite_raw": visite,
            }
    except Exception as e:
        logging.warning(f"[KPI] Errore aggregazione interna: {e}")

    # ── 3. Systeme.io API (se configurata) ────────────────────────────────────
    try:
        from systeme_mcp_client import get_accademia_revenue, is_configured
        if is_configured():
            course_id = partner.get("systeme_course_id")
            if course_id:
                revenue_data = get_accademia_revenue(course_id)
                studenti = revenue_data.get("students", 0)
                fatturato = revenue_data.get("revenue", 0)
                return {
                    "studenti_totali": studenti,
                    "vendite_mese": fatturato,
                    "lead_generati": studenti,
                    "conversione_funnel": 0,
                    "fatturato_totale": fatturato,
                    "recensioni": 0,
                    "fonte": "systeme",
                }
    except Exception as e:
        logging.warning(f"[KPI] Systeme.io non disponibile: {e}")

    # ── Fallback: tutti zero ma NON demo mode ─────────────────────────────────
    return {
        "studenti_totali": 0,
        "vendite_mese": 0,
        "lead_generati": 0,
        "conversione_funnel": 0,
        "fatturato_totale": 0,
        "recensioni": 0,
        "fonte": "nessuna",
        "demo_mode": False,
    }


@router.post("/ottimizzazione/genera-report")
async def genera_report_ai(request: GeneraReportRequest):
    """Genera un report AI analizzando i dati dell'Accademia"""
    partner = await get_partner_or_404(request.partner_id)
    
    # Recupera KPI
    kpi_data = await get_partner_kpi_from_systeme(request.partner_id, partner)
    
    # Recupera posizionamento per contesto
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    prompt = f"""Sei un consulente strategico di Evolution PRO. Analizza i dati dell'Accademia Digitale del partner e fornisci un report conciso.

PARTNER: {partner.get('name')}
NICCHIA: {partner.get('niche', 'N/D')}

KPI ATTUALI:
- Studenti totali: {kpi_data.get('studenti_totali', 0)}
- Fatturato mese: €{kpi_data.get('vendite_mese', 0)}
- Lead generati: {kpi_data.get('lead_generati', 0)}
- Conversione funnel: {kpi_data.get('conversione_funnel', 0)}%

POSIZIONAMENTO:
- Studente ideale: {posizionamento.get('step_1_studente_ideale', 'N/D') if posizionamento else 'N/D'}
- Obiettivo: {posizionamento.get('step_2_obiettivo', 'N/D') if posizionamento else 'N/D'}

Genera un report in formato JSON con questa struttura esatta:
{{
  "cosa_funziona": "Una frase su cosa sta funzionando bene",
  "cosa_migliorare": "Una frase sul principale punto di miglioramento",
  "prossima_azione": "L'azione più importante da fare questa settimana"
}}

Se i dati sono a zero, suggerisci azioni per iniziare a generare traffico e lead.
Rispondi SOLO con il JSON, senza altro testo."""

    try:
        llm = await get_llm_chat()
        
        
        response = await llm.send_message(UserMessage(text=prompt))
        response_text = response.strip()
        
        # Parse JSON
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        
        report_content = json.loads(response_text)
        report_content["generato_il"] = datetime.now(timezone.utc).isoformat()
        
        # Salva report
        await db.partner_ottimizzazione.update_one(
            {"partner_id": request.partner_id},
            {
                "$set": {
                    "ultimo_report": report_content,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$setOnInsert": {
                    "partner_id": request.partner_id,
                    "partner_name": partner.get("name"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        # Aggiungi alla history dei report
        await db.partner_ottimizzazione.update_one(
            {"partner_id": request.partner_id},
            {"$push": {"report_history": report_content}}
        )
        
        return {
            "success": True,
            "report": report_content
        }
        
    except Exception as e:
        logging.error(f"Error generating AI report: {e}")
        # Fallback report
        fallback_report = {
            "cosa_funziona": "Il tuo sistema è impostato correttamente.",
            "cosa_migliorare": "Aumenta la visibilità della masterclass sui social.",
            "prossima_azione": "Pubblica 3 contenuti questa settimana parlando del problema che risolvi.",
            "generato_il": datetime.now(timezone.utc).isoformat()
        }
        return {
            "success": True,
            "report": fallback_report,
            "fallback": True
        }


@router.post("/ottimizzazione/salva-azioni")
async def salva_azioni(request: SalvaAzioniRequest):
    """Salva lo stato delle azioni consigliate"""
    await get_partner_or_404(request.partner_id)

    azioni_dict = [a.dict() for a in request.azioni]
    _done = {"completed", "done", "fatto"}
    nuovo_completate = sum(1 for a in azioni_dict if str(a.get("status", "")).lower() in _done)

    prev = await db.partner_ottimizzazione.find_one(
        {"partner_id": request.partner_id}, {"_id": 0, "azioni": 1}
    )
    prev_completate = sum(
        1 for a in (prev or {}).get("azioni", []) if str(a.get("status", "")).lower() in _done
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    set_fields = {"azioni": azioni_dict, "azioni_updated_at": now_iso}
    # Marco: timbra l'ultima azione completata solo quando ne viene chiusa una NUOVA.
    if nuovo_completate > prev_completate:
        set_fields["ultima_azione_completata_at"] = now_iso

    await db.partner_ottimizzazione.update_one(
        {"partner_id": request.partner_id},
        {"$set": set_fields},
        upsert=True
    )

    return {"success": True, "message": "Azioni salvate"}


@router.post("/ottimizzazione/salva-protocollo")
async def salva_protocollo(request: SalvaProtocolloRequest):
    """Salva la checklist settimanale del Protocollo Vendite"""
    await get_partner_or_404(request.partner_id)

    await db.partner_ottimizzazione.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "protocollo_settimana": request.settimana,
                "protocollo_checklist": request.checklist,
                "protocollo_updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )

    return {"success": True, "message": "Protocollo salvato"}



@router.post("/ottimizzazione/crea-caso-studio")
async def crea_caso_studio(request: CreaCasoStudioRequest):
    """Crea il caso studio Evolution PRO per il partner"""
    partner = await get_partner_or_404(request.partner_id)
    
    # Verifica requisiti (10 studenti o €1000)
    kpi_data = await get_partner_kpi_from_systeme(request.partner_id, partner)
    studenti = kpi_data.get("studenti_totali", 0)
    fatturato = kpi_data.get("fatturato_totale", 0)
    
    if studenti < 10 and fatturato < 1000:
        raise HTTPException(
            status_code=400, 
            detail="Requisiti non raggiunti: servono almeno 10 studenti o €1.000 di fatturato"
        )
    
    # Recupera posizionamento per contesto
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    # Genera caso studio
    caso_studio_id = str(uuid.uuid4())
    
    caso_studio = {
        "id": caso_studio_id,
        "partner_id": request.partner_id,
        "partner_name": partner.get("name"),
        "niche": partner.get("niche"),
        "studenti": studenti,
        "fatturato": fatturato,
        "recensioni": kpi_data.get("recensioni", 0),
        "trasformazione": posizionamento.get("step_3_trasformazione") if posizionamento else None,
        "metodo": posizionamento.get("step_4_metodo") if posizionamento else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "draft"  # draft -> published
    }
    
    # Salva caso studio
    await db.casi_studio.insert_one(caso_studio)
    
    # Aggiorna stato partner
    await db.partner_ottimizzazione.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "caso_studio_creato": True,
                "caso_studio_id": caso_studio_id,
                "caso_studio_created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Notifica admin
    await notify_telegram(
        f"🏆 NUOVO CASO STUDIO!\n\n"
        f"👤 {partner.get('name')}\n"
        f"📚 {studenti} studenti\n"
        f"💰 €{fatturato} fatturato\n\n"
        f"ID: {caso_studio_id}"
    )
    
    return {
        "success": True,
        "caso_studio_id": caso_studio_id,
        "message": "Caso studio creato con successo!"
    }


@router.get("/ottimizzazione/caso-studio/{caso_studio_id}")
async def get_caso_studio(caso_studio_id: str):
    """Recupera i dettagli di un caso studio"""
    caso = await db.casi_studio.find_one({"id": caso_studio_id}, {"_id": 0})

    if not caso:
        raise HTTPException(status_code=404, detail="Caso studio non trovato")

    return {
        "success": True,
        "caso_studio": caso
    }


@router.post("/ottimizzazione/caso-studio/genera")
async def genera_caso_studio(request: GeneraCasoStudioRequest):
    """Case-study engine: impacchetta il risultato di UNO studente in voce Ciak.

    Input = risultato grezzo (raccolto via Survey Systeme o inserito dal team). Output =
    caso studio strutturato (headline/prima/dopo/racconto/citazione/prova/cta) salvato come
    bozza, pronto per webinar/contenuti/pagina vendite. Non blocca mai (fallback deterministico).
    """
    partner = await get_partner_or_404(request.partner_id)

    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    partner_ctx = {
        "name": partner.get("name"),
        "niche": partner.get("niche"),
        "metodo": (posizionamento or {}).get("step_4_metodo"),
        "trasformazione": (posizionamento or {}).get("step_3_trasformazione"),
    }
    risultato = {
        "nome": request.nome,
        "prima": request.prima,
        "dopo": request.dopo,
        "citazione": request.citazione,
        "tempo": request.tempo,
        "prova": request.prova,
    }

    from services.case_study_engine import build_case_study
    pacchetto = await build_case_study(partner_ctx, risultato)

    caso_studio_id = str(uuid.uuid4())
    caso_studio = {
        "id": caso_studio_id,
        "partner_id": request.partner_id,
        "partner_name": partner.get("name"),
        "niche": partner.get("niche"),
        "tipo": "studente",
        "input_risultato": {**risultato, "prova_visiva_url": request.prova_visiva_url},
        "pacchetto": pacchetto,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "draft",
    }
    await db.casi_studio.insert_one(caso_studio)

    return {
        "success": True,
        "caso_studio_id": caso_studio_id,
        "pacchetto": pacchetto,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CALENDARIO LANCIO ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class GeneraCalendarioRequest(BaseModel):
    partner_id: str

class ExportCalendarioRequest(BaseModel):
    partner_id: str
    format: str  # pdf, csv, gcal

@router.get("/lancio/calendario/{partner_id}")
async def get_calendario_lancio(partner_id: str):
    """Recupera il calendario di lancio esistente"""
    partner = await get_partner_or_404(partner_id)
    
    lancio = await db.partner_lancio.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    return {
        "success": True,
        "partner_id": partner_id,
        "calendario": lancio.get("calendario", []) if lancio else []
    }


@router.post("/lancio/genera-calendario")
async def genera_calendario_lancio(request: GeneraCalendarioRequest):
    """Genera il calendario editoriale di 30 giorni usando AI"""
    partner = await get_partner_or_404(request.partner_id)
    
    # Recupera posizionamento
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    prompt = f"""Sei un social media strategist esperto di lanci di corsi online.
Genera un calendario editoriale di 30 giorni per il lancio di un videocorso.

PARTNER: {partner.get('name')}
NICCHIA: {partner.get('niche', 'N/D')}

POSIZIONAMENTO:
- Studente ideale: {posizionamento.get('step_1_studente_ideale', 'N/D') if posizionamento else 'N/D'}
- Obiettivo: {posizionamento.get('step_2_obiettivo', 'N/D') if posizionamento else 'N/D'}
- Trasformazione: {posizionamento.get('step_3_trasformazione', 'N/D') if posizionamento else 'N/D'}
- Metodo: {posizionamento.get('step_4_metodo', 'N/D') if posizionamento else 'N/D'}

STRUTTURA:
- Settimana 1 (giorni 1-7): ATTENZIONE - Far emergere il problema
- Settimana 2 (giorni 8-14): AUTORITÀ - Mostrare competenza  
- Settimana 3 (giorni 15-21): COINVOLGIMENTO - Preparare il pubblico
- Settimana 4 (giorni 22-30): LANCIO - Vendere

Per ogni giorno genera:
- giorno: numero (1-30)
- tipo: tipo di contenuto (es. "Storia personale", "Mini lezione", etc.)
- idea: descrizione breve dell'idea
- formato: uno tra "post", "reel", "story", "live", "carousel"
- obiettivo: obiettivo specifico del contenuto

Rispondi SOLO in formato JSON con questa struttura:
{{
  "calendario": [
    {{"giorno": 1, "tipo": "...", "idea": "...", "formato": "post", "obiettivo": "..."}}
  ]
}}"""

    try:
        llm = await get_llm_chat()
        
        
        response = await llm.send_message(UserMessage(text=prompt))
        response_text = response.strip()
        
        # Parse JSON
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        
        calendario_data = json.loads(response_text)
        calendario = calendario_data.get("calendario", [])
        
        # Salva
        await db.partner_lancio.update_one(
            {"partner_id": request.partner_id},
            {
                "$set": {
                    "calendario": calendario,
                    "calendario_generated_at": datetime.now(timezone.utc).isoformat()
                },
                "$setOnInsert": {
                    "partner_id": request.partner_id,
                    "partner_name": partner.get("name"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "calendario": calendario
        }
        
    except Exception as e:
        logging.error(f"Calendario generation error: {e}")
        # Fallback con calendario generico
        fallback_calendario = generate_fallback_calendario()
        
        # Save fallback calendario to database
        await db.partner_lancio.update_one(
            {"partner_id": request.partner_id},
            {
                "$set": {
                    "calendario": fallback_calendario,
                    "calendario_generated_at": datetime.now(timezone.utc).isoformat(),
                    "calendario_fallback": True
                },
                "$setOnInsert": {
                    "partner_id": request.partner_id,
                    "partner_name": partner.get("name"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "calendario": fallback_calendario,
            "fallback": True
        }


def generate_fallback_calendario():
    """Genera un calendario di fallback se l'AI fallisce"""
    settimane = {
        1: {"tema": "Attenzione", "tipi": ["Storia personale", "Errore comune", "Contenuto educativo", "Problema del pubblico", "Statistica shock", "Domanda provocatoria", "Mito da sfatare"]},
        2: {"tema": "Autorità", "tipi": ["Mini lezione", "Case study", "Dietro le quinte", "Testimonianza", "Processo creativo", "Tool che uso", "Lezione appresa"]},
        3: {"tema": "Coinvolgimento", "tipi": ["FAQ", "Risposta a obiezione", "Invito masterclass", "Countdown", "Sneak peek", "Sondaggio", "Q&A"]},
        4: {"tema": "Lancio", "tipi": ["Apertura iscrizioni", "Bonus reveal", "Testimonianza", "Scadenza reminder", "FAQ corso", "Behind the scenes", "Ultimo giorno", "Chiusura", "Risultati"]}
    }
    
    formati = ["post", "reel", "story", "carousel", "post", "reel", "live"]
    calendario = []
    
    for giorno in range(1, 31):
        settimana = min((giorno - 1) // 7 + 1, 4)
        config = settimane[settimana]
        tipo_idx = (giorno - 1) % len(config["tipi"])
        formato_idx = (giorno - 1) % len(formati)
        
        calendario.append({
            "giorno": giorno,
            "tipo": config["tipi"][tipo_idx],
            "idea": f"Contenuto {config['tema'].lower()} - {config['tipi'][tipo_idx]}",
            "formato": formati[formato_idx],
            "obiettivo": f"Obiettivo settimana {settimana}: {config['tema']}"
        })
    
    return calendario


@router.post("/lancio/export-calendario")
async def export_calendario(request: ExportCalendarioRequest):
    """Esporta il calendario in PDF, CSV o Google Calendar"""
    partner = await get_partner_or_404(request.partner_id)
    
    lancio = await db.partner_lancio.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    if not lancio or not lancio.get("calendario"):
        raise HTTPException(status_code=400, detail="Calendario non trovato")
    
    calendario = lancio.get("calendario", [])
    
    if request.format == "csv":
        # Export CSV
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Giorno", "Tipo", "Idea", "Formato", "Obiettivo"])
        
        for g in calendario:
            writer.writerow([g.get("giorno"), g.get("tipo"), g.get("idea"), g.get("formato"), g.get("obiettivo")])
        
        from fastapi.responses import StreamingResponse
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=calendario-lancio-{request.partner_id}.csv"}
        )
    
    elif request.format == "gcal":
        # Export ICS per Google Calendar
        from datetime import timedelta
        
        ics_content = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Evolution PRO//Calendario Lancio//IT\n"
        
        start_date = datetime.now(timezone.utc).replace(hour=9, minute=0, second=0, microsecond=0)
        
        for g in calendario:
            event_date = start_date + timedelta(days=g.get("giorno", 1) - 1)
            date_str = event_date.strftime("%Y%m%dT%H%M%SZ")
            
            ics_content += f"""BEGIN:VEVENT
DTSTART:{date_str}
DTEND:{date_str}
SUMMARY:Giorno {g.get('giorno')} - {g.get('tipo')}
DESCRIPTION:{g.get('idea')} | Formato: {g.get('formato')} | {g.get('obiettivo')}
END:VEVENT
"""
        
        ics_content += "END:VCALENDAR"
        
        from fastapi.responses import Response
        return Response(
            content=ics_content,
            media_type="text/calendar",
            headers={"Content-Disposition": f"attachment; filename=calendario-lancio-{request.partner_id}.ics"}
        )
    
    elif request.format == "pdf":
        # Export PDF
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            import io
            
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            elements = []
            styles = getSampleStyleSheet()
            
            # Title
            title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=20, spaceAfter=20)
            elements.append(Paragraph(f"Calendario Lancio - {partner.get('name')}", title_style))
            elements.append(Spacer(1, 20))
            
            # Table
            data = [["Giorno", "Tipo", "Formato", "Obiettivo"]]
            for g in calendario:
                data.append([
                    str(g.get("giorno")),
                    g.get("tipo", "")[:30],
                    g.get("formato", ""),
                    g.get("obiettivo", "")[:40]
                ])
            
            table = Table(data, colWidths=[50, 150, 80, 200])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F2C418')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
            ]))
            
            elements.append(table)
            doc.build(elements)
            
            buffer.seek(0)
            from fastapi.responses import StreamingResponse
            return StreamingResponse(
                buffer,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=calendario-lancio-{request.partner_id}.pdf"}
            )
            
        except Exception as e:
            logging.error(f"PDF generation error: {e}")
            raise HTTPException(status_code=500, detail="Errore generazione PDF")
    
    else:
        raise HTTPException(status_code=400, detail="Formato non supportato")


# ═══════════════════════════════════════════════════════════════════════════════
# WEBINAR MENSILE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class GeneraWebinarRequest(BaseModel):
    partner_id: str

@router.get("/webinar/{partner_id}")
async def get_webinar(partner_id: str):
    """Recupera i dati del webinar mensile"""
    partner = await get_partner_or_404(partner_id)
    
    webinar = await db.partner_webinar.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    return {
        "success": True,
        "partner_id": partner_id,
        "webinar": webinar.get("webinar") if webinar else None,
        "promozione": webinar.get("promozione") if webinar else None
    }


@router.post("/webinar/genera")
async def genera_webinar(request: GeneraWebinarRequest):
    """Genera titolo, scaletta e contenuti promozionali del webinar"""
    partner = await get_partner_or_404(request.partner_id)
    
    # Recupera posizionamento e corso
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    studente_ideale = posizionamento.get("step_1_studente_ideale", "") if posizionamento else ""
    obiettivo = posizionamento.get("step_2_obiettivo", "") if posizionamento else ""
    trasformazione = posizionamento.get("step_3_trasformazione", "") if posizionamento else ""
    metodo = posizionamento.get("step_4_metodo", "") if posizionamento else ""
    course_structure = posizionamento.get("course_structure", {}) if posizionamento else {}
    
    corso_titolo = course_structure.get("corso_titolo", f"Corso di {partner.get('niche', 'formazione')}")
    
    prompt = f"""Sei un esperto di webinar marketing. Genera i contenuti per un webinar mensile di vendita corso.

PARTNER: {partner.get('name')}
NICCHIA: {partner.get('niche', 'N/D')}

POSIZIONAMENTO:
- Target: {studente_ideale}
- Obiettivo studente: {obiettivo}
- Trasformazione: {trasformazione}
- Metodo: {metodo}

CORSO DA VENDERE: {corso_titolo}

Genera in formato JSON:
{{
  "webinar": {{
    "titolo": "Titolo webinar accattivante basato sul problema del target (max 60 char)",
    "sottotitolo": "Sottotitolo che promette la soluzione"
  }},
  "promozione": {{
    "emails": [
      {{
        "tipo": "Email Invito",
        "oggetto": "Oggetto email invito",
        "corpo": "Testo completo email (200-300 parole)"
      }},
      {{
        "tipo": "Email Reminder",
        "oggetto": "Oggetto reminder",
        "corpo": "Testo reminder (150 parole)"
      }},
      {{
        "tipo": "Email Ultimo Posto",
        "oggetto": "Oggetto urgenza",
        "corpo": "Testo urgenza (100 parole)"
      }}
    ],
    "social": [
      {{
        "tipo": "Post Annuncio",
        "testo": "Post social annuncio webinar (150 parole max)"
      }},
      {{
        "tipo": "Story 1 - Problema",
        "testo": "Testo story sul problema (50 parole)"
      }},
      {{
        "tipo": "Story 2 - Soluzione",
        "testo": "Testo story sulla soluzione (50 parole)"
      }},
      {{
        "tipo": "Story 3 - CTA",
        "testo": "Testo story call to action (30 parole)"
      }}
    ]
  }}
}}

Il titolo webinar deve seguire uno di questi pattern:
- "Perché continui a [problema del target]"
- "I 3 errori che ti impediscono di [risultato]"
- "Come ottenere [risultato] senza [ostacolo]"

Rispondi SOLO con il JSON."""

    try:
        llm = await get_llm_chat()
        
        
        response = await llm.send_message(UserMessage(text=prompt))
        response_text = response.strip()
        
        # Parse JSON
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        
        generated_data = json.loads(response_text)
        webinar_data = generated_data.get("webinar", {})
        promo_data = generated_data.get("promozione", {})
        
    except Exception as e:
        logging.error(f"Webinar generation error: {e}")
        # Fallback
        webinar_data = {
            "titolo": f"Come ottenere risultati nella {partner.get('niche', 'tua nicchia')} senza perdere tempo",
            "sottotitolo": "Scopri il metodo in 3 passi che ha già aiutato decine di persone"
        }
        promo_data = generate_fallback_webinar_promo(partner, webinar_data["titolo"])
    
    # Salva
    await db.partner_webinar.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "webinar": webinar_data,
                "promozione": promo_data,
                "generated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "partner_id": request.partner_id,
                "partner_name": partner.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Notifica admin
    await notify_telegram(
        f"📹 WEBINAR GENERATO\n\n👤 {partner.get('name')}\n📌 {webinar_data.get('titolo', 'N/D')}"
    )
    
    return {
        "success": True,
        "webinar": webinar_data,
        "promozione": promo_data
    }


def generate_fallback_webinar_promo(partner: dict, titolo: str) -> dict:
    """Genera contenuti promozionali fallback"""
    nome = partner.get("name", "")
    niche = partner.get("niche", "il tuo settore")
    
    return {
        "emails": [
            {
                "tipo": "Email Invito",
                "oggetto": f"[Webinar GRATIS] {titolo}",
                "corpo": f"Ciao,\n\nTi invito al mio prossimo webinar gratuito:\n\n\"{titolo}\"\n\nDurante questo evento di 45 minuti scoprirai:\n\n• Il problema principale che blocca la maggior parte delle persone in {niche}\n• I 3 passi del mio metodo per ottenere risultati concreti\n• Un caso studio reale di trasformazione\n\nRiserva il tuo posto gratuito cliccando qui sotto.\n\nA presto,\n{nome}"
            },
            {
                "tipo": "Email Reminder",
                "oggetto": f"Ci sei? Il webinar inizia domani",
                "corpo": f"Ciao,\n\nTi ricordo che domani alle 21:00 inizia il webinar:\n\n\"{titolo}\"\n\nNon mancare, sarà un'occasione unica per scoprire come ottenere risultati concreti.\n\nA domani!\n{nome}"
            },
            {
                "tipo": "Email Ultimo Posto",
                "oggetto": f"⚠️ Ultimi posti disponibili",
                "corpo": f"I posti per il webinar stanno per esaurirsi.\n\nSe vuoi scoprire il mio metodo per {niche}, questa è l'ultima occasione.\n\nRiserva il tuo posto ora.\n\n{nome}"
            }
        ],
        "social": [
            {
                "tipo": "Post Annuncio",
                "testo": f"🎯 WEBINAR GRATUITO\n\n\"{titolo}\"\n\nScopri i 3 passi per ottenere risultati concreti in {niche}.\n\n📅 Data: prossimamente\n⏰ Durata: 45 minuti\n💰 Costo: GRATIS\n\nLink in bio per riservare il tuo posto."
            },
            {
                "tipo": "Story 1 - Problema",
                "testo": f"❌ Ti senti bloccato?\n\nNel mio prossimo webinar ti spiego perché e come uscirne."
            },
            {
                "tipo": "Story 2 - Soluzione",
                "testo": f"✅ Esiste un metodo\n\nIn 45 minuti ti mostro i 3 passi che hanno funzionato per me e per i miei studenti."
            },
            {
                "tipo": "Story 3 - CTA",
                "testo": f"👉 Link in bio\n\nIscriviti GRATIS al webinar prima che i posti finiscano!"
            }
        ]
    }



# ═══════════════════════════════════════════════════════════════════════════════
# FUNNEL COMPLETE ENDPOINTS (Domain, Legal, Full State)
# ═══════════════════════════════════════════════════════════════════════════════

class FunnelApprovePagesRequest(BaseModel):
    partner_id: str
    page_id: str

class FunnelApproveContentRequest(BaseModel):
    partner_id: str

class FunnelSaveDomainRequest(BaseModel):
    partner_id: str
    domain: str
    email: Optional[str] = None

class FunnelVerifyDomainRequest(BaseModel):
    partner_id: str

class FunnelGenerateLegalRequest(BaseModel):
    partner_id: str

class FunnelApproveLegalRequest(BaseModel):
    partner_id: str
    legal_id: str


@router.get("/funnel-complete/{partner_id}")
async def get_funnel_complete(partner_id: str):
    """Recupera tutti i dati del funnel per la pagina completa"""
    partner = await get_partner_or_404(partner_id)
    
    funnel = await db.partner_funnel.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    # Recupera posizionamento per contesto
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    return {
        "success": True,
        "partner_id": partner_id,
        "partner_name": partner.get("name"),
        "funnel_content": funnel.get("content") if funnel else None,
        "page_states": funnel.get("page_states", {}) if funnel else {},
        "content_approved": funnel.get("content_approved", False) if funnel else False,
        "domain": funnel.get("domain") if funnel else None,
        "legal": funnel.get("legal", {}) if funnel else {},
        "publish_state": funnel.get("publish_state", "idle") if funnel else "idle",
        "course_structure": posizionamento.get("course_structure") if posizionamento else None
    }


@router.post("/funnel/approve-page")
async def approve_funnel_page(request: FunnelApprovePagesRequest):
    """Approva una singola pagina del funnel"""
    await get_partner_or_404(request.partner_id)
    
    await db.partner_funnel.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                f"page_states.{request.page_id}": "approved",
                f"page_states.{request.page_id}_approved_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": f"Pagina {request.page_id} approvata"}


@router.post("/funnel/approve-content")
async def approve_funnel_content(request: FunnelApproveContentRequest):
    """Approva tutti i contenuti del funnel"""
    await get_partner_or_404(request.partner_id)
    
    await db.partner_funnel.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "content_approved": True,
                "content_approved_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Contenuti approvati"}


@router.post("/funnel/save-domain")
async def save_funnel_domain(request: FunnelSaveDomainRequest):
    """Salva la configurazione del dominio"""
    partner = await get_partner_or_404(request.partner_id)
    
    domain_data = {
        "domain": request.domain,
        "email": request.email,
        "status": "inserted",
        "inserted_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partner_funnel.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "domain": domain_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "partner_id": request.partner_id,
                "partner_name": partner.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "domain": domain_data,
        "message": "Dominio salvato. Configura i record DNS e verifica."
    }


@router.post("/funnel/verify-domain")
async def verify_funnel_domain(request: FunnelVerifyDomainRequest):
    """Verifica la configurazione DNS del dominio"""
    partner = await get_partner_or_404(request.partner_id)
    
    funnel = await db.partner_funnel.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    if not funnel or not funnel.get("domain"):
        raise HTTPException(status_code=400, detail="Nessun dominio configurato")
    
    domain = funnel.get("domain", {}).get("domain")
    
    # In produzione, qui verificheremmo il DNS con un lookup
    # Per ora simuliamo la verifica come successo dopo inserimento
    import socket
    is_verified = False
    
    try:
        # Tenta una risoluzione DNS
        socket.gethostbyname(domain)
        is_verified = True
    except socket.gaierror:
        # DNS non ancora propagato
        is_verified = False
    
    new_status = "verified" if is_verified else "pending_dns"
    
    domain_data = funnel.get("domain", {})
    domain_data["status"] = new_status
    if is_verified:
        domain_data["verified_at"] = datetime.now(timezone.utc).isoformat()
    else:
        domain_data["last_check"] = datetime.now(timezone.utc).isoformat()
    
    await db.partner_funnel.update_one(
        {"partner_id": request.partner_id},
        {"$set": {"domain": domain_data}}
    )
    
    return {
        "success": True,
        "domain": domain_data,
        "verified": is_verified,
        "message": "Dominio verificato!" if is_verified else "DNS non ancora propagato. Riprova tra qualche ora."
    }


@router.post("/funnel/generate-legal")
async def generate_funnel_legal(request: FunnelGenerateLegalRequest):
    """Genera tutte le pagine legali usando i dati del partner"""
    partner = await get_partner_or_404(request.partner_id)
    
    funnel = await db.partner_funnel.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    domain = funnel.get("domain", {}).get("domain", "tuodominio.it") if funnel else "tuodominio.it"
    email = funnel.get("domain", {}).get("email", f"info@{domain}") if funnel else f"info@{domain}"
    partner_name = partner.get("name", "Il Titolare")
    
    # Templates delle pagine legali
    legal_templates = {
        "privacy": {
            "title": "Privacy Policy",
            "content": f"""INFORMATIVA SULLA PRIVACY
            
Ultimo aggiornamento: {datetime.now(timezone.utc).strftime('%d/%m/%Y')}

TITOLARE DEL TRATTAMENTO
{partner_name}
Email: {email}
Sito: {domain}

TIPOLOGIE DI DATI RACCOLTI
Il Titolare raccoglie, direttamente o tramite terze parti, i seguenti Dati Personali:
- Dati di contatto: nome, email, numero di telefono
- Dati di utilizzo: pagine visitate, tempo di permanenza
- Dati tecnici: indirizzo IP, browser, sistema operativo

FINALITÀ DEL TRATTAMENTO
I Dati dell'Utente sono raccolti per:
- Fornire il servizio richiesto
- Inviare comunicazioni commerciali (previo consenso)
- Analizzare l'utilizzo del sito

BASE GIURIDICA
- Esecuzione contrattuale
- Consenso dell'interessato
- Legittimo interesse del Titolare

DIRITTI DELL'INTERESSATO
L'Utente può esercitare i seguenti diritti:
- Accesso ai propri dati
- Rettifica o cancellazione
- Limitazione del trattamento
- Opposizione al trattamento
- Portabilità dei dati

Per esercitare i propri diritti, contattare: {email}

CONSERVAZIONE DEI DATI
I dati sono conservati per il tempo necessario alle finalità indicate."""
        },
        "cookie": {
            "title": "Cookie Policy",
            "content": f"""COOKIE POLICY

Ultimo aggiornamento: {datetime.now(timezone.utc).strftime('%d/%m/%Y')}

COSA SONO I COOKIE
I cookie sono piccoli file di testo che vengono memorizzati sul dispositivo dell'utente durante la navigazione.

COOKIE UTILIZZATI
1. Cookie Tecnici (necessari)
   - Session cookie per il funzionamento del sito
   - Cookie di preferenze

2. Cookie Analitici
   - Google Analytics (statistiche anonime)

3. Cookie di Marketing (previo consenso)
   - Facebook Pixel
   - Google Ads

GESTIONE DEI COOKIE
L'utente può gestire le preferenze sui cookie tramite il banner mostrato al primo accesso o dalle impostazioni del browser.

DISABILITAZIONE
Per disabilitare i cookie, modificare le impostazioni del browser:
- Chrome: Impostazioni > Privacy > Cookie
- Firefox: Opzioni > Privacy > Cookie
- Safari: Preferenze > Privacy

CONTATTI
Per informazioni: {email}
Sito: {domain}"""
        },
        "terms": {
            "title": "Termini e Condizioni",
            "content": f"""TERMINI E CONDIZIONI DI SERVIZIO

Ultimo aggiornamento: {datetime.now(timezone.utc).strftime('%d/%m/%Y')}

1. ACCETTAZIONE DEI TERMINI
Utilizzando questo sito web e i suoi servizi, l'utente accetta i presenti Termini e Condizioni.

2. SERVIZI OFFERTI
{partner_name} offre:
- Corsi online e materiale formativo
- Masterclass e webinar
- Servizi di consulenza

3. PAGAMENTI E RIMBORSI
- I pagamenti sono processati tramite provider sicuri
- Garanzia soddisfatti o rimborsati entro 14 giorni dall'acquisto
- Per richiedere un rimborso, contattare: {email}

4. PROPRIETÀ INTELLETTUALE
Tutti i contenuti (video, testi, grafiche) sono di proprietà di {partner_name} e protetti da copyright.
È vietata la riproduzione senza autorizzazione.

5. LIMITAZIONE DI RESPONSABILITÀ
I risultati possono variare. I contenuti sono forniti a scopo educativo e non costituiscono consulenza professionale.

6. MODIFICHE AI TERMINI
Il Titolare si riserva di modificare i presenti Termini. Le modifiche saranno comunicate via email.

7. CONTATTI
{partner_name}
Email: {email}
Sito: {domain}

8. LEGGE APPLICABILE
I presenti Termini sono regolati dalla legge italiana."""
        },
        "disclaimer": {
            "title": "Disclaimer",
            "content": f"""DISCLAIMER - ESCLUSIONE DI RESPONSABILITÀ

Ultimo aggiornamento: {datetime.now(timezone.utc).strftime('%d/%m/%Y')}

INFORMAZIONI GENERALI
Questo sito web è gestito da {partner_name}.

NESSUNA GARANZIA DI RISULTATO
I contenuti formativi sono forniti a scopo educativo. I risultati individuali possono variare in base a molteplici fattori.

TESTIMONIANZE
Le testimonianze presenti sul sito rappresentano esperienze individuali e non garantiscono risultati simili.

CONSULENZA PROFESSIONALE
I contenuti non sostituiscono consulenza professionale specifica. Per decisioni importanti, consultare professionisti qualificati.

LINK ESTERNI
Il sito può contenere link a siti esterni. Non siamo responsabili del contenuto di tali siti.

ACCURATEZZA DELLE INFORMAZIONI
Ci impegniamo a fornire informazioni accurate, ma non garantiamo che siano sempre aggiornate o prive di errori.

CONTATTI
Per domande: {email}"""
        }
    }
    
    # Salva tutte le pagine legali
    legal_data = {}
    for page_id, template in legal_templates.items():
        legal_data[page_id] = {
            "title": template["title"],
            "content": template["content"],
            "generated": True,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "approved": False
        }
    
    await db.partner_funnel.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "legal": legal_data,
                "legal_generated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "partner_id": request.partner_id,
                "partner_name": partner.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "legal": legal_data,
        "message": "Pagine legali generate"
    }


@router.post("/funnel/approve-legal")
async def approve_funnel_legal(request: FunnelApproveLegalRequest):
    """Approva una singola pagina legale"""
    await get_partner_or_404(request.partner_id)
    
    await db.partner_funnel.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                f"legal.{request.legal_id}.approved": True,
                f"legal.{request.legal_id}.approved_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": f"Pagina {request.legal_id} approvata"}


class AdminFunnelUnlockRequest(BaseModel):
    partner_id: str
    new_domain: Optional[str] = None
    approve_all_legal: bool = True
    set_published: bool = False


@router.post("/funnel/admin-unlock")
async def admin_unlock_funnel(request: AdminFunnelUnlockRequest):
    """
    Admin endpoint to quickly unlock a funnel:
    - Replace test domain with real domain
    - Approve all legal documents
    - Generate legal docs if missing
    - Optionally set as published
    """
    partner = await get_partner_or_404(request.partner_id)
    partner_name = partner.get("name", "Partner")
    
    funnel = await db.partner_funnel.find_one({"partner_id": request.partner_id})
    
    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now, "admin_unlocked_at": now}
    
    # 1. Update domain if provided
    if request.new_domain:
        updates["domain"] = {
            "domain": request.new_domain,
            "email": f"info@{request.new_domain}",
            "status": "verified",
            "inserted_at": now,
            "admin_override": True
        }
    
    # 2. Generate and approve legal docs if needed
    if request.approve_all_legal:
        domain = request.new_domain or (funnel.get("domain", {}).get("domain", "tuodominio.it") if funnel else "tuodominio.it")
        email = f"info@{domain}"
        
        legal_docs = {
            "privacy": {
                "title": "Privacy Policy",
                "generated": True,
                "approved": True,
                "approved_at": now,
                "content": f"Privacy Policy per {partner_name} - {domain}"
            },
            "cookie": {
                "title": "Cookie Policy",
                "generated": True,
                "approved": True,
                "approved_at": now,
                "content": f"Cookie Policy per {partner_name} - {domain}"
            },
            "terms": {
                "title": "Termini e Condizioni",
                "generated": True,
                "approved": True,
                "approved_at": now,
                "content": f"Termini e Condizioni per {partner_name} - {domain}"
            },
            "disclaimer": {
                "title": "Disclaimer",
                "generated": True,
                "approved": True,
                "approved_at": now,
                "content": f"Disclaimer per {partner_name} - {domain}"
            }
        }
        updates["legal"] = legal_docs
        updates["is_generated"] = True
    
    # 3. Set published if requested
    if request.set_published:
        updates["is_published"] = True
        updates["published_at"] = now
    
    # Update or create funnel record
    if funnel:
        await db.partner_funnel.update_one(
            {"partner_id": request.partner_id},
            {"$set": updates}
        )
    else:
        await db.partner_funnel.insert_one({
            "partner_id": request.partner_id,
            "created_at": now,
            **updates
        })
    
    # Log admin action
    await db.admin_logs.insert_one({
        "type": "funnel_admin_unlock",
        "partner_id": request.partner_id,
        "partner_name": partner_name,
        "new_domain": request.new_domain,
        "approved_legal": request.approve_all_legal,
        "set_published": request.set_published,
        "created_at": now
    })
    
    return {
        "success": True,
        "partner_id": request.partner_id,
        "partner_name": partner_name,
        "new_domain": request.new_domain,
        "legal_approved": request.approve_all_legal,
        "is_published": request.set_published,
        "message": f"Funnel sbloccato per {partner_name}"
    }


@router.get("/funnel/legal-pdf/{partner_id}/{page_id}")
async def download_legal_pdf(partner_id: str, page_id: str):
    """Genera e scarica il PDF di una pagina legale"""
    partner = await get_partner_or_404(partner_id)
    
    funnel = await db.partner_funnel.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )
    
    if not funnel or not funnel.get("legal", {}).get(page_id):
        raise HTTPException(status_code=404, detail="Pagina legale non trovata")
    
    legal_page = funnel["legal"][page_id]
    
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_JUSTIFY
        import io
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=50, bottomMargin=50)
        elements = []
        styles = getSampleStyleSheet()
        
        # Title style
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30
        )
        
        # Body style
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=12
        )
        
        # Add title
        elements.append(Paragraph(legal_page.get("title", "Documento Legale"), title_style))
        elements.append(Spacer(1, 20))
        
        # Add content (split by newlines)
        content = legal_page.get("content", "")
        for paragraph in content.split("\n\n"):
            if paragraph.strip():
                elements.append(Paragraph(paragraph.strip().replace("\n", "<br/>"), body_style))
        
        doc.build(elements)
        buffer.seek(0)
        
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={page_id}-{partner_id}.pdf"
            }
        )
        
    except Exception as e:
        logging.error(f"PDF generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione PDF: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD MANAGEMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class LeadFilterRequest(BaseModel):
    partner_id: str
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    funnel_origin: Optional[str] = None
    status: Optional[str] = None
    page: int = 1
    limit: int = 50


@router.get("/leads/{partner_id}")
async def get_partner_leads(
    partner_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    funnel_origin: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """Recupera tutti i lead del partner con filtri opzionali"""
    partner = await get_partner_or_404(partner_id)
    
    # Build query
    query = {"partner_id": partner_id}
    
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_to
        else:
            query["created_at"] = {"$lte": date_to}
    if funnel_origin:
        query["funnel_origin"] = funnel_origin
    if status:
        query["status"] = status
    
    # Get total count
    total = await db.partner_leads.count_documents(query)
    
    # Get leads with pagination
    skip = (page - 1) * limit
    leads_cursor = db.partner_leads.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    leads = await leads_cursor.to_list(length=limit)
    
    # Get unique funnel origins for filter dropdown
    funnel_origins = await db.partner_leads.distinct("funnel_origin", {"partner_id": partner_id})
    
    # Get stats
    stats = {
        "total_leads": total,
        "leads_today": await db.partner_leads.count_documents({
            "partner_id": partner_id,
            "created_at": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
        }),
        "leads_this_month": await db.partner_leads.count_documents({
            "partner_id": partner_id,
            "created_at": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-01")}
        }),
        "by_status": {}
    }
    
    # Count by status
    for s in ["new", "contacted", "qualified", "converted", "lost"]:
        stats["by_status"][s] = await db.partner_leads.count_documents({
            "partner_id": partner_id,
            "status": s
        })
    
    return {
        "success": True,
        "partner_id": partner_id,
        "leads": leads,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "funnel_origins": funnel_origins,
        "stats": stats
    }


@router.post("/leads/export-csv/{partner_id}")
async def export_leads_csv(partner_id: str):
    """Esporta tutti i lead in formato CSV"""
    partner = await get_partner_or_404(partner_id)
    
    # Get all leads
    leads_cursor = db.partner_leads.find(
        {"partner_id": partner_id}, {"_id": 0}
    ).sort("created_at", -1)
    
    leads = await leads_cursor.to_list(length=10000)
    
    import csv
    import io
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Nome", "Email", "Telefono", "Data", "Origine Funnel", "Status", "Note"
    ])
    
    # Data
    for lead in leads:
        writer.writerow([
            lead.get("name", ""),
            lead.get("email", ""),
            lead.get("phone", ""),
            lead.get("created_at", ""),
            lead.get("funnel_origin", ""),
            lead.get("status", ""),
            lead.get("notes", "")
        ])
    
    output.seek(0)
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=leads-{partner_id}-{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
        }
    )


@router.post("/leads/update-status")
async def update_lead_status(partner_id: str, lead_id: str, status: str):
    """Aggiorna lo status di un lead"""
    await get_partner_or_404(partner_id)
    
    valid_statuses = ["new", "contacted", "qualified", "converted", "lost"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status non valido. Usa: {valid_statuses}")
    
    result = await db.partner_leads.update_one(
        {"partner_id": partner_id, "id": lead_id},
        {
            "$set": {
                "status": status,
                "status_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    return {"success": True, "message": f"Status aggiornato a {status}"}


@router.post("/leads/add-note")
async def add_lead_note(partner_id: str, lead_id: str, note: str):
    """Aggiunge una nota a un lead"""
    await get_partner_or_404(partner_id)
    
    result = await db.partner_leads.update_one(
        {"partner_id": partner_id, "id": lead_id},
        {
            "$set": {
                "notes": note,
                "notes_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    return {"success": True, "message": "Nota aggiunta"}


# Webhook per ricevere lead da Systeme.io
@router.post("/leads/webhook/{partner_id}")
async def receive_lead_webhook(partner_id: str, data: dict):
    """Webhook per ricevere lead da Systeme.io o altri sistemi"""
    partner = await get_partner_or_404(partner_id)
    
    lead_data = {
        "id": str(uuid.uuid4()),
        "partner_id": partner_id,
        "name": data.get("name", data.get("first_name", "")),
        "email": data.get("email", ""),
        "phone": data.get("phone", data.get("phone_number", "")),
        "funnel_origin": data.get("funnel_origin", data.get("tag", "optin")),
        "status": "new",
        "source": data.get("source", "systeme.io"),
        "raw_data": data,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check for duplicate
    existing = await db.partner_leads.find_one({
        "partner_id": partner_id,
        "email": lead_data["email"]
    })
    
    if existing:
        # Update existing lead with new interaction
        await db.partner_leads.update_one(
            {"partner_id": partner_id, "email": lead_data["email"]},
            {
                "$set": {"last_interaction": datetime.now(timezone.utc).isoformat()},
                "$push": {"interactions": {"timestamp": datetime.now(timezone.utc).isoformat(), "type": data.get("type", "optin")}}
            }
        )
        return {"success": True, "message": "Lead esistente aggiornato", "lead_id": existing.get("id")}
    
    # Insert new lead
    await db.partner_leads.insert_one(lead_data)
    
    # Notify admin
    await notify_telegram(
        f"🎯 NUOVO LEAD!\n\n"
        f"👤 Partner: {partner.get('name')}\n"
        f"📧 {lead_data['email']}\n"
        f"📍 Origine: {lead_data['funnel_origin']}"
    )
    
    return {"success": True, "message": "Lead registrato", "lead_id": lead_data["id"]}


# ═══════════════════════════════════════════════════════════════════════════════
# PERCORSO VELOCE — Go Live in 21 Giorni
# ═══════════════════════════════════════════════════════════════════════════════

class PercorsoVeloceActivateRequest(BaseModel):
    partner_id: str

class PercorsoVeloceChecklistRequest(BaseModel):
    partner_id: str
    day: int
    checklist: List[Dict[str, Any]]


PERCORSO_VELOCE_PHASES = [
    {
        "id": "posizionamento",
        "name": "Posizionamento",
        "day_start": 1,
        "day_end": 2,
        "daily_tasks": {
            1: [
                {"id": "definisci_target", "label": "Definisci il tuo studente ideale", "desc": "Chi vuoi aiutare? Che problema ha?"},
                {"id": "definisci_promessa", "label": "Scrivi la tua promessa", "desc": "Quale trasformazione offri?"},
                {"id": "scegli_nome", "label": "Scegli il nome del tuo corso", "desc": "Deve essere chiaro e specifico"},
            ],
            2: [
                {"id": "valida_posizionamento", "label": "Valida il posizionamento", "desc": "Conferma target + promessa + nome"},
                {"id": "prepara_bio", "label": "Prepara la tua bio professionale", "desc": "Chi sei e perche sei credibile"},
                {"id": "approva_posizionamento", "label": "Approva e passa alla fase successiva", "desc": "Blocca il posizionamento definitivo"},
            ],
        },
    },
    {
        "id": "webinar",
        "name": "Webinar / Masterclass",
        "day_start": 3,
        "day_end": 7,
        "daily_tasks": {
            3: [
                {"id": "scaletta_webinar", "label": "Crea la scaletta del webinar", "desc": "6 blocchi: hook, problema, soluzione, metodo, offerta, CTA"},
                {"id": "definisci_offerta", "label": "Definisci l'offerta", "desc": "Prezzo, bonus, garanzia, urgenza"},
            ],
            4: [
                {"id": "scrivi_slide", "label": "Prepara le slide", "desc": "Usa il template fornito, personalizza i contenuti"},
                {"id": "prepara_obiezioni", "label": "Prepara le risposte alle obiezioni", "desc": "Le 5 obiezioni piu comuni del tuo target"},
            ],
            5: [
                {"id": "registra_prova", "label": "Registra una prova del webinar", "desc": "Fai un run-through completo, cronometra"},
                {"id": "ottimizza_presentazione", "label": "Ottimizza la presentazione", "desc": "Taglia le parti lente, rafforza l'offerta"},
            ],
            6: [
                {"id": "crea_avatar", "label": "Configura avatar AI (opzionale)", "desc": "Se vuoi, usa l'avatar AI per la presentazione"},
                {"id": "finalizza_webinar", "label": "Finalizza il webinar", "desc": "Versione definitiva pronta per il live"},
            ],
            7: [
                {"id": "testa_piattaforma", "label": "Testa la piattaforma live", "desc": "Prova audio, video, condivisione schermo"},
                {"id": "approva_webinar", "label": "Approva il webinar", "desc": "Tutto pronto per il lancio"},
            ],
        },
    },
    {
        "id": "funnel",
        "name": "Funnel",
        "day_start": 8,
        "day_end": 10,
        "daily_tasks": {
            8: [
                {"id": "crea_landing", "label": "Crea la landing page", "desc": "Headline + promessa + CTA iscrizione webinar"},
                {"id": "crea_thankyou", "label": "Crea la thank you page", "desc": "Conferma iscrizione + istruzioni"},
            ],
            9: [
                {"id": "crea_email_sequence", "label": "Crea la sequenza email", "desc": "Conferma + reminder + replay + offerta"},
                {"id": "collega_pagamento", "label": "Collega il sistema di pagamento", "desc": "Stripe o PayPal configurato"},
            ],
            10: [
                {"id": "testa_funnel", "label": "Testa tutto il funnel", "desc": "Iscrizione → email → webinar → pagamento"},
                {"id": "pubblica_funnel", "label": "Pubblica il funnel", "desc": "Il funnel e LIVE. Pronto per ricevere traffico"},
            ],
        },
    },
    {
        "id": "traffico",
        "name": "Traffico",
        "day_start": 11,
        "day_end": 14,
        "daily_tasks": {
            11: [
                {"id": "crea_contenuto_1", "label": "Crea 3 contenuti social", "desc": "Post/reel collegati alla landing page"},
                {"id": "pubblica_contenuto_1", "label": "Pubblica il primo contenuto", "desc": "Inizia a portare traffico organico"},
            ],
            12: [
                {"id": "configura_ads", "label": "Configura le ads", "desc": "Target, budget, creativita, copy"},
                {"id": "lancia_ads", "label": "Lancia la prima campagna", "desc": "Budget minimo, testa 2-3 creativita"},
            ],
            13: [
                {"id": "pubblica_contenuto_2", "label": "Pubblica altri contenuti", "desc": "Costanza: un contenuto al giorno"},
                {"id": "promuovi_webinar", "label": "Promuovi il webinar", "desc": "Condividi il link ovunque"},
            ],
            14: [
                {"id": "analizza_primi_dati", "label": "Analizza i primi risultati", "desc": "Visite, iscrizioni, costo per lead"},
                {"id": "ottimizza_campagna", "label": "Ottimizza la campagna", "desc": "Spegni cio che non funziona, scala cio che funziona"},
            ],
        },
    },
    {
        "id": "webinar_live",
        "name": "Webinar Live",
        "day_start": 15,
        "day_end": 21,
        "daily_tasks": {
            15: [
                {"id": "conferma_data", "label": "Conferma la data del webinar", "desc": "Scegli giorno e ora definitivi"},
                {"id": "invia_inviti", "label": "Invia gli inviti", "desc": "Email a tutti gli iscritti + reminder"},
            ],
            16: [
                {"id": "continua_traffico", "label": "Continua a portare traffico", "desc": "Non fermarti: contenuti + ads ogni giorno"},
                {"id": "prepara_bonus_live", "label": "Prepara un bonus per chi partecipa live", "desc": "Incentivo per la partecipazione diretta"},
            ],
            17: [
                {"id": "reminder_iscritti", "label": "Invia reminder agli iscritti", "desc": "Email + messaggio social 48h prima"},
                {"id": "prova_tecnica", "label": "Fai una prova tecnica finale", "desc": "Audio, video, slide, link pagamento"},
            ],
            18: [
                {"id": "reminder_24h", "label": "Reminder 24h prima", "desc": "Ultimo messaggio: domani e il giorno"},
                {"id": "preparati", "label": "Preparati mentalmente", "desc": "Ripassa la scaletta, rilassati"},
            ],
            19: [
                {"id": "vai_live", "label": "VAI LIVE", "desc": "Il tuo primo webinar dal vivo. Ce la fai."},
                {"id": "invia_replay", "label": "Invia il replay", "desc": "Email con il link del replay a chi non era presente"},
            ],
            20: [
                {"id": "followup_partecipanti", "label": "Follow-up ai partecipanti", "desc": "Email con offerta speciale per chi ha partecipato"},
                {"id": "followup_assenti", "label": "Follow-up agli assenti", "desc": "Email con replay + offerta limitata"},
            ],
            21: [
                {"id": "chiudi_lancio", "label": "Chiudi il lancio", "desc": "Ultimo messaggio: offerta in scadenza"},
                {"id": "analizza_risultati", "label": "Analizza i risultati", "desc": "Iscritti, partecipanti, vendite, fatturato"},
            ],
        },
    },
]


@router.post("/percorso-veloce/activate")
async def activate_percorso_veloce(request: PercorsoVeloceActivateRequest):
    """Attiva il Percorso Veloce per un partner"""
    partner = await get_partner_or_404(request.partner_id)

    await db.percorso_veloce.update_one(
        {"partner_id": request.partner_id},
        {
            "$set": {
                "partner_id": request.partner_id,
                "activated_at": datetime.now(timezone.utc).isoformat(),
                "current_day": 1,
                "status": "active",
                "checklists": {},
            },
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )

    return {"success": True, "message": "Percorso Veloce attivato", "day": 1}


@router.get("/percorso-veloce/{partner_id}")
async def get_percorso_veloce(partner_id: str):
    """Recupera stato del Percorso Veloce"""
    await get_partner_or_404(partner_id)

    record = await db.percorso_veloce.find_one(
        {"partner_id": partner_id}, {"_id": 0}
    )

    if not record:
        return {"success": True, "active": False}

    activated_at = record.get("activated_at")
    current_day = 1
    if activated_at:
        try:
            start = datetime.fromisoformat(activated_at.replace("Z", "+00:00"))
            diff = (datetime.now(timezone.utc) - start).days
            current_day = min(max(diff + 1, 1), 21)
        except Exception:
            current_day = record.get("current_day", 1)

    # Determine current phase
    current_phase = None
    for phase in PERCORSO_VELOCE_PHASES:
        if phase["day_start"] <= current_day <= phase["day_end"]:
            current_phase = phase["id"]
            break
    if not current_phase:
        current_phase = "webinar_live"

    # Get today's tasks
    today_tasks = []
    for phase in PERCORSO_VELOCE_PHASES:
        if current_day in phase["daily_tasks"]:
            today_tasks = phase["daily_tasks"][current_day]
            break

    # Get saved checklist for today
    checklists = record.get("checklists", {})
    saved_today = checklists.get(str(current_day), [])

    return {
        "success": True,
        "active": True,
        "current_day": current_day,
        "current_phase": current_phase,
        "status": "completed" if current_day > 21 else record.get("status", "active"),
        "activated_at": activated_at,
        "phases": [
            {
                "id": p["id"],
                "name": p["name"],
                "day_start": p["day_start"],
                "day_end": p["day_end"],
                "is_current": p["id"] == current_phase,
                "is_completed": current_day > p["day_end"],
            }
            for p in PERCORSO_VELOCE_PHASES
        ],
        "today_tasks": today_tasks,
        "today_checklist": saved_today,
        "checklists": checklists,
    }


@router.post("/percorso-veloce/save-checklist")
async def save_percorso_veloce_checklist(request: PercorsoVeloceChecklistRequest):
    """Salva checklist giornaliera del Percorso Veloce"""
    await get_partner_or_404(request.partner_id)

    await db.percorso_veloce.update_one(
        {"partner_id": request.partner_id},
        {"$set": {f"checklists.{request.day}": request.checklist}},
    )

    return {"success": True, "message": "Checklist salvata"}


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD OPERATIVA — Vista Team
# ═══════════════════════════════════════════════════════════════════════════════

PHASE_LABELS = {
    "F0": "Onboarding",
    "F1": "Posizionamento",
    "F2": "Funnel Light",
    "F3": "Masterclass",
    "F4": "Videocorso",
    "F5": "Funnel di Vendita",
    "F6": "Lancio",
    "F7": "Post-Lancio",
    "F8": "Accademia Live",
    "F9": "Scaling",
    "F10": "Accademia Matura",
}

PHASE_ORDER = ["F0", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10"]


def compute_risk(days_in_step, phase):
    """Calcola il livello di rischio basato sui giorni nello step"""
    # Fasi iniziali: tolleranza più bassa
    if phase in ("F1", "F2", "F3"):
        if days_in_step > 14:
            return "bloccato"
        if days_in_step > 7:
            return "rallentato"
        return "in_linea"
    # Fasi avanzate: tolleranza più alta
    if days_in_step > 30:
        return "bloccato"
    if days_in_step > 14:
        return "rallentato"
    return "in_linea"


def compute_execution_level(modules, phase):
    """Calcola il livello di esecuzione"""
    if not modules:
        return "basso"
    done = sum(1 for m in modules if m)
    total = len(modules)
    if total == 0:
        return "basso"
    ratio = done / total
    phase_idx = PHASE_ORDER.index(phase) if phase in PHASE_ORDER else 0
    expected_ratio = max(0.1, phase_idx / 10)

    if ratio >= expected_ratio:
        return "alto"
    if ratio >= expected_ratio * 0.6:
        return "medio"
    return "basso"


def get_suggested_action(risk, phase, days_in_step, execution_level):
    """Genera l'azione consigliata basata sullo stato"""
    if risk == "bloccato":
        if phase in ("F1", "F2"):
            return "Contattare il partner: potrebbe aver bisogno di supporto per completare il posizionamento"
        if phase in ("F3", "F4"):
            return "Verificare se il partner ha difficolta tecniche con la produzione del corso o del funnel"
        return "Chiamata urgente: il partner e fermo da troppo tempo"

    if risk == "rallentato":
        if execution_level == "basso":
            return "Inviare reminder motivazionale e proporre una call di supporto"
        return "Follow-up leggero: verificare se ci sono ostacoli"

    # in_linea
    if phase in ("F5", "F6"):
        return "Monitorare i risultati del lancio e preparare l'ottimizzazione"
    if phase in ("F8", "F9", "F10"):
        return "Proporre Growth System per scalare i risultati"
    return "Nessuna azione richiesta: il partner sta procedendo bene"


@router.get("/dashboard-operativa")
async def get_dashboard_operativa():
    """Dashboard operativa per il team: stato di tutti i partner"""
    partners = await db.partners.find({}, {"_id": 0}).to_list(200)

    # Fetch journey data for each partner
    journey_data = {}
    async for doc in db.partner_journey.find({}, {"_id": 0}):
        pid = doc.get("partner_id")
        if pid:
            journey_data[pid] = doc

    # Fetch percorso veloce data
    pv_data = {}
    async for doc in db.percorso_veloce.find({}, {"_id": 0}):
        pid = doc.get("partner_id")
        if pid:
            pv_data[pid] = doc

    now = datetime.now(timezone.utc)
    results = []

    for p in partners:
        pid = str(p.get("id", ""))
        phase = p.get("phase", "F1")
        modules = p.get("modules", [0] * 10)
        name = p.get("name", "")
        niche = p.get("niche", "")

        # Compute days in step
        journey = journey_data.get(pid, {})
        last_phase_change = journey.get("last_phase_change") or journey.get("updated_at") or p.get("contract", "")

        days_in_step = 0
        last_advancement = None
        if isinstance(last_phase_change, str) and last_phase_change:
            try:
                dt = datetime.fromisoformat(last_phase_change.replace("Z", "+00:00"))
                days_in_step = (now - dt).days
                last_advancement = last_phase_change
            except Exception:
                days_in_step = 0

        # Check if there's a more recent step-specific date
        for step_key in ["posizionamento", "masterclass", "videocorso", "funnel", "lancio"]:
            step_data = journey.get(step_key, {})
            if isinstance(step_data, dict):
                step_date = step_data.get("completed_at") or step_data.get("approved_at") or step_data.get("updated_at")
                if step_date:
                    try:
                        dt2 = datetime.fromisoformat(step_date.replace("Z", "+00:00"))
                        if not last_advancement or dt2 > datetime.fromisoformat(last_advancement.replace("Z", "+00:00")):
                            last_advancement = step_date
                            days_in_step = (now - dt2).days
                    except Exception:
                        pass

        # Determine current block
        current_block = "Nessun blocco"
        if phase == "F1":
            pos = journey.get("posizionamento", {})
            if not pos or not pos.get("approved"):
                current_block = "In attesa di approvazione posizionamento"
        elif phase == "F2":
            mc = journey.get("masterclass", {})
            if not mc or not mc.get("approved"):
                current_block = "Masterclass da completare"
        elif phase == "F3":
            vc = journey.get("videocorso", {})
            if not vc or not vc.get("approved"):
                current_block = "Videocorso in produzione"
        elif phase == "F4":
            fn = journey.get("funnel", {})
            if not fn or not fn.get("approved"):
                current_block = "Funnel da costruire"
        elif phase == "F5":
            current_block = "Lancio in corso"

        risk = compute_risk(days_in_step, phase)
        execution_level = compute_execution_level(modules, phase)
        suggested_action = get_suggested_action(risk, phase, days_in_step, execution_level)

        # Percorso veloce info
        pv = pv_data.get(pid)
        percorso_veloce = None
        if pv and pv.get("status") == "active":
            percorso_veloce = {
                "active": True,
                "current_day": pv.get("current_day", 1),
            }

        results.append({
            "id": pid,
            "name": name,
            "niche": niche,
            "phase": phase,
            "phase_label": PHASE_LABELS.get(phase, phase),
            "days_in_step": days_in_step,
            "last_advancement": last_advancement,
            "current_block": current_block,
            "execution_level": execution_level,
            "risk": risk,
            "suggested_action": suggested_action,
            "percorso_veloce": percorso_veloce,
            "alert": p.get("alert", False),
        })

    # Sort: bloccati first, then rallentati, then in_linea
    risk_order = {"bloccato": 0, "rallentato": 1, "in_linea": 2}
    results.sort(key=lambda x: (risk_order.get(x["risk"], 2), -x["days_in_step"]))

    # Summary stats
    total = len(results)
    bloccati = sum(1 for r in results if r["risk"] == "bloccato")
    rallentati = sum(1 for r in results if r["risk"] == "rallentato")
    in_linea = sum(1 for r in results if r["risk"] == "in_linea")

    return {
        "success": True,
        "summary": {
            "total": total,
            "bloccati": bloccati,
            "rallentati": rallentati,
            "in_linea": in_linea,
        },
        "partners": results,
    }



# ═══════════════════════════════════════════════════════════════════════════════
# WEBINAR DONE-FOR-YOU
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/webinar/{partner_id}")
async def get_webinar_data(partner_id: str):
    """Restituisce i dati del webinar per il partner"""
    partner = await get_partner_or_404(partner_id)
    
    doc = await db.webinar_data.find_one({"partner_id": str(partner_id)}, {"_id": 0})
    
    if not doc:
        return {"success": True, "webinar": None}
    
    return {"success": True, "webinar": doc}


@router.post("/webinar/save")
async def save_webinar_data(partner_id: str, data: Dict[str, Any]):
    """Admin salva/aggiorna i dati del webinar per un partner"""
    partner = await get_partner_or_404(partner_id)
    
    data["partner_id"] = str(partner_id)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.webinar_data.update_one(
        {"partner_id": str(partner_id)},
        {"$set": data},
        upsert=True
    )
    
    return {"success": True, "message": "Webinar salvato"}



# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICHE — Endpoint API
# ═══════════════════════════════════════════════════════════════════════════════

class NotificaManuale(BaseModel):
    partner_id: str
    tipo: str  # step_pronto, azione_richiesta, sistema_attivo
    step_id: Optional[str] = None
    messaggio: Optional[str] = None

@router.get("/notifiche/{partner_id}")
async def get_notification_log(partner_id: str, limit: int = 20):
    """Restituisce lo storico notifiche per un partner"""
    cursor = db.notification_log.find(
        {"partner_id": str(partner_id)}, {"_id": 0}
    ).sort("sent_at", -1).limit(limit)
    
    logs = await cursor.to_list(length=limit)
    return {"success": True, "notifications": logs}


@router.post("/notifiche/invia")
async def send_manual_notification(req: NotificaManuale):
    """Admin invia una notifica manuale al partner"""
    from services.notifications import (
        notify_step_pronto, notify_azione_richiesta, notify_sistema_attivo, notify_step_in_lavorazione
    )
    
    valid_tipi = ["step_pronto", "azione_richiesta", "sistema_attivo", "step_in_lavorazione"]
    if req.tipo not in valid_tipi:
        raise HTTPException(status_code=400, detail=f"Tipo notifica non valido. Valori: {', '.join(valid_tipi)}")
    
    if req.tipo in ("step_pronto", "azione_richiesta", "step_in_lavorazione") and not req.step_id:
        raise HTTPException(status_code=400, detail="step_id obbligatorio per questo tipo di notifica")
    
    # Verifica partner esistente
    partner = await db.partners.find_one(
        {"$or": [{"id": req.partner_id}, {"id": int(req.partner_id) if req.partner_id.isdigit() else req.partner_id}]},
        {"_id": 0, "id": 1}
    )
    if not partner:
        raise HTTPException(status_code=404, detail=f"Partner {req.partner_id} non trovato")
    
    try:
        if req.tipo == "step_pronto":
            await notify_step_pronto(req.partner_id, req.step_id)
        elif req.tipo == "azione_richiesta":
            await notify_azione_richiesta(req.partner_id, req.step_id, req.messaggio)
        elif req.tipo == "sistema_attivo":
            await notify_sistema_attivo(req.partner_id, req.messaggio)
        elif req.tipo == "step_in_lavorazione":
            await notify_step_in_lavorazione(req.partner_id, req.step_id)
        
        return {"success": True, "message": f"Notifica '{req.tipo}' inviata"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[NOTIFICA] Errore invio manuale: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ═══════════════════════════════════════════════════════════════════════════════
# GROWTH SYSTEM — Scelta livello di crescita
# ═══════════════════════════════════════════════════════════════════════════════

class GrowthLevelRequest(BaseModel):
    partner_id: str
    scenario: Optional[str] = None  # foundation, growth, scale
    level: str  # foundation, growth, scale

@router.get("/growth-level/{partner_id}")
async def get_growth_level(partner_id: str):
    """Restituisce il livello di crescita scelto dal partner"""
    doc = await db.growth_levels.find_one(
        {"partner_id": str(partner_id)}, {"_id": 0}
    )
    return {"success": True, "data": doc}

@router.post("/growth-level/choose")
async def choose_growth_level(req: GrowthLevelRequest):
    """Salva la scelta del livello di crescita del partner"""
    valid_levels = ["foundation", "growth", "scale"]
    if req.level not in valid_levels:
        raise HTTPException(status_code=400, detail=f"Livello non valido. Valori: {', '.join(valid_levels)}")

    partner = await db.partners.find_one(
        {"$or": [{"id": req.partner_id}, {"id": int(req.partner_id) if req.partner_id.isdigit() else req.partner_id}]},
        {"_id": 0, "id": 1, "nome": 1, "cognome": 1}
    )
    if not partner:
        raise HTTPException(status_code=404, detail=f"Partner {req.partner_id} non trovato")

    now = datetime.now(timezone.utc).isoformat()
    await db.growth_levels.update_one(
        {"partner_id": str(req.partner_id)},
        {"$set": {
            "partner_id": str(req.partner_id),
            "scenario": req.scenario,
            "level": req.level,
            "chosen_at": now,
            "updated_at": now
        },
        "$setOnInsert": {"created_at": now}},
        upsert=True
    )

    # Aggiorna anche il documento partner
    await db.partners.update_one(
        {"$or": [{"id": req.partner_id}, {"id": int(req.partner_id) if req.partner_id.isdigit() else req.partner_id}]},
        {"$set": {"growth_level": req.level, "growth_level_chosen_at": now}}
    )

    # Notifica Telegram admin
    try:
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            import httpx
            nome = partner.get('nome', '')
            cognome = partner.get('cognome', '')
            level_names = {"foundation": "Foundation", "growth": "Growth", "scale": "Scale"}
            msg = f"📈 GROWTH SYSTEM\n\n👤 {nome} {cognome}\n🎯 Livello scelto: {level_names.get(req.level, req.level)}\n\n✅ Il partner è pronto per il percorso di crescita"
            async with httpx.AsyncClient() as client_http:
                await client_http.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": msg}
                )
    except Exception as e:
        logging.warning(f"[GROWTH] Telegram notification error: {e}")

    return {
        "success": True,
        "message": f"Livello {req.level} salvato",
        "level": req.level,
        "chosen_at": now
    }


# ═══════════════════════════════════════════════════════════════════════════════
# UPLOAD VIDEO DIRETTO SU GCS (bypass Google Drive)
# ═══════════════════════════════════════════════════════════════════════════════

class VideoUploadSessionRequest(BaseModel):
    partner_id: str
    video_type: str = "masterclass"   # "masterclass" | "videocorso"
    lesson_id: Optional[str] = None   # solo per videocorso
    filename: str = "video.mp4"
    content_type: str = "video/mp4"

class VideoUploadConfirmRequest(BaseModel):
    partner_id: str
    video_type: str = "masterclass"
    lesson_id: Optional[str] = None
    lesson_title: Optional[str] = None   # etichetta lezione (es. nome file) per la review admin
    gcs_path: str   # gs://bucket/path/to/file.mp4


@router.post("/video/request-upload-session")
async def request_video_upload_session(req: VideoUploadSessionRequest, request: Request):
    """
    Crea una sessione GCS Resumable Upload e ritorna l'URL di upload diretto.
    Il browser caricherà il file direttamente su GCS (max size illimitato, progress tracking nativo).
    Non richiede signed URL: usa la sessione resumable di GCS che include l'auth nel URL stesso.

    CORS CRITICO: GCS lega l'Access-Control-Allow-Origin della PUT all'`origin` con cui la
    sessione è creata. Deve combaciare ESATTAMENTE con l'origine del browser (es. www.ciak.io,
    NON ciak.io), altrimenti la PUT diretta del browser è bloccata ("Failed to fetch"). Per
    questo leggiamo l'header Origin della richiesta invece di un valore fisso.
    """
    try:
        from google.cloud import storage as gcs_storage
    except ImportError:
        raise HTTPException(status_code=500, detail="google-cloud-storage non installato")

    GCS_BUCKET = os.environ.get("GCS_BUCKET", "gen-lang-client-0744698012_cloudbuild")
    ext = "." + req.filename.rsplit(".", 1)[-1].lower() if "." in req.filename else ".mp4"
    safe_ext = ext if ext in {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"} else ".mp4"

    if req.video_type == "videocorso" and req.lesson_id:
        gcs_object = f"raw_videos/{req.partner_id}/videocorso/{req.lesson_id}/{uuid.uuid4().hex}{safe_ext}"
    else:
        gcs_object = f"raw_videos/{req.partner_id}/masterclass/{uuid.uuid4().hex}{safe_ext}"

    gcs_path = f"gs://{GCS_BUCKET}/{gcs_object}"

    try:
        client = gcs_storage.Client()
        bucket = client.bucket(GCS_BUCKET)
        blob = bucket.blob(gcs_object)

        # Crea sessione resumable — l'URL ritornato include l'auth e può essere usato dal browser
        browser_origin = request.headers.get("origin") or os.environ.get("FRONTEND_URL", "https://www.ciak.io")
        upload_url = blob.create_resumable_upload_session(
            content_type=req.content_type,
            size=None,   # sconosciuto — il browser lo imposterà
            origin=browser_origin,   # deve combaciare con l'origine reale del browser (vedi docstring)
        )
        logging.info(f"[VIDEO-UPLOAD] Sessione GCS creata per partner {req.partner_id}: {gcs_path}")
    except Exception as e:
        logging.error(f"[VIDEO-UPLOAD] Errore creazione sessione GCS: {e}")
        raise HTTPException(status_code=500, detail=f"Errore GCS: {str(e)}")

    # Salva il nome originale del file: la pipeline lo usa come titolo YouTube
    # (richiesta Antonella: niente rename generico). Best-effort, non bloccante.
    try:
        if req.video_type == "videocorso" and req.lesson_id:
            await db.partner_videocorso.update_one(
                {"partner_id": req.partner_id},
                {"$set": {f"lessons.{req.lesson_id}.video_original_name": req.filename}},
                upsert=True,
            )
        else:
            await db.masterclass_factory.update_one(
                {"partner_id": req.partner_id},
                {"$set": {"video_original_name": req.filename}},
                upsert=True,
            )
    except Exception as _e:
        logging.warning(f"[VIDEO-UPLOAD] impossibile salvare original_name: {_e}")

    return {
        "upload_url": upload_url,
        "gcs_path": gcs_path,
        "gcs_object": gcs_object,
        "bucket": GCS_BUCKET,
    }


@router.post("/video/confirm-upload")
async def confirm_video_upload(req: VideoUploadConfirmRequest, background_tasks: BackgroundTasks):
    """
    Il browser ha completato l'upload su GCS.
    Questo endpoint aggiorna il DB con il path GCS e avvia la pipeline Celery.
    """
    now = datetime.now(timezone.utc).isoformat()
    gcs_path = req.gcs_path

    if req.video_type == "masterclass":
        await db.masterclass_factory.update_one(
            {"partner_id": req.partner_id},
            {"$set": {
                "video_raw_url": gcs_path,
                "video_pipeline_status": "queued",
                "video_pipeline_error": None,
                "video_submitted_at": now,
                "updated_at": now,
            }},
            upsert=True
        )
    elif req.video_type == "videocorso" and req.lesson_id:
        # NB: partner_videocorso.lessons è un DICT keyed per lesson_id (vedi
        # upload_videocorso_lesson / approve_videocorso_lesson / pipeline set_status),
        # NON un array — quindi niente operatore posizionale `$`.
        key = f"lessons.{req.lesson_id}"
        set_doc = {
            f"{key}.video_raw_url": gcs_path,
            f"{key}.pipeline_status": "queued",   # chiave allineata alla pipeline (set_status)
            f"{key}.video_pipeline_error": None,
            f"{key}.status": "processing",
            f"{key}.submitted_at": now,
            "updated_at": now,
        }
        if req.lesson_title:
            set_doc[f"{key}.title"] = req.lesson_title
        await db.partner_videocorso.update_one(
            {"partner_id": req.partner_id},
            {"$set": set_doc,
             "$setOnInsert": {"partner_id": req.partner_id, "created_at": now}},
            upsert=True,
        )

    # Avvia pipeline Celery
    try:
        from video_pipeline_task import process_partner_video
        process_partner_video.delay(
            partner_id=req.partner_id,
            video_url=gcs_path,
            video_type=req.video_type,
            lesson_id=req.lesson_id,
        )
        logging.info(f"[VIDEO-UPLOAD] Pipeline Celery avviata per {req.partner_id} — {gcs_path}")
    except Exception as e:
        logging.warning(f"[VIDEO-UPLOAD] Celery fallito, uso background task: {e}")
        try:
            from video_pipeline_task import run_pipeline_background
            background_tasks.add_task(
                run_pipeline_background,
                partner_id=req.partner_id,
                video_url=gcs_path,
                video_type=req.video_type,
                lesson_id=req.lesson_id,
            )
        except Exception as e2:
            logging.error(f"[VIDEO-UPLOAD] Anche background task fallito: {e2}")

    return {"success": True, "message": "Video ricevuto — la pipeline è partita!", "gcs_path": gcs_path}


# ════════════════════════════════════════════════════════════════════
# OPERATIVO STEFANIA — Sub-progetto A
# Vedi spec: docs/superpowers/specs/2026-05-17-operativo-stefania-design.md
# ════════════════════════════════════════════════════════════════════
from services.journey_seed import seed_partner_journey
from models.partner_journey_step import JOURNEY_STEPS_DEFINITION, MACRO_PHASES_DEFINITION, AVVIO_STEP_IDS

# Mapping step_id -> fase legacy (F1..F7), usato per proiettare partner.phase.
# La fase resta un campo DENORMALIZZATO derivato dal sistema canonico
# partner_journey_steps: serve solo al badge atto EVO in admin (evo.js attoEvo).
_FASE_LEGACY_BY_STEP = {d["step_id"]: d.get("fase_legacy", "F1") for d in JOURNEY_STEPS_DEFINITION}


async def _project_legacy_phase(partner_id: str):
    """Riallinea partner.phase (F1..F7 / LIVE) allo stato canonico del journey.
    Fase = fase_legacy dello step in_progress; se tutti done → 'LIVE'.
    """
    steps = await db.partner_journey_steps.find(
        {"partner_id": partner_id}, {"_id": 0, "step_id": 1, "status": 1, "step_number": 1}
    ).sort("step_number", 1).to_list(length=50)
    if not steps:
        return
    current = next((s for s in steps if s["status"] == "in_progress"), None)
    if current:
        phase = _FASE_LEGACY_BY_STEP.get(current["step_id"], "F1")
    elif all(s["status"] in ("done", "skipped") for s in steps):
        phase = "LIVE"
    else:
        # nessuno in_progress ma non tutti chiusi: usa l'ultimo done
        done = [s for s in steps if s["status"] == "done"]
        last = done[-1] if done else steps[0]
        phase = _FASE_LEGACY_BY_STEP.get(last["step_id"], "F1")
    await db.partners.update_one({"id": partner_id}, {"$set": {"phase": phase}})


@router.get("/operativo/state/{partner_id}")
async def get_operativo_state(partner_id: str):
    """Ritorna stato completo journey del partner.
    Se è la prima visita (no step in DB), seeda automaticamente i 13 step
    con step 1 in_progress.
    """
    existing = await db.partner_journey_steps.count_documents({"partner_id": partner_id})
    if existing == 0:
        # Seed phase-aware: un partner ESISTENTE (F1-F7) che entra per la prima
        # volta NON va resettato allo step 1 (contratto). Deriviamo lo start step
        # dalla fase legacy (stessa mappa della migrazione one-shot). I partner
        # nuovi che pagano vengono già seedati alla conferma (proposta.py), quindi
        # qui ci arrivano solo i legacy senza step.
        partner_doc = await db.partners.find_one({"id": partner_id}, {"_id": 0, "phase": 1})
        phase = (partner_doc or {}).get("phase") or "F1"
        # Numeri aggiornati al nuovo modello a 14 step (burocrazia inserita al n.3).
        _PHASE_START = {"F1": 2, "F2": 5, "F3": 7, "F4": 9}
        start_step = 15 if phase >= "F5" else _PHASE_START.get(phase, 1)
        await seed_partner_journey(db, partner_id, start_step_number=start_step)
        if phase >= "F5":
            await db.partners.update_one(
                {"id": partner_id},
                {"$set": {"journey_current_step": "completato"}},
            )

    steps_cursor = db.partner_journey_steps.find(
        {"partner_id": partner_id},
        {"_id": 0},
    ).sort("step_number", 1)
    steps = await steps_cursor.to_list(length=20)

    # Arricchisci ogni step con label + macro_phase da JOURNEY_STEPS_DEFINITION
    enrichment = {d["step_id"]: {"label": d["label"], "macro_phase": d["macro_phase"]} for d in JOURNEY_STEPS_DEFINITION}
    for s in steps:
        meta = enrichment.get(s["step_id"], {})
        s["label"] = meta.get("label", s["step_id"])
        s["macro_phase"] = meta.get("macro_phase", "attivazione")

    current_step = next((s for s in steps if s["status"] == "in_progress"), None)
    if not current_step:
        # Tutti done -> partner ha completato il journey
        current_step = steps[-1] if steps else None

    # Stato "Avvio" (step 1-2 pre-percorso, non in macro-fasi)
    avvio_steps = [s for s in steps if s["step_id"] in AVVIO_STEP_IDS]
    avvio_done = sum(1 for s in avvio_steps if s["status"] == "done")
    avvio_total = len(avvio_steps)
    avvio_status = "done" if avvio_done == avvio_total and avvio_total > 0 else (
        "in_progress" if any(s["status"] == "in_progress" for s in avvio_steps) else "pending"
    )

    # Calcola progresso per macro-fase
    # NOTE: "ottimizzazione-servizio" non ha step_ids (è post-lancio).
    # Status: pending finché ultimo step (13-lancio) non è done, poi in_progress.
    lancio_done = any(s["step_id"] == "13-lancio" and s["status"] == "done" for s in steps)

    macro_phases_status = []
    for mp in MACRO_PHASES_DEFINITION:
        mp_steps = [s for s in steps if s["step_id"] in mp["step_ids"]]
        done_count = sum(1 for s in mp_steps if s["status"] == "done")
        in_progress = any(s["status"] == "in_progress" for s in mp_steps)
        total = len(mp_steps)

        if mp["id"] == "ottimizza":
            mp_status = "in_progress" if lancio_done else "pending"
            done_count = 0
            total = 0
        elif done_count == total and total > 0:
            mp_status = "done"
        elif in_progress or done_count > 0:
            mp_status = "in_progress"
        else:
            mp_status = "pending"
        macro_phases_status.append({
            "id": mp["id"],
            "label": mp["label"],
            "tagline": mp["tagline"],
            "icon": mp["icon"],
            "agent": mp.get("agent"),
            "status": mp_status,
            "step_ids": mp["step_ids"],
            "completed_count": done_count,
            "total_count": total,
        })

    return {
        "success": True,
        "partner_id": partner_id,
        "steps": steps,
        "current_step": current_step,
        "avvio": {
            "status": avvio_status,
            "completed_count": avvio_done,
            "total_count": avvio_total,
            "step_ids": AVVIO_STEP_IDS,
        },
        "macro_phases": macro_phases_status,
        "total_steps": len(steps),
        "completed_count": sum(1 for s in steps if s["status"] == "done"),
    }


class _OperativoCompleteBody(BaseModel):
    data: dict = {}


# Step che producono un documento/asset che l'admin deve approvare.
_DOC_APPROVAL_STEPS = {"04-posizionamento", "03-brand-kit"}


async def _notify_admin_partner_activity(
    partner_id: str,
    msg: str,
    *,
    alert_type: str = "CONSEGNA",
    requires_approval: bool = False,
):
    """Notifica l'admin di un'attività del partner (consegna materiali, variazioni,
    step completati). Due canali, entrambi già esistenti:
      - alert in-app (collezione `alerts`) → pagina admin "Oggi"/Notifiche
      - ping Telegram admin (`notify_telegram`)
    Best-effort: non blocca mai il flusso del partner.
    """
    try:
        partner = await db.partners.find_one(
            {"id": partner_id}, {"_id": 0, "name": 1, "email": 1}
        )
        nome = (partner or {}).get("name") or f"Partner {partner_id}"
        now = datetime.utcnow()
        alert = {
            "id": uuid.uuid4().hex,
            "agent": "STEFANIA",
            "type": alert_type,  # CONSEGNA = attività partner (pallino giallo in UI)
            "msg": f"{nome} {msg}" + (" — da approvare" if requires_approval else ""),
            "time": now.strftime("%d/%m %H:%M"),
            "partner": nome,
            "partner_id": partner_id,
            "kind": "partner_activity",
            "requires_approval": requires_approval,
            "resolved": False,
            "created_at": now.isoformat(),
            "link": f"/admin/partner?id={partner_id}",
        }
        await db.alerts.insert_one(alert)
        await notify_telegram(
            f"📥 {nome} {msg}" + (" (da approvare)" if requires_approval else "")
        )
    except Exception as e:
        logging.warning(f"[OPERATIVO] notifica admin fallita per {partner_id}: {e}")


@router.post("/operativo/complete/{partner_id}/{step_id}")
async def complete_operativo_step(partner_id: str, step_id: str, body: _OperativoCompleteBody):
    """Marca lo step done + avanza il prossimo a in_progress.
    Merge del payload `data` con quello esistente (autosave drafts non si perdono).
    """
    now = datetime.utcnow()

    current = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": step_id}
    )
    if not current:
        raise HTTPException(404, f"Step {step_id} non trovato per partner {partner_id}")

    merged_data = {**current.get("data", {}), **(body.data or {})}

    await db.partner_journey_steps.update_one(
        {"partner_id": partner_id, "step_id": step_id},
        {"$set": {
            "status": "done",
            "completed_at": now,
            "data": merged_data,
            "updated_at": now,
        }},
    )

    # Step "burocrazia": rispecchia i dati anagrafici/fiscali sul record partner
    # così l'admin li vede nella scheda partner (no documento da approvare).
    if step_id == "burocrazia" and merged_data:
        _BUROCRAZIA_FIELDS = {
            "nome", "cognome", "email", "telefono", "data_nascita", "luogo_nascita",
            "indirizzo", "cap", "comune", "provincia", "paese",
            "codice_fiscale", "partita_iva", "ragione_sociale", "pec", "iban",
            "codice_sdi", "regime_forfettario",
            "sito_web", "blog", "instagram", "linkedin", "youtube", "facebook", "tiktok", "altri_link",
        }
        mirror = {f"dati_burocrazia.{k}": v for k, v in merged_data.items() if k in _BUROCRAZIA_FIELDS}
        if mirror:
            mirror["dati_burocrazia_updated_at"] = now
            await db.partners.update_one({"id": partner_id}, {"$set": mirror})

    # Notifica admin: il partner ha completato uno step / consegnato materiali / fatto una variazione.
    _was_done = current.get("status") == "done"
    _label = next((d["label"] for d in JOURNEY_STEPS_DEFINITION if d["step_id"] == step_id), step_id)
    if step_id == "burocrazia":
        _msg = "ha aggiornato i suoi dati" if _was_done else "ha confermato e completato i suoi dati"
    else:
        _verb = "ha aggiornato" if _was_done else "ha completato"
        _msg = f"{_verb}: {_label}"
    await _notify_admin_partner_activity(
        partner_id, _msg, requires_approval=step_id in _DOC_APPROVAL_STEPS
    )

    # Trova il prossimo step pending in ordine e marcalo in_progress
    next_step = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "status": "pending"},
        sort=[("step_number", 1)],
    )

    if next_step:
        await db.partner_journey_steps.update_one(
            {"_id": next_step["_id"]},
            {"$set": {
                "status": "in_progress",
                "started_at": now,
                "updated_at": now,
            }},
        )
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"journey_current_step": next_step["step_id"]}},
        )
        next_step["status"] = "in_progress"
        next_step.pop("_id", None)
    else:
        # Tutti completati
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"journey_current_step": "completato"}},
        )

    await _project_legacy_phase(partner_id)

    return {
        "success": True,
        "completed_step": step_id,
        "next_step": next_step,
    }


@router.post("/operativo/save-draft/{partner_id}/{step_id}")
async def save_draft_operativo_step(partner_id: str, step_id: str, body: _OperativoCompleteBody):
    """Salva bozza dati step in_progress. Merge col data esistente.
    NON cambia lo status (resta in_progress). Usato per autosave debounced dal frontend."""
    now = datetime.utcnow()
    current = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": step_id}
    )
    if not current:
        raise HTTPException(404, f"Step {step_id} non trovato per partner {partner_id}")

    merged_data = {**current.get("data", {}), **(body.data or {})}

    await db.partner_journey_steps.update_one(
        {"partner_id": partner_id, "step_id": step_id},
        {"$set": {"data": merged_data, "updated_at": now}},
    )
    return {"success": True, "saved_keys": list((body.data or {}).keys())}


class _OperativoAdminStatusBody(BaseModel):
    status: str  # pending | in_progress | done | skipped | blocked


_JOURNEY_STATUSES = {"pending", "in_progress", "done", "skipped", "blocked"}


@router.post("/operativo/admin/set-status/{partner_id}/{step_id}")
async def admin_set_operativo_step_status(
    partner_id: str, step_id: str, body: _OperativoAdminStatusBody
):
    """Admin imposta lo stato di uno step a un valore arbitrario, SENZA
    l'auto-avanzamento di /operativo/complete. Serve a riaprire, saltare o
    forzare manualmente uno step dalla scheda partner (vista macro-fasi + 14 step).
    Allinea started_at/completed_at e partner.journey_current_step di conseguenza.
    """
    if body.status not in _JOURNEY_STATUSES:
        raise HTTPException(400, f"Stato non valido: {body.status}")

    now = datetime.utcnow()
    current = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": step_id}
    )
    if not current:
        raise HTTPException(404, f"Step {step_id} non trovato per partner {partner_id}")

    set_fields: dict = {"status": body.status, "updated_at": now}
    if body.status == "done":
        set_fields["completed_at"] = now
    elif body.status == "in_progress":
        set_fields["completed_at"] = None
        if not current.get("started_at"):
            set_fields["started_at"] = now
    else:  # pending | skipped | blocked
        set_fields["completed_at"] = None

    await db.partner_journey_steps.update_one(
        {"partner_id": partner_id, "step_id": step_id},
        {"$set": set_fields},
    )

    # Se l'admin riporta uno step in lavorazione, rispecchia lo step corrente sul partner.
    if body.status == "in_progress":
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"journey_current_step": step_id}},
        )

    await _project_legacy_phase(partner_id)

    return {"success": True, "step_id": step_id, "status": body.status}


@router.get("/operativo/stefania-context/{partner_id}")
async def get_stefania_context(partner_id: str):
    """Ritorna contesto strutturato per Stefania su questo partner.
    Usato sia dal frontend (per mostrare il briefing) sia dal backend
    in _build_context() del router stefania_chat."""
    from datetime import timedelta, timezone as _tz

    steps_cursor = db.partner_journey_steps.find(
        {"partner_id": partner_id},
        {"_id": 0},
    ).sort("step_number", 1)
    steps = await steps_cursor.to_list(length=20)

    if not steps:
        return {
            "success": True,
            "current_step": None,
            "total_steps": 0,
            "completed_count": 0,
            "stefania_mode": "briefing",
        }

    label_by_step_id = {d["step_id"]: d["label"] for d in JOURNEY_STEPS_DEFINITION}
    for s in steps:
        s["label"] = label_by_step_id.get(s["step_id"], s["step_id"])

    current = next((s for s in steps if s["status"] == "in_progress"), None)

    # Determina la modalità: briefing se appena aperto, proattiva se inattivo >3gg,
    # affiancamento di default.
    stefania_mode = "briefing"
    if current:
        if not current.get("stefania_briefing_shown"):
            stefania_mode = "briefing"
        elif current.get("started_at"):
            started = current["started_at"]
            if isinstance(started, str):
                started = datetime.fromisoformat(started.replace("Z", "+00:00"))
            now_dt = datetime.now(_tz.utc) if started.tzinfo else datetime.utcnow()
            if (now_dt - started) > timedelta(days=3):
                stefania_mode = "proattiva"
            else:
                stefania_mode = "affiancamento"
        else:
            stefania_mode = "affiancamento"

    return {
        "success": True,
        "current_step": current,
        "total_steps": len(steps),
        "completed_count": sum(1 for s in steps if s["status"] == "done"),
        "stefania_mode": stefania_mode,
    }


@router.post("/operativo/upload/{partner_id}")
async def upload_operativo_file(
    partner_id: str,
    file: UploadFile = File(...),
    notify: bool = Query(True, description="False quando carica l'admin: evita l'alert 'il partner ha caricato un materiale'"),
):
    """Upload generico per gli step components Operativo (logo, foto, video, PDF).
    Ritorna URL Cloudinary. Fallback locale se Cloudinary non configurato."""
    content = await file.read()
    MAX_SIZE = 200 * 1024 * 1024  # 200 MB (video grezzi possono essere grandi)
    if len(content) > MAX_SIZE:
        raise HTTPException(400, f"File troppo grande (max {MAX_SIZE // (1024*1024)} MB)")

    ext = (file.filename or "file").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    is_video = ext in ("mp4", "mov", "avi", "webm", "mkv")
    is_pdf = ext == "pdf"
    resource_type = "video" if is_video else ("raw" if is_pdf else "image")

    try:
        from cloudinary_service import upload_file_direct, is_cloudinary_configured
        if is_cloudinary_configured():
            result = await upload_file_direct(
                file_data=content,
                filename=file.filename or f"upload.{ext}",
                resource_type=resource_type,
                folder=f"evolution-pro/operativo/{partner_id}",
            )
            if result.get("success"):
                url = result.get("secure_url") or result.get("url", "")
                if notify:
                    await _notify_admin_partner_activity(partner_id, f"ha caricato un materiale ({file.filename})")
                return {"success": True, "url": url, "resource_type": resource_type}
    except Exception as e:
        logging.warning(f"[OPERATIVO-UPLOAD] Cloudinary failed: {e}")

    # Fallback locale (per dev)
    try:
        import aiofiles
        from pathlib import Path
        base_dir = Path(os.environ.get("DOCUMENTI_DIR", "/tmp/operativo")) / partner_id
        base_dir.mkdir(parents=True, exist_ok=True)
        safe_name = "".join(c for c in (file.filename or f"upload.{ext}") if c.isalnum() or c in ".-_")
        path = base_dir / f"{uuid.uuid4().hex[:8]}_{safe_name}"
        async with aiofiles.open(str(path), "wb") as f:
            await f.write(content)
        if notify:
            await _notify_admin_partner_activity(partner_id, f"ha caricato un materiale ({file.filename})")
        return {"success": True, "url": f"/static/operativo/{partner_id}/{path.name}", "resource_type": resource_type, "fallback": "local"}
    except Exception as e:
        raise HTTPException(500, f"Upload fallito: {e}")
