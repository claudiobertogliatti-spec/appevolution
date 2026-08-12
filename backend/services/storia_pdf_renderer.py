"""Render PDF del documento "La tua storia" del partner (Esamina, Valentina).

21 risposte in 6 blocchi narrativi (origini, problema, svolta, percorso,
trasformazione, oggi).

⚠️ Rifatto il 12/8/2026 sul tema condiviso `ciak_doc_theme`. Prima aveva:
copertina navy senza alcun logo, `font-family:'Poppins'` dichiarato ma **mai
importato** (quindi in container cadeva su un sans generico), testo `#1F2933`
fuori palette e nessuna numerazione di pagina.
"""
import logging
from typing import Any

from .ciak_doc_theme import cover, documento, esc, foot, render_pdf

logger = logging.getLogger(__name__)

# (id, label, guida) raggruppati per blocco. Gli id combaciano con storiaQuestions.js.
# La `guida` è testo NOSTRO: dice dove finisce quel materiale nel lavoro reale.
# Non contiene dati sul partner.
GUIDA_BLOCCHI = {
    "Le tue origini": {
        "testo": "Da dove vieni serve a rendere credibile dove sei arrivato. Chi ti ascolta non "
                 "si identifica con il professionista che sei oggi: si identifica con la persona "
                 "che eri prima, perché è lì che si trova adesso. Questo blocco alimenta "
                 "l'apertura della Hero Story e il primo minuto della masterclass, cioè i momenti "
                 "in cui chi non ti conosce decide se restare ad ascoltare o chiudere.",
        "errore": "Saltare questa parte perché sembra poco professionale. È esattamente il "
                  "contrario: senza il punto di partenza, il risultato che hai ottenuto sembra "
                  "un dono naturale e non un percorso ripetibile.",
    },
    "Il problema": {
        "testo": "Il problema che hai vissuto tu è lo stesso che vive il tuo cliente adesso. "
                 "Raccontarlo con i dettagli concreti, non con le categorie generali, è ciò che "
                 "fa dire a chi legge che stai parlando di lui. Da qui nascono gli hook dei "
                 "contenuti social, l'oggetto delle email e l'apertura della live. Si parte "
                 "sempre dal problema, mai dalla soluzione: la soluzione interessa solo a chi "
                 "ha già riconosciuto il problema.",
        "errore": "Descriverlo dall'alto, come lo descriveresti a un collega. Servono le parole "
                  "che usavi tu quando eri dentro quella situazione, non quelle che usi ora che "
                  "ne sei uscito.",
    },
    "Il momento di svolta": {
        "testo": "La svolta è il cuore narrativo. Senza, la storia resta un elenco di fatti in "
                 "ordine di data, e gli elenchi non si ricordano. Serve un momento preciso, con "
                 "un luogo e una data, perché è la concretezza che rende credibile il racconto. "
                 "Alimenta la parte centrale della masterclass e il video della pagina Chi sono.",
        "errore": "Raccontare una svolta graduale del tipo piano piano ho capito. Anche quando è "
                  "andata davvero così, serve individuare l'episodio che l'ha resa evidente.",
    },
    "Il percorso": {
        "testo": "Ostacoli, errori e sacrifici sono ciò che rende credibile la trasformazione. "
                 "Una storia senza fatica non convince nessuno e non giustifica il prezzo: se è "
                 "stato facile per te, il cliente si chiede perché dovrebbe pagare per impararlo. "
                 "Gli errori in particolare valgono più dei successi, perché sono quelli che il "
                 "tuo studente sta per fare e che tu gli puoi risparmiare.",
        "errore": "Nascondere gli errori per proteggere l'autorevolezza. L'autorevolezza non "
                  "nasce dall'essere infallibile, nasce dall'essere già passato di lì.",
    },
    "La trasformazione": {
        "testo": "La prova che il metodo funziona, prima ancora delle testimonianze dei clienti. "
                 "Il primo risultato vero e il primo cliente indimenticabile sono materiale che "
                 "userai per anni. Alimenta la sezione risultati del funnel e le email di riprova "
                 "nella settimana del lancio.",
        "errore": "Genericità del tipo ho iniziato ad avere buoni risultati. Servono fatti "
                  "verificabili: quanti, quando, cosa è cambiato. Mai numeri gonfiati, perché "
                  "sono anche i più facili da contestare.",
    },
    "Oggi": {
        "testo": "Il perché lo fai è quello che ti distingue da un concorrente più economico. "
                 "È anche la parte che tiene in piedi il progetto nei mesi in cui i numeri non "
                 "arrivano. Diventa la bio, il manifesto del progetto e la chiusura della live, "
                 "il momento in cui chiedi al pubblico di fare un passo.",
        "errore": "Cadere nella missione universale del tipo voglio aiutare le persone a stare "
                  "meglio. Vale per chiunque, quindi non vale per te. Più è specifico, più funziona.",
    },
}

