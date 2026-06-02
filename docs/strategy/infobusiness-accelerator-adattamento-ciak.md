# Adattare le strategie di "Infobusiness Accelerator" al percorso Ciak

> Fonte analizzata: corso **Infobusiness Accelerator** (Mik Cosentino / infomarketingX) su `corsi.ulama.io` — 11 moduli, 83 lezioni, ~35h.
> Metodo: lette le trascrizioni complete delle lezioni a più alto valore strategico (mercato, offerta, organico, funnel); il resto inquadrato da struttura e titoli.
> Relazione con `ulama-adattamento-ciak.md`: quel doc analizza il corso *gemello* "Consulenti High Ticket". Questo è un corso **diverso e in gran parte sovrapposto** sullo stesso autore. Qui isolo **solo ciò che è realmente additivo** rispetto a quanto già documentato, per non duplicare il backlog.

---

## 0. Principio guida (invariato): si adotta il framework, NON il linguaggio

Vale identico al doc precedente. Il corso è scritto in pieno registro guru ("ti permetterà di fare tanti soldi", "vincere facile", "abitudini da ricco", modulo Mindset con "riprogrammazione del subconscio"). Il system prompt di Matteo (`backend/services/ciak_matteo.py`) vieta quel registro.

Regola pratica: estrai logica, sequenze, schemi decisionali, template. Scarta motivazione, superlativi, gergo. Filtra ogni contenuto dalla translation table di `ciak_matteo.py` (funnel → percorso, nicchia → ambito specifico, ecc.) prima che entri in qualsiasi prompt o asset.

---

## 1. Cosa è già coperto (NON ri-lavorare)

Questi pezzi del corso replicano materiale già nel backlog di `ulama-adattamento-ciak.md` — confermano la validità, ma non aggiungono nulla:

- **Vendita Emozionale a 6 fasi** (Modulo 8: Connecting → Engagement → Transition → Presenting → Gestire Obiezioni → Committing). Identico al framework già al punto #1 del backlog esistente.
- **Tipologie di offerta** (Modulo 3) → già mappate su Valentina.
- **Setup tool Ulama/Conneqto** (Modulo 4 e parte del 5) → da scartare: lo stack Ciak è Systeme.io.
- **Modulo Mindset / Riprogrammazione** (Modulo 10) → da scartare per incompatibilità di brand.
- **Modulo Viral Reels & TikTok** (Modulo 11): hook, retention, faceless, script AI, storytelling, calendario. Tatticamente valido ma **già coperto** dall'analisi Baleni/Cavina nel doc esistente (sistema short-form, faceless+repurposing, prompt-pack). Non re-importare; eventualmente usare come conferma di dettaglio per gli asset di Andrea.

---

## 2. Cosa è REALMENTE nuovo e vale (i 7 innesti additivi)

### A. Equazione del Valore (Modulo 3) — modello Hormozi esplicito
Il corso codifica la percezione di valore come equazione:

> **Valore = (Risultato desiderato × Probabilità percepita di riuscita) / (Tempo per il risultato × Sforzo e sacrificio)**

Tutto ciò che sta sopra la linea aumenta il valore; tutto ciò che sta sotto lo riduce. Le due domande chiave: il risultato ha *significato reale* per il cliente? Il cliente *crede davvero* di poterlo raggiungere?

**Dove va in Ciak:** è il criterio di costruzione offerta di **Valentina** (F1) e di valutazione di **Matteo** (Blueprint). Aggiunge una griglia a 4 variabili che oggi manca: quando Valentina genera/valuta l'offerta del partner, deve massimizzare risultato+probabilità e minimizzare tempo+sforzo percepiti, e suggerire leve concrete su ciascuna delle 4. Filtro brand: niente "valore enorme/10x", solo le 4 variabili in italiano semplice.

### B. I 4 Semafori Verdi del Mercato (Modulo 2) — checklist di validazione mercato
Prima di scrivere l'idea di business, 4 condizioni devono essere "verdi":
1. **Dolori e problemi reali** da risolvere nel mercato.
2. **Potere di spesa** (il pubblico — o il decision maker — può davvero pagare).
3. **Facili da intercettare** (raggiungibili come audience).
4. **Mercato in crescita.**
Se uno è "rosso", si cambia angolo prima di partire.

