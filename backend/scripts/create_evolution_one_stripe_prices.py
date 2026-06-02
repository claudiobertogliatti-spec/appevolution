"""
Crea i 10 Stripe Products + Prices per Evolution One (Test mode).

Run: cd backend && python scripts/create_evolution_one_stripe_prices.py

Legge STRIPE_API_KEY da .env.test (deve essere sk_test_*).
Stampa una mappa env_var=price_id da incollare nel .env.test del backend.

Idempotente: se un Product con lo stesso `lookup_key` esiste già, riusa il Price
esistente invece di crearne uno nuovo. Re-runnabile in sicurezza.
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
import stripe

# Carica .env.test (sk_test_*)
env_test = Path(__file__).resolve().parent.parent / ".env.test"
load_dotenv(env_test, override=True)

api_key = os.environ.get("STRIPE_API_KEY", "")
if not api_key.startswith("sk_test_"):
    print(f"ERRORE: STRIPE_API_KEY non è sk_test_* (è {api_key[:10]}...). Aborto.", file=sys.stderr)
    sys.exit(1)

stripe.api_key = api_key

# (env_var_name, product_name, lookup_key, unit_amount_eur_cents, recurring_interval | None, description)
SERVICES = [
    ("STRIPE_PRICE_GESTIONE_CAMPAGNE",   "Gestione Campagne",          "evo1-gestione-campagne",   348_00, "month", "Gestione mensile Meta + Google ads (budget partner separato)"),
    ("STRIPE_PRICE_BOOSTER_CHECKOUT",    "Booster Checkout",           "evo1-booster-checkout",    197_00, None,    "Order bump aggiunto al checkout del corso"),
    ("STRIPE_PRICE_UPSELL_POST_ACQUISTO","Upsell Post-Acquisto",       "evo1-upsell-post-acquisto",297_00, None,    "Pagina upsell one-click post-checkout"),
    ("STRIPE_PRICE_OFFERTA_DI_RECUPERO", "Offerta di Recupero",        "evo1-offerta-di-recupero", 197_00, None,    "Downsell mostrato a chi rifiuta l'upsell"),
    ("STRIPE_PRICE_LIVE_PROMO_3",        "Live Promo — 3 eventi",      "evo1-live-promo-3",        1490_00,None,    "3 webinar live promo con script, landing, sequenza email, regia"),
    ("STRIPE_PRICE_LIVE_PROMO_6",        "Live Promo — 6 eventi",      "evo1-live-promo-6",        2490_00,None,    "6 webinar live promo (-16% sul singolo)"),
    ("STRIPE_PRICE_LIVE_PROMO_12",       "Live Promo — 12 eventi",     "evo1-live-promo-12",       3990_00,None,    "12 webinar live promo (-33% sul singolo)"),
    ("STRIPE_PRICE_EBOOK_CORSO",         "Ebook del Corso",            "evo1-ebook-corso",         497_00, None,    "Versione ebook del videocorso (impaginazione + copertina)"),
    ("STRIPE_PRICE_AUDIOBOOK",           "Audiobook",                  "evo1-audiobook",           697_00, None,    "Versione audio professionale del corso"),
    ("STRIPE_PRICE_AUDIOLEZIONI",        "Audiolezioni",               "evo1-audiolezioni",        397_00, None,    "Estrazione audio episodica dalle lezioni"),
]


def find_existing_price(lookup_key: str):
    """Ritorna un Price esistente con quel lookup_key, oppure None."""
    res = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1)
    if res.data:
        return res.data[0]
    return None


def get_or_create(env_var, product_name, lookup_key, amount_cents, recurring, description):
    existing = find_existing_price(lookup_key)
    if existing:
        return existing.id, "reused"

    # Crea prodotto
    product = stripe.Product.create(
        name=product_name,
        description=description,
    )
    # Crea prezzo (con lookup_key per idempotenza futura)
    params = {
        "product": product.id,
        "unit_amount": amount_cents,
        "currency": "eur",
        "lookup_key": lookup_key,
    }
    if recurring:
        params["recurring"] = {"interval": recurring}
    price = stripe.Price.create(**params)
    return price.id, "created"


def main():
    print(f"[stripe-test-mode] account: {stripe.Account.retrieve().id}")
    print()
    print("# Aggiungi queste righe a backend/.env.test :")
    print()
    for env_var, name, lookup, amount, recurring, desc in SERVICES:
        price_id, status = get_or_create(env_var, name, lookup, amount, recurring, desc)
        marker = "✓ reused" if status == "reused" else "+ created"
        print(f"{env_var}={price_id}    # {marker}  ({name})")


if __name__ == "__main__":
    main()
