"""
ISTRUZIONI PER EMERGENT — Agent Hub Frontend

Obiettivo: ridurre da 9 a 6 agenti attivi, eliminare ORION/MARTA/LUCA/ATLAS,
aggiornare nomi/ruoli, aggiungere MARCO, correggere layout e header.

═══════════════════════════════════════════════════════════════════
STEP 1 — BACKEND: eliminare gli agenti inutilizzati
═══════════════════════════════════════════════════════════════════

Nel database MongoDB, imposta status="inactive" per questi agenti:
- ORION
- MARTA
- LUCA
- ATLAS

Oppure, se gli agenti sono definiti come costanti nel backend, rimuovi
ORION, MARTA, LUCA, ATLAS dall'array/dict degli agenti attivi.

Aggiorna l'endpoint GET /api/agents (o equivalente) per restituire
SOLO gli agenti attivi: MAIN, VALENTINA, ANDREA, GAIA, STEFANIA, MARCO.

═══════════════════════════════════════════════════════════════════
STEP 2 — FRONTEND: aggiornare nomi e ruoli agenti
═══════════════════════════════════════════════════════════════════

Nel componente AgentHub (es. AgentHub.jsx o AgentiAI.jsx), aggiorna
i dati degli agenti come segue:

VALENTINA:
  - Nome: VALENTINA
  - Sottotitolo: "Onboarding & Consulenza"   ← era "Orchestratrice"
  - Tag: "Partner Contact"                    ← invariato
  - Metriche: total conversations, ultimo accesso partner

ANDREA:
  - Nome: ANDREA
  - Sottotitolo: "Avanzamento Corso & Video"  ← era "Video Production"
  - Tag: "Produzione"                         ← invariato
  - Metriche: videos_produced, pending, completed

GAIA:
  - Nome: GAIA
  - Sottotitolo: "Supporto Tecnico"           ← era "Funnel & Incident"
  - Tag: "Supporto Tech"                      ← era "Esecuzione Tech"
  - Metriche: tickets_aperti, tickets_risolti, tempo_medio_risposta

STEFANIA:
  - Nome: STEFANIA
  - Sottotitolo: "Orchestrazione"             ← era "Copy & Traffico"
  - Tag: "Coordinamento"                      ← era "ADV & Copy"
  - Metriche: partner_monitorati, alert_attivati, routing_oggi

MARCO (NUOVO — aggiungere):
  - Nome: MARCO
  - Sottotitolo: "Accountability Settimanale"
  - Tag: "Accountability"
  - Colore tag: arancione (#F59E0B)
  - Icona: calendario o checklist (emoji: 📋 oppure usa l'icona CheckSquare di lucide)
  - Metriche: checkin_settimana, partner_inattivi, avvisi_inviati
  - Status dot: verde (attivo)
  - Budget: da impostare (es. $0 inizialmente)

═══════════════════════════════════════════════════════════════════
STEP 3 — FRONTEND: aggiornare header e contatore
═══════════════════════════════════════════════════════════════════

Cambia:
  "Centro di controllo per i 9 agenti AI Evolution PRO"
→ "Centro di controllo per i 6 agenti AI Evolution PRO"

Cambia:
  "Team Agenti (9)"
→ "Team Agenti (6)"

═══════════════════════════════════════════════════════════════════
STEP 4 — FRONTEND: layout a 3 colonne → aggiornare per 6 agenti
═══════════════════════════════════════════════════════════════════

Layout attuale: griglia 3 colonne × 3 righe = 9 card
Layout nuovo: griglia 3 colonne × 2 righe = 6 card

Prima riga: VALENTINA, ANDREA, MARCO
Seconda riga: GAIA, STEFANIA, MAIN

MAIN rimane visibile ma come "Sistema Centrale" — è il coordinatore tecnico.

═══════════════════════════════════════════════════════════════════
STEP 5 — FRONTEND: aggiornare Business Summary
═══════════════════════════════════════════════════════════════════

Il pannello Business Summary in cima all'Agent Hub mostra:
- Partner Totali
- Lead Totali (da eliminare — non rilevante nel nuovo modello)
- MRR Mese (mantenere e collegare al dato reale)
- Lead HOT (da eliminare)
- LTV Medio (mantenere)

Nuovo layout Business Summary (3 card invece di 5):
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │ Partner Attivi  │  │   MRR Mensile   │  │   LTV Medio     │
  │       5         │  │      €0         │  │    €2.580       │
  └─────────────────┘  └─────────────────┘  └─────────────────┘

═══════════════════════════════════════════════════════════════════
RIEPILOGO AGENTI FINALI (in ordine di posizione nel layout)
═══════════════════════════════════════════════════════════════════

Posizione 1: VALENTINA  — Onboarding & Consulenza   — Partner Contact (rosa)
Posizione 2: ANDREA     — Avanzamento Corso & Video  — Produzione (viola)
Posizione 3: MARCO      — Accountability Settimanale — Accountability (arancione) ← NUOVO
Posizione 4: GAIA       — Supporto Tecnico           — Supporto Tech (azzurro)
Posizione 5: STEFANIA   — Orchestrazione             — Coordinamento (verde)
Posizione 6: MAIN       — Sistema Centrale           — Coordinamento (grigio)

Agenti da RIMUOVERE completamente dalla UI:
✗ ORION   (Sales Intelligence)
✗ MARTA   (CRM & Revenue)
✗ LUCA    (Compliance)
✗ ATLAS   (Post-Sale & LTV)
"""
