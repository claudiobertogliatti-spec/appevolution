---
name: gaia-costruzione-funnel
description: Regola operativa di Gaia AI per costruire in autonomia, via Cowork, il funnel Systeme.io di un partner Ciak (step F-13 "Sistema di vendita") partendo dal Template Master, con sequenza fissa, testi presi solo dai dati reali del partner e grafica curata nel brand del partner. Usare ogni volta che bisogna creare, importare, compilare, ridisegnare o verificare il funnel Systeme di un partner, anche se la richiesta dice solo "fai il funnel di X", "sistema le pagine di X" o "prepara F-13".
---

# Gaia AI — Costruzione funnel Systeme.io

Versione 0.1 (17/9/2026) — BOZZA. Da confermare con Claudio: (a) sequenza = 4 step del Template Master; (b) confine di autonomia = costruisce e salva, NON attiva e NON scrive in Ciak.

Applicare come contratto vincolante. Valgono per intero `CLAUDE.md` (verifica al 100%, Brand-Lock First, divieto di dati inventati) e `docs/agents/PROTOCOL.md` (gate di evidenza).

## Chi esegue

Gaia AI, in una sessione Cowork con Claude in Chrome. Gaia agisce da sola dall'inizio alla fine, dentro i confini sotto. Le decisioni su prezzi, contratti, credenziali e pubblicazione restano a Claudio.

## Prerequisiti (se ne manca uno: fermarsi e segnalarlo)

1. `partner_id` del partner.
2. Nel browser di Cowork: sessione admin attiva su www.ciak.io (per LEGGERE i dati) e sessione attiva nell'account Systeme.io DEL PARTNER. Gaia non inserisce mai password: il login lo fa una persona.
3. Link di condivisione del Template Master (account evolutionpro → Siti → Funnel → `•••` Template Master → Condividi).
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
2. **Importare il funnel** nell'account del partner aprendo il link Condividi dalla sessione Systeme del partner. MAI usare "Duplica" per un partner: clona nell'account evolutionpro, non in quello del partner.
3. **Identificare step e pagine** della copia importata (menu Funnel dell'account partner). Annotare gli ID: sono diversi da quelli del master.
4. **Design plan** con la skill frontend-design, SUBORDINATO al brand kit del partner: palette e font del partner sono vincolanti; frontend-design decide solo gerarchia, layout, spaziature, trattamento di bottoni e sezioni. Se il brand kit è incompleto: fallback neutro, mai giallo o logo Ciak.
5. **Testi** via connector Systeme (`get_page_editable_content` → `update_page_content` con `update_entity` su `content` dei Text e `text`/`subText` dei Button). Una pagina alla volta, rileggendola prima.
6. **Grafica** nell'editor via browser (vedi `references/systeme-editor-map.md`): Impostazioni globali (font, colori, font titoli) → sfondi di sezione → font/allineamento/spaziatura lettere dei singoli elementi → Salvare.
7. **Rifiniture numeriche** via connector (vedi `references/systeme-connector-map.md`): margini, padding, dimensioni, bordi, valori mobile.
8. **Verifica** di ogni pagina: anteprima desktop e mobile, rilettura via connector, nessun segnaposto rimasto oltre ai `[MANCANTE]` dichiarati.
9. **Report finale** a Claudio (vedi `references/report-f13.md`).

## Regole non negoziabili

- Nessun testo inventato. Nessuna testimonianza, recensione, numero, percentuale o promessa di risultato che non provenga dai dati reali del partner (Codice del Consumo artt. 21-23). Le testimonianze segnaposto del template si rimuovono, non si riscrivono.
- Prezzo nel Modulo d'ordine = prezzo dell'offerta del partner in Ciak. Mai lasciare il prezzo del template. Se il prezzo manca: `[MANCANTE: prezzo]` e fermare la chiusura.
- Countdown e scarsità solo se esiste una scadenza reale fornita. Altrimenti rimuovere il countdown.
- Brand voice: italiano semplice, frasi brevi, niente registro guru o superlativi.
- Pagine legali (Cookie, Privacy, Condizioni di vendita): i link devono puntare alle pagine del partner. Non copiare i testi legali di un altro partner.
- Rimuovere residui del template: testi invisibili (es. "© 2021 Systeme.io"), immagini segnaposto, dati di altri partner (nome, telefono, email).
- Sezioni hero con margini sbilanciati → correggere.
- Mai editor e connector sulla stessa pagina nello stesso momento: chiudere l'editor prima di scrivere via connector.
- Mai `describe_page_template` / `save_page_content_from_template` su pagine esistenti: ricreano la pagina e cancellano il lavoro.

## Confine di autonomia (v0.1)

Gaia PUÒ: importare il funnel nell'account del partner, scrivere testi, modificare grafica, salvare le pagine, rimuovere elementi di template.

Gaia NON PUÒ:
- attivare, disattivare, condividere o eliminare funnel;
- collegare domini, Stripe o metodi di pagamento, creare o modificare offerte e prezzi in Systeme;
- scrivere dati in Ciak (URL funnel, stato F-13): dal 30/7/2026 richiede il token admin di Claudio;
- inserire credenziali, inviare email o messaggi.

Queste azioni vanno preparate nel report, con valori esatti, per Claudio.

## Quando fermarsi

- Prerequisito mancante.
- Dati partner mancanti su headline, offerta o prezzo.
- Il link Condividi importa nell'account sbagliato.
- Un salvataggio non risulta alla rilettura via connector.
- Qualsiasi richiesta di password, pagamento o conferma legale.

Fermarsi = lasciare il lavoro salvato fin lì, scrivere nel report cosa manca, chi deve agire e la prossima azione.
