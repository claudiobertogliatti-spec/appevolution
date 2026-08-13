"""Sito vetrina di Ciak Start — pagina singola, sul dominio del cliente.

⛔ **La vetrina non vende.** Decisione di Claudio del 30/7: niente checkout,
niente opt-in, niente automazioni. E' il confine fra i 499 di Ciak Start e i
2.790 della Partnership. Qui si dice chi sei, per chi lavori, e come ti si
contatta: un form di contatto non e' un carrello.

🎨 **Perimetro ESTERNO: il brand e' del CLIENTE, non di Evolution.**
I colori arrivano dal suo brand kit (tappa 1 di Ciak Start, step `03-brand-kit`,
generato subito prima di questa pagina). Il giallo Ciak su un sito del cliente
sarebbe una contaminazione fra i due sistemi. Se il brand kit manca, si usa una
base neutra professionale e **non si inventa un accento**.

Perche' non riusa `LANDING_PAGE_TEMPLATE` di `routers/funnel_builder.py`: quello
e' un funnel di vendita completo (urgency bar, prezzo barrato, garanzia,
testimonianze, CTA d'acquisto). Svuotarne i placeholder lascerebbe comunque il
markup di quelle sezioni. Resta condivisa la meccanica di `_render`, con il
controllo che nel funnel manca: **nessun placeholder puo' sopravvivere alla
sostituzione** (una chiave mancante lascia `{CHIAVE}` letterale e dentro un
`<style>` significa CSS rotto — pitfall documentato in CLAUDE.md).
"""
from __future__ import annotations

import asyncio
import html as html_lib
import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("START_VETRINA_MODEL", "claude-sonnet-4-6")

DOMINIO_DA_SCEGLIERE = "dominio-da-scegliere.it"

# Base neutra professionale, usata SOLO quando il brand kit del cliente manca.
# Non e' il brand Ciak: e' l'assenza di brand, dichiarata. (Palette B2B service
# dal database di ui-ux-pro-max, contrasto verificato.)
NEUTRI = {
    "primario": "#0F172A",
    "secondario": "#475569",
    "accento": "#0F172A",   # senza brand kit l'accento NON e' colorato
    "accento_forte": "#0F172A",
    "fondo": "#FFFFFF",
    "fondo_alt": "#F8FAFC",
    "bordo": "#E2E8F0",
}

_NOTA_FALLBACK = (
    "I testi della pagina non sono stati riscritti dall'AI: qui sotto trovi il tuo "
    "posizionamento cosi' com'e'. La pagina e' completa e funzionante, ma prima di "
    "pubblicarla vanno riletti i testi insieme a Valentina."
)

_NOTA_BRAND_MANCANTE = (
    "Il brand kit non risulta ancora completato: la pagina usa una base neutra. "
    "Quando i colori del tuo brand sono pronti, la vetrina si rigenera con quelli."
)

_SYSTEM = (
    "Scrivi i testi del SITO VETRINA di un professionista: una pagina sola, che "
    "presenta chi e' e per chi lavora.\n"
    "⛔ QUESTA PAGINA NON VENDE. Niente prezzi, niente offerte, niente scadenze, "
    "niente 'iscriviti': solo presentazione e contatto. Se ti viene voglia di "
    "aggiungere una call to action commerciale, non farlo.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti ('potente', 'incredibile', '10x', 'il migliore').\n"
    "- Niente registro guru o motivazionale. Nessuna emoji.\n"
    "- Mai il trattino lungo. Al suo posto virgola, punto o parentesi.\n"
    "- ⛔ Non inventare NIENTE: nessun numero di clienti, anni di esperienza, "
    "percentuale, premio o testimonianza. Se un dato non c'e' nelle informazioni "
    "che ricevi, non esiste. Inventare recensioni o risultati e' illecito "
    "(Codice del Consumo artt. 21-23).\n"
    "'per_chi_no' e' la sezione piu' importante: dire a chi NON ci si rivolge rende "
    "credibile tutto il resto ed e' il metodo De Veglia applicato. Non addolcirla.\n"
    "'punti_chiave' sono due frasi brevissime (max 6 parole) che stanno sotto il "
    "titolo: fatti, non slogan.\n"
    "'faq' sono 4 domande che una persona si fa DAVVERO prima di scrivere a un "
    "professionista: come si lavora insieme, quanto dura, cosa serve per iniziare, "
    "cosa succede dopo il primo contatto. ⛔ Nessuna domanda sul prezzo e nessuna "
    "risposta che promette un risultato: qui non si vende, si tolgono dubbi.\n"
    "⛔ NON scrivere testimonianze o recensioni. Non ti vengono chieste e non "
    "esistono finche' non le fornisce il cliente: inventarle e' illecito."
)

_CAMPI = ["headline", "sottotitolo", "cosa_faccio", "per_chi_si", "per_chi_no", "bio"]

