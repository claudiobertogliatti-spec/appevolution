"""Deck del webinar — slide-per-slide (Step12 — Valida, agente Andrea).

Estende la strategia webinar (services/webinar_strategy.py) con il DECK vero e proprio:
le slide del live, una per una, raggruppate nelle 6 fasi gia' bloccate
(Apertura → problema → metodo → prove → offerta → Q&A/chiusura).

Ogni slide porta:
  - titolo: cosa c'e' scritto grande a schermo
  - punti: i bullet a schermo (3-5 max, brevi)
  - nota_relatore: lo script parlato di quella slide (cosa dice il partner)

Input: Posizionamento (Step04) + outline corso (Step06) + la strategia gia'
approvata allo Step12 (fasi + prezzo + bonus), cosi' il deck e' coerente con lo
script e non riparte da zero.

Sintesi AI (Anthropic tool-use) con fallback deterministico: non si blocca mai.
Brand voice Ciak: italiano semplice, niente superlativi, una slide = un'idea.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from services import offer_price

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("WEBINAR_DECK_MODEL", "claude-sonnet-4-6")

# Le 6 fasi del deck combaciano con quelle dello script (struttura bloccata).
# Per ogni fase: quante slide indicative produrre nel fallback deterministico.
_FASI = [
    ("Apertura", 2),
    ("Il problema", 3),
    ("Il metodo", 5),
    ("Le prove", 3),
    ("L'offerta", 4),
    ("Q&A e chiusura", 2),
]
_NOMI_FASI = [n for n, _ in _FASI]

_SLIDE_SCHEMA = {
    "type": "object",
    "properties": {
        "fase": {
            "type": "string",
            "enum": _NOMI_FASI,
            "description": "A quale delle 6 fasi appartiene la slide.",
        },
        "titolo": {"type": "string", "description": "Titolo a schermo, breve e concreto."},
        "punti": {
            "type": "array",
            "items": {"type": "string"},
            "description": "I bullet a schermo: 3-5, brevissimi (max ~8 parole l'uno).",
            "minItems": 1, "maxItems": 5,
        },
        "nota_relatore": {
            "type": "string",
            "description": "Cosa dice il relatore mentre mostra la slide (2-4 frasi).",
        },
    },
    "required": ["fase", "titolo", "punti", "nota_relatore"],
}

_SCHEMA = {
    "type": "object",
    "properties": {
        "titolo": {"type": "string", "description": "Titolo del deck (= titolo del webinar)."},
        "slides": {
            "type": "array",
            "items": _SLIDE_SCHEMA,
            "minItems": 16, "maxItems": 30,
            "description": "Le slide in ordine, raggruppate per fase (Apertura → … → Q&A e chiusura).",
        },
    },
    "required": ["titolo", "slides"],
}

_SYSTEM = (
    "Sei Andrea, il produttore di contenuti di Evolution PRO. Trasformi lo script "
    "di un webinar live di vendita nel DECK vero e proprio: le slide, una per una.\n"
    "Il webinar e' il motore di vendita ricorrente del partner: vende un videocorso "
    "con una promo a scadenza. Il deck deve sostenere lo script, non sostituirlo.\n"
    "STRUTTURA (6 fasi fisse, in quest'ordine): Apertura, Il problema, Il metodo, "
    "Le prove, L'offerta, Q&A e chiusura. Ogni slide appartiene a una fase.\n"
    "Ritmo consigliato: ~20-26 slide totali per 60-90 minuti.\n"
    "OGNI SLIDE ha: titolo (cosa c'e' scritto grande), punti (i bullet a schermo, "
    "3-5 brevissimi), nota_relatore (cosa dice il partner mentre la mostra).\n"
    "REGOLE (brand voice Ciak, non negoziabili):\n"
    "- Una slide = una sola idea. Se hai due idee, fai due slide.\n"
    "- Bullet brevissimi: parole, non frasi. Il discorso sta nella nota_relatore.\n"
    "- Italiano semplice e diretto. Niente superlativi (mai 'potente', 'incredibile', '10x').\n"
    "- Nella fase L'offerta: una slide dedicata al prezzo (e alla scadenza se c'e' una promo), "
    "una ai bonus solo se esistono, una al 'come comprare adesso'. Mai inventare importi, bonus o garanzie.\n"
    "- La slide di apertura e' la cover: titolo del webinar + chi parla.\n"
    "- La nota_relatore e' parlata: deve suonare come parla una persona, non un manuale."
)

_INPUT_KEYS = [
    "nicchia", "momento_di_vita", "promessa",
    "trasformazione_90gg", "prezzo_e_formato",
    "metodo_nome", "metodo_step", "differenza_riconoscibile",
    "prova_sociale_concreta",
]


def _t(answers: dict, key: str, fallback: str = "") -> str:
    return (answers.get(key) or fallback).strip()


def _clean(s: Any) -> str:
    return " ".join(str(s or "").split())


def _normalize(out: dict, titolo_fallback: str) -> dict:
    """Porta l'output AI nella forma del frontend e ordina le slide per fase."""
    slides_in = out.get("slides") or []
    ordine = {n: i for i, n in enumerate(_NOMI_FASI)}
    norm: list[dict] = []
    for s in slides_in:
        fase = _clean(s.get("fase"))
        if fase not in ordine:
            fase = _NOMI_FASI[0]
        punti = [_clean(p) for p in (s.get("punti") or []) if _clean(p)][:5]
        titolo = _clean(s.get("titolo"))
        if not titolo and not punti:
            continue
        norm.append({
            "fase": fase,
            "titolo": titolo or "(senza titolo)",
            "punti": punti,
            "nota_relatore": _clean(s.get("nota_relatore")),
        })
    # Ordine stabile per fase, mantenendo l'ordine d'arrivo dentro la fase.
    norm.sort(key=lambda x: ordine[x["fase"]])
    return {
        "titolo": _clean(out.get("titolo")) or titolo_fallback,
        "slides": norm,
        "source": "ai",
    }


