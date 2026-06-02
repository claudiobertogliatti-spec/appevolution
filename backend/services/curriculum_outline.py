"""Bozza AI della scaletta del corso (Step06) dalle risposte del Posizionamento.

Struttura derivata dal workbook Ulama "Crea Corso" (sezione ③ Schema & Piano d'azione):
  - 5-8 moduli, ciascuno con titolo + trasformazione
  - ogni modulo = Intro + L1..L4 + Outro (lezioni con delivery: Video/PDF/Email/Live)
  - 2 ospiti esperti (opzionale)
  - 3 bonus (sciolgono le obiezioni all'acquisto)
  - nome corso + 3 nomi alternativi

Sintesi AI (Anthropic tool-use) con fallback deterministico: lo step non si blocca mai.
Filtrato dalla brand voice Ciak: niente superlativi, frasi brevi, italiano semplice.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("CURRICULUM_OUTLINE_MODEL", "claude-sonnet-4-6")

DELIVERY_VALUES = ["Video", "PDF", "Email", "Live"]

_SYSTEM = (
    "Sei Andrea, il produttore di contenuti di Evolution PRO. Aiuti un partner a "
    "trasformare il suo posizionamento nella scaletta completa di un corso online.\n"
    "Usi il modello a moduli: ogni modulo porta una trasformazione concreta e si "
    "scompone in Intro + 4 lezioni + Outro.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti (mai 'potente', 'incredibile', '10x', 'il migliore').\n"
    "- Titoli brevi e concreti: dicono cosa impari, non vendono.\n"
    "- Usa 'percorso' invece di 'funnel', 'ambito specifico' invece di 'nicchia'.\n"
    "- La trasformazione di ogni modulo è un passaggio di stato del cliente "
    "('da X a Y'), non un elenco di argomenti.\n"
    "- Le 4 lezioni di ogni modulo sono passi logici: l'ultima è quasi sempre "
    "un'azione pratica che il partner fa fare allo studente.\n"
    "REGOLE DI STRUTTURA:\n"
    "- Decidi tu quanti moduli servono: minimo 5, massimo 8. Scegli in base "
    "all'ampiezza della trasformazione, non per riempire.\n"
    "- Il primo modulo posa le fondamenta, l'ultimo è un piano d'azione "
    "dei primi 90 giorni.\n"
    "- Ogni delivery è uno tra: Video, PDF, Email, Live. La maggioranza Video.\n"
    "- I 3 bonus rispondono a 3 obiezioni diverse all'acquisto.\n"
    "- Il nome del corso fa capire il risultato finale; proponi 3 alternative brevi."
)

_LESSON_SCHEMA = {
    "type": "object",
    "properties": {
        "titolo": {"type": "string", "description": "Titolo breve e concreto della lezione."},
        "delivery": {"type": "string", "enum": DELIVERY_VALUES, "description": "Formato: Video/PDF/Email/Live."},
    },
    "required": ["titolo", "delivery"],
}

_MODULE_SCHEMA = {
    "type": "object",
    "properties": {
        "titolo": {"type": "string", "description": "Titolo del modulo."},
        "trasformazione": {"type": "string", "description": "Passaggio di stato del cliente ('da X a Y')."},
        "lezioni": {
            "type": "array",
            "description": "Esattamente 4 lezioni centrali (oltre a Intro e Outro generati a parte).",
            "items": _LESSON_SCHEMA,
            "minItems": 4,
            "maxItems": 4,
        },
    },
    "required": ["titolo", "trasformazione", "lezioni"],
}

_SCHEMA = {
    "type": "object",
    "properties": {
        "course_name": {"type": "string", "description": "Nome del corso proposto."},
        "alt_names": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Esattamente 3 nomi alternativi brevi.",
            "minItems": 3, "maxItems": 3,
        },
        "modules": {
            "type": "array",
            "items": _MODULE_SCHEMA,
            "minItems": 5, "maxItems": 8,
            "description": "Da 5 a 8 moduli.",
        },
        "ospiti": {
            "type": "array",
            "items": {"type": "string"},
            "description": "0-2 idee di ospiti esperti (frase breve: chi + su cosa).",
            "maxItems": 2,
        },
        "bonus": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Esattamente 3 bonus, ognuno scioglie un'obiezione diversa.",
            "minItems": 3, "maxItems": 3,
        },
    },
    "required": ["course_name", "alt_names", "modules", "bonus"],
}

# Chiavi del Posizionamento che alimentano la bozza.
_INPUT_KEYS = [
    "nicchia", "momento_di_vita", "livello_consapevolezza",
    "promessa", "trasformazione_90gg", "prezzo_e_formato",
    "metodo_nome", "metodo_step", "prova_sociale_concreta",
    "spazio_specialista", "differenza_riconoscibile",
]


def _t(answers: dict, key: str, fallback: str = "") -> str:
    return (answers.get(key) or fallback).strip()


def _clean(s: Any) -> str:
    return " ".join(str(s or "").split())


def _intro(num: int) -> dict:
    return {"pill": "Intro", "titolo": f"Cosa vedrai nel modulo {num}", "delivery": "Video"}


def _outro() -> dict:
    return {"pill": "Outro", "titolo": "Cosa hai ottenuto + prossimo passo", "delivery": "Video"}


def _wrap_lessons(core: list[dict], num: int) -> list[dict]:
    """Aggiunge Intro/Outro e i pill L1..L4 alle 4 lezioni centrali."""
    out = [_intro(num)]
    for j, lez in enumerate(core[:4]):
        out.append({
            "pill": f"L{j + 1}",
            "titolo": _clean(lez.get("titolo")) or f"Lezione {j + 1}",
            "delivery": lez.get("delivery") if lez.get("delivery") in DELIVERY_VALUES else "Video",
        })
    # Garantisce 4 lezioni anche se il modello ne manda meno
    for j in range(len(core), 4):
        out.append({"pill": f"L{j + 1}", "titolo": f"Lezione {j + 1}", "delivery": "Video"})
    out.append(_outro())
    return out


def _normalize(out: dict) -> dict:
    """Porta l'output AI nella forma che il frontend consuma (con Intro/Outro espansi)."""
    modules = []
    for i, m in enumerate(out.get("modules", [])):
        modules.append({
            "titolo": _clean(m.get("titolo")) or f"Modulo {i + 1}",
            "trasformazione": _clean(m.get("trasformazione")),
            "lezioni": _wrap_lessons(m.get("lezioni") or [], i + 1),
        })
    return {
        "course_name": _clean(out.get("course_name")),
        "alt_names": [_clean(a) for a in (out.get("alt_names") or [])][:3],
        "modules": modules,
        "ospiti": [_clean(o) for o in (out.get("ospiti") or [])][:2],
        "bonus": [_clean(b) for b in (out.get("bonus") or [])][:3],
        "source": "ai",
    }


