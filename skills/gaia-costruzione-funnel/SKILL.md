---
name: gaia-costruzione-funnel
description: Regola operativa di Gaia AI per costruire in autonomia, via Cowork, il funnel Systeme.io di un partner Ciak (step F-13 "Sistema di vendita") partendo dal Template Master, con sequenza fissa, testi presi solo dai dati reali del partner e grafica curata nel brand del partner. Usare ogni volta che bisogna creare, importare, compilare, ridisegnare o verificare il funnel Systeme di un partner, anche se la richiesta dice solo "fai il funnel di X", "sistema le pagine di X" o "prepara F-13".
---

# Gaia AI — Costruzione funnel Systeme.io

Versione 0.2 (17/9/2026) — BOZZA. Da confermare con Claudio: (a) sequenza = 4 step del Template Master; (b) confine di autonomia = costruisce e salva, NON attiva e NON scrive in Ciak.

Novità v0.2: accesso ai partner tramite subaccount Systeme, senza password; il connector MCP non vede i subaccount.

Applicare come contratto vincolante. Valgono per intero `CLAUDE.md` (verifica al 100%, Brand-Lock First, divieto di dati inventati) e `docs/agents/PROTOCOL.md` (gate di evidenza).

## Chi esegue

Gaia AI, in una sessione Cowork con Claude in Chrome. Gaia agisce da sola dall'inizio alla fine, dentro i confini sotto. Le decisioni su prezzi, contratti, credenziali e pubblicazione restano a Claudio.

## Accesso a Systeme (senza password)

I partner sono **subaccount** dell'account principale evolutionpro (verificato il 17/9/2026: 24 subaccount in `systeme.io/dashboard/subaccounts`).

- Gaia usa l'utente Systeme dedicato a Gaia, invitato come **Amministratore** nel workspace di ciascun subaccount partner. Se non ancora configurato: sessione dell'account evolutionpro.
- Entrare nel partner: dal workspace principale → Subaccounts → "Accedi al subaccount" sul partner. Con l'utente Gaia: menu workspace in alto a sinistra → workspace del partner.
- Verificare SEMPRE, prima di toccare qualcosa, di essere nel workspace giusto (nome/sottodominio del partner visibili nella dashboard). Screenshot come prova.
- Gaia non inserisce mai password né codici. Se la sessione è scaduta o compare la pagina di login: fermarsi e segnalarlo.

⚠️ Il connector MCP Systeme è collegato al solo workspace evolutionpro: non vede i funnel dei subaccount (verificato: gli step dei funnel dei partner non compaiono e le loro pagine rispondono "Not Found"). Dentro un subaccount si lavora **solo nell'editor via browser**. Il connector resta utile solo per leggere il Template Master.

## Prerequisiti (se ne manca uno: fermarsi e segnalarlo)

1. `partner_id` del partner e nome del suo subaccount Systeme.
2. Nel browser di Cowork: sessione admin attiva su www.ciak.io (per LEGGERE i dati) e sessione Systeme attiva con accesso al subaccount del partner.
3. Link di condivisione del Template Master (workspace evolutionpro → Siti → Funnel → `•••` Template Master → Condividi).
4. Dati partner leggibili in Ciak: posizionamento (6 campi), offerta (nome, prezzo, cosa include, garanzia), brand kit F-4.

## Sequenza fissa del funnel

Ordine e numero degli step non si cambiano:

1. **Optin** — cattura contatto per la masterclass gratuita
2. **Landing** — pagina di vendita
3. **Modulo d'ordine** — checkout con il prezzo reale dell'offerta del partner
4. **Pagina di ringraziamento**

Non aggiungere, rimuovere o riordinare step. Non modificare mai il funnel "Template Master" (ID 6706257).

## Flusso

