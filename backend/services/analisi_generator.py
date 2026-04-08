"""
Motore di generazione output dal questionario cliente.
Genera: scoring deterministico, analisi strategica (AI), script call (AI), PDF.
"""
import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ─── SCORING DETERMINISTICO ──────────────────────────────────────────────────

SCORE_ESPERIENZA = {"meno_1": 2, "1_3": 5, "3_5": 8, "oltre_5": 10}
SCORE_PUBBLICO   = {"no": 0, "piccolo": 4, "medio": 7, "grande": 10}
SCORE_VENDITE    = {"no": 0, "provato": 3, "attivo": 7, "avanzato": 10}

LABEL_ESPERIENZA = {"meno_1": "Meno di 1 anno", "1_3": "1-3 anni", "3_5": "3-5 anni", "oltre_5": "Oltre 5 anni"}
LABEL_PUBBLICO   = {"no": "Nessun pubblico", "piccolo": "< 1.000", "medio": "1.000-10.000", "grande": "> 10.000"}
LABEL_VENDITE    = {"no": "Nessuna vendita online", "provato": "Tentativi senza risultati", "attivo": "Fatturato ricorrente", "avanzato": "> 50k/anno digitale"}


def calcola_scoring(quiz: dict) -> dict:
    """
    Calcola punteggio deterministico su 4 dimensioni.
    Restituisce score, breakdown, classificazione.
    """
    esp = SCORE_ESPERIENZA.get(quiz.get("esperienza", ""), 0)
    pub = SCORE_PUBBLICO.get(quiz.get("pubblico", ""), 0)
    ven = SCORE_VENDITE.get(quiz.get("vendite_online", ""), 0)

    # Chiarezza problema: basata su lunghezza e specificità
    problema = quiz.get("problema", "")
    if len(problema) > 120:
        prob = 10
    elif len(problema) > 70:
        prob = 7
    elif len(problema) > 30:
        prob = 4
    else:
        prob = 1

    totale = esp + pub + ven + prob
    max_score = 40
    pct = round((totale / max_score) * 100, 1)

    if pct >= 65:
        classificazione = "IDONEO"
    elif pct >= 40:
        classificazione = "IDONEO_CON_RISERVA"
    else:
        classificazione = "NON_IDONEO"

    return {
        "totale": totale,
        "max": max_score,
        "percentuale": pct,
        "classificazione": classificazione,
        "breakdown": {
            "esperienza":        {"punteggio": esp, "max": 10, "valore": quiz.get("esperienza", ""), "label": LABEL_ESPERIENZA.get(quiz.get("esperienza", ""), "")},
            "pubblico":          {"punteggio": pub, "max": 10, "valore": quiz.get("pubblico", ""), "label": LABEL_PUBBLICO.get(quiz.get("pubblico", ""), "")},
            "vendite":           {"punteggio": ven, "max": 10, "valore": quiz.get("vendite_online", ""), "label": LABEL_VENDITE.get(quiz.get("vendite_online", ""), "")},
            "chiarezza_problema": {"punteggio": prob, "max": 10, "lunghezza_testo": len(problema)},
        },
        "calcolato_il": datetime.now(timezone.utc).isoformat(),
    }


# ─── GENERAZIONE AI (ANALISI + SCRIPT CALL) ─────────────────────────────────

