# Roadmap Operativa Unica — Ciak / Evolution PRO

Data: 2026-07-09 · Owner documento: Claudio + Claude/Codex · Coordina l'esecuzione: Luca (AD AI)

> Principio guida: **prima la direzione, poi l'implementazione.**
> Regola di questo documento: niente teoria. Ogni riga deve servire a Claudio e a Luca per lavorare già da domani.

---

## 1. Sintesi operativa

### Cosa stiamo costruendo
Ciak / Evolution PRO è il sistema operativo italiano che trasforma la competenza di un professionista (consulente, coach, formatore) in un'**Accademia Digitale vendibile**. Lo strumento di lavoro è il **Metodo EVO** in 3 fasi:

- **Esamina** — brand, storia, posizionamento, direzione.
- **Valida** — masterclass, videocorso, funnel, sistema di vendita, lancio (online in 3/4 settimane).
- **Ottimizza** — parte dopo il go-live e prosegue **fino al 12° mese**; primi risultati di vendita puntati **entro il 6° mese**.

La macchina ha due facce che vanno tenute insieme ma **mai confuse**:

1. **Acquisizione Evolution** = come entrano nuovi partner nel Metodo EVO (funnel di Ciak su se stessa).
2. **Delivery Partner** = come portiamo online i partner già firmati (percorso EVO dentro Ciak).

### Perché ora serve una roadmap unica
Oggi i due fronti vivono in schermate e documenti separati e si accavallano nella testa. Nel frattempo:
- l'**Acquisizione Evolution** è appena stata cablata nel codice (Command Center, ponte Discovery→Systeme, target 3/4) ma la **pipeline lead reale è quasi vuota** (7 lead, 1 solo inbound organico vero);
- la **Delivery** ha 7+ partner attivi con **gap sistematici** (offerta mancante, videocorso a 0 lezioni, funnel Systeme reale solo su 1 partner, incoerenze fase↔dati);
- **Luca** legge e consiglia ma non ha ancora una routine giornaliera che colleghi acquisizione e delivery in un'unica lista di priorità.

Serve un unico piano che dica, ogni giorno: **chi contattare, chi recuperare, quale partner sbloccare, cosa deve vedere Claudio**.

### Perché Evolution è il progetto pilota da duplicare
La promessa di Ciak è più credibile se il sistema viene **usato prima internamente** per acquisire i partner, e solo dopo adattato al mercato del singolo partner.

> Prima applichiamo il Metodo EVO su Evolution. Poi adattiamo lo stesso sistema alla competenza, al mercato e all'offerta del partner.

Quindi: **Acquisizione Evolution è la matrice**; il **Motore Vendite Partner** è la stessa macchina con target, promessa, canale, offerta e KPI adattati. Ciò che resta stabile: metodo, struttura del percorso, disciplina sui follow-up, lettura dei dati, ciclo Esamina/Valida/Ottimizza.

---

## 2. Mappa generale

```text
                          CLAUDIO  (visione · voce · vendita · decisione finale)
                                        │
                          CLAUDE + CODEX  (cervello strategico/operativo · copy · codice · analisi)
                                        │
                              LUCA  (AD AI · coordina · assegna · legge priorità · report)
                                        │
        ┌───────────────┬──────────────┼──────────────┬────────────────┐
     VALENTINA        ANDREA          GAIA           MARCO           MATTEO         STEFANIA · ANTONELLA
   posizionamento   contenuti /     funnel /       vendita /       scoring /       task, scadenze /
   promessa         masterclass     Systeme /      follow-up /     KPI / dati /    contenuti organici,
   mercato          angoli          checkout /     obiezioni /     priorità        riuso materiali
                    editoriali      automazioni    proposta
```

Due motori sopra la stessa struttura:

| | Acquisizione Evolution | Delivery Partner |
|---|---|---|
| Obiettivo | Far entrare 3-4 nuovi partner Metodo EVO/mese | Portare online i partner firmati e ottimizzarli a 12 mesi |
| Proprietà Systeme | Account Systeme **Evolution** | Account Systeme **del partner** |
| Flusso | Contatto → conversazione → masterclass/Ciak → 8 Domande → Blueprint 27€ → call 60' → proposta → ingresso | Firma → Esamina → Valida (online 3/4 sett.) → Ottimizza (fino al 12° mese) |
| Dashboard Ciak | Command Center Acquisizione Evolution | Pipeline Partner (3 fasi EVO) + percorso 14 step |
| Rischio oggi | Pochi lead in ingresso | Gap sugli asset (offerta, videocorso, funnel) |

