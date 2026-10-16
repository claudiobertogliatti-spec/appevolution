"""Collegamento del dominio del partner (passo «Indirizzo web» di F-13).

Il team scrive per il partner le righe DNS da aggiungere (funnel, area corsi, mittente email) con i
valori VERI forniti da Vercel e da Systeme. Il partner le copia nel pannello dove ha comprato il
dominio e Ciak controlla da solo, interrogando i DNS pubblici, che siano visibili.

Modulo con la logica pura (validazione e confronto) e un risolutore sostituibile nei test.
Non scrive sul dominio del partner: legge soltanto.
"""
import re
from typing import Any, Callable, Dict, List, Optional

TYPES = ("CNAME", "TXT", "A")
MAX_RECORDS = 8
_HOST = re.compile(r"^(?=.{1,253}$)([a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?\.)+[a-z]{2,63}$")

OK = "ok"
MISSING = "assente"
WRONG = "diverso"
ERROR = "errore"


class DomainError(ValueError):
    """Dati DNS non validi, con un messaggio comprensibile dal team."""


def _norm_host(value: str) -> str:
    return str(value or "").strip().lower().rstrip(".")


def validate_records(records: Any) -> List[Dict[str, str]]:
    if not isinstance(records, list) or not records:
        raise DomainError("Servono una o più righe DNS.")
    if len(records) > MAX_RECORDS:
        raise DomainError(f"Massimo {MAX_RECORDS} righe.")
    out: List[Dict[str, str]] = []
    seen = set()
    for r in records:
        r = r or {}
        rid = re.sub(r"[^a-z0-9_-]", "", str(r.get("id") or "").lower())[:30]
        rtype = str(r.get("type") or "").upper()
        name = _norm_host(r.get("name"))
        value = str(r.get("value") or "").strip()
        label = " ".join(str(r.get("label") or "").split())[:80]
        purpose = " ".join(str(r.get("purpose") or "").split())[:200]
        if not rid or rid in seen:
            raise DomainError("Ogni riga ha bisogno di un id unico.")
        if rtype not in TYPES:
            raise DomainError(f"Tipo non valido in «{rid}»: usa CNAME, TXT o A.")
        if not _HOST.match(name):
            raise DomainError(f"Nome non valido in «{rid}»: serve un indirizzo completo, per esempio corso.tuodominio.it.")
        if not value or len(value) > 500 or "<" in value or ">" in value:
            raise DomainError(f"Valore mancante o non valido in «{rid}».")
        if not label:
            raise DomainError(f"Manca l'etichetta in «{rid}».")
        seen.add(rid)
        out.append({"id": rid, "type": rtype, "name": name, "value": value, "label": label, "purpose": purpose})
    return out


def _clean_txt(value: str) -> str:
    # le righe TXT lunghe arrivano a pezzi tra virgolette: "abc" "def" -> abcdef
    return re.sub(r'"\s*"', "", str(value or "")).strip().strip('"')


def compare(record: Dict[str, str], answers: List[str]) -> Dict[str, Any]:
    """Confronta ciò che i DNS rispondono con ciò che ci aspettiamo."""
    if not answers:
        return {"status": MISSING, "found": ""}
    expected = record["value"]
    if record["type"] == "CNAME":
        got = [_norm_host(a) for a in answers]
        return {"status": OK if _norm_host(expected) in got else WRONG, "found": got[0]}
    if record["type"] == "A":
        got = [a.strip() for a in answers]
        return {"status": OK if expected.strip() in got else WRONG, "found": got[0]}
    got = [_clean_txt(a) for a in answers]
    exp = _clean_txt(expected)
    # SPF: il valore atteso può essere contenuto in un record più lungo; DKIM e verifiche: uguale
    hit = any(g == exp or (exp.lower().startswith("v=spf1") and exp.lower() in g.lower()) for g in got)
    return {"status": OK if hit else WRONG, "found": got[0][:120]}


def default_resolver(name: str, rtype: str) -> List[str]:
    """DNS pubblici (non la cache della macchina): così vediamo ciò che vede il mondo."""
    import dns.exception
    import dns.resolver

    res = dns.resolver.Resolver(configure=False)
    res.nameservers = ["8.8.8.8", "1.1.1.1"]
    res.lifetime = 4.0
    try:
        return [r.to_text() for r in res.resolve(name, rtype)]
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers):
        return []


def check_records(records: List[Dict[str, str]],
                  resolver: Optional[Callable[[str, str], List[str]]] = None) -> List[Dict[str, Any]]:
    resolver = resolver or default_resolver
    results = []
    for r in records:
        try:
            outcome = compare(r, resolver(r["name"], r["type"]))
        except Exception:  # noqa: BLE001  una riga che non risponde non blocca le altre
            outcome = {"status": ERROR, "found": ""}
        results.append({**r, **outcome})
    return results