def _build_analisi_prompt(quiz: dict, scoring: dict) -> str:
    """Prompt per Claude: genera analisi strategica strutturata."""
    return f"""Sei un consulente strategico senior di Evolution PRO, azienda italiana che aiuta professionisti e imprenditori a costruire accademie digitali.

DATI CLIENTE:
- Ambito: {quiz.get('ambito', 'N/A')}
- Target: {quiz.get('target', 'N/A')}
- Problema risolto: {quiz.get('problema', 'N/A')}
- Esperienza: {LABEL_ESPERIENZA.get(quiz.get('esperienza', ''), 'N/A')}
- Pubblico: {LABEL_PUBBLICO.get(quiz.get('pubblico', ''), 'N/A')}
- Canale principale: {quiz.get('canale_principale', 'N/A')}
- Vendite online: {LABEL_VENDITE.get(quiz.get('vendite_online', ''), 'N/A')}
- Dettaglio vendite: {quiz.get('vendite_dettaglio', 'N/A')}
- Obiettivo: {quiz.get('obiettivo', 'N/A')}

SCORING: {scoring['totale']}/{scoring['max']} ({scoring['percentuale']}%) — {scoring['classificazione']}

Genera un'ANALISI STRATEGICA in italiano con ESATTAMENTE queste 5 sezioni.
Rispondi SOLO in JSON valido, senza markdown, senza commenti.

{{
  "sintesi_progetto": "2-3 frasi che sintetizzano il progetto, il posizionamento e la direzione strategica",
  "punti_di_forza": ["punto 1", "punto 2", "punto 3"],
  "criticita": ["criticità 1", "criticità 2"],
  "livello_maturita": "Una frase che descrive il livello complessivo: principiante / intermedio / avanzato, con motivazione",
  "direzione_consigliata": "2-3 frasi con la raccomandazione strategica principale e i primi passi consigliati"
}}"""


def _build_script_prompt(quiz: dict, scoring: dict, analisi: dict) -> str:
    """Prompt per Claude: genera script call strutturato."""
    return f"""Sei Claudio Bertogliatti, fondatore di Evolution PRO. Devi preparare lo script per una call strategica con un potenziale cliente.

PROFILO CLIENTE:
- Ambito: {quiz.get('ambito', 'N/A')}
- Target: {quiz.get('target', 'N/A')}
- Problema: {quiz.get('problema', 'N/A')}
- Esperienza: {LABEL_ESPERIENZA.get(quiz.get('esperienza', ''), 'N/A')}
- Pubblico: {LABEL_PUBBLICO.get(quiz.get('pubblico', ''), 'N/A')} (canale: {quiz.get('canale_principale', 'N/A')})
- Vendite: {LABEL_VENDITE.get(quiz.get('vendite_online', ''), 'N/A')}
- Obiettivo: {quiz.get('obiettivo', 'N/A')}

SCORING: {scoring['classificazione']} ({scoring['percentuale']}%)

ANALISI STRATEGICA GIÀ GENERATA:
- Sintesi: {analisi.get('sintesi_progetto', '')}
- Punti di forza: {', '.join(analisi.get('punti_di_forza', []))}
- Criticità: {', '.join(analisi.get('criticita', []))}

Genera uno SCRIPT CALL in italiano con ESATTAMENTE queste 6 sezioni.
Il tono è diretto, professionale ma umano. Parla in prima persona.
Rispondi SOLO in JSON valido, senza markdown.

{{
  "apertura_personalizzata": "2-3 frasi di apertura che dimostrano conoscenza del suo caso specifico",
  "diagnosi": "3-4 frasi dove descrivi cosa hai capito del suo progetto, mostrando competenza",
  "amplificazione_problema": "2-3 frasi che evidenziano il costo di rimanere nel modello attuale",
  "ponte": "2-3 frasi che collegano la sua situazione alla soluzione Evolution PRO",
  "proposta": "3-4 frasi con la proposta concreta personalizzata sul suo caso",
  "chiusura": "2-3 frasi con call to action chiaro e urgenza naturale"
}}"""