**Dove va in Ciak:** è un **quality gate di pre-posizionamento** per Valentina (F1) e un fattore di scoring per Matteo. Lo step Step04 oggi è centrato su cliente/offerta ma non valida esplicitamente *se il mercato regge*. Quattro check secchi, non una lezione.

### C. La Triade della Ricchezza (Modulo 2) — selezione nicchia per intersezione
La nicchia giusta sta all'incrocio di tre cerchi: **Mercato** (con bisogni/desideri) × **Avatar/pubblico** × **Skills** (competenze che hai + competenze che puoi imparare o "prendere in prestito" da un esperto). Antidoto alla sindrome del perfezionista ("non parto finché non sono bravissimo").

**Dove va in Ciak:** arricchisce il wizard di posizionamento di Valentina con la dimensione **skills/competenze del partner** (oggi poco esplicita) e la regola "puoi partire prendendo competenze in prestito" — utile per partner che temono di non avere autorità. Combinato con i **3 Macro Mercati** (Salute / Relazioni / Soldi → sotto-mercati → sotto-nicchie → nicchia).

### D. Discrepanza Prezzo-Valore + ciclo virtuoso del prezzo (Modulo 3)
Tre regole sul prezzo: (1) il valore *percepito* deve essere sproporzionatamente superiore al prezzo; (2) un **prezzo alto segnala alto valore** (leva inconscia, pre-acquisto); (3) esiste un **ciclo virtuoso vs vizioso** del prezzo (prezzo dignitoso → clienti più impegnati → risultati migliori → testimonianze → si può alzare; e l'opposto).

**Dove va in Ciak:** completa la "KB offerta/prezzo" già prevista per Valentina/Marco con la logica del prezzo come *segnale* e del ciclo virtuoso. Si lega ai "10 errori sul prezzo" già nel backlog esistente.

### E. Regola del Validare ×3 + Attrazione Organica Easy (Modulo 6) — il ponte organico→appuntamento
Il pezzo operativamente più utile e oggi **mancante** in Ciak (che è funnel/ads-oriented). Sequenza:
- **Regola del validare ×3:** non investire un euro in ads finché non hai ottenuto **almeno 3 vendite in organico**. Validi offerta, prezzo e target a costo zero, poi scali.
- **Attrazione Organica Easy:** messaggio di marketing (post / video / storie) con una CTA chiara ("scrivi INFO nei commenti" / "scrivimi START in DM") → porta la persona **in chat privata** → percorso conversazione: rompighiaccio → situazione attuale → situazione desiderata → ostacoli/blocchi → CTA alla call. Tre modalità: contenuto passivo (aspetti reazione), outreach attivo (scrivi a chi ha messo like / agli amici / a target in gruppi), profilo passivo ottimizzato (bio + link che porta a optin).

**Dove va in Ciak:** nuovo asset/knowledge per **Gaia + Marco** che copre la fase "umana" dell'acquisizione, da affiancare ai funnel automatizzati. La regola del ×3 è anche un **gate di routing per Matteo**: partner senza validazione organica → non spingere ancora ads. (Converge con il punto "lead freddo → call" già aperto nel doc esistente, qui con script concreto.)

### F. Ciclo Contenuto / Ciclo Vendita — "3 Content 1 Promo" (Modulo 6)
Cadenza editoriale: durante la settimana ~**80% contenuti di valore**, ~**20% CTA** crescente verso giovedì/venerdì, **promo diretta il sabato**. Periodicamente una "promo che non si può rifiutare" (sconto reale a tempo). Distingue *ciclo di contenuto* (nutrire) da *ciclo di vendita* (convertire).

**Dove va in Ciak:** scheletro concreto per `11-calendario-30gg` di **Marco**. Il doc esistente aveva già "calendario editoriale" come voce generica; qui c'è il rapporto 80/20 e il ritmo settimanale → template copia-incolla. Filtro brand: niente urgenza falsa; lo sconto a tempo dev'essere reale.

### G. Tassonomia dei Funnel (Modulo 5) — 4 schemi riusabili
Il corso distingue 4 funnel per obiettivo:
- **VSL funnel** (optin → VSL → call/checkout) — già noto.
- **Tribe funnel:** porti l'audience social dentro una **community gratuita** dove eroghi valore → riscaldi → converti. Funnel community-led.
- **Free Trial funnel:** accesso gratuito a tempo → conversione.
- **Masterclass funnel:** una masterclass (gratuita o pagata) vende il **front-end** e soprattutto alza lo scontrino medio sul **back-end**, dentro una **scala di prodotti** (Prodotto 1 → 2 → 3, prezzo/valore crescente).

**Dove va in Ciak:** menù di funnel selezionabile per **Gaia** (F2/F5) in base allo stato del partner; il **Tribe funnel** si sposa con la logica community/retention già prevista in F7; la scala prodotti del Masterclass funnel rafforza la "scala di offerte" già nel backlog esistente.

---

## 3. Backlog additivo consolidato (solo voci nuove)

Priorità alta → bassa. Voce brand anti-fuffa sempre applicata. Numerazione `IA-n` per non confondere col backlog del doc precedente.

1. **IA-1 · Equazione del Valore a 4 variabili** → criterio di costruzione/valutazione offerta in Valentina (F1) + scoring Matteo. *(Quick win, alto impatto.)*
2. **IA-2 · 4 Semafori Verdi** come quality gate di pre-posizionamento → Valentina (F1) + Matteo. *(Quick win.)*
3. **IA-3 · Sistema Organico Easy + Validare ×3** → asset + KB Gaia/Marco; regola ×3 come gate ads in Matteo. *(Alto valore: colma un buco reale.)*
4. **IA-4 · Calendario "3 Content 1 Promo" (80/20 + sabato promo)** → template per `11-calendario-30gg` di Marco.
5. **IA-5 · Tassonomia funnel (VSL/Tribe/Free Trial/Masterclass)** → menù selezionabile per Gaia; Tribe→F7 community.
6. **IA-6 · Triade della Ricchezza (skills + prestito competenze)** → dimensione aggiuntiva nel wizard di Valentina.
7. **IA-7 · Prezzo come segnale + ciclo virtuoso** → completa la KB prezzo di Valentina/Marco.

---

## 4. Cosa NON fare

- **Non** re-importare la Vendita 6 fasi, le tipologie di offerta o lo short-form: già nel backlog esistente.
- **Non** importare il Modulo Mindset (registro spirituale, incompatibile).
- **Non** copiare i tutorial Ulama/Conneqto: stack Ciak = Systeme.io.
- **Non** caricare le 83 lezioni dentro Ciak: Ciak è Done-for-You, non un info-prodotto.
- **Non** toccare il prompt di Matteo senza rispettarne vincoli e termini vietati.

---

## 5. Sequenza operativa consigliata

**Quick wins (alto impatto, basso sforzo):**
1. Scrivere la KB **Equazione del Valore** (IA-1) → Valentina.
2. Aggiungere i **4 Semafori** come gate (IA-2) → Valentina/Matteo.
3. Codificare il **Sistema Organico + Validare ×3** (IA-3) → asset Gaia/Marco.

**Strutturali (dopo):**
4. Template **3 Content 1 Promo** (IA-4) → `11-calendario-30gg`.
5. **Menù funnel** (IA-5) → Gaia.
6. Estendere wizard con **Triade/skills** (IA-6) e **logica prezzo** (IA-7).

---

## 6. Avvertenza brand voice (da ripetere a ogni innesto)

Prima di incollare qualsiasi contenuto in un prompt o asset Ciak:
- niente superlativi assoluti, niente "potente/incredibile/10x/fai tanti soldi";
- frasi brevi (≤ 25 parole, come per Matteo);
- termini tradotti dalla tabella di `ciak_matteo.py`;
- tono diretto, italiano semplice, "senza fuffa";
- gli elementi di scarsità/sconto devono essere **reali**, mai inventati.

Il valore di Ciak resta il contrasto: la stessa macchina del mondo high-ticket, ma agita senza il rumore guru.
