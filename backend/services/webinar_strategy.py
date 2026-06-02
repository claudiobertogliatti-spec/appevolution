"""Strategia webinar + prezzo del corso (Step12 — Valida, agente Andrea).

Il webinar live è il motore di vendita ricorrente del partner (1/mese, dal Mese 2):
vende il videocorso con una promo a scadenza. Questo step produce:
  - lo SCRIPT del webinar in 6 fasi (apertura → problema → metodo → prove → offerta → Q&A/chiusura)
  - il PREZZO: listino + prezzo promo del webinar + scadenza + bonus a scadenza + razionale

I temi attingono dal Posizionamento (Step04) e dall'outline del corso (Step06):
nome corso, trasformazione, prezzo/formato dichiarato, bonus.

Sintesi AI (Anthropic tool-use) con fallback deterministico: lo step non si blocca mai.
Filtrato dalla brand voice Ciak: niente superlativi, frasi brevi, italiano semplice.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("WEBINAR_STRATEGY_MODEL", "claude-sonnet-4-6")

# Le 6 fasi del webinar sono FISSE (struttura bloccata): nome + obiettivo guida.
_FASI = [
    ("Apertura", "Aggancia: chi sei, cosa otterranno dal live, perché restare fino alla fine."),
    ("Il problema", "Nomina il problema vero e perché i tentativi soliti non funzionano."),
    ("Il metodo", "Mostra i passi del tuo sistema: il 'cosa', non tutto il 'come'."),
    ("Le prove", "Casi, numeri, testimonianze: rendi credibile che funziona."),
    ("L'offerta", "Presenta il corso, i bonus e il prezzo promo a scadenza."),
    ("Q&A e chiusura", "Sciogli le obiezioni, ricorda la scadenza, ultima call to action."),
]

_FASE_SCHEMA = {
    "type": "object",
    "properties": {
        "obiettivo": {"type": "string", "description": "Obiettivo concreto della fase."},
        "minuti": {"type": "string", "description": "Durata indicativa, es. '5-10 min'."},
        "cosa_dire": {"type": "string", "description": "I punti chiave da dire in questa fase."},
        "come_farlo": {"type": "string", "description": "Istruzione esecutiva semplice (slide, demo, tono)."},
    },
    "required": ["obiettivo", "minuti", "cosa_dire", "come_farlo"],
}

_PREZZO_SCHEMA = {
    "type": "object",
    "properties": {
        "listino": {"type": "string", "description": "Prezzo pieno del corso (es. '297€')."},
        "promo_webinar": {"type": "string", "description": "Prezzo speciale per chi compra dal webinar."},
        "scadenza_promo": {"type": "string", "description": "Quando scade la promo (es. 'entro 48h dal live')."},
        "bonus": {
            "type": "array",
            "items": {"type": "string"},
            "description": "2-3 bonus che si sbloccano solo comprando entro la scadenza.",
            "minItems": 2, "maxItems": 3,
        },
        "razionale": {"type": "string", "description": "Perché questo prezzo e questa promo, in 1-2 frasi."},
    },
    "required": ["listino", "promo_webinar", "scadenza_promo", "bonus", "razionale"],
}

_SCHEMA = {
    "type": "object",
    "properties": {
        "webinar": {
            "type": "object",
            "properties": {
                "titolo": {"type": "string", "description": "Titolo del webinar live (concreto, dice il risultato)."},
                "durata_min": {"type": "integer", "description": "Durata totale in minuti (60-90)."},
                "fasi": {
                    "type": "array",
                    "items": _FASE_SCHEMA,
                    "minItems": 6, "maxItems": 6,
                    "description": "Esattamente 6 fasi nell'ordine: Apertura, Il problema, Il metodo, Le prove, L'offerta, Q&A e chiusura.",
                },
            },
            "required": ["titolo", "durata_min", "fasi"],
        },
        "prezzo": _PREZZO_SCHEMA,
    },
    "required": ["webinar", "prezzo"],
}

_SYSTEM = (
    "Sei Andrea, il produttore di contenuti di Evolution PRO. Aiuti un partner a "
    "preparare il suo WEBINAR LIVE di vendita e il PREZZO del corso.\n"
    "RUOLO DEL WEBINAR (non negoziabile): è il motore di vendita ricorrente del "
    "partner (uno al mese, dal Mese 2). Vende il videocorso con una PROMO A SCADENZA: "
    "chi compra entro la scadenza paga meno e sblocca bonus. Fuori scadenza torna a listino.\n"
    "STRUTTURA DEL WEBINAR (6 fasi fisse):\n"
    "1. Apertura — aggancia e dichiara cosa otterranno; chiedi di restare fino alla fine.\n"
    "2. Il problema — nomina il problema vero e perché i metodi soliti falliscono.\n"
    "3. Il metodo — mostra i passi del sistema (il 'cosa', non l'intero 'come').\n"
    "4. Le prove — casi, numeri, testimonianze: rendi credibile.\n"
    "5. L'offerta — presenta corso + bonus + prezzo promo a scadenza.\n"
    "6. Q&A e chiusura — sciogli obiezioni, ricorda la scadenza, ultima CTA.\n"
    "PREZZO: proponi un listino coerente col formato dichiarato dal partner, un "
    "prezzo promo del webinar piu' basso, una scadenza breve (24-72h), e 2-3 bonus "
    "che si sbloccano solo entro la scadenza.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti (mai 'potente', 'incredibile', '10x', 'il migliore').\n"
    "- 'come_farlo' = istruzione esecutiva semplicissima per un partner poco pratico "
    "(es. 'Mostra 3 slide', 'Condividi lo schermo e fai la demo', 'Parla a camera').\n"
    "- Il titolo del webinar dice il risultato, non vende a vuoto.\n"
    "- Se il partner non ha dato un prezzo, proponi un range sensato e spiega il perche'."
)

# Chiavi del Posizionamento che alimentano la strategia.
_INPUT_KEYS = [
    "nicchia", "momento_di_vita", "promessa",
    "trasformazione_90gg", "prezzo_e_formato",
    "metodo_nome", "differenza_riconoscibile",
]


def _t(answers: dict, key: str, fallback: str = "") -> str:
    return (answers.get(key) or fallback).strip()


def _clean(s: Any) -> str:
    return " ".join(str(s or "").split())


def _normalize(out: dict) -> dict:
    """Porta l'output AI nella forma del frontend: 6 fasi fisse con nome bloccato."""
    web_in = out.get("webinar") or {}
    fasi_in = web_in.get("fasi") or []
    fasi = []
    for i, (nome_fix, obiettivo_fix) in enumerate(_FASI):
        src = fasi_in[i] if i < len(fasi_in) else {}
        fasi.append({
            "fase": nome_fix,
            "obiettivo": _clean(src.get("obiettivo")) or obiettivo_fix,
            "minuti": _clean(src.get("minuti")) or "—",
            "cosa_dire": _clean(src.get("cosa_dire")),
            "come_farlo": _clean(src.get("come_farlo")),
        })

    durata = web_in.get("durata_min")
    try:
        durata = int(durata)
    except (TypeError, ValueError):
        durata = 60

    prezzo_in = out.get("prezzo") or {}
    prezzo = {
        "listino": _clean(prezzo_in.get("listino")),
        "promo_webinar": _clean(prezzo_in.get("promo_webinar")),
        "scadenza_promo": _clean(prezzo_in.get("scadenza_promo")) or "entro 48h dal live",
        "bonus": [_clean(b) for b in (prezzo_in.get("bonus") or []) if _clean(b)][:3],
        "razionale": _clean(prezzo_in.get("razionale")),
    }

    return {
        "webinar": {
            "titolo": _clean(web_in.get("titolo")),
            "durata_min": durata,
            "fasi": fasi,
        },
        "prezzo": prezzo,
        "source": "ai",
    }


