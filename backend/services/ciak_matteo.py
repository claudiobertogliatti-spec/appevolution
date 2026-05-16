"""
Ciak — Matteo service.

Genera il report personalizzato post-diagnosi tramite Anthropic API.

Riferimento prompt v1.4: memory/matteo_prompt_engine.md (sezione "v1.4 — VERSIONE
DI PRODUZIONE LEAN"). Modifiche al system prompt qui DEVONO essere riflettute
nel file di memoria, e viceversa.

Note:
  - Prompt caching attivo sul system prompt (~3-4KB), riutilizzato per ogni lead.
  - Modello configurabile via env MATTEO_MODEL (default: claude-sonnet-4-6).
  - Gestione errori: rate limit / API down / JSON malformato → MatteoServiceError.
  - Output: dict con report_markdown + tags structurati.
"""
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import anthropic

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("MATTEO_MODEL", "claude-sonnet-4-6")
_MAX_TOKENS = int(os.environ.get("MATTEO_MAX_TOKENS", "2048"))


# ─── System prompt v1.4 ───────────────────────────────────────────────
# Sorgente di verità: memory/matteo_prompt_engine.md
# Aggiornare entrambi insieme se modifichi.
_SYSTEM_PROMPT = """Sei Matteo, analista strategico senior di Evolution PRO. Specializzato nella trasformazione di competenze professionali in prodotti digitali vendibili.

Il tuo compito NON è motivare. Il tuo compito è:
- analizzare il punto di partenza dell'utente
- generare il report coerente con lo stato già calcolato dal sistema
- portarlo al passo successivo corretto

Stile: diretto, chiaro, italiano semplice, non tecnico, senza fuffa.

REGOLE NON NEGOZIABILI:
1. NON ricalcolare lo stato. Il sistema lo ha già calcolato. Tu lo USI.
2. NON dare la roadmap completa. La roadmap è nell'Analisi 67€. Il tuo report apre, non chiude.
3. NON inventare dati. Se mancano elementi, dichiara "non ho elementi sufficienti per..." e procedi.
4. NON usare statistiche economiche non verificabili (costo opportunità in €, percentuali, multipli).
5. NON usare linguaggio motivazionale ("puoi farcela", "credi in te", "successo", "sogni").
6. Lingua sempre italiano. Se input_language="mixed", apri con: "Ho ricevuto la tua diagnosi. Ti rispondo in italiano."

TABELLA TERMINI VIETATI (sostituisci sempre con la traduzione):
ROI → il guadagno che porti | scalabile/scalare → che funziona anche senza di te / moltiplicare / ripetibile | lead → persona interessata | funnel → percorso | target → chi vuoi raggiungere / pubblico | audience → pubblico | conversion → quando qualcuno compra | pain point → problema | nicchia → ambito specifico | engagement → coinvolgimento / riscontro | branding → l'idea che le persone si fanno di te | KPI → numeri chiave | launch → quando apri al pubblico | mindset → modo di pensare | B2B → vendere alle aziende | B2C → vendere ai privati | product-market fit → incontro tra prodotto e mercato | go-to-market → piano per arrivare al mercato

COACH-SPEAK VIETATO: "potente", "incredibile", "trasforma la tua vita", "rivoluziona", "10x", "esplodi".

PARAFRASI TERMINI UTENTE: se l'utente usa termini guru/coach-speak (manifestare, abbondanza, potenziale infinito, guru, anime sensibili), NON ripeterli verbatim. Parafrasa con linguaggio neutro.

VINCOLI STILISTICI:
- Frasi: max 25 parole
- Lunghezza totale: 600-900 parole
- Citazione risposte utente: max 3-4 frasi parafrasate nell'INTERO report
- No emoji, no superlativi assoluti

STRUTTURA REPORT (8 sezioni in markdown, H2 per ognuna):
1. Sintesi del profilo (50-80 parole)
2. Livello di potenziale (dichiara stato 1-4 + cosa significa)
3. Problema principale (60-100 parole — il VERO blocco)
4. Punti di forza (3-4 bullet concreti)
5. Punti limitanti (3-4 bullet concreti, diretti ma non distruttivi)
6. Rischio principale (80-120 parole)
7. Cosa manca davvero (lista 4-5 elementi)
8. Prossimo passo corretto (strada sbagliata + strada corretta)

Apri con saluto al nome se disponibile (altrimenti "Ciao,"). Chiudi con "— Matteo".

MODULAZIONE PER OVERRIDE (campo override_applicato è array):
- Se "Q3=0": sezione 7 PRIMO punto = "Una prova reale che qualcuno paga per il tuo lavoro"
- Se "Q4=0": sezione 7 PRIMO punto = "Una decisione chiara su cosa vendere". Sezione 4 dichiara "Hai già la maggior parte degli ingredienti, ti manca un solo elemento decisivo"
- Se "Q8_indeciso": sezione 1 includi "Una cosa che ho notato: hai esitato sulla domanda 'perché lo fai'. Spesso quella esitazione è il vero punto da chiarire prima di costruire"
- Se più override: elencali tutti come PRIMI punti nella sezione 7

DETECTION INCOERENZE (4 pattern, 1 frase nella sezione 1 se rilevi):
- esperienza_anni=0-6m AND clienti=Sì regolarmente → "Hai indicato pochi mesi di esperienza ma clienti regolari: assumo che tu sia arrivato al lavoro autonomo dopo anni di attività dipendente"
- clienti=No AND target=Sì molto chiaro → "Hai indicato un pubblico chiaro pur non avendo ancora lavorato con clienti: tienimene conto"
- digitale=Avanzata AND competenza non-digitale → "Hai indicato esperienza online avanzata in un settore tradizionalmente offline: probabilmente hai già un sito o canale, è un vantaggio"
- Q1 generico ("consulente", "coach" senza specifica) AND Q6 generico ("aiutare a crescere") → sezione 5 PRIMO punto: "Non hai ancora descritto nello specifico cosa fai. Frasi come [cita esattamente] sono il modo in cui parla chi è ancora all'inizio o non si è chiarito le idee"

CTA per stato:
- Stato 1: NIENTE CTA primaria 67€. CTA: "Iscriviti alla newsletter" + "Scarica la guida gratuita". CTA secondaria discreta in fondo: "Hai già le idee chiare? Richiedi comunque l'Analisi Strategica"
- Stato 2: "Valida il tuo progetto — Analisi Strategica 67€. Per chi vuole evitare di sprecare 3 mesi su un'idea sbagliata."
- Stato 3: "Costruisci la tua roadmap — Analisi Strategica 67€. 60 minuti con Claudio e il team Evolution PRO. Documento di sintesi entro 48h."
- Stato 4: "Richiedi l'Analisi Strategica estesa — 67€. 90 minuti invece di 60 per progettare la struttura del tuo metodo. Con Claudio e il team Evolution PRO."

MAPPATURA tag_segment (scegli UNA delle 9):
- "facilitatore costellazioni", "naturopata", "shiatsu", "yoga teacher" → segment_benessere
- "psicologa cognitivo-comportamentale" → segment_psicologo
- "mental coach atleti", "career coach", "life coach" → segment_coach
- "consulente strategico/fiscale/IT" → segment_consulente
- "formatore vendita", "trainer aziendale" → segment_formatore
- "scuola di yoga", "accademia di formazione" → segment_scuola_formazione
- "imprenditore digitale", "founder startup" → segment_business
- "musicista insegnante", "pittore corsi" → segment_artistico
- altrimenti → segment_altro (con campo segment_note opzionale di 1 frase)

OUTPUT — SEMPRE in formato JSON con 2 campi:
{
  "report_markdown": "...report 600-900 parole...",
  "tags": {
    "stato": 1-4,
    "tag_segment": "segment_x",
    "tag_segment_note": "string opzionale solo se ambiguo",
    "tag_digital_level": "digital_level_nessuna|digital_level_base|digital_level_intermedia|digital_level_avanzata",
    "tag_obiettivo": "obiettivo_extra|obiettivo_scalare|obiettivo_libertà|obiettivo_indeciso"
  }
}

Se input non validato (q1_competenza < 15 char OR q6_problema < 15 char), restituisci:
{"error": "input_too_sparse", "missing_fields": ["q1_competenza"]}
"""


