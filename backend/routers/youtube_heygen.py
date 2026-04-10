# /app/backend/routers/youtube_heygen.py
"""
YouTube × HeyGen Script Generation Router
Genera script ottimizzati per HeyGen in 3 formati: YouTube Long, Short, LinkedIn Video
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import logging
import json

router = APIRouter(prefix="/youtube-heygen", tags=["YouTube HeyGen"])

logger = logging.getLogger(__name__)

# System prompt per Evolution PRO content
EVOLUTION_PRO_SYSTEM = """Sei il content strategist e copywriter senior di Evolution PRO.
Evolution PRO è l'agenzia italiana che aiuta liberi professionisti (coach, consulenti, formatori, professionisti tecnici) a creare e vendere videocorsi online grazie a un team di agenti AI e professionisti del settore.
Fondatore: Claudio Bertogliatti, 20+ anni di marketing a risposta diretta.
Posizionamento: "Tu ci metti la competenza, noi ci mettiamo il sistema."
Offerta di ingresso: Analisi Strategica a 67€ su evolution-pro.it
Partnership: copertura del 70% dell'investimento in cambio del 10% sulle vendite.
Target: professionisti italiani con competenze validate che guadagnano solo quando sono fisicamente presenti con il cliente.
Tone of voice: diretto, autorevole, caldo. Concreto, mai teorico. Stile "Claudio che parla in faccia"."""


class GenerateScriptsRequest(BaseModel):
    topic: str
    source_post: Optional[str] = None


class GenerateCalendarRequest(BaseModel):
    month: str
    linkedin_posts: Optional[List[Dict[str, Any]]] = []


@router.post("/generate-scripts")
async def generate_triple_script(request: GenerateScriptsRequest):
    """
    Genera 3 script video per Evolution PRO:
    - YouTube Long (8-12 min)
    - YouTube Short / Reel (45-60 sec)
    - LinkedIn Video (60-90 sec)
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY non configurata")
        
        context = ""
        if request.source_post:
            context = f'\n\nPOST LINKEDIN DI PARTENZA (rielabora e approfondisci, non copiare):\n"{request.source_post}"'
        
        prompt = f"""Genera 3 script video per Evolution PRO sul tema: "{request.topic}"{context}

Ogni script deve essere ottimizzato per HeyGen (avatar AI) con note di regia.

FORMATO OBBLIGATORIO — rispondi SOLO con JSON valido:
{{
  "topic": "{request.topic}",
  "youtube_long": {{
    "title": "titolo SEO ottimizzato per YouTube (max 60 caratteri)",
    "description": "descrizione YouTube SEO (150-200 parole con keyword naturali e link a evolution-pro.it)",
    "tags": "tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8",
    "duration_est": "X minuti",
    "script": "INTRO (0:00-0:30)\\n[NOTA HEYGEN: tono energico, guarda in camera]\\n[testo parlato intro]\\n\\nSVILUPPO 1 (0:30-3:00)\\n[NOTA HEYGEN: tono riflessivo, gesticola]\\n[testo]\\n\\nSVILUPPO 2 (3:00-6:00)\\n[NOTA HEYGEN:]\\n[testo]\\n\\nSVILUPPO 3 (6:00-9:00)\\n[NOTA HEYGEN:]\\n[testo]\\n\\nCTA FINALE (9:00-fine)\\n[NOTA HEYGEN: tono diretto, deciso]\\n[testo CTA con mention evolution-pro.it]",
    "thumbnail_concept": "descrizione del concept visivo per la thumbnail"
  }},
  "short": {{
    "title": "titolo Short/Reel (max 50 caratteri, curiosità)",
    "description": "descrizione breve con hashtag",
    "tags": "tag1, tag2, tag3",
    "duration_est": "55 secondi",
    "script": "HOOK (0:00-0:05)\\n[NOTA HEYGEN: veloce, impattante, leaning forward]\\n[testo hook – prima frase che ferma lo scroll]\\n\\nCORPO (0:05-0:45)\\n[NOTA HEYGEN:]\\n[testo – un solo punto chiave sviluppato bene]\\n\\nCTA (0:45-0:55)\\n[NOTA HEYGEN: sorriso, diretto]\\n[testo CTA]",
    "thumbnail_concept": "frame chiave da usare come cover"
  }},
  "linkedin_video": {{
    "title": "titolo post LinkedIn",
    "description": "testo post LinkedIn che accompagna il video (hook + corpo + CTA + hashtag)",
    "duration_est": "75 secondi",
    "script": "APERTURA (0:00-0:10)\\n[NOTA HEYGEN: professionale, autorevole]\\n[testo]\\n\\nVALORE (0:10-1:00)\\n[NOTA HEYGEN:]\\n[testo]\\n\\nCHIUSURA (1:00-1:15)\\n[NOTA HEYGEN: caldo, invita all'azione]\\n[testo CTA]",
    "thumbnail_concept": "frame o copertina per LinkedIn"
  }}
}}"""

        llm = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"yt-heygen-{request.topic[:20]}",
            system_message=EVOLUTION_PRO_SYSTEM
        ).with_model("anthropic", "claude-haiku-4-5-20251001")
        
        response = await llm.send_message(UserMessage(text=prompt))
        
        # Parse JSON dalla risposta
        clean = response.replace("```json", "").replace("```", "").strip()
        try:
            result = json.loads(clean)
        except json.JSONDecodeError:
            # Prova a estrarre JSON
            import re
            match = re.search(r'\{[\s\S]*\}', clean)
            if match:
                result = json.loads(match.group(0))
            else:
                raise HTTPException(status_code=500, detail="Errore nel parsing della risposta AI")
        
        logger.info(f"Generated scripts for topic: {request.topic}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Script generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-calendar")
