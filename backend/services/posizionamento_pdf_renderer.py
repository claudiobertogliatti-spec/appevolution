"""Render PDF del Documento di Posizionamento del partner.

12 domande in 4 sezioni (vedi spec wizard-posizionamento-12-domande-design.md).
Layout brand Ciak (navy #0F172A + giallo #FACC15, Poppins).
Riusa html_to_pdf condiviso (backend/services/ciak_pdf.py)
che gira su playwright/chromium già installato nel container.
"""
import html as _html
import logging
from typing import Any

from .ciak_pdf import html_to_pdf

logger = logging.getLogger(__name__)


SECTIONS_GROUPED = [
    {
        "header": "A chi parli",
        "subtitle": "L'ICP scolpito — chi, dove ti cerca, quanto sa.",
        "items": [
            ("nicchia",                "01", "Nicchia precisa"),
            ("momento_di_vita",        "02", "Momento di vita / carriera"),
            ("livello_consapevolezza", "03", "Livello di consapevolezza"),
        ],
    },
    {
        "header": "Cosa vendi",
        "subtitle": "Promessa, trasformazione, prezzo, formato.",
        "items": [
            ("promessa",            "04", "Promessa in 1 frase"),
            ("trasformazione_90gg", "05", "Trasformazione in 90 giorni"),
            ("prezzo_e_formato",    "06", "Prezzo e formato"),
        ],
    },
    {
        "header": "Il tuo metodo",
        "subtitle": "Il modo riconoscibile in cui produci risultati.",
        "items": [
            ("metodo_nome",            "07", "Nome metodo"),
            ("metodo_step",            "08", "Step del metodo"),
            ("prova_sociale_concreta", "09", "Prova sociale concreta"),
        ],
    },
    {
        "header": "Perché tu",
        "subtitle": "La voce che ti rende difficile da copiare.",
        "items": [
            ("origin_story",            "10", "Origin story"),
            ("contrarian_view",         "11", "Punto di vista contrarian"),
            ("differenza_riconoscibile","12", "Come ti descriverebbero"),
        ],
    },
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
.group{margin-bottom:36px;page-break-inside:avoid;}
.group-header{margin-bottom:14px;border-bottom:2px solid var(--yellow);padding-bottom:8px;}
.group-header h2{font-size:22px;font-weight:700;color:var(--navy);}
.group-header .subtitle{font-size:13px;color:var(--slate-400);margin-top:2px;font-weight:400;}
.section{margin-bottom:20px;page-break-inside:avoid;}
.section-num{font-size:11px;font-weight:700;color:var(--yellow);letter-spacing:1px;display:block;margin-bottom:4px;}
.section h3{font-size:16px;font-weight:600;margin-bottom:6px;}
.section p{color:var(--slate-600);font-size:14px;white-space:pre-wrap;}
.footer{margin-top:40px;padding-top:24px;border-top:1px solid var(--slate-200);color:var(--slate-400);font-size:12px;text-align:center;}
"""


def _esc(s: Any) -> str:
    return _html.escape(str(s or ""))


def render_posizionamento_html(answers: dict, nome: str) -> str:
    """Costruisce l'HTML del Documento di Posizionamento dalle 12 risposte in 4 sezioni."""
    groups_html = []
    for group in SECTIONS_GROUPED:
        items_html = []
        for key, num, label in group["items"]:
            value = _esc(answers.get(key, "")).strip()
            if not value:
                value = "<em style='color:var(--slate-400)'>Non compilato</em>"
            items_html.append(
                f'<section class="section"><span class="section-num">{num}</span>'
                f'<h3>{_esc(label)}</h3><p>{value}</p></section>'
            )
        groups_html.append(
            f'<div class="group">'
            f'  <div class="group-header"><h2>{_esc(group["header"])}</h2>'
            f'    <div class="subtitle">{_esc(group["subtitle"])}</div></div>'
            f'  {"".join(items_html)}'
            f'</div>'
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
  {''.join(groups_html)}
  <div class="footer">Documento generato dal Metodo EVO™ · Evolution PRO LLC · ciak.io</div>
</div></div></body></html>"""


async def genera_posizionamento_pdf(answers: dict, nome: str) -> bytes:
    """HTML → PDF bytes via playwright/chromium (riuso shared helper)."""
    return await html_to_pdf(render_posizionamento_html(answers, nome))
