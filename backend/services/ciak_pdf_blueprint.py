"""
Renderer del Blueprint DEFINITIVO — 13 sezioni, layout A4 Evolution PRO.

Struttura LOCKATA (Claudio 15/9/2026), copertina + sommario + 13 pagine-sezione:
 01 Sintesi profilo · 02 Livello potenziale · 03 Il tuo mercato e i trend ·
 04 Competitor e spazio libero · 05 Il tuo pubblico · 06 Problema principale ·
 07 Punti di forza · 08 Punti limitanti · 09 La tua accademia (moduli) ·
 10 Rischio principale · 11 Cosa manca davvero · 12 La roadmap · 13 Prossimo passo.

Prezzi/listino e casi studio con numeri NON stanno qui (vanno nella proposta
commerciale). Il contenuto dinamico arriva da `payload` (vedi BLUEPRINT_SCHEMA
in fondo). Il rendering HTML→PDF passa da services.ciak_pdf.html_to_pdf (playwright).
"""
import html as _html
from typing import Any

_BRAND = 'EVOLUTION<span class="accent"> PRO</span>'


def _esc(s: Any) -> str:
    return _html.escape(str(s or ""))


# ─── CSS (dal template A4 approvato) ─────────────────────────────────────────
_CSS = """
:root{--ink:#101326;--navy:#0D2952;--accent:#FBC002;--muted:#64748B;--soft:#94a3b8;--border:#E5E7EB;--surface:#F8FAFC;--white:#fff}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:"Poppins",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:#fff;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{margin:0;line-height:1.12;letter-spacing:-.02em;font-weight:800}p{margin:0}.accent{color:var(--accent)}
.page{position:relative;width:210mm;min-height:297mm;background:var(--white);overflow:hidden;padding:15mm 17mm 12mm;display:flex;flex-direction:column;break-after:page}
.page:last-child{break-after:auto}
.page.dark{background:linear-gradient(158deg,#0D2952 0%,#101326 72%);color:#fff}
.page.surface{background:var(--surface)}
.brand{font-size:11pt;font-weight:800;letter-spacing:-.02em}.brand .accent{color:var(--accent)}
.rhead{display:flex;justify-content:space-between;align-items:center;z-index:2;font-size:8.5pt;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);font-weight:600}
.dark .rhead{color:#7f93b3}
.rfoot{display:flex;justify-content:space-between;align-items:center;z-index:2;font-size:8pt;letter-spacing:.06em;color:var(--soft);padding-top:5mm;border-top:1px solid var(--border);font-weight:500;margin-top:auto}
.dark .rfoot{color:#7f93b3;border-top-color:rgba(255,255,255,.14)}
.pbody{flex:1;display:flex;flex-direction:column;justify-content:flex-start;position:relative;z-index:2;padding:14mm 0 0}.pbody.top{padding-top:10mm}
.wm{position:absolute;top:6mm;right:12mm;font-size:210px;font-weight:800;line-height:.8;color:rgba(16,19,38,.035);z-index:0;letter-spacing:-.04em}.dark .wm{color:rgba(255,255,255,.05)}
.eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:9.5pt;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);margin-bottom:14px}
.eyebrow::before{content:"";width:26px;height:2px;background:var(--accent)}.dark .eyebrow{color:#9fb3d1}
h2.title{font-size:28pt;letter-spacing:-.025em;margin-bottom:16px}.dark h2.title{color:#fff}
.lead{font-size:13pt;line-height:1.5;color:#334155;font-weight:500;max-width:62ch}.dark .lead{color:#c9d6ea}
.body{font-size:11pt;line-height:1.6;color:#475569;max-width:64ch;margin-top:14px}.dark .body{color:#b9c7de}
.note{font-size:9.5pt;color:var(--muted);margin-top:16px;max-width:62ch}
.cover{padding:0;background:linear-gradient(158deg,#0D2952 0%,#101326 72%);color:#fff}
.cover .cin{position:relative;z-index:2;min-height:267mm;display:flex;flex-direction:column;padding:18mm}
.cover .cbar{position:absolute;top:0;left:0;height:6px;width:100%;background:linear-gradient(90deg,var(--accent) 0%,var(--accent) 32%,transparent 32%)}
.cover-top{display:flex;justify-content:space-between;align-items:center;padding-bottom:40mm;border-bottom:1px solid rgba(255,255,255,.14)}
.cover-top .ct{text-align:right;font-size:8.5pt;letter-spacing:.16em;text-transform:uppercase;color:#9fb3d1;line-height:1.9;font-weight:600}
.cover-mid{flex:1;display:flex;flex-direction:column;justify-content:center}
.cover .dt{font-size:10pt;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:22px}
.cover h1{font-size:46pt;letter-spacing:-.035em;line-height:1}.cover h1 .y{color:var(--accent)}
.cover .sub{margin-top:26px;font-size:14pt;font-weight:500;color:#c9d6ea;max-width:40ch;line-height:1.5}
.cover-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding-top:26px;border-top:1px solid rgba(255,255,255,.14)}
.cover-meta .k{font-size:8pt;letter-spacing:.14em;text-transform:uppercase;color:#7f93b3;font-weight:600;margin-bottom:5px}.cover-meta .v{font-size:10.5pt;font-weight:600;color:#fff}
.toc-list{margin-top:5mm;display:grid;grid-template-columns:1fr 1fr;gap:0 34px}
.toc-row{display:grid;grid-template-columns:40px 1fr;align-items:baseline;gap:14px;padding:9px 0;border-bottom:1px solid var(--border)}
.toc-row .tn{font-size:13pt;font-weight:800;color:var(--accent)}.toc-row .tt{font-size:11.5pt;font-weight:600;color:var(--ink)}.toc-row .td{font-size:9pt;color:var(--muted)}
.cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:20px}
.card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:0 6px 18px rgba(16,19,38,.06)}
.card h4{font-size:12pt;font-weight:700;margin-bottom:6px}.card p{font-size:10pt;color:#475569;line-height:1.5}
.diag{display:grid;grid-template-columns:1fr 1fr;gap:0;border-radius:16px;overflow:hidden;border:1px solid var(--border);margin-top:20px}
.diag .col{padding:24px 22px}.diag .col.answer{background:var(--ink);color:#fff}.diag .col.problem{background:var(--surface)}
.diag h4{font-size:9.5pt;letter-spacing:.13em;text-transform:uppercase;font-weight:700;margin-bottom:14px}.diag .col.answer h4{color:var(--accent)}.diag .col.problem h4{color:var(--muted)}
.diag ul{margin:0;padding:0;list-style:none}.diag li{position:relative;padding-left:22px;margin-bottom:11px;font-size:10.5pt;line-height:1.45}
.diag .col.answer li{color:#dbe4f2}.diag .col.answer li::before{content:"";position:absolute;left:2px;top:6px;width:8px;height:8px;background:var(--accent);transform:rotate(45deg)}
.diag .col.problem li{color:#334155}.diag .col.problem li::before{content:"";position:absolute;left:0;top:7px;width:7px;height:7px;border-radius:50%;background:#cbd5e1}
.callout{margin-top:22px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:20px 22px;display:flex;gap:16px;align-items:flex-start}
.callout .b{flex:0 0 auto;width:36px;height:36px;border-radius:10px;background:var(--accent);color:var(--ink);display:grid;place-items:center;font-weight:800;font-size:15pt}
.callout p{font-size:11pt;line-height:1.55;color:#dbe4f2}.callout b{color:#fff}
.missing{display:flex;flex-direction:column;gap:10px;margin-top:20px}
.miss{background:#fff;border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:12px;padding:14px 18px}
.miss h4{font-size:11.5pt;font-weight:700;margin-bottom:3px}.miss p{font-size:10pt;color:#475569;line-height:1.45}
.miss.mut{border-left-color:#cbd5e1}.miss.line h4{font-weight:600;font-size:11.5pt;line-height:1.4;margin-bottom:0}
.contrast{display:flex;flex-direction:column;gap:14px;margin-top:20px}
.cx{display:flex;gap:14px;align-items:flex-start}.cx .x{flex:0 0 auto;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:12pt;font-weight:800}
.cx.no .x{background:rgba(244,63,94,.16);color:#fda4af}.cx.yes .x{background:var(--accent);color:var(--ink)}
.cx p{margin:0;font-size:11pt;line-height:1.5;color:#dbe4f2}.cx.yes p{color:#fff}
.trend{display:flex;flex-direction:column;gap:11px;margin-top:18px}
.trend .t{display:flex;gap:13px;align-items:flex-start;background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 18px}
.trend .t .ar{color:var(--accent);font-weight:800;font-size:13pt;line-height:1.2}.trend .t p{font-size:10.5pt;color:#475569;line-height:1.5}
.tbl{width:100%;border-collapse:collapse;margin-top:18px;font-size:10pt}
.tbl th{text-align:left;font-size:8.5pt;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700;padding:0 12px 9px;border-bottom:2px solid var(--accent)}
.tbl td{padding:12px;border-bottom:1px solid var(--border);color:#334155;line-height:1.45;vertical-align:top}.tbl td .mt{font-weight:700;color:var(--ink)}
.steps{margin-top:18px;display:flex;flex-direction:column;gap:0}
.step{display:grid;grid-template-columns:34px 1fr;gap:16px;padding:12px 0;border-bottom:1px solid var(--border)}
.step .sn{width:30px;height:30px;border-radius:50%;background:var(--ink);color:var(--accent);display:grid;place-items:center;font-weight:800;font-size:11pt}
.step .st{font-size:11.5pt;font-weight:700;color:var(--ink)}.step .sd{font-size:10pt;color:#64748B;margin-top:2px;line-height:1.45}
@media print{@page{size:A4;margin:0}.page{break-after:page}.page:last-child{break-after:auto}}
"""

