# Standard Ufficiale Dispense Partner: WORKBOOK STRATEGICO

**Stato**: 🔒 **LOCK — congelato da Claudio il 30/07/2026. NON modificare la grafica.**
**Scope**: Piattaforma Ciak.io (`ciak.io/partner`), tutte le dispense partner del Protocollo EVO™.

> ⛔ **Regola**: questo template non si ridisegna, non si "migliora" e non si sostituisce con altre
> spec. Se una spec in `docs/superpowers/specs/` dice altro sulla grafica, **vince questo file**
> (la spec `2026-07-01-ciak-partner-libretto-attestati-design.md` resta valida solo per la parte
> funzionale: premi, stati UI, regole di sblocco). Modifiche solo su richiesta esplicita di Claudio.

---

## 🎨 Specifiche del Template Unificato

### 1. Copertina Ufficiale
- **Fondo chiaro (bianco)** chiuso da una riga gialla `#FACC15` spessa 4px.
  🔴 **Mai fondo navy**: il logo ufficiale e' navy con payoff "SI CAMBIA" e su scuro sparisce
  (verificato il 30/07/2026 affiancandolo su navy / bianco / `#F8FAFC`).
- **Logo Reale CIAK** in alto a sinistra, altezza 64px, incorporato in **base64 data URI**
  (Playwright riceve l'HTML con `set_content` e non risolve i percorsi relativi).
  File: `backend/assets/ciak-logo.webp` (copia di `frontend/public/ciak/logo.webp`).
- **Stemma di Validazione** in alto a destra: pill giallo tenue `#FEF9C3`, bordo `#FDE047`,
  testo ambra `#854D0E`, pallino verde: *"VALIDATO DAL TEAM CIAK + METODO EVO"*.
- **Banner Giallo (`#FACC15`)**: titolo **`WORKBOOK STRATEGICO`** in navy.
- **Sottotitolo Ufficiale**: *"Una guida esclusiva per la realizzazione di accademie digitali di successo"*.
- **Metadati Partner**: `Preparato per:` · `Progetto / Accademia:` · `Data Inizio Lavori:` ·
  `Fase attuale:` — etichette grigie, valori navy in grassetto.
- **Badge Tutor** in basso a destra: iniziali su cerchio giallo + "Claudio Bertogliatti /
  Tutor Strategico CIAK.io".

### 2. Indice del Progetto
Fascia `#F8FAFC` subito sotto la copertina: griglia a due colonne con le 13 sezioni,
ognuna marcata **Compilata** (verde) o **In preparazione** (grigio), e il conteggio in testa.

### 3. Pagine Interne (Stile Business Plan Sobrio)
- **Numerazione Formale** `1.0`, `2.0`, … con occhiello "SEZIONE n.0" in ambra, titolo navy e
  riga divisoria `#E2E8F0`.
- **Le 13 sezioni, in quest'ordine** (non si aggiungono, non si rinominano):
  1.0 Executive Summary & Identita' · 2.0 Target & ICP · 3.0 Problema che risolvi · 4.0 Promessa ·
  5.0 Posizionamento Strategico · 6.0 Brand Kit · 7.0 Struttura Masterclass · 8.0 Struttura Corso ·
  9.0 Offerta & Pricing · 10.0 Sistema di Vendita · 11.0 Calendario di Lancio · 12.0 Webinar & Live ·
  13.0 Obiettivi Post-Lancio.
- **Sezioni senza dati**: mai vuoti tecnici, sempre
  *"Questa sezione si completera' nella prossima fase del percorso."* in corsivo grigio.
- **Box Note Tutor Umano**: riquadro `#FEFCE8`, bordo `#FEF08A`, barra sinistra gialla,
  intestazione *"NOTE DEL TUTOR UMANO (Claudio Bertogliatti)"*.
- **Box Script & Output AI**: riquadro `#F8FAFC` con bordo **tratteggiato**, font **`Space Mono`**,
  intestazione a sinistra e *"Copia & Incolla"* ambra a destra. Gli script (masterclass,
  videolezioni) stanno **solo qui**, mai incollati nel corpo del testo.
- **Footer**: `© 2026 CIAK.io — Workbook Strategico Riservato` + "Preparato per: <partner>".

### 4. Regole di contenuto che il render deve rispettare
- Il **prezzo viene sempre dalla scheda partner (hub)**, mai dal contenuto generato dall'AI.
  Se la traccia webinar riporta prezzi diversi, si stampa l'offerta vera e si segnala che la
  traccia va riallineata.
- I dati si leggono dalle fonti reali: `partner_journey_steps.data.answers`, `partner_hub`,
  `masterclass_factory`, `partner_videocorso`, `partner_brand_kits` e lo step `03-brand-kit.data`.
- Niente dizionari Python, niente markdown grezzo, niente testo troncato a meta' parola.

---

## ⚙️ Implementazione (fonte di verita' del render)
- `backend/services/project_book_html.py` → `render_project_book_html` + `genera_project_book_pdf`
  (HTML → `ciak_pdf.html_to_pdf`, Playwright). **È qui che vive il template.**
- `backend/routers/partner_rewards.py` → contenuti delle 13 sezioni (`_project_sections`).
- `backend/services/partner_rewards_pdf.py` → fallback reportlab se chromium manca (resa povera,
  stessi titoli): serve solo a non lasciare il partner senza documento.
- `backend/services/piano_operativo_pdf_renderer.py` → stesso sistema visivo, dispensa gemella.
- `frontend/src/ciak/partner/rewards/ProjectBookCard.jsx` → card di download lato partner.
- `frontend/src/ciak/pages/CiakDispensaDemo.jsx` → demo web.

⬜ **Non ancora allineati allo standard**: attestati di fase e bonus PDF, generati ancora con
reportlab (`render_certificate_pdf`, `render_bonus_pdf`).
