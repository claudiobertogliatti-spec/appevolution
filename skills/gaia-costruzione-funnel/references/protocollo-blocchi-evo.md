# Protocollo blocchi EVO- e costruzione funnel in Systeme (verificato 18/09/2026)

Procedura operativa completa, verificata sul campo nel caso pilota Daniele Andolfi. Gaia la segue passo-passo. Ogni passaggio marcato ✅ è stato eseguito e verificato di persona; DA VERIFICARE = non ancora provato.

## Concetto: libreria madre + personalizzazione

Non si costruisce ogni funnel da zero. Esiste una **libreria madre di blocchi neutri** salvata sull'account principale Evolution PRO, che si duplica ai partner. Per ogni partner si cambiano solo font, colori, logo (dal brand kit del partner) e testi reali.

- **Nomi blocchi:** schema `EVO-[num]-[sezione]` per l'Optin, `EVO-LP-[num]-[sezione]` per la Landing (LP = landing page). Il numero indica la posizione nella sequenza; il nome parlante permette di ricostruire l'ordine.
- **Cantiere:** funnel `LIBRERIA-EVO` su Evolution PRO, funnel personalizzato con pagine di lavoro (Optin, Landing) dove costruire e salvare i blocchi.
- **I testi dei blocchi sono irrilevanti** (verranno sovrascritti per ogni partner): possono restare quelli del template. Conta la struttura e il nome corretto del blocco.
- **La pagina cantiere può restare disordinata:** i blocchi si salvano singolarmente in Miei blocchi, l'ordine dentro la pagina di lavoro non conta. Gaia assembla l'ordine giusto nel funnel del partner.

## Blocchi Optin salvati (Miei blocchi di Evolution PRO) ✅

| Blocco | Contenuto |
|---|---|
| `EVO-01-Hero` | titolo + sottotitolo + form email |
| `EVO-02-Servizi` | 3 colonne (Design/Sviluppo/Ecommerce) |
| `EVO-04-ProvaSociale` | barra "Scelto dai migliori brand" |
| `EVO-05-Testimonianze` | griglia di 6 recensioni |
| `EVO-06-Offerta` | vantaggi + garanzia + form |
| `EVO-07-Footer` | contatti + copyright + link legali |

