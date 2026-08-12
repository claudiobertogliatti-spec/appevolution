"""Render PDF del Brand Kit del partner.

Identità visiva (logo + foto + 3 colori) + voce (tone of voice + parole chiave +
parole da evitare).

⚠️ Rifatto il 12/8/2026 sul tema condiviso `ciak_doc_theme`.
ℹ️ Perimetri: la **cornice** del documento è Ciak (interno, brand lock), i colori
   mostrati nelle campionature sono quelli del **partner** (esterno). Non è
   contaminazione: il brand del partner è il contenuto, non la grafica.
   Il rosso delle parole da evitare è `#F43F5E`, il colore semantico d'urgenza
   deciso il 5/8/2026 — usato qui in senso funzionale (negazione), non decorativo.
"""
import logging
from typing import Any

from .ciak_doc_theme import cover, documento, esc, foot, render_pdf

logger = logging.getLogger(__name__)

_CSS_EXTRA = """
.bk-visual{ display:flex; gap:8mm; }
.bk-card{ flex:1; border:1px solid var(--line); border-radius:3mm; padding:5mm; text-align:center; }
.bk-card .lab{ font-size:8.5pt; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin-bottom:4mm; }
.bk-card img{ max-width:100%; max-height:42mm; object-fit:contain; display:block; margin:0 auto; }
.bk-card .missing{ color:var(--muted); font-style:italic; font-size:10pt; padding:12mm 0; }

.bk-palette{ display:flex; gap:6mm; }
.bk-swatch{ flex:1; }
/* Il campione è alto e pieno: su un brand kit il colore deve potersi giudicare. */
.bk-chip{ height:30mm; border-radius:3mm; border:1px solid var(--line); }
.bk-hex{ font-family:'Space Mono', monospace; font-size:9.5pt; color:var(--ink); margin-top:2.5mm; font-weight:700; text-align:center; letter-spacing:.02em; }
.bk-role{ font-size:8.5pt; color:var(--muted); text-align:center; margin-top:.5mm; }

.bk-pills{ display:flex; flex-wrap:wrap; gap:2.5mm; }
.bk-pill{ background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:2mm 5mm; font-size:10.5pt; color:var(--ink); font-weight:500; }
.bk-pill.avoid{ border-color:#FDA4AF; color:#F43F5E; text-decoration:line-through; background:#fff; }
"""

_RUOLI = ["Colore principale", "Colore d'accento", "Colore di supporto"]


def _asset_card(label: str, url: str) -> str:
    dentro = (
        f'<img src="{esc(url)}" alt="{esc(label)}">' if url
        else '<div class="missing">Non caricato</div>'
    )
    return f'<div class="bk-card"><div class="lab">{esc(label)}</div>{dentro}</div>'


def _swatch(hex_color: str, ruolo: str) -> str:
    safe = esc(hex_color)
    return (
        f'<div class="bk-swatch"><div class="bk-chip" style="background:{safe}"></div>'
        f'<div class="bk-hex">{safe.upper()}</div><div class="bk-role">{esc(ruolo)}</div></div>'
    )


def _pills(items: list, avoid: bool = False) -> str:
    items = [i for i in (items or []) if (i or "").strip()]
    if not items:
        return '<div class="doc-empty">Nessuna voce indicata.</div>'
    cls = "bk-pill avoid" if avoid else "bk-pill"
    return '<div class="bk-pills">' + "".join(
        f'<span class="{cls}">{esc(i)}</span>' for i in items
    ) + "</div>"


