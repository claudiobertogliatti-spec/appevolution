#!/usr/bin/env python3
"""
I tre file che danno a Luca una memoria che sopravvive alla notte.

Senza questi, ogni mattina Luca riparte da zero e la riga piu' importante del
suo prompt — "cosa hai gia' fatto dall'ultimo briefing" — e' impossibile.

E' l'UNICO modulo che tocca la cartella stato/. Solo stdlib.
"""
import csv
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

COLONNE = (
    "data",
    "lead_oggi",
    "diagnosi_oggi",
    "ingressi_evo_mese",
    "partner_attivi",
    "partner_fermi",
    "partner_attesa_ok",
    "checkout_non_pagati",
    "meta_campagna_obiettivo",
    "meta_spesa_giorno",
    "meta_lead_giorno",
    "giorni_silenzio_social",
    "contatti_systeme",
    "sito_ok",
)


def cartella_stato():
    """Letta a ogni chiamata, non all'import: i test la spostano su una tmpdir."""
    default = Path(__file__).resolve().parent / "stato"
    cartella = Path(os.environ.get("LUCA_STATO_DIR") or default)
    cartella.mkdir(parents=True, exist_ok=True)
    return cartella


def _file_numeri():
    return cartella_stato() / "numeri.csv"


def _cella(valore):
    """None diventa stringa vuota, MAI zero: vuoto e' un punto cieco, zero e' una misura."""
    return "" if valore is None else str(valore)


def leggi_numeri():
    percorso = _file_numeri()
    if not percorso.exists():
        return []
    with percorso.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def scrivi_numeri(riga):
    """Upsert sulla data: due run nello stesso giorno aggiornano, non duplicano.

    Scrittura ATOMICA (file temporaneo + os.replace). Questo CSV e' tutta la memoria
    storica di Luca: aprire il file finale in "w" lo troncherebbe subito, e
    un'interruzione a meta' (disco pieno, kill, crash) lascerebbe la sola intestazione
    — distruggendo esattamente la cosa che questo modulo esiste per conservare.
    """
    data = riga.get("data")
    if not data:
        raise ValueError("la riga dei numeri deve avere una 'data'")

    righe = [r for r in leggi_numeri() if r.get("data") != data]
    righe.append({colonna: _cella(riga.get(colonna)) for colonna in COLONNE})
    righe.sort(key=lambda r: r["data"])

    percorso = _file_numeri()
    temporaneo = percorso.with_name(percorso.name + ".tmp")
    with temporaneo.open("w", encoding="utf-8", newline="") as f:
        scrittore = csv.DictWriter(f, fieldnames=list(COLONNE))
        scrittore.writeheader()
        scrittore.writerows(righe)
    os.replace(temporaneo, percorso)


def _numero(valore):
    if valore in (None, ""):
        return None
    try:
        return float(valore)
    except (TypeError, ValueError):
        return None


def confronta(oggi):
    """Confronta i numeri di oggi con l'ultima riga precedente.

    Se riceve solo {"data": ...} rilegge dal CSV la riga gia' scritta per quella
    data: e' cosi' che lo chiama il prompt del mattino, e ricopiare i valori a mano
    nel dict sarebbe una seconda fonte di verita' che puo' divergere dalla prima.

    Nessun delta se una delle due celle e' vuota o non numerica: preferiamo un
    "non confrontabile" esplicito a un trend inventato.
    """
    righe = leggi_numeri()
    data = oggi.get("data")
    if set(oggi) <= {"data"}:
        scritta = next((r for r in righe if r.get("data") == data), None)
        if scritta is not None:
            oggi = scritta

    precedenti = [r for r in righe if r.get("data") != data]
    if not precedenti:
        return {"prima_misurazione": True}

    ieri = precedenti[-1]
    esito = {}
    for colonna in COLONNE:
        if colonna == "data":
            continue
        valore_oggi = oggi.get(colonna)
        valore_ieri = ieri.get(colonna)
        n_oggi, n_ieri = _numero(valore_oggi), _numero(valore_ieri)
        esito[colonna] = {
            "oggi": valore_oggi,
            "ieri": valore_ieri if valore_ieri != "" else None,
            "delta": None if n_oggi is None or n_ieri is None else n_oggi - n_ieri,
        }
    return esito


