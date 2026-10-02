"""Il prezzo del corso viene dall'OFFERTA decisa (hub del partner), mai dall'AI.

Perché esiste (2/10/2026): la strategia del webinar di Daniele riportava listino 97€ e promo 67€
mentre l'offerta reale era 497€ / 297€. Il generatore diceva all'AI «se il partner non ha dato un
prezzo, proponi un range»: l'AI ne ha inventato uno e lo ha ripetuto in script e slide.

Qui si legge il prezzo scritto dal team nell'offerta (`partner_hub.offerPrice`, testo libero come
«297€ (listino 497€)»), si ricavano listino e promo, e si controlla che nel testo generato non compaia
nessun importo diverso da quelli veri. Modulo puro.
"""
import re
from typing import Any, Dict, List, Optional, Set

# 297€ · € 297 · 1.497 € · 297 euro
_AMOUNT = re.compile(
    r"(?:€\s*(\d{1,3}(?:[.,]\d{3})+|\d+)(?!\d))|(?:(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:€|euro\b))",
    re.IGNORECASE,
)


class OfferPriceMissing(ValueError):
    """Il prezzo dell'offerta non è stato compilato."""


def _to_int(raw: str) -> int:
    return int(re.sub(r"[.,]", "", raw))


def amounts_in(text: Any) -> List[int]:
    out = []
    for m in _AMOUNT.finditer(str(text or "")):
        out.append(_to_int(m.group(1) or m.group(2)))
    return out


def fmt(n: Optional[int]) -> str:
    return f"{n}€" if n else ""


def parse_offer(offer_price: Any, offer_includes: Any = "") -> Dict[str, Any]:
    """«297€ (listino 497€)» → listino 497, promo 297. Un solo importo → solo listino, nessuna promo."""
    values = sorted(set(a for a in amounts_in(offer_price) if a > 0))
    if not values:
        raise OfferPriceMissing("Manca il prezzo dell'offerta: scrivilo nel profilo del partner (per esempio «297€ (listino 497€)»).")
    listino = values[-1]
    promo = values[0] if len(values) > 1 else None
    if len(values) > 2:
        raise OfferPriceMissing("Il prezzo dell'offerta ha più di due importi: scrivi solo listino e promo.")
    return {
        "listino": listino,
        "promo": promo,
        "allowed": set(values),
        "includes": " ".join(str(offer_includes or "").split())[:600],
    }


def foreign_amounts(obj: Any, allowed: Set[int]) -> List[int]:
    """Importi in euro presenti nel testo generato che NON sono quelli dell'offerta."""
    found: List[int] = []

    def walk(x: Any) -> None:
        if isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, (list, tuple)):
            for v in x:
                walk(v)
        elif isinstance(x, str):
            found.extend(a for a in amounts_in(x) if a not in allowed)

    walk(obj)
    return found


def prompt_block(offer: Dict[str, Any]) -> str:
    """Cosa dire all'AI sul prezzo: è un dato, non una proposta."""
    rows = [f"PREZZO REALE DEL CORSO (dato dal team, NON modificarlo e NON proporne altri): listino {fmt(offer['listino'])}"]
    rows.append(f"prezzo promo del webinar {fmt(offer['promo'])}" if offer["promo"] else "nessuna promo: solo il prezzo di listino")
    text = "; ".join(rows) + ". Non scrivere nessun altro importo in euro."
    if offer.get("includes"):
        text += f"\nCosa include il corso (usa SOLO questo per parlare di cosa si riceve): {offer['includes']}"
    return text


def apply_to_prezzo(prezzo: Dict[str, Any], offer: Dict[str, Any]) -> Dict[str, Any]:
    """Sovrascrive i numeri con quelli veri, qualunque cosa abbia scritto l'AI."""
    prezzo = dict(prezzo or {})
    prezzo["listino"] = fmt(offer["listino"])
    prezzo["promo_webinar"] = fmt(offer["promo"]) if offer["promo"] else ""
    return prezzo
