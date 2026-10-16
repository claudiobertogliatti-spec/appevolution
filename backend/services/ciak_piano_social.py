"""
Piano social del mese (Andrea) con link tracciati.

Andrea propone il calendario del mese: per ogni voce data, canale, formato, tema, brief e invito.
Claudio lo legge, lo corregge e lo approva UNA volta. All'approvazione ogni voce riceve un link
breve tracciato verso il sito (UTM + contatore dei clic).

Cosa fa e cosa NO:
- Il piano e' una proposta approvata, non pubblica da solo: i caroselli passano dall'Editoriale, i
  reel dal flusso reel (script + approvazione + crediti HeyGen), YouTube/LinkedIn/blog sono ancora
  manuali. Il piano dice di quale si tratta.
- I clic sono quelli contati dal redirect, esclusi i robot riconoscibili. Non sono lead: i lead restano
  nel funnel.

Funzioni pure: `valida_richiesta`, `prompt`, `parse_piano`, `url_tracciato`, `codice_breve`,
`e_robot`, `riepilogo_clic`.
"""
from __future__ import annotations

import calendar
import json
import re
import secrets
from datetime import date
from typing import Any, Optional
from urllib.parse import urlencode, urlsplit, urlunsplit

MAX_VOCI = 16
OBIETTIVO_MIN, OBIETTIVO_MAX = 10, 800
CANALI = ("instagram", "facebook", "linkedin", "youtube", "blog")
FORMATI = {
    "instagram": ("carosello", "reel"),
    "facebook": ("carosello", "reel", "post_testo"),
    "linkedin": ("carosello", "post_testo"),
    "youtube": ("video", "short"),
    "blog": ("articolo",),
}
# Come si realizza ogni formato oggi (detto all'utente, non lasciato intendere).
COME_SI_FA = {
    "carosello": "Editoriale (caroselli): approvi il mese e il motore pubblica su Instagram/Facebook",
    "reel": "Flusso reel: script di Andrea, approvazione, HeyGen, poi coda di pubblicazione",
    "post_testo": "Manuale: Andrea scrive la bozza in Contenuti, pubblichi tu",
    "video": "Manuale: video da produrre e caricare tu",
    "short": "Manuale: reel verticale da caricare tu su YouTube Shorts",
    "articolo": "Manuale: bozza in Contenuti, pubblichi tu sul blog",
}
_ROBOT = re.compile(r"bot|crawl|spider|preview|facebookexternalhit|slurp|headless|monitor|curl|python-requests", re.I)
MODELLO = "claude-sonnet-4-6"


def valida_richiesta(mese: Any, obiettivo: Any, canali: Any, oggi: Optional[date] = None) -> tuple[str, str, list[str]]:
    oggi = oggi or date.today()
    if not isinstance(mese, str) or not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", mese):
        raise ValueError("Mese non valido (AAAA-MM).")
    if mese < oggi.strftime("%Y-%m"):
        raise ValueError("Il mese è già passato.")
    if not isinstance(obiettivo, str) or not (OBIETTIVO_MIN <= len(obiettivo.strip()) <= OBIETTIVO_MAX):
        raise ValueError(f"Scrivi l'obiettivo del mese ({OBIETTIVO_MIN}-{OBIETTIVO_MAX} caratteri).")
    sc = [c for c in (canali or []) if c in CANALI]
    if not sc:
        raise ValueError("Scegli almeno un canale.")
    return mese, obiettivo.strip(), list(dict.fromkeys(sc))


