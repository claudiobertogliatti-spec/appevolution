"""Workbook Strategico del partner: HTML nello standard ufficiale delle dispense.

Lo standard e' `memory/CIAK_WORKBOOK_STRATEGICO_TEMPLATE.md` (🔒 LOCK 30/07/2026):
copertina chiara con riga gialla, logo reale, stemma di validazione, banner
"WORKBOOK STRATEGICO", indice a due colonne, 13 sezioni numerate `n.0`, box
"Note del Tutor Umano" e box "Script & Output AI" in Space Mono.

⚠️ Revisione tipografica del 12/8/2026, su richiesta esplicita di Claudio
("rifai anche la dispensa, bella da vedere e chiara da leggere"). Cosa e' cambiato
e cosa NO:
  ✅ conservato tutto cio' che il template prescrive (struttura, stemma, banner,
     13 sezioni, i due box, l'ambra dei suoi tre punti, Space Mono negli script);
  🔤 font di sistema portato da Plus Jakarta Sans a **Poppins** — il template non
     prescrive il font del corpo, e il brand lock Ciak dice Poppins;
  📖 leggibilita': corpo in inchiostro pieno invece che grigio, misura di riga
     limitata, interlinea 1.75 (il pubblico Ciak e' poco digitalizzato);
  📄 impaginazione: copertina+indice su pagina propria, stacchi puliti fra le
     sezioni e numerazione di pagina.
"""
from __future__ import annotations

import base64
import html as _html
import os
from functools import lru_cache
from typing import Any


def _esc(s: Any) -> str:
    return _html.escape(str(s or ""))


_ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
_LOGO_PATH = os.path.join(_ASSETS, "ciak-logo.webp")


@lru_cache(maxsize=1)
def _logo_tag() -> str:
    """Logo reale CIAK incorporato come data URI.

    Il logo ufficiale e' navy con payoff: su fondo scuro sparisce, per questo la
    copertina e' chiara. Incorporato in base64 perche' Playwright riceve l'HTML
    con `set_content` e non risolverebbe un percorso relativo.
    ⛔ Mai ridisegnarlo in SVG/CSS: l'asset reale e' gia' trasparente.
    """
    try:
        with open(_LOGO_PATH, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        return f'<img class="logo" src="data:image/webp;base64,{b64}" alt="Ciak Si Cambia">'
    except OSError:
        # Ultima spiaggia: il documento resta leggibile anche senza l'asset.
        return ('<span style="font-family:Poppins,sans-serif;font-weight:700;'
                'font-size:30px;color:#0F172A;">Ciak<span style="color:#FACC15">.io</span></span>')


_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
:root {
  /* Brand lock Ciak */
  --ink:#0F172A; --muted:#64748B; --line:#E5E7EB; --yellow:#FACC15;
  /* Tinte prescritte dal template lockato (stemma, occhielli, box) */
  --amber-text:#854D0E; --seal-bg:#FEF9C3; --seal-border:#FDE047;
  --tutor-bg:#FEFCE8; --tutor-border:#FEF08A; --tutor-text:#713F12;
  --surface:#F8FAFC; --emerald:#10B981;
}
* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

/* Solo il formato: i MARGINI li decide `page.pdf()`, che deve riservare lo spazio
   al footer con la numerazione. Dichiarando qui `margin:0` il contenuto invadeva
   quella fascia e l'ultima sezione finiva stampata sopra il numero di pagina. */
@page { size:A4; }
body {
  font-family:'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color:var(--ink); background:#fff; font-size:11pt; line-height:1.75;
}
.page-pad { padding:0 18mm; }

/* ── Copertina ────────────────────────────────────────── */
/* Il respiro in alto lo dà il margine di pagina (`render_pdf`), così vale anche
   sulle pagine dopo la prima: col padding qui partivano incollate al bordo. */
.cover-header { padding:8mm 18mm 10mm; border-bottom:4px solid var(--yellow); }
.brand-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:14mm; }
.logo { height:17mm; width:auto; display:block; }
.validation-seal {
  background:var(--seal-bg); border:1px solid var(--seal-border); color:var(--amber-text);
  padding:2mm 5mm; border-radius:999px; font-size:9pt; font-weight:600;
  display:flex; align-items:center; gap:2.5mm; white-space:nowrap;
}
.seal-dot { width:2.2mm; height:2.2mm; background:var(--emerald); border-radius:50%; display:inline-block; }
.title-banner {
  background:var(--yellow); color:var(--ink); padding:3mm 6mm; border-radius:3mm;
  font-weight:700; font-size:17pt; letter-spacing:.06em; display:inline-block;
}
.subtitle { font-size:11.5pt; color:var(--muted); font-weight:400; margin-top:4mm; max-width:150mm; }

