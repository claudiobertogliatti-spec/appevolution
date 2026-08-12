"""
Render PDF dei Certificati Ufficiali di Completamento Macro-Fase del Partner.

A4 landscape, HTML+CSS -> Playwright (stesso impianto del Workbook Strategico).

⛔ BRAND LOCK INTERNO (Evolution/Ciak) — vedi docs/brand/ciak-brand-kit.md v1.0:
   Poppins · #0F172A inchiostro · #64748B muted · #E5E7EB superfici · #FACC15 accento.
   Nient'altro. Niente gradienti, ombre o serif decorativi.

⚠️ Il logo Ciak ufficiale e' NAVY con payoff "SI CAMBIA": su fondo scuro sparisce.
   Per questo il certificato e' su fondo chiaro, come la copertina del Workbook.
   Entrambi i loghi sono asset RASTER REALI incorporati in base64 — mai ricostruiti
   in SVG a mano (l'errore della versione precedente di questo file).
"""
import base64
import hashlib
import html as _html
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

_ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
_CIAK_LOGO = os.path.join(_ASSETS, "ciak-logo.webp")
_EVO_LOGO = os.path.join(_ASSETS, "logo_evolutionpro.png")


def _esc(s) -> str:
    return _html.escape(str(s or ""))


def _img_tag(path: str, mime: str, css_class: str, alt: str) -> str:
    """Incorpora l'asset reale in base64: Playwright riceve l'HTML come stringa,
    quindi un src relativo non risolverebbe."""
    try:
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        return f'<img class="{css_class}" src="data:{mime};base64,{b64}" alt="{_esc(alt)}">'
    except Exception as e:
        logger.warning("[CERT] logo %s non incorporato: %s", path, e)
        return ""


def codice_verifica(partner_id: str, macro_fase_id: str) -> str:
    """Codice di verifica STABILE nel tempo.

    La versione precedente usava hash() su stringa: in Python e' randomizzato per
    processo (PYTHONHASHSEED), quindi lo stesso certificato usciva con un codice
    diverso a ogni riavvio del backend. Un codice di verifica che cambia non
    verifica niente.
    """
    seme = f"{partner_id or ''}|{macro_fase_id or ''}".lower()
    return "EVO-" + hashlib.sha256(seme.encode("utf-8")).hexdigest()[:6].upper()


# I numeri sono quelli veri del modello (models/partner_journey_step.py):
# Esamina 6 step, Valida 9 step, Ottimizza post-lancio (nessuno step).
_TRACCIATO = [
    {"id": "esamina", "label": "Esamina", "step": 6},
    {"id": "valida", "label": "Valida", "step": 9},
    {"id": "ottimizza", "label": "Ottimizza", "step": 5},  # post-lancio, ritmo continuo
]

MACRO_PHASE_CERT_CONFIG = {
    "esamina": {
        "numero": "01",
        "nome": "Esamina",
        "tagline": "Chiarire chi sei e a chi parli",
        "voci": [
            "Documento di Posizionamento",
            "Brand Kit: colori, logo, tono di voce",
            "La tua storia, in forma narrativa",
            "Anagrafica e dati per la fatturazione",
        ],
        "chiusura": "Le fondamenta del progetto sono definite: identità, pubblico, promessa e identità visiva.",
    },
    "valida": {
        "numero": "02",
        "nome": "Valida",
        "tagline": "Costruire una prima versione vendibile",
        "voci": [
            "Masterclass registrata e approvata",
            "Videocorso: lezioni pubblicate",
            "Sistema di vendita: dominio, legal, funnel, checkout",
            "Calendario di lancio e offerta al pubblico",
        ],
        "chiusura": "Il progetto è diventato un sistema reale, pronto per il lancio.",
    },
}


def _tracciato_html(fase_corrente: str, giorni=None) -> str:
    """Firma visiva: il percorso EVO reso con i pixel quadrati del logo Ciak,
    a piena larghezza sotto il corpo del documento.

    Non e' decorazione. Assolve una funzione informativa — si legge a colpo d'occhio
    a che punto del percorso e' il partner — e riprende l'elemento del marchio
    (i pixel = "analogico che diventa digitale", concept del brand kit).
    """
    ordine = [t["id"] for t in _TRACCIATO]
    idx_corrente = ordine.index(fase_corrente) if fase_corrente in ordine else 0
    blocchi = []
    for i, fase in enumerate(_TRACCIATO):
        stato = "done" if i < idx_corrente else ("now" if i == idx_corrente else "next")
        nota = {"done": "completata", "now": "questa fase", "next": "prossimo passo"}[stato]
        pixel = "".join(f'<i class="px {stato}"></i>' for _ in range(fase["step"]))
        blocchi.append(
            f'<div class="tratto {stato}">'
            f'<div class="px-row">{pixel}</div>'
            f'<span class="tratto-label">{_esc(fase["label"])}</span>'
            f'<span class="tratto-nota">{nota} &middot; {fase["step"]} passi</span>'
            f"</div>"
        )
    durata = ""
    if isinstance(giorni, int) and giorni > 0:
        durata = (
            f'<div class="durata"><span class="durata-n">{giorni}</span>'
            f'<span class="durata-l">giorni<br>di lavoro</span></div>'
        )
    return (
        '<section class="tracciato-banda">'
        '<div class="tracciato-title">Il percorso, in tre fasi</div>'
        f'<div class="tracciato">{"".join(blocchi)}{durata}</div>'
        "</section>"
    )