1. **Leggere i dati** del partner (vedi `references/fonti-dati-ciak.md`). Costruire la scheda contenuti: ogni testo del funnel con la sua fonte. Campi senza fonte → `[MANCANTE: <cosa>]`.
2. **Entrare nel subaccount** del partner (sezione "Accesso a Systeme") e verificare il workspace.
3. **Importare il funnel** aprendo il link Condividi mentre si è dentro il subaccount del partner. MAI usare "Duplica" per un partner: clona nel workspace evolutionpro. (DA VERIFICARE al primo uso: se esiste un modo diretto per copiare il Template Master in un subaccount senza Condividi.)
4. **Identificare step e pagine** della copia importata (Siti → Funnel del subaccount). Annotare gli ID: sono diversi da quelli del master.
5. **Design plan** con la skill frontend-design, SUBORDINATO al brand kit del partner: palette e font del partner sono vincolanti; frontend-design decide solo gerarchia, layout, spaziature, trattamento di bottoni e sezioni. Se il brand kit è incompleto: fallback neutro, mai giallo o logo Ciak.
6. **Costruire nell'editor**, una pagina alla volta (vedi `references/systeme-editor-map.md`): Impostazioni globali (font, colori, font titoli) → testi degli elementi → sfondi di sezione → font/allineamento/spaziatura lettere dei singoli elementi → margini e valori mobile → **Salvare**.
7. **Verifica** di ogni pagina: ricaricare l'editor e controllare che le modifiche siano rimaste, anteprima desktop e mobile, nessun segnaposto rimasto oltre ai `[MANCANTE]` dichiarati.
8. **Report finale** a Claudio (vedi `references/report-f13.md`).

## Regole non negoziabili

- Nessun testo inventato. Nessuna testimonianza, recensione, numero, percentuale o promessa di risultato che non provenga dai dati reali del partner (Codice del Consumo artt. 21-23). Le testimonianze segnaposto del template si rimuovono, non si riscrivono.
- Prezzo nel Modulo d'ordine = prezzo dell'offerta del partner in Ciak. Mai lasciare il prezzo del template. Se il prezzo manca: `[MANCANTE: prezzo]` e fermare la chiusura.
- Countdown e scarsità solo se esiste una scadenza reale fornita. Altrimenti rimuovere il countdown.
- Brand voice: italiano semplice, frasi brevi, niente registro guru o superlativi.
- Pagine legali (Cookie, Privacy, Condizioni di vendita): i link devono puntare alle pagine del partner. Non copiare i testi legali di un altro partner.
- Rimuovere residui del template: testi invisibili (es. "© 2021 Systeme.io"), immagini segnaposto, dati di altri partner (nome, telefono, email).
- Sezioni hero con margini sbilanciati → correggere.
- Mai lavorare nel workspace sbagliato: un funnel costruito nel partner sbagliato va segnalato, non cancellato.
- Mai `describe_page_template` / `save_page_content_from_template` su pagine esistenti: ricreano la pagina e cancellano il lavoro.

## Confine di autonomia (v0.2)

Gaia PUÒ: entrare nei subaccount dei partner, importare il funnel, scrivere testi, modificare grafica, salvare le pagine, rimuovere elementi di template.

Gaia NON PUÒ:
- attivare, disattivare, condividere o eliminare funnel;
- collegare domini, Stripe o metodi di pagamento, creare o modificare offerte e prezzi in Systeme;
- invitare o rimuovere membri dei workspace, creare o eliminare subaccount;
- scrivere dati in Ciak (URL funnel, stato F-13): dal 30/7/2026 richiede il token admin di Claudio;
- inserire credenziali, inviare email o messaggi.

Queste azioni vanno preparate nel report, con valori esatti, per Claudio.

## Quando fermarsi

- Prerequisito mancante o sessione Systeme scaduta.
- Subaccount del partner non trovato o workspace non verificabile.
- Dati partner mancanti su headline, offerta o prezzo.
- Il link Condividi importa nel workspace sbagliato.
- Un salvataggio non risulta dopo il ricaricamento dell'editor.
- Qualsiasi richiesta di password, codice, pagamento o conferma legale.

Fermarsi = lasciare il lavoro salvato fin lì, scrivere nel report cosa manca, chi deve agire e la prossima azione.
