"""
Recupero 1 a 1 (Carlo, Acquisizione): chi si e' fermato nel funnel gratuito e vale un'email.

Due soli motivi, entrambi dedotti da stati VERI della diagnostic_session (state_history):
  - questionario_fermo: ha iniziato il questionario e non l'ha completato;
  - report_senza_call: ha ricevuto il report e non ha fissato la call.
Si propone chi e' fermo da SOGLIA_GIORNI a FINESTRA_GIORNI (oltre e' freddo: non si insegue).

Mai invio di massa: ogni email passa dalla bozza di Carlo e dall'approvazione di una persona
(stesso flusso e stesso registro del sollecito). La lista fredda resta congelata (reputazione).

Funzioni pure: `candidati`, `fatti`, `prompt_bozza`.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from services.ciak_state_machine import (
    STATE_CIAK_STARTED, STATE_REPORT_GENERATED, normalize_state,
)

SOGLIA_GIORNI = 5
FINESTRA_GIORNI = 60

MOTIVI = {
    "report_senza_call": "Ha il report ma non ha fissato la call",
    "questionario_fermo": "Ha iniziato il questionario e non l'ha finito",
}
_ORDINE = {"report_senza_call": 0, "questionario_fermo": 1}
STATI_DA_LEGGERE = [STATE_CIAK_STARTED, STATE_REPORT_GENERATED, "clicked_67", "purchased_67"]


def _parse(v: Any) -> Optional[datetime]:
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if not v:
        return None
    try:
        dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _data_stato(sessione: dict, stato: str) -> Optional[datetime]:
    """Ultima volta che la sessione e' entrata in `stato` (anche con nomi storici)."""
    trovata = None
    for h in sessione.get("state_history") or []:
        if normalize_state(h.get("state")) == stato:
            t = _parse(h.get("timestamp"))
            if t is not None and (trovata is None or t > trovata):
                trovata = t
    return trovata


def candidati(sessioni: list[dict], escluse: set[str], now: Optional[datetime] = None) -> list[dict]:
    """Persone da recuperare, report-senza-call per primi, poi dai fermi da meno tempo.
    `escluse` = email (minuscole) da non toccare: gia' proposta/cliente/partner, disiscritte,
    gia' contattate da poco."""
    now = now or datetime.now(timezone.utc)
    ultima: dict[str, dict] = {}
    for s in sessioni:
        email = (s.get("user_email") or "").strip().lower()
        if not email:
            continue
        prec = ultima.get(email)
        if prec is None or (_parse(s.get("created_at")) or now) > (_parse(prec.get("created_at")) or now):
            ultima[email] = s

    out = []
    for email, s in ultima.items():
        if email in escluse or "+ciaktest" in email:
            continue
        stato = normalize_state(s.get("current_state"))
        if stato == STATE_REPORT_GENERATED:
            motivo = "report_senza_call"
        elif stato == STATE_CIAK_STARTED:
            motivo = "questionario_fermo"
        else:
            continue
        da = _data_stato(s, stato) or _parse(s.get("created_at"))
        if da is None:
            continue  # senza una data vera non si sa da quanto e' fermo: non si propone
        giorni = max(0, (now - da).days)
        if not (SOGLIA_GIORNI <= giorni <= FINESTRA_GIORNI):
            continue
        out.append({
            "email": email, "nome": (s.get("user_name") or "").strip(), "motivo": motivo,
            "motivo_label": MOTIVI[motivo], "giorni": giorni, "da": da.isoformat(),
        })
    out.sort(key=lambda c: (_ORDINE[c["motivo"]], c["giorni"]))
    return out


def fatti(c: dict) -> list[str]:
    if c["motivo"] == "report_senza_call":
        return [f"Ha compilato il questionario e ricevuto il report {c['giorni']} giorni fa.",
                "Non risulta una call fissata."]
    return [f"Ha iniziato il questionario {c['giorni']} giorni fa.",
            "Non risulta che l'abbia completato."]


def prompt_bozza(c: dict, memoria: str = "") -> tuple[str, str]:
    system = (
        "Sei CARLO, il responsabile Acquisizione AI di Ciak. Scrivi, a nome di Claudio Bertogliatti, "
        "una breve email a una persona che si e' fermata nel percorso gratuito.\n\n"
        "REGOLE (non derogabili):\n"
        "- Usa SOLO i fatti che ti do. Non inventare offerte, prezzi, sconti, scadenze, bonus, "
        "promesse, contenuti del report o risultati.\n"
        "- Non dire che la persona ha letto o aperto il report: non lo sappiamo.\n"
        "- Italiano, dai del tu, tono caldo e diretto, mai pressante, mai in colpa.\n"
        "- Massimo 80 parole. Un solo passo: rispondere a questa email.\n"
        "- Niente link, niente allegati, niente emoji.\n"
        "- Firma: Claudio.\n"
        "- Rispondi SOLO con un oggetto JSON: {\"subject\": \"...\", \"body\": \"...\"}. "
        "Nel body i paragrafi sono separati da una riga vuota.\n"
    )
    if memoria:
        system += "\n" + memoria
    user = f"Persona: {c.get('nome') or 'la persona'}\nFatti:\n" + "\n".join(f"- {r}" for r in fatti(c))
    return system, user


def bozza_base(c: dict) -> dict:
    primo = (c.get("nome") or "").split(" ")[0]
    saluto = f"Ciao {primo}," if primo else "Ciao,"
    if c["motivo"] == "report_senza_call":
        corpo = ("ti scrivo per sapere se hai avuto modo di guardare il tuo report. "
                 "Se hai domande o vuoi parlarne, rispondi pure a questa email.")
        oggetto = "Hai avuto modo di guardare il tuo report?"
    else:
        corpo = ("ho visto che avevi iniziato il questionario e non sei arrivato in fondo. "
                 "Se hai avuto un dubbio o un problema, rispondi pure a questa email.")
        oggetto = "Ti sei fermato a metà: posso aiutarti?"
    return {"subject": oggetto, "body": f"{saluto}\n\n{corpo}\n\nClaudio"}
