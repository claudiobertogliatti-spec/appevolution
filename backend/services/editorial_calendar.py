"""Calendario editoriale dei 30 giorni di lancio organico (Step11 — Valida, agente Andrea).

Strategia bloccata (Calendario 1 = Mese 1, lancio organico):
  - 4 settimane: Presenza → Autorevolezza → Annuncio webinar → Consolidamento+ponte
  - obiettivo del mese: creare audience + convogliarli al webinar promo. NESSUNA vendita.
  - CTA in scala: segui → guarda la masterclass → iscriviti al webinar
  - mix ~3 reel + 2 caroselli + 2 post a settimana
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

FORMATI = ["Reel", "Carosello", "Post", "Storie"]

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
    "partner il CALENDARIO EDITORIALE dei suoi primi 30 giorni di lancio organico "
    "(il Mese 1).\n"
    "OBIETTIVO DEL MESE (non negoziabile): creare audience da zero e convogliarla "
    "verso il webinar promo di fine Mese 2. In questo mese NON si vende: nessuna CTA "
    "'compra'. La CTA sale per fasi: prima 'Segui', poi 'Guarda la masterclass', "
    "infine 'Iscriviti al webinar'.\n"
    "STRUTTURA (4 settimane fisse):\n"
    "- Settimana 1 — Presenza: esisti, nomina il problema. CTA prevalente: Segui; "
    "verso fine settimana introduci 'Guarda la masterclass'.\n"
    "- Settimana 2 — Autorevolezza: dimostra il metodo, mini-prove, cattura nel "
    "funnel. CTA prevalente: Guarda la masterclass.\n"
    "- Settimana 3 — Annuncio webinar: annuncia il webinar live gratuito e apri le "
    "iscrizioni. CTA prevalente: Iscriviti al webinar.\n"
    "- Settimana 4 — Consolidamento: tieni valore, ricorda il webinar, fai il ponte "
    "al Mese 2 ('il corso sta arrivando'). CTA prevalente: Iscriviti al webinar.\n"
    "MIX per settimana: circa 3 Reel + 2 Carosello + 2 Post (la settimana 4 è più "
    "lunga, aggiungi anche qualche Storie).\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti (mai 'potente', 'incredibile', '10x', 'il migliore').\n"
    "- 'tema' = l'hook/argomento del contenuto, concreto e breve.\n"
    "- 'fonte' = da quale lezione/modulo/masterclass del partner nasce il contenuto "
    "(usa i titoli che ti do; se è strutturale scrivi es. 'Annuncio webinar').\n"
    "- 'come_farlo' = istruzione esecutiva semplicissima per un partner poco pratico "
    "(es. 'Parla a camera 30 secondi', '6 slide con testo grande', '1 foto + testo'). "
    "Per i caroselli indica il numero di slide.\n"
    "- 'cta' = una tra: Segui · Guarda la masterclass · Iscriviti al webinar · "
    "Commenta · Salva + segui · Scrivimi.\n"
    "- I formati ammessi sono solo: Reel, Carosello, Post, Storie."
)

_DAY_SCHEMA = {
    "type": "object",
    "properties": {
        "formato": {"type": "string", "enum": FORMATI},
        "tema": {"type": "string", "description": "Hook/argomento del contenuto, breve e concreto."},
        "fonte": {"type": "string", "description": "Da quale lezione/modulo/masterclass nasce (o 'strutturale')."},
        "come_farlo": {"type": "string", "description": "Istruzione esecutiva semplice per il partner."},
        "cta": {"type": "string", "description": "La call to action del giorno."},
    },
    "required": ["formato", "tema", "fonte", "come_farlo", "cta"],
}

_WEEK_SCHEMA = {
    "type": "object",
    "properties": {
        "obiettivo": {"type": "string", "description": "Obiettivo della settimana."},
        "giorni": {
            "type": "array",
            "items": _DAY_SCHEMA,
            "minItems": 6,
            "maxItems": 10,
        },
    },
    "required": ["obiettivo", "giorni"],
}

_SCHEMA = {
    "type": "object",
    "properties": {
        "weeks": {
            "type": "array",
            "items": _WEEK_SCHEMA,
            "minItems": 4,
            "maxItems": 4,
            "description": "Esattamente 4 settimane, nell'ordine Presenza/Autorevolezza/Annuncio webinar/Consolidamento.",
        },
    },
    "required": ["weeks"],
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


def _coerce_formato(v: Any) -> str:
    s = _clean(v)
    return s if s in FORMATI else "Reel"


def _normalize(out: dict) -> dict:
    """Porta l'output AI nella forma del frontend: 4 settimane fisse, giorni numerati 1..30."""
    weeks_in = out.get("weeks") or []
    weeks = []
    giorno = 1
    for wi, (obiettivo_fix, _n) in enumerate(_WEEKS):
        src = weeks_in[wi] if wi < len(weeks_in) else {}
        giorni = []
        for d in (src.get("giorni") or []):
            giorni.append({
                "giorno": giorno,
                "formato": _coerce_formato(d.get("formato")),
                "tema": _clean(d.get("tema")),
                "fonte": _clean(d.get("fonte")) or "—",
                "come_farlo": _clean(d.get("come_farlo")),
                "cta": _clean(d.get("cta")) or "Segui",
            })
            giorno += 1
        weeks.append({"obiettivo": obiettivo_fix, "giorni": giorni})
    return {"weeks": weeks, "source": "ai"}


