"""
funnel_templates_pro.py — Template funnel OWNED professionali e conversion-first.

Shell premium NEUTRA (dark hero + sezioni bianche) con UN solo accento brand che
si adatta al colore del partner (dal BrandKit). Il contrasto del testo sull'accento
è calcolato dalla luminanza (colore chiaro → testo scuro, colore scuro → testo bianco).

Dependency-free (solo stdlib): importabile e testabile senza fastapi/motor.
Placeholder stile {KEY} — stesso approccio di routers/funnel_builder.py.
"""
from __future__ import annotations


# ── Brand helpers ───────────────────────────────────────────────────────────
def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = (hex_color or "").lstrip("#").strip()
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    try:
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except (ValueError, IndexError):
        return 245, 197, 24  # fallback: brand yellow


def brand_vars(colore_brand: str | None) -> dict[str, str]:
    """Da un colore brand (hex) → variabili per il template (accento + contrasto)."""
    hex_color = colore_brand or "#F5C518"
    if not hex_color.startswith("#"):
        hex_color = "#" + hex_color
    r, g, b = _hex_to_rgb(hex_color)
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    ink = "#0F172A" if luminance > 0.6 else "#FFFFFF"
    return {
        "BRAND_COLOR": hex_color,
        "BRAND_INK": ink,          # testo sopra l'accento
        "BRAND_RGB": f"{r},{g},{b}",  # per rgba() (glow, focus, tinte)
    }


def render(template: str, params: dict) -> str:
    out = template
    for key, value in params.items():
        out = out.replace("{" + key + "}", "" if value is None else str(value))
    return out


