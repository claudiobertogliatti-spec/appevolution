"""Calendario editoriale di REGIME — il piano trimestrale (90 giorni) della fase Ottimizza.

NON è il Calendario 1 del lancio (quello è in editorial_calendar.py, Mese 1, NON vende).
Qui siamo a regime: l'accademia è online e il corso è acquistabile. Ogni mese ripete
il template bloccato di vendita:

  - G1-15  = VENDITA CORSO (evergreen): valore/assaggi-lezione + prove/testimonianze
             + obiezioni + offerta diretta. CTA prevalente: "Scopri il corso".
  - G16-30 = RIEMPIMENTO WEBINAR: annuncio G16 (spinta ADV opzionale) → registrazioni
             → countdown -5/-3/-1 → webinar live ~G28 (problema→metodo→prove→offerta
             promo a scadenza) → chiusura carrello G29-30 (replay a tempo + "promo scade").

Un piano trimestrale = 3 cicli mensili di questo template (90 giorni). I temi attingono
dai titoli di lezioni/moduli dell'outline (Step06), che RUOTANO tra i tre mesi così i
contenuti non si ripetono. Mix per settimana ~3 Reel + 2 Carosello + 2 Post.

Deliverable BASE = il calendario (il piano), NON i contenuti (quelli sono il servizio EXTRA).
Sintesi AI (Anthropic tool-use) con fallback deterministico: non si blocca mai.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Callable

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("EDITORIAL_CALENDAR_MODEL", "claude-sonnet-4-6")

FORMATI = ["Reel", "Carosello", "Post", "Storie"]

# Un mese di regime = 2 blocchi fissi (strategia bloccata).
_BLOCCHI = [
    ("Vendita corso", "Vendi il corso con valore, prove e offerta diretta (G1-15)"),
    ("Riempimento webinar", "Riempila il webinar live e chiudi con promo a scadenza (G16-30)"),
]
_MESI = 3  # un trimestre

_SYSTEM = (
    "Sei Andrea, il produttore di contenuti di Evolution PRO. Costruisci per un partner "
    "il CALENDARIO EDITORIALE DI REGIME di un trimestre (3 mesi, 90 giorni) della sua "
    "accademia gia online.\n"
    "Siamo a REGIME: il corso e acquistabile e si vende. Ogni mese ripete lo STESSO "
    "template in due blocchi:\n"
    "- BLOCCO 1 — Vendita corso (giorni 1-15): contenuti evergreen di vendita. Prima meta "
    "valore + assaggi di lezione; seconda meta prove/testimonianze + risposta alle "
    "obiezioni + offerta diretta. CTA prevalente: 'Scopri il corso'.\n"
    "- BLOCCO 2 — Riempimento webinar (giorni 16-30): annuncia il webinar live (giorno 16, "
    "qui si puo spingere con ADV), apri le registrazioni, porta valore che conduce al live, "
    "fai il countdown a -5/-3/-1 giorni, il webinar live e ~giorno 28 (problema→metodo→prove"
    "→offerta promo a scadenza), poi chiusura carrello giorni 29-30 (replay a tempo + 'la "
    "promo scade'). CTA prevalente: 'Iscriviti al webinar', poi 'Approfitta della promo'.\n"
    "I tre mesi usano lo stesso schema ma temi DIVERSI: ruota i titoli di lezione che ti do.\n"
    "MIX per settimana: circa 3 Reel + 2 Carosello + 2 Post.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti (mai 'potente', 'incredibile', '10x', 'il migliore').\n"
    "- 'tema' = l'hook/argomento del contenuto, concreto e breve.\n"
    "- 'fonte' = da quale lezione/modulo/masterclass nasce (usa i titoli che ti do; se e "
    "strutturale scrivi es. 'Annuncio webinar' o 'Chiusura carrello').\n"
    "- 'come_farlo' = istruzione esecutiva semplicissima per un partner poco pratico "
    "(es. 'Parla a camera 30 secondi', '6 slide testo grande', '1 foto + testo'). Per i "
    "caroselli indica il numero di slide.\n"
    "- 'cta' = una tra: Scopri il corso · Iscriviti al webinar · Approfitta della promo · "
    "Guarda la replay · Commenta · Salva + segui · Scrivimi.\n"
    "- I formati ammessi sono solo: Reel, Carosello, Post, Storie."
)

_DAY_SCHEMA = {
    "type": "object",
    "properties": {
        "formato": {"type": "string", "enum": FORMATI},
        "tema": {"type": "string", "description": "Hook/argomento del contenuto, breve e concreto."},
        "fonte": {"type": "string", "description": "Da quale lezione/modulo nasce (o 'strutturale')."},
        "come_farlo": {"type": "string", "description": "Istruzione esecutiva semplice per il partner."},
        "cta": {"type": "string", "description": "La call to action del giorno."},
    },
    "required": ["formato", "tema", "fonte", "come_farlo", "cta"],
}

_BLOCCO_SCHEMA = {
    "type": "object",
    "properties": {
        "fase": {"type": "string", "description": "Vendita corso oppure Riempimento webinar."},
        "obiettivo": {"type": "string", "description": "Obiettivo del blocco."},
        "giorni": {
            "type": "array",
            "items": _DAY_SCHEMA,
            "minItems": 12,
            "maxItems": 16,
        },
    },
    "required": ["fase", "obiettivo", "giorni"],
}

_MESE_SCHEMA = {
    "type": "object",
    "properties": {
        "mese": {"type": "integer", "description": "Numero del mese nel trimestre (1, 2 o 3)."},
        "blocchi": {
            "type": "array",
            "items": _BLOCCO_SCHEMA,
            "minItems": 2,
            "maxItems": 2,
            "description": "Esattamente 2 blocchi: Vendita corso, poi Riempimento webinar.",
        },
    },
    "required": ["mese", "blocchi"],
}

_SCHEMA = {
    "type": "object",
    "properties": {
        "months": {
            "type": "array",
            "items": _MESE_SCHEMA,
            "minItems": 3,
            "maxItems": 3,
            "description": "Esattamente 3 mesi, lo stesso template con temi diversi.",
        },
    },
    "required": ["months"],
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


def _coerce_formato(v: Any) -> str:
    s = _clean(v)
    return s if s in FORMATI else "Reel"


def _normalize(out: dict) -> dict:
    """Porta l'output AI nella forma del frontend: 3 mesi × 2 blocchi fissi, giorni 1..30 per mese."""
    months_in = out.get("months") or []
    months = []
    for mi in range(_MESI):
        src = months_in[mi] if mi < len(months_in) else {}
        blocchi_in = src.get("blocchi") or []
        blocchi = []
        giorno = 1
        for bi, (fase_fix, obiettivo_fix) in enumerate(_BLOCCHI):
            bsrc = blocchi_in[bi] if bi < len(blocchi_in) else {}
            giorni = []
            for d in (bsrc.get("giorni") or []):
                giorni.append({
                    "giorno": giorno,
                    "formato": _coerce_formato(d.get("formato")),
                    "tema": _clean(d.get("tema")),
                    "fonte": _clean(d.get("fonte")) or "—",
                    "come_farlo": _clean(d.get("come_farlo")),
                    "cta": _clean(d.get("cta")) or ("Scopri il corso" if bi == 0 else "Iscriviti al webinar"),
                })
                giorno += 1
            blocchi.append({"fase": fase_fix, "obiettivo": obiettivo_fix, "giorni": giorni})
        months.append({"mese": mi + 1, "blocchi": blocchi})
    return {"months": months, "source": "ai"}


