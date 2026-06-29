"""Ciclo Live 8 settimane — il motore ricorrente "una LIVE ogni 2 mesi" della fase Ottimizza.

Strategia: docs/strategy/playbook-partner-6-mesi.md, Sezione 6.
Lega il lancio (una tantum, fase Valida) al post-lancio (nutre). Una live gratuita ogni 2 mesi
= 6 eventi/anno = picchi di vendita prevedibili a costo zero. Costa zero (webcam + YouTube/IG
Live/Zoom), crea appuntamento, allena il partner.

Il ciclo da 8 settimane (ogni 2 mesi):
  - Sett 1-5  NUTRI    -> valore puro, nessuna vendita: costruisci il pubblico per il live.
  - Sett 6    ANNUNCIA -> apri le iscrizioni alla live (data + pagina iscrizione).
  - Sett 7    SCALDA   -> countdown e anticipazioni, alza l'attesa.
  - Sett 8    LIVE     -> la live: valore + offerta a tempo.
  - dopo      CHIUDI   -> replay, email, call, raccogli testimonianze -> riparte.

Incastro coi tre calendari (NON si sovrappongono):
  - Calendario lancio       = il primo evento (fase Valida, Mese 5).
  - Ciclo Live ogni 2 mesi  = il motore ricorrente (questo file, da Ottimizza in poi).
  - Calendario post-lancio  = il ponte di nutrimento TRA una live e l'altra.

Deliverable BASE = il piano (il ritmo), NON i contenuti scritti (quelli sono il servizio EXTRA).
Sintesi AI (Anthropic tool-use) con fallback deterministico: non si blocca mai.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Callable

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("LIVE_CYCLE_MODEL", "claude-sonnet-4-6")

# Le 5 fasi del ciclo, con le settimane che coprono (strategia bloccata).
_FASI = [
    ("Nutri", "Valore puro, nessuna vendita: costruisci il pubblico che verra alla live", (1, 5)),
    ("Annuncia", "Apri le iscrizioni alla live: data, pagina e motivo per esserci", (6, 6)),
    ("Scalda", "Countdown e anticipazioni: alza l'attesa e conferma gli iscritti", (7, 7)),
    ("Live", "La live: valore dal vivo + offerta a tempo", (8, 8)),
]

_SYSTEM = (
    "Sei Marco, lo stratega del lancio di Evolution PRO (Ciak). Costruisci per un partner gia "
    "online il CICLO LIVE DA 8 SETTIMANE: il motore ricorrente 'una live ogni 2 mesi' che porta "
    "picchi di vendita prevedibili a costo zero.\n"
    "Struttura bloccata, sempre 8 settimane:\n"
    "- Settimane 1-5 NUTRI: valore puro, nessuna vendita. Contenuti che costruiscono il pubblico "
    "che poi verra alla live. Una settimana = un focus chiaro.\n"
    "- Settimana 6 ANNUNCIA: si aprono le iscrizioni alla live gratuita (data fissata, pagina "
    "iscrizione, il motivo per cui vale la pena esserci dal vivo).\n"
    "- Settimana 7 SCALDA: countdown e anticipazioni, si confermano gli iscritti, si crea attesa.\n"
    "- Settimana 8 LIVE: la live (problema -> metodo -> prove -> offerta a tempo), poi nei giorni "
    "dopo si chiude (replay a scadenza, email, call, raccolta testimonianze) e il ciclo riparte.\n"
    "Per ogni settimana dai: 'tema' (il focus della settimana), 2-3 'azioni' esecutive semplici "
    "per un partner poco pratico, e una 'cta' coerente.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa. Frasi brevi.\n"
    "- Niente superlativi assoluti (mai 'potente', 'incredibile', '10x', 'il migliore').\n"
    "- Niente registro guru/coach: niente 'mindset', 'energia', 'abbondanza'.\n"
    "- Le azioni devono essere cose concrete che si fanno in 30 minuti (es. 'Pubblica un reel a "
    "camera di 40 secondi', 'Manda l'email di promemoria agli iscritti').\n"
    "- 'cta' = una tra: Segui · Commenta · Salva + segui · Iscriviti alla live · Conferma la "
    "presenza · Partecipa alla live · Guarda la replay · Scrivimi."
)

FASE_CTA_DEFAULT = {
    "Nutri": "Salva + segui",
    "Annuncia": "Iscriviti alla live",
    "Scalda": "Conferma la presenza",
    "Live": "Partecipa alla live",
}

_WEEK_SCHEMA = {
    "type": "object",
    "properties": {
        "settimana": {"type": "integer", "description": "Numero settimana 1..8."},
        "tema": {"type": "string", "description": "Il focus della settimana, breve e concreto."},
        "azioni": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 4,
            "description": "2-3 azioni esecutive semplici.",
        },
        "cta": {"type": "string", "description": "La call to action della settimana."},
    },
    "required": ["settimana", "tema", "azioni", "cta"],
}

_SCHEMA = {
    "type": "object",
    "properties": {
        "weeks": {
            "type": "array",
            "items": _WEEK_SCHEMA,
            "minItems": 8,
            "maxItems": 8,
            "description": "Esattamente 8 settimane, nell'ordine delle 5 fasi (Nutri 1-5, Annuncia 6, Scalda 7, Live 8).",
        },
    },
    "required": ["weeks"],
}

_INPUT_KEYS = [
    "nicchia", "momento_di_vita", "promessa",
    "trasformazione_90gg", "metodo_nome", "differenza_riconoscibile",
]


def _t(answers: dict, key: str, fallback: str = "") -> str:
    return (answers.get(key) or fallback).strip()


def _clean(s: Any) -> str:
    return " ".join(str(s or "").split())


def _lesson_titles(outline: dict | None) -> list[str]:
    """Estrae i titoli delle lezioni 'vere' dall'outline (esclude Intro/Outro)."""
    if not isinstance(outline, dict):
        return []
    titoli: list[str] = []
    for m in outline.get("modules") or []:
        for lez in (m.get("lezioni") or []):
            if lez.get("pill") in ("Intro", "Outro"):
                continue
            t = _clean(lez.get("titolo"))
            if t and not t.lower().startswith("lezione "):
                titoli.append(t)
    return titoli


