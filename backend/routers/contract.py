"""
Contract Signing Router - Evolution PRO
Gestione firma digitale contratto di partnership
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import base64
import logging
from io import BytesIO

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/contract", tags=["contract"])

# MongoDB connection - usa lo stesso fallback di server.py
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'evolution_pro')
ATLAS_FALLBACK = os.environ.get('MONGO_ATLAS_URL', '')
if not mongo_url or "customer-apps" in mongo_url:
    if ATLAS_FALLBACK:
        mongo_url = ATLAS_FALLBACK
        db_name = "evolution_pro"
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# SMTP Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.register.it')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', 'info@evolution-pro.it')
SMTP_PASS = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', 'Evolution PRO <info@evolution-pro.it>')


class ContractChatRequest(BaseModel):
    partner_id: str
    message: str
    conversation_history: List[Dict[str, str]] = []
    current_article: Optional[int] = None


class PartnerPersonalData(BaseModel):
    nome: str = ""
    cognome: str = ""
    nome_azienda: str = ""
    codice_fiscale: str = ""
    partita_iva: str = ""
    indirizzo: str = ""
    citta: str = ""
    cap: str = ""
    provincia: str = ""
    email: str = ""
    pec: str = ""
    iban: str = ""


class ContractParamsUpdate(BaseModel):
    corrispettivo: Optional[float] = None
    corrispettivo_testo: Optional[str] = None
    royalty_perc: Optional[float] = None
    durata_mesi: Optional[int] = None
    num_rate: Optional[int] = None
    note_admin: Optional[str] = None


DEFAULT_CONTRACT_PARAMS = {
    "corrispettivo": 2790.00,
    "corrispettivo_testo": "duemilasettecentonovanta/00",
    "royalty_perc": 10,
    "durata_mesi": 12,
    "num_rate": 3,
    "note_admin": ""
}


def num_to_italian_word(n: int) -> str:
    words = {
        1: "uno", 2: "due", 3: "tre", 4: "quattro", 5: "cinque",
        6: "sei", 7: "sette", 8: "otto", 9: "nove", 10: "dieci",
        11: "undici", 12: "dodici", 13: "tredici", 14: "quattordici",
        15: "quindici", 18: "diciotto", 20: "venti", 24: "ventiquattro",
        36: "trentasei", 48: "quarantotto"
    }
    return words.get(n, str(n))


def render_contract_text(params: dict) -> str:
    corr = params.get("corrispettivo", DEFAULT_CONTRACT_PARAMS["corrispettivo"])
    corr_testo = params.get("corrispettivo_testo", DEFAULT_CONTRACT_PARAMS["corrispettivo_testo"])
    royalty = params.get("royalty_perc", DEFAULT_CONTRACT_PARAMS["royalty_perc"])
    durata = params.get("durata_mesi", DEFAULT_CONTRACT_PARAMS["durata_mesi"])
    num_rate = params.get("num_rate", DEFAULT_CONTRACT_PARAMS["num_rate"])

    corr_str = f"{corr:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    durata_parola = num_to_italian_word(durata)
    rate_parola = num_to_italian_word(num_rate)
    royalty_int = int(royalty) if royalty == int(royalty) else royalty

    text = CONTRACT_TEXT
    text = text.replace(
        "€ 2.790,00 (duemilasettecentonovanta/00)",
        f"€ {corr_str} ({corr_testo})"
    )
    text = text.replace(
        "10% (dieci per cento)",
        f"{royalty_int}% ({num_to_italian_word(int(royalty))} per cento)"
    )
    text = text.replace(
        "del 10%",
        f"del {royalty_int}%"
    )
    text = text.replace(
        "dodici (12) mesi",
        f"{durata_parola} ({durata}) mesi"
    )
    text = text.replace(
        "12 (dodici) mesi",
        f"{durata} ({durata_parola}) mesi"
    )
    text = text.replace(
        "dei 12 mesi",
        f"dei {durata} mesi"
    )
    text = text.replace(
        "3 (tre) rate mensili",
        f"{num_rate} ({rate_parola}) rate mensili"
    )
    text = text.replace(
        "massimo 3 (tre) rate",
        f"massimo {num_rate} ({rate_parola}) rate"
    )
    # Personalizzazione con dati del partner
    pd = params.get("personal_data", {})
    if pd.get("nome") and pd.get("cognome"):
        nome_completo = f"{pd['nome']} {pd['cognome']}"
        indirizzo_completo = f"{pd.get('indirizzo', '')}, {pd.get('cap', '')} {pd.get('citta', '')} ({pd.get('provincia', '')})".strip(", ")
        riga_partner = f"{nome_completo}"
        if pd.get("nome_azienda"):
            riga_partner += f", titolare di {pd['nome_azienda']}"
        if pd.get("codice_fiscale"):
            riga_partner += f", C.F. {pd['codice_fiscale']}"
        if pd.get("partita_iva"):
            riga_partner += f", P.IVA {pd['partita_iva']}"
        if indirizzo_completo.strip(", "):
            riga_partner += f", con sede/residenza in {indirizzo_completo}"
        if pd.get("pec"):
            riga_partner += f", PEC: {pd['pec']}"
        elif pd.get("email"):
            riga_partner += f", email: {pd['email']}"
        if pd.get("iban"):
            riga_partner += f", IBAN: {pd['iban']}"
        text = text.replace(
            "Il Partner sottoscrittore del presente contratto digitale.",
            f"{riga_partner}, di seguito \"Partner\"."
        )
    return text


@router.get("/partner-data/{partner_id}")
async def get_partner_data(partner_id: str):
    """Recupera i dati personali salvati del partner per il contratto."""
    record = await db.contract_partner_data.find_one({"partner_id": partner_id})
    if not record:
        return {"data": {}}
    record.pop("_id", None)
    record.pop("partner_id", None)
    record.pop("saved_at", None)
    return {"data": record}


@router.post("/partner-data/{partner_id}")
async def save_partner_data(partner_id: str, body: PartnerPersonalData):
    """Salva i dati personali del partner per personalizzare il contratto."""
    data = body.model_dump()
    data["partner_id"] = partner_id
    data["saved_at"] = datetime.now(timezone.utc).isoformat()
    await db.contract_partner_data.update_one(
        {"partner_id": partner_id},
        {"$set": data},
        upsert=True
    )
    return {"success": True}


@router.post("/chat")
async def contract_chat(body: ContractChatRequest):
    """
    Chatbot di supporto per spiegare il contratto.
    Usa Claude Haiku per risposte veloci e concise.
    """
    try:
        import anthropic

        api_key = os.environ.get('ANTHROPIC_API_KEY', '')

        if not api_key:
            return {"reply": "Il servizio di supporto non è al momento disponibile. Per domande sul contratto scrivi a assistenza@evolution-pro.it"}

        contract_text = render_contract_text(await _get_partner_params(body.partner_id))

        system_prompt = f"""Sei l'assistente contrattuale di Evolution PRO. Il tuo scopo è aiutare il potenziale Partner a capire il contratto, sciogliere i dubbi e rassicurarlo.

TONO: diretto, caldo, professionale. Niente gergo legale. Massimo 130 parole per risposta. Concludi sempre con una frase che aiuta la persona ad andare avanti.

REGOLE:
- Rispondi SOLO a domande sul contratto o sull'azienda. Per tutto il resto: "Per questo scrivi a assistenza@evolution-pro.it"
- NON fornire consulenza legale vincolante
- Sii rassicurante ma onesto — non fare promesse non previste dal contratto
{f"- L'utente sta leggendo l'Articolo {body.current_article}: contestualizza la risposta se pertinente" if body.current_article else ""}

━━━ RISPOSTE ALLE DOMANDE PIÙ FREQUENTI ━━━

▸ "Evolution PRO è una LLC americana / società straniera"
Evolution PRO LLC è una società regolarmente costituita nello Stato del Delaware (USA), la forma societaria più diffusa tra le aziende digitali e tech internazionali. Claudio Bertogliatti opera da Torino e il contratto è esplicitamente regolato dalla legge italiana, con foro competente esclusivo a Torino (Art. 14). Hai tutte le tutele di un contratto italiano, con una struttura societaria internazionale. Il numero di registrazione (File Number 2394173) è verificabile pubblicamente sul sito Delaware Division of Corporations.

▸ "Perché il pagamento va su un IBAN Revolut (LT94...)?"
Revolut Bank UAB è una banca europea con licenza bancaria completa rilasciata dalla Banca Centrale della Lituania — non una fintech o un wallet, ma una vera banca regolamentata. Molte aziende digitali internazionali la usano per operare in EUR. Se preferisci un circuito più familiare, puoi pagare con carta di credito o Klarna direttamente tramite Stripe (nessun IBAN necessario).

▸ "Cosa significa reverse charge? Ho complicazioni fiscali?"
Se hai partita IVA italiana, il reverse charge è una procedura standard per servizi da fornitori extra-UE: ricevi la fattura senza IVA e la integri tu nel registro IVA con la tua aliquota. Il tuo commercialista lo fa in 2 minuti, è una procedura routinaria. Se sei persona fisica senza P.IVA, l'operazione è ancora più semplice: nessun adempimento aggiuntivo per te.

▸ "Posso avere un rimborso se le cose non funzionano?"
Il corrispettivo remunera l'avvio del progetto, le risorse operative allocate e il lavoro già avviato (Art. 5.7). Detto questo, è prevista una garanzia di rimborso entro 30 giorni se il funnel non è online per cause imputabili a Evolution PRO — come indicato nella proposta che hai accettato. Inoltre, in caso di grave inadempimento di Evolution PRO, il contratto prevede rimborso proporzionale alle attività non eseguite (Art. 7.2).

▸ "L'esclusiva mi impedisce di vendere il mio corso?"
No. L'esclusiva (Art. 1.4) riguarda solo il corso sviluppato insieme in questa partnership, e solo sui canali che Evolution PRO gestisce. Puoi continuare consulenze 1:1, workshop, webinar, speech e qualsiasi altro percorso formativo diverso. Puoi anche vendere il corso altrove con una semplice autorizzazione scritta, che non può essere negata se non c'è conflitto diretto.

▸ "Pago €2.790 E cedo anche il 10% — non è troppo?"
I €2.790 coprono tutto il lavoro di costruzione: posizionamento, funnel, area corsi, editing, copywriting, automazioni — servizi che singolarmente costerebbero 2-3x. Il 10% di royalty (Art. 5.5) dura solo 12 mesi e serve ad allineare gli incentivi: guadagniamo entrambi quando il corso vende. Dopo 12 mesi, nessuna royalty dovuta.

▸ "Posso uscire dal contratto prima dei 12 mesi?"
Il contratto ha durata determinata (12 mesi) senza recesso ordinario (Art. 7.1). È pensato così perché il progetto richiede investimento continuativo. Se Evolution PRO dovesse risultare inadempiente — e gli esempi sono chiari nell'Art. 2.7 — puoi risolvere il contratto con rimborso proporzionale.

━━━ TESTO CONTRATTO ━━━
{contract_text[:10000]}"""

        # Costruisce il messaggio con la storia recente nel testo
        full_message = body.message
        if body.conversation_history:
            history_text = "\n".join([
                f"{'Utente' if m['role'] == 'user' else 'Assistente'}: {m['content']}"
                for m in body.conversation_history[-6:]
            ])
            full_message = f"[Contesto conversazione precedente]\n{history_text}\n\n[Nuova domanda]\n{body.message}"

        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            system=system_prompt,
            messages=[{"role": "user", "content": full_message}],
        )
        reply = "".join(
            b.text for b in response.content if getattr(b, "type", None) == "text"
        ).strip()

        return {"reply": reply or "Mi dispiace, non ho una risposta pronta. Scrivi a assistenza@evolution-pro.it"}

    except Exception as e:
        logger.error(f"[CONTRACT CHAT] Error: {e}")
        return {"reply": "Mi dispiace, si è verificato un errore. Riprova tra poco o scrivi a assistenza@evolution-pro.it"}


class ContractSignRequest(BaseModel):
    partner_id: str
    signature_base64: str
    clausole_vessatorie_approved: bool = True
    contract_version: str = "1.0"


class ContractStatusResponse(BaseModel):
    signed: bool
    signed_at: Optional[str] = None
    contract_version: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# CONTRACT TEXT (same as frontend)
# ═══════════════════════════════════════════════════════════════════════════════

CONTRACT_TEXT = """Contratto di Collaborazione in Partnership per la Creazione, Promozione e Vendita di Accademie Digitali, Videocorsi e Asset Formativi Online

TRA
Evolution PRO LLC, società costituita ai sensi delle leggi dello Stato del Delaware (USA), con sede legale in 8 The Green, Ste A, Dover, DE 19901, USA, File Number 2394173 Delaware Division of Corporations, EIN 30-1375330, in persona del legale rappresentante Claudio Bertogliatti, di seguito "Evolution PRO" o "Agenzia";

e

Il Partner sottoscrittore del presente contratto digitale.

Evolution PRO e il Partner sono di seguito congiuntamente denominate le "Parti" e singolarmente la "Parte". Il Partner dichiara di operare nell'esercizio della propria attività professionale, imprenditoriale o autonoma e di essere titolare di Partita IVA valida alla data di sottoscrizione del presente Contratto.