def _deterministic(answers: dict) -> dict:
    """Fallback senza AI: scheletro di 6 moduli con Intro/L1-L4/Outro pre-strutturati.

    Costruito dal metodo e dalla trasformazione del partner. Non si blocca mai:
    il partner non resta davanti a un foglio bianco.
    """
    metodo = _t(answers, "metodo_nome", "Il tuo metodo")
    nicchia = _t(answers, "nicchia", "il tuo cliente")
    trasf = _t(answers, "trasformazione_90gg", "il risultato che prometti")

    titoli = [
        ("Fondamenta", f"Capisci dove {nicchia} perde tempo oggi"),
        ("Il messaggio che ti fa scegliere", "Sai dire in 1 frase perché tu"),
        (f"Il sistema: {metodo}", "Hai un metodo che gira ogni settimana"),
        ("Metterlo in pratica", "Applichi i passi al tuo caso"),
        ("Far girare tutto senza impazzire", "Lavori con ordine, non in emergenza"),
        ("I primi 90 giorni", f"Parti con un piano verso: {trasf}"),
    ]
    modules = []
    for i, (titolo, trasformazione) in enumerate(titoli):
        core = [
            {"titolo": "Il concetto chiave di questo modulo", "delivery": "Video"},
            {"titolo": "Come si applica al tuo caso", "delivery": "Video"},
            {"titolo": "L'errore più comune da evitare", "delivery": "Video"},
            {"titolo": "Esercizio pratico: fallo adesso", "delivery": "PDF"},
        ]
        modules.append({
            "titolo": titolo,
            "trasformazione": trasformazione,
            "lezioni": _wrap_lessons(core, i + 1),
        })

    return {
        "course_name": f"{metodo} — il percorso completo" if metodo != "Il tuo metodo" else "Il tuo corso",
        "alt_names": ["Il Protocollo", "Il Sistema Completo", "Da zero a risultato"],
        "modules": modules,
        "ospiti": [],
        "bonus": [
            "Workbook con tutti gli esercizi pronti da compilare",
            "Template e strumenti operativi da copiare",
            "Sessione di domande e risposte di gruppo",
        ],
        "source": "fallback",
    }


def _call_claude(answers: dict) -> dict:
    """Chiamata sincrona Anthropic tool-use. Solleva eccezione in caso di errore."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    payload = "\n".join(
        f"- {k}: {(answers.get(k) or '').strip()}"
        for k in _INPUT_KEYS if (answers.get(k) or "").strip()
    )
    user = (
        f"Posizionamento del partner:\n{payload}\n\n"
        "Genera la scaletta del corso: nome + 3 alternative, 5-8 moduli "
        "(ognuno con titolo, trasformazione e 4 lezioni con delivery), "
        "fino a 2 ospiti e 3 bonus."
    )

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "curriculum_outline",
        "description": "Restituisci la scaletta del corso strutturata.",
        "input_schema": _SCHEMA,
    }
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=2500,
        system=[{"type": "text", "text": _SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "curriculum_outline"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    mods = out.get("modules")
    if not isinstance(mods, list) or not (5 <= len(mods) <= 8):
        return False
    if not (out.get("course_name") or "").strip():
        return False
    for m in mods:
        if not isinstance(m, dict) or not (m.get("titolo") or "").strip():
            return False
    return True


async def build_curriculum_outline(answers: dict) -> dict:
    """Ritorna la scaletta strutturata {course_name, alt_names, modules, ospiti, bonus, source}.

    Prova la sintesi AI; in caso di qualunque errore o output incompleto ricade
    sullo scheletro deterministico. Non solleva mai: lo step non deve mai bloccarsi.
    """
    try:
        out = await asyncio.to_thread(_call_claude, answers)
        if _valid(out):
            return _normalize(out)
        logger.warning("[OUTLINE] Bozza AI incompleta — uso scheletro deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[OUTLINE] Bozza AI fallita ({e}) — uso scheletro deterministico")
    return _deterministic(answers)
