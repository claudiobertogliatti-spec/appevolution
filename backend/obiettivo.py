"""
L'obiettivo di cassa e le leve che dovrebbero raggiungerlo.

Perche' esiste (1/9/2026): Claudio ha fissato **€10.000 entro il 30/9** e ha
chiesto che Luca "non si fermi finche' non lo raggiunge". Ma Luca non puo'
vendere -- non chiama, non chiude trattative, non consegna. Dargli quel mandato
senza le mani e' esattamente quello che e' successo ad agosto: il mandato c'era,
i permessi no, e quindici giorni sono passati a vuoto.

Quello che Luca puo' fare davvero, e che ad agosto e' mancato, e' **tenere il
conto ogni giorno e dire quando il ritmo non basta** -- mentre c'e' ancora tempo
per cambiare strategia, non il mese dopo.

Per farlo deve conoscere il piano, non solo il totale: le **leve** sono le voci
che dovrebbero coprire il gap (una trattativa da chiudere, un preventivo fermo,
una vendita da fare). Con quelle in mano Luca puo' dire la cosa che conta:
*"Rosanna e' ferma da 14 giorni e vale €1.850: senza di lei il piano non chiude"*.

⛔ Questo modulo NON vende e non promette che l'obiettivo si raggiunga. Misura,
proietta e segnala il deterioramento. La differenza e' tutta li'.
"""

from datetime import datetime, date, timezone
from typing import Optional, List

from pydantic import BaseModel, Field


# Stato di una leva. Poche voci: ogni stato in piu' e' uno che qualcuno deve
# ricordarsi di aggiornare, e una leva con lo stato sbagliato mente due volte
# (sul gap e sulla proiezione).
LEVA_APERTA = "aperta"        # esiste, nessuno ci sta lavorando adesso
LEVA_IN_CORSO = "in_corso"    # conversazione viva
LEVA_CHIUSA = "chiusa"        # incassata o firmata
LEVA_PERSA = "persa"

STATI_LEVA = (LEVA_APERTA, LEVA_IN_CORSO, LEVA_CHIUSA, LEVA_PERSA)

# Dopo quanti giorni senza movimento una leva si considera ferma. Due settimane:
# sotto e' normale respiro di una trattativa, sopra e' una cosa che si sta
# raffreddando mentre nessuno se ne accorge.
GIORNI_LEVA_FERMA = 14


class Leva(BaseModel):
    nome: str
    valore: float
    stato: str = LEVA_APERTA
    ultimo_movimento: Optional[str] = None  # ISO date
    dipende_da: Optional[str] = None  # "una consegna nostra", "solo una call"
    nota: Optional[str] = None


class Obiettivo(BaseModel):
    id: str
    titolo: str
    target: float
    scadenza: str          # ISO date
    inizio: str            # ISO date
    incassato: float = 0.0
    leve: List[Leva] = Field(default_factory=list)
    nota: Optional[str] = None
    aggiornato_at: Optional[str] = None


def _data(iso: Optional[str]) -> Optional[date]:
    if not iso:
        return None
    try:
        return date.fromisoformat(str(iso)[:10])
    except (ValueError, TypeError):
        return None


def stato(ob: dict, oggi: Optional[date] = None) -> dict:
    """
    Il quadro di un obiettivo: quanto manca, a che ritmo serve andare, dove si
    va a finire se non cambia nulla, e quali leve si stanno raffreddando.

    La **proiezione** e' il numero che serve a cambiare strategia in tempo: dice
    dove chiudi al ritmo tenuto finora. Se e' molto sotto il target, il problema
    non e' spingere di piu' sulle stesse cose.
    """
    oggi = oggi or datetime.now(timezone.utc).date()
    inizio = _data(ob.get("inizio"))
    fine = _data(ob.get("scadenza"))
    target = float(ob.get("target") or 0)
    incassato = float(ob.get("incassato") or 0)

    gap = max(target - incassato, 0)
    giorni_rimasti = (fine - oggi).days if fine else None
    giorni_passati = (oggi - inizio).days if inizio else None

    # Ritmo giornaliero necessario da qui alla scadenza.
    ritmo_necessario = None
    if giorni_rimasti and giorni_rimasti > 0:
        ritmo_necessario = round(gap / giorni_rimasti, 2)

    # Dove si finisce al ritmo tenuto finora. None quando non c'e' abbastanza
    # storia per dirlo: una proiezione su due giorni sarebbe un numero inventato.
    proiezione = None
    if giorni_passati and giorni_passati >= 3 and giorni_rimasti is not None:
        al_giorno = incassato / giorni_passati
        proiezione = round(incassato + al_giorno * max(giorni_rimasti, 0), 2)

    leve = ob.get("leve") or []
    vive = [l for l in leve if l.get("stato") in (LEVA_APERTA, LEVA_IN_CORSO)]
    valore_vive = sum(float(l.get("valore") or 0) for l in vive)

    ferme = []
    for l in vive:
        mov = _data(l.get("ultimo_movimento"))
        if mov and (oggi - mov).days >= GIORNI_LEVA_FERMA:
            ferme.append({
                "nome": l.get("nome"),
                "valore": float(l.get("valore") or 0),
                "giorni_fermi": (oggi - mov).days,
                "dipende_da": l.get("dipende_da"),
            })
    ferme.sort(key=lambda x: -x["valore"])

    return {
        "titolo": ob.get("titolo"),
        "target": target,
        "incassato": incassato,
        "gap": round(gap, 2),
        "giorni_rimasti": giorni_rimasti,
        "ritmo_necessario": ritmo_necessario,
        "proiezione_al_ritmo_attuale": proiezione,
        "valore_leve_vive": round(valore_vive, 2),
        # La domanda che decide se il piano regge: le leve che hai bastano a
        # coprire quello che manca? Se no, spingere su quelle non porta al
        # target -- serve qualcosa che oggi non e' sul tavolo.
        "leve_coprono_il_gap": valore_vive >= gap,
        "scoperto": round(max(gap - valore_vive, 0), 2),
        "leve_ferme": ferme,
        "leve_vive": [
            {
                "nome": l.get("nome"),
                "valore": float(l.get("valore") or 0),
                "stato": l.get("stato"),
                "dipende_da": l.get("dipende_da"),
            }
            for l in sorted(vive, key=lambda x: -float(x.get("valore") or 0))
        ],
    }