**Systeme.io** = motore esecutivo (funnel, email, checkout, tag, automazioni, statistiche). **Ciak** = cabina di regia (stato setup, link, KPI, task team, alert, note di ottimizzazione, storico). Ciak governa, Systeme esegue. Il partner resta **proprietario al 100%** del suo account Systeme.

---

## 3. Roadmap 7 giorni — "rendere leggibile e usabile ciò che esiste già"

Nota di realtà: il codice di Acquisizione Evolution (Command Center, ponte Discovery→Systeme, tag EVO, policy, doc setup, test) **è già su `origin/main`**. Questa settimana **non si scrive un nuovo motore**: si accende, si popola e si rende operativo.

### Cosa chiudere subito
- **Verificare che l'Acquisizione Evolution sia live in produzione** (Vercel frontend + backend Cloud Run) e che il Command Center mostri dati reali (target 3/4, routine Luca, ponte Discovery→Systeme, 4 liste di recupero).
- **Creare in Systeme Evolution** i tag e i custom field EVO (checklist già pronta in `docs/marketing/systeme-motore-vendite-setup.md`).
- **Riallineare i messaggi outreach** (già fatto in `docs/marketing/messaggi-outreach-pronti.md`): controllare che siano quelli usati davvero da Claudio/Luca.
- **Accendere la routine giornaliera di Luca**: 20 contatti mirati/giorno + i 4 recuperi (checkout, 8 Domande, Blueprint→call) + report serale.

### Cosa deve vedere Claudio (ogni mattina, in `/admin`)
- **Cabina di Regia** con semaforo 4 reparti (🟢🟡🔴) + chat Luca.
- **Command Center Acquisizione**: gap del mese, 4 liste di recupero, i 20 contatti del giorno.
- Un solo numero-guida per reparto: lead nuovi (Acquisizione), Blueprint/partnership (Vendite), partner che avanzano (Delivery), incassato/MRR (Back office).

### Cosa deve fare Luca
- Ogni mattina: leggere Command Center → dare a Claudio **l'unica mossa ad alta leva del giorno** + i 🔴/🟡.
- Ogni sera: **report serale** (contatti lavorati X/20, risposte, 8 Domande, Blueprint, call fissate; priorità di domani; blocco principale).

### Cosa devono fare gli agenti
- **Valentina**: selezionare i 20 contatti/giorno sui 2 ICP (benessere · business/vendita).
- **Andrea**: 1 contenuto Claudio/giorno con CTA a Ciak Blueprint.
- **Marco**: lavorare i recuperi caldi (checkout cliccato, Blueprint senza call).
- **Matteo**: leggere scoring e dire dove il funnel perde di più.

### Cosa va configurato in Systeme (Evolution)
Tag EVO (`EVO_BLUEPRINT_INVITATO/VISITATO/ACQUISTATO`, `EVO_CALL_PRENOTATA/FATTA`, `EVO_PROPOSTA_INVIATA`, `EVO_CONTRATTO_FIRMATO`, `EVO_NO_EMAIL_COLD`, ecc.) + custom field (`evo_source`, `evo_priority`, `evo_owner`, `evo_next_action`…) + i 7 workflow minimi. **Nessuna email massiva sulla lista fredda 13k.**

---

## 4. Roadmap 14 giorni — "acquisizione attiva + delivery riallineata"

### Acquisizione attiva
- 100 contatti/settimana lavorati davvero, con KPI reali (contatti → risposte → conversazioni qualificate → 8 Domande → Blueprint → call → proposta → ingresso).
- Prima misurazione onesta delle conversioni; correzione di copy, target, hook e follow-up sui numeri.
- Collegare Blueprint / call / proposta ai tag Systeme (chiude il ciclo statistico).