def _month_giorni(next_lez: Callable[[str], str], nicchia: str, metodo: str) -> tuple[list, list]:
    """Costruisce i due blocchi di UN mese di regime. next_lez ruota i titoli di lezione."""

    def d(formato, tema, fonte, come_farlo, cta):
        return {"formato": formato, "tema": tema, "fonte": fonte, "come_farlo": come_farlo, "cta": cta}

    # BLOCCO 1 — Vendita corso (G1-15): valore+assaggi, poi prove+obiezioni+offerta.
    vendita = [
        d("Reel", next_lez(f"Un quick-win pratico per {nicchia}"), "Lezione del corso", "Parla a camera 40 secondi, mostra il fare", "Scopri il corso"),
        d("Carosello", "I 3 errori che ti tengono fermo", "Masterclass", "5 slide, 1 errore per slide, testo grande", "Salva + segui"),
        d("Post", "Una testimonianza o un risultato", "Case studente", "Screenshot/foto + testo breve", "Scopri il corso"),
        d("Reel", next_lez("Un concetto chiave spiegato semplice"), "Lezione del corso", "A camera + parola chiave a schermo", "Scopri il corso"),
        d("Carosello", f"Come funziona {metodo} in pochi passi", "Panoramica metodo", "5 slide, 1 passo per slide", "Scopri il corso"),
        d("Reel", "Il mito da sfatare nel tuo settore", "Masterclass", "Hook nei primi 3 secondi", "Commenta"),
        d("Post", "Una domanda alla tua community", "Engagement", "1 foto + domanda diretta", "Scrivimi"),
        # seconda metà: prove → obiezioni → offerta
        d("Reel", "Prima e dopo di uno studente", "Case studente", "A camera o screenshot, racconta la trasformazione", "Scopri il corso"),
        d("Carosello", "Le obiezioni piu comuni (e la verita)", "FAQ", "5 slide: obiezione → risposta", "Scopri il corso"),
        d("Reel", next_lez("Cosa impari davvero nel corso"), "Outline corso", "A camera, elenca 3 risultati concreti", "Scopri il corso"),
        d("Post", "Per chi e (e per chi NON e) il corso", "Posizionamento", "1 foto + testo onesto", "Scopri il corso"),
        d("Carosello", "Cosa c'e dentro il corso", "Outline corso", "6 slide: i moduli a colpo d'occhio", "Scopri il corso"),
        d("Reel", "Perche ho creato questo percorso", "Il tuo perche", "A camera, tono personale", "Scopri il corso"),
        d("Post", "Offerta diretta: entra nel corso", "Offerta", "1 immagine chiara + cosa ottieni", "Scopri il corso"),
        d("Reel", "Ricapitolo + cosa arriva: il webinar live", "Ponte webinar", "A camera 30 secondi", "Scopri il corso"),
    ]

    # BLOCCO 2 — Riempimento webinar (G16-30): annuncio → registrazioni → countdown → live → chiusura.
    webinar = [
        d("Reel", "Annuncio del webinar live gratuito (con data)", "Annuncio webinar", "A camera, energico, data a schermo · qui puoi spingere ADV", "Iscriviti al webinar"),
        d("Carosello", "Cosa vedrai al webinar", "Agenda webinar", "5 slide con i punti del live", "Iscriviti al webinar"),
        d("Post", "Perche partecipare dal vivo", "Annuncio webinar", "1 foto + 3 motivi", "Iscriviti al webinar"),
        d("Reel", next_lez("Un valore che porta al live"), "Lezione del corso", "A camera, chiudi sul webinar", "Iscriviti al webinar"),
        d("Carosello", "Domande e obiezioni sul webinar", "FAQ", "5 slide: domanda → risposta", "Iscriviti al webinar"),
        d("Reel", "Questo lo spiego solo dal vivo", "Teaser", "A camera, crea curiosita", "Iscriviti al webinar"),
        d("Post", "Una prova / testimonianza", "Case studente", "Screenshot del risultato + testo", "Iscriviti al webinar"),
        d("Reel", "Mancano 5 giorni: salva la data", "Countdown -5", "A camera + data a schermo", "Iscriviti al webinar"),
        d("Storie", "Sondaggio pre-live", "Engagement", "Sticker sondaggio + reminder", "Iscriviti al webinar"),
        d("Reel", "Mancano 3 giorni al live", "Countdown -3", "A camera, breve e diretto · spingi ADV", "Iscriviti al webinar"),
        d("Reel", "Domani siamo live", "Countdown -1", "A camera, tono caldo", "Iscriviti al webinar"),
        d("Storie", "Oggi si va live: ultimi posti", "Countdown 0", "Reminder a ridosso dell'orario", "Iscriviti al webinar"),
        d("Reel", "Webinar live: problema → metodo → prove → offerta", "Webinar live", "Diretta ~giorno 28, offerta promo a scadenza in chiusura", "Approfitta della promo"),
        d("Post", "Replay a tempo + la promo e attiva", "Chiusura carrello", "1 immagine + scadenza chiara", "Guarda la replay"),
        d("Reel", "La promo scade stasera", "Chiusura carrello", "A camera, urgenza reale (solo se vera)", "Approfitta della promo"),
    ]

    return vendita, webinar


