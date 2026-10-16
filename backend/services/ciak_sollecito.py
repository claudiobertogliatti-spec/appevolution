"""
Sollecito delle trattative: bozza pronta, approvazione di una persona, registro.

Marco (agente Vendite) prepara una bozza per una trattativa ferma. NON parte mai da sola:
la legge Claudio, la modifica se vuole, e solo il suo «Invia» manda l'email. Ogni invio finisce
nel registro `ciak_solleciti` (chi, quando, cosa, esito).

Canale: lo stesso SMTP delle email 1:1 (`services.lead_outreach.send_lead_email`; in produzione
e' il relay Brevo con mittente SMTP_FROM). Non tocca lo stato del lead e non emette eventi
Systeme: un sollecito non deve far ripartire la sequenza di benvenuto.

⛔ Regola d'oro del repo: la bozza usa SOLO i fatti che ha (stato e date della proposta). Non
inventa prezzi, sconti, scadenze, promesse. Se l'AI non risponde, si offre una bozza base senza
AI, dichiarata come tale.

Funzioni pure (testabili senza rete): `giorni_da`, `build_contesto`, `testo_in_html`,
`bozza_base`, `parse_bozza`, `prompt_bozza`, `ultimi_per_email`.
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from html import escape
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Un secondo sollecito alla stessa persona entro queste ore e' quasi sempre un doppio clic.
BLOCCO_DUPLICATO_ORE = 24
OGGETTO_MIN, OGGETTO_MAX = 3, 200
CORPO_MIN, CORPO_MAX = 20, 5000
MODELLO = "claude-sonnet-4-6"

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def email_valida(email: str) -> bool:
    return bool(_EMAIL.match((email or "").strip()))


def _parse_iso(iso: Any) -> Optional[datetime]:
    if not iso:
        return None
    try:
        dt = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def giorni_da(iso: Any, now: Optional[datetime] = None) -> Optional[int]:
    """Giorni interi da una data ISO; None se manca o non si legge."""
    dt = _parse_iso(iso)
    if dt is None:
        return None
    now = now or datetime.now(timezone.utc)
    return max(0, (now - dt).days)


def build_contesto(email: str, proposta: Optional[dict], sessione: Optional[dict],
                   now: Optional[datetime] = None) -> Optional[dict]:
    """I fatti che si conoscono sulla trattativa. None se non c'e' ne' proposta ne' sessione
    (non si sollecita chi non conosciamo)."""
    if not proposta and not sessione:
        return None
    proposta = proposta or {}
    sessione = sessione or {}
    nome = (proposta.get("prospect_nome") or sessione.get("user_name") or "").strip()
    return {
        "email": email,
        "nome": nome,
        "proposta": {
            "stato": proposta.get("stato"),
            "inviata_giorni_fa": giorni_da(proposta.get("creato_at"), now),
            "vista_giorni_fa": giorni_da(proposta.get("visto_at"), now),
            "accettata_giorni_fa": giorni_da(proposta.get("accettato_at"), now),
            "scadenza": proposta.get("scadenza"),
        } if proposta else None,
    }


def _fatti(ctx: dict) -> list[str]:
    p = ctx.get("proposta")
    if not p:
        return ["Non risulta una proposta inviata: c'e' solo il percorso con la call."]
    righe = []
    stato = p.get("stato")
    if p.get("inviata_giorni_fa") is not None:
        righe.append(f"La proposta e' stata inviata {p['inviata_giorni_fa']} giorni fa.")
    if p.get("vista_giorni_fa") is not None:
        righe.append(f"La persona ha aperto la proposta {p['vista_giorni_fa']} giorni fa.")
    elif stato == "inviata":
        righe.append("Non risulta che la persona abbia aperto la proposta.")
    if p.get("accettata_giorni_fa") is not None:
        righe.append(f"La proposta e' stata accettata {p['accettata_giorni_fa']} giorni fa: manca il passo dopo.")
    return righe or ["Stato della proposta: " + str(stato or "sconosciuto") + "."]


def prompt_bozza(ctx: dict, memoria: str = "") -> tuple[str, str]:
    """(system, user) per la bozza. Solo fatti dati; output JSON."""
    nome = ctx.get("nome") or "la persona"
    system = (
        "Sei MARCO, il responsabile Vendite AI di Ciak. Scrivi, a nome di Claudio Bertogliatti, "
        "un breve sollecito a una persona con cui e' in trattativa.\n\n"
        "REGOLE (non derogabili):\n"
        "- Usa SOLO i fatti che ti do. Non inventare offerte, prezzi, sconti, scadenze, bonus, "
        "promesse o dettagli della proposta.\n"
        "- Non dire che la persona ha visto o letto la proposta se i fatti non lo dicono.\n"
        "- Italiano, dai del tu, tono caldo e diretto, mai pressante, mai in colpa.\n"
        "- Massimo 90 parole. Un solo passo successivo: rispondere a questa email.\n"
        "- Niente link, niente allegati, niente emoji.\n"
        "- Firma: Claudio.\n"
        "- Rispondi SOLO con un oggetto JSON: {\"subject\": \"...\", \"body\": \"...\"}. "
        "Nel body i paragrafi sono separati da una riga vuota.\n"
    )
    if memoria:
        system += "\n" + memoria
    user = f"Persona: {nome}\nFatti:\n" + "\n".join(f"- {r}" for r in _fatti(ctx))
    return system, user


def parse_bozza(raw: str) -> Optional[dict]:
    """Estrae {subject, body} dalla risposta del modello; None se non e' valida."""
    if not raw:
        return None
    testo = raw.strip()
    testo = re.sub(r"^```(?:json)?\s*|\s*```$", "", testo)
    m = re.search(r"\{.*\}", testo, flags=re.DOTALL)
    if not m:
        return None
    try:
        d = json.loads(m.group(0))
    except ValueError:
        return None
    subject, body = d.get("subject"), d.get("body")
    if not isinstance(subject, str) or not isinstance(body, str):
        return None
    subject, body = subject.strip(), body.strip()
    if not (OGGETTO_MIN <= len(subject) <= OGGETTO_MAX and CORPO_MIN <= len(body) <= CORPO_MAX):
        return None
    return {"subject": subject, "body": body}


