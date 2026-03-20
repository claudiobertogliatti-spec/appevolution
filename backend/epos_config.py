"""
epos_config.py
==============
MASTER PROMPT: EVOLUTION PRO - END-TO-END OPERATING SYSTEM (v2.0)

Configurazione centrale per l'intero ciclo di vita del partner:
dal questionario alla partnership operativa a 12 mesi.

Coordina:
- NotebookLM (conoscenza)
- OpenClaw (azione web)
- Team AI (Stefania, Stefania, Andrea, Marco, Gaia, Antonella)
"""

import os
from typing import Dict, List, Optional
from datetime import datetime

# ============================================================================
# CONFIGURAZIONE PREZZI E FEE
# ============================================================================

PRICING_CONFIG = {
    "analisi_strategica": {
        "prezzo": 67,
        "valuta": "EUR",
        "descrizione": "Analisi Strategica Personalizzata (21 sezioni)"
    },
    "partnership": {
        "prezzo": 2790,
        "valuta": "EUR",
        "descrizione": "Partnership Evolution PRO (12 mesi)"
    },
    "revenue_share": {
        "percentuale": 10,
        "durata_mesi": 12,
        "descrizione": "Fee sui ricavi generati dal funnel"
    }
}

# ============================================================================
# PROTOCOLLO 1: ANALISI STRATEGICA (67€)
# ============================================================================

PROTOCOLLO_ANALISI = {
    "trigger": "completamento_pagamento_67",
    "fasi": [
        {
            "nome": "DATA_INTELLIGENCE",
            "descrizione": "Se dati questionario scarsi, attiva OpenClaw per ricerca web",
            "agente": "OPENCLAW",
            "condizione": "completezza_questionario < 70%"
        },
        {
            "nome": "ORCHESTRAZIONE_TEAM",
            "descrizione": "Coordina team per generazione report 21 sezioni",
            "assegnazioni": {
                "STEFANIA": ["01_introduzione", "02_chi_siamo", "03_come_funziona", "04_glossario", "05_disclaimer", "21_prossimi_passi"],
                "STEFANIA": ["07_problema_risolto", "08_target_ideale"],
                "ANDREA": ["15_struttura_corso", "16_modello_monetizzazione"],
                "MARCO": ["14_criticita", "18_roadmap", "06_profilo_professionale", "20_valutazione_finale"],
                "GAIA": ["17_costo_opportunita", "19_investimento"],
                "OPENCLAW": ["10_analisi_mercato", "11_posizionamento_attuale", "12_analisi_competitor"]
            }
        },
        {
            "nome": "HONESTY_POLICY",
            "descrizione": "Se progetto non sostenibile, esito = NON ANCORA ADATTO",
            "output_negativo": {
                "esito": "NON ANCORA ADATTO",
                "include": "roadmap_correzione"
            }
        },
        {
            "nome": "OUTPUT",
            "descrizione": "Report Markdown avanzato salvato in BOZZA per Admin",
            "formato": "markdown",
            "stato_iniziale": "bozza_analisi"
        }
    ]
}

# ============================================================================
# PROTOCOLLO 2: CONVERSIONE (SPOILER & CALL)
# ============================================================================

SPOILER_STRATEGICO_TEMPLATE = """Ho analizzato il tuo progetto.

Hai un vantaggio competitivo in **{punto_forza}**, ma ho rilevato un rischio critico in **{criticita_principale}**.

Ho preparato la tua Roadmap personalizzata.

👉 **Prenota la Call Strategica** per vederla insieme e capire se possiamo lavorare insieme.

{link_calendario}"""

SPOILER_CONFIG = {
    "trigger": "analisi_validata_admin",
    "canali": ["telegram", "email"],
    "template": SPOILER_STRATEGICO_TEMPLATE,
    "campi_dinamici": ["punto_forza", "criticita_principale", "link_calendario"],
    "sblocca_calendario": True
}