def _deterministic(answers: dict, outline: dict | None) -> dict:
    """Fallback senza AI: script webinar a 6 fasi + prezzo, dai dati del partner.
    Non si blocca mai: il partner non resta davanti a un foglio bianco."""
    nicchia = _t(answers, "nicchia", "il tuo cliente ideale")
    metodo = _t(answers, "metodo_nome", "il tuo metodo")
    trasf = _t(answers, "trasformazione_90gg", "il risultato che prometti")
    prezzo_dichiarato = _t(answers, "prezzo_e_formato")
    corso = _clean((outline or {}).get("course_name")) or "il tuo corso"
    bonus_outline = [_clean(b) for b in ((outline or {}).get("bonus") or []) if _clean(b)]

    fasi_src = [
        ("5-10 min", f"Presentati e dichiara cosa porteranno a casa stasera su {trasf}.",
         "Parla a camera, niente slide: crea connessione e di' di restare fino alla fine."),
        ("10-15 min", f"Descrivi il problema vero di {nicchia} e perché i tentativi soliti falliscono.",
         "3-4 slide con il problema, una verità per slide."),
        ("15-20 min", f"Mostra i passi di {metodo}: il 'cosa', non tutto il 'come'.",
         "Condividi lo schermo, 1 slide per passo."),
        ("10 min", "Porta 1-2 casi o testimonianze concrete con numeri.",
         "Mostra screenshot dei risultati e racconta la storia."),
        ("10-15 min", f"Presenta {corso}, i bonus e il prezzo promo a scadenza.",
         "Slide con offerta chiara: prezzo, cosa include, scadenza, link."),
        ("10 min", "Rispondi alle obiezioni, ricorda la scadenza, ultima call to action.",
         "Leggi le domande in chat, ripeti il link e il countdown."),
    ]
    fasi = []
    for (nome, obiettivo), (minuti, cosa, come) in zip(_FASI, fasi_src):
        fasi.append({
            "fase": nome,
            "obiettivo": obiettivo,
            "minuti": minuti,
            "cosa_dire": cosa,
            "come_farlo": come,
        })

    bonus = bonus_outline[:3] or [
        "Sessione di domande e risposte di gruppo",
        "Template e strumenti operativi pronti",
    ]

    return {
        "webinar": {
            "titolo": f"Come arrivare a {trasf} — webinar live gratuito",
            "durata_min": 60,
            "fasi": fasi,
        },
        "prezzo": {
            "listino": prezzo_dichiarato or "297€",
            "promo_webinar": "197€",
            "scadenza_promo": "entro 48h dal live",
            "bonus": bonus,
            "razionale": "Prezzo promo solo per chi è al live: premia chi agisce subito e crea urgenza vera. Fuori scadenza si torna a listino.",
        },
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
    bonus_outline = [_clean(b) for b in ((outline or {}).get("bonus") or []) if _clean(b)]
    blocco_corso = ""
    if corso or bonus_outline:
        righe = "\n".join(f"  - {b}" for b in bonus_outline[:6])
        blocco_corso = (
            f"\n\nCorso del partner: {corso or '(senza nome)'}\n"
            + (f"Bonus già previsti nel corso:\n{righe}" if bonus_outline else "")
        )

    user = (
        f"Posizionamento del partner:\n{pos}{blocco_corso}\n\n"
        "Genera lo script del webinar live in 6 fasi (Apertura, Il problema, Il "
        "metodo, Le prove, L'offerta, Q&A e chiusura) con obiettivo, minuti, cosa "
        "dire e come farlo per ciascuna; più il prezzo: listino, prezzo promo del "
        "webinar, scadenza, 2-3 bonus a scadenza e il razionale."
    )

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "webinar_strategy",
        "description": "Restituisci lo script del webinar e il prezzo strutturati.",
        "input_schema": _SCHEMA,
    }
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=3000,
        system=[{"type": "text", "text": _SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "webinar_strategy"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    web = out.get("webinar")
    if not isinstance(web, dict):
        return False
    fasi = web.get("fasi")
    if not isinstance(fasi, list) or len(fasi) < 4:
        return False
    if not isinstance(out.get("prezzo"), dict):
        return False
    return True


async def build_webinar_strategy(answers: dict, outline: dict | None = None) -> dict:
    """Ritorna {webinar:{titolo, durata_min, fasi:[...]}, prezzo:{...}, source}.

    Prova la sintesi AI; in caso di qualunque errore o output incompleto ricade
    sullo scheletro deterministico. Non solleva mai: lo step non deve mai bloccarsi.
    """
    try:
        out = await asyncio.to_thread(_call_claude, answers, outline)
        if _valid(out):
            return _normalize(out)
        logger.warning("[WEBINAR] Strategia AI incompleta — uso scheletro deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[WEBINAR] Strategia AI fallita ({e}) — uso scheletro deterministico")
    return _deterministic(answers, outline)
