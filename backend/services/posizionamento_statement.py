"""Sintesi del Brand Positioning Statement (metodo De Veglia) dalle risposte del wizard.

Formula a 5 slot:
  <nome> è <categoria/mercato> che <idea differenziante>.
  A differenza dei concorrenti che <cosa fanno>, noi <cosa facciamo di diverso>,
  e questo per il cliente significa <vantaggi>.

Sintesi AI (Anthropic tool-use) con fallback deterministico: il PDF non si rompe mai.
Filtrato dalla brand voice Ciak: niente superlativi, frasi brevi, italiano semplice.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("POSIZIONAMENTO_STATEMENT_MODEL", "claude-sonnet-4-6")

SLOT_LABELS = {
    "brand": "Brand / nome",
    "categoria": "Categoria",
    "idea_differenziante": "Idea differenziante",
    "a_differenza_di": "A differenza di",
    "vantaggio_cliente": "Vantaggio cliente",
}

_SYSTEM = (
    "Sei uno stratega di posizionamento. Sintetizzi il Brand Positioning Statement "
    "di un partner secondo il metodo De Veglia, partendo dalle sue risposte.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti (mai 'potente', 'incredibile', '10x', 'il migliore').\n"
    "- Frasi brevi, massimo 25 parole per frase.\n"
    "- Usa 'percorso' invece di 'funnel', 'ambito specifico' invece di 'nicchia'.\n"
    "- L'idea differenziante deve essere una specializzazione concreta, non una qualità generica.\n"
    "Compila i 5 slot in modo che la frase finale sia: "
    "'<brand> è <categoria> che <idea_differenziante>. A differenza dei concorrenti che "
    "<a_differenza_di>, noi <idea_differenziante riformulata in azione>, e questo per il "
    "cliente significa <vantaggio_cliente>.' "
    "Ogni slot è una frase corta, senza ripetere le etichette."
)

_SCHEMA = {
    "type": "object",
    "properties": {
        "brand": {"type": "string", "description": "Nome del brand/metodo del partner."},
        "categoria": {"type": "string", "description": "Categoria/mercato in cui gioca (a chi parla)."},
        "idea_differenziante": {"type": "string", "description": "La specializzazione che lo rende lo specialista."},
        "a_differenza_di": {"type": "string", "description": "Cosa fanno i concorrenti / promessa affollata del settore."},
        "vantaggio_cliente": {"type": "string", "description": "Cosa cambia concretamente per il cliente."},
        "frase": {"type": "string", "description": "La frase a 5 slot assemblata, pronta da stampare."},
    },
    "required": ["brand", "categoria", "idea_differenziante", "a_differenza_di", "vantaggio_cliente", "frase"],
}


def _t(answers: dict, key: str, fallback: str = "") -> str:
    return (answers.get(key) or fallback).strip()


def _clip(s: str, n: int) -> str:
    s = " ".join(s.split())
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(" ", 1)[0]
    return cut.rstrip(",.;:") + "…"


def _frammento(testo: str) -> str:
    """Prepara una risposta del partner per essere incastonata IN MEZZO a una frase.

    Le risposte arrivano come frasi autonome ("Terapisti del massaggio thai...
    passaparola."): incollate tali e quali producevano maiuscole in mezzo alla
    frase e doppi punti ("...non un hobby.."). Rilevato il 12/8/2026 sull'output
    reale del fallback.
    """
    t = " ".join(str(testo or "").split()).rstrip(" .;,:")
    if not t:
        return ""
    # L'iniziale si abbassa solo se è una parola comune: un nome proprio o una
    # sigla (Metodo Sabai, PNL) resta com'è.
    prima = t.split(" ", 1)[0]
    if prima[:1].isupper() and not prima.isupper() and len(t.split()) > 1:
        seconda = t.split(" ", 1)[1][:1]
        if not seconda.isupper():  # "Metodo Sabai" -> resta, "Terapisti del" -> scende
            t = t[0].lower() + t[1:]
    return t


def _deterministic(answers: dict) -> dict:
    """Fallback senza AI: assembla gli slot dalle risposte grezze. Non si rompe mai."""
    brand = _t(answers, "metodo_nome", "Il tuo metodo")  # nome proprio: non si tocca
    categoria = _frammento(_clip(_t(answers, "nicchia", "il tuo mercato"), 90))
    idea = _frammento(_clip(_t(answers, "spazio_specialista") or _t(answers, "differenza_riconoscibile", "ha una specializzazione precisa"), 110))
    altri = _frammento(_clip(_t(answers, "mercato_affollato") or _t(answers, "concorrenti_principali", "promettono tutti la stessa cosa"), 110))
    vantaggio = _frammento(_clip(_t(answers, "trasformazione_90gg", "un risultato concreto e misurabile"), 110))

    # ⛔ Niente frase assemblata a incastro. La formula a cinque slot regge solo
    # con frammenti riscritti apposta: incollando le risposte cosi' come sono
    # usciva sgrammaticata ("A differenza di chi tutti promettono il diploma...").
    # Meglio dichiarare che la sintesi manca, che consegnarne una sbagliata: i
    # cinque elementi qui sotto sono corretti e bastano a comporla a mano.
    frase = (
        "I cinque elementi del posizionamento sono stati raccolti dalle tue risposte e li "
        "trovi qui sotto. La frase di sintesi va composta insieme a Valentina: la "
        "generazione automatica non e' andata a buon fine."
    )
    return {
        "_fallback": True,
        "brand": brand,
        "categoria": categoria,
        "idea_differenziante": idea,
        "a_differenza_di": altri,
        "vantaggio_cliente": vantaggio,
        "frase": frase,
    }


def _call_claude(answers: dict) -> dict:
    """Chiamata sincrona Anthropic tool-use. Solleva eccezione in caso di errore."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    keys = [
        "metodo_nome", "nicchia", "spazio_specialista", "differenza_riconoscibile",
        "concorrenti_principali", "mercato_affollato", "trasformazione_90gg",
        "contrarian_view", "promessa",
    ]
    payload = "\n".join(f"- {k}: {(answers.get(k) or '').strip()}" for k in keys if (answers.get(k) or "").strip())
    user = f"Risposte del partner:\n{payload}\n\nCompila i 5 slot e la frase finale."

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "brand_positioning_statement",
        "description": "Restituisci il Brand Positioning Statement strutturato.",
        "input_schema": _SCHEMA,
    }
    from .agent_deliverable import system_blocks

    resp = client.messages.create(
        model=_MODEL,
        max_tokens=1200,
        system=system_blocks("VALENTINA", _SYSTEM),
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "brand_positioning_statement"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    return all((out.get(k) or "").strip() for k in _SCHEMA["required"])


async def build_brand_positioning_statement(answers: dict) -> dict:
    """Ritorna {brand, categoria, idea_differenziante, a_differenza_di, vantaggio_cliente, frase}.

    Prova la sintesi AI; in caso di qualunque errore o output incompleto ricade
    sul fallback deterministico. Non solleva mai: il PDF deve sempre potersi generare.
    """
    try:
        out = await asyncio.to_thread(_call_claude, answers)
        if _valid(out):
            return {k: " ".join(str(out.get(k, "")).split()) for k in
                    ["brand", "categoria", "idea_differenziante", "a_differenza_di", "vantaggio_cliente", "frase"]}
        logger.warning("[POSIZIONAMENTO] Statement AI incompleto — uso fallback deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[POSIZIONAMENTO] Statement AI fallito ({e}) — uso fallback deterministico")
    return _deterministic(answers)


# --- Revisione di Valentina: documento strategico definitivo (avatar, consapevolezza, 3 obiezioni) ---

_REV_MODEL = os.environ.get("POSIZIONAMENTO_REVISIONE_MODEL", "claude-sonnet-4-6")

_REV_SYSTEM = (
    "Sei Valentina, stratega di posizionamento del metodo Evolution PRO (approccio "
    "De Veglia). Ricevi le risposte grezze di un partner al questionario di "
    "posizionamento e produci il DOCUMENTO STRATEGICO DEFINITIVO: ordinato, "
    "professionale, pronto da usare.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti ('potente', 'incredibile', '10x', 'il migliore').\n"
    "- Niente registro guru o coach motivazionale.\n"
    "- Frasi brevi: massimo 25 parole PER FRASE. Questo vale sulla singola frase e "
    "NON e' un limite alla lunghezza del testo: i blocchi devono essere lunghi, "
    "fatti di molte frasi brevi.\n"
    "- Mai il trattino lungo. Al suo posto virgola, punto o parentesi.\n"
    "- Usa 'percorso' invece di 'funnel', 'ambito specifico' invece di 'nicchia'.\n"
    "- Riordina e riscrivi cio' che ha scritto il partner: NON inventare numeri o "
    "fatti non presenti nelle risposte. Se un dato manca, dillo esplicitamente "
    "('da definire con il partner') invece di riempire con genericita'.\n"
    "\n"
    "LUNGHEZZA: questo e' un documento strategico che il partner paga e usa per mesi. "
    "Un blocco di due frasi non gli serve a niente. Scrivi in modo esteso e "
    "articolato, restando concreto: ogni affermazione deve poggiare su una risposta "
    "del questionario, non su un riempitivo.\n"
    "\n"
    "COSA PRODUCI:\n"
    "1. sintesi_strategica: 200-280 parole. Inquadra il posizionamento in tre "
    "movimenti: chi serve e in che momento, con quale promessa e perche' e' "
    "credibile proprio da lui, cosa implica questo per le prossime scelte "
    "(masterclass, moduli, prezzo). Chiudi indicando il punto piu' fragile del "
    "posizionamento attuale e cosa serve per rafforzarlo.\n"
    "2. avatar: 220-320 parole. Ritratto del cliente ideale in prosa continua: in "
    "che situazione si trova, com'e' fatta la sua giornata rispetto al problema, "
    "cosa ha gia' provato senza risultato e perche' non ha funzionato, cosa teme, "
    "cosa desidera davvero, cosa perde concretamente se non agisce. Scrivi come se "
    "dovessi farlo riconoscere al partner in una persona reale che ha gia' incontrato.\n"
    "3. consapevolezza: 160-240 parole. Indica il livello secondo il modello "
    "Schwartz (inconsapevole, consapevole del problema, della soluzione, del "
    "prodotto, molto consapevole) e motiva la scelta con le risposte date. Poi "
    "spiega cosa comunicare per primo, con che tipo di contenuto, e soprattutto "
    "cosa NON dire ancora perche' arriverebbe troppo presto.\n"
    "4. obiezioni: ESATTAMENTE 3 obiezioni, una per tipo. 'Esterna' (tempo, soldi, "
    "contesto), 'Interna' ('non fa per me', sfiducia in se'), 'Meccanismo' (dubbio "
    "che il metodo funzioni). Per ognuna: l'obiezione formulata con le parole che "
    "userebbe davvero il cliente (prima persona, tono parlato), e una risposta di "
    "80-120 parole. La risposta deve riconoscere il punto valido dell'obiezione "
    "prima di rispondere, usare un elemento concreto preso dalle risposte del "
    "partner, e non promettere nulla che non sia sostenibile."
)

_REV_SCHEMA = {
    "type": "object",
    "properties": {
        "sintesi_strategica": {"type": "string"},
        "avatar": {"type": "string"},
        "consapevolezza": {"type": "string"},
        "obiezioni": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "tipo": {"type": "string", "enum": ["Esterna", "Interna", "Meccanismo"]},
                    "obiezione": {"type": "string"},
                    "risposta": {"type": "string"},
                },
                "required": ["tipo", "obiezione", "risposta"],
            },
        },
    },
    "required": ["sintesi_strategica", "avatar", "consapevolezza", "obiezioni"],
}

