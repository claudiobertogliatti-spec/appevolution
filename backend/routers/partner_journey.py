"""
Partner Journey Router
Gestisce il percorso guidato del partner: Posizionamento, Masterclass, Videocorso, Funnel, Lancio
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import os
import uuid
import logging
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

class FunnelPublishRequest(BaseModel):
    partner_id: str

class LancioActivateRequest(BaseModel):
    partner_id: str

# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def get_partner_or_404(partner_id: str):
    """Helper per recuperare un partner o lanciare 404"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    return partner

async def get_llm_chat():
    """Helper per ottenere istanza LLM con Emergent Key"""
    from emergentintegrations.llm.chat import LlmChat
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM Key non configurata")
    
    return LlmChat(api_key=api_key, model="claude-sonnet-4-20250514")

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
        "course_structure": posizionamento.get("course_structure") if posizionamento else None
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
        from emergentintegrations.llm.chat import UserMessage
        
        response = await llm.chat([UserMessage(text=prompt)])
        
        # Parse JSON dalla risposta
        import json
        response_text = response.text.strip()
        
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
# MASTERCLASS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

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
        from emergentintegrations.llm.chat import UserMessage
        import json
        
        response = await llm.chat([UserMessage(text=prompt)])
        response_text = response.text.strip()
        
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

@router.post("/masterclass/approve-video")
async def approve_masterclass_video(partner_id: str):
    """Approva il video della masterclass (admin only)"""
    partner = await get_partner_or_404(partner_id)
    
    await db.partner_masterclass.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "video_approved": True,
            "video_status": "approved",
            "video_approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Aggiorna partner
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "masterclass_completata": True,
            "masterclass_completata_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Video masterclass approvato"}

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
        "is_completed": videocorso.get("completed", False) if videocorso else False
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
    await get_partner_or_404(partner_id)
    
    lesson_key = f"lessons.{lesson_id}.status"
    await db.partner_videocorso.update_one(
        {"partner_id": partner_id},
        {"$set": {
            lesson_key: "approved",
            f"lessons.{lesson_id}.approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": f"Lezione {lesson_id} approvata"}

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
        "is_published": funnel.get("published", False) if funnel else False
    }

@router.post("/funnel/generate")
async def generate_funnel(request: FunnelGenerateRequest):
    """
    AI Course Factory: Genera automaticamente tutto il materiale marketing
    (pagine opt-in, sales page, email sequence) basandosi sul posizionamento
    """
    partner = await get_partner_or_404(request.partner_id)
    
    # Recupera tutti i dati necessari
    posizionamento = await db.partner_posizionamento.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    if not posizionamento:
        raise HTTPException(status_code=400, detail="Completa prima il posizionamento")
    
    masterclass = await db.partner_masterclass.find_one(
        {"partner_id": request.partner_id}, {"_id": 0}
    )
    
    # Costruisci prompt per AI
    prompt = f"""Sei Stefania, Funnel Architect di Evolution PRO. Devi generare un sistema di vendita completo.

DATI PARTNER:
- Nome: {partner.get('name')}
- Nicchia: {partner.get('niche', 'N/D')}

POSIZIONAMENTO:
- Studente ideale: {posizionamento.get('step_1_studente_ideale', 'N/D')}
- Obiettivo: {posizionamento.get('step_2_obiettivo', 'N/D')}
- Trasformazione: {posizionamento.get('step_3_trasformazione', 'N/D')}
- Metodo: {posizionamento.get('step_4_metodo', 'N/D')}
- Obiezioni: {posizionamento.get('step_5_obiezioni', 'N/D')}

STRUTTURA CORSO:
{json.dumps(posizionamento.get('course_structure', {}), ensure_ascii=False, indent=2)}

Genera il materiale marketing completo in formato JSON:
{{
  "optin_page": {{
    "headline": "...",
    "subheadline": "...",
    "bullets": ["...", "...", "..."],
    "cta": "..."
  }},
  "masterclass_page": {{
    "headline": "...",
    "subheadline": "...",
    "bullets": ["...", "...", "..."],
    "cta": "..."
  }},
  "sales_page": {{
    "headline": "...",
    "subheadline": "...",
    "problem_section": "...",
    "solution_section": "...",
    "bullets": ["...", "...", "...", "...", "..."],
    "price": "€497",
    "cta": "...",
    "guarantee": "..."
  }},
  "checkout": {{
    "headline": "...",
    "subheadline": "...",
    "cta": "..."
  }},
  "email_sequence": [
    {{"id": 1, "subject": "...", "preview": "...", "type": "access", "delay": "Immediata"}},
    {{"id": 2, "subject": "...", "preview": "...", "type": "value", "delay": "+24 ore"}},
    {{"id": 3, "subject": "...", "preview": "...", "type": "case_study", "delay": "+48 ore"}},
    {{"id": 4, "subject": "...", "preview": "...", "type": "offer", "delay": "+72 ore"}},
    {{"id": 5, "subject": "...", "preview": "...", "type": "urgency", "delay": "+96 ore"}},
    {{"id": 6, "subject": "...", "preview": "...", "type": "closing", "delay": "+120 ore"}}
  ]
}}

Rendi il copy persuasivo, specifico per la nicchia, e focalizzato sulla trasformazione."""

    try:
        llm = await get_llm_chat()
        from emergentintegrations.llm.chat import UserMessage
        import json
        
        response = await llm.chat([UserMessage(text=prompt)])
        response_text = response.text.strip()
        
        # Parse JSON
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        
        funnel_content = json.loads(response_text)
        
        # Salva
        await db.partner_funnel.update_one(
            {"partner_id": request.partner_id},
            {
                "$set": {
                    "content": funnel_content,
                    "generated": True,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
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
            "funnel_content": funnel_content
        }
        
    except Exception as e:
        logging.error(f"Funnel generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione funnel: {str(e)}")

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
        "email_attive": funnel.get("published", False) if funnel else False,  # Assume email attive se funnel pubblicato
    }
    
    all_ready = all(system_checks.values())
    
    return {
        "success": True,
        "partner_id": partner_id,
        "system_checks": system_checks,
        "all_ready": all_ready,
        "is_launched": lancio.get("launched", False) if lancio else False,
        "funnel_url": lancio.get("funnel_url") if lancio else None
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