# ── OPT-IN LANDING (goal: visitatore → lead che guarda la masterclass) ───────
OPTIN_TEMPLATE = r"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{META_TITLE}</title>
<meta name="description" content="{META_DESC}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --brand:{BRAND_COLOR};--brand-ink:{BRAND_INK};--brand-rgb:{BRAND_RGB};
    --ink:#0F172A;--ink-soft:#475569;--line:#E5E7EB;--bg:#FFFFFF;--bg-soft:#F8FAFC;
    --night:#0B1120;--night-2:#111a2e;--radius:16px;--shadow:0 20px 50px -20px rgba(2,6,23,.35);
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:Inter,system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased}
  h1,h2,h3,.font-display{font-family:Sora,system-ui,sans-serif;line-height:1.1;letter-spacing:-.02em}
  img{max-width:100%;display:block}
  .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
  a{color:inherit}
  .topbar{position:sticky;top:0;z-index:30;background:rgba(11,17,32,.85);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.08)}
  .topbar .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
  .brand{display:flex;align-items:center;gap:10px;color:#fff;font-family:Sora;font-weight:700;font-size:17px}
  .brand .dot{width:30px;height:30px;border-radius:9px;background:var(--brand);color:var(--brand-ink);display:grid;place-items:center;font-weight:800}
  .btn-mini{display:inline-flex;align-items:center;gap:8px;background:var(--brand);color:var(--brand-ink);font-family:Sora;font-weight:700;font-size:14px;padding:10px 18px;border-radius:10px;text-decoration:none;transition:filter .2s;cursor:pointer}
  .btn-mini:hover{filter:brightness(1.06)}
  .hero{position:relative;background:radial-gradient(1200px 600px at 80% -10%,rgba(var(--brand-rgb),.16),transparent 60%),linear-gradient(180deg,var(--night),var(--night-2));color:#fff;overflow:hidden}
  .hero::after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px);background-size:26px 26px;opacity:.5;pointer-events:none}
  .hero .wrap{position:relative;z-index:1;display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;padding-top:64px;padding-bottom:80px}
  .eyebrow{display:inline-flex;align-items:center;gap:9px;background:rgba(var(--brand-rgb),.12);border:1px solid rgba(var(--brand-rgb),.35);color:var(--brand);font-family:Sora;font-weight:600;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;padding:7px 14px;border-radius:999px}
  .hero h1{font-size:52px;font-weight:800;margin:22px 0 0}
  .hero h1 .hl{color:var(--brand)}
  .hero .sub{font-size:19px;color:#cbd5e1;margin-top:20px;max-width:33ch}
  .proof{display:flex;align-items:center;gap:14px;margin-top:28px}
  .avatars{display:flex}
  .avatars span{width:38px;height:38px;border-radius:50%;border:2px solid var(--night-2);margin-left:-10px;background:linear-gradient(135deg,#334155,#475569);display:grid;place-items:center;font-size:12px;font-weight:700;color:#e2e8f0}
  .avatars span:first-child{margin-left:0}
  .proof small{color:#94a3b8;font-size:13.5px}
  .proof strong{color:#fff}
  .optin{background:#fff;color:var(--ink);border-radius:var(--radius);padding:30px;box-shadow:var(--shadow);border:1px solid rgba(255,255,255,.6)}
  .optin .kicker{display:flex;align-items:center;gap:9px;font-family:Sora;font-weight:700;font-size:15px}
  .optin .kicker .badge{background:var(--brand);color:var(--brand-ink);font-size:11px;font-weight:800;letter-spacing:.06em;padding:4px 9px;border-radius:6px;text-transform:uppercase}
  .optin h3{font-size:22px;margin:14px 0 6px}
  .optin p.lead{color:var(--ink-soft);font-size:14.5px;margin-bottom:18px}
  .field{margin-bottom:12px}
  .field label{display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:6px}
  .field input{width:100%;font-size:15px;font-family:Inter;padding:13px 15px;border:1.5px solid var(--line);border-radius:11px;outline:none;transition:border-color .15s,box-shadow .15s}
  .field input:focus{border-color:var(--brand);box-shadow:0 0 0 4px rgba(var(--brand-rgb),.18)}
  .btn-cta{width:100%;background:var(--brand);color:var(--brand-ink);font-family:Sora;font-weight:800;font-size:17px;border:none;padding:16px;border-radius:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:10px;transition:filter .2s,transform .05s}
  .btn-cta:hover{filter:brightness(1.05)}
  .btn-cta:active{transform:translateY(1px)}
  .reassure{display:flex;align-items:center;justify-content:center;gap:7px;color:var(--ink-soft);font-size:12.5px;margin-top:13px}
  .reassure svg{color:#16a34a;flex:none}
  .strip{background:var(--night-2);border-top:1px solid rgba(255,255,255,.06);color:#8ea2c0}
  .strip .wrap{display:flex;flex-wrap:wrap;gap:14px 40px;align-items:center;justify-content:center;padding:20px 24px;font-size:13.5px;font-weight:500}
  .strip b{color:#fff;font-family:Sora}
  section{padding:88px 0}
  .sec-eyebrow{font-family:Sora;font-weight:700;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#b45309}
  .sec-h{font-size:38px;font-weight:800;margin:12px 0 0;max-width:20ch}
  .sec-lead{color:var(--ink-soft);font-size:17px;margin-top:14px;max-width:60ch}
  .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:44px}
  .card{background:var(--bg-soft);border:1px solid var(--line);border-radius:var(--radius);padding:26px;transition:transform .2s,box-shadow .2s,border-color .2s}
  .card:hover{transform:translateY(-4px);box-shadow:var(--shadow);border-color:#dbe2ea}
  .ic{width:48px;height:48px;border-radius:12px;background:var(--brand);color:var(--brand-ink);display:grid;place-items:center;margin-bottom:16px}
  .card h3{font-size:18.5px;margin-bottom:8px}
  .card p{color:var(--ink-soft);font-size:14.5px}
  .author{background:var(--bg-soft);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .author .wrap{display:grid;grid-template-columns:280px 1fr;gap:48px;align-items:center}
  .author .photo{aspect-ratio:1;border-radius:20px;background:linear-gradient(135deg,#1e293b,#334155) center/cover;box-shadow:var(--shadow);display:grid;place-items:center;color:#64748b;font-family:Sora;font-weight:700}
  .author h2{font-size:32px;margin:10px 0 8px}
  .author .role{color:#b45309;font-family:Sora;font-weight:700;font-size:14px;letter-spacing:.05em;text-transform:uppercase}
  .author p{color:var(--ink-soft);font-size:16px;max-width:60ch}
  .checks{display:flex;flex-direction:column;gap:10px;margin-top:20px}
  .checks div{display:flex;gap:10px;align-items:flex-start;font-size:15px;font-weight:500}
  .checks svg{color:#16a34a;flex:none;margin-top:3px}
  .band{background:linear-gradient(180deg,var(--night),var(--night-2));color:#fff;text-align:center}
  .band h2{font-size:40px;font-weight:800;max-width:20ch;margin:0 auto}
  .band p{color:#cbd5e1;font-size:18px;margin:18px auto 30px;max-width:52ch}
  .btn-lg{display:inline-flex;align-items:center;gap:11px;background:var(--brand);color:var(--brand-ink);font-family:Sora;font-weight:800;font-size:18px;padding:18px 34px;border-radius:14px;text-decoration:none;transition:filter .2s,transform .05s;cursor:pointer}
  .btn-lg:hover{filter:brightness(1.05)}
  .band small{display:block;color:#94a3b8;margin-top:16px;font-size:13.5px}
  .faq{max-width:760px;margin:0 auto}
  details{border:1px solid var(--line);border-radius:12px;margin-bottom:12px;background:#fff;overflow:hidden}
  details summary{list-style:none;cursor:pointer;padding:20px 22px;font-family:Sora;font-weight:600;font-size:16.5px;display:flex;justify-content:space-between;align-items:center;gap:16px}
  details summary::-webkit-details-marker{display:none}
  details summary .chev{flex:none;transition:transform .2s;color:#94a3b8}
  details[open] summary .chev{transform:rotate(180deg)}
  details .ans{padding:0 22px 20px;color:var(--ink-soft);font-size:15px}
  footer{background:var(--night);color:#8ea2c0;padding:40px 0;font-size:13.5px}
  footer .wrap{display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:center}
  footer a{color:#cbd5e1;text-decoration:none;margin-left:18px}
  footer a:hover{color:#fff}
  @media (max-width:860px){
    .hero .wrap{grid-template-columns:1fr;gap:36px;padding-bottom:56px}
    .hero h1{font-size:38px}.sec-h,.band h2{font-size:29px}
    .grid3{grid-template-columns:1fr}.author .wrap{grid-template-columns:1fr;gap:28px}
    .author .photo{max-width:220px}section{padding:60px 0}
  }
  @media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto}}
</style>
</head>
<body>
<header class="topbar"><div class="wrap">
  <div class="brand"><span class="dot">{BRAND_INIZIALE}</span> {PARTNER_NOME}</div>
  <a href="#optin" class="btn-mini">{CTA_TESTO}
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
</div></header>

<section class="hero"><div class="wrap">
  <div>
    <span class="eyebrow">{HERO_EYEBROW}</span>
    <h1>{H1_PRE}<span class="hl">{H1_HL}</span>{H1_POST}</h1>
    <p class="sub">{HERO_SUB}</p>
    <div class="proof">
      <div class="avatars"><span>{AV1}</span><span>{AV2}</span><span>{AV3}</span><span>{AV4}</span></div>
      <small><strong>{PROOF_STRONG}</strong> {PROOF_TESTO}</small>
    </div>
  </div>
  <div class="optin" id="optin">
    <div class="kicker"><span class="badge">Gratis</span> {OPTIN_KICKER}</div>
    <h3>{OPTIN_H3}</h3>
    <p class="lead">{OPTIN_LEAD}</p>
    <form action="{OPTIN_ACTION}" method="post">
      <div class="field"><label for="n">Il tuo nome</label><input id="n" name="nome" type="text" placeholder="Es. Giulia" autocomplete="given-name" required></div>
      <div class="field"><label for="e">La tua email</label><input id="e" name="email" type="email" placeholder="latuaemail@esempio.it" autocomplete="email" required></div>
      <button class="btn-cta" type="submit">{CTA_TESTO}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
    </form>
    <div class="reassure"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> {OPTIN_REASSURE}</div>
  </div>
</div></section>

<div class="strip"><div class="wrap">
  <span><b>{STRIP_1_B}</b> {STRIP_1_T}</span>
  <span><b>{STRIP_2_B}</b> {STRIP_2_T}</span>
  <span><b>{STRIP_3_B}</b> {STRIP_3_T}</span>
  <span><b>{STRIP_4_B}</b> {STRIP_4_T}</span>
</div></div>

<section><div class="wrap">
  <span class="sec-eyebrow">{LEARN_EYEBROW}</span>
  <h2 class="sec-h">{LEARN_H}</h2>
  <p class="sec-lead">{LEARN_LEAD}</p>
  <div class="grid3">
    <div class="card"><div class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div><h3>{STEP_1_H}</h3><p>{STEP_1_P}</p></div>
    <div class="card"><div class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 13h8M8 17h5"/></svg></div><h3>{STEP_2_H}</h3><p>{STEP_2_P}</p></div>
    <div class="card"><div class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v5M21 7h-5"/></svg></div><h3>{STEP_3_H}</h3><p>{STEP_3_P}</p></div>
  </div>
</div></section>

<div class="author"><div class="wrap">
  <div class="photo" style="{PHOTO_STYLE}">{PHOTO_FALLBACK}</div>
  <div>
    <span class="role">{AUTHOR_ROLE}</span>
    <h2>{PARTNER_NOME}</h2>
    <p>{AUTHOR_BIO}</p>
    <div class="checks">
      <div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> {AUTHOR_CHECK_1}</div>
      <div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> {AUTHOR_CHECK_2}</div>
      <div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> {AUTHOR_CHECK_3}</div>
    </div>
  </div>
</div></div>

<section class="band"><div class="wrap">
  <h2>{BAND_H}</h2>
  <p>{BAND_P}</p>
  <a href="#optin" class="btn-lg">{CTA_TESTO}
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></a>
  <small>{BAND_SMALL}</small>
</div></section>

<section style="background:var(--bg-soft)"><div class="wrap">
  <div style="text-align:center;margin-bottom:40px">
    <span class="sec-eyebrow">Domande frequenti</span>
    <h2 class="sec-h" style="margin-left:auto;margin-right:auto">{FAQ_H}</h2>
  </div>
  <div class="faq">
    <details open><summary>{FAQ_1_Q} <span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></span></summary><div class="ans">{FAQ_1_A}</div></details>
    <details><summary>{FAQ_2_Q} <span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></span></summary><div class="ans">{FAQ_2_A}</div></details>
    <details><summary>{FAQ_3_Q} <span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></span></summary><div class="ans">{FAQ_3_A}</div></details>
  </div>
</div></section>

<footer><div class="wrap">
  <div>© {ANNO} {PARTNER_NOME} · Tutti i diritti riservati</div>
  <div><a href="/privacy.html">Privacy</a><a href="/cookie.html">Cookie</a><a href="/termini.html">Termini</a></div>
</div></footer>
</body>
</html>"""


# Default copy (fallback italiano se il generatore AI non riempie un campo).
OPTIN_DEFAULTS: dict[str, str] = {
    "META_TITLE": "Masterclass gratuita",
    "META_DESC": "Guarda la masterclass gratuita.",
    "BRAND_INIZIALE": "•",
    "PARTNER_NOME": "",
    "HERO_EYEBROW": "Masterclass gratuita · 30 minuti",
    "H1_PRE": "Trasforma la tua competenza in un'",
    "H1_HL": "accademia digitale",
    "H1_POST": " che vende",
    "HERO_SUB": "Il sistema passo-passo per portare online quello che sai fare.",
    "AV1": "MC", "AV2": "GR", "AV3": "LB", "AV4": "DF",
    "PROOF_STRONG": "+200 professionisti",
    "PROOF_TESTO": "hanno già guardato la masterclass",
    "OPTIN_KICKER": "Accesso immediato al video",
    "OPTIN_H3": "Guarda i 3 passi per andare online",
    "OPTIN_LEAD": "Inserisci i tuoi dati: ti apro subito la masterclass e ti mando il link via email.",
    "OPTIN_ACTION": "#",
    "CTA_TESTO": "Guarda la masterclass gratuita",
    "OPTIN_REASSURE": "Niente spam. Accesso immediato, disiscrizione in un clic.",
    "STRIP_1_B": "30 min", "STRIP_1_T": "di contenuto pratico",
    "STRIP_2_B": "3 passi", "STRIP_2_T": "chiari e applicabili",
    "STRIP_3_B": "0€", "STRIP_3_T": "accesso gratuito",
    "STRIP_4_B": "+200", "STRIP_4_T": "professionisti formati",
    "LEARN_EYEBROW": "Cosa scoprirai",
    "LEARN_H": "In 30 minuti, la strada per la tua accademia",
    "LEARN_LEAD": "Niente teoria fumosa: tre mosse concrete che puoi mettere in pratica già da domani.",
    "STEP_1_H": "1 · Posizionati con chiarezza",
    "STEP_1_P": "Come far capire in 5 secondi perché il tuo metodo è diverso — e a chi serve.",
    "STEP_2_H": "2 · Trasforma il metodo in corso",
    "STEP_2_P": "La struttura per impacchettare quello che già sai in un percorso che le persone vogliono seguire.",
    "STEP_3_H": "3 · Attira i primi iscritti",
    "STEP_3_P": "Il sistema semplice per farti trovare online e riempire il tuo corso.",
    "PHOTO_STYLE": "", "PHOTO_FALLBACK": "Foto",
    "AUTHOR_ROLE": "Chi ti guida",
    "AUTHOR_BIO": "Ho deciso di portare online il mio metodo per aiutare più persone — e in questa masterclass ti mostro esattamente come puoi farlo anche tu.",
    "AUTHOR_CHECK_1": "Metodo testato sul campo",
    "AUTHOR_CHECK_2": "Zero tecnicismi: pensato per chi parte da zero",
    "AUTHOR_CHECK_3": "Passi concreti, applicabili da subito",
    "BAND_H": "La tua accademia digitale parte da qui",
    "BAND_P": "30 minuti oggi possono cambiare il modo in cui lavori — e trasformare la tua esperienza in qualcosa che scala.",
    "BAND_SMALL": "Accesso immediato · Nessuna carta richiesta",
    "FAQ_H": "Prima di iniziare",
    "FAQ_1_Q": "Quanto dura la masterclass?",
    "FAQ_1_A": "Circa 30 minuti. È pensata per darti passi concreti in poco tempo.",
    "FAQ_2_Q": "Devo essere esperto di tecnologia?",
    "FAQ_2_A": "No. Tutto è spiegato in modo semplice, pensato per chi parte da zero con il digitale.",
    "FAQ_3_Q": "È davvero gratis?",
    "FAQ_3_A": "Sì, al 100%. Ti chiedo solo nome ed email per darti l'accesso e il link.",
    "ANNO": "2026",
}


def render_optin(overrides: dict | None = None, colore_brand: str | None = None) -> str:
    """Render della landing opt-in: default + override copy + variabili brand."""
    params = dict(OPTIN_DEFAULTS)
    params.update({k: v for k, v in (overrides or {}).items() if v is not None})
    params.update(brand_vars(colore_brand))
    # Iniziale del logo dal nome partner.
    nome = (params.get("PARTNER_NOME") or "").strip()
    if nome and params.get("BRAND_INIZIALE") in ("•", "", None):
        params["BRAND_INIZIALE"] = nome[0].upper()
    return render(OPTIN_TEMPLATE, params)
