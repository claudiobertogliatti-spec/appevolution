"""Il libretto del progetto Ciak Start: un solo PDF che racconta cosa e' stato costruito.

Per il cliente Start e' la versione "tutto insieme" dei suoi materiali: dove siamo,
posizionamento, marchio, profili social, sito vetrina, ciclo di 60 giorni. Si genera
a ogni richiesta, quindi e' "sempre aggiornato" senza dover rifare nulla.

Regole:
  - mostra SOLO i materiali APPROVATI dal team: una bozza non e' un lavoro consegnato
    (come per l'area cliente) e per quel materiale scrive "in lavorazione";
  - e' il documento di Start: niente "Metodo EVO", "fasi", "Workbook" (sono della
    Partnership). L'unico cenno alla Partnership e' l'ultima pagina, voluta da Claudio,
    con la frase che la pagina Start dice gia' ("si scala per intero, non paghi due volte");
  - documento INTERNO Ciak: cornice nel tema condiviso `ciak_doc_theme` (brand lock);
    i colori del cliente sono solo il contenuto delle campionature.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from services.ciak_doc_theme import cover, documento, esc, foot, render_pdf
from services.start_pdf import _CSS as _CSS_POSIZIONAMENTO
from services.start_pdf import render_posizionamento_corpo

# (tipo deliverable, nome mostrato) nell'ordine della consegna. Verifica finale esclusa:
# non ha data promessa e non e' un materiale del cliente.
MATERIALI = (
    ("positioning", "Posizionamento"),
    ("brand_kit", "Marchio"),
    ("social_profiles", "Profili social"),
    ("showcase", "Sito vetrina"),
    ("content_plan_90d", "Ciclo di 60 giorni"),
)

_HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")
_RUOLI = ("Colore principale", "Colore d'accento", "Colore di supporto")

_CSS = """
.sl-stato{ list-style:none; margin:0; padding:0; }
.sl-stato li{ display:flex; justify-content:space-between; gap:6mm; padding:3mm 0; border-bottom:1px solid var(--line); font-size:11pt; }
.sl-stato .ok{ font-weight:600; color:var(--ink); }
.sl-stato .wip{ color:var(--muted); }
.sl-palette{ display:flex; gap:6mm; margin:3mm 0 5mm; }
.sl-sw{ flex:1; }
.sl-chip{ height:22mm; border-radius:3mm; border:1px solid var(--line); }
.sl-hex{ font-family:'Space Mono', monospace; font-size:9pt; font-weight:700; margin-top:2mm; text-align:center; }
.sl-role{ font-size:8.5pt; color:var(--muted); text-align:center; }
.sl-pills{ display:flex; flex-wrap:wrap; gap:2.5mm; }
.sl-pill{ background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:1.8mm 4.5mm; font-size:10pt; }
.sl-fase{ margin:0 0 5mm; }
.sl-fase h3{ margin:0 0 1mm; font-size:12pt; }
.sl-fase p{ margin:0; font-size:10.5pt; color:var(--muted); }
.sl-wip-box{ font-size:10.5pt; color:var(--muted); font-style:italic; padding:3mm 0; }
.sl-link{ font-weight:600; word-break:break-all; }
"""


def _gruppo(num: int, titolo: str, sottotitolo: str, corpo: str) -> str:
    return (
        '<section class="doc-group"><div class="doc-group-head">'
        f'<h2><span class="doc-num">{num}</span>{esc(titolo)}</h2>'
        f'<div class="sub">{esc(sottotitolo)}</div></div>{corpo}</section>'
    )


def _in_lavorazione(nome: str) -> str:
    return (
        f'<div class="sl-wip-box">{esc(nome)}: in lavorazione. '
        "Lo trovi qui appena il team lo ha controllato e approvato.</div>"
    )


def _qa(etichetta: str, valore: str) -> str:
    if not (valore or "").strip():
        return ""
    return f'<div class="doc-qa"><div class="lab">{esc(etichetta)}</div><div class="ans">{esc(valore)}</div></div>'


def _https(url: Any) -> str:
    url = str(url or "").strip()
    return url if url.startswith("https://") and " " not in url else ""


def _sezione_marchio(brand: dict[str, Any]) -> str:
    colori = [c for c in (brand.get("colors") or []) if isinstance(c, str) and _HEX.match(c)]
    palette = "".join(
        f'<div class="sl-sw"><div class="sl-chip" style="background:{esc(c)}"></div>'
        f'<div class="sl-hex">{esc(c.upper())}</div>'
        f'<div class="sl-role">{esc(_RUOLI[i] if i < len(_RUOLI) else "Colore di supporto")}</div></div>'
        for i, c in enumerate(colori)
    )
    parole = [p for p in (brand.get("parole_chiave") or []) if str(p).strip()]
    pills = (
        '<div class="doc-qa"><div class="lab">Parole chiave</div></div>'
        '<div class="sl-pills">' + "".join(f'<span class="sl-pill">{esc(p)}</span>' for p in parole) + "</div>"
        if parole else ""
    )
    return (
        (f'<div class="doc-qa"><div class="lab">Colori</div></div><div class="sl-palette">{palette}</div>' if palette else "")
        + _qa("Carattere", brand.get("font") or "")
        + _qa("Come parli", brand.get("tone_of_voice") or "")
        + pills
    ) or '<div class="doc-empty">Scelte sul marchio non ancora indicate.</div>'


def _sezione_social(doc: dict[str, Any]) -> str:
    righe = [
        _qa("Nome del profilo", doc.get("nome_visualizzato") or ""),
        _qa("Link in bio", doc.get("link_in_bio") or ""),
        _qa("Instagram", (doc.get("instagram") or {}).get("bio") or ""),
        _qa("Facebook", (doc.get("facebook") or {}).get("descrizione") or ""),
        _qa("LinkedIn · titolo", (doc.get("linkedin") or {}).get("headline") or ""),
        _qa("LinkedIn · informazioni", (doc.get("linkedin") or {}).get("about") or ""),
        _qa("TikTok", (doc.get("tiktok") or {}).get("bio") or ""),
        _qa("Immagine di copertina · titolo", (doc.get("cover") or {}).get("titolo") or ""),
        _qa("Immagine di copertina · sottotitolo", (doc.get("cover") or {}).get("sottotitolo") or ""),
    ]
    evidenza = [v for v in (doc.get("in_evidenza") or []) if str(v).strip()]
    if evidenza:
        righe.append(
            '<div class="doc-qa"><div class="lab">Storie in evidenza</div></div><div class="sl-pills">'
            + "".join(f'<span class="sl-pill">{esc(v)}</span>' for v in evidenza) + "</div>"
        )
    return "".join(r for r in righe if r) or '<div class="doc-empty">Testi non ancora disponibili.</div>'


def _sezione_vetrina(doc: dict[str, Any]) -> str:
    url = _https(doc.get("live_url"))
    if not url:
        return '<div class="sl-wip-box">La tua pagina è pronta: la mettiamo online e ti scriviamo qui l\'indirizzo.</div>'
    return (
        '<div class="doc-qa"><div class="lab">La tua pagina è online</div>'
        f'<div class="ans sl-link">{esc(url)}</div></div>'
    )


_APOSTROFI = (
    ("perche'", "perché"), ("cosi'", "così"), ("piu'", "più"), ("gia'", "già"), ("puo'", "può"),
    ("e' ", "è "), ("E' ", "È "),
)


def _accenti(testo: Any) -> str:
    """I testi fissi del generatore del calendario usano l'apostrofo ("e'", "perche'"):
    in un documento per il cliente si scrivono con l'accento."""
    t = str(testo or "")
    for brutto, bello in _APOSTROFI:
        t = t.replace(brutto, bello)
    return t


