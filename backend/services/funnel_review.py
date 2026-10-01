"""Revisione del funnel da parte del partner (step F-13 "Il tuo funnel").

Il partner non è tecnico: vede le pagine del suo funnel in anteprima (Vercel gratuito) e per
ogni pagina fa UNA scelta semplice: "Va bene" oppure "C'è un dato sbagliato". Non riscrive
copy né struttura: segnala solo il dato sbagliato e quello giusto.

Questo modulo è PURO (nessun accesso a rete o DB): calcola lo stato mostrato al partner e gli
aggiornamenti da scrivere su `partner_funnel`. Il router lo chiama e salva.

Dati su `partner_funnel`:
  preview_url, preview_version        anteprima su *.vercel.app (impostata dall'admin)
  preview_released                    cancello interno: il partner la vede solo se True
  review.pages.<id>                   {state, approved_version, approved_at}
  review.corrections[]                segnalazioni del partner
  connections.<id>                    collegamenti a cura del team (bool)
  team_ready                          il team ha finito i controlli → sblocca il via libera
  golive_requested_at                 il partner ha dato il via libera
"""
import re
from typing import Any, Dict, List, Optional

from services.partner_step_materials import allowed_funnel_preview_url

PAGES = (
    {"id": "optin", "title": "Iscrizione alla masterclass", "path": "/",
     "descr": "La pagina dove le persone lasciano nome ed email per guardare la masterclass."},
    {"id": "masterclass", "title": "La masterclass", "path": "/guarda.html",
     "descr": "Il video della masterclass e il pulsante per scoprire il tuo corso."},
    {"id": "offerta", "title": "L'offerta", "path": "/offerta.html",
     "descr": "La pagina che presenta il corso, il prezzo e il pulsante per acquistare."},
    {"id": "grazie", "title": "Grazie", "path": "/grazie.html",
     "descr": "La pagina che vede chi ha appena acquistato il corso."},
)
LEGAL_ID = "dati_legali"
LEGAL_TITLE = "I tuoi dati nelle pagine legali"

CONNECTIONS = (
    {"id": "optin", "label": "Le iscrizioni arrivano nei tuoi contatti"},
    {"id": "email", "label": "Le email automatiche sono pronte"},
    {"id": "pagamento", "label": "Il pagamento è collegato"},
    {"id": "dominio", "label": "Il tuo indirizzo web è collegato"},
)

REVIEWABLE_IDS = frozenset([p["id"] for p in PAGES] + [LEGAL_ID])

DA_CONTROLLARE = "da_controllare"
APPROVATA = "approvata"
IN_MODIFICA = "in_modifica"

WRONG_MAX = 200
RIGHT_MAX = 300
MIN_LEN = 3

_TAGS = re.compile(r"[<>]")
_SPACES = re.compile(r"\s+")


class ReviewError(ValueError):
    """Errore di validazione con un messaggio comprensibile dal partner."""


def clean_text(value: Any, max_len: int, label: str) -> str:
    text = _SPACES.sub(" ", _TAGS.sub("", str(value or ""))).strip()
    if len(text) < MIN_LEN:
        raise ReviewError(f"Scrivi qualche parola in «{label}».")
    if len(text) > max_len:
        raise ReviewError(f"«{label}» è troppo lungo: massimo {max_len} caratteri.")
    return text


def _version(rec: Dict[str, Any]) -> int:
    try:
        return max(1, int(rec.get("preview_version") or 1))
    except (TypeError, ValueError):
        return 1


def _entry(rec: Dict[str, Any], item_id: str) -> Dict[str, Any]:
    return (((rec.get("review") or {}).get("pages") or {}).get(item_id)) or {}


def _open_corrections(rec: Dict[str, Any], item_id: str) -> int:
    return sum(
        1 for c in ((rec.get("review") or {}).get("corrections") or [])
        if c.get("page") == item_id and c.get("status") == "aperta"
    )


def item_state(rec: Dict[str, Any], item_id: str) -> str:
    """Stato di una pagina: approvata solo se l'approvazione è della versione attuale."""
    if _open_corrections(rec, item_id):
        return IN_MODIFICA
    entry = _entry(rec, item_id)
    if entry.get("state") == APPROVATA and int(entry.get("approved_version") or 0) == _version(rec):
        return APPROVATA
    return DA_CONTROLLARE


