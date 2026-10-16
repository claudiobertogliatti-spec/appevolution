"""Documenti legali del funnel di un partner: privacy, cookie, condizioni di vendita.

Modello commerciale (deciso da Claudio, 2/10/2026): il corso del partner lo VENDE Evolution Pro LLC
tramite Systeme/Stripe e ogni mese gira al partner il 90% del fatturato. Quindi venditore, titolare
dei dati dell'acquisto e chi fattura è Evolution Pro LLC; il partner compare come autore del corso.
I dati dei contatti sono gestiti sulla piattaforma Systeme. Rimborso: 14 giorni dall'acquisto.

Modulo PURO: nessun accesso a rete o DB. Testi deterministici (niente LLM): ogni frase è scritta
qui e rivista da una persona; ogni dato variabile arriva da `seller`/`partner` ed è escapato.
Nessun segnaposto: se manca un dato obbligatorio si solleva LegalDataError invece di stampare vuoti.

Cosa NON afferma (da verificare con chi segue la parte legale prima del via libera):
  - il trattamento IVA del prezzo (LLC USA, vendita a consumatori UE): non è scritto in nessun testo;
  - le garanzie sui trasferimenti extra-UE sono dichiarate in termini generali, senza citare strumenti.
"""
from html import escape
from typing import Any, Dict, Optional

SELLER = {
    "name": "Evolution Pro LLC",
    "address": "8 The Green, Suite A, Dover, DE 19901, USA",
    "email": "assistenza@evolution-pro.it",
}

REFUND_DAYS = 14
DOC_IDS = ("privacy", "cookie", "termini")
DOC_TITLES = {"privacy": "Privacy Policy", "cookie": "Cookie Policy", "termini": "Condizioni di vendita"}


class LegalDataError(ValueError):
    """Manca un dato obbligatorio per scrivere i documenti."""


def _need(data: Dict[str, Any], key: str, label: str) -> str:
    value = str(data.get(key) or "").strip()
    if not value:
        raise LegalDataError(f"Manca il dato «{label}» per scrivere i documenti legali.")
    return escape(value)


def _ctx(partner_name: str, course_title: str, updated: str, seller: Optional[Dict[str, Any]],
         refund_days: int) -> Dict[str, str]:
    seller = {**SELLER, **(seller or {})}
    if int(refund_days) < 14:
        raise LegalDataError("Il rimborso non può essere inferiore a 14 giorni.")
    return {
        "seller": _need(seller, "name", "Venditore"),
        "address": _need(seller, "address", "Sede del venditore"),
        "email": _need(seller, "email", "Email di contatto"),
        "author": _need({"v": partner_name}, "v", "Nome dell'autore del corso"),
        "course": _need({"v": course_title}, "v", "Nome del corso"),
        "updated": _need({"v": updated}, "v", "Data di aggiornamento"),
        "days": str(int(refund_days)),
    }


def _privacy(c: Dict[str, str]) -> str:
    return f"""
<h1>Privacy Policy</h1>
<p class="upd">Ultimo aggiornamento: {c['updated']}</p>
<p>Questa informativa spiega come trattiamo i tuoi dati quando ti iscrivi alla masterclass o acquisti il corso «{c['course']}», di cui è autore {c['author']}.</p>

<h2>1. Chi è il titolare del trattamento</h2>
<p>Il titolare del trattamento è <strong>{c['seller']}</strong>, {c['address']}. Per qualsiasi richiesta sui tuoi dati scrivi a <a href="mailto:{c['email']}">{c['email']}</a>.</p>

<h2>2. Quali dati raccogliamo e perché</h2>
<ul>
<li><strong>Nome ed email</strong>, quando ti iscrivi alla masterclass: per darti accesso al video e inviarti i messaggi collegati. Base giuridica: la tua richiesta di iscrizione e il tuo consenso.</li>
<li><strong>Dati dell'acquisto</strong> (nome, email, importo, data): per consegnarti il corso, assisterti ed emettere la fattura. Base giuridica: il contratto di acquisto e gli obblighi di legge.</li>
<li><strong>Dati di pagamento</strong>: li riceve direttamente il fornitore del pagamento. Noi non vediamo né conserviamo il numero della tua carta.</li>
<li><strong>Dati tecnici di navigazione</strong> (per esempio indirizzo IP), necessari al funzionamento e alla sicurezza del sito.</li>
</ul>
<p>Se ci dai il consenso, usiamo nome ed email anche per inviarti comunicazioni sul corso e su iniziative collegate. Puoi revocare il consenso in ogni momento, con il link in fondo a ogni email o scrivendoci.</p>

<h2>3. Chi può vedere i tuoi dati</h2>
<ul>
<li><strong>Systeme</strong>, la piattaforma su cui gestiamo contatti, email e area del corso, che li tratta per nostro conto.</li>
<li>Il <strong>fornitore del servizio di pagamento</strong>, per completare l'acquisto.</li>
<li><strong>YouTube</strong>, solo se premi «Guarda» per vedere il video della masterclass (vedi la Cookie Policy).</li>
</ul>
<p>Non vendiamo i tuoi dati. Quando i dati sono trasferiti fuori dallo Spazio economico europeo, ciò avviene con le garanzie previste dal GDPR.</p>

<h2>4. Per quanto tempo li conserviamo</h2>
<p>Conserviamo i dati per il tempo necessario alle finalità indicate. Nome ed email dell'iscrizione fino a quando revochi il consenso o ne chiedi la cancellazione. I dati contabili per il periodo richiesto dalla legge.</p>

<h2>5. I tuoi diritti</h2>
<p>Puoi chiedere di accedere ai tuoi dati, correggerli, cancellarli, limitarne l'uso, riceverli in un formato leggibile e opporti al trattamento. Scrivi a <a href="mailto:{c['email']}">{c['email']}</a>: rispondiamo entro 30 giorni. Se ritieni che i tuoi diritti non siano rispettati puoi fare reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it">www.garanteprivacy.it</a>).</p>

<h2>6. Minori</h2>
<p>Il corso è destinato a persone maggiorenni. Non raccogliamo consapevolmente dati di minori di 18 anni.</p>
""".strip()


