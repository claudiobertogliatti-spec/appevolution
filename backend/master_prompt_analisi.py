"""
master_prompt_analisi.py
========================
Master Prompt di Configurazione per l'Analisi Strategica Partner Evolution PRO.

Contiene:
- Struttura delle 21 sezioni
- Testi standard (Sezioni 1-5 e 21)
- Data-Gap Protocol
- Regole operative di generazione
- Template output Markdown

Prezzo di vendita analisi: €67
"""

from typing import Dict, List, Optional
from datetime import datetime

# ============================================================================
# CONFIGURAZIONE MASTER PROMPT
# ============================================================================

MASTER_PROMPT_CONFIG = {
    "version": "2.0",
    "price": 67,
    "min_words": 2500,
    "output_format": "markdown",
    "honesty_policy": True,
    "data_gap_protocol": True,
    "deep_research_enabled": True
}

# ============================================================================
# STRUTTURA 21 SEZIONI
# ============================================================================

SEZIONI_ANALISI = {
    # --- SEZIONI STANDARD (1-5) - Testo fisso ---
    "01_introduzione": {
        "titolo": "Introduzione all'Analisi",
        "tipo": "standard",
        "contenuto_standard": """Questa Analisi Strategica Personalizzata è stata realizzata dal team di Evolution PRO per valutare il potenziale del tuo progetto digitale.

Il nostro obiettivo non è vendere formazione o promettere risultati facili. È verificare se esistono le condizioni oggettive per trasformare la tua competenza in un'Accademia Digitale sostenibile nel tempo.

Negli ultimi anni, sempre più professionisti hanno tentato di creare corsi online. La maggior parte ha fallito. Non per mancanza di competenze, ma per mancanza di struttura strategica.

Per questo motivo, prima di avviare qualsiasi collaborazione, analizziamo con attenzione:
- La competenza del professionista
- Il problema che il mercato vuole risolvere
- La chiarezza del posizionamento
- La sostenibilità del modello di vendita

Solo dopo questa valutazione è possibile capire se il progetto può entrare nel sistema Evolution PRO."""
    },
    
    "02_chi_siamo": {
        "titolo": "Chi è Evolution PRO",
        "tipo": "standard",
        "contenuto_standard": """Evolution PRO è un sistema strutturato per accompagnare professionisti e formatori nella creazione di Accademie Digitali capaci di generare vendite nel tempo.

Non siamo un'agenzia di marketing. Non siamo una piattaforma di corsi. Siamo un partner strategico che lavora fianco a fianco con il professionista per costruire un asset digitale profittevole.

Il nostro modello si basa su 5 fasi:
1. **Posizionamento** - Definizione del problema, del target e della promessa unica
2. **Masterclass** - Creazione del contenuto gratuito che vende il corso
3. **Videocorso** - Produzione del percorso formativo completo
4. **Funnel** - Costruzione del sistema di vendita automatizzato
5. **Lancio** - Introduzione sul mercato con strategia di comunicazione

Ogni fase è progettata per massimizzare le probabilità di successo e minimizzare il rischio di fallimento."""
    },
    
    "03_come_funziona": {
        "titolo": "Come Funziona Questa Analisi",
        "tipo": "standard",
        "contenuto_standard": """Questa analisi è strutturata in 21 sezioni che coprono ogni aspetto del tuo potenziale progetto digitale.

**Cosa troverai:**
- Valutazione del tuo profilo professionale
- Analisi del problema che risolvi
- Studio del mercato e dei competitor
- Ipotesi di struttura del corso
- Modello di monetizzazione
- Criticità e aree di miglioramento
- Roadmap dettagliata

**Come leggere l'analisi:**
- Le sezioni contrassegnate con ✅ indicano punti di forza
- Le sezioni con ⚠️ indicano aree da approfondire
- Le sezioni con ❌ indicano criticità da risolvere

**Importante:** Questa analisi applica una politica di "Verità Brutale". Se il tuo modello di business attuale è insostenibile, te lo diremo chiaramente. Il valore dei €67 risiede nell'onestà della consulenza, non nel consenso."""
    },
    
    "04_glossario": {
        "titolo": "Glossario dei Termini",
        "tipo": "standard",
        "contenuto_standard": """**Accademia Digitale**: Sistema completo di formazione online che include corso, funnel di vendita e strategia di marketing.

**Funnel**: Percorso automatizzato che trasforma un visitatore in cliente attraverso step progressivi.

**Masterclass**: Contenuto gratuito di alto valore che introduce il metodo e vende il corso principale.

**Posizionamento**: Definizione unica di chi sei, cosa fai, per chi lo fai e perché sei diverso.

**Lead**: Potenziale cliente che ha mostrato interesse lasciando i propri dati.

**CPL (Costo Per Lead)**: Quanto costa acquisire un potenziale cliente.

**LTV (Lifetime Value)**: Valore totale che un cliente genera nel tempo.

**Conversion Rate**: Percentuale di visitatori che compiono l'azione desiderata."""
    },
    
    "05_disclaimer": {
        "titolo": "Disclaimer",
        "tipo": "standard",
        "contenuto_standard": """Questa analisi rappresenta una valutazione strategica basata sui dati forniti. Non costituisce una garanzia di risultati economici.

I risultati dipendono da molteplici fattori, tra cui:
- L'impegno del professionista nel seguire il percorso
- Le condizioni di mercato
- La qualità dell'esecuzione
- Il budget disponibile per promozione

Evolution PRO si impegna a fornire la migliore consulenza strategica possibile, ma non può garantire risultati specifici.

Tutti i dati di mercato e le analisi competitor sono stati raccolti tramite ricerca web pubblica e rappresentano una fotografia del momento in cui l'analisi è stata realizzata."""
    },
    
    # --- SEZIONI PERSONALIZZATE (6-20) - Generate da AI ---
    "06_profilo_professionale": {
        "titolo": "Il Tuo Profilo Professionale",
        "tipo": "personalizzato",
        "campi_richiesti": ["nome", "cognome", "expertise", "esperienze_vendita"],
        "prompt_generazione": "Analizza il profilo professionale del partner basandoti su expertise e esperienze. Valuta se la competenza è trasferibile in formato digitale. Sii specifico e critico."
    },
    
    "07_problema_risolto": {
        "titolo": "Il Problema che Risolvi",
        "tipo": "personalizzato",
        "campi_richiesti": ["risultato_promesso", "cliente_target"],
        "prompt_generazione": "Analizza il problema che il partner aiuta a risolvere. Valuta urgenza, rilevanza e disponibilità del target a pagare per la soluzione."
    },
    
    "08_target_ideale": {
        "titolo": "Il Tuo Target Ideale",
        "tipo": "personalizzato",
        "campi_richiesti": ["cliente_target", "pubblico_esistente"],
        "prompt_generazione": "Analizza il target identificato. Valuta chiarezza, specificità e dimensione. Segnala se troppo generico."
    },
    
    "09_proposta_valore": {
        "titolo": "La Tua Proposta di Valore",
        "tipo": "personalizzato",
        "campi_richiesti": ["expertise", "risultato_promesso"],
        "prompt_generazione": "Definisci la proposta di valore unica. Cosa differenzia questo professionista dalla concorrenza?"
    },
    
    "10_analisi_mercato": {
        "titolo": "Analisi del Mercato",
        "tipo": "personalizzato_con_ricerca",
        "richiede_openclaw": True,
        "prompt_generazione": "Valuta il mercato di riferimento: domanda esistente, trend, dimensione potenziale. Usa dati dalla ricerca web."
    },
    
    "11_posizionamento_attuale": {
        "titolo": "Il Tuo Posizionamento Attuale",
        "tipo": "personalizzato_con_ricerca",
        "richiede_openclaw": True,
        "prompt_generazione": "Valuta la presenza online attuale del partner. Analizza visibilità, autorità percepita, contenuti pubblicati."
    },
    
    "12_analisi_competitor": {
        "titolo": "Analisi dei Competitor",
        "tipo": "personalizzato_con_ricerca",
        "richiede_openclaw": True,
        "prompt_generazione": "Analizza i competitor diretti. Crea tabella comparativa con posizionamento, prezzo, punti di forza/debolezza."
    },
    
    "13_differenziazione": {
        "titolo": "Strategia di Differenziazione",
        "tipo": "personalizzato",
        "campi_richiesti": ["expertise", "risultato_promesso"],
        "prompt_generazione": "Proponi una strategia di differenziazione basata sui punti di forza unici del partner."
    },
    
    "14_criticita": {
        "titolo": "Criticità e Aree di Rischio",
        "tipo": "personalizzato",
        "campi_richiesti": ["ostacolo_principale", "esperienze_vendita"],
        "prompt_generazione": "Identifica le criticità principali del progetto. Applica la 'Verità Brutale': se il modello è insostenibile, segnalalo con box di allerta."
    },
    
    "15_struttura_corso": {
        "titolo": "Ipotesi di Struttura del Corso",
        "tipo": "personalizzato",
        "campi_richiesti": ["expertise", "risultato_promesso", "cliente_target"],
        "prompt_generazione": "Proponi una struttura del corso con nome, moduli, trasformazione promessa."
    },
    
    "16_modello_monetizzazione": {
        "titolo": "Modello di Monetizzazione",
        "tipo": "personalizzato",
        "campi_richiesti": ["cliente_target", "pubblico_esistente"],
        "prompt_generazione": "Proponi un modello di monetizzazione realistico con fascia prezzo, tipo di offerta, possibili upsell."
    },
    
    "17_costo_opportunita": {
        "titolo": "Il Costo di Non Agire",
        "tipo": "personalizzato",
        "campi_richiesti": ["esperienze_vendita", "motivazione"],
        "prompt_generazione": "Analizza il costo-opportunità del modello attuale. Se basato su tempo/consulenze, evidenzia i limiti strutturali."
    },
    
    "18_roadmap": {
        "titolo": "Roadmap Dettagliata",
        "tipo": "personalizzato",
        "campi_richiesti": [],
        "prompt_generazione": "Crea una timeline dettagliata con fasi, durate, milestone e deliverable specifici."
    },
    
    "19_investimento": {
        "titolo": "Investimento Richiesto",
        "tipo": "personalizzato",
        "campi_richiesti": [],
        "prompt_generazione": "Dettaglia l'investimento richiesto: tempo, budget marketing, strumenti necessari."
    },
    
    "20_valutazione_finale": {
        "titolo": "Valutazione Finale di Fattibilità",
        "tipo": "personalizzato",
        "campi_richiesti": ["tutti"],
        "prompt_generazione": "Fornisci valutazione finale con punteggio 1-10, esito (Adatto/Promettente/Non pronto), punti di forza e aree di miglioramento."
    },
    
    # --- SEZIONE FINALE STANDARD (21) ---
    "21_prossimi_passi": {
        "titolo": "Prossimi Passi",
        "tipo": "standard",
        "contenuto_standard": """Hai completato la lettura della tua Analisi Strategica Personalizzata.

**Cosa succede ora:**

1. **Call Strategica**: Durante la call commenteremo insieme questa analisi e risponderemo a tutte le tue domande.

2. **Valutazione Congiunta**: Valuteremo se esistono le condizioni per avviare la partnership Evolution PRO.

3. **Decisione**: Se il progetto risulterà adatto, potrai procedere con l'attivazione della partnership. In caso contrario, riceverai indicazioni chiare su come migliorare il progetto.

**Importante**: La call strategica non è una vendita. È una consulenza. L'obiettivo è capire se possiamo aiutarti davvero, non convincerti a comprare qualcosa.

Se dopo la call deciderai di procedere, avrai accesso al programma completo Evolution PRO che include:
- Affiancamento strategico per 12 mesi
- Creazione completa dell'Accademia Digitale
- Sistema di vendita automatizzato
- Supporto al lancio e ottimizzazione

**Grazie per aver scelto Evolution PRO per la tua valutazione strategica.**"""
    }
}