# Testo NOSTRO, fisso: regole d'uso concrete. Un brand kit che elenca i colori
# senza dire come si usano non evita l'errore che deve evitare.
_GUIDA = {
    1: {
        "testo": "Questi elementi non si cambiano a ogni pubblicazione: il riconoscimento nasce "
                 "dalla ripetizione, e un progetto che cambia aspetto ogni volta costringe il "
                 "pubblico a ricominciare da capo. Il colore principale va sui titoli e sulle "
                 "aree piene, l'accento solo sui pulsanti e sui dettagli da far notare, il colore "
                 "di supporto sui fondi. Se usi l'accento dappertutto smette di essere un accento "
                 "e non guida più l'occhio da nessuna parte. Il logo va su fondo pieno e con "
                 "spazio libero attorno: mai sopra una foto affollata, mai deformato per farlo "
                 "entrare in uno spazio, mai ricolorato per farlo intonare con la grafica.",
        "errore": "Trattare il brand kit come un vezzo estetico da sistemare più avanti. "
                  "Rifare tutti i materiali dopo sei mesi di pubblicazioni costa molto più "
                  "tempo che deciderlo adesso.",
    },
    2: {
        "testo": "Il tono di voce serve soprattutto quando scrivi di fretta: è la regola a cui "
                 "tornare per non assomigliare a tutti gli altri nel momento in cui non hai tempo "
                 "di pensarci. Le parole chiave vanno usate davvero, nei titoli, nelle email e "
                 "nelle descrizioni dei moduli, perché diventino le tue e il pubblico le associ "
                 "a te. Le parole da evitare contano quanto le altre: sono quelle che ti farebbero "
                 "confondere con i concorrenti da cui vuoi distinguerti, e di solito sono proprio "
                 "quelle che vengono più naturali perché le usano tutti.",
        "errore": "Scrivere un tono di voce fatto di aggettivi generici come professionale, "
                  "empatico, coinvolgente. Non aiutano a decidere niente. Serve una regola "
                  "operativa: do del tu, non uso termini tecnici senza spiegarli, non prometto "
                  "risultati garantiti.",
    },
}


def _gruppo(num: int, titolo: str, sottotitolo: str, corpo: str) -> str:
    g = _GUIDA.get(num) or {}
    guida_html = (
        f'<div class="doc-guida"><p>{esc(g["testo"])}</p>'
        f'<p class="errore"><b>L\'errore da evitare.</b> {esc(g["errore"])}</p></div>'
    ) if g else ""
    return (
        f'<section class="doc-group"><div class="doc-group-head">'
        f'<h2><span class="doc-num">{num}</span>{esc(titolo)}</h2>'
        f'<div class="sub">{esc(sottotitolo)}</div></div>{guida_html}{corpo}</section>'
    )


def render_brand_kit_html(data: dict, nome: str) -> str:
    """data: logo_url, foto_url, colors (list[str] HEX), tone_of_voice,
    parole_chiave (list[str]), parole_evitare (list[str])."""
    logo_url = (data.get("logo_url") or "").strip()
    foto_url = (data.get("foto_url") or "").strip()
    colors = data.get("colors") or []
    tone = (data.get("tone_of_voice") or "").strip()

    swatches = "".join(
        _swatch(c, _RUOLI[i] if i < len(_RUOLI) else "Colore di supporto")
        for i, c in enumerate(colors)
    ) or '<div class="doc-empty">Colori non ancora definiti.</div>'

    tone_html = (
        f'<div class="doc-qa"><div class="ans">{esc(tone)}</div></div>' if tone
        else '<div class="doc-empty">Tone of voice non compilato.</div>'
    )

    corpo = (
        _gruppo(1, "Identità visiva", "Logo, foto e colori: gli asset con cui ti riconoscono.",
                f'<div class="bk-visual">{_asset_card("Logo", logo_url)}'
                f'{_asset_card("Foto personale", foto_url)}</div>'
                f'<div style="margin-top:7mm"><div class="doc-qa"><div class="lab">Palette</div></div>'
                f'<div class="bk-palette">{swatches}</div></div>')
        + _gruppo(2, "La tua voce", "Come parli, e le parole che fanno suono di te.",
                  f'<div class="doc-qa"><div class="lab">Tone of voice</div></div>{tone_html}'
                  f'<div class="doc-qa" style="margin-top:6mm"><div class="lab">Parole chiave</div></div>'
                  f'{_pills(data.get("parole_chiave"))}'
                  f'<div class="doc-qa" style="margin-top:6mm"><div class="lab">Parole da evitare</div></div>'
                  f'{_pills(data.get("parole_evitare"), avoid=True)}')
    )

    return documento(
        f"Brand Kit di {esc(nome)}",
        cover(
            kicker="Metodo EVO · Fase Esamina",
            titolo="Il tuo Brand Kit",
            sottotitolo="Gli elementi fissi della tua identità: da qui in avanti, "
                        "tutto quello che pubblichi parte da questa pagina.",
            meta=f"Preparato per <strong>{esc(nome)}</strong>",
        )
        + f'<main class="doc-body">{corpo}</main>'
        + foot(nome),
        _CSS_EXTRA,
    )


async def genera_brand_kit_pdf(data: dict, nome: str) -> bytes:
    return await render_pdf(render_brand_kit_html(data, nome), f"Brand Kit · {nome}")
