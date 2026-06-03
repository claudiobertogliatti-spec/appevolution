"""
STEFANIA — Coordinatrice AI Evolution PRO (Partner Chat)
=========================================================
Chat riservata ai partner. Stefania conosce il processo completo
di Evolution PRO, la fase corrente del partner, i suoi step, e
lo riorientata con tono pacato e professionale quando necessario.
Usa Anthropic SDK diretto (emergentintegrations rimosso).
"""

import os
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stefania", tags=["stefania"])

db = None
def set_db(database):
    global db
    db = database

# ─── System Prompt ────────────────────────────────────────────────────────────

STEFANIA_SYSTEM_PROMPT = """Sei STEFANIA, la coordinatrice di Evolution PRO.

Parli direttamente con un partner — un professionista che sta costruendo il suo videocorso con il supporto del nostro team.

## Chi sei

Non sei un chatbot generico. Conosci il processo Evolution PRO dall'inizio alla fine, sai in che fase si trova questo partner, cosa ha già fatto e cosa deve fare adesso. Il tuo ruolo è orientare, chiarire e motivare — mai giudicare o spingere.

**Tono**: professionale, caldo, diretto. Come una coordinatrice esperta che conosce bene il lavoro e rispetta il tempo di tutti.

## Il Processo Evolution PRO — tutto quello che sai

### FASE F1 — Posizionamento
Il partner definisce su chi vuole lavorare, qual è la trasformazione che offre, qual è il messaggio centrale del suo brand.
Attività: compilare il documento di posizionamento, definire l'avatar cliente, scrivere il public statement.
Agente responsabile: **VALENTINA**.

### FASE F2 — Masterclass (video di vendita)
Il partner registra la masterclass — il video che serve a vendere il corso, non a insegnare il contenuto.
Struttura: problema del mercato, promessa di trasformazione, dimostrazione competenza, CTA.
Attività: scrivere lo script, registrare il video, caricarlo sulla piattaforma.
Agente responsabile: **ANDREA**.

### FASE F3 — Videocorso (produzione contenuti)
Il partner registra le lezioni del corso. Ogni modulo ha un obiettivo specifico di trasformazione.
Struttura suggerita: 4-6 moduli, ogni modulo 3-5 lezioni da 10-20 minuti.
Attività: scrivere i contenuti delle lezioni, registrare, caricare.
Agente responsabile: **ANDREA**.

### FASE F4 — Funnel (setup tecnico)
Costruzione della macchina di vendita: pagina di vendita, checkout, email di follow-up, accesso corso.
Attività: configurare Systeme.io, creare la landing page, integrare il pagamento Stripe.
Agente responsabile: **GAIA** (supporto tecnico).

### FASE F5 — Lancio
Il partner va live: attiva le ads, pubblica, fa il primo lancio.
Attività: configurare le campagne, definire il budget iniziale, monitorare i risultati.
Agente responsabile: **MARCO**.

### FASE F6 / F7 — Ottimizzazione e Scaling
Post-lancio: analisi metriche, ottimizzazione funnel, crescita del traffico, possibile espansione del corso.
Agente responsabile: **MARCO** (F6), **ANTONELLA** (F7 continuità).

---

## Come rispondi

**Se il partner chiede dove si trova nel percorso:**
Spiega chiaramente la sua fase attuale, cosa significa, e qual è il prossimo passo concreto da fare.

**Se il partner è disorientato, ha paura, o si sente bloccato:**
Normalizza. Ogni professionista si sente così a un certo punto. Poi riporta il focus su una sola cosa da fare adesso — niente liste lunghe.

**Se il partner vuole saltare una fase o fare cose fuori sequenza:**
Non imporre. Spiega il perché della sequenza con una frase semplice, poi chiedi se vuole capire meglio o procedere.
Esempio: "Capisco. La sequenza è studiata così perché X — ma se hai una ragione specifica per procedere diversamente, possiamo valutarla insieme."

**Se il partner ha un blocco tecnico:**
Non entrare nel merito tecnico. Dì chiaramente che è il dominio di GAIA e che la situazione verrà gestita entro [SLA].

**Se il partner esprime frustrazione o sconforto:**
Prima ascolta e riconosci. Poi — solo dopo — riporta al focus. Non minimizzare mai.

**Se la richiesta riguarda rimborsi, contenziosi, abbandono:**
Non gestire. Dì: "Questa situazione richiede l'intervento diretto di Claudio — ti contatterà entro oggi."

---

## Regole di tono

- Usa sempre il nome del partner
- Frasi brevi. Un concetto per volta.
- Non iniziare mai con "Certo!", "Assolutamente!", "Ottima domanda!" — vai dritto al punto
- Nessun elenco puntato lungo quando basta una frase
- Se non sai qualcosa di preciso, dì "Verifico con [agente] e ti aggiorno" — non inventare
- Non essere mai condiscendente, nemmeno implicitamente

---

## MODALITÀ CONCIERGE JOURNEY (sub-progetto A — Operativo Stefania)

Il partner sta facendo il percorso Partnership Evolution PRO esploso in 13 step concreti, visualizzati nella schermata "Operativo" con progress bar in cima e azione corrente al centro. Tu sei la voce narrante orizzontale sopra l'azione.

Sotto, nel CONTESTO PARTNER ATTUALE, trovi un blocco "OPERATIVO JOURNEY" con: total step, completati, step CORRENTE (numero + label + id), e flag "Briefing già mostrato".

Le tue 4 modalità in base allo stato:

1. **BRIEFING** (Briefing già mostrato = False): il partner ha appena aperto questo step. Inizia spiegando in 30 secondi cosa serve fare. Una sola frase d'apertura, chiara, non lunga.

2. **AFFIANCAMENTO** (Briefing già mostrato = True, il partner ti scrive): rispondi a dubbi specifici dello step corrente. Tono pacato, diretto, non motivazionale.

3. **CONFERMA** (chiamata subito dopo che il partner ha completato uno step): "Fatto. Hai chiuso lo step X. Andiamo al prossimo: Y." Una frase, niente di più.

4. **PROATTIVA** (partner inattivo da più giorni sullo stesso step): "Ciao, sei rimasto fermo su X da N giorni. Vuoi che lo facciamo insieme adesso?" Tono caldo, non insistente.

REGOLE OPERATIVE journey:
- Non suggerire step diversi da quello corrente. Il percorso è lineare.
- Se il partner chiede di saltare avanti, spiega che il percorso è lineare e che può modificare step già done cliccando sulla progress bar.
- Se ha problemi su upload/validazione, suggerisci di scrivere "ho un problema" e proponi la soluzione più semplice.
- Quando "Journey: completato" → tono caldo e grato. Esempio: "Hai chiuso tutto. Il tuo modello è live. Grazie a te per la fiducia."

---

CONTESTO PARTNER ATTUALE:
{context}
"""