async def generate_monthly_calendar(request: GenerateCalendarRequest):
    """
    Genera un piano editoriale YouTube mensile sincronizzato con LinkedIn
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY non configurata")
        
        posts_context = ""
        if request.linkedin_posts:
            posts_context = f"\n\nCALENDARIO LINKEDIN GIÀ ESISTENTE (usa questi temi come base, 1 video ogni 2-3 post LinkedIn):\n"
            posts_context += "\n".join([
                f"{i+1}. [{p.get('type', 'post')}] {p.get('hook', p.get('title', ''))}"
                for i, p in enumerate(request.linkedin_posts[:15])
            ])
        
        prompt = f"""Crea un piano editoriale YouTube mensile per Evolution PRO per {request.month}.
{posts_context}

Genera 8 video YouTube (circa 2 a settimana) + 12 Shorts (3 a settimana) + 8 video LinkedIn.
Distribuiscili in modo strategico nel mese con temi progressivi.

SOLO JSON valido:
{{
  "month": "{request.month}",
  "strategy": "breve nota strategica sul mese (2-3 righe)",
  "videos": [
    {{
      "week": 1,
      "day": "Martedì",
      "format": "youtube_long|short|linkedin_video",
      "topic": "titolo/tema del video",
      "angle": "angolo specifico / hook principale",
      "linked_linkedin_post": "numero del post LinkedIn correlato o null",
      "priority": "alta|media"
    }}
  ]
}}

