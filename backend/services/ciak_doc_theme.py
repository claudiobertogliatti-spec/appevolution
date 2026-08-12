"""Tema condiviso dei documenti PDF che Ciak consegna al partner.

Nasce il 12/8/2026: i renderer di storia, brand kit e posizionamento avevano
ognuno il proprio CSS copiato-incollato, e divergevano su cose che il partner
vede — font non caricato, marchio scritto come testo, testo giallo su bianco.

⛔ BRAND LOCK INTERNO (Evolution/Ciak) — `docs/brand/ciak-brand-kit.md` v1.0:
   Poppins · #0F172A inchiostro · #64748B secondario · #E5E7EB superfici · #FACC15 accento.

⚠️ Due regole che vengono da errori gia' pagati:
   1. il logo si INCORPORA dall'asset raster, non si ridisegna e non si scrive
      come testo — gli asset sono gia' trasparenti;
   2. `#FACC15` non si usa mai per il testo (giallo su bianco non passa il
      contrasto): serve per fondi, filetti e accenti.
"""
from __future__ import annotations

import base64
import html as _html
import os
from functools import lru_cache
from typing import Any

_ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
_CIAK_LOGO = os.path.join(_ASSETS, "ciak-logo.webp")
_EVO_LOGO = os.path.join(_ASSETS, "logo_evolutionpro.png")


def esc(s: Any) -> str:
    return _html.escape(str(s or ""))


@lru_cache(maxsize=4)
def _img(path: str, mime: str, css_class: str, alt: str) -> str:
    """Asset reale come data URI: Playwright riceve l'HTML con `set_content` e
    non risolverebbe un percorso relativo."""
    try:
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        return f'<img class="{css_class}" src="data:{mime};base64,{b64}" alt="{esc(alt)}">'
    except OSError:
        return ""


def logo_ciak() -> str:
    return _img(_CIAK_LOGO, "image/webp", "doc-logo", "Ciak Si Cambia")


def logo_evo() -> str:
    return _img(_EVO_LOGO, "image/png", "doc-logo-evo", "Evolution PRO")


# ── Foglio di stile comune ────────────────────────────────────────────────────
DOC_CSS = """
/* Space Mono serve ai codici (HEX, script "copia e incolla"): in monospace le
   sequenze di caratteri si rileggono e si trascrivono senza errori. */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
:root{
  --ink:#0F172A; --muted:#64748B; --line:#E5E7EB; --yellow:#FACC15; --surface:#F8FAFC;
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
@page{ size:A4; }
body{
  font-family:'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color:var(--ink); background:#fff; font-size:11pt; line-height:1.7;
}

/* ── Copertina chiara (il logo Ciak e' navy: su scuro sparirebbe) ─────────── */
/* Il respiro in alto lo dà il margine di pagina (vale su TUTTE le pagine): col
   padding qui, le pagine successive alla prima partivano incollate al bordo. */
.doc-cover{ padding:8mm 18mm 9mm; border-bottom:4px solid var(--yellow); }
.doc-brandrow{ display:flex; align-items:center; justify-content:space-between; gap:8mm; margin-bottom:13mm; }
.doc-logo{ height:16mm; width:auto; display:block; }
.doc-kicker{ font-size:8.5pt; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); text-align:right; }
.doc-title{ font-size:26pt; font-weight:700; line-height:1.1; letter-spacing:-.02em; }
.doc-sub{ font-size:11.5pt; color:var(--muted); margin-top:4mm; max-width:145mm; }
.doc-meta{ margin-top:10mm; padding-top:6mm; border-top:1px solid var(--line); font-size:10pt; color:var(--muted); }
.doc-meta strong{ color:var(--ink); font-weight:600; }

/* ── Corpo ────────────────────────────────────────────────────────────────── */
.doc-body{ padding:14mm 18mm 8mm; }
.doc-group{ margin-bottom:11mm; page-break-inside:avoid; }
.doc-group-head{ border-bottom:1px solid var(--line); padding-bottom:3mm; margin-bottom:5mm; }
.doc-group-head h2{ font-size:15pt; font-weight:600; line-height:1.25; }
.doc-group-head .sub{ font-size:10pt; color:var(--muted); font-weight:400; margin-top:1mm; }
/* Il numero di gruppo su pastiglia gialla: il giallo fa da fondo, mai da testo. */
.doc-num{
  display:inline-flex; align-items:center; justify-content:center;
  width:7mm; height:7mm; border-radius:2mm; background:var(--yellow); color:var(--ink);
  font-size:9.5pt; font-weight:700; margin-right:3mm; vertical-align:middle;
}

/* Cornice editoriale: testo NOSTRO che spiega a cosa serve il blocco e dove
   finisce nel lavoro reale. Su fondo tenue e in corpo minore, così non si
   confonde col contenuto del partner. */
.doc-guida{ background:var(--surface); border-left:3px solid var(--line); border-radius:0 2mm 2mm 0;
            padding:4mm 5mm; margin-bottom:5mm; font-size:10pt; color:var(--muted); line-height:1.6; }
.doc-guida b{ color:var(--ink); font-weight:600; }
.doc-guida p{ margin-bottom:2.5mm; }
.doc-guida p:last-child{ margin-bottom:0; }
/* L'errore da evitare si stacca: è la voce che si legge anche saltando il resto. */
.doc-guida p.errore{ border-top:1px solid var(--line); padding-top:3mm; margin-top:3mm; }
.doc-guida p.errore b{ color:#854D0E; }

/* Coppia etichetta/risposta: l'etichetta guida, la risposta si legge. */
.doc-qa{ margin-bottom:5mm; page-break-inside:avoid; }
.doc-qa .lab{ font-size:8.5pt; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.doc-qa .ans{ font-size:11pt; color:var(--ink); margin-top:1mm; max-width:165mm; white-space:pre-wrap; }
.doc-empty{ color:var(--muted); font-style:italic; font-size:10.5pt; }

/* ── Riquadro in evidenza ─────────────────────────────────────────────────── */
.doc-callout{ border:1px solid var(--line); border-left:4px solid var(--yellow); border-radius:3mm; overflow:hidden; margin-bottom:9mm; page-break-inside:avoid; }
.doc-callout .h{ background:var(--surface); padding:3mm 5mm; font-size:8.5pt; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--line); }
.doc-callout .b{ padding:5mm; }
.doc-callout .b p{ margin-bottom:2.5mm; }

/* ── Piede del documento ──────────────────────────────────────────────────── */
.doc-foot{ margin:0 18mm; padding:5mm 0; border-top:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; gap:6mm; font-size:8.5pt; color:var(--muted); }
.doc-powered{ display:flex; align-items:center; gap:2.5mm; }
.doc-powered span{ font-size:7.5pt; letter-spacing:.1em; text-transform:uppercase; }
.doc-logo-evo{ height:5mm; width:auto; display:block; }
"""


