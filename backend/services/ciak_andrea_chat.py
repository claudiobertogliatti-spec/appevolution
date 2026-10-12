"""
Chat con ANDREA (Contenuti e prova sociale). Legge e consiglia, non esegue.

Andrea non ha strumenti: non pubblica, non invia, non modifica. Il suo contesto vivo e' limitato a
cio' che si verifica nei dati: i partner attivi con revenue registrata (candidati a caso studio),
così come stanno scritti in `partners`. Per tutto il resto usa il messaggio di Claudio e la
Memoria Ciak; se manca un dato lo dice.

Funzioni pure: `valida_messaggio`, `contesto_casi`, `prompt_sistema`, `messaggi_per_llm`.
"""
from __future__ import annotations

from typing import Optional

MSG_MIN, MSG_MAX = 1, 3000
STORICO_AL_MODELLO = 20
STORICO_SALVATO = 100
MAX_CANDIDATI = 10


def valida_messaggio(testo) -> str:
    if not isinstance(testo, str):
        raise ValueError("Scrivi un messaggio.")
    testo = testo.strip()
    if not (MSG_MIN <= len(testo) <= MSG_MAX):
        raise ValueError(f"Il messaggio deve avere tra {MSG_MIN} e {MSG_MAX} caratteri.")
    return testo


def _num(v) -> Optional[float]:
    try:
        n = float(v)
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None


def contesto_casi(partners: list[dict]) -> str:
    """Partner attivi con revenue registrata > 0, dal maggiore. Testo semplice per Andrea."""
    righe = []
    candidati = []
    for p in partners:
        if (p.get("stato") or "attivo") != "attivo":
            continue
        rev = _num(p.get("revenue"))
        if rev is None:
            continue
        candidati.append((rev, p))
    candidati.sort(key=lambda x: x[0], reverse=True)
    for rev, p in candidati[:MAX_CANDIDATI]:
        niche = f", ambito: {p['niche']}" if p.get("niche") else ""
        righe.append(f"- {p.get('name') or 'Partner senza nome'}{niche}, revenue registrata: {rev:g} euro")
    if not righe:
        return "Nessun partner attivo ha una revenue registrata: al momento non ci sono casi studio documentabili nei dati."
    return ("Partner attivi con revenue registrata (dato come scritto nei dati di Ciak, non verificato da te):\n"
            + "\n".join(righe))


def prompt_sistema(contesto: str, memoria: str = "") -> str:
    s = (
        "Sei ANDREA, il responsabile Contenuti e Prova sociale AI di Ciak. Parli con Claudio Bertogliatti, "
        "il fondatore. Ti occupi di copy, social, SEO e di trasformare i risultati dei partner in fiducia.\n\n"
        "REGOLE (non derogabili):\n"
        "- Rispondi in italiano, dai del tu, diretto e pratico. Verdetto o proposta prima, ragioni dopo.\n"
        "- Usa SOLO i fatti del contesto e quelli che Claudio ti scrive. Non inventare risultati, cifre, "
        "testimonianze, nomi, premi o scadenze. Se un dato manca, dillo e indica come ottenerlo.\n"
        "- Tu consigli e scrivi bozze: non hai strumenti, non pubblichi, non invii, non modifichi nulla. "
        "Non dire mai di aver fatto qualcosa.\n"
        "- Un risultato di un partner si usa come prova sociale solo se e' documentabile e il partner "
        "ha dato il consenso: ricordalo quando proponi un caso studio.\n"
        "- Se la richiesta riguarda un altro reparto, rispondi per quanto sai e indica il collega giusto.\n\n"
        f"CONTESTO ATTUALE:\n{contesto}\n"
    )
    if memoria:
        s += "\n" + memoria
    return s


def messaggi_per_llm(storico: list[dict], nuovo: str) -> list[dict]:
    msgs = [
        {"role": m["role"], "content": m["content"]}
        for m in storico[-STORICO_AL_MODELLO:]
        if m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str)
    ]
    msgs.append({"role": "user", "content": nuovo})
    return msgs