ARTICOLO 1 – OGGETTO DEL CONTRATTO
1.1 Finalità della collaborazione
Il presente Contratto disciplina la collaborazione in partnership tra Evolution PRO e il Partner per la progettazione, creazione, pubblicazione, promozione, vendita e ottimizzazione di un'Accademia Digitale, di videocorsi, masterclass, contenuti formativi e relativi asset digitali basati sulle competenze, sui contenuti e sul posizionamento professionale del Partner.
La proposta di Partnership viene formulata da Evolution PRO esclusivamente a seguito del completamento, da parte del Partner, di una preventiva Analisi Strategica a pagamento finalizzata alla valutazione preliminare della sostenibilità, della coerenza e della fattibilità commerciale del progetto.
Le Parti riconoscono che, alla data di sottoscrizione del presente Contratto, il progetto è già stato oggetto di valutazione preliminare positiva da parte di Evolution PRO nella suddetta fase precontrattuale.
Tale valutazione positiva non costituisce garanzia di risultati economici futuri, né promessa di fatturato, vendite, clienti o profitti, ma rappresenta esclusivamente il presupposto necessario per l'accesso al Programma Operativo e all'avvio della Partnership.
La Partnership viene erogata attraverso il Metodo E.V.O. (Esamina – Valida – Ottimizza), framework proprietario sviluppato da Evolution PRO per la creazione, il lancio e la crescita di Accademie Digitali e prodotti formativi online.
Le attività previste dal Metodo E.V.O. vengono coordinate e rese disponibili attraverso la piattaforma proprietaria Ciak.io e attraverso gli ulteriori strumenti tecnologici utilizzati da Evolution PRO per l'erogazione dei servizi previsti dal presente Contratto.
Il Programma Operativo, il Metodo E.V.O., la piattaforma Ciak.io e gli eventuali allegati richiamati nel presente Contratto costituiscono parte integrante e sostanziale della Partnership.
1.1-bis Fase precontrattuale di Analisi Strategica
Prima della sottoscrizione del presente Contratto, il Partner ha richiesto a Evolution PRO una prestazione autonoma di Analisi Strategica, avente natura precontrattuale e corrispettivo separato, finalizzata alla valutazione del progetto, del posizionamento professionale del Partner e della sua idoneità a essere sviluppato attraverso il Metodo E.V.O. e la piattaforma Ciak.io.
L’Analisi Strategica costituisce attività autonoma, distinta e già integralmente eseguita rispetto alle prestazioni oggetto del presente Contratto.
Le Parti riconoscono che l’Analisi Strategica rappresenta esclusivamente una fase preliminare di valutazione e non costituisce promessa, garanzia o impegno all’avvio della Partnership.
Il relativo corrispettivo resta autonomo, definitivamente maturato e non imputabile, compensabile o detraibile rispetto al prezzo della Partnership, salvo diverso accordo scritto sottoscritto dalle Parti.
Le risultanze dell’Analisi Strategica costituiscono parte della documentazione preparatoria del progetto e potranno essere utilizzate da Evolution PRO come base operativa per l’avvio delle attività previste dal presente Contratto.
1.1-ter Avvio operativo del progetto
L’avvio operativo del progetto è subordinato:
al pagamento del corrispettivo previsto all’Articolo 5 secondo le modalità concordate;
alla compilazione del Documento di Posizionamento;
alla consegna dei materiali preliminari richiesti da Evolution PRO;
all’attivazione dell’account Partner sulla piattaforma Ciak.io.
Qualora tali condizioni non siano soddisfatte entro 30 (trenta) giorni dalla sottoscrizione del presente Contratto, Evolution PRO potrà inviare formale sollecito scritto concedendo un ulteriore termine di 15 (quindici) giorni.
Decorso inutilmente tale termine, Evolution PRO potrà sospendere l’avvio operativo del progetto, sospendere l’accesso alla piattaforma Ciak.io e avvalersi delle ulteriori disposizioni contrattuali applicabili.
In caso di sospensione dovuta a inerzia, mancata collaborazione o inadempimento imputabile al Partner, l’esecuzione operativa resterà sospesa fino alla regolarizzazione della posizione.
La sospensione delle attività non comporta proroga automatica della durata contrattuale, riduzione dei corrispettivi dovuti o rinuncia ai diritti maturati da Evolution PRO.
Resta espressamente inteso che l’eventuale inattività o mancata collaborazione del Partner non potrà essere invocata quale motivo di contestazione delle attività già svolte, dei corrispettivi maturati o degli obblighi economici derivanti dal presente Contratto.
1.2 Contenuti forniti dal Partner
Il Partner si impegna a fornire ad Evolution PRO materiali originali, leciti, veritieri e di propria titolarità, inclusi a titolo esemplificativo ma non esaustivo: testi, slide, immagini, loghi, marchi, audio, video grezzi, documenti didattici, contenuti formativi, casi studio, testimonianze, materiali caricati sulla piattaforma Ciak.io e qualsiasi ulteriore risorsa necessaria allo sviluppo del progetto.
Il Partner garantisce che l’utilizzo dei materiali forniti non viola diritti di terzi, inclusi ma non limitati a:
diritti d’autore e diritti connessi;
marchi, brevetti e segni distintivi;
diritti di immagine;
diritti alla riservatezza e protezione dei dati personali;
segreti commerciali, know-how protetto o informazioni confidenziali.
Il Partner garantisce inoltre che i contenuti forniti:
sono conformi alla normativa vigente;
non contengono informazioni false, ingannevoli o potenzialmente illecite;
non formulano promesse economiche, professionali, sanitarie o di risultato prive di adeguato fondamento;
non risultano lesivi di diritti, reputazione o interessi legittimi di terzi.
Il Partner manleva e tiene integralmente indenne Evolution PRO, i suoi collaboratori, fornitori e partner tecnologici da qualsiasi pretesa, contestazione, danno, costo, sanzione, perdita economica o spesa legale derivante, direttamente o indirettamente, dai materiali o dalle informazioni fornite dal Partner.
Evolution PRO si riserva il diritto di sospendere, rifiutare o richiedere la modifica di materiali ritenuti non conformi ai requisiti del presente Contratto, senza che ciò possa costituire inadempimento contrattuale o generare obblighi risarcitori a suo carico.
1.3 Prestazioni di Evolution PRO
Nell'ambito della Partnership, Evolution PRO si impegna a mettere a disposizione del Partner il proprio sistema operativo proprietario finalizzato alla creazione, pubblicazione, promozione, vendita e ottimizzazione di Accademie Digitali, videocorsi e prodotti formativi online.
Tale sistema comprende, a titolo esemplificativo e non esaustivo:
una sessione iniziale di allineamento strategico;
consulenza strategica sul posizionamento del progetto, dell'offerta commerciale e del target di riferimento;
accesso alla piattaforma proprietaria Ciak.io;
accesso al Metodo E.V.O. e al relativo Programma Operativo;
accesso ai materiali formativi, alle guide operative, ai template e alle risorse rese disponibili da Evolution PRO;
configurazione di n. 1 funnel base composto da pagina opt-in, pagina di vendita e checkout;
configurazione dell'area corsi e delle relative automazioni essenziali;
supporto copy per i principali asset di marketing e vendita;
servizi di editing per masterclass e lezioni videocorso;
supporto strategico durante le fasi di realizzazione, lancio e ottimizzazione del progetto.
Le attività operative vengono coordinate ed erogate attraverso il sistema proprietario Ciak.io, piattaforma digitale sviluppata da Evolution PRO per guidare il Partner nell'applicazione del Metodo E.V.O. e nella realizzazione del progetto oggetto della Partnership.
Evolution PRO si obbliga a svolgere le attività previste con diligenza professionale e secondo le migliori pratiche del settore, senza assumere obbligazioni di risultato economico.
Il Partner riconosce e accetta che l'oggetto della Partnership consiste nell'accesso a un sistema, a un metodo operativo, a strumenti, competenze e supporto professionale finalizzati alla crescita del progetto, e non nella garanzia del raggiungimento di specifici risultati economici, commerciali o di vendita.
Evolution PRO potrà, a proprio ragionevole giudizio, sospendere, rinviare o rifiutare la pubblicazione di materiali ritenuti:
non idonei sotto il profilo legale, etico o reputazionale;
in contrasto con norme di legge, regolamenti o policy delle piattaforme utilizzate;
tecnicamente inadeguati;
incompleti o incompatibili con il posizionamento concordato;
suscettibili di arrecare danni reputazionali a Evolution PRO o ai suoi partner tecnologici.
In tali ipotesi Evolution PRO ne darà comunicazione scritta al Partner, indicando:
le ragioni della sospensione;
le eventuali modifiche richieste;
il termine entro cui i materiali dovranno essere integrati o sostituiti.
Il Partner si impegna a collaborare in buona fede per rendere i materiali conformi ai requisiti richiesti.
L'eventuale rifiuto o sospensione di contenuti non conformi non costituisce inadempimento contrattuale da parte di Evolution PRO.
1.4 Canali di pubblicazione, distribuzione e vendita – Esclusiva
L'Accademia Digitale, il Corso, la Masterclass, gli asset digitali e le attività di vendita sviluppate nell'ambito della Partnership saranno pubblicati, promossi e distribuiti attraverso la piattaforma Ciak.io, i sistemi utilizzati da Evolution PRO, le piattaforme di marketing adottate (Systeme.io o equivalenti), i siti web, i funnel, le automazioni e gli ulteriori canali autorizzati da Evolution PRO.
Per tutta la durata del presente Contratto e per i novanta (90) giorni successivi alla sua cessazione, il Partner si impegna a non vendere, distribuire, promuovere o commercializzare autonomamente:
il medesimo Corso;
la medesima Accademia Digitale;
Contenuti Sostanzialmente Equivalenti;
funnel, masterclass o asset commerciali sviluppati nell'ambito della Partnership che risultino destinati alla vendita dello stesso prodotto formativo.
Ai fini del presente Contratto, per "Contenuti Sostanzialmente Equivalenti" si intendono esclusivamente prodotti formativi che, cumulativamente:
abbiano il medesimo target principale;
riproducano oltre il 60% della struttura didattica del progetto;
utilizzino in modo prevalente materiali, casi studio, promesse, framework, script o asset sviluppati nell'ambito della Partnership;
risultino destinati a sostituire direttamente il progetto oggetto del presente Contratto.
Restano espressamente esclusi dal divieto:
consulenze individuali;
workshop e formazione dal vivo;
webinar gratuiti;
speech;
attività professionali ordinarie del Partner;
contenuti editoriali;
percorsi formativi differenti per struttura, finalità, target e promessa principale.
Qualsiasi vendita autonoma del progetto oggetto della Partnership o di Contenuti Sostanzialmente Equivalenti dovrà essere preventivamente autorizzata per iscritto da Evolution PRO.
Tale autorizzazione non potrà essere irragionevolmente negata qualora:
non sussista conflitto diretto con iniziative commerciali in corso;
non derivi un pregiudizio economico rilevante;
non venga compromesso il corretto sfruttamento degli asset sviluppati nell'ambito della Partnership.
Le Parti riconoscono che il Partner mantiene la piena titolarità dei propri contenuti originali e delle proprie competenze professionali, mentre Evolution PRO mantiene la piena titolarità del Metodo E.V.O., della piattaforma Ciak.io, dei funnel, delle automazioni, dei template, delle procedure operative e degli ulteriori asset proprietari sviluppati o messi a disposizione nell'ambito della Partnership.
1.5 Gestione degli incassi e rendicontazione
Gli incassi derivanti dalla vendita del Corso, dell'Accademia Digitale o degli ulteriori prodotti formativi sviluppati nell'ambito della Partnership saranno gestiti da Evolution PRO tramite la piattaforma Ciak.io, Systeme.io o altri sistemi tecnologici utilizzati per la gestione delle vendite e dei pagamenti.
Per "Importo Netto Incassato" si intende la somma:
effettivamente accreditata sui conti di Evolution PRO;
al netto di rimborsi, storni, chargeback, commissioni bancarie e commissioni dei sistemi di pagamento utilizzati.
I dati di vendita risultanti dai sistemi ufficiali utilizzati da Evolution PRO fanno fede salvo errore materiale, malfunzionamento tecnico documentato o prova contraria fornita dal Partner.
Costituiscono prova primaria delle vendite e degli incassi i dati risultanti dalle piattaforme di pagamento e dai sistemi software utilizzati da Evolution PRO, inclusi Stripe, Systeme.io, Ciak.io o equivalenti.
Evolution PRO metterà a disposizione del Partner un report riepilogativo periodico contenente almeno:
numero degli ordini;
incassi lordi;
commissioni e costi di transazione;
eventuali rimborsi, storni o chargeback;
Importo Netto Incassato;
quote spettanti alle Parti.
Ove tecnicamente disponibile, il Partner potrà inoltre consultare direttamente i dati e le statistiche rese accessibili attraverso la piattaforma Ciak.io o altri strumenti messi a disposizione da Evolution PRO.
Eventuali contestazioni relative ai dati contenuti nei report dovranno essere comunicate per iscritto entro 30 (trenta) giorni dalla loro trasmissione.
Decorso tale termine senza contestazioni motivate, i dati riportati si intenderanno accettati e approvati dalle Parti, salvo errori materiali manifesti o comprovati malfunzionamenti tecnici.
ARTICOLO 2 - DURATA, RINNOVO, RECESSO E RISOLUZIONE
2.1 Durata del Contratto
Il presente Contratto ha durata determinata di dodici (12) mesi decorrenti dalla data di sottoscrizione da parte di entrambe le Parti.
Per l'intera durata contrattuale resta valido l'accordo di Partnership disciplinato dal presente Contratto, comprensivo delle condizioni economiche di cui all'Articolo 5, dell'accesso alla piattaforma Ciak.io, del Metodo E.V.O. e delle attività previste dal Programma Operativo.
La durata contrattuale non è soggetta a rinnovo o proroga automatica.
Le Parti riconoscono che il corretto svolgimento del Programma Operativo presuppone una collaborazione continuativa e tempestiva del Partner.
Eventuali ritardi, omissioni, inattività o mancata collaborazione imputabili al Partner non comportano proroga automatica della durata contrattuale, sospensione degli obblighi economici o estensione del periodo di Partnership.
Qualora i ritardi imputabili al Partner superino complessivamente 30 (trenta) giorni e rendano oggettivamente impossibile il completamento delle attività entro la durata contrattuale originaria, Evolution PRO potrà, a propria discrezione e senza obbligo, valutare la concessione di un'estensione tecnica limitata, da formalizzarsi esclusivamente per iscritto.
In assenza di tale accordo scritto, il Contratto cesserà automaticamente alla scadenza dei dodici (12) mesi.
Decorso il termine dei dodici (12) mesi:
l'accordo di revenue share di cui all'Articolo 5 cesserà automaticamente;
cesserà l'obbligo di Evolution PRO di fornire ulteriori attività operative non ancora eseguite a causa di ritardi o inadempimenti imputabili al Partner;
resteranno validi gli obblighi economici, di riservatezza, tutela del brand, proprietà intellettuale e ogni altra clausola destinata a produrre effetti successivamente alla cessazione del Contratto.
La cessazione del Contratto non pregiudica il diritto di Evolution PRO di richiedere il pagamento di somme già maturate, rate residue dovute o eventuali danni derivanti da inadempimenti del Partner.
2.2 Natura del corrispettivo
Il corrispettivo previsto dal presente Contratto costituisce un investimento una tantum finalizzato all'attivazione della Partnership, all'accesso al Metodo E.V.O., alla piattaforma Ciak.io, alle attività operative previste dal Programma Operativo e alle ulteriori prestazioni disciplinate dal presente Contratto.
Tale corrispettivo non costituisce canone periodico, abbonamento o quota associativa e remunera le attività, le risorse, il know-how, le infrastrutture e gli strumenti messi a disposizione da Evolution PRO per la durata della Partnership.
Resta salva la facoltà delle Parti di concordare successivamente servizi aggiuntivi, rinnovi, programmi di continuità, licenze software, attività di supporto strategico o ulteriori collaborazioni mediante accordi separati.
2.3 Scadenza e prosecuzione della collaborazione
Alla scadenza del periodo contrattuale di dodici (12) mesi, il Contratto cessa automaticamente senza rinnovo automatico.
La cessazione del Contratto non comporta il trasferimento automatico della proprietà di strumenti, software, piattaforme, procedure, template, automazioni, metodologie o altri asset proprietari di Evolution PRO, fatti salvi i diritti espressamente riconosciuti al Partner dal presente Contratto.
Eventuali ulteriori collaborazioni, rinnovi, programmi di continuità, nuovi progetti o servizi aggiuntivi potranno essere concordati esclusivamente per iscritto tra le Parti, sulla base di nuove condizioni economiche e operative.
2.4 Comunicazione di rinnovo o modifica
Eventuali richieste di rinnovo, proroga, prosecuzione della collaborazione o modifica delle condizioni contrattuali dovranno essere comunicate per iscritto almeno trenta (30) giorni prima della data di scadenza del Contratto, tramite PEC o all'indirizzo e-mail ufficiale comunicato da Evolution PRO.
In assenza di un accordo scritto sottoscritto da entrambe le Parti entro la data di scadenza, il Contratto cesserà automaticamente, fatti salvi gli obblighi già maturati e le clausole destinate a produrre effetti successivamente alla cessazione del rapporto.
2.5 Continuità tecnica e gestione post-contratto
Alla cessazione del Contratto, il Partner mantiene la piena disponibilità dei contenuti originali, del Corso e dei materiali formativi di propria titolarità.
Il Partner potrà proseguire autonomamente la commercializzazione del Corso utilizzando infrastrutture tecniche proprie oppure richiedere il trasferimento dei dati e degli asset tecnicamente trasferibili.
Restano esclusi dal trasferimento e rimangono di esclusiva proprietà di Evolution PRO:
la piattaforma Ciak.io;
il Metodo E.V.O.;
le procedure operative;
le automazioni proprietarie;
i template;
gli agenti AI;
i framework strategici;
ogni altro asset sviluppato da Evolution PRO e non espressamente ceduto per iscritto.
Eventuali attività di esportazione, migrazione o supporto tecnico successivo alla cessazione del Contratto potranno essere richieste dal Partner mediante preventivo separato.
2.6 Recesso unilaterale di Evolution PRO 
Evolution PRO potrà recedere in presenza di impossibilità sopravvenuta, rischio legale grave o cause oggettive che rendano impossibile la prosecuzione della Partnership.
2.7 Risoluzione per inadempimento (clausola risolutiva espressa) 
Ciascuna Parte potrà risolvere anticipatamente il Contratto in caso di grave inadempimento dell’altra Parte, ai sensi di clausola risolutiva espressa. 
Costituiscono, a titolo esemplificativo, inadempimenti gravi del Partner: 
mancato o ritardato pagamento dei corrispettivi dovuti ai sensi dell’Articolo 5, protratto oltre 15 (quindici) giorni dalla scadenza; 
mancata consegna, entro i termini indicati da Evolution PRO, dei materiali minimi necessari per l’avvio del progetto (documento di posizionamento, outline del Corso, file video non editati), nonostante formale sollecito; 
violazione degli obblighi di riservatezza di cui all’Articolo 6; 
violazione delle clausole di cui agli Articoli 1.4, 4 e 12 in tema di esclusiva, utilizzo autonomo del Corso o Contenuti Sostanzialmente Equivalenti, tutela del brand e concorrenza sleale; 
condotte lesive dell’immagine o reputazione commerciale di Evolution PRO consistenti in dichiarazioni false, diffamatorie, gravemente denigratorie o idonee a produrre un pregiudizio concreto e documentabile alla reputazione commerciale dell’altra Parte.
Costituiscono, a titolo esemplificativo, inadempimenti gravi di Evolution PRO: 
omessa esecuzione delle attività minime previste nel Programma Operativo di cui all’Articolo 8, senza giustificato motivo e nonostante formale sollecito del Partner; 
mancata messa online del Corso, nonostante la completa e puntuale consegna da parte del Partner dei materiali necessari e il regolare pagamento dei corrispettivi, protratta per oltre 60 (sessanta) giorni rispetto alle tempistiche ordinarie del Programma, fatta salva la prova di cause di forza maggiore o responsabilità del Partner; 
violazioni accertate e gravi degli obblighi essenziali di protezione dei dati personali ai sensi dell’Articolo 10, imputabili a dolo o colpa grave. 
La Parte che intende avvalersi della presente clausola risolutiva espressa dovrà inviare all’altra Parte, mediante PEC, una diffida ad adempiere con termine non inferiore a 15 (quindici) giorni. 
Decorso inutilmente tale termine, il Contratto si intenderà risolto di diritto, fatti salvi gli obblighi economici già maturati e l’eventuale diritto al risarcimento del danno.
In caso di risoluzione del Contratto per inadempimento imputabile al Partner, restano integralmente dovuti a Evolution PRO:
• i corrispettivi già maturati;
• le rate scadute e non pagate;
• le rate residue previste dal piano di pagamento concordato;
fatto salvo il diritto di Evolution PRO di richiedere il risarcimento degli ulteriori danni diretti e documentabili derivanti dall'interruzione anticipata della Partnership.
La risoluzione del Contratto non estingue né riduce gli obblighi economici già assunti dal Partner.
La collaborazione attiva del Partner costituisce obbligazione essenziale ai fini della corretta esecuzione del presente Contratto.

ARTICOLO 3 – OBBLIGHI DELLE PARTI E COLLABORAZIONE