_REV_KEYS = [
    "nicchia", "momento_di_vita", "livello_consapevolezza",
    "paure_avatar", "desideri_avatar", "costo_del_no",
    "promessa", "trasformazione_90gg", "prezzo_e_formato",
    "metodo_nome", "metodo_step", "prova_sociale_concreta",
    "origin_story", "contrarian_view", "differenza_riconoscibile",
    "concorrenti_principali", "mercato_affollato",
    "obiezione_principale", "limite_onesto", "spazio_specialista",
]


def _rev_t(answers: dict, key: str, fallback: str = "") -> str:
    return (answers.get(key) or fallback).strip()


def _rev_deterministic(answers: dict) -> dict:
    """Fallback senza AI: compone i blocchi dalle risposte grezze. Non si rompe mai."""
    avatar = " ".join(filter(None, [
        _rev_t(answers, "nicchia"),
        ("Teme: " + _rev_t(answers, "paure_avatar")) if _rev_t(answers, "paure_avatar") else "",
        ("Desidera: " + _rev_t(answers, "desideri_avatar")) if _rev_t(answers, "desideri_avatar") else "",
        ("Se non agisce: " + _rev_t(answers, "costo_del_no")) if _rev_t(answers, "costo_del_no") else "",
    ])).strip() or "Da definire con il partner."
    obiez_txt = _rev_t(answers, "obiezione_principale")
    obiezioni = [{
        "tipo": "Esterna",
        "obiezione": obiez_txt or "Costa troppo o non ho tempo adesso.",
        "risposta": "",
    }]
    # La sintesi del fallback metteva solo la promessa: una riga sola dove il
    # documento ne chiede duecento parole. Qui si concatenano le risposte che
    # compongono davvero il posizionamento, senza inventare nulla.
    sintesi = " ".join(filter(None, [
        _rev_t(answers, "promessa"),
        ("Il metodo si chiama " + _rev_t(answers, "metodo_nome") + ".") if _rev_t(answers, "metodo_nome") else "",
        ("Si rivolge a " + _rev_t(answers, "nicchia") + ".") if _rev_t(answers, "nicchia") else "",
        ("La differenza riconoscibile: " + _rev_t(answers, "differenza_riconoscibile") + ".") if _rev_t(answers, "differenza_riconoscibile") else "",
        ("La trasformazione attesa a 90 giorni: " + _rev_t(answers, "trasformazione_90gg") + ".") if _rev_t(answers, "trasformazione_90gg") else "",
        ("Prova concreta disponibile: " + _rev_t(answers, "prova_sociale_concreta") + ".") if _rev_t(answers, "prova_sociale_concreta") else "",
        "Questa sintesi è composta automaticamente dalle risposte: la revisione strategica è da completare con il team.",
    ])).strip()
    return {
        "sintesi_strategica": sintesi or "Posizionamento da rifinire con il team.",
        "avatar": avatar,
        "consapevolezza": _rev_t(answers, "livello_consapevolezza", "Da valutare."),
        "obiezioni": obiezioni,
    }


