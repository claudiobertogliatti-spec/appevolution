"""Render PDF del Documento di Posizionamento del partner.

20 domande in 5 sezioni + Sintesi strategica rivista da Valentina (avatar,
consapevolezza, 3 obiezioni) + Brand Positioning Statement (metodo De Veglia).

⚠️ Rifatto il 12/8/2026 sul tema condiviso `ciak_doc_theme`. Prima: marchio
scritto come testo al posto del logo reale, numeri di sezione in `#FACC15` su
bianco (giallo come testo, contro la regola del brand kit), corpo grigio e
nessuna numerazione di pagina.
"""
import logging
from typing import Any

from .ciak_doc_theme import cover, documento, esc, foot, render_pdf

logger = logging.getLogger(__name__)


# `guida` è testo NOSTRO, fisso: spiega perché il gruppo esiste e dove finisce
# nel lavoro. Non contiene dati sul partner — quelli arrivano dalle risposte.
SECTIONS_GROUPED = [
    {
        "header": "A chi parli",
        "subtitle": "L'ICP scolpito: chi, dove ti cerca, cosa teme e desidera.",
        "guida": "Un corso pensato per tutti non lo compra nessuno. Definire strettamente a chi "
                 "parli è ciò che rende la promessa riconoscibile e il prezzo difendibile. "
                 "Da qui in avanti ogni scelta, dal titolo ai moduli al funnel, si misura "
                 "su queste persone: se un materiale non parla a loro, non entra nel progetto. Restringere fa paura perché sembra rinunciare a clienti, ma è il contrario: è l'unico modo per farti scegliere da chi ti somiglia, invece di essere la seconda scelta di tutti.",
        "errore": "Descrivere il target per dati anagrafici. Sapere che ha fra i 30 e i 45 anni non serve a niente. Serve sapere in che momento si trova, cosa ha già provato senza risultato e cosa teme che gli succeda se non risolve.",
        "items": [
            ("nicchia",                "01", "Nicchia precisa"),
            ("momento_di_vita",        "02", "Momento di vita / carriera"),
            ("livello_consapevolezza", "03", "Livello di consapevolezza"),
            ("paure_avatar",           "04", "Paure del cliente"),
            ("desideri_avatar",        "05", "Desideri profondi"),
            ("costo_del_no",           "06", "Il costo del NO"),
        ],
    },
    {
        "header": "Cosa vendi",
        "subtitle": "Promessa, trasformazione, prezzo, formato.",
        "guida": "La promessa è la frase che il cliente ripeterà a un amico per spiegare cosa fai. "
                 "Se serve un paragrafo per dirla, non è ancora una promessa. "
                 "Diventa il titolo della masterclass e l'headline del funnel: vale la pena "
                 "riscriverla finché sta in una riga. Il prezzo non è un numero che si sceglie alla fine: comunica a chi ti stai rivolgendo. Un prezzo troppo basso non porta più clienti, porta i clienti sbagliati e fa lavorare il doppio per guadagnare la metà.",
        "errore": "Promettere un risultato che non dipende solo da te. Una promessa che non puoi mantenere produce rimborsi e recensioni negative, e costa molto più di quello che fa incassare.",
        "items": [
            ("promessa",            "07", "Promessa in 1 frase"),
            ("trasformazione_90gg", "08", "Trasformazione in 90 giorni"),
            ("prezzo_e_formato",    "09", "Prezzo e formato"),
        ],
    },
    {
        "header": "Il tuo metodo",
        "subtitle": "Il modo riconoscibile in cui produci risultati.",
        "guida": "Il metodo è ciò che trasforma la tua competenza in un prodotto ripetibile. "
                 "Dargli un nome e degli step non è marketing: è la differenza fra vendere ore "
                 "e vendere un percorso. È anche la struttura da cui nascono i moduli del corso. È anche quello che ti permette di non ricominciare da zero con ogni cliente: un metodo scritto si insegna, si delega e si migliora nel tempo.",
        "errore": "Inventare un nome che suona bene ma non descrive niente. Il nome del metodo deve dire cosa fa o per chi è pensato, altrimenti è solo un'etichetta in più da spiegare.",
        "items": [
            ("metodo_nome",            "10", "Nome metodo"),
            ("metodo_step",            "11", "Step del metodo"),
            ("prova_sociale_concreta", "12", "Prova sociale concreta"),
        ],
    },
    {
        "header": "Perché tu",
        "subtitle": "La voce che ti rende difficile da copiare.",
        "guida": "Il metodo si può imitare, la tua storia no. Origin story e punto di vista "
                 "contrarian sono ciò che resta quando un concorrente copia il programma. "
                 "Alimentano la pagina “Chi sono”, i contenuti social e la parte della live "
                 "in cui il pubblico decide se fidarsi. Sono anche la parte più difficile da scrivere, perché richiede di esporsi.",
        "errore": "Costruire un punto di vista contrarian per sembrare originale. Se non lo pensi davvero, salta fuori alla prima domanda difficile in diretta.",
        "items": [
            ("origin_story",             "13", "Origin story"),
            ("contrarian_view",          "14", "Punto di vista contrarian"),
            ("differenza_riconoscibile", "15", "Come ti descriverebbero"),
        ],
    },
    {
        "header": "Contro chi giochi",
        "subtitle": "Il posizionamento competitivo, metodo De Veglia.",
        "guida": "Posizionarsi significa scegliere contro chi giochi e dichiarare per chi NON sei. "
                 "Il limite onesto non fa perdere clienti: fa arrivare quelli giusti e taglia i "
                 "rimborsi. Le risposte di questo gruppo diventano le obiezioni da gestire nella "
                 "live e le FAQ del funnel. Dichiarare per chi non sei adatto è il modo più veloce per essere creduto su tutto il resto.",
        "errore": "Evitare di nominare i concorrenti per non dare loro visibilità. Il cliente li conosce già e li sta confrontando comunque: se non gli dai tu i criteri per scegliere, li sceglie lui a caso.",
        "items": [
            ("concorrenti_principali", "16", "Concorrenti principali"),
            ("mercato_affollato",      "17", "Promessa affollata del settore"),
            ("obiezione_principale",   "18", "Obiezione n.1 + risposta"),
            ("limite_onesto",          "19", "Per chi NON è adatto"),
            ("spazio_specialista",     "20", "Il tuo spazio da specialista"),
        ],
    },
]