async def genera_analisi_ai(quiz: dict, scoring: dict) -> dict:
    """Genera analisi strategica usando Claude via Emergent."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        emergent_key = os.environ.get("EMERGENT_LLM_KEY", "")
        if not emergent_key:
            logger.warning("EMERGENT_LLM_KEY non configurata, uso fallback deterministico")
            return _analisi_fallback(quiz, scoring)

        llm = LlmChat(api_key=emergent_key)
        llm.with_model("anthropic", "claude-haiku-4-5-20251001")
        resp = await llm.send_message(
            UserMessage(content=_build_analisi_prompt(quiz, scoring))
        )

        import json
        text = resp.choices[0]["message"]["content"].strip() if resp.choices else ""
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)

    except Exception as e:
        logger.error(f"Errore generazione AI analisi: {e}")
        return _analisi_fallback(quiz, scoring)


async def genera_script_call_ai(quiz: dict, scoring: dict, analisi: dict) -> dict:
    """Genera script call usando Claude via Emergent."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        emergent_key = os.environ.get("EMERGENT_LLM_KEY", "")
        if not emergent_key:
            return _script_fallback(quiz, scoring)

        llm = LlmChat(api_key=emergent_key)
        llm.with_model("anthropic", "claude-haiku-4-5-20251001")
        resp = await llm.send_message(
            UserMessage(content=_build_script_prompt(quiz, scoring, analisi))
        )

        import json
        text = resp.choices[0]["message"]["content"].strip() if resp.choices else ""
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)

    except Exception as e:
        logger.error(f"Errore generazione AI script: {e}")
        return _script_fallback(quiz, scoring)


# ─── FALLBACK DETERMINISTICI (senza AI) ──────────────────────────────────────

def _analisi_fallback(quiz: dict, scoring: dict) -> dict:
    ambito = quiz.get("ambito", "il tuo ambito")
    target = quiz.get("target", "il tuo target")
    classificazione = scoring["classificazione"]

    if classificazione == "IDONEO":
        maturita = "Profilo avanzato con buone basi per la digitalizzazione"
        direzione = f"Consigliamo di procedere rapidamente con la costruzione dell'accademia digitale nell'ambito {ambito}. Il pubblico esistente e l'esperienza di vendita rappresentano un forte vantaggio competitivo."
    elif classificazione == "IDONEO_CON_RISERVA":
        maturita = "Profilo intermedio con margini di crescita significativi"
        direzione = f"Raccomandiamo un percorso graduale: consolidare prima il posizionamento in {ambito} e costruire un primo prodotto digitale minimo per validare la domanda."
    else:
        maturita = "Profilo alle prime fasi, necessita di lavoro preparatorio"
        direzione = f"Suggeriamo di investire inizialmente nella costruzione del pubblico e nella validazione dell'offerta per {target} prima di procedere con prodotti digitali complessi."

    return {
        "sintesi_progetto": f"Professionista nel settore {ambito} con focus su {target}. Scoring complessivo: {scoring['percentuale']}%.",
        "punti_di_forza": [
            f"Esperienza: {LABEL_ESPERIENZA.get(quiz.get('esperienza', ''), 'N/A')}",
            f"Problema chiaro: {quiz.get('problema', 'N/A')[:80]}",
        ],
        "criticita": [
            f"Pubblico: {LABEL_PUBBLICO.get(quiz.get('pubblico', ''), 'N/A')}",
            f"Vendite online: {LABEL_VENDITE.get(quiz.get('vendite_online', ''), 'N/A')}",
        ],
        "livello_maturita": maturita,
        "direzione_consigliata": direzione,
    }


def _script_fallback(quiz: dict, scoring: dict) -> dict:
    nome = "il cliente"
    ambito = quiz.get("ambito", "il tuo settore")
    return {
        "apertura_personalizzata": f"Ciao, ho letto con attenzione le tue risposte. Lavori in {ambito} e questo mi dice molto sul potenziale del tuo progetto.",
        "diagnosi": f"Da quello che vedo, hai una competenza solida ma il modello attuale ti limita nella crescita. Il tuo target ({quiz.get('target', 'N/A')}) ha bisogno di una soluzione scalabile.",
        "amplificazione_problema": "Ogni mese che passa senza un sistema digitale è un mese di opportunità perse. I tuoi competitor stanno già costruendo le loro accademie.",
        "ponte": "Evolution PRO è stato creato esattamente per questo: trasformare la tua competenza in un asset digitale che lavora per te 24/7.",
        "proposta": "Ti propongo un percorso personalizzato basato sulla tua analisi strategica. Partiamo dal posizionamento e arriviamo al lancio in 90 giorni.",
        "chiusura": "La domanda non è se farlo, ma quando. E il momento migliore è adesso, prima che il mercato si saturi ulteriormente.",
    }
