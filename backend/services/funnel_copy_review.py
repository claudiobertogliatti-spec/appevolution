"""Controllo del copy sulle modifiche che il partner chiede al suo funnel (F-13).

Il partner guarda un elemento della pagina (titolo, video, modulo…) e sceglie «Approva» oppure
«Modifica». Se modifica, scrive come lo vorrebbe. Qui GAIA, con la sua esperienza, valuta se la
richiesta ha senso come copy:

  - correzione di un dato (nome, prezzo, data, contatto) o miglioramento sensato → "ok": va al team;
  - richiesta che peggiora il copy o che non si può scrivere (promesse di risultato garantito,
    numeri o testimonianze non verificabili, titolo illeggibile, nonsense) → "sconsiglio":
    NON viene salvata; Gaia spiega il perché in modo semplice e propone un'alternativa.
    Il partner può comunque insistere: in quel caso la richiesta va al team con la nota di Gaia.

Il modello non decide mai da solo di cambiare la pagina: al massimo spiega e propone.
Se la chiamata fallisce non si blocca nessuno: la richiesta viene inoltrata al team senza giudizio.
"""
import asyncio
import logging
import os
from typing import Any, Dict

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("FUNNEL_COPY_REVIEW_MODEL", "claude-sonnet-4-6")

OK = "ok"
SCONSIGLIO = "sconsiglio"
INOLTRATA = "inoltrata"

_SYSTEM = (
    "COMPITO ADESSO: un partner sta guardando la bozza del suo funnel e chiede di modificare UN elemento "
    "di una pagina. Valuta la richiesta come copy e rispondi con lo strumento.\n\n"
    "Chi risponde di cosa: tu rispondi del COPY (chiarezza, onestà, struttura, coerenza). Il partner risponde della "
    "SUA DISCIPLINA. Se la modifica corregge un termine tecnico del suo settore (il nome di una tecnica, di un "
    "esercizio, di un concetto, di uno strumento) il partner è l'esperto: verdict = \"ok\", senza discutere e senza "
    "proporre alternative. Non confondere un termine tecnico con una scelta di copy: la prima la decide lui, "
    "la seconda la valuti tu.\n\n"
    "Come decidi:\n"
    "- verdict = \"ok\" se è la correzione di un dato (nome, prezzo, data, contatto, titolo del corso) o un "
    "miglioramento sensato, chiaro e onesto.\n"
    "- verdict = \"sconsiglio\" se la modifica peggiora il copy o non si può scrivere. Esempi: promette risultati "
    "garantiti o guadagni; inventa numeri, percentuali, recensioni o testimonianze non verificabili; "
    "usa scarsità o urgenza finte; cita malattie o cure; rende il testo lungo, confuso o illeggibile; "
    "contraddice il resto del funnel; non ha senso.\n"
    "- Nel dubbio sul gusto personale (preferenza di stile senza danno) scegli \"ok\": decide il team.\n\n"
    "Se la richiesta è un'AGGIUNTA (una domanda frequente, un punto elenco, un passo) valutala allo stesso modo: "
    "ok se è utile, onesta e coerente con il resto; sconsiglio se promette risultati, inventa dati o ripete "
    "ciò che c'è già. Per una domanda frequente, se manca la risposta, scrivila tu in `proposta` usando solo i fatti dati.\n\n"
    "Se l'elemento è «L'aspetto» il partner chiede di cambiare colori, una foto o un carattere:\n"
    "- verdict = \"ok\" solo se è in linea con il BRAND KIT del partner che ti viene dato (palette, tono di voce, "
    "parole da evitare, font). Per una foto: ok se è una foto sua o coerente con il suo brand; la qualità e i diritti "
    "li controlla il team.\n"
    "- verdict = \"sconsiglio\" se esce dal brand kit (colore fuori palette, font diverso da quello del brand, "
    "foto che non c'entra): spiega che il funnel deve sembrare lo stesso del suo sito e dei suoi materiali, e "
    "proponi la scelta più vicina dentro il brand kit.\n"
    "- Se il brand kit non contiene l'informazione che serve (per esempio nessun font registrato), NON indovinare: "
    "scegli \"ok\" e lascia che il team verifichi.\n\n"
    "Come scrivi la spiegazione (solo se sconsiglio):\n"
    "- Italiano semplice, 2 o 3 frasi, rivolto al partner con il tu. Il partner non è un tecnico né un copywriter.\n"
    "- Spiega il PERCHÉ in concreto (cosa succede a chi legge, o quale regola lo vieta), senza giudicare la persona.\n"
    "- Mai emoji, mai gergo da marketing, mai il trattino lungo.\n"
    "- In `proposta` scrivi, se esiste, una versione alternativa pronta da usare che rispetta l'idea del partner. "
    "Altrimenti lascia vuoto.\n"
    "- Non inventare mai fatti sul partner o sul corso: usa solo ciò che ti è stato dato."
)

