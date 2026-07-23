# Standard Ufficiale Dispense Partner: WORKBOOK STRATEGICO

**Stato**: ATTIVO E CONVALIDATO  
**Scope**: Piattaforma Ciak.io (`ciak.io/partner`), tutte le dispense partner del Protocollo EVO™ (14 Step).

---

## 🎨 Specifiche del Template Unificato

### 1. Copertina Ufficiale
- **Logo Reale CIAK**: Posizionato in alto nell'header (formato PNG trasparente `ciak-logo-official.png` / `/ciak/logo.webp`).
- **Banner Giallo (`#FACC15`)**: Titolo in evidenza **`WORKBOOK STRATEGICO`**.
- **Sottotitolo Ufficiale**: *"Una guida esclusiva per la realizzazione di accademie digitali di successo"*.
- **Metadati Partner**:
  - `Preparato per:` Nome Partner
  - `Progetto / Accademia:` Nome Progetto / Accademia
  - `Data Inizio Lavori:` Data primo step
  - `Tutor Strategico:` Claudio Bertogliatti & Team CIAK.io
- **Stemma di Validazione**: Seal dorato *"Validato dal Team CIAK + Metodo EVO"*.

### 2. Pagine Interne (Stile Business Plan Sobrio)
- **Numerazione Formale**: Sezioni `1.0 Executive Summary & Identità`, `2.0 Posizionamento Strategico & Target ICP`, `3.0 Brand Kit`, etc.
- **Griglia & Righe Divisorie**: Layout pulito con separatori minimali (`#E2E8F0` / `#CBD5E1`).
- **Box Note Tutor Umano (Claudio Bertogliatti)**: Riquadro tenue `bg-yellow-50` con bordo ambra e virgolette di Claudio.
- **Box Script & Output AI**: Riquadro grigio tratteggiato in font monospaziato `Space Mono` per gli script video e i testi pronti all'uso.

---

## ⚙️ Componenti Backend & Frontend Implementati
- `backend/services/partner_rewards_pdf.py` (`render_project_book_pdf`)
- `backend/services/piano_operativo_pdf_renderer.py` (`render_piano_operativo_html`)
- `frontend/src/ciak/pages/CiakDispensaDemo.jsx` (Demo web visuale)
- `frontend/src/ciak/partner/rewards/ProjectBookCard.jsx` (Card download partner)
