# Journey EVO F-1–F-20 — Design

Data: 2026-08-12

Stato: approvato in conversazione, in attesa di revisione del documento versionato

Ambito: area partner Ciak, Home reale e demo, Percorso, documenti, video, lancio e passaggio a Ottimizza

## 1. Obiettivo

Portare Ciak a un'unica sequenza canonica di venti passaggi, nominati `F-1`…`F-20`, raggruppati esclusivamente nelle tre macro-fasi del Metodo EVO:

- **ESAMINA:** F-1 → F-7;
- **VALIDA:** F-8 → F-19;
- **OTTIMIZZA:** F-20.

La definizione backend è l'unica fonte di verità. Home, demo, Percorso, avanzamento, agenti, certificati, archivio materiali e dispensa non mantengono copie indipendenti della sequenza.

## 2. Principi non negoziabili

1. Le priorità si implementano nell'ordine approvato:
   1. protezione documenti;
   2. journey F-1 → F-20 e tre macro-fasi;
   3. approvazione video obbligatoria;
   4. readiness sistema di vendita e lancio;
   5. certificato e Workbook versionati.
2. Nessun partner perde stati, dati, date o materiali esistenti.
3. Uno step non diventa `done` per una semplice dichiarazione quando esiste un controllo tecnico possibile.
4. Ogni errore lascia lo step aperto, registra una motivazione leggibile e consente la ripresa.
5. Il partner non vede quattro fasi: Andrea, Gaia e Marco collaborano dentro **VALIDA**; Marco diventa agente della macro-fase **OTTIMIZZA** soltanto a F-20.
6. `partner_journey_steps` resta la fonte di verità; `partners.phase` resta una proiezione legacy/derivata.

## 3. Sequenza canonica

| Codice | ID tecnico | Macro-fase | Passaggio | Output o condizione obbligatoria | Responsabile prevalente |
|---|---|---|---|---|---|
| F-1 | `02-discovery-video` | Esamina | Video di benvenuto e visione | presa visione registrata | Stefania/Claudio |
| F-2 | `01-contratto` | Esamina | Contratto e distinta d'ingresso | contratto e dati di ingresso associati | Team Ciak |
| F-3 | `burocrazia` | Esamina | Dati burocratici e aziendali | anagrafica fiscale persistita | Stefania |
| F-4 | `03-brand-kit` | Esamina | Brand Kit | palette, font, identità e materiale registrato | Valentina |
| F-5 | `la-tua-storia` | Esamina | Storia e missione | storia salvata e validata | Valentina |
| F-6 | `obiettivo` | Esamina | Obiettivo del progetto | obiettivo misurabile salvato | Valentina |
| F-7 | `04-posizionamento` | Esamina | Posizionamento strategico | posizionamento approvato e documento disponibile | Valentina |
| F-8 | `05-script-masterclass` | Valida | Script Masterclass | script strutturato e approvato | Andrea |
| F-9 | `06-outline-lezioni` | Valida | Outline videocorso | corso, moduli e lezioni definiti | Andrea |
| F-10 | `07-script-videolezioni` | Valida | Script videolezioni | copertura degli script per tutte le lezioni previste | Andrea |
| F-11 | `08-registra-masterclass` | Valida | Masterclass definitiva | editing terminato e versione corrente approvata dal partner | Andrea/team video |
| F-12 | `09-registra-lezioni` | Valida | Lezioni definitive | tutte le lezioni dell'outline montate e approvate | Andrea/team video |
| F-13 | `10-sistema-vendita` | Valida | Sistema di vendita | subaccount/corso, URL pubblico, legal, funnel e checkout verificati | Gaia |
| F-14 | `11-calendario-30gg` | Valida | Calendario lancio | piano 30 giorni persistito | Marco |
| F-15 | `12-prezzo-webinar` | Valida | Prezzo e webinar | offerta/prezzo coerenti e strategia live persistita | Marco |
| F-16 | `launch-readiness` | Valida | Gate tecnico pre-lancio | tutti i controlli tecnici e operativi verdi | Marco/team |
| F-17 | `13-lancio` | Valida | Lancio effettivo | attivazione canonica riuscita, URL live e timestamp verificati | Marco |
| F-18 | `valida-certificate` | Valida | Certificato Valida | PDF generato, archiviato e registrato | Sistema |
| F-19 | `final-workbook` | Valida | Workbook finale | PDF versionato, archiviato e registrato | Sistema |
| F-20 | `ottimizzazione-continua` | Ottimizza | Dati e miglioramento continuo | workspace post-lancio aperto dopo F-18 e F-19 | Marco |

## 4. Modello canonico

Ogni definizione di step espone almeno:

```python
{
    "code": "F-11",
    "step_id": "08-registra-masterclass",
    "step_number": 11,
    "macro_phase": "valida",
    "label": "Masterclass definitiva",
    "owner": "ANDREA",
    "completion_policy": "masterclass_current_version_approved",
    "material_categories": ["masterclass_video"],
}
```

Le UI ricevono `code`, `label`, `macro_phase`, proprietario e stato dall'API. Le copie frontend possono contenere solo testi presentazionali non canonici; non possono ridefinire numero, appartenenza o ordine.

## 5. Priorità 1 — protezione documenti

Tutti gli endpoint sotto `/api/partner-rewards` richiedono `HTTPBearer` e applicano la stessa guardia partner-or-admin usata dal journey:

- stato premi/dispensa;
- certificati;
- bonus;
- Workbook/libretto.

Regole:

- il partner accede solo al proprio `partner_id`;
- admin e superadmin possono accedere a tutti;
- richiesta anonima → `401`;
- partner diverso → `403`;
- risorsa non sbloccata → `403` senza generazione;
- nessun token in query string o URL persistito.

I componenti frontend scaricano PDF tramite `fetch` autenticato + Blob; non usano `<a href>` nudi sugli endpoint protetti.

## 6. Priorità 2 — migrazione F-1–F-20 e tre macro-fasi

### Migrazione conservativa

La migrazione è idempotente e opera per `partner_id`:

1. aggiorna i metadati dei 15 step esistenti senza cambiare `status`, `data`, `started_at`, `completed_at` o `updated_at` originali;
2. crea F-16, F-18, F-19 e F-20 se mancanti;
3. conserva gli ID tecnici storici dei passaggi già presenti;
4. non marca automaticamente i nuovi step `done` soltanto perché il partner è `LIVE`;
5. per partner storici già live, esegue un backfill verificabile: F-16/F-17 possono essere riconciliati solo da evidenze esistenti; F-18/F-19 vengono prodotti realmente prima di F-20;
6. produce report `would_create`, `would_update`, `blocked`, `unchanged` in dry-run prima dell'applicazione.

### Proiezione legacy

`partners.phase` continua a rappresentare la fase commerciale F1…F7/LIVE, ma non alimenta più la UI del Metodo EVO. Il codice `F-1`…`F-20` non deve essere confuso con il vecchio valore `partners.phase`.

### Correzione Home/demo

I selettori di simulazione mostrano tre macro-fasi:

- Esamina — Valentina;
- Valida — agente operativo dinamico Andrea/Gaia/Marco in base allo step;
- Ottimizza — Marco.

La dicitura “Fase 4” viene eliminata sia dalla Home reale sia dalla demo.

## 7. Priorità 3 — gate video

### F-11 Masterclass

Il caricamento del grezzo salva la consegna ma non completa F-11. La policy richiede:

- pipeline in stato finale revisionabile;
- URL/versione definitiva presente;
- `approved_version == output_version`;
- approvazione effettuata dal partner associato;
- nessuna revisione pendente o in lavorazione.

### F-12 Videocorso

La policy confronta l'outline approvato con le lezioni effettive tramite identificativi stabili. Richiede per ogni lezione prevista:

- output definitivo presente;
- versione corrente approvata dal partner;
- nessuna revisione aperta.

Le lezioni extra non bloccano; una lezione prevista mancante blocca. La modifica dell'outline dopo F-12 riapre il gate se cambia l'insieme delle lezioni richieste.

## 8. Priorità 4 — readiness e lancio

### F-13 Readiness del sistema di vendita

La checkbox del partner resta conferma editoriale, non prova tecnica. La policy restituisce controlli nominati:

- `systeme_account_or_course`;
- `public_sales_url`;
- `domain_or_platform_url`;
- `legal_pages`;
- `checkout`;
- `price_consistency`;
- `access_automation`.

Ogni controllo contiene `status`, `evidence`, `checked_at` e messaggio partner-safe.

### F-16 Gate pre-lancio

Aggrega:

- F-11 e F-12 approvati;
- F-13 pronto;
- F-14 calendario presente;
- F-15 prezzo e webinar coerenti;
- data di lancio;
- checklist operativa del partner.

Il gate è ricalcolabile e non si basa su un booleano manuale isolato.

### F-17 Lancio

F-17 chiama un servizio canonico idempotente `activate_partner_launch`, che:

- rifiuta l'attivazione se F-16 non è verde;
- registra URL live, data, attore e risultato;
- non duplica un lancio già riuscito;
- lascia audit e stato recuperabile in caso di errore;
- completa F-17 soltanto dopo una risposta positiva e una verifica HTTP dell'URL pubblico.

## 9. Priorità 5 — certificato e Workbook

### F-18 Certificato Valida

Il completamento di F-17 accoda una generazione idempotente. Il risultato contiene:

- `document_id`;
- `version`;
- `storage_url` interno/protetto;
- checksum;
- data di generazione;
- snapshot degli step usati;
- stato `generated`, `failed` o `superseded`.

F-18 diventa `done` solo quando il PDF è archiviato e registrato nei materiali.

### F-19 Workbook finale

Il Workbook è uno snapshot delle sezioni disponibili a fine Valida. Ogni rigenerazione crea una versione nuova; la precedente non viene sovrascritta. Il documento include l'indice F-1…F-20 e marca F-20 come fase successiva, non come risultato già ottenuto.

F-19 diventa `done` soltanto dopo archiviazione, registrazione nei materiali e verifica che il PDF sia leggibile e non vuoto.

### Apertura F-20

F-20 passa a `in_progress` soltanto quando F-17, F-18 e F-19 sono `done`. Il fallimento documentale non annulla un lancio riuscito, ma impedisce il falso completamento del percorso di costruzione e resta recuperabile dalla coda admin.

## 10. Stati, errori e concorrenza

- Le generazioni usano claim atomici e chiavi idempotenti `partner_id + step_id + source_version`.
- Retry e callback non possono creare due versioni con lo stesso numero.
- Uno step con errore conserva `last_error_code`, messaggio partner-safe, dettaglio admin, `retry_count` e timestamp.
- L'admin può riprovare ma non può simulare l'OK del partner sui video.
- Una modifica a un output sorgente incrementa `source_version` e invalida solo i gate dipendenti.

## 11. Compatibilità e superfici interessate

Backend:

- modello canonico journey e migrazione;
- completamento step con policy;
- rewards autenticati;
- readiness/lancio;
- documenti versionati e archivio materiali.

Frontend:

- Home reale `GuidedHome`;
- demo `CiakPartnerDashboardDemo`;
- Percorso `MetodoEvoPage`;
- barra avanzamento e mappa;
- workspace video, vendita e lancio;
- materiali, certificati e dispensa.

Le due implementazioni storiche dei certificati convergono su un solo servizio di generazione e una sola regola di sblocco. Gli endpoint legacy autenticati possono restare come alias temporanei, senza logica autonoma.

## 12. Strategia di test

L'implementazione segue TDD, con RED osservato prima di ogni modifica applicativa.

### Sicurezza

- anonimo 401 su tutti gli endpoint rewards;
- partner A 403 sui documenti di B;
- partner A 200 sui propri documenti sbloccati;
- admin 200 sui documenti autorizzati.

### Modello/migrazione

- esattamente 20 definizioni, codici unici F-1…F-20;
- tre sole macro-fasi;
- mapping F-1–F-7, F-8–F-19, F-20;
- dry-run senza scritture;
- secondo run idempotente;
- nessuna perdita di dati/date/status.

### Video

- upload grezzo non completa F-11/F-12;
- approvazione di una versione vecchia non completa;
- revisione pendente blocca;
- tutte le lezioni previste approvate completano F-12;
- lezione prevista mancante blocca.

### Readiness/lancio

- ogni evidenza mancante produce un controllo rosso specifico;
- checkbox da sola non basta;
- doppio lancio è idempotente;
- errore HTTP dell'URL live non completa F-17;
- successo verificato completa una sola volta.

### Documenti

- F-18/F-19 restano aperti se il render o lo storage falliscono;
- retry produce una sola versione logica;
- nuova sorgente produce versione successiva;
- PDF non vuoto, leggibile e registrato;
- F-20 chiuso finché F-18 o F-19 non sono done.

### Frontend e live smoke

- build production;
- Home reale e demo mostrano tre fasi;
- Percorso mostra F-1…F-20 nello stesso ordine dell'API;
- nessuna stringa “Fase 4” nei bundle serviti;
- probe anonimi rewards 401;
- smoke autenticato su partner test autorizzato;
- traffico Cloud Run e deployment Vercel verificati sul commit finale.

## 13. Criteri di accettazione

Il lavoro è concluso solo quando:

1. esiste una sola definizione canonica dei venti passaggi;
2. tutte le superfici mostrano tre macro-fasi e F-1…F-20;
3. i documenti partner non sono accessibili anonimamente o da altri partner;
4. F-11/F-12 richiedono l'approvazione della versione definitiva;
5. F-13/F-16/F-17 usano evidenze reali e lancio canonico;
6. certificato e Workbook sono prodotti, versionati, archiviati e registrati;
7. F-20 si apre solo dopo lancio, certificato e Workbook;
8. migrazione, CI, deploy e smoke live hanno prove registrate nell'handoff.

## 14. Fuori ambito

- cambiare la strategia commerciale o il prezzo della partnership;
- sostituire YouTube o Systeme.io;
- riprogettare la macro-fase Ottimizza oltre l'apertura del workspace F-20;
- modificare i prompt di Matteo;
- inventare contenuti mancanti per partner storici.
