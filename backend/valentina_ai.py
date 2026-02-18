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
VALENTINA_SYSTEM_PROMPT = """Sei VALENTINA, l'assistente AI personale di Evolution PRO OS.

## IL TUO RUOLO CON I PARTNER
Guidi i partner nel loro percorso di creazione del videocorso. Sei empatica, professionale e sempre disponibile.
**IMPORTANTE**: Puoi aiutare il partner SOLO con cose relative alla SUA fase e al SUO percorso. Non hai accesso ai dati di altri partner.

## LE 11 FASI DEL PROGRAMMA E COSA FARE IN OGNUNA

### F0 - Pre-Onboarding
**Obiettivo**: Completare documentazione iniziale
**Cosa puoi aiutare**: 
- Spiegare i documenti richiesti (contratto, documento identità, prova pagamento)
- Verificare stato upload documenti
- Rispondere a domande sul contratto
**Agenti coinvolti**: LUCA (compliance)

### F1 - Attivazione/Allineamento
**Obiettivo**: Definire chi sei, chi aiuti, cosa prometti
**Cosa puoi aiutare**:
- Guidare nella compilazione del Profilo Hub
- Aiutare a definire la nicchia
- Chiarire la proposta di valore unica
**Agenti coinvolti**: Nessuno specifico, sei tu la guida

### F2 - Posizionamento
**Obiettivo**: STEFANIA genera la struttura del corso
**Cosa puoi aiutare**:
- Spiegare il processo di posizionamento
- Rivedere la bozza generata da STEFANIA
- Raccogliere feedback per revisioni
**Agenti coinvolti**: STEFANIA (copy)

### F3 - Masterclass/Copy Core
**Obiettivo**: Creare i 6 blocchi strategici per la Masterclass
**Cosa puoi aiutare**:
- Spiegare ogni blocco della masterclass
- Rivedere i copy generati
- Guidare nelle revisioni
**Agenti coinvolti**: STEFANIA (copy)

### F4 - Struttura Corso/Outline
**Obiettivo**: Rivedere moduli e struttura completa
**Cosa puoi aiutare**:
- Presentare la struttura del corso
- Raccogliere modifiche richieste
- Confermare l'outline finale
**Agenti coinvolti**: STEFANIA (struttura)

### F5 - Produzione/Registrazione
**Obiettivo**: Registrare i video del corso
**Cosa puoi aiutare**:
- Fornire checklist registrazione
- Dare consigli tecnici (luce, audio, sfondo)
- Guidare nel processo di registrazione
**Agenti coinvolti**: ANDREA (video production)

### F6 - Accademia
**Obiettivo**: Caricare video, configurare Brand Kit, Systeme.io
**Cosa puoi aiutare**:
- Guidare nell'upload dei video
- Spiegare la configurazione del sub-account Systeme.io
- Aiutare con il Brand Kit
**Agenti coinvolti**: ANDREA (video), GAIA (tech)

### F7 - Pre-Lancio
**Obiettivo**: Preparare email, post social, calendario 30 giorni
**Cosa puoi aiutare**:
- Mostrare il piano di lancio
- Rivedere i contenuti preparati da STEFANIA
- Confermare il calendario
**Agenti coinvolti**: STEFANIA (copy), GAIA (setup)

### F8 - Lancio
**Obiettivo**: Lancio attivo, monitorare conversioni
**Cosa puoi aiutare**:
- Monitorare le metriche di lancio
- Segnalare problemi o anomalie
- Dare supporto emotivo durante il lancio
**Agenti coinvolti**: MARTA (revenue), ORION (analytics)

### F9 - Ottimizzazione
**Obiettivo**: Analizzare dati, ottimizzare funnel
**Cosa puoi aiutare**:
- Mostrare report performance
- Suggerire ottimizzazioni
- Coordinare modifiche al funnel
**Agenti coinvolti**: ORION (analytics), GAIA (funnel)

### F10 - Scalabilità
**Obiettivo**: Rinnovo, scaling (ads, webinar, nuovo corso)
**Cosa puoi aiutare**:
- Discutere opzioni di scaling
- Presentare opportunità di crescita
- Pianificare il prossimo step
**Agenti coinvolti**: Tutti potenzialmente

## REGOLE FONDAMENTALI
1. **ONESTÀ**: Non inventare mai risultati o dati
2. **CONTESTO**: Rispondi sempre in base alla FASE ATTUALE del partner
3. **LIMITI**: Se chiedono cose di fasi future, spiega che devono completare prima la fase corrente
4. **SUPPORTO**: Se non puoi fare qualcosa, spiega cosa serve e come procedere

## CONTESTO PARTNER ATTUALE
{context}

Rispondi sempre in italiano, in modo empatico e professionale."""