def prompt(mese: str, obiettivo: str, canali: list[str], tetto_reel: int, memoria: str = "") -> tuple[str, str]:
    formati = "; ".join(f"{c}: {', '.join(FORMATI[c])}" for c in canali)
    system = (
        "Sei ANDREA, il responsabile Contenuti AI di Ciak. Prepari per Claudio Bertogliatti il piano "
        "social del mese: pochi contenuti, regolari, ognuno con un compito (portare persone sul sito).\n\n"
        "REGOLE (non derogabili):\n"
        f"- Al massimo {MAX_VOCI} voci in totale, distribuite nel mese; mai due voci dello stesso canale lo stesso giorno.\n"
        f"- Al massimo {tetto_reel} voci di formato «reel» in tutto il mese (budget video).\n"
        f"- Usa SOLO i canali e i formati ammessi: {formati}.\n"
        "- Nessun risultato, cifra, testimonianza, premio o promessa inventati: temi e brief si basano sull'obiettivo "
        "di Claudio e sulla Memoria Ciak.\n"
        "- Tema di una riga; brief di 2-3 frasi (a chi parla, un solo concetto); invito: cosa deve fare chi guarda.\n"
        "- Se ammesso, includi un solo articolo blog nel mese.\n"
        "- Rispondi SOLO con un array JSON: [{\"data\": \"AAAA-MM-GG\", \"canale\": \"...\", \"formato\": \"...\", "
        "\"tema\": \"...\", \"brief\": \"...\", \"invito\": \"...\"}].\n"
    )
    if memoria:
        system += "\n" + memoria
    return system, f"MESE: {mese}\nCANALI: {', '.join(canali)}\nOBIETTIVO DI CLAUDIO:\n{obiettivo}"


def parse_piano(raw: str, mese: str, canali: list[str], tetto_reel: int) -> Optional[dict]:
    """{voci, scartate}; None se non c'e' un piano utilizzabile (meno di 3 voci valide).
    Le voci non valide si scartano e si contano: non si 'aggiustano' di nascosto."""
    if not raw:
        return None
    testo = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip())
    m = re.search(r"\[.*\]", testo, flags=re.DOTALL)
    if not m:
        return None
    try:
        arr = json.loads(m.group(0))
    except ValueError:
        return None
    if not isinstance(arr, list):
        return None
    anno, mm = int(mese[:4]), int(mese[5:])
    ultimo = calendar.monthrange(anno, mm)[1]
    voci, scartate, reel, visti = [], 0, 0, set()
    for v in arr:
        ok = isinstance(v, dict)
        if ok:
            data, canale, formato = v.get("data"), v.get("canale"), v.get("formato")
            tema, brief, invito = (str(v.get(k) or "").strip() for k in ("tema", "brief", "invito"))
            ok = (canale in canali and formato in FORMATI.get(canale, ()) and tema and len(brief) >= 10
                  and isinstance(data, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", data) and data[:7] == mese
                  and 1 <= int(data[8:]) <= ultimo and (data, canale) not in visti)
        if ok and formato == "reel" and reel >= tetto_reel:
            ok = False
        if not ok or len(voci) >= MAX_VOCI:
            scartate += 1
            continue
        visti.add((data, canale))
        reel += formato == "reel"
        voci.append({"data": data, "canale": canale, "formato": formato, "tema": tema[:200],
                     "brief": brief[:600], "invito": invito[:200], "come_si_fa": COME_SI_FA[formato]})
    if len(voci) < 3:
        return None
    voci.sort(key=lambda x: (x["data"], x["canale"]))
    return {"voci": voci, "scartate": scartate}


def codice_breve() -> str:
    return secrets.token_urlsafe(6)


def url_tracciato(destinazione: str, *, canale: str, mese: str, voce_id: str) -> str:
    """Destinazione + UTM. Solo http(s); ValueError altrimenti."""
    parti = urlsplit((destinazione or "").strip())
    if parti.scheme not in ("http", "https") or not parti.netloc:
        raise ValueError("La destinazione deve essere un indirizzo http(s) valido.")
    utm = urlencode({"utm_source": canale, "utm_medium": "social_organico",
                     "utm_campaign": f"piano-{mese}", "utm_content": voce_id})
    q = f"{parti.query}&{utm}" if parti.query else utm
    return urlunsplit((parti.scheme, parti.netloc, parti.path, q, parti.fragment))


def e_robot(user_agent: Optional[str]) -> bool:
    return not user_agent or bool(_ROBOT.search(user_agent))


def riepilogo_clic(righe: list[dict]) -> dict:
    """{codice: {clic, robot}} da righe {codice, robot}."""
    out: dict[str, dict] = {}
    for r in righe:
        e = out.setdefault(r["codice"], {"clic": 0, "robot": 0})
        e["robot" if r.get("robot") else "clic"] += 1
    return out