.partner-meta-box {
  margin-top:12mm; padding-top:7mm; border-top:1px solid var(--line);
  display:flex; align-items:flex-end; justify-content:space-between; gap:10mm;
}
.meta-grid { display:grid; gap:2mm; font-size:10pt; }
.meta-label { color:var(--muted); }
.meta-grid strong { color:var(--ink); font-weight:600; }
.tutor-badge {
  display:flex; align-items:center; gap:3mm; background:var(--surface);
  padding:3mm 5mm; border-radius:3mm; border:1px solid var(--line); white-space:nowrap;
}
.tutor-avatar {
  width:10mm; height:10mm; border-radius:50%; background:var(--yellow); color:var(--ink);
  font-weight:700; display:flex; align-items:center; justify-content:center; font-size:9.5pt;
}
.tutor-name { font-size:10pt; color:var(--ink); font-weight:600; display:block; line-height:1.3; }
.tutor-role { font-size:8.5pt; color:var(--muted); }

/* ── Indice ───────────────────────────────────────────── */
.index-section { padding:9mm 18mm 12mm; background:var(--surface); }
.section-tag { font-size:9pt; font-weight:600; text-transform:uppercase; letter-spacing:.14em; color:var(--amber-text); margin-bottom:5mm; }
.index-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:2mm 5mm; }
.index-item {
  background:#fff; padding:2.5mm 4mm; border-radius:2mm; border:1px solid var(--line);
  display:flex; align-items:center; justify-content:space-between; gap:3mm; font-size:9.5pt;
}
.index-name { font-weight:500; color:var(--ink); }
.index-name .n { color:var(--muted); font-weight:400; }
.index-done { color:var(--emerald); font-weight:600; font-size:8.5pt; white-space:nowrap; }
.index-wait { color:var(--muted); font-size:8.5pt; white-space:nowrap; }

/* Il corpo comincia su pagina nuova: copertina e indice restano una cosa sola. */
.chapter-body { padding:4mm 18mm 10mm; page-break-before:always; }

/* ── Sezioni ──────────────────────────────────────────── */
.chapter-block { margin-bottom:11mm; page-break-inside:avoid; }
.section-num { font-size:8.5pt; font-weight:600; color:var(--amber-text); letter-spacing:.14em; display:block; margin-bottom:1.5mm; }
h2.chapter-title { font-size:15pt; font-weight:600; color:var(--ink); line-height:1.25; }
.rule { height:1px; background:var(--line); margin:3mm 0 4mm; }
/* Corpo in inchiostro pieno, non grigio: e' testo da leggere, non didascalia.
   Misura di riga limitata a ~72 caratteri. */
/* La cornice editoriale (a cosa serve / come si usa) sta su fondo tenue e in
   corpo minore: si distingue a colpo d'occhio dai DATI del partner, che restano
   in inchiostro pieno. Senza questa distinzione le due voci si confondono. */
.guida { background:var(--surface); border-left:3px solid var(--line); border-radius:0 2mm 2mm 0;
         padding:4mm 5mm; margin-bottom:5mm; }
