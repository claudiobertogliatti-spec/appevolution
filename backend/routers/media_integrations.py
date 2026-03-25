"""
Router per integrazioni Media - Canva, Kling AI, HeyGen
Stub pronti per attivazione quando le API keys saranno configurate

PARTE B - Analisi PDF (Canva)
PARTE C - Calendario Editoriale (Canva + Kling + HeyGen)
PARTE D - Brand Kit Partner (Canva)
"""

import os
import json
import logging
import uuid
import httpx
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/media", tags=["media-integrations"])

# Database reference
db = None

def set_db(database):
    global db
    db = database

# API Keys (da configurare)
CANVA_API_TOKEN = os.environ.get('CANVA_API_TOKEN', '')
CANVA_TEMPLATE_ANALISI_ID = os.environ.get('CANVA_TEMPLATE_ANALISI_ID', '')
CANVA_TEMPLATE_POST_ID = os.environ.get('CANVA_TEMPLATE_POST_ID', '')
CANVA_TEMPLATE_CAROSELLO_ID = os.environ.get('CANVA_TEMPLATE_CAROSELLO_ID', '')
CANVA_TEMPLATE_REEL_ID = os.environ.get('CANVA_TEMPLATE_REEL_ID', '')
KLING_API_KEY = os.environ.get('KLING_API_KEY', '')
KLING_API_SECRET = os.environ.get('KLING_API_SECRET', '')

# Cloudinary (già configurato)
CLOUDINARY_URL = os.environ.get('CLOUDINARY_URL', '')


def is_canva_configured():
    return bool(CANVA_API_TOKEN and CANVA_TEMPLATE_ANALISI_ID)


def is_kling_configured():
    return bool(KLING_API_KEY and KLING_API_SECRET)


# ═══════════════════════════════════════════════════════════════════════════════
# PARTE B - ANALISI PDF VISIVO (Canva)
# ═══════════════════════════════════════════════════════════════════════════════

class GeneraAnalisiPDFRequest(BaseModel):
    user_id: str
    nome_cliente: str
    nicchia: str
    posizionamento: str
    opportunita: str
    roadmap: str
    probabilita_successo: str


