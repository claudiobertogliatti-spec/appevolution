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
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

        if not EMERGENT_LLM_KEY:
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

        # Session ID unico per partner (mantiene contesto conversazione)
        session_id = f"contract_chat_{body.partner_id}"

        # Costruisce il messaggio con la storia recente nel testo
        # (LlmChat gestisce la sessione internamente via session_id)
        full_message = body.message
        if body.conversation_history:
            history_text = "\n".join([
                f"{'Utente' if m['role'] == 'user' else 'Assistente'}: {m['content']}"
                for m in body.conversation_history[-6:]
            ])
            full_message = f"[Contesto conversazione precedente]\n{history_text}\n\n[Nuova domanda]\n{body.message}"

        llm = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("anthropic", "claude-haiku-4-5-20251001")

        response = await llm.send_message(UserMessage(text=full_message))

        return {"reply": response}

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

CONTRACT_TEXT = """Contratto di Collaborazione in Partnership per la Creazione, Promozione e Vendita di Videocorsi Digitali

TRA
Evolution PRO LLC, con sede legale in 8 The Green, Ste A, Dover, DE 19901, USA, File Number 2394173 Delaware Division of Corporations, EIN 30-1375330, in persona del legale rappresentante Claudio Bertogliatti, di seguito "Evolution PRO" o anche "Agenzia";

e

Il Partner sottoscrittore del presente contratto digitale.

ARTICOLO 1 - OGGETTO DEL CONTRATTO

1.1 Finalità della collaborazione
Il presente Contratto disciplina la collaborazione in partnership tra Evolution PRO e il Partner per la creazione, promozione e vendita di un videocorso digitale basato sulle competenze, sui contenuti e sul posizionamento del Partner. La proposta di Partnership viene formulata da Evolution PRO solo a seguito del completamento, da parte del Partner, di una preventiva Analisi Strategica a pagamento, finalizzata alla valutazione preliminare della sostenibilità, coerenza e fattibilità commerciale del progetto. Le Parti riconoscono pertanto che, alla data di sottoscrizione del presente Contratto, il progetto è già stato oggetto di valutazione preliminare positiva da parte di Evolution PRO nella suddetta fase precontrattuale. Tale valutazione positiva non costituisce garanzia di risultati economici futuri, ma esclusivamente presupposto per l'avvio del Programma Operativo oggetto del presente Contratto.

1.1-bis Fase precontrattuale di Analisi Strategica
Prima della sottoscrizione del presente Contratto, il Partner ha richiesto a Evolution PRO una prestazione autonoma di Analisi Strategica, avente natura precontrattuale e corrispettivo separato, finalizzata alla valutazione del progetto e alla verifica della sua idoneità a essere sviluppato in partnership. L'Analisi Strategica costituisce attività distinta e già eseguita rispetto alle prestazioni oggetto del presente Contratto e il relativo corrispettivo resta autonomo e non imputabile al prezzo della Partnership, salvo diverso accordo scritto.

1.1-ter Avvio operativo del progetto
L'avvio operativo del progetto è subordinato al pagamento del corrispettivo previsto all'Articolo 5, nonché alla compilazione e consegna del Documento di Posizionamento e dei materiali preliminari richiesti. Qualora tali condizioni non siano soddisfatte entro 30 giorni dalla sottoscrizione, Evolution PRO potrà inviare formale sollecito scritto concedendo un ulteriore termine di 15 giorni. Decorso inutilmente tale termine, Evolution PRO potrà sospendere l'avvio operativo del progetto o agire ai sensi delle ulteriori disposizioni contrattuali applicabili. In caso di sospensione dovuta a inerzia imputabile al Partner, l'esecuzione operativa resterà sospesa fino alla regolarizzazione, salvo diverso accordo scritto tra le Parti.

1.2 Contenuti forniti dal Partner
Il Partner si impegna a fornire ad Evolution PRO materiali originali, leciti e di propria titolarità (a titolo esemplificativo: testi, slide, immagini, loghi, tracce, format, video grezzi, audio, documenti didattici o formativi), garantendo che il loro utilizzo non violi diritti di terzi, inclusi ma non limitati a:
- diritti d'autore e diritti connessi
- marchi e segni distintivi
- diritti di immagine
- segreti commerciali o know-how protetto
Il Partner manleva e tiene indenne Evolution PRO da ogni pretesa, danno, costo, onere o sanzione che dovesse derivare da violazioni di diritti di terzi connesse ai materiali forniti, inclusi eventuali costi legali e spese processuali.

1.3 Prestazioni di Evolution PRO
Evolution PRO, nell'ambito della partnership, si impegna a fornire al Partner:
- una sessione iniziale di allineamento strategico
- consulenza strategica sul posizionamento del Corso e dell'offerta commerciale
- configurazione di n. 1 funnel base composto da pagina opt-in, pagina di vendita e checkout
- configurazione area corsi
- supporto copy per i principali asset di vendita
- servizi di editing per masterclass e lezioni videocorso
Evolution PRO potrà, a proprio ragionevole giudizio, sospendere o rinviare la pubblicazione di materiali ritenuti:
- non idonei sotto il profilo legale, etico o reputazionale
- in contrasto con norme di legge o con le policy delle piattaforme utilizzate
- tecnicamente inadeguati (bassa qualità audio/video, contenuti incompleti o difformi dal posizionamento concordato)
In tali ipotesi, Evolution PRO ne darà motivata comunicazione scritta al Partner (via e-mail o PEC), indicando:
- le ragioni della sospensione
- le modifiche suggerite
- un termine ragionevole entro cui il Partner dovrà fornire i contenuti corretti o integrare quelli esistenti
Il Partner si impegna a collaborare in buona fede per rendere i materiali conformi ai requisiti indicati da Evolution PRO.

1.4 Canali di pubblicazione e vendita - Esclusiva
Il Corso sarà pubblicato, promosso e distribuito tramite i canali digitali di Evolution PRO (piattaforme Systeme.io o equivalenti, siti web, funnel, liste e-mail) e/o di terzi espressamente autorizzati da Evolution PRO.
Per tutta la durata del presente Contratto e per i sessanta (60) giorni successivi alla sua cessazione, il Partner si impegna a non vendere, distribuire o promuovere autonomamente:
- il medesimo Corso
- Contenuti Sostanzialmente Equivalenti
Ai fini del presente Contratto, per "Contenuti Sostanzialmente Equivalenti" si intendono, esclusivamente prodotti formativi che, cumulativamente:
- abbiano medesimo target principale
- riproducano oltre il 60% della struttura didattica del Corso
- utilizzino in modo prevalente i medesimi materiali, casi studio, promesse o script sviluppati nell'ambito della Partnership
- risultino destinati a sostituire direttamente il Corso oggetto del presente Contratto
Restano espressamente esclusi dal divieto: consulenze 1:1, workshop dal vivo, webinar gratuiti, speech, contenuti editoriali e percorsi formativi diversi per struttura, finalità e promessa principale.
Qualsiasi vendita autonoma del Corso o di Contenuti Sostanzialmente Equivalenti da parte del Partner - online o offline - dovrà essere preventivamente autorizzata per iscritto da Evolution PRO (via PEC o e-mail con conferma di lettura). Tale autorizzazione non potrà essere irragionevolmente negata qualora:
- non sussista conflitto o concorrenza diretta con iniziative in corso di Evolution PRO
- non derivi un pregiudizio economico rilevante o un danno d'immagine per Evolution PRO

1.5 Gestione degli incassi e rendicontazione
Gli incassi derivanti dalla vendita del Corso saranno gestiti da Evolution PRO tramite la piattaforma Systeme.io o altra piattaforma equivalente.
Per "Importo Netto Incassato" si intende la somma:
- effettivamente accreditata sui conti di Evolution PRO
- al netto di rimborsi, storni, chargeback e commissioni dei sistemi di pagamento
I dati di vendita risultanti dai sistemi ufficiali utilizzati da Evolution PRO fanno fede salvo errore materiale, malfunzionamento tecnico documentato o prova contraria fornita dal Partner. Evolution PRO metterà a disposizione del Partner un report mensile riepilogativo contenente almeno: ordini, incassi lordi, commissioni, chargeback/rimborsi, importo netto incassato, quota spettante alle Parti.

ARTICOLO 2 - DURATA, RINNOVO, RECESSO E RISOLUZIONE

2.1 Durata del Contratto
Il presente Contratto ha durata determinata di dodici (12) mesi decorrenti dalla data di sottoscrizione da parte di entrambe le Parti. Per l'intera durata contrattuale resta valido l'accordo di Partnership disciplinato dal presente Contratto, comprensivo delle condizioni economiche di cui all'Articolo 5. La durata contrattuale non è soggetta a proroghe automatiche. Eventuali ritardi imputabili al Partner non comporteranno proroghe automatiche, salvo che il ritardo superi complessivamente 30 giorni e renda oggettivamente impossibile l'esecuzione del Programma nei tempi previsti; in tal caso le Parti si confronteranno in buona fede per un eventuale riallineamento scritto. Decorso il termine dei 12 (dodici) mesi, l'accordo di revenue share di cui all'Articolo 5 cesserà automaticamente, fatto salvo quanto maturato fino a tale data.

2.2 Natura del corrispettivo
Il corrispettivo previsto dal presente Contratto costituisce investimento una tantum per l'avvio e lo sviluppo del progetto in partnership e non configura abbonamento né canone ricorrente.

2.3 Scadenza e prosecuzione della collaborazione
Alla scadenza del periodo contrattuale di dodici (12) mesi, il Contratto cessa automaticamente senza rinnovo automatico. Eventuali ulteriori collaborazioni o nuovi progetti potranno essere concordati esclusivamente per iscritto tra le Parti, sulla base di nuove condizioni economiche e operative.

2.4 Comunicazione di rinnovo o modifica
Eventuali richieste di rinnovo, proroga o modifica delle condizioni dovranno essere inviate almeno trenta (30) giorni prima della data di scadenza del Contratto tramite mail all'indirizzo assistenza@evolution-pro.it o tramite PEC. In assenza di accordo scritto entro tale termine, il Contratto cesserà automaticamente, salvo gli obblighi già maturati.

2.5 Continuità tecnica e gestione post-contratto
Alla cessazione del Contratto, il Partner potrà mantenere online il Corso e le infrastrutture di marketing:
- sottoscrivendo autonomamente, a proprie spese, un abbonamento diretto con la piattaforma utilizzata (Systeme.io o equivalente)
- ovvero richiedendo il trasferimento del funnel, del database e delle automazioni verso altra piattaforma di propria scelta
In tali ipotesi, Evolution PRO non sarà tenuta a fornire assistenza tecnica o manutenzione inclusa nel canone, salvo la possibilità per il Partner di richiedere un preventivo separato per il servizio tecnico di migrazione dei dati. Entro 15 giorni dalla cessazione, Evolution PRO fornirà al Partner istruzioni minime per il subentro tecnico o per la prosecuzione autonoma, restando esclusa ogni attività operativa non espressamente pattuita.

2.6 Recesso unilaterale di Evolution PRO
Fermo restando quanto previsto in tema di risoluzione per inadempimento, Evolution PRO potrà recedere unilateralmente solo in presenza di sopravvenute circostanze oggettive, documentabili e non imputabili a propria scelta arbitraria, che rendano non più sostenibile la prosecuzione del progetto, quali: impossibilità tecnica sopravvenuta, rischio legale documentato, conflitto reputazionale grave e non rimediabile, cessazione del fornitore critico senza alternativa ragionevole. Il recesso non potrà essere esercitato in modo arbitrario o discriminatorio e dovrà essere motivato per iscritto. In caso di recesso di Evolution PRO non dovuto a inadempimento del Partner, quest'ultimo avrà diritto:
- alla consegna degli asset già realizzati e tecnicamente trasferibili
- al rimborso della parte di corrispettivo relativa alle attività non ancora eseguite restando fermo che il corrispettivo iniziale remunera attività già avviate, organizzazione e allocazione delle risorse, e non è soggetto a restituzione, salvo i soli casi inderogabili previsti dalla legge o grave inadempimento imputabile a Evolution PRO

2.7 Risoluzione per inadempimento (clausola risolutiva espressa)
Ciascuna Parte potrà risolvere anticipatamente il Contratto in caso di grave inadempimento dell'altra Parte, ai sensi di clausola risolutiva espressa.
Costituiscono, a titolo esemplificativo, inadempimenti gravi del Partner:
- mancato o ritardato pagamento dei corrispettivi dovuti ai sensi dell'Articolo 5, protratto oltre 15 (quindici) giorni dalla scadenza
- mancata consegna, entro i termini indicati da Evolution PRO, dei materiali minimi necessari per l'avvio del progetto (documento di posizionamento, outline del Corso, file video non editati), nonostante formale sollecito
- violazione degli obblighi di riservatezza di cui all'Articolo 6
- violazione delle clausole di cui agli Articoli 1.4, 4 e 12 in tema di esclusiva, utilizzo autonomo del Corso o Contenuti Sostanzialmente Equivalenti, tutela del brand e concorrenza sleale
- condotte lesive dell'immagine o reputazione commerciale di Evolution PRO consistenti in dichiarazioni false, diffamatorie, gravemente denigratorie o idonee a produrre un pregiudizio concreto e documentabile alla reputazione commerciale dell'altra Parte
Costituiscono, a titolo esemplificativo, inadempimenti gravi di Evolution PRO:
- omessa esecuzione delle attività minime previste nel Programma Operativo di cui all'Articolo 8, senza giustificato motivo e nonostante formale sollecito del Partner
- mancata messa online del Corso, nonostante la completa e puntuale consegna da parte del Partner dei materiali necessari e il regolare pagamento dei corrispettivi, protratta per oltre 60 (sessanta) giorni rispetto alle tempistiche ordinarie del Programma, fatta salva la prova di cause di forza maggiore o responsabilità del Partner
- violazioni accertate e gravi degli obblighi essenziali di protezione dei dati personali ai sensi dell'Articolo 10, imputabili a dolo o colpa grave
La Parte che intende avvalersi della presente clausola risolutiva espressa dovrà inviare all'altra Parte, mediante PEC, una diffida ad adempiere con termine non inferiore a 15 (quindici) giorni. Decorso inutilmente tale termine, il Contratto si intenderà risolto di diritto, fatti salvi gli obblighi economici già maturati e l'eventuale diritto al risarcimento del danno. La collaborazione attiva del Partner costituisce obbligazione essenziale ai fini della corretta esecuzione del presente Contratto.

ARTICOLO 3 - DIRITTI E OBBLIGHI DELLE PARTI

3.1 Obblighi principali del Partner
Il Partner si impegna a partecipare attivamente allo sviluppo del progetto, rispettando le tempistiche indicate da Evolution PRO. In particolare, salvo diversa pianificazione scritta concordata tra le Parti nel Programma Operativo o nei canali ufficiali di progetto, il Partner si obbliga a:
- compilare e consegnare il documento di posizionamento
- partecipare ai briefing strategici e alle sessioni di definizione del piano marketing
- fornire l'outline del Corso (argomenti, moduli, bonus)
- registrare e consegnare i file video non editati
- fornire i materiali necessari per la creazione del calendario editoriale
- collaborare alla produzione e pubblicazione dei contenuti social secondo il piano editoriale definito, restando inteso che la gestione operativa continuativa dei canali social non è inclusa nella partnership
- gestire in autonomia i contatti e i lead generati dalle campagne di marketing per le attività di vendita e relazione con i clienti, restando esclusa ogni attività di gestione tecnica delle piattaforme
- utilizzare la piattaforma fornita (Systeme.io o equivalente) con un livello base di competenze operative per consultare dati, vendite e risultati
L'assenza ingiustificata di comunicazione o operatività per oltre 30 (trenta) giorni consecutivi legittima Evolution PRO a sospendere temporaneamente le attività e, previa diffida scritta, a risolvere il Contratto per grave inadempimento.

3.2 Collaborazione e comunicazioni operative
Il Partner si impegna a:
- mantenere una comunicazione costante e tempestiva con il team Evolution PRO
- rispettare i termini di revisione dei materiali (entro 48 ore salvo diversa indicazione)
- approvare o segnalare modifiche entro i tempi stabiliti
- adottare un comportamento professionale e rispettoso verso i membri del team e i collaboratori

3.3 Ritardi o mancata collaborazione del Partner
Eventuali ritardi o omissioni da parte del Partner potranno comportare:
- sospensione temporanea delle attività operative
- posticipo proporzionale delle fasi successive del Programma
- nessuna proroga automatica del Contratto o riduzione dei corrispettivi
Evolution PRO informerà il Partner per iscritto e proporrà, ove possibile, un piano di riallineamento operativo. L'eventuale inattività del Partner superiore a 30 (trenta) giorni consecutivi potrà comportare la dichiarazione di progetto sospeso. Decorso un ulteriore termine di 15 (quindici) giorni senza ripristino operativo, il Contratto potrà essere risolto ai sensi dell'Articolo 2.7. In caso di sospensione del progetto per inattività imputabile al Partner superiore a 30 giorni consecutivi, Evolution PRO potrà dichiarare la sospensione operativa del progetto previa comunicazione scritta. Qualora l'inattività prosegua oltre ulteriori 15 giorni dalla diffida, Evolution PRO potrà risolvere il Contratto. La durata contrattuale non si prorogherà automaticamente; tuttavia, ove al momento della sospensione non siano ancora state eseguite attività essenziali per cause imputabili esclusivamente al Partner, le Parti potranno concordare un'estensione tecnica limitata e scritta.

3.4 Obblighi principali di Evolution PRO
Evolution PRO si impegna a:
- eseguire con professionalità le attività previste nel Programma Operativo (creazione funnel, editing, copywriting, supporto strategico alle attività di marketing e ADV, supporto tecnico)
- fornire al Partner accesso alla piattaforma di marketing per la consultazione delle attività, dei lead e dei risultati di vendita
- assicurare assistenza iniziale per l'apprendimento delle funzioni principali della piattaforma
- fornire supporto strategico e tecnico tramite i canali ufficiali (gruppo Telegram, e-mail dedicata assistenza@evolution-pro.it)
- avvalersi di collaboratori e fornitori esterni qualificati, restando comunque responsabile della corretta esecuzione complessiva del servizio nei confronti del Partner

3.5 Diritti comuni delle Parti
Le Parti potranno proporre modifiche, integrazioni o aggiornamenti al progetto, che saranno valutati e approvati per iscritto tramite PEC. Le Parti si impegnano a mantenere un atteggiamento trasparente e collaborativo per tutta la durata del Contratto e per i successivi sessanta (60) giorni. L'eventuale mancato adempimento del Partner agli obblighi di consegna o collaborazione non potrà essere considerato inadempimento di Evolution PRO, né giustificare richieste di rimborso o contestazioni del corrispettivo pattuito.

ARTICOLO 4 - PROPRIETÀ INTELLETTUALE

4.1 Titolarità dei diritti
Il Partner mantiene la piena titolarità dei diritti d'autore e di sfruttamento economico sui contenuti originali forniti (idee, testi, video, materiali didattici o formativi). Con la firma del presente Contratto, il Partner dichiara che tali contenuti sono di sua esclusiva proprietà e che il loro utilizzo non viola diritti di terzi.

4.2 Licenza concessa a Evolution PRO
Il Partner concede a Evolution PRO licenza d'uso temporanea, onerosa, non trasferibile e in esclusiva limitatamente al Corso oggetto della Partnership e ai canali di vendita concordati, al solo fine di consentirne:
- la produzione, pubblicazione, distribuzione e promozione del Corso attraverso canali digitali o fisici (piattaforme, siti web, social media, eventi, masterclass)
- la realizzazione delle attività di marketing, editing, funnel e copywriting previste nel Programma Operativo
La licenza è valida per la durata del presente Contratto e per i sessanta (60) giorni successivi alla sua cessazione, salvo eventuale rinnovo o proroga concordata per iscritto tramite indirizzo PEC. La licenza è non trasferibile a terzi, se non per ragioni tecniche strettamente necessarie all'erogazione dei servizi (hosting, piattaforme, fornitori).

4.3 Miglioramenti tecnici e adattamenti
Evolution PRO è autorizzata a modificare, adattare o ottimizzare i contenuti esclusivamente per migliorarne qualità visiva, accessibilità e performance commerciale, senza alterare il messaggio o la sostanza originale del Partner.

4.4 Divieto di utilizzo autonomo durante la partnership
Durante la vigenza del Contratto e nei sessanta (60) giorni successivi alla sua cessazione, il Partner si impegna a non riprodurre, distribuire, vendere o pubblicare autonomamente il medesimo Corso o Contenuti Sostanzialmente Equivalenti, senza preventiva autorizzazione scritta di Evolution PRO.

4.5 Uso promozionale e citazione del Partner
Evolution PRO potrà utilizzare estratti, immagini, clip o testimonianze del Corso e del Partner esclusivamente a fini promozionali o di portfolio aziendale, senza che ciò comporti una vendita diretta o uno sfruttamento commerciale autonomo dei contenuti. Tale utilizzo potrà proseguire anche dopo la cessazione del Contratto, nel rispetto della normativa vigente e senza pregiudicare i diritti morali o d'autore del Partner. Il Partner potrà revocare per giustificati motivi l'utilizzo di testimonianze personali o immagini che risultino lesive della propria reputazione o non più attuali, fermo restando l'uso di case study anonimizzati.

4.6 Tutela reciproca
Entrambe le Parti si impegnano a rispettare i diritti di proprietà intellettuale dell'altra e di eventuali terzi. Qualsiasi violazione comporterà la possibilità di risolvere il Contratto per giusta causa e richiedere il risarcimento dei danni subiti.

ARTICOLO 5 - CORRISPETTIVI E PAGAMENTI

5.1 Corrispettivo della partnership
Il corrispettivo per l'ingresso nella Partnership è pari a € 2.790,00 (duemilasettecentonovanta/00), iva inclusa quale investimento una tantum per l'attivazione del progetto.

5.2 Modalità di pagamento
Il pagamento avviene in un'unica soluzione alla firma del Contratto. In casi eccezionali, a discrezione di Evolution PRO e previa approvazione scritta, il pagamento potrà essere suddiviso in massimo 3 (tre) rate mensili a 30 (trenta) giorni. Tutti i pagamenti devono essere effettuati sul conto Revolut Bank UAB intestato a Evolution PRO LLC (IBAN: LT94 3250 0974 4929 5781) o tramite sistemi elettronici autorizzati (Stripe, PayPal, ecc.). I pagamenti si considerano perfezionati solo all'effettivo accredito.

5.3 Decadenza del beneficio
Il mancato pagamento anche di una sola rata oltre 10 giorni dalla scadenza, previa messa in mora scritta, comporta la decadenza dal beneficio della dilazione. In difetto, Evolution PRO potrà sospendere immediatamente l'accesso alla piattaforma e risolvere il Contratto per grave inadempimento. Il ritardo nel pagamento costituisce inadempimento essenziale ai sensi dell'Articolo 2.7.

5.4 Valore complessivo del progetto e ripartizione dell'investimento
Le Parti riconoscono che Evolution PRO sostiene, oltre al corrispettivo versato dal Partner, un ulteriore investimento organizzativo, strategico, tecnico e operativo, non quantificato come finanziamento o credito ma come apporto industriale al progetto.

5.5 Royalties a favore di Evolution PRO
A fronte dell'investimento sostenuto da Evolution PRO, il Partner riconosce a quest'ultima una royalty pari al 10% (dieci per cento) dei ricavi derivanti dalla vendita del Corso, per una durata di dodici (12) mesi dalla data di sottoscrizione del presente Contratto. La royalty del 10% è calcolata sull'Importo Netto Incassato come definito all'Articolo 1.5, ossia sull'importo effettivamente incassato da Evolution PRO per le vendite del Corso, al netto di rimborsi, storni, chargeback e commissioni dei sistemi di pagamento. Decorso il termine di dodici (12) mesi dalla sottoscrizione del presente Contratto, nessuna ulteriore royalty sarà dovuta, salvo diverso accordo scritto tra le Parti.

5.6 Durata e Applicazione della Revenue Share
La percentuale del 10% di cui all'Articolo 5 si applica esclusivamente alle vendite concluse durante il periodo di validità del presente Contratto. Per "vendite concluse" si intendono gli ordini o contratti formalizzati con accettazione da parte del cliente finale entro la scadenza dei 12 mesi, indipendentemente dalla data effettiva di incasso. Le vendite concluse successivamente alla scadenza del presente Contratto non saranno soggette ad alcuna percentuale a favore di Evolution PRO, salvo diverso accordo scritto tra le Parti.

5.7 Natura non rimborsabile del corrispettivo
Il corrispettivo iniziale remunera l'attivazione del progetto, la fase di impostazione strategica, l'allocazione delle risorse operative e l'avvio delle attività previste dalla Partnership e, in quanto tale, resta acquisito da Evolution PRO una volta avviata l'esecuzione del rapporto, fatti salvi i soli casi inderogabili previsti dalla legge o l'accertato grave inadempimento di Evolution PRO.

5.8 Licenza piattaforma
Alla cessazione del Contratto, il mantenimento online del Corso e delle automazioni richiede la sottoscrizione di una licenza diretta con la piattaforma Systeme.io (o equivalente). In assenza di rinnovo o sottoscrizione di tale licenza, Evolution PRO non fornirà supporto tecnico, salvo accordo separato. Le attività svolte dal Partner in autonomia sulla piattaforma non generano alcun diritto a compensi, commissioni o assistenza da parte di Evolution PRO.

5.9 Campagne pubblicitarie (ADV)
Le campagne pubblicitarie a pagamento (ADV) non sono obbligatorie, ma fortemente consigliate nella fase post-lancio del Corso, al fine di incrementarne la visibilità e le potenzialità di vendita. Eventuali attività ADV saranno valutate congiuntamente dalle Parti in base alle caratteristiche del progetto e al budget messo a disposizione dal Partner. I costi pubblicitari sono interamente a carico del Partner, che provvederà a saldarli direttamente alle piattaforme pubblicitarie tramite collegamento del proprio metodo di pagamento. Evolution PRO fornisce supporto strategico alle attività ADV senza assunzione di obblighi operativi continuativi né garanzia di risultati economici. L'eventuale mancata attivazione di ADV da parte del Partner non costituisce inadempimento, salvo che le Parti abbiano concordato per iscritto un piano di lancio che la preveda come elemento essenziale.

ARTICOLO 6 - CLAUSOLA DI RISERVATEZZA

6.1 Oggetto della riservatezza
Ciascuna Parte si impegna a mantenere strettamente riservate tutte le informazioni tecniche, strategiche, commerciali, operative o finanziarie apprese nel corso della collaborazione, comprese a titolo esemplificativo e non esaustivo:
- strategie di marketing, funnel e automazioni
- piani editoriali, campagne ADV e sistemi di vendita
- dati di performance, report e statistiche
- informazioni relative a clienti, lead, contatti o fornitori
- contenuti video, materiali didattici e testi promozionali non ancora pubblicati
- know-how, modelli organizzativi, procedure, documentazione interna e listini
Tali informazioni sono considerate confidenziali e non potranno essere comunicate, copiate, divulgate o utilizzate per fini diversi da quelli strettamente necessari all'esecuzione del presente Contratto.

6.2 Durata dell'obbligo
L'obbligo di riservatezza decorre dalla data di sottoscrizione del Contratto e rimane valido:
- per tutta la durata della collaborazione
- per un periodo di 90 (novanta) giorni successivi alla sua cessazione, indipendentemente dalla causa di conclusione

6.3 Eccezioni
Non sono soggette all'obbligo di riservatezza le informazioni che:
- erano già di pubblico dominio al momento della comunicazione
- siano divenute di pubblico dominio successivamente, senza violazione del presente Contratto
- siano state legittimamente acquisite da terzi non vincolati da obblighi di riservatezza
- debbano essere comunicate in forza di ordini o richieste provenienti da autorità competenti, nel rispetto della legge

6.4 Responsabilità e controllo
Ciascuna Parte garantisce che i propri dipendenti, collaboratori, consulenti o subappaltatori rispettino il medesimo obbligo di riservatezza, rispondendo direttamente di eventuali violazioni. Evolution PRO adotterà misure organizzative e tecniche idonee alla tutela dei dati e delle informazioni sensibili del Partner.

6.5 Violazione dell'obbligo - Penale
La violazione grave e imputabile dell'obbligo di riservatezza comporterà una penale di € 2.000 per ciascuna violazione autonoma, fatto salvo il maggior danno. Non costituiscono violazione autonoma pluralità di atti meramente esecutivi del medesimo fatto.

6.6 Riservatezza precontrattuale
L'obbligo di riservatezza si estende anche alle informazioni condivise in fase precontrattuale (es. trattative, preventivi, strategie di posizionamento), anche nel caso in cui il Contratto non venga successivamente eseguito o rinnovato.

ARTICOLO 7 - RECESSO E RISOLUZIONE ANTICIPATA

7.1 Esclusione del recesso ordinario
Il presente Contratto non prevede diritto di recesso ordinario da parte delle Parti, salvo quanto previsto dall'Articolo 2.6 a favore di Evolution PRO. Il rapporto contrattuale ha durata determinata di dodici (12) mesi dalla sottoscrizione e potrà cessare anticipatamente esclusivamente nei casi di risoluzione per grave inadempimento, ai sensi del presente articolo e dell'Articolo 2.7. Salvo dolo, colpa grave, violazione di obblighi essenziali o responsabilità inderogabili di legge, l'eventuale responsabilità risarcitoria complessiva di Evolution PRO non potrà eccedere l'importo dei corrispettivi effettivamente versati dal Partner.

7.2 Risoluzione per inadempimento di Evolution PRO
Il Partner potrà richiedere la risoluzione anticipata del Contratto esclusivamente in caso di grave e comprovato inadempimento contrattuale di Evolution PRO, previa diffida ad adempiere inviata tramite PEC e decorso infruttuoso di un termine di quindici (15) giorni. In tale ipotesi, il Partner potrà richiedere il rimborso dell'eventuale parte di importo versato non proporzionata alle attività già eseguite e ai costi sostenuti da Evolution PRO, secondo quanto previsto dalla legge e nel rispetto del principio di proporzionalità. Ai fini della proporzionalità del rimborso si terrà conto delle attività effettivamente eseguite, del loro stato di completamento, dei costi già sostenuti e dell'utilizzabilità degli asset da parte del Partner.

7.3 Risoluzione per inadempimento del Partner
In caso di grave inadempimento del Partner, Evolution PRO avrà diritto a trattenere il corrispettivo versato in relazione alle attività già eseguite e ai costi sostenuti, fatto salvo il diritto al risarcimento dell'eventuale maggior danno.

7.4 Effetti della risoluzione per inadempimento del Partner
In caso di risoluzione anticipata del Contratto per grave inadempimento del Partner, Evolution PRO avrà facoltà di completare le attività operative già avviate e di gestire la chiusura tecnica del progetto, senza obbligo di ulteriore sviluppo o investimento operativo. In tale ipotesi, il corrispettivo versato resterà acquisito da Evolution PRO nei limiti delle attività già eseguite e dei costi sostenuti, fatto salvo il diritto al risarcimento dell'eventuale maggior danno.

7.5 Risoluzione per cause non imputabili alle Parti
Qualora la prosecuzione del Contratto divenga oggettivamente impossibile per cause non imputabili alle Parti, ovvero per eventi straordinari che rendano irrealizzabile l'esecuzione del progetto, ciascuna Parte potrà risolvere il Contratto previa comunicazione scritta. In caso di impossibilità sopravvenuta non imputabile alle Parti, resteranno fermi gli effetti economici maturati in relazione alle attività già eseguite; per le attività non eseguite le Parti procederanno a una regolazione economica proporzionata alle attività effettivamente eseguite e ai costi sostenuti, da documentarsi su richiesta.

7.6 Limitazioni di responsabilità
Evolution PRO non garantisce risultati economici specifici in termini di vendite, conversioni o profitti, poiché tali variabili dipendono da fattori esterni (mercato, budget, contenuti, posizionamento del Partner, stagionalità). L'impegno contrattuale di Evolution PRO consiste nell'erogare i servizi con diligenza professionale, conformemente al Programma Operativo. In nessun caso Evolution PRO potrà essere ritenuta responsabile per danni indiretti o consequenziali (quali mancato guadagno o perdita di chance), salvo il caso di dolo o colpa grave. Evolution PRO non risponde, in particolare, di:
- malfunzionamenti imputabili a piattaforme esterne, servizi di terzi o forza maggiore
- risultati economici inferiori alle aspettative del Partner
- perdite o disservizi dovuti a inadempimenti del Partner nelle consegne o nelle approvazioni dei materiali
Il Partner riconosce che il successo economico del progetto dipende in misura significativa dalla qualità dei contenuti forniti, dal posizionamento personale e dall'impegno commerciale profuso. Il mancato raggiungimento di obiettivi di vendita non costituisce inadempimento contrattuale.

7.7 Comunicazioni formali
Ogni risoluzione del Contratto dovrà essere formalizzata per iscritto, a pena di inefficacia, secondo le modalità previste all'Articolo 13.

ARTICOLO 8 - SERVIZI FORNITI DA EVOLUTION PRO E OBBLIGHI DEL PARTNER

8.1 Servizi forniti da Evolution PRO
Nell'ambito della partnership, Evolution PRO fornisce al Partner servizi strategici, tecnici e operativi finalizzati alla creazione, pubblicazione, lancio e sviluppo del Corso, in particolare:
- analisi strategica iniziale e definizione del posizionamento del progetto
- supporto alla strutturazione dei contenuti formativi e dell'offerta commerciale
- configurazione tecnica della piattaforma di marketing e vendita (Systeme.io o equivalente), inclusi area corsi, funnel e automazioni
- realizzazione e ottimizzazione degli asset digitali necessari alla vendita del Corso (pagine, copy, materiali di supporto)
- definizione di un piano editoriale mensile dedicato alla fase di lancio del Corso, replicabile dal Partner nella fase post-lancio
- accesso a un gruppo Telegram dedicato e a un videocorso formativo riservato, comprensivo di risorse supplementari scaricabili
Il supporto successivo alla fase di lancio è da intendersi esclusivamente di natura strategica e comprende l'analisi dei risultati e dei principali KPI, con l'obiettivo di ottimizzare e scalare il progetto entro la durata contrattuale. La corretta esecuzione del progetto presuppone la collaborazione attiva del Partner secondo quanto previsto dal Programma Operativo e dalle richieste scritte inviate nei canali ufficiali. L'assenza di tale collaborazione esclude qualsiasi responsabilità per eventuali ritardi o risultati inferiori alle aspettative.

8.2 Obblighi del Partner
Il Partner si impegna a collaborare attivamente e con continuità allo sviluppo del progetto, fornendo con puntualità contenuti, informazioni e materiali richiesti secondo le tempistiche operative concordate. Il mancato rispetto reiterato delle tempistiche o la mancata fornitura dei materiali necessari potrà determinare la sospensione temporanea delle attività operative da parte di Evolution PRO, senza che ciò comporti responsabilità o obblighi risarcitori a carico della stessa. Il Partner è pienamente responsabile della qualità, liceità e veridicità dei contenuti forniti, nonché della gestione commerciale dei contatti e dei clienti generati, salvo diverso accordo scritto tra le Parti. Il progetto si intende attivo esclusivamente in presenza di collaborazione effettiva del Partner; eventuali ritardi imputabili al Partner non potranno essere considerati inadempienze da parte di Evolution PRO. Il Partner si impegna a garantire un livello minimo di attivazione commerciale durante la fase di lancio e post-lancio del Corso, comprendente:
- pubblicazione dei contenuti previsti dal piano editoriale
- gestione attiva e tempestiva dei lead generati
- disponibilità a confrontarsi in buona fede con Evolution PRO sull'opportunità di eventuali investimenti pubblicitari, senza obbligo di attivazione salvo diverso accordo scritto
L'assenza di attivazione commerciale esclude qualsiasi responsabilità di Evolution PRO in merito ai risultati economici del progetto.

8.3 Esclusioni
Sono espressamente esclusi dai servizi inclusi nel presente Contratto, salvo accordo scritto separato:
- la gestione operativa continuativa dei canali social
- la gestione diretta delle campagne pubblicitarie a pagamento
- la produzione di contenuti aggiuntivi non previsti
- qualsiasi attività non espressamente indicata al presente articolo

8.4 Aggiornamenti e migliorie del Programma Operativo
Il Metodo E.V.O. – Programma in 8 settimane costituisce parte integrante e sostanziale del presente Contratto e rappresenta la guida ufficiale per la corretta esecuzione delle fasi di lavoro. Il Partner si impegna a rispettare le tempistiche e le attività previste per ciascuna fase, collaborando in modo attivo e continuativo. Eventuali ritardi imputabili al Partner potranno comportare la sospensione temporanea delle attività operative fino al riallineamento delle condizioni necessarie allo sviluppo del progetto. Qualora il Partner rimanga inattivo per un periodo superiore a 60 giorni consecutivi senza giustificato motivo, Evolution PRO potrà considerare il progetto sospeso, senza obbligo di proroghe automatiche o rimborsi delle somme già corrisposte. Evolution PRO potrà apportare aggiornamenti tecnici, organizzativi o didattici al Programma Operativo purché non comportino una riduzione sostanziale delle attività minime previste né alterino in modo significativo l'equilibrio economico del Contratto.

8.5 Servizi extra non inclusi nella partnership
I servizi inclusi nella partnership sono esclusivamente quelli indicati nel presente Articolo 8.1 e nel Programma Operativo di riferimento. Durante la durata contrattuale, il Partner potrà richiedere a Evolution PRO l'attivazione di servizi extra, a titolo esemplificativo e non esaustivo:
- sessioni strategiche individuali aggiuntive
- servizi di intelligenza artificiale personalizzati
- gestione operativa dei canali social
- gestione operativa delle automazioni sulla piattaforma
- realizzazione o ottimizzazione di siti web, funnel o asset digitali aggiuntivi
- servizi di advertising operativo e gestione campagne a pagamento
Tali servizi saranno quantificati separatamente, su richiesta del Partner, e regolati da accordo scritto autonomo, senza modifica delle condizioni economiche, della durata o delle obbligazioni previste dal presente Contratto. L'eventuale mancata attivazione di servizi extra non costituisce inadempimento di Evolution PRO né incide sull'esecuzione della partnership.

8.6 Clausola di buona fede e cooperazione
Le Parti si impegnano a operare in spirito di collaborazione e trasparenza, mantenendo un dialogo costante e costruttivo. Ciascuna Parte adotterà la massima diligenza professionale nel rispettare le proprie scadenze e nel non ostacolare l'operato dell'altra.

ARTICOLO 9 - CLAUSOLA FISCALE

9.1 Dati societari di Evolution PRO
Evolution PRO LLC è una società estera regolarmente costituita nello Stato del Delaware (U.S.A.) in data 22/09/2023. Dati ufficiali:
- Ragione sociale: Evolution PRO LLC
- Sede legale: 8 The Green, Ste A, Dover, DE 19901, Stati Uniti
- File Number: 2394173 (Delaware Division of Corporations)
- EIN (Employer Identification Number): 30-1375330
- IBAN: LT94 3250 0974 4929 5781 (Revolut Bank UAB)
- E-mail: assistenza@evolution-pro.it
Le attività operative sono svolte in Italia (Torino) in modalità da remoto, attraverso le piattaforme di marketing integrate con i sistemi Go High Level (USA) e Systeme (Francia).

9.2 Regime IVA
Evolution PRO LLC non è soggetta a IVA in Italia e non possiede Partita IVA italiana. Le fatture emesse da Evolution PRO LLC sono quindi esenti da IVA in Italia e soggette al meccanismo di inversione contabile (reverse charge), ove applicabile secondo la normativa vigente.

9.3 Obblighi fiscali del Partner
Il Partner, in qualità di soggetto passivo d'imposta, si impegna a:
- integrare la fattura ricevuta con l'aliquota IVA prevista, se e in quanto dovuta
- registrare la fattura nei registri IVA acquisti e vendite, secondo la normativa del proprio Stato di stabilimento
- rispettare la normativa fiscale vigente in materia di registrazioni contabili e dichiarazioni fiscali
- fornire, se richiesto per esigenze di compliance documentale, le sole informazioni strettamente necessarie a comprovare il corretto inquadramento fiscale dell'operazione, nel rispetto della normativa applicabile

9.4 Responsabilità fiscale
Il Partner è l'unico responsabile della corretta gestione fiscale e previdenziale dei compensi percepiti, nonché del versamento di imposte, contributi e adempimenti connessi alla propria attività professionale. Evolution PRO resta invece responsabile della regolarità delle proprie fatture e delle operazioni di sua competenza, impegnandosi a emettere documentazione conforme alla normativa applicabile. Le Parti riconoscono espressamente che:
- il presente Contratto non costituisce rapporto di lavoro subordinato, di agenzia, di franchising o di associazione in partecipazione
- ciascuna Parte opera in piena autonomia giuridica e fiscale
- eventuali contestazioni fiscali dovranno essere gestite individualmente dalla Parte a cui si riferiscono, restando esclusa la corresponsabilità salvo dolo o colpa grave

ARTICOLO 10 - DATA PROCESSING AGREEMENT (DPA)

10.1 Parti e oggetto
Ai fini della protezione dei dati personali trattati nell'ambito del presente Contratto:
- il Partner agisce in qualità di Titolare del trattamento
- Evolution PRO LLC agisce in qualità di Responsabile del trattamento
Con il presente accordo, il Titolare affida al Responsabile i trattamenti di dati personali necessari all'erogazione dei servizi di marketing, automazione, vendita e gestione della piattaforma previsti dal Contratto di partnership. Il DPA entra in vigore alla sottoscrizione del Contratto e cessa con la cancellazione o restituzione dei dati trattati, salvo obblighi legali di conservazione.

10.2 Finalità del trattamento, tipologie di dati e categorie di interessati
- Finalità: gestione del Corso, attività di marketing, analisi campagne, amministrazione della piattaforma e assistenza clienti
- Tipologie di dati trattati: dati identificativi (nome, cognome, e-mail, telefono), dati fiscali e di pagamento, log di accesso, dati di navigazione, statistiche e preferenze utente
- Categorie di interessati: clienti e potenziali clienti del Corso (lead), utenti registrati, il Partner stesso e suoi collaboratori

10.3 Obblighi del Responsabile del trattamento (Evolution PRO)
Evolution PRO si impegna a:
- trattare i dati personali solo su istruzioni documentate del Partner
- garantire che le persone autorizzate al trattamento siano vincolate da obbligo di riservatezza
- adottare misure tecniche e organizzative adeguate (cifratura, autenticazione a due fattori, backup, logging e monitoraggio accessi)
- assistere il Partner nell'esercizio dei diritti degli interessati
- notificare eventuali violazioni di dati personali ("data breach") entro 48 ore dalla scoperta, fornendo tutte le informazioni necessarie, nei limiti di quanto richiesto dalla normativa applicabile
- consentire al Partner verifiche documentali e audit tecnici, previo preavviso di regola di almeno dieci (10) giorni lavorativi, riducibile in casi di urgenza motivata da potenziale grave violazione
- cancellare o restituire tutti i dati personali al termine del Contratto, salvo obblighi legali di conservazione

10.4 Sub-responsabili e fornitori tecnologici
Evolution PRO potrà avvalersi di sub-responsabili esterni (es. hosting, servizi cloud, piattaforme di marketing), che garantiscono adeguati livelli di protezione dei dati. I principali sub-responsabili e fornitori tecnologici verranno indicati in un elenco aggiornato reso disponibile al Partner, che potrà opporsi per iscritto, per motivi legittimi, alla nomina di specifici sub-responsabili. L'elenco dei sub-responsabili sarà disponibile in forma aggiornata su richiesta del Partner o mediante link/documento allegato.

10.5 Trasferimenti di dati extra-SEE
Eventuali trasferimenti di dati personali verso Paesi extra UE/SEE avverranno nel pieno rispetto della normativa applicabile, utilizzando garanzie adeguate (quali decisioni di adeguatezza, clausole contrattuali standard o altri strumenti equivalenti).

10.6 Responsabilità delle Parti
Ciascuna Parte risponde dei danni derivanti da trattamenti non conformi alle istruzioni concordate o alla normativa applicabile in materia di protezione dei dati personali. La responsabilità complessiva di Evolution PRO, in relazione alle attività di trattamento svolte in qualità di Responsabile, non potrà eccedere, salvo dolo, colpa grave o violazione di obblighi inderogabili di legge, i corrispettivi versati dal Partner nei 12 mesi precedenti l'evento dannoso.

ARTICOLO 11 - CLAUSOLA DI SALVAGUARDIA E PREVALENZA DELLE CONDIZIONI ECONOMICHE

11.1 Intero accordo tra le Parti
Il presente Contratto rappresenta l'unico, completo e integrale accordo tra le Parti in relazione all'oggetto della collaborazione e sostituisce ogni precedente intesa, proposta o comunicazione scritta o verbale intercorsa tra le stesse in merito ai servizi forniti da Evolution PRO.

11.2 Prevalenza delle condizioni economiche
Le condizioni economiche, la durata e le modalità di pagamento previste nel presente Contratto costituiscono elementi essenziali dell'accordo. Eventuali modifiche o aggiornamenti potranno essere oggetto di nuova negoziazione scritta, nel rispetto del principio di buona fede, equità e trasparenza contrattuale.

11.3 Validità e modifiche
Qualsiasi modifica, integrazione o deroga al presente Contratto dovrà essere concordata per iscritto e sottoscritta da entrambe le Parti. In assenza di tale forma, le modifiche non avranno efficacia né potranno essere invocate da una sola Parte.

11.4 Nullità parziale e sostituzione automatica
Qualora una o più disposizioni del presente Contratto siano dichiarate nulle, illegittime o inefficaci da un'autorità competente, tale invalidità non comporterà la nullità dell'intero Contratto, che continuerà a produrre effetti per le restanti clausole. Le Parti si impegnano, in tal caso, a sostituire la clausola nulla con una nuova pattuizione che rispetti il più possibile la volontà originaria e mantenga l'equilibrio del rapporto.

11.5 Versioni e lingua prevalente
In caso di differenze o contrasto tra più versioni del Contratto (cartacea, digitale o tradotta in altra lingua), fa fede unicamente la versione in lingua italiana, sottoscritta digitalmente o con firma autografa da entrambe le Parti.

11.6 Interpretazione e buona fede
Le clausole del presente Contratto devono essere interpretate secondo i principi di correttezza, buona fede e funzione economico-sociale dell'accordo. Eventuali ambiguità saranno risolte privilegiando un'interpretazione che mantenga l'equilibrio delle prestazioni reciproche.

ARTICOLO 12 - CLAUSOLA DI TUTELA DEL BRAND E RISERVATEZZA POST-CONTRATTUALE

12.1 Proprietà del marchio e degli elementi distintivi
Il Partner riconosce che il nome commerciale "Evolution PRO", il logo, i domini internet, i format grafici, i modelli di funnel, le metodologie operative, i testi e le procedure di marketing utilizzate da Evolution PRO costituiscono proprietà esclusiva di quest'ultima e sono tutelati dalle leggi in materia di diritto d'autore, marchi e segreti commerciali. Il Partner non potrà utilizzare, copiare, riprodurre o divulgare tali elementi, in tutto o in parte, senza previa autorizzazione scritta di Evolution PRO.

12.2 Divieti e obblighi alla cessazione del Contratto
Alla cessazione del Contratto, per qualsiasi causa, il Partner si impegna a:
- non presentarsi o qualificarsi pubblicamente come collaboratore, affiliato, partner o rappresentante di Evolution PRO
- rimuovere da siti web, social, piattaforme e materiali promozionali ogni riferimento al marchio, logo o contenuti riconducibili a Evolution PRO, salvo i meri riferimenti curricolari all'esperienza passata
- non utilizzare o diffondere per finalità commerciali, formative o promozionali il marchio, il nome commerciale, i format proprietari e gli elementi distintivi riconducibili a Evolution PRO, salvo accordo scritto con l'Agenzia
- non riutilizzare documenti, template, script, funnel, naming, elementi distintivi, sequenze o materiali proprietari di Evolution PRO in modo sostanzialmente identico o riconducibile

12.3 Durata della tutela post-contrattuale
Gli obblighi previsti dal presente articolo resteranno validi per un periodo di novanta (90) giorni successivi alla cessazione del Contratto, salvo rinnovo o proroga della collaborazione. Decorso tale termine, il Partner potrà riutilizzare materiali e strategie esclusivamente se rielaborati autonomamente e privi di riferimenti identificabili a Evolution PRO.

12.4 Divieto di concorrenza sleale
È vietato al Partner porre in essere condotte concretamente idonee a generare confusione sul mercato circa l'origine imprenditoriale dei servizi o a sfruttare parassitariamente, in modo riconoscibile, gli asset proprietari di Evolution PRO. Ogni violazione sarà considerata atto di concorrenza sleale ai sensi della normativa applicabile. Resta in ogni caso esclusa ogni limitazione all'utilizzo delle competenze professionali generali acquisite dal Partner, purché non venga riprodotto o imitato in modo riconoscibile il modello, il format o l'identità operativa di Evolution PRO.

12.5 Penale e risarcimento
In caso di violazione grave e documentata del presente articolo, il Partner sarà tenuto a corrispondere una penale di € 2.500 (duemilacinquecento/00), per ciascuna violazione autonoma, fatto salvo il maggior danno. Resta ferma la facoltà del giudice di ridurre la penale ove ne accerti la manifesta eccessività, nei limiti consentiti dalla legge.

12.6 Clausola di equilibrio e proporzionalità
Le Parti riconoscono che le presenti restrizioni sono necessarie e proporzionate per la tutela del know-how, della reputazione e degli investimenti di Evolution PRO, e che non limitano indebitamente la libertà professionale del Partner, il quale potrà comunque utilizzare le proprie competenze e conoscenze acquisite per progetti differenti e autonomi, purché non concorrenti.

ARTICOLO 13 - COMUNICAZIONI E NOTIFICHE

13.1 Mezzi di comunicazione ammessi
Tutte le comunicazioni, notifiche, diffide o richieste relative all'interpretazione, esecuzione o cessazione del presente Contratto dovranno essere effettuate per iscritto e saranno considerate valide solo se inviate tramite uno dei seguenti mezzi:
- Posta Elettronica Certificata (PEC)
- Raccomandata con Avviso di Ricevimento (A/R)
- piattaforma di firma digitale o gestionale condiviso, purché il Partner vi abbia accesso e le comunicazioni risultino tracciabili e scaricabili
- e-mail ordinaria con conferma di lettura, solo per comunicazioni non formali e prive di valore legale

13.2 Obbligo di PEC per le Parti
Le Parti si impegnano a comunicare reciprocamente un indirizzo PEC alla sottoscrizione del presente Contratto. Tale indirizzo sarà utilizzato come canale ufficiale per tutte le comunicazioni formali, comprese diffide e risoluzioni.

13.3 Validità delle comunicazioni
Le comunicazioni inviate tramite PEC o Raccomandata A/R si considerano ricevute alla data di consegna risultante dalla ricevuta o conferma di consegna. Le comunicazioni inviate tramite e-mail ordinaria si considerano ricevute solo con conferma scritta di lettura o riscontro da parte del destinatario.

13.4 Aggiornamento dei recapiti
Ciascuna Parte si impegna a comunicare entro quindici (15) giorni lavorativi ogni variazione dei propri indirizzi PEC, e-mail o domicilio fisico. In assenza di tale aggiornamento, le notifiche effettuate agli indirizzi originari si considereranno validamente eseguite a tutti gli effetti di legge.

ARTICOLO 14 - FORO COMPETENTE E LEGGE APPLICABILE

14.1 Legge applicabile
Il presente Contratto è regolato, interpretato ed eseguito in conformità alla legge italiana, anche qualora una delle Parti abbia sede legale o residenza al di fuori del territorio nazionale.

14.2 Tentativo di composizione bonaria
Prima di intraprendere qualsiasi azione giudiziaria, le Parti si impegnano a tentare una composizione amichevole della controversia, mediante scambio di comunicazioni scritte o convocazione di un incontro (anche da remoto) entro quindici (15) giorni dalla segnalazione del problema.

14.3 Foro competente esclusivo
Per ogni controversia relativa all'interpretazione, validità, esecuzione o risoluzione del presente Contratto, le Parti convengono espressamente che sarà competente in via esclusiva il Foro di Torino (Italia), con esclusione di qualsiasi altro foro alternativo, concorrente o estero.

14.4 Validità delle altre disposizioni
L'eventuale nullità o inefficacia di singole clausole non pregiudica la validità e l'efficacia delle restanti previsioni del Contratto, che continueranno a produrre i loro effetti.

ARTICOLO 15 - CLAUSOLA FINALE

15.1 Entrata in vigore e durata effettiva
Il presente Contratto entra in vigore alla data della sua sottoscrizione da parte di entrambe le Parti e produce effetti immediati. La durata, le condizioni economiche e gli obblighi reciproci decorrono dalla stessa data, salvo diversa indicazione scritta concordata tra le Parti.

15.2 Modalità di sottoscrizione
Il Contratto può essere sottoscritto:
- in forma elettronica, mediante firma digitale qualificata, firma elettronica avanzata o tramite piattaforme di firma elettronica riconosciute
- in forma autografa, su documento cartaceo in originale
Entrambe le modalità producono pieno valore legale e probatorio secondo la normativa applicabile.

15.3 Copia autentica e valore probatorio
In caso di sottoscrizione digitale, il documento in formato PDF firmato elettronicamente costituirà l'unica copia autentica avente valore legale e probatorio. Eventuali copie stampate o riproduzioni cartacee avranno valore di copia di cortesia e non di originale.

15.4 Dichiarazione di lettura e approvazione consapevole
Il Partner dichiara di aver letto attentamente e compreso integralmente tutte le clausole contrattuali, confermando di averne ricevuto copia. Dichiara inoltre di essere stato informato in modo chiaro circa:
- la durata minima vincolante del rapporto
- le modalità di pagamento e le ipotesi in cui non è previsto rimborso
- le limitazioni di responsabilità
- la tutela del marchio e la riservatezza post-contrattuale
- la scelta del foro competente
Il Partner dichiara di disporre del tempo, delle risorse organizzative e delle competenze digitali minime necessarie per partecipare attivamente al Programma Operativo. Eventuali difficoltà personali, organizzative o professionali del Partner non costituiranno di per sé motivo automatico di sospensione, proroga o revisione economica, salvo diverso accordo scritto tra le Parti o quanto previsto dalla legge.

ARTICOLO 16 - CLAUSOLE VESSATORIE - APPROVAZIONE SPECIFICA (artt. 1341 e 1342 c.c.)

Ai sensi e per gli effetti degli articoli 1341 e 1342 del Codice Civile, il Partner dichiara di aver letto attentamente e di approvare specificamente le seguenti clausole:
- art. 1.4 esclusiva
- art. 2.6 recesso Evolution PRO
- art. 2.7 clausola risolutiva espressa
- art. 3 sospensione/risoluzione per inattività
- art. 5 decadenza dilazione e disciplina rimborsi
- art. 6.5 penale riservatezza
- art. 7 limitazioni di responsabilità
- art. 12 tutela brand e penale
- art. 14.3 foro esclusivo

ARTICOLO 17 – ACCETTAZIONE CONSAPEVOLE DEL MODELLO

Il Partner dichiara di aver compreso e accettato che:
- la Partnership ha natura di collaborazione strategica e operativa e non costituisce prestazione di risultato
- il successo economico del progetto dipende da molteplici fattori non controllabili da Evolution PRO
- il corrispettivo iniziale remunera l'accesso al sistema, al know-how e alle attività operative, indipendentemente dai risultati economici
- eventuali contestazioni relative a performance, vendite o risultati non costituiscono inadempimento contrattuale"""


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
async def get_contract_pdf(partner_id: str):
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
    if existing:
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
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "contract_params": 1})
    params = DEFAULT_CONTRACT_PARAMS.copy()
    if partner and partner.get("contract_params"):
        params.update({k: v for k, v in partner["contract_params"].items() if v is not None})

    # Controlla se esiste un PDF custom per questo partner
    custom = await db.contract_custom_pdf.find_one({"partner_id": partner_id}, {"_id": 0})
    custom_pdf_url = custom.get("pdf_url") if custom else None

    return {
        "contract_text": render_contract_text(params),
        "params": params,
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
    Genera PDF del contratto firmato con layout professionale.
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
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
            rightMargin=2.5*cm, leftMargin=2.5*cm, topMargin=2.5*cm, bottomMargin=2.5*cm)
        
        styles = getSampleStyleSheet()
        style_titolo = ParagraphStyle('Titolo', parent=styles['Heading1'],
            fontSize=16, spaceAfter=6, spaceBefore=0,
            textColor=colors.HexColor('#1a1a2e'), alignment=TA_CENTER)
        style_sottotitolo = ParagraphStyle('Sottotitolo', parent=styles['Normal'],
            fontSize=10, spaceAfter=20, alignment=TA_CENTER,
            textColor=colors.HexColor('#666666'))
        style_articolo = ParagraphStyle('Articolo', parent=styles['Heading2'],
            fontSize=11, spaceBefore=14, spaceAfter=4,
            textColor=colors.HexColor('#1a1a2e'))
        style_testo = ParagraphStyle('Testo', parent=styles['Normal'],
            fontSize=9.5, spaceAfter=6, leading=14, alignment=TA_JUSTIFY)
        style_footer = ParagraphStyle('Footer', parent=styles['Normal'],
            fontSize=8, textColor=colors.HexColor('#999999'), alignment=TA_CENTER)
        
        story = []
        
        # INTESTAZIONE
        story.append(Paragraph("EVOLUTION PRO", style_titolo))
        story.append(Paragraph("Contratto di Partnership", style_sottotitolo))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1a1a2e')))
        story.append(Spacer(1, 0.4*cm))
        
        # TABELLA DATI CONTRATTO
        signed_at = contract_data.get('signed_at', '')
        try:
            data_firma_fmt = datetime.fromisoformat(signed_at).strftime('%d/%m/%Y alle %H:%M')
        except:
            data_firma_fmt = signed_at
        
        info_data = [
            ['Versione contratto:', contract_data.get('version', 'v1.0')],
            ['Data firma:', data_firma_fmt],
            ['Partner:', partner.get('name', 'N/A')],
            ['Email:', partner.get('email', 'N/A')],
            ['IP Address:', contract_data.get('ip_address', 'N/D')],
        ]
        t = Table(info_data, colWidths=[4*cm, 12*cm])
        t.setStyle(TableStyle([
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0,0), (0,-1), colors.HexColor('#1a1a2e')),
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
        
        # SEZIONE FIRMA
        story.append(Spacer(1, 0.6*cm))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1a1a2e')))
        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph("FIRMA DIGITALE", style_articolo))
        
        firma_info = [
            ["Firmato da:", partner.get('name', 'N/A')],
            ["Data e ora firma:", signed_at],
            ["Indirizzo IP:", contract_data.get('ip_address', 'N/D')],
            ["Metodo:", "Firma digitale tramite piattaforma Evolution PRO"],
        ]
        t_firma = Table(firma_info, colWidths=[4*cm, 12*cm])
        t_firma.setStyle(TableStyle([
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0,0), (0,-1), colors.HexColor('#1a1a2e')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_firma)
        story.append(Spacer(1, 0.3*cm))
        
        # Immagine firma
        try:
            sig_data = contract_data.get('signature_base64', '')
            if sig_data.startswith('data:image'):
                sig_data = sig_data.split(',')[1]
            sig_bytes = base64.b64decode(sig_data)
            sig_buffer = BytesIO(sig_bytes)
            sig_img = RLImage(sig_buffer, width=200, height=80)
            story.append(sig_img)
        except Exception as e:
            logger.warning(f"Impossibile aggiungere firma al PDF: {e}")
            story.append(Paragraph("[Firma digitale applicata]", style_testo))
        
        # FOOTER
        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph(
            "Documento generato automaticamente dalla piattaforma Evolution PRO. "
            "La firma digitale apposta ha valore legale ai sensi del D.Lgs. 82/2005 (CAD).",
            style_footer))
        
        doc.build(story)
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
