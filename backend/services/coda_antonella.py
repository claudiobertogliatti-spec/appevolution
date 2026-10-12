"""Coda di lavoro di Antonella: lezioni montate da controllare e caricare su Systeme, in un piano giornaliero.

Funzioni PURE (nessun accesso a rete o database): il router legge i dati e li passa qui.

Regole (dichiarate, modificabili da config):
  - una lezione e' "da controllare" quando ha un video montato (output_version > 0 e una durata finale) e per
    quella versione non c'e' ancora l'esito "verificata" ne' "da_correggere" di Antonella;
  - una lezione con una revisione in corso (active_revision_id) non si controlla: la sta rifacendo il montaggio;
  - il tempo stimato di una lezione = durata del video x RAPPORTO_VISIONE + MINUTI_FISSI (caricamento su Systeme,
    titolo, verifica che il video parta). Sono STIME INIZIALI: non vengono da misure reali. Si correggono dalla
    config e, con `minuti_reali`, dai tempi veri registrati a ogni esito;
  - il piano riempie ogni giorno fino al budget di minuti di quel giorno, mai oltre. Un compito che non entra
    in un giorno passa al successivo. Un compito piu lungo di QUALSIASI giorno lavorativo non si pianifica da solo:
    finisce negli avvisi, perche' la decisione e' di Claudio (spezzarlo, aumentare le ore...).
"""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

RAPPORTO_VISIONE = 1.5          # minuti di lavoro per ogni minuto di video (stima iniziale)
MINUTI_FISSI = 5                # per lezione: caricamento, titolo, prova di riproduzione (stima iniziale)
MINUTI_SENZA_DURATA = 15        # se la durata del video non e' nota
ORIZZONTE_GIORNI = 20           # quanti giorni di calendario si pianificano al massimo
# lunedi=0 ... domenica=6. Default: 5 ore a settimana = 60 minuti dal lunedi al venerdi.
BUDGET_DEFAULT = {"0": 60, "1": 60, "2": 60, "3": 60, "4": 60, "5": 0, "6": 0}

ESITI = ("verificata", "da_correggere")
CONTROLLI = ("audio", "inizio_fine", "parte_su_systeme", "titolo_ordine", "nessun_salto")


def config_valida(raw: Optional[dict]) -> Dict[str, Any]:
    """Config normalizzata: budget per giorno e rapporti di stima. Valori fuori range tornano al default."""
    raw = raw or {}
    budget = dict(BUDGET_DEFAULT)
    for k, v in (raw.get("minuti_per_giorno") or {}).items():
        try:
            n = int(v)
        except (TypeError, ValueError):
            continue
        if str(k) in budget and 0 <= n <= 600:
            budget[str(k)] = n
    try:
        rapporto = float(raw.get("rapporto_visione", RAPPORTO_VISIONE))
    except (TypeError, ValueError):
        rapporto = RAPPORTO_VISIONE
    if not 0.5 <= rapporto <= 6:
        rapporto = RAPPORTO_VISIONE
    try:
        fissi = int(raw.get("minuti_fissi", MINUTI_FISSI))
    except (TypeError, ValueError):
        fissi = MINUTI_FISSI
    if not 0 <= fissi <= 60:
        fissi = MINUTI_FISSI
    return {"minuti_per_giorno": budget, "rapporto_visione": rapporto, "minuti_fissi": fissi}


def stima_minuti(durata_s: Optional[float], rapporto: float = RAPPORTO_VISIONE, fissi: int = MINUTI_FISSI) -> int:
    try:
        d = float(durata_s or 0)
    except (TypeError, ValueError):
        d = 0.0
    if d <= 0:
        return MINUTI_SENZA_DURATA
    return int(math.ceil(d / 60.0 * rapporto)) + int(fissi)


def chiave_lezione(partner_id: str, lesson_id: str, output_version: int) -> str:
    return f"{partner_id}|{lesson_id}|{int(output_version)}"