def _sezione_ciclo(doc: dict[str, Any]) -> str:
    calendario = doc.get("calendar") or {}
    fasi = calendario.get("fasi") or []
    if not fasi:
        return '<div class="doc-empty">Piano non ancora disponibile.</div>'
    ritmo = _accenti(calendario.get("ritmo")).strip()
    blocchi = "".join(
        f'<div class="sl-fase"><h3>{esc(_accenti(f.get("fase")))}</h3><p>{esc(_accenti(f.get("obiettivo")))}</p>'
        f'<p>{len(f.get("giorni") or [])} contenuti</p></div>'
        for f in fasi
    )
    return (f'<div class="doc-qa"><div class="ans">{esc(ritmo)}</div></div>' if ritmo else "") + blocchi


def _prossimi_passi(approvati: set[str]) -> list[str]:
    passi = []
    if "showcase" in approvati:
        passi.append("Condividi l'indirizzo del tuo sito vetrina nel profilo e nelle conversazioni.")
    if "social_profiles" in approvati:
        passi.append("Aggiorna i tuoi profili social con i testi preparati per te.")
    if "content_plan_90d" in approvati:
        passi.append("Parti dal giorno 1 del ciclo di 60 giorni: i giorni sono un ritmo, non una gara.")
    mancanti = [nome for tipo, nome in MATERIALI if tipo not in approvati]
    if mancanti:
        passi.append(f"Il team sta ultimando: {', '.join(m.lower() for m in mancanti)}. Ti avvisiamo qui quando sono pronti.")
    return passi or ["Hai tutti i materiali di Ciak Start. Scrivici se vuoi rivedere qualcosa."]