3.1 Obblighi principali del Partner
Il Partner si impegna a partecipare attivamente allo sviluppo del progetto, collaborando in modo continuativo e tempestivo con Evolution PRO e rispettando le tempistiche indicate nel Programma Operativo, sulla piattaforma Ciak.io o nei canali ufficiali di progetto.
In particolare, salvo diversa pianificazione scritta concordata tra le Parti, il Partner si obbliga a:
• compilare e consegnare il Documento di Posizionamento;
• utilizzare attivamente la piattaforma Ciak.io per consultare attività, materiali, comunicazioni, richieste operative e avanzamento del progetto;
• partecipare ai briefing strategici e alle sessioni di definizione del piano marketing;
• fornire l'outline del Corso (argomenti, moduli, bonus);
• registrare e consegnare i file video non editati nei tempi concordati;
• fornire i materiali necessari alla realizzazione del funnel, del calendario editoriale e delle attività promozionali;
• approvare o segnalare eventuali modifiche ai materiali prodotti da Evolution PRO entro 5 (cinque) giorni lavorativi dalla loro consegna;
• collaborare alla produzione e pubblicazione dei contenuti social previsti dal piano editoriale;
• gestire in autonomia i lead, i contatti e le opportunità commerciali generate dalle attività di marketing;
• mantenere aggiornati i propri dati di contatto e garantire la reperibilità necessaria per l'esecuzione del progetto.
In assenza di osservazioni scritte entro 5 (cinque) giorni lavorativi dalla consegna di materiali, documenti, copy, funnel o altre attività realizzate da Evolution PRO, tali materiali si intenderanno approvati dal Partner.
La collaborazione attiva del Partner costituisce obbligazione essenziale ai fini della corretta esecuzione del presente Contratto.
L'assenza ingiustificata di comunicazione, collaborazione o operatività per oltre 30 (trenta) giorni consecutivi legittima Evolution PRO a:
• sospendere temporaneamente le attività operative;
• sospendere l'accesso a Ciak.io e agli strumenti messi a disposizione;
• posticipare le attività pianificate;
• avviare la procedura di risoluzione per grave inadempimento ai sensi dell'Articolo 2.7.
La sospensione delle attività dovuta a cause imputabili al Partner non comporta sospensione, riduzione o estinzione degli obblighi economici previsti dal presente Contratto.
3.2 Collaborazione e comunicazioni operative
Il Partner si impegna a:
• mantenere una comunicazione costante, collaborativa e tempestiva con Evolution PRO;
• consultare regolarmente la piattaforma Ciak.io e gli altri canali ufficiali utilizzati per la gestione del progetto;
• rispettare i termini di revisione dei materiali, delle proposte operative e delle richieste formulate da Evolution PRO;
• approvare o segnalare eventuali modifiche ai materiali ricevuti entro i termini indicati;
• fornire riscontri completi e sufficientemente dettagliati da consentire il corretto avanzamento delle attività;
• adottare un comportamento professionale, corretto e rispettoso nei confronti di Evolution PRO, dei suoi collaboratori, fornitori e partner tecnologici.
Salvo diversa indicazione scritta, il Partner dovrà fornire il proprio riscontro entro 5 (cinque) giorni lavorativi dalla ricezione di materiali, documenti, funnel, copy, contenuti o richieste operative.
In assenza di osservazioni scritte entro tale termine, il materiale si intenderà approvato, validato e autorizzato alla successiva fase operativa.
Le comunicazioni effettuate tramite Ciak.io, posta elettronica, PEC, sistemi di ticketing, piattaforme di project management o altri canali ufficialmente utilizzati da Evolution PRO costituiscono comunicazioni valide ai fini del presente Contratto.
L'eventuale mancata lettura, consultazione o presa visione delle comunicazioni regolarmente trasmesse attraverso i canali sopra indicati non potrà essere invocata dal Partner quale motivo di contestazione delle attività svolte da Evolution PRO.
3.3 Ritardi o mancata collaborazione del Partner
Eventuali ritardi, omissioni, inattività o mancata collaborazione da parte del Partner potranno comportare:
• la sospensione temporanea delle attività operative;
• il rinvio delle attività pianificate;
• il posticipo delle fasi successive del Programma Operativo;
• la sospensione dell'accesso a Ciak.io e agli ulteriori strumenti messi a disposizione da Evolution PRO.
Evolution PRO informerà il Partner mediante comunicazione scritta, indicando le attività mancanti e le azioni necessarie per il riallineamento del progetto.
L'eventuale inattività del Partner superiore a 30 (trenta) giorni consecutivi legittima Evolution PRO a dichiarare il progetto sospeso.
Qualora l'inattività o la mancata collaborazione proseguano per ulteriori 15 (quindici) giorni dalla comunicazione di sospensione, Evolution PRO potrà avviare la procedura di risoluzione per grave inadempimento ai sensi dell'Articolo 2.7.
La sospensione o il rallentamento del progetto imputabili al Partner:
• non comportano proroga automatica della durata contrattuale;
• non comportano riduzione o sospensione dei corrispettivi dovuti;
• non costituiscono inadempimento da parte di Evolution PRO.
Le Parti potranno concordare esclusivamente per iscritto eventuali estensioni tecniche finalizzate al completamento delle attività non eseguite a causa di ritardi imputabili al Partner.
3.4 Obblighi principali di Evolution PRO
Evolution PRO si impegna a:
• eseguire con diligenza professionale le attività previste dal Programma Operativo E.V.O.;
• mettere a disposizione del Partner la piattaforma proprietaria Ciak.io e gli strumenti necessari alla gestione operativa del progetto;
• realizzare le attività previste dalla Partnership, incluse a titolo esemplificativo: configurazione del funnel, configurazione dell'area corsi, editing dei contenuti, supporto copywriting, supporto strategico marketing, supporto tecnico e attività operative espressamente incluse nel Programma Operativo;
• fornire al Partner accesso ai dati, alle informazioni e alle statistiche disponibili attraverso Ciak.io, Systeme.io o gli altri sistemi utilizzati per la gestione del progetto;
• assicurare una formazione iniziale sufficiente all'utilizzo delle principali funzionalità degli strumenti messi a disposizione;
• fornire supporto strategico e tecnico attraverso i canali ufficiali indicati da Evolution PRO;
• coordinare il progetto secondo il Metodo E.V.O. e le procedure operative definite nel Programma Operativo;
• avvalersi, ove necessario, di collaboratori, consulenti, fornitori esterni, software, sistemi di automazione e strumenti di intelligenza artificiale, restando responsabile della corretta esecuzione complessiva delle attività contrattualmente previste.
Le Parti riconoscono che le obbligazioni assunte da Evolution PRO costituiscono obbligazioni di mezzi e non di risultato.
Evolution PRO si impegna pertanto a mettere a disposizione competenze, strumenti, know-how, supporto strategico e infrastrutture operative, senza garantire specifici risultati economici, commerciali, di fatturato, di acquisizione clienti o di vendita.
3.5 Diritti comuni delle Parti
Le Parti potranno proporre modifiche, integrazioni, aggiornamenti o variazioni al progetto, al Programma Operativo E.V.O., alle attività di marketing o agli asset sviluppati nell'ambito della Partnership.
Tali modifiche avranno efficacia esclusivamente se approvate per iscritto dalle Parti mediante PEC, e-mail o altro canale ufficialmente riconosciuto da Evolution PRO.
Le Parti si impegnano a mantenere per tutta la durata del Contratto un comportamento improntato ai principi di correttezza, buona fede, trasparenza e collaborazione reciproca.
Ciascuna Parte si impegna a segnalare tempestivamente eventuali circostanze che possano compromettere il corretto svolgimento del progetto, collaborando per individuare soluzioni ragionevoli e sostenibili.
L'eventuale mancato adempimento del Partner agli obblighi di consegna, approvazione, collaborazione, partecipazione operativa o utilizzo degli strumenti messi a disposizione da Evolution PRO non potrà essere imputato a Evolution PRO, né costituire motivo di contestazione delle attività svolte, richiesta di rimborso o sospensione degli obblighi economici previsti dal presente Contratto.
Le Parti riconoscono che il successo del progetto dipende dalla collaborazione attiva e continuativa di entrambe le Parti e che l'eventuale inerzia o inattività del Partner può compromettere il raggiungimento degli obiettivi del Programma Operativo senza che ciò possa essere imputato a Evolution PRO.

ARTICOLO 4 – PROPRIETÀ INTELLETTUALE E INDUSTRIALE

4.1 Titolarità dei diritti
Il Partner mantiene la piena titolarità dei diritti d'autore, dei diritti di sfruttamento economico e di ogni altro diritto relativo ai contenuti originali forniti nell'ambito della Partnership, inclusi a titolo esemplificativo: metodologie professionali, testi, video, materiali didattici, registrazioni, slide, documenti, casi studio, framework professionali e contenuti formativi.
Con la sottoscrizione del presente Contratto, il Partner dichiara e garantisce che tali contenuti sono di sua esclusiva disponibilità o comunque utilizzabili legittimamente e che il loro impiego non viola diritti di terzi.
Restano invece di esclusiva proprietà di Evolution PRO tutti i diritti relativi a:
• Metodo E.V.O.;
• piattaforma Ciak.io;
• sistemi software sviluppati o utilizzati da Evolution PRO;
• agenti AI, prompt, workflow e automazioni;
• template, procedure operative, framework strategici e metodologie proprietarie;
• documentazione interna;
• sistemi di marketing, vendita, lancio e ottimizzazione sviluppati da Evolution PRO;
• materiali formativi interni e risorse operative proprietarie.
Per la durata del presente Contratto, Evolution PRO concede al Partner una licenza d'uso personale, limitata, non esclusiva, non trasferibile e revocabile relativamente agli strumenti, ai materiali e alle risorse messi a disposizione nell'ambito della Partnership, esclusivamente per le finalità previste dal presente Contratto.
La sottoscrizione del presente Contratto non comporta alcun trasferimento di proprietà intellettuale da una Parte all'altra, salvo quanto espressamente previsto nel presente Contratto o in accordi successivi sottoscritti per iscritto.
4.2 Licenza concessa a Evolution PRO
Il Partner concede a Evolution PRO una licenza d'uso temporanea, non trasferibile e in esclusiva limitatamente al Corso, ai contenuti e ai materiali oggetto della Partnership, esclusivamente per le finalità previste dal presente Contratto.
La licenza consente a Evolution PRO di:
• produrre, modificare, editare, pubblicare, distribuire e promuovere il Corso;
• utilizzare i contenuti nell'ambito della piattaforma Ciak.io e degli strumenti operativi collegati;
• realizzare funnel, pagine web, masterclass, materiali promozionali, campagne marketing, automazioni e attività di vendita;
• utilizzare i contenuti per le attività previste dal Programma Operativo E.V.O.;
• archiviare, elaborare e gestire i contenuti tramite software, piattaforme, sistemi cloud e strumenti tecnologici necessari all'esecuzione della Partnership.
La licenza è valida per l'intera durata del presente Contratto e per i novanta (90) giorni successivi alla sua cessazione, limitatamente alle attività tecniche necessarie alla chiusura delle campagne, alla gestione degli ordini acquisiti, alle attività amministrative e agli adempimenti connessi alla Partnership.
Evolution PRO potrà consentire l'accesso ai contenuti esclusivamente a collaboratori, consulenti, fornitori tecnologici, sistemi software, strumenti di intelligenza artificiale e piattaforme utilizzati per l'esecuzione delle attività previste dal presente Contratto.
La licenza non attribuisce a Evolution PRO alcun diritto di proprietà sui contenuti del Partner e cesserà automaticamente alla scadenza dei termini sopra indicati, fatti salvi gli obblighi di conservazione eventualmente previsti dalla legge.
4.3 Miglioramenti tecnici e adattamenti
Il Partner autorizza Evolution PRO ad apportare ai contenuti forniti tutte le modifiche, integrazioni, rielaborazioni, adattamenti tecnici e ottimizzazioni ragionevolmente necessarie per l'esecuzione delle attività previste dal presente Contratto.
Tali interventi potranno includere, a titolo esemplificativo:
• editing audio e video;
• correzioni grafiche e impaginazione;
• adattamenti per piattaforme digitali;
• ottimizzazioni di accessibilità e fruibilità;
• riorganizzazione dei contenuti;
• adattamenti di copywriting, titolazione, call to action e struttura commerciale;
• creazione di funnel, masterclass, materiali promozionali e asset di marketing derivati dai contenuti forniti dal Partner.
Evolution PRO si impegna a non alterare in modo sostanziale il significato, il posizionamento professionale, il metodo o il messaggio principale del Partner senza il suo preventivo consenso.
Le attività di ottimizzazione, adattamento e rielaborazione effettuate da Evolution PRO nell'ambito della Partnership non comportano alcun trasferimento della titolarità dei contenuti originali del Partner.
4.4 Divieto di utilizzo autonomo durante la Partnership
Per tutta la durata del presente Contratto e per i novanta (90) giorni successivi alla sua cessazione, il Partner si impegna a rispettare integralmente gli obblighi di esclusiva previsti dall'Articolo 1.4.
In particolare, salvo preventiva autorizzazione scritta di Evolution PRO, il Partner non potrà riprodurre, distribuire, vendere, promuovere o pubblicare autonomamente:
• il medesimo Corso;
• l'Accademia Digitale oggetto della Partnership;
• Contenuti Sostanzialmente Equivalenti come definiti all'Articolo 1.4;
• funnel, masterclass, materiali promozionali o asset commerciali sviluppati nell'ambito della Partnership e destinati alla vendita del medesimo prodotto formativo.
Restano salve le attività espressamente escluse dal regime di esclusiva ai sensi dell'Articolo 1.4 del presente Contratto.
4.5 Uso promozionale, portfolio e case study
Il Partner autorizza Evolution PRO, per tutta la durata del presente Contratto e successivamente alla sua cessazione, a utilizzare il proprio nome, marchio, immagine professionale, testimonianze, risultati, estratti di contenuti, screenshot, materiali promozionali, funnel, dashboard, statistiche, case study e altri elementi sviluppati nell'ambito della Partnership, esclusivamente per finalità di comunicazione istituzionale, portfolio, marketing, promozione commerciale e presentazione dei servizi di Evolution PRO.
Tale utilizzo potrà avvenire attraverso siti web, piattaforme digitali, social media, presentazioni commerciali, webinar, eventi, materiali informativi, piattaforma Ciak.io e altri canali utilizzati da Evolution PRO.
Evolution PRO si impegna a utilizzare tali materiali in modo corretto, veritiero e non denigratorio, nel rispetto della reputazione professionale del Partner.
Il Partner potrà richiedere per iscritto la rimozione o la limitazione dell'utilizzo di specifici contenuti, immagini o testimonianze qualora sussistano giustificati motivi legati alla tutela della propria reputazione, immagine professionale, riservatezza o mutamento sostanziale del contesto originario.
Resta in ogni caso consentito a Evolution PRO l'utilizzo di dati aggregati, statistiche anonimizzate, casi studio privi di elementi identificativi e informazioni utilizzate a fini documentali, formativi o storici.
4.6 Tutela reciproca della proprietà intellettuale
Ciascuna Parte si impegna a rispettare e tutelare i diritti di proprietà intellettuale, industriale e commerciale dell'altra Parte e di eventuali terzi.
È fatto divieto al Partner di copiare, riprodurre, distribuire, condividere, rivendere, concedere in licenza o utilizzare, al di fuori delle finalità previste dal presente Contratto, il Metodo E.V.O., la piattaforma Ciak.io, i template, i funnel, le automazioni, i prompt, gli agenti AI, i framework strategici, le procedure operative e gli altri asset proprietari di Evolution PRO.
È fatto divieto a Evolution PRO di utilizzare i contenuti originali del Partner per finalità diverse da quelle previste dal presente Contratto, salvo quanto espressamente autorizzato negli articoli precedenti.
Qualsiasi utilizzo non autorizzato di contenuti, materiali, metodologie, software, marchi o altri diritti di proprietà intellettuale potrà costituire grave inadempimento contrattuale e legittimare la Parte lesa:
• a richiedere l'immediata cessazione della violazione;
• a risolvere il Contratto ai sensi dell'Articolo 2.7;
• a richiedere il risarcimento di tutti i danni diretti e indiretti subiti.
Restano impregiudicati tutti gli ulteriori diritti e rimedi previsti dalla normativa applicabile in materia di proprietà intellettuale, concorrenza sleale e tutela del know-how aziendale.

ARTICOLO 5 – CORRISPETTIVI, PIANI DI PAGAMENTO E REVENUE SHARE