# ─── Descrizioni operative per fase ─────────────────────────────────────────

PHASE_DESCRIPTIONS = {
    "F1": "Posizionamento — stai definendo la tua nicchia e il tuo messaggio. L'agente che ti segue è VALENTINA.",
    "F2": "Masterclass — stai costruendo il tuo video di vendita. L'agente che ti segue è ANDREA.",
    "F3": "Videocorso — stai producendo le lezioni del tuo corso. L'agente che ti segue è ANDREA.",
    "F4": "Funnel — stai configurando la tua macchina di vendita su Systeme.io. L'agente tecnico è GAIA.",
    "F5": "Lancio — stai attivando le tue campagne e andando live. L'agente che ti segue è MARCO.",
    "F6": "Ottimizzazione — stai analizzando i risultati e migliorando il funnel. L'agente è MARCO.",
    "F7": "Scaling e continuità — stai crescendo e consolidando. L'agente è ANTONELLA.",
}

# ─── Context Builder ──────────────────────────────────────────────────────────

async def build_partner_context(partner_id: str, partner_name: str, phase: str, niche: str) -> str:
    lines = []
    lines.append(f"Nome partner: {partner_name}")
    lines.append(f"Fase attuale: {phase} — {PHASE_DESCRIPTIONS.get(phase, 'Fase non specificata')}")
    if niche:
        lines.append(f"Nicchia / settore: {niche}")

    # === OPERATIVO STEFANIA — contesto journey live (sub-progetto A) ===
    # Vedi: docs/superpowers/specs/2026-05-17-operativo-stefania-design.md
    try:
        if db is not None:
            from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
            journey_steps = await db.partner_journey_steps.find(
                {"partner_id": str(partner_id)}
            ).sort("step_number", 1).to_list(length=20)

            if journey_steps:
                label_by_id = {d["step_id"]: d["label"] for d in JOURNEY_STEPS_DEFINITION}
                current_step = next((s for s in journey_steps if s["status"] == "in_progress"), None)
                total = len(journey_steps)
                completed = sum(1 for s in journey_steps if s["status"] == "done")
                lines.append("")
                lines.append("=== OPERATIVO JOURNEY (sub-progetto A) ===")
                lines.append(f"Total step: {total} · Completati: {completed}")
                completati_labels = [
                    label_by_id.get(s["step_id"], s["step_id"])
                    for s in journey_steps if s["status"] == "done"
                ]
                if completati_labels:
                    lines.append(f"Step completati: {', '.join(completati_labels)}")
                if current_step:
                    cur_label = label_by_id.get(current_step["step_id"], current_step["step_id"])
                    lines.append(f"Step CORRENTE: {current_step['step_number']}/{total} — {cur_label}")
                    lines.append(f"Step ID: {current_step['step_id']}")
                    lines.append(f"Briefing già mostrato: {current_step.get('stefania_briefing_shown', False)}")
                else:
                    lines.append("Journey: completato — il partner ha chiuso tutti gli step.")
    except Exception as e:
        logger.warning(f"[stefania_chat] Impossibile caricare partner_journey_steps: {e}")

    return "\n".join(lines)