def _deterministic(answers: dict, outline: dict | None) -> dict:
    """Fallback senza AI: 3 mesi di regime dalla struttura bloccata, temi dai titoli di
    lezione che RUOTANO tra i mesi. Non si blocca mai."""
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

    months = []
    for mese in range(1, _MESI + 1):
        vendita_src, webinar_src = _month_giorni(next_lez, nicchia, metodo)
        blocchi = []
        for (fase, obiettivo), giorni_src in zip(_BLOCCHI, [vendita_src, webinar_src]):
            giorni = []
            giorno = 1 if fase == _BLOCCHI[0][0] else 16
            for g in giorni_src:
                giorni.append({"giorno": giorno, **g})
                giorno += 1
            blocchi.append({"fase": fase, "obiettivo": obiettivo, "giorni": giorni})
        months.append({"mese": mese, "blocchi": blocchi})

    return {"months": months, "source": "fallback"}


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
            f"Titoli delle lezioni da cui attingere (ruotali tra i 3 mesi):\n{righe}"
        )

    user = (
        f"Posizionamento del partner:\n{pos}{blocco_corso}\n\n"
        "Genera il calendario editoriale di regime per un trimestre (3 mesi, ogni mese "
        "in 2 blocchi: Vendita corso giorni 1-15, Riempimento webinar giorni 16-30), "
        "seguendo la struttura e le regole. Ogni giorno: formato, tema, fonte, come_farlo, cta."
    )

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "quarterly_calendar",
        "description": "Restituisci il calendario editoriale di regime del trimestre strutturato.",
        "input_schema": _SCHEMA,
    }
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=8000,
        system=[{"type": "text", "text": _SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "quarterly_calendar"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    months = out.get("months")
    if not isinstance(months, list) or len(months) != 3:
        return False
    for m in months:
        if not isinstance(m, dict):
            return False
        blocchi = m.get("blocchi")
        if not isinstance(blocchi, list) or len(blocchi) != 2:
            return False
        for b in blocchi:
            giorni = (b or {}).get("giorni")
            if not isinstance(giorni, list) or not giorni:
                return False
    return True


async def build_quarterly_calendar(answers: dict, outline: dict | None = None) -> dict:
    """Ritorna il calendario di regime {months:[{mese, blocchi:[{fase, obiettivo, giorni:[...]}]}], source}.

    Prova la sintesi AI; in caso di qualunque errore o output incompleto ricade sullo
    scheletro deterministico. Non solleva mai: lo step non deve mai bloccarsi.
    """
    try:
        out = await asyncio.to_thread(_call_claude, answers, outline)
        if _valid(out):
            return _normalize(out)
        logger.warning("[QCAL] Calendario regime AI incompleto — uso scheletro deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[QCAL] Calendario regime AI fallito ({e}) — uso scheletro deterministico")
    return _deterministic(answers, outline)