5.1 Corrispettivo della Partnership
Il corrispettivo previsto per l'accesso alla Partnership Evolution PRO è pari a € 2.790,00 (duemilasettecentonovanta/00), secondo le modalità di pagamento concordate tra le Parti e riportate nel presente Contratto o nei relativi allegati.
Il corrispettivo remunera:
• l'accesso al Metodo E.V.O.;
• l'accesso alla piattaforma Ciak.io;
• l'attivazione del Programma Operativo;
• le attività strategiche, operative e tecniche previste dalla Partnership;
• l'utilizzo delle infrastrutture, dei sistemi, del know-how e delle risorse messe a disposizione da Evolution PRO.
Le Parti riconoscono che il valore economico complessivo dei servizi, delle attività e degli asset inclusi nella Partnership è riportato nell'Allegato B – Valore dei Servizi Inclusi nella Partnership.
Il corrispettivo non rappresenta il prezzo di un singolo deliverable o di una specifica attività, bensì l'investimento complessivo richiesto per l'accesso al sistema, al metodo e alle risorse oggetto della Partnership.
Il corrispettivo si considera definitivamente maturato con l'attivazione della Partnership e resta disciplinato dalle ulteriori disposizioni del presente Contratto in materia di pagamenti, sospensione, recesso, risoluzione e inadempimento.
5.2 Modalità di pagamento
Il corrispettivo previsto dal presente Contratto è dovuto integralmente alla sottoscrizione del Contratto.
A esclusiva discrezione di Evolution PRO, e previa approvazione scritta, potrà essere concessa al Partner una dilazione di pagamento mediante rateizzazione del corrispettivo, fino a un massimo di 3 (tre) rate mensili consecutive.
La concessione della rateizzazione costituisce una mera agevolazione finanziaria concessa da Evolution PRO e non modifica:
• il valore complessivo del Contratto;
• gli obblighi economici assunti dal Partner;
• la natura unitaria del corrispettivo previsto dalla Partnership.
Tutti i pagamenti dovranno essere effettuati sul conto indicato da Evolution PRO oppure tramite sistemi elettronici autorizzati (Stripe, PayPal o equivalenti).
I pagamenti si considerano perfezionati esclusivamente al momento dell'effettivo accredito delle somme.
Il mancato pagamento anche di una sola rata entro 15 (quindici) giorni dalla relativa scadenza comporterà, previa comunicazione scritta di Evolution PRO:
• la decadenza automatica del beneficio della rateizzazione;
• l'immediata esigibilità dell'intero importo residuo ancora dovuto;
• la facoltà per Evolution PRO di sospendere l'accesso a Ciak.io, alle infrastrutture tecniche, ai funnel, alle automazioni e ai servizi ancora non erogati;
• la facoltà di avvalersi delle ulteriori tutele previste dagli Articoli 2.7 e 5 del presente Contratto.
La sospensione delle attività o dell'accesso agli strumenti non comporta rinuncia ai crediti maturati né estinzione degli obblighi economici assunti dal Partner.
5.3 Decadenza del beneficio della dilazione
Il mancato pagamento anche di una sola rata oltre 10 (dieci) giorni dalla relativa scadenza, previa messa in mora scritta da parte di Evolution PRO, comporta la decadenza automatica del beneficio della dilazione concessa.
Decorso inutilmente il termine indicato nella messa in mora, Evolution PRO avrà facoltà di:
• sospendere immediatamente l'accesso alla piattaforma Ciak.io;
• sospendere l'accesso ai funnel, alle automazioni, all'area corsi e agli ulteriori asset operativi messi a disposizione nell'ambito della Partnership;
• sospendere le attività ancora non eseguite;
• avvalersi della clausola risolutiva espressa di cui all'Articolo 2.7.
Il ritardo nel pagamento costituisce inadempimento essenziale ai sensi del presente Contratto.
In caso di risoluzione del Contratto per grave inadempimento del Partner derivante dal mancato pagamento dei corrispettivi pattuiti, la Partnership si intenderà cessata con effetto immediato.
Resta fermo il diritto di Evolution PRO di richiedere:
• il pagamento delle somme già maturate;
• il pagamento delle rate scadute e non corrisposte;
• il pagamento dell'intero importo residuo ancora dovuto ai sensi del piano di pagamento concordato;
• il risarcimento degli eventuali ulteriori danni diretti e documentabili derivanti dall'interruzione anticipata del rapporto.
La cessazione della Partnership non comporta rinuncia ai crediti maturati né estinzione degli obblighi economici assunti dal Partner.
5.4 Valore complessivo del progetto e ripartizione dell'investimento
Le Parti riconoscono che il corrispettivo versato dal Partner rappresenta solo una parte del valore economico complessivo del progetto sviluppato nell'ambito della Partnership.
Le Parti riconoscono inoltre che Evolution PRO contribuisce al progetto mediante un apporto organizzativo, strategico, tecnico e operativo consistente, tra l'altro, nella messa a disposizione di:
• Metodo E.V.O.;
• piattaforma proprietaria Ciak.io;
• know-how specialistico;
• infrastrutture tecnologiche;
• sistemi software e automazioni;
• funnel, template e framework operativi;
• attività di consulenza strategica, supporto tecnico e coordinamento progettuale;
• collaboratori, fornitori e risorse impiegate per l'esecuzione del Programma Operativo.
Tale apporto costituisce parte integrante della Partnership e rappresenta un investimento industriale e organizzativo sostenuto da Evolution PRO per la realizzazione e lo sviluppo del progetto.
Le Parti riconoscono che il modello di Partnership adottato da Evolution PRO si fonda sulla collaborazione reciproca e sulla condivisione del rischio imprenditoriale connesso allo sviluppo del progetto, senza che ciò configuri attività di finanziamento, concessione di credito o partecipazione societaria.
Il Partner dichiara di aver preso visione dell'Allegato B – Valore dei Servizi Inclusi nella Partnership e di riconoscere il valore economico complessivo delle attività, delle risorse e degli asset messi a disposizione da Evolution PRO.
5.5 Royalty a favore di Evolution PRO
A fronte dell'investimento organizzativo, strategico, tecnico e operativo sostenuto da Evolution PRO nell'ambito della Partnership, il Partner riconosce a Evolution PRO una royalty pari al 10% (dieci per cento) dei ricavi derivanti dalla vendita del Corso, dell'Accademia Digitale e degli ulteriori prodotti formativi sviluppati nell'ambito del progetto.
La royalty è dovuta per un periodo di dodici (12) mesi decorrenti dalla data di sottoscrizione del presente Contratto.
La royalty del 10% è calcolata sull'Importo Netto Incassato, come definito all'Articolo 1.5 e risultante dai sistemi di rendicontazione utilizzati da Evolution PRO.
Ai fini del calcolo della royalty, fanno fede i dati risultanti dalle piattaforme di pagamento, dai sistemi di vendita e dagli strumenti di rendicontazione utilizzati da Evolution PRO, salvo prova contraria documentata.
Decorso il termine di dodici (12) mesi dalla sottoscrizione del presente Contratto:
• cesserà automaticamente ogni obbligo di corresponsione della royalty;
• resteranno dovuti esclusivamente eventuali importi già maturati e non ancora corrisposti;
• resteranno ferme le ulteriori obbligazioni eventualmente sopravviventi previste dal presente Contratto.
La cessazione della royalty non comporta alcun trasferimento automatico di proprietà o di diritti relativi al Metodo E.V.O., alla piattaforma Ciak.io o agli altri asset proprietari di Evolution PRO.
5.6 Durata e applicazione della Revenue Share
La royalty del 10% prevista dal presente Contratto si applica esclusivamente alle vendite del Corso, dell'Accademia Digitale o degli ulteriori prodotti formativi concluse durante il periodo di validità del presente Contratto.
Per "vendita conclusa" si intende qualsiasi ordine, acquisto, adesione, iscrizione o contratto perfezionato da un cliente finale entro la scadenza dei dodici (12) mesi di durata della Partnership.
Qualora una vendita conclusa durante la validità del Contratto preveda pagamenti rateali, abbonamenti, dilazioni o incassi distribuiti nel tempo, la royalty continuerà ad applicarsi a tutti gli importi derivanti da tale vendita fino al completo pagamento della stessa.
Le vendite concluse successivamente alla cessazione del presente Contratto non saranno soggette ad alcuna royalty a favore di Evolution PRO, salvo diverso accordo scritto tra le Parti.
Ai fini dell'individuazione della data di conclusione della vendita, fanno fede i dati risultanti dalle piattaforme di pagamento, dai sistemi di vendita e dagli strumenti di rendicontazione utilizzati da Evolution PRO.
5.7 Natura non rimborsabile del corrispettivo
Le Parti riconoscono che il corrispettivo iniziale previsto dal presente Contratto remunera:
• l'attivazione della Partnership;
• l'accesso al Metodo E.V.O.;
• l'accesso alla piattaforma Ciak.io;
• la pianificazione strategica del progetto;
• l'allocazione delle risorse organizzative, tecniche e operative;
• la messa a disposizione del know-how, delle infrastrutture e degli strumenti proprietari di Evolution PRO;
• l'avvio del Programma Operativo.
Ai fini del presente Contratto, l'esecuzione della Partnership si considera avviata dal momento in cui si verifica anche una sola delle seguenti attività:
• attivazione dell'account Partner su Ciak.io;
• accesso ai materiali del Programma Operativo;
• avvio delle attività di posizionamento o pianificazione strategica;
• consegna di documenti, materiali, funnel, copy o altre attività operative da parte di Evolution PRO;
• partecipazione a sessioni di onboarding, allineamento strategico o avvio progetto.
Una volta avviata l'esecuzione della Partnership, il corrispettivo iniziale si intende definitivamente maturato e acquisito da Evolution PRO e non sarà soggetto a rimborso, restituzione o compensazione.
Restano salvi esclusivamente:
• i casi inderogabili previsti dalla normativa applicabile;
• l'accertato grave inadempimento imputabile a Evolution PRO.
L'eventuale sospensione, rallentamento o interruzione del progetto dovuti a cause imputabili al Partner non costituiscono motivo di rimborso, riduzione del corrispettivo o restituzione delle somme già versate.
5.8 Utilizzo della piattaforma e continuità operativa post-contratto
Alla cessazione del presente Contratto, il Partner mantiene la piena disponibilità dei propri contenuti originali, del Corso e dei materiali formativi di propria titolarità.
La prosecuzione autonoma delle attività di vendita, marketing o gestione tecnica del progetto potrà avvenire mediante infrastrutture tecniche proprie del Partner oppure tramite servizi sottoscritti direttamente con fornitori terzi, inclusa la piattaforma Systeme.io o altre piattaforme equivalenti.
Salvo diverso accordo scritto, alla cessazione del Contratto:
• cesserà il diritto di utilizzo della piattaforma Ciak.io;
• cesserà il diritto di utilizzo del Metodo E.V.O. nella sua forma documentale, operativa e proprietaria;
• cesserà l'accesso agli agenti AI, ai workflow, alle automazioni, ai template e agli strumenti messi a disposizione da Evolution PRO;
• cesserà ogni obbligo di assistenza tecnica, strategica o operativa da parte di Evolution PRO.
Eventuali attività di migrazione, esportazione dati, supporto tecnico, affiancamento operativo o servizi di continuità potranno essere forniti esclusivamente sulla base di un accordo separato e di un corrispettivo specifico.
Le attività svolte autonomamente dal Partner successivamente alla cessazione del Contratto non generano alcun diritto a compensi, royalties, commissioni o ulteriori prestazioni a carico di Evolution PRO.
5.9 Attività pubblicitarie (ADV) e promozione del progetto
Le attività pubblicitarie a pagamento (ADV) non costituiscono elemento obbligatorio della Partnership, salvo diverso accordo scritto tra le Parti.
Evolution PRO potrà fornire supporto strategico, consulenziale e operativo limitatamente alle attività espressamente incluse nel Programma Operativo o concordate successivamente tra le Parti.
L'attivazione di campagne pubblicitarie a pagamento sarà valutata congiuntamente in funzione:
• degli obiettivi del progetto;
• del posizionamento del Corso;
• delle risorse disponibili;
• del budget messo a disposizione dal Partner.
Tutti i costi pubblicitari, inclusi a titolo esemplificativo quelli sostenuti presso Meta, Google, YouTube, LinkedIn o altre piattaforme promozionali, restano integralmente a carico del Partner e dovranno essere sostenuti mediante account e metodi di pagamento riconducibili al Partner stesso, salvo diverso accordo scritto.
Salvo diverso accordo scritto, Evolution PRO non assume obblighi di gestione continuativa delle campagne pubblicitarie né garantisce specifici risultati economici, commerciali, di vendita, acquisizione clienti o ritorno sull'investimento pubblicitario.
Le Parti riconoscono che il successo commerciale del progetto può dipendere da molteplici fattori, tra cui:
• qualità e completezza dei contenuti;
• partecipazione attiva del Partner;
• attività organiche di comunicazione;
• utilizzo di campagne pubblicitarie;
• condizioni di mercato;
• livello di concorrenza;
• capacità di conversione dell'offerta.
L'eventuale mancata attivazione di campagne ADV da parte del Partner non costituisce inadempimento contrattuale, salvo che le Parti abbiano espressamente individuato tali attività come elemento essenziale del piano di lancio mediante accordo scritto.

ARTICOLO 6 – RISERVATEZZA E SEGRETO AZIENDALE

6.1 Oggetto della riservatezza
Ciascuna Parte si impegna a mantenere strettamente riservate tutte le informazioni tecniche, strategiche, commerciali, operative, organizzative o finanziarie apprese nel corso della collaborazione, indipendentemente dalla forma con cui esse vengano comunicate (orale, scritta, digitale, audiovisiva o tramite accesso a piattaforme software).
Sono considerate Informazioni Riservate, a titolo esemplificativo e non esaustivo:
• strategie di marketing, funnel, automazioni e sistemi di vendita;
• piani editoriali, campagne ADV e strategie di lancio;
• dati di performance, report, statistiche e KPI;
• informazioni relative a clienti, lead, contatti, fornitori e collaboratori;
• contenuti video, materiali didattici e testi promozionali non ancora pubblicati;
• listini, offerte commerciali, condizioni economiche e documentazione interna;
• Metodo E.V.O.;
• piattaforma Ciak.io;
• workflow operativi;
• agenti AI, prompt, procedure automatizzate e sistemi di orchestrazione;
• framework strategici, modelli operativi, procedure interne e know-how aziendale;
• qualsiasi informazione identificata come confidenziale o che, per sua natura, debba ragionevolmente essere considerata tale.
Le Informazioni Riservate non potranno essere comunicate, divulgate, riprodotte, condivise, copiate o utilizzate per finalità diverse da quelle strettamente necessarie all'esecuzione del presente Contratto.
Il Partner riconosce espressamente che il Metodo E.V.O., la piattaforma Ciak.io, i workflow, gli agenti AI, le procedure operative e il know-how sviluppato da Evolution PRO costituiscono informazioni commercialmente sensibili e asset strategici di particolare valore, meritevoli di specifica tutela.
6.2 Durata dell'obbligo di riservatezza
L'obbligo di riservatezza decorre dalla data di sottoscrizione del presente Contratto.
Per le Informazioni Riservate di natura commerciale, operativa, economica, organizzativa o tecnica, tale obbligo rimarrà efficace per tutta la durata del Contratto e per i successivi 5 (cinque) anni dalla sua cessazione, indipendentemente dalla causa della stessa.
Per quanto riguarda il Metodo E.V.O., la piattaforma Ciak.io, i workflow, gli agenti AI, i prompt, le procedure operative, i framework strategici, il know-how aziendale e ogni altro asset proprietario di Evolution PRO, l'obbligo di riservatezza e di non divulgazione resterà efficace senza limiti di tempo, fino a quando tali informazioni non divengano legittimamente di dominio pubblico per cause non imputabili al Partner.
La cessazione del Contratto non comporta la cessazione degli obblighi di riservatezza previsti dal presente Articolo.
6.3 Eccezioni agli obblighi di riservatezza
Gli obblighi di riservatezza previsti dal presente Contratto non si applicano alle informazioni che la Parte ricevente sia in grado di dimostrare:
• essere già di pubblico dominio al momento della comunicazione;
• essere divenute di pubblico dominio successivamente senza violazione del presente Contratto;
• essere già legittimamente conosciute dalla Parte ricevente prima della loro comunicazione;
• essere state legittimamente acquisite da terzi non vincolati da obblighi di riservatezza;
• dover essere comunicate in forza di disposizioni di legge, provvedimenti dell'autorità giudiziaria, amministrativa o di altre autorità competenti.
In caso di richiesta di divulgazione da parte di un'autorità competente, la Parte destinataria della richiesta, ove legalmente consentito, informerà tempestivamente l'altra Parte prima della comunicazione delle informazioni riservate, al fine di consentire l'adozione delle eventuali misure di tutela ritenute opportune.
Resta inteso che l'eccezione di cui al presente Articolo si applica esclusivamente nella misura strettamente necessaria all'adempimento dell'obbligo legale o dell'ordine ricevuto.
6.4 Responsabilità e controllo
Ciascuna Parte si impegna a garantire che i propri dipendenti, collaboratori, consulenti, fornitori tecnologici e soggetti autorizzati ad accedere alle Informazioni Riservate rispettino obblighi di riservatezza almeno equivalenti a quelli previsti dal presente Contratto.
Ciascuna Parte risponde delle violazioni imputabili ai soggetti sopra indicati nella misura consentita dalla normativa applicabile.
Evolution PRO si impegna ad adottare misure organizzative, tecniche e procedurali ragionevolmente adeguate alla tutela delle informazioni riservate e dei dati trattati nell'ambito della Partnership, anche attraverso la piattaforma Ciak.io e gli strumenti tecnologici utilizzati per l'esecuzione del Programma Operativo.
6.5 Violazione dell'obbligo di riservatezza - Penale
La violazione grave e imputabile degli obblighi di riservatezza previsti dal presente Articolo comporterà l'obbligo di corrispondere alla Parte lesa una penale pari a Euro 5.000,00 (cinquemila/00) per ciascuna violazione autonoma accertata.
Non costituiscono violazioni autonome la pluralità di atti meramente esecutivi del medesimo comportamento illecito.
Resta in ogni caso salvo il diritto della Parte lesa di richiedere il risarcimento dell'eventuale maggior danno subito.
6.6 Riservatezza precontrattuale
Gli obblighi di riservatezza previsti dal presente Articolo si applicano anche alle informazioni, ai documenti, alle strategie, alle analisi e ai materiali condivisi tra le Parti nella fase precontrattuale, incluse a titolo esemplificativo:
• Analisi Strategica;
• Studio di Fattibilità;
• documenti di posizionamento;
• proposte operative;
• strategie di marketing;
• modelli economici;
• presentazioni commerciali;
• dimostrazioni della piattaforma Ciak.io;
• materiali relativi al Metodo E.V.O.
Tali obblighi restano validi anche qualora il Contratto non venga successivamente sottoscritto, eseguito o rinnovato.

ARTICOLO 7 – RECESSO, RISOLUZIONE E LIMITAZIONI DI RESPONSABILITÀ

