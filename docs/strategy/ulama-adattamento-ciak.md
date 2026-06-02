# Adattare le strategie Ulama (Consulenti High Ticket) al percorso Ciak

> Fonte analizzata: corso **Consulenti High Ticket™** (Mik Cosentino / infomarketingX) su `corsi.ulama.io` — 14 moduli, 115 lezioni.
> Obiettivo: portare i *framework* del corso dentro il percorso Partner Done-for-You di Ciak, senza importarne il linguaggio.

---

## 0. Principio guida: si adotta il framework, NON il linguaggio

Il corso Ulama insegna manualmente, in 14 moduli, **la stessa macchina** che Ciak eroga in 7 fasi automatizzate. La strategia è solida e collaudata. Ma il corso è scritto in pieno registro guru/coach-speak (Mindset, Legge d'Attrazione, "potenziale infinito", "supernaturale", "trasforma la tua vita").

Il system prompt di Matteo (`backend/services/ciak_matteo.py`) **vieta esplicitamente** quel registro: tabella termini vietati + coach-speak vietato + parafrasi obbligatoria dei termini guru. Quindi:

- **Estrai**: la logica, la sequenza, gli schemi decisionali, i template.
- **Scarta**: motivazione, spiritualità, superlativi, gergo marketing.
- **Filtra sempre** ogni contenuto importato attraverso la translation table già definita in `ciak_matteo.py` (ROI → il guadagno che porti, funnel → percorso, nicchia → ambito specifico, ecc.).

Regola pratica: se una frase del corso non potrebbe uscire dalla bocca di Matteo o Stefania, va riscritta prima di entrare in qualsiasi prompt o asset Ciak.

---

## 1. Mappatura fase per fase

Ogni fase Ciak (`frontend/src/ciak/partner/stepConfig.js` + `phases/F1–F7`) con: cosa importare dal corso, in quale agente/file vive, cosa tagliare.

### F1 — Posizionamento · agente **Valentina**
**Dal corso: Modulo 3 (Fondamentali) + Modulo 4 (architettura offerta).**

Stato attuale: lo step `Step04Posizionamento.jsx` ha già un wizard a 12 domande che ricalca quasi 1:1 il Modulo 3 (nicchia, momento di vita, livello di consapevolezza, promessa, trasformazione, metodo, prova sociale, origin story, contrarian view, differenza riconoscibile). **Questo è già forte — non rifarlo.**

Cosa aggiungere:
- **Le 4 tipologie di offerta** (M4) come schema di classificazione per Valentina: quando legge le risposte, deve saper inquadrare l'offerta del partner in uno dei 4 archetipi e raccomandare formato + fascia di prezzo coerente. Va nella knowledge base di Valentina, non come nuova domanda al partner.
- **I 10 errori sul prezzo** (M4) come *guardrail* anti-errore quando il team/Marco propone il prezzo. Lista di controllo, non lezione.
- Il "Viaggio dell'Eroe" (M3) è già coperto dal campo `origin_story`. OK così.

Cosa tagliare: tutta la parte "Loki/Anna leggi la mente" va riformulata in linguaggio neutro (profilo del cliente), niente NLP-speak.

### F2 — Funnel Light · agente **Gaia**
**Dal corso: Modulo 5 (optin/VSL di base).**

Importa lo scheletro optin → VSL breve → thank you come template di partenza. Il corso lo fa su Conneqto/Ulama; qui va tradotto sullo stack Ciak (Systeme.io — vedi `services/ciak_systeme.py`). Prendi la *logica del funnel*, scarta i tutorial di tool.

### F3 — Masterclass · agente **Andrea**
**Dal corso: Modulo 5 ("Creare il mini-webinar funnel/VSL") + Modulo 14 (struttura masterclass di Gabbo).**

Questo è uno degli innesti più diretti. Inietta nel prompt di Andrea lo **scheletro di masterclass/webinar** del corso:
hook → promessa → storia (origin) → il problema vero → il meccanismo unico (il metodo del partner) → 3 segreti/contenuti → transizione → offerta → CTA.

Tienilo come struttura riusabile per generare lo script (`05-script-masterclass`), già di competenza di Andrea (`agents.js`).

### F4 — Videocorso · agente **Andrea**
**Dal corso: Modulo 4 ("Creare programma uno-a-tanti & Certifications") + Modulo 10 ("Cosa deve avere il tuo corso").**

Inietta nell'outline generator di Andrea le best practice di struttura: moduli progressivi, una promessa per modulo, "quick win" iniziale, e gli **awards/gamification** (M10) come elementi di completamento. Serve a far sì che il videocorso costruito per il partner abbia retention, non solo contenuto.

### F5 — Funnel di Vendita · agenti **Gaia** + **Marco**
**Dal corso: Modulo 5 (email: sequenza 7 giorni + broadcast) + Modulo 4 (pagina offerta).**

- Importa lo **scheletro della sequenza email a 7 giorni** come template per l'area `09-funnel-asset`.
- Importa la logica della pagina di vendita (promessa → trasformazione → prova → offerta → garanzia → CTA), filtrata dal coach-speak.

### F6 — Lancio · agente **Marco**
**Dal corso: Modulo 5–7 (calendario contenuti, organico, appuntamenti) + Modulo 8 (vendita emozionale) + Modulo 12–14 (ads).**

- `11-calendario-30gg` (Marco): importa la logica di **calendario editoriale** e "ciclo di contenuto + ciclo di vendita" (M5/M6) come scheletro del piano a 30 giorni.
- `13-lancio`: importa la **sequenza di lancio**.
- Ads (M12–14): da attivare in fase di scaling, knowledge di Gaia/Marco. Prendi i workflow (testing manuale, KPI, scaling), scarta i dettagli datati 2023/2024 sull'algoritmo.

### F7 — Ottimizzazione/LIVE
**Dal corso: Modulo 10 (erogazione, testimonianze, tribù) + Modulo 11 (team).**

- Importa il **sistema di raccolta testimonianze** (M10, "oltre 1500 video testimonianze") come SOP ripetibile post-vendita → alimenta `VideoReview.jsx` e la sezione testimonianze.
- "Crea la tua tribù" (M10) → logica community/retention.
- Modulo 11 (team vendita) **non** è materiale partner: Ciak *sostituisce* il bisogno di costruire un team. Tienilo solo come knowledge interna, se mai servirà per i partner che scalano davvero.

### Trasversale — Matteo (Ciak Blueprint)
**Dal corso: Modulo 3 (situazione attuale vs desiderata, livelli di consapevolezza).**

Matteo ha già il suo scoring + state machine (stati 1–4) e un prompt v1.4 maturo. **Non stravolgerlo.** Eventuale arricchimento: la logica "situazione attuale → situazione desiderata" e i livelli di consapevolezza del cliente possono affinare le sezioni 3 ("problema principale") e 7 ("cosa manca davvero") del report — sempre dentro i vincoli stilistici esistenti.

---

## 2. I 3 buchi reali da colmare (massimo valore)

Il percorso Ciak è già completo come spina dorsale. Questi tre pezzi del corso sono però poco presenti nel flusso attuale e valgono molto:

1. **Vendita Emozionale a 6 fasi (Modulo 8)** — È il pezzo più monetizzabile del corso e nel flusso Ciak (`CallBooking → Proposta → Checkout`) la fase di chiusura è oggi sottile. Codifica il framework Connecting → Engagement → Transition → Presenting → Gestione obiezioni → Committing come:
   - uno **script di vendita** asset (per il partner che fa le proprie call, o per il team Ciak);
   - knowledge nel prompt di **Marco**.
   Questo è il consiglio #1.

2. **Da lead freddo a call prenotata (Moduli 6–7)** — Logica di relazione/DM e follow-up ("Picaboo follow-up") per la lead-gen organica del partner. Oggi Ciak è più funnel/ads-oriented; questo copre la parte "umana" dell'acquisizione. Innesto naturale nella pipeline lead admin + come materiale per il partner.

3. **Mindset di esecuzione (Moduli 1–2), riscritto** — NON importare i 17 video motivazionali/spirituali. Ma un breve onboarding mentale orientato all'azione, gestito da Stefania (coordinatrice), riduce il drop-off nelle prime fasi. 3-4 messaggi pratici, zero legge d'attrazione.

---

## 3. Cosa NON fare

- **Non** caricare le 115 lezioni dentro Ciak: Ciak è Done-for-You, non un info-prodotto.
- **Non** importare il modulo Mindset così com'è (registro spirituale incompatibile con il brand).
- **Non** copiare i tutorial Ulama/Conneqto: lo stack Ciak è altro (Systeme.io).
- **Non** toccare il prompt di Matteo senza rispettarne vincoli e termini vietati.

---

## 4. Sequenza operativa consigliata

**Quick wins (alto impatto, basso sforzo):**
1. Scrivere la KB delle **4 tipologie di offerta + 10 errori sul prezzo** → prompt di Valentina/Marco.
2. Scrivere lo **script di vendita a 6 fasi** (Modulo 8) → asset + KB Marco.
3. Inserire lo **scheletro masterclass/webinar** (M5/M14) → prompt di Andrea.
4. Inserire la **sequenza email 7 giorni** (M5) → asset F5.

**Strutturali (dopo):**
5. SOP raccolta testimonianze (M10) → F7 / VideoReview.
6. Calendario editoriale + ciclo contenuto/vendita (M5/M6) → KB Marco per `11-calendario-30gg`.
7. (Opzionale) micro-academy partner-facing: versione condensata e ri-vociata del percorso, perché il partner capisca cosa stiamo costruendo per lui.

---

## 5. Avvertenza brand voice (da ripetere a ogni innesto)

Prima di incollare qualsiasi contenuto del corso in un prompt o asset Ciak, passalo dal filtro:
- niente superlativi assoluti, niente "potente/incredibile/10x";
- frasi brevi (≤ 25 parole, come per Matteo);
- termini tradotti dalla tabella di `ciak_matteo.py`;
- tono diretto, italiano semplice, "senza fuffa".

Il valore di Ciak è proprio questo contrasto: la stessa strategia del mondo high-ticket, ma raccontata e agita senza il rumore guru.

---

# PARTE 2 — Benchmark videocorsi esterni (Drive)

> Nota di metodo: i corsi sono video .mp4 non trascrivibili; analisi basata su struttura, titoli lezione e PDF/workbook allegati.

## 6. Tre videocorsi: Baleni, Giannini, Cavina

**Laura Baleni — PIRATAX** (`drive/folders/1HWCec2McoOu7fC6fBBzm3HFBL6LgGBkz`). Motore di contenuti AI-first: 20 lezioni, per ogni micro-task un tool + prompt scaricabile. Nicchia con ChatGPT, lead magnet/freebie (Canva AI, Scribe), landing, bio (framework C.E.A), hashtag, copy IG + repurposing, DM automation (ManyChat), reel virali, video senza volto (Pictory), traduzione multilingua (Captions), crea-corso (Heights), script YouTube (Vidiq/Veed), long→short, lancio (ClickUp). Front-end: masterclass gratuita "Business Creator".

**Gianluca Giannini — Metodo M.U.V.T.** (`drive/folders/1NwEuA78jwh0V2XyNhAIw0QgB9PA_Yg7u`). Quasi identico a Ciak. Percorso a fasi: Primi Passi (metodo con acronimo, mini-quiz "individua la tua strada", caso studio) → Fase 1 (macro-nicchia, identità professionale, buyer personas, analisi competitor, mappatura nicchia, struttura funnel) → Fasi 2–4 (prodotto, vendita, lancio). Scala di offerte: corso → group coaching ("MUVT con me", max 5) → Done-for-You ("Sono Prompt per Te": prodotto, store Payhip/GHL, sales+checkout+thank you, email automation, grafica, 30gg supporto). Loop recensione→regalo.

**Arianna Cavina — Virality** (`drive/folders/1oEgql3zhqVaTTqDnbvLbzrufbaNvuwP1`). Sistema short-form: struttura hook/retention, 100+ idee (template), recording/editing, transizioni (tutorial), didascalie, hashtag+keyword strategy, quando pubblicare, calendario editoriale (template copia-incolla), "analizza i migliori" (competitor), "analizza e ripeti" (loop), collaborazioni, musica, loop recensione→regalo.

### Insertion prioritarie da questi 3
1. **Workbook + prompt-pack per ogni agente** (da Baleni) — l'idea più potente: ogni agente Ciak consegna asset scaricabili "fai X con questo prompt/tool". Trasforma il DFY in done-with-you percepito.
2. **Traccia "senza volto" + repurposing** (Baleni) → Andrea: percorso video faceless + motore long→short/multilingua.
3. **Sistema short-form di Cavina** dentro F3/F6 + calendario editoriale copia-incolla per `11-calendario-30gg`.
4. **DM automation comment-to-DM** (ManyChat, Baleni) → Gaia: ponte organico→lead (copre il buco organico→appuntamento di Ulama).
5. **Scala di offerte** (Giannini) → ripensare il pricing Ciak a gradini (entry group-coaching sotto il DFY).
6. **Loop recensione→regalo** (Cavina + Giannini) → motore testimonianze sistematico in F7.

## 7. Marketing Programmatico (Giacomo Freddi / Piramid.io) — 5 sett. di 8

`drive/folders/1daLDGQk5oAMHgy4__fnm1CsLVNCvFzLt`. Sistema di acquisizione high-ticket di scuola direct-response (lignaggio Brunson/Dan Kennedy), legato al funnel builder Piramid.io. Framework "Il Marketer Professionista": 8 moduli in 3 fasi (Fondamenta/Mindset/Mercato → Riempi la Tanica/Cashflow/Traffico → Produttività/Evoluzione). Molto pratico, ogni settimana con esercizi, template e fogli di lavoro. È il più completo dei corsi analizzati.

### Framework realmente utili (filtrati dal mindset metafisico delle sett. 1–2, incompatibile col brand)
- **3 obiezioni**: Meccanismo / Interna / Esterna. + segmenta 3-5 gruppi = 80% del mercato, ognuno con le sue 3 obiezioni. (Più concreto del "gestione obiezioni" di Ulama.)
- **5 livelli di consapevolezza** (Schwartz): Non consapevole → Problema → Soluzione → Prodotto → Offerta. Mappa diretta sul campo `livello_consapevolezza` di Step04 e sullo scoring di Matteo.
- **Value ladder / Piramide**: BASE → META' (10x) → CIMA (100x/1000x). Rafforza la "scala di offerte" di Giannini.
- **"Mostra il COSA, non il COME"**: principio di contenuto — indica cosa è giusto/sbagliato, non regalare il how-to. Posizionarsi esperto, vendere in modo naturale.
- **Movie Funnel** (VSL evergreen 30-75 min): Optin → VSL → application "psicologia inversa" → call. + presentazione pre-vendita in 9 punti + script telefonico di vendita in 12 punti.
- **SLO / Self-Liquidating Offer + "Riempi la Tanica" (RTL)**: offerta low-ticket che auto-finanzia la spesa ads → lead-gen gratuita. Due percorsi per budget (Opzione 1 RTL low-budget vs Opzione 2 Movie Funnel diretto).
- **Focus radicale**: Messaggio/Lista/Vendita. PUNTO. (anti-dispersione)
- **Disciplina di processo**: "scrivi tutto su carta, poi la tecnica"; velocità di esecuzione; test iterativo.
- **Ricerca di mercato → contenuto VSL**: la ricerca diventa direttamente lo script della presentazione.

### Insertion prioritarie da Marketing Programmatico
7. **Framework 3 obiezioni + segmentazione 80%** → Valentina (mappa il mercato del partner) + Marco (VSL/vendita) + arricchisce Matteo Blueprint.
8. **5 livelli di consapevolezza** adottati esplicitamente per instradare messaggio/offerta → Step04 + Matteo.
9. **SLO auto-liquidante** in F5/F6 (Gaia/Marco): front offer low-ticket che paga gli ads. Routing per budget = come già fa Matteo per stati.
10. **Movie Funnel + "COSA non COME"** → affina lo script masterclass di Andrea (F3) e la presentazione di vendita.
11. **Script telefonico 12 punti + application psicologia inversa** → completa lo script vendita 6 fasi di Ulama (task implementazione) per la chiusura CallBooking→Proposta→Checkout.

---

# Backlog consolidato — cosa inserire in Ciak (tutte le fonti)

Priorità alta → bassa. Voce brand anti-fuffa sempre applicata.

1. **Script di vendita** (Ulama 6 fasi + Freddi 12 punti + application) → asset + KB Marco. [vedi task #6]
2. **KB offerta/prezzo**: 4 tipologie offerta (Ulama) + value ladder BASE/10x/100x (Freddi/Giannini) + 10 errori sul prezzo → Valentina/Marco.
3. **Framework 3 obiezioni + segmentazione 80%** + 5 livelli di consapevolezza → Valentina + Matteo.
4. **Workbook/prompt-pack per agente** (modello Baleni) → tutti gli agenti.
5. **SLO auto-liquidante + routing per budget** → Gaia/Marco (F5/F6).
6. **Movie Funnel / VSL + "COSA non COME"** → Andrea (F3) e funnel.
7. **Traccia faceless + repurposing long→short/multilingua** → Andrea.
8. **Sistema short-form (Cavina) + calendario editoriale template** → Andrea/Marco (`11-calendario-30gg`).
9. **DM automation comment-to-DM** → Gaia (ponte organico→lead).
10. **Loop recensione→regalo** → F7 (motore testimonianze).
11. **Scala di offerte** (entry group-coaching sotto il DFY) → strategia pricing Ciak.

## 8. Corsi Systeme (`drive/folders/1_gacNQ0oF7ZbxwzAHQy9Q6IqBME_mU7T`)

Quattro corsi base dell'accademia gratuita di Systeme.io (solo video, niente PDF — caratterizzati da struttura/titoli):
- **100€ al Giorno** (Intro + 3 parti): percorso quick-win low-ticket per arrivare a 100€/giorno.
- **Copy che Vende** (Intro → Step1 Ricerca → Step3 Copyscrittura; manca Step2): copywriting in flusso ricerca→scrittura.
- **Lancia Business Online** (Intro → Lancia → Cresci → Scala): arco lancio→crescita→scaling.
- **Lancialo** (Intro → Crea un Corso → Prime Vendite → Raddoppia i Profitti): arco creazione prodotto→prime vendite→profitti.

**Differenza chiave rispetto agli altri corsi**: Ulama e Freddi sono *strategia*; questi sono lo **strato operativo nativo su Systeme.io**, cioè lo stack reale di Ciak (`backend/services/ciak_systeme.py`). Profondità strategica inferiore, ma **rilevanza operativa massima**.

### Insertion da Corsi Systeme
12. **SOP/runbook su Systeme.io** per il team Ciak + KB di Gaia (tech funnel): "Lancia/Cresci/Scala" e "Crea corso→prime vendite→profitti" diventano procedure passo-passo native sullo stack reale. Questo colma il punto debole degli altri piani (Ulama/Freddi insegnano su Conneqto/Piramid.io — qui invece è già Systeme).
13. **Libreria template di copy** (da "Copy che Vende": ricerca→scrittura) → asset per landing/email/sales page di Gaia/Marco.
14. **Conferma rung low-ticket** ("100€ al Giorno"): rafforza l'idea SLO + entry-offer sotto il DFY (#5, #9 del backlog).

## 9. Lead a Catinelle — WIT (`drive/folders/19wO9r3Hr9VcraRuHI5Pd9gE4IKS3MlAa`)

Corso completo di **lead generation a pagamento su Meta/Facebook Ads** (solo video, 2023; caratterizzato da moduli). Struttura: 9 moduli + 5 Golden Bonus.
1. Inizia da qui · 2. Lo step n.1 per campagne eccellenti · 3. Crea la proposta perfetta · 4. Messaggi di marketing magnetici · 5. Stoppa lo scroll e falli cliccare (creatività/hook) · 6. Struttura campagne vincenti (incl. remarketing post-iOS14) · 7. Analisi dati e metriche veramente importanti · 8. Campagne inchiodate, ecco cosa fare (troubleshooting) · 9. Tecniche di scaling · 10–14. Golden Bonus.

**Rilevanza**: è il **playbook ads/scaling mancante**. Ulama lo tratta poco, Freddi lo rimanda alle sett. 6–8 (assenti), i corsi Systeme lo sfiorano. Mappa su F6 Lancio + F7 Ottimizzazione e sugli agenti Gaia/Marco; Ciak ha già i tool meta-ads e la pagina `MetrichePostLancio`. Caveat: tatticamente datato (era post-iOS14 2023); architettura campagne/metriche/scaling restano valide, i dettagli di piattaforma vanno aggiornati.

### Insertion da Lead a Catinelle
15. **KPI/metriche + runbook "campagne inchiodate"** (Mod. 7–8) → KB di Gaia + pagina `MetrichePostLancio`: cosa guardare e cosa fare quando una campagna si blocca. Alto valore operativo.
16. **Framework creatività "stoppa lo scroll" + struttura campagne + scaling + remarketing** (Mod. 5–6–9) → KB ads di Gaia/Marco per F6/F7. (Aggiornare i dettagli di piattaforma a oggi.)
17. **"Proposta perfetta" + "messaggi magnetici"** (Mod. 3–4) → rinforza offerta/messaggio di Valentina/Marco (converge con #2 e #3 del backlog).

## 10. Marco De Veglia — BrandFacile (`drive/folders/1A0oVFIHCB9Bdcz8Dw8CGBy9l23ooW1Oq`)

Il metodo di **Brand Positioning** più autorevole in Italia (deriva da Ries & Trout). PDF leggibili (Intro, Parte 1 teoria, Parte 2 metodo, + extra Brand Name e PR). **Tono pulito e anti-fuffa → compatibile col brand Ciak senza filtri.** È il corso più rilevante di tutti perché il posizionamento è il cuore di Ciak (F1/Valentina/Blueprint).

### Il metodo — Brand Positioning Formula (4 step)
- **STEP 1 — Definire il contesto** (sempre *competitor-oriented*, non customer-oriented). Tool **Brandshot** (istantanea della mente del cliente): 1) classifica attributi della categoria; 2) lista brand; 3) accoppia brand↔attributo; 4) vedi dove sei; 5) possiedi l'attributo più importante? se no, il successivo; 6) se sono tutti presi → crea una nuova categoria.
- **STEP 2 — Idea differenziante**. SBAGLIATE (da rifiutare): qualità, orientamento al cliente, prezzo basso, pubblicità creativa. GIUSTE: **Specialista** (chiave), Tradizione (var. "più nuovo"), Ingrediente magico. Due test: **Test del Contrario** (deve esistere un concorrente col posizionamento opposto, altrimenti è irrilevante) + **Test dei Limiti** (la brand deve avere cose che NON fa → focus; ammettere un limite aumenta la credibilità).
- **STEP 3 — Nuova categoria** (se possibile): prima il nome di categoria, poi il nome di brand. Modello **Leader Only**: oggi o sei brand leader di un mercato/categoria, o non sei una brand.
- **STEP 4 — Brand Positioning Statement** (template): *"<nome> è <categoria/mercato> che <idea differenziante>. A differenza dei concorrenti che <cosa fanno>, noi <cosa facciamo di diverso>, e questo per il cliente significa <vantaggi>."*