def bozza_base(ctx: dict) -> dict:
    """Bozza senza AI: solo il nome, nessun fatto della proposta."""
    primo = (ctx.get("nome") or "").split(" ")[0]
    saluto = f"Ciao {primo}," if primo else "Ciao,"
    return {
        "subject": "Ci sei? Due righe sulla nostra proposta",
        "body": (
            f"{saluto}\n\n"
            "ti scrivo per sapere a che punto sei con la proposta di cui abbiamo parlato. "
            "Se hai dubbi o domande, rispondi pure a questa email e ne parliamo.\n\n"
            "Claudio"
        ),
    }


def testo_in_html(body: str) -> str:
    """Testo semplice → HTML: paragrafi dalle righe vuote, a capo dalle righe singole. Tutto
    quello che scrive la persona viene escapato."""
    blocchi = [b.strip() for b in re.split(r"\n\s*\n", body.strip()) if b.strip()]
    return "".join(
        f"<p>{escape(b).replace(chr(10), '<br>')}</p>" for b in blocchi
    )


def ultimi_per_email(righe: list[dict], giorni: int, now: Optional[datetime] = None) -> list[dict]:
    """L'ultimo sollecito riuscito per ogni email, tra quelli degli ultimi `giorni`."""
    now = now or datetime.now(timezone.utc)
    limite = now - timedelta(days=giorni)
    per_email: dict[str, dict] = {}
    for r in sorted(righe, key=lambda x: x.get("sent_at") or "", reverse=True):
        if not r.get("ok"):
            continue
        dt = _parse_iso(r.get("sent_at"))
        if dt is None or dt < limite:
            continue
        chiave = (r.get("email") or "").strip().lower()
        if chiave and chiave not in per_email:
            per_email[chiave] = {"email": chiave, "sent_at": r["sent_at"], "subject": r.get("subject")}
    return list(per_email.values())


def riga_registro(*, email: str, nome: str, subject: str, body: str, by: str,
                  ok: bool, error: Optional[str], now: Optional[datetime] = None) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "email": (email or "").strip().lower(),
        "nome": nome,
        "subject": subject,
        "body": body,
        "sent_by": by,
        "sent_at": (now or datetime.now(timezone.utc)).isoformat(),
        "via": "smtp_brevo",
        "ok": ok,
        "error": error,
    }


def duplicato_recente(righe: list[dict], email: str, now: Optional[datetime] = None) -> Optional[dict]:
    """L'ultimo sollecito riuscito alla stessa email entro BLOCCO_DUPLICATO_ORE, se c'e'."""
    now = now or datetime.now(timezone.utc)
    limite = now - timedelta(hours=BLOCCO_DUPLICATO_ORE)
    chiave = (email or "").strip().lower()
    candidati = [
        r for r in righe
        if r.get("ok") and (r.get("email") or "").strip().lower() == chiave
        and (_parse_iso(r.get("sent_at")) or datetime.min.replace(tzinfo=timezone.utc)) >= limite
    ]
    return max(candidati, key=lambda r: r["sent_at"]) if candidati else None
