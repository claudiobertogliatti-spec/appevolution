"""
EVOLUTION MASTERCLASS FACTORY ROUTER
-------------------------------------
Sistema completo per la creazione di Masterclass VSL (Video Sales Letter)
con generazione AI dello script usando Claude Sonnet 4.5

Fasi:
1. Estrazione dati (7 Domande Strategiche)
2. Generazione Script (1000-1400 parole, 7 blocchi)
3. Validazione AI (Score 0-50)
4. Registrazione e Upload video
"""

import os
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/masterclass-factory", tags=["masterclass-factory"])

# Database reference (set from main app)
db = None

def set_db(database):
    global db
    db = database

# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class MasterclassAnswers(BaseModel):
    answers: Dict[str, str]

class ApproveScriptRequest(BaseModel):
    script: str

# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT GENERATION PROMPT
# ═══════════════════════════════════════════════════════════════════════════════

MASTERCLASS_SYSTEM_PROMPT = """Sei uno script writer professionista per masterclass di vendita.
Il tuo obiettivo è creare uno script strutturato e pronto da registrare per una masterclass gratuita.

L'output DEVE essere in formato JSON con 7 sezioni obbligatorie:
{
  "sections": [
    {"id": 1, "title": "Apertura", "content": "Script dell'apertura..."},
    {"id": 2, "title": "Problema", "content": "Script del problema..."},
    {"id": 3, "title": "Errore comune", "content": "Script dell'errore comune..."},
    {"id": 4, "title": "Soluzione", "content": "Script della soluzione step by step..."},
    {"id": 5, "title": "Esempio", "content": "Script dell'esempio concreto..."},
    {"id": 6, "title": "Transizione al corso", "content": "Script della transizione..."},
    {"id": 7, "title": "Chiusura / CTA", "content": "Script della chiusura e call to action..."}
  ]
}

REGOLE:
- Ogni sezione deve avere un contenuto di 100-200 parole
- Linguaggio parlato, naturale, coinvolgente
- Tono professionale ma accessibile
- Focalizzato sulla trasformazione del cliente
- Lo script deve essere PRONTO DA LEGGERE/REGISTRARE
- Rispondi SOLO con il JSON, senza altro testo"""

def build_user_prompt(answers: Dict[str, str], partner_name: str) -> str:
    return f"""Crea lo script della masterclass per {partner_name} usando questi input:

1. RISULTATO PRINCIPALE: {answers.get('risultato_principale', 'Non specificato')}
2. PROBLEMA DEL PUBBLICO: {answers.get('problema_pubblico', 'Non specificato')}
3. ERRORE COMUNE: {answers.get('errore_comune', 'Non specificato')}
4. METODO: {answers.get('metodo_semplice', 'Non specificato')}
5. ESEMPIO CONCRETO: {answers.get('esempio_concreto', 'Non specificato')}
6. A CHI NON È ADATTA: {answers.get('non_adatta', 'Non specificato')}
7. DOPO LA MASTERCLASS: {answers.get('dopo_masterclass', 'Non specificato')}

Genera lo script completo in formato JSON con le 7 sezioni obbligatorie (Apertura, Problema, Errore comune, Soluzione, Esempio, Transizione al corso, Chiusura/CTA).
Scrivi in italiano, con tono naturale e coinvolgente."""

# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATION SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

def validate_script(script: str, answers: Dict[str, str]) -> int:
    """
    Valida lo script generato secondo i parametri Evolution PRO.
    Ritorna un punteggio da 0 a 50.
    """
    score = 0
    word_count = len(script.split())
    
    # P1: Gancio (max 10 punti)
    # Promessa netta entro 15s = prime 50 parole
    first_100_words = ' '.join(script.split()[:100]).lower()
    gancio = answers.get('gancio', '').lower()
    if any(word in first_100_words for word in gancio.split()[:3]):
        score += 8
    elif len(first_100_words) > 50:
        score += 5
    
    # P2: Promessa (max 10 punti)
    # Chiara e trasformativa entro 90s = prime 200 parole
    first_200_words = ' '.join(script.split()[:200]).lower()
    problema = answers.get('problema', '').lower()
    if any(word in first_200_words for word in problema.split()[:5]):
        score += 8
    else:
        score += 4
    
    # P3: Struttura (max 15 punti)
    # Deve avere note di regia e lunghezza corretta
    if '[' in script and ']' in script:
        score += 5  # Ha note di regia
    if 1000 <= word_count <= 1400:
        score += 10  # Lunghezza corretta
    elif 800 <= word_count <= 1600:
        score += 5  # Lunghezza accettabile
    
    # P4: CTA (max 15 punti)
    # Motivante e coerente
    last_200_words = ' '.join(script.split()[-200:]).lower()
    cta_keywords = ['clicca', 'pulsante', 'adesso', 'ora', 'oggi', 'subito', 'accedi', 'iscriviti']
    cta_count = sum(1 for kw in cta_keywords if kw in last_200_words)
    score += min(cta_count * 3, 15)
    
    return min(score, 50)

# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/")
async def list_masterclass_status():
    """
    Lista tutte le masterclass e il loro stato.
    Usato per la dashboard admin.
    """
    if db is None:
        return {"status": "error", "message": "Database non inizializzato", "masterclasses": []}
    
    try:
        masterclasses = await db.masterclass_factory.find({}, {"_id": 0}).to_list(100)
        
        # Arricchisci con dati partner
        for mc in masterclasses:
            partner = await db.partners.find_one(
                {"id": mc.get("partner_id")}, 
                {"_id": 0, "name": 1, "nome": 1, "email": 1}
            )
            if partner:
                mc["partner_name"] = partner.get("name") or partner.get("nome")
                mc["partner_email"] = partner.get("email")
        
        return {
            "status": "ok",
            "total": len(masterclasses),
            "masterclasses": masterclasses
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "masterclasses": []}


