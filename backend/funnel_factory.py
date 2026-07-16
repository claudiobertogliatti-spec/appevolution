"""
funnel_factory.py — Render del funnel OWNED (file statici) dai contenuti partner.

Sostituisce la vecchia browser-automation di Systeme: il funnel diventa CODICE
OWNED deployabile su Vercel (dominio del partner). Systeme resta backend CRM.

Pagine prodotte (funnel a 3 momenti + legali):
  - index.html    → landing OPT-IN professionale (funnel_templates_pro), brand-parametrica
  - vendita.html  → pagina vendita videocorso (template funnel_builder, da elevare a pro)
  - privacy/cookie/termini.html → legali GDPR

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
from funnel_templates_pro import render_optin

# Link legali owned: pagine servite dallo stesso deploy statico.
OWNED_LEGAL_LINKS = {"LINK_PRIVACY": "/privacy.html", "LINK_TERMINI": "/termini.html"}


def build_funnel_files(
    optin: dict[str, Any] | None = None,
    sales: dict[str, Any] | None = None,
    legal: dict[str, Any] | None = None,
    colore_brand: str | None = None,
) -> dict[str, str]:
    """
    Assembla i file statici del funnel owned. PURA funzione (nessun accesso rete/DB).

    optin        = override copy della landing opt-in (schema funnel_templates_pro).
    sales        = campi pagina vendita videocorso (schema LandingPageParams); se None, si omette.
    legal        = dati legali (schema DocumentiLegaliParams).
    colore_brand = colore accento dal BrandKit del partner (hex).
    """
    files: dict[str, str] = {
        "index.html": render_optin(optin, colore_brand=colore_brand),
    }

    legal_params = DocumentiLegaliParams().model_dump()
    legal_params.update({k: v for k, v in (legal or {}).items() if v is not None})
    docs = genera_documenti_legali(legal_params)
    files["privacy.html"] = docs["privacy_policy"]
    files["cookie.html"] = docs["cookie_policy"]
    files["termini.html"] = docs["condizioni_vendita"]

    if sales is not None:
        sp = LandingPageParams().model_dump()
        sp.update({k: v for k, v in sales.items() if v is not None})
        sp.update(OWNED_LEGAL_LINKS)
        files["vendita.html"] = genera_landing_page(sp)

    return files


async def build_funnel_for_partner(db, partner_id: str) -> dict[str, str]:
    """
    Carica i dati del partner e produce i file del funnel owned.
    Brand dal BrandKit; copy dal profilo partner + landing_page.dati (generatore AI).
    """
    if db is None:
        raise RuntimeError("database non configurato")
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise ValueError(f"partner {partner_id} non trovato")

    nome = partner.get("name", "")
    brand = await db.brand_kits.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    colore_brand = brand.get("colore_brand")

    # ── Landing opt-in: override dal profilo (il generatore AI arricchirà) ──
    optin: dict[str, Any] = {
        "META_TITLE": f"Masterclass gratuita — {nome}" if nome else None,
        "PARTNER_NOME": nome,
        "AUTHOR_BIO": partner.get("bio") or None,
    }
    foto = partner.get("photo_url") or partner.get("avatar") or brand.get("logo_url")
    if foto:
        optin["PHOTO_STYLE"] = f"background-image:url('{foto}')"
        optin["PHOTO_FALLBACK"] = ""

    # ── Pagina vendita videocorso: dal copy AI già generato, se presente ──
    sales = (partner.get("landing_page") or {}).get("dati") or None
    if sales is not None:
        sales = dict(sales)
        sales.setdefault("PARTNER_NOME", nome)
        sales.setdefault("PARTNER_NICCHIA", partner.get("niche") or partner.get("nicchia") or "")
        if colore_brand:
            sales.setdefault("COLORE_ACCENT", colore_brand)

    legal = {
        "titolare_nome": nome,
        "email_legale": partner.get("email", "") or brand.get("email_partner", ""),
        "nome_sito": nome,
    }
    return build_funnel_files(optin=optin, sales=sales, legal=legal, colore_brand=colore_brand)
