"""Metriche Dati lato accademia (a carico di App Ciak, fuori dal funnel Systeme).

Il funnel (visite/contatti/vendite/conversione) misura l'ACQUISIZIONE. Qui misuriamo la
salute dell'ACCADEMIA dopo la vendita: quanto vale un cliente (LTV), quanti completano,
quanti restano. Sono le metriche che dicono se l'accademia regge nel tempo — e che, nella
continuita, vendono il rinnovo da sole.

Principio: ONESTA sui dati. Calcoliamo cio che e' davvero derivabile (LTV da
fatturato/clienti) e marchiamo come "non disponibile" cio per cui non abbiamo ancora una
fonte (completion e churn richiedono i progressi per-studente / gli abbonamenti, che oggi
non tracciamo). Niente numeri inventati: ogni metrica porta il suo stato di disponibilita.
"""
from __future__ import annotations

from typing import Any


def _num(v: Any) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def compute_academy_metrics(kpi_data: dict | None) -> dict:
    """Deriva le metriche academy-side dai dati KPI gia raccolti.

    kpi_data = output di get_partner_kpi_from_systeme (studenti_totali, fatturato_totale, fonte...).
    Ritorna un blocco con valore + disponibilita per ogni metrica. Mai solleva.
    """
    kpi_data = kpi_data or {}
    studenti = int(_num(kpi_data.get("studenti_totali")))
    fatturato = _num(kpi_data.get("fatturato_totale"))
    fonte = kpi_data.get("fonte", "nessuna")

    # LTV: valore medio per cliente. Derivabile appena c'e almeno un cliente pagante.
    if studenti > 0 and fatturato > 0:
        ltv = round(fatturato / studenti, 2)
        ltv_block = {"valore": ltv, "disponibile": True, "unita": "EUR"}
    else:
        ltv_block = {
            "valore": None,
            "disponibile": False,
            "unita": "EUR",
            "motivo": "Serve almeno un cliente pagante per calcolare il valore medio.",
        }

    # Completion: % di studenti che completano il corso. Richiede i progressi per-studente,
    # che oggi nessuna fonte espone (Systeme da solo studentsCount/totalRevenue).
    completion_block = {
        "valore": None,
        "disponibile": False,
        "unita": "%",
        "motivo": "Il tasso di completamento sara disponibile quando tracceremo i progressi degli studenti.",
    }

    # Churn: % di abbonati persi. Ha senso solo con la continuita (abbonamenti ricorrenti),
    # che parte dopo i 12 mesi. Finche non ci sono abbonamenti attivi, non e' calcolabile.
    churn_block = {
        "valore": None,
        "disponibile": False,
        "unita": "%",
        "motivo": "Il churn sara disponibile con gli abbonamenti di continuita (Foundation/Growth/Scale).",
    }

    return {
        "studenti": studenti,
        "fatturato": fatturato,
        "fonte": fonte,
        "ltv": ltv_block,
        "completion": completion_block,
        "churn": churn_block,
    }
