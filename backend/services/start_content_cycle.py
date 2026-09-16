"""Ciclo di contenuti di 60 giorni — deliverable Ciak Start (tappa 3).

⛔ NON è il calendario di regime della Partnership (`quarterly_calendar.py`, 90
giorni, 3 webinar mensili, corso già acquistabile). Quello resta com'è e lo usa
solo la Partnership.

Qui il pubblico è un cliente **Ciak Start** che potrebbe NON passare alla
Partnership: deve diventare autonomo. L'ottica da instillare è una sola —
**una live ogni 60 giorni in cui proponi i tuoi servizi.** Il ciclo è
RIPETIBILE: quando finisce, si ricomincia. Non si vende "il corso" (magari non
ce l'ha ancora): si costruisce pubblico e si chiude con una live dove il cliente
propone la propria offerta.

Struttura bloccata (3 fasi in 60 giorni, una sola live in chiusura):
  - G1-20  · Presenza e valore     — esisti, nomina il problema, porta valore e
             assaggi del tuo metodo. CTA morbide (segui/salva/commenta/scrivimi).
  - G21-40 · Prova e desiderio     — prove e risultati, obiezioni, per chi è/non
             è, il tuo perché. Si semina la live.
  - G41-60 · Verso la live         — annuncio della live gratuita con data (~G41,
             ADV opzionale) → registrazioni → countdown -5/-3/-1 → LIVE ~G57
             (problema → metodo → prove → proponi i tuoi servizi con offerta a
             scadenza onesta) → chiusura G58-60 (replay a tempo + "l'offerta scade").

Mix per settimana ~3 Reel + 2 Carosello + 2 Post. Deliverable BASE = il piano,
non i contenuti (quelli sono il servizio EXTRA). Sintesi AI (Anthropic tool-use)
con fallback deterministico: non si blocca mai.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Callable

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("START_CONTENT_CYCLE_MODEL", "claude-sonnet-4-6")

CYCLE_DAYS = 60
FORMATI = ["Reel", "Carosello", "Post", "Storie"]

# Le 3 fasi del ciclo sono FISSE (strategia bloccata): titolo + obiettivo + range.
_FASI = [
    ("Presenza e valore",
     "Esisti, nomina il problema del tuo cliente e porta valore. Ancora non vendi. (G1-20)",
     (1, 20)),
    ("Prova e desiderio",
     "Prove, obiezioni e il tuo perche': fai desiderare la soluzione e semina la live. (G21-40)",
     (21, 40)),
    ("Verso la live",
     "Annuncia la live, riempila e chiudi proponendo i tuoi servizi con un'offerta a scadenza. (G41-60)",
     (41, 60)),
]

_RITMO = (
    "Questo e' un ciclo di 60 giorni, pensato per ripetersi: quando finisce, lo "
    "ricominci. Una live ogni 60 giorni in cui proponi i tuoi servizi e' il tuo "
    "ritmo, anche da solo."
)

_SYSTEM = (
    "Sei Marco, lo stratega di Evolution PRO. Costruisci per un professionista un "
    "CICLO DI CONTENUTI DI 60 GIORNI che culmina in UNA live dove propone i propri "
    "servizi. Il professionista lavora da solo e potrebbe non avere ancora un corso: "
    "NON si vende 'il corso', si costruisce pubblico e si chiude con una live.\n"
    "L'OTTICA da trasmettere: una live ogni 60 giorni e' il suo ritmo, ripetibile.\n"
    "Il ciclo ha 3 FASI fisse:\n"
    "- FASE 1 — Presenza e valore (giorni 1-20): esisti, nomina il problema del "
    "cliente, porta valore e assaggi del metodo. Nessuna vendita. CTA morbide.\n"
    "- FASE 2 — Prova e desiderio (giorni 21-40): prove e risultati, risposta alle "
    "obiezioni, per chi e' e per chi NON e', il tuo perche'. Si semina la live.\n"
    "- FASE 3 — Verso la live (giorni 41-60): annuncia la live gratuita con data "
    "(giorno ~41, qui si puo' spingere ADV), apri le registrazioni, porta valore che "
    "conduce al live, countdown a -5/-3/-1, la LIVE e' ~giorno 57 (problema → metodo → "
    "prove → proponi i tuoi servizi con offerta a scadenza), poi chiusura giorni 58-60 "
    "(replay a tempo + 'l'offerta scade').\n"
    "MIX per settimana: circa 3 Reel + 2 Carosello + 2 Post.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti (mai 'potente', 'incredibile', '10x', 'il migliore').\n"
    "- Niente promesse di guadagno o numeri inventati.\n"
    "- 'tema' = l'hook/argomento del contenuto, concreto e breve.\n"
    "- 'fonte' = da cosa nasce (competenza del professionista, una prova, o 'strutturale' "
    "per annuncio/countdown/chiusura).\n"
    "- 'come_farlo' = istruzione esecutiva semplicissima per chi e' poco pratico "
    "(es. 'Parla a camera 30 secondi', '6 slide testo grande', '1 foto + testo'). Per i "
    "caroselli indica il numero di slide.\n"
    "- 'cta' = una tra: Segui + salva · Commenta · Scrivimi · Iscriviti alla live · "
    "Guarda la replay · Proponi una call · Approfitta dell'offerta.\n"
    "- I formati ammessi sono solo: Reel, Carosello, Post, Storie."
)

_DAY_SCHEMA = {
    "type": "object",
    "properties": {
        "formato": {"type": "string", "enum": FORMATI},
        "tema": {"type": "string", "description": "Hook/argomento del contenuto, breve e concreto."},
        "fonte": {"type": "string", "description": "Da cosa nasce (competenza, prova, o 'strutturale')."},
        "come_farlo": {"type": "string", "description": "Istruzione esecutiva semplice."},
        "cta": {"type": "string", "description": "La call to action del giorno."},
    },
    "required": ["formato", "tema", "fonte", "come_farlo", "cta"],
}

_FASE_SCHEMA = {
    "type": "object",
    "properties": {
        "fase": {"type": "string", "description": "Presenza e valore / Prova e desiderio / Verso la live."},
        "obiettivo": {"type": "string", "description": "Obiettivo della fase."},
        "giorni": {
            "type": "array",
            "items": _DAY_SCHEMA,
            "minItems": 12,
            "maxItems": 18,
        },
    },
    "required": ["fase", "obiettivo", "giorni"],
}

_SCHEMA = {
    "type": "object",
    "properties": {
        "fasi": {
            "type": "array",
            "items": _FASE_SCHEMA,
            "minItems": 3,
            "maxItems": 3,
            "description": "Esattamente 3 fasi: Presenza e valore, Prova e desiderio, Verso la live.",
        },
    },
    "required": ["fasi"],
}

_INPUT_KEYS = [
    "nicchia", "momento_di_vita", "promessa",
    "trasformazione_90gg", "metodo_nome", "differenza_riconoscibile",
    "prezzo_e_formato",
]


def _t(answers: dict, key: str, fallback: str = "") -> str:
    return (answers.get(key) or fallback).strip()


def _clean(s: Any) -> str:
    return " ".join(str(s or "").split())


def _coerce_formato(v: Any) -> str:
    s = _clean(v)
    return s if s in FORMATI else "Reel"


def _default_cta(fase_idx: int) -> str:
    return ("Segui + salva", "Scrivimi", "Iscriviti alla live")[fase_idx]


def _normalize(out: dict) -> dict:
    """Porta l'output AI nella forma del frontend: 3 fasi, giorni numerati nel loro range."""
    fasi_in = out.get("fasi") or []
    fasi = []
    for fi, (fase_fix, obiettivo_fix, (start, _end)) in enumerate(_FASI):
        fsrc = fasi_in[fi] if fi < len(fasi_in) else {}
        giorni = []
        giorno = start
        for d in (fsrc.get("giorni") or []):
            giorni.append({
                "giorno": giorno,
                "formato": _coerce_formato(d.get("formato")),
                "tema": _clean(d.get("tema")),
                "fonte": _clean(d.get("fonte")) or "—",
                "come_farlo": _clean(d.get("come_farlo")),
                "cta": _clean(d.get("cta")) or _default_cta(fi),
            })
            giorno += 1
        fasi.append({"fase": fase_fix, "obiettivo": obiettivo_fix, "giorni": giorni})
    return {"cycle_days": CYCLE_DAYS, "recurring": True, "ritmo": _RITMO, "fasi": fasi, "source": "ai"}