def is_released(rec: Dict[str, Any]) -> bool:
    return bool(rec.get("preview_released")) and allowed_funnel_preview_url(rec.get("preview_url")) is not None


def _page_url(base: str, path: str) -> str:
    return base.rstrip("/") + path


def review_state(rec: Dict[str, Any], legal_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Stato completo mostrato al partner nella schermata F-13."""
    rec = rec or {}
    base = allowed_funnel_preview_url(rec.get("preview_url"))
    released = is_released(rec)
    connections = [
        {"id": c["id"], "label": c["label"], "done": bool((rec.get("connections") or {}).get(c["id"]))}
        for c in CONNECTIONS
    ]
    pages: List[Dict[str, Any]] = []
    legal: Dict[str, Any] = {"id": LEGAL_ID, "title": LEGAL_TITLE, "state": DA_CONTROLLARE,
                             "open_corrections": 0, "data": legal_data or {}}
    if released:
        for p in PAGES:
            pages.append({
                "id": p["id"], "title": p["title"], "descr": p["descr"],
                "url": _page_url(base, p["path"]),
                "state": item_state(rec, p["id"]),
                "open_corrections": _open_corrections(rec, p["id"]),
            })
        legal["state"] = item_state(rec, LEGAL_ID)
        legal["open_corrections"] = _open_corrections(rec, LEGAL_ID)

    pages_approved = sum(1 for p in pages if p["state"] == APPROVATA)
    legal_ok = legal["state"] == APPROVATA
    team_ready = bool(rec.get("team_ready"))
    missing: List[str] = []
    if not released:
        missing.append("Il team sta preparando il tuo funnel: ti avvisiamo qui quando è pronto da guardare.")
    else:
        left = len(pages) - pages_approved
        if left:
            missing.append(f"Controlla le pagine: ne mancano {left}.")
        if not legal_ok:
            missing.append("Conferma i tuoi dati per le pagine legali.")
        if not team_ready:
            missing.append("Il team sta finendo i collegamenti tecnici.")

    items_total = len(PAGES) + 1 + len(connections)
    items_done = pages_approved + (1 if legal_ok else 0) + sum(1 for c in connections if c["done"])
    return {
        "released": released,
        "preview_url": base if released else None,
        "version": _version(rec),
        "pages": pages,
        "legal": legal,
        "connections": connections,
        "corrections_open": sum(p["open_corrections"] for p in pages) + legal["open_corrections"],
        "golive": {
            "requested": bool(rec.get("golive_requested_at")),
            "can_request": released and not missing,
            "missing": missing,
        },
        "progress": round(items_done / items_total * 100) if items_total else 0,
    }


# ── aggiornamenti da scrivere (puri: restituiscono il $set/$push, non toccano il DB) ─────────

def approve_update(rec: Dict[str, Any], item_id: str, now: str) -> Dict[str, Any]:
    if item_id not in REVIEWABLE_IDS:
        raise ReviewError("Pagina non riconosciuta.")
    if not is_released(rec):
        raise ReviewError("Il funnel non è ancora pronto da guardare.")
    if _open_corrections(rec, item_id):
        raise ReviewError("C'è una tua segnalazione ancora aperta: il team la sta sistemando.")
    return {"$set": {
        f"review.pages.{item_id}": {"state": APPROVATA, "approved_version": _version(rec), "approved_at": now},
        "updated_at": now,
    }}


def correction_update(rec: Dict[str, Any], item_id: str, wrong: Any, right: Any, now: str) -> Dict[str, Any]:
    if item_id not in REVIEWABLE_IDS:
        raise ReviewError("Pagina non riconosciuta.")
    if not is_released(rec):
        raise ReviewError("Il funnel non è ancora pronto da guardare.")
    entry = {
        "id": f"{item_id}-{int(len(((rec.get('review') or {}).get('corrections') or [])) + 1)}",
        "page": item_id,
        "wrong": clean_text(wrong, WRONG_MAX, "Cosa è sbagliato"),
        "right": clean_text(right, RIGHT_MAX, "Come dovrebbe essere"),
        "version": _version(rec),
        "status": "aperta",
        "at": now,
    }
    return {
        "$push": {"review.corrections": entry},
        "$set": {f"review.pages.{item_id}": {"state": IN_MODIFICA, "approved_version": None}, "updated_at": now},
    }, entry


def new_version_update(rec: Dict[str, Any], version: Any, pages: Any, now: str) -> Dict[str, Any]:
    """L'admin pubblica una nuova versione: decadono solo le approvazioni delle pagine toccate
    e si chiudono le loro segnalazioni. Le altre approvazioni restano valide."""
    try:
        version = int(version)
    except (TypeError, ValueError):
        raise ReviewError("Versione non valida.")
    if version < 1:
        raise ReviewError("Versione non valida.")
    touched = [p for p in (pages or []) if p in REVIEWABLE_IDS]
    if pages and not touched:
        raise ReviewError("Nessuna pagina riconosciuta.")
    review = rec.get("review") or {}
    corrections = []
    for c in (review.get("corrections") or []):
        if c.get("page") in touched and c.get("status") == "aperta":
            c = {**c, "status": "risolta", "resolved_at": now}
        corrections.append(c)
    # le pagine NON toccate mantengono l'approvazione: la riscriviamo sulla nuova versione
    pages_state = dict((review.get("pages") or {}))
    for pid, entry in list(pages_state.items()):
        if pid in touched:
            pages_state[pid] = {"state": DA_CONTROLLARE, "approved_version": None}
        elif entry.get("state") == APPROVATA:
            pages_state[pid] = {**entry, "approved_version": version}
    return {"$set": {
        "preview_version": version,
        "review.pages": pages_state,
        "review.corrections": corrections,
        "updated_at": now,
    }}


def golive_update(rec: Dict[str, Any], now: str) -> Dict[str, Any]:
    state = review_state(rec)
    if not state["golive"]["can_request"]:
        raise ReviewError(" ".join(state["golive"]["missing"]) or "Non è ancora possibile dare il via libera.")
    return {"$set": {"golive_requested_at": now, "updated_at": now}}


ADMIN_SETTABLE = {"preview_released", "team_ready", "preview_url", "preview_version"}


def admin_set_update(rec: Dict[str, Any], payload: Dict[str, Any], now: str) -> Dict[str, Any]:
    sets: Dict[str, Any] = {"updated_at": now}
    known = {c["id"] for c in CONNECTIONS}
    for key, value in (payload or {}).items():
        if key == "connections":
            for cid, flag in (value or {}).items():
                if cid not in known:
                    raise ReviewError(f"Collegamento sconosciuto: {cid}")
                sets[f"connections.{cid}"] = bool(flag)
        elif key in ("preview_released", "team_ready"):
            sets[key] = bool(value)
        elif key == "preview_url":
            if value and allowed_funnel_preview_url(value) is None:
                raise ReviewError("L'anteprima deve essere un indirizzo https://….vercel.app")
            sets[key] = (str(value).strip() if value else None)
        elif key == "preview_version":
            sets[key] = max(1, int(value))
        else:
            raise ReviewError(f"Campo non modificabile: {key}")
    if len(sets) == 1:
        raise ReviewError("Nessun dato da salvare.")
    return {"$set": sets}


def legal_data_from_partner(partner: Dict[str, Any]) -> Dict[str, str]:
    """Dati del titolare mostrati al partner per confermarli. Solo quelli che finiscono nelle
    pagine legali: niente codice fiscale, IBAN, data di nascita."""
    b = (partner or {}).get("dati_burocrazia") or {}
    nome = " ".join(x for x in (b.get("nome"), b.get("cognome")) if x).strip() or (partner or {}).get("name", "")
    via = ", ".join(x for x in (b.get("indirizzo"), " ".join(y for y in (b.get("cap"), b.get("comune")) if y)) if x)
    sede = f"{via} ({b.get('provincia')})" if via and b.get("provincia") else via
    data = {
        "Titolare": nome,
        "Partita IVA": b.get("partita_iva") or "",
        "Sede": sede,
        "Email": b.get("email") or (partner or {}).get("email", ""),
    }
    return {k: v for k, v in data.items() if v}