# ============================================================================
# DATA-GAP PROTOCOL
# ============================================================================

DATA_GAP_ALERT_TEMPLATE = """
⚠️ **[ANALISI SOSPESA: DATI MANCANTI]**

Il campo **{campo}** non è stato compilato o contiene informazioni insufficienti.

**Perché questo dato è fondamentale:**
{motivazione}

**Impatto sull'analisi:**
Senza questo dato, non è possibile fornire una valutazione accurata di {impatto}.

**Raccomandazione:**
{raccomandazione}
"""

DATA_GAP_MOTIVAZIONI = {
    "expertise": {
        "motivazione": "La competenza specifica è il fondamento di qualsiasi Accademia Digitale. Senza una definizione chiara, è impossibile valutare il potenziale di mercato.",
        "impatto": "posizionamento e differenziazione",
        "raccomandazione": "Definisci con precisione la tua area di competenza principale, specificando anni di esperienza e risultati ottenuti."
    },
    "cliente_target": {
        "motivazione": "Un target generico rende impossibile creare una comunicazione efficace e un funnel di vendita performante.",
        "impatto": "strategia di marketing e conversione",
        "raccomandazione": "Identifica il tuo cliente ideale con dettagli specifici: professione, età, problema principale, budget disponibile."
    },
    "risultato_promesso": {
        "motivazione": "Il risultato promesso è ciò che il cliente compra. Senza una trasformazione chiara, non c'è proposta di valore.",
        "impatto": "proposta di valore e pricing",
        "raccomandazione": "Definisci il risultato concreto e misurabile che il cliente otterrà seguendo il tuo percorso."
    },
    "competitor": {
        "motivazione": "Conoscere i competitor è essenziale per definire una strategia di differenziazione efficace.",
        "impatto": "posizionamento competitivo",
        "raccomandazione": "Identifica almeno 3 competitor diretti che offrono soluzioni simili al tuo target."
    },
    "esperienze_vendita": {
        "motivazione": "L'esperienza pregressa nella vendita indica la capacità di monetizzare la competenza.",
        "impatto": "fattibilità commerciale",
        "raccomandazione": "Descrivi eventuali esperienze di vendita di corsi, consulenze o servizi formativi."
    },
    "pubblico_esistente": {
        "motivazione": "Un pubblico esistente (email list, follower, clienti) riduce significativamente il rischio di lancio.",
        "impatto": "strategia di lancio e proiezioni",
        "raccomandazione": "Indica il numero di contatti email, follower social o clienti esistenti."
    }
}