def _deterministic(answers: dict, outline: dict | None, strategia: dict | None, offer: dict | None = None) -> dict:
    """Fallback senza AI: un deck completo dai dati del partner e dalla strategia.
    Non si blocca mai: il partner non resta davanti a un deck vuoto."""
    nicchia = _t(answers, "nicchia", "il tuo cliente ideale")
    metodo = _t(answers, "metodo_nome", "il tuo metodo")
    trasf = _t(answers, "trasformazione_90gg", "il risultato che prometti")
    differenza = _t(answers, "differenza_riconoscibile")
    prova = _t(answers, "prova_sociale_concreta")
    passi_raw = _t(answers, "metodo_step")

    corso = _clean((outline or {}).get("course_name")) or "il tuo corso"
    strat = strategia or {}
    web = strat.get("webinar") or {}
    prezzo = strat.get("prezzo") or {}
    titolo_web = _clean(web.get("titolo")) or f"Come arrivare a {trasf}"
    if offer:  # il prezzo viene sempre dall'offerta vera, mai da quanto scritto in precedenza
        listino = offer_price.fmt(offer["listino"])
        promo = offer_price.fmt(offer["promo"])
    else:
        listino = _clean(prezzo.get("listino"))
        promo = _clean(prezzo.get("promo_webinar"))
    scadenza = _clean(prezzo.get("scadenza_promo")) or "entro 48h dal live"
    bonus = [_clean(b) for b in (prezzo.get("bonus") or []) if _clean(b)]  # mai bonus inventati

    # I passi del metodo: dalla risposta del partner, altrimenti 3 segnaposto.
    passi = [p.strip(" -•\t") for p in passi_raw.replace(";", "\n").splitlines() if p.strip()]
    if not passi:
        passi = ["Primo passo del metodo", "Secondo passo", "Terzo passo"]
    passi = passi[:5]

    slides: list[dict] = []

    def add(fase, titolo, punti, nota):
        slides.append({"fase": fase, "titolo": titolo, "punti": punti, "nota_relatore": nota})

    # Apertura (2)
    add("Apertura", titolo_web,
        ["Webinar live gratuito", "Resta fino alla fine"],
        f"Presentati e di' subito cosa porteranno a casa stasera: {trasf}. Chiedi di restare fino in fondo perche' alla fine c'e' qualcosa solo per chi e' al live.")
    add("Apertura", "Cosa otterrai stasera",
        ["Il problema vero", "Il metodo passo-passo", "Come iniziare subito"],
        "Anticipa l'agenda in 3 punti. Crea l'aspettativa di un percorso chiaro, non di una vendita.")

    # Il problema (3)
    add("Il problema", f"Il vero problema di {nicchia}",
        ["Dove ci si blocca", "Perche' fa perdere tempo"],
        f"Nomina il problema reale di {nicchia}. Falli sentire capiti: descrivi la loro giornata, non la teoria.")
    add("Il problema", "Perche' i tentativi soliti falliscono",
        ["Soluzioni a pezzi", "Nessun sistema", "Si molla a meta'"],
        "Spiega perche' i metodi che hanno gia' provato non funzionano. Non per colpa loro: per come sono fatti.")
    add("Il problema", "Cosa cambia con un sistema",
        ["Un percorso, non trucchi", "Risultati ripetibili"],
        "Sposta la cornice: serve un sistema, non l'ennesimo trucco. Apri il ponte verso il tuo metodo.")

    # Il metodo (>=4): intro + un passo per slide
    add("Il metodo", f"{metodo}: come funziona",
        ["I passi in ordine", "Il 'cosa', non tutto il 'come'"],
        f"Presenta {metodo} come una mappa. Dirai i passi, non ogni dettaglio: il 'come' completo e' nel corso.")
    for i, passo in enumerate(passi, start=1):
        add("Il metodo", f"Passo {i}: {passo}",
            ["Cosa fare", "Errore da evitare"],
            f"Spiega il passo {i} con un esempio concreto. Un passo per slide, niente fretta.")

    # Le prove (3)
    add("Le prove", "Funziona davvero",
        [prova or "Un caso reale", "Numeri concreti"],
        f"Porta una prova concreta: {prova or 'un risultato reale, con numeri'}. Racconta la storia, non solo il dato.")
    add("Le prove", "Cosa dicono le persone",
        ["Testimonianza 1", "Testimonianza 2"],
        "Mostra 1-2 testimonianze vere (screenshot, frasi). Lascia parlare loro, non te.")
    add("Le prove", f"Perche' io e non altri",
        [differenza or "La mia differenza"],
        f"Di' cosa ti rende riconoscibile: {differenza or 'la tua differenza vera'}. Senza gonfiare, con un fatto.")

    # L'offerta (4)
    add("L'offerta", f"{corso}",
        ["Cosa include", "Per chi e'"],
        f"Presenta {corso}: cosa contiene e per chi e'. Collega ogni parte al risultato promesso.")
    if bonus:
        add("L'offerta", "I bonus (solo per chi e' al live)",
            bonus[:3],
            "Elenca i bonus e di' chiaramente che si sbloccano solo comprando entro la scadenza.")
    if promo:
        add("L'offerta", "Il prezzo, solo stasera",
            [f"Listino {listino}", f"Stasera {promo}", f"Scade {scadenza}"],
            f"Mostra il prezzo: a listino {listino}, stasera {promo}, valido {scadenza}. Spiega perche' premi chi agisce subito.")
    else:
        add("L'offerta", "Il prezzo",
            [f"Prezzo {listino}"],
            f"Mostra il prezzo: {listino}. Di' cosa e' incluso e come si acquista.")
    add("L'offerta", "Come iniziare adesso",
        ["Clicca il link", "Compila e parti"],
        "Mostra il link e descrivi i 2-3 passi per comprare. Rendi facile dire di si' adesso.")

    # Q&A e chiusura (2)
    add("Q&A e chiusura", "Le domande piu' comuni",
        ["Obiezione 1 → risposta", "Obiezione 2 → risposta"],
        "Anticipa le 2-3 obiezioni piu' frequenti e sciogline. Poi apri alle domande dal vivo.")
    add("Q&A e chiusura", "La scadenza e' adesso" if promo else "Come iniziare",
        [f"Promo {promo}", f"Scade {scadenza}", "Link in chat"] if promo else [f"Prezzo {listino}", "Link in chat"],
        "Ultima call to action: ricorda prezzo e link. Chiudi ringraziando chi e' rimasto.")

    return {"titolo": titolo_web, "slides": slides, "source": "fallback"}


