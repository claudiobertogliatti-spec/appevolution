"""
Analisi Consulenziale Router
Gestisce il nuovo flusso consulenziale:
1. Analisi Preliminare (interna)
2. Script Call (8 blocchi)
3. Analisi Finale (post-call)
4. Revisione Admin + Invio al cliente

Stati:
- questionario_ricevuto
- analisi_preliminare_generata  
- analisi_finale_da_revisionare
- analisi_consegnata
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timezone
import os
import json
import logging
import io

router = APIRouter(prefix="/api/analisi-consulenziale", tags=["analisi-consulenziale"])

# Database reference
db = None

def set_db(database):
    global db
    db = database

# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class GeneraPreliminareRequest(BaseModel):
    user_id: str

class GeneraScriptCallRequest(BaseModel):
    user_id: str

class GeneraFinaleRequest(BaseModel):
    user_id: str
    note_call: Optional[str] = None

class ModificaFinaleRequest(BaseModel):
    user_id: str
    sezione: str
    contenuto: str

class ApprovaInviaRequest(BaseModel):
    user_id: str

# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def get_cliente_or_404(user_id: str):
    """Recupera cliente analisi o errore 404"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    
    cliente = await db.users.find_one(
        {"id": user_id, "user_type": "cliente_analisi"},
        {"_id": 0}
    )
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente analisi non trovato")
    return cliente

async def get_questionario(user_id: str):
    """Recupera il questionario compilato"""
    # Prima cerca in questionari_analisi
    questionario = await db.questionari_analisi.find_one(
        {"user_id": user_id}, {"_id": 0}
    )
    if questionario:
        return questionario
    
    # Fallback: questionari_clienti
    questionario = await db.questionari_clienti.find_one(
        {"user_id": user_id}, {"_id": 0}
    )
    return questionario

async def get_llm_chat():
    """Inizializza LLM con Emergent Key"""
    from emergentintegrations.llm.chat import LlmChat
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM Key non configurata")
    
    session_id = f"analisi_{datetime.now().timestamp()}"
    
    return LlmChat(
        api_key=api_key, 
        session_id=session_id,
        system_message="Sei un consulente senior di Evolution PRO, esperto in digital business e creazione di accademie online."
    ).with_model("anthropic", "claude-sonnet-4-20250514")

async def aggiungi_tag_systeme(email: str, tag: str):
    """Aggiunge tag Systeme.io per email automatiche"""
    try:
        import httpx
        api_key = os.environ.get("SYSTEME_MCP_WRITE_KEY", "")
        if not api_key:
            logging.warning("[SYSTEME] API key non configurata")
            return False
        
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.systeme.io/api/contacts/tags",
                headers={"X-API-Key": api_key, "Content-Type": "application/json"},
                json={"email": email, "tags": [tag]}
            )
        logging.info(f"[SYSTEME] Tag '{tag}' → {email}: {resp.status_code}")
        return resp.status_code in (200, 201)
    except Exception as e:
        logging.warning(f"[SYSTEME] Errore: {e}")
        return False

# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1: GENERA ANALISI PRELIMINARE (INTERNA)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/genera-preliminare")
async def genera_analisi_preliminare(request: GeneraPreliminareRequest):
    """
    Genera l'analisi preliminare interna (non visibile al cliente).
    Usata per preparare la call strategica.
    """
    cliente = await get_cliente_or_404(request.user_id)
    questionario = await get_questionario(request.user_id)
    
    if not questionario:
        raise HTTPException(status_code=400, detail="Questionario non compilato")
    
    # Estrai dati
    nome = cliente.get("nome", "")
    cognome = cliente.get("cognome", "")
    expertise = questionario.get("expertise", questionario.get("expertise_area", "Non specificato"))
    cliente_target = questionario.get("cliente_target", questionario.get("cliente_ideale", "Non specificato"))
    risultato = questionario.get("risultato_promesso", questionario.get("risultato_concreto", "Non specificato"))
    pubblico = questionario.get("pubblico_esistente", "Non specificato")
    esperienze = questionario.get("esperienze_vendita", questionario.get("esperienze_passate", "Non specificato"))
    ostacolo = questionario.get("ostacolo_principale", "Non specificato")
    motivazione = questionario.get("motivazione", questionario.get("perche_adesso", "Non specificato"))
    
    prompt = f"""Sei un consulente senior di Evolution PRO. Analizza le risposte del questionario e genera un'ANALISI PRELIMINARE INTERNA per preparare la call strategica.

DATI DEL PROFESSIONISTA:
- Nome: {nome} {cognome}
- Expertise: {expertise}
- Cliente target: {cliente_target}
- Risultato promesso: {risultato}
- Pubblico esistente: {pubblico}
- Esperienze vendita: {esperienze}
- Ostacolo principale: {ostacolo}
- Motivazione: {motivazione}

Genera un'analisi preliminare in formato JSON con queste sezioni:

{{
    "profilo_sintetico": "Riassunto del professionista e del suo progetto (3-4 frasi)",
    "punti_forza": ["Lista di 3-4 punti di forza del progetto"],
    "criticita": ["Lista di 2-3 criticità o aree da approfondire"],
    "domande_call": ["5 domande specifiche da fare durante la call per approfondire"],
    "potenziale_accademia": "Valutazione del potenziale per un'Accademia Digitale (2-3 frasi)",
    "note_preparazione": "Note interne per Claudio sulla preparazione della call (2-3 frasi)",
    "livello_priorita": "alta/media/bassa - basato sul potenziale del progetto"
}}

Rispondi SOLO con il JSON valido."""

    try:
        llm = await get_llm_chat()
        from emergentintegrations.llm.chat import UserMessage
        
        response = await llm.chat([UserMessage(text=prompt)])
        response_text = response.text.strip()
        
        # Parse JSON
        import re
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            analisi_preliminare = json.loads(json_match.group())
        else:
            raise ValueError("JSON non trovato")
            
    except Exception as e:
        logging.error(f"Errore generazione preliminare: {e}")
        analisi_preliminare = {
            "profilo_sintetico": f"{nome} {cognome} opera nel campo '{expertise}' aiutando '{cliente_target}'. Progetto da approfondire in call.",
            "punti_forza": ["Competenza definita", "Target identificato", "Motivazione presente"],
            "criticita": ["Verificare esperienza vendita", "Approfondire posizionamento"],
            "domande_call": [
                "Raccontami di più sulla tua esperienza nel settore",
                "Chi sono i tuoi clienti ideali?",
                "Hai già venduto consulenze o corsi?",
                "Qual è il tuo obiettivo principale?",
                "Perché hai deciso di contattarci proprio adesso?"
            ],
            "potenziale_accademia": "Da valutare durante la call strategica.",
            "note_preparazione": "Approfondire posizionamento e validazione mercato.",
            "livello_priorita": "media"
        }
    
    analisi_preliminare["generated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Salva nel database
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {
            "analisi_preliminare": analisi_preliminare,
            "stato_analisi": "analisi_preliminare_generata",
            "analisi_preliminare_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "analisi_preliminare": analisi_preliminare,
        "stato": "analisi_preliminare_generata"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2: GENERA SCRIPT CALL (8 BLOCCHI)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/genera-script-call")
async def genera_script_call(request: GeneraScriptCallRequest):
    """
    Genera lo script della call strategica in 8 blocchi.
    Personalizzato per il cliente specifico.
    """
    cliente = await get_cliente_or_404(request.user_id)
    questionario = await get_questionario(request.user_id)
    
    if not questionario:
        raise HTTPException(status_code=400, detail="Questionario non compilato")
    
    # Recupera analisi preliminare se esiste
    analisi_preliminare = cliente.get("analisi_preliminare", {})
    
    # Dati cliente
    nome = cliente.get("nome", "")
    cognome = cliente.get("cognome", "")
    expertise = questionario.get("expertise", questionario.get("expertise_area", "Non specificato"))
    cliente_target = questionario.get("cliente_target", questionario.get("cliente_ideale", "Non specificato"))
    risultato = questionario.get("risultato_promesso", questionario.get("risultato_concreto", "Non specificato"))
    pubblico = questionario.get("pubblico_esistente", "Non specificato")
    esperienze = questionario.get("esperienze_vendita", questionario.get("esperienze_passate", "Non specificato"))
    ostacolo = questionario.get("ostacolo_principale", "Non specificato")
    motivazione = questionario.get("motivazione", questionario.get("perche_adesso", "Non specificato"))
    
    prompt = f"""Sei un esperto di vendita consulenziale per Evolution PRO. Genera uno SCRIPT CALL STRATEGICA personalizzato per questo cliente.

DATI DEL CLIENTE:
- Nome: {nome} {cognome}
- Expertise: {expertise}
- Target: {cliente_target}
- Risultato promesso: {risultato}
- Pubblico esistente: {pubblico}
- Esperienze vendita: {esperienze}
- Ostacolo principale: {ostacolo}
- Motivazione: {motivazione}

ANALISI PRELIMINARE:
{json.dumps(analisi_preliminare, ensure_ascii=False, indent=2) if analisi_preliminare else "Non ancora generata"}

Genera uno script di call in 8 BLOCCHI in formato JSON:

{{
    "titolo_script": "Script Call Strategica - {nome} {cognome}",
    "durata_stimata": "45-60 minuti",
    "blocchi": [
        {{
            "numero": 1,
            "titolo": "Apertura della Call",
            "obiettivo": "Creare connessione e fiducia",
            "contenuto": "Testo dettagliato di cosa dire all'apertura...",
            "note_claudio": "Suggerimenti specifici per Claudio"
        }},
        {{
            "numero": 2,
            "titolo": "Comprendere il Cliente",
            "obiettivo": "Approfondire situazione e obiettivi",
            "domande": ["Domanda 1 specifica", "Domanda 2 specifica", "Domanda 3 specifica"],
            "note_claudio": "Cosa ascoltare nelle risposte"
        }},
        {{
            "numero": 3,
            "titolo": "Analisi del Problema",
            "obiettivo": "Evidenziare il problema del mercato del cliente",
            "contenuto": "Come presentare il problema...",
            "punti_chiave": ["Punto 1", "Punto 2"]
        }},
        {{
            "numero": 4,
            "titolo": "Valutazione della Competenza",
            "obiettivo": "Verificare esperienza, metodo, risultati",
            "domande": ["Domanda sulla competenza 1", "Domanda 2", "Domanda 3"],
            "segnali_positivi": ["Cosa cercare di positivo"],
            "red_flags": ["Cosa potrebbe essere un problema"]
        }},
        {{
            "numero": 5,
            "titolo": "Presentazione del Modello Accademia",
            "obiettivo": "Spiegare il possibile modello di accademia",
            "contenuto": "Come presentare il modello specifico per questo cliente...",
            "elementi_personalizzati": ["Elemento 1 per questo cliente", "Elemento 2"]
        }},
        {{
            "numero": 6,
            "titolo": "Verifica Fattibilità",
            "obiettivo": "Valutare se il progetto può diventare un'accademia sostenibile",
            "criteri_valutazione": ["Criterio 1", "Criterio 2", "Criterio 3"],
            "contenuto": "Come comunicare la valutazione..."
        }},
        {{
            "numero": 7,
            "titolo": "Introduzione della Partnership",
            "obiettivo": "Spiegare il modello Evolution PRO",
            "contenuto": "Come presentare la partnership...",
            "punti_vendita": ["Creazione accademia", "Costruzione funnel", "Supporto strategico"]
        }},
        {{
            "numero": 8,
            "titolo": "Chiusura e Prossimi Passi",
            "obiettivo": "Definire i next steps",
            "scenario_positivo": "Se il progetto è adatto: cosa dire e proporre",
            "scenario_negativo": "Se il progetto non è pronto: come comunicarlo con rispetto",
            "call_to_action": "Invito specifico all'azione"
        }}
    ]
}}

Lo script deve essere SPECIFICO per questo cliente, non generico. Personalizza ogni sezione basandoti sui dati del questionario.
Rispondi SOLO con il JSON valido."""

    try:
        llm = await get_llm_chat()
        from emergentintegrations.llm.chat import UserMessage
        
        response = await llm.chat([UserMessage(text=prompt)])
        response_text = response.text.strip()
        
        # Parse JSON
        import re
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            script_call = json.loads(json_match.group())
        else:
            raise ValueError("JSON non trovato")
            
    except Exception as e:
        logging.error(f"Errore generazione script call: {e}")
        # Fallback con script generico ma strutturato
        script_call = genera_script_fallback(nome, cognome, expertise, cliente_target)
    
    script_call["generated_at"] = datetime.now(timezone.utc).isoformat()
    script_call["cliente_id"] = request.user_id
    
    # Salva nel database
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {
            "script_call": script_call,
            "script_call_generato": True,
            "script_call_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "script_call": script_call
    }


def genera_script_fallback(nome, cognome, expertise, cliente_target):
    """Genera uno script di fallback se l'AI fallisce"""
    return {
        "titolo_script": f"Script Call Strategica - {nome} {cognome}",
        "durata_stimata": "45-60 minuti",
        "blocchi": [
            {
                "numero": 1,
                "titolo": "Apertura della Call",
                "obiettivo": "Creare connessione e fiducia",
                "contenuto": f"Ciao {nome}, grazie per essere qui. Sono Claudio di Evolution PRO. L'obiettivo di questa call è capire insieme se il tuo progetto può trasformarsi in un'Accademia Digitale di successo. Ti racconterò brevemente cosa facciamo e poi ti farò alcune domande per conoscerti meglio.",
                "note_claudio": "Sorridi, crea un'atmosfera rilassata"
            },
            {
                "numero": 2,
                "titolo": "Comprendere il Cliente",
                "obiettivo": "Approfondire situazione e obiettivi",
                "domande": [
                    f"Raccontami di più sulla tua esperienza in {expertise}",
                    "Qual è la situazione attuale del tuo business?",
                    "Cosa ti ha spinto a cercare Evolution PRO?"
                ],
                "note_claudio": "Ascolta attentamente, prendi appunti"
            },
            {
                "numero": 3,
                "titolo": "Analisi del Problema",
                "obiettivo": "Evidenziare il problema del mercato",
                "contenuto": f"Dai tuoi dati vedo che il tuo target sono {cliente_target}. Quali sono le principali difficoltà che affrontano?",
                "punti_chiave": ["Difficoltà del target", "Opportunità di mercato"]
            },
            {
                "numero": 4,
                "titolo": "Valutazione della Competenza",
                "obiettivo": "Verificare esperienza e metodo",
                "domande": [
                    "Hai un metodo o framework specifico che usi?",
                    "Quali risultati hai ottenuto con i tuoi clienti?",
                    "Hai mai venduto consulenze o corsi online?"
                ],
                "segnali_positivi": ["Metodo chiaro", "Risultati documentati"],
                "red_flags": ["Poca esperienza", "Target troppo generico"]
            },
            {
                "numero": 5,
                "titolo": "Presentazione del Modello Accademia",
                "obiettivo": "Spiegare il possibile modello",
                "contenuto": f"Basandomi su quello che mi hai detto, potremmo creare un'Accademia Digitale che insegna a {cliente_target} come ottenere risultati usando il tuo metodo.",
                "elementi_personalizzati": ["Videocorso strutturato", "Masterclass di vendita", "Community"]
            },
            {
                "numero": 6,
                "titolo": "Verifica Fattibilità",
                "obiettivo": "Valutare sostenibilità del progetto",
                "criteri_valutazione": ["Chiarezza competenza", "Definizione target", "Esperienza vendita"],
                "contenuto": "Valutiamo insieme se ci sono le condizioni per procedere."
            },
            {
                "numero": 7,
                "titolo": "Introduzione della Partnership",
                "obiettivo": "Spiegare Evolution PRO",
                "contenuto": "Evolution PRO è un programma che ti accompagna dalla creazione dei contenuti alla costruzione del funnel di vendita, con supporto strategico continuo.",
                "punti_vendita": ["Creazione accademia completa", "Funnel automatizzato", "Supporto 12 mesi"]
            },
            {
                "numero": 8,
                "titolo": "Chiusura e Prossimi Passi",
                "obiettivo": "Definire next steps",
                "scenario_positivo": "Se il progetto è valido: invito a leggere l'analisi finale e procedere con l'attivazione partnership.",
                "scenario_negativo": "Se servono miglioramenti: suggerisci cosa lavorare prima di ripresentarsi.",
                "call_to_action": "Ti invio l'Analisi Strategica completa via email."
            }
        ]
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 3: GENERA ANALISI FINALE (POST-CALL)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/genera-finale")
async def genera_analisi_finale(request: GeneraFinaleRequest):
    """
    Genera l'analisi finale dopo la call strategica.
    Documento consulenziale professionale da inviare al cliente.
    """
    cliente = await get_cliente_or_404(request.user_id)
    questionario = await get_questionario(request.user_id)
    
    if not questionario:
        raise HTTPException(status_code=400, detail="Questionario non compilato")
    
    # Recupera dati precedenti
    analisi_preliminare = cliente.get("analisi_preliminare", {})
    
    # Dati cliente
    nome = cliente.get("nome", "")
    cognome = cliente.get("cognome", "")
    email = cliente.get("email", "")
    expertise = questionario.get("expertise", questionario.get("expertise_area", "Non specificato"))
    cliente_target = questionario.get("cliente_target", questionario.get("cliente_ideale", "Non specificato"))
    risultato = questionario.get("risultato_promesso", questionario.get("risultato_concreto", "Non specificato"))
    pubblico = questionario.get("pubblico_esistente", "Non specificato")
    esperienze = questionario.get("esperienze_vendita", questionario.get("esperienze_passate", "Non specificato"))
    ostacolo = questionario.get("ostacolo_principale", "Non specificato")
    motivazione = questionario.get("motivazione", questionario.get("perche_adesso", "Non specificato"))
    
    note_call = request.note_call or ""
    
    prompt = f"""Sei un consulente senior di Evolution PRO. Genera un'ANALISI STRATEGICA FINALE professionale per il cliente.

Questo documento sarà inviato al cliente dopo la call strategica. Deve sembrare scritto da un consulente esperto, NON da un'AI.

DATI DEL CLIENTE:
- Nome: {nome} {cognome}
- Email: {email}
- Expertise: {expertise}
- Target: {cliente_target}
- Risultato promesso: {risultato}
- Pubblico esistente: {pubblico}
- Esperienze vendita: {esperienze}
- Ostacolo principale: {ostacolo}
- Motivazione: {motivazione}

ANALISI PRELIMINARE:
{json.dumps(analisi_preliminare, ensure_ascii=False, indent=2) if analisi_preliminare else "Non disponibile"}

NOTE DALLA CALL:
{note_call if note_call else "Nessuna nota aggiunta"}

Genera il documento finale in formato JSON con questa struttura:

{{
    "copertina": {{
        "titolo": "Analisi Strategica",
        "sottotitolo": "Un documento per te, {nome}",
        "data": "{datetime.now().strftime('%d %B %Y')}",
        "preparato_da": "Claudio Bertogliatti - Evolution PRO"
    }},
    "introduzione": "Paragrafo introduttivo personalizzato (3-4 frasi)...",
    "profilo_professionale": {{
        "titolo": "Il tuo profilo professionale",
        "contenuto": "Descrizione del profilo del professionista (4-5 frasi)..."
    }},
    "problema_mercato": {{
        "titolo": "Il problema che risolvi",
        "contenuto": "Analisi del problema di mercato e opportunità (4-5 frasi)..."
    }},
    "potenziale_mercato": {{
        "titolo": "Il potenziale del tuo mercato",
        "contenuto": "Valutazione del potenziale di mercato (4-5 frasi)..."
    }},
    "ipotesi_accademia": {{
        "titolo": "Ipotesi di Accademia Digitale",
        "contenuto": "Come potrebbe essere strutturata l'accademia (5-6 frasi)...",
        "elementi": ["Elemento 1", "Elemento 2", "Elemento 3"]
    }},
    "modello_business": {{
        "titolo": "Il modello di business proposto",
        "contenuto": "Descrizione del modello (4-5 frasi)...",
        "proiezione_revenue": "Stima conservativa del potenziale"
    }},
    "valutazione_progetto": {{
        "titolo": "Valutazione del progetto",
        "punteggio": 8,
        "motivazione": "Spiegazione del punteggio (3-4 frasi)...",
        "raccomandazione": "Una delle seguenti: 'Progetto pronto per la partnership' / 'Progetto con buon potenziale, necessita affinamento' / 'Progetto da sviluppare ulteriormente'"
    }},
    "prossimi_passi": {{
        "titolo": "I prossimi passi",
        "contenuto": "Cosa fare dopo questa analisi (3-4 frasi)...",
        "azioni": ["Azione 1", "Azione 2", "Azione 3"]
    }},
    "chiusura": "Paragrafo di chiusura motivazionale (2-3 frasi)..."
}}

IMPORTANTE: 
- Scrivi come un consulente umano esperto, NON come un'AI
- Evita frasi generiche o da template
- Personalizza ogni sezione basandoti sui dati specifici del cliente
- Il tono deve essere professionale ma caldo

Rispondi SOLO con il JSON valido."""

    try:
        llm = await get_llm_chat()
        from emergentintegrations.llm.chat import UserMessage
        
        response = await llm.chat([UserMessage(text=prompt)])
        response_text = response.text.strip()
        
        # Parse JSON
        import re
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            analisi_finale = json.loads(json_match.group())
        else:
            raise ValueError("JSON non trovato")
            
    except Exception as e:
        logging.error(f"Errore generazione analisi finale: {e}")
        analisi_finale = genera_analisi_finale_fallback(nome, cognome, expertise, cliente_target, risultato)
    
    analisi_finale["generated_at"] = datetime.now(timezone.utc).isoformat()
    analisi_finale["cliente_id"] = request.user_id
    analisi_finale["note_call"] = note_call
    
    # Salva nel database
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {
            "analisi_finale": analisi_finale,
            "stato_analisi": "analisi_finale_da_revisionare",
            "analisi_finale_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "analisi_finale": analisi_finale,
        "stato": "analisi_finale_da_revisionare"
    }


def genera_analisi_finale_fallback(nome, cognome, expertise, cliente_target, risultato):
    """Genera analisi finale di fallback"""
    return {
        "copertina": {
            "titolo": "Analisi Strategica",
            "sottotitolo": f"Un documento per te, {nome}",
            "data": datetime.now().strftime('%d %B %Y'),
            "preparato_da": "Claudio Bertogliatti - Evolution PRO"
        },
        "introduzione": f"Caro {nome}, grazie per il tempo dedicato durante la nostra call strategica. Questo documento raccoglie le mie osservazioni sul tuo progetto e le raccomandazioni per i prossimi passi.",
        "profilo_professionale": {
            "titolo": "Il tuo profilo professionale",
            "contenuto": f"Operi nel campo '{expertise}' con l'obiettivo di aiutare '{cliente_target}'. La tua esperienza rappresenta una base solida su cui costruire un'Accademia Digitale."
        },
        "problema_mercato": {
            "titolo": "Il problema che risolvi",
            "contenuto": f"Il tuo target, {cliente_target}, affronta sfide specifiche che la tua competenza può risolvere. Il risultato che prometti ('{risultato}') è concreto e misurabile."
        },
        "potenziale_mercato": {
            "titolo": "Il potenziale del tuo mercato",
            "contenuto": "Il mercato della formazione online in Italia continua a crescere. La tua nicchia presenta opportunità interessanti per chi sa posizionarsi correttamente."
        },
        "ipotesi_accademia": {
            "titolo": "Ipotesi di Accademia Digitale",
            "contenuto": f"Basandomi sulla nostra conversazione, immagino un'Accademia strutturata in moduli che guidano {cliente_target} verso il risultato desiderato.",
            "elementi": ["Videocorso strutturato", "Masterclass di vendita", "Community di supporto", "Risorse esclusive"]
        },
        "modello_business": {
            "titolo": "Il modello di business proposto",
            "contenuto": "Il modello prevede un videocorso premium venduto tramite funnel automatizzato, con possibilità di upsell su consulenze personalizzate.",
            "proiezione_revenue": "Con una strategia corretta, il primo anno può generare tra €20.000 e €50.000"
        },
        "valutazione_progetto": {
            "titolo": "Valutazione del progetto",
            "punteggio": 7,
            "motivazione": "Il progetto presenta buone fondamenta con margini di miglioramento nel posizionamento. I prossimi passi saranno cruciali per definire una strategia di lancio efficace.",
            "raccomandazione": "Progetto con buon potenziale, pronto per procedere con la partnership"
        },
        "prossimi_passi": {
            "titolo": "I prossimi passi",
            "contenuto": "Se deciderai di procedere con Evolution PRO, inizieremo definendo il posizionamento esatto e strutturando i contenuti del tuo videocorso.",
            "azioni": [
                "Leggere attentamente questa analisi",
                "Valutare la proposta di partnership",
                "Prenotare la call di attivazione"
            ]
        },
        "chiusura": f"È stato un piacere conoscerti, {nome}. Qualunque decisione prenderai, ti auguro il meglio per il tuo progetto. Se vuoi procedere con Evolution PRO, sono qui per accompagnarti in questo percorso."
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 4: MODIFICA ANALISI FINALE (ADMIN)
# ═══════════════════════════════════════════════════════════════════════════════

@router.put("/modifica-finale")
async def modifica_analisi_finale(request: ModificaFinaleRequest):
    """
    Permette all'admin di modificare una sezione dell'analisi finale prima dell'invio.
    """
    cliente = await get_cliente_or_404(request.user_id)
    
    analisi_finale = cliente.get("analisi_finale")
    if not analisi_finale:
        raise HTTPException(status_code=400, detail="Analisi finale non ancora generata")
    
    # Aggiorna la sezione specifica
    sezioni_valide = [
        "introduzione", "profilo_professionale", "problema_mercato", 
        "potenziale_mercato", "ipotesi_accademia", "modello_business",
        "valutazione_progetto", "prossimi_passi", "chiusura"
    ]
    
    if request.sezione not in sezioni_valide:
        raise HTTPException(status_code=400, detail=f"Sezione non valida. Valide: {sezioni_valide}")
    
    # Se la sezione è un oggetto con "contenuto", aggiorna il contenuto
    if isinstance(analisi_finale.get(request.sezione), dict):
        analisi_finale[request.sezione]["contenuto"] = request.contenuto
    else:
        analisi_finale[request.sezione] = request.contenuto
    
    analisi_finale["last_modified_at"] = datetime.now(timezone.utc).isoformat()
    analisi_finale["modified_by"] = "admin"
    
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {"analisi_finale": analisi_finale}}
    )
    
    return {
        "success": True,
        "message": f"Sezione '{request.sezione}' aggiornata",
        "analisi_finale": analisi_finale
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 5: APPROVA E INVIA AL CLIENTE
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/approva-invia")
async def approva_e_invia(request: ApprovaInviaRequest):
    """
    Approva l'analisi finale e invia email al cliente tramite Systeme.io.
    """
    cliente = await get_cliente_or_404(request.user_id)
    
    analisi_finale = cliente.get("analisi_finale")
    if not analisi_finale:
        raise HTTPException(status_code=400, detail="Analisi finale non presente")
    
    email = cliente.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email cliente non presente")
    
    # Aggiorna stato
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {
            "stato_analisi": "analisi_consegnata",
            "analisi_consegnata_at": datetime.now(timezone.utc).isoformat(),
            "analisi_generata": True  # Per compatibilità con sistema esistente
        }}
    )
    
    # Invia tag Systeme.io per triggerare email automatica
    tag_result = await aggiungi_tag_systeme(email, "analisi_finale_pronta")
    
    # Notifica Telegram
    try:
        import httpx
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            nome = cliente.get("nome", "")
            cognome = cliente.get("cognome", "")
            msg = f"📄 ANALISI FINALE INVIATA\n\n👤 {nome} {cognome}\n📧 {email}\n\n✅ Documento consegnato al cliente"
            async with httpx.AsyncClient() as client_http:
                await client_http.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": msg}
                )
    except Exception as e:
        logging.warning(f"Telegram notification failed: {e}")
    
    return {
        "success": True,
        "stato": "analisi_consegnata",
        "email_inviata": tag_result,
        "message": "Analisi approvata e inviata al cliente"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 6: EXPORT PDF SCRIPT CALL
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/script-call-pdf/{user_id}")
async def export_script_call_pdf(user_id: str):
    """
    Esporta lo script call in PDF per Claudio.
    """
    cliente = await get_cliente_or_404(user_id)
    
    script_call = cliente.get("script_call")
    if not script_call:
        raise HTTPException(status_code=400, detail="Script call non generato")
    
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_LEFT
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=40, bottomMargin=40)
        elements = []
        styles = getSampleStyleSheet()
        
        # Stili personalizzati
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, spaceAfter=20)
        heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, spaceAfter=10, textColor=colors.HexColor('#F2C418'))
        body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=8)
        note_style = ParagraphStyle('Note', parent=styles['Normal'], fontSize=9, leading=12, textColor=colors.gray, spaceAfter=6)
        
        # Titolo
        elements.append(Paragraph(script_call.get("titolo_script", "Script Call Strategica"), title_style))
        elements.append(Paragraph(f"Durata stimata: {script_call.get('durata_stimata', '45-60 minuti')}", note_style))
        elements.append(Spacer(1, 20))
        
        # Blocchi
        for blocco in script_call.get("blocchi", []):
            # Header blocco
            elements.append(Paragraph(f"BLOCCO {blocco.get('numero')} — {blocco.get('titolo', '')}", heading_style))
            elements.append(Paragraph(f"<b>Obiettivo:</b> {blocco.get('obiettivo', '')}", body_style))
            
            # Contenuto
            if blocco.get("contenuto"):
                elements.append(Paragraph(blocco.get("contenuto"), body_style))
            
            # Domande
            if blocco.get("domande"):
                elements.append(Paragraph("<b>Domande da fare:</b>", body_style))
                for domanda in blocco.get("domande", []):
                    elements.append(Paragraph(f"• {domanda}", body_style))
            
            # Note per Claudio
            if blocco.get("note_claudio"):
                elements.append(Paragraph(f"<i>💡 Note: {blocco.get('note_claudio')}</i>", note_style))
            
            elements.append(Spacer(1, 15))
        
        doc.build(elements)
        buffer.seek(0)
        
        nome = cliente.get("nome", "cliente")
        cognome = cliente.get("cognome", "")
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=script-call-{nome}-{cognome}.pdf"
            }
        )
        
    except Exception as e:
        logging.error(f"PDF generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione PDF: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 7: EXPORT PDF ANALISI FINALE
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/analisi-finale-pdf/{user_id}")
async def export_analisi_finale_pdf(user_id: str):
    """
    Esporta l'analisi finale in PDF per il cliente.
    """
    cliente = await get_cliente_or_404(user_id)
    
    analisi_finale = cliente.get("analisi_finale")
    if not analisi_finale:
        raise HTTPException(status_code=400, detail="Analisi finale non generata")
    
    # Verifica che sia stata consegnata
    if cliente.get("stato_analisi") != "analisi_consegnata":
        raise HTTPException(status_code=400, detail="Analisi non ancora approvata per il cliente")
    
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
        cover_title = ParagraphStyle('CoverTitle', parent=styles['Title'], fontSize=28, alignment=TA_CENTER, spaceAfter=20)
        cover_sub = ParagraphStyle('CoverSub', parent=styles['Normal'], fontSize=14, alignment=TA_CENTER, textColor=colors.gray)
        section_title = ParagraphStyle('SectionTitle', parent=styles['Heading1'], fontSize=16, textColor=colors.HexColor('#F2C418'), spaceAfter=12)
        body = ParagraphStyle('Body', parent=styles['Normal'], fontSize=11, leading=16, alignment=TA_JUSTIFY, spaceAfter=10)
        
        # COPERTINA
        copertina = analisi_finale.get("copertina", {})
        elements.append(Spacer(1, 150))
        elements.append(Paragraph(copertina.get("titolo", "Analisi Strategica"), cover_title))
        elements.append(Paragraph(copertina.get("sottotitolo", ""), cover_sub))
        elements.append(Spacer(1, 50))
        elements.append(Paragraph(copertina.get("data", datetime.now().strftime('%d %B %Y')), cover_sub))
        elements.append(Paragraph(copertina.get("preparato_da", "Evolution PRO"), cover_sub))
        elements.append(PageBreak())
        
        # INTRODUZIONE
        elements.append(Paragraph("Introduzione", section_title))
        elements.append(Paragraph(analisi_finale.get("introduzione", ""), body))
        elements.append(Spacer(1, 20))
        
        # SEZIONI
        sezioni = [
            "profilo_professionale", "problema_mercato", "potenziale_mercato",
            "ipotesi_accademia", "modello_business", "valutazione_progetto", "prossimi_passi"
        ]
        
        for sezione in sezioni:
            dati = analisi_finale.get(sezione, {})
            if isinstance(dati, dict):
                elements.append(Paragraph(dati.get("titolo", sezione.replace("_", " ").title()), section_title))
                elements.append(Paragraph(dati.get("contenuto", ""), body))
                
                # Elementi aggiuntivi
                if dati.get("elementi"):
                    for elem in dati.get("elementi", []):
                        elements.append(Paragraph(f"• {elem}", body))
                if dati.get("azioni"):
                    for azione in dati.get("azioni", []):
                        elements.append(Paragraph(f"✓ {azione}", body))
                if dati.get("punteggio"):
                    elements.append(Paragraph(f"<b>Punteggio di fattibilità: {dati.get('punteggio')}/10</b>", body))
                if dati.get("raccomandazione"):
                    elements.append(Paragraph(f"<b>Raccomandazione:</b> {dati.get('raccomandazione')}", body))
                    
                elements.append(Spacer(1, 15))
        
        # CHIUSURA
        elements.append(Paragraph("In conclusione", section_title))
        elements.append(Paragraph(analisi_finale.get("chiusura", ""), body))
        
        doc.build(elements)
        buffer.seek(0)
        
        nome = cliente.get("nome", "cliente")
        cognome = cliente.get("cognome", "")
        
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
# ENDPOINT 8: GET STATO COMPLETO
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/stato/{user_id}")
async def get_stato_analisi_completo(user_id: str):
    """
    Ritorna lo stato completo del processo di analisi consulenziale.
    """
    cliente = await get_cliente_or_404(user_id)
    questionario = await get_questionario(user_id)
    
    return {
        "success": True,
        "user_id": user_id,
        "cliente": {
            "nome": cliente.get("nome"),
            "cognome": cliente.get("cognome"),
            "email": cliente.get("email")
        },
        "stato_analisi": cliente.get("stato_analisi", "questionario_ricevuto" if questionario else "in_attesa"),
        "has_questionario": questionario is not None,
        "has_analisi_preliminare": cliente.get("analisi_preliminare") is not None,
        "has_script_call": cliente.get("script_call") is not None,
        "has_analisi_finale": cliente.get("analisi_finale") is not None,
        "analisi_preliminare": cliente.get("analisi_preliminare"),
        "script_call": cliente.get("script_call"),
        "analisi_finale": cliente.get("analisi_finale"),
        "timestamps": {
            "questionario_at": questionario.get("created_at") if questionario else None,
            "analisi_preliminare_at": cliente.get("analisi_preliminare_at"),
            "script_call_at": cliente.get("script_call_at"),
            "analisi_finale_at": cliente.get("analisi_finale_at"),
            "analisi_consegnata_at": cliente.get("analisi_consegnata_at")
        }
    }
