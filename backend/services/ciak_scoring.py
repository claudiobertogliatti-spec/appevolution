"""
Ciak — Scoring engine.

Calcola lo score numerico (0-13) dalle 5 domande punteggiate (Q2, Q3, Q4, Q5, Q7),
determina lo stato base (1-4) dalle soglie e applica i 3 override:

  1. Q3 = "No"            → max Stato 3 (no clienti = no prova di domanda)
  2. Q4 = "No"            → max Stato 3 (no idea = non pronto a strutturazione)
  3. Q8 = "Non sono sicuro" AND stato >= 2 → stato -= 1 (Q8 indeciso scende di 1)

Q1, Q6, Q8 NON entrano nello score numerico (Q1/Q6 sono open text;
Q8 è override soft).

Riferimento: memory/ciak_technical_spec.md sezione 2.
"""
from dataclasses import dataclass


# Valori canonici (devono matchare gli enum scelti in routers/diagnostic.py)
Q2_M_0_6 = "0-6m"
Q2_M_6_12 = "6-12m"
Q2_Y_1_3 = "1-3y"
Q2_Y_3_PLUS = "3+y"

Q3_NO = "No"
Q3_POCHE = "Sì poche"
Q3_REGOLARI = "Sì regolarmente"

Q4_NO = "No"
Q4_CONFUSA = "Sì confusa"
Q4_CHIARA = "Sì abbastanza chiara"

Q5_NO = "No"
Q5_MEDIO = "Più o meno"
Q5_CHIARO = "Sì molto chiaro"

Q7_NESSUNA = "Nessuna"
Q7_BASE = "Base"
Q7_INTERMEDIA = "Intermedia"
Q7_AVANZATA = "Avanzata"

Q8_INDECISO = "Non sono sicuro"


_Q2_POINTS = {
    Q2_M_0_6: 0,
    Q2_M_6_12: 1,
    Q2_Y_1_3: 2,
    Q2_Y_3_PLUS: 3,
}

_Q3_POINTS = {
    Q3_NO: 0,
    Q3_POCHE: 1,
    Q3_REGOLARI: 3,
}

_Q4_POINTS = {
    Q4_NO: 0,
    Q4_CONFUSA: 1,
    Q4_CHIARA: 2,
}

_Q5_POINTS = {
    Q5_NO: 0,
    Q5_MEDIO: 1,
    Q5_CHIARO: 2,
}

_Q7_POINTS = {
    Q7_NESSUNA: 0,
    Q7_BASE: 1,
    Q7_INTERMEDIA: 2,
    Q7_AVANZATA: 3,
}


@dataclass
class ScoringResult:
    score_numerico: int
    stato_base: int
    override_applicati: list[str]
    stato_finale: int

    def to_dict(self) -> dict:
        return {
            "score_numerico": self.score_numerico,
            "stato_base": self.stato_base,
            "override_applicati": self.override_applicati,
            "stato_finale": self.stato_finale,
        }


def _stato_da_score(score: int) -> int:
    if score <= 3:
        return 1
    if score <= 6:
        return 2
    if score <= 9:
        return 3
    return 4


def calculate_scoring(
    q2: str, q3: str, q4: str, q5: str, q7: str, q8: str,
) -> ScoringResult:
    """
    Calcola scoring completo. Tutti gli argomenti sono i valori canonici delle risposte.

    Raises:
        ValueError: se un valore non è riconosciuto.
    """
    try:
        score = (
            _Q2_POINTS[q2]
            + _Q3_POINTS[q3]
            + _Q4_POINTS[q4]
            + _Q5_POINTS[q5]
            + _Q7_POINTS[q7]
        )
    except KeyError as exc:
        raise ValueError(f"Valore non riconosciuto: {exc}") from exc

    stato_base = _stato_da_score(score)
    stato_finale = stato_base
    override: list[str] = []

    if q3 == Q3_NO and stato_finale == 4:
        stato_finale = 3
        override.append("Q3=0")

    if q4 == Q4_NO and stato_finale == 4:
        stato_finale = 3
        override.append("Q4=0")

    if q8 == Q8_INDECISO and stato_finale >= 2:
        stato_finale -= 1
        override.append("Q8_indeciso")

    return ScoringResult(
        score_numerico=score,
        stato_base=stato_base,
        override_applicati=override,
        stato_finale=stato_finale,
    )
