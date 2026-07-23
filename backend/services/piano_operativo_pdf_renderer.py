"""
Render PDF del Piano Operativo Strategico Unificato del Partner (Protocollo EVO - 14 Fasi).

Raccoglie in un unico documento d'élite l'intero storico delle 14 fasi:
dall'anagrafica/contratto fino al lancio dell'accademia.
Layout brand Ciak (Navy #0F172A + Giallo #FACC15 + Slate-50 #F8FAFC).
"""
import html as _html
import logging
from typing import Any, Dict, List
from .ciak_pdf import html_to_pdf

logger = logging.getLogger(__name__)


def _esc(s) -> str:
    return _html.escape(str(s or ""))


# Logo CIAK SVG per render PDF Playwright ultra-nitido senza dipendenze URL esterne
_CIAK_LOGO_SVG = """<svg width="180" height="42" viewBox="0 0 240 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M28.5 12C36.5 12 43 18.5 43 26.5" stroke="#FACC15" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M12 28.5C12 20.5 18.5 14 26.5 14" stroke="#94A3B8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M12 28.5C12 36.5 18.5 43 26.5 43" stroke="#64748B" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M28.5 45C36.5 45 43 38.5 43 30.5" stroke="#334155" stroke-width="4.5" stroke-linecap="round"/>
  <text x="56" y="38" fill="#FFFFFF" font-family="'Plus Jakarta Sans', 'Poppins', sans-serif" font-weight="800" font-size="30" letter-spacing="-0.5">Ciak<tspan fill="#FACC15">.io</tspan></text>
</svg>"""

