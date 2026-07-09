"""
Partner Alignment — motore di stima "stato reale" per la cabina di regia Delivery.

Scopo: dato l'insieme di segnali asset di un partner (presenza posizionamento,
masterclass, videocorso, funnel, KPI, vendite) + lo stato operativo, stimare in
modo deterministico e testabile:
  - atto_evo:        Esamina | Valida | Ottimizza
  - stato_reale:     dove si trova davvero il partner (frase breve, operativa)
  - rischio:         il rischio principale in una riga
  - prossimo_step:   la prossima azione concreta
  - responsabile:    Claudio | Luca | Agente Ciak | Partner
  - priorita:        alta | media | bassa
  - incoerenza:      True se la fase legacy è più avanti dello stato reale

Fonte operativa del journey: `partner_journey_steps`. `partners.phase` è legacy e
serve solo per il badge e per rilevare incoerenze fase↔asset.

Questo modulo è PURO: nessun accesso a DB o rete. L'endpoint costruisce i segnali
dal database e chiama `estimate_alignment`. Così la logica è unit-testabile.
"""
from typing import Any, Optional

# Etichette brevi degli asset del percorso EVO, in ordine di costruzione.
ASSET_LABELS: dict[str, str] = {
    "posizionamento": "Posizionamento",
    "brand": "Brand",
    "dati_base": "Dati base",
    "script_masterclass": "Script MC",
    "video_masterclass": "Video MC",
    "videocorso": "Videocorso",
    "funnel": "Funnel",
    "kpi": "KPI",
    "vendite": "Vendite",
}

# Ordine con cui gli asset vengono valutati a cascata.
ASSET_ORDER: list[str] = [
    "posizionamento",
    "brand",
    "dati_base",
    "script_masterclass",
    "video_masterclass",
    "videocorso",
    "funnel",
    "kpi",
    "vendite",
]

# Fasi legacy considerate "avanzate" (da Valida in poi).
_PHASE_ADVANCED = {"F3", "F4", "F5", "F6", "F7"}


def atto_evo_from_phase(phase: Optional[str]) -> Optional[str]:
    """Deriva l'atto EVO dalla fase legacy (badge/compatibilità).

    Stesso mapping del frontend `admin/evo.js`: F1-F2 = Esamina, F3-F7 = Valida,
    oltre (o vuoto/completato) = Ottimizza. Ritorna None se la fase non è impostata.
    """
    if not phase:
        return None
    if phase in ("F1", "F2"):
        return "Esamina"
    if phase in ("F3", "F4", "F5", "F6", "F7"):
        return "Valida"
    return "Ottimizza"


def _b(signals: dict[str, Any], key: str) -> bool:
    return bool(signals.get(key))


def compute_asset_flags(signals: dict[str, Any]) -> dict[str, bool]:
    """Ritorna il dizionario {asset: presente?} usato per i chip UI."""
    return {name: _b(signals, f"{name}_ok") for name in ASSET_ORDER}


def missing_assets(signals: dict[str, Any]) -> list[str]:
    """Lista degli asset mancanti (chiavi tecniche), in ordine di percorso."""
    flags = compute_asset_flags(signals)
    return [name for name in ASSET_ORDER if not flags[name]]


def present_assets(signals: dict[str, Any]) -> list[str]:
    """Lista degli asset presenti (chiavi tecniche), in ordine di percorso."""
    flags = compute_asset_flags(signals)
    return [name for name in ASSET_ORDER if flags[name]]


