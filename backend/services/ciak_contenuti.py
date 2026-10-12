"""
Andrea (Contenuti): bozze di testo per post, email e SEO. Solo bozze.

Andrea scrive, tu leggi e usi. Non pubblica, non invia, non salva: la pubblicazione dei caroselli
resta nel workspace Editoriale esistente. Il testo usa solo il brief e la Memoria Ciak: niente
risultati, numeri, testimonianze o promesse inventati.

Per la SEO i limiti sono contati qui (non si fidano della dichiarazione del modello):
titolo <= 60 caratteri, meta description <= 155.

Funzioni pure: `valida_richiesta`, `prompt`, `parse_seo`.
"""
from __future__ import annotations

import json
import re
from typing import Optional

BRIEF_MIN, BRIEF_MAX = 10, 1500
SEO_TITLE_MAX, SEO_META_MAX = 60, 155
MODELLO = "claude-sonnet-4-6"

TIPI = {
    "post_linkedin": ("Post LinkedIn", "un post LinkedIn: apertura forte in una riga, 3-6 frasi brevi, chiusura con un invito a rispondere o commentare. Massimo 180 parole. Niente hashtag in eccesso (massimo 3)."),
    "post_instagram": ("Post Instagram", "una didascalia Instagram: prima riga che ferma lo scroll, corpo breve, invito finale. Massimo 120 parole, massimo 5 hashtag."),
    "email": ("Email", "una email: oggetto (max 60 caratteri) su una riga che comincia con 'Oggetto:', riga vuota, poi corpo di massimo 150 parole con un solo invito all'azione."),
    "seo_pagina": ("SEO di una pagina", "i metadati SEO di una pagina. Rispondi SOLO con un oggetto JSON: {\"title\": \"...\", \"meta\": \"...\", \"h1\": \"...\", \"parole_chiave\": [\"...\", \"...\"]}. Il title deve stare in 60 caratteri, la meta description in 155, massimo 5 parole chiave."),
}


def valida_richiesta(tipo, brief) -> tuple[str, str]:
    if tipo not in TIPI:
        raise ValueError("Tipo di contenuto non valido.")
    if not isinstance(brief, str):
        raise ValueError("Scrivi il brief.")
    brief = brief.strip()
    if not (BRIEF_MIN <= len(brief) <= BRIEF_MAX):
        raise ValueError(f"Il brief deve avere tra {BRIEF_MIN} e {BRIEF_MAX} caratteri.")
    return tipo, brief


def prompt(tipo: str, brief: str, memoria: str = "") -> tuple[str, str]:
    nome, istruzione = TIPI[tipo]
    system = (
        "Sei ANDREA, il responsabile Contenuti AI di Ciak. Scrivi per Claudio Bertogliatti.\n\n"
        f"COMPITO: scrivi {istruzione}\n\n"
        "REGOLE (non derogabili):\n"
        "- Usa SOLO il brief e le regole della Memoria Ciak. Non inventare risultati, cifre, "
        "testimonianze, nomi di clienti, premi, prezzi o scadenze.\n"
        "- Se il brief non basta per una cosa, scrivi senza quella cosa: non riempire con inventato.\n"
        "- Italiano, dai del tu, concreto, nessuna promessa di guadagno garantito.\n"
        "- Rispondi solo con il testo richiesto, senza commenti prima o dopo.\n"
    )
    if memoria:
        system += "\n" + memoria
    return system, f"TIPO: {nome}\nBRIEF:\n{brief}"


def parse_seo(raw: str) -> Optional[dict]:
    """{title, meta, h1, parole_chiave, title_len, meta_len, title_ok, meta_ok} oppure None.
    Le lunghezze sono contate qui."""
    if not raw:
        return None
    testo = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip())
    m = re.search(r"\{.*\}", testo, flags=re.DOTALL)
    if not m:
        return None
    try:
        d = json.loads(m.group(0))
    except ValueError:
        return None
    title, meta, h1 = d.get("title"), d.get("meta"), d.get("h1")
    if not all(isinstance(x, str) and x.strip() for x in (title, meta, h1)):
        return None
    chiavi = [k.strip() for k in (d.get("parole_chiave") or []) if isinstance(k, str) and k.strip()][:5]
    title, meta, h1 = title.strip(), meta.strip(), h1.strip()
    return {
        "title": title, "meta": meta, "h1": h1, "parole_chiave": chiavi,
        "title_len": len(title), "meta_len": len(meta),
        "title_ok": len(title) <= SEO_TITLE_MAX, "meta_ok": len(meta) <= SEO_META_MAX,
    }
