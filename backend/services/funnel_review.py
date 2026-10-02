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

from services import domain_check
from services.partner_step_materials import allowed_funnel_preview_url

ASPETTO = {"id": "aspetto", "label": "L'aspetto: colori, foto e carattere"}

PAGES = (
    {"id": "optin", "title": "Iscrizione alla masterclass", "path": "/",
     "descr": "La pagina dove le persone lasciano nome ed email per guardare la masterclass.",
     "step": "Iscrizione",
     "building": "Ora costruiamo la pagina di iscrizione.",
     "purpose": "Serve a catturare il tuo pubblico: chi ti incontra lascia nome ed email e, in cambio, riceve la tua masterclass gratuita.",
     "parts": [{"id": "titolo", "label": "Il titolo che promette il risultato"}, {"id": "problema", "label": "Il problema che risolvi"}, {"id": "presentazione", "label": "La tua presentazione"}, {"id": "faq", "label": "Le domande frequenti"}, {"id": "modulo", "label": "Il modulo con nome ed email"}, ASPETTO],
     "gain": "I dati di chi è interessato: da quel momento sono contatti tuoi e puoi scrivere loro.",
     "check": "Che il titolo, la presentazione e i tuoi dati siano giusti."},
    {"id": "masterclass", "title": "La masterclass", "path": "/guarda.html",
     "descr": "Il video della masterclass e il pulsante per scoprire il tuo corso.",
     "step": "Masterclass",
     "building": "Ora costruiamo la pagina della masterclass.",
     "purpose": "Serve a far guardare il tuo video gratuito: è il momento in cui la persona inizia a fidarsi di te.",
     "parts": [{"id": "titolo", "label": "Il titolo"}, {"id": "video", "label": "Il video della masterclass"}, {"id": "problema", "label": "Il problema che il tuo metodo risolve"}, {"id": "cta", "label": "Il pulsante per scoprire il corso"}, ASPETTO],
     "gain": "Chi guarda arriva alla pagina del corso già convinto di poter contare su di te.",
     "check": "Che il video sia quello giusto e che i testi siano corretti."},
    {"id": "offerta", "title": "L'offerta", "path": "/offerta.html",
     "descr": "La pagina che presenta il corso, il prezzo e il pulsante per acquistare.",
     "step": "Offerta",
     "building": "Ora costruiamo la pagina dell'offerta.",
     "purpose": "Serve a presentare il tuo corso e a far decidere: cosa c'è dentro, quanto costa e come si acquista.",
     "parts": [{"id": "titolo", "label": "Il titolo e la promessa"}, {"id": "target", "label": "A chi è rivolto il corso"}, {"id": "metodo", "label": "Il metodo in pochi passaggi"}, {"id": "corso", "label": "Cosa c'è dentro il corso e il prezzo"}, {"id": "presentazione", "label": "La tua presentazione"}, {"id": "faq", "label": "Le domande più frequenti"}, {"id": "cta", "label": "Il pulsante per acquistare"}, ASPETTO],
     "gain": "Chi è convinto acquista il corso.",
     "check": "Che moduli, prezzo e cosa è incluso siano giusti."},
    {"id": "grazie", "title": "Grazie", "path": "/grazie.html",
     "descr": "La pagina che vede chi ha appena acquistato il corso.",
     "step": "Grazie",
     "building": "Ora costruiamo la pagina di ringraziamento.",
     "purpose": "Serve a confermare l'acquisto e a dire alla persona cosa fare adesso.",
     "parts": [{"id": "titolo", "label": "Il messaggio di benvenuto"}, {"id": "passi", "label": "I passi per accedere al corso"}, {"id": "contatto", "label": "Il tuo contatto per i problemi"}, ASPETTO],
     "gain": "Il cliente sa subito come iniziare e non resta nel dubbio dopo il pagamento.",
     "check": "Che il messaggio e i passi per accedere siano giusti."},
)
LEGAL_ID = "dati_legali"
LEGAL_TITLE = "I tuoi dati nelle pagine legali"
DOCS_ID = "documenti_legali"
DOCS_TITLE = "Privacy, cookie e condizioni di vendita"