Concetti di supporto: i **4 limiti della mente** (limitata, odia la confusione, evita il rischio, odia cambiare idea); i **5 rischi percepiti** (monetario, funzionale, fisico, sociale, psicologico); semplicità (1 concetto, semplice, comunicato semplice).

### Insertion da BrandFacile (alta priorità — è il core di Ciak)
18. **Brandshot competitor-oriented** in F1/Valentina: il wizard Step04 oggi è customer-oriented; aggiungere mappatura concorrenti↔attributi per trovare l'attributo libero. (De Veglia: il posizionamento è SEMPRE orientato alla concorrenza.)
19. **Idea differenziante "Specialista" + Test del Contrario + Test dei Limiti** come **quality gate** di Valentina: rifiutare differenziatori deboli (qualità/servizio/prezzo), spingere "specialista", validare con i due test. Arricchisce anche lo scoring di Matteo.
20. **Brand Positioning Statement** come output strutturato del documento di posizionamento generato dopo Step04 (oggi `posizionamento_pdf_renderer`): usare il template a 5 slot di De Veglia.

---

# Sintesi finale — 6 corsi analizzati

| Corso | Cosa dà a Ciak | Dove |
|---|---|---|
| Ulama — Consulenti High Ticket | Spina dorsale high-ticket, vendita emozionale 6 fasi | tutte le fasi; Marco |
| Marketing Programmatico (Freddi) | 3 obiezioni, 5 consapevolezze, SLO, Movie Funnel, 12 punti vendita | Valentina/Marco/Matteo |
| BrandFacile (De Veglia) | **Metodo di posizionamento (core): Brandshot, Specialista, 2 test, Statement** | F1/Valentina/Matteo |
| Baleni / Giannini / Cavina | prompt-pack, faceless+repurposing, short-form, DM automation, scala offerte, loop recensioni | Andrea/Gaia/F7/pricing |
| Corsi Systeme | SOP operative native sullo stack reale (Systeme.io) | Gaia/team |
| Lead a Catinelle (WIT) | Motore ads/scaling: KPI, runbook campagne, creatività, scaling | Gaia/Marco; F6/F7 |

**Mappa per origine**: strategia high-ticket = Ulama + Freddi · posizionamento = De Veglia · contenuti/organico = Baleni/Cavina · esecuzione stack = Systeme · ads/scaling = Lead a Catinelle. Il backlog (20 voci sopra) è la sintesi azionabile. Voce brand anti-fuffa applicata sempre (De Veglia è già allineato; Ulama/Freddi vanno filtrati dal registro guru).