# Metadati LOCKATI delle 13 sezioni: (key, numero, titolo sommario, descrizione sommario, classe pagina)
_SEZIONI = [
    ("sintesi", "01", "Sintesi del profilo", "Il tuo punto di partenza", ""),
    ("potenziale", "02", "Livello di potenziale", "Cosa c'è già e cosa manca", "surface"),
    ("mercato", "03", "Il tuo mercato e i trend", "Dove soffia il vento", ""),
    ("competitor", "04", "Competitor e spazio libero", "Chi c'è già e dove sei tu", "surface"),
    ("pubblico", "05", "Il tuo pubblico", "A chi parli, per primo", ""),
    ("problema", "06", "Problema principale", "Il vero blocco", ""),
    ("forza", "07", "Punti di forza", "Cosa gioca a tuo favore", "surface"),
    ("limiti", "08", "Punti limitanti", "Cosa ancora frena", ""),
    ("accademia", "09", "La tua accademia", "La struttura del percorso", "surface"),
    ("rischio", "10", "Rischio principale", "Se non cambi passo", "dark"),
    ("manca", "11", "Cosa manca davvero", "Gli elementi da costruire", ""),
    ("roadmap", "12", "La roadmap", "Le fasi per arrivarci", "surface"),
    ("prossimo", "13", "Il prossimo passo", "Le due strade davanti a te", "dark"),
]