def cover(kicker: str, titolo: str, sottotitolo: str = "", meta: str = "") -> str:
    """Copertina standard: logo reale a sinistra, occhiello a destra, riga gialla."""
    return f"""<header class="doc-cover">
  <div class="doc-brandrow">{logo_ciak()}<div class="doc-kicker">{esc(kicker)}</div></div>
  <h1 class="doc-title">{esc(titolo)}</h1>
  {f'<p class="doc-sub">{esc(sottotitolo)}</p>' if sottotitolo else ''}
  {f'<div class="doc-meta">{meta}</div>' if meta else ''}
</header>"""


def foot(destinatario: str = "") -> str:
    return f"""<div class="doc-foot">
  <div>&copy; 2026 Ciak Si Cambia &middot; ciak.io{f' &mdash; documento riservato a {esc(destinatario)}' if destinatario else ''}</div>
  <div class="doc-powered"><span>Powered by</span>{logo_evo()}</div>
</div>"""


_FOOTER_TPL = """
<div style="width:100%; font-size:7pt; color:#64748B; font-family:'Poppins',sans-serif;
            padding:0 18mm; display:flex; justify-content:space-between; align-items:center;">
  <span>{etichetta}</span>
  <span>pag. <span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>
"""


async def render_pdf(html_str: str, etichetta: str = "Ciak") -> bytes:
    """HTML -> PDF A4 con numerazione di pagina.

    ⚠️ Il margine inferiore NON puo' essere zero: Chromium disegna li' il footer.
    Con `@page{margin:0}` nel CSS il contenuto ci finiva sopra.
    """
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            page = await browser.new_page()
            await page.set_content(html_str, wait_until="networkidle")
            return await page.pdf(
                format="A4",
                print_background=True,
                display_header_footer=True,
                header_template="<div></div>",
                footer_template=_FOOTER_TPL.format(etichetta=esc(etichetta)),
                margin={"top": "12mm", "right": "0", "bottom": "12mm", "left": "0"},
            )
        finally:
            await browser.close()


def documento(titolo_tab: str, corpo: str, css_extra: str = "") -> str:
    """Scheletro HTML comune."""
    return f"""<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><title>{esc(titolo_tab)}</title>
<style>{DOC_CSS}{css_extra}</style></head>
<body>{corpo}</body></html>"""