def _fase_for_settimana(n: int) -> tuple[str, str]:
    """Ritorna (fase, obiettivo) per il numero di settimana 1..8."""
    for fase, obiettivo, (lo, hi) in _FASI:
        if lo <= n <= hi:
            return fase, obiettivo
    return _FASI[0][0], _FASI[0][1]


# Blocco fisso "Chiudi" (i giorni dopo la live): uguale per tutti, non dipende dall'AI.
_DOPO_LIVE = {
    "titolo": "Dopo la live — Chiudi",
    "obiettivo": "Trasforma la live in vendite e in prove sociali, poi riparti col ciclo successivo.",
    "azioni": [
        "Manda il replay a tempo a chi si era iscritto (scade davvero, dillo).",
        "Email di chiusura: l'offerta a scadenza resta aperta ancora poco.",
        "Chiama o scrivi a chi era in live e non ha comprato.",
        "Chiedi una testimonianza a chi ha comprato: diventa contenuto per il prossimo ciclo.",
        "Fissa la data della prossima live (tra ~8 settimane) e riparti da Nutri.",
    ],
}


def _normalize(out: dict) -> dict:
    """Porta l'output AI nella forma del frontend: sempre 8 settimane, fase derivata dal numero."""
    weeks_in = out.get("weeks") or []
    by_num = {}
    for w in weeks_in:
        try:
            by_num[int(w.get("settimana"))] = w
        except (TypeError, ValueError):
            continue
    weeks = []
    for n in range(1, 9):
        fase, obiettivo = _fase_for_settimana(n)
        src = by_num.get(n, {})
        azioni = [_clean(a) for a in (src.get("azioni") or []) if _clean(a)]
        weeks.append({
            "settimana": n,
            "fase": fase,
            "obiettivo": obiettivo,
            "tema": _clean(src.get("tema")) or obiettivo,
            "azioni": azioni or ["Pubblica un contenuto di valore della settimana."],
            "cta": _clean(src.get("cta")) or FASE_CTA_DEFAULT.get(fase, "Segui"),
            "evento": fase == "Live",
        })
    return {"weeks": weeks, "dopo_live": _DOPO_LIVE, "durata_settimane": 8, "source": "ai"}