def _file_coda():
    return cartella_stato() / "coda.json"


def _file_registro():
    return cartella_stato() / "registro.md"


def _adesso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def leggi_coda():
    percorso = _file_coda()
    if not percorso.exists():
        return []
    return json.loads(percorso.read_text(encoding="utf-8") or "[]")


def _scrivi_coda(azioni):
    """Scrittura ATOMICA, per lo stesso motivo di scrivi_numeri() — e qui pesa di piu'.

    `coda.json` viene RISCRITTO PER INTERO a ogni apertura o chiusura di azione: non e'
    un append. E un JSON troncato non e' leggibile a meta' come un CSV — fa fallire
    json.loads() alla lettura successiva e si perde TUTTA la coda, non qualche riga.
    """
    percorso = _file_coda()
    temporaneo = percorso.with_name(percorso.name + ".tmp")
    temporaneo.write_text(
        json.dumps(azioni, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    os.replace(temporaneo, percorso)


def apri_azione(cosa, chi, entro):
    """Un'azione ha SEMPRE un solo responsabile: principio 10, reso non violabile.

    ⚠️ `chi` deve essere un nome proprio di persona o di agente. Il controllo rifiuta
    qualunque stringa contenente una virgola o " e ", quindi un nome di reparto composto
    ("Marketing e Social") verrebbe respinto anche se e' un proprietario solo.
    """
    if "," in chi or " e " in f" {chi} ":
        raise ValueError(
            f"'{chi}' sono piu' persone: un'azione ha un solo responsabile, "
            "altrimenti non ce l'ha nessuno"
        )
    azione = {
        "id": uuid.uuid4().hex[:8],
        "cosa": cosa,
        "chi": chi,
        "entro": entro,
        "stato": "aperta",
        "aperta_il": _adesso(),
        "chiusa_il": None,
        "esito": None,
    }
    azioni = leggi_coda()
    azioni.append(azione)
    _scrivi_coda(azioni)
    return azione


def chiudi_azione(id_azione, esito):
    azioni = leggi_coda()
    for azione in azioni:
        if azione["id"] == id_azione:
            azione.update(stato="chiusa", esito=esito, chiusa_il=_adesso())
            _scrivi_coda(azioni)
            return azione
    raise KeyError(f"azione '{id_azione}' non trovata in coda")


def registra(cosa, perche, risultato):
    """Il registro degli errori di Dalio: append-only, non si riscrive il passato."""
    percorso = _file_registro()
    if not percorso.exists():
        percorso.write_text("# Registro di Luca\n\n", encoding="utf-8")
    with percorso.open("a", encoding="utf-8") as f:
        f.write(f"- **{_adesso()}** · {cosa} · _perche':_ {perche} · _risultato:_ {risultato}\n")


def leggi_registro():
    percorso = _file_registro()
    return percorso.read_text(encoding="utf-8") if percorso.exists() else ""


# ─── Le mani di Luca: whitelist, cancello, registro delle azioni ──────────────

AZIONI_CONSENTITE = {
    "campagna_obiettivo": {
        "attesa_giorni": 7,
        "descrizione": "rimettere una campagna Meta su un obiettivo di tipo Lead",
    },
    "pubblica_post": {
        "attesa_giorni": 1,
        "descrizione": "pubblicare un contenuto gia' in coda e approvato",
    },
    "coda_apri": {"attesa_giorni": 0, "descrizione": "aprire un'azione in coda"},
    "coda_chiudi": {"attesa_giorni": 0, "descrizione": "chiudere un'azione in coda"},
}


def _file_azioni():
    return cartella_stato() / "azioni.json"


def leggi_azioni():
    percorso = _file_azioni()
    if not percorso.exists():
        return []
    return json.loads(percorso.read_text(encoding="utf-8") or "[]")


def ultima_azione(tipo):
    """L'ultima azione registrata di quel tipo, o None."""
    dello_stesso_tipo = [a for a in leggi_azioni() if a.get("tipo") == tipo]
    return dello_stesso_tipo[-1] if dello_stesso_tipo else None


def azione_permessa(tipo, adesso=None):
    """Il cancello: (True, "") oppure (False, motivo).

    Sta nel CODICE e non nel prompt di proposito. Un'istruzione scritta si puo'
    interpretare male, dimenticare, o sovrascrivere con una riga successiva; una
    funzione che restituisce False no. Luca tocca un account pubblicitario vero.

    L'attesa non e' burocrazia: cambiare l'obiettivo di una campagna azzera
    l'apprendimento di Meta, e un agente che "ottimizza" ogni mattina su tre
    giorni di rumore fa piu' danno di uno fermo.
    """
    regola = AZIONI_CONSENTITE.get(tipo)
    if regola is None:
        consentite = ", ".join(sorted(AZIONI_CONSENTITE))
        return False, (
            f"'{tipo}' non e' un'azione consentita: si PREPARA per Claudio, non si esegue. "
            f"Consentite: {consentite}"
        )

    attesa = regola["attesa_giorni"]
    if attesa <= 0:
        return True, ""

    ultima = ultima_azione(tipo)
    if ultima is None:
        return True, ""

    adesso = adesso or datetime.now(timezone.utc)
    passati = (adesso - datetime.fromisoformat(ultima["quando"])).days
    if passati >= attesa:
        return True, ""

    return False, (
        f"'{tipo}' eseguita {passati} giorni fa e l'attesa e' di {attesa}: "
        f"mancano {attesa - passati} giorni. Riportalo nel messaggio come azione "
        f"dovuta ma in attesa, con la data in cui si sblocca."
    )


def registra_azione(tipo, cosa, perche, risultato):
    """Registra un'azione eseguita nei DUE posti, con una sola chiamata.

    `azioni.json` la legge la macchina (il cancello, i conteggi), `registro.md` lo
    legge Claudio. Un'azione presente in uno solo o non e' verificabile o non e'
    governabile: per questo la scrittura e' una sola e li tocca entrambi.

    Un'azione NON e' fatta finche' non e' registrata: domani nemmeno Luca saprebbe
    di averla fatta.
    """
    if tipo not in AZIONI_CONSENTITE:
        raise ValueError(
            f"'{tipo}' non e' un'azione consentita: si prepara per Claudio, "
            f"non si registra come fatta"
        )

    azione = {
        "id": uuid.uuid4().hex[:8],
        "tipo": tipo,
        "cosa": cosa,
        "perche": perche,
        "risultato": risultato,
        "quando": _adesso(),
    }

    azioni = leggi_azioni()
    azioni.append(azione)
    percorso = _file_azioni()
    temporaneo = percorso.with_name(percorso.name + ".tmp")
    temporaneo.write_text(
        json.dumps(azioni, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    os.replace(temporaneo, percorso)

    registra(f"[{tipo}] {cosa}", perche, risultato)
    return azione


def azioni_dal(data_iso):
    """Le azioni registrate DOPO quella data, in ordine cronologico.

    Prende la data esplicitamente e non la indovina: dalla Fase 2 la riga di oggi
    in numeri.csv viene scritta all'INIZIO della giornata, quindi "l'ultima riga"
    sarebbe quella di oggi e una funzione che la deducesse restituirebbe sempre
    zero azioni. Il prompt le passa la PENULTIMA riga di numeri.csv.

    Il confronto fra stringhe ISO funziona: "2026-08-15T09:00:00+00:00" > "2026-08-14".
    """
    return [a for a in leggi_azioni() if a.get("quando", "") > data_iso]
