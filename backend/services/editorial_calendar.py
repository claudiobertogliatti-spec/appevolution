"""Calendario editoriale dei 30 giorni di lancio organico (Step11 — Valida, agente Andrea).

Strategia bloccata (Calendario 1 = Mese 1, lancio organico):
  - flusso: contenuti + DM → masterclass → live → checkout.
  - 4 contenuti principali a settimana e storie quasi quotidiane.
  - la call è solo recupero di chi non ha visto la live.
  - ogni giorno porta una cue "come_farlo" eseguibile anche da un partner poco digitale

Deliverable BASE = il calendario (il piano editoriale), NON i contenuti.
I temi attingono dai titoli di moduli/lezioni dell'outline (Step06) + dal Posizionamento.

Sintesi AI (Anthropic tool-use) con fallback deterministico: lo step non si blocca mai.
Filtrato dalla brand voice Ciak: niente superlativi, frasi brevi, italiano semplice.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("EDITORIAL_CALENDAR_MODEL", "claude-sonnet-4-6")

FORMATI = ["reel", "carousel", "post", "stories"]

# Le 4 settimane sono FISSE (strategia bloccata): obiettivo + numero di giorni.
_WEEKS = [
    ("Presenza — esisti e nomina il problema", 7),
    ("Autorevolezza — dimostra il metodo e porta nel funnel", 7),
    ("Annuncio webinar — apri le iscrizioni", 7),
    ("Consolidamento — scalda e fai il ponte al Mese 2", 9),
]
_TOTAL_DAYS = sum(n for _, n in _WEEKS)  # 30

_SYSTEM = (
    "Sei Andrea, il produttore di contenuti di Evolution PRO. Costruisci per un "
    "partner il CALENDARIO EDITORIALE dei suoi primi 30 giorni di lancio organico.\n"
    "OBIETTIVO DEL MESE (non negoziabile): contenuti e conversazioni DM portano alla "
    "masterclass, poi alla live, poi al checkout. Una call è ammessa solo come recupero "
    "per chi non ha visto la live.\n"
    "STRUTTURA (4 settimane fisse):\n"
    "- Giorni 1-7 — riconoscimento: contenuti + DM, CTA commento o DM.\n"
    "- Giorni 8-14 — autorevolezza: invia e fai guardare la masterclass.\n"
    "- Giorni 15-27 — invito: iscrizione alla live e follow-up DM.\n"
    "- Giorno 28 — live. Giorni 29-30 — follow-up verso checkout; call solo al "
    "giorno 30 per chi non ha visto la live.\n"
    "CADENZA: 4 contenuti principali per settimana e storie quasi quotidiane.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti (mai 'potente', 'incredibile', '10x', 'il migliore').\n"
    "- 'theme' = l'hook/argomento del contenuto, concreto e breve.\n"
    "- 'how_to' = istruzione esecutiva semplicissima per un partner poco pratico "
    "(es. 'Parla a camera 30 secondi', '6 slide con testo grande', '1 foto + testo'). "
    "Per i caroselli indica il numero di slide.\n"
    "- 'cta' deve rispettare la fase del flusso: DM/commento → masterclass → live → checkout.\n"
    "- 'channel' è sempre 'instagram'; 'format' è uno tra reel, carousel, post, stories.\n"
    "- 'destination_url' è null finché il team non ha confermato un URL HTTPS reale.\n"
    "- 'owner' è sempre 'partner'. 'phase' è recognition (1-7), authority (8-14), "
    "invitation (15-21), conversion (22-26), gate (27), live (28), follow_up (29-30)."
)

_DAY_SCHEMA = {
    "type": "object",
    "properties": {
        "day": {"type": "integer", "minimum": 1, "maximum": 30},
        "channel": {"type": "string", "enum": ["instagram"]},
        "format": {"type": "string", "enum": FORMATI},
        "theme": {"type": "string", "description": "Hook/argomento del contenuto, breve e concreto."},
        "how_to": {"type": "string", "description": "Istruzione esecutiva semplice per il partner."},
        "cta": {"type": "string", "description": "La call to action del giorno."},
        "destination_url": {"type": ["string", "null"]},
        "destination_kind": {"type": "string", "enum": ["masterclass", "live", "checkout"]},
        "owner": {"type": "string", "enum": ["partner"]},
        "phase": {"type": "string"},
        "dm_action": {"type": "string"},
        "recovery_reason": {"type": ["string", "null"]},
        "action_kind": {"type": "string"},
        "audience_condition": {"type": "string"},
    },
    "required": ["day", "channel", "format", "theme", "how_to", "cta", "destination_url", "destination_kind", "owner", "phase", "dm_action", "action_kind", "audience_condition"],
}

_SCHEMA = {
    "type": "object",
    "properties": {
        "days": {
            "type": "array",
            "items": _DAY_SCHEMA,
            "minItems": 30,
            "maxItems": 30,
            "description": "Esattamente i giorni 1-30, senza duplicati.",
        },
    },
    "required": ["days"],
}

# Chiavi del Posizionamento che orientano i temi.
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


def _coerce_format(v: Any) -> str:
    normalized = _clean(v).lower()
    aliases = {"carosello": "carousel", "storie": "stories", "story": "stories"}
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in FORMATI else "reel"


def _phase_for_day(day: int) -> str:
    if day <= 7:
        return "recognition"
    if day <= 14:
        return "authority"
    if day <= 21:
        return "invitation"
    if day <= 26:
        return "conversion"
    if day == 27:
        return "gate"
    if day == 28:
        return "live"
    return "follow_up"


_PRIMARY_CONTENT_DAYS = frozenset((1, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 21, 22, 24, 26, 28))
_STORY_DAYS = frozenset(day for day in range(1, 31) if day not in (28, 30))


def _cta_for_day(day: int) -> str:
    if day <= 7:
        return "commenta o scrivimi in DM"
    if day <= 14:
        return "richiedi la masterclass in DM"
    if day <= 27:
        return "iscriviti alla live"
    if day == 28:
        return "entra nella live"
    return "vai al checkout"


def _dm_action_for_day(day: int) -> str:
    if day <= 7:
        return "Rispondi ai commenti e avvia 10 conversazioni utili in DM."
    if day <= 14:
        return "Invia la masterclass in DM a chi ha chiesto dettagli e chiedi se l'ha vista."
    if day <= 27:
        return "Ricontatta in DM chi ha visto la masterclass e invitalo alla live."
    if day == 28:
        return "Scrivi in DM a chi ha interagito: ricordagli che la live è iniziata."
    if day == 29:
        return "Segui in DM chi ha visto la live e invia il passaggio al checkout."
    return "Proponi una call di recupero solo a chi non ha visto la live."


def _destination_kind_for_day(day: int) -> str:
    if day <= 14:
        return "masterclass"
    if day <= 28:
        return "live"
    return "checkout"


def _action_for_day(day: int) -> tuple[str, str]:
    if day <= 7:
        return "engage_dm", "engaged"
    if day <= 14:
        return "send_masterclass", "masterclass_requested"
    if day <= 27:
        return "invite_live", "masterclass_viewed"
    if day == 28:
        return "live_entry", "live_registered"
    if day == 29:
        return "checkout_follow_up", "live_attended"
    return "recovery_call", "live_absent"


def _canonical_day(day: int, source: dict) -> dict:
    return {
        "day": day,
        "channel": "instagram",
        "format": _coerce_format(source.get("format") or source.get("formato")) if day in _PRIMARY_CONTENT_DAYS else "stories",
        "theme": _clean(source.get("theme") or source.get("tema")),
        "how_to": _clean(source.get("how_to") or source.get("come_farlo")),
        "cta": _cta_for_day(day),
        "destination_url": source.get("destination_url"),
        "destination_kind": _destination_kind_for_day(day),
        "owner": "partner",
        "phase": _phase_for_day(day),
        "dm_action": _dm_action_for_day(day),
        "main_content": day in _PRIMARY_CONTENT_DAYS,
        "recovery_reason": "live_absent" if day == 30 else None,
        "action_kind": _action_for_day(day)[0],
        "audience_condition": _action_for_day(day)[1],
    }


def _calendar(days: list[dict], source: str, commercial_terms: dict | None = None) -> dict:
    calendar = {
        "strategy": "hybrid_launch_v1",
        "days": days,
        "main_contents": [day for day in days if day["main_content"]],
        "stories": [
            {**days[day - 1], "format": "stories", "main_content": False}
            for day in sorted(_STORY_DAYS)
        ],
        "organic_routine": {
            "daily_minutes": 30,
            "interactions_target": 10,
            "outreach_target": 10,
            "dm_follow_up_target": 10,
            "actions": {
                "interactions": "Rispondi ai commenti utili.",
                "outreach": "Avvia nuove conversazioni mirate.",
                "dm_follow_up": "Segui in DM chi ha interagito.",
            },
        },
        "source": source,
    }
    if isinstance(commercial_terms, dict):
        calendar["commercial_terms"] = commercial_terms
    return calendar


def _normalize(out: dict, commercial_terms: dict | None = None) -> dict:
    """Porta l'output AI nel contratto canonico del lancio F-14."""
    days = sorted(out.get("days") or [], key=lambda item: int(item["day"]))
    return _calendar(
        [_canonical_day(day, item) for day, item in enumerate(days, start=1)],
        "ai",
        commercial_terms,
    )


