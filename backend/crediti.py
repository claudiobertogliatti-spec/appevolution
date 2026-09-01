"""
Crediti da recuperare e incassi previsti — il dato che mancava del tutto.

Perche' esiste (1/9/2026): gli accordi di rientro con Falcone, Depalma e
Calafiore vivevano in **due lettere Word sul desktop di Claudio** e nella sua
memoria. Il sistema sapeva solo cosa era gia' entrato (`/transactions`,
`pagamenti_partnership`): tutto guardava indietro.

Cosi' il "reparto amministrazione" era Claudio che si ricordava le scadenze --
e una rata che salta si scopre quando non arriva, non prima.

Qui le rate diventano un dato: con una scadenza, uno stato e un importo. Da li'
il briefing di Luca puo' dire ogni mattina cosa scade **oggi**, che e' la
differenza tra un archivio e un reparto che funziona.

⛔ Il rischio noto: se lo stato non si aggiorna quando l'incasso arriva, dopo
tre settimane questi numeri sono falsi -- peggio che non averli. Per questo
`stato` ha un valore esplicito `da_verificare` invece di assumere "pagato", e
gli accordi nuovi prevedono l'addebito automatico su carta, che permettera' di
agganciare l'aggiornamento a Stripe invece che alla memoria di qualcuno.
"""

from datetime import datetime, date, timezone
from typing import Optional, List

from pydantic import BaseModel, Field


# Stati di una singola rata. Volutamente pochi: ogni stato in piu' e' uno stato
# che qualcuno deve ricordarsi di aggiornare.
RATA_ATTESA = "attesa"          # non ancora scaduta
RATA_INCASSATA = "incassata"
RATA_SALTATA = "saltata"        # scaduta e non arrivata
RATA_DA_VERIFICARE = "da_verificare"  # scaduta, esito non confermato

STATI_RATA = (RATA_ATTESA, RATA_INCASSATA, RATA_SALTATA, RATA_DA_VERIFICARE)

# Stati del credito nel suo insieme.
CREDITO_APERTO = "aperto"            # dovuto, nessun accordo
CREDITO_IN_PIANO = "in_piano"        # accordo di rientro firmato/inviato
CREDITO_SALDATO = "saldato"
CREDITO_CONTENZIOSO = "contenzioso"  # ⛔ non si sollecita: passa dal legale

STATI_CREDITO = (CREDITO_APERTO, CREDITO_IN_PIANO, CREDITO_SALDATO, CREDITO_CONTENZIOSO)

# Due cose diverse che stavano per finire nello stesso numero.
# Un CREDITO ha un totale che si esaurisce: dice quanto devi rincorrere.
# Un RICORRENTE e' una mensilita' attiva: dice quanto entra se tutto va normale.
# Sommarli renderebbe il "residuo da recuperare" un numero senza significato.
TIPO_CREDITO = "credito"
TIPO_RICORRENTE = "ricorrente"
TIPI = (TIPO_CREDITO, TIPO_RICORRENTE)


class Rata(BaseModel):
    """
    Una rata puo' essere legata a una DATA o a una CONDIZIONE.

    Il caso che ha imposto la distinzione (1/9/2026): il contratto Calafiore
    prevede "prima rata alla firma, seconda a meta' percorso, saldo a lancio
    avvenuto". «A meta' percorso» non e' una voce di calendario, e mettergli una
    data inventata sarebbe peggio che non averlo: il briefing la segnalerebbe
    come scaduta in un giorno che nessuno ha mai concordato.

    Quindi `scadenza` e' opzionale e `condizione` la sostituisce. Una rata senza
    data non entra nel previsto del mese e non finisce mai in ritardo -- ma pesa
    nel residuo totale, perche' quei soldi sono dovuti comunque.
    """

    numero: int
    importo: float
    scadenza: Optional[str] = None   # ISO date, "2026-09-30"
    condizione: Optional[str] = None  # "a meta' percorso", "a lancio avvenuto"
    stato: str = RATA_ATTESA
    incassata_at: Optional[str] = None
    nota: Optional[str] = None


class Credito(BaseModel):
    id: str
    nome: str
    partner_id: Optional[str] = None
    email: Optional[str] = None
    importo_totale: float
    causale: str
    stato: str = CREDITO_APERTO
    rate: List[Rata] = Field(default_factory=list)
    tipo: str = TIPO_CREDITO
    # ⛔ Vietato mettere questa posizione tra quelle da chiamare.
    #
    # Sta nel codice e non in una nota di proposito: Mariantonietta Tornello non
    # si sollecita per un motivo familiare grave, non economico -- e una regola
    # scritta in un campo di testo si legge distrattamente alle 7 del mattino.
    # La rata resta nei conti, perche' i soldi sono dovuti; sparisce dall'elenco
    # di chi chiamare oggi, perche' quella telefonata non va fatta.
    non_sollecitare: bool = False
    documento: Optional[str] = None   # dove sta la lettera dell'accordo
    nota: Optional[str] = None
    creato_at: Optional[str] = None
    aggiornato_at: Optional[str] = None


def _oggi() -> date:
    return datetime.now(timezone.utc).date()


def _data(iso: Optional[str]) -> Optional[date]:
    if not iso:
        return None
    try:
        return date.fromisoformat(str(iso)[:10])
    except (ValueError, TypeError):
        return None


