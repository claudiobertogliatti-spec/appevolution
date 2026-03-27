"""
Flusso Analisi Strategica - Evolution PRO
==========================================

FLUSSO CORRETTO:
1. Cliente compila questionario → Auto-genera analisi (stato: bozza_analisi)
2. Admin modifica/conferma analisi (stato: analisi_pronta_per_call)
3. Admin fa call con cliente
4. Admin attiva fase decisione (stato: decisione_partnership)
5. Cliente vede analisi + contratto + pagamento nella pagina /decisione-partnership
6. Cliente paga e diventa partner (stato: partner_attivo)

STATI:
- questionario_inviato
- bozza_analisi
- analisi_pronta_per_call
- decisione_partnership
- partner_attivo
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import json
import logging
import uuid
import io
import re

# Import Master Prompt e OpenClaw Research
try:
    from master_prompt_analisi import (
        MASTER_PROMPT_CONFIG,
        SEZIONI_ANALISI,
        genera_data_gap_alert,
        verifica_completezza_questionario
    )
    from openclaw_research import (
        run_strategic_research,
        autocomplete_missing_data
    )
    MASTER_PROMPT_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Master Prompt o OpenClaw non disponibili: {e}")
    MASTER_PROMPT_AVAILABLE = False

router = APIRouter(prefix="/api/flusso-analisi", tags=["flusso-analisi"])

# Database reference
db = None

def set_db(database):
    global db
    db = database


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS MANCANTI: /pending, /stats, /list
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/pending")
async def get_pending_analisi():
    """Lista analisi in attesa di generazione o revisione"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    # Analisi richieste ma non ancora generate
    pending = await db.users.find(
        {
            "pagamento_analisi": True,
            "$or": [
                {"analisi_generata": {"$ne": True}},
                {"analisi_confermata": {"$ne": True}}
            ]
        },
        {"_id": 0, "id": 1, "nome": 1, "cognome": 1, "email": 1, "analisi_generata": 1, "analisi_confermata": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "pending": pending,
        "count": len(pending)
    }


@router.get("/stats")
async def get_flusso_analisi_stats():
    """Statistiche flusso analisi €67"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    total_pagamenti = await db.users.count_documents({"pagamento_analisi": True})
    analisi_generate = await db.users.count_documents({"analisi_generata": True})
    analisi_confermate = await db.users.count_documents({"analisi_confermata": True})
    videocall_prenotate = await db.users.count_documents({"videocall_prenotata": True})
    
    # Revenue
    revenue = total_pagamenti * 67
    
    return {
        "totale_pagamenti": total_pagamenti,
        "analisi_generate": analisi_generate,
        "analisi_confermate": analisi_confermate,
        "videocall_prenotate": videocall_prenotate,
        "revenue_totale": revenue,
        "tasso_generazione": round(analisi_generate / total_pagamenti * 100, 2) if total_pagamenti > 0 else 0,
        "tasso_conferma": round(analisi_confermate / analisi_generate * 100, 2) if analisi_generate > 0 else 0,
        "tasso_videocall": round(videocall_prenotate / analisi_confermate * 100, 2) if analisi_confermate > 0 else 0
    }


@router.get("/list")
async def get_analisi_list(
    limit: int = 50,
    skip: int = 0,
    status: Optional[str] = None
):
    """Lista tutte le analisi con filtri"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    query = {"pagamento_analisi": True}
    
    if status == "pending":
        query["analisi_generata"] = {"$ne": True}
    elif status == "generated":
        query["analisi_generata"] = True
        query["analisi_confermata"] = {"$ne": True}
    elif status == "confirmed":
        query["analisi_confermata"] = True
    
    analisi = await db.users.find(
        query,
        {
            "_id": 0, "id": 1, "nome": 1, "cognome": 1, "email": 1,
            "analisi_generata": 1, "analisi_confermata": 1, "videocall_prenotata": 1,
            "pagamento_analisi_at": 1, "created_at": 1
        }
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.users.count_documents(query)
    
    return {
        "analisi": analisi,
        "total": total,
        "limit": limit,
        "skip": skip
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class ModificaAnalisiRequest(BaseModel):
    user_id: str
    sezione: str
    contenuto: str

class ConfermaAnalisiRequest(BaseModel):
    user_id: str

class AttivaDecisioneRequest(BaseModel):
    user_id: str

class FirmaContrattoRequest(BaseModel):
    user_id: str
    accettato: bool
    ip_address: Optional[str] = None

class UploadRicevutaRequest(BaseModel):
    user_id: str


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Test configurazione Master Prompt e OpenClaw
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/config-status")
async def get_config_status():
    """
    Verifica lo stato della configurazione del Master Prompt e OpenClaw.
    Utile per debug e verifica deployment.
    """
    return {
        "master_prompt_available": MASTER_PROMPT_AVAILABLE,
        "openclaw_available": MASTER_PROMPT_AVAILABLE,
        "versione_prompt": "2.0_21_sezioni" if MASTER_PROMPT_AVAILABLE else "1.0_legacy",
        "sezioni_disponibili": 21 if MASTER_PROMPT_AVAILABLE else 12,
        "features": {
            "deep_research": MASTER_PROMPT_AVAILABLE,
            "data_gap_protocol": MASTER_PROMPT_AVAILABLE,
            "autocompletamento_investigativo": MASTER_PROMPT_AVAILABLE,
            "tabelle_competitor": MASTER_PROMPT_AVAILABLE
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS FLUSSO €67 - Registrazione e Questionario
# ═══════════════════════════════════════════════════════════════════════════════

class RegistraClienteRequest(BaseModel):
    nome: str
    cognome: str
    email: str
    telefono: Optional[str] = None
    password: Optional[str] = None

class QuestionarioRequest(BaseModel):
    user_id: str
    risposte: Dict[str, Any]

class GeneraAnalisiRequest(BaseModel):
    user_id: str


@router.post("/registra")
async def registra_cliente(request: RegistraClienteRequest):
    """
    Registra un nuovo cliente per l'Analisi Strategica €67.
    Alias per retrocompatibilità con /api/cliente-analisi/register.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    import bcrypt
    
    # Verifica se email già esiste
    existing = await db.users.find_one({"email": request.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata. Effettua il login.")
    
    # Auto-genera password se non fornita
    if request.password:
        password_plain = request.password
    else:
        password_plain = f"Evo{str(uuid.uuid4())[:6].upper()}!"
    
    # Hash password
    password_hash = bcrypt.hashpw(password_plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Crea utente
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "nome": request.nome,
        "cognome": request.cognome,
        "name": f"{request.nome} {request.cognome}",
        "email": request.email.lower(),
        "telefono": request.telefono,
        "password_hash": password_hash,
        "user_type": "cliente_analisi",
        "role": "cliente",
        "pagamento_analisi": False,
        "stato_flusso": "registrato",
        "data_registrazione": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    return {
        "success": True,
        "user_id": user_id,
        "message": "Registrazione completata. Procedi al pagamento.",
        "next_step": "pagamento"
    }


@router.post("/questionario")
async def salva_questionario(request: QuestionarioRequest):
    """
    Salva le risposte del questionario per un cliente.
    Dopo il questionario, l'analisi può essere generata.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    # Verifica utente
    user = await db.users.find_one({"id": request.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Salva questionario
    await db.users.update_one(
        {"id": request.user_id},
        {
            "$set": {
                "questionario": request.risposte,
                "questionario_completato": True,
                "stato_flusso": "questionario_completato",
                "data_questionario": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Questionario salvato",
        "next_step": "genera_analisi" if user.get("pagamento_analisi") else "pagamento"
    }


@router.get("/status/{user_id}")
async def get_cliente_status(user_id: str):
    """
    Stato del cliente nel flusso €67.
    Alias per /api/cliente-analisi/status/{user_id}.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    return {
        "user_id": user_id,
        "nome": user.get("nome"),
        "cognome": user.get("cognome"),
        "email": user.get("email"),
        "stato_flusso": user.get("stato_flusso", "registrato"),
        "pagamento_analisi": user.get("pagamento_analisi", False),
        "questionario_completato": user.get("questionario_completato", False),
        "analisi_generata": user.get("analisi_generata", False),
        "analisi_confermata": user.get("analisi_confermata", False),
        "call_fissata": user.get("call_fissata", False),
        "partnership_attiva": user.get("partnership_attiva", False)
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER - LLM
# ═══════════════════════════════════════════════════════════════════════════════

async def get_llm_chat(system_message: str = None):
    """Inizializza LLM con Emergent Key"""
    from emergentintegrations.llm.chat import LlmChat
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM Key non configurata")
    
    session_id = f"analisi_{datetime.now().timestamp()}"
    
    default_system = """Sei il Senior Strategic Advisor di Evolution PRO. 
Il tuo obiettivo è generare un'Analisi Strategica Partner di altissimo valore commerciale (prezzo: €67).

REGOLE OPERATIVE:
1. Integrità Strutturale: Segui rigorosamente la struttura delle sezioni. Non accorpare e non saltare nulla.
2. Data-Gap Protocol: Se i dati sono insufficienti, inserisci: [ANALISI SOSPESA: DATI MANCANTI]
3. Honesty Policy (No Flattery): Applica la "Verità Brutale". Se il modello di business è insostenibile, evidenzialo chiaramente.
4. Tono: Professionale, distaccato ma autorevole, orientato ai dati e alla fattibilità economica.
5. NON inventare dati o statistiche. Usa solo informazioni fornite o ricercate."""
    
    return LlmChat(
        api_key=api_key, 
        session_id=session_id,
        system_message=system_message or default_system
    ).with_model("anthropic", "claude-sonnet-4-20250514")

# ═══════════════════════════════════════════════════════════════════════════════
# HELPER - Genera Analisi Automatica
# ═══════════════════════════════════════════════════════════════════════════════

async def genera_analisi_automatica(user_id: str, questionario: dict):
    """
    Genera automaticamente l'analisi strategica dopo il questionario.
    Chiamata internamente quando il cliente invia il questionario.
    NUOVO TEMPLATE: Documento consulenziale professionale in 12 sezioni.
    """
    logging.info(f"[FLUSSO] Generazione automatica analisi per {user_id}")
    
    nome = questionario.get("nome", "")
    cognome = questionario.get("cognome", "")
    expertise = questionario.get("expertise", "Non specificato")
    cliente_target = questionario.get("cliente_target", "Non specificato")
    risultato = questionario.get("risultato_promesso", "Non specificato")
    pubblico = questionario.get("pubblico_esistente", "Non specificato")
    esperienze = questionario.get("esperienze_vendita", "Non specificato")
    ostacolo = questionario.get("ostacolo_principale", "Non specificato")
    motivazione = questionario.get("motivazione", "Non specificato")
    data_oggi = datetime.now().strftime('%d/%m/%Y')
    
    prompt = f"""Sei un consulente strategico senior di Evolution PRO. Devi generare una ANALISI STRATEGICA PERSONALIZZATA professionale.

OBIETTIVO:
Generare un documento consulenziale che valuta il potenziale del progetto del cliente.
L'analisi NON deve essere promozionale. Deve essere una valutazione seria e professionale.
Lunghezza minima: 1500 parole totali.

DATI DEL CLIENTE:
- Nome: {nome} {cognome}
- Competenza/Expertise: {expertise}
- Target cliente: {cliente_target}
- Risultato che promette: {risultato}
- Pubblico esistente: {pubblico}
- Esperienze di vendita: {esperienze}
- Ostacolo principale: {ostacolo}
- Motivazione: {motivazione}
- Data analisi: {data_oggi}

STILE DI SCRITTURA:
- Scrivi come un consulente strategico, NON come un venditore
- Evita frasi motivazionali e promesse di guadagno
- Usa analisi, valutazioni e osservazioni strategiche
- Il cliente deve percepire che il suo progetto è stato valutato con attenzione
- Evita contenuti generici e vaghi

Genera il documento in formato JSON con questa struttura ESATTA:

{{
    "titolo": "Analisi Strategica Personalizzata",
    "sottotitolo": "Valutazione del Potenziale del tuo Progetto Digitale",
    "data_generazione": "{data_oggi}",
    "cliente": "{nome} {cognome}",
    "professione": "{expertise}",
    "sezioni": {{
        "introduzione": {{
            "titolo": "Perché hai ricevuto questa Analisi",
            "contenuto": "Questa analisi strategica è stata realizzata per valutare il potenziale del tuo progetto e capire se esistono le condizioni per trasformarlo in una Accademia Digitale sostenibile nel tempo. Il nostro obiettivo non è vendere formazione, ma verificare se esiste una reale opportunità imprenditoriale. Negli ultimi anni sempre più professionisti stanno cercando di trasformare le proprie competenze in prodotti digitali. Tuttavia la maggior parte dei progetti fallisce non per mancanza di competenze, ma per mancanza di struttura. Per questo motivo prima di avviare qualsiasi collaborazione analizziamo con attenzione: la competenza del professionista, il problema che il mercato vuole risolvere, la chiarezza del posizionamento, la sostenibilità del modello di vendita. Solo dopo questa valutazione è possibile capire se il progetto può entrare nel sistema Evolution PRO."
        }},
        "modello_evolution": {{
            "titolo": "Come funziona il sistema Evolution PRO",
            "contenuto": "Il modello Evolution PRO è stato progettato per accompagnare professionisti e formatori nella creazione di una Accademia Digitale capace di generare vendite nel tempo. Il processo è strutturato in cinque fasi principali.",
            "fasi": [
                {{"nome": "Posizionamento", "descrizione": "Definizione del problema, del target e della promessa del corso"}},
                {{"nome": "Struttura Accademia", "descrizione": "Progettazione del percorso formativo e dei contenuti"}},
                {{"nome": "Sistema di Vendita", "descrizione": "Costruzione del funnel e delle pagine di vendita"}},
                {{"nome": "Lancio", "descrizione": "Introduzione del corso sul mercato con strategia di comunicazione"}},
                {{"nome": "Ottimizzazione", "descrizione": "Monitoraggio delle vendite e miglioramento continuo del sistema"}}
            ]
        }},
        "errori_comuni": {{
            "titolo": "Gli errori più comuni nella creazione di un videocorso",
            "contenuto": "Molti professionisti pensano che basti registrare alcune lezioni per creare un corso online. In realtà il problema non è il contenuto, ma la struttura del progetto.",
            "lista": [
                "Posizionamento poco chiaro",
                "Target troppo generico",
                "Contenuti non orientati alla trasformazione",
                "Assenza di un sistema di vendita",
                "Promozione improvvisata"
            ]
        }},
        "profilo_professionale": {{
            "titolo": "Il tuo punto di partenza",
            "contenuto": "[GENERA 3-4 PARAGRAFI: Analizza chi è il professionista basandoti su expertise='{expertise}', cosa fa, quale competenza possiede, quale esperienza ha con clienti reali basandoti su esperienze='{esperienze}'. Valuta se la competenza è trasferibile in formato digitale. Tono analitico e professionale, NON promozionale.]"
        }},
        "problema_mercato": {{
            "titolo": "Il problema che il tuo pubblico vuole risolvere",
            "contenuto": "[GENERA 2-3 PARAGRAFI: Analizza il problema principale che il cliente aiuta a risolvere basandoti su risultato='{risultato}'. Spiega perché questo problema è rilevante, quanto è urgente, e perché le persone potrebbero pagare per risolverlo. Valuta la trasformazione desiderata dal cliente finale.]"
        }},
        "target_posizionamento": {{
            "titolo": "Chi potrebbe comprare il tuo percorso",
            "contenuto": "[GENERA 2-3 PARAGRAFI: Analizza il target ideale basandoti su cliente_target='{cliente_target}' e pubblico='{pubblico}'. Valuta chiarezza, specificità, dimensione del pubblico. SE il target è troppo generico, SEGNALALO CHIARAMENTE come criticità da risolvere.]"
        }},
        "potenziale_progetto": {{
            "titolo": "Potenziale di mercato",
            "contenuto": "[GENERA 2-3 PARAGRAFI: Valutazione qualitativa (NON inventare statistiche) di: esistenza di domanda nel settore, livello di competizione, possibilità di differenziazione. Usa una valutazione strategica basata sui dati forniti.]"
        }},
        "ipotesi_accademia": {{
            "titolo": "Come potrebbe essere strutturato il percorso",
            "contenuto": "[GENERA 2 PARAGRAFI: Proponi una possibile struttura del percorso formativo con nome corso, logica del percorso, trasformazione promessa.]",
            "moduli_suggeriti": [
                {{"nome": "Modulo 1 - Fondamenti", "descrizione": "[Descrizione specifica basata sul progetto]"}},
                {{"nome": "Modulo 2 - Metodo", "descrizione": "[Descrizione specifica]"}},
                {{"nome": "Modulo 3 - Applicazione", "descrizione": "[Descrizione specifica]"}},
                {{"nome": "Modulo 4 - Trasformazione", "descrizione": "[Descrizione specifica]"}}
            ]
        }},
        "modello_monetizzazione": {{
            "titolo": "Come il progetto potrebbe generare entrate",
            "contenuto": "[GENERA 2 PARAGRAFI: Ipotesi REALISTICA e PRUDENTE di fascia prezzo corso (es. €497-€1997), tipo di offerta principale, possibili sviluppi futuri. EVITA promesse economiche specifiche.]",
            "pricing_suggerito": "[Range realistico es. €497 - €997]"
        }},
        "costo_modello_attuale": {{
            "titolo": "Il vero costo di rimanere nel modello attuale",
            "contenuto": "[GENERA 3-4 PARAGRAFI: Analizza il modello di lavoro attuale del professionista. Se lavora con consulenze individuali, sessioni 1:1, o servizi legati al tempo, spiega come questo crei un limite strutturale alla crescita. Il reddito è legato alle ore disponibili. Anche aumentando la tariffa, esiste un tetto naturale. Il problema non è il fatturato di oggi, ma la traiettoria dei prossimi anni. Una Accademia Digitale non sostituisce il lavoro principale, ma crea un asset che genera entrate indipendentemente dal tempo disponibile. Usa tono consulenziale, NON promozionale. L'obiettivo è far riflettere sul costo-opportunità di non cambiare.]",
            "modello_attuale": {{
                "titolo": "Il modello attuale",
                "elementi": [
                    "Consulenze individuali",
                    "Ore di lavoro vendute direttamente",
                    "Reddito legato alla presenza"
                ],
                "limite": "Ogni nuova entrata richiede nuovo tempo"
            }},
            "limite_tempo": {{
                "titolo": "Il limite del tempo",
                "contenuto": "Se il tuo lavoro si basa esclusivamente su sessioni, consulenze o lezioni, il tuo reddito resterà sempre legato al numero di ore disponibili nella settimana. Questo significa che anche aumentando la tariffa esiste comunque un tetto naturale di crescita."
            }},
            "obiettivo_accademia": {{
                "titolo": "L'obiettivo di una Accademia Digitale",
                "benefici": [
                    "Aumentare l'impatto del proprio metodo",
                    "Liberare tempo",
                    "Stabilizzare il reddito nel tempo"
                ]
            }}
        }},
        "valutazione_fattibilita": {{
            "titolo": "Esito del Check di Fattibilità",
            "punteggio": [NUMERO DA 1 A 10 basato sulla qualità complessiva del progetto],
            "livello_potenziale": "[UNO DEI QUATTRO: 'Basso' / 'Medio' / 'Alto' / 'Molto Alto' - basato su punteggio: 1-4=Basso, 5-6=Medio, 7-8=Alto, 9-10=Molto Alto]",
            "esito": "[UNO DEI TRE: 'Progetto adatto alla partnership' / 'Progetto promettente ma da definire meglio' / 'Progetto non ancora pronto']",
            "motivazione": "[GENERA 2-3 PARAGRAFI: Spiega CHIARAMENTE il motivo della valutazione. Se ci sono criticità (target generico, posizionamento debole, mancanza esperienza vendita), segnalale. Se il progetto è forte, spiega perché.]",
            "punti_forza": ["[Lista 2-3 punti di forza specifici]"],
            "aree_miglioramento": ["[Lista 2-3 aree da migliorare specifiche, se presenti]"]
        }},
        "roadmap": {{
            "titolo": "Roadmap del Progetto",
            "contenuto": "Se deciderai di procedere con Evolution PRO, questo sarà il percorso per creare la tua Accademia Digitale.",
            "fasi": [
                {{"fase": "Fase 1 - Posizionamento", "durata": "2-3 settimane", "descrizione": "Definizione del posizionamento unico, della promessa di valore e del naming del corso"}},
                {{"fase": "Fase 2 - Masterclass", "durata": "2 settimane", "descrizione": "Creazione della Masterclass gratuita che vende il corso"}},
                {{"fase": "Fase 3 - Videocorso", "durata": "4-6 settimane", "descrizione": "Registrazione e produzione del videocorso completo"}},
                {{"fase": "Fase 4 - Funnel", "durata": "2 settimane", "descrizione": "Costruzione del sistema di vendita automatizzato"}},
                {{"fase": "Fase 5 - Lancio", "durata": "2 settimane", "descrizione": "Lancio ufficiale e prime vendite"}}
            ]
        }},
        "prossimi_passi": {{
            "titolo": "Cosa succede ora",
            "contenuto": "Durante la call strategica commenteremo insieme questa analisi e valuteremo se esistono le condizioni per avviare la partnership. Se il progetto risulterà adatto, potremo iniziare il percorso di creazione della tua Accademia Digitale. In caso contrario riceverai comunque indicazioni chiare su come migliorare il progetto prima di ripresentarlo.",
            "azioni": [
                "Call strategica per discutere l'analisi",
                "Valutazione congiunta della fattibilità",
                "Decisione sulla partnership Evolution PRO"
            ]
        }}
    }}
}}

REGOLE CRITICHE:
1. Sostituisci TUTTI i placeholder [GENERA...] con contenuto REALE e SPECIFICO basato sui dati del cliente
2. NON usare frasi generiche tipo "il tuo progetto ha potenziale" - sii SPECIFICO
3. Se i dati sono vaghi, segnalalo come criticità nella valutazione
4. Il documento deve sembrare scritto da un consulente umano, NON da un'AI
5. Minimo 1500 parole totali nel documento
6. Rispondi SOLO con il JSON valido, senza testo aggiuntivo"""

    try:
        llm = await get_llm_chat()
        from emergentintegrations.llm.chat import UserMessage
        
        response = await llm.chat([UserMessage(text=prompt)])
        response_text = response.text.strip()
        
        # Parse JSON
        import re
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            analisi = json.loads(json_match.group())
        else:
            raise ValueError("JSON non trovato nella risposta")
            
    except Exception as e:
        logging.error(f"Errore generazione analisi AI: {e}")
        # Fallback con struttura base
        analisi = genera_analisi_fallback(nome, cognome, expertise, cliente_target, risultato, pubblico, esperienze, ostacolo, motivazione)
    
    analisi["generated_at"] = datetime.now(timezone.utc).isoformat()
    analisi["user_id"] = user_id
    analisi["stato"] = "bozza_analisi"
    
    return analisi


def genera_analisi_fallback(nome, cognome, expertise, cliente_target, risultato, pubblico, esperienze, ostacolo, motivazione):
    """Genera analisi di fallback se l'AI fallisce - Template 12 sezioni"""
    data_oggi = datetime.now().strftime('%d/%m/%Y')
    return {
        "titolo": "Analisi Strategica Personalizzata",
        "sottotitolo": "Valutazione del Potenziale del tuo Progetto Digitale",
        "data_generazione": data_oggi,
        "cliente": f"{nome} {cognome}",
        "professione": expertise,
        "sezioni": {
            "introduzione": {
                "titolo": "Perché hai ricevuto questa Analisi",
                "contenuto": "Questa analisi strategica è stata realizzata per valutare il potenziale del tuo progetto e capire se esistono le condizioni per trasformarlo in una Accademia Digitale sostenibile nel tempo. Il nostro obiettivo non è vendere formazione, ma verificare se esiste una reale opportunità imprenditoriale. Negli ultimi anni sempre più professionisti stanno cercando di trasformare le proprie competenze in prodotti digitali. Tuttavia la maggior parte dei progetti fallisce non per mancanza di competenze, ma per mancanza di struttura. Per questo motivo prima di avviare qualsiasi collaborazione analizziamo con attenzione: la competenza del professionista, il problema che il mercato vuole risolvere, la chiarezza del posizionamento, la sostenibilità del modello di vendita."
            },
            "modello_evolution": {
                "titolo": "Come funziona il sistema Evolution PRO",
                "contenuto": "Il modello Evolution PRO è stato progettato per accompagnare professionisti e formatori nella creazione di una Accademia Digitale capace di generare vendite nel tempo.",
                "fasi": [
                    {"nome": "Posizionamento", "descrizione": "Definizione del problema, del target e della promessa del corso"},
                    {"nome": "Struttura Accademia", "descrizione": "Progettazione del percorso formativo e dei contenuti"},
                    {"nome": "Sistema di Vendita", "descrizione": "Costruzione del funnel e delle pagine di vendita"},
                    {"nome": "Lancio", "descrizione": "Introduzione del corso sul mercato con strategia di comunicazione"},
                    {"nome": "Ottimizzazione", "descrizione": "Monitoraggio delle vendite e miglioramento continuo del sistema"}
                ]
            },
            "errori_comuni": {
                "titolo": "Gli errori più comuni nella creazione di un videocorso",
                "contenuto": "Molti professionisti pensano che basti registrare alcune lezioni per creare un corso online. In realtà il problema non è il contenuto, ma la struttura del progetto.",
                "lista": [
                    "Posizionamento poco chiaro",
                    "Target troppo generico",
                    "Contenuti non orientati alla trasformazione",
                    "Assenza di un sistema di vendita",
                    "Promozione improvvisata"
                ]
            },
            "profilo_professionale": {
                "titolo": "Il tuo punto di partenza",
                "contenuto": f"Operi nel campo '{expertise}' con l'obiettivo di aiutare '{cliente_target}'. La tua esperienza e competenza rappresentano una base su cui costruire un progetto digitale. In base alle informazioni fornite, hai indicato come esperienza di vendita: '{esperienze}'. Questo dato è importante per valutare la fattibilità commerciale del progetto. La competenza tecnica da sola non basta: serve anche la capacità di comunicarla e venderla."
            },
            "problema_mercato": {
                "titolo": "Il problema che il tuo pubblico vuole risolvere",
                "contenuto": f"Il risultato che prometti è: '{risultato}'. Questo è il cuore della tua proposta di valore. Un progetto digitale sostenibile deve risolvere un problema reale e urgente. La domanda chiave è: quanto è disposto a pagare il tuo target per ottenere questa trasformazione? Durante la call strategica approfondiremo questo aspetto."
            },
            "target_posizionamento": {
                "titolo": "Chi potrebbe comprare il tuo percorso",
                "contenuto": f"Hai identificato come target: '{cliente_target}'. Hai indicato come pubblico esistente: '{pubblico}'. La chiarezza del target è fondamentale per il successo del progetto. Un target troppo generico rende impossibile creare una comunicazione efficace e un funnel di vendita performante."
            },
            "potenziale_progetto": {
                "titolo": "Potenziale di mercato",
                "contenuto": f"Il mercato della formazione online nel settore '{expertise}' presenta opportunità per chi sa posizionarsi correttamente. La valutazione del potenziale dipende da: chiarezza del posizionamento, specificità del target, urgenza del problema risolto, e capacità di differenziarsi dalla concorrenza."
            },
            "ipotesi_accademia": {
                "titolo": "Come potrebbe essere strutturato il percorso",
                "contenuto": f"Basandoci sui dati forniti, ipotizziamo un percorso formativo che guidi '{cliente_target}' verso il risultato: '{risultato}'.",
                "moduli_suggeriti": [
                    {"nome": "Modulo 1 - Fondamenti", "descrizione": "Basi teoriche e mindset necessario"},
                    {"nome": "Modulo 2 - Metodo", "descrizione": "Il framework operativo passo-passo"},
                    {"nome": "Modulo 3 - Applicazione", "descrizione": "Implementazione pratica con esercizi"},
                    {"nome": "Modulo 4 - Trasformazione", "descrizione": "Consolidamento e risultati misurabili"}
                ]
            },
            "modello_monetizzazione": {
                "titolo": "Come il progetto potrebbe generare entrate",
                "contenuto": "Il modello prevede un videocorso venduto tramite funnel automatizzato. La fascia prezzo dipenderà dal valore percepito della trasformazione promessa e dal potere d'acquisto del target.",
                "pricing_suggerito": "€497 - €997 (da definire in base al posizionamento)"
            },
            "costo_modello_attuale": {
                "titolo": "Il vero costo di rimanere nel modello attuale",
                "contenuto": f"Molti professionisti nel tuo settore lavorano con un modello basato su consulenze individuali, sessioni 1:1, o servizi legati direttamente al proprio tempo. Questo modello funziona, ma ha un limite strutturale: ogni nuova entrata richiede nuovo tempo. Se il tuo lavoro si basa esclusivamente su sessioni, consulenze o lezioni, il tuo reddito resterà sempre legato al numero di ore disponibili nella settimana. Questo significa che anche aumentando la tariffa esiste comunque un tetto naturale di crescita. Il problema non è il fatturato di questo mese. Il problema è la traiettoria dei prossimi anni. Se il modello di lavoro non cambia, la crescita resterà sempre lineare e limitata.",
                "modello_attuale": {
                    "titolo": "Il modello attuale",
                    "elementi": [
                        "Consulenze individuali",
                        "Ore di lavoro vendute direttamente",
                        "Reddito legato alla presenza"
                    ],
                    "limite": "Ogni nuova entrata richiede nuovo tempo"
                },
                "limite_tempo": {
                    "titolo": "Il limite del tempo",
                    "contenuto": "Se il tuo lavoro si basa esclusivamente su sessioni, consulenze o lezioni, il tuo reddito resterà sempre legato al numero di ore disponibili nella settimana. Questo significa che anche aumentando la tariffa esiste comunque un tetto naturale di crescita."
                },
                "obiettivo_accademia": {
                    "titolo": "L'obiettivo di una Accademia Digitale",
                    "benefici": [
                        "Aumentare l'impatto del proprio metodo",
                        "Liberare tempo",
                        "Stabilizzare il reddito nel tempo"
                    ]
                }
            },
            "valutazione_fattibilita": {
                "titolo": "Esito del Check di Fattibilità",
                "punteggio": 6,
                "livello_potenziale": "Medio",
                "esito": "Progetto promettente ma da definire meglio",
                "motivazione": f"Il progetto presenta elementi interessanti ma richiede un approfondimento. L'ostacolo principale indicato ('{ostacolo}') è comune a molti professionisti e può essere superato con la giusta struttura. La motivazione ('{motivazione}') suggerisce una buona predisposizione. Tuttavia, alcuni elementi necessitano di maggiore definizione prima di procedere.",
                "punti_forza": [
                    "Competenza specifica nel settore",
                    "Target identificato",
                    "Motivazione presente"
                ],
                "aree_miglioramento": [
                    "Definizione più precisa del posizionamento",
                    "Validazione commerciale del target",
                    "Strutturazione dell'offerta"
                ]
            },
            "roadmap": {
                "titolo": "Roadmap del Progetto",
                "contenuto": "Se deciderai di procedere con Evolution PRO, questo sarà il percorso per creare la tua Accademia Digitale.",
                "fasi": [
                    {"fase": "Fase 1 - Posizionamento", "durata": "2-3 settimane", "descrizione": "Definizione del posizionamento unico, della promessa di valore e del naming del corso"},
                    {"fase": "Fase 2 - Masterclass", "durata": "2 settimane", "descrizione": "Creazione della Masterclass gratuita che vende il corso"},
                    {"fase": "Fase 3 - Videocorso", "durata": "4-6 settimane", "descrizione": "Registrazione e produzione del videocorso completo"},
                    {"fase": "Fase 4 - Funnel", "durata": "2 settimane", "descrizione": "Costruzione del sistema di vendita automatizzato"},
                    {"fase": "Fase 5 - Lancio", "durata": "2 settimane", "descrizione": "Lancio ufficiale e prime vendite"}
                ]
            },
            "prossimi_passi": {
                "titolo": "Cosa succede ora",
                "contenuto": "Durante la call strategica commenteremo insieme questa analisi e valuteremo se esistono le condizioni per avviare la partnership. Se il progetto risulterà adatto, potremo iniziare il percorso di creazione della tua Accademia Digitale. In caso contrario riceverai comunque indicazioni chiare su come migliorare il progetto prima di ripresentarlo.",
                "azioni": [
                    "Call strategica per discutere l'analisi",
                    "Valutazione congiunta della fattibilità",
                    "Decisione sulla partnership Evolution PRO"
                ]
            }
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# NUOVA FUNZIONE: Genera Analisi 21 Sezioni con OpenClaw Research
# ═══════════════════════════════════════════════════════════════════════════════

async def genera_analisi_21_sezioni(user_id: str, questionario: dict, use_openclaw: bool = True):
    """
    Genera l'Analisi Strategica con il nuovo Master Prompt (21 sezioni).
    
    Implementa:
    - Struttura 21 sezioni come da Master Prompt
    - Data-Gap Protocol con alert espliciti
    - Deep Research con OpenClaw (se abilitato)
    - Autocompletamento investigativo per dati mancanti
    - Output in formato Markdown avanzato
    
    Args:
        user_id: ID del cliente
        questionario: Dati del questionario compilato
        use_openclaw: Se True, attiva ricerca web per dati mancanti
    
    Returns:
        Dict con analisi completa in 21 sezioni
    """
    logging.info(f"[FLUSSO 21] Generazione analisi 21 sezioni per {user_id}")
    
    # Estrai dati base
    nome = questionario.get("nome", "")
    cognome = questionario.get("cognome", "")
    expertise = questionario.get("expertise", "")
    cliente_target = questionario.get("cliente_target", "")
    risultato = questionario.get("risultato_promesso", "")
    pubblico = questionario.get("pubblico_esistente", "")
    esperienze = questionario.get("esperienze_vendita", "")
    ostacolo = questionario.get("ostacolo_principale", "")
    motivazione = questionario.get("motivazione", "")
    competitor = questionario.get("competitor", "")
    sito_web = questionario.get("sito_web", "")
    social_links = questionario.get("social_links", [])
    data_oggi = datetime.now().strftime('%d/%m/%Y')
    
    # ═══════════════════════════════════════════════════════════════
    # STEP 1: Verifica completezza e Data-Gap Protocol
    # ═══════════════════════════════════════════════════════════════
    
    completezza_report = None
    enriched_data = questionario.copy()
    research_data = None
    data_gap_alerts = []
    
    if MASTER_PROMPT_AVAILABLE:
        completezza_report = verifica_completezza_questionario(questionario)
        logging.info(f"[FLUSSO 21] Completezza questionario: {completezza_report['completezza_percentuale']}%")
        
        # Se completezza < 70% e OpenClaw abilitato, avvia ricerca web
        if completezza_report["richiede_ricerca_web"] and use_openclaw:
            logging.info("[FLUSSO 21] Avvio autocompletamento investigativo OpenClaw...")
            try:
                autocomplete_result = await autocomplete_missing_data(questionario)
                enriched_data = autocomplete_result.get("enriched_data", questionario)
                data_gap_alerts.extend(autocomplete_result.get("missing_alerts", []))
                
                logging.info(f"[FLUSSO 21] Dati arricchiti: {len(autocomplete_result.get('enrichment_notes', []))} campi")
            except Exception as e:
                logging.error(f"[FLUSSO 21] Errore autocompletamento: {e}")
        
        # Aggiungi alert per campi ancora mancanti
        for campo in completezza_report.get("campi_mancanti", []):
            alert = genera_data_gap_alert(campo)
            if alert not in [a.get("message", a) for a in data_gap_alerts]:
                data_gap_alerts.append({"field": campo, "message": alert})
    
    # ═══════════════════════════════════════════════════════════════
    # STEP 2: Deep Research con OpenClaw (se abilitato)
    # ═══════════════════════════════════════════════════════════════
    
    if use_openclaw and MASTER_PROMPT_AVAILABLE and expertise:
        logging.info("[FLUSSO 21] Avvio Deep Research OpenClaw...")
        try:
            # Prepara lista competitor se specificati
            competitor_list = []
            if competitor:
                competitor_list = [c.strip() for c in competitor.split(",") if c.strip()]
            
            research_data = await run_strategic_research(
                nome_partner=f"{nome} {cognome}",
                expertise=expertise,
                target=cliente_target or "professionisti",
                competitor_names=competitor_list if competitor_list else None,
                website_partner=sito_web if sito_web else None,
                social_links=social_links if social_links else None
            )
            logging.info(f"[FLUSSO 21] Research completata. Qualità dati: {research_data.get('data_quality')}")
        except Exception as e:
            logging.error(f"[FLUSSO 21] Errore Deep Research: {e}")
            research_data = {"error": str(e), "data_quality": "failed"}
    
    # ═══════════════════════════════════════════════════════════════
    # STEP 3: Genera il prompt per Claude con 21 sezioni
    # ═══════════════════════════════════════════════════════════════
    
    # Prepara dati ricerca per il prompt
    research_summary = ""
    competitor_table_data = ""
    
    if research_data and research_data.get("data_quality") != "failed":
        synthesis = research_data.get("synthesis", {})
        if synthesis and not synthesis.get("error"):
            research_summary = f"""
DATI RICERCA WEB (OpenClaw):
- Posizionamento mercato: {synthesis.get('posizionamento_mercato', 'N/D')}
- Visibilità digitale partner: {synthesis.get('visibilita_digitale_score', 'N/D')}/10
- Competitor principali: {', '.join(synthesis.get('competitor_principali', [])[:3])}
- Opportunità identificate: {', '.join(synthesis.get('opportunita', [])[:3])}
- Minacce: {', '.join(synthesis.get('minacce', [])[:3])}
- Raccomandazioni differenziazione: {synthesis.get('raccomandazioni_differenziazione', 'N/D')}
- Note critiche: {synthesis.get('note_critiche', 'Nessuna')}
"""
        
        # Prepara dati per tabella competitor
        competitors = research_data.get("competitor_analysis", [])
        if competitors:
            for comp in competitors[:5]:
                if isinstance(comp, dict):
                    competitor_table_data += f"- {comp.get('name', comp.get('domain', 'N/D'))}: {comp.get('positioning', comp.get('snippet', ''))[:100]}\n"
    
    # Prepara alert data-gap per il prompt
    data_gap_text = ""
    if data_gap_alerts:
        data_gap_text = "\n\nALERT DATI MANCANTI (inserisci questi alert nelle sezioni pertinenti):\n"
        for alert in data_gap_alerts[:5]:
            if isinstance(alert, dict):
                data_gap_text += f"- {alert.get('field', 'campo')}: {alert.get('message', '')[:200]}\n"
            else:
                data_gap_text += f"- {str(alert)[:200]}\n"
    
    prompt_21_sezioni = f"""Genera un'ANALISI STRATEGICA COMPLETA in 21 SEZIONI per il partner.

RUOLO: Sei il Senior Strategic Advisor di Evolution PRO. L'analisi vale €67.

DATI DEL PARTNER:
- Nome: {nome} {cognome}
- Expertise: {expertise or '[DATO MANCANTE]'}
- Target cliente: {cliente_target or '[DATO MANCANTE]'}
- Risultato promesso: {risultato or '[DATO MANCANTE]'}
- Pubblico esistente: {pubblico or '[DATO MANCANTE]'}
- Esperienze vendita: {esperienze or '[DATO MANCANTE]'}
- Ostacolo principale: {ostacolo or '[DATO MANCANTE]'}
- Motivazione: {motivazione or '[DATO MANCANTE]'}
- Competitor indicati: {competitor or '[NON SPECIFICATI]'}
- Sito web: {sito_web or '[NON INDICATO]'}
- Data analisi: {data_oggi}
{research_summary}
{data_gap_text}

REGOLE CRITICHE:
1. STRUTTURA: Genera ESATTAMENTE 21 sezioni nell'ordine specificato
2. DATA-GAP: Se un dato è mancante, inserisci: "⚠️ [ANALISI SOSPESA: DATI MANCANTI] - [spiegazione perché il dato è fondamentale]"
3. HONESTY POLICY: Applica la "Verità Brutale". Se il progetto è debole, dillo chiaramente
4. NO FLATTERY: Zero adulazione. Solo analisi oggettiva
5. LUNGHEZZA: Minimo 2500 parole totali
6. OUTPUT: JSON valido con la struttura sotto

STRUTTURA 21 SEZIONI (genera JSON):
{{
    "meta": {{
        "titolo": "Analisi Strategica Personalizzata",
        "cliente": "{nome} {cognome}",
        "data": "{data_oggi}",
        "versione": "2.0",
        "completezza_dati": "{completezza_report['completezza_percentuale'] if completezza_report else 'N/D'}%"
    }},
    "sezioni": {{
        "01_introduzione": {{
            "titolo": "Introduzione all'Analisi",
            "contenuto": "[Testo standard: spiega perché questa analisi esiste e cosa valuterà]"
        }},
        "02_chi_siamo": {{
            "titolo": "Chi è Evolution PRO",
            "contenuto": "[Testo standard: descrivi Evolution PRO e il modello in 5 fasi]"
        }},
        "03_come_funziona": {{
            "titolo": "Come Funziona Questa Analisi",
            "contenuto": "[Testo standard: spiega struttura 21 sezioni e come leggere gli indicatori ✅⚠️❌]"
        }},
        "04_glossario": {{
            "titolo": "Glossario",
            "contenuto": "[Testo standard: definizioni di Accademia Digitale, Funnel, Masterclass, CPL, LTV]"
        }},
        "05_disclaimer": {{
            "titolo": "Disclaimer",
            "contenuto": "[Testo standard: disclaimer sui risultati non garantiti]"
        }},
        "06_profilo_professionale": {{
            "titolo": "Il Tuo Profilo Professionale",
            "contenuto": "[GENERA: 3-4 paragrafi analizzando expertise e esperienze. Valuta trasferibilità in digitale]",
            "indicatore": "[✅ se solido, ⚠️ se da approfondire, ❌ se critico]"
        }},
        "07_problema_risolto": {{
            "titolo": "Il Problema che Risolvi",
            "contenuto": "[GENERA: Analizza problema e urgenza. Valuta se il mercato pagherebbe]",
            "indicatore": "[✅⚠️❌]"
        }},
        "08_target_ideale": {{
            "titolo": "Il Tuo Target Ideale",
            "contenuto": "[GENERA: Analizza target. Se troppo generico, SEGNALA CRITICITÀ]",
            "indicatore": "[✅⚠️❌]"
        }},
        "09_proposta_valore": {{
            "titolo": "La Tua Proposta di Valore",
            "contenuto": "[GENERA: Definisci proposta di valore unica e differenziazione]",
            "indicatore": "[✅⚠️❌]"
        }},
        "10_analisi_mercato": {{
            "titolo": "Analisi del Mercato",
            "contenuto": "[GENERA con dati ricerca: Valuta domanda, trend, dimensione mercato]",
            "indicatore": "[✅⚠️❌]"
        }},
        "11_posizionamento_attuale": {{
            "titolo": "Posizionamento Attuale",
            "contenuto": "[GENERA con dati ricerca: Valuta presenza online, autorità percepita]",
            "visibilita_score": "[1-10]",
            "indicatore": "[✅⚠️❌]"
        }},
        "12_analisi_competitor": {{
            "titolo": "Analisi dei Competitor",
            "contenuto": "[GENERA con dati ricerca: Analisi dettagliata competitor]",
            "tabella_competitor": [
                {{"nome": "Competitor 1", "posizionamento": "", "prezzo_stimato": "", "punti_forza": "", "punti_debolezza": ""}},
                {{"nome": "Competitor 2", "posizionamento": "", "prezzo_stimato": "", "punti_forza": "", "punti_debolezza": ""}},
                {{"nome": "Competitor 3", "posizionamento": "", "prezzo_stimato": "", "punti_forza": "", "punti_debolezza": ""}}
            ],
            "indicatore": "[✅⚠️❌]"
        }},
        "13_differenziazione": {{
            "titolo": "Strategia di Differenziazione",
            "contenuto": "[GENERA: Proponi strategia concreta per differenziarsi]",
            "indicatore": "[✅⚠️❌]"
        }},
        "14_criticita": {{
            "titolo": "⚠️ Criticità e Aree di Rischio",
            "contenuto": "[GENERA: VERITÀ BRUTALE. Elenca tutte le criticità senza sconti]",
            "lista_criticita": ["[criticità 1]", "[criticità 2]", "[criticità 3]"],
            "alert_box": "[Se modello insostenibile, inserisci box allerta rosso]",
            "indicatore": "[✅⚠️❌]"
        }},
        "15_struttura_corso": {{
            "titolo": "Ipotesi Struttura del Corso",
            "contenuto": "[GENERA: Proponi struttura con nome corso e moduli]",
            "nome_corso_proposto": "",
            "moduli": [
                {{"numero": 1, "nome": "", "descrizione": "", "durata_stimata": ""}},
                {{"numero": 2, "nome": "", "descrizione": "", "durata_stimata": ""}},
                {{"numero": 3, "nome": "", "descrizione": "", "durata_stimata": ""}},
                {{"numero": 4, "nome": "", "descrizione": "", "durata_stimata": ""}}
            ]
        }},
        "16_modello_monetizzazione": {{
            "titolo": "Modello di Monetizzazione",
            "contenuto": "[GENERA: Modello realistico e prudente]",
            "prezzo_suggerito": "€[min] - €[max]",
            "tipologia_offerta": "",
            "possibili_upsell": []
        }},
        "17_costo_opportunita": {{
            "titolo": "Il Costo di Non Agire",
            "contenuto": "[GENERA: Analizza costo-opportunità del modello attuale]",
            "limite_modello_attuale": ""
        }},
        "18_roadmap": {{
            "titolo": "Roadmap Dettagliata",
            "contenuto": "[GENERA: Timeline dettagliata]",
            "timeline": [
                {{"fase": "F1 - Posizionamento", "settimane": "2-3", "attivita": "", "deliverable": ""}},
                {{"fase": "F2 - Masterclass", "settimane": "2", "attivita": "", "deliverable": ""}},
                {{"fase": "F3 - Videocorso", "settimane": "4-6", "attivita": "", "deliverable": ""}},
                {{"fase": "F4 - Funnel", "settimane": "2", "attivita": "", "deliverable": ""}},
                {{"fase": "F5 - Lancio", "settimane": "2", "attivita": "", "deliverable": ""}}
            ]
        }},
        "19_investimento": {{
            "titolo": "Investimento Richiesto",
            "contenuto": "[GENERA: Dettaglia investimenti necessari]",
            "tempo_stimato": "",
            "budget_marketing_minimo": "",
            "strumenti_necessari": []
        }},
        "20_valutazione_finale": {{
            "titolo": "Valutazione Finale di Fattibilità",
            "punteggio": [1-10],
            "livello": "[Basso/Medio/Alto/Molto Alto]",
            "esito": "[Progetto adatto / Promettente ma da definire / Non ancora pronto]",
            "motivazione": "[GENERA: 2-3 paragrafi con motivazione dettagliata]",
            "punti_forza": ["", "", ""],
            "aree_miglioramento": ["", "", ""]
        }},
        "21_prossimi_passi": {{
            "titolo": "Prossimi Passi",
            "contenuto": "[Testo standard: cosa succede dopo l'analisi, call strategica, decisione]"
        }}
    }},
    "appendice": {{
        "dati_ricerca_web": {{"fonte": "OpenClaw Research", "data_qualita": "{research_data.get('data_quality') if research_data else 'non_eseguita'}"}},
        "note_autocompletamento": "[Se dati recuperati via web, segnalalo qui]"
    }}
}}

Rispondi SOLO con il JSON valido, senza testo aggiuntivo prima o dopo."""

    # ═══════════════════════════════════════════════════════════════
    # STEP 4: Genera analisi con Claude
    # ═══════════════════════════════════════════════════════════════
    
    try:
        llm = await get_llm_chat()
        from emergentintegrations.llm.chat import UserMessage
        
        response = await llm.chat([UserMessage(text=prompt_21_sezioni)])
        response_text = response.text.strip()
        
        # Parse JSON
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            analisi = json.loads(json_match.group())
        else:
            raise ValueError("JSON non trovato nella risposta")
        
        logging.info(f"[FLUSSO 21] Analisi 21 sezioni generata con successo")
            
    except Exception as e:
        logging.error(f"[FLUSSO 21] Errore generazione AI: {e}")
        # Fallback alla versione precedente
        analisi = await genera_analisi_automatica(user_id, questionario)
        analisi["fallback_used"] = True
        analisi["fallback_reason"] = str(e)
    
    # ═══════════════════════════════════════════════════════════════
    # STEP 5: Arricchisci con metadati
    # ═══════════════════════════════════════════════════════════════
    
    analisi["generated_at"] = datetime.now(timezone.utc).isoformat()
    analisi["user_id"] = user_id
    analisi["stato"] = "bozza_analisi"
    analisi["versione_prompt"] = "2.0_21_sezioni"
    analisi["openclaw_used"] = use_openclaw and MASTER_PROMPT_AVAILABLE
    
    if research_data:
        analisi["research_metadata"] = {
            "data_quality": research_data.get("data_quality"),
            "timestamp": research_data.get("timestamp"),
            "errors": research_data.get("errors", [])
        }
    
    if completezza_report:
        analisi["completezza_questionario"] = completezza_report
    
    return analisi

@router.post("/genera-analisi-auto/{user_id}")
async def genera_analisi_auto(user_id: str, use_21_sezioni: bool = True, use_openclaw: bool = True):
    """
    Genera automaticamente l'analisi dopo il questionario.
    Chiamato internamente dal sistema quando il cliente invia il questionario.
    
    Args:
        user_id: ID del cliente
        use_21_sezioni: Se True, usa il nuovo Master Prompt con 21 sezioni (default: True)
        use_openclaw: Se True, attiva Deep Research con OpenClaw (default: True)
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    # Recupera utente
    user = await db.users.find_one({"id": user_id, "user_type": "cliente_analisi"}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # Recupera questionario
    questionario = await db.questionari_analisi.find_one({"user_id": user_id}, {"_id": 0})
    if not questionario:
        # Fallback: usa i dati dall'utente
        questionario = user
    
    # Aggiungi nome/cognome al questionario per la generazione
    questionario["nome"] = user.get("nome", "")
    questionario["cognome"] = user.get("cognome", "")
    
    # Genera analisi (usa nuovo Master Prompt 21 sezioni se disponibile)
    if use_21_sezioni and MASTER_PROMPT_AVAILABLE:
        logging.info(f"[FLUSSO] Usando Master Prompt 21 sezioni per {user_id}")
        analisi = await genera_analisi_21_sezioni(user_id, questionario, use_openclaw=use_openclaw)
    else:
        logging.info(f"[FLUSSO] Usando generazione legacy per {user_id}")
        analisi = await genera_analisi_automatica(user_id, questionario)
    
    # Salva analisi nel database
    await db.analisi_strategiche.update_one(
        {"user_id": user_id},
        {"$set": analisi},
        upsert=True
    )
    
    # Aggiorna stato utente
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "stato_cliente": "bozza_analisi",
            "analisi_generata": True,
            "analisi_generata_at": datetime.now(timezone.utc).isoformat(),
            "analisi_versione": analisi.get("versione_prompt", "1.0")
        }}
    )
    
    # Notifica Telegram
    try:
        import httpx
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            nome = user.get("nome", "")
            cognome = user.get("cognome", "")
            versione = "21 sezioni" if analisi.get("versione_prompt") == "2.0_21_sezioni" else "standard"
            openclaw_status = "✅" if analisi.get("openclaw_used") else "❌"
            msg = f"📊 ANALISI AUTO-GENERATA\n\n👤 {nome} {cognome}\n📋 Versione: {versione}\n🦞 OpenClaw: {openclaw_status}\n\n⏳ In attesa di revisione admin"
            async with httpx.AsyncClient() as client_http:
                await client_http.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": msg}
                )
    except Exception as e:
        logging.warning(f"Telegram notification failed: {e}")
    
    return {
        "success": True,
        "stato": "bozza_analisi",
        "message": "Analisi generata automaticamente"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Get analisi per admin
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/analisi/{user_id}")
async def get_analisi(user_id: str):
    """Recupera l'analisi di un cliente"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": user_id, "user_type": "cliente_analisi"}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    analisi = await db.analisi_strategiche.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "success": True,
        "user_id": user_id,
        "cliente": {
            "nome": user.get("nome"),
            "cognome": user.get("cognome"),
            "email": user.get("email")
        },
        "stato_cliente": user.get("stato_cliente", "questionario_inviato"),
        "analisi": analisi,
        "has_analisi": analisi is not None
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Modifica sezione analisi (Admin)
# ═══════════════════════════════════════════════════════════════════════════════

@router.put("/modifica-analisi")
async def modifica_analisi(request: ModificaAnalisiRequest):
    """Admin modifica una sezione dell'analisi"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    analisi = await db.analisi_strategiche.find_one({"user_id": request.user_id}, {"_id": 0})
    if not analisi:
        raise HTTPException(status_code=404, detail="Analisi non trovata")
    
    # Aggiorna la sezione
    sezioni = analisi.get("sezioni", {})
    if request.sezione in sezioni:
        if isinstance(sezioni[request.sezione], dict):
            sezioni[request.sezione]["contenuto"] = request.contenuto
        else:
            sezioni[request.sezione] = request.contenuto
    else:
        raise HTTPException(status_code=400, detail=f"Sezione '{request.sezione}' non trovata")
    
    await db.analisi_strategiche.update_one(
        {"user_id": request.user_id},
        {"$set": {
            "sezioni": sezioni,
            "last_modified_at": datetime.now(timezone.utc).isoformat(),
            "modified_by": "admin"
        }}
    )
    
    return {
        "success": True,
        "message": f"Sezione '{request.sezione}' aggiornata"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Valida analisi e invia Spoiler Strategico (Admin)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/valida-analisi/{user_id}")
async def valida_analisi(user_id: str, invia_spoiler: bool = True):
    """
    Admin valida l'analisi e opzionalmente invia lo Spoiler Strategico.
    
    Questo endpoint:
    1. Cambia lo stato da 'bozza_analisi' a 'analisi_validata'
    2. Invia lo Spoiler Strategico al cliente (se telegram_chat_id presente)
    3. Sblocca il calendario per la prenotazione call
    
    Fa parte del PROTOCOLLO 2: CONVERSIONE di EPOS.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    # Recupera utente e analisi
    user = await db.users.find_one({"id": user_id, "user_type": "cliente_analisi"}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    analisi = await db.analisi_strategiche.find_one({"user_id": user_id}, {"_id": 0})
    if not analisi:
        raise HTTPException(status_code=404, detail="Analisi non trovata")
    
    # Aggiorna stato
    await db.analisi_strategiche.update_one(
        {"user_id": user_id},
        {"$set": {
            "stato": "analisi_validata",
            "validata_at": datetime.now(timezone.utc).isoformat(),
            "validata_by": "admin"
        }}
    )
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "stato_cliente": "analisi_validata",
            "calendario_sbloccato": True
        }}
    )
    
    result = {
        "success": True,
        "user_id": user_id,
        "stato": "analisi_validata",
        "spoiler_inviato": False,
        "calendario_sbloccato": True
    }
    
    # Invia Spoiler Strategico
    if invia_spoiler:
        telegram_chat_id = user.get("telegram_chat_id")
        
        if telegram_chat_id:
            try:
                from stefania_ai_onboarding import telegram_notify
                
                spoiler_result = await telegram_notify(
                    "spoiler_strategico",
                    chat_id=telegram_chat_id,
                    analisi=analisi
                )
                
                result["spoiler_inviato"] = spoiler_result.get("ok", False)
                if not spoiler_result.get("ok"):
                    result["spoiler_error"] = spoiler_result.get("error")
                    
            except Exception as e:
                logging.error(f"Errore invio spoiler: {e}")
                result["spoiler_error"] = str(e)
        else:
            result["spoiler_note"] = "Telegram chat_id non disponibile per questo cliente"
            
            # Invia comunque notifica all'admin
            try:
                from stefania_ai_onboarding import telegram_notify
                nome = f"{user.get('nome', '')} {user.get('cognome', '')}"
                await telegram_notify(
                    "alert",
                    alert_type="success",
                    message=f"Analisi validata per {nome}. Spoiler non inviato (no Telegram chat_id)."
                )
            except:
                pass
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Conferma analisi (Admin) - pronta per call
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/conferma-analisi")
async def conferma_analisi(request: ConfermaAnalisiRequest):
    """Admin conferma l'analisi come pronta per la call"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    analisi = await db.analisi_strategiche.find_one({"user_id": request.user_id}, {"_id": 0})
    if not analisi:
        raise HTTPException(status_code=404, detail="Analisi non trovata")
    
    # Aggiorna stato
    await db.analisi_strategiche.update_one(
        {"user_id": request.user_id},
        {"$set": {
            "stato": "analisi_pronta_per_call",
            "confermata_at": datetime.now(timezone.utc).isoformat(),
            "confermata_da": "admin"
        }}
    )
    
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {
            "stato_cliente": "analisi_pronta_per_call",
            "analisi_confermata": True,
            "analisi_confermata_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "stato": "analisi_pronta_per_call",
        "message": "Analisi confermata e pronta per la call strategica"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Attiva fase decisione (Admin) - dopo la call
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/attiva-decisione")
async def attiva_decisione(request: AttivaDecisioneRequest):
    """Admin attiva la fase decisione dopo la call strategica"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # Aggiorna stato
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {
            "stato_cliente": "decisione_partnership",
            "fase_decisione_attiva": True,
            "fase_decisione_attivata_at": datetime.now(timezone.utc).isoformat(),
            "call_completata": True
        }}
    )
    
    await db.analisi_strategiche.update_one(
        {"user_id": request.user_id},
        {"$set": {
            "stato": "decisione_partnership",
            "visibile_cliente": True
        }}
    )
    
    # Notifica email tramite Systeme.io
    try:
        import httpx
        api_key = os.environ.get("SYSTEME_MCP_WRITE_KEY", "")
        if api_key and user.get("email"):
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    "https://api.systeme.io/api/contacts/tags",
                    headers={"X-API-Key": api_key, "Content-Type": "application/json"},
                    json={"email": user.get("email"), "tags": ["fase_decisione_attiva"]}
                )
    except Exception as e:
        logging.warning(f"Systeme.io tag failed: {e}")
    
    return {
        "success": True,
        "stato": "decisione_partnership",
        "message": "Fase decisione attivata. Il cliente può ora vedere l'analisi e procedere con la partnership."
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Get dati pagina decisione (Cliente)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/decisione/{user_id}")
async def get_decisione_data(user_id: str):
    """Recupera tutti i dati per la pagina decisione partnership"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # Verifica che sia in fase decisione
    if user.get("stato_cliente") != "decisione_partnership":
        raise HTTPException(status_code=403, detail="Fase decisione non ancora attivata")
    
    # Recupera analisi
    analisi = await db.analisi_strategiche.find_one({"user_id": user_id}, {"_id": 0})
    
    # Recupera contratto firmato (se esiste)
    contratto = await db.contratti_partnership.find_one({"user_id": user_id}, {"_id": 0})
    
    # Recupera documenti caricati
    documenti = await db.documenti_cliente.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    # Recupera stato pagamento
    pagamento = await db.pagamenti_partnership.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "success": True,
        "cliente": {
            "id": user.get("id"),
            "nome": user.get("nome"),
            "cognome": user.get("cognome"),
            "email": user.get("email")
        },
        "stato_cliente": user.get("stato_cliente"),
        "analisi": analisi,
        "contratto": contratto,
        "contratto_firmato": contratto.get("firmato", False) if contratto else False,
        "documenti": documenti,
        "pagamento": pagamento,
        "pagamento_completato": pagamento.get("completato", False) if pagamento else False,
        "prezzo_partnership": 2790,
        "can_activate": (
            contratto and contratto.get("firmato", False) and
            pagamento and pagamento.get("completato", False)
        )
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Firma contratto (Cliente)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/firma-contratto")
async def firma_contratto(request: FirmaContrattoRequest):
    """Cliente accetta e firma il contratto di partnership"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    if not request.accettato:
        raise HTTPException(status_code=400, detail="Devi accettare i termini per procedere")
    
    contratto_data = {
        "user_id": request.user_id,
        "cliente_nome": f"{user.get('nome', '')} {user.get('cognome', '')}",
        "cliente_email": user.get("email"),
        "firmato": True,
        "data_firma": datetime.now(timezone.utc).isoformat(),
        "ip_firma": request.ip_address,
        "tipo_firma": "checkbox_accettazione",
        "testo_accettazione": "Accetto i termini e le condizioni del contratto di partnership Evolution PRO"
    }
    
    await db.contratti_partnership.update_one(
        {"user_id": request.user_id},
        {"$set": contratto_data},
        upsert=True
    )
    
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {
            "contratto_firmato": True,
            "contratto_firmato_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Contratto firmato con successo"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Upload documento (Cliente)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/upload-documento/{user_id}")
async def upload_documento(
    user_id: str,
    tipo_documento: str = Form(...),
    file: UploadFile = File(...)
):
    """Cliente carica un documento (CI, CF, P.IVA)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    tipi_validi = ["carta_identita", "codice_fiscale", "partita_iva", "ricevuta_bonifico", "altro"]
    if tipo_documento not in tipi_validi:
        raise HTTPException(status_code=400, detail=f"Tipo documento non valido. Validi: {tipi_validi}")
    
    # Leggi il file
    contents = await file.read()
    
    # Salva in MongoDB come base64 (per semplicità) o usa un servizio di storage
    import base64
    file_base64 = base64.b64encode(contents).decode('utf-8')
    
    doc_data = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "tipo": tipo_documento,
        "nome_file": file.filename,
        "content_type": file.content_type,
        "size": len(contents),
        "data_base64": file_base64,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Salva o aggiorna documento dello stesso tipo
    await db.documenti_cliente.update_one(
        {"user_id": user_id, "tipo": tipo_documento},
        {"$set": doc_data},
        upsert=True
    )
    
    return {
        "success": True,
        "documento_id": doc_data["id"],
        "message": f"Documento '{tipo_documento}' caricato con successo"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Crea sessione Stripe per pagamento partnership
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/create-payment-session/{user_id}")
async def create_payment_session(user_id: str):
    """Crea sessione Stripe per pagamento partnership €2.790"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    import stripe
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe non configurato")
    
    frontend_url = os.environ.get("FRONTEND_URL", "https://evoluzione-pro.preview.emergentagent.com")
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {
                        "name": "Partnership Evolution PRO",
                        "description": "Programma completo per la creazione della tua Accademia Digitale"
                    },
                    "unit_amount": 279000  # €2.790 in centesimi
                },
                "quantity": 1
            }],
            mode="payment",
            success_url=f"{frontend_url}/partnership-success?session_id={{CHECKOUT_SESSION_ID}}&user_id={user_id}",
            cancel_url=f"{frontend_url}/decisione-partnership?cancelled=true",
            customer_email=user.get("email"),
            metadata={
                "user_id": user_id,
                "tipo": "partnership_evolution_pro"
            }
        )
        
        # Salva riferimento sessione
        await db.pagamenti_partnership.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "stripe_session_id": session.id,
                "importo": 2790,
                "valuta": "EUR",
                "metodo": "stripe",
                "stato": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.id
        }
        
    except Exception as e:
        logging.error(f"Stripe session creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Errore creazione pagamento: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Conferma pagamento bonifico (Admin)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/conferma-bonifico/{user_id}")
async def conferma_bonifico(user_id: str):
    """Admin conferma ricezione bonifico"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    await db.pagamenti_partnership.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "importo": 2790,
            "valuta": "EUR",
            "metodo": "bonifico",
            "stato": "completato",
            "completato": True,
            "confermato_da": "admin",
            "confermato_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Pagamento bonifico confermato"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Attiva partnership (dopo pagamento)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/attiva-partnership/{user_id}")
async def attiva_partnership(user_id: str, background_tasks: BackgroundTasks):
    """
    Attiva la partnership dopo pagamento completato.
    
    Flow:
    1. Verifica contratto firmato e pagamento completato
    2. Crea sub-account Systeme.io (password gestita da Systeme)
    3. Aggiorna profilo partner con systeme_account_id
    4. Invia email partnership_welcome
    5. Notifica Telegram
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # Verifica contratto
    contratto = await db.contratti_partnership.find_one({"user_id": user_id, "firmato": True})
    if not contratto:
        raise HTTPException(status_code=400, detail="Contratto non firmato")
    
    # Verifica pagamento
    pagamento = await db.pagamenti_partnership.find_one({"user_id": user_id, "completato": True})
    if not pagamento:
        raise HTTPException(status_code=400, detail="Pagamento non completato")
    
    nome = user.get("nome", "")
    cognome = user.get("cognome", "")
    email = user.get("email", "")
    
    # ═══════════════════════════════════════════════════════════════════
    # STEP 1: Crea sub-account Systeme.io
    # ═══════════════════════════════════════════════════════════════════
    systeme_result = {"success": False, "systeme_contact_id": None, "message": "Non configurato"}
    try:
        from systeme_mcp_client import create_partner_subaccount_async
        systeme_result = await create_partner_subaccount_async(email, nome, cognome)
        logging.info(f"[ATTIVA_PARTNERSHIP] Systeme.io result: {systeme_result}")
    except Exception as e:
        logging.error(f"[ATTIVA_PARTNERSHIP] Systeme.io error: {e}")
        systeme_result = {"success": False, "systeme_contact_id": None, "message": str(e)}
    
    # ═══════════════════════════════════════════════════════════════════
    # STEP 2: Attiva partnership nel database
    # ═══════════════════════════════════════════════════════════════════
    now = datetime.now(timezone.utc)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "stato_cliente": "partner_attivo",
            "user_type": "partner",
            "partnership_attiva": True,
            "partnership_attivata_at": now.isoformat(),
            "systeme_account_id": systeme_result.get("systeme_contact_id")
        }}
    )
    
    # Crea record partner
    partner_data = {
        "id": user_id,
        "user_id": user_id,
        "name": f"{nome} {cognome}",
        "email": email,
        "telefono": user.get("telefono"),
        "status": "ACTIVE",
        "phase": "F1",
        "created_at": now.isoformat(),
        "contratto_id": contratto.get("id"),
        "pagamento_id": pagamento.get("id"),
        "systeme_account_id": systeme_result.get("systeme_contact_id"),
        "systeme_setup_status": "completed" if systeme_result.get("success") else "manual_required"
    }
    
    await db.partners.update_one(
        {"id": user_id},
        {"$set": partner_data},
        upsert=True
    )
    
    # ═══════════════════════════════════════════════════════════════════
    # STEP 3: Invia email partnership_welcome
    # ═══════════════════════════════════════════════════════════════════
    background_tasks.add_task(
        send_partnership_welcome_email_task,
        user_id, email, nome, systeme_result
    )
    
    # ═══════════════════════════════════════════════════════════════════
    # STEP 4: Notifica Telegram
    # ═══════════════════════════════════════════════════════════════════
    try:
        import httpx
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            systeme_status = "✅ Sub-account creato" if systeme_result.get("success") else f"⚠️ Manuale richiesto: {systeme_result.get('message', 'errore')}"
            msg = f"""🎉 *NUOVO PARTNER ATTIVATO!*

👤 {nome} {cognome}
📧 {email}
💰 €2.790 Partnership

*Systeme.io:* {systeme_status}

✅ Email onboarding inviata
🚀 Pronto per fase F1"""
            async with httpx.AsyncClient() as client_http:
                await client_http.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": msg, "parse_mode": "Markdown"}
                )
    except Exception as e:
        logging.warning(f"Telegram notification failed: {e}")
    
    return {
        "success": True,
        "stato": "partner_attivo",
        "systeme_setup": systeme_result,
        "message": "Partnership attivata con successo! Benvenuto in Evolution PRO."
    }


