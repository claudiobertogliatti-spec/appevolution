"""Sito vetrina di Ciak Start — pagina singola, sul dominio del cliente.

⛔ **La vetrina non vende.** Decisione di Claudio del 30/7: niente checkout,
niente opt-in, niente automazioni. E' il confine fra i 499 di Ciak Start e i
2.790 della Partnership; se vendesse, avremmo regalato il pezzo che distingue i
due prodotti. Qui si dice chi sei, per chi lavori, e come ti si contatta.

Perche' non riusa `LANDING_PAGE_TEMPLATE` di `routers/funnel_builder.py`: quello
e' un funnel di vendita completo (urgency bar, prezzo barrato, garanzia,
testimonianze, CTA d'acquisto). Svuotarne i placeholder lascerebbe comunque il
markup di quelle sezioni: box prezzo vuoti e griglia testimonianze vuota. Serve
un template proprio, piu' piccolo. Resta condivisa la meccanica di `_render`,
riscritta qui con il controllo che nel funnel manca: **nessun placeholder puo'
sopravvivere alla sostituzione** (una chiave mancante lascia `{CHIAVE}` letterale
e dentro un `<style>` significa CSS rotto — pitfall documentato in CLAUDE.md).

Brand lock (`docs/brand/ciak-brand-kit.md` v1.0): Poppins, #0F172A, #64748B,
#E5E7EB, #FACC15. Sono i colori di Evolution/Ciak: quando il cliente avra' un
brand kit suo, i token si sostituiscono da li'.
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

_NOTA_FALLBACK = (
    "I testi della pagina non sono stati riscritti dall'AI: qui sotto trovi il tuo "
    "posizionamento cosi' com'e'. La pagina e' completa e funzionante, ma prima di "
    "pubblicarla vanno riletti i testi insieme a Valentina."
)

_SYSTEM = (
    "Scrivi i testi del SITO VETRINA di un professionista: una pagina sola, che "
    "presenta chi e' e per chi lavora.\n"
    "⛔ QUESTA PAGINA NON VENDE. Niente prezzi, niente offerte, niente scadenze, "
    "niente 'iscriviti', niente moduli di contatto: solo presentazione e recapiti. "
    "Se ti viene voglia di aggiungere una call to action commerciale, non farlo.\n"
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
    "credibile tutto il resto ed e' il metodo De Veglia applicato. Non addolcirla."
)

_CAMPI = ["headline", "sottotitolo", "cosa_faccio", "per_chi_si", "per_chi_no", "bio"]

_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string", "description": "Titolo della pagina: cosa fai e per chi, in una riga."},
        "sottotitolo": {"type": "string", "description": "Una frase che chiarisce la headline."},
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
        "bio": {"type": "string", "description": "Breve presentazione in prima persona, 3-5 frasi."},
    },
    "required": _CAMPI,
}

_EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF\U00002190-\U000021FF\U00002B00-\U00002BFF️‍]"
)
_PLACEHOLDER = re.compile(r"\{[A-Z_0-9]+\}")


def placeholder_residui(html: str) -> list[str]:
    """Placeholder sopravvissuti alla sostituzione. Deve essere sempre vuota."""
    return sorted(set(_PLACEHOLDER.findall(html)))


def _pulisci(testo: Any) -> str:
    t = _EMOJI.sub("", str(testo or ""))
    t = t.replace("—", ",").replace("–", "-")
    return " ".join(t.split()).strip()


def _esc(testo: Any) -> str:
    """Testo del cliente nel CORPO della pagina: `<`, `>` e `&` escapati.

    Non si escapano apici e virgolette: in un nodo di testo non servono, e in
    italiano l'apostrofo e' ovunque ("gia'", "l'agenda"). Escaparlo riempirebbe
    il sorgente di `&#x27;` proprio nelle frasi che il cliente deve rileggere.
    Per gli ATTRIBUTI si usa `_attr`, dove le virgolette contano davvero.
    """
    return html_lib.escape(_pulisci(testo), quote=False)


def _attr(testo: Any) -> str:
    """Testo del cliente dentro un attributo HTML: qui le virgolette si escapano."""
    return html_lib.escape(_pulisci(testo), quote=True)


def _come_titolo(testo: Any) -> str:
    """Prima lettera maiuscola, il resto invariato.

    I campi del posizionamento sono frammenti pensati per stare in mezzo a una
    frase ("formazione per terapisti del massaggio thai"): usati come titolo di
    sezione restano minuscoli e la pagina sembra sciatta. `.capitalize()` non va
    bene, abbasserebbe i nomi propri nel resto della stringa.
    """
    t = _pulisci(testo)
    return t[0].upper() + t[1:] if t else t


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
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--slate:#0F172A;--grigio:#64748B;--bordo:#E5E7EB;--giallo:#FACC15;--fondo:#FFFFFF}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Poppins',system-ui,sans-serif;color:var(--slate);background:var(--fondo);line-height:1.65;-webkit-font-smoothing:antialiased}
.wrap{max-width:960px;margin:0 auto;padding:0 24px}
header{padding:28px 0;border-bottom:1px solid var(--bordo)}
.marchio{font-weight:700;font-size:18px;letter-spacing:-.01em}
.hero{padding:88px 0 72px;border-bottom:1px solid var(--bordo)}
.hero h1{font-size:clamp(30px,5vw,54px);font-weight:700;line-height:1.1;letter-spacing:-.02em;max-width:18ch}
.hero .filo{width:56px;height:4px;background:var(--giallo);margin:28px 0 24px;border-radius:2px}
.hero p{font-size:clamp(17px,2vw,20px);color:var(--grigio);max-width:60ch}
section{padding:64px 0;border-bottom:1px solid var(--bordo)}
h2{font-size:clamp(22px,3vw,30px);font-weight:600;letter-spacing:-.01em;margin-bottom:32px}
.occhiello{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--grigio);margin-bottom:10px}
.griglia{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px}
.scheda{border:1px solid var(--bordo);border-radius:12px;padding:26px}
.scheda h3{font-size:17px;font-weight:600;margin-bottom:8px}
.scheda p{font-size:15px;color:var(--grigio)}
.due{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:32px}
.elenco{list-style:none}
.elenco li{padding:11px 0 11px 30px;position:relative;font-size:16px;border-bottom:1px solid var(--bordo)}
.elenco li:last-child{border-bottom:none}
.si li::before{content:"";position:absolute;left:0;top:19px;width:14px;height:3px;background:var(--giallo);border-radius:2px}
.no li{color:var(--grigio)}
.no li::before{content:"";position:absolute;left:0;top:19px;width:14px;height:3px;background:var(--bordo);border-radius:2px}
.bio-blocco{display:grid;grid-template-columns:{BIO_COLONNE};gap:40px;align-items:start}
.bio-blocco img{width:100%;max-width:220px;border-radius:14px;display:block}
.bio-blocco p{color:var(--grigio);font-size:16px}
.contatti a{color:var(--slate);text-decoration:none;border-bottom:2px solid var(--giallo);font-weight:500}
.contatti a:hover{background:var(--giallo)}
.riga-contatti{display:flex;flex-wrap:wrap;gap:28px;font-size:17px}
footer{padding:40px 0 64px;color:var(--grigio);font-size:14px}
@media(max-width:640px){.hero{padding:56px 0 48px}section{padding:48px 0}.bio-blocco{grid-template-columns:1fr}}
</style>
</head>
<body>
<header><div class="wrap"><div class="marchio">{MARCHIO}</div></div></header>

<div class="hero"><div class="wrap">
  <h1>{HEADLINE}</h1>
  <div class="filo"></div>
  <p>{SOTTOTITOLO}</p>
</div></div>

<section><div class="wrap">
  <p class="occhiello">Cosa faccio</p>
  <h2>{TITOLO_COSA_FACCIO}</h2>
  <div class="griglia">{SCHEDE}</div>
</div></section>

<section><div class="wrap">
  <p class="occhiello">Per chi lavoro</p>
  <div class="due">
    <div><h2>Ti riguarda se</h2><ul class="elenco si">{PER_CHI_SI}</ul></div>
    <div><h2>Non fa per te se</h2><ul class="elenco no">{PER_CHI_NO}</ul></div>
  </div>
</div></section>

<section><div class="wrap">
  <p class="occhiello">Chi sono</p>
  <div class="bio-blocco">{FOTO}<div><h2>{NOME}</h2><p>{BIO}</p></div></div>
</div></section>

<section class="contatti"><div class="wrap">
  <p class="occhiello">Parliamone</p>
  <h2>Come mi si contatta</h2>
  <div class="riga-contatti">{CONTATTI}</div>
</div></section>

<footer><div class="wrap">{NOME} · {DOMINIO}</div></footer>
</body>
</html>
"""