def render_libretto_html(
    nome: str, approvati: dict[str, dict[str, Any]], brand: dict[str, Any], oggi: datetime | None = None
) -> str:
    """`approvati`: i deliverable APPROVATI per tipo (gli altri non vanno passati)."""
    oggi = oggi or datetime.now(timezone.utc)
    pronti = set(approvati)

    stato = "".join(
        f'<li><span>{esc(nome_mat)}</span>'
        + ('<span class="ok">Pronto</span>' if tipo in pronti else '<span class="wip">In lavorazione</span>')
        + "</li>"
        for tipo, nome_mat in MATERIALI
    )
    n = len([t for t, _ in MATERIALI if t in pronti])
    tot = len(MATERIALI)
    titolo_stato = f"Tutti e {tot} i materiali sono pronti." if n == tot else f"{n} su {tot} materiali pronti."

    def sez(tipo: str, nome_mat: str, render) -> str:
        return render(approvati[tipo]) if tipo in pronti else _in_lavorazione(nome_mat)

    corpo = (
        _gruppo(1, "A che punto siamo", titolo_stato,
                f'<ul class="sl-stato">{stato}</ul>')
        + _gruppo(2, "Il tuo posizionamento", "Chi sei, per chi lavori e cosa ti rende diverso.",
                  sez("positioning", "Posizionamento", render_posizionamento_corpo))
        + _gruppo(3, "Il tuo marchio", "Colori, carattere e modo di parlare.",
                  _sezione_marchio(brand) if "brand_kit" in pronti else _in_lavorazione("Marchio"))
        + _gruppo(4, "I tuoi profili social", "I testi pronti da copiare sui tuoi profili.",
                  sez("social_profiles", "Profili social", _sezione_social))
        + _gruppo(5, "Il tuo sito vetrina", "La pagina che ti presenta online.",
                  sez("showcase", "Sito vetrina", _sezione_vetrina))
        + _gruppo(6, "Il tuo ciclo di 60 giorni", "Cosa pubblicare, e quando.",
                  sez("content_plan_90d", "Ciclo di 60 giorni", _sezione_ciclo))
        + _gruppo(7, "E adesso", "Cosa fare ora, e cosa si può fare dopo.",
                  '<ul class="sl-stato">' + "".join(f"<li><span>{esc(p)}</span></li>" for p in _prossimi_passi(pronti)) + "</ul>"
                  + '<div class="doc-qa" style="margin-top:6mm"><div class="lab">Se vorrai andare oltre</div>'
                  '<div class="ans">Con la Partnership il percorso riparte da dove sei arrivato: il costo di Ciak Start '
                  "si scala per intero, non paghi due volte.</div></div>")
    )
    data = oggi.strftime("%d/%m/%Y")
    return documento(
        f"Il progetto Start di {esc(nome)}",
        cover(
            kicker="Ciak Start · Il tuo progetto",
            titolo="Il tuo progetto Start",
            sottotitolo="Tutto quello che costruiamo insieme, in un solo documento. "
                        "Si aggiorna ogni volta che approviamo un nuovo materiale.",
            meta=f"Preparato per <strong>{esc(nome)}</strong> · aggiornato al {esc(data)}",
        )
        + f'<main class="doc-body">{corpo}</main>'
        + foot(nome),
        _CSS + _CSS_POSIZIONAMENTO,
    )


async def genera_libretto_start_pdf(db, client_id: str) -> bytes:
    """PDF del libretto con i soli materiali approvati. Solleva se il cliente non esiste."""
    client = await db.ciak_clients.find_one({"id": client_id}, {"_id": 0, "name": 1, "email": 1}) or {}
    nome = client.get("name") or client.get("email") or "Cliente"
    approvati: dict[str, dict[str, Any]] = {}
    async for d in db.ciak_start_deliverables.find(
        {"partner_id": client_id, "approval_status": "approved"}, {"_id": 0}
    ):
        approvati[d.get("type")] = d
    brand_step = await db.partner_journey_steps.find_one(
        {"partner_id": client_id, "step_id": "03-brand-kit"}, {"_id": 0, "data": 1}
    ) or {}
    html = render_libretto_html(nome, approvati, brand_step.get("data") or {})
    return await render_pdf(html, f"Il tuo progetto Start · {nome}")
