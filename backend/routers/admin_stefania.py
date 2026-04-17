"""
STEFANIA — Braccio Destro Admin (Evolution PRO)
================================================
Chat riservata a Claudio. Stefania ha visibilità totale sul sistema:
partner, fasi, alert, metriche pipeline. Risponde come COO operativa.
Usa Anthropic SDK direttamente (emergentintegrations rimosso).
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/stefania", tags=["admin-stefania"])
security = HTTPBearer(auto_error=False)

db = None
def set_db(database):
    global db
    db = database

# ─── Auth helper ──────────────────────────────────────────────────────────────

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from auth import decode_token
    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")
    data = decode_token(credentials.credentials)
    if not data or data.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return data

# ─── System Prompt ────────────────────────────────────────────────────────────

STEFANIA_ADMIN_SYSTEM = """Sei STEFANIA, coordinatrice AI e braccio destro operativo di Claudio Bertogliatti — fondatore di Evolution PRO.

Non sei il chatbot dei partner. Parli SOLO con Claudio. Sei la sua COO AI.

## Il tuo ruolo

Claudio gestisce un programma in cui professionisti (i "partner") costruiscono e lanciano videocorsi con il supporto del suo team. Tu hai visibilità totale su tutto: partner attivi, fasi, blocchi, alert, metriche.

Il tuo compito: dare a Claudio chiarezza operativa istantanea, identificare i problemi prima che diventino crisi, proporre azioni concrete.

## Come rispondi

- **Diretto** — niente preamboli. Vai al punto.
- **Strutturato** — usa elenchi e sezioni quando ci sono più elementi da comunicare.
- **Proattivo** — se vedi qualcosa che Claudio non ha chiesto ma dovrebbe sapere, dillo.
- **Nomi reali** — parla dei partner sempre per nome.
- Non usare "Certo!", "Assolutamente!", "Ottima domanda!" — inizia sempre con la sostanza.

## Quando Claudio ti saluta o scrive "Briefing"

Dai un briefing operativo sintetico con:
1. Situazioni critiche (partner bloccati, alert scaduti, inattivi >7 giorni)
2. Cosa ha bisogno di attenzione oggi
3. Una raccomandazione prioritaria

## Team agenti

- **VALENTINA** — gestisce F1 (posizionamento, onboarding)
- **ANDREA** — gestisce F2-F4 (masterclass, videocorso, funnel)
- **MARCO** — gestisce F5-F6 (lancio, ottimizzazione)
- **GAIA** — supporto tecnico (problemi piattaforme, Systeme, Stripe)
- **STEFANIA** (tu) — coordinazione generale, F7 continuità

## Lingua

Sempre in italiano. Se Claudio scrive in inglese, rispondi in italiano.

---

