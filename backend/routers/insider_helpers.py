import re

# Luogo di accettazione FISSO: coincide col foro esclusivo dell'Art. 14.4 del contratto
# (indicazione dell'avvocato). Il cliente non lo sceglie e non lo puo' modificare.
LUOGO_ACCETTAZIONE = "Torino"

_CF_RE = re.compile(r"^([A-Z0-9]{16}|\d{11})$")
_PIVA_RE = re.compile(r"^\d{11}$")
_CAP_RE = re.compile(r"^\d{5}$")
_PROV_RE = re.compile(r"^[A-Z]{2}$")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
_DATI_OBBLIGATORI = {
    "nome": "il nome", "cognome": "il cognome", "codice_fiscale": "il codice fiscale",
    "indirizzo": "l'indirizzo", "cap": "il CAP", "citta": "la città",
    "provincia": "la provincia", "email": "l'email",
}
_DATI_FACOLTATIVI = ("pec", "nome_azienda", "partita_iva")


def validate_dati_contratto(body: dict) -> dict:
    """Pura: valida e normalizza i dati anagrafici del Partner per il contratto.

    Solleva ValueError con un messaggio gia' leggibile dal cliente. Ritorna SOLO i campi
    noti (mai IBAN o altro): e' quello che finisce in `contract_partner_data`.
    """
    if not isinstance(body, dict):
        raise ValueError("Dati non validi")
    out = {}
    for key in (*_DATI_OBBLIGATORI, *_DATI_FACOLTATIVI):
        value = body.get(key, "")
        if value is None:
            value = ""
        if not isinstance(value, str):
            raise ValueError("Dati non validi")
        value = " ".join(value.split())
        if len(value) > 120:
            raise ValueError("Uno dei campi è troppo lungo")
        out[key] = value
    for key, label in _DATI_OBBLIGATORI.items():
        if not out[key]:
            raise ValueError(f"Inserisci {label}")
    out["codice_fiscale"] = out["codice_fiscale"].replace(" ", "").upper()
    if not _CF_RE.match(out["codice_fiscale"]):
        raise ValueError("Controlla il codice fiscale: sono 16 caratteri (11 cifre per una società)")
    if not _CAP_RE.match(out["cap"]):
        raise ValueError("Il CAP deve avere 5 cifre")
    out["provincia"] = out["provincia"].upper()
    if not _PROV_RE.match(out["provincia"]):
        raise ValueError("La provincia va indicata con la sigla di 2 lettere, per esempio TO")
    if not _EMAIL_RE.match(out["email"]):
        raise ValueError("Controlla l'indirizzo email")
    if out["pec"] and not _EMAIL_RE.match(out["pec"]):
        raise ValueError("Controlla l'indirizzo PEC")
    piva = out["partita_iva"].replace(" ", "").upper()
    if piva.startswith("IT"):
        piva = piva[2:]
    if piva and not _PIVA_RE.match(piva):
        raise ValueError("La partita IVA deve avere 11 cifre")
    out["partita_iva"] = piva
    return out


def build_contract_acceptance(body: dict, ip: str, now_iso: str) -> dict:
    """Pura: valida consenso (checkbox o firma) e costruisce contract_data. Solleva ValueError se invalido."""
    if not isinstance(body, dict):
        raise ValueError("accettazione non valida")
    specifica = body.get("approvazione_specifica_clausole", False)
    if type(specifica) is not bool:
        raise ValueError("l'approvazione specifica delle clausole deve essere un booleano")
    declaration = body.get("dichiarazione_imprenditoriale", False)
    if type(declaration) is not bool:
        raise ValueError("la dichiarazione imprenditoriale deve essere un booleano")
    piva = body.get("piva", "")
    if not isinstance(piva, str) or len(piva) > 32:
        raise ValueError("partita IVA non valida")
    if body.get("clausole_vessatorie_approved") is not True:
        raise ValueError("clausole vessatorie non approvate")
    sig = body.get("signature_base64")
    consenso = body.get("consenso_checkbox") is True
    if not sig and not consenso:
        raise ValueError("serve l'accettazione (checkbox) o la firma")
    return {
        "version": "v1.0",
        "signed_at": now_iso,
        "signature_base64": sig or "",
        "metodo": "signature" if sig else "checkbox",
        "ip_address": ip,
        "clausole_vessatorie_approved": True,
        # Doppia sottoscrizione (artt. 1341-1342 c.c.): oltre all'accettazione del contratto,
        # un SECONDO consenso distinto per le clausole dell'Art. 15.5. Qui il solo flag del
        # client; l'elenco approvato (snapshot) lo aggiunge l'endpoint dal testo del contratto.
        "approvazione_specifica_clausole": specifica,
        "luogo_accettazione": LUOGO_ACCETTAZIONE,
        # Opzione A' (B2B senza P.IVA obbligatoria): dichiarazione di finalita'
        # imprenditoriale + P.IVA facoltativa. Campi OPZIONALI in input: la
        # Proposta.jsx legacy non li manda e non deve rompersi.
        "dichiarazione_imprenditoriale": declaration,
        "piva": piva.strip(),
    }


