"""Elaborazione narrativa della storia del partner (Esamina, agente Valentina).

⚠️ Perché esiste: fino al 12/8/2026 il documento "La tua storia" stampava le 21
risposte grezze e basta. Nessun agente le elaborava, quindi se il partner
rispondeva per punti il documento usciva per punti, e la Hero Story restava da
scrivere a mano. Qui le risposte diventano un racconto continuo, utilizzabile.

Stesso impianto degli altri generatori del posizionamento: tool-use Anthropic con
schema, e fallback deterministico che non solleva mai. Il PDF deve poter uscire
anche senza API key o con il modello irraggiungibile.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("STORIA_NARRATIVA_MODEL", "claude-sonnet-4-6")

# Le 21 domande, con l'etichetta che serve al modello per capire cosa ha in mano.
_ORDINE = [
    ("S01", "Prima di questo lavoro"), ("S02", "Com'era la tua vita"),
    ("S03", "Come ti descrivevi"), ("S04", "La difficoltà più grande"),
    ("S05", "Cosa non funzionava"), ("S06", "Cosa ti faceva stare male"),
    ("S07", "Cosa volevi cambiare"), ("S08", "L'evento che ha cambiato tutto"),
    ("S09", "Quando hai deciso"), ("S10", "Chi o cosa ti ha aiutato"),
    ("S11", "Gli ostacoli"), ("S12", "Gli errori"), ("S13", "I sacrifici"),
    ("S14", "La lezione più importante"), ("S15", "Quando hai capito che funzionava"),
    ("S16", "Il primo vero successo"), ("S17", "Un cliente indimenticabile"),
    ("S18", "Perché lo fai"), ("S19", "La tua missione"),
    ("S20", "L'impatto che vuoi lasciare"), ("S21", "I tuoi valori"),
]

_SYSTEM = (
    "Sei Valentina, stratega di Evolution PRO. Ricevi le 21 risposte di un partner "
    "al questionario narrativo e le trasformi nel materiale di storytelling che userà "
    "per mesi: pagina Chi sono, apertura della masterclass, contenuti social, email.\n"
    "\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Scrivi in PRIMA PERSONA, come se fosse il partner a raccontarsi. È testo che "
    "userà cosi' com'e', non una scheda su di lui.\n"
    "- Frasi brevi: massimo 25 parole PER FRASE. Vale sulla singola frase e NON e' un "
    "limite alla lunghezza del testo: i blocchi sono lunghi, fatti di frasi brevi.\n"
    "- Mai il trattino lungo. Al suo posto virgola, punto o parentesi.\n"
    "- Niente registro guru, niente frasi motivazionali, niente 'la mia vita e' "
    "cambiata per sempre'. Concretezza: fatti, luoghi, date, gesti.\n"
    "- ⛔ NON INVENTARE NULLA. Nessun fatto, numero, nome, data o dettaglio che non "
    "sia nelle risposte. Se un passaggio manca, scrivi meno oppure segnala tra "
    "parentesi quadre [dato da aggiungere]. Meglio un buco dichiarato che un "
    "dettaglio inventato: questa storia il partner la racconterà in pubblico.\n"
    "\n"
    "LUNGHEZZA: il difetto da evitare e' la sintesi. Il partner ha scritto 21 "
    "risposte e si aspetta un racconto, non un riassunto. Espandi il materiale che "
    "ha dato, collega i passaggi, restituisci continuità narrativa.\n"
    "\n"
    "COSA PRODUCI:\n"
    "1. hero_story: 700-1000 parole. Il racconto completo in prosa continua, in "
    "prima persona, nell'ordine: com'era prima, cosa non funzionava, il momento "
    "preciso in cui e' cambiato qualcosa, il percorso con ostacoli ed errori veri, "
    "il primo risultato, cosa fa oggi e perche'. Deve leggersi come una storia, non "
    "come 21 risposte incollate. Niente titoletti interni.\n"
    "2. versione_breve: 120-160 parole. La stessa storia condensata per la bio della "
    "pagina Chi sono e per le presentazioni.\n"
    "3. paragrafo_apertura: 60-90 parole. Il paragrafo con cui aprire la masterclass "
    "o un video: parte dal punto in cui si trovava lui, che e' il punto in cui si "
    "trova adesso chi ascolta.\n"
    "4. momenti_chiave: da 4 a 6 momenti. Per ognuno un titolo breve e una "
    "descrizione di 40-70 parole. Sono i passaggi riutilizzabili come spunto per un "
    "post, una email o un video.\n"
    "5. note_al_partner: 100-150 parole. Cosa manca o e' troppo vago nelle risposte "
    "per reggere in pubblico, e quale domanda dovrebbe farsi per completarlo. "
    "Indirizzato a lui, in seconda persona."
)

_SCHEMA = {
    "type": "object",
    "properties": {
        "hero_story": {"type": "string", "description": "Racconto completo in prima persona, 700-1000 parole."},
        "versione_breve": {"type": "string", "description": "Bio condensata, 120-160 parole."},
        "paragrafo_apertura": {"type": "string", "description": "Apertura per masterclass o video, 60-90 parole."},
        "momenti_chiave": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "titolo": {"type": "string"},
                    "descrizione": {"type": "string"},
                },
                "required": ["titolo", "descrizione"],
            },
        },
        "note_al_partner": {"type": "string", "description": "Cosa manca o e' vago, 100-150 parole."},
    },
    "required": ["hero_story", "versione_breve", "paragrafo_apertura", "momenti_chiave"],
}


def _call_claude(answers: dict, nome: str) -> dict:
    """Chiamata sincrona Anthropic tool-use. Solleva eccezione in caso di errore."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    payload = "\n".join(
        f"- {label}: {(answers.get(qid) or '').strip()}"
        for qid, label in _ORDINE if (answers.get(qid) or "").strip()
    )
    user = (
        f"Partner: {nome}\nRisposte al questionario narrativo:\n{payload}\n\n"
        "Produci il materiale di storytelling."
    )

    client = anthropic.Anthropic(api_key=api_key)
    tool = {
        "name": "storia_partner",
        "description": "Restituisci il materiale narrativo strutturato.",
        "input_schema": _SCHEMA,
    }
    from .agent_deliverable import system_blocks

    resp = client.messages.create(
        model=_MODEL,
        max_tokens=8000,  # hero_story da sola può arrivare a ~1400 token
        # La storia la lavora VALENTINA (STEP_TO_AGENT: "la-tua-storia").
        system=system_blocks("VALENTINA", _SYSTEM),
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "tool", "name": "storia_partner"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valid(out: Any) -> bool:
    """Valida anche la LUNGHEZZA: un hero_story di tre righe è il difetto che
    questo modulo esiste per evitare, quindi non deve passare per buono."""
    if not isinstance(out, dict):
        return False
    hero = (out.get("hero_story") or "").strip()
    if len(hero.split()) < 350:
        logger.warning("[STORIA] hero_story troppo corta (%d parole)", len(hero.split()))
        return False
    if not (out.get("versione_breve") or "").strip():
        return False
    momenti = out.get("momenti_chiave")
    return isinstance(momenti, list) and len(momenti) >= 3


def _deterministic(answers: dict) -> dict:
    """Fallback senza AI: incolla le risposte nell'ordine narrativo, per blocchi.
    Non è una Hero Story, ed è dichiarato come tale nelle note."""
    def t(qid: str) -> str:
        return (answers.get(qid) or "").strip()

    hero = " ".join(filter(None, [t(q) for q, _ in _ORDINE]))
    return {
        # Marcatore: il renderer non stampa una "hero story" che è solo la
        # concatenazione delle risposte, altrimenti il partner la legge due volte.
        "_fallback": True,
        "hero_story": hero,
        "versione_breve": " ".join(filter(None, [t("S01"), t("S08"), t("S18")])),
        "paragrafo_apertura": t("S04") or t("S01"),
        "momenti_chiave": [
            {"titolo": label, "descrizione": t(qid)}
            for qid, label in (("S08", "Il momento di svolta"), ("S12", "Gli errori"),
                               ("S16", "Il primo vero successo"), ("S18", "Perché lo fai"))
            if t(qid)
        ],
        "note_al_partner": (
            "Questo testo è la trascrizione ordinata delle tue risposte, non ancora una "
            "storia riscritta: l'elaborazione automatica non è andata a buon fine. "
            "Il materiale è tutto qui e resta valido, va solo ricucito. Segnalalo al team "
            "e lo rigeneriamo."
        ),
    }


async def genera_storia_narrativa(answers: dict, nome: str) -> dict:
    """Ritorna {hero_story, versione_breve, paragrafo_apertura, momenti_chiave, note_al_partner}.

    Non solleva mai: su qualunque errore o output troppo corto ricade sul fallback.
    """
    try:
        out = await asyncio.to_thread(_call_claude, answers, nome)
        if _valid(out):
            return out
        logger.warning("[STORIA] Elaborazione AI incompleta o troppo sintetica, uso il fallback")
    except Exception as e:  # noqa: BLE001
        logger.warning("[STORIA] Elaborazione AI fallita (%s), uso il fallback", e)
    return _deterministic(answers)