CONNECTIONS = (
    {"id": "optin", "label": "Le iscrizioni arrivano nei tuoi contatti"},
    {"id": "email", "label": "Le email automatiche sono pronte"},
    {"id": "pagamento", "label": "Il pagamento è collegato"},
    {"id": "dominio", "label": "Il tuo indirizzo web è collegato"},
)

REVIEWABLE_IDS = frozenset([p["id"] for p in PAGES] + [LEGAL_ID, DOCS_ID])

DA_CONTROLLARE = "da_controllare"
APPROVATA = "approvata"
IN_MODIFICA = "in_modifica"

WRONG_MAX = 200
MAX_PHOTOS = 3
# elementi a elenco: il partner può chiedere di AGGIUNGERNE uno (una domanda, un punto, un passo)
ADDABLE = {
    ("optin", "faq"): "Aggiungi una domanda",
    ("optin", "problema"): "Aggiungi un punto",
    ("offerta", "target"): "Aggiungi un punto",
    ("offerta", "metodo"): "Aggiungi un punto",
    ("offerta", "corso"): "Aggiungi un punto",
    ("offerta", "faq"): "Aggiungi una domanda",
    ("grazie", "passi"): "Aggiungi un passo",
}
ACTIONS = ("modifica", "aggiungi")
PHOTO_PREFIXES = ("https://res.cloudinary.com/", "/static/operativo/")
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


def _open_corrections(rec: Dict[str, Any], item_id: str, part: Optional[str] = None) -> int:
    return sum(
        1 for c in ((rec.get("review") or {}).get("corrections") or [])
        if c.get("page") == item_id and c.get("status") == "aperta"
        and (part is None or c.get("part") == part)
    )


def _part_ids(item_id: str) -> List[str]:
    for p in PAGES:
        if p["id"] == item_id:
            return [x["id"] for x in p["parts"]]
    return []


def part_state(rec: Dict[str, Any], item_id: str, part_id: str) -> str:
    """Stato di un elemento della pagina (titolo, video, modulo…)."""
    if _open_corrections(rec, item_id, part_id):
        return IN_MODIFICA
    entry = (((rec.get("review") or {}).get("parts") or {}).get(item_id) or {}).get(part_id) or {}
    if entry.get("state") == APPROVATA and int(entry.get("approved_version") or 0) == _version(rec):
        return APPROVATA
    return DA_CONTROLLARE


def item_state(rec: Dict[str, Any], item_id: str) -> str:
    """Stato di una pagina: approvata solo se l'approvazione è della versione attuale."""
    if _open_corrections(rec, item_id):
        return IN_MODIFICA
    entry = _entry(rec, item_id)
    if entry.get("state") == APPROVATA and int(entry.get("approved_version") or 0) == _version(rec):
        return APPROVATA
    parts = _part_ids(item_id)
    if parts and all(part_state(rec, item_id, x) == APPROVATA for x in parts):
        return APPROVATA
    return DA_CONTROLLARE


def is_released(rec: Dict[str, Any]) -> bool:
    return bool(rec.get("preview_released")) and allowed_funnel_preview_url(rec.get("preview_url")) is not None


def docs_released(rec: Dict[str, Any]) -> bool:
    """I documenti si mostrano al partner solo quando il team li ha rilasciati (e l'anteprima è pronta)."""
    return is_released(rec) and bool(rec.get("documents_released"))


def _page_url(base: str, path: str) -> str:
    return base.rstrip("/") + path


STEP_FATTO = "fatto"
STEP_DA_FARE = "da_fare"
STEP_ATTESA = "attesa"


