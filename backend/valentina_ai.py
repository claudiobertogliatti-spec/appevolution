"""
VALENTINA AI Module - Orchestratrice Evolution PRO OS
Integrazione LLM + Telegram Notifications + Persistent Memory + Action Execution
"""

import os
import logging
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, List
from emergentintegrations.llm.chat import LlmChat, UserMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BOT_USERNAME = os.environ.get("TELEGRAM_BOT_USERNAME", "valentina_evo_bot")

# Import Memory System
try:
    from valentina_memory import valentina_memory
    MEMORY_ENABLED = True
    logger.info("VALENTINA Memory System loaded successfully")
except ImportError as e:
    MEMORY_ENABLED = False
    logger.warning(f"VALENTINA Memory System not available: {e}")

# Import Action Dispatcher
try:
    from valentina_actions import action_dispatcher, detect_and_execute_action
    ACTIONS_ENABLED = True
    logger.info("VALENTINA Action Dispatcher loaded successfully")
except ImportError as e:
    ACTIONS_ENABLED = False
    logger.warning(f"VALENTINA Action Dispatcher not available: {e}")

# VALENTINA System Prompt for PARTNERS (External Use)
VALENTINA_SYSTEM_PROMPT = """Sei VALENTINA, agente AI di Business Evolution PRO creato da Claudio Bertogliatti.

Il tuo ruolo è duplice:
1. Accompagnare ogni nuovo partner nei primi 7 giorni dall'ingresso nel programma.
2. Rispondere a domande strategiche lungo tutto il percorso.

---

CONTESTO DISPONIBILE (variabili iniettate a runtime):
{context}

---

COME COMUNICHI:
- Diretta e concreta — dici esattamente cosa fare, non cosa potrebbe funzionare.
- Tono professionale e misurato, mai motivazionale o entusiasta in modo artificiale.
- Frasi brevi. Zero fronzoli. Zero emoji nei messaggi operativi.
- Non ripeti mai la stessa istruzione più di due volte.
- Quando il partner porta una scusa, la riconosci brevemente (una frase), poi torni subito all'obiettivo.

---

PROTOCOLLO ONBOARDING (primi 7 giorni):

Giorno 1 — Benvenuto operativo:
"Benvenuto in Evolution PRO.
Nei prossimi 7 giorni costruiamo le fondamenta della tua accademia.
Oggi hai un solo compito: [primo step concreto].
Hai dubbi su questo step? Scrivimi qui."

Giorni 2-6 — Accompagnamento quotidiano:
- Ogni mattina: promemoria del task del giorno (solo se non già completato).
- Ogni sera: conferma avanzamento o escalation se fermo.
- Tono: coach operativo, non babysitter.

Giorno 7 — Transizione:
"Hai completato l'onboarding. Da domani passi alla fase successiva.
Il tuo contatto per la produzione contenuti è ANDREA."

---

PROTOCOLLO DOMANDE STRATEGICHE:

Quando un partner fa una domanda strategica:
1. Identifica il problema REALE dietro la domanda (spesso diverso da quello dichiarato).
2. Rispondi con il metodo Evolution PRO — non con opinioni generiche.
3. Se la risposta richiede una decisione di Claudio, scalala.

Esempio:
Partner chiede: "Penso di cambiare nicchia, cosa ne pensi?"
Tu rispondi: "Prima di cambiare nicchia, dimmi: hai già validato quella attuale con almeno 3 conversazioni di vendita? Se no, il problema non è la nicchia."

---

QUANDO SCALARE A CLAUDIO (messaggio immediato):
- Partner dichiara voler abbandonare il programma.
- Problemi legali o contrattuali.
- Richieste di rimborso.
- Difficoltà finanziarie serie.
- Partner non risponde per più di 72 ore dopo il tuo follow-up.

---

PROTOCOLLO FOLLOW-UP INATTIVITÀ:
- 48h senza risposta → "Vedo che non hai ancora completato [step]. Hai bisogno di supporto?"
- 72h senza risposta → "È la seconda volta che ti scrivo su questo step. Se c'è un problema specifico, dimmi qual è."
- Oltre 72h → escalation immediata a Claudio.

---

NON FAI MAI:
- Non dai consigli motivazionali ("Ce la fai!", "Sei sulla strada giusta!").
- Non approvi decisioni che si discostano dal metodo Evolution PRO senza prima segnalarlo.
- Non gestisci rimborsi, modifiche contrattuali o questioni legali.
- Non prometti risultati specifici in termini di fatturato.

Rispondi sempre in italiano."""

