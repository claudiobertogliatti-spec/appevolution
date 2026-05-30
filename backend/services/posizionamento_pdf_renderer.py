"""Render PDF del Documento di Posizionamento del partner.

Layout brand Ciak (navy #0F172A + giallo #FACC15, Poppins).
Riusa html_to_pdf condiviso (backend/services/ciak_pdf.py)
che gira su playwright/chromium già installato nel container.
"""
import html as _html
import logging
from typing import Any

from .ciak_pdf import html_to_pdf

logger = logging.getLogger(__name__)


SECTIONS = [
    ("nicchia",          "01", "Nicchia"),
    ("promessa",         "02", "Promessa"),
    ("cliente_tipo",     "03", "Cliente tipo"),
    ("problema_chiave",  "04", "Problema chiave"),
    ("trasformazione",   "05", "Trasformazione in 90gg"),
    ("differenza",       "06", "Differenza nel mercato"),
    ("metodo_proprio",   "07", "Metodo proprio"),
    ("prova_sociale",    "08", "Prova sociale"),
]


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
.section{margin-bottom:24px;page-break-inside:avoid;}
.section-num{font-size:11px;font-weight:700;color:var(--yellow);letter-spacing:1px;display:block;margin-bottom:4px;}
.section h2{font-size:18px;font-weight:600;margin-bottom:8px;}
.section p{color:var(--slate-600);font-size:14px;white-space:pre-wrap;}
.footer{margin-top:40px;padding-top:24px;border-top:1px solid var(--slate-200);color:var(--slate-400);font-size:12px;text-align:center;}
"""


def _esc(s: Any) -> str:
    return _html.escape(str(s or ""))


def render_posizionamento_html(answers: dict, nome: str) -> str:
    """Costruisce l'HTML del Documento di Posizionamento dalle 8 risposte."""
    sezioni_html = []
    for key, num, label in SECTIONS:
        value = _esc(answers.get(key, "")).strip()
        if not value:
            value = "<em style='color:var(--slate-400)'>Non compilato</em>"
        sezioni_html.append(
            f'<section class="section"><span class="section-num">{num}</span>'
            f'<h2>{_esc(label)}</h2><p>{value}</p></section>'
        )
    return f"""<!doctype html><html lang="it"><head><meta charset="utf-8"><style>{_CSS}</style></head>
<body><div class="container">
<header class="cover">
  <div class="logo">Documento di Posizionamento · Metodo EVO™</div>
  <h1>Il tuo <span class="highlight-pill">posizionamento</span></h1>
  <div class="sub">Fondamento Esamina · Fase 1</div>
  <div class="who">Preparato per {_esc(nome)}</div>
</header>
<div class="page">
  {''.join(sezioni_html)}
  <div class="footer">Documento generato dal Metodo EVO™ · Evolution PRO LLC · ciak.io</div>
</div></div></body></html>"""


async def genera_posizionamento_pdf(answers: dict, nome: str) -> bytes:
    """HTML → PDF bytes via playwright/chromium (riuso shared helper)."""
    return await html_to_pdf(render_posizionamento_html(answers, nome))