7.1 Esclusione del recesso ordinario e limitazione della responsabilità
Il presente Contratto non prevede diritto di recesso ordinario da parte delle Parti, salvo quanto previsto dall'Articolo 2.6 a favore di Evolution PRO.
Il rapporto contrattuale ha durata determinata di dodici (12) mesi dalla sottoscrizione e potrà cessare anticipatamente esclusivamente nei casi previsti dal presente Contratto, inclusa la risoluzione per grave inadempimento ai sensi dell'Articolo 2.7.
Salvo i casi di dolo, colpa grave, violazione intenzionale degli obblighi essenziali o responsabilità inderogabili previste dalla legge applicabile, Evolution PRO non sarà responsabile per:
• mancato raggiungimento di risultati economici;
• perdita di profitto;
• perdita di opportunità commerciali;
• mancato fatturato;
• danni indiretti, consequenziali o riflessi;
• aspettative economiche non realizzate dal Partner.
In ogni caso, l'eventuale responsabilità risarcitoria complessiva di Evolution PRO non potrà eccedere l'importo dei corrispettivi effettivamente versati dal Partner ai sensi del presente Contratto.
7.2 Risoluzione per grave inadempimento di Evolution PRO
Il Partner potrà richiedere la risoluzione anticipata del Contratto esclusivamente in presenza di un grave, comprovato e imputabile inadempimento di Evolution PRO agli obblighi essenziali previsti dal presente Contratto e dal Programma Operativo E.V.O.
La risoluzione potrà essere richiesta solo previa diffida ad adempiere inviata tramite PEC o altro canale formalmente riconosciuto dal Contratto, con concessione a Evolution PRO di un termine non inferiore a quindici (15) giorni per porre rimedio all'inadempimento contestato.
Non costituiscono grave inadempimento di Evolution PRO:
• ritardi imputabili al Partner;
• mancata collaborazione del Partner;
• mancata consegna di materiali necessari;
• sospensioni previste dal presente Contratto;
• eventi di forza maggiore;
• attività non espressamente comprese nella Partnership.
In caso di accertata risoluzione per grave inadempimento imputabile a Evolution PRO, il Partner potrà richiedere esclusivamente il rimborso della quota di corrispettivo non proporzionata alle attività effettivamente eseguite e ai costi sostenuti da Evolution PRO.
Ai fini della determinazione dell'eventuale rimborso si terrà conto, tra l'altro:
• delle attività già eseguite;
• delle attività già pianificate e avviate;
• delle risorse allocate;
• dei costi sostenuti;
• dell'accesso a Ciak.io e agli strumenti della Partnership;
• dei materiali, dei funnel, dei copy e degli asset già realizzati;
• dell'utilizzabilità concreta degli asset da parte del Partner.
In nessun caso il Partner avrà diritto alla restituzione integrale del corrispettivo qualora Evolution PRO abbia già avviato l'esecuzione della Partnership ai sensi dell'Articolo 5.7, salvo diverso obbligo imposto dalla normativa applicabile.
7.3 Risoluzione per inadempimento del Partner
In caso di risoluzione del Contratto per grave inadempimento del Partner, Evolution PRO avrà diritto a:
• trattenere le somme già percepite;
• esigere le rate scadute e non corrisposte;
• richiedere il pagamento dell'eventuale saldo residuo previsto dal piano di pagamento concordato;
• richiedere il risarcimento degli eventuali ulteriori danni diretti e documentabili derivanti dall'inadempimento.
La risoluzione del Contratto non comporta rinuncia ai crediti maturati né estinzione degli obblighi economici già assunti dal Partner.
7.4 Effetti della risoluzione per inadempimento del Partner
In caso di risoluzione anticipata del Contratto per grave inadempimento del Partner:
• cesserà ogni obbligo di Evolution PRO di proseguire lo sviluppo del progetto;
• Evolution PRO potrà sospendere l'accesso a Ciak.io, alle automazioni, ai funnel, agli strumenti operativi e agli ulteriori asset messi a disposizione nell'ambito della Partnership;
• Evolution PRO potrà, a propria discrezione, completare le attività tecniche già avviate esclusivamente per finalità amministrative, di chiusura del progetto o di tutela dei propri interessi.
Restano fermi:
• i crediti maturati;
• gli obblighi economici del Partner;
• gli obblighi di riservatezza;
• gli obblighi relativi alla proprietà intellettuale;
• ogni altra clausola destinata a produrre effetti successivamente alla cessazione del Contratto.
7.5 Risoluzione per impossibilità sopravvenuta
Qualora la prosecuzione del Contratto divenga oggettivamente impossibile per cause non imputabili alle Parti, incluse a titolo esemplificativo cause di forza maggiore, eventi straordinari, provvedimenti normativi, indisponibilità permanente di infrastrutture essenziali o altri eventi imprevedibili e inevitabili, ciascuna Parte potrà risolvere il Contratto mediante comunicazione scritta.
In caso di impossibilità sopravvenuta non imputabile alle Parti:
• resteranno fermi gli effetti economici maturati in relazione alle attività già eseguite;
• le attività non ancora eseguite non saranno dovute;
• le Parti procederanno a una regolazione economica proporzionata alle attività effettivamente eseguite, alle risorse impiegate e ai costi sostenuti.
Ciascuna Parte collaborerà in buona fede al fine di ridurre gli effetti pregiudizievoli derivanti dall'evento che ha determinato l'impossibilità di prosecuzione del rapporto.
7.6 Limitazioni di responsabilità
Evolution PRO non garantisce risultati economici specifici in termini di vendite, conversioni, acquisizione clienti, fatturato o profitti, poiché tali risultati dipendono da molteplici fattori esterni al controllo di Evolution PRO, inclusi mercato, concorrenza, budget, qualità dei contenuti, posizionamento del Partner, attività commerciali svolte e stagionalità.
L'impegno contrattuale di Evolution PRO consiste nell'erogare i servizi previsti dal presente Contratto con diligenza professionale, secondo il Programma Operativo e il Metodo E.V.O., configurando un'obbligazione di mezzi e non di risultato.
In nessun caso Evolution PRO potrà essere ritenuta responsabile per danni indiretti, consequenziali, perdita di profitto, perdita di opportunità commerciali, perdita di chance o mancato guadagno, salvo il caso di dolo o colpa grave.
Evolution PRO non risponde, in particolare, di:
• malfunzionamenti imputabili a piattaforme esterne, servizi di terzi, strumenti AI, fornitori tecnologici, software cloud o eventi di forza maggiore;
• risultati economici inferiori alle aspettative del Partner;
• perdite o disservizi derivanti da ritardi, omissioni, inadempimenti o mancata collaborazione del Partner;
• sospensioni o limitazioni imposte da piattaforme terze, sistemi di pagamento o canali pubblicitari.
Il Partner riconosce che il successo economico del progetto dipende in misura significativa dalla qualità dei contenuti forniti, dal posizionamento professionale, dall'impegno commerciale, dall'attività di comunicazione svolta e dall'eventuale investimento promozionale effettuato.
Il mancato raggiungimento di obiettivi economici o commerciali non costituisce inadempimento contrattuale da parte di Evolution PRO.
7.7 Comunicazioni formali
Ogni recesso, risoluzione, diffida, contestazione o altra comunicazione avente rilevanza contrattuale dovrà essere effettuata per iscritto secondo le modalità previste dall'Articolo 13 del presente Contratto.
Le comunicazioni effettuate con modalità differenti non produrranno effetti giuridici ai fini dell'esercizio dei diritti previsti dal presente Contratto, salvo diversa accettazione scritta della Parte destinataria.

ARTICOLO 8 – SERVIZI FORNITI DA EVOLUTION PRO, OBBLIGHI DEL PARTNER E PROGRAMMA E.V.O.