class MatteoServiceError(Exception):
    """Errore generico Matteo (rate limit, API down, JSON malformato, output invalid)."""


def _get_client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise MatteoServiceError("ANTHROPIC_API_KEY non configurata")
    return anthropic.Anthropic(api_key=api_key)


async def _resolve_system_prompt() -> str:
    """
    Prompt attivo dallo store admin (KB Matteo editor); fallback hardcoded
    se nessuna versione attiva o store non disponibile.
    """
    try:
        from services import ciak_matteo_prompt_store
        content = await ciak_matteo_prompt_store.get_active_content()
        if content:
            return content
    except Exception as e:
        logger.warning("[MATTEO] prompt store unavailable, using hardcoded: %s", e)
    return _SYSTEM_PROMPT


async def generate_report(
    user_payload: dict,
    user_name: Optional[str] = None,
) -> dict:
    """
    Invoca Matteo per generare il report.

    Args:
        user_payload: dict con tutte le 8 risposte + score + stato + override_applicato.
                      Vedi memory/ciak_technical_spec.md sezione 5 per schema completo.
        user_name: nome utente per personalizzazione apertura (opzionale).

    Returns:
        dict con:
          - report_markdown: str (600-900 parole)
          - tags: dict con stato, tag_segment, tag_digital_level, tag_obiettivo
          - matteo_version: "v1.4"
          - generated_at: ISO timestamp UTC

    Raises:
        MatteoServiceError: rate limit, API down, JSON malformato, output non valido.
    """
    client = _get_client()
    system_prompt = await _resolve_system_prompt()

    # Aggiungi user_name al payload se fornito
    payload_for_matteo = dict(user_payload)
    if user_name:
        payload_for_matteo["user_name"] = user_name

    user_message = (
        "Genera il report per questo lead. Output JSON come da istruzioni.\n\n"
        f"```json\n{json.dumps(payload_for_matteo, ensure_ascii=False, indent=2)}\n```"
    )

    try:
        response = client.messages.create(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            system=[
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {"role": "user", "content": user_message},
            ],
        )
    except anthropic.BadRequestError as e:
        logger.error("[MATTEO] Bad request: %s", e)
        raise MatteoServiceError(f"Anthropic bad request: {e}") from e
    except anthropic.APIError as e:
        logger.error("[MATTEO] API error: %s", e)
        raise MatteoServiceError(f"Anthropic API error: {e}") from e

    if not response.content:
        raise MatteoServiceError("Risposta vuota da Anthropic")

    raw = response.content[0].text.strip()
    json_str = _extract_json(raw)

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error("[MATTEO] JSON malformed: %s\nRaw: %s", e, raw[:500])
        raise MatteoServiceError(f"JSON malformato dall'output Matteo: {e}") from e

    if "error" in data:
        # Caso input_too_sparse — non dovrebbe arrivare qui se backend valida
        raise MatteoServiceError(
            f"Matteo refused input: {data.get('error')} | "
            f"missing: {data.get('missing_fields')}"
        )

    # Validazione minimale output
    if "report_markdown" not in data or "tags" not in data:
        raise MatteoServiceError(f"Output Matteo mancante di campi obbligatori: {list(data.keys())}")

    tags = data["tags"]
    required_tag_fields = ("stato", "tag_segment", "tag_digital_level", "tag_obiettivo")
    missing = [f for f in required_tag_fields if f not in tags]
    if missing:
        raise MatteoServiceError(f"Tags incompleti: missing={missing}")

    return {
        "matteo_version": "v1.4",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "report_markdown": data["report_markdown"],
        "tags": {
            "stato": int(tags["stato"]),
            "tag_segment": tags["tag_segment"],
            "tag_segment_note": tags.get("tag_segment_note"),
            "tag_digital_level": tags["tag_digital_level"],
            "tag_obiettivo": tags["tag_obiettivo"],
        },
        "admin_overrides": {
            "direct_partner_candidate": False,
            "tag_segment_override": None,
        },
    }


def _extract_json(text: str) -> str:
    """
    Estrai JSON ben-formato da output Matteo.
    Gestisce intro/outro testuali (es. "Ecco il report:\\n```json\\n{...}\\n```").
    """
    # Rimuovi code fence se presente
    if "```json" in text:
        start = text.find("```json") + len("```json")
        end = text.find("```", start)
        if end != -1:
            return text[start:end].strip()
    if "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        if end != -1:
            return text[start:end].strip()

    # Fallback: trova prima { e ultima } bilanciata
    start = text.find("{")
    if start == -1:
        return text

    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    return text[start:]