# ============================================================================
# TEMPLATE OUTPUT MARKDOWN
# ============================================================================

MARKDOWN_TEMPLATE_HEADER = """
# Analisi Strategica Personalizzata
## {nome_cliente}

**Data**: {data}  
**Settore**: {expertise}  
**Valutazione**: {valutazione_sintetica}

---

"""

MARKDOWN_COMPETITOR_TABLE = """
### Tabella Comparativa Competitor

| Competitor | Posizionamento | Prezzo | Punti di Forza | Punti di Debolezza |
|------------|----------------|--------|----------------|-------------------|
{righe}
"""

MARKDOWN_ROADMAP_TIMELINE = """
### Timeline Progetto

```
{timeline_ascii}
```

| Fase | Durata | Attività | Deliverable |
|------|--------|----------|-------------|
{righe_roadmap}
"""


# ============================================================================
# FUNZIONE: Genera Alert Data-Gap
# ============================================================================

def genera_data_gap_alert(campo: str) -> str:
    """Genera alert formattato per campo mancante"""
    if campo in DATA_GAP_MOTIVAZIONI:
        info = DATA_GAP_MOTIVAZIONI[campo]
        return DATA_GAP_ALERT_TEMPLATE.format(
            campo=campo,
            motivazione=info["motivazione"],
            impatto=info["impatto"],
            raccomandazione=info["raccomandazione"]
        )
    else:
        return f"""
⚠️ **[ANALISI SOSPESA: DATI MANCANTI]**

Il campo **{campo}** non è stato compilato.
Questo dato è necessario per completare l'analisi strategica.
"""