# ─── Models ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    partner_id: str
    message: str
    user_role: str = "partner"
    user_name: str = "Partner"
    partner_phase: Optional[str] = None
    partner_niche: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    target_agent: Optional[str] = None  # STEFANIA / ANDREA / MARCO / GAIA / VALENTINA — swap del system prompt

class EscalationRequest(BaseModel):
    partner_id: str
    partner_name: Optional[str] = None
    partner_phase: Optional[str] = None
    message: str
    reason: str = "keyword_detected"

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/chat")
async def stefania_chat(data: ChatMessage):
    """Chat partner con Stefania — contesto fase e step iniettato ad ogni messaggio."""
    import anthropic

    api_key = (
        os.environ.get("ANTHROPIC_API_KEY") or
        os.environ.get("EMERGENT_LLM_KEY") or
        ""
    )
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY non configurata")

    partner_name = data.user_name or "Partner"
    phase = data.partner_phase or "F1"
    niche = data.partner_niche or ""

    # Costruisce contesto partner live
    context_str = await build_partner_context(data.partner_id, partner_name, phase, niche)

    # Aggiunge contesto extra dal payload se presente
    if data.context:
        extra = data.context
        if extra.get("current_block"):
            context_str += f"\nBlocco attivo nella UI: {extra['current_block']}"
        if extra.get("script_context"):
            context_str += f"\nContenuto script attuale: {extra['script_context'][:500]}"

    # Selezione system prompt: se target_agent passato, usa quello (sub-progetto A
    # AgentDrawer manda target_agent per step per cambiare voce/persona).
    base_prompt = STEFANIA_SYSTEM_PROMPT
    if data.target_agent and data.target_agent.upper() != "STEFANIA":
        try:
            from agent_prompts import get_agent_prompt
            base_prompt = get_agent_prompt(data.target_agent)
        except Exception as e:
            logger.warning(f"[stefania_chat] target_agent={data.target_agent} non risolto: {e} — fallback STEFANIA")

    # Sostituisci placeholder context. Alcuni prompt non hanno {context} —
    # in quel caso appendiamo manualmente per non perdere lo stato journey.
    if "{context}" in base_prompt:
        system_prompt = base_prompt.replace("{context}", context_str)
    else:
        system_prompt = f"{base_prompt}\n\n---\n\nCONTESTO PARTNER ATTUALE:\n{context_str}"

    # Carica storico (ultimi 16 messaggi)
    history: List[Dict] = []
    try:
        if db is not None:
            doc = await db.stefania_conversations.find_one(
                {"partner_id": str(data.partner_id)}, {"_id": 0, "messages": 1}
            )
            if doc and doc.get("messages"):
                history = doc["messages"][-16:]
    except Exception as e:
        logger.warning(f"[stefania_chat] Storico non caricato: {e}")

    # Costruisce lista messaggi Anthropic
    messages = []
    for h in history:
        if h.get("role") in ("user", "assistant"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": data.message})

    # Chiama Anthropic
    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            system=system_prompt,
            messages=messages,
        )
        reply = response.content[0].text
    except Exception as e:
        logger.error(f"[stefania_chat] Errore Anthropic: {e}")
        raise HTTPException(status_code=500, detail=f"Errore chat: {str(e)}")

    # Salva conversazione
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        if db is not None:
            await db.stefania_conversations.update_one(
                {"partner_id": str(data.partner_id)},
                {
                    "$set": {
                        "partner_id": str(data.partner_id),
                        "partner_name": partner_name,
                        "partner_phase": phase,
                        "updated_at": now_iso,
                    },
                    "$push": {
                        "messages": {
                            "$each": [
                                {"role": "user", "content": data.message, "ts": now_iso},
                                {"role": "assistant", "content": reply, "ts": now_iso},
                            ]
                        }
                    },
                },
                upsert=True,
            )
    except Exception as e:
        logger.warning(f"[stefania_chat] Salvataggio storico fallito: {e}")

    return {
        "success": True,
        "reply": reply,
        "agent": "STEFANIA",
        "responsible_agent": _get_agent(phase),
    }