def _fase_giorni(nicchia: str, metodo: str) -> list[list[dict]]:
    """I contenuti delle 3 fasi del ciclo (fallback deterministico curato)."""

    def d(formato, tema, fonte, come_farlo, cta):
        return {"formato": formato, "tema": tema, "fonte": fonte, "come_farlo": come_farlo, "cta": cta}

    # FASE 1 — Presenza e valore (G1-20): esisti, problema, valore. Niente vendita.
    presenza = [
        d("Reel", f"Chi sei e per chi lavori: {nicchia}", "La tua competenza", "A camera 30 secondi, diretto", "Segui + salva"),
        d("Carosello", "Il problema di cui nessuno parla nel tuo settore", "La tua competenza", "5 slide, testo grande", "Segui + salva"),
        d("Reel", "Un quick-win pratico che puoi dare subito", "La tua competenza", "A camera, mostra il fare", "Salva + segui"),
        d("Post", "Una domanda diretta alla tua community", "Engagement", "1 foto + domanda", "Commenta"),
        d("Carosello", "3 errori comuni (e come evitarli)", "La tua competenza", "5 slide: 1 errore per slide", "Salva + segui"),
        d("Reel", "Il mito da sfatare nel tuo settore", "La tua competenza", "Hook nei primi 3 secondi", "Commenta"),
        d("Post", "Una giornata tipo del tuo lavoro", "Dietro le quinte", "1 foto + racconto breve", "Scrivimi"),
        d("Reel", f"Come funziona {metodo} in parole semplici", "Panoramica metodo", "A camera + parola chiave a schermo", "Segui + salva"),
        d("Carosello", "Cosa cambia quando lavori con metodo", "Panoramica metodo", "5 slide: prima/dopo per punti", "Salva + segui"),
        d("Reel", "Una cosa che vorrei aver saputo prima", "Il tuo perche'", "A camera, tono personale", "Commenta"),
        d("Post", "Rispondo a una domanda frequente", "FAQ", "1 immagine + risposta breve", "Scrivimi"),
        d("Reel", "Un consiglio contro-corrente", "La tua competenza", "A camera, diretto", "Commenta"),
        d("Carosello", "Il primo passo concreto per chi inizia", "La tua competenza", "5 slide guidate", "Salva + segui"),
        d("Reel", "Perche' faccio questo lavoro", "Il tuo perche'", "A camera, tono caldo", "Segui + salva"),
    ]

    # FASE 2 — Prova e desiderio (G21-40): prove, obiezioni, desiderio. Semina la live.
    prova = [
        d("Reel", "Un risultato concreto (tuo o di un cliente)", "Prova/risultato", "A camera o screenshot, racconta il prima/dopo", "Scrivimi"),
        d("Carosello", "Le obiezioni piu' comuni (e la verita')", "FAQ", "5 slide: obiezione → risposta", "Scrivimi"),
        d("Post", "Per chi e' (e per chi NON e') quello che faccio", "Posizionamento", "1 foto + testo onesto", "Scrivimi"),
        d("Reel", "Cosa succede se non risolvi questo problema", "Il costo del no", "A camera, concreto e onesto", "Commenta"),
        d("Carosello", "Una storia di trasformazione, passo per passo", "Prova/risultato", "6 slide: il percorso", "Salva + segui"),
        d("Reel", "La differenza tra fare da soli e con metodo", "Differenza", "A camera, esempio concreto", "Scrivimi"),
        d("Post", "Una testimonianza o un feedback vero", "Prova/risultato", "Screenshot + testo breve", "Scrivimi"),
        d("Reel", "Il tuo perche', la versione lunga", "Il tuo perche'", "A camera, tono personale", "Segui + salva"),
        d("Carosello", "Cosa NON troverai altrove", "Differenza", "5 slide, il tuo punto di vista", "Salva + segui"),
        d("Reel", "Sfatiamo un'altra convinzione sbagliata", "La tua competenza", "Hook forte, breve", "Commenta"),
        d("Post", "Anticipo qualcosa: sto preparando una live", "Teaser live", "1 foto + una riga", "Scrivimi"),
        d("Reel", "Una domanda che ricevo spesso, e la mia risposta", "FAQ", "A camera, diretta", "Commenta"),
        d("Carosello", "3 segnali che e' il momento di agire", "Desiderio", "5 slide, onesto", "Scrivimi"),
        d("Reel", "Cosa spiego solo dal vivo", "Teaser live", "A camera, crea curiosita'", "Scrivimi"),
    ]

    # FASE 3 — Verso la live (G41-60): annuncio → riempimento → live → chiusura.
    live = [
        d("Reel", "Annuncio: live gratuita, ecco quando", "Annuncio live", "A camera, energico, data a schermo · qui puoi spingere ADV", "Iscriviti alla live"),
        d("Carosello", "Cosa vedrai alla live", "Agenda live", "5 slide con i punti del live", "Iscriviti alla live"),
        d("Post", "Perche' partecipare dal vivo", "Annuncio live", "1 foto + 3 motivi", "Iscriviti alla live"),
        d("Reel", "Un valore che porta alla live", "La tua competenza", "A camera, chiudi sulla live", "Iscriviti alla live"),
        d("Carosello", "Domande e obiezioni sulla live", "FAQ", "5 slide: domanda → risposta", "Iscriviti alla live"),
        d("Reel", "Questo lo mostro solo dal vivo", "Teaser", "A camera, curiosita'", "Iscriviti alla live"),
        d("Post", "Una prova / un risultato", "Prova/risultato", "Screenshot + testo", "Iscriviti alla live"),
        d("Reel", "Mancano 5 giorni: salva la data", "Countdown -5", "A camera + data a schermo", "Iscriviti alla live"),
        d("Storie", "Sondaggio pre-live", "Engagement", "Sticker sondaggio + reminder", "Iscriviti alla live"),
        d("Reel", "Mancano 3 giorni alla live", "Countdown -3", "A camera, breve · spingi ADV", "Iscriviti alla live"),
        d("Reel", "Domani siamo live", "Countdown -1", "A camera, tono caldo", "Iscriviti alla live"),
        d("Storie", "Oggi si va live: ultimi posti", "Countdown 0", "Reminder a ridosso dell'orario", "Iscriviti alla live"),
        d("Reel", "Live: problema → metodo → prove → i miei servizi", "Live", "Diretta ~giorno 57. In chiusura proponi i tuoi servizi con offerta a scadenza onesta", "Approfitta dell'offerta"),
        d("Post", "Replay a tempo + l'offerta e' attiva", "Chiusura", "1 immagine + scadenza chiara", "Guarda la replay"),
        d("Reel", "L'offerta scade: ultime ore", "Chiusura", "A camera, urgenza reale (solo se vera)", "Approfitta dell'offerta"),
        d("Post", "Grazie + cosa succede adesso (ricomincia il ciclo)", "Chiusura", "1 foto + prossimo passo", "Scrivimi"),
    ]

    return [presenza, prova, live]


