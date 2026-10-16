"""Start Plus: dettaglio del passo `start-primo-prodotto`.

Quattro voci, ognuna con uno stato scritto da una persona (mai da un automatismo).
Il passo si chiude solo quando le quattro sono consegnate E un admin da' il via finale.
Se una voce torna indietro dopo il via finale, il via finale decade e il passo si riapre.
Funzioni pure: la rotta si occupa solo di leggere e scrivere sul passo della journey.
"""
from __future__ import annotations

from typing import Any

VOCI: tuple[str, ...] = ("promessa", "pagina_vendita", "checkout", "messaggio_lancio")
VOCI_LABEL: dict[str, str] = {
    "promessa": "Promessa",
    "pagina_vendita": "Pagina di vendita",
    "checkout": "Checkout",
    "messaggio_lancio": "Messaggio di lancio",
}
STATI: tuple[str, ...] = ("da_fare", "in_lavorazione", "consegnato")
VOCI_CON_LINK = {"pagina_vendita", "checkout"}
MAX_VALORE = 4000
MAX_NOTA = 1000


class VoceNonValida(ValueError):
    """Dati di una voce rifiutati: il messaggio e' pensato per l'admin."""


def _voce_vuota() -> dict[str, Any]:
    return {"stato": "da_fare", "valore": "", "nota": "", "aggiornata_il": None}


def normalizza(data: dict[str, Any] | None) -> dict[str, Any]:
    """Il blocco `primo_prodotto` completo, con i default per le voci mai toccate."""
    grezzo = (data or {}).get("primo_prodotto") or {}
    voci_grezze = grezzo.get("voci") or {}
    voci = {}
    for chiave in VOCI:
        voce = {**_voce_vuota(), **(voci_grezze.get(chiave) or {})}
        if voce["stato"] not in STATI:
            voce["stato"] = "da_fare"
        voci[chiave] = voce
    return {"voci": voci, "via_finale": grezzo.get("via_finale") or None}


def aggiorna_voce(
    blocco: dict[str, Any], voce: str, stato: str, valore: str | None, nota: str | None, now: str
) -> dict[str, Any]:
    """Nuovo blocco con la voce aggiornata. Il via finale decade se la voce non e' piu' consegnata."""
    if voce not in VOCI:
        raise VoceNonValida("Voce sconosciuta.")
    if stato not in STATI:
        raise VoceNonValida("Stato non valido.")
    corrente = blocco["voci"][voce]
    nuovo_valore = corrente["valore"] if valore is None else valore.strip()
    nuova_nota = corrente["nota"] if nota is None else nota.strip()
    if len(nuovo_valore) > MAX_VALORE or len(nuova_nota) > MAX_NOTA:
        raise VoceNonValida("Testo troppo lungo.")
    if stato == "consegnato":
        if not nuovo_valore:
            raise VoceNonValida("Per segnare la voce come consegnata serve il contenuto.")
        if voce in VOCI_CON_LINK and not nuovo_valore.lower().startswith(("https://", "http://")):
            raise VoceNonValida("Per questa voce serve un link che inizia con https://.")
    voci = {**blocco["voci"], voce: {
        "stato": stato, "valore": nuovo_valore, "nota": nuova_nota, "aggiornata_il": now,
    }}
    # Qualsiasi modifica a una voce dopo il via finale lo fa decadere: va riconfermato.
    return {"voci": voci, "via_finale": None}


def voci_mancanti(blocco: dict[str, Any]) -> list[str]:
    return [VOCI_LABEL[k] for k in VOCI if blocco["voci"][k]["stato"] != "consegnato"]


def dai_via_finale(blocco: dict[str, Any], da: str, now: str) -> dict[str, Any]:
    mancanti = voci_mancanti(blocco)
    if mancanti:
        raise VoceNonValida("Mancano ancora: " + ", ".join(mancanti) + ".")
    return {"voci": blocco["voci"], "via_finale": {"da": da, "il": now}}


def stato_passo(blocco: dict[str, Any]) -> str:
    """Stato del passo nella journey, derivato solo da cio' che una persona ha scritto."""
    if blocco["via_finale"] and not voci_mancanti(blocco):
        return "done"
    if any(v["stato"] != "da_fare" for v in blocco["voci"].values()):
        return "in_progress"
    return "pending"