def _deterministic(
    answers: dict,
    outline: dict | None,
    commercial_terms: dict | None = None,
) -> dict:
    """Fallback senza AI: i 30 giorni dalla struttura bloccata, con i temi presi
    (dove possibile) dai titoli delle lezioni dell'outline. Non si blocca mai."""
    nicchia = _t(answers, "nicchia", "il tuo cliente ideale")
    metodo = _t(answers, "metodo_nome", "il tuo metodo")
    lezioni = _lesson_titles(outline)
    li = 0

    def next_lez(default: str) -> str:
        nonlocal li
        if li < len(lezioni):
            t = lezioni[li]
            li += 1
            return t
        return default

    def d(formato, tema, fonte, come_farlo, cta):
        return {"formato": formato, "tema": tema, "fonte": fonte, "come_farlo": come_farlo, "cta": cta}

    s1 = [
        d("Reel", f"Manifesto: chi sei e quale problema risolvi per {nicchia}", "Intro masterclass", "Parla a camera, 30 secondi, luce frontale", "Segui"),
        d("Carosello", "I errori che ti tengono fermo", "Masterclass", "6 slide, 1 errore per slide, testo grande", "Salva + segui"),
        d("Reel", next_lez("Un risultato pratico in 40 secondi"), "Lezione del corso", "Parla a camera e mostra l'esempio", "Segui"),
        d("Post", "La tua storia o una testimonianza reale, se disponibile", "Il tuo vissuto", "1 foto vera + testo personale", "Commenta"),
        d("Reel", "Il mito da sfatare nel tuo settore", "Masterclass", "Hook nei primi 3 secondi, a camera", "Guarda la masterclass"),
        d("Carosello", f"Come funziona davvero: {metodo} in pochi passi", "Panoramica del metodo", "5 slide, 1 passo per slide", "Guarda la masterclass"),
        d("Reel", "Ricapitolo della settimana + cosa arriva", "Mix", "Parla a camera, 30 secondi", "Segui"),
    ]
    s2 = [
        d("Reel", next_lez("Un errore comune spiegato bene"), "Lezione del corso", "A camera + parola chiave a schermo", "Guarda la masterclass"),
        d("Carosello", "Un caso o un risultato concreto", "Testimonianza", "4 slide: prima → dopo → come", "Guarda la masterclass"),
        d("Post", "Dietro le quinte / il tuo perché", "Il tuo metodo", "1 foto + testo", "Commenta"),
        d("Reel", next_lez("Un secondo quick-win pratico"), "Lezione del corso", "A camera, mostra il fare", "Segui"),
        d("Carosello", "3 verità sul tuo tema", "Masterclass", "4 slide, testo grande", "Salva + segui"),
        d("Reel", "Una domanda alla tua community", "Engagement", "A camera, fai una domanda", "Scrivimi"),
        d("Reel", "Perché la maggior parte fallisce", "Masterclass", "A camera, tono diretto", "Guarda la masterclass"),
    ]
    s3 = [
        d("Reel", "Annuncio del webinar live gratuito (con data)", "Annuncio webinar", "A camera, energico, data a schermo", "Iscriviti al webinar"),
        d("Carosello", "Cosa vedrai al webinar", "Agenda webinar", "5 slide con i punti del live", "Iscriviti al webinar"),
        d("Reel", next_lez("Un contenuto di valore che porta al live"), "Lezione del corso", "A camera, chiudi sul webinar", "Iscriviti al webinar"),
        d("Post", "Una prova reale, se disponibile", "Case reale", "Screenshot reale + testo contestuale", "Iscriviti al webinar"),
        d("Reel", "Questo lo spiego solo dal vivo", "Teaser", "A camera, crea curiosità", "Iscriviti al webinar"),
        d("Carosello", "Domande e obiezioni sul webinar", "FAQ", "5 slide: domanda → risposta", "Iscriviti al webinar"),
        d("Reel", "Ricapitolo + salva la data", "Mix", "A camera + data a schermo", "Iscriviti al webinar"),
    ]
    s4 = [
        d("Reel", next_lez("Un terzo quick-win, mantieni il valore"), "Lezione del corso", "A camera + esempio", "Iscriviti al webinar"),
        d("Carosello", "Il percorso completo a colpo d'occhio", "Il metodo", "6 slide di panoramica", "Iscriviti al webinar"),
        d("Post", "Una storia reale, se disponibile", "Case reale", "Foto o screenshot reale + storia", "Iscriviti al webinar"),
        d("Reel", "Cosa cambia dopo il webinar", "Teaser offerta", "A camera", "Iscriviti al webinar"),
        d("Carosello", "Riepilogo errori + soluzione", "Masterclass", "5 slide", "Iscriviti al webinar"),
        d("Storie", "Controllo finale: iscrizioni e promemoria", "Gate pre-live", "A camera + sticker sondaggio", "Iscriviti al webinar"),
        d("Reel", "Siamo live oggi: entra ora", "Webinar live", "A camera, ora e link a schermo", "Iscriviti al webinar"),
        d("Post", "Grazie per il live: ecco il prossimo passo", "Follow-up webinar", "1 foto + testo con il riepilogo", "Scrivimi"),
        d("Reel", "Risposta a una domanda emersa dal live", "Follow-up webinar", "A camera, 30 secondi", "Segui"),
    ]

    raw_days = [item for week in [s1, s2, s3, s4] for item in week]
    return _calendar(
        [_canonical_day(day, item) for day, item in enumerate(raw_days, start=1)],
        "fallback",
        commercial_terms,
    )


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
    lezioni = _lesson_titles(outline)
    corso = _clean((outline or {}).get("course_name"))
    blocco_corso = ""
    if corso or lezioni:
        righe = "\n".join(f"  - {t}" for t in lezioni[:24])
        blocco_corso = (
            f"\n\nCorso del partner: {corso or '(senza nome)'}\n"
            f"Titoli delle lezioni da cui attingere i temi:\n{righe}"
        )

    user = (
        f"Posizionamento del partner:\n{pos}{blocco_corso}\n\n"
        "Genera il calendario editoriale dei 30 giorni di lancio (Mese 1), "
        "seguendo la struttura e le regole. Restituisci esattamente i giorni 1-30 "
        "con i campi day, channel, format, theme, how_to, cta, destination_url, "
        "owner e phase."
    )

    from .agent_deliverable import system_blocks

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "editorial_calendar",
        "description": "Restituisci il calendario editoriale dei 30 giorni strutturato.",
        "input_schema": _SCHEMA,
    }
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=4000,
        # Il calendario editoriale e' del reparto Acquisizione/Comunicazione: ANDREA.
        system=system_blocks("ANDREA", _SYSTEM),
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "editorial_calendar"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    days = out.get("days")
    if not isinstance(days, list) or len(days) != 30:
        return False
    try:
        numbers = [int(day["day"]) for day in days]
    except (KeyError, TypeError, ValueError):
        return False
    if numbers != list(range(1, 31)):
        return False
    for day in days:
        if not isinstance(day, dict):
            return False
        if not _clean(day.get("theme")) or not _clean(day.get("how_to")):
            return False
    return True


async def build_editorial_calendar(
    answers: dict,
    outline: dict | None = None,
    commercial_terms: dict | None = None,
) -> dict:
    """Ritorna il calendario canonico di lancio con esattamente 30 giorni.

    Prova la sintesi AI; in caso di qualunque errore o output incompleto ricade
    sullo scheletro deterministico. Non solleva mai: lo step non deve mai bloccarsi.
    """
    try:
        out = await asyncio.to_thread(_call_claude, answers, outline)
        if _valid(out):
            return _normalize(out, commercial_terms)
        logger.warning("[CALENDAR] Calendario AI incompleto — uso scheletro deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[CALENDAR] Calendario AI fallito ({e}) — uso scheletro deterministico")
    return _deterministic(answers, outline, commercial_terms)
