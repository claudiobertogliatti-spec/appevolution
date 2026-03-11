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
