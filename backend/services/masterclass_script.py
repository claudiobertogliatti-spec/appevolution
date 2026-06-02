"""Script della masterclass on-demand del partner (Step05 — Valida, agente Andrea).

La masterclass è il motore di traffico TOF: evergreen, on-demand, ~30 minuti.
Il suo scopo NON è vendere ma portare lo spettatore DENTRO il funnel (guarda →
lascia il contatto → entra nella sequenza). Questo step produce lo script pronto
da registrare, in 7 blocchi:
  Apertura → Il problema → L'errore comune → Il metodo → L'esempio →
  Transizione (ponte al funnel) → Chiusura / CTA

I temi attingono dal Posizionamento (Step04) e dall'outline del corso (Step06).

Sintesi AI (Anthropic tool-use) con fallback deterministico: lo step non si blocca mai.
Filtrato dalla brand voice Ciak: niente superlativi, frasi brevi, italiano semplice.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("MASTERCLASS_SCRIPT_MODEL", "claude-sonnet-4-6")

# I 7 blocchi sono FISSI (struttura bloccata): nome + obiettivo guida.
_BLOCCHI = [
    ("Apertura", "Aggancia nei primi secondi e dichiara cosa impareranno; chiedi di restare."),
    ("Il problema", "Nomina il problema vero del pubblico, quello che sentono ogni giorno."),
    ("L'errore comune", "Spiega perché i tentativi soliti non funzionano: sposti la colpa dal pubblico al metodo sbagliato."),
    ("Il metodo", "Mostra la soluzione passo-passo: il cuore della masterclass, il 'cosa' del tuo metodo."),
    ("L'esempio", "Porta un caso concreto che rende credibile che funziona."),
    ("Transizione", "Fai il ponte verso il funnel: non vendi, inviti a fare il prossimo passo gratuito."),
    ("Chiusura / CTA", "Ricapitola e chiudi con una call to action chiara verso il funnel."),
]

_BLOCCO_SCHEMA = {
    "type": "object",
    "properties": {
        "obiettivo": {"type": "string", "description": "Obiettivo concreto del blocco."},
        "minuti": {"type": "string", "description": "Durata indicativa, es. '3-5 min'."},
        "cosa_dire": {"type": "string", "description": "Lo script vero e proprio: cosa dire, pronto da leggere."},
        "come_farlo": {"type": "string", "description": "Istruzione esecutiva semplice (a camera, slide, demo, tono)."},
    },
    "required": ["obiettivo", "minuti", "cosa_dire", "come_farlo"],
}

_SCHEMA = {
    "type": "object",
    "properties": {
        "titolo": {"type": "string", "description": "Titolo della masterclass (concreto, dice il risultato)."},
        "durata_min": {"type": "integer", "description": "Durata totale in minuti (circa 30)."},
        "sezioni": {
            "type": "array",
            "items": _BLOCCO_SCHEMA,
            "minItems": 7, "maxItems": 7,
            "description": "Esattamente 7 blocchi nell'ordine: Apertura, Il problema, L'errore comune, Il metodo, L'esempio, Transizione, Chiusura / CTA.",
        },
    },
    "required": ["titolo", "durata_min", "sezioni"],
}

_SYSTEM = (
    "Sei Andrea, il produttore di contenuti di Evolution PRO. Aiuti un partner a "
    "scrivere lo script della sua MASTERCLASS on-demand, pronto da registrare.\n"
    "RUOLO DELLA MASTERCLASS (non negoziabile): è il motore di traffico in cima al "
    "funnel. È evergreen, on-demand, dura CIRCA 30 MINUTI (non è un evento live). Il "
    "suo scopo NON è vendere il corso: è dare valore vero e portare lo spettatore a "
    "fare il prossimo passo gratuito nel funnel (lasciare il contatto / iscriversi).\n"
    "STRUTTURA (7 blocchi fissi):\n"
    "1. Apertura — aggancia e dichiara cosa impareranno; chiedi di restare fino alla fine.\n"
    "2. Il problema — nomina il problema vero, quello che il pubblico sente ogni giorno.\n"
    "3. L'errore comune — perché i tentativi soliti falliscono (colpa del metodo, non loro).\n"
    "4. Il metodo — la soluzione passo-passo: il cuore, il 'cosa' del tuo metodo.\n"
    "5. L'esempio — un caso concreto che rende credibile.\n"
    "6. Transizione — ponte al funnel: niente vendita, invito al prossimo passo gratuito.\n"
    "7. Chiusura / CTA — ricapitola e chiudi con una call to action chiara.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti (mai 'potente', 'incredibile', '10x', 'il migliore').\n"
    "- 'cosa_dire' è lo script parlato vero, in prima persona, pronto da leggere a camera.\n"
    "- 'come_farlo' = istruzione esecutiva semplicissima (es. 'Parla a camera', "
    "'Mostra 3 slide', 'Condividi lo schermo e fai la demo').\n"
    "- Il titolo dice il risultato, non vende a vuoto.\n"
    "- Totale circa 30 minuti: tara la lunghezza dei blocchi di conseguenza."
)

# Chiavi del Posizionamento che alimentano lo script.
_INPUT_KEYS = [
    "nicchia", "momento_di_vita", "promessa",
    "trasformazione_90gg", "metodo_nome", "metodo_step",
    "prova_sociale_concreta", "differenza_riconoscibile",
]


def _t(answers: dict, key: str, fallback: str = "") -> str:
    return (answers.get(key) or fallback).strip()


def _clean(s: Any) -> str:
    return " ".join(str(s or "").split())


def _normalize(out: dict) -> dict:
    """Porta l'output AI nella forma del frontend: 7 blocchi fissi con nome bloccato."""
    sez_in = out.get("sezioni") or []
    sezioni = []
    for i, (nome_fix, obiettivo_fix) in enumerate(_BLOCCHI):
        src = sez_in[i] if i < len(sez_in) else {}
        sezioni.append({
            "blocco": nome_fix,
            "obiettivo": _clean(src.get("obiettivo")) or obiettivo_fix,
            "minuti": _clean(src.get("minuti")) or "—",
            "cosa_dire": _clean(src.get("cosa_dire")),
            "come_farlo": _clean(src.get("come_farlo")),
        })

    durata = out.get("durata_min")
    try:
        durata = int(durata)
    except (TypeError, ValueError):
        durata = 30

    return {
        "titolo": _clean(out.get("titolo")),
        "durata_min": durata,
        "sezioni": sezioni,
        "source": "ai",
    }