@router.get("/stats")
async def get_masterclass_stats():
    """Statistiche aggregate delle masterclass"""
    if db is None:
        return {"status": "error", "message": "Database non inizializzato"}
    
    try:
        total = await db.masterclass_factory.count_documents({})
        with_script = await db.masterclass_factory.count_documents({"script": {"$ne": None}})
        approved = await db.masterclass_factory.count_documents({"script_approved": True})
        with_video = await db.masterclass_factory.count_documents({"video_url": {"$ne": None}})
        
        return {
            "status": "ok",
            "stats": {
                "total": total,
                "with_script": with_script,
                "script_approved": approved,
                "with_video": with_video
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/{partner_id}")
async def get_masterclass_data(partner_id: str):
    """Recupera i dati della masterclass esistente"""
    data = await db.masterclass_factory.find_one({"partner_id": partner_id}, {"_id": 0})
    if not data:
        return {"answers": {}, "script": None, "script_approved": False}
    return data


@router.post("/{partner_id}/answers")
async def save_answers(partner_id: str, data: MasterclassAnswers):
    """Salva le risposte alle 7 domande strategiche"""
    await db.masterclass_factory.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "partner_id": partner_id,
            "answers": data.answers,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True}


@router.post("/{partner_id}/generate-script")
async def generate_script(partner_id: str, data: MasterclassAnswers):
    """Genera lo script strutturato della masterclass usando Claude"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import json

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    partner_name = partner.get("name") or partner.get("nome", "Partner") if partner else "Partner"

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key non configurata")

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"masterclass-{partner_id}-{uuid.uuid4().hex[:8]}",
            system_message=MASTERCLASS_SYSTEM_PROMPT
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        user_prompt = build_user_prompt(data.answers, partner_name)

        logging.info(f"Generating masterclass script for partner {partner_id}")
        response = await chat.send_message(UserMessage(text=user_prompt))
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

        script_data = json.loads(response_text)
        sections = script_data.get("sections", [])
        full_script = "\n\n".join([f"## {s['title']}\n\n{s['content']}" for s in sections])

        await db.masterclass_factory.update_one(
            {"partner_id": partner_id},
            {"$set": {
                "partner_id": partner_id,
                "answers": data.answers,
                "script": full_script,
                "script_sections": sections,
                "script_approved": False,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )

        return {
            "success": True,
            "script": full_script,
            "script_sections": sections,
        }

    except json.JSONDecodeError as e:
        logging.error(f"JSON parse error in masterclass script: {e}")
        raise HTTPException(status_code=500, detail="Errore nel parsing dello script generato")
    except Exception as e:
        logging.error(f"Error generating masterclass script: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione script: {str(e)}")


@router.post("/{partner_id}/approve-script")
async def approve_script(partner_id: str, data: ApproveScriptRequest):
    """Approva lo script e passa alla fase di registrazione"""
    
    # Update database
    await db.masterclass_factory.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "script": data.script,
            "script_approved": True,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Save script to partner files
    file_doc = {
        "id": str(uuid.uuid4()),
        "partner_id": partner_id,
        "name": "Script Masterclass (Approvato)",
        "filename": "script_masterclass.txt",
        "type": "text/plain",
        "content": data.script,
        "is_raw": False,
        "status": "approved",
        "category": "masterclass",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.partner_files.insert_one(file_doc)
    
    return {"success": True, "message": "Script approvato e salvato"}


@router.post("/{partner_id}/upload-video")
async def upload_video(partner_id: str, file: UploadFile = File(...)):
    """Carica il video della masterclass registrata"""
    from cloudinary_service import cloudinary_upload
    
    try:
        content = await file.read()
        
        # Upload to Cloudinary
        result = await cloudinary_upload(
            file_content=content,
            filename=file.filename,
            folder=f"masterclass_videos/{partner_id}",
            resource_type="video"
        )
        
        # Save to database
        await db.masterclass_factory.update_one(
            {"partner_id": partner_id},
            {"$set": {
                "video_url": result.get("url"),
                "video_public_id": result.get("public_id"),
                "video_uploaded": True,
                "video_approved": False,  # Requires manual approval
                "video_uploaded_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Save to partner files
        file_doc = {
            "id": str(uuid.uuid4()),
            "partner_id": partner_id,
            "name": "Video Masterclass",
            "filename": file.filename,
            "url": result.get("url"),
            "public_id": result.get("public_id"),
            "type": "video",
            "is_raw": False,
            "status": "pending_review",
            "category": "masterclass",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.partner_files.insert_one(file_doc)
        
        return {
            "success": True,
            "video_url": result.get("url"),
            "message": "Video caricato con successo"
        }
        
    except Exception as e:
        logging.error(f"Error uploading masterclass video: {e}")
        raise HTTPException(status_code=500, detail=f"Errore caricamento video: {str(e)}")


@router.post("/{partner_id}/approve-video")
async def approve_video(partner_id: str):
    """Approva il video della masterclass (chiamato dall'admin)"""
    await db.masterclass_factory.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "video_approved": True,
            "video_approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update partner files
    await db.partner_files.update_one(
        {"partner_id": partner_id, "category": "masterclass", "type": "video"},
        {"$set": {"status": "approved"}}
    )
    
    return {"success": True, "message": "Video masterclass approvato"}