_CERT_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

/* Brand lock: solo questi quattro colori + il bianco. */
:root{
  --ink:#0F172A;      /* inchiostro  */
  --muted:#64748B;    /* secondario  */
  --line:#E5E7EB;     /* superfici e divider */
  --accent:#FACC15;   /* accento     */
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}

@page{ size:A4 landscape; margin:0; }
html,body{ width:297mm; height:210mm; }
body{
  font-family:'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color:var(--ink); background:#fff;
  padding:14mm 16mm 12mm;
  display:flex; flex-direction:column;
}

/* ── testata ───────────────────────────────────────────── */
.head{ display:flex; align-items:flex-start; justify-content:space-between; }
.logo-ciak{ height:15mm; width:auto; display:block; }
.head-right{ text-align:right; }
.kicker{ font-size:8.5pt; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); }
.doc-id{ font-size:8.5pt; font-weight:500; color:var(--muted); margin-top:1mm; }
.rule{ height:2.5px; background:var(--accent); margin:6mm 0 0; }

/* ── corpo ─────────────────────────────────────────────── */
/* Il corpo prende l'altezza del CONTENUTO, non tutta la pagina: distribuire il
   vuoto fra i blocchi apriva due buchi morti e faceva scendere il filo verticale
   in mezzo al niente (rilevato ai render 1 e 2). L'aria residua sta tutta in un
   respiro solo, sopra il piede — che resta ancorato in basso. */
.body{ display:flex; gap:14mm; padding-top:10mm; align-items:stretch; }
.col-main{ flex:1.35; display:flex; flex-direction:column; }
.col-side{ flex:1; border-left:1px solid var(--line); padding-left:12mm; }

.eyebrow{ font-size:8.5pt; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); }

/* Su un attestato il protagonista e' la persona, non il nome della fase. */
.nome-partner{
  font-size:42pt; font-weight:700; line-height:1.05; letter-spacing:-.025em;
  margin-top:3mm; display:inline-block; padding-bottom:3mm;
  border-bottom:3px solid var(--accent);
}
.accademia{ font-size:11.5pt; font-weight:500; color:var(--muted); margin-top:4mm; max-width:105mm; line-height:1.4; }

.fase-blocco{ margin-top:11mm; }
.fase-label{ font-size:11pt; font-weight:600; letter-spacing:.04em; }
.fase-label .num{ color:var(--muted); font-weight:500; }
.fase-tagline{ font-size:11pt; font-weight:400; color:var(--muted); margin-top:1.5mm; }

/* ── colonna destra: cosa e' stato completato ──────────── */
.side-title{ font-size:8.5pt; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); }
.voci{ list-style:none; margin-top:6mm; }
.voci li{
  font-size:11pt; font-weight:500; line-height:1.45;
  padding:0 0 4.5mm 7mm; position:relative;
}
.voci li:before{
  content:""; position:absolute; left:0; top:2.1mm;
  width:2.6mm; height:2.6mm; background:var(--accent);
}
.chiusura{ font-size:10pt; line-height:1.6; color:var(--muted); margin-top:5mm; padding-top:5mm; border-top:1px solid var(--line); }

/* ── firma visiva: il tracciato a pixel, a piena larghezza ─────────
   I pixel quadrati vengono dal marchio Ciak (analogico -> digitale). Qui
   dicono a colpo d'occhio dove sta il partner nel percorso: e' informazione,
   non ornamento. */
.tracciato-banda{ margin-top:auto; padding-top:7mm; border-top:1px solid var(--line); }
.tracciato-title{ font-size:8.5pt; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); }
/* gap fisso + durata spinta a destra: con space-between, quando la durata manca,
   l'ultimo tratto finiva incollato al margine. */