def _deterministic(answers: dict, outline: dict | None) -> dict:
    """Fallback senza AI: script masterclass a 7 blocchi dai dati del partner.
    Non si blocca mai: il partner non resta davanti a un foglio bianco."""
    nicchia = _t(answers, "nicchia", "il tuo cliente ideale")
    metodo = _t(answers, "metodo_nome", "il tuo metodo")
    trasf = _t(answers, "trasformazione_90gg", "il risultato che prometti")
    prova = _t(answers, "prova_sociale_concreta")
    corso = _clean((outline or {}).get("course_name")) or "il tuo corso"

    sez_src = [
        ("2-3 min",
         f"Ciao, sono qui per mostrarti come arrivare a {trasf}. Nei prossimi 30 minuti ti spiego il metodo passo passo. Resta fino alla fine: alla fine ti dico come fare il primo passo.",
         "Parla a camera, niente slide: crea connessione."),
        ("4-6 min",
         f"Il problema vero di {nicchia} è questo: ci si muove a tentativi, senza un sistema. Un mese va, il mese dopo no.",
         "A camera, tono diretto. Una slide con il problema."),
        ("4-6 min",
         "L'errore non è tuo: è che ti hanno insegnato tattiche scollegate, non un metodo. Per questo non resta niente.",
         "1-2 slide: 'cosa fanno tutti' vs 'cosa serve davvero'."),
        ("8-10 min",
         f"Ecco {metodo}, passo per passo. Ti mostro il 'cosa', i passaggi chiave nell'ordine giusto.",
         "Condividi lo schermo, 1 slide per passo."),
        ("3-4 min",
         f"Un esempio concreto: {prova or 'un caso reale che ha applicato il metodo e ha ottenuto il risultato'}.",
         "Mostra screenshot/risultati e racconta la storia."),
        ("2-3 min",
         "Se vuoi andare oltre la teoria e applicarlo al tuo caso, ho preparato il prossimo passo gratuito qui sotto.",
         "A camera, indica il link/pulsante sotto al video."),
        ("1-2 min",
         f"Ricapitolando: il problema, l'errore, il metodo. Adesso tocca a te: fai il primo passo verso {trasf}. Ci vediamo dall'altra parte.",
         "A camera, chiusura calda + ripeti la CTA."),
    ]
    sezioni = []
    for (nome, obiettivo), (minuti, cosa, come) in zip(_BLOCCHI, sez_src):
        sezioni.append({
            "blocco": nome,
            "obiettivo": obiettivo,
            "minuti": minuti,
            "cosa_dire": cosa,
            "come_farlo": come,
        })

    return {
        "titolo": f"Come arrivare a {trasf} — masterclass gratuita",
        "durata_min": 30,
        "sezioni": sezioni,
        "source": "fallback",
    }