def _title_html(title: str, accent: str) -> str:
    t = _esc(title)
    if accent:
        return f'{t}<br><span class="accent">{_esc(accent)}</span>'
    return t


def _page(num: str, cls: str, foot: str, inner: str) -> str:
    c = (" " + cls) if cls else ""
    return (
        f'<section class="page{c}">'
        f'<div class="rhead"><div class="brand">{_BRAND}</div><span>Analisi Strategica</span></div>'
        f'<div class="wm">{num}</div>'
        f'<div class="pbody{" top" if cls in ("surface","") else ""}">{inner}</div>'
        f'<div class="rfoot"><span>{_esc(foot)}</span><span>Evolution PRO</span></div>'
        f'</section>'
    )


# ─── Componenti per tipo di sezione ──────────────────────────────────────────

def _c_prosa(s, num):
    h = f'<div class="eyebrow">{num} · {_esc(s.get("eyebrow"))}</div>'
    h += f'<h2 class="title">{_title_html(s.get("title",""), s.get("accent",""))}</h2>'
    if s.get("lead"):
        h += f'<p class="lead">{_esc(s["lead"])}</p>'
    if s.get("body"):
        h += f'<p class="body">{_esc(s["body"])}</p>'
    if s.get("note"):
        h += f'<p class="note">{_esc(s["note"])}</p>'
    return h