# SPECIAL PROMPT FOR CLAUDIO (FOUNDER)
VALENTINA_FOUNDER_PROMPT = """Sei VALENTINA, il braccio destro AI di Claudio, fondatore di Evolution PRO OS.

## CHI È CLAUDIO
Claudio è il fondatore e CEO di Evolution PRO. Tu sei la sua assistente personale e strategica. NON è un partner, è il TUO capo.

## ⚠️ REGOLA CRITICA: MAI INVENTARE ⚠️

**FERMATI e LEGGI ATTENTAMENTE:**
- Se nel contesto sotto NON c'è una sezione "RISULTATO AZIONE ESEGUITA" → NON HAI ESEGUITO NULLA
- Se ti viene chiesto qualcosa che non sai fare → DI' LA VERITÀ

**❌ VIETATO:**
- Dire "Ho creato la colonna" se non l'hai fatto
- Inventare nomi di contatti, risultati, o azioni completate
- Parlare di problemi del browser, instabilità, o disconnessioni

**✅ OBBLIGATORIO:**
- Se non c'è "RISULTATO AZIONE ESEGUITA" → ammetti che non puoi farlo
- Essere onesta su cosa puoi e non puoi fare
- Proporre alternative concrete

## COSA POSSO FARE DIRETTAMENTE
1. **Aggiungere tag via GAIA** - ✅ (es: "Aggiungi tag X al contatto Y@email.com")
2. **Leggere lead/KPI** - ✅ (es: "Quanti lead abbiamo?")
3. **Migrare segmenti** - ✅ (es: "Migra lead da COLD a WARM")
4. **Generare copy** - ✅ (es: "Scrivi email per tripwire")

## COSA DELEGO A OPENCLAW (Telegram @valentina_evo_bot)
Per operazioni su Systeme.io che richiedono browser, INVIO IL TASK A OPENCLAW:
- 🦞 Creare colonne/pipeline → Task inviato a OpenClaw
- 🦞 Spostare contatti in pipeline → Task inviato a OpenClaw
- 🦞 Creare funnel → Task inviato a OpenClaw
- 🦞 Creare automazioni → Task inviato a OpenClaw

**QUANDO TI CHIEDONO QUESTE COSE:**
Se vedi "Task inviato a OpenClaw" nel contesto, rispondi:
"Boss, ho inviato il task a OpenClaw! 🦞 
Controlla Telegram (@valentina_evo_bot) per vedere quando sarà completato."

**NON menzionare MAI:**
- Problemi di browser
- Instabilità
- Disconnessioni
- Errori tecnici

Semplicemente delega e conferma l'invio del task.

## STATO SISTEMA
{context}

Rispondi sempre in italiano, in modo conciso e orientato all'azione."""

# Chat sessions storage (in-memory, will be persisted to MongoDB)
chat_sessions: Dict[str, List[Dict]] = {}


