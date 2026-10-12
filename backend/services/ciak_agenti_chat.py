"""
Chat con CARLO (Acquisizione), MARCO (Vendite) e VALENTINA (Back-office). Leggono e consigliano,
non eseguono: nessuno strumento, nessun invio, nessuna modifica. Il contesto e' fatto SOLO di
dati letti da Ciak al momento della domanda; se un dato manca lo dicono.

Come Andrea (`ciak_andrea_chat`) ma con un contesto diverso per agente. Messaggio, storico e
limiti sono gli stessi di Andrea e si riusano da li'.

Funzioni pure: `contesto_carlo`, `contesto_marco`, `contesto_valentina`, `prompt_sistema`.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from services.ciak_andrea_chat import (  # noqa: F401  (riesportati per l'endpoint)
    MSG_MAX, MSG_MIN, STORICO_AL_MODELLO, STORICO_SALVATO, messaggi_per_llm, valida_messaggio,
)
from services.ciak_sollecito import giorni_da

MAX_RIGHE = 15

AGENTI = {
    "carlo": {
        "nome": "CARLO", "ruolo": "responsabile Acquisizione AI di Ciak",
        "ambito": "lead, questionari, report senza call e recuperi di chi si e' fermato nel percorso gratuito",
        "altri": "per proposte e trattative indica Marco, per i partner Valentina, per i contenuti Andrea",
    },
    "marco": {
        "nome": "MARCO", "ruolo": "responsabile Vendite AI di Ciak",
        "ambito": "proposte, trattative ferme, solleciti e prossimi passi con data",
        "altri": "per lead e recuperi indica Carlo, per i partner Valentina, per i contenuti Andrea",
    },
    "valentina": {
        "nome": "VALENTINA", "ruolo": "responsabile Back-office AI di Ciak",
        "ambito": "percorso dei partner, passi completati e compiti aperti",
        "altri": "per vendite indica Marco, per lead Carlo, per i contenuti Andrea",
    },
}


def _righe(titolo: str, righe: list[str], vuoto: str) -> str:
    return titolo + "\n" + ("\n".join(righe) if righe else vuoto)


def contesto_carlo(candidati: list[dict]) -> str:
    righe = [
        f"- {c.get('nome') or 'Senza nome'}: {c.get('motivo_label') or c.get('motivo')}, fermo da {c.get('giorni')} giorni"
        for c in candidati[:MAX_RIGHE]
    ]
    testa = f"Persone da recuperare oggi nel funnel gratuito: {len(candidati)} in totale."
    return _righe(testa + (" Le prime:" if righe else ""), righe, "Nessuna persona risulta da recuperare adesso.")


def contesto_marco(proposte: list[dict], passi: list[dict], now: Optional[datetime] = None) -> str:
    aperte = [p for p in proposte if not p.get("pagamento_completato") and p.get("stato") != "contratto_firmato"]
    righe = []
    for p in aperte[:MAX_RIGHE]:
        sent = giorni_da(p.get("creato_at"), now)
        visto = giorni_da(p.get("visto_at"), now)
        quando = f"inviata {sent} giorni fa" if sent is not None else "data di invio non registrata"
        aperta = f", aperta {visto} giorni fa" if visto is not None else ", non risulta aperta"
        righe.append(f"- {p.get('prospect_nome') or 'Senza nome'}: stato {p.get('stato') or 'sconosciuto'}, {quando}{aperta}")
    pr = [f"- {s.get('nome') or s.get('email')}: {s.get('testo')} (entro il {s.get('scadenza')})" for s in passi[:MAX_RIGHE]]
    return (
        _righe(f"Proposte non ancora pagate o firmate: {len(aperte)}.", righe, "Nessuna proposta aperta.")
        + "\n\n" + _righe("Prossimi passi aperti:", pr, "Nessun prossimo passo impostato.")
    )


def contesto_valentina(avvisi: list[dict], compiti: list[dict]) -> str:
    av = [
        f"- {a.get('partner_nome') or 'Partner'}: ha completato \"{a.get('step_label') or a.get('step_id')}\""
        + (f"; prossimo passo del percorso: {a['prossimo']}" if a.get("prossimo") else "")
        for a in avvisi[:MAX_RIGHE]
    ]
    co = [
        f"- {c.get('partner_nome') or 'Partner'}: {c.get('testo')}"
        + (f" (entro il {c['scadenza']}, {c['stato_scadenza']})" if c.get("scadenza") else "")
        for c in compiti[:MAX_RIGHE]
    ]
    return (
        _righe(f"Passi completati di recente non ancora visti: {len(avvisi)}.", av, "Nessun avviso nuovo.")
        + "\n\n" + _righe(f"Compiti aperti sui partner: {len(compiti)}.", co, "Nessun compito aperto.")
    )


def prompt_sistema(agente: str, contesto: str, memoria: str = "") -> str:
    a = AGENTI[agente]
    s = (
        f"Sei {a['nome']}, {a['ruolo']}. Parli con Claudio Bertogliatti, il fondatore. "
        f"Ti occupi di {a['ambito']}.\n\n"
        "REGOLE (non derogabili):\n"
        "- Rispondi in italiano, dai del tu, diretto e pratico. Verdetto o proposta prima, ragioni dopo.\n"
        "- Usa SOLO i fatti del contesto e quelli che Claudio ti scrive. Non inventare numeri, nomi, "
        "date, esiti o promesse. Se un dato manca, dillo e indica dove si trova in Ciak.\n"
        "- Tu consigli: non hai strumenti, non invii email, non modifichi nulla. Non dire mai di aver "
        "fatto qualcosa. Le azioni le fa Claudio dai pannelli di Ciak (bozze con «Invia», passi, compiti).\n"
        f"- Se la richiesta riguarda un altro reparto, rispondi per quanto sai e {a['altri']}.\n\n"
        f"CONTESTO ATTUALE (letto da Ciak ora):\n{contesto}\n"
    )
    if memoria:
        s += "\n" + memoria
    return s
