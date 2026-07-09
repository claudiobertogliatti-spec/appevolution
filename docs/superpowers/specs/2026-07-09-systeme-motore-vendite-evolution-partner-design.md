# Blueprint Systeme - Motore Vendite Evolution e Partner

Data: 2026-07-09

## Sintesi

Systeme.io diventa il motore operativo dei funnel, dei contatti, delle automazioni e delle statistiche commerciali.

La struttura deve restare duplicabile, ma con due proprieta' separate:

- Motore Vendite Evolution: vive nell'account Systeme di Evolution e serve ad acquisire nuovi partner Metodo EVO.
- Motore Vendite Partner: vive nell'account Systeme del singolo partner e serve a vendere la sua Accademia Digitale, videocorso o prodotto digitale.

Ciak non sostituisce Systeme. Ciak governa, legge e migliora il sistema. Systeme esegue funnel, email, checkout, tag, automazioni e statistiche operative.

## Principio Di Proprieta'

Il partner deve restare proprietario del prodotto finito.

Per ogni partner:

```text
Account Systeme partner
-> funnel
-> pagine
-> email
-> automazioni
-> checkout
-> contatti
-> statistiche
```

Ciak tiene il livello di governo:

```text
Ciak
-> stato setup
-> link funnel
-> KPI principali
-> task team Evolution
-> alert
-> note di ottimizzazione
-> storico decisioni
```

Questa distinzione va comunicata in modo semplice:

> Costruiamo il tuo sistema dentro il tuo account Systeme.io. Tu ne resti proprietario al 100%. Ciak lo governa, lo misura e lo ottimizza con te per 12 mesi.

## Approccio Scelto

Sono stati valutati tre approcci.

### Approccio A - Tutto nell'account Evolution

Vantaggio: controllo totale e setup piu' rapido.

Limite: il partner non possiede davvero il sistema e il modello non rispetta la promessa di autonomia.

Decisione: scartato per il Motore Vendite Partner.

### Approccio B - Ogni partner nel proprio account Systeme, senza modello standard

Vantaggio: massima proprieta' per il partner.

Limite: ogni setup diventa artigianale, difficile da misurare e difficile da migliorare in scala.

Decisione: scartato come modello principale.

### Approccio C - Modello standard replicabile, installato nell'account del proprietario

Vantaggio: Evolution testa il modello su se stessa, poi lo replica nell'account Systeme del partner mantenendo struttura, tag, custom field e KPI coerenti.

Limite: richiede una checklist di setup precisa.

Decisione: approccio scelto.

## Motore Vendite Evolution

Obiettivo: acquisire nuovi partner Metodo EVO.

Proprieta': account Systeme Evolution.

Ingressi:

- liste gia' analizzate;
- Meta custom audience;
- retargeting;
- contenuti Claudio;
- Ciak Blueprint;
- call di 60 minuti.

Flusso:

```text
Lista / pubblico / traffico
-> contenuto o campagna
-> Ciak Blueprint
-> risposta alle domande
-> call 60 minuti
-> proposta Metodo EVO
-> firma contratto
```

Tag Evolution:

```text
EVO_LISTA_FREDDA_META
EVO_LISTA_WA_RELAZIONALE
EVO_WA_CHAT_ATTIVA
EVO_RUBRICA
EVO_NOME_COMPLETO
EVO_PRIORITY_0
EVO_PRIORITY_1
EVO_NO_EMAIL_COLD
EVO_BLUEPRINT_INVITATO
EVO_BLUEPRINT_VISITATO
EVO_BLUEPRINT_ACQUISTATO
EVO_CALL_PRENOTATA
EVO_CALL_FATTA
EVO_PROPOSTA_INVIATA
EVO_CONTRATTO_FIRMATO
EVO_NON_INTERESSATO
```

Custom field Evolution:

```text
evo_source
evo_lista
evo_priority
evo_phone_norm
evo_wa_status
evo_import_batch
evo_owner
evo_last_touch
evo_next_action
evo_note_operativa
utm_source
utm_campaign
utm_content
```

Regole liste:

- lista 13.284: solo custom audience Meta, analisi segmenti e retargeting; no email massive;
- lista 6.924: lista relazionale, usabile anche per micro-contatto manuale;
- 32 chat WhatsApp attive: priorita' 0, messaggio personale Claudio o Luca;
- 5.069 contatti con rubrica e nome completo: priorita' 1, micro-lotti manuali da 20-30 al giorno.

## Motore Vendite Partner

Obiettivo: vendere l'Accademia Digitale, videocorso o prodotto digitale del partner.

Proprieta': account Systeme del partner.

Il sistema non deve dipendere dal fatto che il partner abbia gia' una lista.

Ingressi possibili:

```text
Asset esistenti
-> lista email
-> WhatsApp
-> ex clienti
-> community
-> contatti LinkedIn

Traffico nuovo
-> Meta Ads
-> organico
-> referral
-> collaborazioni
-> contenuti

Traffico governato da Ciak
-> masterclass
-> lead magnet
-> diagnosi
-> call
```

Modalita' operative:

### Partner Con Lista

