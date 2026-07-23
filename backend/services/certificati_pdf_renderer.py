"""
Render PDF dei Certificati Ufficiali di Completamento Macro-Fase del Partner.
Genera il certificato in formato landscape/A4 per le macro-fasi "Esamina" e "Valida"
del Protocollo EVO. Layout luxury brand CIAK (Navy #0F172A + Giallo Gold #FACC15).
"""
import html as _html
import logging
from datetime import datetime
from .ciak_pdf import html_to_pdf

logger = logging.getLogger(__name__)


def _esc(s) -> str:
    return _html.escape(str(s or ""))


# Logo CIAK SVG scuro/dorato per certificato su sfondo chiaro
_CIAK_CERT_LOGO_SVG = """<svg width="220" height="50" viewBox="0 0 240 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M28.5 12C36.5 12 43 18.5 43 26.5" stroke="#FACC15" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M12 28.5C12 20.5 18.5 14 26.5 14" stroke="#94A3B8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M12 28.5C12 36.5 18.5 43 26.5 43" stroke="#64748B" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M28.5 45C36.5 45 43 38.5 43 30.5" stroke="#0F172A" stroke-width="4.5" stroke-linecap="round"/>
  <text x="56" y="38" fill="#0F172A" font-family="'Plus Jakarta Sans', 'Poppins', sans-serif" font-weight="800" font-size="30" letter-spacing="-0.5">Ciak<tspan fill="#D97706">.io</tspan></text>
</svg>"""

_CERT_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap');
:root {
  --navy: #0F172A;
  --yellow: #FACC15;
  --gold: #D97706;
  --slate-50: #FFFDF5;
  --slate-600: #475569;
}
* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font-family:'Plus Jakarta Sans', sans-serif; color:var(--navy); background:#F8FAFC; padding: 20px; display:flex; align-items:center; justify-content:center; min-height:100vh; }

.cert-card {
  width: 960px;
  height: 660px;
  background: #FFFFFF;
  border: 12px solid #0F172A;
  outline: 3px solid #FACC15;
  outline-offset: -8px;
  padding: 40px 60px;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
  text-align: center;
  display: flex;
  flex-col;
  justify-content: space-between;
}

.cert-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #FEF08A; padding-bottom: 15px; }
.cert-seal { background: linear-gradient(135deg, #FACC15 0%, #D97706 100%); color: #0F172A; font-weight: 800; font-size: 11px; padding: 8px 18px; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 10px rgba(217, 119, 6, 0.3); }

.cert-subtitle { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: var(--gold); margin-top: 10px; }
.cert-title { font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 800; color: var(--navy); margin-top: 6px; letter-spacing: -0.5px; }

.cert-recipient-label { font-size: 13px; color: var(--slate-600); margin-top: 25px; text-transform: uppercase; letter-spacing: 1.5px; }
.cert-recipient-name { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 800; color: var(--navy); margin-top: 4px; border-bottom: 2px solid var(--yellow); display: inline-block; padding: 0 30px 4px; }
.cert-accademia-name { font-size: 16px; font-weight: 700; color: #1E293B; margin-top: 10px; }

.cert-description { font-size: 14px; color: var(--slate-600); max-width: 700px; margin: 20px auto 0; line-height: 1.6; }

.cert-footer { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 20px; }
.cert-meta { text-align: left; font-size: 11px; color: #94A3B8; }
.cert-meta strong { color: var(--navy); display: block; font-size: 12px; }

.cert-signature { text-align: right; }
.signature-img { font-family: 'Playfair Display', serif; font-style: italic; font-size: 22px; font-weight: 700; color: var(--navy); }
.signature-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--slate-600); margin-top: 2px; }
"""

MACRO_PHASE_CERT_CONFIG = {
    "esamina": {
        "badge": "FASE 01 · ESAMINA VALIDATA",
        "title": "Certificato di Validazione Strategica & Brand Identity",
        "desc": "Si attesta che il Partner ha completato con successo l'analisi di posizionamento, la definizione del target ICP, la promessa differenziante e l'identità visiva del Brand Kit secondo il Protocollo EVO™.",
    },
    "valida": {
        "badge": "FASE 02 · VALIDA COMPLETATA",
        "title": "Certificato di Prontezza Operativa Accademia & Funnel",
        "desc": "Si attesta che il Partner ha completato la strutturazione dell'Accademia, la scrittura degli script delle videolezioni, il setup del funnel di vendita e del checkout secondo il Protocollo EVO™.",
    },
}


def render_certificato_html(
    partner_name: str,
    accademia_name: str = "",
    macro_fase_id: str = "esamina",
    date_str: str = "",
) -> str:
    """Genera l'HTML del Certificato Ufficiale di Completamento Macro-Fase."""
    p_name = _esc(partner_name or "Partner CIAK")
    a_name = _esc(accademia_name or "Accademia Digitale")
    if not date_str:
        date_str = datetime.utcnow().strftime("%d/%m/%Y")
    else:
        date_str = _esc(date_str)

    cfg = MACRO_PHASE_CERT_CONFIG.get(macro_fase_id.lower(), MACRO_PHASE_CERT_CONFIG["esamina"])

    return f"""<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>CIAK.io - Certificato Ufficiale | {p_name}</title>
  <style>{_CERT_CSS}</style>
</head>
<body>
  <div class="cert-card">
    <div class="cert-header">
      <div>{_CIAK_CERT_LOGO_SVG}</div>
      <div class="cert-seal">{_esc(cfg['badge'])}</div>
    </div>

    <div>
      <div class="cert-subtitle">METODO EVO™ &middot; CERTIFICAZIONE UFFICIALE</div>
      <h1 class="cert-title">{_esc(cfg['title'])}</h1>

      <div class="cert-recipient-label">Rilasciato a</div>
      <div class="cert-recipient-name">{p_name}</div>
      <div class="cert-accademia-name">{a_name}</div>

      <p class="cert-description">{_esc(cfg['desc'])}</p>
    </div>

    <div class="cert-footer">
      <div class="cert-meta">
        <strong>CIAK.io &middot; Protocollo EVO™</strong>
        <span>Data di Rilascio: {date_str}</span><br>
        <span>Codice Verifica: EVOCERT-{hash(p_name + macro_fase_id) & 0xFFFFFF:06X}</span>
      </div>

      <div class="cert-signature">
        <div class="signature-img">Claudio Bertogliatti</div>
        <div class="signature-title">Fondatore CIAK.io &amp; Metodo EVO™</div>
      </div>
    </div>
  </div>
</body>
</html>"""


async def genera_certificato_pdf(
    partner_name: str,
    accademia_name: str = "",
    macro_fase_id: str = "esamina",
    date_str: str = "",
) -> bytes:
    """Genera i bytes PDF in formato A4 landscape del Certificato via Playwright."""
    from playwright.async_api import async_playwright
    html_content = render_certificato_html(partner_name, accademia_name, macro_fase_id, date_str)
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            page = await browser.new_page()
            await page.set_content(html_content, wait_until="networkidle")
            return await page.pdf(
                format="A4",
                landscape=True,
                print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            )
        finally:
            await browser.close()