BLOCKS = [
    ("Le tue origini", [
        ("S01", "Prima di questo lavoro"),
        ("S02", "Com'era la tua vita"),
        ("S03", "Come ti descrivevi"),
    ]),
    ("Il problema", [
        ("S04", "La difficoltà più grande"),
        ("S05", "Cosa non funzionava"),
        ("S06", "Cosa ti faceva stare male"),
        ("S07", "Cosa volevi cambiare"),
    ]),
    ("Il momento di svolta", [
        ("S08", "L'evento che ha cambiato tutto"),
        ("S09", "Quando hai deciso"),
        ("S10", "Chi o cosa ti ha aiutato"),
    ]),
    ("Il percorso", [
        ("S11", "Gli ostacoli"),
        ("S12", "Gli errori"),
        ("S13", "I sacrifici"),
        ("S14", "La lezione più importante"),
    ]),
    ("La trasformazione", [
        ("S15", "Quando hai capito che funzionava"),
        ("S16", "Il primo vero successo"),
        ("S17", "Un cliente indimenticabile"),
    ]),
    ("Oggi", [
        ("S18", "Perché lo fai"),
        ("S19", "La tua missione"),
        ("S20", "L'impatto che vuoi lasciare"),
        ("S21", "I tuoi valori"),
    ]),
]

_CSS_EXTRA = """
/* Il filo verticale lega le risposte di uno stesso blocco: è la storia che scorre. */
.storia-blocco{ padding-left:6mm; border-left:2px solid var(--line); }

/* La Hero Story è il pezzo che il partner userà davvero: sta in cima e si legge
   come un testo, non come una scheda. Misura di riga controllata.
   ⚠️ Questa sezione DEVE poter spezzare fra le pagine: con page-break-inside:avoid
   ereditato da .doc-group, un racconto di 900 parole non entra in una pagina e
   veniva spinto tutto a pagina 2, lasciando la prima vuota. */
.doc-group.narrativa{ page-break-inside:auto; }
.hero{ font-size:11.5pt; line-height:1.8; max-width:158mm; }
.hero p{ margin-bottom:3.5mm; }
.hero p:first-child::first-letter{ font-size:26pt; font-weight:700; float:left;
  line-height:1; padding:1mm 2mm 0 0; color:var(--ink); }

.pronto{ display:grid; grid-template-columns:1fr 1fr; gap:6mm; margin-top:7mm; }
.pronto .box{ border:1px solid var(--line); border-radius:3mm; padding:5mm; }
.pronto .box .lab{ font-size:8.5pt; font-weight:600; letter-spacing:.1em;
  text-transform:uppercase; color:var(--muted); margin-bottom:2.5mm; }
.pronto .box p{ font-size:10.5pt; line-height:1.65; }

.momento{ margin-bottom:4mm; page-break-inside:avoid; }
.momento .t{ font-size:10.5pt; font-weight:600; }
.momento .d{ font-size:10.5pt; color:var(--muted); margin-top:.8mm; }
"""


def _paragrafi(testo: str) -> str:
    """Il modello restituisce prosa continua: qui diventa paragrafi HTML."""
    parti = [p.strip() for p in str(testo or "").split("\n") if p.strip()]
    return "".join(f"<p>{esc(p)}</p>" for p in parti)


