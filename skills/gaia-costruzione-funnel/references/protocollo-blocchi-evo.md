# Protocollo blocchi EVO- e costruzione funnel in Systeme (verificato 17/09/2026)

Procedura operativa completa, verificata sul campo nel caso pilota Daniele Andolfi. Gaia la segue passo-passo. Ogni passaggio marcato ✅ è stato eseguito e verificato di persona; DA VERIFICARE = non ancora provato.

## Concetto: libreria madre + personalizzazione

Non si costruisce ogni funnel da zero. Esiste una **libreria madre di blocchi neutri** salvata sull'account principale Evolution PRO, che si duplica ai partner. Per ogni partner si cambiano solo font, colori, logo (dal brand kit del partner) e testi reali.

- **Nomi blocchi:** schema `EVO-[num]-[sezione]`, es. `EVO-01-Hero`. Il numero indica la posizione nella sequenza; il nome parlante permette di ricostruire l'ordine.
- **Cantiere:** funnel `LIBRERIA-EVO` su Evolution PRO, funnel personalizzato con pagine di lavoro dove costruire e salvare i blocchi.
- **I testi dei blocchi sono irrilevanti** (verranno sovrascritti per ogni partner): possono restare quelli del template. Conta la struttura e il nome corretto del blocco.

## Blocchi Optin già salvati (Miei blocchi di Evolution PRO) ✅

| Blocco | Contenuto |
|---|---|
| `EVO-01-Hero` | titolo + sottotitolo + form email |
| `EVO-02-Servizi` | 3 colonne (Design/Sviluppo/Ecommerce) |
| `EVO-04-ProvaSociale` | barra "Scelto dai migliori brand" |
| `EVO-05-Testimonianze` | griglia di 6 recensioni |
| `EVO-06-Offerta` | vantaggi + garanzia + form |
| `EVO-07-Footer` | contatti + copyright + link legali |

(La numerazione salta il 03 perché le sezioni sono state salvate nell'ordine di scroll, non da cima a fondo. Non è un problema; eventualmente si rinomina.)

## Come si salva una sezione come blocco (procedura verificata ✅)

1. Apri l'editor della pagina: nello step del funnel → **Modifica Pagina**. Attendi 8–15 secondi il caricamento.
2. **Seleziona l'elemento** cliccando su un testo/titolo della sezione voluta. Compare una barra colorata con l'etichetta del livello (Testo, Riga, Sezione…).
3. **Sali al livello Sezione.** Il modo affidabile: clicca l'**icona ingranaggio** dell'elemento selezionato → si apre il suo pannello a sinistra E compare in alto un **breadcrumb** `Sezione › Riga › … › Testo`. Clicca la parola **"Sezione"** nel breadcrumb. Il pannello sinistro deve diventare "Sezione".
   - In alternativa, quando il pannello è già su "Sezione", verifica sempre l'anteprima al passo 5 prima di creare.
4. Nella barra in alto a sinistra del pannello Sezione ci sono le icone: su, giù, duplica, **dischetto (salva)**, cestino. Clicca il **dischetto**.
5. Si apre il dialogo **"CREA BLOCCO"**. **CONTROLLA L'ANTEPRIMA**: deve mostrare la sezione giusta. Se mostra un'altra sezione, chiudi (X) e riseleziona — la selezione era rimasta su una sezione precedente.
6. Scrivi il nome nel campo **Titolo** (es. `EVO-08-...`) — SOLO nel campo del dialogo, mai sulla pagina — e clicca **Crea**. Appare "Blocco creato".
7. **Verifica:** scheda **Blocchi** → **Miei blocchi** → il blocco deve comparire con la sua anteprima. C'è anche una barra "Cerca blocchi".

## Trappole viste sul campo (evitare)

- ⚠️ Le **frecce su/giù** nella barra di un elemento **spostano l'elemento**, non cambiano livello. Non usarle per navigare. Se sposti per sbaglio → **Undo** (freccia indietro in alto a sinistra) subito.
- ⚠️ Dopo aver salvato un blocco, la **selezione resta sulla sezione precedente**. Prima di salvare il blocco successivo, riseleziona e ricontrolla l'anteprima nel dialogo CREA BLOCCO.
- ⚠️ Digitare il nome del blocco quando il dialogo NON è aperto scrive il testo **dentro la pagina** (es. dentro il titolo hero). Controlla sempre che il dialogo CREA BLOCCO sia aperto prima di digitare.
- ⚠️ Un click su un punto vuoto **deseleziona**. Clicca su un elemento con contenuto (testo/titolo).
- L'editor via browser può rallentare o congelarsi: se uno screenshot va in timeout, attendi o ricarica la scheda (F5). I blocchi già salvati NON si perdono col ricaricamento (sono in Miei blocchi, non modifiche di pagina).
- Non premere **"Salvare"** sulla pagina cantiere se non serve: i blocchi si salvano col dischetto, indipendentemente dal salvataggio pagina.

## Opzione "blocco principale"

Nel dialogo CREA BLOCCO c'è la casella **"Vuoi creare un blocco principale?"**. Probabilmente manda il blocco nella categoria "Miei blocchi principali" (in cima alla scheda Blocchi). DA VERIFICARE se conviene usarla per i blocchi EVO-.

## Duplicazione ai subaccount (DA VERIFICARE)

Ogni blocco in "Miei blocchi" ha due icone: **condividi** e **cestino**. La condivisione è la pista più probabile per portare i blocchi dall'account madre ai subaccount dei partner. Non ancora testata. Prima di industrializzare, verificare:
- se i blocchi salvati su Evolution PRO compaiono automaticamente nei subaccount, oppure
- se l'icona "condividi" genera un link/codice da importare nel subaccount.

## Sequenza completa funnel partner (obiettivo)

Ogni funnel partner ha 4 step: Optin → Landing → Modulo d'ordine → Ringraziamento. Per ogni step si assemblano i blocchi EVO- nell'ordine, poi si personalizzano brand e testi. Blocchi Optin: fatti. Landing/Checkout/Ringraziamento: da costruire con lo stesso metodo.
