"""
Macchina a stati del flusso cliente — Evolution PRO
====================================================
Naming italiano. Unica fonte di verità per stato e azione richiesta.

Tutti i valori sono costanti stringa (no enum) per serializzazione JSON diretta.

Utilizzo minimo:
    from services.stato_cliente import calcola_stato, STATO_PAGINA, STATO_LABEL_ADMIN

    stato, azione = calcola_stato(user=user_doc, cliente=cliente_doc, proposta=proposta_doc)
    pagina  = STATO_PAGINA[stato]
    label   = STATO_LABEL_ADMIN[stato]

Utilizzo con persistenza:
    patch = aggiorna_stato(user, cliente, proposta)
    await db.users.update_one({"id": user["id"]}, {"$set": patch})
"""

from __future__ import annotations
from typing import Optional


# ── Valori fissi: stati ───────────────────────────────────────────────────────

class StatiCliente:
    REGISTRATO                   = "REGISTRATO"
    INTRO_QUESTIONARIO           = "INTRO_QUESTIONARIO"
    QUESTIONARIO_IN_COMPILAZIONE = "QUESTIONARIO_IN_COMPILAZIONE"
    QUESTIONARIO_COMPLETATO      = "QUESTIONARIO_COMPLETATO"
    IN_ATTESA_PAGAMENTO_ANALISI  = "IN_ATTESA_PAGAMENTO_ANALISI"
    ANALISI_ATTIVATA             = "ANALISI_ATTIVATA"
    IN_ATTESA_CALL               = "IN_ATTESA_CALL"
    CALL_PRENOTATA               = "CALL_PRENOTATA"
    CALL_COMPLETATA              = "CALL_COMPLETATA"
    IDONEO_PARTNERSHIP           = "IDONEO_PARTNERSHIP"
    ATTIVAZIONE_PARTNERSHIP      = "ATTIVAZIONE_PARTNERSHIP"
    CONVERTITO_PARTNER           = "CONVERTITO_PARTNER"

    # Ordine progressivo — usato per confronti di avanzamento
    ORDINE: list[str] = [
        REGISTRATO,
        INTRO_QUESTIONARIO,
        QUESTIONARIO_IN_COMPILAZIONE,
        QUESTIONARIO_COMPLETATO,
        IN_ATTESA_PAGAMENTO_ANALISI,
        ANALISI_ATTIVATA,
        IN_ATTESA_CALL,
        CALL_PRENOTATA,
        CALL_COMPLETATA,
        IDONEO_PARTNERSHIP,
        ATTIVAZIONE_PARTNERSHIP,
        CONVERTITO_PARTNER,
    ]


# ── Valori fissi: azioni ──────────────────────────────────────────────────────

class AzioniCliente:
    INIZIA_QUESTIONARIO   = "INIZIA_QUESTIONARIO"
    COMPLETA_QUESTIONARIO = "COMPLETA_QUESTIONARIO"
    EFFETTUA_PAGAMENTO    = "EFFETTUA_PAGAMENTO"
    PRENOTA_CALL          = "PRENOTA_CALL"
    PARTECIPA_CALL        = "PARTECIPA_CALL"
    ATTIVA_PARTNERSHIP    = "ATTIVA_PARTNERSHIP"


# ── Mapping stato → pagina frontend ──────────────────────────────────────────
# La pagina è quella verso cui redirigere l'utente in quel dato stato.

STATO_PAGINA: dict[str, str] = {
    StatiCliente.REGISTRATO:                   "/analisi-attivazione",
    StatiCliente.INTRO_QUESTIONARIO:           "/intro-questionario",
    StatiCliente.QUESTIONARIO_IN_COMPILAZIONE: "/questionario",
    StatiCliente.QUESTIONARIO_COMPLETATO:      "/questionario",
    StatiCliente.IN_ATTESA_PAGAMENTO_ANALISI:  "/analisi-attivazione",
    StatiCliente.ANALISI_ATTIVATA:             "/analisi-in-preparazione",
    StatiCliente.IN_ATTESA_CALL:               "/prenota-call",
    StatiCliente.CALL_PRENOTATA:               "/call-prenotata",
    StatiCliente.CALL_COMPLETATA:              "/analisi-attivazione",
    StatiCliente.IDONEO_PARTNERSHIP:           "/proposta",
    StatiCliente.ATTIVAZIONE_PARTNERSHIP:      "/proposta",
    StatiCliente.CONVERTITO_PARTNER:           "/dashboard",
}


