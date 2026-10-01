# Evolution Insider — community per chi non acquista (progetto 1 di 3)

Data: 1/10/2026 · Stato: **disegno da approvare** · Nessuna implementazione avviata.

## Scopo

Dare a chi ha già interagito con noi e non ha acquistato materiali di valore, per approfondire e costruire fiducia verso Evolution PRO. È anche il motore che porta traffico al **blog** e al **canale YouTube**: ogni email settimanale rimanda a un articolo e a un video.

Fuori da questo progetto (avranno un proprio disegno): far crescere il blog (SEO, cadenza, misura) e far crescere YouTube (formato, cadenza, canale).

## Decisioni già prese (Claudio, 1/10/2026)

1. **Nome:** Evolution Insider (lo stesso già usato nella pagina post-call).
2. **Chi entra:** solo chi ha già interagito con noi. Mai la lista fredda da 13k (policy 19/9).
3. **Formato:** biblioteca riservata + **una email a settimana**. Nessuna discussione tra membri, quindi nessuna moderazione.
4. **Quando:** alla scadenza della proposta, senza acquisto.
5. **Come si entra:** una email d'invito, poi iscrizione con clic e **consenso esplicito**. Chi non si iscrive non riceve la newsletter.

## Fatti verificati

- Il questionario e la richiesta del Blueprint **non raccolgono un consenso a ricevere email**. `marketing_consent` in `backend/routers/ciak_leads.py` riguarda i cookie di marketing (Meta Pixel/CAPI), non l'email.
- Systeme risponde e ha già: workflow di Opt-in Masterclass, Checkpoint Stato 1-4, Bought 67, Cold Outreach; campagne "Recupero Analisi Gratuita", "Recap Post-Call" ecc.; l'area membri attiva "Bonus riservati – Analisi Strategica".
- Tag già esistenti da riusare: `community_lead` (mai collegato a una sequenza), `source_blog_report`, `source_masterclass_landing`, `ciak_optin_masterclass`, `call_fatta`, `decisione_negativa`.
- Il backend applica tag su Systeme con `services/ciak_systeme.ciak_emit_event` (contatto + tag + audit in `ciak_systeme_events`).

## Chi viene invitato

Tre percorsi, una sola volta per persona:

| # | Condizione | Data di riferimento |
|---|---|---|
| a | Proposta scaduta senza pagamento (`db.proposte`) | `scadenza` |
| b | Segnata come decisione negativa | data della decisione |
| c | Blueprint consegnato da almeno 7 giorni, senza call prenotata né acquisto | `consegna_inviata_at` (`ciak_blueprints`) |

**Esclusi sempre:** chi ha acquistato Start o Partnership, i partner attivi, chi ha un `lavorazione_manuale` in corso, chi si è già disiscritto.
Chi è già iscritto alla newsletter di Systeme da altra fonte (masterclass, report del blog) non viene escluso: riceve lo stesso invito, perché l'iscrizione a Insider è un consenso distinto.

## Flusso

1. **Controllo giornaliero (backend):** individua i candidati e applica su Systeme il tag `insider_invito` con `ciak_emit_event`. Dopo l'applicazione marca `insider_invitato`, così nessuno viene invitato due volte.
2. **Workflow Systeme "Evolution Insider — Invito"** (trigger: tag `insider_invito`): email d'invito → attesa 3 giorni → se non iscritto, **un** promemoria → fine. Non si insiste.
3. **Iscrizione:** pagina Systeme con casella di consenso e link alla privacy. All'invio: tag `insider_membro`, accesso all'area membri, email di benvenuto con il primo materiale.
4. **Newsletter settimanale** a chi ha `insider_membro`: un articolo del blog, un video, un materiale della biblioteca a rotazione. Link con UTM (`utm_source=insider`).
5. **Uscita:** se compare un tag di acquisto (`ciak_bought_*`, `contratto_firmato`, `partner_attivo`, o il tag Start), la persona esce dalla sequenza. La disiscrizione è sempre disponibile.

## Biblioteca v1 (solo contenuti già esistenti)

- **Parti da qui:** come leggere il tuo Blueprint; la masterclass.
- **Percorso di lettura:** i migliori articoli del blog in ordine, dal più semplice.
- **Strumenti:** modelli ricavati dai contenuti esistenti.
- ⛔ **Non entra** la guida «Come creare un videocorso che vende davvero»: è il bonus reale delle 48 ore su Ciak Start, regalarla a tutti lo renderebbe falso.
- ⛔ Niente casi studio, testimonianze o numeri di guadagno inventati.

## Cosa si costruisce

**Nel repo:** un job giornaliero con la logica di candidatura, test (inclusa la regola «mai due inviti», «mai chi ha acquistato») e la voce nel registro degli eventi.
**Su Systeme (creati disattivati):** tag `insider_invito`, `insider_invitato`, `insider_membro`; workflow Invito; area membri «Evolution Insider»; pagina d'iscrizione con consenso; newsletter settimanale. L'attivazione è un passo separato, dopo l'approvazione.
**Email da scrivere (voce di Claudio, approvate da lui prima di qualsiasi invio):** invito, promemoria, benvenuto, uscita per acquisto, tre numeri settimanali di avvio.

## Misura

Invitati · iscritti (% sugli invitati) · aperture e click per invio · acquisti successivi all'iscrizione (tag). **Nessun obiettivo inventato:** i traguardi si fissano dopo quattro settimane di dati reali.
La misura delle visite al blog e delle visualizzazioni YouTube dipende da strumenti che oggi non ci sono (GA4 mai creato; YouTube Studio solo manuale): entra nei progetti su blog e YouTube.

## Rischi e limiti

- **Consenso:** l'invito è comunque un'email a chi non ha dato consenso esplicito alla newsletter. Va validato da un consulente prima del primo invio. Non è consulenza legale.
- **«Community» su Systeme:** gli strumenti disponibili creano workflow, tag, corsi e newsletter, non una comunità. Si imposta come area membri; eventuali funzioni di comunità si abilitano dall'interfaccia.
- **Volume:** i primi invii a un piccolo lotto, per controllare consegna e tassi prima di aprire.
- **Brevo/SMTP:** non coinvolti. Le email di relazione partono da Systeme (policy 19/9).

## Da verificare nella fase di piano (non ancora controllato)

- Il campo reale che indica la «decisione negativa» e come si scrive.
- Gli indicatori di acquisto da escludere (`access_level`, `partnership_attiva`, tag Systeme) e la loro coerenza.
- Quanti contatti rientrano oggi nei tre percorsi (dimensione del primo lotto).
- Se la pagina d'iscrizione con consenso si può costruire con gli strumenti a disposizione o va fatta da interfaccia.

## Collaudo

Su un contatto di prova, come per ogni funzione Ciak: invito, iscrizione, benvenuto, newsletter, uscita per acquisto, disiscrizione. Con dati sporchi (email in maiuscolo, contatti duplicati).