def _call_claude(answers: dict, outline: dict | None, strategia: dict | None, offer: dict | None = None) -> dict:
    """Chiamata sincrona Anthropic tool-use. Solleva eccezione in caso di errore."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    pos = "\n".join(
        f"- {k}: {(answers.get(k) or '').strip()}"
        for k in _INPUT_KEYS if (answers.get(k) or "").strip()
    )

    corso = _clean((outline or {}).get("course_name"))
    blocco_corso = f"\nCorso del partner: {corso}" if corso else ""

    blocco_strat = ""
    strat = strategia or {}
    web = strat.get("webinar") or {}
    prezzo = strat.get("prezzo") or {}
    if web or prezzo:
        fasi = web.get("fasi") or []
        righe_fasi = "\n".join(
            f"  - {_clean(f.get('fase'))}: {_clean(f.get('cosa_dire'))}"
            for f in fasi if _clean(f.get("cosa_dire"))
        )
        bonus = [_clean(b) for b in (prezzo.get("bonus") or []) if _clean(b)]
        blocco_strat = (
            "\n\nStrategia del webinar gia' approvata (usala come base, non contraddirla):\n"
            f"- Titolo: {_clean(web.get('titolo'))}\n"
            f"- Durata: {web.get('durata_min', '')} min\n"
            f"- Scadenza della promo: {_clean(prezzo.get('scadenza_promo'))}\n"
            + (f"- Bonus: {', '.join(bonus)}\n" if bonus else "")
            + (f"- Cosa si dice per fase:\n{righe_fasi}" if righe_fasi else "")
        )

    blocco_prezzo = f"\n\n{offer_price.prompt_block(offer)}" if offer else ""
    user = (
        f"Posizionamento del partner:\n{pos}{blocco_corso}{blocco_strat}{blocco_prezzo}\n\n"
        "Genera il DECK del webinar: ~20-26 slide in ordine, raggruppate nelle 6 fasi. "
        "Per ogni slide dammi fase, titolo, punti (bullet a schermo brevissimi) e "
        "nota_relatore (cosa dice il partner). La fase L'offerta deve avere una slide "
        "per il prezzo (con la scadenza se c'e' una promo), una per i bonus SOLO se esistono "
        "e una per il 'come comprare adesso'. Usa solo gli importi dati: nessun altro numero in euro."
    )

    from .agent_deliverable import system_blocks

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "webinar_deck",
        "description": "Restituisci il deck del webinar slide per slide.",
        "input_schema": _SCHEMA,
    }
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=6000,
        # Il deck del webinar e' di ANDREA (lo dice il docstring del file).
        system=system_blocks("ANDREA", _SYSTEM),
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "webinar_deck"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    slides = out.get("slides")
    return isinstance(slides, list) and len(slides) >= 8


async def build_webinar_deck(
    answers: dict, outline: dict | None = None, strategia: dict | None = None, offer: dict | None = None
) -> dict:
    """Ritorna {titolo, slides:[{fase, titolo, punti:[], nota_relatore}], source}.

    Prova la sintesi AI; in caso di errore o output incompleto ricade sullo scheletro
    deterministico. Non solleva mai: lo step non deve mai bloccarsi.
    """
    titolo_fallback = _clean(((strategia or {}).get("webinar") or {}).get("titolo")) or "Il tuo webinar"
    try:
        out = await asyncio.to_thread(_call_claude, answers, outline, strategia, offer)
        if _valid(out):
            result = _normalize(out, titolo_fallback)
            if offer:
                foreign = offer_price.foreign_amounts(result, offer["allowed"])
                if foreign:
                    logger.warning(f"[WEBINAR-DECK] L'AI ha scritto importi non dell'offerta {foreign} — scheletro deterministico")
                    return _deterministic(answers, outline, strategia, offer)
            return result
        logger.warning("[WEBINAR-DECK] Deck AI incompleto — uso scheletro deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[WEBINAR-DECK] Deck AI fallito ({e}) — uso scheletro deterministico")
    return _deterministic(answers, outline, strategia, offer)