def _cookie(c: Dict[str, str]) -> str:
    return f"""
<h1>Cookie Policy</h1>
<p class="upd">Ultimo aggiornamento: {c['updated']}</p>

<h2>Cosa usa questo sito</h2>
<p>Le pagine di presentazione di «{c['course']}» <strong>non usano cookie di profilazione né di analisi</strong> e non salvano dati sul tuo dispositivo. Per questo non vedi un banner dei cookie: non ci sono scelte da fare.</p>

<h2>Il video della masterclass</h2>
<p>Il video è ospitato su YouTube. Il sito non lo carica da solo: lo carica solo quando premi «Guarda». Da quel momento YouTube (Google) può trattare dati e impostare propri cookie, secondo la propria informativa. Se non premi «Guarda», nessun dato viene inviato a YouTube.</p>

<h2>Il pagamento e l'area del corso</h2>
<p>La pagina di pagamento e l'area del corso sono gestite da piattaforme esterne (Systeme e il fornitore del pagamento). Possono usare cookie tecnici, cioè necessari a far funzionare l'acquisto e l'accesso. Non servono a profilarti.</p>

<h2>Come cambiare idea</h2>
<p>Puoi cancellare i cookie in qualsiasi momento dalle impostazioni del tuo browser. Per domande scrivi a <a href="mailto:{c['email']}">{c['email']}</a>.</p>
<p>Titolare del trattamento: {c['seller']}, {c['address']}.</p>
""".strip()


def _termini(c: Dict[str, str]) -> str:
    return f"""
<h1>Condizioni di vendita</h1>
<p class="upd">Ultimo aggiornamento: {c['updated']}</p>

<h2>1. Chi vende</h2>
<p>Il corso «{c['course']}» è venduto da <strong>{c['seller']}</strong>, {c['address']} (email <a href="mailto:{c['email']}">{c['email']}</a>). L'autore del corso è {c['author']}.</p>

<h2>2. Cosa acquisti</h2>
<p>Acquisti l'accesso online al corso «{c['course']}». Il contenuto, il prezzo e quanto è incluso sono quelli indicati nella pagina dell'offerta al momento dell'acquisto. Il corso è formazione: non garantisce risultati specifici, che dipendono anche dall'impegno di ciascuno.</p>

<h2>3. Come si acquista e si riceve il corso</h2>
<p>Paghi online dalla pagina di pagamento. Subito dopo ricevi via email le istruzioni per accedere all'area del corso.</p>

<h2>4. Rimborso entro {c['days']} giorni</h2>
<p>Hai {c['days']} giorni dall'acquisto per cambiare idea e chiedere il rimborso, senza dover spiegare il motivo. Scrivi a <a href="mailto:{c['email']}">{c['email']}</a> indicando il nome e l'email usati per l'acquisto. Ti rimborsiamo con lo stesso metodo di pagamento entro {c['days']} giorni dalla tua richiesta.</p>

<h2>5. Fattura</h2>
<p>La fattura è emessa da {c['seller']} ed è inviata all'email dell'acquisto.</p>

<h2>6. Uso del corso</h2>
<p>L'accesso è personale. I contenuti non possono essere condivisi con altri, copiati o rivenduti.</p>

<h2>7. Garanzia e problemi</h2>
<p>Se il corso non è accessibile o non corrisponde a quanto descritto, scrivici: rimediamo senza costi. Restano ferme le garanzie previste dalla legge a tutela del consumatore.</p>

<h2>8. Legge applicabile e foro</h2>
<p>Se acquisti come consumatore, restano valide le norme di tutela del consumatore del tuo Paese di residenza e puoi rivolgerti al giudice del luogo in cui risiedi.</p>

<h2>9. Privacy e cookie</h2>
<p>Come trattiamo i tuoi dati è spiegato nella Privacy Policy e nella Cookie Policy.</p>
""".strip()


_BUILDERS = {"privacy": _privacy, "cookie": _cookie, "termini": _termini}


def render_documents(partner_name: str, course_title: str, updated: str,
                     seller: Optional[Dict[str, Any]] = None,
                     refund_days: int = REFUND_DAYS) -> Dict[str, Dict[str, str]]:
    """Restituisce {id: {title, html}} per privacy, cookie e termini."""
    ctx = _ctx(partner_name, course_title, updated, seller, refund_days)
    return {doc_id: {"title": DOC_TITLES[doc_id], "html": _BUILDERS[doc_id](ctx)} for doc_id in DOC_IDS}