8.1 Servizi forniti da Evolution PRO
Nell'ambito della Partnership, Evolution PRO fornisce al Partner servizi strategici, tecnici e operativi finalizzati alla progettazione, realizzazione, pubblicazione, lancio e sviluppo commerciale del progetto formativo oggetto del presente Contratto.
Le attività potranno comprendere, a titolo esemplificativo e non esaustivo:
• analisi strategica e posizionamento del progetto;
• definizione dell'offerta commerciale;
• applicazione del Metodo E.V.O.;
• accesso e utilizzo della piattaforma Ciak.io;
• supporto alla strutturazione del Corso e dell'Accademia Digitale;
• configurazione tecnica delle piattaforme utilizzate per la vendita e l'erogazione del Corso;
• creazione di funnel, automazioni, aree riservate e asset digitali;
• attività di copywriting e ottimizzazione commerciale;
• editing e adattamento dei contenuti;
• supporto alla preparazione del lancio;
• monitoraggio dei principali indicatori di performance;
• supporto strategico all'ottimizzazione del progetto durante la durata della Partnership.
Le attività vengono erogate attraverso il Programma Operativo Evolution PRO e mediante gli strumenti, le piattaforme e le procedure adottate da Evolution PRO.
Evolution PRO potrà modificare, aggiornare o sostituire strumenti, piattaforme, procedure operative o modalità di erogazione dei servizi, purché tali modifiche non comportino una riduzione sostanziale delle prestazioni oggetto della Partnership.
Il supporto successivo alla fase di lancio ha natura esclusivamente strategica e consulenziale e non comprende attività operative continuative, salvo diverso accordo scritto.
La corretta esecuzione del progetto presuppone la collaborazione attiva del Partner secondo quanto previsto dal presente Contratto, dal Programma Operativo e dalle richieste formulate nei canali ufficiali della Partnership.
L'eventuale mancata collaborazione del Partner esclude la responsabilità di Evolution PRO per ritardi, rallentamenti o risultati inferiori alle aspettative.
8.2 Obblighi del Partner
Il Partner si impegna a collaborare attivamente, continuativamente e in buona fede allo sviluppo del progetto, partecipando alle attività previste dal Programma Operativo Evolution PRO e applicando le indicazioni fornite nell'ambito del Metodo E.V.O.
Il Partner si impegna in particolare a:
• fornire tempestivamente informazioni, materiali e contenuti richiesti;
• partecipare alle attività di onboarding, allineamento e revisione previste dal Programma Operativo;
• utilizzare gli strumenti messi a disposizione da Evolution PRO, inclusa la piattaforma Ciak.io;
• approvare, revisionare o commentare i materiali sottoposti da Evolution PRO entro le tempistiche concordate;
• mantenere una comunicazione attiva attraverso i canali ufficiali della Partnership.
Il Partner è pienamente responsabile della qualità, della liceità, della correttezza e della veridicità dei contenuti forniti, nonché della gestione commerciale dei lead, dei clienti e delle opportunità generate, salvo diverso accordo scritto.
Il mancato rispetto reiterato delle tempistiche, la mancata consegna dei materiali necessari o l'assenza di collaborazione operativa potranno determinare la sospensione temporanea delle attività da parte di Evolution PRO senza che ciò comporti responsabilità o obblighi risarcitori a carico della stessa.
Il progetto si considera attivo esclusivamente in presenza di una collaborazione effettiva del Partner. Eventuali ritardi, rallentamenti o risultati inferiori alle aspettative derivanti da comportamenti imputabili al Partner non potranno essere considerati inadempimenti di Evolution PRO.
Il Partner si impegna inoltre a garantire un livello minimo di attivazione commerciale durante le fasi di lancio e post-lancio del progetto, comprendente almeno:
• pubblicazione dei contenuti previsti dal piano editoriale o dalle strategie concordate;
• gestione attiva e tempestiva dei lead generati;
• partecipazione alle attività di lancio previste dal Programma Operativo;
• confronto in buona fede con Evolution PRO in merito alle opportunità di crescita e promozione del progetto.
L'eventuale mancata attivazione commerciale, il mancato presidio dei lead o l'assenza di attività promozionale da parte del Partner escludono qualsiasi responsabilità di Evolution PRO in relazione ai risultati economici del progetto.
8.3 Esclusioni
Salvo diverso accordo scritto tra le Parti, non sono inclusi nella Partnership:
• la gestione operativa continuativa dei canali social;
• la gestione diretta delle campagne pubblicitarie;
• la chiusura delle vendite o attività commerciali svolte in nome e per conto del Partner;
• il customer care verso clienti finali del Partner;
• la produzione professionale di contenuti video, fotografici o multimediali;
• la creazione di contenuti ulteriori rispetto a quelli previsti dal Programma Operativo;
• servizi consulenziali, tecnici o operativi non espressamente previsti dal presente Contratto o dall'Allegato A – Programma Operativo.
Qualsiasi attività ulteriore potrà essere oggetto di separato accordo scritto tra le Parti.
8.4 Programma Operativo, Metodo E.V.O. e piattaforma Ciak.io
Il Metodo E.V.O. (Esamina – Valida – Ottimizza) costituisce framework proprietario, know-how riservato e asset strategico di Evolution PRO per la progettazione, il lancio e l'ottimizzazione di Accademie Digitali e prodotti formativi digitali.
Il Metodo viene erogato attraverso la piattaforma proprietaria Ciak.io e mediante il Programma Operativo allegato al presente Contratto come Allegato A, che ne costituisce parte integrante e sostanziale.
Il Partner si impegna a rispettare le attività, le tempistiche e le modalità operative previste dal Programma Operativo, collaborando in modo attivo, continuativo e in buona fede.
Qualora il Partner rimanga inattivo per oltre 60 (sessanta) giorni consecutivi senza giustificato motivo, Evolution PRO, previa comunicazione scritta, potrà dichiarare il progetto sospeso e interrompere temporaneamente le attività operative fino al ripristino delle condizioni necessarie alla prosecuzione del progetto.
La sospensione del progetto non comporta proroghe automatiche della durata contrattuale né diritto a rimborsi, riduzioni di corrispettivo o risarcimenti.
Evolution PRO potrà apportare aggiornamenti tecnici, organizzativi, didattici o funzionali al Programma Operativo, alla piattaforma Ciak.io e agli strumenti utilizzati per l'esecuzione della Partnership, purché tali modifiche non comportino una riduzione sostanziale delle prestazioni minime previste dal Contratto.
Evolution PRO potrà inoltre sostituire software, piattaforme, fornitori tecnologici o strumenti operativi con soluzioni equivalenti o migliorative qualora ciò sia necessario per esigenze tecniche, organizzative, normative o di evoluzione del servizio.
8.5 Servizi extra non inclusi nella Partnership
I servizi inclusi nella Partnership sono esclusivamente quelli previsti dal presente Contratto, dall'Articolo 8.1 e dall'Allegato A – Programma Operativo.
Durante la durata del Contratto, il Partner potrà richiedere l'attivazione di servizi aggiuntivi, opzionali e non inclusi nella Partnership, tra cui, a titolo esemplificativo e non esaustivo:
• sessioni strategiche individuali aggiuntive;
• servizi personalizzati basati su intelligenza artificiale;
• implementazioni avanzate sulla piattaforma Ciak.io;
• gestione operativa di funnel, automazioni e asset digitali;
• realizzazione o ottimizzazione di siti web, landing page o infrastrutture digitali aggiuntive;
• gestione operativa delle campagne pubblicitarie;
• programmi di crescita, accelerazione e ottimizzazione commerciale;
• ulteriori servizi professionali resi disponibili da Evolution PRO nel corso del rapporto.
I servizi extra saranno regolati da preventivo, ordine, offerta commerciale, listino prezzi o accordo scritto separato e potranno essere soggetti a condizioni economiche autonome rispetto alla Partnership.
L'eventuale acquisto, mancato acquisto, sospensione o cessazione dei servizi extra non modifica:
• la durata del presente Contratto;
• gli obblighi economici della Partnership;
• la royalty prevista dall'Articolo 5;
• le ulteriori obbligazioni assunte dalle Parti.
L'eventuale mancata attivazione di servizi extra non costituisce inadempimento di Evolution PRO né incide sull'esecuzione della Partnership.
I servizi extra eventualmente acquistati dal Partner restano disciplinati dalle relative condizioni economiche e contrattuali anche in caso di cessazione anticipata della Partnership, salvo diverso accordo scritto tra le Parti.
8.6 Clausola di buona fede, cooperazione e continuità operativa
Le Parti si impegnano a operare secondo principi di buona fede, correttezza, trasparenza e collaborazione reciproca per tutta la durata del presente Contratto.
Ciascuna Parte si impegna a:
• mantenere una comunicazione tempestiva e costruttiva;
• fornire le informazioni ragionevolmente necessarie all'esecuzione del progetto;
• evitare comportamenti idonei a ostacolare o rallentare inutilmente le attività previste dal Programma Operativo;
• segnalare tempestivamente eventuali criticità che possano incidere sull'esecuzione della Partnership.
Le Parti riconoscono che il successo del progetto presuppone una collaborazione continuativa e che eventuali ritardi, omissioni, indisponibilità prolungate o comportamenti non collaborativi possono compromettere il corretto svolgimento delle attività previste.
L'eventuale mancata cooperazione di una Parte sarà valutata ai fini dell'accertamento degli obblighi contrattuali e delle eventuali responsabilità derivanti dal presente Contratto.
ARTICOLO 9 – CLAUSOLA FISCALE
9.1 Dati societari di Evolution PRO
Evolution PRO LLC è una società estera regolarmente costituita nello Stato del Delaware (U.S.A.).
Dati societari:
• Ragione sociale: Evolution PRO LLC;
• Sede legale: 8 The Green, Ste A, Dover, DE 19901, Stati Uniti;
• File Number: 2394173 – Delaware Division of Corporations;
• EIN: 30-1375330;
• E-mail: assistenza@evolution-pro.it.
Evolution PRO LLC eroga i propri servizi attraverso infrastrutture digitali, piattaforme software e fornitori tecnologici internazionali utilizzati per l'esecuzione delle attività oggetto del presente Contratto.
Le coordinate di pagamento saranno comunicate da Evolution PRO al Partner tramite i canali ufficiali indicati nel presente Contratto.
9.2 Regime fiscale e documentazione
Evolution PRO LLC emette la propria documentazione fiscale secondo la normativa applicabile alla propria struttura societaria e fiscale.
Qualora previsto dalla normativa vigente, anche in funzione del Paese di stabilimento del Partner, troverà applicazione il meccanismo dell’inversione contabile, reverse charge, o ogni altro regime fiscale applicabile al momento dell’operazione.
Il Partner prende atto che il trattamento fiscale dell’operazione potrà dipendere dalla propria qualifica soggettiva, dal Paese di stabilimento, dalla normativa applicabile e dalle informazioni fiscali fornite a Evolution PRO.
9.3 Obblighi fiscali del Partner
Il presente Contratto è riservato esclusivamente a soggetti che operano nell'esercizio della propria attività professionale, imprenditoriale o autonoma e titolari di Partita IVA valida.
Il Partner dichiara e garantisce la correttezza, completezza e veridicità dei dati fiscali, anagrafici e amministrativi forniti a Evolution PRO.
Il Partner, in qualità di soggetto passivo d’imposta, si impegna a:
• comunicare dati fiscali corretti, aggiornati e completi;
• integrare la documentazione fiscale ricevuta con l’aliquota IVA prevista, se e in quanto dovuta;
• registrare la documentazione fiscale ricevuta nei registri contabili e fiscali applicabili;
• rispettare la normativa fiscale, contabile e previdenziale vigente nel proprio Paese di stabilimento;
• fornire, se richiesto per esigenze di compliance documentale, le sole informazioni strettamente necessarie a comprovare il corretto inquadramento fiscale dell’operazione.
Eventuali errori, omissioni, inesattezze o variazioni dei dati fiscali forniti dal Partner dovranno essere comunicati tempestivamente a Evolution PRO.
9.4 Autonomia fiscale delle Parti
Il Partner è l’unico responsabile della corretta gestione fiscale, contabile e previdenziale dei compensi percepiti, nonché del versamento di imposte, contributi e adempimenti connessi alla propria attività professionale, imprenditoriale o autonoma.
Evolution PRO resta responsabile della regolarità della documentazione fiscale emessa e delle operazioni di propria competenza, impegnandosi a emettere documentazione conforme alla normativa applicabile alla propria struttura fiscale.
Le Parti riconoscono espressamente che:
• il presente Contratto non costituisce rapporto di lavoro subordinato, agenzia, franchising, mandato con rappresentanza, associazione in partecipazione, società di fatto o joint venture societaria;
• ciascuna Parte opera in piena autonomia giuridica, fiscale, organizzativa e professionale;
• eventuali contestazioni fiscali, contributive, previdenziali o amministrative saranno gestite individualmente dalla Parte a cui si riferiscono, salvo il caso di dolo, colpa grave o corresponsabilità accertata.
9.5 Assenza di consulenza fiscale reciproca
Nessuna disposizione del presente Contratto potrà essere interpretata come consulenza fiscale, legale, tributaria, contabile o previdenziale resa da una Parte all’altra.
Ciascuna Parte dichiara di avvalersi, ove necessario, dei propri consulenti fiscali, legali o contabili per la corretta gestione dei propri obblighi.
ARTICOLO 10 – DATA PROCESSING AGREEMENT (DPA)
10.1 Parti e oggetto
Ai fini della normativa applicabile in materia di protezione dei dati personali:
• il Partner agisce, di regola, in qualità di Titolare del trattamento dei dati personali dei propri clienti, lead e utenti;
• Evolution PRO LLC agisce, di regola, in qualità di Responsabile del trattamento limitatamente ai dati trattati per l'erogazione dei servizi previsti dal presente Contratto.
Resta inteso che Evolution PRO potrà agire quale autonomo Titolare del trattamento per i dati trattati per finalità amministrative, fiscali, contabili, contrattuali, di sicurezza informatica, tutela legale o gestione del rapporto commerciale con il Partner.
Con il presente accordo il Partner affida a Evolution PRO i trattamenti di dati personali strettamente necessari all'esecuzione dei servizi oggetto della Partnership.
Il presente DPA entra in vigore alla data di sottoscrizione del Contratto e cessa con la restituzione, cancellazione o anonimizzazione dei dati personali trattati, fatti salvi gli obblighi di conservazione previsti dalla normativa applicabile.
10.2 Finalità del trattamento, tipologie di dati e categorie di interessati
Le attività di trattamento potranno essere svolte per le seguenti finalità:
• gestione del Corso e dell'Accademia Digitale;
• gestione dei funnel di vendita e delle automazioni;
• attività di marketing e comunicazione;
• analisi delle performance;
• assistenza tecnica e operativa;
• utilizzo della piattaforma Ciak.io;
• applicazione del Metodo E.V.O.;
• gestione amministrativa e contrattuale del rapporto.
Le tipologie di dati trattati potranno comprendere:
• dati identificativi (nome, cognome, email, telefono);
• dati fiscali e amministrativi;
• dati relativi agli ordini e ai pagamenti;
• dati di accesso e autenticazione;
• dati di utilizzo della piattaforma;
• log tecnici e di sistema;
• dati di navigazione;
• statistiche di utilizzo;
• dati relativi all'interazione con strumenti automatizzati e sistemi AI utilizzati nell'ambito della Partnership.
Le categorie di interessati potranno comprendere:
• clienti del Partner;
• lead e potenziali clienti;
• utenti registrati;
• collaboratori del Partner;
• il Partner stesso.
10.3 Obblighi del Responsabile del trattamento
Evolution PRO si impegna a:
• trattare i dati personali esclusivamente nei limiti necessari all'esecuzione del Contratto e secondo le istruzioni documentate del Partner;
• garantire che le persone autorizzate al trattamento siano vincolate da obblighi di riservatezza;
• adottare misure tecniche e organizzative adeguate alla protezione dei dati personali;
• assistere il Partner, nei limiti ragionevoli e proporzionati, nell'adempimento degli obblighi previsti dalla normativa applicabile;
• notificare eventuali violazioni dei dati personali senza ingiustificato ritardo e comunque entro 48 ore dalla loro scoperta, nei limiti richiesti dalla normativa applicabile;
• collaborare con il Partner nella gestione delle richieste degli interessati;
• cancellare, restituire o anonimizzare i dati al termine del rapporto, salvo obblighi di conservazione previsti dalla legge.
Il Partner potrà richiedere verifiche documentali ragionevoli in merito alle misure di sicurezza adottate da Evolution PRO.
Tali verifiche non potranno comportare accesso a:
• dati di altri clienti;
• codice sorgente;
• workflow proprietari;
• agenti AI;
• prompt;
• Metodo E.V.O.;
• piattaforma Ciak.io;
• infrastrutture condivise o asset proprietari di Evolution PRO.
10.4 Sub-responsabili e fornitori tecnologici
Evolution PRO è autorizzata ad avvalersi di fornitori tecnologici, sub-responsabili e servizi terzi necessari all'esecuzione del Contratto.
A titolo esemplificativo:
• piattaforme cloud;
• sistemi di pagamento;
• servizi email;
• sistemi CRM;
• piattaforme di marketing;
• strumenti di intelligenza artificiale;
• piattaforme di automazione;
• sistemi di hosting e archiviazione dati.
Evolution PRO manterrà un elenco aggiornato dei principali fornitori utilizzati e lo renderà disponibile al Partner su richiesta.
Evolution PRO potrà aggiornare o sostituire tali fornitori senza necessità di modifica contrattuale, purché siano adottate garanzie adeguate ai sensi della normativa applicabile.
10.5 Trasferimenti internazionali di dati
Qualora, per esigenze operative o tecnologiche, i dati personali siano trasferiti verso Paesi situati al di fuori dello Spazio Economico Europeo, Evolution PRO adotterà le misure richieste dalla normativa applicabile.
Tali misure potranno includere:
• decisioni di adeguatezza;
• clausole contrattuali standard (SCC);
• strumenti equivalenti previsti dalla normativa vigente;
• ulteriori misure tecniche e organizzative ritenute appropriate.
10.6 Responsabilità delle Parti
Ciascuna Parte risponde dei danni derivanti da trattamenti effettuati in violazione della normativa applicabile o delle istruzioni legittimamente impartite.
Salvo il caso di dolo, colpa grave o responsabilità inderogabili previste dalla legge, la responsabilità complessiva di Evolution PRO derivante dalle attività svolte in qualità di Responsabile del trattamento non potrà eccedere l'importo complessivamente corrisposto dal Partner ai sensi del presente Contratto.
In nessun caso Evolution PRO sarà responsabile per:
• perdita di profitto;
• perdita di opportunità commerciali;
• danni indiretti o consequenziali;
• trattamenti effettuati autonomamente dal Partner;
• malfunzionamenti imputabili a fornitori tecnologici terzi.
10.7 Utilizzo di strumenti automatizzati e Intelligenza Artificiale
Il Partner prende atto che Evolution PRO può utilizzare strumenti automatizzati, sistemi di intelligenza artificiale, workflow digitali e piattaforme software per l'erogazione dei servizi previsti dal presente Contratto.
Tali strumenti vengono utilizzati come supporto operativo e organizzativo alle attività della Partnership.
Evolution PRO si impegna ad adottare misure ragionevoli per garantire la sicurezza, la protezione e la riservatezza dei dati trattati attraverso tali sistemi.
L'utilizzo di strumenti AI non comporta alcun trasferimento di proprietà intellettuale, know-how, workflow, prompt o asset proprietari di Evolution PRO al Partner.
ARTICOLO 11 – CLAUSOLA DI SALVAGUARDIA, INTERO ACCORDO E PREVALENZA DELLE CONDIZIONI CONTRATTUALI
11.1 Intero accordo tra le Parti
Il presente Contratto, unitamente ai relativi allegati e documenti espressamente richiamati, costituisce l'intero accordo tra le Parti in relazione all'oggetto della Partnership e sostituisce integralmente ogni precedente proposta, trattativa, intesa, accordo, comunicazione o dichiarazione, sia scritta che verbale, intercorsa tra le Parti sul medesimo oggetto.
Restano esclusi dal presente Contratto eventuali servizi, attività o prestazioni non espressamente previsti o successivamente disciplinati mediante accordo scritto separato.
11.2 Prevalenza delle condizioni economiche e operative
Le condizioni economiche, la durata della Partnership, il Programma Operativo, il Metodo E.V.O., le modalità di pagamento e le clausole relative alla proprietà intellettuale costituiscono elementi essenziali dell'accordo.
Eventuali modifiche o aggiornamenti potranno essere concordati esclusivamente mediante accordo scritto sottoscritto da entrambe le Parti.
In caso di contrasto tra comunicazioni operative, materiali informativi, contenuti promozionali o altri documenti non contrattuali e il presente Contratto, prevarrà quest'ultimo.
11.3 Modifiche contrattuali
Qualsiasi modifica, integrazione, rinuncia, deroga o accordo aggiuntivo relativo al presente Contratto dovrà risultare da atto scritto sottoscritto da entrambe le Parti.
Le comunicazioni operative, le indicazioni fornite tramite Ciak.io, e-mail, Telegram o altri strumenti utilizzati nell'ambito della Partnership non costituiscono modifica contrattuale, salvo espressa dichiarazione scritta delle Parti.
11.4 Nullità parziale e conservazione del Contratto
L'eventuale nullità, inefficacia, annullabilità o invalidità di una o più disposizioni del presente Contratto non comporterà la nullità o inefficacia dell'intero accordo.
Le restanti disposizioni continueranno a produrre pienamente i propri effetti.
Le Parti si impegnano a sostituire la disposizione eventualmente invalida con una nuova clausola valida che realizzi, per quanto possibile, la medesima finalità economica e giuridica perseguita dalla disposizione originaria.
11.5 Versione prevalente e formato elettronico
Il presente Contratto può essere sottoscritto in formato cartaceo o elettronico.
In caso di pluralità di versioni linguistiche, traduzioni o copie del Contratto, farà fede esclusivamente la versione in lingua italiana.
Le Parti riconoscono piena validità probatoria ai documenti informatici, alle firme elettroniche, alle firme digitali e ai sistemi di sottoscrizione elettronica utilizzati per la conclusione del presente Contratto, nei limiti consentiti dalla normativa applicabile.
11.6 Interpretazione del Contratto
Il presente Contratto dovrà essere interpretato secondo criteri di buona fede, correttezza, equilibrio contrattuale e ragionevolezza commerciale.
Le Parti riconoscono che il Contratto disciplina una Partnership professionale tra soggetti economicamente indipendenti e che nessuna clausola dovrà essere interpretata in modo da alterare la natura autonoma del rapporto.
Eventuali dubbi interpretativi saranno risolti privilegiando un'interpretazione coerente con la finalità economica complessiva della Partnership, con il Programma Operativo e con il Metodo E.V.O.
11.7 Sopravvivenza delle clausole
La cessazione, risoluzione o scadenza del presente Contratto non pregiudica l'efficacia delle disposizioni che, per loro natura o per espressa previsione contrattuale, sono destinate a sopravvivere alla cessazione del rapporto.
A titolo esemplificativo restano efficaci anche successivamente alla cessazione del Contratto:
• le clausole relative ai corrispettivi maturati e non corrisposti;
• gli obblighi di riservatezza;
• le disposizioni in materia di proprietà intellettuale;
• le limitazioni di responsabilità;
• le disposizioni in materia di protezione dei dati personali;
• le clausole relative alla risoluzione delle controversie;
• ogni altra disposizione destinata a produrre effetti successivamente alla cessazione del rapporto.
ARTICOLO 12 – TUTELA DEL BRAND, DEGLI ASSET PROPRIETARI E DEL KNOW-HOW
12.1 Proprietà degli asset proprietari
Il Partner riconosce che costituiscono proprietà esclusiva di Evolution PRO:
• il marchio Evolution PRO;
• il marchio Ciak.io;
• il Metodo E.V.O.;
• i loghi, naming, domini internet e segni distintivi;
• i funnel, template, workflow e framework operativi;
• gli agenti AI, i prompt, le automazioni e le procedure proprietarie;
• le metodologie commerciali, di marketing e di lancio;
• la documentazione interna;
• i contenuti formativi sviluppati da Evolution PRO;
• ogni ulteriore asset proprietario sviluppato o utilizzato nell'ambito della Partnership.
Tali elementi sono protetti dalle normative applicabili in materia di proprietà intellettuale, diritto d'autore, concorrenza sleale, segreti commerciali e know-how riservato.
Il Partner non potrà copiarli, riprodurli, divulgarli, distribuirli, modificarli o utilizzarli senza preventiva autorizzazione scritta di Evolution PRO.
12.2 Obblighi alla cessazione del Contratto
Alla cessazione del Contratto, per qualsiasi causa intervenuta, il Partner si impegna a:
• cessare immediatamente qualsiasi utilizzo del marchio Evolution PRO e del marchio Ciak.io;
• non qualificarsi come collaboratore, partner, affiliato o rappresentante di Evolution PRO;
• rimuovere dai propri canali ogni riferimento commerciale idoneo a generare confusione circa l'esistenza di rapporti in corso con Evolution PRO;
• non utilizzare, diffondere o commercializzare materiali proprietari di Evolution PRO;
• non riutilizzare funnel, workflow, template, procedure, prompt, automazioni, framework o altri asset proprietari in forma identica o sostanzialmente equivalente.
Restano consentiti esclusivamente riferimenti curricolari veritieri all'esperienza professionale svolta durante la Partnership.
12.3 Durata della tutela
Gli obblighi relativi al marchio, ai segni distintivi, alla proprietà intellettuale e agli asset proprietari di Evolution PRO resteranno efficaci anche successivamente alla cessazione del Contratto.
Per il know-how, il Metodo E.V.O., la piattaforma Ciak.io, i workflow, i prompt, gli agenti AI, le procedure operative e gli altri asset proprietari di Evolution PRO, gli obblighi di non utilizzo, non divulgazione e non riproduzione resteranno efficaci per un periodo di cinque (5) anni dalla cessazione del rapporto.
Restano impregiudicati gli obblighi di riservatezza previsti dall'Articolo 6, ove applicabili per un periodo superiore.
12.4 Divieto di concorrenza sleale e sfruttamento parassitario
È fatto divieto al Partner di porre in essere comportamenti idonei a:
• generare confusione circa l'origine imprenditoriale dei servizi;
• sfruttare indebitamente la reputazione commerciale di Evolution PRO;
• replicare in modo riconoscibile il Metodo E.V.O., la struttura operativa di Ciak.io o gli asset proprietari sviluppati da Evolution PRO;
• appropriarsi dei risultati dell'attività organizzativa, commerciale o strategica di Evolution PRO.
Resta espressamente esclusa qualsiasi limitazione all'utilizzo delle competenze professionali generali, delle esperienze maturate e delle conoscenze personali del Partner, purché non vengano riprodotti o imitati in modo riconoscibile gli asset proprietari di Evolution PRO.
12.5 Penale
In caso di violazione grave e documentata delle disposizioni del presente Articolo, il Partner sarà tenuto a corrispondere a Evolution PRO una penale pari a Euro 5.000,00 (cinquemila/00) per ciascuna violazione autonoma accertata.
Non costituiscono violazioni autonome la pluralità di atti meramente esecutivi del medesimo comportamento illecito.
Resta in ogni caso salvo il diritto di Evolution PRO di richiedere il risarcimento dell'eventuale maggior danno subito.
12.6 Clausola di equilibrio e proporzionalità
Le Parti riconoscono che le limitazioni previste dal presente Articolo sono necessarie e proporzionate alla tutela:
• del know-how;
• degli investimenti sostenuti da Evolution PRO;
• degli asset proprietari;
• della reputazione commerciale;
• del Metodo E.V.O.;
• della piattaforma Ciak.io.
Le presenti disposizioni non hanno finalità anticoncorrenziali e non limitano indebitamente la libertà professionale del Partner, il quale resta libero di esercitare la propria attività professionale, imprenditoriale o formativa attraverso modelli, strumenti e procedure autonomamente sviluppati.
12.7 Divieto di replica del sistema
Il Partner riconosce che il Metodo E.V.O., la piattaforma Ciak.io, i workflow operativi, gli agenti AI, i prompt e le procedure sviluppate da Evolution PRO costituiscono asset proprietari e know-how riservato.
Per un periodo di cinque (5) anni dalla cessazione del Contratto, il Partner si impegna a non sviluppare, commercializzare o mettere a disposizione di terzi sistemi sostanzialmente derivati o riconoscibilmente basati sugli asset proprietari di Evolution PRO ottenuti durante la Partnership.
Resta salvo il diritto del Partner di utilizzare le proprie competenze professionali generali e le conoscenze non riservate maturate nel corso della collaborazione.
ARTICOLO 13 – COMUNICAZIONI E NOTIFICHE
13.1 Canali di comunicazione
Le Parti riconoscono che il presente rapporto viene gestito prevalentemente attraverso strumenti digitali.
Le comunicazioni relative all'esecuzione ordinaria della Partnership potranno avvenire mediante:
• piattaforma Ciak.io;
• e-mail;
• gruppo Telegram ufficiale del progetto;
• sistemi di ticketing o assistenza eventualmente utilizzati da Evolution PRO;
• ulteriori strumenti digitali comunicati da Evolution PRO nel corso del rapporto.
Le comunicazioni operative effettuate attraverso tali strumenti costituiscono prova dell'attività svolta e delle richieste formulate nell'ambito della Partnership.
13.2 Comunicazioni formali
Le comunicazioni aventi rilevanza legale o contrattuale, incluse a titolo esemplificativo:
• diffide;
• contestazioni formali;
• richieste di risoluzione;
• richieste di pagamento;
• modifiche contrattuali;
• comunicazioni relative a inadempimenti;
dovranno essere effettuate mediante:
• Posta Elettronica Certificata (PEC);
• raccomandata con avviso di ricevimento;
• sistemi di firma elettronica o piattaforme di sottoscrizione digitale che consentano l'identificazione delle Parti e la tracciabilità delle comunicazioni.
13.3 Validità delle comunicazioni
Le comunicazioni trasmesse tramite PEC si considerano ricevute alla data risultante dalla ricevuta di avvenuta consegna.
Le comunicazioni inviate mediante raccomandata si considerano ricevute alla data risultante dall'avviso di ricevimento o dal rifiuto di ricezione.
Le comunicazioni effettuate tramite piattaforme di firma elettronica o sistemi digitali certificati si considerano ricevute alla data risultante dai relativi log o sistemi di tracciamento.
Le comunicazioni operative inviate tramite e-mail, Ciak.io o Telegram si considerano valide ai fini della gestione ordinaria del progetto quando risultino ragionevolmente accessibili al destinatario.
13.4 Recapiti ufficiali
Ciascuna Parte si impegna a mantenere aggiornati i propri recapiti di contatto, inclusi:
• indirizzo PEC;
• indirizzo e-mail;
• numero di telefono;
• eventuale domicilio o sede legale.
Ogni variazione dovrà essere comunicata all'altra Parte entro 15 (quindici) giorni lavorativi.
In mancanza di aggiornamento, tutte le comunicazioni effettuate ai recapiti precedentemente comunicati si considereranno validamente eseguite.
13.5 Valore probatorio delle comunicazioni digitali
Le Parti riconoscono espressamente che:
• i log di accesso a Ciak.io;
• le attività registrate sulla piattaforma;
• le comunicazioni effettuate tramite i canali ufficiali della Partnership;
• le conferme di consegna e lettura;
• i sistemi di ticketing e supporto;
costituiscono elementi di prova utilizzabili ai fini dell'accertamento delle attività svolte, delle richieste formulate, delle approvazioni ricevute e dello stato di avanzamento del progetto.
13.6 Firma elettronica e documenti digitali
Le Parti riconoscono piena validità giuridica ai documenti informatici, alle firme elettroniche, alle firme digitali e ai sistemi di sottoscrizione elettronica utilizzati nell'ambito del presente Contratto, nei limiti consentiti dalla normativa applicabile.
Le copie elettroniche del Contratto e dei relativi allegati hanno il medesimo valore probatorio dell'originale.
ARTICOLO 14 – LEGGE APPLICABILE E RISOLUZIONE DELLE CONTROVERSIE
14.1 Legge applicabile
Il presente Contratto è regolato, interpretato ed eseguito in conformità alla legge italiana, indipendentemente dal luogo di residenza, domicilio, sede legale o sede operativa delle Parti.
14.2 Tentativo di composizione amichevole
In caso di controversia derivante dal presente Contratto o comunque ad esso collegata, le Parti si impegnano preliminarmente a tentare una soluzione bonaria mediante confronto diretto e in buona fede.
La Parte che intende sollevare una contestazione dovrà comunicarla per iscritto all'altra Parte, indicando in modo sufficientemente dettagliato i fatti contestati e le richieste formulate.
Le Parti si impegnano a confrontarsi entro 30 (trenta) giorni dalla ricezione della comunicazione.
14.3 Mediazione preventiva obbligatoria
Qualora il tentativo di composizione amichevole non abbia esito positivo, le Parti si impegnano a esperire un tentativo di mediazione presso un organismo di mediazione avente sede nel Comune di Torino o comunque individuato di comune accordo.
La mediazione costituisce condizione preliminare rispetto all'eventuale instaurazione di un procedimento giudiziario, salvo i casi urgenti previsti dalla legge.
14.4 Foro competente esclusivo
Solo in caso di esito negativo della procedura di mediazione di cui all'Articolo 14.3, ogni controversia relativa alla validità, interpretazione, esecuzione, risoluzione o cessazione del presente Contratto sarà devoluta alla competenza esclusiva del Foro di Torino (Italia), con esclusione di qualsiasi altro foro concorrente o alternativo consentito dalla legge.
14.5 Conservazione del Contratto
L'eventuale nullità, annullabilità, inefficacia o invalidità di una o più disposizioni del presente Contratto non comporterà la nullità dell'intero accordo.
Le restanti disposizioni continueranno a produrre pienamente i propri effetti.
Le Parti si impegnano a sostituire l'eventuale clausola invalida con una disposizione valida che realizzi, per quanto possibile, la medesima finalità economica e giuridica perseguita dalla clausola originaria.
ARTICOLO 15 – DISPOSIZIONI FINALI
15.1 Entrata in vigore
Il presente Contratto entra in vigore alla data della sua sottoscrizione da parte di entrambe le Parti e produce effetti immediati.
La durata, le condizioni economiche e gli obblighi reciproci decorrono dalla medesima data, salvo diverso accordo scritto.
15.2 Modalità di sottoscrizione
Il Contratto può essere sottoscritto:
• mediante firma digitale;
• mediante firma elettronica avanzata;
• mediante piattaforme di firma elettronica riconosciute;
• mediante sottoscrizione autografa.
Tutte le modalità sopra indicate producono pieno valore legale e probatorio nei limiti consentiti dalla normativa applicabile.
15.3 Valore probatorio dei documenti digitali
Le Parti riconoscono piena validità probatoria:
• al Contratto sottoscritto elettronicamente;
• ai documenti informatici;
• ai log della piattaforma Ciak.io;
• ai sistemi di firma elettronica utilizzati;
• alle registrazioni delle attività svolte nell'ambito della Partnership.
Le copie elettroniche costituiscono documento originale ai fini probatori.
15.4 Dichiarazione di lettura e consapevolezza
Il Partner dichiara:
• di aver letto integralmente il presente Contratto;
• di aver ricevuto copia del Contratto e dei relativi allegati;
• di aver preso visione del Programma Operativo;
• di aver compreso il funzionamento della Partnership, del Metodo E.V.O. e della piattaforma Ciak.io;
• di essere consapevole che il successo del progetto richiede una propria partecipazione attiva e continuativa;
• di possedere le risorse organizzative minime necessarie per prendere parte al Programma Operativo.
Il Partner riconosce che eventuali difficoltà personali, professionali, organizzative o commerciali non costituiscono automaticamente motivo di sospensione, proroga, revisione economica o scioglimento del Contratto, salvo diverso accordo scritto o diversa previsione di legge.
15.5 Approvazione specifica delle clausole
Ai sensi e per gli effetti degli articoli 1341 e 1342 del Codice Civile italiano, il Partner dichiara di approvare specificamente le seguenti clausole:
• Articolo 1.4 (Esclusiva);
• Articolo 2.6 (Recesso di Evolution PRO);
• Articolo 2.7 (Risoluzione per inadempimento);
• Articolo 3.3 (Sospensione e risoluzione per inattività);
• Articolo 5.3 (Decadenza del beneficio della dilazione);
• Articolo 5.5 e 5.6 (Royalty e Revenue Share);
• Articolo 5.7 (Natura non rimborsabile del corrispettivo);
• Articolo 6.5 (Penale per violazione della riservatezza);
• Articolo 7.6 (Limitazioni di responsabilità);
• Articolo 10.6 (Limitazione di responsabilità in materia di trattamento dati);
• Articolo 12 (Tutela del brand, know-how e asset proprietari);
• Articolo 12.5 (Penale);
• Articolo 14.3 (Mediazione preventiva);
• Articolo 14.4 (Foro competente esclusivo di Torino).
15.6 Chiusura del Contratto
Le Parti dichiarano che il presente Contratto è stato liberamente negoziato, compreso e accettato in ogni sua parte.
Ciascuna Parte conferma di aver avuto la possibilità di richiedere chiarimenti, consulenza professionale e ogni informazione ritenuta necessaria prima della sottoscrizione del presente accordo.
ARTICOLO 16 – ACCETTAZIONE CONSAPEVOLE DEL MODELLO DI PARTNERSHIP
16.1 Comprensione del modello
Il Partner dichiara di aver compreso e accettato che il presente Contratto disciplina una Partnership professionale basata sulla collaborazione attiva tra le Parti e non l'acquisto di un servizio "chiavi in mano" o di una prestazione garantita di risultato.
16.2 Natura della prestazione
Il Partner riconosce che:
• Evolution PRO assume un'obbligazione di mezzi e non di risultato;
• Evolution PRO non garantisce livelli minimi di fatturato, vendite, conversioni, acquisizione clienti o ritorno economico;
• il successo del progetto dipende da molteplici fattori esterni al controllo di Evolution PRO, inclusi il mercato, il posizionamento, la qualità dei contenuti, l'attività commerciale svolta dal Partner, la concorrenza, il budget promozionale e le condizioni economiche generali.
16.3 Valore del corrispettivo
Il Partner riconosce che il corrispettivo previsto dal presente Contratto remunera:
• l'accesso al Metodo E.V.O.;
• l'accesso alla piattaforma Ciak.io;
• il know-how di Evolution PRO;
• le attività strategiche, tecniche e operative svolte nell'ambito della Partnership;
• l'allocazione delle risorse organizzative necessarie allo sviluppo del progetto.
Tale corrispettivo non è subordinato al raggiungimento di specifici risultati economici o commerciali.
16.4 Collaborazione essenziale del Partner
Il Partner riconosce che la propria collaborazione attiva costituisce elemento essenziale del presente Contratto e che il mancato coinvolgimento nelle attività previste dal Programma Operativo può compromettere o impedire il corretto sviluppo del progetto.
16.5 Assenza di affidamento su promesse di risultato
Il Partner dichiara di non aver basato la propria decisione di aderire alla Partnership su promesse, garanzie o aspettative di risultati economici certi.
Il Partner conferma che la decisione di sottoscrivere il presente Contratto è stata assunta in modo autonomo e consapevole, sulla base delle informazioni ricevute e della propria valutazione imprenditoriale e professionale.
16.6 Conferma finale
Le Parti confermano di aver letto integralmente il presente Contratto, di averne compreso il contenuto e di accettarne tutte le disposizioni.
Il Partner dichiara di aver avuto la possibilità di richiedere chiarimenti, approfondimenti e consulenze professionali prima della sottoscrizione del presente accordo.
"""


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/sign")
async def sign_contract(request: ContractSignRequest, req: Request):
    """
    Firma digitale del contratto di partnership.
    
    - Salva la firma nel documento partner
    - Genera PDF del contratto firmato
    - Invia email di conferma al partner
    """
    try:
        # Verifica partner esistente
        partner = await db.partners.find_one({"id": request.partner_id})
        if not partner:
            raise HTTPException(status_code=404, detail="Partner non trovato")
        
        # Verifica se già firmato
        contract_field = partner.get("contract", {})
        if isinstance(contract_field, dict) and contract_field.get("signed_at"):
            return {
                "success": True,
                "message": "Contratto già firmato",
                "signed_at": contract_field["signed_at"]
            }
        
        # Estrai informazioni client
        client_ip = req.client.host if req.client else "unknown"
        user_agent = req.headers.get("user-agent", "unknown")
        
        now = datetime.now(timezone.utc)
        
        # Prepara dati contratto
        contract_data = {
            "version": request.contract_version,
            "signed_at": now.isoformat(),
            "signature_base64": request.signature_base64,
            "ip_address": client_ip,
            "user_agent": user_agent,
            "clausole_vessatorie_approved": request.clausole_vessatorie_approved
        }
        
        # Aggiorna partner con dati contratto
        await db.partners.update_one(
            {"id": request.partner_id},
            {"$set": {
                "contract": contract_data,
                "contract_signed": True,
                "contract_signed_at": now.isoformat(),
                "updated_at": now.isoformat()
            }}
        )
        
        # Genera PDF del contratto
        pdf_url = None
        try:
            pdf_url = await generate_contract_pdf(partner, contract_data)
        except Exception as e:
            logger.error(f"Errore generazione PDF: {e}")
        
        # Invia email di conferma
        try:
            await send_contract_email(partner, pdf_url)
        except Exception as e:
            logger.error(f"Errore invio email: {e}")
        
        # Log evento
        await db.contract_events.insert_one({
            "partner_id": request.partner_id,
            "partner_name": partner.get("name", ""),
            "event": "contract_signed",
            "contract_version": request.contract_version,
            "ip_address": client_ip,
            "timestamp": now.isoformat()
        })
        
        logger.info(f"[CONTRACT] Contratto firmato da {partner.get('name', '')} ({request.partner_id})")
        
        return {
            "success": True,
            "message": "Contratto firmato con successo",
            "signed_at": now.isoformat(),
            "pdf_url": pdf_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CONTRACT] Errore firma: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{partner_id}")
async def get_contract_status(partner_id: str):
    """
    Verifica stato firma contratto per un partner.
    """
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "contract": 1})
    
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    contract = partner.get("contract", {})
    
    # Handle case where contract is not a dict
    if not isinstance(contract, dict):
        contract = {}
    
    return {
        "signed": bool(contract.get("signed_at")),
        "signed_at": contract.get("signed_at"),
        "contract_version": contract.get("version")
    }


@router.get("/pdf/{partner_id}")
async def get_contract_pdf(partner_id: str, force: bool = False):
    """
    Restituisce l'URL del PDF del contratto firmato.
    Se non esiste, lo rigenera.
    """
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    contract = partner.get("contract", {})
    if not isinstance(contract, dict) or not contract.get("signed_at"):
        raise HTTPException(status_code=400, detail="Contratto non ancora firmato")
    
    # Controlla se il PDF è già in MongoDB
    existing = await db.contract_pdfs.find_one({"partner_id": str(partner_id)}, {"_id": 0, "partner_id": 1})
    if existing and not force:
        return {"success": True, "pdf_url": f"/api/contract/pdf-download/{partner_id}"}
    
    # Rigenera il PDF
    try:
        pdf_url = await generate_contract_pdf(partner, contract)
        if pdf_url:
            return {"success": True, "pdf_url": pdf_url}
    except Exception as e:
        logger.error(f"[CONTRACT] Errore rigenerazione PDF: {e}")
    
    raise HTTPException(status_code=500, detail="Impossibile generare il PDF")


@router.get("/pdf-download/{partner_id}")
async def download_contract_pdf(partner_id: str):
    """Serve il PDF del contratto direttamente dal database."""
    from fastapi.responses import Response
    
    doc = await db.contract_pdfs.find_one({"partner_id": str(partner_id)}, {"_id": 0})
    if not doc or not doc.get("pdf_base64"):
        raise HTTPException(status_code=404, detail="PDF non trovato")
    
    pdf_bytes = base64.b64decode(doc["pdf_base64"])
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "name": 1})
    partner_name = (partner.get("name", "partner") if partner else "partner").replace(" ", "_")
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="contratto_evolution_pro_{partner_name}.pdf"'
        }
    )




@router.get("/text/{partner_id}")
async def get_contract_text(partner_id: str):
    """
    Restituisce il testo del contratto con parametri personalizzati per il partner.
    Se esiste un PDF custom caricato dall'admin, restituisce anche custom_pdf_url.
    """
    # Param unificati: corrispettivo/rate + dati anagrafici del partner da
    # contract_partner_data (stessa fonte usata per il PDF finale).
    params = await _get_partner_params(partner_id)

    # Controlla se esiste un PDF custom per questo partner
    custom = await db.contract_custom_pdf.find_one({"partner_id": partner_id}, {"_id": 0})
    custom_pdf_url = custom.get("pdf_url") if custom else None

    contract_text = render_contract_text(params)
    # Non esporre i dati personali grezzi (es. IBAN/PEC) nel JSON dei params
    params_safe = {k: v for k, v in params.items() if k != "personal_data"}
    return {
        "contract_text": contract_text,
        "params": params_safe,
        "custom_pdf_url": custom_pdf_url
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CUSTOM PDF ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/custom-pdf/{partner_id}")
async def get_custom_pdf(partner_id: str):
    """Recupera URL PDF custom caricato dall'admin per questo partner."""
    record = await db.contract_custom_pdf.find_one({"partner_id": partner_id}, {"_id": 0})
    if not record:
        return {"custom_pdf_url": None, "filename": None, "uploaded_at": None}
    return {
        "custom_pdf_url": record.get("pdf_url"),
        "filename": record.get("filename"),
        "uploaded_at": record.get("uploaded_at")
    }