def _c_cards(s, num):
    cards = "".join(
        f'<div class="card"><h4>{_esc(c.get("h"))}</h4><p>{_esc(c.get("p"))}</p></div>'
        for c in (s.get("cards") or [])
    )
    lead = f'<p class="lead">{_esc(s["lead"])}</p>' if s.get("lead") else ""
    return (f'<div class="eyebrow">{num} · {_esc(s.get("eyebrow"))}</div>'
            f'<h2 class="title">{_title_html(s.get("title",""), s.get("accent",""))}</h2>'
            f'{lead}<div class="cards3">{cards}</div>')


def _c_trend(s, num):
    items = "".join(f'<div class="t"><span class="ar">↗</span><p>{_esc(x)}</p></div>' for x in (s.get("trend") or []))
    lead = f'<p class="lead">{_esc(s["lead"])}</p>' if s.get("lead") else ""
    note = f'<p class="note">{_esc(s["note"])}</p>' if s.get("note") else ""
    return (f'<div class="eyebrow">{num} · {_esc(s.get("eyebrow"))}</div>'
            f'<h2 class="title">{_title_html(s.get("title",""), s.get("accent",""))}</h2>'
            f'{lead}<div class="trend">{items}</div>{note}')


def _c_competitor(s, num):
    pres = "".join(f'<li>{_esc(x)}</li>' for x in (s.get("presidia") or []))
    spaz = "".join(f'<li>{_esc(x)}</li>' for x in (s.get("spazio") or []))
    return (f'<div class="eyebrow">{num} · {_esc(s.get("eyebrow"))}</div>'
            f'<h2 class="title">{_title_html(s.get("title",""), s.get("accent",""))}</h2>'
            f'<div class="diag"><div class="col problem"><h4>Chi presidia il mercato</h4><ul>{pres}</ul></div>'
            f'<div class="col answer"><h4>Il tuo spazio</h4><ul>{spaz}</ul></div></div>')


def _c_tabella_pubblico(s, num):
    rows = "".join(
        f'<tr><td class="mt">{_esc(r.get("segmento"))}</td><td>{_esc(r.get("chi"))}</td><td>{_esc(r.get("cerca"))}</td></tr>'
        for r in (s.get("segmenti") or [])
    )
    lead = f'<p class="lead" style="margin-top:6px">{_esc(s["lead"])}</p>' if s.get("lead") else ""
    return (f'<div class="eyebrow">{num} · {_esc(s.get("eyebrow"))}</div>'
            f'<h2 class="title">{_title_html(s.get("title",""), s.get("accent",""))}</h2>{lead}'
            f'<table class="tbl"><tr><th>Segmento</th><th>Chi sono</th><th>Cosa cercano</th></tr>{rows}</table>')


def _c_moduli(s, num):
    rows = "".join(
        f'<tr><td class="mt">{_esc(m.get("titolo"))}</td><td>{_esc(m.get("contenuto"))}</td></tr>'
        for m in (s.get("moduli") or [])
    )
    lead = f'<p class="lead" style="margin-top:6px">{_esc(s["lead"])}</p>' if s.get("lead") else ""
    return (f'<div class="eyebrow">{num} · {_esc(s.get("eyebrow"))}</div>'
            f'<h2 class="title">{_title_html(s.get("title",""), s.get("accent",""))}</h2>{lead}'
            f'<table class="tbl"><tr><th>Modulo</th><th>Contenuto principale</th></tr>{rows}</table>')


def _c_lista(s, num, mut=False):
    cls = "miss mut line" if mut else "miss line"
    items = "".join(f'<div class="{cls}"><h4>{_esc(x)}</h4></div>' for x in (s.get("punti") or []))
    lead = f'<p class="lead" style="margin-top:6px">{_esc(s["lead"])}</p>' if s.get("lead") else ""
    return (f'<div class="eyebrow">{num} · {_esc(s.get("eyebrow"))}</div>'
            f'<h2 class="title">{_title_html(s.get("title",""), s.get("accent",""))}</h2>{lead}'
            f'<div class="missing">{items}</div>')