_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string", "description": "Titolo della pagina: cosa fai e per chi, in una riga."},
        "sottotitolo": {"type": "string", "description": "Una frase che chiarisce la headline."},
        "punti_chiave": {
            "type": "array",
            "items": {"type": "string"},
            "description": "2 fatti brevissimi (max 6 parole) da mettere sotto il titolo.",
        },
        "cosa_faccio": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"titolo": {"type": "string"}, "testo": {"type": "string"}},
                "required": ["titolo", "testo"],
            },
            "description": "3 cose concrete che il professionista fa.",
        },
        "per_chi_si": {"type": "array", "items": {"type": "string"}, "description": "2-4 profili a cui si rivolge."},
        "per_chi_no": {"type": "array", "items": {"type": "string"}, "description": "2-4 profili a cui NON si rivolge."},
        "bio": {"type": "string", "description": "Presentazione in prima persona, 4-6 frasi brevi."},
        "faq": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"domanda": {"type": "string"}, "risposta": {"type": "string"}},
                "required": ["domanda", "risposta"],
            },
            "description": "4 domande vere che una persona si fa prima di scrivere. Mai sul prezzo.",
        },
    },
    "required": _CAMPI,
}

# ⛔ Le testimonianze NON sono nello schema, di proposito: il modello non deve
# poterle produrre. Arrivano solo dai dati che il cliente fornisce, con nome e
# ruolo di chi le ha dette. Recensioni inventate = illecito (Codice del Consumo
# artt. 21-23), ed e' il motivo per cui `POST /funnel/{id}/genera-ai` e' stato
# ritirato con HTTP 410.

_EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF\U00002190-\U000021FF\U00002B00-\U00002BFF️‍]"
)
_PLACEHOLDER = re.compile(r"\{[A-Z_0-9]+\}")
_HEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def placeholder_residui(html: str) -> list[str]:
    """Placeholder sopravvissuti alla sostituzione. Deve essere sempre vuota."""
    return sorted(set(_PLACEHOLDER.findall(html)))


def _pulisci(testo: Any) -> str:
    t = _EMOJI.sub("", str(testo or ""))
    t = t.replace("—", ",").replace("–", "-")
    return " ".join(t.split()).strip()


def _esc(testo: Any) -> str:
    """Testo del cliente nel CORPO della pagina.

    Non si escapano gli apici: in un nodo di testo non servono, e in italiano
    l'apostrofo e' ovunque. Per gli ATTRIBUTI si usa `_attr`.
    """
    return html_lib.escape(_pulisci(testo), quote=False)


def _attr(testo: Any) -> str:
    return html_lib.escape(_pulisci(testo), quote=True)


def _come_titolo(testo: Any) -> str:
    """Prima lettera maiuscola, il resto invariato.

    I campi del posizionamento sono frammenti da mezza frase ("formazione per
    terapisti..."): come titolo di sezione resterebbero minuscoli.
    `.capitalize()` non va bene, abbasserebbe i nomi propri.
    """
    t = _pulisci(testo)
    return t[0].upper() + t[1:] if t else t


def _colore(valore: Any, fallback: str) -> str:
    """Accetta solo esadecimali validi: un colore sporco romperebbe il CSS."""
    v = _pulisci(valore)
    return v if _HEX.match(v) else fallback