(La numerazione salta il 03: le sezioni sono state salvate nell'ordine di scroll, non è un problema.)

## Blocchi Landing salvati (Miei blocchi di Evolution PRO) ✅

Costruiti dal template a catalogo "Hack Productivity" (landing sobria per corso/libro), poi salvati come blocchi.

| Blocco | Contenuto |
|---|---|
| `EVO-LP-01-Hero` | header/menu + rating + titolo + copertina |
| `EVO-LP-02-Problema` | 3 benefici ("Cosa c'è dentro") |
| `EVO-LP-03-Soluzione` | griglia capitoli/moduli del corso |
| `EVO-LP-04-Contenuti` | "Cosa riceverai" + bonus + prezzo (99→75) |
| `EVO-LP-05-Bio` | scheda 1 persona (partner) + blurb |
| `EVO-LP-06-Testimonianze` | carosello recensioni |
| `EVO-LP-08-FAQ` | titolo + accordion domande frequenti |
| `EVO-LP-09-Footer` | logo + link legali |

Sequenza-obiettivo Landing concordata: 01-Hero → 02-Problema → 03-Soluzione → 04-Contenuti → 05-Bio → 06-Testimonianze → 07-Offerta → 08-FAQ → 09-Footer.

**Non ancora salvati come blocco separato:**
- `EVO-LP-07-Offerta` (prezzo + garanzia + CTA): nel template "Hack Productivity" è fuso dentro `EVO-LP-04-Contenuti`. Da estrarre o costruire quando serve.
- Il template ha anche sezioni non nella sequenza (barra "Ora disponibile su" con Amazon/Audible, sezione mockup "portfolio", newsletter finale): NON salvate come blocchi perché non fanno parte della sequenza del videocorso partner.

## Come si salva una sezione come blocco (procedura verificata ✅)

1. Apri l'editor della pagina: nello step del funnel → **Modifica Pagina**. Attendi 8–15 secondi il caricamento.
2. **Seleziona l'elemento** cliccando su un testo/titolo della sezione voluta. Compare una barra colorata con l'etichetta del livello (Testo, Riga, Sezione…).
3. **Sali al livello Sezione.** Il modo affidabile: clicca l'**icona ingranaggio** dell'elemento selezionato → si apre il suo pannello a sinistra E compare in alto un **breadcrumb** `Sezione › Riga › … › Testo`. Clicca la parola **"Sezione"** nel breadcrumb. Il pannello sinistro deve diventare "Sezione".
   - Fai i click UNO ALLA VOLTA con attesa: cliccare "Sezione" nel breadcrumb troppo in fretta deseleziona.
4. Nella barra in alto a sinistra del pannello Sezione ci sono le icone: su, giù, duplica, **dischetto (salva)**, cestino. Clicca il **dischetto**.
5. Si apre il dialogo **"CREA BLOCCO"**. **CONTROLLA L'ANTEPRIMA**: deve mostrare la sezione giusta. Se mostra un'altra sezione, chiudi (X) e riseleziona — la selezione era rimasta su una sezione precedente.
6. Scrivi il nome nel campo **Titolo** — SOLO nel campo del dialogo, mai sulla pagina — e clicca **Crea**. Appare "Blocco creato".
7. **Verifica:** scheda **Blocchi** → **Miei blocchi** → il blocco deve comparire con la sua anteprima. C'è una barra "Cerca blocchi" (cerca "EVO" o "EVO-LP").

## Come pulire una sezione prima di salvarla (verificato ✅)

Per ridurre elementi ripetuti (es. bio a 3 autori → 1, testimonianze multiple):
- Seleziona l'elemento/card da togliere → sali con l'ingranaggio fino al livello **Riga** che contiene la card intera (contorno blu attorno a foto+nome+testo) → **cestino**.
- Verifica sempre col contorno blu che stai eliminando la card intera e non solo un testo.

## Trappole viste sul campo (evitare)

- ⚠️ Le **frecce su/giù** nella barra di un elemento **spostano l'elemento**, non cambiano livello. Non usarle per navigare. Se sposti per sbaglio → **Undo** subito.
- ⚠️ Il **dischetto/l'icona duplica sono vicine**: cliccare l'icona sbagliata **duplica** l'elemento invece di salvarlo. Su elementi come la FAQ questo crea accordion ripetuti. Se succede → Undo o cestino sui duplicati.
- ⚠️ Dopo aver salvato un blocco, la **selezione resta sulla sezione precedente**. Prima del blocco successivo, riseleziona e ricontrolla l'anteprima.
- ⚠️ Digitare il nome quando il dialogo NON è aperto scrive il testo **dentro la pagina**. Controlla che CREA BLOCCO sia aperto prima di digitare.
- ⚠️ Cliccare su un titolo fa spesso **scrollare** la pagina: su template lunghi, dopo il click rifai uno screenshot per riposizionarti.
- Il pannello "Sezione" aperto **blocca lo scroll**: premi "Indietro" per deselezionare e poter scorrere.
- L'editor via browser può **rallentare o congelarsi**: se uno screenshot va in timeout, attendi o ricarica (F5). I blocchi già salvati NON si perdono.

## L'elemento FAQ (Elementi → Altro → FAQ)

La FAQ non è una categoria di Blocchi pronti: è un **Elemento** (toolbox Elementi, sezione "Altro"). Si aggiunge alla pagina, poi si aggiunge un titolo "faq" sopra e si salva la Sezione come `EVO-LP-08-FAQ`. Attenzione ai duplicati (vedi trappole).

## Opzione "blocco principale"

Nel dialogo CREA BLOCCO c'è la casella **"Vuoi creare un blocco principale?"**. Probabilmente manda il blocco in "Miei blocchi principali" (in cima alla scheda Blocchi). DA VERIFICARE se conviene per i blocchi EVO-.

## Duplicazione ai subaccount (DA VERIFICARE — passaggio ancora aperto)

Ogni blocco in "Miei blocchi" ha due icone: **condividi** e **cestino**. La condivisione è la pista più probabile per portare i blocchi dall'account madre ai subaccount dei partner. NON ancora testata. Prima di industrializzare, verificare:
- se i blocchi salvati su Evolution PRO compaiono automaticamente nei subaccount, oppure
- se l'icona "condividi" genera un link/codice da importare nel subaccount.

## Sequenza completa funnel partner (obiettivo)

Ogni funnel partner ha 4 step: Optin → Landing → Modulo d'ordine → Ringraziamento. Per ogni step Gaia assembla i blocchi EVO- / EVO-LP- nell'ordine, poi personalizza brand (font, colori, logo dal brand kit) e testi reali del partner. Blocchi Optin e Landing: fatti. Checkout e Ringraziamento: da costruire con lo stesso metodo.