.guida p { font-size:10pt; color:var(--muted); line-height:1.6; margin-bottom:2mm; }
.guida p:last-child { margin-bottom:0; }
.guida b { color:var(--ink); font-weight:600; }
/* L'errore da evitare si stacca dal resto della cornice: è la voce che il
   partner deve leggere anche quando salta il resto. */
.guida p.errore { border-top:1px solid var(--line); padding-top:3mm; margin-top:3mm; }
.guida p.errore b { color:var(--amber-text); }
.dati-lab { font-size:8pt; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
            color:var(--amber-text); margin-bottom:2.5mm; }

.chapter-text { font-size:11pt; color:var(--ink); max-width:165mm; }
.chapter-text p { margin-bottom:2.5mm; }
.chapter-text p.dato b { font-weight:600; color:var(--ink); }
.chapter-text p.dato { color:var(--ink); }
.attesa { font-size:10.5pt; color:var(--muted); font-style:italic; }

.tutor-note-box {
  background:var(--tutor-bg); border:1px solid var(--tutor-border); border-left:4px solid var(--yellow);
  border-radius:3mm; padding:5mm; margin-top:5mm; page-break-inside:avoid;
}
.tutor-note-header { font-weight:700; font-size:9pt; color:var(--amber-text); margin-bottom:2mm; letter-spacing:.03em; }
.tutor-note-body { font-size:10.5pt; color:var(--tutor-text); line-height:1.65; }

.script-box {
  background:var(--surface); border:1px dashed #CBD5E1; border-radius:3mm;
  padding:5mm; margin-top:5mm; page-break-inside:avoid;
}
.script-header {
  font-size:8.5pt; font-weight:700; text-transform:uppercase; letter-spacing:.08em;
  color:var(--muted); margin-bottom:3mm; display:flex; justify-content:space-between; gap:4mm;
}
.script-content {
  font-family:'Space Mono', monospace; font-size:9.5pt; color:var(--ink);
  white-space:pre-wrap; word-break:break-word; line-height:1.6;
}