@router.post("/escalation")
async def create_escalation(data: EscalationRequest):
    """Escalation a Claudio per situazioni critiche."""
    escalation_doc = {
        "id": str(uuid.uuid4()),
        "partner_id": data.partner_id,
        "partner_name": data.partner_name,
        "partner_phase": data.partner_phase,
        "message": data.message,
        "reason": data.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        if db is not None:
            await db.stefania_escalations.insert_one(escalation_doc)
        await _send_telegram_escalation(
            data.partner_name or "Partner",
            data.partner_phase or "N/D",
            data.message,
        )
    except Exception as e:
        logger.error(f"[stefania_chat] Escalation error: {e}")

    return {
        "success": True,
        "escalation_id": escalation_doc["id"],
        "message": "Escalation notificata a Claudio",
    }


@router.get("/conversations/{partner_id}")
async def get_conversation_history(partner_id: str):
    """Storico conversazione — per review admin."""
    try:
        doc = await db.stefania_conversations.find_one(
            {"partner_id": partner_id}, {"_id": 0}
        )
    except Exception:
        doc = None
    if not doc:
        return {"messages": [], "partner_id": partner_id}
    return doc


@router.get("/escalations")
async def get_escalations(status: str = None):
    query = {}
    if status:
        query["status"] = status
    escalations = await db.stefania_escalations.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"escalations": escalations, "count": len(escalations)}


@router.patch("/escalations/{escalation_id}")
async def update_escalation(escalation_id: str, status: str):
    await db.stefania_escalations.update_one(
        {"id": escalation_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"success": True, "escalation_id": escalation_id, "new_status": status}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_agent(phase: str) -> str:
    return {
        "F1": "VALENTINA",
        "F2": "ANDREA", "F3": "ANDREA",
        "F4": "GAIA",
        "F5": "MARCO", "F6": "MARCO",
        "F7": "ANTONELLA",
    }.get(phase, "VALENTINA")


async def _send_telegram_escalation(partner_name: str, phase: str, message: str):
    try:
        import httpx
        bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
        chat_id = os.environ.get("TELEGRAM_CHAT_ID") or os.environ.get("CLAUDIO_TELEGRAM_ID")
        if not bot_token or not chat_id:
            return
        text = (
            f"🚨 *ESCALATION STEFANIA*\n\n"
            f"👤 Partner: {partner_name}\n"
            f"📍 Fase: {phase}\n"
            f"💬 Messaggio:\n_{message[:500]}_\n\n"
            f"⚡ Richiede intervento diretto."
        )
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
            )
    except Exception as e:
        logger.error(f"[stefania_chat] Telegram error: {e}")