_SCHEMA = {
    "type": "object",
    "properties": {
        "verdict": {"type": "string", "enum": [OK, SCONSIGLIO]},
        "spiegazione": {"type": "string", "description": "Vuota se ok. Se sconsiglio: 2-3 frasi semplici."},
        "proposta": {"type": "string", "description": "Alternativa pronta da usare, oppure vuoto."},
    },
    "required": ["verdict", "spiegazione", "proposta"],
}


def _clean(value: Any, limit: int) -> str:
    return " ".join(str(value or "").replace("<", "").replace(">", "").split())[:limit]


def brand_summary(kit: Dict[str, Any]) -> str:
    """Il brand kit come lo vede Gaia. Solo ciò che esiste: mai valori inventati."""
    kit = kit or {}
    rows = []
    if kit.get("colors"):
        rows.append("Colori: " + ", ".join(_clean(c, 20) for c in kit["colors"][:8]))
    if kit.get("font") or kit.get("fonts"):
        rows.append("Font: " + _clean(kit.get("font") or kit.get("fonts"), 120))
    if kit.get("tone_of_voice"):
        rows.append("Tono di voce: " + _clean(kit["tone_of_voice"], 400))
    if kit.get("parole_chiave"):
        rows.append("Parole chiave: " + ", ".join(_clean(x, 40) for x in kit["parole_chiave"][:10]))
    if kit.get("parole_evitare"):
        rows.append("Parole da evitare: " + ", ".join(_clean(x, 40) for x in kit["parole_evitare"][:10]))
    return "\n".join(rows) or "Brand kit non disponibile."


def build_user_message(page_title: str, part_label: str, current_text: str, wanted: str, course: str,
                       brand: str = "") -> str:
    return (
        f"Corso: {_clean(course, 120) or 'non indicato'}\n"
        f"Pagina: {_clean(page_title, 120)}\n"
        f"Elemento: {_clean(part_label, 120)}\n"
        f"Testo attuale: {_clean(current_text, 600) or '(non mostrato al partner)'}\n"
        f"Brand kit del partner:\n{brand or 'Brand kit non disponibile.'}\n"
        f"Modifica richiesta dal partner: {_clean(wanted, 600)}"
    )


def _call_claude(user: str) -> Dict[str, Any]:
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")
    from .agent_deliverable import system_blocks

    client = anthropic.Anthropic(api_key=api_key)
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=600,
        system=system_blocks("GAIA", _SYSTEM),
        messages=[{"role": "user", "content": user}],
        tools=[{"name": "valuta_modifica", "description": "Esito della valutazione della modifica.",
                "input_schema": _SCHEMA}],
        tool_choice={"type": "tool", "name": "valuta_modifica"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def normalize(out: Any) -> Dict[str, str]:
    """Accetta solo un esito completo e coerente; altrimenti inoltra al team senza giudizio."""
    if not isinstance(out, dict) or out.get("verdict") not in (OK, SCONSIGLIO):
        return {"verdict": INOLTRATA, "spiegazione": "", "proposta": ""}
    spiegazione = _clean(out.get("spiegazione"), 700)
    if out["verdict"] == SCONSIGLIO and len(spiegazione) < 10:
        # non si boccia una richiesta senza spiegarne il motivo
        return {"verdict": INOLTRATA, "spiegazione": "", "proposta": ""}
    return {
        "verdict": out["verdict"],
        "spiegazione": spiegazione if out["verdict"] == SCONSIGLIO else "",
        "proposta": _clean(out.get("proposta"), 600) if out["verdict"] == SCONSIGLIO else "",
    }


async def assess_edit(page_title: str, part_label: str, current_text: str, wanted: str, course: str,
                      brand: str = "") -> Dict[str, str]:
    """Non solleva mai: in caso di errore la richiesta va al team senza giudizio."""
    try:
        out = await asyncio.to_thread(_call_claude, build_user_message(page_title, part_label, current_text, wanted, course, brand))
        return normalize(out)
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[funnel-copy-review] valutazione non riuscita ({e}): inoltro al team")
        return {"verdict": INOLTRATA, "spiegazione": "", "proposta": ""}