.doc-footer {
  margin:0 18mm; padding:5mm 0; border-top:1px solid var(--line);
  display:flex; align-items:center; justify-content:space-between; gap:6mm;
  font-size:8.5pt; color:var(--muted);
}
"""

# ── Contenuto editoriale delle 13 sezioni ────────────────────────────────────
# ⛔ Questo è testo NOSTRO, fisso, scritto per guidare: "a cosa serve" spiega
# perché la sezione esiste, "come si usa" dice cosa farne, "per completarla"
# compare solo quando la sezione è ancora vuota e dice dove si compila.
# Non contiene e non deve contenere dati sul partner: quelli arrivano dal body.
# La chiave è il numero di sezione (1..13), stabile e prescritto dal template.
_GUIDA: dict[int, dict[str, str]] = {
    1: {
        "serve": "È la sintesi di chi sei e del perché il mercato dovrebbe ascoltare te invece "
                 "di un altro. Non è un curriculum. È il primo paragrafo che legge chiunque "
                 "incontri il tuo progetto, e nella maggior parte dei casi è anche l'unico: "
                 "se lì dentro non trova un motivo per continuare, non continua. "
                 "Quello che rende credibile questa parte non sono i titoli che hai, ma il "
                 "percorso che hai fatto e i problemi che hai già risolto per qualcun altro.",
        "usa": "Riusala come bio nella pagina Chi sono, nella presentazione del webinar e nella "
               "prima email di benvenuto. Tienila in una versione lunga e una corta da tre righe: "
               "la corta serve per le biografie social e per le presentazioni quando ti invitano "
               "a parlare da qualche parte.",
        "errore": "Raccontare tutta la carriera in ordine cronologico. Al cliente non interessa "
                  "dove hai studiato, gli interessa capire se hai già risolto il problema che "
                  "ha lui adesso.",
        "completa": "Serve completare lo step La tua storia. Le 21 risposte che dai lì diventano "
                    "questa sintesi, quindi conviene rispondere per esteso invece che a punti.",
    },
    2: {
        "serve": "Definisce a chi parli, e soprattutto a chi non parli. Un corso pensato per tutti "
                 "non lo compra nessuno, perché nessuno si riconosce in una descrizione generica. "
                 "Il target stretto è quello che rende la promessa riconoscibile e il prezzo "
                 "difendibile. Restringere fa paura perché sembra rinunciare a clienti, ma è il "
                 "contrario: è l'unico modo per farti scegliere da chi ti somiglia.",
        "usa": "Diventa il filtro di ogni decisione che prendi da qui in avanti. Prima di scrivere "
               "una lezione, una email o un post, rileggi questa riga e chiediti se quella persona "
               "la troverebbe utile. Se la risposta è no, il materiale non entra nel progetto.",
        "errore": "Descrivere il target per dati anagrafici. Sapere che ha fra i 30 e i 45 anni "
                  "non serve a niente. Serve sapere in che momento si trova e cosa ha già provato "
                  "senza risultato.",
        "completa": "Si compila nello step Posizionamento, alla domanda sulla nicchia e a quella "
                    "sul momento di vita.",
    },
    3: {
        "serve": "Il problema che il tuo cliente sente già, raccontato con le sue parole. "
                 "Non il problema che vedi tu da professionista, che quasi sempre è più tecnico "
                 "e più a monte. Chi compra non compra la diagnosi corretta, compra la soluzione "
                 "al fastidio che avverte. Il tuo lavoro è partire da dove si trova lui e portarlo "
                 "dove sai tu, non pretendere che parta già dal punto giusto.",
        "usa": "È l'apertura della masterclass e la materia prima dei contenuti social. "
               "Si parte sempre dal problema, mai dal metodo: il metodo interessa solo a chi ha "
               "già riconosciuto di avere quel problema.",
        "errore": "Usare il vocabolario del mestiere. Se il cliente cerca su Google altre parole "
                  "rispetto a quelle che hai scritto qui, questa sezione va riscritta.",
        "completa": "Si compila nello step Posizionamento, alle domande su paure del cliente e "
                    "costo del no.",
    },
    4: {
        "serve": "Cosa ottiene chi ti sceglie, in una frase sola. È la frase che il cliente "
                 "ripeterà a un amico per spiegare cosa fai, quindi deve essere abbastanza "
                 "semplice da essere ricordata e abbastanza precisa da non valere per chiunque. "
                 "Se per dirla ti serve un paragrafo, non è ancora una promessa: è una "
                 "descrizione del servizio.",
        "usa": "Diventa il titolo della masterclass, l'headline del funnel e l'oggetto delle prime "
               "email. Vale la pena riscriverla dieci volte finché non sta in una riga, perché poi "
               "la userai per mesi in tutti i materiali.",
        "errore": "Promettere un risultato che non dipende solo da te. Una promessa che non puoi "
                  "mantenere produce rimborsi e recensioni negative, e costa molto più di quello "
                  "che fa incassare.",
        "completa": "Si compila nello step Posizionamento, alla domanda sulla promessa in una frase.",
    },
    5: {
        "serve": "Il posizionamento è la somma di quattro cose: a chi parli, che metodo usi, cosa "
                 "ti distingue e quale prova puoi portare. Messe insieme sono la ragione per cui "
                 "il cliente non ti confronta sul prezzo con chiunque altro. Senza posizionamento "
                 "l'unica leva che ti resta è costare meno, e quella è una gara che si perde "
                 "sempre, anche quando si vince.",
        "usa": "Da qui nascono il nome del metodo e l'ordine in cui presenti i moduli del corso. "
               "Rileggi questa pagina ogni volta che devi decidere cosa mettere dentro e cosa "
               "lasciare fuori.",
        "errore": "Cambiare posizionamento ogni volta che un contenuto non funziona. "
                  "Il posizionamento si giudica sui mesi, non sul singolo post andato male.",
        "completa": "Si completa nello step Posizionamento. Sono 20 risposte e servono tutte: "
                    "il documento non si genera finché ne manca una.",
    },
    6: {
        "serve": "Gli elementi fissi della tua identità: colori, logo, foto, tono di voce, parole "
                 "che usi sempre e parole che non usi mai. Sono fissi per un motivo pratico: "
                 "il riconoscimento nasce dalla ripetizione. Un progetto che cambia aspetto a "
                 "ogni pubblicazione costringe il pubblico a ricominciare da capo ogni volta, "
                 "e il pubblico non ha voglia di farlo.",
        "usa": "Vale per tutto quello che pubblichi: slide, pagine, social, email, copertine dei "
               "video. Se un materiale non rispetta questa pagina, va rifatto prima di uscire.",
        "errore": "Trattare il brand kit come un vezzo estetico da sistemare più avanti. "
                  "Rifare tutti i materiali dopo sei mesi costa molto più che deciderlo adesso.",
        "completa": "Si compila nello step Brand kit: logo, foto personale, tre colori in formato "
                    "esadecimale, tono di voce e almeno tre parole chiave.",
    },
    7: {
        "serve": "La masterclass è la porta d'ingresso del tuo progetto. È il contenuto gratuito "
                 "che porta traffico e che precede ogni vendita, e nella pratica è il momento in "
                 "cui una persona che non ti conosce decide se fidarsi. Deve dare valore vero, "
                 "non essere un lungo preambolo all'offerta: chi esce con la sensazione di aver "
                 "solo ascoltato una pubblicità non torna.",
        "usa": "La usi come contenuto di punta per mesi. Va bene in fondo alla pagina di vendita, "
               "come lead magnet e come risposta a chi ti chiede di cosa ti occupi.",
        "errore": "Insegnare tutto o non insegnare niente. Nel primo caso non resta motivo per "
                  "comprare, nel secondo non resta motivo per fidarsi. Si insegna il cosa e il "
                  "perché, e si vende il come.",
        "completa": "Si costruisce in fase Valida, negli step Script masterclass e Registra "
                    "masterclass.",
    },
    8: {
        "serve": "L'architettura del corso: moduli, lezioni e l'ordine in cui il tuo studente "
                 "impara. L'ordine conta più del contenuto. Lo stesso materiale, messo nella "
                 "sequenza sbagliata, produce studenti che si bloccano al terzo video e non "
                 "finiscono il percorso. Uno studente che non finisce non ti porta risultati "
                 "da mostrare, e senza risultati da mostrare il prossimo lancio è più difficile.",
        "usa": "È la mappa di produzione. Dice quanti video devi registrare, in che sequenza e "
               "quanto lunghi. Serve anche a dare una risposta precisa a chi ti chiede cosa "
               "contiene il corso prima di comprare.",
        "errore": "Costruire il corso partendo da quello che sai tu invece che da quello che "
                  "serve a lui. Il primo modulo deve dare un risultato piccolo ma immediato, "
                  "non le fondamenta teoriche.",
        "completa": "Si costruisce in fase Valida, negli step Outline lezioni e Script videolezioni.",
    },
    9: {
        "serve": "Nome dell'offerta, prezzo, cosa include, garanzia. È il punto in cui il progetto "
                 "smette di essere un lavoro di preparazione e diventa un'attività che incassa. "
                 "Il prezzo non è un numero che si sceglie all'ultimo: comunica a chi ti stai "
                 "rivolgendo e cosa può aspettarsi. Un prezzo troppo basso non attira più clienti, "
                 "attira i clienti sbagliati e fa lavorare il doppio per guadagnare la metà.",
        "usa": "Il prezzo scritto qui è quello che vale. Se un altro materiale ne riporta uno "
               "diverso, quel materiale va riallineato prima di andare online: due prezzi in giro "
               "generano contestazioni e ti costringono a onorare il più basso.",
        "errore": "Includere tutto per giustificare il prezzo. Ogni cosa che aggiungi è una cosa "
                  "che devi erogare. Un'offerta più snella si vende meglio e si mantiene meglio.",
        "completa": "Si definisce in fase Valida, nello step Prezzo e webinar, e va confermata "
                    "nella tua scheda partner.",
    },
    10: {
        "serve": "L'impianto tecnico che raccoglie i contatti e incassa: dominio, pagine legali, "
                 "funnel, checkout, sequenze email, tracciamento. Non è la parte creativa, ed è "
                 "esattamente per questo che viene rimandata. Ma è anche l'unica parte in cui un "
                 "errore ti fa perdere soldi in modo invisibile: un checkout che non funziona non "
                 "ti avvisa, semplicemente non incassa.",
        "usa": "Va verificato voce per voce prima di ogni lancio, non solo la prima volta. "
               "Un pagamento di prova fatto davvero, con una carta vera, vale più di dieci "
               "controlli a schermo.",
        "errore": "Dare per buono quello che ha funzionato l'ultima volta. Domini che scadono, "
                  "integrazioni che si scollegano e sequenze email che restano ferme sono i tre "
                  "guasti più frequenti, e nessuno dei tre dà segnali prima del lancio.",
        "completa": "Si costruisce in fase Valida, nello step Subaccount, dominio, legal e funnel.",
    },
    11: {
        "serve": "Il calendario dei 30 giorni che precedono il lancio: cosa pubblichi, quando e "
                 "con che obiettivo. Serve a non arrivare al giorno del webinar davanti a un "
                 "pubblico freddo. La vendita non si gioca durante la live, si gioca nelle "
                 "settimane prima: chi arriva già convinto compra, chi arriva quel giorno per la "
                 "prima volta quasi mai.",
        "usa": "Si segue, non si improvvisa. Averlo scritto in anticipo è quello che ti permette "
               "di pubblicare anche nelle settimane in cui hai poco tempo, che sono sempre quelle "
               "vicine al lancio.",
        "errore": "Pubblicare solo nell'ultima settimana. Un pubblico che ti scopre a sette giorni "
                  "dal webinar non ha avuto il tempo di fidarsi, e la fiducia non si recupera con "
                  "la frequenza.",
        "completa": "Si costruisce in fase Valida, nello step Calendario lancio 30gg.",
    },
    12: {
        "serve": "La traccia della live: titolo, durata e le fasi in cui è divisa. È il copione "
                 "del giorno del lancio. Averla scritta non serve a leggerla, serve a non perdere "
                 "il filo quando sei in diretta e arrivano le domande in chat. Le live che vendono "
                 "hanno quasi tutte la stessa struttura, e non è un caso: prima si dà valore, poi "
                 "si presenta l'offerta, poi si risponde alle obiezioni.",
        "usa": "La rileggi il giorno prima e la tieni davanti durante la diretta. Il prezzo però "
               "si legge dalla sezione 9.0: la traccia viene spesso scritta prima che l'offerta "
               "sia decisa, quindi può riportare numeri superati.",
        "errore": "Arrivare all'offerta negli ultimi cinque minuti, di fretta e quasi scusandosi. "
                  "Se hai dato valore per un'ora, presentare quello che vendi è la conseguenza "
                  "naturale, non un abuso.",
        "completa": "Si costruisce in fase Valida, nello step Prezzo e webinar.",
    },
    13: {
        "serve": "Cosa succede dopo il primo lancio: quanti hanno visto, quanti si sono iscritti, "
                 "quanti hanno comprato, e cosa hai imparato. È la sezione che trasforma un lancio "
                 "in un sistema ripetibile. Senza numeri il secondo lancio si prepara a sensazione, "
                 "e a sensazione si cambia sempre la cosa sbagliata.",
        "usa": "È la base della fase Ottimizza. Si migliora un punto alla volta, partendo dal "
               "passaggio dove si perde più gente, non da quello che dà più fastidio a te.",
        "errore": "Guardare solo il fatturato. Il fatturato dice se è andata bene, non dice "
                  "perché. I numeri che servono sono quelli intermedi: iscritti, presenti, "
                  "clic sull'offerta.",
        "completa": "Si compila dopo il lancio, quando ci sono i primi dati veri da leggere.",
    },
}


def _guida_html(n: int, piena: bool) -> str:
    """Cornice editoriale della sezione: a cosa serve, come si usa (o cosa serve
    per completarla, se la sezione è ancora vuota) e l'errore da evitare."""
    g = _GUIDA.get(n)
    if not g:
        return ""
    seconda = (
        f'<p><b>Come si usa.</b> {_esc(g["usa"])}</p>' if piena
        else f'<p><b>Per completarla.</b> {_esc(g["completa"])}</p>'
    )
    return (
        f'<div class="guida"><p><b>A cosa serve.</b> {_esc(g["serve"])}</p>{seconda}'
        f'<p class="errore"><b>L\'errore da evitare.</b> {_esc(g["errore"])}</p></div>'
    )