def _sezione_narrativa(narr: dict) -> str:
    """Hero Story, versione breve, apertura e momenti chiave: il materiale
    elaborato da Valentina. Sta PRIMA delle risposte grezze, che restano sotto
    come traccia di lavoro."""
    if not narr:
        return ""
    # Col fallback la "hero story" è la concatenazione delle risposte: stamparla
    # sopra le risposte per esteso significherebbe dare al partner lo stesso testo
    # due volte. In quel caso si mostra solo la nota che spiega cosa è successo.
    if narr.get("_fallback"):
        nota = (narr.get("note_al_partner") or "").strip()
        return (f'<div class="doc-callout"><div class="h">Nota</div>'
                f'<div class="b">{_paragrafi(nota)}</div></div>') if nota else ""
    hero = (narr.get("hero_story") or "").strip()
    breve = (narr.get("versione_breve") or "").strip()
    apertura = (narr.get("paragrafo_apertura") or "").strip()
    momenti = narr.get("momenti_chiave") or []
    note = (narr.get("note_al_partner") or "").strip()

    out = []
    if hero:
        out.append(
            '<section class="doc-group narrativa"><div class="doc-group-head">'
            '<h2><span class="doc-num">•</span>La tua storia, da usare così</h2>'
            '<div class="sub">Scritta a partire dalle tue risposte. È il testo che porti '
            'nella pagina Chi sono e nell\'apertura della masterclass.</div></div>'
            f'<div class="hero">{_paragrafi(hero)}</div>'
        )
        if breve or apertura:
            box = ""
            if breve:
                box += ('<div class="box"><div class="lab">Versione breve, per la bio</div>'
                        f'{_paragrafi(breve)}</div>')
            if apertura:
                box += ('<div class="box"><div class="lab">Apertura per un video</div>'
                        f'{_paragrafi(apertura)}</div>')
            out.append(f'<div class="pronto">{box}</div>')
        out.append("</section>")

    if momenti:
        righe = "".join(
            f'<div class="momento"><div class="t">{esc(m.get("titolo"))}</div>'
            f'<div class="d">{esc(m.get("descrizione"))}</div></div>'
            for m in momenti if isinstance(m, dict) and (m.get("titolo") or "").strip()
        )
        out.append(
            '<section class="doc-group"><div class="doc-group-head">'
            '<h2><span class="doc-num">•</span>Momenti da riusare</h2>'
            '<div class="sub">Ognuno di questi regge da solo un post, una email o un video.</div>'
            f'</div>{righe}</section>'
        )

    if note:
        out.append(f'<div class="doc-callout"><div class="h">Nota di Valentina</div>'
                   f'<div class="b">{_paragrafi(note)}</div></div>')
    return "".join(out)


def render_storia_html(answers: dict, nome: str, narrativa: dict | None = None) -> str:
    blocchi = []
    for i, (header, items) in enumerate(BLOCKS, start=1):
        righe = []
        for qid, label in items:
            val = (answers.get(qid) or "").strip()
            if not val:
                continue
            righe.append(
                f'<div class="doc-qa"><div class="lab">{esc(label)}</div>'
                f'<div class="ans">{esc(val)}</div></div>'
            )
        if not righe:
            continue
        g = GUIDA_BLOCCHI.get(header) or {}
        guida_html = (
            f'<div class="doc-guida"><p>{esc(g["testo"])}</p>'
            f'<p class="errore"><b>L\'errore da evitare.</b> {esc(g["errore"])}</p></div>'
        ) if g else ""
        blocchi.append(
            f'<section class="doc-group"><div class="doc-group-head">'
            f'<h2><span class="doc-num">{i}</span>{esc(header)}</h2></div>'
            f'{guida_html}<div class="storia-blocco">{"".join(righe)}</div></section>'
        )

    risposte = "".join(blocchi) or '<p class="doc-empty">Nessuna risposta inserita.</p>'
    narrata = _sezione_narrativa(narrativa or {})
    # L'intestazione "la traccia da cui nasce il testo qui sopra" ha senso solo se
    # sopra c'è davvero il racconto. Col fallback sopra c'è solo la nota.
    ha_racconto = bool(
        narrativa and not narrativa.get("_fallback") and (narrativa.get("hero_story") or "").strip()
    )
    # Le risposte grezze restano, ma dopo il testo elaborato e con un titolo che
    # dice cosa sono: materiale di lavoro, non il deliverable.
    if ha_racconto:
        risposte = (
            '<section class="doc-group"><div class="doc-group-head">'
            '<h2><span class="doc-num">•</span>Le tue risposte, per esteso</h2>'
            '<div class="sub">La traccia da cui nasce il testo qui sopra. Serve per correggere '
            'un fatto o recuperare un dettaglio che non è entrato nel racconto.</div>'
            '</div></section>' + risposte
        )

    return documento(
        f"La storia di {esc(nome)}",
        cover(
            # Carattere diretto, non l'entità: `cover()` fa l'escape e stamperebbe "&middot;".
            kicker="Metodo EVO · Fase Esamina",
            titolo=f"La storia di {nome}",
            sottotitolo="Il materiale narrativo da cui nascono la Hero Story, la pagina "
                        "“Chi sono”, i video, i social e le email.",
        )
        + f'<main class="doc-body">{narrata}{risposte}</main>'
        + foot(nome),
        _CSS_EXTRA,
    )


async def genera_storia_pdf(answers: dict, nome: str) -> bytes:
    """Elabora le risposte con Valentina, poi impagina.

    L'elaborazione non solleva mai: senza API key o su errore ricade sul fallback
    deterministico, e il PDF esce comunque con le risposte per esteso.
    """
    from .storia_narrativa import genera_storia_narrativa

    narrativa = await genera_storia_narrativa(answers, nome)
    return await render_pdf(
        render_storia_html(answers, nome, narrativa), f"La tua storia · {nome}"
    )