def lezioni_da_controllare(
    docs_videocorso: Iterable[dict],
    nomi_partner: Dict[str, str],
    esiti: Dict[str, dict],
    config: Optional[dict] = None,
) -> Dict[str, List[dict]]:
    """Divide le lezioni montate in: `da_controllare` (la coda) e `da_correggere` (segnalate, in attesa del nuovo montaggio).

    `esiti`: chiave_lezione -> record dell'esito di Antonella per quella versione.
    """
    cfg = config_valida(config)
    da_controllare: List[dict] = []
    da_correggere: List[dict] = []
    for doc in docs_videocorso or []:
        pid = str(doc.get("partner_id") or "")
        for lid, les in (doc.get("lessons") or {}).items():
            if not isinstance(les, dict):
                continue
            try:
                versione = int(les.get("output_version") or 0)
            except (TypeError, ValueError):
                versione = 0
            durata = les.get("video_final_duration_s")
            if versione <= 0 or not durata:
                continue
            if les.get("active_revision_id"):
                continue
            chiave = chiave_lezione(pid, str(lid), versione)
            esito = (esiti or {}).get(chiave)
            base = {
                "chiave": chiave,
                "partner_id": pid,
                "partner_nome": nomi_partner.get(pid) or pid,
                "lesson_id": str(lid),
                "titolo": les.get("title") or les.get("titolo") or f"Lezione {lid}",
                "output_version": versione,
                "durata_s": int(durata),
                "minuti": stima_minuti(durata, cfg["rapporto_visione"], cfg["minuti_fissi"]),
                "link_video": les.get("video_ciak_url") or les.get("video_embed_url"),
                "snippet_systeme": les.get("video_systeme_embed"),
                "partner_approvato": bool(les.get("partner_approved")),
                "arrivata_il": les.get("pipeline_completed_at") or les.get("updated_at"),
            }
            if esito and esito.get("esito") == "da_correggere":
                da_correggere.append({**base, "nota": esito.get("note"), "segnalata_il": esito.get("at")})
            elif esito and esito.get("esito") == "verificata":
                continue
            else:
                da_controllare.append(base)
    ordine = lambda t: (str(t.get("arrivata_il") or ""), t["partner_nome"], t["titolo"])
    da_controllare.sort(key=ordine)
    da_correggere.sort(key=ordine)
    return {"da_controllare": da_controllare, "da_correggere": da_correggere}


def raggruppa_per_partner(compiti: List[dict]) -> List[dict]:
    """Consegne: le lezioni di uno stesso partner stanno insieme. Ordine = arrivo della prima lezione."""
    gruppi: Dict[str, dict] = {}
    for c in compiti:
        g = gruppi.setdefault(c["partner_id"], {
            "partner_id": c["partner_id"], "partner_nome": c["partner_nome"],
            "arrivata_il": c.get("arrivata_il"), "lezioni": [], "minuti": 0, "durata_s": 0,
        })
        g["lezioni"].append(c)
        g["minuti"] += c["minuti"]
        g["durata_s"] += c["durata_s"]
    return sorted(gruppi.values(), key=lambda g: (str(g["arrivata_il"] or ""), g["partner_nome"]))