class ValentinaAI:
    """VALENTINA AI Assistant with LLM integration"""
    
    # Admin/Founder identifiers
    FOUNDER_IDENTIFIERS = ["claudio", "claudio@evolutionpro.it", "admin", "founder"]
    
    # LLM Chat sessions cache - persist across calls
    _llm_sessions: Dict[str, 'LlmChat'] = {}
    
    def __init__(self):
        self.llm_key = EMERGENT_LLM_KEY
    
    def _is_founder(self, context: dict) -> bool:
        """Check if the user is the founder/admin"""
        if not context:
            return False
        
        # Check is_admin flag
        if context.get("is_admin"):
            return True
        
        # Check name
        name = context.get("name", "").lower()
        if any(f in name for f in self.FOUNDER_IDENTIFIERS):
            return True
        
        # Check email
        email = context.get("email", "").lower()
        if any(f in email for f in self.FOUNDER_IDENTIFIERS):
            return True
            
        return False
        
    async def chat(self, partner_id: str, message: str, context: dict = None) -> str:
        """
        Process a chat message and return VALENTINA's response
        
        Args:
            partner_id: ID del partner
            message: Messaggio dell'utente
            context: Contesto aggiuntivo (fase, nome, storico)
        
        Returns:
            Risposta di VALENTINA
        """
        try:
            # Determine if this is the founder
            is_founder = self._is_founder(context)
            user_id = "claudio" if is_founder else partner_id
            
            # Create unique session key
            session_key = f"valentina_{user_id}"
            
            # =====================================================
            # STEP 0: Check for OPENCLAW operations FIRST (GUI automation)
            # Se l'azione richiede browser control, invia a OpenClaw PRIMA di altre azioni
            # OpenClaw = braccio esecutivo, non agente AI
            # =====================================================
            msg_lower = message.lower()
            
            # Keywords patterns che triggano OpenClaw (regex per flessibilità)
            import re
            
            # Categoria A: Esecuzione diretta (no approvazione)
            # Categoria B: Richiede approvazione prima
            openclaw_patterns = [
                # Categoria A - Esecuzione diretta
                (r"crea\w*\s+(?:una\s+)?colonna", "create_pipeline_column", "A"),
                (r"aggiung\w*\s+(?:una\s+)?colonna", "create_pipeline_column", "A"),
                (r"nuova\s+colonna", "create_pipeline_column", "A"),
                (r"sposta\w*\s+(?:il\s+|in\s+)?(?:contatto\s+)?(?:nella?\s+)?colonna", "move_contact_to_column", "A"),
                (r"mett\w*\s+(?:in\s+)?pipeline", "move_contact_to_column", "A"),
                (r"inseris\w*\s+(?:nella?\s+)?pipeline", "move_contact_to_column", "A"),
                # Categoria B - Richiede approvazione
                (r"crea\w*\s+(?:un\s+)?funnel", "create_funnel", "B"),
                (r"nuovo\s+funnel", "create_funnel", "B"),
                (r"crea\w*\s+(?:una?\s+)?automazione", "create_automation", "B"),
                (r"nuova\s+automazione", "create_automation", "B"),
                (r"lancia\w*\s+(?:la\s+)?(?:sequenza\s+)?email", "trigger_email_campaign", "B"),
                (r"attiva\w*\s+(?:la\s+)?campagna", "trigger_email_campaign", "B"),
            ]
            
            # Check if message requires OpenClaw
            openclaw_action = None
            openclaw_category = None
            for pattern, action, category in openclaw_patterns:
                if re.search(pattern, msg_lower):
                    openclaw_action = action
                    openclaw_category = category
                    logger.info(f"OpenClaw action detected: {action} (Category {category}, pattern: {pattern})")
                    break
            
            if openclaw_action:
                # Send to OpenClaw via Telegram
                try:
                    from openclaw_integration import send_openclaw_task, OpenClawTask, get_action_category
                    
                    # Extract parameters from message
                    params = {"raw_request": message}
                    
                    # Try to extract column name
                    column_match = re.search(r"colonna\s+['\"]?([a-zA-Z0-9_\-\s]+)", msg_lower)
                    if column_match:
                        params["column_name"] = column_match.group(1).strip()
                    
                    # Try to extract email
                    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', message)
                    if email_match:
                        params["email"] = email_match.group(0)
                    
                    # Try to extract funnel name
                    funnel_match = re.search(r"funnel\s+['\"]?([a-zA-Z0-9_\-\s]+)", msg_lower)
                    if funnel_match:
                        params["funnel_name"] = funnel_match.group(1).strip()
                    
                    # Determina approval_status in base alla categoria
                    # Categoria A: n/a (esecuzione diretta)
                    # Categoria B: richiede approvazione esplicita da Claudio
                    approval_status = "n/a"
                    if openclaw_category == "B":
                        # Per Categoria B, il fondatore può dare override con "esegui subito"
                        if is_founder and any(kw in msg_lower for kw in ["esegui subito", "skip approval", "fallo subito", "direttamente"]):
                            approval_status = "approved"
                            logger.info(f"Founder override: approval granted for Category B action")
                        else:
                            # Se non c'è override, avvisa che serve approvazione
                            if not is_founder:
                                return f"""⚠️ **Azione non permessa**

Questa azione (`{openclaw_action}`) è di Categoria B e richiede approvazione di Claudio o Antonella prima dell'esecuzione.

Non posso procedere autonomamente con azioni che:
- Inviano email reali ai contatti
- Creano funnel pubblici
- Modificano automazioni

Chiedi a Claudio di approvare questa richiesta."""
                    
                    task = OpenClawTask(
                        action=openclaw_action,
                        params=params,
                        priority="normal",
                        description=message,
                        partner_id=context.get("partner_id") if context else None,
                        scope="INTERNAL" if is_founder else "EXTERNAL",
                        approval_status=approval_status
                    )
                    
                    result = await send_openclaw_task(task, None)  # db=None, task saved only to Telegram
                    
                    # IMPORTANTE: Reset della sessione LLM dopo task OpenClaw
                    # per evitare che il contesto precedente venga mescolato
                    if session_key in self._llm_sessions:
                        del self._llm_sessions[session_key]
                        logger.info(f"LLM session {session_key} reset after OpenClaw task")
                    
                    if result.get("success"):
                        category_note = ""
                        if openclaw_category == "A":
                            category_note = "🟢 Categoria A: esecuzione diretta autorizzata"
                        elif openclaw_category == "B":
                            category_note = "🟡 Categoria B: approvato dal fondatore"
                        
                        openclaw_response = f"""✅ **Task inviato a OpenClaw!**

Ho creato un task per eseguire questa operazione su Systeme.io:

🎯 **Azione:** `{openclaw_action}`
🆔 **Task ID:** `{result.get('task_id')}`
📋 **{category_note}**

⏳ OpenClaw eseguirà l'operazione sulla dashboard Systeme.io.
Riceverai una notifica Telegram quando sarà completato.

📝 **Richiesta:** {message[:100]}"""
                        
                        # Salva nella cronologia della chat
                        if partner_id not in chat_sessions:
                            chat_sessions[partner_id] = []
                        chat_sessions[partner_id].append({
                            "role": "user",
                            "content": message,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                        chat_sessions[partner_id].append({
                            "role": "assistant", 
                            "content": openclaw_response,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                        
                        return openclaw_response
                    else:
                        # Gestisci errori specifici
                        error_msg = result.get('error', 'Errore sconosciuto')
                        
                        if result.get("requires_approval"):
                            return f"""⚠️ **Approvazione Richiesta**

L'azione `{openclaw_action}` è di Categoria B e richiede approvazione.

{error_msg}

Per procedere, scrivi: "esegui subito" o "skip approval" insieme alla richiesta."""
                        
                        logger.error(f"OpenClaw task failed: {error_msg}")
                        return f"""⚠️ **Problema con OpenClaw**

Ho tentato di inviare il task ma c'è stato un errore:
`{error_msg}`

Verifica che OpenClaw sia attivo e connesso a Telegram.

📝 **Azione richiesta:** {openclaw_action}
📝 **Richiesta:** {message[:100]}"""
                        
                except Exception as e:
                    logger.error(f"Error creating OpenClaw task: {e}")
                    return f"""⚠️ **Errore OpenClaw**

Non sono riuscita a creare il task per OpenClaw:
`{str(e)}`

Verifica la configurazione di OpenClaw nel sistema."""
            
            # =====================================================
            # STEP 1: Check if message requires an ACTION to execute
            # =====================================================
            action_result = None
            if ACTIONS_ENABLED:
                try:
                    # Pass is_internal flag to filter actions by scope
                    action_result = await detect_and_execute_action(
                        message, 
                        context, 
                        is_internal=is_founder
                    )
                    if action_result:
                        logger.info(f"Action executed: {action_result.get('action', 'unknown')} (internal: {is_founder})")
                        logger.info(f"Action result success: {action_result.get('success')}")
                except Exception as e:
                    logger.error(f"Action detection error: {e}")
            else:
                logger.warning("ACTIONS_ENABLED is False!")
            
            # Load persistent memory if available (only for founder)
            memory_context = ""
            if MEMORY_ENABLED and is_founder:
                try:
                    memory_context = await valentina_memory.get_full_context_for_prompt(user_id)
                    
                    # Auto-detect and save important content from user message
                    if await valentina_memory.auto_detect_important_content(message):
                        await valentina_memory.extract_and_save_knowledge(user_id, message)
                except Exception as e:
                    logger.error(f"Memory load error: {e}")
            
            # Build context string with live data for founder
            context_str = await self._build_context(context, is_founder, memory_context)
            
            # =====================================================
            # STEP 2: If action was executed, add result to context
            # =====================================================
            if action_result and action_result.get("success"):
                action_context = f"\n\n=== RISULTATO AZIONE ESEGUITA ({action_result.get('agent', 'SYSTEM')}) ===\n{action_result.get('message', '')}\n=== FINE RISULTATO ===\n\nOra rispondi all'utente confermando l'azione eseguita e mostrando i risultati. Non inventare dati, usa SOLO quelli forniti sopra."
                context_str += action_context
            
            # Choose appropriate system prompt
            if is_founder:
                system_prompt = VALENTINA_FOUNDER_PROMPT.format(context=context_str)
            else:
                system_prompt = VALENTINA_SYSTEM_PROMPT.format(context=context_str)
            
            # Get or create LLM session - REFRESH if action result exists
            # We need to update the system prompt when we have action results
            if session_key not in self._llm_sessions or action_result:
                if session_key in self._llm_sessions and action_result:
                    logger.info(f"Refreshing LLM session for {session_key} with action result")
                else:
                    logger.info(f"Creating new LLM session for {session_key}")
                self._llm_sessions[session_key] = LlmChat(
                    api_key=self.llm_key,
                    session_id=session_key,
                    system_message=system_prompt
                ).with_model("anthropic", "claude-sonnet-4-20250514")
            
            llm = self._llm_sessions[session_key]
            
            # Send message and get response
            response = await llm.send_message(UserMessage(text=message))
            
            # Store in local history
            if partner_id not in chat_sessions:
                chat_sessions[partner_id] = []
            
            chat_sessions[partner_id].append({
                "role": "user",
                "content": message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            chat_sessions[partner_id].append({
                "role": "assistant", 
                "content": response,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            # Keep only last 20 messages in memory
            if len(chat_sessions[partner_id]) > 20:
                chat_sessions[partner_id] = chat_sessions[partner_id][-20:]
            
            # Save to persistent memory
            if MEMORY_ENABLED:
                try:
                    is_important = await valentina_memory.auto_detect_important_content(message)
                    await valentina_memory.save_conversation(
                        user_id=user_id,
                        role="user",
                        content=message,
                        context=context,
                        is_important=is_important
                    )
                    await valentina_memory.save_conversation(
                        user_id=user_id,
                        role="assistant",
                        content=response,
                        context=context,
                        is_important=False
                    )
                except Exception as e:
                    logger.error(f"Memory save error: {e}")
            
            return response
            
        except Exception as e:
            logger.error(f"VALENTINA chat error: {e}")
            # Reset session on error to avoid stuck state
            session_key = f"valentina_{partner_id}"
            if session_key in self._llm_sessions:
                del self._llm_sessions[session_key]
            # Fallback response
            return self._fallback_response(message, context)
    
    async def _build_context(self, context: dict, is_founder: bool = False, memory_context: str = "") -> str:
        """Build context string for the prompt"""
        if not context:
            return "Nessun contesto specifico disponibile."
        
        parts = []
        
        # Add persistent memory context first (for founder)
        if memory_context:
            parts.append(memory_context)
            parts.append("")
        
        if is_founder:
            # Add live system data for founder
            parts.append("=== STATO SISTEMA LIVE ===")
            try:
                # Import MongoDB connection - Use environment variable
                from motor.motor_asyncio import AsyncIOMotorClient
                
                mongo_url = os.environ.get("MONGO_URL", "")
                db_name = os.environ.get("DB_NAME", "evolution_pro")
                
                if not mongo_url:
                    raise ValueError("MONGO_URL environment variable is required")
                
                client = AsyncIOMotorClient(mongo_url)
                db = client[db_name]
                
                # Get lead counts by segment
                hot = await db.systeme_contacts.count_documents({"orion_segment": "hot"})
                warm = await db.systeme_contacts.count_documents({"orion_segment": "warm"})
                cold = await db.systeme_contacts.count_documents({"orion_segment": "cold"})
                frozen = await db.systeme_contacts.count_documents({"orion_segment": "frozen"})
                total_contacts = await db.systeme_contacts.count_documents({})
                
                parts.append(f"📊 Lead Totali: {total_contacts:,}")
                parts.append(f"   🔥 HOT: {hot:,} | 🟡 WARM: {warm:,} | ❄️ COLD: {cold:,} | 🧊 FROZEN: {frozen:,}")
                
                # Get partner counts by phase
                partners = await db.partners.count_documents({})
                parts.append(f"👔 Partner Attivi: {partners}")
                
                # Get recent sales
                recent_sales = await db.payments.find({}, {"_id": 0, "amount": 1}).to_list(100)
                total_revenue = sum(s.get("amount", 0) for s in recent_sales)
                parts.append(f"💰 Revenue: €{total_revenue:,.2f} ({len(recent_sales)} ordini)")
                
                client.close()
            except Exception as e:
                parts.append(f"(Errore caricamento dati live: {str(e)[:50]})")
            
            parts.append("=== FINE STATO ===")
            parts.append("")
        
        if context.get("name"):
            if is_founder:
                parts.append(f"👤 Utente: {context['name']} (FONDATORE)")
            else:
                parts.append(f"Nome Partner: {context['name']}")
        
        if context.get("phase") and not is_founder:
            phase = context["phase"]
            phase_names = {
                "F0": "Pre-Onboarding",
                "F1": "Attivazione/Allineamento", 
                "F2": "Posizionamento",
                "F3": "Masterclass/Copy Core",
                "F4": "Struttura Corso",
                "F5": "Produzione/Registrazione",
                "F6": "Accademia",
                "F7": "Pre-Lancio",
                "F8": "Lancio",
                "F9": "Ottimizzazione",
                "F10": "Scalabilità"
            }
            phase_name = phase_names.get(phase, phase)
            parts.append(f"Fase Attuale: {phase} - {phase_name}")
        
        if context.get("niche") and not is_founder:
            parts.append(f"Nicchia: {context['niche']}")
            
        if context.get("is_admin") and not is_founder:
            parts.append("NOTA: L'utente è un ADMIN, può richiedere azioni su Systeme.io e gestione partner.")
        
        return "\n".join(parts) if parts else "Partner in fase iniziale."
    
    def _fallback_response(self, message: str, context: dict) -> str:
        """Fallback response when LLM is unavailable"""
        name = context.get("name", "").split()[0] if context and context.get("name") else "Partner"
        phase = context.get("phase", "F1") if context else "F1"
        
        # Simple keyword-based responses
        msg_lower = message.lower()
        
        if "ciao" in msg_lower or "buongiorno" in msg_lower or "salve" in msg_lower:
            return f"Ciao {name}! 👋 Sono VALENTINA, come posso aiutarti oggi?"
        
        if "fase" in msg_lower or "dove sono" in msg_lower:
            return f"Sei attualmente nella fase **{phase}**. Posso darti più dettagli su cosa fare in questa fase se vuoi!"
        
        if "aiuto" in msg_lower or "help" in msg_lower:
            return f"Certo {name}! Sono qui per aiutarti. Dimmi pure cosa ti serve e farò del mio meglio per supportarti nel tuo percorso. 😊"
        
        if "grazie" in msg_lower:
            return f"Prego {name}! È un piacere aiutarti. Se hai altre domande, sono qui! 🙌"
        
        return f"Grazie per il messaggio, {name}! Al momento sto avendo qualche difficoltà tecnica, ma il team sta lavorando per risolvere. Riprova tra poco! 🙏"


class TelegramNotifier:
    """Telegram Bot for Evolution PRO notifications"""
    
    def __init__(self):
        self.token = TELEGRAM_BOT_TOKEN
        self.base_url = f"https://api.telegram.org/bot{self.token}"
        self.admin_chat_ids: List[str] = []  # Will be populated from DB
    
    async def send_message(self, chat_id: str, text: str, parse_mode: str = "HTML") -> dict:
        """Send a message via Telegram"""
        if not self.token:
            logger.warning("Telegram bot token not configured")
            return {"ok": False, "error": "Token not configured"}
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": parse_mode
                    }
                )
                return response.json()
        except Exception as e:
            logger.error(f"Telegram send error: {e}")
            return {"ok": False, "error": str(e)}
    
    async def broadcast_to_admins(self, text: str) -> List[dict]:
        """Send message to all admin chat IDs"""
        results = []
        for chat_id in self.admin_chat_ids:
            result = await self.send_message(chat_id, text)
            results.append({"chat_id": chat_id, "result": result})
        return results
    
    async def notify_new_partner(self, partner_name: str, partner_email: str) -> dict:
        """Notify admins of new partner signup"""
        text = f"""🆕 <b>Nuovo Partner Registrato!</b>

👤 <b>Nome:</b> {partner_name}
📧 <b>Email:</b> {partner_email}
📅 <b>Data:</b> {datetime.now().strftime("%d/%m/%Y %H:%M")}

Vai su Evolution PRO OS per i dettagli."""
        return await self.broadcast_to_admins(text)
    
    async def notify_phase_complete(self, partner_name: str, old_phase: str, new_phase: str) -> dict:
        """Notify admins when partner completes a phase"""
        text = f"""✅ <b>Fase Completata!</b>

👤 <b>Partner:</b> {partner_name}
📊 <b>Da:</b> {old_phase} → <b>A:</b> {new_phase}
📅 <b>Data:</b> {datetime.now().strftime("%d/%m/%Y %H:%M")}

Il partner è avanzato alla fase successiva! 🚀"""
        return await self.broadcast_to_admins(text)
    
    async def notify_alert(self, alert_type: str, message: str, partner_name: str = None) -> dict:
        """Send a general alert notification"""
        emoji = {
            "warning": "⚠️",
            "error": "❌", 
            "success": "✅",
            "info": "ℹ️"
        }.get(alert_type, "📢")
        
        text = f"""{emoji} <b>Alert Evolution PRO</b>

{f'👤 Partner: {partner_name}' if partner_name else ''}
📝 {message}
📅 {datetime.now().strftime("%d/%m/%Y %H:%M")}"""
        return await self.broadcast_to_admins(text)
    
    async def get_updates(self) -> dict:
        """Get recent updates (for admin chat ID discovery)"""
        if not self.token:
            return {"ok": False, "error": "Token not configured"}
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/getUpdates")
                return response.json()
        except Exception as e:
            logger.error(f"Telegram getUpdates error: {e}")
            return {"ok": False, "error": str(e)}


# Singleton instances
valentina_ai = ValentinaAI()
telegram_notifier = TelegramNotifier()


# Helper functions
async def valentina_chat(partner_id: str, message: str, context: dict = None) -> str:
    """Quick access to VALENTINA chat"""
    return await valentina_ai.chat(partner_id, message, context)


def valentina_reset_session(partner_id: str) -> bool:
    """Reset VALENTINA session for a partner (clears conversation memory)"""
    session_key = f"valentina_{partner_id}"
    if session_key in ValentinaAI._llm_sessions:
        del ValentinaAI._llm_sessions[session_key]
        logger.info(f"Session reset for {session_key}")
        return True
    return False


def valentina_get_active_sessions() -> list:
    """Get list of active VALENTINA sessions"""
    return list(ValentinaAI._llm_sessions.keys())


async def telegram_notify(notification_type: str, **kwargs) -> dict:
    """Quick access to Telegram notifications"""
    if notification_type == "new_partner":
        return await telegram_notifier.notify_new_partner(
            kwargs.get("partner_name", "Unknown"),
            kwargs.get("partner_email", "unknown@email.com")
        )
    elif notification_type == "phase_complete":
        return await telegram_notifier.notify_phase_complete(
            kwargs.get("partner_name", "Unknown"),
            kwargs.get("old_phase", "F0"),
            kwargs.get("new_phase", "F1")
        )
    elif notification_type == "alert":
        return await telegram_notifier.notify_alert(
            kwargs.get("alert_type", "info"),
            kwargs.get("message", ""),
            kwargs.get("partner_name")
        )
    elif notification_type == "webhook_alert":
        # Direct message broadcast for webhook events
        return await telegram_notifier.broadcast_to_admins(kwargs.get("message", ""))
    else:
        return {"ok": False, "error": f"Unknown notification type: {notification_type}"}