def _deterministic(answers: dict, outline: dict | None = None, reason: str | None = None) -> dict:
    """Fallback senza AI: 3 fasi dalla struttura bloccata, temi dal posizionamento.
    Non si blocca mai. `reason` (se presente) dichiara PERCHE' si e' degradato —
    diagnostico admin-only, non renderizzato al cliente."""
    nicchia = _t(answers, "nicchia", "il tuo cliente ideale")
    metodo = _t(answers, "metodo_nome", "il tuo metodo")
    blocchi = _fase_giorni(nicchia, metodo)

    fasi = []
    for (fase, obiettivo, (start, _end)), giorni_src in zip(_FASI, blocchi):
        giorni = []
        giorno = start
        for g in giorni_src:
            giorni.append({"giorno": giorno, **g})
            giorno += 1
        fasi.append({"fase": fase, "obiettivo": obiettivo, "giorni": giorni})

    out = {"cycle_days": CYCLE_DAYS, "recurring": True, "ritmo": _RITMO, "fasi": fasi, "source": "fallback"}
    if reason:
        out["fallback_reason"] = reason
    return out


def _call_claude(answers: dict, outline: dict | None) -> dict:
    """Chiamata sincrona Anthropic tool-use. Solleva eccezione in caso di errore."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    pos = "\n".join(
        f"- {k}: {(answers.get(k) or '').strip()}"
        for k in _INPUT_KEYS if (answers.get(k) or "").strip()
    )
    user = (
        f"Posizionamento del professionista:\n{pos}\n\n"
        "Genera il ciclo di contenuti di 60 giorni in 3 fasi (Presenza e valore giorni "
        "1-20, Prova e desiderio giorni 21-40, Verso la live giorni 41-60, con la live "
        "~giorno 57 e chiusura 58-60), seguendo la struttura e le regole. Ogni giorno: "
        "formato, tema, fonte, come_farlo, cta."
    )

    from .agent_deliverable import system_blocks

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "content_cycle_60d",
        "description": "Restituisci il ciclo di contenuti di 60 giorni strutturato in 3 fasi.",
        "input_schema": _SCHEMA,
    }
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=6000,
        system=system_blocks("MARCO", _SYSTEM),
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "content_cycle_60d"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    fasi = out.get("fasi")
    if not isinstance(fasi, list) or len(fasi) != 3:
        return False
    for f in fasi:
        giorni = (f or {}).get("giorni")
        if not isinstance(giorni, list) or not giorni:
            return False
    return True


async def build_start_content_cycle(answers: dict, outline: dict | None = None) -> dict:
    """Ritorna il ciclo di 60 giorni {cycle_days, recurring, ritmo, fasi:[...], source}.

    Prova la sintesi AI; in caso di qualunque errore o output incompleto ricade sullo
    scheletro deterministico. Non solleva mai: lo step non deve mai bloccarsi.
    """
    reason: str | None = None
    try:
        out = await asyncio.to_thread(_call_claude, answers, outline)
        if _valid(out):
            return _normalize(out)
        reason = "AI: output incompleto o non valido"
        logger.warning("[START-CYCLE] Ciclo 60g AI incompleto — uso scheletro deterministico")
    except Exception as e:  # noqa: BLE001
        reason = f"{type(e).__name__}: {str(e)[:200]}"
        logger.warning(f"[START-CYCLE] Ciclo 60g AI fallito ({reason}) — uso scheletro deterministico")
    return _deterministic(answers, outline, reason=reason)