@router.post("/analisi-pdf/genera")
async def genera_analisi_pdf(request: GeneraAnalisiPDFRequest, background_tasks: BackgroundTasks):
    """
    Genera PDF visivo dell'analisi usando Canva.
    
    Flow:
    1. Autofill template Canva con dati analisi
    2. Export come PDF
    3. Upload su Cloudinary
    4. Salva URL in MongoDB
    """
    if not is_canva_configured():
        # STUB: Restituisce mock response
        logger.info(f"[CANVA STUB] Genera analisi PDF per {request.nome_cliente}")
        
        mock_pdf_url = f"https://cloudinary.com/mock/analisi_{request.user_id}.pdf"
        
        # Salva mock URL nel database
        if db:
            await db.users.update_one(
                {"id": request.user_id},
                {"$set": {
                    "analisi_pdf_url": mock_pdf_url,
                    "analisi_pdf_status": "mock",
                    "analisi_pdf_generated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {
            "status": "stub",
            "message": "Canva non configurato - usando mock response",
            "pdf_url": mock_pdf_url,
            "note": "Configura CANVA_API_TOKEN e CANVA_TEMPLATE_ANALISI_ID per attivare"
        }
    
    # PRODUZIONE: Usa Canva API
    background_tasks.add_task(
        _genera_analisi_pdf_canva,
        request.user_id,
        request.dict()
    )
    
    return {
        "status": "processing",
        "message": "Generazione PDF avviata",
        "user_id": request.user_id
    }


async def _genera_analisi_pdf_canva(user_id: str, data: Dict):
    """Task background per generare PDF con Canva"""
    try:
        async with httpx.AsyncClient() as client:
            # Step 1: Autofill template
            autofill_response = await client.post(
                "https://api.canva.com/rest/v1/autofills",
                headers={
                    "Authorization": f"Bearer {CANVA_API_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={
                    "brand_template_id": CANVA_TEMPLATE_ANALISI_ID,
                    "title": f"Analisi_{data['nome_cliente']}_{datetime.now().strftime('%Y%m%d')}",
                    "data": {
                        "nome_cliente": data["nome_cliente"],
                        "nicchia": data["nicchia"],
                        "posizionamento": data["posizionamento"],
                        "opportunita": data["opportunita"],
                        "roadmap": data["roadmap"],
                        "probabilita_successo": data["probabilita_successo"],
                        "data_analisi": datetime.now().strftime("%d/%m/%Y")
                    }
                }
            )
            
            if autofill_response.status_code != 200:
                raise Exception(f"Canva autofill failed: {autofill_response.text}")
            
            job_data = autofill_response.json()
            job_id = job_data.get("job", {}).get("id")
            
            # Step 2: Poll fino a completamento
            design_id = None
            for _ in range(30):  # Max 30 tentativi
                await asyncio.sleep(2)
                status_response = await client.get(
                    f"https://api.canva.com/rest/v1/autofills/{job_id}",
                    headers={"Authorization": f"Bearer {CANVA_API_TOKEN}"}
                )
                status_data = status_response.json()
                
                if status_data.get("job", {}).get("status") == "success":
                    design_id = status_data.get("job", {}).get("result", {}).get("design", {}).get("id")
                    break
                elif status_data.get("job", {}).get("status") == "failed":
                    raise Exception("Canva autofill job failed")
            
            if not design_id:
                raise Exception("Canva autofill timeout")
            
            # Step 3: Export PDF
            export_response = await client.post(
                "https://api.canva.com/rest/v1/exports",
                headers={
                    "Authorization": f"Bearer {CANVA_API_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={
                    "design_id": design_id,
                    "format": {"type": "pdf"}
                }
            )
            
            export_data = export_response.json()
            export_id = export_data.get("job", {}).get("id")
            
            # Step 4: Poll export
            pdf_url = None
            for _ in range(30):
                await asyncio.sleep(2)
                export_status = await client.get(
                    f"https://api.canva.com/rest/v1/exports/{export_id}",
                    headers={"Authorization": f"Bearer {CANVA_API_TOKEN}"}
                )
                export_status_data = export_status.json()
                
                if export_status_data.get("job", {}).get("status") == "success":
                    pdf_url = export_status_data.get("job", {}).get("result", {}).get("urls", [{}])[0].get("url")
                    break
            
            if not pdf_url:
                raise Exception("Canva export timeout")
            
            # Step 5: Upload su Cloudinary e salva URL
            # TODO: Implementare upload Cloudinary
            
            # Salva nel database
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "analisi_pdf_url": pdf_url,
                    "analisi_pdf_status": "ready",
                    "analisi_pdf_generated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"[CANVA] PDF analisi generato per {user_id}")
            
    except Exception as e:
        logger.error(f"[CANVA] Errore generazione PDF: {e}")
        if db:
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "analisi_pdf_status": "error",
                    "analisi_pdf_error": str(e)
                }}
            )


# ═══════════════════════════════════════════════════════════════════════════════
# PARTE C - CONTENUTI CALENDARIO (Canva + Kling)
# ═══════════════════════════════════════════════════════════════════════════════

class GeneraPostRequest(BaseModel):
    topic: str
    copy_text: str  # Renamed from 'copy' to avoid shadowing BaseModel.copy()
    hashtag: List[str]
    style: str = "professional"


class GeneraCaroselloRequest(BaseModel):
    topic: str
    slides: List[Dict[str, str]]  # [{title, content}, ...]
    style: str = "professional"


class GeneraReelKlingRequest(BaseModel):
    prompt_visivo: str
    duration: int = 5  # secondi
    aspect_ratio: str = "9:16"


class GeneraCalendarioEditorialeRequest(BaseModel):
    partner_id: str
    mese: int  # 1-12
    anno: int
    nicchia: str
    target: str
    tono: str = "professionale"
    num_post: int = 12  # Post per mese