@router.post("/custom-pdf/{partner_id}")
async def upload_custom_pdf(partner_id: str, request: Request):
    """
    Carica un PDF custom per questo partner (sostituisce contratto generato).
    Multipart: campo 'file' (PDF).
    """
    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
            api_key=os.environ.get('CLOUDINARY_API_KEY', ''),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET', '')
        )

        form = await request.form()
        file = form.get("file")
        if not file:
            raise HTTPException(status_code=400, detail="Campo 'file' mancante")

        content = await file.read()
        filename = getattr(file, "filename", f"contratto_{partner_id}.pdf")

        result = cloudinary.uploader.upload(
            content,
            resource_type="raw",
            public_id=f"contract_custom_{partner_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            folder="evolution_pro/contracts_custom",
            overwrite=True,
            use_filename=False
        )

        pdf_url = result.get("secure_url")

        await db.contract_custom_pdf.update_one(
            {"partner_id": partner_id},
            {"$set": {
                "partner_id": partner_id,
                "pdf_url": pdf_url,
                "filename": filename,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "cloudinary_public_id": result.get("public_id")
            }},
            upsert=True
        )

        return {"success": True, "custom_pdf_url": pdf_url, "filename": filename}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore upload PDF custom: {e}")
        raise HTTPException(status_code=500, detail=f"Errore upload: {str(e)}")


