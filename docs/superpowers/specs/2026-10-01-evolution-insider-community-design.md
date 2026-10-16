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

Il funnel gratuito ha questi stati (`services/ciak_state_machine.py`): `lead_created → ciak_started → ciak_completed → report_generated → call_booked → call_done`. Il Blueprint si consegna **dopo** la call. Non esiste uno stato di «decisione negativa».
Tre percorsi, una sola volta per persona. Si invita quando la data di riferimento è passata:

| # | Chi | Data di riferimento |
|---|---|---|
| a | `call_done` con proposta scaduta senza pagamento (`db.proposte`) | `scadenza` della proposta |
| b | `call_done` con Blueprint consegnato e nessuna proposta | `consegna_inviata_at` (`ciak_blueprints`) + 7 giorni |
| c | `report_generated` che non ha prenotato la call | data dello stato `report_generated` + 14 giorni |

I 7 e i 14 giorni sono costanti modificabili. Il percorso c copre chi ha compilato il questionario ma non ha mai prenotato: è la popolazione più numerosa di chi non acquista.

**Esclusi sempre:** chi ha **anche una sola** sessione in `call_booked`; chi ha acquistato o sta pagando (`start_purchased_at`, `access_level` in `cliente_start`/`partner`, `partnership_attiva`, proposta con `pagamento_completato` vero o in stato `pagamento_completato`, `contratto_firmato`, `pagamento_in_attesa_verifica`, `finalizzazione_in_corso`: la pagina può segnare «scaduta» una proposta già pagata, quindi non ci si fida dello stato da solo); i partner (`db.partners`); email non valide; chi è già stato invitato. Se la lettura di clienti, proposte o partner raggiunge il limite, il giro si ferma senza inviare.
Chi è già iscritto alla newsletter di Systeme da altra fonte (masterclass, report del blog) non viene escluso: riceve lo stesso invito, perché l'iscrizione a Insider è un consenso distinto.

## Flusso

1. **Controllo giornaliero (backend):** individua i candidati e applica su Systeme il tag `insider_invito` con `ciak_emit_event`. Ogni invito è registrato in `insider_invites` (email unica), così nessuno viene invitato due volte. Il controllo è spento finché `INSIDER_INVITES_ENABLED` non vale `1`: spento, fa solo la conta dei candidati. Il tetto è **giornaliero** e si legge dal registro: di default 10 inviti al giorno, alzabile con `INSIDER_INVITES_MAX_PER_RUN` fino a un massimo assoluto di 25 (0 = non invia). Si invitano solo contatti con data di riferimento entro 180 giorni (`INSIDER_INVITES_MAX_AGE_DAYS`), **dai più recenti**.
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

## Verificato nella fase di piano

- «Decisione negativa»: non esiste nel funnel Blueprint (vedi sopra). Il percorso è stato sostituito dal c.
- Indicatori di acquisto: `ciak_clients.start_purchased_at`, `ciak_clients.access_level` (`cliente_start`, `partner`), `partnership_attiva`, `db.proposte.stato`.
- Campi: `diagnostic_sessions.user_email` (anche in maiuscolo: va normalizzato), `current_state`, `state_history[{state, timestamp}]`; `ciak_blueprints.consegna_inviata_at`; `db.proposte.prospect_email`, `scadenza`, `stato`.
- Schema dei lavori giornalieri: servizio + endpoint con chiave report + job dello scheduler (come il promemoria del bonus 48h).

## Ancora da verificare

- Quanti contatti rientrano oggi nei tre percorsi (si legge con la conta a secco, dopo il rilascio).
- Se la pagina d'iscrizione con consenso si può costruire con gli strumenti a disposizione o va fatta da interfaccia.

## Collaudo

Su un contatto di prova, come per ogni funzione Ciak: invito, iscrizione, benvenuto, newsletter, uscita per acquisto, disiscrizione. Con dati sporchi (email in maiuscolo, contatti duplicati).
