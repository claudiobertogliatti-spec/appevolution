"""Render PDF del Brand Kit del partner.

Identità visiva (logo + foto + 3 colori) + voce (tone of voice + parole chiave +
parole da evitare). Layout brand Ciak (navy #0F172A + giallo #FACC15, Poppins).
Riusa html_to_pdf condiviso (backend/services/ciak_pdf.py) che gira su
playwright/chromium già installato nel container.
"""
import html as _html
import logging
from typing import Any

from .ciak_pdf import html_to_pdf

logger = logging.getLogger(__name__)


_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
:root{--navy:#0F172A;--yellow:#FACC15;--slate-50:#F8FAFC;--slate-200:#E2E8F0;--slate-400:#94A3B8;--slate-600:#475569;}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:'Poppins',sans-serif;color:var(--navy);line-height:1.6;background:#fff;}
.container{max-width:900px;margin:0 auto;}
.cover{padding:90px 60px 70px;text-align:center;position:relative;}
.cover .logo{font-size:13px;font-weight:700;letter-spacing:2px;color:var(--slate-400);text-transform:uppercase;margin-bottom:40px;}
.cover h1{font-size:42px;font-weight:700;line-height:1.1;}
.highlight-pill{background:var(--yellow);padding:2px 16px;border-radius:30px;display:inline-block;}
.cover .sub{color:var(--navy);font-size:18px;font-weight:600;margin-top:22px;}
.cover .who{color:var(--slate-600);font-size:14px;margin-top:8px;}
.page{padding:30px 60px 60px;}
.group{margin-bottom:40px;page-break-inside:avoid;}
.group-header{margin-bottom:18px;border-bottom:2px solid var(--yellow);padding-bottom:8px;}
.group-header h2{font-size:22px;font-weight:700;color:var(--navy);}
.group-header .subtitle{font-size:13px;color:var(--slate-400);margin-top:2px;font-weight:400;}
.section{margin-bottom:22px;page-break-inside:avoid;}
.section-num{font-size:11px;font-weight:700;color:var(--yellow);letter-spacing:1px;display:block;margin-bottom:4px;}
.section h3{font-size:16px;font-weight:600;margin-bottom:8px;}
.section p{color:var(--slate-600);font-size:14px;white-space:pre-wrap;}
.visual-row{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;}
.asset-card{background:var(--slate-50);border:1px solid var(--slate-200);border-radius:8px;padding:18px;text-align:center;flex:1;min-width:220px;}
.asset-card .asset-label{font-size:11px;font-weight:600;color:var(--slate-400);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;}
.asset-card img{max-width:100%;max-height:160px;object-fit:contain;border-radius:4px;}
.asset-card .missing{color:var(--slate-400);font-style:italic;font-size:13px;padding:30px 0;}
.palette{display:flex;gap:18px;justify-content:center;}
.swatch{text-align:center;}
.swatch .chip{width:90px;height:90px;border-radius:8px;border:1px solid var(--slate-200);}
.swatch .hex{font-family:monospace;font-size:12px;color:var(--slate-600);margin-top:8px;font-weight:600;}
.pill-list{display:flex;flex-wrap:wrap;gap:8px;}
.pill{background:var(--slate-50);border:1px solid var(--slate-200);border-radius:30px;padding:6px 14px;font-size:13px;color:var(--navy);font-weight:500;}
.pill.avoid{background:#FEF2F2;border-color:#FECACA;color:#991B1B;text-decoration:line-through;}
.empty-note{color:var(--slate-400);font-style:italic;font-size:13px;}
.footer{margin-top:40px;padding-top:24px;border-top:1px solid var(--slate-200);color:var(--slate-400);font-size:12px;text-align:center;}
"""


def _esc(s: Any) -> str:
    return _html.escape(str(s or ""))


def _asset_card(label: str, url: str) -> str:
    if url:
        return (
            f'<div class="asset-card"><div class="asset-label">{_esc(label)}</div>'
            f'<img src="{_esc(url)}" alt="{_esc(label)}" /></div>'
        )
    return (
        f'<div class="asset-card"><div class="asset-label">{_esc(label)}</div>'
        f'<div class="missing">Non caricato</div></div>'
    )


def _swatch(hex_color: str) -> str:
    safe = _esc(hex_color)
    return (
        f'<div class="swatch"><div class="chip" style="background:{safe}"></div>'
        f'<div class="hex">{safe}</div></div>'
    )


def _pills(items: list, avoid: bool = False) -> str:
    items = [i for i in (items or []) if (i or "").strip()]
    if not items:
        return '<div class="empty-note">Nessuna voce indicata.</div>'
    cls = "pill avoid" if avoid else "pill"
    return (
        '<div class="pill-list">'
        + "".join(f'<span class="{cls}">{_esc(i)}</span>' for i in items)
        + "</div>"
    )


def render_brand_kit_html(data: dict, nome: str) -> str:
    """Costruisce l'HTML del Brand Kit.

    data: dict con keys logo_url, foto_url, colors (list[str] HEX),
          tone_of_voice (str), parole_chiave (list[str]), parole_evitare (list[str]).
    """
    logo_url = (data.get("logo_url") or "").strip()
    foto_url = (data.get("foto_url") or "").strip()
    colors = data.get("colors") or []
    tone = (data.get("tone_of_voice") or "").strip()
    parole_chiave = data.get("parole_chiave") or []
    parole_evitare = data.get("parole_evitare") or []

    swatches_html = "".join(_swatch(c) for c in colors) or (
        '<div class="empty-note">Colori non definiti.</div>'
    )

    tone_html = (
        f"<p>{_esc(tone)}</p>"
        if tone
        else "<p class='empty-note'>Tone of voice non compilato.</p>"
    )

    return f"""<!doctype html><html lang="it"><head><meta charset="utf-8"><style>{_CSS}</style></head>
<body><div class="container">
<header class="cover">
  <div class="logo">Brand Kit · Metodo EVO™</div>
  <h1>Il tuo <span class="highlight-pill">brand kit</span></h1>
  <div class="sub">Fondamento Esamina · Fase 1</div>
  <div class="who">Preparato per {_esc(nome)}</div>
</header>
<div class="page">

  <div class="group">
    <div class="group-header">
      <h2>Identità visiva</h2>
      <div class="subtitle">Logo, foto, colori — gli asset con cui ti riconoscono.</div>
    </div>
    <section class="section">
      <span class="section-num">01</span>
      <h3>Logo e foto</h3>
      <div class="visual-row">
        {_asset_card("Logo", logo_url)}
        {_asset_card("Foto personale", foto_url)}
      </div>
    </section>
    <section class="section">
      <span class="section-num">02</span>
      <h3>Palette colori</h3>
      <div class="palette">{swatches_html}</div>
    </section>
  </div>

  <div class="group">
    <div class="group-header">
      <h2>La tua voce</h2>
      <div class="subtitle">Come parli, le parole che fanno suono di te.</div>
    </div>
    <section class="section">
      <span class="section-num">03</span>
      <h3>Tone of voice</h3>
      {tone_html}
    </section>
    <section class="section">
      <span class="section-num">04</span>
      <h3>Parole chiave</h3>
      {_pills(parole_chiave)}
    </section>
    <section class="section">
      <span class="section-num">05</span>
      <h3>Parole da evitare</h3>
      {_pills(parole_evitare, avoid=True)}
    </section>
  </div>

  <div class="footer">Documento generato dal Metodo EVO™ · Evolution PRO LLC · ciak.io</div>
</div></div></body></html>"""


async def genera_brand_kit_pdf(data: dict, nome: str) -> bytes:
    """HTML → PDF bytes via playwright/chromium (riuso shared helper)."""
    return await html_to_pdf(render_brand_kit_html(data, nome))