def _c_manca(s, num):
    items = "".join(
        f'<div class="miss"><h4>{i+1} · {_esc(x.get("h"))}</h4><p>{_esc(x.get("p"))}</p></div>'
        for i, x in enumerate(s.get("items") or [])
    )
    return (f'<div class="eyebrow">{num} · {_esc(s.get("eyebrow"))}</div>'
            f'<h2 class="title">{_title_html(s.get("title",""), s.get("accent",""))}</h2>'
            f'<div class="missing">{items}</div>')


def _c_rischio(s, num):
    lead = f'<p class="lead">{_esc(s["lead"])}</p>' if s.get("lead") else ""
    call = f'<div class="callout"><div class="b">!</div><p>{s.get("callout","")}</p></div>' if s.get("callout") else ""
    return (f'<div class="eyebrow">{num} · {_esc(s.get("eyebrow"))}</div>'
            f'<h2 class="title">{_title_html(s.get("title",""), s.get("accent",""))}</h2>{lead}{call}')


def _c_roadmap(s, num):
    steps = "".join(
        f'<div class="step"><div class="sn">{i+1}</div><div><div class="st">{_esc(x.get("titolo"))}</div>'
        f'<div class="sd">{_esc(x.get("desc"))}</div></div></div>'
        for i, x in enumerate(s.get("steps") or [])
    )
    lead = f'<p class="lead" style="margin-top:6px">{_esc(s["lead"])}</p>' if s.get("lead") else ""
    return (f'<div class="eyebrow">{num} · {_esc(s.get("eyebrow"))}</div>'
            f'<h2 class="title">{_title_html(s.get("title",""), s.get("accent",""))}</h2>{lead}'
            f'<div class="steps">{steps}</div>')


def _c_prossimo(s, num):
    yes = "".join(f'<div class="cx yes"><span class="x">✓</span><p>{_esc(x)}</p></div>' for x in (s.get("yes") or []))
    no = f'<div class="cx no"><span class="x">✕</span><p>{_esc(s.get("no"))}</p></div>' if s.get("no") else ""
    lead = f'<p class="lead">{_esc(s["lead"])}</p>' if s.get("lead") else ""
    chius = (f'<div class="callout" style="margin-top:26px"><div class="b">→</div><p>{s.get("chiusura","")}</p></div>'
             if s.get("chiusura") else "")
    return (f'<div class="eyebrow">{num} · {_esc(s.get("eyebrow"))}</div>'
            f'<h2 class="title">{_title_html(s.get("title",""), s.get("accent",""))}</h2>{lead}'
            f'<div class="contrast">{no}{yes}</div>{chius}')


_RENDERERS = {
    "sintesi": _c_prosa, "potenziale": _c_cards, "mercato": _c_trend,
    "competitor": _c_competitor, "pubblico": _c_tabella_pubblico, "problema": _c_prosa,
    "forza": lambda s, n: _c_lista(s, n, mut=False), "limiti": lambda s, n: _c_lista(s, n, mut=True),
    "accademia": _c_moduli, "rischio": _c_rischio, "manca": _c_manca,
    "roadmap": _c_roadmap, "prossimo": _c_prossimo,
}