STATO SISTEMA IN TEMPO REALE:
{context}
"""

# ─── Context Builder ──────────────────────────────────────────────────────────

async def build_live_context() -> str:
    """Raccoglie dati live dal DB e costruisce il blocco contesto per Stefania."""
    try:
        lines = []
        now = datetime.now(timezone.utc)

        # Partner attivi
        partners = await db.partners.find(
            {"status": {"$in": ["active", "attivo", "Active"]}},
            {"_id": 0, "id": 1, "name": 1, "phase": 1, "email": 1,
             "last_activity": 1, "updated_at": 1, "alert": 1}
        ).to_list(200)

        # Tutti i partner (inclusi non attivi) per completezza
        all_partners = await db.partners.find(
            {},
            {"_id": 0, "id": 1, "name": 1, "phase": 1, "status": 1,
             "last_activity": 1, "updated_at": 1, "alert": 1}
        ).to_list(200)

        lines.append(f"DATA ODIERNA: {now.strftime('%d/%m/%Y %H:%M')} UTC")
        lines.append(f"PARTNER TOTALI: {len(all_partners)}")
        lines.append(f"PARTNER ATTIVI: {len(partners)}")

        # Distribuzione per fase
        phase_count: Dict[str, int] = {}
        for p in all_partners:
            ph = p.get("phase", "F?")
            phase_count[ph] = phase_count.get(ph, 0) + 1
        if phase_count:
            dist = ", ".join(f"{ph}:{c}" for ph, c in sorted(phase_count.items()))
            lines.append(f"DISTRIBUZIONE FASI: {dist}")

        # Partner inattivi >7 giorni
        inattivi = []
        for p in partners:
            last = p.get("last_activity") or p.get("updated_at")
            if last:
                if isinstance(last, str):
                    try:
                        last = datetime.fromisoformat(last.replace("Z", "+00:00"))
                    except Exception:
                        continue
                giorni = (now - last).days
                if giorni > 7:
                    inattivi.append(f"{p.get('name','?')} ({p.get('phase','?')}, {giorni}gg)")
        if inattivi:
            lines.append(f"PARTNER INATTIVI >7GG: {', '.join(inattivi)}")
        else:
            lines.append("PARTNER INATTIVI >7GG: nessuno")

        # Partner con alert
        alert_partners = [p.get("name","?") for p in all_partners if p.get("alert")]
        if alert_partners:
            lines.append(f"PARTNER CON ALERT: {', '.join(alert_partners)}")

        # Lista partner attivi con fase
        if partners:
            partner_list = "; ".join(
                f"{p.get('name','?')} → {p.get('phase','?')}"
                for p in partners
            )
            lines.append(f"PARTNER ATTIVI: {partner_list}")

        # Alert aperti dal sistema
        try:
            alerts_open = await db.alerts.find(
                {"status": "open"},
                {"_id": 0, "type": 1, "partner_name": 1, "created_at": 1}
            ).to_list(50)
            if alerts_open:
                alert_list = "; ".join(
                    f"{a.get('type','?')} ({a.get('partner_name','?')})"
                    for a in alerts_open[:10]
                )
                lines.append(f"ALERT APERTI: {len(alerts_open)} — {alert_list}")
            else:
                lines.append("ALERT APERTI: nessuno")
        except Exception:
            pass

        # Step statuses bloccati
        try:
            step_docs = await db.step_statuses.find(
                {},
                {"_id": 0, "partner_id": 1, "steps": 1}
            ).to_list(100)
            blocchi = []
            for doc in step_docs:
                pid = doc.get("partner_id", "")
                # trova partner name
                pname = next((p.get("name","?") for p in all_partners if str(p.get("id","")) == str(pid)), pid)
                steps = doc.get("steps", {})
                for step_id, step_data in steps.items():
                    if isinstance(step_data, dict) and step_data.get("status") in ("in_lavorazione", "in_revisione"):
                        blocchi.append(f"{pname}/{step_id}:{step_data['status']}")
            if blocchi:
                lines.append(f"STEP IN LAVORAZIONE/REVISIONE: {', '.join(blocchi[:15])}")
        except Exception:
            pass

        return "\n".join(lines)

    except Exception as e:
        logger.error(f"[admin_stefania] Errore build_live_context: {e}")
        return f"[Contesto non disponibile: {e}]"

# ─── Models ───────────────────────────────────────────────────────────────────

class AdminChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class AdminChatResponse(BaseModel):
    reply: str
    session_id: str

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=AdminChatResponse)
async def admin_stefania_chat(
    req: AdminChatRequest,
    token_data=Depends(require_admin)
):
    """Chat admin con Stefania — contesto live iniettato ad ogni messaggio."""
    import anthropic

    api_key = (
        os.environ.get("ANTHROPIC_API_KEY") or
        os.environ.get("EMERGENT_LLM_KEY") or
        ""
    )
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY non configurata")

    # Carica storico conversazione (ultimi 20 messaggi)
    collection_key = f"admin_{token_data.user_id}_{req.session_id}"
    history: List[Dict] = []
    try:
        doc = await db.admin_stefania_conversations.find_one(
            {"session_key": collection_key}, {"_id": 0, "messages": 1}
        )
        if doc and doc.get("messages"):
            history = doc["messages"][-20:]
    except Exception as e:
        logger.warning(f"[admin_stefania] Storico non caricato: {e}")

    # Costruisce contesto live
    live_context = await build_live_context()
    system_prompt = STEFANIA_ADMIN_SYSTEM.replace("{context}", live_context)

    # Costruisce lista messaggi per l'API
    messages = []
    for h in history:
        if h.get("role") in ("user", "assistant"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": req.message})

    # Chiama Anthropic
    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )
        reply = response.content[0].text
    except Exception as e:
        logger.error(f"[admin_stefania] Errore Anthropic: {e}")
        raise HTTPException(status_code=500, detail=f"Errore LLM: {str(e)}")

    # Salva conversazione
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        await db.admin_stefania_conversations.update_one(
            {"session_key": collection_key},
            {
                "$set": {
                    "session_key": collection_key,
                    "admin_id": token_data.user_id,
                    "updated_at": now_iso,
                },
                "$push": {
                    "messages": {
                        "$each": [
                            {"role": "user", "content": req.message, "ts": now_iso},
                            {"role": "assistant", "content": reply, "ts": now_iso},
                        ]
                    }
                },
            },
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"[admin_stefania] Salvataggio storico fallito: {e}")

    return AdminChatResponse(reply=reply, session_id=req.session_id)


@router.get("/history")
async def get_chat_history(
    session_id: str = "default",
    token_data=Depends(require_admin)
):
    """Recupera storico chat admin con Stefania."""
    collection_key = f"admin_{token_data.user_id}_{session_id}"
    try:
        doc = await db.admin_stefania_conversations.find_one(
            {"session_key": collection_key}, {"_id": 0}
        )
        messages = (doc or {}).get("messages", [])
        return {"messages": messages[-50:], "session_id": session_id}
    except Exception as e:
        logger.error(f"[admin_stefania] Errore get history: {e}")
        return {"messages": [], "session_id": session_id}


@router.delete("/history")
async def clear_chat_history(
    session_id: str = "default",
    token_data=Depends(require_admin)
):
    """Cancella storico chat."""
    collection_key = f"admin_{token_data.user_id}_{session_id}"
    await db.admin_stefania_conversations.delete_one({"session_key": collection_key})
    return {"success": True}