def _scheda(voce: dict) -> str:
    return (
        f'<div class="scheda"><h3>{_esc(voce.get("titolo"))}</h3>'
        f'<p>{_esc(voce.get("testo"))}</p></div>'
    )


def _voci(elenco: Any) -> str:
    return "".join(f"<li>{_esc(v)}</li>" for v in (elenco or []) if _pulisci(v))


def _contatti(dati: dict) -> str:
    """Solo i recapiti che esistono davvero. Un contatto inventato e' un vicolo cieco."""
    pezzi = []
    email = _pulisci(dati.get("email_contatto"))
    if "@" in email:
        pezzi.append(f'<span>Email: <a href="mailto:{_attr(email)}">{_esc(email)}</a></span>')
    telefono = _pulisci(dati.get("telefono"))
    if telefono:
        pezzi.append(f"<span>Telefono: {_esc(telefono)}</span>")
    for etichetta, chiave in (("Instagram", "instagram_url"), ("LinkedIn", "linkedin_url")):
        url = _pulisci(dati.get(chiave))
        if url.startswith("http"):
            pezzi.append(f'<span>{etichetta}: <a href="{_attr(url)}">{_esc(url)}</a></span>')
    if not pezzi:
        pezzi.append("<span>Recapiti da inserire prima di pubblicare la pagina.</span>")
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

    A differenza delle bio social, qui una pagina senza testi non esiste. Gli
    elementi del posizionamento sono frasi autonome e corrette: si usano come
    blocchi interi, mai incastrati in una formula (e' l'errore che il 12/8 ha
    prodotto il Brand Positioning Statement sgrammaticato).
    """
    pos = dati.get("posizionamento") or {}
    return {
        "headline": _pulisci(pos.get("idea_differenziante")) or _pulisci(pos.get("categoria")) or _pulisci(dati.get("nicchia")),
        "sottotitolo": _pulisci(pos.get("vantaggio_cliente")),
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
    nome = _pulisci(dati.get("nome")) or _pulisci(pos.get("brand")) or "Il tuo nome"
    dominio = _pulisci(dati.get("dominio")) or DOMINIO_DA_SCEGLIERE
    foto = _pulisci(dati.get("foto_url"))
    headline = _pulisci(testi.get("headline"))

    params = {
        "TITOLO_PAGINA": _esc(f"{nome} · {_pulisci(pos.get('categoria')) or _pulisci(dati.get('nicchia'))}".strip(" ·")),
        "META_DESCRIPTION": _attr(testi.get("sottotitolo")),
        "MARCHIO": _esc(_pulisci(pos.get("brand")) or nome),
        "HEADLINE": _esc(headline),
        "SOTTOTITOLO": _esc(testi.get("sottotitolo")),
        "TITOLO_COSA_FACCIO": _esc(_come_titolo(pos.get("categoria")) or "Il lavoro che faccio"),
        "SCHEDE": "".join(_scheda(v) for v in (testi.get("cosa_faccio") or []) if isinstance(v, dict)),
        "PER_CHI_SI": _voci(testi.get("per_chi_si")),
        "PER_CHI_NO": _voci(testi.get("per_chi_no")),
        "NOME": _esc(nome),
        "BIO": _esc(testi.get("bio")),
        "FOTO": f'<img src="{_attr(foto)}" alt="{_attr(nome)}">' if foto.startswith("http") else "",
        "BIO_COLONNE": "220px 1fr" if foto.startswith("http") else "1fr",
        "CONTATTI": _contatti(dati),
        "DOMINIO": _esc(dominio),
    }
    pagina = _render(VETRINA_TEMPLATE, params)

    residui = placeholder_residui(pagina)
    if residui:
        # Non si consegna una pagina con `{CHIAVE}` a video o dentro un <style>.
        logger.error("[START_VETRINA] Placeholder non sostituiti: %s", residui)
        raise RuntimeError(f"Template vetrina incompleto: {', '.join(residui)}")

    return {
        "_fallback": fallback,
        "nota": _NOTA_FALLBACK if fallback else "",
        "html": pagina,
        "dominio": dominio,
        "checklist_dns": checklist_dns(dominio),
        "vende": False,
    }