# ============================================================================
# PROTOCOLLO 3: PARTNERSHIP OPERATIVA (2.790€ + 10% FEE)
# ============================================================================

FASI_PARTNERSHIP = [
    {
        "numero": 1,
        "nome": "POSIZIONAMENTO",
        "codice": "F1",
        "agente_principale": "STEFANIA",
        "descrizione": "Estrazione metodo E.V.O. - Definizione posizionamento unico",
        "durata_settimane": "2-3",
        "deliverable": ["Documento posizionamento", "USP definita", "Naming prodotto"]
    },
    {
        "numero": 2,
        "nome": "MASTERCLASS",
        "codice": "F2",
        "agente_principale": "STEFANIA",
        "descrizione": "Script narrativo e attrazione lead - Creazione contenuto gratuito",
        "durata_settimane": "2",
        "deliverable": ["Script masterclass", "Copy landing page", "Email sequence"]
    },
    {
        "numero": 3,
        "nome": "VIDEOCORSO",
        "codice": "F3",
        "agente_principale": "ANDREA",
        "descrizione": "Supervisione produzione e livelli formativi",
        "durata_settimane": "4-6",
        "deliverable": ["Struttura moduli", "Brief video", "Checklist qualità"]
    },
    {
        "numero": 4,
        "nome": "FUNNEL",
        "codice": "F4",
        "agente_principale": "GAIA",
        "descrizione": "Deploy automatico su Systeme.io via OpenClaw",
        "durata_settimane": "2",
        "deliverable": ["Landing page live", "Automazioni email", "Checkout configurato"],
        "usa_openclaw": True
    },
    {
        "numero": 5,
        "nome": "LANCIO",
        "codice": "F5",
        "agente_principale": "ANTONELLA",
        "descrizione": "Piano editoriale e attivazione traffico",
        "durata_settimane": "2",
        "deliverable": ["Piano editoriale 30gg", "Primi post pubblicati", "Campagna ADV attiva"]
    }
]

# ============================================================================
# PROTOCOLLO 4: MONITORAGGIO E USCITA
# ============================================================================

ACCOUNTABILITY_CONFIG = {
    "check_in_giorni": ["lunedi", "venerdi"],
    "agente": "MARCO",
    "contenuto_lunedi": "obiettivi_settimana",
    "contenuto_venerdi": "risultati_settimana",
    "notifica_canali": ["telegram", "app"]
}

REVENUE_CONTROL_CONFIG = {
    "frequenza": "ogni_30_giorni",
    "agente": "OPENCLAW",
    "fonte_dati": "systeme.io",
    "calcolo": "vendite_totali * 0.10",
    "notifica_admin": True
}

EXIT_PROTOCOL = {
    "mese_attivazione": 13,
    "azioni": [
        "disattiva_fee_revenue_share",
        "invia_notifica_piena_proprietà",
        "proponi_pacchetti_gestione_opzionali"
    ],
    "messaggio_partner": """Congratulazioni! Hai completato il percorso Evolution PRO.

Da oggi sei proprietario al 100% della tua Accademia Digitale e di tutti i ricavi generati.

Se desideri continuare a ricevere supporto, abbiamo preparato dei pacchetti di gestione opzionali su misura per te."""
}

# ============================================================================
# GESTIONE ERRORI
# ============================================================================

ERROR_HANDLING = {
    "openclaw_fallimento_ricerca": {
        "azione": "segnala_criticita",
        "criticita": "Invisibilità Digitale",
        "priorita": "alta",
        "messaggio": "La ricerca web non ha prodotto risultati significativi. Questo indica una criticità primaria: invisibilità digitale del partner."
    },
    "questionario_incompleto": {
        "azione": "sollecito_stefania",
        "timeout_ore": 24,
        "canali": ["telegram", "email"],
        "messaggio": "Ciao! Ho notato che il tuo questionario non è ancora completo. Completa le ultime domande per ricevere la tua Analisi Strategica."
    },
    "pagamento_fallito": {
        "azione": "notifica_admin",
        "retry_automatico": False
    }
}