# ── Mapping stato → etichetta admin leggibile ─────────────────────────────────

STATO_LABEL_ADMIN: dict[str, str] = {
    StatiCliente.REGISTRATO:                   "Registrato",
    StatiCliente.INTRO_QUESTIONARIO:           "Ha visto l'intro",
    StatiCliente.QUESTIONARIO_IN_COMPILAZIONE: "Questionario in compilazione",
    StatiCliente.QUESTIONARIO_COMPLETATO:      "Questionario completato",
    StatiCliente.IN_ATTESA_PAGAMENTO_ANALISI:  "In attesa pagamento €67",
    StatiCliente.ANALISI_ATTIVATA:             "Analisi attivata",
    StatiCliente.IN_ATTESA_CALL:               "In attesa di call",
    StatiCliente.CALL_PRENOTATA:               "Call prenotata",
    StatiCliente.CALL_COMPLETATA:              "Call completata — in valutazione",
    StatiCliente.IDONEO_PARTNERSHIP:           "Idoneo — in trattativa",
    StatiCliente.ATTIVAZIONE_PARTNERSHIP:      "Attivazione partnership",
    StatiCliente.CONVERTITO_PARTNER:           "Partner attivo",
}


# ── Mapping stato → azione richiesta (None = nessuna azione utente) ───────────

_STATO_AZIONE: dict[str, Optional[str]] = {
    StatiCliente.REGISTRATO:                   AzioniCliente.INIZIA_QUESTIONARIO,
    StatiCliente.INTRO_QUESTIONARIO:           AzioniCliente.INIZIA_QUESTIONARIO,
    StatiCliente.QUESTIONARIO_IN_COMPILAZIONE: AzioniCliente.COMPLETA_QUESTIONARIO,
    StatiCliente.QUESTIONARIO_COMPLETATO:      AzioniCliente.EFFETTUA_PAGAMENTO,
    StatiCliente.IN_ATTESA_PAGAMENTO_ANALISI:  AzioniCliente.EFFETTUA_PAGAMENTO,
    StatiCliente.ANALISI_ATTIVATA:             None,   # elaborazione admin
    StatiCliente.IN_ATTESA_CALL:               AzioniCliente.PRENOTA_CALL,
    StatiCliente.CALL_PRENOTATA:               AzioniCliente.PARTECIPA_CALL,
    StatiCliente.CALL_COMPLETATA:              None,   # valutazione admin
    StatiCliente.IDONEO_PARTNERSHIP:           AzioniCliente.ATTIVA_PARTNERSHIP,
    StatiCliente.ATTIVAZIONE_PARTNERSHIP:      None,   # in lavorazione
    StatiCliente.CONVERTITO_PARTNER:           None,   # completato
}


# ── Funzione centrale ─────────────────────────────────────────────────────────