@router.post("/calendario/genera")
async def genera_calendario_editoriale(request: GeneraCalendarioEditorialeRequest, background_tasks: BackgroundTasks):
    """
    Genera un calendario editoriale mensile completo per un partner.
    
    Flow:
    1. Genera piano contenuti con Claude AI (temi, copy, hashtag)
    2. Per ogni contenuto, prepara le richieste per:
       - Canva (immagini, caroselli)
       - Kling AI (video)
       - HeyGen (video avatar)
    3. Salva il calendario nel database
    4. Restituisce il calendario pronto per revisione
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    # Verifica partner esistente
    partner = await db.partners.find_one({"id": request.partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    # Crea record calendario
    calendario_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    calendario_doc = {
        "id": calendario_id,
        "partner_id": request.partner_id,
        "partner_name": partner.get("name", "Partner"),
        "mese": request.mese,
        "anno": request.anno,
        "stato": "generazione_piano",
        "nicchia": request.nicchia,
        "target": request.target,
        "tono": request.tono,
        "num_post": request.num_post,
        "contenuti": [],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.calendari_editoriali.insert_one(calendario_doc)
    
    # Avvia generazione in background
    background_tasks.add_task(
        _genera_piano_contenuti_claude,
        calendario_id,
        request.dict()
    )
    
    return {
        "status": "processing",
        "calendario_id": calendario_id,
        "message": f"Generazione calendario {request.mese}/{request.anno} avviata",
        "poll_endpoint": f"/api/media/calendario/{calendario_id}/status"
    }


async def _genera_piano_contenuti_claude(calendario_id: str, data: Dict):
    """
    Task background che genera il piano contenuti usando Claude AI.
    """
    try:
        # Genera piano contenuti con Claude
        EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
        
        mesi_italiani = [
            "", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
            "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
        ]
        mese_nome = mesi_italiani[data['mese']]
        
        prompt = f"""Sei un social media strategist esperto. Genera un piano di contenuti per {mese_nome} {data['anno']}.

CONTESTO:
- Nicchia: {data['nicchia']}
- Target: {data['target']}
- Tono di voce: {data['tono']}
- Numero contenuti: {data['num_post']}

Per ogni contenuto genera:
1. Data di pubblicazione (giorno del mese)
2. Tipo contenuto: POST, CAROSELLO, REEL, VIDEO_AVATAR
3. Titolo/Hook accattivante
4. Copy completo (max 300 caratteri per IG, 500 per LinkedIn)
5. 5-7 hashtag rilevanti
6. Prompt visivo per generazione immagine/video
7. Call to Action

Distribuisci i contenuti uniformemente nel mese.
Alterna i tipi di contenuto per varietà.
I reel e video avatar dovrebbero essere 20-30% del totale.

