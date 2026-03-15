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

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
import os
import json
import logging
import uuid
import io

router = APIRouter(prefix="/api/flusso-analisi", tags=["flusso-analisi"])

# Database reference
db = None

def set_db(database):
    global db
    db = database

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
# HELPER - LLM
# ═══════════════════════════════════════════════════════════════════════════════

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
# ENDPOINT: Trigger generazione analisi (chiamato dopo questionario)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/genera-analisi-auto/{user_id}")
async def genera_analisi_auto(user_id: str):
    """
    Genera automaticamente l'analisi dopo il questionario.
    Chiamato internamente dal sistema quando il cliente invia il questionario.
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
    
    # Genera analisi
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
            "analisi_generata_at": datetime.now(timezone.utc).isoformat()
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
            msg = f"📊 ANALISI AUTO-GENERATA\n\n👤 {nome} {cognome}\n📋 Bozza pronta per revisione\n\n⏳ In attesa di modifica admin"
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
    
    frontend_url = os.environ.get("FRONTEND_URL", "https://client-onboarding-14.preview.emergentagent.com")
    
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
async def attiva_partnership(user_id: str):
    """Attiva la partnership dopo pagamento completato"""
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
    
    # Attiva partnership
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "stato_cliente": "partner_attivo",
            "user_type": "partner",
            "partnership_attiva": True,
            "partnership_attivata_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Crea record partner
    partner_data = {
        "id": user_id,
        "user_id": user_id,
        "name": f"{user.get('nome', '')} {user.get('cognome', '')}",
        "email": user.get("email"),
        "telefono": user.get("telefono"),
        "status": "ACTIVE",
        "phase": "F1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "contratto_id": contratto.get("id"),
        "pagamento_id": pagamento.get("id")
    }
    
    await db.partners.update_one(
        {"id": user_id},
        {"$set": partner_data},
        upsert=True
    )
    
    # Notifica
    try:
        import httpx
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            nome = user.get("nome", "")
            cognome = user.get("cognome", "")
            msg = f"🎉 NUOVO PARTNER ATTIVATO!\n\n👤 {nome} {cognome}\n📧 {user.get('email')}\n💰 €2.790 Partnership\n\n✅ Pronto per onboarding"
            async with httpx.AsyncClient() as client_http:
                await client_http.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": msg}
                )
    except Exception as e:
        logging.warning(f"Telegram notification failed: {e}")
    
    return {
        "success": True,
        "stato": "partner_attivo",
        "message": "Partnership attivata con successo! Benvenuto in Evolution PRO."
    }


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