def enrich_proposta_for_insider(proposta: dict, sess: dict | None) -> dict:
    """Pura: aggiunge analisi + scoring_stato del lead alla proposta (sess già letta).

    Opzionali in `sess` (pagina post-call sul Blueprint): `blueprint` (già proiettato con
    `blueprint_public_view`), `bonus` (`bonus_state`), `raccomandata` (`recommended_path`).
    Se mancano restano None: la pagina deve funzionare anche senza."""
    proposta = dict(proposta)
    analisi = None
    stato = None
    if sess:
        analisi = sess.get("analisi") or sess.get("analysis")
        stato = (sess.get("scoring") or {}).get("stato")
    proposta["analisi"] = analisi
    proposta["scoring_stato"] = stato
    proposta["blueprint"] = (sess or {}).get("blueprint")
    proposta["bonus"] = (sess or {}).get("bonus")
    proposta["raccomandata"] = (sess or {}).get("raccomandata")
    return proposta


# ── Pagina post-call personalizzata sul Blueprint ─────────────────────────────
# L'endpoint GET /api/proposta/{token} e' pubblico (il token e' l'unica
# "capability"). Del Blueprint esponiamo SOLO i campi che la pagina mostra, gia'
# destinati al cliente (sono quelli del PDF che ha ricevuto): niente payload
# intero, niente campi interni.
_BP_TEXT_LIMIT = 700


def _bp_text(value) -> str:
    text = " ".join(str(value or "").split())
    return text if len(text) <= _BP_TEXT_LIMIT else text[: _BP_TEXT_LIMIT - 1].rstrip() + "…"


def _bp_cards(items, limit=6) -> list:
    out = []
    for item in list(items or [])[:limit]:
        if isinstance(item, dict):
            h = _bp_text(item.get("h") or item.get("titolo"))
            p = _bp_text(item.get("p") or item.get("desc") or item.get("contenuto"))
            if h or p:
                out.append({"h": h, "p": p})
        elif item:
            out.append({"h": _bp_text(item), "p": ""})
    return out


def blueprint_public_view(payload: dict | None) -> dict | None:
    """Pura: proiezione client-facing del payload `ciak_blueprints.payload`. None se vuoto."""
    if not isinstance(payload, dict):
        return None
    sez = payload.get("sezioni")
    if not isinstance(sez, dict) or not sez:
        return None
    meta = payload.get("meta") or {}

    def sec(key):
        value = sez.get(key)
        return value if isinstance(value, dict) else {}

    return {
        "meta": {
            "progetto": _bp_text(meta.get("progetto")),
            "accent_progetto": _bp_text(meta.get("accent_progetto")),
            "ambito": _bp_text(meta.get("ambito")),
            "data": _bp_text(meta.get("data")),
        },
        "sintesi": _bp_text(sec("sintesi").get("lead")),
        "potenziale": {
            "lead": _bp_text(sec("potenziale").get("lead")),
            "cards": _bp_cards(sec("potenziale").get("cards"), 4),
        },
        "problema": _bp_text(sec("problema").get("lead")),
        "forza": [c["h"] for c in _bp_cards(sec("forza").get("punti"), 4)],
        "limiti": [c["h"] for c in _bp_cards(sec("limiti").get("punti"), 4)],
        "manca": _bp_cards(sec("manca").get("items"), 5),
        "rischio": {"lead": _bp_text(sec("rischio").get("lead"))},
        "roadmap": _bp_cards(sec("roadmap").get("steps"), 6),
    }


def recommended_path(client: dict | None, scoring: dict | None) -> str | None:
    """'partnership' | 'start' | None. Stessa fonte della sales page (`recommended_offer`
    dell'account cliente); in mancanza, l'instradamento dello scoring del questionario."""
    rec = (client or {}).get("recommended_offer")
    if rec == "partnership":
        return "partnership"
    if rec:
        return "start"
    instr = (scoring or {}).get("instradamento")
    if instr == "partnership":
        return "partnership"
    if instr in ("start", "nurture"):
        return "start"
    return None


def bonus_state(client: dict | None, now) -> dict:
    """Pura: finestra bonus 48h REALE (`bonus_expires_at`), come `_offer_payload` della sales
    page. Attiva solo se non scaduta e il cliente non ha gia' Start/Partnership."""
    from datetime import datetime, timezone

    client = client or {}
    expires = client.get("bonus_expires_at")
    already = client.get("access_level") in ("cliente_start", "partner") or client.get("partnership_attiva") is True
    attiva = False
    if expires and not already:
        try:
            exp = datetime.fromisoformat(str(expires).replace("Z", "+00:00"))
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            attiva = now < exp
        except (ValueError, TypeError):
            attiva = False
    return {"attiva": bool(attiva), "scade_at": expires if attiva else None}
