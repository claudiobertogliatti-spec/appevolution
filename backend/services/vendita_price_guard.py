"""Generatori Gaia della pagina di vendita: nessun importo che non sia dell'offerta.

Perché esiste (5/10/2026): la descrizione dell'offerta di Daniele diceva «una singola sessione con un
operatore del corpo costa facilmente 80€». Il prompt non conteneva il prezzo vero né il divieto di
inventare cifre, a differenza di webinar e deck (`offer_price.prompt_block` + `foreign_amounts`).
Qui: si dice all'AI il prezzo vero, si controlla il testo, si riprova una volta, poi si rifiuta.
Modulo puro: il router passa la funzione di generazione.
"""
from typing import Any, Awaitable, Callable, Dict, List

from services import offer_price


class PriceGuardError(RuntimeError):
    """Il testo generato contiene importi che non sono dell'offerta, anche dopo il secondo tentativo."""

    def __init__(self, amounts: List[int]):
        self.amounts = amounts
        super().__init__("Importi non dell'offerta nel testo generato: " + ", ".join(f"{a}€" for a in amounts))


def system_with_price(system: str, offer: Dict[str, Any]) -> str:
    return f"{system}\n\n{offer_price.prompt_block(offer)}{offer_price.saving_note(offer)}"


async def generate_checked(
    llm_generate: Callable[[str, str], Awaitable[str]],
    system: str,
    user_text: str,
    offer: Dict[str, Any],
) -> str:
    body = await llm_generate(system_with_price(system, offer), user_text)
    foreign = sorted(set(offer_price.foreign_in_text(body, offer)))
    if not foreign:
        return body
    elenco = ", ".join(f"{a}€" for a in foreign)
    retry = (
        f"{user_text}\n\nATTENZIONE: nel testo precedente c'erano importi non ammessi ({elenco}). "
        "Riscrivi senza nessun importo diverso da quelli indicati nel prezzo reale."
    )
    body = await llm_generate(system_with_price(system, offer), retry)
    foreign = sorted(set(offer_price.foreign_in_text(body, offer)))
    if foreign:
        raise PriceGuardError(foreign)
    return body
