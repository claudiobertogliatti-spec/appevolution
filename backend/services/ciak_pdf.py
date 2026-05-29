"""
Render PDF della BOZZA analisi (Plan B).
HTML brandizzato in estetica Canva (navy/giallo, highlighter-pill, onde) →
playwright/chromium → PDF bytes. Riferimento design: ciak_analisi_demo/bozza.html.
"""
import html as _html
import logging

logger = logging.getLogger(__name__)

_TITOLI = [
    ("punto_di_partenza", "Il tuo punto di partenza"),
    ("dove_sei_adesso", "Dove sei adesso"),
    ("il_tuo_mercato", "Il tuo mercato"),
    ("la_tua_accademia", "La tua Accademia Digitale"),
    ("la_roadmap", "La roadmap"),
    ("prossimo_passo", "Il prossimo passo"),
]

_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
:root{--navy:#0F172A;--yellow:#FACC15;--slate-50:#F8FAFC;--slate-200:#E2E8F0;--slate-400:#94A3B8;--slate-600:#475569;}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:'Poppins',sans-serif;color:var(--navy);line-height:1.6;background:#fff;}
.container{max-width:900px;margin:0 auto;}
.cover{background:#fff;color:var(--navy);padding:90px 60px 70px;position:relative;overflow:hidden;text-align:center;}
.cover .logo{font-size:13px;font-weight:700;letter-spacing:2px;color:var(--slate-400);text-transform:uppercase;margin-bottom:40px;}
.cover h1{font-size:46px;font-weight:700;line-height:1.1;}
.highlight-pill{background:var(--yellow);padding:2px 16px;border-radius:30px;display:inline-block;}
.cover .sub{color:var(--navy);font-size:18px;font-weight:600;margin-top:22px;}
.date-pill{background:var(--yellow);color:var(--navy);font-weight:600;font-size:13px;padding:8px 20px;border-radius:30px;display:inline-block;margin-top:30px;}
.waves{position:absolute;left:0;right:0;bottom:0;width:100%;opacity:.5;}
.page{padding:30px 60px 60px;}
.tag-draft{display:inline-block;background:var(--yellow);color:var(--navy);padding:5px 14px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:20px;}
.section{margin-bottom:28px;page-break-inside:avoid;}
.section-num{font-size:12px;font-weight:700;color:var(--yellow);letter-spacing:1px;display:block;margin-bottom:4px;}
h2{font-size:22px;font-weight:600;margin-bottom:12px;}
.bullets{list-style:none;}
.bullets li{padding:8px 0 8px 26px;position:relative;color:var(--slate-600);font-size:14px;}
.bullets li:before{content:"\\25B8";color:var(--yellow);position:absolute;left:0;font-weight:700;}
.cta-box{background:var(--navy);color:#fff;border-radius:16px;padding:34px;margin-top:24px;text-align:center;}
.cta-box h3{font-size:20px;margin-bottom:10px;}
.cta-box p{color:#cbd5e1;font-size:14px;}
.cta-box .arrow{color:var(--yellow);font-weight:700;font-size:15px;margin-top:10px;}
.footer{margin-top:40px;padding-top:24px;border-top:1px solid var(--slate-200);color:var(--slate-400);font-size:12px;text-align:center;}
"""

_WAVES_SVG = (
    '<svg class="waves" viewBox="0 0 900 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
    '<path d="M0,60 C150,110 300,10 450,60 C600,110 750,10 900,60 L900,120 L0,120 Z" '
    'fill="none" stroke="#E2E8F0" stroke-width="1.5"/>'
    '<path d="M0,80 C150,130 300,30 450,80 C600,130 750,30 900,80" '
    'fill="none" stroke="#E2E8F0" stroke-width="1"/></svg>'
)


def _esc(s) -> str:
    return _html.escape(str(s or ""))


def render_bozza_html(bozza: dict, nome: str) -> str:
    bullets_map = bozza.get("bullet_per_capitolo", {}) or {}
    sezioni = []
    for i, (key, titolo) in enumerate(_TITOLI, start=1):
        items = bullets_map.get(key, []) or []
        lis = "".join(f"<li>{_esc(b)}</li>" for b in items)
        sezioni.append(
            f'<section class="section"><span class="section-num">{i:02d}</span>'
            f'<h2>{_esc(titolo)}</h2><ul class="bullets">{lis}</ul></section>'
        )
    intro = _esc(bozza.get("intro", ""))
    chiusura = _esc(bozza.get("chiusura", "Nella call approfondiamo i punti critici con i dati in mano."))
    return f"""<!doctype html><html lang="it"><head><meta charset="utf-8"><style>{_CSS}</style></head>
<body><div class="container">
<header class="cover">
  <div class="logo">Ciak Blueprint · powered by Evolution PRO</div>
  <h1>La tua <span class="highlight-pill">analisi</span> è pronta</h1>
  <div class="sub">Documento riservato · preparato per {_esc(nome)}</div>
  <div class="date-pill">Anteprima — sintesi preliminare</div>
  {_WAVES_SVG}
</header>
<div class="page">
  <span class="tag-draft">BOZZA · SINTESI PRELIMINARE</span>
  {('<p style="color:var(--slate-600);font-size:15px;margin-bottom:18px;">' + intro + '</p>') if intro else ''}
  {''.join(sezioni)}
  <div class="cta-box"><h3>La versione completa la vediamo insieme</h3>
    <p>{chiusura}</p><div class="arrow">Prenota la call →</div></div>
  <div class="footer">Ciak — powered by Evolution PRO · Delaware LLC · www.ciak.io</div>
</div></div></body></html>"""


async def html_to_pdf(html_str: str) -> bytes:
    """HTML → PDF via playwright/chromium. Richiede chromium installato (Dockerfile)."""
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            page = await browser.new_page()
            await page.set_content(html_str, wait_until="networkidle")
            return await page.pdf(
                format="A4", print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            )
        finally:
            await browser.close()


async def genera_bozza_pdf(bozza: dict, nome: str) -> bytes:
    return await html_to_pdf(render_bozza_html(bozza, nome))