async def send_partnership_welcome_email_task(user_id: str, email: str, nome: str, systeme_result: dict):
    """Background task: Invia email partnership_welcome"""
    try:
        from email_templates import get_email_template_manager
        from motor.motor_asyncio import AsyncIOMotorClient
        
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME', 'evolution_pro')
        client = AsyncIOMotorClient(mongo_url)
        db_local = client[db_name]
        
        try:
            template_manager = get_email_template_manager(db_local)
            
            # Prepara variabili
            template_vars = {
                "nome": nome,
                "email": email
            }
            
            # Se Systeme.io ha fallito, aggiungi nota manuale
            if not systeme_result.get("success"):
                template_vars["nota_manuale"] = f"⚠️ Nota: la creazione automatica del sub-account Systeme.io ha avuto un problema ({systeme_result.get('message')}). Il team ti contatterà per completare la configurazione manualmente."
            
            # Render template
            subject, body_html = await template_manager.render_template("partnership_welcome", template_vars)
            
            # Invia tramite Systeme.io tag (attiva automazione email)
            systeme_api_key = os.environ.get('SYSTEME_API_KEY')
            if systeme_api_key:
                from systeme_mcp_client import add_tag_to_contact
                add_tag_to_contact(email, "partnership_welcome")
                add_tag_to_contact(email, "partner_attivo")
            
            # Log email
            await db_local.email_logs.insert_one({
                "type": "partnership_welcome",
                "to": email,
                "user_id": user_id,
                "subject": subject,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "status": "sent_via_systeme",
                "systeme_result": systeme_result
            })
            
            logging.info(f"[ATTIVA_PARTNERSHIP] Email welcome inviata a {email}")
            
        finally:
            client.close()
            
    except Exception as e:
        logging.error(f"[ATTIVA_PARTNERSHIP] Email welcome error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: PDF Analisi per cliente
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/analisi-pdf/{user_id}")
async def download_analisi_pdf(user_id: str):
    """Genera e scarica PDF dell'analisi strategica"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # Verifica accesso
    stati_autorizzati = ["decisione_partnership", "partner_attivo"]
    if user.get("stato_cliente") not in stati_autorizzati:
        raise HTTPException(status_code=403, detail="Analisi non ancora disponibile")
    
    analisi = await db.analisi_strategiche.find_one({"user_id": user_id}, {"_id": 0})
    if not analisi:
        raise HTTPException(status_code=404, detail="Analisi non trovata")
    
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=50, bottomMargin=50)
        elements = []
        styles = getSampleStyleSheet()
        
        # Stili
        title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=24, alignment=TA_CENTER, spaceAfter=30)
        section_title = ParagraphStyle('SectionTitle', parent=styles['Heading1'], fontSize=14, textColor=colors.HexColor('#F2C418'), spaceAfter=12)
        body = ParagraphStyle('Body', parent=styles['Normal'], fontSize=11, leading=16, alignment=TA_JUSTIFY, spaceAfter=10)
        
        # Titolo
        elements.append(Spacer(1, 50))
        elements.append(Paragraph(analisi.get("titolo", "Analisi Strategica"), title_style))
        elements.append(Paragraph(f"Data: {analisi.get('data_generazione', '')}", styles['Normal']))
        elements.append(Spacer(1, 30))
        elements.append(PageBreak())
        
        # Sezioni
        sezioni = analisi.get("sezioni", {})
        for key, sezione in sezioni.items():
            if isinstance(sezione, dict):
                elements.append(Paragraph(sezione.get("titolo", key), section_title))
                elements.append(Paragraph(sezione.get("contenuto", ""), body))
                
                if sezione.get("lista"):
                    for item in sezione["lista"]:
                        elements.append(Paragraph(f"• {item}", body))
                
                if sezione.get("fasi"):
                    for fase in sezione["fasi"]:
                        elements.append(Paragraph(f"<b>{fase.get('fase')}</b> ({fase.get('durata')})", body))
                        elements.append(Paragraph(fase.get("descrizione", ""), body))
                
                if sezione.get("punteggio"):
                    elements.append(Paragraph(f"<b>Punteggio: {sezione['punteggio']}/10</b>", body))
                
                elements.append(Spacer(1, 15))
        
        doc.build(elements)
        buffer.seek(0)
        
        nome = user.get("nome", "cliente")
        cognome = user.get("cognome", "")
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=analisi-strategica-{nome}-{cognome}.pdf"
            }
        )
        
    except Exception as e:
        logging.error(f"PDF generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione PDF: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: PDF Contratto
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/contratto-pdf/{user_id}")
async def download_contratto_pdf(user_id: str):
    """Genera e scarica PDF del contratto di partnership"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=50, bottomMargin=50)
        elements = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=20, alignment=TA_CENTER, spaceAfter=30)
        section_title = ParagraphStyle('SectionTitle', parent=styles['Heading2'], fontSize=12, spaceAfter=10)
        body = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, alignment=TA_JUSTIFY, spaceAfter=8)
        
        nome = user.get("nome", "")
        cognome = user.get("cognome", "")
        email = user.get("email", "")
        
        elements.append(Paragraph("CONTRATTO DI PARTNERSHIP", title_style))
        elements.append(Paragraph("Evolution PRO", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        elements.append(Paragraph("PARTI CONTRAENTI", section_title))
        elements.append(Paragraph(f"Il presente contratto è stipulato tra Evolution PRO (di seguito 'Evolution PRO') e {nome} {cognome} (di seguito 'Partner'), email: {email}.", body))
        elements.append(Spacer(1, 15))
        
        elements.append(Paragraph("1. OGGETTO DEL CONTRATTO", section_title))
        elements.append(Paragraph("Evolution PRO si impegna a fornire al Partner un programma completo di affiancamento per la creazione di un'Accademia Digitale, che include: posizionamento strategico, creazione di una masterclass, sviluppo di un videocorso, costruzione di un funnel di vendita automatizzato, e supporto al lancio.", body))
        elements.append(Spacer(1, 15))
        
        elements.append(Paragraph("2. DURATA", section_title))
        elements.append(Paragraph("Il programma ha una durata di 12 mesi dalla data di attivazione. Al termine, il Partner manterrà l'accesso ai materiali creati.", body))
        elements.append(Spacer(1, 15))
        
        elements.append(Paragraph("3. CORRISPETTIVO", section_title))
        elements.append(Paragraph("Il Partner si impegna a corrispondere a Evolution PRO l'importo di €2.790 (duemilasettecentonovanta euro) come quota di partecipazione al programma.", body))
        elements.append(Spacer(1, 15))
        
        elements.append(Paragraph("4. OBBLIGHI DI EVOLUTION PRO", section_title))
        elements.append(Paragraph("Evolution PRO si impegna a fornire: accesso alla piattaforma, supporto strategico, template e materiali, revisione dei contenuti, e assistenza tecnica per tutta la durata del programma.", body))
        elements.append(Spacer(1, 15))
        
        elements.append(Paragraph("5. OBBLIGHI DEL PARTNER", section_title))
        elements.append(Paragraph("Il Partner si impegna a: seguire il programma con diligenza, fornire i materiali richiesti entro i tempi concordati, partecipare alle call di allineamento, e rispettare le indicazioni strategiche.", body))
        elements.append(Spacer(1, 15))
        
        elements.append(Paragraph("6. PROPRIETÀ INTELLETTUALE", section_title))
        elements.append(Paragraph("Tutti i contenuti creati dal Partner durante il programma rimangono di sua esclusiva proprietà. I template, framework e metodologie Evolution PRO rimangono proprietà di Evolution PRO.", body))
        elements.append(Spacer(1, 15))
        
        elements.append(Paragraph("7. GARANZIA", section_title))
        elements.append(Paragraph("Evolution PRO garantisce il proprio impegno nel supportare il Partner. I risultati economici dipendono dall'impegno del Partner e dalle condizioni di mercato.", body))
        elements.append(Spacer(1, 15))
        
        elements.append(Paragraph("8. FORO COMPETENTE", section_title))
        elements.append(Paragraph("Per qualsiasi controversia sarà competente il Foro di Milano.", body))
        elements.append(Spacer(1, 30))
        
        elements.append(Paragraph(f"Data: {datetime.now().strftime('%d/%m/%Y')}", body))
        
        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=contratto-partnership-evolution-pro.pdf"
            }
        )
        
    except Exception as e:
        logging.error(f"PDF generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione PDF: {str(e)}")
