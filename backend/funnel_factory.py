"""
funnel_factory.py — Render del funnel OWNED (file statici) dai contenuti partner.

Sostituisce la vecchia browser-automation di Systeme: il funnel diventa CODICE
OWNED deployabile su Vercel (dominio del partner). Systeme resta backend CRM.

Questo modulo è il primo pezzo del motore (RENDER). Riusa i template già
esistenti in routers/funnel_builder.py — non reinventa il markup.

Pipeline completa (vedi docs/superpowers/specs/2026-07-16-funnel-factory-engine-design.md):
  genera → RENDER (questo) → deploy Vercel → connettore Systeme.
"""
from __future__ import annotations

from typing import Any

from routers.funnel_builder import (
    genera_landing_page,
    genera_documenti_legali,
    LandingPageParams,
    DocumentiLegaliParams,
)

# Link legali owned: pagine servite dallo stesso deploy statico.
OWNED_LEGAL_LINKS = {"LINK_PRIVACY": "/privacy.html", "LINK_TERMINI": "/termini.html"}


def build_funnel_files(dati: dict[str, Any] | None, legal: dict[str, Any] | None = None) -> dict[str, str]:
    """
    Assembla i file statici del funnel owned dai parametri già pronti.

    dati  = campi landing (schema LandingPageParams: copy + brand).
    legal = dati legali (schema DocumentiLegaliParams).

    Ritorna { filename → html }. PURA funzione: nessun accesso rete/DB, testabile
    in isolamento. I link legali sono forzati ai file owned del deploy.
    """
    params = LandingPageParams().model_dump()
    params.update({k: v for k, v in (dati or {}).items() if v is not None})
    params.update(OWNED_LEGAL_LINKS)

    legal_params = DocumentiLegaliParams().model_dump()
    legal_params.update({k: v for k, v in (legal or {}).items() if v is not None})

    docs = genera_documenti_legali(legal_params)
    return {
        "index.html": genera_landing_page(params),
        "privacy.html": docs["privacy_policy"],
        "cookie.html": docs["cookie_policy"],
        "termini.html": docs["condizioni_vendita"],
    }


async def build_funnel_for_partner(db, partner_id: str) -> dict[str, str]:
    """
    Carica i dati del partner e produce i file del funnel owned.
    Fonte contenuti: landing_page.dati (dal generatore copy AI di funnel_builder).
    Fonte brand: BrandKit. Fonte legale: record partner.
    """
    if db is None:
        raise RuntimeError("database non configurato")
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise ValueError(f"partner {partner_id} non trovato")

    # Prefill dal profilo (il copy AI, se presente, sovrascrive).
    dati: dict[str, Any] = {
        "PARTNER_NOME": partner.get("name", ""),
        "PARTNER_NICCHIA": partner.get("niche") or partner.get("nicchia") or "",
        "PARTNER_BIO": partner.get("bio", ""),
        "PARTNER_FOTO_URL": partner.get("photo_url") or partner.get("avatar") or "",
    }
    dati.update((partner.get("landing_page") or {}).get("dati") or {})

    # Brand overlay dal BrandKit (senza sovrascrivere il copy già presente).
    brand = await db.brand_kits.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    if brand.get("colore_brand"):
        dati.setdefault("COLORE_ACCENT", brand["colore_brand"])
    if brand.get("logo_url") and not dati.get("PARTNER_FOTO_URL"):
        dati["PARTNER_FOTO_URL"] = brand["logo_url"]

    legal = {
        "titolare_nome": partner.get("name", ""),
        "email_legale": partner.get("email", "") or brand.get("email_partner", ""),
        "nome_sito": partner.get("name", ""),
    }
    return build_funnel_for_partner_files(dati, legal)


# Alias esplicito per chiarezza nei call-site.
build_funnel_for_partner_files = build_funnel_files