# ============================================================================
# MAPPING STATI CLIENTE
# ============================================================================

STATI_CLIENTE = {
    "lead": "Interessato - Non ha ancora pagato",
    "pagamento_67": "Ha pagato 67€ - In attesa questionario",
    "questionario_inviato": "Questionario completato - In generazione analisi",
    "bozza_analisi": "Analisi generata - In attesa validazione Admin",
    "analisi_validata": "Analisi validata - Spoiler inviato, calendario sbloccato",
    "call_prenotata": "Call strategica prenotata",
    "call_completata": "Call completata - In attesa decisione",
    "pagamento_2790": "Ha pagato 2790€ - Partner attivo",
    "partner_f1": "Partner in Fase 1 - Posizionamento",
    "partner_f2": "Partner in Fase 2 - Masterclass",
    "partner_f3": "Partner in Fase 3 - Videocorso",
    "partner_f4": "Partner in Fase 4 - Funnel",
    "partner_f5": "Partner in Fase 5 - Lancio",
    "partner_attivo": "Partner attivo - Post lancio",
    "partner_exit": "Partner uscito (Mese 13+)"
}

# ============================================================================
# FUNZIONI HELPER
# ============================================================================

def get_fase_corrente(codice_fase: str) -> dict:
    """Restituisce i dettagli di una fase partnership"""
    for fase in FASI_PARTNERSHIP:
        if fase["codice"] == codice_fase:
            return fase
    return None


def genera_spoiler(analisi: dict) -> str:
    """Genera il messaggio Spoiler Strategico dall'analisi"""
    # Estrai dati dall'analisi
    sezioni = analisi.get("sezioni", {})
    
    # Cerca punto di forza
    punto_forza = "la tua esperienza nel settore"
    valutazione = sezioni.get("20_valutazione_finale", {})
    if isinstance(valutazione, dict):
        punti_forza = valutazione.get("punti_forza", [])
        if punti_forza and len(punti_forza) > 0:
            punto_forza = punti_forza[0]
    
    # Cerca criticità principale
    criticita_principale = "la definizione del target"
    criticita = sezioni.get("14_criticita", {})
    if isinstance(criticita, dict):
        lista_criticita = criticita.get("lista_criticita", [])
        if lista_criticita and len(lista_criticita) > 0:
            criticita_principale = lista_criticita[0]
    
    # Link calendario (da configurare)
    link_calendario = os.environ.get("CALENDLY_LINK", "https://calendly.com/evolution-pro/call-strategica")
    
    return SPOILER_STRATEGICO_TEMPLATE.format(
        punto_forza=punto_forza,
        criticita_principale=criticita_principale,
        link_calendario=link_calendario
    )


def calcola_fee_revenue(vendite_totali: float) -> float:
    """Calcola la fee del 10% sui ricavi"""
    return vendite_totali * (PRICING_CONFIG["revenue_share"]["percentuale"] / 100)


def get_prossima_fase(fase_corrente: str) -> Optional[str]:
    """Restituisce il codice della prossima fase"""
    fasi_ordinate = ["F1", "F2", "F3", "F4", "F5"]
    try:
        idx = fasi_ordinate.index(fase_corrente)
        if idx < len(fasi_ordinate) - 1:
            return fasi_ordinate[idx + 1]
    except ValueError:
        pass
    return None


# ============================================================================
# EXPORT
# ============================================================================

__all__ = [
    "PRICING_CONFIG",
    "PROTOCOLLO_ANALISI",
    "SPOILER_STRATEGICO_TEMPLATE",
    "SPOILER_CONFIG",
    "FASI_PARTNERSHIP",
    "ACCOUNTABILITY_CONFIG",
    "REVENUE_CONTROL_CONFIG",
    "EXIT_PROTOCOL",
    "ERROR_HANDLING",
    "STATI_CLIENTE",
    "get_fase_corrente",
    "genera_spoiler",
    "calcola_fee_revenue",
    "get_prossima_fase"
]