Includi tutti i 28 video totali."""

        llm = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"yt-calendar-{request.month}",
            system_message=EVOLUTION_PRO_SYSTEM
        ).with_model("anthropic", "claude-haiku-4-5-20251001")
        
        response = await llm.send_message(UserMessage(text=prompt))
        
        # Parse JSON
        clean = response.replace("```json", "").replace("```", "").strip()
        try:
            result = json.loads(clean)
        except json.JSONDecodeError:
            import re
            match = re.search(r'\{[\s\S]*\}', clean)
            if match:
                result = json.loads(match.group(0))
            else:
                raise HTTPException(status_code=500, detail="Errore nel parsing della risposta AI")
        
        logger.info(f"Generated YouTube calendar for: {request.month}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calendar generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# YOUTUBE OAUTH MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/youtube/auth-status")
async def youtube_auth_status():
    """Verifica stato autenticazione YouTube"""
    import pickle
    from pathlib import Path
    
    creds_path = Path("/app/storage/youtube_credentials.pickle")
    client_path = Path("/app/storage/client_secret.json")
    
    if not client_path.exists():
        return {
            "status": "not_configured",
            "message": "client_secret.json non trovato. Carica le credenziali OAuth da Google Cloud Console.",
            "next_step": "upload_client_secret"
        }
    
    if not creds_path.exists():
        return {
            "status": "not_authorized",
            "message": "Token OAuth non presente. Richiedi autorizzazione.",
            "next_step": "get_auth_url"
        }
    
    try:
        from services.secure_credentials import load_credentials, save_credentials
        creds = load_credentials(creds_path)
        
        if not creds:
            return {
                "status": "not_authorized",
                "valid": False,
                "message": "Credenziali non valide. Riautorizza.",
                "next_step": "get_auth_url"
            }
        
        if creds.valid:
            return {
                "status": "authorized",
                "valid": True,
                "expiry": str(creds.expiry),
                "message": "YouTube connesso e funzionante!"
            }
        elif creds.expired and creds.refresh_token:
            # Prova a refreshare
            from google.auth.transport.requests import Request
            try:
                creds.refresh(Request())
                save_credentials(creds, creds_path)
                return {
                    "status": "authorized",
                    "valid": True,
                    "refreshed": True,
                    "expiry": str(creds.expiry),
                    "message": "Token refreshato con successo!"
                }
            except Exception as e:
                return {
                    "status": "expired",
                    "valid": False,
                    "message": f"Token scaduto e refresh fallito: {e}",
                    "next_step": "get_auth_url"
                }
        else:
            return {
                "status": "expired",
                "valid": False,
                "message": "Token scaduto senza refresh token",
                "next_step": "get_auth_url"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "next_step": "get_auth_url"
        }


from fastapi import UploadFile, File

@router.post("/youtube/upload-client-secret")
async def upload_youtube_client_secret(file: UploadFile = File(...)):
    """
    Carica il file client_secret.json per l'autenticazione OAuth YouTube.
    
    Ottieni il file da Google Cloud Console:
    1. Vai su console.cloud.google.com
    2. APIs & Services → Credentials
    3. Create Credentials → OAuth 2.0 Client ID
    4. Application type: Desktop app
    5. Download JSON
    """
    import json
    from pathlib import Path
    
    # Validate file
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Il file deve essere un JSON")
    
    # Read and validate content
    content = await file.read()
    try:
        client_config = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON non valido")
    
    # Validate structure
    if 'installed' not in client_config and 'web' not in client_config:
        raise HTTPException(
            status_code=400, 
            detail="Struttura client_secret non valida. Deve contenere 'installed' o 'web'."
        )
    
    # Get client info
    config_type = 'installed' if 'installed' in client_config else 'web'
    client_id = client_config[config_type].get('client_id', 'N/A')
    
    # Save to storage
    storage_path = Path("/app/storage")
    storage_path.mkdir(parents=True, exist_ok=True)
    
    client_path = storage_path / "client_secret.json"
    with open(client_path, 'w') as f:
        json.dump(client_config, f, indent=2)
    
    logger.info(f"[YOUTUBE] Client secret uploaded: {client_id[:30]}...")
    
    return {
        "success": True,
        "message": "client_secret.json caricato con successo",
        "client_id": client_id[:40] + "...",
        "config_type": config_type,
        "next_step": "Vai a GET /api/youtube-heygen/youtube/get-auth-url per generare l'URL di autorizzazione"
    }


@router.get("/youtube/get-auth-url")
async def get_youtube_auth_url():
    """Genera URL per autorizzazione OAuth YouTube"""
    import json
    from pathlib import Path
    from google_auth_oauthlib.flow import InstalledAppFlow
    
    client_path = Path("/app/storage/client_secret.json")
    if not client_path.exists():
        raise HTTPException(status_code=400, detail="client_secret.json non trovato. Usa POST /youtube/upload-client-secret per caricarlo.")
    
    with open(client_path, 'r') as f:
        client_config = json.load(f)
    
    SCOPES = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube'
    ]
    
    flow = InstalledAppFlow.from_client_config(
        client_config,
        SCOPES,
        redirect_uri='urn:ietf:wg:oauth:2.0:oob'
    )
    
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    return {
        "auth_url": auth_url,
        "instructions": [
            "1. Apri il link auth_url nel browser",
            "2. Accedi con l'account Google del canale YouTube",
            "3. Autorizza l'applicazione",
            "4. Copia il codice di autorizzazione",
            "5. Invialo a POST /youtube/complete-auth"
        ]
    }


class CompleteAuthRequest(BaseModel):
    auth_code: str


@router.post("/youtube/complete-auth")
async def complete_youtube_auth(request: CompleteAuthRequest):
    """Completa il flow OAuth con il codice di autorizzazione"""
    import json
    import pickle
    from pathlib import Path
    from google_auth_oauthlib.flow import InstalledAppFlow
    
    client_path = Path("/app/storage/client_secret.json")
    creds_path = Path("/app/storage/youtube_credentials.pickle")
    
    if not client_path.exists():
        raise HTTPException(status_code=400, detail="client_secret.json non trovato")
    
    with open(client_path, 'r') as f:
        client_config = json.load(f)
    
    SCOPES = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube'
    ]
    
    try:
        flow = InstalledAppFlow.from_client_config(
            client_config,
            SCOPES,
            redirect_uri='urn:ietf:wg:oauth:2.0:oob'
        )
        
        flow.fetch_token(code=request.auth_code)
        creds = flow.credentials
        
        # Salva credenziali
        with open(creds_path, 'wb') as f:
            pickle.dump(creds, f)
        
        logger.info("YouTube OAuth completato con successo")
        
        return {
            "success": True,
            "message": "YouTube connesso con successo!",
            "valid": creds.valid,
            "expiry": str(creds.expiry)
        }
        
    except Exception as e:
        logger.error(f"YouTube OAuth error: {e}")
        raise HTTPException(status_code=400, detail=f"Errore autorizzazione: {e}")


@router.post("/youtube/upload-from-heygen/{video_id}")
async def upload_heygen_video_to_youtube(video_id: str, privacy_status: str = "unlisted"):
    """
    Upload automatico di un video HeyGen completato su YouTube.
    Chiamato automaticamente quando un video HeyGen è pronto.
    """
    import httpx
    from pathlib import Path
    from datetime import datetime, timezone
    from services.secure_credentials import load_credentials, save_credentials
    
    # Verifica auth
    creds_path = "/app/storage/youtube_credentials.pickle"
    creds = load_credentials(creds_path)
    if not creds:
        raise HTTPException(status_code=400, detail="YouTube non autorizzato")
    
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            from google.auth.transport.requests import Request
            try:
                creds.refresh(Request())
                save_credentials(creds, creds_path)
            except Exception:
                raise HTTPException(status_code=401, detail="Token scaduto, riautorizza")
        else:
            raise HTTPException(status_code=401, detail="Token non valido")
    
    # Recupera info video da HeyGen job
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'evolution_pro')]
    
    job = await db.heygen_jobs.find_one({"video_id": video_id})
    if not job:
        raise HTTPException(status_code=404, detail="Video non trovato")
    
    if job.get("status") != "completed":
        raise HTTPException(status_code=400, detail=f"Video non completato: {job.get('status')}")
    
    video_url = job.get("video_url")
    if not video_url:
        raise HTTPException(status_code=400, detail="URL video non disponibile")
    
    # Scarica video
    temp_path = f"/tmp/heygen_{video_id}.mp4"
    async with httpx.AsyncClient(timeout=300) as http_client:
        response = await http_client.get(video_url)
        with open(temp_path, 'wb') as f:
            f.write(response.content)
    
    # Recupera info partner
    partner = await db.partners.find_one({"id": job.get("partner_id")})
    partner_name = partner.get("name", "Partner") if partner else "Partner"
    partner_niche = partner.get("niche", "Business") if partner else "Business"
    
    # Upload su YouTube
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    
    service = build('youtube', 'v3', credentials=creds)
    
    title = job.get("video_title", f"Video {video_id}")
    description = f"""🎓 {title}