@router.delete("/custom-pdf/{partner_id}")
async def delete_custom_pdf(partner_id: str):
    """Rimuove il PDF custom — il partner tornerà al contratto generato standard."""
    record = await db.contract_custom_pdf.find_one({"partner_id": partner_id})
    if not record:
        return {"success": True, "message": "Nessun PDF custom trovato"}

    # Rimuovi da Cloudinary se possibile
    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
            api_key=os.environ.get('CLOUDINARY_API_KEY', ''),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET', '')
        )
        public_id = record.get("cloudinary_public_id")
        if public_id:
            cloudinary.uploader.destroy(public_id, resource_type="raw")
    except Exception as e:
        logger.warning(f"Cloudinary delete warning: {e}")

    await db.contract_custom_pdf.delete_one({"partner_id": partner_id})
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS - Personalizzazione Contratto
# ═══════════════════════════════════════════════════════════════════════════════

admin_router = APIRouter(prefix="/api/admin/partners", tags=["admin-contract"])


@admin_router.get("/{partner_id}/contract-params")
async def get_contract_params(partner_id: str):
    """
    Restituisce i parametri contrattuali personalizzati per un partner.
    """
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "contract_params": 1, "name": 1, "contract": 1})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    params = DEFAULT_CONTRACT_PARAMS.copy()
    if partner.get("contract_params"):
        params.update({k: v for k, v in partner["contract_params"].items() if v is not None})
    
    return {
        "partner_name": partner.get("name", ""),
        "contract_signed": bool(partner.get("contract", {}).get("signed_at")) if isinstance(partner.get("contract"), dict) else False,
        "params": params,
        "is_customized": bool(partner.get("contract_params"))
    }


@admin_router.patch("/{partner_id}/contract-params")
async def update_contract_params(partner_id: str, body: ContractParamsUpdate):
    """
    Aggiorna i parametri contrattuali per un partner specifico.
    Solo l'admin può farlo, e solo prima della firma.
    """
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "contract": 1, "name": 1})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    # Check if contract is already signed
    contract = partner.get("contract", {})
    if isinstance(contract, dict) and contract.get("signed_at"):
        raise HTTPException(status_code=400, detail="Contratto già firmato. Non è possibile modificare i parametri.")
    
    # Build update dict (only non-None fields)
    update_data = {k: v for k, v in body.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun parametro da aggiornare")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.partners.update_one(
        {"id": partner_id},
        {
            "$set": {
                **{f"contract_params.{k}": v for k, v in update_data.items()},
                "contract_params.updated_at": now
            }
        }
    )
    
    logger.info(f"[CONTRACT] Parametri contratto aggiornati per {partner.get('name', '')} ({partner_id}): {update_data}")
    
    # Return updated params with rendered text preview
    updated_partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "contract_params": 1})
    params = DEFAULT_CONTRACT_PARAMS.copy()
    if updated_partner and updated_partner.get("contract_params"):
        params.update({k: v for k, v in updated_partner["contract_params"].items() if v is not None and k != "updated_at"})
    
    return {
        "success": True,
        "message": "Parametri contratto aggiornati",
        "params": params
    }


@admin_router.post("/test-smtp")
async def test_smtp_connection():
    """Test SMTP connection and send a test email to admin."""
    try:
        import smtplib
        admin_email = "claudio.bertogliatti@gmail.com"
        
        if not SMTP_PASS:
            return {"success": False, "error": "SMTP_PASSWORD non configurata"}
        
        from email.mime.text import MIMEText
        msg = MIMEText("Test SMTP da Evolution PRO - la connessione email funziona correttamente.", 'plain', 'utf-8')
        msg['From'] = SMTP_FROM
        msg['To'] = admin_email
        msg['Subject'] = "Test SMTP - Evolution PRO"
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        
        return {"success": True, "message": f"Email di test inviata a {admin_email}", "smtp_host": SMTP_HOST}
    except Exception as e:
        logger.error(f"[SMTP TEST] Errore: {e}")
        return {"success": False, "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def _get_partner_params(partner_id: str) -> dict:
    """Helper to get merged contract params for a partner."""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "contract_params": 1})
    params = DEFAULT_CONTRACT_PARAMS.copy()
    if partner and partner.get("contract_params"):
        params.update({k: v for k, v in partner["contract_params"].items() if v is not None and k != "updated_at"})
    # Include dati personali del partner per personalizzare il contratto
    personal = await db.contract_partner_data.find_one({"partner_id": partner_id}, {"_id": 0, "partner_id": 0, "saved_at": 0})
    if personal:
        params["personal_data"] = personal
    return params

async def generate_contract_pdf(partner: dict, contract_data: dict) -> Optional[str]:
    """
    Genera PDF del contratto firmato con layout professionale:
    carta intestata + logo Evolution PRO su ogni pagina, numerazione pagine
    (Pagina X di Y), Luogo e data (Torino) e DOPPIA FIRMA (accettazione integrale
    + approvazione specifica delle clausole vessatorie ex artt. 1341-1342 c.c.).
    Carica su Cloudinary e ritorna l'URL.
    """
    try:
        params = await _get_partner_params(partner.get("id", ""))
        rendered_text = render_contract_text(params)
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
        from reportlab.pdfgen import canvas as _canvas
        from reportlab.lib.utils import ImageReader

        LOGO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "logo_evolutionpro.png")
        YELLOW = colors.HexColor('#FFD24D')
        DARK = colors.HexColor('#1a1a2e')
        GREY = colors.HexColor('#999999')

        # ---- Carta intestata (header + footer) disegnata su ogni pagina ----
        def _header_footer(canvas, doc):
            canvas.saveState()
            pw, ph = A4
            try:
                logo = ImageReader(LOGO_PATH)
                iw, ih = logo.getSize()
                lh = 1.25 * cm
                lw = lh * iw / ih
                canvas.drawImage(logo, 2.2 * cm, ph - 2.3 * cm, width=lw, height=lh,
                                 mask='auto', preserveAspectRatio=True)
            except Exception:
                canvas.setFont('Helvetica-Bold', 13)
                canvas.setFillColor(DARK)
                canvas.drawString(2.2 * cm, ph - 2.0 * cm, "EVOLUTION PRO")
            canvas.setFont('Helvetica', 8)
            canvas.setFillColor(GREY)
            canvas.drawRightString(pw - 2.2 * cm, ph - 1.75 * cm, "Contratto di Partnership")
            canvas.drawRightString(pw - 2.2 * cm, ph - 2.1 * cm, "Evolution PRO")
            canvas.setStrokeColor(YELLOW)
            canvas.setLineWidth(1.4)
            canvas.line(2.2 * cm, ph - 2.5 * cm, pw - 2.2 * cm, ph - 2.5 * cm)
            # footer
            canvas.setStrokeColor(colors.HexColor('#dddddd'))
            canvas.setLineWidth(0.5)
            canvas.line(2.2 * cm, 1.7 * cm, pw - 2.2 * cm, 1.7 * cm)
            canvas.setFont('Helvetica', 7)
            canvas.setFillColor(GREY)
            canvas.drawString(2.2 * cm, 1.35 * cm, "Evolution PRO  -  www.evolution-pro.it")
            canvas.restoreState()

        # ---- Canvas con numerazione "Pagina X di Y" ----
        class NumberedCanvas(_canvas.Canvas):
            def __init__(self, *args, **kwargs):
                _canvas.Canvas.__init__(self, *args, **kwargs)
                self._saved_page_states = []

            def showPage(self):
                self._saved_page_states.append(dict(self.__dict__))
                self._startPage()

            def save(self):
                total = len(self._saved_page_states)
                for state in self._saved_page_states:
                    self.__dict__.update(state)
                    self.setFont('Helvetica', 8)
                    self.setFillColor(GREY)
                    self.drawRightString(A4[0] - 2.2 * cm, 1.35 * cm,
                                         f"Pagina {self._pageNumber} di {total}")
                    _canvas.Canvas.showPage(self)
                _canvas.Canvas.save(self)

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
            rightMargin=2.2*cm, leftMargin=2.2*cm, topMargin=3.0*cm, bottomMargin=2.2*cm)

        styles = getSampleStyleSheet()
        style_titolo = ParagraphStyle('Titolo', parent=styles['Heading1'],
            fontSize=16, spaceAfter=6, spaceBefore=0,
            textColor=DARK, alignment=TA_CENTER)
        style_sottotitolo = ParagraphStyle('Sottotitolo', parent=styles['Normal'],
            fontSize=10, spaceAfter=20, alignment=TA_CENTER,
            textColor=colors.HexColor('#666666'))
        style_articolo = ParagraphStyle('Articolo', parent=styles['Heading2'],
            fontSize=11, spaceBefore=14, spaceAfter=4,
            textColor=DARK)
        style_testo = ParagraphStyle('Testo', parent=styles['Normal'],
            fontSize=9.5, spaceAfter=6, leading=14, alignment=TA_JUSTIFY)
        style_footer = ParagraphStyle('Footer', parent=styles['Normal'],
            fontSize=8, textColor=GREY, alignment=TA_CENTER)

        story = []

        # INTESTAZIONE
        story.append(Paragraph("EVOLUTION PRO", style_titolo))
        story.append(Paragraph("Contratto di Partnership", style_sottotitolo))
        story.append(HRFlowable(width="100%", thickness=1, color=DARK))
        story.append(Spacer(1, 0.4*cm))

        # TABELLA DATI CONTRATTO (invariata - parte iniziale con IP ecc.)
        signed_at = contract_data.get('signed_at', '')
        try:
            data_firma_fmt = datetime.fromisoformat(signed_at).strftime('%d/%m/%Y alle %H:%M')
        except Exception:
            data_firma_fmt = signed_at

        info_data = [
            ['Versione contratto:', contract_data.get('version', 'v1.0')],
            ['Data firma:', data_firma_fmt],
            ['Luogo:', 'Torino'],
            ['Partner:', partner.get('name', 'N/A')],
            ['Email:', partner.get('email', 'N/A')],
            ['IP Address:', contract_data.get('ip_address', 'N/D')],
        ]
        t = Table(info_data, colWidths=[4*cm, 12*cm])
        t.setStyle(TableStyle([
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0,0), (0,-1), DARK),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.6*cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#dddddd')))
        story.append(Spacer(1, 0.4*cm))

        # TESTO CONTRATTO
        for line in rendered_text.split('\n'):
            line = line.strip()
            if not line:
                continue
            if line.startswith('ARTICOLO'):
                story.append(Paragraph(line, style_articolo))
            else:
                line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story.append(Paragraph(line, style_testo))

        # ===== SEZIONE FIRME - DOPPIA SOTTOSCRIZIONE =====
        story.append(Spacer(1, 0.6*cm))
        story.append(HRFlowable(width="100%", thickness=1, color=DARK))
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph(f"Luogo e data: Torino, {data_firma_fmt}", style_testo))
        story.append(Spacer(1, 0.2*cm))

        # firma digitale (riusata per entrambe le sottoscrizioni)
        sig_b64 = contract_data.get('signature_base64', '')
        if sig_b64.startswith('data:image'):
            sig_b64 = sig_b64.split(',')[1]

        def _sig_image():
            try:
                b = base64.b64decode(sig_b64)
                return RLImage(BytesIO(b), width=170, height=68)
            except Exception:
                return Paragraph("[Firma digitale applicata]", style_testo)

        # --- 1) Firma per accettazione integrale del contratto ---
        story.append(Paragraph("1) Firma del Partner per accettazione integrale del contratto", style_articolo))
        firma_info = [
            ["Firmato da:", partner.get('name', 'N/A')],
            ["Data e ora firma:", data_firma_fmt],
            ["Luogo:", "Torino"],
            ["Indirizzo IP:", contract_data.get('ip_address', 'N/D')],
            ["Metodo:", "Firma digitale tramite piattaforma Evolution PRO"],
        ]
        t_firma = Table(firma_info, colWidths=[4*cm, 12*cm])
        t_firma.setStyle(TableStyle([
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0,0), (0,-1), DARK),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_firma)
        story.append(Spacer(1, 0.2*cm))
        story.append(_sig_image())
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph("_______________________________  (Il Partner)", style_testo))
        story.append(Spacer(1, 0.5*cm))

        # --- 2) Approvazione specifica delle clausole vessatorie ---
        story.append(Paragraph("2) Approvazione specifica delle clausole ai sensi degli artt. 1341 e 1342 c.c.", style_articolo))
        story.append(Paragraph("Il Partner dichiara di aver letto, compreso e approvato specificamente le seguenti clausole:", style_testo))
        style_bullet = ParagraphStyle('BulletVex', parent=style_testo, leftIndent=16, spaceAfter=2)
        _clausole_vex = [
            "Art. 1.4 (Esclusiva)",
            "Art. 2.6 (Recesso Evolution PRO)",
            "Art. 2.7 (Risoluzione per inadempimento)",
            "Art. 3.3 (Sospensione per inattività)",
            "Art. 5.3 (Decadenza beneficio della dilazione)",
            "Art. 5.5 e 5.6 (Royalty e Revenue Share)",
            "Art. 5.7 (Corrispettivo non rimborsabile)",
            "Art. 6.5 (Penale riservatezza)",
            "Art. 7.6 (Limitazione di responsabilità)",
            "Art. 10.6 (Limitazione responsabilità dati)",
            "Art. 12 e 12.5 (Tutela asset e penali)",
            "Art. 14.3 (Mediazione)",
            "Art. 14.4 (Foro esclusivo Torino)",
        ]
        for _c in _clausole_vex:
            story.append(Paragraph("•  " + _c, style_bullet))
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph("Luogo e data: Torino, " + data_firma_fmt, style_testo))
        story.append(Spacer(1, 0.2*cm))
        story.append(_sig_image())
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph("_______________________________  (Il Partner - per specifica approvazione)", style_testo))

        # FOOTER legale
        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph(
            "Documento generato automaticamente dalla piattaforma Evolution PRO. "
            "La firma digitale apposta ha valore legale ai sensi del D.Lgs. 82/2005 (CAD).",
            style_footer))

        doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer,
                  canvasmaker=NumberedCanvas)
        pdf_bytes = buffer.getvalue()

        # Salva il PDF in MongoDB per download sicuro
        partner_id = partner.get('id', 'unknown')
        await db.contract_pdfs.update_one(
            {"partner_id": str(partner_id)},
            {"$set": {
                "partner_id": str(partner_id),
                "pdf_base64": base64.b64encode(pdf_bytes).decode('utf-8'),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "size_bytes": len(pdf_bytes)
            }},
            upsert=True
        )

        # Upload anche su Cloudinary come backup (non bloccante)
        try:
            import cloudinary
            import cloudinary.uploader
            cloudinary.config(
                cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
                api_key=os.environ.get('CLOUDINARY_API_KEY'),
                api_secret=os.environ.get('CLOUDINARY_API_SECRET'))
            cloudinary.uploader.upload(
                BytesIO(pdf_bytes),
                resource_type="raw",
                folder="contracts",
                public_id=f"contract_{partner_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                format="pdf"
            )
        except Exception as e:
            logger.warning(f"Cloudinary backup upload failed (non bloccante): {e}")

        return f"/api/contract/pdf-download/{partner_id}"

    except ImportError:
        logger.warning("ReportLab non installato, skip generazione PDF")
        return None
    except Exception as e:
        logger.error(f"Errore generazione PDF: {e}")
        return None


async def send_contract_email(partner: dict, pdf_url: Optional[str] = None):
    """
    Notifica post-firma contratto:
    1. Systeme.io: assegna tag 'contratto_firmato' → trigga automazione email
    2. Telegram: notifica admin con link al PDF
    3. Salva il pdf_url nel documento partner per download futuro
    """
    partner_id = partner.get("id", "")
    partner_email = partner.get('email', '')
    partner_name = partner.get('name', 'Partner')

    # --- 1. Salva pdf_url nel partner per accesso futuro ---
    if pdf_url:
        try:
            await db.partners.update_one(
                {"id": partner_id},
                {"$set": {"contract_pdf_url": pdf_url}}
            )
        except Exception as e:
            logger.warning(f"[CONTRACT] Errore salvataggio pdf_url: {e}")

    # --- 2. Systeme.io: tag contratto_firmato ---
    try:
        from services.systeme_notifications import notify_contract_signed
        await notify_contract_signed(partner_id)
        logger.info(f"[CONTRACT] Systeme.io tag 'contratto_firmato' assegnato a {partner_email}")
    except Exception as e:
        logger.warning(f"[CONTRACT] Systeme.io notification failed: {e}")

    # --- 3. Telegram: notifica admin ---
    try:
        telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        admin_chat_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')
        if telegram_token and admin_chat_id:
            import httpx
            pdf_link = f"\n📄 PDF: {os.environ.get('FRONTEND_URL', '')}{pdf_url}" if pdf_url and pdf_url.startswith("/api/") else (f"\n📄 PDF: {pdf_url}" if pdf_url and pdf_url.startswith("http") else "")
            msg = (
                f"✅ CONTRATTO FIRMATO\n\n"
                f"👤 {partner_name}\n"
                f"📧 {partner_email}\n"
                f"🕐 {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}"
                f"{pdf_link}"
            )
            async with httpx.AsyncClient() as http_client:
                await http_client.post(
                    f"https://api.telegram.org/bot{telegram_token}/sendMessage",
                    json={"chat_id": admin_chat_id, "text": msg}
                )
            logger.info(f"[CONTRACT] Telegram notifica admin inviata")
    except Exception as e:
        logger.warning(f"[CONTRACT] Telegram notification failed: {e}")