```text
audit lista
-> segmentazione
-> import controllato in Systeme partner
-> riscaldamento
-> invito a masterclass / diagnosi
-> call o vendita
```

### Partner Senza Lista

```text
posizionamento
-> offerta
-> asset di ingresso
-> traffico nuovo
-> raccolta lead in Systeme partner
-> nurturing
-> call o vendita
```

Tag Partner standard:

```text
PARTNER_LEAD_NUOVO
PARTNER_LEAD_DA_LISTA
PARTNER_LEAD_DA_META
PARTNER_LEAD_DA_ORGANICO
PARTNER_MASTERCLASS_ISCRITTO
PARTNER_MASTERCLASS_VISTA
PARTNER_DIAGNOSI_COMPLETATA
PARTNER_CALL_PRENOTATA
PARTNER_CALL_FATTA
PARTNER_CHECKOUT_VISITATO
PARTNER_ACQUISTO_CORSO
PARTNER_UPSELL_VISITATO
PARTNER_UPSELL_ACQUISTATO
PARTNER_NON_INTERESSATO
```

Custom field Partner standard:

```text
partner_id
partner_source
partner_lead_temperature
partner_offer
partner_campaign
partner_phone_norm
partner_owner
partner_last_touch
partner_next_action
partner_note_operativa
utm_source
utm_campaign
utm_content
```

## Workflow Minimi Systeme

### Evolution

Workflow minimi:

1. nuovo interessato Blueprint;
2. Blueprint acquistato;
3. Blueprint acquistato ma call non prenotata;
4. call prenotata;
5. proposta inviata;
6. contratto firmato;
7. stop comunicazioni commerciali.

### Partner

Workflow minimi:

1. nuovo lead masterclass / lead magnet;
2. iscritto ma non ha visto;
3. visto ma non ha comprato;
4. checkout visitato ma non acquistato;
5. acquisto corso;
6. richiesta call;
7. stop comunicazioni commerciali.

Le automazioni devono essere brevi, leggibili e collegate a tag chiari. Niente sequenze lunghe prima di avere dati reali.

## Statistiche

Systeme deve misurare:

- contatti creati;
- origine contatto;
- tag applicati;
- aperture email;
- click;
- iscrizioni masterclass;
- checkout visitati;
- acquisti;
- revenue;
- unsubscribed / stop.

Ciak deve leggere e mostrare:

- stato setup Systeme;
- KPI essenziali;
- gap rispetto al target;
- prossima azione consigliata;
- alert quando un punto del funnel perde conversione;
- report settimanale per Luca e Claudio.

## Ruoli Operativi

Claudio:

- decide voce, priorita' commerciali e relazione diretta sui contatti piu' caldi.

Claude + Codex:

- progettano struttura, copy, analisi, automazioni, dashboard e miglioramenti.

Luca:

- coordina il lavoro operativo e trasforma la strategia in task.

Gaia:

- costruisce o verifica funnel, tag, workflow, checkout e tracciamenti Systeme.

Matteo:

- legge dati, KPI, conversioni e priorita'.

Marco:

- gestisce script, obiezioni, follow-up e passaggio a call/proposta.

## Collegamento Al Metodo EVO

Esamina:

- capire se il partner ha lista, pubblico, asset, community o parte da zero;
- capire qual e' il canale piu' credibile per il primo bacino lead.

Valida:

- creare il primo sistema Systeme;
- pubblicare asset essenziali;
- raccogliere primi segnali;
- misurare opt-in, interesse, call o vendite.

Ottimizza:

- leggere dati fino al dodicesimo mese;
- correggere copy, funnel, offerta, follow-up e campagne;
- puntare ai primi risultati di vendita entro il sesto mese.

## Confini

Non si importano liste fredde dentro campagne massive.

Non si automatizza WhatsApp in modo aggressivo.

Non si mescolano i dati Evolution con i dati del partner.

Non si costruisce il sistema del partner dentro l'account Systeme di Evolution, salvo test tecnico temporaneo non destinato alla produzione.

## Prima Implementazione

Ordine consigliato:

1. creare tag e custom field Evolution in Systeme;
2. importare i segmenti Evolution con tag corretti e blocco `EVO_NO_EMAIL_COLD` dove necessario;
3. creare le prime custom audience Meta;
4. collegare Blueprint, call e proposta a tag Systeme;
5. mostrare in Ciak una dashboard Motore Vendite Evolution;
6. trasformare la stessa struttura in checklist installabile per il Motore Vendite Partner;
7. aggiungere in Ciak la vista partner con stato setup Systeme, KPI e prossima azione.

## Criteri Di Successo

Evolution:

- pipeline leggibile da contatto a contratto firmato;
- almeno 3 ingressi Metodo EVO al mese;
- target operativo impostato su 4 ingressi Metodo EVO al mese;
- report settimanale Luca basato su dati reali.

Partner:

- account Systeme proprietario configurato;
- funnel e automazioni essenziali live entro la fase Valida;
- KPI visibili in Ciak;
- primo ciclo di ottimizzazione attivo;
- primi risultati di vendita puntati entro il sesto mese.