def stato_effettivo_rata(rata: dict, oggi: Optional[date] = None) -> str:
    """
    Lo stato di una rata **calcolato sulla data**, non quello scritto.

    Serve perche' nessuno aggiorna un record il giorno in cui una rata scade: se
    ci si fida del campo, una rata saltata resta "attesa" per sempre e non viene
    mai segnalata. Una rata scaduta e non incassata diventa `da_verificare`, che
    e' un'affermazione onesta: e' passata la data e non sappiamo com'e' andata.
    """
    oggi = oggi or _oggi()
    stato = rata.get("stato") or RATA_ATTESA

    # Gli stati confermati a mano vincono: qualcuno ha guardato davvero.
    if stato in (RATA_INCASSATA, RATA_SALTATA):
        return stato

    scad = _data(rata.get("scadenza"))
    if scad is None:
        return stato
    return RATA_DA_VERIFICARE if scad < oggi else RATA_ATTESA


def rate_del_mese(crediti: List[dict], anno: int, mese: int) -> List[dict]:
    """Le rate che scadono nel mese indicato, ordinate per data."""
    fuori = []
    for c in crediti:
        for r in c.get("rate") or []:
            scad = _data(r.get("scadenza"))
            if scad and scad.year == anno and scad.month == mese:
                fuori.append({
                    **r,
                    "stato_effettivo": stato_effettivo_rata(r),
                    "credito_id": c.get("id"),
                    "nome": c.get("nome"),
                    "tipo": c.get("tipo") or TIPO_CREDITO,
                    "non_sollecitare": bool(c.get("non_sollecitare")),
                })
    return sorted(fuori, key=lambda r: r.get("scadenza") or "")


def riepilogo(crediti: List[dict], anno: int, mese: int) -> dict:
    """
    Il quadro che serve a decidere, non l'elenco completo.

    `in_ritardo` e' il numero che conta davvero: sono rate scadute di cui non
    sappiamo l'esito, cioe' le uniche su cui vale la pena fare una telefonata
    oggi.
    """
    rate_mese = rate_del_mese(crediti, anno, mese)
    aperti = [c for c in crediti if c.get("stato") in (CREDITO_APERTO, CREDITO_IN_PIANO)]

    da_incassare = sum(
        float(r.get("importo") or 0)
        for r in rate_mese
        if r["stato_effettivo"] != RATA_INCASSATA
    )
    incassato = sum(
        float(r.get("importo") or 0)
        for r in rate_mese
        if r["stato_effettivo"] == RATA_INCASSATA
    )

    tutte = [
        {
            **r,
            "stato_effettivo": stato_effettivo_rata(r),
            "nome": c.get("nome"),
            "tipo": c.get("tipo") or TIPO_CREDITO,
            "non_sollecitare": bool(c.get("non_sollecitare")),
        }
        for c in crediti for r in (c.get("rate") or [])
    ]
    # In ritardo = chi si puo' chiamare oggi. Chi ha `non_sollecitare` resta nei
    # conti ma non qui: e' l'unico posto che invita a un'azione.
    in_ritardo = [
        r for r in tutte
        if r["stato_effettivo"] == RATA_DA_VERIFICARE and not r["non_sollecitare"]
    ]

    oggi_iso = _oggi().isoformat()
    return {
        "mese": f"{anno:04d}-{mese:02d}",
        "previsto_nel_mese": round(da_incassare, 2),
        "gia_incassato_nel_mese": round(incassato, 2),
        "rate_nel_mese": len(rate_mese),
        "scade_oggi": [r for r in rate_mese if (r.get("scadenza") or "")[:10] == oggi_iso],
        "in_ritardo": sorted(in_ritardo, key=lambda r: r.get("scadenza") or ""),
        "importo_in_ritardo": round(
            sum(float(r.get("importo") or 0) for r in in_ritardo), 2
        ),
        "crediti_aperti": len(aperti),
        # Dovute ma senza data: non si possono ne' prevedere nel mese ne'
        # dichiarare in ritardo. Si elencano a parte, altrimenti sparirebbero
        # dal briefing pur essendo soldi da incassare.
        "a_condizione": [
            {
                "nome": r.get("nome"),
                "importo": float(r.get("importo") or 0),
                "condizione": r.get("condizione"),
            }
            for r in tutte
            if not r.get("scadenza") and r["stato_effettivo"] != RATA_INCASSATA
        ],
        # Quanto resta da incassare in tutto: la somma delle rate non incassate,
        # non `importo_totale` -- che include anche quello gia' rientrato.
        # Solo i crediti veri: quanto c'e' da rincorrere.
        "residuo_totale": round(
            sum(
                float(r.get("importo") or 0)
                for r in tutte
                if r["stato_effettivo"] != RATA_INCASSATA and r["tipo"] == TIPO_CREDITO
            ),
            2,
        ),
        # Le mensilita' attese nel mese: quanto entra se tutto va normale.
        # Risponde alla domanda rimasta aperta il 10/8 -- "quanta cassa
        # ricorrente entra ogni mese e non e' censita?".
        "ricorrente_nel_mese": round(
            sum(
                float(r.get("importo") or 0)
                for r in rate_mese
                if (r.get("tipo") or TIPO_CREDITO) == TIPO_RICORRENTE
                and r["stato_effettivo"] != RATA_INCASSATA
            ),
            2,
        ),
        # Dovuto ma da non sollecitare: si dichiara, non si nasconde.
        "sospese_dal_sollecito": [
            {"nome": r.get("nome"), "importo": float(r.get("importo") or 0)}
            for r in tutte
            if r["non_sollecitare"] and r["stato_effettivo"] == RATA_DA_VERIFICARE
        ],
    }