.tracciato{ display:flex; align-items:flex-end; gap:18mm; margin-top:6mm; }
.tratto-label{ font-size:10pt; font-weight:600; letter-spacing:.02em; color:var(--muted); display:block; margin-top:3mm; }
.tratto.now .tratto-label{ color:var(--ink); }
.tratto-nota{ font-size:8pt; font-weight:400; color:var(--muted); display:block; margin-top:.8mm; }
.tratto.now .tratto-nota{ color:var(--ink); }
.px-row{ display:flex; gap:1.4mm; }
.px{ width:4mm; height:4mm; display:block; }
.px.done{ background:var(--muted); }
.px.now{ background:var(--accent); }
.px.next{ background:#fff; border:1px solid var(--line); }

.durata{ display:flex; align-items:baseline; gap:2.5mm; padding-left:9mm; border-left:1px solid var(--line); margin-left:auto; }
.durata-n{ font-size:30pt; font-weight:700; line-height:1; letter-spacing:-.03em; }
.durata-l{ font-size:9pt; font-weight:500; color:var(--muted); line-height:1.3; }

/* ── piede ─────────────────────────────────────────────── */
.foot{ display:flex; align-items:flex-end; justify-content:space-between; border-top:1px solid var(--line); padding-top:5mm; margin-top:7mm; }
.foot-left{ font-size:8.5pt; color:var(--muted); line-height:1.6; }
.foot-left strong{ color:var(--ink); font-weight:600; }
.powered{ display:flex; align-items:center; gap:2.5mm; margin-top:3mm; }
.powered span{ font-size:7.5pt; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.logo-evo{ height:5.5mm; width:auto; display:block; }
.foot-right{ text-align:right; }
.firma{ font-size:13pt; font-weight:600; color:var(--ink); }
.firma-ruolo{ font-size:8pt; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin-top:1mm; }
"""


def render_certificato_html(
    partner_name: str,
    accademia_name: str = "",
    macro_fase_id: str = "esamina",
    date_str: str = "",
    partner_id: str = "",
    giorni=None,
) -> str:
    """Genera l'HTML del Certificato Ufficiale di Completamento Macro-Fase.

    `giorni` = durata reale della fase (partner_rewards._phase_days). Se assente
    il blocco durata non viene stampato: meglio tacere che stimare.
    """
    fase_id = (macro_fase_id or "esamina").lower()
    cfg = MACRO_PHASE_CERT_CONFIG.get(fase_id, MACRO_PHASE_CERT_CONFIG["esamina"])

    p_name = _esc(partner_name or "Partner Ciak")
    a_name = _esc(accademia_name or "")
    date_str = _esc(date_str) if date_str else datetime.utcnow().strftime("%d/%m/%Y")
    codice = codice_verifica(partner_id or partner_name, fase_id)

    logo_ciak = _img_tag(_CIAK_LOGO, "image/webp", "logo-ciak", "Ciak Si Cambia")
    logo_evo = _img_tag(_EVO_LOGO, "image/png", "logo-evo", "Evolution PRO")
    voci = "".join(f"<li>{_esc(v)}</li>" for v in cfg["voci"])

    return f"""<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Attestato {_esc(cfg['nome'])} di {p_name}</title>
  <style>{_CERT_CSS}</style>
</head>
<body>
  <header class="head">
    {logo_ciak}
    <div class="head-right">
      <div class="kicker">Metodo EVO &middot; Attestato di fase</div>
      <div class="doc-id">{codice} &middot; {date_str}</div>
    </div>
  </header>
  <div class="rule"></div>

  <main class="body">
    <div class="col-main">
      <div>
        <div class="eyebrow">Attestato di completamento &middot; rilasciato a</div>
        <h1 class="nome-partner">{p_name}</h1>
        {f'<div class="accademia">{a_name}</div>' if a_name else ''}
      </div>

      <div class="fase-blocco">
        <div class="fase-label"><span class="num">Fase {_esc(cfg['numero'])} &middot;</span> {_esc(cfg['nome'])}</div>
        <div class="fase-tagline">{_esc(cfg['tagline'])}</div>
      </div>
    </div>

    <aside class="col-side">
      <div class="side-title">Completato in questa fase</div>
      <ul class="voci">{voci}</ul>
      <p class="chiusura">{_esc(cfg['chiusura'])}</p>
    </aside>
  </main>

  {_tracciato_html(fase_id, giorni)}

  <footer class="foot">
    <div class="foot-left">
      <strong>Ciak Si Cambia</strong> &middot; ciak.io<br>
      Codice di verifica {codice}
      <div class="powered"><span>Powered by</span>{logo_evo}</div>
    </div>
    <div class="foot-right">
      <div class="firma">Claudio Bertogliatti</div>
      <div class="firma-ruolo">Fondatore &middot; Metodo EVO</div>
    </div>
  </footer>
</body>
</html>"""


async def genera_certificato_pdf(
    partner_name: str,
    accademia_name: str = "",
    macro_fase_id: str = "esamina",
    date_str: str = "",
    partner_id: str = "",
    giorni=None,
) -> bytes:
    """Genera i bytes PDF in formato A4 landscape del Certificato via Playwright."""
    from playwright.async_api import async_playwright

    html_content = render_certificato_html(
        partner_name, accademia_name, macro_fase_id, date_str, partner_id, giorni
    )
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