Videocorso professionale di {partner_name}
Prodotto da Evolution PRO

📚 Scopri di più: https://evolution-pro.it

#EvolutionPRO #Videocorso #Formazione
"""
    
    body = {
        'snippet': {
            'title': title[:100],
            'description': description,
            'tags': ['Evolution PRO', 'Videocorso', partner_name, partner_niche],
            'categoryId': '27'
        },
        'status': {
            'privacyStatus': privacy_status,
            'selfDeclaredMadeForKids': False
        }
    }
    
    media = MediaFileUpload(temp_path, mimetype='video/mp4', resumable=True)
    
    request = service.videos().insert(
        part=','.join(body.keys()),
        body=body,
        media_body=media
    )
    
    response = None
    while response is None:
        status, response = request.next_chunk()
    
    youtube_video_id = response.get('id')
    youtube_url = f"https://youtu.be/{youtube_video_id}"
    
    # Aggiorna job
    await db.heygen_jobs.update_one(
        {"video_id": video_id},
        {"$set": {
            "youtube_video_id": youtube_video_id,
            "youtube_url": youtube_url,
            "youtube_uploaded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Cleanup
    import os as os_module
    os_module.remove(temp_path)
    client.close()
    
    logger.info(f"Video uploaded to YouTube: {youtube_url}")
    
    return {
        "success": True,
        "youtube_video_id": youtube_video_id,
        "youtube_url": youtube_url,
        "privacy_status": privacy_status
    }