def _call_claude(answers: dict, outline: dict | None) -> dict:
    """Chiamata sincrona Anthropic tool-use. Solleva eccezione in caso di errore."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    pos = "\n".join(
        f"- {k}: {(answers.get(k) or '').strip()}"
        for k in _INPUT_KEYS if (answers.get(k) or "").strip()
    )
    corso = _clean((outline or {}).get("course_name"))
    trasf_corso = ""
    mods = (outline or {}).get("modules") or []
    if mods:
        titoli = [_clean(m.get("titolo")) for m in mods[:8] if _clean(m.get("titolo"))]
        if titoli:
            righe = "\n".join(f"  - {t}" for t in titoli)
            trasf_corso = f"\nModuli del corso (per orientare il metodo):\n{righe}"
    blocco_corso = ""
    if corso or trasf_corso:
        blocco_corso = f"\n\nCorso del partner: {corso or '(senza nome)'}{trasf_corso}"

    user = (
        f"Posizionamento del partner:\n{pos}{blocco_corso}\n\n"
        "Scrivi lo script della masterclass on-demand (~30 min) in 7 blocchi "
        "(Apertura, Il problema, L'errore comune, Il metodo, L'esempio, Transizione, "
        "Chiusura / CTA) con obiettivo, minuti, cosa dire (script parlato pronto da "
        "leggere) e come farlo per ciascuno. Più il titolo e la durata totale."
    )

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "masterclass_script",
        "description": "Restituisci lo script della masterclass strutturato.",
        "input_schema": _SCHEMA,
    }
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=4000,
        system=[{"type": "text", "text": _SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "masterclass_script"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    sez = out.get("sezioni")
    if not isinstance(sez, list) or len(sez) < 5:
        return False
    if not (out.get("titolo") or "").strip():
        return False
    return True


async def build_masterclass_script(answers: dict, outline: dict | None = None) -> dict:
    """Ritorna {titolo, durata_min, sezioni:[...], source}.

    Prova la sintesi AI; in caso di qualunque errore o output incompleto ricade
    sullo scheletro deterministico. Non solleva mai: lo step non deve mai bloccarsi.
    """
    try:
        out = await asyncio.to_thread(_call_claude, answers, outline)
        if _valid(out):
            return _normalize(out)
        logger.warning("[MASTERCLASS] Script AI incompleto — uso scheletro deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[MASTERCLASS] Script AI fallito ({e}) — uso scheletro deterministico")
    return _deterministic(answers, outline)