_CSS_EXTRA = """
/* Lo statement è la conclusione del lavoro: è l'unico blocco su fondo pieno. */
.pz-stmt{ background:var(--ink); color:#fff; border-radius:3mm; padding:8mm; margin-bottom:9mm; page-break-inside:avoid; }
.pz-stmt .h{ font-size:8.5pt; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--yellow); }
.pz-stmt .frase{ font-size:15pt; font-weight:500; line-height:1.5; margin-top:4mm; }
/* Quando la sintesi non c'e', la dichiarazione sta in corpo minore. */
.pz-stmt .frase.nota{ font-size:10.5pt; font-weight:400; color:#E2E8F0; }
.pz-stmt .slots{ margin-top:6mm; padding-top:5mm; border-top:1px solid rgba(255,255,255,.18); }
.pz-stmt .slot{ display:flex; gap:5mm; font-size:9.5pt; padding:1.5mm 0; }
.pz-stmt .slot .k{ flex:0 0 42mm; color:var(--yellow); font-weight:600; text-transform:uppercase; letter-spacing:.06em; font-size:8pt; padding-top:.6mm; }
.pz-stmt .slot .v{ color:#E2E8F0; }
.pz-stmt .note{ font-size:8.5pt; color:#94A3B8; margin-top:5mm; }

.pz-obz{ border-top:1px solid var(--line); padding:3mm 0; }
.pz-obz .tipo{ display:inline-block; background:var(--yellow); color:var(--ink); font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:.06em; padding:.8mm 3mm; border-radius:999px; margin-bottom:1.5mm; }
.pz-obz .q{ font-size:10.5pt; font-weight:600; color:var(--ink); }
.pz-obz .a{ font-size:10.5pt; color:var(--muted); margin-top:.8mm; }

.pz-item{ margin-bottom:5mm; page-break-inside:avoid; }
.pz-item .lab{ font-size:8.5pt; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.pz-item .lab .n{ color:var(--ink); }
.pz-item .val{ font-size:11pt; color:var(--ink); margin-top:1mm; max-width:165mm; white-space:pre-wrap; }
.pz-item .val em{ color:var(--muted); }
"""

_STMT_SLOTS = [
    ("brand", "Brand / nome"),
    ("categoria", "Categoria"),
    ("idea_differenziante", "Idea differenziante"),
    ("a_differenza_di", "A differenza di"),
    ("vantaggio_cliente", "Vantaggio cliente"),
]