### Delivery partner esistenti riallineata
- **Audit dei 7 partner attivi** dentro l'editor journey: per ciascuno stato reale su Esamina/Valida/Ottimizza, asset presenti, asset mancanti, blocco, prossimo step.
- **Chiudere i gap prioritari**: Offerta (offerName/Price/Includes/Guarantee) mancante per quasi tutti; **videocorso a 0 lezioni** su tutti; coerenza fase↔dati (Eva e Sara in F5 senza asset da F5).
- **Funnel Systeme**: replicare su almeno 1-2 partner in più il modello già validato su Daniele Andolfi.

### Dashboard operative leggibili
- Command Center Acquisizione + Cabina di Regia + Pipeline Partner devono raccontare la stessa realtà senza doppioni.
- Aggiungere alla vista Delivery una lettura "chi è fermo, da quanto, cosa serve (Claudio/Partner/Team), prossima azione".

### Routine Luca funzionante
- Luca produce ogni sera un report che tiene insieme **acquisizione e delivery** (non due report separati): oggi ho X ingressi verso target, Y partner fermi, Z decisioni per Claudio.

---

## 5. Roadmap 30 giorni — "motore che gira + modello duplicabile"

- **Motore Acquisizione Evolution funzionante**: pipeline leggibile da contatto a contratto firmato; **almeno 3 ingressi/mese**, macchina tarata su **4**; il Command Center mostra il gap verso l'ottimale (non verso il minimo).
- **Primi dati reali**: conversioni per stadio, canale che produce Blueprint, hook migliore/peggiore; decisioni prese sui numeri, non sulle sensazioni.
- **Partner esistenti dentro il percorso EVO**: ogni partner attivo ha fase coerente, offerta completa, almeno le prime lezioni videocorso avviate, funnel Systeme in costruzione, e una fase Ottimizza definita (calendario 90 giorni, live ogni 60, lettura dati).
- **Modello duplicabile**: il Motore Vendite Partner esiste come **checklist installabile** (stessi tag/custom field/workflow, ma nell'account Systeme del partner) e come vista in Ciak con stato setup + KPI + prossima azione. Un nuovo partner non richiede di riprogettare da zero.

Criterio di successo a 30 giorni: **Luca sa ogni giorno chi contattare, chi recuperare e cosa riferire; Claudio ha una pipeline leggibile senza ricostruire i dati a mano; lo stesso schema si può duplicare su un partner.**

---

## 6. Matrice operativa

Priorità: **P0** = questa settimana · **P1** = entro 14 giorni · **P2** = entro 30 giorni.

| Area | Obiettivo | Cosa esiste già | Cosa manca | Prossimo step | Owner | Prio |
|---|---|---|---|---|---|---|
| Acquisizione — Command Center | Pipeline leggibile, target 3/4 | Endpoint `acquisizione-command-center` + pagina `AcquisizioneCommandCenter.jsx` completi (target, routine, canali, ponte Discovery, recuperi) | Verifica che sia live e con dati veri | Aprire `/admin/pipeline`, controllare i numeri in prod | Luca + Claude | P0 |
| Acquisizione — Lead in ingresso | 20 contatti/giorno reali | Liste (13k fredda, 6.9k relazionale, 32 WA attive, 5k rubrica); policy source ammesse | Nessun inbound organico; routine non ancora eseguita a regime | Valentina prepara 20 contatti/giorno; Claudio/Luca inviano | Valentina + Luca | P0 |
| Acquisizione — Systeme Evolution | Tracciare il funnel commerciale | Ponte `discovery_leads → systeme_daily_queue → daily_systeme_import`; tag EVO nel task; doc setup | Tag/custom field/workflow da creare **dentro Systeme** | Eseguire la checklist `systeme-motore-vendite-setup.md` | Gaia | P0 |
| Acquisizione — Contenuti | Generare conversazioni | `messaggi-outreach-pronti.md`, voice-lock Claudio, Swipeeza pronto (off) | Cadenza contenuti non ancora quotidiana | Andrea: 1 contenuto Claudio/giorno con CTA Blueprint | Andrea | P1 |
| Acquisizione — KPI reali | Misurare conversioni | Funnel KPI nel Command Center (Blueprint, call, proposte) | Foglio contatti→risposte→call→close a monte del funnel | Aggiungere tracciamento contatti/risposte (input metrics) | Matteo + Claude | P1 |
| Delivery — Audit partner | Stato reale dei 7 attivi | `AdminPartnerJourneyEditor`, `GET /full-data`, `PATCH /journey`, 14 step + 3 macro-fasi EVO | Vista sintetica "chi è fermo, cosa serve" | Audit uno-per-uno; compilare gap per partner | Stefania + Luca | P0 |
| Delivery — Offerta partner | Offerta completa per ciascuno | Campi hub `offerName/Price/Includes/Guarantee`; API partner-hub | Vuota o parziale per quasi tutti | Valentina + Marco compilano offerta per i 7 partner | Valentina + Marco | P1 |
| Delivery — Videocorso | Lezioni prodotte | Pipeline video + revisione testo stile-Descript (masterclass) | **0 lezioni** per tutti; revisione testo non estesa al videocorso | Avviare prime lezioni; estendere revisione al videocorso | Andrea + Stefania | P1 |
| Delivery — Funnel Systeme partner | Funnel live nel loro account | Workflow "Condividi" Template Master validato su Daniele | Solo 1 partner con funnel reale | Replicare su 1-2 partner in fase Valida | Gaia | P1 |
| Delivery — Fase Ottimizza | Percorso post-lancio 1-12 mesi | Macro-fase `ottimizza` esiste ma `step_ids` vuoti (gestita da OperativoContinuo) | Nessun cruscotto/ritmo esplicito di ottimizzazione | Definire calendario 90gg + live 60gg + lettura dati | Marco + Matteo | P2 |
| Luca AD | Coordinare acquisizione+delivery | `admin_luca.py` (chat, contesto live 4 reparti); Cabina di Regia; departmentRooms | Routine giornaliera azionabile; report unico A+D | Routine "briefing mattina + report sera" agganciata ai dati | Luca + Claude | P1 |
| Systeme KPI → Ciak | Leggere ritorno dati | Snapshot campagne email (task browser); statistiche Systeme | KPI Systeme (opt-in, checkout, revenue) non letti in Ciak | Definire KPI minimi e come leggerli (sessione/API) | Gaia + Matteo | P2 |
| Motore Vendite Partner | Modello duplicabile | Blocco riassuntivo nel Command Center; doc setup con tag/campi partner | Checklist installabile per-partner + vista stato setup | Trasformare la struttura in checklist + vista partner | Claude + Gaia | P2 |

---

## 7. Dashboard da costruire o migliorare

1. **Command Center Acquisizione Evolution** (`/admin/pipeline`) — *esiste, da accendere.* Migliorare: chip "oggi ho fatto X/20 contatti", collegamento diretto ai contatti del giorno, evidenza gap verso l'ottimale (4) non verso il minimo (3).
2. **Dashboard Luca / Cabina di Regia** (`/admin`) — *esiste (CabinaRegia + LucaChat).* Migliorare: report unico che tiene insieme acquisizione e delivery; "unica mossa del giorno"; 🔴 fermi >4h in cima.
3. **Partner Alignment / Delivery Partner** (`/admin/partner` + journey editor) — *esiste, da rendere sintetico.* Aggiungere una vista "audit": per partner → fase EVO, offerta ✓/✗, videocorso n° lezioni, funnel Systeme ✓/✗, blocco, prossima azione, chi deve muoversi (Claudio/Partner/Team).
4. **Motore Vendite Partner** — *da costruire.* Vista per singolo partner: stato setup Systeme, KPI essenziali, prossima azione consigliata; parte dalla checklist duplicabile.
5. **KPI Systeme** — *da costruire (minimale).* Prima iterazione: opt-in, iscrizioni masterclass, checkout visitati, acquisti, revenue, stop/unsub — anche solo come snapshot letto dalla sessione Systeme (come già fatto per le campagne email).

---

## 8. Decisioni tecniche

### Quali endpoint aggiornare (in ordine)
- `GET /api/admin/ciak/acquisizione-command-center` — **già arricchito** (target 3/4, routine, canali, `discovery_engine`, `partner_sales_engine`). Prossima estensione P1: contatti lavorati oggi (input metric) se/quando tracciati.
- `backend/routers/discovery_engine.py` — completare i **metadata operativi** all'accodamento verso Systeme (Task 3 del piano Systeme, se non ancora fatto).
- Nuovo P2: endpoint **Delivery audit** (aggregato per-partner: fase, offerta, n° lezioni, funnel, blocco) per alimentare la vista Alignment senza N chiamate `full-data`.
- Nuovo P2: endpoint **Motore Vendite Partner** (stato setup Systeme + KPI + next action per partner).

### Quali pagine frontend modificare
- `AcquisizioneCommandCenter.jsx` — rifiniture P1 (contatti del giorno, gap ottimale).
- `CiakAdminApp.jsx` / `departmentRooms.js` — **già allineati** ad Acquisizione Evolution; toccare solo se si aggiungono viste.
- `CabinaRegia.jsx` + `LucaChat` — report unico A+D.
- Nuova pagina **Delivery Audit** (o estensione di `PartnerHub`/pipeline partner).
- `LeadManager.jsx` — copy safety (Approva = promuovere nel motore, non inviare email massive) se non già applicato.

### Quali dati esporre
- Input metrics di acquisizione (contatti, risposte) oltre agli output (Blueprint, call).
- Per partner: offerta completa (4 campi), n° lezioni videocorso, presenza funnel Systeme, fase coerente.
- KPI Systeme minimi in lettura.

### Cosa fare prima
1. **Verifica live** Acquisizione Evolution (nessuna riga di codice, solo controllo prod). 2. **Setup Systeme Evolution** (tag/campi/workflow). 3. **Audit delivery** dei 7 partner. Tutto il resto viene dopo.

### Cosa lasciare fuori scope (per ora)
- Email massive/drip sulla lista fredda 13k.
- Campagne ads complete.
- Nuovo motore CRM parallelo o refactor generale dell'admin.
- **Modifica del system prompt di Matteo** (vincolo fisso).
- Automazioni WhatsApp aggressive.

---

## 9. Piano di implementazione successivo

### Step backend
1. Verificare che i piani 07-09 siano deployati su Cloud Run (endpoint acquisizione con `discovery_engine` e `partner_sales_engine`).
2. Completare i metadata di `discovery_engine.py` all'accodamento Systeme (se residuo).
3. (P2) Endpoint aggregato **Delivery audit** per-partner.

### Step frontend
1. Rifiniture Command Center (contatti del giorno, gap ottimale).
2. Report unico A+D in Cabina di Regia.
3. (P2) Vista Delivery Audit + vista Motore Vendite Partner.

### Step documentazione
1. Questo file (`docs/strategy/roadmap-operativa-ciak-evolution.md`) come fonte di verità della roadmap.
2. Tenere aggiornati `systeme-motore-vendite-setup.md` (man mano che i tag/workflow entrano in Systeme) e l'audit partner.

### Test minimi
- `backend/tests/test_acquisition_policy.py` deve restare verde (source ammesse/escluse, tag mapping).
- `python -m py_compile backend/routers/ciak_admin.py` e `discovery_engine.py`.
- `npm run build` del frontend senza nuovi errori di compilazione (i warning hook esistenti sono tollerati).
- Verifica manuale in prod: Command Center carica dati reali; Cabina di Regia mostra il semaforo.

### Commit consigliati
- `docs: roadmap operativa unica Ciak/Evolution` (questo file).
- `feat: contatti lavorati oggi nel command center acquisizione` (quando si aggiunge l'input metric).
- `feat: delivery audit endpoint + vista alignment partner`.
- `docs: aggiorna setup Systeme con tag/workflow creati`.

> ⚠️ **Deploy**: il backend **non** si deploya in automatico da GitHub (nessun trigger Cloud Build). Serve `gcloud run deploy evolution-pro-backend --source ./backend` **dopo** `git fetch && git reset --hard origin/main` (la working tree locale è indietro). Il frontend si deploya da solo via Vercel su push a `main`. I commit su `main` passano dal connettore GitHub, non dal sandbox (senza credenziali push).

---

## Nota di allineamento (self-review)

Vedi in fondo alla conversazione: contraddizioni segnalate, cosa è già pronto, cosa manca, e il primo blocco proposto.