def _luminanza(hex_colore: str) -> float:
    h = hex_colore.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    canali = []
    for i in (0, 2, 4):
        v = int(h[i:i + 2], 16) / 255
        canali.append(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * canali[0] + 0.7152 * canali[1] + 0.0722 * canali[2]


def contrasto(colore_a: str, colore_b: str) -> float:
    """Rapporto di contrasto WCAG fra due esadecimali."""
    la, lb = _luminanza(colore_a), _luminanza(colore_b)
    chiaro, scuro = max(la, lb), min(la, lb)
    return round((chiaro + 0.05) / (scuro + 0.05), 2)


def palette_da_brand_kit(brand_kit: dict | None) -> tuple[dict, bool]:
    """Token colore del CLIENTE. Ritorna (palette, brand_presente).

    ⚠️ Il brand kit del partner vive nello step `03-brand-kit`, non nella
    collection `partner_brand_kits` (che non viene mai scritta). Chi chiama
    questa funzione deve leggerlo da li'.
    """
    kit = brand_kit or {}
    primario = _colore(kit.get("colore_primario") or kit.get("primary"), "")
    if not primario:
        return dict(NEUTRI), False
    secondario = _colore(kit.get("colore_secondario") or kit.get("secondary"), NEUTRI["secondario"])
    accento = _colore(kit.get("colore_accento") or kit.get("accent"), primario)
    fondo_alt = _colore(kit.get("colore_fondo") or kit.get("background"), NEUTRI["fondo_alt"])
    # Il cliente sceglie i suoi colori, e puo' sceglierne uno chiarissimo. Dove
    # l'accento porta significato (icone, bordo di stato) serve almeno 3:1
    # contro il fondo, o quel segno non si vede: in quel caso si usa il primario.
    accento_forte = accento if contrasto(accento, fondo_alt) >= 3 else primario
    return {
        "primario": primario,
        "secondario": secondario,
        "accento": accento,
        "accento_forte": accento_forte,
        "fondo": "#FFFFFF",
        "fondo_alt": fondo_alt,
        "bordo": NEUTRI["bordo"],
    }, True


def _render(template: str, params: dict) -> str:
    for chiave, valore in params.items():
        template = template.replace("{" + chiave + "}", str(valore if valore is not None else ""))
    return template


VETRINA_TEMPLATE = """<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{TITOLO_PAGINA}</title>
<meta name="description" content="{META_DESCRIPTION}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={FONT_QUERY}:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>document.documentElement.classList.add('js')</script>
<style>
:root{
  --primario:{C_PRIMARIO};--secondario:{C_SECONDARIO};--accento:{C_ACCENTO};--accento-forte:{C_ACCENTO_FORTE};
  --fondo:{C_FONDO};--fondo-alt:{C_FONDO_ALT};--bordo:{C_BORDO};
  --testo:{C_PRIMARIO};--radius:14px;--gutter:24px;--max:1120px;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'{FONT_NOME}',system-ui,-apple-system,sans-serif;color:var(--testo);background:var(--fondo);line-height:1.6;font-size:17px;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}
.wrap{max-width:var(--max);margin:0 auto;padding:0 var(--gutter)}
a{color:inherit}
:focus-visible{outline:3px solid var(--accento-forte);outline-offset:3px;border-radius:4px}
.salta{position:absolute;left:-9999px}
.salta:focus{left:16px;top:16px;z-index:50;background:var(--primario);color:#fff;padding:12px 18px;border-radius:8px}

header{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--fondo) 92%,transparent);border-bottom:1px solid var(--bordo)}
.barra{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0;min-height:64px}
.marchio{display:flex;align-items:center;gap:12px;font-weight:600;font-size:17px;text-decoration:none}
.marchio img{height:34px;width:auto}
.barra a.contatto{display:inline-flex;align-items:center;min-height:44px;padding:0 20px;border:1.5px solid var(--primario);border-radius:999px;font-size:15px;font-weight:600;text-decoration:none;transition:background .2s ease,color .2s ease}
.barra a.contatto:hover{background:var(--primario);color:var(--fondo)}

.hero{padding:72px 0 64px}
.hero-griglia{display:grid;grid-template-columns:{HERO_COLONNE};gap:56px;align-items:center}
.occhiello{display:inline-block;font-size:13px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--secondario);margin-bottom:18px}
.hero h1{font-size:clamp(32px,4.6vw,52px);font-weight:700;line-height:1.08;letter-spacing:-.02em;max-width:16ch}
.hero .sotto{margin-top:20px;font-size:clamp(17px,1.6vw,20px);color:var(--secondario);max-width:52ch}
.chiavi{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px;list-style:none}
.chiavi li{font-size:14px;font-weight:500;padding:8px 14px;border:1px solid var(--bordo);border-radius:999px;background:var(--fondo-alt)}
.ritratto{position:relative}
.ritratto img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:var(--radius)}
.ritratto::after{content:"";position:absolute;left:-14px;bottom:-14px;width:96px;height:96px;border-left:3px solid var(--accento-forte);border-bottom:3px solid var(--accento-forte);border-radius:0 0 0 var(--radius)}

section{padding:72px 0;border-top:1px solid var(--bordo)}
.testa{max-width:60ch;margin-bottom:44px}
h2{font-size:clamp(24px,3vw,34px);font-weight:600;letter-spacing:-.015em;line-height:1.2}
.testa p{margin-top:12px;color:var(--secondario)}
.schede{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}
.scheda{border:1px solid var(--bordo);border-radius:var(--radius);overflow:hidden;background:var(--fondo);display:flex;flex-direction:column;transition:border-color .2s ease,box-shadow .2s ease}
.scheda:hover{border-color:var(--accento);box-shadow:0 6px 24px rgba(15,23,42,.07)}
.scheda figure{aspect-ratio:16/10;overflow:hidden;background:var(--fondo-alt)}
.scheda figure img{width:100%;height:100%;object-fit:cover}
.scheda .corpo{padding:26px}
.scheda h3{font-size:18px;font-weight:600;margin-bottom:8px}
.scheda p{font-size:15.5px;color:var(--secondario)}

.confronto{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:28px}
.colonna{border-radius:var(--radius);padding:32px}
.colonna.si{background:var(--fondo-alt);border:1px solid var(--bordo);border-top:4px solid var(--accento-forte)}
.colonna.no{border:1px dashed var(--bordo)}
.colonna h3{font-size:19px;font-weight:600;margin-bottom:20px}
.colonna ul{list-style:none;display:grid;gap:14px}
.colonna li{display:flex;gap:12px;font-size:16px;line-height:1.5}
.colonna li svg{flex:0 0 20px;width:20px;height:20px;margin-top:3px}
.colonna.no li{color:var(--secondario)}

.parole{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:24px}
.parola{background:var(--fondo);border:1px solid var(--bordo);border-left:3px solid var(--accento-forte);border-radius:var(--radius);padding:30px}
.parola blockquote p{font-size:17px;line-height:1.65}
.parola figcaption{margin-top:18px;display:grid;gap:2px}
.parola .chi{font-weight:600;font-size:15px}
.parola .ruolo{font-size:14px;color:var(--secondario)}

.elenco-faq{display:grid;gap:0;max-width:76ch;border-top:1px solid var(--bordo)}
details.faq{border-bottom:1px solid var(--bordo)}
details.faq summary{cursor:pointer;list-style:none;padding:22px 44px 22px 0;font-size:17px;font-weight:600;position:relative;min-height:44px;display:flex;align-items:center}
details.faq summary::-webkit-details-marker{display:none}
details.faq summary::after{content:"";position:absolute;right:8px;top:50%;width:11px;height:11px;border-right:2.5px solid var(--secondario);border-bottom:2.5px solid var(--secondario);transform:translateY(-70%) rotate(45deg);transition:transform .2s ease}
details.faq[open] summary::after{transform:translateY(-30%) rotate(-135deg)}
details.faq summary:hover{color:var(--accento-forte)}
details.faq .risposta{padding:0 44px 24px 0;color:var(--secondario);font-size:16.5px}

.chi-sono{display:grid;grid-template-columns:{BIO_COLONNE};gap:48px;align-items:start}
.chi-sono img{border-radius:var(--radius);aspect-ratio:1/1;object-fit:cover}
.chi-sono p{color:var(--secondario);margin-top:14px}

.contatti{background:var(--fondo-alt);border-top:1px solid var(--bordo)}
.contatti-griglia{display:grid;grid-template-columns:{CONTATTI_COLONNE};gap:48px;align-items:start}
form{display:grid;gap:18px}
.campo{display:grid;gap:7px}
label{font-size:14.5px;font-weight:600}
input,textarea{font:inherit;font-size:16px;padding:13px 15px;border:1.5px solid var(--bordo);border-radius:10px;background:var(--fondo);color:var(--testo);width:100%}
input:focus,textarea:focus{border-color:var(--accento);outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--accento) 22%,transparent)}
textarea{min-height:132px;resize:vertical}
.consenso{display:flex;gap:12px;align-items:flex-start;font-size:14px;color:var(--secondario);line-height:1.5}
.consenso input{width:20px;height:20px;min-width:20px;margin-top:2px;accent-color:var(--accento)}
button[type=submit]{min-height:52px;padding:0 30px;border:none;border-radius:10px;background:var(--primario);color:var(--fondo);font:inherit;font-size:16px;font-weight:600;cursor:pointer;justify-self:start;transition:opacity .2s ease}
button[type=submit]:hover{opacity:.88}
.recapiti{display:grid;gap:18px;font-size:16px}
.recapiti a{font-weight:500;text-decoration:none;border-bottom:2px solid color-mix(in srgb,var(--accento) 55%,transparent)}
.recapiti a:hover{border-bottom-color:var(--accento)}
.recapiti .voce{display:grid;gap:3px}
.recapiti .et{font-size:13px;color:var(--secondario);text-transform:uppercase;letter-spacing:.08em}

footer{padding:36px 0 56px;color:var(--secondario);font-size:14.5px}
.pie{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between}

/* Il reveal esiste SOLO se il JS gira: senza, il contenuto e' visibile da subito.
   Con `.rivela{opacity:0}` incondizionato una pagina senza JS resta bianca. */
.js .rivela{opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s ease}
.js .rivela.visibile{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.js .rivela{opacity:1;transform:none;transition:none}html{scroll-behavior:auto}}

@media(max-width:860px){
  .hero{padding:44px 0 40px}
  .hero-griglia,.chi-sono,.contatti-griglia{grid-template-columns:1fr}
  .hero-griglia{gap:36px}
  .ritratto{order:-1;max-width:340px}
  section{padding:52px 0}
  .barra a.contatto{padding:0 16px}
}
</style>
</head>
<body>
<a class="salta" href="#contatti">Vai ai contatti</a>

<header><div class="wrap barra">
  <a class="marchio" href="#top">{MARCHIO}</a>
  <a class="contatto" href="#contatti">Contattami</a>
</div></header>

<main id="top">
<div class="hero"><div class="wrap hero-griglia">
  <div>
    <span class="occhiello">{OCCHIELLO}</span>
    <h1>{HEADLINE}</h1>
    <p class="sotto">{SOTTOTITOLO}</p>
    <ul class="chiavi">{PUNTI_CHIAVE}</ul>
  </div>
  {RITRATTO}
</div></div>

<section><div class="wrap">
  <div class="testa rivela">
    <h2>{TITOLO_COSA_FACCIO}</h2>
    <p>{SOTTOTITOLO_COSA_FACCIO}</p>
  </div>
  <div class="schede">{SCHEDE}</div>
</div></section>

<section><div class="wrap">
  <div class="testa rivela"><h2>Per chi lavoro, e per chi no</h2>
    <p>Dirlo in chiaro fa risparmiare tempo a tutti e due.</p></div>
  <div class="confronto">
    <div class="colonna si rivela"><h3>Ti riguarda se</h3><ul>{PER_CHI_SI}</ul></div>
    <div class="colonna no rivela"><h3>Non fa per te se</h3><ul>{PER_CHI_NO}</ul></div>
  </div>
</div></section>

{SEZIONE_TESTIMONIANZE}

<section><div class="wrap chi-sono rivela">
  {FOTO_BIO}
  <div><h2>{NOME}</h2><p>{BIO}</p></div>
</div></section>

{SEZIONE_FAQ}

<section class="contatti" id="contatti"><div class="wrap">
  <div class="testa"><h2>Parliamone</h2><p>{INVITO_CONTATTO}</p></div>
  <div class="contatti-griglia">
    {FORM}
    <div class="recapiti">{RECAPITI}</div>
  </div>
</div></section>
</main>

<footer><div class="wrap pie">
  <span>{NOME}</span><span>{DOMINIO}</span>
</div></footer>

<script>
(function(){
  var ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var voci = document.querySelectorAll('.rivela');
  if (ridotto || !('IntersectionObserver' in window)) {
    voci.forEach(function(v){ v.classList.add('visibile'); });
    return;
  }
  var osservatore = new IntersectionObserver(function(entrate){
    entrate.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visibile'); osservatore.unobserve(e.target); } });
  }, {rootMargin: '0px 0px -8% 0px'});
  voci.forEach(function(v){ osservatore.observe(v); });
})();
</script>
</body>
</html>
"""

# Icone SVG (Lucide, 24x24). Mai emoji come icone.
_ICONA_SI = (
    '<svg viewBox="0 0 24 24" fill="none" stroke="var(--accento-forte)" stroke-width="2.4" '
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>'
)
_ICONA_NO = (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="opacity:.45">'
    '<line x1="5" y1="12" x2="19" y2="12"/></svg>'
)


def _scheda(voce: dict, immagine: str = "") -> str:
    figura = ""
    if immagine.startswith("http"):
        figura = f'<figure><img src="{_attr(immagine)}" alt="" loading="lazy"></figure>'
    return (
        f'<article class="scheda rivela">{figura}<div class="corpo">'
        f'<h3>{_esc(voce.get("titolo"))}</h3><p>{_esc(voce.get("testo"))}</p>'
        f"</div></article>"
    )


def _voci(elenco: Any, icona: str) -> str:
    return "".join(
        f"<li>{icona}<span>{_esc(v)}</span></li>" for v in (elenco or []) if _pulisci(v)
    )


def _faq(voci: Any) -> str:
    """FAQ in `<details>`: si apre senza JavaScript ed e' navigabile da tastiera."""
    righe = []
    for voce in voci or []:
        if not isinstance(voce, dict):
            continue
        domanda, risposta = _pulisci(voce.get("domanda")), _pulisci(voce.get("risposta"))
        if not domanda or not risposta:
            continue
        righe.append(
            f"<details class=\"faq\"><summary>{_esc(domanda)}</summary>"
            f"<div class=\"risposta\"><p>{_esc(risposta)}</p></div></details>"
        )
    return "".join(righe)


def testimonianze_pubblicabili(elenco: Any) -> list[dict]:
    """Solo le testimonianze REALI e attribuite.

    ⛔ Non si generano e non si completano: arrivano dal cliente. Una senza
    autore non si pubblica — anonima vale zero e sembra inventata. Chi la
    rilascia deve poterlo confermare: e' la differenza fra prova sociale e
    pubblicita' ingannevole (Codice del Consumo artt. 21-23).
    """
    valide = []
    for voce in elenco or []:
        if not isinstance(voce, dict):
            continue
        testo, autore = _pulisci(voce.get("testo")), _pulisci(voce.get("autore"))
        if len(testo) < 30 or not autore:
            continue
        valide.append({"testo": testo, "autore": autore, "ruolo": _pulisci(voce.get("ruolo"))})
    return valide


def _testimonianze(voci: list[dict]) -> str:
    carte = []
    for voce in voci:
        ruolo = f"<span class=\"ruolo\">{_esc(voce['ruolo'])}</span>" if voce["ruolo"] else ""
        carte.append(
            f"<figure class=\"parola rivela\"><blockquote><p>{_esc(voce['testo'])}</p></blockquote>"
            f"<figcaption><span class=\"chi\">{_esc(voce['autore'])}</span>{ruolo}</figcaption></figure>"
        )
    return "".join(carte)


def _form(dati: dict) -> str:
    """Form di contatto. Senza destinazione NON si stampa.

    Un form che non recapita i messaggi e' peggio di nessun form: il visitatore
    crede di aver scritto e nessuno gli risponde. Serve `form_action`, cioe'
    l'endpoint che riceve i dati. Il consenso privacy e' obbligatorio (GDPR):
    qui si raccolgono dati personali.
    """
    action = _pulisci(dati.get("form_action"))
    if not action.startswith("http"):
        return (
            '<div class="recapiti"><p>Il modulo di contatto si attiva quando il sito va online. '
            "Nel frattempo restano validi i recapiti qui accanto.</p></div>"
        )
    privacy = _pulisci(dati.get("privacy_url"))
    link_privacy = (
        f' Vedi l\'<a href="{_attr(privacy)}">informativa privacy</a>.' if privacy.startswith("http") else ""
    )
    return f"""<form method="post" action="{_attr(action)}">
      <div class="campo"><label for="nome">Come ti chiami</label>
        <input id="nome" name="nome" type="text" autocomplete="name" required></div>
      <div class="campo"><label for="email">La tua email</label>
        <input id="email" name="email" type="email" autocomplete="email" required></div>
      <div class="campo"><label for="messaggio">Di cosa hai bisogno</label>
        <textarea id="messaggio" name="messaggio" required></textarea></div>
      <label class="consenso"><input type="checkbox" name="consenso" value="si" required>
        <span>Acconsento al trattamento dei miei dati per ricevere una risposta a questo messaggio.{link_privacy}</span></label>
      <button type="submit">Invia il messaggio</button>
    </form>"""


def _recapiti(dati: dict) -> str:
    """Solo i recapiti che esistono davvero. Un contatto inventato e' un vicolo cieco."""
    pezzi = []
    email = _pulisci(dati.get("email_contatto"))
    if "@" in email:
        pezzi.append(
            f'<div class="voce"><span class="et">Email</span>'
            f'<a href="mailto:{_attr(email)}">{_esc(email)}</a></div>'
        )
    telefono = _pulisci(dati.get("telefono"))
    if telefono:
        numero = re.sub(r"[^\d+]", "", telefono)
        pezzi.append(
            f'<div class="voce"><span class="et">Telefono</span>'
            f'<a href="tel:{_attr(numero)}">{_esc(telefono)}</a></div>'
        )
    for etichetta, chiave in (("Instagram", "instagram_url"), ("LinkedIn", "linkedin_url")):
        url = _pulisci(dati.get(chiave))
        if url.startswith("http"):
            mostrato = url.replace("https://", "").replace("http://", "").rstrip("/")
            pezzi.append(
                f'<div class="voce"><span class="et">{etichetta}</span>'
                f'<a href="{_attr(url)}" rel="me noopener">{_esc(mostrato)}</a></div>'
            )
    if not pezzi:
        pezzi.append(
            '<div class="voce"><span class="et">Recapiti</span>'
            "<span>Da inserire prima di pubblicare la pagina.</span></div>"
        )
    return "".join(pezzi)


def checklist_dns(dominio: str, target: str = "cname.vercel-dns.com") -> list[str]:
    """I passi per puntare il dominio, scritti per il cliente e per Antonella.

    Vincolo di Claudio (30/7): la parte DNS dev'essere una checklist, mai una
    call di Claudio. Quindi qui si nominano i campi esatti da compilare.
    """
    return [
        f"Entra nel pannello di chi ti ha venduto il dominio {dominio} (Aruba, GoDaddy, Register: e' quello dove lo hai comprato).",
        "Cerca la sezione DNS, a volte si chiama Gestione DNS o Record DNS.",
        f"Aggiungi un record di tipo CNAME con nome www e valore {target}.",
        f"Aggiungi un record di tipo A con nome @ (oppure {dominio}) e valore 76.76.21.21.",
        "Salva e aspetta: la propagazione richiede da pochi minuti a 24 ore. Non serve rifare nulla nel frattempo.",
        f"Quando https://{dominio} apre la tua pagina, scrivilo ad Antonella: da li' la mettiamo online in via definitiva.",
    ]


def _fallback_testi(dati: dict) -> dict:
    """Testi presi dal posizionamento del cliente: veri, solo non riscritti.

    A differenza delle bio social, una pagina senza testi non esiste. Gli
    elementi del posizionamento sono frasi autonome e corrette: si usano come
    blocchi interi, mai incastrati in una formula (l'errore che il 12/8 ha
    prodotto il Brand Positioning Statement sgrammaticato).
    """
    pos = dati.get("posizionamento") or {}
    return {
        "headline": _pulisci(pos.get("idea_differenziante")) or _pulisci(pos.get("categoria")) or _pulisci(dati.get("nicchia")),
        "sottotitolo": _pulisci(pos.get("vantaggio_cliente")),
        "punti_chiave": [],
        "cosa_faccio": [
            {"titolo": "Di cosa mi occupo", "testo": _pulisci(pos.get("categoria"))},
            {"titolo": "Come lavoro", "testo": _pulisci(pos.get("idea_differenziante"))},
            {"titolo": "Cosa ottieni", "testo": _pulisci(pos.get("vantaggio_cliente"))},
        ],
        "per_chi_si": [v for v in [_pulisci(pos.get("categoria")), _pulisci(dati.get("nicchia"))] if v],
        "per_chi_no": ["Da definire insieme a Valentina prima di pubblicare"],
        "bio": _pulisci(dati.get("bio")) or "Testo di presentazione da scrivere prima di pubblicare.",
    }


def _call_claude(dati: dict) -> dict:
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    pos = dati.get("posizionamento") or {}
    righe = [
        f"- nome: {dati.get('nome') or ''}",
        f"- ambito: {dati.get('nicchia') or ''}",
        f"- brand: {pos.get('brand') or ''}",
        f"- categoria: {pos.get('categoria') or ''}",
        f"- idea differenziante: {pos.get('idea_differenziante') or ''}",
        f"- vantaggio per il cliente: {pos.get('vantaggio_cliente') or ''}",
        f"- note biografiche: {dati.get('bio') or 'nessuna'}",
    ]
    user = (
        "Posizionamento gia' approvato:\n" + "\n".join(righe)
        + "\n\nScrivi i testi della pagina vetrina. Ricorda: la pagina non vende."
    )

    from .agent_deliverable import system_blocks

    client = anthropic.Anthropic(api_key=api_key)
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=2500,
        system=system_blocks("VALENTINA", _SYSTEM),
        messages=[{"role": "user", "content": user}],
        tools=[{
            "name": "sito_vetrina",
            "description": "Restituisci i testi della pagina vetrina.",
            "input_schema": _SCHEMA,
        }],
        tool_choice={"type": "tool", "name": "sito_vetrina"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valido(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    if not _pulisci(out.get("headline")) or not _pulisci(out.get("sottotitolo")):
        return False
    schede = out.get("cosa_faccio")
    if not isinstance(schede, list) or not schede:
        return False
    return all(isinstance(v, list) and v for v in (out.get("per_chi_si"), out.get("per_chi_no")))


async def build_vetrina(dati: dict) -> dict:
    """Pagina vetrina completa piu' la checklist DNS. Non solleva mai."""
    fallback = False
    try:
        testi = await asyncio.to_thread(_call_claude, dati)
        if not _valido(testi):
            logger.warning("[START_VETRINA] Output AI incompleto — testi dal posizionamento")
            testi, fallback = _fallback_testi(dati), True
    except Exception as exc:  # noqa: BLE001 — la pagina deve sempre potersi generare
        logger.warning("[START_VETRINA] Generazione fallita (%s) — testi dal posizionamento", exc)
        testi, fallback = _fallback_testi(dati), True

    pos = dati.get("posizionamento") or {}
    palette, brand_presente = palette_da_brand_kit(dati.get("brand_kit"))
    nome = _pulisci(dati.get("nome")) or _pulisci(pos.get("brand")) or "Il tuo nome"
    dominio = _pulisci(dati.get("dominio")) or DOMINIO_DA_SCEGLIERE
    foto = _pulisci(dati.get("foto_url"))
    foto_bio = _pulisci(dati.get("foto_bio_url"))
    font = _pulisci((dati.get("brand_kit") or {}).get("font")) or "Poppins"
    immagini = [_pulisci(v) for v in (dati.get("immagini") or [])]
    marchio_logo = _pulisci((dati.get("brand_kit") or {}).get("logo_url"))
    schede_voci = [v for v in (testi.get("cosa_faccio") or []) if isinstance(v, dict)]

    marchio = (
        f'<img src="{_attr(marchio_logo)}" alt="{_attr(nome)}">'
        if marchio_logo.startswith("http")
        else f"<span>{_esc(_pulisci(pos.get('brand')) or nome)}</span>"
    )
    ritratto = (
        f'<div class="ritratto"><img src="{_attr(foto)}" alt="Ritratto di {_attr(nome)}"></div>'
        if foto.startswith("http")
        else ""
    )
    foto_bio_tag = (
        f'<img src="{_attr(foto_bio)}" alt="" loading="lazy">' if foto_bio.startswith("http") else ""
    )
    has_form = _pulisci(dati.get("form_action")).startswith("http")
    voci_testimonianze = testimonianze_pubblicabili(dati.get("testimonianze"))
    faq_html = _faq(testi.get("faq"))

    # Le sezioni assenti non lasciano un contenitore vuoto: spariscono.
    sezione_testimonianze = (
        '<section><div class="wrap">'
        '<div class="testa rivela"><h2>Chi ha lavorato con me</h2>'
        "<p>Parole di chi il percorso lo ha gia' fatto.</p></div>"
        f'<div class="parole">{_testimonianze(voci_testimonianze)}</div>'
        "</div></section>"
        if voci_testimonianze
        else ""
    )
    sezione_faq = (
        '<section><div class="wrap">'
        '<div class="testa rivela"><h2>Domande che mi fanno spesso</h2></div>'
        f'<div class="elenco-faq rivela">{faq_html}</div>'
        "</div></section>"
        if faq_html
        else ""
    )

    params = {
        "TITOLO_PAGINA": _attr(f"{nome} · {_pulisci(pos.get('categoria')) or _pulisci(dati.get('nicchia'))}".strip(" ·")),
        "META_DESCRIPTION": _attr(testi.get("sottotitolo")),
        "FONT_NOME": _attr(font),
        "FONT_QUERY": _attr(font.replace(" ", "+")),
        "C_PRIMARIO": palette["primario"],
        "C_SECONDARIO": palette["secondario"],
        "C_ACCENTO": palette["accento"],
        "C_ACCENTO_FORTE": palette["accento_forte"],
        "C_FONDO": palette["fondo"],
        "C_FONDO_ALT": palette["fondo_alt"],
        "C_BORDO": palette["bordo"],
        "MARCHIO": marchio,
        "OCCHIELLO": _esc(_come_titolo(pos.get("categoria")) or _come_titolo(dati.get("nicchia"))),
        "HEADLINE": _esc(testi.get("headline")),
        "SOTTOTITOLO": _esc(testi.get("sottotitolo")),
        "PUNTI_CHIAVE": "".join(f"<li>{_esc(v)}</li>" for v in (testi.get("punti_chiave") or []) if _pulisci(v)),
        "RITRATTO": ritratto,
        "HERO_COLONNE": "1.15fr .85fr" if ritratto else "1fr",
        "TITOLO_COSA_FACCIO": _esc(_come_titolo(pos.get("categoria")) or "Il lavoro che faccio"),
        "SOTTOTITOLO_COSA_FACCIO": _esc(pos.get("idea_differenziante")),
        "SCHEDE": "".join(
            _scheda(voce, immagini[i] if i < len(immagini) else "")
            for i, voce in enumerate(schede_voci)
        ),
        "PER_CHI_SI": _voci(testi.get("per_chi_si"), _ICONA_SI),
        "PER_CHI_NO": _voci(testi.get("per_chi_no"), _ICONA_NO),
        "NOME": _esc(nome),
        "BIO": _esc(testi.get("bio")),
        "FOTO_BIO": foto_bio_tag,
        "BIO_COLONNE": "280px 1fr" if foto_bio_tag else "1fr",
        "INVITO_CONTATTO": _esc(
            "Scrivimi cosa ti serve: ti rispondo io."
            if has_form
            else "Questi sono i modi per raggiungermi."
        ),
        "FORM": _form(dati),
        "CONTATTI_COLONNE": "1.3fr .7fr" if has_form else "1fr",
        "RECAPITI": _recapiti(dati),
        "DOMINIO": _esc(dominio),
        "SEZIONE_TESTIMONIANZE": sezione_testimonianze,
        "SEZIONE_FAQ": sezione_faq,
    }
    pagina = _render(VETRINA_TEMPLATE, params)

    residui = placeholder_residui(pagina)
    if residui:
        logger.error("[START_VETRINA] Placeholder non sostituiti: %s", residui)
        raise RuntimeError(f"Template vetrina incompleto: {', '.join(residui)}")

    note = []
    if fallback:
        note.append(_NOTA_FALLBACK)
    if not brand_presente:
        note.append(_NOTA_BRAND_MANCANTE)

    da_completare = []
    if not voci_testimonianze:
        da_completare.append(
            "Testimonianze: la sezione compare solo quando ne hai di vere. Chiedile a 2 o 3 "
            "clienti con cui hai lavorato bene, falle scrivere a loro e fatti dare nome e "
            "ruolo. ⛔ Non si scrivono al posto loro: una recensione inventata e' illecita."
        )
    if not faq_html:
        da_completare.append("Domande frequenti: non sono state generate, vanno scritte con Valentina.")
    if not _pulisci(dati.get("foto_url")).startswith("http"):
        da_completare.append("Foto: serve un ritratto tuo, e' la prima cosa che si guarda.")

    return {
        "_fallback": fallback,
        "brand_applicato": brand_presente,
        "testimonianze_pubblicate": len(voci_testimonianze),
        "da_completare": da_completare,
        "nota": " ".join(note),
        "html": pagina,
        "dominio": dominio,
        "checklist_dns": checklist_dns(dominio),
        "form_attivo": has_form,
        "vende": False,
    }
