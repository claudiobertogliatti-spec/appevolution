"""Workbook Strategico del partner: HTML nello standard ufficiale delle dispense.

Lo standard e' `memory/CIAK_WORKBOOK_STRATEGICO_TEMPLATE.md` (ATTIVO E CONVALIDATO):
logo reale, banner giallo "WORKBOOK STRATEGICO", sottotitolo ufficiale, metadati
partner, stemma di validazione; dentro, sezioni numerate in stile business plan con
box "Note del Tutor Umano" e box "Script & Output AI" in monospaziato.

Stesso impianto grafico del Piano Operativo (`piano_operativo_pdf_renderer.py`), da
cui riprende logo SVG, palette e componenti: le dispense partner devono sembrare lo
stesso documento. Il PDF si ottiene con `ciak_pdf.html_to_pdf` (Playwright).
"""
from __future__ import annotations

import base64
import html as _html
import os
from functools import lru_cache
from typing import Any

from .ciak_pdf import html_to_pdf


def _esc(s: Any) -> str:
    return _html.escape(str(s or ""))


_LOGO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "ciak-logo.webp")


@lru_cache(maxsize=1)
def _logo_tag() -> str:
    """Logo reale CIAK incorporato come data URI.

    Il logo ufficiale e' navy con payoff: su fondo scuro sparisce, per questo la
    copertina e' chiara. Incorporato in base64 perche' Playwright riceve l'HTML
    con `set_content` e non risolverebbe un percorso relativo.
    """
    try:
        with open(_LOGO_PATH, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        return f'<img class="logo" src="data:image/webp;base64,{b64}" alt="Ciak.io">'
    except OSError:
        # Fallback testuale in colori brand, cosi' la copertina resta leggibile.
        return ('<span style="font-family:\'Plus Jakarta Sans\',sans-serif;font-weight:800;'
                'font-size:30px;color:#0F172A;">Ciak<span style="color:#FACC15">.io</span></span>')

_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
:root {
  --navy: #0F172A; --yellow: #FACC15; --yellow-light: #FEF9C3; --yellow-border: #FDE047;
  --slate-50: #F8FAFC; --slate-100: #F1F5F9; --slate-200: #E2E8F0; --slate-400: #94A3B8;
  --slate-600: #475569; --emerald: #10B981;
}
* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font-family:'Plus Jakarta Sans', sans-serif; color:var(--navy); line-height:1.6; background:#fff; }
.container { max-width:900px; margin:0 auto; background:#fff; }

/* Copertina chiara: il logo ufficiale CIAK e' navy e su fondo scuro non si legge. */
.cover-header { background:#fff; color:var(--navy); padding:46px 50px 34px; border-bottom:4px solid var(--yellow); }
.brand-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:26px; }
.logo { height:64px; width:auto; display:block; }
.validation-seal { background:var(--yellow-light); border:1px solid var(--yellow-border); color:#854D0E; padding:6px 16px; border-radius:999px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:8px; }
.seal-dot { width:8px; height:8px; background:var(--emerald); border-radius:50%; display:inline-block; }
.title-banner { background:var(--yellow); color:var(--navy); padding:10px 20px; border-radius:8px; font-weight:800; font-size:20px; letter-spacing:1px; margin-bottom:12px; display:inline-block; }
.subtitle { font-size:16px; color:var(--slate-600); font-weight:500; }

.partner-meta-box { margin-top:26px; padding-top:20px; border-top:1px solid var(--slate-200); display:flex; align-items:flex-end; justify-content:space-between; }
.meta-grid { display:grid; gap:4px; font-size:13px; color:var(--slate-600); }
.meta-grid strong { color:var(--navy); font-weight:700; }
.meta-label { color:var(--slate-400); }
.tutor-badge { display:flex; align-items:center; gap:10px; background:var(--slate-50); padding:8px 16px; border-radius:12px; border:1px solid var(--slate-200); }
.tutor-avatar { width:34px; height:34px; border-radius:50%; background:var(--yellow); color:var(--navy); font-weight:800; display:flex; align-items:center; justify-content:center; font-size:12px; }

.index-section { padding:30px 50px; background:var(--slate-50); border-bottom:1px solid var(--slate-200); }
.section-tag { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#D97706; margin-bottom:14px; }
.index-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; }
.index-item { background:#fff; padding:9px 14px; border-radius:10px; border:1px solid var(--slate-200); display:flex; align-items:center; justify-content:space-between; font-size:12px; }
.index-name { font-weight:600; color:var(--navy); }
.index-done { color:var(--emerald); font-weight:700; font-size:11px; }
.index-wait { color:#94A3B8; font-size:11px; }

.chapter-body { padding:40px 50px; }
.chapter-block { margin-bottom:34px; page-break-inside:avoid; }
.section-num { font-size:12px; font-weight:800; color:#D97706; letter-spacing:1px; display:block; margin-bottom:4px; }
h2.chapter-title { font-size:21px; font-weight:800; color:var(--navy); margin-bottom:10px; }
.rule { height:1px; background:var(--slate-200); margin-bottom:14px; }
.chapter-text { font-size:13.5px; color:var(--slate-600); }
.chapter-text p { margin-bottom:7px; }
.chapter-text p.dato { color:var(--navy); }
.chapter-text p.dato b { font-weight:700; }
.attesa { font-size:13px; color:var(--slate-400); font-style:italic; }

.tutor-note-box { background:#FEFCE8; border:1px solid #FEF08A; border-left:4px solid var(--yellow); border-radius:12px; padding:16px; margin-top:16px; }
.tutor-note-header { font-weight:800; font-size:12px; color:#854D0E; margin-bottom:6px; }
.tutor-note-body { font-size:13px; color:#713F12; line-height:1.5; }

.script-box { background:var(--slate-50); border:1px dashed #CBD5E1; border-radius:12px; padding:16px; margin-top:16px; }
.script-header { font-size:11px; font-weight:800; text-transform:uppercase; color:var(--slate-600); margin-bottom:6px; display:flex; justify-content:space-between; }
.script-content { font-family:'Space Mono', monospace; font-size:12px; color:var(--navy); white-space:pre-wrap; word-break:break-word; }

.doc-footer { background:var(--slate-100); padding:20px 50px; border-top:1px solid var(--slate-200); display:flex; align-items:center; justify-content:space-between; font-size:11px; color:var(--slate-600); }
"""


def _corpo_html(body: str) -> str:
    """Le righe "Etichetta: valore" diventano paragrafi con l'etichetta in grassetto."""
    righe = [r.strip() for r in str(body).split("\n") if r.strip()]
    out = []
    for r in righe:
        if r.startswith("- "):
            out.append(f'<p>&#8226; {_esc(r[2:])}</p>')
        elif ": " in r[:34] and not r.startswith("http"):
            etichetta, _, resto = r.partition(": ")
            out.append(f'<p class="dato"><b>{_esc(etichetta)}:</b> {_esc(resto)}</p>')
        else:
            out.append(f"<p>{_esc(r)}</p>")
    return "".join(out)


def render_project_book_html(payload: dict[str, Any]) -> str:
    nome = _esc(payload.get("partner_name") or "Partner CIAK")
    progetto = _esc(payload.get("project_name") or "Accademia Digitale")
    data_inizio = _esc(payload.get("start_date") or "In preparazione")
    fase = _esc(payload.get("fase_attuale") or "In corso")
    tutor = "Claudio Bertogliatti"
    sezioni = payload.get("sections") or []
    attesa = "Questa sezione si completera' nella prossima fase del percorso."

    compilate = sum(1 for s in sezioni if not str(s.get("body", "")).strip().startswith(attesa[:28]))

    indice, capitoli = [], []
    for i, s in enumerate(sezioni, 1):
        titolo = _esc(s.get("title") or "Sezione")
        body = str(s.get("body") or attesa)
        piena = not body.strip().startswith(attesa[:28])
        indice.append(
            f'<div class="index-item"><span class="index-name">{i}.0 {titolo}</span>'
            + (f'<span class="index-done">&#10003; Compilata</span>' if piena
               else '<span class="index-wait">In preparazione</span>')
            + "</div>"
        )
        corpo = _corpo_html(body) if piena else f'<p class="attesa">{_esc(attesa)}</p>'
        blocchi_extra = ""
        for extra in (s.get("boxes") or []):
            if extra.get("tipo") == "tutor":
                blocchi_extra += (
                    f'<div class="tutor-note-box"><div class="tutor-note-header">&#128161; NOTE DEL TUTOR UMANO ({_esc(tutor)}):</div>'
                    f'<div class="tutor-note-body">{_esc(extra.get("testo"))}</div></div>'
                )
            elif extra.get("tipo") == "script":
                blocchi_extra += (
                    f'<div class="script-box"><div class="script-header"><span>&#128196; {_esc(extra.get("titolo") or "SCRIPT PRONTO ALL\'USO")}</span>'
                    f'<span style="color:#D97706;">Copia &amp; Incolla</span></div>'
                    f'<div class="script-content">{_esc(extra.get("testo"))}</div></div>'
                )
        capitoli.append(
            f'<div class="chapter-block"><span class="section-num">SEZIONE {i}.0</span>'
            f'<h2 class="chapter-title">{titolo}</h2><div class="rule"></div>'
            f'<div class="chapter-text">{corpo}</div>{blocchi_extra}</div>'
        )

    iniziali = "".join(p[0] for p in tutor.split()[:2]).upper()
    return f"""<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><title>CIAK.io - Workbook Strategico | {nome}</title><style>{_CSS}</style></head>
<body>
  <div class="container">
    <div class="cover-header">
      <div class="brand-row">
        <div>{_logo_tag()}</div>
        <div class="validation-seal"><span class="seal-dot"></span> VALIDATO DAL TEAM CIAK + METODO EVO</div>
      </div>
      <div class="title-banner">WORKBOOK STRATEGICO</div>
      <p class="subtitle">Una guida esclusiva per la realizzazione di accademie digitali di successo</p>
      <div class="partner-meta-box">
        <div class="meta-grid">
          <div><span class="meta-label">Preparato per:</span> <strong>{nome}</strong></div>
          <div><span class="meta-label">Progetto / Accademia:</span> <strong>{progetto}</strong></div>
          <div><span class="meta-label">Data Inizio Lavori:</span> <strong>{data_inizio}</strong></div>
          <div><span class="meta-label">Fase attuale:</span> <strong>{fase}</strong></div>
        </div>
        <div class="tutor-badge">
          <div class="tutor-avatar">{iniziali}</div>
          <div>
            <strong style="font-size:12px; color:#0F172A; display:block;">{_esc(tutor)}</strong>
            <span style="font-size:11px; color:#64748B;">Tutor Strategico CIAK.io</span>
          </div>
        </div>
      </div>
    </div>

    <div class="index-section">
      <div class="section-tag">Indice del progetto &middot; {compilate} sezioni su {len(sezioni)} compilate</div>
      <div class="index-grid">{"".join(indice)}</div>
    </div>

    <div class="chapter-body">{"".join(capitoli)}</div>

    <div class="doc-footer">
      <div>&copy; 2026 CIAK.io &mdash; Workbook Strategico Riservato</div>
      <div>Preparato per: {nome}</div>
    </div>
  </div>
</body>
</html>"""


async def genera_project_book_pdf(payload: dict[str, Any]) -> bytes:
    return await html_to_pdf(render_project_book_html(payload))