def _statement(statement: dict | None) -> str:
    if not statement or not (statement.get("frase") or "").strip():
        return ""
    slots = "".join(
        f'<div class="slot"><div class="k">{esc(label)}</div>'
        f'<div class="v">{esc(statement.get(key, "")).strip()}</div></div>'
        for key, label in _STMT_SLOTS
        if (statement.get(key) or "").strip()
    )
    # Col fallback la "frase" non è uno statement ma la dichiarazione che manca:
    # va scritta in corpo minore, non a 15pt come fosse la sintesi del progetto.
    classe = "frase nota" if statement.get("_fallback") else "frase"
    return (
        '<div class="pz-stmt">'
        '<div class="h">Brand Positioning Statement · metodo De Veglia</div>'
        f'<div class="{classe}">{esc(statement["frase"]).strip()}</div>'
        + (f'<div class="slots">{slots}</div>' if slots else "")
        + '<div class="note">Generato dalle tue risposte e rifinito con Valentina. Sempre modificabile.</div>'
        '</div>'
    )


def _revisione(revisione: dict | None) -> str:
    if not revisione:
        return ""
    sintesi = esc(revisione.get("sintesi_strategica", "")).strip()
    avatar = esc(revisione.get("avatar", "")).strip()
    consap = esc(revisione.get("consapevolezza", "")).strip()
    obiez = revisione.get("obiezioni") or []
    if not (sintesi or avatar or consap or obiez):
        return ""

    blocchi = []
    for etichetta, valore in (
        ("Sintesi strategica", sintesi),
        ("Avatar, chi servi", avatar),
        ("Livello di consapevolezza", consap),
    ):
        if valore:
            blocchi.append(
                f'<div class="doc-qa"><div class="lab">{etichetta}</div>'
                f'<div class="ans">{valore}</div></div>'
            )

    if isinstance(obiez, list) and obiez:
        righe = []
        for o in obiez:
            if not isinstance(o, dict):
                continue
            q = esc(o.get("obiezione", "")).strip()
            if not q:
                continue
            tipo = esc(o.get("tipo", "")).strip()
            a = esc(o.get("risposta", "")).strip()
            # Le parti si costruiscono FUORI dalla f-string: il container gira
            # Python 3.11, dove un backslash dentro l'espressione e' un SyntaxError.
            tag_tipo = f'<span class="tipo">{tipo}</span>' if tipo else ""
            tag_risposta = f'<div class="a">{a}</div>' if a else ""
            righe.append(
                f'<div class="pz-obz">{tag_tipo}<div class="q">{q}</div>{tag_risposta}</div>'
            )
        if righe:
            blocchi.append(
                '<div class="doc-qa"><div class="lab">Le 3 obiezioni</div></div>' + "".join(righe)
            )

    return (
        '<div class="doc-callout"><div class="h">Sintesi strategica · rivista da Valentina</div>'
        f'<div class="b">{"".join(blocchi)}</div></div>'
    )


def render_posizionamento_html(
    answers: dict, nome: str, statement: dict | None = None, revisione: dict | None = None
) -> str:
    """Costruisce l'HTML del Documento di Posizionamento dalle 20 risposte in 5 sezioni."""
    gruppi = []
    for i, group in enumerate(SECTIONS_GROUPED, start=1):
        items = []
        for key, num, label in group["items"]:
            value = esc(answers.get(key, "")).strip() or "<em>Non compilato</em>"
            items.append(
                f'<div class="pz-item"><div class="lab"><span class="n">{num}</span> &middot; {esc(label)}</div>'
                f'<div class="val">{value}</div></div>'
            )
        guida, errore = group.get("guida", ""), group.get("errore", "")
        guida_html = (
            f'<div class="doc-guida"><p>{esc(guida)}</p>'
            + (f'<p class="errore"><b>L\'errore da evitare.</b> {esc(errore)}</p>' if errore else "")
            + "</div>"
        ) if guida else ""
        gruppi.append(
            f'<section class="doc-group"><div class="doc-group-head">'
            f'<h2><span class="doc-num">{i}</span>{esc(group["header"])}</h2>'
            f'<div class="sub">{esc(group["subtitle"])}</div></div>'
            f'{guida_html}{"".join(items)}</section>'
        )

    corpo = _statement(statement) + _revisione(revisione) + "".join(gruppi)
    return documento(
        f"Documento di Posizionamento di {esc(nome)}",
        cover(
            kicker="Metodo EVO · Fase Esamina",
            titolo="Il tuo Posizionamento",
            sottotitolo="A chi parli, cosa prometti e perché dovrebbero scegliere te. "
                        "È il documento da cui nascono masterclass, corso e funnel.",
            meta=f"Preparato per <strong>{esc(nome)}</strong>",
        )
        + f'<main class="doc-body">{corpo}</main>'
        + foot(nome),
        _CSS_EXTRA,
    )


async def genera_posizionamento_pdf(
    answers: dict, nome: str, statement: dict | None = None, revisione: dict | None = None
) -> bytes:
    return await render_pdf(
        render_posizionamento_html(answers, nome, statement, revisione),
        f"Posizionamento · {nome}",
    )