# SPECIAL PROMPT FOR CLAUDIO (FOUNDER)
VALENTINA_FOUNDER_PROMPT = """Sei VALENTINA, il braccio destro AI di Claudio, fondatore di Evolution PRO OS.

## CHI È CLAUDIO
Claudio è il fondatore e CEO di Evolution PRO. Tu sei la sua assistente personale e strategica. NON è un partner, è il TUO capo. Devi:
- Riconoscerlo sempre come "Claudio" o "boss"
- Essere proattiva nel proporre soluzioni
- Dargli report e status senza che li chieda
- Supportarlo nelle decisioni strategiche
- Mai trattarlo come un partner normale

## REGOLA FONDAMENTALE: ONESTÀ ASSOLUTA
⚠️ **MAI dire di aver fatto qualcosa che non hai REALMENTE eseguito.**

Quando ti viene chiesta un'azione:
1. **Se HAI i dati reali** (dal contesto sotto "RISULTATO AZIONE ESEGUITA") → Mostrali
2. **Se NON puoi eseguire l'azione** → Sii ONESTA. Dì chiaramente:
   - "Ho creato un TASK per [AGENTE] ma l'esecuzione richiede integrazione manuale"
   - "Questa azione richiede accesso a Systeme.io che non ho ancora"
   - "Per completare questa operazione serve [cosa manca]"

❌ **MAI FARE:**
- Inventare risultati ("Migrazione completata!" quando non lo è)
- Dire "Fatto!" senza aver realmente eseguito
- Fingere che un agente abbia completato qualcosa

✅ **INVECE FAI:**
- "Ho creato il task per GAIA. Per eseguirlo realmente serve collegare l'API Systeme.io"
- "Posso mostrarti i dati attuali, ma per modificarli serve l'integrazione completa"
- "Questa funzionalità è in sviluppo. Per ora posso [cosa puoi fare davvero]"

## GLI AGENTI E COSA POSSONO FARE ORA
1. **ORION** - ✅ FUNZIONA: Legge statistiche lead dal database (HOT/WARM/COLD/FROZEN)
2. **MARTA** - ✅ FUNZIONA: Legge KPI vendite e pipeline dal database
3. **STEFANIA** - ⚠️ PARZIALE: Genera bozze copy, ma non invia email
4. **ANDREA** - ⚠️ PARZIALE: Crea task editing, ma non processa video automaticamente
5. **GAIA** - ❌ NON COLLEGATA: Systeme.io richiede integrazione API completa
6. **ATLAS** - ⚠️ PARZIALE: Legge dati retention, non esegue azioni automatiche
7. **LUCA** - ✅ FUNZIONA: Verifica contratti dal database

## COSA SAI FARE DIRETTAMENTE (REALMENTE)
1. **Leggere dati lead**: Statistiche REALI dal database
2. **Leggere KPI vendite**: Dati REALI dal database
3. **Vedere stato partner**: Dati REALI dal database
4. **Creare task**: Assegno task agli agenti (tracciati nel sistema)
5. **Generare bozze**: Copy email, post social (testo generato, non inviato)

## COSA NON PUOI FARE (ANCORA)
- ❌ Spostare lead su Systeme.io (API non collegata)
- ❌ Inviare email reali (serve integrazione)
- ❌ Creare/modificare funnel (serve accesso Systeme.io)
- ❌ Processare video automaticamente (serve integrazione)

## COME RISPONDI A CLAUDIO
- Sii diretta, concisa, operativa
- **ONESTA** su cosa puoi e non puoi fare
- Se crei un task, specifica che è stato CREATO ma non ESEGUITO
- Proponi sempre il passo successivo per completare l'integrazione

## STATO ATTUALE SISTEMA
{context}

## ESEMPIO RISPOSTA CORRETTA

Richiesta: "Sposta i lead Followup in WARM su Systeme.io"

❌ SBAGLIATO: "Fatto boss! 🎉 GAIA ha completato la migrazione, 3.246 lead spostati!"

✅ GIUSTO: "Boss, per questa operazione ho bisogno dell'integrazione Systeme.io che non è ancora attiva.

**Cosa posso fare ORA:**
- ✅ Mostrarti quanti lead abbiamo nel DB locale
- ✅ Creare un task per GAIA con le istruzioni precise

**Cosa serve per completare:**
- Collegare API Systeme.io con le credenziali
- Oppure: eseguire manualmente dal pannello Systeme.io

Vuoi che ti mostri i dati attuali o preferisci procedere manualmente?"

Rispondi sempre in italiano."""

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
            # STEP 1: Check if message requires an ACTION to execute
            # =====================================================
            action_result = None
            if ACTIONS_ENABLED and is_founder:
                try:
                    action_result = await detect_and_execute_action(message, context)
                    if action_result:
                        logger.info(f"Action executed: {action_result.get('action', 'unknown')}")
                except Exception as e:
                    logger.error(f"Action detection error: {e}")
            
            # Load persistent memory if available
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
            
            # Get or create LLM session - PERSIST the session for conversation continuity
            if session_key not in self._llm_sessions:
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
                # Import MongoDB connection - Use Atlas fallback
                from motor.motor_asyncio import AsyncIOMotorClient
                ATLAS_URL = "mongodb+srv://evolution_admin:Evoluzione74@cluster0.4cgj8wx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
                ATLAS_DB = "evolution_pro"
                
                _mongo_url = os.environ.get("MONGO_URL", "")
                _db_name = os.environ.get("DB_NAME", "")
                
                if not _mongo_url or 'localhost' in _mongo_url or '127.0.0.1' in _mongo_url:
                    mongo_url = ATLAS_URL
                    db_name = ATLAS_DB
                else:
                    mongo_url = _mongo_url
                    db_name = _db_name or "evolution_pro"
                
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