def _deterministic(answers: dict, outline: dict | None) -> dict:
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
        d("Post", "La tua storia, o una testimonianza", "Il tuo vissuto", "1 foto vera + testo personale", "Commenta"),
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
        d("Post", "Una prova / testimonianza", "Case", "Screenshot del risultato + testo", "Iscriviti al webinar"),
        d("Reel", "Questo lo spiego solo dal vivo", "Teaser", "A camera, crea curiosità", "Iscriviti al webinar"),
        d("Carosello", "Domande e obiezioni sul webinar", "FAQ", "5 slide: domanda → risposta", "Iscriviti al webinar"),
        d("Reel", "Ricapitolo + salva la data", "Mix", "A camera + data a schermo", "Iscriviti al webinar"),
    ]
    s4 = [
        d("Reel", next_lez("Un terzo quick-win, mantieni il valore"), "Lezione del corso", "A camera + esempio", "Iscriviti al webinar"),
        d("Carosello", "Il percorso completo a colpo d'occhio", "Il metodo", "6 slide di panoramica", "Iscriviti al webinar"),
        d("Post", "Una storia di trasformazione", "Case", "Foto o screenshot + storia", "Iscriviti al webinar"),
        d("Reel", "Cosa cambia dopo il webinar", "Teaser offerta", "A camera", "Iscriviti al webinar"),
        d("Carosello", "Riepilogo errori + soluzione", "Masterclass", "5 slide", "Iscriviti al webinar"),
        d("Storie", "Sondaggio pre-live", "Engagement", "A camera + sticker sondaggio", "Iscriviti al webinar"),
        d("Reel", "Ci vediamo al live", "Mix", "A camera, tono caldo", "Iscriviti al webinar"),
        d("Post", "Il corso sta arrivando: resta connesso", "Ponte Mese 2", "1 foto + testo", "Iscriviti al webinar"),
        d("Reel", "Cosa ti aspetta il mese prossimo", "Ponte Mese 2", "A camera, 30 secondi", "Segui"),
    ]

    weeks = []
    giorno = 1
    for (obiettivo, _n), giorni_src in zip(_WEEKS, [s1, s2, s3, s4]):
        giorni = []
        for g in giorni_src:
            giorni.append({"giorno": giorno, **g})
            giorno += 1
        weeks.append({"obiettivo": obiettivo, "giorni": giorni})

    return {"weeks": weeks, "source": "fallback"}


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
        righe = "\n".join(f"  - {t}" for t in lezioni[:24])
        blocco_corso = (
            f"\n\nCorso del partner: {corso or '(senza nome)'}\n"
            f"Titoli delle lezioni da cui attingere i temi:\n{righe}"
        )

    user = (
        f"Posizionamento del partner:\n{pos}{blocco_corso}\n\n"
        f"Genera il calendario editoriale dei 30 giorni di lancio (Mese 1) in 4 "
        f"settimane (rispettivamente {', '.join(str(n) for _, n in _WEEKS)} giorni), "
        "seguendo la struttura e le regole. Ogni giorno: formato, tema, fonte, "
        "come_farlo, cta."
    )

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "editorial_calendar",
        "description": "Restituisci il calendario editoriale dei 30 giorni strutturato.",
        "input_schema": _SCHEMA,
    }
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=4000,
        system=[{"type": "text", "text": _SYSTEM, "cache_control": {"type": "ephemeral"}}],
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
    weeks = out.get("weeks")
    if not isinstance(weeks, list) or len(weeks) != 4:
        return False
    total = 0
    for w in weeks:
        if not isinstance(w, dict):
            return False
        giorni = w.get("giorni")
        if not isinstance(giorni, list) or not giorni:
            return False
        total += len(giorni)
    # tolleranza: tra 24 e 36 giorni totali (poi normalizziamo la numerazione)
    return 24 <= total <= 36


async def build_editorial_calendar(answers: dict, outline: dict | None = None) -> dict:
    """Ritorna il calendario strutturato {weeks:[{obiettivo, giorni:[...]}], source}.

    Prova la sintesi AI; in caso di qualunque errore o output incompleto ricade
    sullo scheletro deterministico. Non solleva mai: lo step non deve mai bloccarsi.
    """
    try:
        out = await asyncio.to_thread(_call_claude, answers, outline)
        if _valid(out):
            return _normalize(out)
        logger.warning("[CALENDAR] Calendario AI incompleto — uso scheletro deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[CALENDAR] Calendario AI fallito ({e}) — uso scheletro deterministico")
    return _deterministic(answers, outline)
