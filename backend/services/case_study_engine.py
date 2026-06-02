"""Case-study engine — impacchetta il risultato di UNO studente in un caso studio
pronto da pubblicare, in voce Ciak. Fase Ottimizza (la "macchina di prova").

A zero non hai testimonianze: un caso studio vero vale piu di 100 post. Questo motore
e' il pezzo che App Ciak possiede: prende il risultato grezzo di uno studente (raccolto
via Survey Systeme o inserito a mano dal team) e lo trasforma in un caso studio
strutturato — headline, racconto prima/dopo, citazione ripulita, prova, CTA — riusabile
nel webinar, nei contenuti e nella pagina vendite.

Cosa NON fa: la RACCOLTA. La raccolta vive su Systeme (Survey -> tag -> automation).
Limite noto: Systeme non fa upload di file -> la prova VISIVA (screenshot) si raccoglie
a parte (ripiego). Qui si lavora sul testo; il campo prova_visiva e' solo un riferimento.

AI tool-use (Anthropic) con fallback deterministico: non si blocca mai.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("CASE_STUDY_MODEL", "claude-sonnet-4-6")

_SYSTEM = (
    "Sei l'editor di Evolution PRO. Trasformi il risultato grezzo di UNO studente di "
    "un'accademia in un CASO STUDIO breve, vero e pronto da pubblicare, in voce Ciak.\n"
    "REGOLE (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice, diretto, onesto. Zero hype.\n"
    "- Mai superlativi assoluti ne' promesse di guadagno garantito ('ricco', 'facile', "
    "'10x', 'il migliore', 'risultato garantito').\n"
    "- Usa SOLO i fatti che ti vengono dati. Non inventare numeri, nomi o dettagli.\n"
    "- Se un dato manca, scrivi in modo generico senza inventarlo.\n"
    "- La citazione: ripuliscila (refusi, sintassi) ma NON cambiarne il senso ne' gonfiarla.\n"
    "- 'headline' = una frase concreta sul cambiamento, non uno slogan.\n"
    "- 'prima' = la situazione di partenza in 1-2 frasi. 'dopo' = il risultato in 1-2 frasi.\n"
    "- 'racconto' = 3-5 frasi che legano prima -> percorso -> dopo, tono umano.\n"
    "- 'cta' = un invito sobrio coerente (es. 'Guarda come funziona il percorso').\n"
)

_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string", "description": "Frase concreta sul cambiamento dello studente."},
        "prima": {"type": "string", "description": "Situazione di partenza, 1-2 frasi."},
        "dopo": {"type": "string", "description": "Risultato ottenuto, 1-2 frasi."},
        "racconto": {"type": "string", "description": "3-5 frasi: prima -> percorso -> dopo."},
        "citazione": {"type": "string", "description": "La citazione dello studente, ripulita ma fedele."},
        "prova": {"type": "string", "description": "La prova concreta menzionata (numero, tempo, fatto). Vuoto se assente."},
        "cta": {"type": "string", "description": "Invito sobrio coerente col caso."},
    },
    "required": ["headline", "prima", "dopo", "racconto", "citazione", "cta"],
}

_RISULTATO_KEYS = ["nome", "prima", "dopo", "citazione", "tempo", "prova"]


def _clean(s: Any) -> str:
    return " ".join(str(s or "").split())


def _deterministic(partner: dict, risultato: dict) -> dict:
    """Scheletro senza AI: monta i fatti dati in una forma pubblicabile, senza inventare."""
    nome = _clean(risultato.get("nome")) or "Uno studente"
    prima = _clean(risultato.get("prima")) or "Partiva da zero, senza un sistema."
    dopo = _clean(risultato.get("dopo")) or "Ha ottenuto i suoi primi risultati concreti."
    tempo = _clean(risultato.get("tempo"))
    citazione = _clean(risultato.get("citazione"))
    prova = _clean(risultato.get("prova")) or (f"Risultato in {tempo}." if tempo else "")
    metodo = _clean(partner.get("metodo") or partner.get("niche") or "il percorso")

    tempo_frase = f" In {tempo}," if tempo else ""
    racconto = (
        f"{nome} è arrivato con una situazione chiara da sbloccare: {prima.rstrip('.')}.{tempo_frase} "
        f"seguendo {metodo} passo dopo passo, è arrivato al risultato: {dopo.rstrip('.')}. "
        "Non una scorciatoia: un percorso fatto con costanza."
    )

    return {
        "headline": f"Da «{prima.rstrip('.')}» a «{dopo.rstrip('.')}»",
        "prima": prima,
        "dopo": dopo,
        "racconto": racconto,
        "citazione": citazione or f"«{dopo.rstrip('.')}.»",
        "prova": prova,
        "cta": "Guarda come funziona il percorso",
        "source": "fallback",
    }


def _call_claude(partner: dict, risultato: dict) -> dict:
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    fatti = "\n".join(
        f"- {k}: {_clean(risultato.get(k))}" for k in _RISULTATO_KEYS if _clean(risultato.get(k))
    )
    ctx = "\n".join(
        f"- {k}: {_clean(partner.get(k))}"
        for k in ("name", "niche", "metodo", "trasformazione") if _clean(partner.get(k))
    )
    user = (
        f"Contesto del partner (accademia):\n{ctx or '- (nessun contesto)'}\n\n"
        f"Risultato grezzo dello studente:\n{fatti or '- (pochi dati)'}\n\n"
        "Impacchetta questo in un caso studio in voce Ciak, usando SOLO i fatti dati."
    )

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "case_study",
        "description": "Restituisci il caso studio strutturato in voce Ciak.",
        "input_schema": _SCHEMA,
    }
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=1500,
        system=[{"type": "text", "text": _SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "case_study"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    return all(_clean(out.get(k)) for k in ("headline", "prima", "dopo", "racconto"))


def _normalize(out: dict) -> dict:
    keys = ("headline", "prima", "dopo", "racconto", "citazione", "prova", "cta")
    norm = {k: _clean(out.get(k)) for k in keys}
    norm["source"] = "ai"
    return norm


async def build_case_study(partner: dict, risultato: dict) -> dict:
    """Ritorna il caso studio impacchettato {headline, prima, dopo, racconto, citazione, prova, cta, source}.

    Prova l'AI; in caso di errore o output incompleto ricade sullo scheletro deterministico
    che NON inventa nulla. Non solleva mai.
    """
    try:
        out = await asyncio.to_thread(_call_claude, partner, risultato)
        if _valid(out):
            return _normalize(out)
        logger.warning("[CASE] Caso studio AI incompleto — uso scheletro deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[CASE] Caso studio AI fallito ({e}) — uso scheletro deterministico")
    return _deterministic(partner, risultato)