def _rev_call_claude(answers: dict, nome: str) -> dict:
    """Chiamata sincrona Anthropic tool-use. Solleva eccezione in caso di errore."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    payload = "\n".join(
        f"- {k}: {(answers.get(k) or '').strip()}"
        for k in _REV_KEYS if (answers.get(k) or "").strip()
    )
    user = (
        f"Partner: {nome}\nRisposte al questionario:\n{payload}\n\n"
        "Produci il documento strategico definitivo."
    )

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "documento_posizionamento",
        "description": "Restituisci il documento strategico di posizionamento.",
        "input_schema": _REV_SCHEMA,
    }
    from .agent_deliverable import system_blocks

    resp = client.messages.create(
        model=_REV_MODEL,
        # 1600 token non bastavano per i target di lunghezza chiesti nel system
        # prompt: il modello troncava o accorciava da solo. (12/8/2026)
        max_tokens=6000,
        # Il documento lo firma VALENTINA: parte dal suo prompt ufficiale, non da
        # un "sei uno stratega" generico. Fonte unica: agent_prompts.py.
        system=system_blocks("VALENTINA", _REV_SYSTEM),
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "documento_posizionamento"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _rev_valid(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    if not all((out.get(k) or "") for k in ["sintesi_strategica", "avatar", "consapevolezza"]):
        return False
    ob = out.get("obiezioni")
    return isinstance(ob, list) and len(ob) >= 1


async def genera_documento_definitivo(answers: dict, nome: str) -> dict:
    """Ritorna {sintesi_strategica, avatar, consapevolezza, obiezioni:[{tipo,obiezione,risposta}]}.

    Prova la revisione AI di Valentina; su qualunque errore o output incompleto
    ricade sul fallback deterministico. Non solleva mai: il PDF deve sempre
    potersi generare.
    """
    try:
        out = await asyncio.to_thread(_rev_call_claude, answers, nome)
        if _rev_valid(out):
            return out
        logger.warning("[POSIZIONAMENTO] Revisione AI incompleta — uso fallback deterministico")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[POSIZIONAMENTO] Revisione AI fallita ({e}) — uso fallback deterministico")
    return _rev_deterministic(answers)