def estimate_alignment(signals: dict[str, Any]) -> dict[str, Any]:
    """Stima deterministica dello stato reale e del rischio principale.

    `signals` accetta (tutti opzionali, default False/None):
      stato:                 "attivo" | "sospeso" | "quarantena" | "ex"
      phase:                 fase legacy (es. "F5")
      posizionamento_ok, brand_ok, dati_base_ok,
      script_masterclass_ok, video_masterclass_ok, videocorso_ok,
      funnel_ok, kpi_ok, vendite_ok:  bool

    Ritorna un dict con:
      atto_evo, stato_reale, rischio, prossimo_step, responsabile, priorita,
      incoerenza, asset_flags, asset_mancanti, asset_presenti.
    """
    stato = (signals.get("stato") or "attivo").lower()
    phase = signals.get("phase")

    flags = compute_asset_flags(signals)
    mancanti = [n for n in ASSET_ORDER if not flags[n]]
    presenti = [n for n in ASSET_ORDER if flags[n]]

    base = {
        "asset_flags": flags,
        "asset_mancanti": mancanti,
        "asset_presenti": presenti,
        "atto_legacy": atto_evo_from_phase(phase),
    }

    # ── Bloccati/Sospesi: hanno la precedenza su qualsiasi stima asset ──────
    if stato in ("quarantena", "sospeso"):
        etichetta = "Sospeso" if stato == "sospeso" else "Bloccato"
        return {
            **base,
            "atto_evo": atto_evo_from_phase(phase) or "Esamina",
            "stato_reale": f"{etichetta} — {stato}",
            "rischio": "Partner fermo: rischio churn / pagamenti. Da sbloccare o chiudere.",
            "prossimo_step": "Decidere: riattivare, prorogare o chiudere la partnership.",
            "responsabile": "Claudio",
            "priorita": "alta",
            "incoerenza": False,
        }

    # ── Cascata EVO sugli asset reali ───────────────────────────────────────
    if not (flags["dati_base"] and flags["brand"] and flags["posizionamento"]):
        atto, stato_reale, rischio, step, resp = (
            "Esamina",
            "Esamina incompleta",
            "Fondamenta non pronte: senza dati/brand/posizionamento tutto il resto si blocca.",
            "Completare dati, brand kit e posizionamento del partner.",
            "Agente Ciak",
        )
    elif not flags["script_masterclass"]:
        atto, stato_reale, rischio, step, resp = (
            "Valida",
            "Valida: script masterclass da creare",
            "Manca lo script masterclass: la produzione video non può partire.",
            "Generare e far approvare lo script della masterclass.",
            "Agente Ciak",
        )
    elif not flags["video_masterclass"]:
        atto, stato_reale, rischio, step, resp = (
            "Valida",
            "Valida: masterclass da completare",
            "Script pronto ma video masterclass non ancora approvato.",
            "Registrare (partner) e approvare il video della masterclass.",
            "Partner",
        )
    elif not flags["videocorso"]:
        atto, stato_reale, rischio, step, resp = (
            "Valida",
            "Valida: videocorso da completare",
            "Masterclass ok ma il videocorso non è ancora completo.",
            "Registrare e approvare le lezioni del videocorso.",
            "Partner",
        )
    elif not flags["funnel"]:
        atto, stato_reale, rischio, step, resp = (
            "Valida",
            "Valida: funnel da completare",
            "Corso pronto ma manca il funnel di vendita (Systeme/checkout).",
            "Costruire e pubblicare il funnel di vendita nel Systeme del partner.",
            "Agente Ciak",
        )
    elif not flags["kpi"]:
        atto, stato_reale, rischio, step, resp = (
            "Ottimizza",
            "Ottimizza: dati da impostare",
            "Funnel live ma nessun KPI tracciato: non sappiamo se vende.",
            "Impostare i KPI (visite, contatti, vendite) del partner.",
            "Agente Ciak",
        )
    elif not flags["vendite"]:
        atto, stato_reale, rischio, step, resp = (
            "Ottimizza",
            "Ottimizza: miglioramento vendita",
            "KPI presenti ma vendite a zero: funnel/offerta da migliorare.",
            "Analizzare funnel e offerta, iterare per generare le prime vendite.",
            "Agente Ciak",
        )
    else:
        atto, stato_reale, rischio, step, resp = (
            "Ottimizza",
            "Ottimizza attivo",
            "Sistema che vende: mantenere ritmo (live, contenuti, KPI).",
            "Ciclo Ottimizza: KPI, live ogni 60 giorni, iterazione offerta.",
            "Agente Ciak",
        )

    # ── Incoerenza fase legacy ↔ stato reale ────────────────────────────────
    # La fase legacy dice "avanti" (Valida/Ottimizza) ma gli asset dicono "Esamina".
    incoerenza = bool(phase in _PHASE_ADVANCED and atto == "Esamina")

    # ── Priorità ────────────────────────────────────────────────────────────
    if incoerenza:
        priorita = "alta"
    elif atto == "Esamina":
        priorita = "media"
    elif atto == "Valida":
        priorita = "media"
    elif stato_reale == "Ottimizza attivo":
        priorita = "bassa"
    else:  # Ottimizza: dati o vendita
        priorita = "media"

    return {
        **base,
        "atto_evo": atto,
        "stato_reale": stato_reale,
        "rischio": rischio,
        "prossimo_step": step,
        "responsabile": resp,
        "priorita": priorita,
        "incoerenza": incoerenza,
    }


# ── Override manuali ─────────────────────────────────────────────────────────
# Campi persistiti sul documento partner. Se valorizzati, hanno la precedenza
# sulla stima automatica nella vista.
OVERRIDE_FIELDS: list[str] = [
    "alignment_status_override",
    "alignment_risk",
    "alignment_next_step",
    "alignment_owner",
    "alignment_priority",
    "alignment_notes",
]

# Mappa campo-override → campo-effettivo mostrato in tabella.
_OVERRIDE_TO_EFFECTIVE: dict[str, str] = {
    "alignment_status_override": "stato_reale",
    "alignment_risk": "rischio",
    "alignment_next_step": "prossimo_step",
    "alignment_owner": "responsabile",
    "alignment_priority": "priorita",
}

_EFFECTIVE_KEYS = ("stato_reale", "rischio", "prossimo_step", "responsabile", "priorita")


def apply_overrides(stima: dict[str, Any], partner_doc: dict[str, Any]) -> dict[str, Any]:
    """Fonde la stima automatica con gli override presenti sul documento partner.

    Ritorna i campi effettivi da mostrare + `note` + `ha_override`.
    """
    effective = {k: stima.get(k) for k in _EFFECTIVE_KEYS}
    has_override = False
    for ov_key, eff_key in _OVERRIDE_TO_EFFECTIVE.items():
        val = partner_doc.get(ov_key)
        if isinstance(val, str) and val.strip():
            effective[eff_key] = val.strip()
            has_override = True
        elif val not in (None, ""):
            effective[eff_key] = val
            has_override = True
    note = partner_doc.get("alignment_notes")
    if isinstance(note, str) and note.strip():
        has_override = True
    effective["note"] = note.strip() if isinstance(note, str) else note
    effective["ha_override"] = has_override
    return effective


def build_override_update(payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Da un payload PATCH (già filtrato con exclude_unset) costruisce le mappe
    ($set, $unset) per l'aggiornamento Mongo. Stringa vuota/None → $unset (azzera).
    """
    set_fields: dict[str, Any] = {}
    unset_fields: dict[str, Any] = {}
    for key in OVERRIDE_FIELDS:
        if key not in payload:
            continue
        val = payload[key]
        if val is None or (isinstance(val, str) and val.strip() == ""):
            unset_fields[key] = ""
        else:
            set_fields[key] = val.strip() if isinstance(val, str) else val
    return set_fields, unset_fields
