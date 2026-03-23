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

MASTERCLASS_SYSTEM_PROMPT = """Sei il Lead Strategist e Copywriter del Team Evolution AI. 
Il tuo obiettivo è creare una Video Sales Letter (Masterclass) di 7-10 minuti per vendere un videocorso.

VINCOLI TECNICI OBBLIGATORI:
- Lunghezza: ESATTAMENTE tra 1.000 e 1.400 parole (conta attentamente!)
- Durata lettura: 7-10 minuti
- Struttura: 7 blocchi sincronizzati
- Tono: Varia tra i blocchi (Aggressivo nel Problema, Didattico nel Metodo, Urgente nell'Offerta)

STRUTTURA DEI 7 BLOCCHI:

BLOCCO 1 - HOOK (max 50 parole)
[GUARDA IN CAMERA]
Apri con il risultato promesso in modo diretto e provocatorio.
Cattura l'attenzione nei primi 15 secondi.

BLOCCO 2 - PROBLEMA (150-200 parole)
[TONO AGGRESSIVO]
Demolisci la "bugia del settore".
Fai sentire il dolore del problema.
Crea empatia mostrando di capire la frustrazione.

BLOCCO 3 - AUTORITÀ + STORIA (100-150 parole)
[TONO PERSONALE]
Breve presentazione personale.
Perché sei la persona giusta per risolvere questo problema?
Usa numeri e risultati concreti.

BLOCCO 4 - IL METODO (200-250 parole)
[TONO DIDATTICO]
Presenta i 3 pilastri del metodo.
Spiega COSA fa ogni pilastro (non COME).
Crea curiosità per il corso.

BLOCCO 5 - MAGIC MOMENT (100-150 parole)
[MOSTRA APP/STRUMENTO]
Descrivi l'output pratico che l'utente ottiene ORA.
Questo è il momento "AHA!" che converte.

BLOCCO 6 - OFFERTA + URGENZA (200-250 parole)
[TONO URGENTE]
Presenta il valore totale (ancoraggio alto).
Rivela il prezzo di lancio.
Crea urgenza reale (tempo o posti limitati).
Elenca i bonus dell'area riservata.

BLOCCO 7 - CTA FINALE (50-100 parole)
[INDICARE TASTO]
Call to action chiara e diretta.
Descrivi cosa succede subito dopo l'acquisto.
Chiudi con una frase motivazionale.

FORMATO OUTPUT:
Scrivi lo script in modo fluido e naturale, includendo:
- Note di regia tra parentesi quadre [...]
- Transizioni naturali tra i blocchi
- Linguaggio parlato, non scritto
- Nessun titolo di blocco visibile (solo flow narrativo)"""

def build_user_prompt(answers: Dict[str, str], partner_name: str) -> str:
    return f"""Crea lo script della masterclass per {partner_name} usando questi input:

=== GANCIO (Risultato Promesso) ===
{answers.get('gancio', 'Non specificato')}

=== PROBLEMA (Bugia del Settore) ===
{answers.get('problema', 'Non specificato')}

=== METODO (3 Pilastri) ===
{answers.get('metodo', 'Non specificato')}

=== MAGIC MOMENT (Output Pratico) ===
{answers.get('magic_moment', 'Non specificato')}

=== VALORE (Area Riservata) ===
{answers.get('valore', 'Non specificato')}

=== OFFERTA (Prezzo & Urgenza) ===
{answers.get('offerta', 'Non specificato')}

=== CTA (Azione Immediata) ===
{answers.get('cta', 'Non specificato')}

Genera uno script di ESATTAMENTE 1.000-1.400 parole, seguendo la struttura a 7 blocchi.
Includi note di regia tra parentesi quadre.
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
    """Genera lo script della masterclass usando Claude Sonnet 4.5"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Get partner info
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    partner_name = partner.get("name") or partner.get("nome", "Partner") if partner else "Partner"
    
    # Get API key
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key non configurata")
    
    try:
        # Initialize chat with Claude Sonnet 4.5
        chat = LlmChat(
            api_key=api_key,
            session_id=f"masterclass-{partner_id}-{uuid.uuid4().hex[:8]}",
            system_message=MASTERCLASS_SYSTEM_PROMPT
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Build user prompt
        user_prompt = build_user_prompt(data.answers, partner_name)
        
        # Generate script
        logging.info(f"Generating masterclass script for partner {partner_id}")
        script = await chat.send_message(UserMessage(text=user_prompt))
        
        # Validate script
        validation_score = validate_script(script, data.answers)
        
        # If score is too low, try to regenerate once
        if validation_score < 35:
            logging.info(f"Script score too low ({validation_score}), regenerating...")
            regenerate_prompt = f"""Lo script precedente ha ottenuto un punteggio di {validation_score}/50.
Migliora questi aspetti:
- Assicurati che il GANCIO sia presente nelle prime 50 parole
- Verifica che il PROBLEMA sia chiaro entro le prime 200 parole
- La lunghezza DEVE essere tra 1.000 e 1.400 parole
- La CTA finale deve essere chiara e urgente

Riscrivi lo script completo migliorandolo."""
            
            script = await chat.send_message(UserMessage(text=regenerate_prompt))
            validation_score = validate_script(script, data.answers)
        
        # Save to database
        await db.masterclass_factory.update_one(
            {"partner_id": partner_id},
            {"$set": {
                "partner_id": partner_id,
                "answers": data.answers,
                "script": script,
                "validation_score": validation_score,
                "script_approved": False,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        return {
            "success": True,
            "script": script,
            "validation_score": validation_score,
            "word_count": len(script.split())
        }
        
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