Rispondi SOLO in JSON valido con questa struttura:
{{
  "contenuti": [
    {{
      "giorno": 3,
      "tipo": "POST",
      "titolo": "...",
      "copy": "...",
      "hashtags": ["...", "..."],
      "prompt_visivo": "...",
      "cta": "..."
    }}
  ]
}}"""

        contenuti = []
        
        if EMERGENT_LLM_KEY:
            try:
                from emergentintegrations.llm.chat import LlmChat, UserMessage
                
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    model="claude-sonnet-4-20250514"
                )
                
                response = await chat.send_async(
                    messages=[UserMessage(text=prompt)],
                    max_tokens=4000,
                    temperature=0.7
                )
                
                # Estrai JSON dalla risposta
                response_text = response.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                parsed = json.loads(response_text.strip())
                contenuti = parsed.get("contenuti", [])
                
            except Exception as e:
                logger.error(f"[CALENDARIO] Errore Claude: {e}")
        
        # Se Claude fallisce o non configurato, genera mock
        if not contenuti:
            contenuti = _genera_contenuti_mock(data['num_post'], data['mese'], data['nicchia'])
        
        # Arricchisci ogni contenuto con asset_status
        for contenuto in contenuti:
            contenuto["asset_status"] = "pending"
            contenuto["asset_url"] = None
            contenuto["id"] = str(uuid.uuid4())
        
        # Aggiorna calendario nel database
        await db.calendari_editoriali.update_one(
            {"id": calendario_id},
            {"$set": {
                "stato": "piano_pronto",
                "contenuti": contenuti,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"[CALENDARIO] Piano generato per {calendario_id}: {len(contenuti)} contenuti")
        
    except Exception as e:
        logger.error(f"[CALENDARIO] Errore generazione piano: {e}")
        await db.calendari_editoriali.update_one(
            {"id": calendario_id},
            {"$set": {
                "stato": "errore",
                "error": str(e),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )


def _genera_contenuti_mock(num_post: int, mese: int, nicchia: str) -> List[Dict]:
    """Genera contenuti mock quando Claude non è disponibile"""
    import random
    
    tipi = ["POST", "POST", "POST", "CAROSELLO", "CAROSELLO", "REEL", "VIDEO_AVATAR"]
    contenuti = []
    
    giorni_usati = set()
    for i in range(num_post):
        # Scegli giorno unico nel mese
        while True:
            giorno = random.randint(1, 28)
            if giorno not in giorni_usati:
                giorni_usati.add(giorno)
                break
        
        tipo = random.choice(tipi)
        
        contenuti.append({
            "giorno": giorno,
            "tipo": tipo,
            "titolo": f"Contenuto {i+1} per {nicchia}",
            "copy": f"Questo è un contenuto di esempio per la nicchia {nicchia}. Personalizza questo testo con il tuo messaggio unico. #content #marketing",
            "hashtags": ["marketing", "business", "growth", nicchia.lower().replace(" ", ""), "italy"],
            "prompt_visivo": f"Professional {nicchia} content, modern design, vibrant colors",
            "cta": "Scopri di più nel link in bio!"
        })
    
    # Ordina per giorno
    contenuti.sort(key=lambda x: x["giorno"])
    
    return contenuti


@router.get("/calendario/{calendario_id}/status")
async def get_calendario_status(calendario_id: str):
    """Verifica stato generazione calendario"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    calendario = await db.calendari_editoriali.find_one({"id": calendario_id}, {"_id": 0})
    if not calendario:
        raise HTTPException(status_code=404, detail="Calendario non trovato")
    
    return calendario