# ============================================================================
# FUNZIONE: Verifica completezza questionario
# ============================================================================

def verifica_completezza_questionario(questionario: Dict) -> Dict:
    """
    Verifica la completezza del questionario e genera report.
    """
    campi_obbligatori = [
        "nome", "cognome", "expertise", "cliente_target", 
        "risultato_promesso", "pubblico_esistente", 
        "esperienze_vendita", "ostacolo_principale", "motivazione"
    ]
    
    result = {
        "completezza_percentuale": 0,
        "campi_compilati": [],
        "campi_mancanti": [],
        "campi_generici": [],
        "alerts": [],
        "richiede_ricerca_web": False
    }
    
    compilati = 0
    for campo in campi_obbligatori:
        valore = questionario.get(campo, "")
        
        if not valore or str(valore).strip() == "":
            result["campi_mancanti"].append(campo)
            result["alerts"].append(genera_data_gap_alert(campo))
        elif len(str(valore).strip()) < 15:
            result["campi_generici"].append(campo)
            compilati += 0.5
        else:
            result["campi_compilati"].append(campo)
            compilati += 1
    
    result["completezza_percentuale"] = round((compilati / len(campi_obbligatori)) * 100, 1)
    
    # Se completezza < 70%, attiva ricerca web
    if result["completezza_percentuale"] < 70:
        result["richiede_ricerca_web"] = True
    
    return result


# ============================================================================
# EXPORT
# ============================================================================

__all__ = [
    "MASTER_PROMPT_CONFIG",
    "SEZIONI_ANALISI",
    "DATA_GAP_ALERT_TEMPLATE",
    "DATA_GAP_MOTIVAZIONI",
    "MARKDOWN_TEMPLATE_HEADER",
    "MARKDOWN_COMPETITOR_TABLE",
    "MARKDOWN_ROADMAP_TIMELINE",
    "genera_data_gap_alert",
    "verifica_completezza_questionario"
]