_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
:root {
  --navy: #0F172A;
  --yellow: #FACC15;
  --yellow-light: #FEF9C3;
  --yellow-border: #FDE047;
  --slate-50: #F8FAFC;
  --slate-100: #F1F5F9;
  --slate-200: #E2E8F0;
  --slate-400: #94A3B8;
  --slate-600: #475569;
  --emerald: #10B981;
}
* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font-family:'Plus Jakarta Sans', sans-serif; color:var(--navy); line-height:1.6; background:#fff; }
.container { max-width:900px; margin:0 auto; background:#fff; }

.cover-header { background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: white; padding: 50px 50px 40px; position: relative; }
.brand-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }
.status-stamp { background: rgba(250, 204, 21, 0.15); border: 1px solid var(--yellow); color: var(--yellow); padding: 6px 16px; border-radius: 999px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.status-dot { width: 8px; height: 8px; background: var(--emerald); border-radius: 50%; display:inline-block; }

.doc-title-box h1 { font-size: 32px; font-weight: 800; line-height: 1.2; margin-bottom: 8px; letter-spacing: -0.5px; }
.doc-title-box p { color: #94A3B8; font-size: 15px; }

.partner-meta-box { margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between; }
.partner-info h3 { font-size: 18px; font-weight: 700; color: white; }
.partner-info p { font-size: 13px; color: #CBD5E1; }

.tutor-badge { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); padding: 8px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
.tutor-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--yellow); color: var(--navy); font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 12px; }

.timeline-section { padding: 35px 50px; background: var(--slate-50); border-bottom: 1px solid var(--slate-200); }
.section-tag { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #D97706; margin-bottom: 14px; }
.timeline-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.timeline-item { background: white; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--slate-200); display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
.item-name { font-weight: 600; color: var(--navy); }
.status-done { color: var(--emerald); font-weight: 700; font-size: 11px; }
.status-current { color: #D97706; font-weight: 700; font-size: 11px; }
.status-pending { color: #94A3B8; font-size: 11px; }

.chapter-body { padding: 40px 50px; }
.chapter-block { margin-bottom: 40px; page-break-inside: avoid; }
.phase-badge { display: inline-block; background: var(--yellow-light); border: 1px solid var(--yellow-border); color: #854D0E; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 6px; margin-bottom: 8px; }
h2.chapter-title { font-size: 22px; font-weight: 800; color: var(--navy); margin-bottom: 14px; }

.data-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 16px; border: 1px solid var(--slate-200); border-radius: 12px; overflow: hidden; }
.data-table th { background: var(--slate-100); padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--slate-600); text-transform: uppercase; border-bottom: 1px solid var(--slate-200); }
.data-table td { padding: 12px 16px; background: white; font-size: 13px; border-bottom: 1px solid var(--slate-100); }
.data-table tr:last-child td { border-bottom: none; }

.tutor-note-box { background: #FEFCE8; border: 1px solid #FEF08A; border-left: 4px solid var(--yellow); border-radius: 12px; padding: 16px; margin-top: 16px; }
.tutor-note-header { font-weight: 800; font-size: 12px; color: #854D0E; margin-bottom: 6px; }
.tutor-note-body { font-size: 13px; color: #713F12; line-height: 1.5; }

.script-box { background: var(--slate-50); border: 1px dashed #CBD5E1; border-radius: 12px; padding: 16px; margin-top: 16px; }
.script-header { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--slate-600); margin-bottom: 6px; display: flex; justify-content: space-between; }
.script-content { font-family: 'Space Mono', monospace; font-size: 12px; color: var(--navy); white-space: pre-wrap; word-break: break-word; }

.doc-footer { background: var(--slate-100); padding: 20px 50px; border-top: 1px solid var(--slate-200); display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--slate-600); }
"""


def render_piano_operativo_html(partner: Dict[str, Any], steps: List[Dict[str, Any]]) -> str:
    """Genera l'HTML del Piano Operativo Master per il partner."""
    nome = _esc(partner.get("name", "Partner CIAK"))
    brand = _esc(partner.get("brand_name", partner.get("accademia_name", "Accademia Digitale")))
    tutor = _esc(partner.get("tutor_name", "Claudio Bertogliatti"))
    tutor_initials = "".join([part[0] for part in tutor.split()[:2]]).upper() if tutor else "CB"

    # Step status count
    completed_count = sum(1 for s in steps if s.get("status") in ("done", "completed"))
    total_steps = len(steps) if steps else 14
    current_step_num = min(completed_count + 1, total_steps)

    # Build timeline grid items
    timeline_items_html = []
    for s in steps:
        st_name = _esc(s.get("label", s.get("step_id", "")))
        st_val = s.get("status", "pending")
        if st_val in ("done", "completed"):
            badge_h = '<span class="status-done">&#10003; Completato</span>'
        elif st_val == "in_progress":
            badge_h = '<span class="status-current">&#9654; In Revisione</span>'
        else:
            badge_h = '<span class="status-pending">In Coda</span>'
        timeline_items_html.append(
            f'<div class="timeline-item"><span class="item-name">{st_name}</span>{badge_h}</div>'
        )

    # Build Chapters content from step data
    chapters_html = []
    for s in steps:
        st_data = s.get("data") or {}
        st_id = s.get("step_id", "")
        st_label = _esc(s.get("label", st_id))
        st_num = s.get("step_number", 0)

        # Draw chapter if it has data or is completed
        if not st_data and s.get("status") not in ("done", "in_progress"):
            continue

        rows_html = []
        for k, v in st_data.items():
            if isinstance(v, (str, int, float, bool)) and str(v).strip():
                clean_key = k.replace("_", " ").title()
                rows_html.append(
                    f'<tr><td style="font-weight:700; width:35%;">{_esc(clean_key)}</td>'
                    f'<td>{_esc(str(v))}</td></tr>'
                )

        tutor_note = s.get("approval_note") or st_data.get("tutor_note") or ""
        script_text = st_data.get("script_text") or st_data.get("generated_script") or ""

        if rows_html or tutor_note or script_text:
            table_block = (
                f'<table class="data-table"><thead><tr><th>Parametro Strategico</th><th>Valore / Contenuto Approva</th></tr></thead>'
                f'<tbody>{"".join(rows_html)}</tbody></table>'
                if rows_html else ""
            )

            tutor_block = (
                f'<div class="tutor-note-box"><div class="tutor-note-header">&#128161; NOTE DEL TUTOR UMANO ({tutor}):</div>'
                f'<div class="tutor-note-body">{_esc(tutor_note)}</div></div>'
                if tutor_note else ""
            )

            script_block = (
                f'<div class="script-box"><div class="script-header"><span>&#128196; SCRIPT GENERATO AI PRONTO ALL\'USO</span>'
                f'<span style="color:#D97706;">Copia &amp; Incolla</span></div>'
                f'<div class="script-content">{_esc(script_text)}</div></div>'
                if script_text else ""
            )

            chapters_html.append(
                f'<div class="chapter-block">'
                f'<span class="phase-badge">FASE {st_num} &middot; {st_label.upper()}</span>'
                f'<h2 class="chapter-title">{st_label}</h2>'
                f'{table_block}{tutor_block}{script_block}'
                f'</div>'
            )

    # Fallback chapter if no steps completed yet
    if not chapters_html:
        chapters_html.append(
            '<div class="chapter-block"><span class="phase-badge">FASE 01 &middot; SETUP INIZIALE</span>'
            '<h2 class="chapter-title">Benvenuto nel Protocollo EVO</h2>'
            '<p style="color:var(--slate-600); font-size:14px;">Il tuo Piano Operativo Strategico si popolerà automaticamente man mano che completerai i vari step dell\'area riservata.</p></div>'
        )

    return f"""<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>CIAK.io - Piano Operativo Strategico | {_esc(nome)}</title>
  <style>{_CSS}</style>
</head>
<body>
  <div class="container">
    <div class="cover-header">
      <div class="brand-row">
        <div>{_CIAK_LOGO_SVG}</div>
        <div class="status-stamp">
          <span class="status-dot"></span> PROTOCOLLO VALIDATO (STEP {completed_count}/{total_steps})
        </div>
      </div>
      <div class="doc-title-box">
        <h1>PIANO OPERATIVO STRATEGICO</h1>
        <p>Documento Master Unificato: Da Anagrafica a Lancio dell'Accademia</p>
      </div>
      <div class="partner-meta-box">
        <div class="partner-info">
          <h3>{nome}</h3>
          <p>{brand}</p>
        </div>
        <div class="tutor-badge">
          <div class="tutor-avatar">{tutor_initials}</div>
          <div>
            <strong style="font-size:12px; color:white; display:block;">{tutor}</strong>
            <span style="font-size:11px; color:#94A3B8;">Tutor Strategico CIAK</span>
          </div>
        </div>
      </div>
    </div>

    <div class="timeline-section">
      <div class="section-tag">Avanzamento del Protocollo EVO (14 Fasi)</div>
      <div class="timeline-grid">
        {"".join(timeline_items_html)}
      </div>
    </div>

    <div class="chapter-body">
      {"".join(chapters_html)}
    </div>

    <div class="doc-footer">
      <div>&copy; 2026 CIAK.io &mdash; Piano Operativo Strategico Riservato</div>
      <div>Documento Generato per: {nome}</div>
    </div>
  </div>
</body>
</html>"""


async def genera_piano_operativo_pdf(partner: Dict[str, Any], steps: List[Dict[str, Any]]) -> bytes:
    """Genera i bytes PDF del Piano Operativo Master via Playwright."""
    html_content = render_piano_operativo_html(partner, steps)
    return await html_to_pdf(html_content)
