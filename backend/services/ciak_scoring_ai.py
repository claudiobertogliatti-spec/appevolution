"""
Ciak — Scoring AI sulle risposte APERTE.

Sostituisce la somma di crocette di `ciak_scoring.py` ora che le 8 Domande Ciak
sono tutte aperte (testo libero). Legge le 8 risposte, chiede a un modello di
valutare quanto il prospect è PRONTO a costruire un'accademia digitale, e ritorna:
  - score_0_100 (int), stato 1-4, pronto (bool, score>=50), rationale (INTERNO).

Il `rationale` è per Claudio in videocall — NON va mostrato al cliente.

⚠️ NON tocca il prompt store di Matteo/Carlo (quello lo gestisce Claudio dall'admin,
vedi memory/ciak_agenti_deliverable_competenze.md): lo stato calcolato qui viene
passato a Matteo, che lo USA per generare il report (non lo ricalcola).

Espone `score_numerico` e `stato_finale` per restare compatibile con
`_build_user_payload_for_matteo` in routers/diagnostic.py.
"""
import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any

import anthropic

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("CIAK_SCORING_MODEL", "claude-sonnet-4-6")
_MAX_TOKENS = 700


def _get_client() -> anthropic.Anthropic:
    # .strip() obbligatorio: uno spazio nella env fa cadere l'SDK con "Connection error."
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")
    return anthropic.Anthropic(api_key=api_key)


# Sorgente di verità dei criteri: memory/ciak_technical_spec.md (scoring) + decisione
# 7/9 (soglia 50, pronto/non-pronto). Qui i criteri valgono su risposte APERTE.
_SYSTEM = """Sei l'analista interno di Ciak (Evolution PRO). Valuti quanto un professionista
è PRONTO OGGI a trasformare la sua competenza in un'accademia digitale che vende.

Ricevi le sue 8 risposte aperte. Valuta SOLO ciò che ha scritto: niente supposizioni,
niente invenzioni, niente adulazione. Se una risposta è vaga o assente di sostanza, pesala come debole.

Criteri (dal più al meno pesante):
1. Prova di domanda reale (clienti/risultati concreti già ottenuti) — il segnale più forte.
2. Esperienza e padronanza della competenza.
3. Chiarezza dell'offerta che immagina + chiarezza del target a cui parla.
4. Livello di dimestichezza con il mondo online.
5. Motivazione: un "perché" chiaro e solido. Chi non sa perché lo fa, non esegue e non chiude.
6. Specificità della competenza e del problema che risolve.

Regole dure:
- Se NON ha alcuna prova di clienti/risultati → lo stato non può superare 3.
- Se NON ha alcuna idea di cosa offrire → lo stato non può superare 3.
- Se la motivazione è confusa o assente → abbassa.

Mappa lo score 0-100 sullo stato:
  0-24 → 1 (non pronto)   25-49 → 2 (da validare)   50-74 → 3 (buon potenziale)   75-100 → 4 (alto potenziale)
"pronto" = score >= 50.

Rispondi SOLO con JSON valido, nient'altro:
{
  "score_0_100": <int 0-100>,
  "stato": <int 1-4>,
  "pronto": <true|false>,
  "rationale": "<2-3 frasi asciutte per il commerciale: cosa lo rende pronto e cosa lo frena. Interno, mai mostrato al cliente.>"
}"""


@dataclass
class ScoringAIResult:
    score_0_100: int
    stato_finale: int
    pronto: bool
    rationale: str
    override_applicati: list = field(default_factory=list)
    is_fallback: bool = False

    # Compat con _build_user_payload_for_matteo (che legge score_numerico/stato_finale)
    @property
    def score_numerico(self) -> int:
        return self.score_0_100

    @property
    def stato_base(self) -> int:
        return self.stato_finale

    def to_dict(self) -> dict:
        return {
            "engine": "ai_open_answers",
            "score_0_100": self.score_0_100,
            "score_numerico": self.score_0_100,
            "stato_finale": self.stato_finale,
            "pronto": self.pronto,
            "rationale": self.rationale,
            "override_applicati": self.override_applicati,
            "_fallback": self.is_fallback,
        }


def _extract_json(text: str) -> str:
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
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1].strip()
    return text.strip()


def _clamp_stato(score: int) -> int:
    if score <= 24:
        return 1
    if score <= 49:
        return 2
    if score <= 74:
        return 3
    return 4


_ORDER = [
    ("q1_competenza", "Competenza"),
    ("q2_esperienza", "Esperienza / da quanto e come"),
    ("q3_clienti", "Clienti già seguiti e risultati"),
    ("q4_idea", "Idea di offerta"),
    ("q5_target", "Target a cui parla"),
    ("q6_problema", "Problema che risolve / trasformazione"),
    ("q7_digitale", "Rapporto col mondo online"),
    ("q8_obiettivo", "Perché lo fa / cosa cambierebbe"),
]


def _fallback_result(reason: str) -> ScoringAIResult:
    # Fallback DICHIARATO (mai finto): non blocca il prospect, ma segnala all'admin
    # che la valutazione automatica non è disponibile → Claudio valuta in call.
    logger.warning("[CIAK-SCORING-AI] fallback: %s", reason)
    return ScoringAIResult(
        score_0_100=45,
        stato_finale=2,
        pronto=False,
        rationale=f"Valutazione automatica non disponibile ({reason}). Da valutare in call.",
        is_fallback=True,
    )


async def calculate_scoring_ai(responses: dict[str, Any]) -> ScoringAIResult:
    """
    Valuta la prontezza dalle 8 risposte aperte. Non solleva: in caso di errore
    restituisce un fallback dichiarato (is_fallback=True), così il flusso non si blocca.
    """
    try:
        client = _get_client()
    except Exception as e:
        return _fallback_result(str(e))

    lines = []
    for qid, label in _ORDER:
        val = (responses.get(qid) or "").strip()
        lines.append(f"### {label}\n{val or '(nessuna risposta)'}")
    user_message = "Valuta questo prospect. Rispondi SOLO col JSON.\n\n" + "\n\n".join(lines)

    try:
        response = client.messages.create(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            system=[{"type": "text", "text": _SYSTEM, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_message}],
        )
    except anthropic.APIError as e:
        return _fallback_result(f"Anthropic API error: {e}")
    except Exception as e:  # noqa: BLE001 — non far mai cadere il /complete per lo scoring
        return _fallback_result(f"errore inatteso: {e}")

    if not response.content:
        return _fallback_result("risposta vuota")

    try:
        data = json.loads(_extract_json(response.content[0].text))
        score = int(data["score_0_100"])
        score = max(0, min(100, score))
        stato = int(data.get("stato") or _clamp_stato(score))
        stato = max(1, min(4, stato))
        rationale = str(data.get("rationale") or "").strip() or "Nessun razionale fornito."
        pronto = bool(data.get("pronto", score >= 50))
    except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
        return _fallback_result(f"output non parsabile: {e}")

    return ScoringAIResult(
        score_0_100=score,
        stato_finale=stato,
        pronto=pronto,
        rationale=rationale,
    )
