"""Render PDF del documento "La tua storia" del partner (Esamina, Valentina).

21 risposte in 6 blocchi narrativi (origini, problema, svolta, percorso,
trasformazione, oggi). Layout brand Ciak (navy + giallo). Riusa html_to_pdf
condiviso (services/ciak_pdf.py, playwright/chromium).
"""
import html as _html
import logging
from typing import Any

from .ciak_pdf import html_to_pdf

logger = logging.getLogger(__name__)

# (id, label) raggruppati per blocco. Gli id combaciano con storiaQuestions.js.
BLOCKS = [
    ("Le tue origini", [
        ("S01", "Prima di questo lavoro"),
        ("S02", "Com'era la tua vita"),
        ("S03", "Come ti descrivevi"),
    ]),
    ("Il problema", [
        ("S04", "La difficoltà più grande"),
        ("S05", "Cosa non funzionava"),
        ("S06", "Cosa ti faceva stare male"),
        ("S07", "Cosa volevi cambiare"),
    ]),
    ("Il momento di svolta", [
        ("S08", "L'evento che ha cambiato tutto"),
        ("S09", "Quando hai deciso"),
        ("S10", "Chi o cosa ti ha aiutato"),
    ]),
    ("Il percorso", [
        ("S11", "Gli ostacoli"),
        ("S12", "Gli errori"),
        ("S13", "I sacrifici"),
        ("S14", "La lezione più importante"),
    ]),
    ("La trasformazione", [
        ("S15", "Quando hai capito che funzionava"),
        ("S16", "Il primo vero successo"),
        ("S17", "Un cliente indimenticabile"),
    ]),
    ("Oggi", [
        ("S18", "Perché lo fai"),
        ("S19", "La tua missione"),
        ("S20", "L'impatto che vuoi lasciare"),
        ("S21", "I tuoi valori"),
    ]),
]


def _esc(s: Any) -> str:
    return _html.escape(str(s or "")).replace("\n", "<br/>")


def render_storia_html(answers: dict, nome: str) -> str:
    blocks_html = []
    for i, (header, items) in enumerate(BLOCKS, start=1):
        rows = []
        for qid, label in items:
            val = (answers.get(qid) or "").strip()
            if not val:
                continue
            rows.append(
                f'<div class="qa"><div class="lab">{_esc(label)}</div>'
                f'<div class="ans">{_esc(val)}</div></div>'
            )
        if not rows:
            continue
        blocks_html.append(
            f'<section><h2><span class="num">{i}</span>{_esc(header)}</h2>{"".join(rows)}</section>'
        )

    body = "".join(blocks_html) or '<p class="empty">Nessuna risposta inserita.</p>'
    return f"""<!doctype html><html lang="it"><head><meta charset="utf-8"/>
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Poppins','Segoe UI',sans-serif; color:#1F2933; margin:0; padding:0; }}
  .cover {{ background:#0F172A; color:#fff; padding:48px 44px; }}
  .cover .eyebrow {{ color:#FACC15; font-size:12px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; }}
  .cover h1 {{ font-size:30px; margin:10px 0 6px; }}
  .cover p {{ color:#cbd5e1; font-size:14px; margin:0; }}
  main {{ padding:34px 44px; }}
  section {{ margin-bottom:26px; page-break-inside: avoid; }}
  h2 {{ font-size:17px; color:#0F172A; border-bottom:2px solid #FACC15; padding-bottom:6px; display:flex; align-items:center; gap:10px; }}
  h2 .num {{ background:#0F172A; color:#FACC15; width:24px; height:24px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; font-size:13px; }}
  .qa {{ margin:12px 0; }}
  .lab {{ font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.04em; }}
  .ans {{ font-size:14px; line-height:1.6; color:#1F2933; margin-top:2px; }}
  .empty {{ color:#94a3b8; }}
</style></head><body>
  <div class="cover">
    <div class="eyebrow">Ciak · La mia storia</div>
    <h1>La storia di {_esc(nome)}</h1>
    <p>Il materiale narrativo per Hero Story, pagina "Chi sono", video, social ed email.</p>
  </div>
  <main>{body}</main>
</body></html>"""


async def genera_storia_pdf(answers: dict, nome: str) -> bytes:
    return await html_to_pdf(render_storia_html(answers, nome))