def piano_giornaliero(compiti: List[dict], config: Optional[dict] = None, da: Optional[date] = None) -> Dict[str, Any]:
    """Assegna i compiti ai giorni lavorativi senza mai superare il budget del giorno.

    I compiti restano nell'ordine ricevuto (arrivo piu vecchio per primo): non si saltano compiti piccoli davanti
    a uno grande piu vecchio, per non far aspettare sempre lo stesso partner.
    """
    cfg = config_valida(config)
    budget = cfg["minuti_per_giorno"]
    inizio = da or datetime.now(timezone.utc).date()
    massimo_giorno = max(budget.values()) if budget else 0
    giorni: List[dict] = []
    for i in range(ORIZZONTE_GIORNI):
        d = inizio + timedelta(days=i)
        b = budget.get(str(d.weekday()), 0)
        if b > 0:
            giorni.append({"data": d.isoformat(), "budget": b, "usati": 0, "compiti": []})
    non_pianificati: List[dict] = []
    avvisi: List[str] = []
    idx = 0
    for c in compiti:
        if c["minuti"] > massimo_giorno:
            non_pianificati.append({**c, "motivo": "piu_lungo_di_un_giorno"})
            avvisi.append(
                f"«{c['titolo']}» ({c['partner_nome']}) richiede circa {c['minuti']} minuti: piu di qualsiasi giorno "
                f"(massimo {massimo_giorno}). Serve una decisione: spezzarlo o aumentare le ore."
            )
            continue
        # primo giorno, da `idx` in poi, in cui il compito entra
        j = idx
        while j < len(giorni) and giorni[j]["usati"] + c["minuti"] > giorni[j]["budget"]:
            j += 1
        if j >= len(giorni):
            non_pianificati.append({**c, "motivo": "fuori_orizzonte"})
            continue
        giorni[j]["compiti"].append(c)
        giorni[j]["usati"] += c["minuti"]
        idx = j  # mai tornare indietro: l'ordine di arrivo si rispetta
    if any(n["motivo"] == "fuori_orizzonte" for n in non_pianificati):
        avvisi.append(
            f"Con le ore attuali alcune lezioni non entrano nei prossimi {ORIZZONTE_GIORNI} giorni: "
            "serve piu tempo oppure meno partner in registrazione insieme."
        )
    totale = sum(c["minuti"] for c in compiti)
    return {"giorni": [g for g in giorni if g["compiti"]], "non_pianificati": non_pianificati,
            "avvisi": avvisi, "minuti_totali": totale}


def prima_data_prevista(piano: Dict[str, Any], partner_id: str) -> Optional[str]:
    """Il giorno in cui sara' pronta l'ultima lezione di un partner (per dirgli quando)."""
    ultima = None
    for g in piano.get("giorni", []):
        if any(c["partner_id"] == partner_id for c in g["compiti"]):
            ultima = g["data"]
    return ultima


def id_attivita(chiave: str) -> str:
    """Id stabile dell'attivita' di Antonella per una lezione+versione: lo stesso esito non crea due attivita'."""
    import hashlib
    return "ant_lez_" + hashlib.sha1(chiave.encode("utf-8")).hexdigest()[:12]


def minuti_altri_compiti(compiti_settimana: Iterable[dict]) -> int:
    """Minuti stimati dei compiti gia' assegnati ad Antonella questa settimana che NON vengono dalla coda lezioni."""
    tot = 0
    for t in compiti_settimana or []:
        if (t.get("context") or {}).get("source") == "coda_lezioni":
            continue
        if t.get("status") in ("completed", "resolved", "cancelled"):
            continue
        try:
            tot += int(t.get("estimated_minutes") or (t.get("context") or {}).get("estimated_minutes") or 0)
        except (TypeError, ValueError):
            continue
    return tot


def valida_esito(body: Dict[str, Any]) -> Dict[str, Any]:
    """Normalizza l'esito inviato da Antonella. Solleva ValueError con un messaggio chiaro."""
    esito = body.get("esito")
    if esito not in ESITI:
        raise ValueError("Esito non valido")
    controlli = {k: bool((body.get("controlli") or {}).get(k)) for k in CONTROLLI}
    note = str(body.get("note") or "").strip()
    if esito == "da_correggere" and len(note) < 5:
        raise ValueError("Scrivi cosa non va (almeno 5 caratteri)")
    if esito == "verificata" and not all(controlli.values()):
        raise ValueError("Per segnare la lezione come verificata devono essere spuntati tutti i controlli")
    # I minuti veri sono OBBLIGATORI: il lavoro e' pagato a ore e le ore entrano nella liquidazione (vedi router).
    minuti = body.get("minuti_reali")
    try:
        minuti = int(minuti)
    except (TypeError, ValueError):
        raise ValueError("Scrivi quanti minuti ci hai messo: servono per la fatturazione")
    if not 1 <= minuti <= 600:
        raise ValueError("Minuti non validi (da 1 a 600)")
    return {"esito": esito, "controlli": controlli, "note": note or None, "minuti_reali": minuti}