def build_steps(released: bool, pages: List[Dict[str, Any]], legal: Dict[str, Any],
                golive: Dict[str, Any], docs: Optional[Dict[str, Any]] = None,
                domain: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """I 5 passaggi mostrati al partner. `da_fare` = tocca a lui; `attesa` = tocca al team o non è
    ancora il momento. Documenti legali e dominio sono passaggi di guida: arrivano nelle PR dedicate."""
    domain = domain or {"configured": False, "done": False}
    if domain["done"]:
        domain_state = STEP_FATTO
    else:
        domain_state = STEP_DA_FARE if domain["configured"] else STEP_ATTESA
    docs = docs or {"released": False, "state": DA_CONTROLLARE}
    if not docs["released"]:
        docs_state = STEP_ATTESA
    else:
        docs_state = STEP_FATTO if docs["state"] == APPROVATA else STEP_DA_FARE
    all_pages_ok = bool(pages) and all(p["state"] == APPROVATA for p in pages)
    funnel_state = STEP_ATTESA if not released else (STEP_FATTO if all_pages_ok else STEP_DA_FARE)
    if golive["requested"]:
        go_state = STEP_FATTO
    else:
        go_state = STEP_DA_FARE if golive["can_request"] else STEP_ATTESA
    return [
        {"id": "dati", "title": "I tuoi dati", "short": "1 clic",
         "state": STEP_FATTO if legal["state"] == APPROVATA else STEP_DA_FARE},
        {"id": "funnel", "title": "Il funnel", "short": "guarda e approva", "state": funnel_state},
        {"id": "documenti", "title": "Pagine legali", "short": "leggi e approva", "state": docs_state},
        {"id": "dominio", "title": "Indirizzo web", "short": "righe da copiare", "state": domain_state},
        {"id": "via_libera", "title": "Via libera", "short": "si pubblica", "state": go_state},
    ]


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
    # la sequenza si spiega SEMPRE, anche prima del rilascio: il partner deve capire come è fatto il funnel
    content = rec.get("page_content") or {}
    sequence = []
    for p in PAGES:
        texts = content.get(p["id"]) or {}
        item = {k: p[k] for k in ("id", "title", "step", "building", "purpose", "gain", "check")}
        item["parts"] = [
            {"id": x["id"], "label": x["label"], "text": str(texts.get(x["id"]) or ""),
             "add_label": ADDABLE.get((p["id"], x["id"]), ""),
             "state": part_state(rec, p["id"], x["id"]) if released else DA_CONTROLLARE,
             "open_corrections": _open_corrections(rec, p["id"], x["id"])}
            for x in p["parts"]
        ]
        sequence.append(item)
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

    docs = {"id": DOCS_ID, "title": DOCS_TITLE, "released": docs_released(rec),
            "state": item_state(rec, DOCS_ID), "open_corrections": _open_corrections(rec, DOCS_ID)}

    records = ((rec.get("domain") or {}).get("records")) or []
    verified = ((rec.get("domain") or {}).get("verified")) or {}
    domain = {
        "configured": bool(records),
        "records": [{**r, "verified": bool(verified.get(r["id"]))} for r in records],
        "all_verified": bool(records) and all(verified.get(r["id"]) for r in records),
        "help_requested": bool((rec.get("domain") or {}).get("help_requested_at")),
    }
    domain["done"] = domain["all_verified"] or bool((rec.get("connections") or {}).get("dominio"))

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
        if docs["state"] != APPROVATA:
            missing.append("Leggi e approva privacy, cookie e condizioni di vendita.")
        if not team_ready:
            missing.append("Il team sta finendo i collegamenti tecnici.")

    items_total = len(PAGES) + 2 + len(connections)
    items_done = pages_approved + (1 if legal_ok else 0) + (1 if docs["state"] == APPROVATA else 0) + sum(1 for c in connections if c["done"])
    golive = {
        "requested": bool(rec.get("golive_requested_at")),
        "can_request": released and not missing,
        "missing": missing,
    }
    steps = build_steps(released, pages, legal, golive, docs, domain)
    return {
        "released": released,
        "steps": steps,
        "sequence": sequence,
        "current_step": next((x["id"] for x in steps if x["state"] != STEP_FATTO), steps[-1]["id"]),
        "preview_url": base if released else None,
        "version": _version(rec),
        "pages": pages,
        "legal": legal,
        "documents": docs,
        "domain": domain,
        "connections": connections,
        "corrections_open": sum(p["open_corrections"] for p in pages) + legal["open_corrections"] + docs["open_corrections"],
        "golive": golive,
        "progress": round(items_done / items_total * 100) if items_total else 0,
    }


# ── aggiornamenti da scrivere (puri: restituiscono il $set/$push, non toccano il DB) ─────────

def approve_update(rec: Dict[str, Any], item_id: str, now: str) -> Dict[str, Any]:
    if item_id not in REVIEWABLE_IDS:
        raise ReviewError("Pagina non riconosciuta.")
    if item_id != LEGAL_ID and not is_released(rec):
        raise ReviewError("Il funnel non è ancora pronto da guardare.")
    if item_id == DOCS_ID and not docs_released(rec):
        raise ReviewError("I documenti non sono ancora pronti da leggere.")
    if _open_corrections(rec, item_id):
        raise ReviewError("C'è una tua segnalazione ancora aperta: il team la sta sistemando.")
    return {"$set": {
        f"review.pages.{item_id}": {"state": APPROVATA, "approved_version": _version(rec), "approved_at": now},
        "updated_at": now,
    }}


def approve_part_update(rec: Dict[str, Any], item_id: str, part_id: str, now: str) -> Dict[str, Any]:
    """«Approva» su un singolo elemento. Quando sono approvati tutti, la pagina risulta approvata."""
    if item_id not in {p["id"] for p in PAGES} or part_id not in _part_ids(item_id):
        raise ReviewError("Elemento non riconosciuto.")
    if not is_released(rec):
        raise ReviewError("Il funnel non è ancora pronto da guardare.")
    if _open_corrections(rec, item_id, part_id):
        raise ReviewError("C'è una tua modifica ancora aperta: il team la sta sistemando.")
    sets: Dict[str, Any] = {
        f"review.parts.{item_id}.{part_id}": {"state": APPROVATA, "approved_version": _version(rec), "approved_at": now},
        "updated_at": now,
    }
    others = [x for x in _part_ids(item_id) if x != part_id]
    if all(part_state(rec, item_id, x) == APPROVATA for x in others) and not _open_corrections(rec, item_id):
        sets[f"review.pages.{item_id}"] = {"state": APPROVATA, "approved_version": _version(rec), "approved_at": now}
    return {"$set": sets}


def correction_update(rec: Dict[str, Any], item_id: str, wrong: Any, right: Any, now: str,
                      part: Optional[str] = None, note: Optional[str] = None,
                      photos: Optional[List[str]] = None, action: str = "modifica") -> Dict[str, Any]:
    if item_id not in REVIEWABLE_IDS:
        raise ReviewError("Pagina non riconosciuta.")
    if item_id != LEGAL_ID and not is_released(rec):
        raise ReviewError("Il funnel non è ancora pronto da guardare.")
    if item_id == DOCS_ID and not docs_released(rec):
        raise ReviewError("I documenti non sono ancora pronti da leggere.")
    entry = {
        "id": f"{item_id}-{int(len(((rec.get('review') or {}).get('corrections') or [])) + 1)}",
        "page": item_id,
        "wrong": clean_text(wrong, WRONG_MAX, "Cosa è sbagliato"),
        "right": clean_text(right, RIGHT_MAX, "Come dovrebbe essere"),
        "version": _version(rec),
        "status": "aperta",
        "at": now,
    }
    sets = {f"review.pages.{item_id}": {"state": IN_MODIFICA, "approved_version": None}, "updated_at": now}
    if part:
        if part not in _part_ids(item_id):
            raise ReviewError("Elemento non riconosciuto.")
        entry["part"] = part
        sets[f"review.parts.{item_id}.{part}"] = {"state": IN_MODIFICA, "approved_version": None}
    if action not in ACTIONS:
        raise ReviewError("Azione non riconosciuta.")
    if action == "aggiungi":
        if (item_id, part or "") not in ADDABLE:
            raise ReviewError("A questo elemento non si può aggiungere nulla.")
        entry["action"] = "aggiungi"
    if photos:
        entry["photos"] = [str(u) for u in photos][:MAX_PHOTOS]
    if note:
        entry["note"] = _SPACES.sub(" ", _TAGS.sub("", str(note))).strip()[:500]
    return {"$push": {"review.corrections": entry}, "$set": sets}, entry


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
    parts_state = dict((review.get("parts") or {}))
    for pid, entries in list(parts_state.items()):
        if pid in touched:
            parts_state[pid] = {}
        else:
            parts_state[pid] = {k: ({**v, "approved_version": version} if v.get("state") == APPROVATA else v)
                                for k, v in (entries or {}).items()}
    return {"$set": {
        "preview_version": version,
        "review.parts": parts_state,
        "review.pages": pages_state,
        "review.corrections": corrections,
        "updated_at": now,
    }}


def golive_update(rec: Dict[str, Any], now: str) -> Dict[str, Any]:
    state = review_state(rec)
    if not state["golive"]["can_request"]:
        raise ReviewError(" ".join(state["golive"]["missing"]) or "Non è ancora possibile dare il via libera.")
    return {"$set": {"golive_requested_at": now, "updated_at": now}}


ADMIN_SETTABLE = {"content", "domain_records", "preview_released", "documents_released", "team_ready", "preview_url", "preview_version"}


def admin_set_update(rec: Dict[str, Any], payload: Dict[str, Any], now: str) -> Dict[str, Any]:
    sets: Dict[str, Any] = {"updated_at": now}
    known = {c["id"] for c in CONNECTIONS}
    for key, value in (payload or {}).items():
        if key == "connections":
            for cid, flag in (value or {}).items():
                if cid not in known:
                    raise ReviewError(f"Collegamento sconosciuto: {cid}")
                sets[f"connections.{cid}"] = bool(flag)
        elif key == "domain_records":
            try:
                sets["domain.records"] = domain_check.validate_records(value)
            except domain_check.DomainError as e:
                raise ReviewError(str(e))
            sets["domain.verified"] = {}
        elif key == "content":
            parts = {p["id"]: {x["id"] for x in p["parts"]} for p in PAGES}
            for page_id, texts in (value or {}).items():
                if page_id not in parts:
                    raise ReviewError(f"Pagina sconosciuta: {page_id}")
                for part_id, text in (texts or {}).items():
                    if part_id not in parts[page_id]:
                        raise ReviewError(f"Elemento sconosciuto: {page_id}.{part_id}")
                    sets[f"page_content.{page_id}.{part_id}"] = _SPACES.sub(" ", _TAGS.sub("", str(text or ""))).strip()[:600]
        elif key in ("preview_released", "documents_released", "team_ready"):
            sets[key] = bool(value)
            if key == "documents_released" and value and not rec.get("documents_released_at"):
                sets["documents_released_at"] = now
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


def clean_photos(photos: Any) -> List[str]:
    """Solo foto caricate dal partner sul nostro spazio (Cloudinary o cartella operativo), massimo 3."""
    urls = [str(u).strip() for u in (photos or []) if str(u or "").strip()]
    if len(urls) > MAX_PHOTOS:
        raise ReviewError(f"Puoi allegare al massimo {MAX_PHOTOS} foto.")
    for u in urls:
        if not u.startswith(PHOTO_PREFIXES) or ".." in u:
            raise ReviewError("Una delle foto non è valida: caricala di nuovo.")
    return urls


def domain_verified_update(rec: Dict[str, Any], results: List[Dict[str, Any]], now: str) -> Dict[str, Any]:
    """Salva l'esito del controllo DNS. Quando tutte le righe sono visibili, il collegamento risulta fatto."""
    sets: Dict[str, Any] = {"updated_at": now}
    for r in results:
        sets[f"domain.verified.{r['id']}"] = r["status"] == domain_check.OK
    if results and all(r["status"] == domain_check.OK for r in results):
        sets["connections.dominio"] = True
    return {"$set": sets}