def _maiuscola(testo: str) -> str:
    """Le risposte dei wizard arrivano spesso in minuscolo ("terapisti del massaggio
    thai..."): in un documento stampato una sezione che apre in minuscolo sembra un
    appunto. Si tocca solo la prima lettera, e solo se e' minuscola."""
    t = testo.lstrip()
    return t[0].upper() + t[1:] if t and t[0].islower() else t


def _corpo_html(body: str) -> str:
    """Le righe "Etichetta: valore" diventano paragrafi con l'etichetta in grassetto."""
    righe = [r.strip() for r in str(body).split("\n") if r.strip()]
    out = []
    for i, r in enumerate(righe):
        if r.startswith("- "):
            out.append(f'<p>&#8226; {_esc(r[2:])}</p>')
        elif ": " in r[:34] and not r.startswith("http"):
            etichetta, _, resto = r.partition(": ")
            out.append(f'<p class="dato"><b>{_esc(etichetta)}:</b> {_esc(resto)}</p>')
        else:
            out.append(f"<p>{_esc(_maiuscola(r) if i == 0 else r)}</p>")
    return "".join(out)


def render_project_book_html(payload: dict[str, Any]) -> str:
    nome = _esc(payload.get("partner_name") or "Partner CIAK")
    progetto = _esc(payload.get("project_name") or "Accademia Digitale")
    data_inizio = _esc(payload.get("start_date") or "In preparazione")
    fase = _esc(payload.get("fase_attuale") or "In corso")
    tutor = "Claudio Bertogliatti"
    sezioni = payload.get("sections") or []
    attesa = "Questa sezione si completerà nella prossima fase del percorso."

    def _piena(s: dict[str, Any]) -> bool:
        """Il criterio arriva dal router (`filled`), che usa `_e_segnaposto`.
        L'euristica locale resta solo per i payload che non lo portano."""
        if "filled" in s:
            return bool(s["filled"])
        return not str(s.get("body", "")).strip().startswith(attesa[:28])

    compilate = sum(1 for s in sezioni if _piena(s))

    indice, capitoli = [], []
    for i, s in enumerate(sezioni, 1):
        titolo = _esc(s.get("title") or "Sezione")
        body = str(s.get("body") or attesa)
        piena = _piena(s)
        indice.append(
            f'<div class="index-item"><span class="index-name"><span class="n">{i}.0</span> {titolo}</span>'
            + ('<span class="index-done">&#10003; Compilata</span>' if piena
               else '<span class="index-wait">In preparazione</span>')
            + "</div>"
        )
        # Anche una sezione non compilata puo' portare informazione utile: la 9.0
        # dice "nome, prezzo e contenuto vanno decisi prima del lancio", piu' utile
        # dell'attesa generica. Si stampa il testo vero, in stile attesa.
        # L'etichetta separa la guida (nostra) dal contenuto del partner: senza,
        # il blocco grigio pesava piu' del dato, che e' il vero contenuto.
        corpo = _guida_html(i, piena) + (
            f'<div class="dati"><div class="dati-lab">Il tuo progetto</div>{_corpo_html(body)}</div>'
            if piena else f'<div class="attesa">{_corpo_html(body)}</div>'
        )
        blocchi_extra = ""
        for extra in (s.get("boxes") or []):
            if extra.get("tipo") == "tutor":
                blocchi_extra += (
                    f'<div class="tutor-note-box"><div class="tutor-note-header">&#128161; NOTE DEL TUTOR UMANO ({_esc(tutor)}):</div>'
                    f'<div class="tutor-note-body">{_esc(extra.get("testo"))}</div></div>'
                )
            elif extra.get("tipo") == "script":
                # Il titolo si costruisce fuori dalla f-string: il container gira
                # Python 3.11, dove un backslash dentro l'espressione e' un SyntaxError.
                titolo_box = _esc(extra.get("titolo") or "SCRIPT PRONTO ALL'USO")
                blocchi_extra += (
                    f'<div class="script-box"><div class="script-header"><span>&#128196; {titolo_box}</span>'
                    f'<span style="color:#854D0E;">Copia &amp; Incolla</span></div>'
                    f'<div class="script-content">{_esc(extra.get("testo"))}</div></div>'
                )
        capitoli.append(
            f'<div class="chapter-block"><span class="section-num">SEZIONE {i}.0</span>'
            f'<h2 class="chapter-title">{titolo}</h2><div class="rule"></div>'
            f'<div class="chapter-text">{corpo}</div>{blocchi_extra}</div>'
        )

    iniziali = "".join(p[0] for p in tutor.split()[:2]).upper()
    return f"""<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><title>Workbook Strategico &mdash; {nome}</title><style>{_CSS}</style></head>
<body>
  <header class="cover-header">
    <div class="brand-row">
      <div>{_logo_tag()}</div>
      <div class="validation-seal"><span class="seal-dot"></span> VALIDATO DAL TEAM CIAK + METODO EVO</div>
    </div>
    <div class="title-banner">WORKBOOK STRATEGICO</div>
    <p class="subtitle">Una guida esclusiva per la realizzazione di accademie digitali di successo</p>
    <div class="partner-meta-box">
      <div class="meta-grid">
        <div><span class="meta-label">Preparato per:</span> <strong>{nome}</strong></div>
        <div><span class="meta-label">Progetto / Accademia:</span> <strong>{progetto}</strong></div>
        <div><span class="meta-label">Data Inizio Lavori:</span> <strong>{data_inizio}</strong></div>
        <div><span class="meta-label">Fase attuale:</span> <strong>{fase}</strong></div>
      </div>
      <div class="tutor-badge">
        <div class="tutor-avatar">{iniziali}</div>
        <div>
          <strong class="tutor-name">{_esc(tutor)}</strong>
          <span class="tutor-role">Tutor Strategico CIAK.io</span>
        </div>
      </div>
    </div>
  </header>

  <section class="index-section">
    <div class="section-tag">Indice del progetto &middot; {compilate} sezioni su {len(sezioni)} compilate</div>
    <div class="index-grid">{"".join(indice)}</div>
  </section>

  <main class="chapter-body">{"".join(capitoli)}</main>

  <div class="doc-footer">
    <div>&copy; 2026 CIAK.io &mdash; Workbook Strategico Riservato</div>
    <div>Preparato per: {nome}</div>
  </div>
</body>
</html>"""


async def genera_project_book_pdf(payload: dict[str, Any]) -> bytes:
    """HTML -> PDF con numerazione di pagina, dal render condiviso del tema.

    Non usa `ciak_pdf.html_to_pdf`: quello non stampa header/footer, e qui servono
    i numeri di pagina.
    """
    from .ciak_doc_theme import render_pdf

    nome = payload.get("partner_name") or "Partner CIAK"
    return await render_pdf(render_project_book_html(payload), f"Workbook Strategico · {nome}")