def calcola_stato(
    user: dict,
    cliente: Optional[dict] = None,
    proposta: Optional[dict] = None,
) -> tuple[str, Optional[str]]:
    """
    Determina stato_cliente e azione_richiesta dai dati esistenti.

    Pura: non scrive su DB. I caller decidono se persistere il risultato.

    Args:
        user:     documento da db.users
        cliente:  documento da db.clienti (opzionale; None se non ancora creato)
        proposta: documento da db.proposte (opzionale)

    Returns:
        (stato, azione) — entrambi stringhe; azione può essere None

    Fonti per stato:
        db.users    → partner_id, idoneo_partnership, pagamento_analisi,
                       intro_questionario_seen, stato_cliente (solo per INTRO_QUESTIONARIO)
        db.clienti  → questionario_compilato, pagamento_analisi, analisi_generata, call_stato
        db.proposte → contratto_firmato_at, pagamento_completato

    Note su stati transitori:
        QUESTIONARIO_COMPLETATO — viene impostato direttamente dall'endpoint
        /cliente-analisi/questionario al momento della sottomissione. La derivazione
        pura non lo distingue da IN_ATTESA_PAGAMENTO_ANALISI (stesso set di campi);
        viene rispettato solo se già persistito come stato_cliente corrente.

        INTRO_QUESTIONARIO — impostato dall'IntroQuestionario al click CTA prima
        di intro_questionario_seen=True. Non derivabile solo dai campi.
    """
    c = cliente or {}
    p = proposta or {}

    # Priorità decrescente: si prende il primo ramo che corrisponde.

    if user.get("partner_id"):
        # Partner già onboardato
        stato = StatiCliente.CONVERTITO_PARTNER

    elif p.get("pagamento_completato") and not user.get("partner_id"):
        # Ha pagato la partnership, onboarding non ancora completato
        stato = StatiCliente.ATTIVAZIONE_PARTNERSHIP

    elif user.get("idoneo_partnership") or p.get("contratto_firmato_at"):
        # Admin ha valutato idoneo o contratto già firmato
        stato = StatiCliente.IDONEO_PARTNERSHIP

    elif c.get("call_stato") == "completata":
        stato = StatiCliente.CALL_COMPLETATA

    elif c.get("call_stato") == "fissata":
        stato = StatiCliente.CALL_PRENOTATA

    elif c.get("analisi_generata"):
        # Analisi pronta, call non ancora fissata
        stato = StatiCliente.IN_ATTESA_CALL

    elif c.get("pagamento_analisi") or user.get("pagamento_analisi"):
        # Pagato €67, analisi non ancora generata
        stato = StatiCliente.ANALISI_ATTIVATA

    elif c.get("questionario_compilato"):
        # Questionario completato: rispetta QUESTIONARIO_COMPLETATO se già persistito,
        # altrimenti passa direttamente a IN_ATTESA_PAGAMENTO_ANALISI.
        stato_corrente = user.get("stato_cliente")
        if stato_corrente == StatiCliente.QUESTIONARIO_COMPLETATO:
            stato = StatiCliente.QUESTIONARIO_COMPLETATO
        else:
            stato = StatiCliente.IN_ATTESA_PAGAMENTO_ANALISI

    elif user.get("intro_questionario_seen"):
        # Ha visto l'intro: sta compilando il questionario
        stato = StatiCliente.QUESTIONARIO_IN_COMPILAZIONE

    elif user.get("stato_cliente") == StatiCliente.INTRO_QUESTIONARIO:
        # Transitorio: ha aperto l'intro ma non ancora cliccato CTA
        stato = StatiCliente.INTRO_QUESTIONARIO

    else:
        stato = StatiCliente.REGISTRATO

    azione = _STATO_AZIONE[stato]
    return stato, azione


def aggiorna_stato(
    user: dict,
    cliente: Optional[dict] = None,
    proposta: Optional[dict] = None,
) -> dict:
    """
    Calcola stato e azione e restituisce il dict pronto per $set su db.users.

    Esempio:
        patch = aggiorna_stato(user, cliente, proposta)
        await db.users.update_one({"id": user["id"]}, {"$set": patch})
    """
    stato, azione = calcola_stato(user, cliente, proposta)
    return {
        "stato_cliente": stato,
        "azione_richiesta": azione,
    }


def stato_maggiore(a: str, b: str) -> str:
    """Ritorna lo stato più avanzato tra i due (utile per confronti di merge)."""
    ordine = StatiCliente.ORDINE
    ia = ordine.index(a) if a in ordine else -1
    ib = ordine.index(b) if b in ordine else -1
    return a if ia >= ib else b
