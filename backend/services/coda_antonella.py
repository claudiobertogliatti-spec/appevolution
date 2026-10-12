"""Coda di lavoro di Antonella: lezioni montate da controllare e caricare su Systeme, in un piano settimanale.

Funzioni PURE (nessun accesso a rete o database): il router legge i dati e li passa qui.

Regole (dichiarate, modificabili da config):
  - una lezione e' "da controllare" quando ha un video montato (output_version > 0 e una durata finale) e per
    quella versione non c'e' ancora l'esito "verificata" ne' "da_correggere" di Antonella;
  - una lezione con una revisione in corso (active_revision_id) non si controlla: la sta rifacendo il montaggio;
  - il tempo stimato di una lezione = durata del video x RAPPORTO_VISIONE + MINUTI_FISSI (caricamento su Systeme,
    titolo, verifica che il video parta). Sono STIME INIZIALI: non vengono da misure reali. Si correggono dalla
    config e, con `minuti_reali`, dai tempi veri registrati a ogni esito;
  - il piano e' SETTIMANALE: ogni settimana (lunedi-domenica) ha un tetto di minuti, mai superato; Antonella sceglie
    lei in quali giorni lavorare. Nella settimana in corso si tolgono i minuti degli altri compiti gia' assegnati.
    Un compito che non entra in una settimana passa alla successiva. Un compito piu lungo del tetto settimanale non
    si pianifica da solo: finisce negli avvisi, perche' la decisione e' di Claudio (spezzarlo, aumentare le ore...).
"""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

RAPPORTO_VISIONE = 1.5          # minuti di lavoro per ogni minuto di video (stima iniziale)
MINUTI_FISSI = 5                # per lezione: caricamento, titolo, prova di riproduzione (stima iniziale)
MINUTI_SENZA_DURATA = 15        # se la durata del video non e' nota
ORIZZONTE_SETTIMANE = 8        # quante settimane si pianificano al massimo
MINUTI_SETTIMANA = 300          # 5 ore a settimana (accordo con Antonella)

ESITI = ("verificata", "da_correggere")
CONTROLLI = ("audio", "inizio_fine", "parte_su_systeme", "titolo_ordine", "nessun_salto")


def config_valida(raw: Optional[dict]) -> Dict[str, Any]:
    """Config normalizzata: tetto settimanale e rapporti di stima. Valori fuori range tornano al default."""
    raw = raw or {}
    try:
        tetto = int(raw.get("minuti_settimana", MINUTI_SETTIMANA))
    except (TypeError, ValueError):
        tetto = MINUTI_SETTIMANA
    if not 0 <= tetto <= 2400:
        tetto = MINUTI_SETTIMANA
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
    return {"minuti_settimana": tetto, "rapporto_visione": rapporto, "minuti_fissi": fissi}


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


def inizio_settimana(d: date) -> date:
    return d - timedelta(days=d.weekday())


def piano_settimanale(compiti: List[dict], config: Optional[dict] = None, da: Optional[date] = None,
                      minuti_gia_assegnati: int = 0) -> Dict[str, Any]:
    """Assegna i compiti alle settimane senza mai superare il tetto settimanale.

    Nella settimana in corso il tetto si riduce dei minuti degli altri compiti gia' assegnati. I compiti restano
    nell'ordine ricevuto (arrivo piu vecchio per primo): non si saltano compiti piccoli davanti a uno grande piu
    vecchio, per non far aspettare sempre lo stesso partner.
    """
    cfg = config_valida(config)
    tetto = cfg["minuti_settimana"]
    oggi = da or datetime.now(timezone.utc).date()
    lunedi = inizio_settimana(oggi)
    settimane: List[dict] = []
    for i in range(ORIZZONTE_SETTIMANE):
        ini = lunedi + timedelta(days=7 * i)
        budget = max(0, tetto - max(0, int(minuti_gia_assegnati))) if i == 0 else tetto
        settimane.append({"inizio": ini.isoformat(), "fine": (ini + timedelta(days=6)).isoformat(),
                          "budget": budget, "usati": 0, "compiti": []})
    non_pianificati: List[dict] = []
    avvisi: List[str] = []
    idx = 0
    for c in compiti:
        if c["minuti"] > tetto:
            non_pianificati.append({**c, "motivo": "piu_lungo_di_una_settimana"})
            avvisi.append(
                f"«{c['titolo']}» ({c['partner_nome']}) richiede circa {c['minuti']} minuti: piu del tetto settimanale "
                f"({tetto}). Serve una decisione: spezzarlo o aumentare le ore."
            )
            continue
        j = idx
        while j < len(settimane) and settimane[j]["usati"] + c["minuti"] > settimane[j]["budget"]:
            j += 1
        if j >= len(settimane):
            non_pianificati.append({**c, "motivo": "fuori_orizzonte"})
            continue
        settimane[j]["compiti"].append(c)
        settimane[j]["usati"] += c["minuti"]
        idx = j  # mai tornare indietro: l'ordine di arrivo si rispetta
    if any(n["motivo"] == "fuori_orizzonte" for n in non_pianificati):
        avvisi.append(
            f"Con le ore attuali alcune lezioni non entrano nelle prossime {ORIZZONTE_SETTIMANE} settimane: "
            "serve piu tempo oppure meno partner in registrazione insieme."
        )
    totale = sum(c["minuti"] for c in compiti)
    return {"settimane": [w for w in settimane if w["compiti"]], "non_pianificati": non_pianificati,
            "avvisi": avvisi, "minuti_totali": totale}


def prima_data_prevista(piano: Dict[str, Any], partner_id: str) -> Optional[str]:
    """La fine della settimana in cui sara' pronta l'ultima lezione di un partner (per dirgli entro quando)."""
    ultima = None
    for w in piano.get("settimane", []):
        if any(c["partner_id"] == partner_id for c in w["compiti"]):
            ultima = w["fine"]
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