@router.get("/calendario/partner/{partner_id}")
async def get_calendari_partner(partner_id: str, limit: int = 12):
    """Lista calendari di un partner"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    calendari = await db.calendari_editoriali.find(
        {"partner_id": partner_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "calendari": calendari,
        "count": len(calendari)
    }


@router.post("/calendario/{calendario_id}/genera-assets")
async def genera_assets_calendario(calendario_id: str, background_tasks: BackgroundTasks):
    """
    Avvia la generazione degli asset visivi per tutti i contenuti del calendario.
    Chiama Canva, Kling e HeyGen in base al tipo di contenuto.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    calendario = await db.calendari_editoriali.find_one({"id": calendario_id})
    if not calendario:
        raise HTTPException(status_code=404, detail="Calendario non trovato")
    
    if calendario.get("stato") != "piano_pronto":
        raise HTTPException(status_code=400, detail=f"Calendario in stato {calendario.get('stato')}, deve essere 'piano_pronto'")
    
    # Aggiorna stato
    await db.calendari_editoriali.update_one(
        {"id": calendario_id},
        {"$set": {
            "stato": "generazione_assets",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Avvia generazione in background
    background_tasks.add_task(_genera_assets_calendario, calendario_id, calendario.get("contenuti", []))
    
    return {
        "status": "processing",
        "calendario_id": calendario_id,
        "message": f"Generazione asset avviata per {len(calendario.get('contenuti', []))} contenuti"
    }


async def _genera_assets_calendario(calendario_id: str, contenuti: List[Dict]):
    """
    Task background che genera gli asset per ogni contenuto.
    In modalità stub, genera URL mock.
    """
    try:
        for i, contenuto in enumerate(contenuti):
            tipo = contenuto.get("tipo", "POST")
            contenuto_id = contenuto.get("id", str(i))
            
            # Genera asset in base al tipo
            if tipo == "POST":
                # Canva POST
                if is_canva_configured():
                    # TODO: Chiamare Canva API reale
                    contenuto["asset_url"] = f"https://cloudinary.com/mock/post_{contenuto_id}.png"
                    contenuto["asset_status"] = "pending_canva"
                else:
                    contenuto["asset_url"] = f"https://cloudinary.com/mock/post_{contenuto_id}.png"
                    contenuto["asset_status"] = "mock"
            
            elif tipo == "CAROSELLO":
                # Canva CAROSELLO
                if is_canva_configured():
                    contenuto["asset_url"] = f"https://cloudinary.com/mock/carosello_{contenuto_id}.pdf"
                    contenuto["asset_status"] = "pending_canva"
                else:
                    contenuto["asset_url"] = f"https://cloudinary.com/mock/carosello_{contenuto_id}.pdf"
                    contenuto["asset_status"] = "mock"
            
            elif tipo == "REEL":
                # Kling AI
                if is_kling_configured():
                    contenuto["asset_url"] = f"https://cloudinary.com/mock/reel_{contenuto_id}.mp4"
                    contenuto["asset_status"] = "pending_kling"
                else:
                    contenuto["asset_url"] = f"https://cloudinary.com/mock/reel_{contenuto_id}.mp4"
                    contenuto["asset_status"] = "mock"
            
            elif tipo == "VIDEO_AVATAR":
                # HeyGen - già configurato ma per ora mock
                contenuto["asset_url"] = f"https://cloudinary.com/mock/avatar_{contenuto_id}.mp4"
                contenuto["asset_status"] = "mock_heygen"
            
            else:
                # Tipo sconosciuto
                contenuto["asset_url"] = f"https://cloudinary.com/mock/unknown_{contenuto_id}.png"
                contenuto["asset_status"] = "mock"
        
        # Aggiorna tutto il calendario in una volta (più efficiente)
        await db.calendari_editoriali.update_one(
            {"id": calendario_id},
            {"$set": {
                "stato": "assets_pronti",
                "contenuti": contenuti,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"[CALENDARIO] Assets generati per {calendario_id}")
        
    except Exception as e:
        logger.error(f"[CALENDARIO] Errore generazione assets: {e}")
        await db.calendari_editoriali.update_one(
            {"id": calendario_id},
            {"$set": {
                "stato": "errore_assets",
                "error": str(e),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )


@router.post("/canva/post")
async def genera_post_canva(request: GeneraPostRequest):
    """Genera post grafico con Canva"""
    if not is_canva_configured():
        return {
            "status": "stub",
            "message": "Canva non configurato",
            "mock_url": f"https://cloudinary.com/mock/post_{uuid.uuid4().hex[:8]}.png",
            "topic": request.topic,
            "note": "Configura CANVA_API_TOKEN per attivare"
        }
    
    # TODO: Implementare con Canva API
    return {"status": "processing", "message": "Generazione avviata"}


@router.post("/canva/carosello")
async def genera_carosello_canva(request: GeneraCaroselloRequest):
    """Genera carosello con Canva"""
    if not is_canva_configured():
        return {
            "status": "stub",
            "message": "Canva non configurato",
            "mock_urls": [f"https://cloudinary.com/mock/slide_{i}.png" for i in range(len(request.slides))],
            "mock_pdf": f"https://cloudinary.com/mock/carosello_{uuid.uuid4().hex[:8]}.pdf",
            "topic": request.topic,
            "num_slides": len(request.slides),
            "note": "Configura CANVA_API_TOKEN per attivare"
        }
    
    # TODO: Implementare con Canva API
    return {"status": "processing", "message": "Generazione avviata"}


@router.post("/canva/reel-animato")
async def genera_reel_animato_canva(request: dict):
    """Genera reel animato con Canva"""
    if not is_canva_configured():
        return {
            "status": "stub",
            "message": "Canva non configurato",
            "mock_url": f"https://cloudinary.com/mock/reel_{uuid.uuid4().hex[:8]}.mp4",
            "note": "Configura CANVA_API_TOKEN e CANVA_TEMPLATE_REEL_ID per attivare"
        }
    
    # TODO: Implementare con Canva API
    return {"status": "processing", "message": "Generazione avviata"}


@router.post("/kling/reel")
async def genera_reel_kling(request: GeneraReelKlingRequest):
    """
    Genera reel cinematografico con Kling AI.
    
    Kling API v2-1 text-to-video.
    """
    if not is_kling_configured():
        return {
            "status": "stub",
            "message": "Kling AI non configurato",
            "mock_url": f"https://cloudinary.com/mock/kling_reel_{uuid.uuid4().hex[:8]}.mp4",
            "prompt": request.prompt_visivo,
            "duration": request.duration,
            "note": "Configura KLING_API_KEY e KLING_API_SECRET per attivare"
        }
    
    # PRODUZIONE: Chiama Kling API
    try:
        import jwt
        import time
        
        # Genera JWT per autenticazione Kling
        payload = {
            "iss": KLING_API_KEY,
            "exp": int(time.time()) + 1800,  # 30 minuti
            "nbf": int(time.time()) - 5
        }
        token = jwt.encode(payload, KLING_API_SECRET, algorithm="HS256")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.klingai.com/v1/videos/text2video",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={
                    "model_name": "kling-v2-1",
                    "prompt": request.prompt_visivo,
                    "negative_prompt": "low quality, blurry, watermark",
                    "cfg_scale": 0.5,
                    "mode": "std",
                    "duration": str(request.duration),
                    "aspect_ratio": request.aspect_ratio
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"Kling API error: {response.text}")
            
            data = response.json()
            task_id = data.get("data", {}).get("task_id")
            
            return {
                "status": "processing",
                "task_id": task_id,
                "message": "Video generation started",
                "poll_endpoint": f"/api/media/kling/status/{task_id}"
            }
            
    except Exception as e:
        logger.error(f"[KLING] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kling/status/{task_id}")
async def get_kling_status(task_id: str):
    """Verifica stato generazione Kling"""
    if not is_kling_configured():
        return {
            "status": "stub",
            "task_id": task_id,
            "mock_video_url": f"https://cloudinary.com/mock/kling_{task_id}.mp4",
            "note": "Kling non configurato"
        }
    
    try:
        import jwt
        import time
        
        payload = {
            "iss": KLING_API_KEY,
            "exp": int(time.time()) + 1800,
            "nbf": int(time.time()) - 5
        }
        token = jwt.encode(payload, KLING_API_SECRET, algorithm="HS256")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.klingai.com/v1/videos/text2video/{task_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            data = response.json()
            task_status = data.get("data", {}).get("task_status")
            
            if task_status == "succeed":
                video_url = data.get("data", {}).get("task_result", {}).get("videos", [{}])[0].get("url")
                return {
                    "status": "completed",
                    "video_url": video_url,
                    "task_id": task_id
                }
            elif task_status == "failed":
                return {
                    "status": "failed",
                    "error": data.get("data", {}).get("task_status_msg"),
                    "task_id": task_id
                }
            else:
                return {
                    "status": "processing",
                    "task_id": task_id,
                    "progress": task_status
                }
                
    except Exception as e:
        logger.error(f"[KLING] Status check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# PARTE D - BRAND KIT PARTNER (Canva)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/brand-kit/{partner_id}")
async def get_brand_kit(partner_id: str):
    """Recupera brand kit del partner"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    brand_kit = partner.get("canva_design_ids", {})
    
    if not brand_kit and not is_canva_configured():
        return {
            "status": "stub",
            "partner_id": partner_id,
            "message": "Brand kit non generato - Canva non configurato",
            "mock_designs": {
                "post": f"https://canva.com/design/mock_post_{partner_id}",
                "carosello": f"https://canva.com/design/mock_carosello_{partner_id}",
                "reel": f"https://canva.com/design/mock_reel_{partner_id}"
            },
            "note": "Configura CANVA_API_TOKEN per attivare"
        }
    
    return {
        "partner_id": partner_id,
        "brand_kit": brand_kit,
        "canva_links": {
            "post": f"https://canva.com/design/{brand_kit.get('post')}/edit" if brand_kit.get("post") else None,
            "carosello": f"https://canva.com/design/{brand_kit.get('carosello')}/edit" if brand_kit.get("carosello") else None,
            "reel": f"https://canva.com/design/{brand_kit.get('reel')}/edit" if brand_kit.get("reel") else None
        }
    }


@router.post("/brand-kit/{partner_id}/genera")
async def genera_brand_kit(partner_id: str, background_tasks: BackgroundTasks):
    """
    Genera brand kit per nuovo partner.
    Crea design Canva personalizzati dai template.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    if not is_canva_configured():
        # Salva mock design IDs
        mock_ids = {
            "post": f"mock_post_{partner_id[:8]}",
            "carosello": f"mock_carosello_{partner_id[:8]}",
            "reel": f"mock_reel_{partner_id[:8]}"
        }
        
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {
                "canva_design_ids": mock_ids,
                "brand_kit_status": "mock",
                "brand_kit_generated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "status": "stub",
            "message": "Brand kit mock generato - Canva non configurato",
            "design_ids": mock_ids,
            "note": "Configura CANVA_API_TOKEN per generare design reali"
        }
    
    # PRODUZIONE: Genera con Canva API
    background_tasks.add_task(_genera_brand_kit_canva, partner_id, partner.get("name", "Partner"))
    
    return {
        "status": "processing",
        "message": "Generazione brand kit avviata",
        "partner_id": partner_id
    }


async def _genera_brand_kit_canva(partner_id: str, partner_name: str):
    """Task background per generare brand kit con Canva"""
    try:
        design_ids = {}
        
        async with httpx.AsyncClient() as client:
            # Crea design per ogni template
            templates = {
                "post": CANVA_TEMPLATE_POST_ID,
                "carosello": CANVA_TEMPLATE_CAROSELLO_ID,
                "reel": CANVA_TEMPLATE_REEL_ID
            }
            
            for tipo, template_id in templates.items():
                if not template_id:
                    continue
                
                response = await client.post(
                    "https://api.canva.com/rest/v1/designs",
                    headers={
                        "Authorization": f"Bearer {CANVA_API_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "design_type": {"brand_template_id": template_id},
                        "title": f"{partner_name} - {tipo.capitalize()}"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    design_ids[tipo] = data.get("design", {}).get("id")
        
        # Salva nel database
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {
                "canva_design_ids": design_ids,
                "brand_kit_status": "ready",
                "brand_kit_generated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"[CANVA] Brand kit generato per partner {partner_id}")
        
    except Exception as e:
        logger.error(f"[CANVA] Errore brand kit: {e}")
        if db:
            await db.partners.update_one(
                {"id": partner_id},
                {"$set": {"brand_kit_status": "error", "brand_kit_error": str(e)}}
            )


@router.post("/brand-kit/{partner_id}/rigenera")
async def rigenera_brand_kit(partner_id: str, background_tasks: BackgroundTasks):
    """Rigenera brand kit (se template aggiornato)"""
    return await genera_brand_kit(partner_id, background_tasks)


# ═══════════════════════════════════════════════════════════════════════════════
# STATUS INTEGRAZIONI
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/status")
async def get_integrations_status():
    """Stato delle integrazioni media"""
    return {
        "canva": {
            "configured": is_canva_configured(),
            "api_token": "***" + CANVA_API_TOKEN[-4:] if CANVA_API_TOKEN else None,
            "templates": {
                "analisi": bool(CANVA_TEMPLATE_ANALISI_ID),
                "post": bool(CANVA_TEMPLATE_POST_ID),
                "carosello": bool(CANVA_TEMPLATE_CAROSELLO_ID),
                "reel": bool(CANVA_TEMPLATE_REEL_ID)
            }
        },
        "kling": {
            "configured": is_kling_configured(),
            "api_key": "***" + KLING_API_KEY[-4:] if KLING_API_KEY else None
        },
        "heygen": {
            "configured": bool(os.environ.get('HEYGEN_API_KEY')),
            "note": "Già integrato nel sistema"
        },
        "cloudinary": {
            "configured": bool(CLOUDINARY_URL),
            "note": "Storage per asset generati"
        }
    }