def render_blueprint_html(payload: dict) -> str:
    """Genera l'HTML A4 del Blueprint definitivo dalle 13 sezioni in `payload`.

    payload = {"meta": {nome, progetto, accent_progetto, ambito, data, sub},
               "sezioni": {key: {...}}}  (vedi BLUEPRINT_SCHEMA sotto).
    """
    meta = payload.get("meta", {}) or {}
    sez = payload.get("sezioni", {}) or {}
    nome = _esc(meta.get("nome", "Cliente"))
    progetto = _esc(meta.get("progetto", "Analisi Strategica"))
    accent_prog = _esc(meta.get("accent_progetto", ""))
    foot = f'Progetto {progetto} — {nome}' if accent_prog == "" else f'Progetto {progetto} {accent_prog} — {nome}'
    prog_h = progetto + (f'<br><span class="y">{accent_prog}</span>' if accent_prog else "")

    # copertina
    cover = (
        '<section class="page cover"><div class="cbar"></div><div class="cin">'
        f'<div class="cover-top"><div class="brand" style="color:#fff;font-size:15pt">{_BRAND}</div>'
        '<div class="ct">Analisi Strategica<br>Evolution PRO</div></div>'
        '<div class="cover-mid"><div class="dt">Analisi Strategica di Posizionamento</div>'
        f'<h1>{prog_h}</h1>'
        f'<div class="sub">{_esc(meta.get("sub", "La lettura del tuo punto di partenza e del passo giusto per trasformare la tua competenza in un percorso che vende — restando tuo al 100%."))}</div></div>'
        '<div class="cover-meta">'
        f'<div><div class="k">Preparato per</div><div class="v">{nome}</div></div>'
        '<div><div class="k">Preparato da</div><div class="v">Claudio e il team Evolution PRO</div></div>'
        f'<div><div class="k">Data</div><div class="v">{_esc(meta.get("data",""))}</div></div>'
        f'<div><div class="k">Ambito</div><div class="v">{_esc(meta.get("ambito",""))}</div></div>'
        '</div></div></section>'
    )

    # sommario
    toc_rows = "".join(
        f'<div class="toc-row"><span class="tn">{n}</span><div><div class="tt">{_esc(t)}</div>'
        f'<div class="td">{_esc(d)}</div></div></div>'
        for (_k, n, t, d, _c) in _SEZIONI
    )
    sommario = (
        '<section class="page surface">'
        f'<div class="rhead"><div class="brand">{_BRAND}</div><span>Analisi Strategica</span></div>'
        '<div class="pbody top"><div class="eyebrow">Sommario</div>'
        '<h2 class="title">Cosa troverai in <span class="accent">questa analisi.</span></h2>'
        '<p class="lead" style="margin-top:6px">Tredici passaggi: dalla lettura del profilo al mercato, al percorso, fino alla mossa giusta.</p>'
        f'<div class="toc-list">{toc_rows}</div></div>'
        f'<div class="rfoot"><span>{_esc(foot)}</span><span>Evolution PRO</span></div></section>'
    )

    # 13 pagine-sezione
    pages = []
    for (key, num, titolo_toc, _d, cls) in _SEZIONI:
        s = dict(sez.get(key, {}) or {})
        s.setdefault("eyebrow", titolo_toc)
        inner = _RENDERERS[key](s, num)
        pages.append(_page(num, cls, foot, inner))

    return (
        '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">'
        '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">'
        f'<style>{_CSS}</style></head><body>'
        + cover + sommario + "".join(pages) +
        '</body></html>'
    )


async def genera_blueprint_pdf(payload: dict) -> bytes:
    """Blueprint 13 sezioni → PDF bytes (playwright A4)."""
    from services.ciak_pdf import html_to_pdf
    return await html_to_pdf(render_blueprint_html(payload))


# Contratto dati che il generatore (Carlo, Fase 2) deve produrre.
BLUEPRINT_SCHEMA = {
    "meta": {"nome": "str", "progetto": "str", "accent_progetto": "str", "ambito": "str", "data": "str", "sub": "str?"},
    "sezioni": {
        "sintesi": {"title": "str", "accent": "str", "lead": "str", "body": "str", "note": "str?"},
        "potenziale": {"title": "str", "accent": "str", "lead": "str", "cards": [{"h": "str", "p": "str"}]},
        "mercato": {"title": "str", "accent": "str", "lead": "str", "trend": ["str"], "note": "str?"},
        "competitor": {"title": "str", "accent": "str", "presidia": ["str"], "spazio": ["str"]},
        "pubblico": {"title": "str", "accent": "str", "lead": "str", "segmenti": [{"segmento": "str", "chi": "str", "cerca": "str"}]},
        "problema": {"title": "str", "accent": "str", "lead": "str", "body": "str"},
        "forza": {"title": "str", "accent": "str", "punti": ["str"]},
        "limiti": {"title": "str", "accent": "str", "punti": ["str"]},
        "accademia": {"title": "str", "accent": "str", "lead": "str", "moduli": [{"titolo": "str", "contenuto": "str"}]},
        "rischio": {"title": "str", "accent": "str", "lead": "str", "callout": "str(html-safe)"},
        "manca": {"title": "str", "accent": "str", "items": [{"h": "str", "p": "str"}]},
        "roadmap": {"title": "str", "accent": "str", "lead": "str", "steps": [{"titolo": "str", "desc": "str"}]},
        "prossimo": {"title": "str", "accent": "str", "lead": "str", "no": "str", "yes": ["str"], "chiusura": "str(html-safe)"},
    },
}