def _deterministic(answers: dict, outline: dict | None) -> dict:
    """Fallback senza AI: 8 settimane dalla struttura bloccata, temi Nutri dai titoli di lezione."""
    nicchia = _t(answers, "nicchia", "il tuo cliente ideale")
    metodo = _t(answers, "metodo_nome", "il tuo metodo")
    lezioni = _lesson_titles(outline)
    li = 0

    def next_lez(default: str) -> str:
        nonlocal li
        if lezioni:
            t = lezioni[li % len(lezioni)]
            li += 1
            return t
        return default

    # Settimane NUTRI (1-5): valore puro, temi che ruotano sulle lezioni.
    nutri_temi = [
        (next_lez(f"Un quick-win pratico per {nicchia}"),
         ["Pubblica un reel a camera di 40 secondi che risolve un problema concreto.",
          "Rispondi nei commenti a chi ti scrive: alimenta la conversazione."]),
        ("I 3 errori piu comuni nel tuo settore",
         ["Fai un carosello da 5 slide, un errore per slide, testo grande.",
          "Chiudi con una domanda per far commentare."]),
        (next_lez(f"Come funziona {metodo}, spiegato semplice"),
         ["Reel a camera: spiega il metodo in 3 passi.",
          "Aggiungi la parola chiave a schermo."]),
        ("Una storia o un risultato reale",
         ["Racconta il prima/dopo di uno studente (screenshot o a camera).",
          "Niente vendita: solo la storia."]),
        (next_lez("Il concetto che cambia tutto per chi inizia"),
         ["Post con 1 foto + testo onesto: per chi e (e per chi no).",
          "Invita a seguirti per la prossima settimana."]),
    ]
    weeks = []
    for i, (tema, azioni) in enumerate(nutri_temi, start=1):
        fase, obiettivo = _fase_for_settimana(i)
        weeks.append({
            "settimana": i, "fase": fase, "obiettivo": obiettivo,
            "tema": tema, "azioni": azioni, "cta": FASE_CTA_DEFAULT[fase], "evento": False,
        })

    # Settimana 6 ANNUNCIA
    weeks.append({
        "settimana": 6, "fase": "Annuncia",
        "obiettivo": _fase_for_settimana(6)[1],
        "tema": "Annuncia la live gratuita (con data e pagina iscrizione)",
        "azioni": [
            "Reel a camera, energico: annuncia data e tema della live, link in bio.",
            "Carosello 'Cosa vedrai alla live' da 5 slide.",
            "Storie con lo sticker link alla pagina iscrizione.",
        ],
        "cta": "Iscriviti alla live", "evento": False,
    })
    # Settimana 7 SCALDA
    weeks.append({
        "settimana": 7, "fase": "Scalda",
        "obiettivo": _fase_for_settimana(7)[1],
        "tema": "Countdown e anticipazioni: conferma gli iscritti",
        "azioni": [
            "Countdown -5 / -3 / -1: a camera, breve, data a schermo.",
            "Manda l'email di promemoria agli iscritti.",
            "Teaser: 'questo lo spiego solo dal vivo'.",
        ],
        "cta": "Conferma la presenza", "evento": False,
    })
    # Settimana 8 LIVE
    weeks.append({
        "settimana": 8, "fase": "Live",
        "obiettivo": _fase_for_settimana(8)[1],
        "tema": "La live: problema -> metodo -> prove -> offerta a tempo",
        "azioni": [
            "Vai live (YouTube/IG Live/Zoom): valore vero, poi l'offerta a scadenza.",
            "Tieni aperta l'offerta solo per le ore/giorni che annunci.",
            "Storie durante e subito dopo: 'siamo live', poi 'la replay scade'.",
        ],
        "cta": "Partecipa alla live", "evento": True,
    })

    return {"weeks": weeks, "dopo_live": _DOPO_LIVE, "durata_settimane": 8, "source": "fallback"}


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
    lezioni = _lesson_titles(outline)
    corso = _clean((outline or {}).get("course_name"))
    blocco_corso = ""
    if corso or lezioni:
        righe = "\n".join(f"  - {t}" for t in lezioni[:20])
        blocco_corso = (
            f"\n\nCorso del partner: {corso or '(senza nome)'}\n"
            f"Titoli delle lezioni da cui attingere per le settimane Nutri:\n{righe}"
        )

    user = (
        f"Posizionamento del partner:\n{pos}{blocco_corso}\n\n"
        "Genera il ciclo live da 8 settimane (Nutri settimane 1-5, Annuncia settimana 6, "
        "Scalda settimana 7, Live settimana 8), seguendo struttura e regole. Per ogni "
        "settimana: tema, 2-3 azioni esecutive, cta."
    )

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "live_cycle",
        "description": "Restituisci il ciclo live da 8 settimane strutturato.",
        "input_schema": _SCHEMA,
    }
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=4000,
        system=[{"type": "text", "text": _SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "live_cycle"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    weeks = out.get("weeks")
    if not isinstance(weeks, list) or len(weeks) != 8:
        return False
    for w in weeks:
        if not isinstance(w, dict):
            return False
        if not (w.get("azioni") and isinstance(w.get("azioni"), list)):
            return False
    return True


async def build_live_cycle(answers: dict, outline: dict | None = None) -> dict:
    """Ritorna il ciclo live {weeks:[{settimana, fase, obiettivo, tema, azioni, cta, evento}], dopo_live, source}.

    Prova la sintesi AI; in caso di qualunque errore o output incompleto ricade sullo
    scheletro deterministico. Non solleva mai: la card non deve mai bloccarsi.
    """
    try:
        out = await asyncio.to_thread(_call_claude, answers, outline)
        if _valid(out):
            return _normalize(out)
        logger.warning("[LIVECYCLE] Ciclo live AI incompleto — uso scheletro deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[LIVECYCLE] Ciclo live AI fallito ({e}) — uso scheletro deterministico")
    return _deterministic(answers, outline)
