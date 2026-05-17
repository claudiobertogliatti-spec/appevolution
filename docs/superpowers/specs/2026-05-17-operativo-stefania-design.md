# Spec — Operativo Stefania (sub-progetto A)

**Data:** 2026-05-17
**Scope:** Shell concierge AI per il journey partner Evolution PRO. Fondamenta su cui si attaccano i sub-progetti B (generatori AI), C (asset collection + handoff Systeme), D (assistenza editing video).
**Owner:** Claudio Bertogliatti
**Stato:** Design approvato, da implementare.

## 1. Visione in una frase

Il partner che si logga vede **una sola schermata** che gli dice cosa fare adesso, lo guida con la voce di Stefania, e a fine percorso gli fa pensare *"è stato più semplice di quanto pensassi — grazie Evolution PRO"*.

## 2. Principio guida

**Una cosa alla volta. Sempre chiaro dove sei. Alla fine un grazie.**

Tre regole derivate che ogni decisione di design deve rispettare:

1. **Niente menu a 14 voci**: il partner non sceglie da dove iniziare. Stefania glielo dice.
2. **Lo stato è visibile sempre**: progress bar in cima mostra a che step sei su quanti.
3. **Le transizioni sono automatiche**: completato uno step, si apre il prossimo senza fatica del partner.

## 3. Layout (variant B — locked)

Stack verticale a 3 zone, full-width:

```
┌──────────────────────────────────────────────────────────────┐
│  PROGRESS BAR — Step 4 di 12 · Brand kit                     │
├──────────────────────────────────────────────────────────────┤
│  [S]  Stefania: "Ora siamo al brand kit. Servono logo +      │
│       1 foto + 3 colori. Ti spiego in 30 sec."   [Chiedi →]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   AZIONE CORRENTE (full-width)                               │
│                                                              │
│   Brand kit                                                  │
│   Logo + 1 foto + 3 colori                                   │
│   [drop zone]                                                │
│   [palette picker]                                           │
│   [CTA "Fatto, avanti →"]                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Rationale:** Stefania come voce narrante orizzontale + tool full-width sotto. Percorso lineare visivamente chiaro. La chat "vera" si apre solo cliccando "Chiedi →" (modal o pannello drawer da destra).

### Palette e font (Ciak brand)

- Background page: `#F8FAFC` (slate-50, bianco sporco)
- Card/panel: `#FFFFFF` con bordo `#E5E7EB` (gray-200)
- Testi primari: `#0F172A` (slate-900, blu notte)
- Testi muted: `#64748B` (slate-500, grigio medio)
- CTA primary: bg `#FACC15` (yellow-400) + text `#0F172A`
- Step "now" nella progress bar: dot `#FACC15` con alone `rgba(250,204,21,0.25)` (3px)
- Font: **Poppins** 400 / 500 / 600 (lo stesso di ciak.io)

## 4. Modello fasi → step concreti

Le 7 fasi storiche F1-F7 sono troppo grosse per "una cosa alla volta". Si esplodono in **~13 step lineari**, ognuno = UNA azione singola. Ogni step appartiene a una fase (utile per analytics admin e per status legacy).

| # | Step | Cosa fa il partner | Fase legacy | Componente UI |
|---|---|---|---|---|
| 1 | Contratto + distinta | Upload 2 PDF | F1 | `Step01Contratto.jsx` |
| 2 | Discovery video | Guarda video onboarding (~15min) | F1 | `Step02DiscoveryVideo.jsx` |
| 3 | Brand kit | Logo + foto + 3 colori | F2 | `Step03BrandKit.jsx` |
| 4 | Posizionamento | Risponde 8 domande nicchia/promessa | F2 | `Step04Posizionamento.jsx` |
| 5 | Script masterclass | Genera script 60min con AI (tool sub-prog B) | F3 | `Step05ScriptMasterclass.jsx` |
| 6 | Outline lezioni | Genera titoli + descrizioni (tool B) | F3 | `Step06OutlineLezioni.jsx` |
| 7 | Registra masterclass | Upload video grezzo | F4 | `Step07RegistraMasterclass.jsx` |
| 8 | Registra lezioni | Upload video grezzi | F4 | `Step08RegistraLezioni.jsx` |
| 9 | Funnel asset | Conferma brand + scrivi promessa hero | F5 | `Step09FunnelAsset.jsx` |
| 10 | Team Evolution costruisce funnel Systeme | (passivo, Antonella lavora dietro le quinte) | F5 | `Step10FunnelTeamWork.jsx` |
| 11 | Calendario editoriale 30gg lancio | Genera con AI (tool B) | F6 | `Step11Calendario.jsx` |
| 12 | Strategia prezzo + webinar live | Genera con AI (tool B) | F6 | `Step12PrezzoWebinar.jsx` |
| 13 | LANCIO | Checklist go-live (data, webinar setup, pubblicazione) | F7 | `Step13Lancio.jsx` |
| 🎉 | Schermata finale | "Hai fatto tutto. Il tuo modello è live. Grazie." | F7+ | `StepFinaleCelebrativa.jsx` |
| post | Operativo Continuo | KPI + next-best-action mensile | F7+ | `OperativoContinuo.jsx` |

**Note operative:**
- Lo step 10 ("team costruisce funnel") non richiede azione al partner — mostra stato "Antonella ci sta lavorando, finiamo entro 3-5 giorni lavorativi" + notifica Telegram automatica ad Antonella al momento in cui lo step 9 viene chiuso. Il partner può procedere su 11/12 in parallelo? **No** — 11/12 dipendono dal funnel pubblicato per generare il calendario lancio coerente. Quindi è blocking. Stefania spiega che il partner può iniziare a registrare lezioni/masterclass se gli step 7/8 non sono ancora fatti, oppure rilassarsi e tornare quando notifichiamo.
- La schermata finale celebrativa non è un nuovo step "obbligatorio" — appare automaticamente la prima volta che il partner si logga dopo che lo step 13 è marcato completo. Permanenza: 1 sessione (poi diventa OperativoContinuo).

## 5. Comportamento Stefania — 4 modalità

| # | Modalità | Trigger | Esempio output |
|---|---|---|---|
| 1 | **Briefing** | Step appena aperto | "Ora vediamo X. Ti spiego in 30 secondi cosa serve, poi facciamo insieme." |
| 2 | **Affiancamento** | Partner clicca "Chiedi →" | Chat tradizionale, Stefania risponde a dubbi specifici dello step corrente |
| 3 | **Conferma** | Step segnato done | "Fatto. Hai chiuso lo step X. Andiamo al prossimo: Y." |
| 4 | **Proattiva** | Partner inattivo ≥3gg sullo stesso step | Notifica email + messaggio in-app: "Ciao, sei rimasto fermo su X da 5 giorni. Vuoi che lo facciamo insieme adesso?" |

**Tono:** quello già documentato in `stefania_ai_onboarding.py` — pacato, diretto, non motivazionale, zero emoji nei contesti operativi. La schermata finale celebrativa è l'unica eccezione: lì il tono è caldo/grato.

## 6. Posizionamento in app

**Sostituisce la home del partner Ciak loggato.** Quando il partner accede a `ciak.io/partner` viene redirezionato alla nuova pagina `ciak.io/partner/operativo` (o questa diventa la home senza redirect).

La vecchia dashboard `PartnerDashboard.jsx` (con widget sparsi) diventa accessibile da menu hamburger come "Strumenti avanzati" per quel 5% di partner che vuole bypassare il percorso. Non è il default e non è visivamente in evidenza.

**Comportamento post-lancio:** dopo lo step 13 chiuso, l'URL `ciak.io/partner/operativo` mostra `OperativoContinuo.jsx` invece dell'esperienza step-by-step. Continuità di esperienza, non rottura del bookmark.

## 7. Architettura tecnica

### 7.1 Modello dati (MongoDB)

**Nuova collection: `partner_journey_steps`**

```json
{
  "_id": "...",
  "partner_id": "<id>",
  "step_id": "01-contratto",        // slug stabile per ogni step
  "step_number": 1,                  // 1..13
  "fase_legacy": "F1",               // mapping a fasi pre-esistenti
  "status": "pending|in_progress|done|blocked|skipped",
  "started_at": "2026-05-17T10:00:00Z",
  "completed_at": "2026-05-17T10:25:00Z",
  "data": { ... },                   // step-specific payload (es. URL upload, scelte form, output AI)
  "stefania_briefing_shown": true,
  "stefania_proactive_sent_at": null  // ultima volta che Stefania ha mandato proattiva su questo step
}
```

Seed iniziale: alla prima richiesta `GET /api/partner/journey/state`, se non esistono record per `partner_id`, vengono creati 13 record con `status: "pending"` (eccetto step 1 in `in_progress`).

**Modifica collection esistente `partners`:** aggiunta campo `journey_current_step` (1-13 + "completato") per accesso rapido senza join. Aggiornato a ogni transizione.

### 7.2 Backend — nuovi endpoint

```
GET  /api/partner/journey/state
     → ritorna current step + data + tutti gli step con status

POST /api/partner/journey/{step_id}/complete
     → marca step done + avanza current_step + crea audit log + notifica (Telegram/email) se step 9→10
     body: { data: {...} }  // step-specific

POST /api/partner/journey/{step_id}/data
     → aggiorna parziale data dello step in-progress (autosave form/upload)

GET  /api/partner/journey/stefania-context
     → ritorna context strutturato per Stefania (current step + status + cosa serve + cosa è bloccante)
```

Router: `backend/routers/partner_journey.py` (file esistente — esplorato in mappatura — da estendere).

### 7.3 Backend — modifica Stefania context

Estendere `_build_context()` in `backend/routers/stefania_chat.py` con query live:

```python
journey_state = await db.partner_journey_steps.find(
    {"partner_id": partner_id}
).to_list(20)
current_step = next((s for s in journey_state if s["status"] == "in_progress"), None)
```

E iniettare nel system prompt:
```
Il partner è allo step {current_step['step_number']}/13: {step_label}.
Status: {current_step['status']}. Cosa serve: {step_required_action}.
Bloccanti: {blockers}.
Tua modalità ora: {Briefing/Affiancamento/Conferma/Proattiva}.
```

System prompt esistente in `backend/stefania_ai_onboarding.py` esteso con sezione "MODALITÀ CONCIERGE JOURNEY" che descrive le 4 modalità con esempi.

### 7.4 Frontend — nuovo

```
frontend/src/ciak/partner/operativo/
  PartnerOperativo.jsx           ← container, gestisce loading + routing step
  ProgressBar.jsx                ← progress bar in cima (13 dots + label step)
  StefaniaVoiceNarrante.jsx      ← banda orizzontale Stefania con CTA "Chiedi"
  StefaniaDrawer.jsx             ← drawer chat che si apre da destra al click "Chiedi"
  steps/
    Step01Contratto.jsx
    Step02DiscoveryVideo.jsx
    Step03BrandKit.jsx
    ...
    Step13Lancio.jsx
    StepFinaleCelebrativa.jsx
    OperativoContinuo.jsx
  hooks/
    useJourneyState.js           ← polling + state management
    useStefaniaBriefing.js       ← trigger briefing al cambio step
```

**Pattern dei componenti `StepXX*.jsx`:** ognuno espone props uniformi:
- `step` (oggetto dal backend con data correnti)
- `onSaveDraft(data)` (autosave debounced)
- `onComplete(data)` (al click CTA finale → POST /complete + transizione automatica)
- `onBlocked(reason)` (rare; usato da step 10 mentre Antonella lavora)

Ogni step è autonomo: tutta la logica di quel passaggio (upload, form, generazione AI, ecc.) è interna al componente. Il container `PartnerOperativo.jsx` non sa quale step è in mostra, monta dinamicamente in base a `journey_current_step`.

### 7.5 Notifiche e proattività

- **Step 9 → 10 transition**: backend invia Telegram bot ad Antonella ("Partner X ha completato asset funnel, costruisci pagine Systeme") + email a antonella.rossi.ar28@gmail.com con riepilogo asset.
- **Inattività ≥3 giorni stesso step**: Celery beat task `check_inactive_journey_steps` ogni 24h trova partner con `started_at` >3gg fa e `status=in_progress`. Per ognuno: invia email + crea record `notification_in_app` che `PartnerOperativo.jsx` mostra come banner in cima. Stefania, quando ri-aperta, parte in modalità Proattiva.

## 8. Cosa NON è in scope di A

- **I generatori AI veri** (script masterclass, outline lezioni, calendario editoriale, prezzo+webinar): sub-progetto B. In A i componenti `Step05ScriptMasterclass.jsx` ecc. mostrano solo un placeholder "🚧 Tool in arrivo — per ora compila manualmente questo campo, lo automatizziamo a breve" oppure usano la versione semplice esistente (es. AI copy funnel su `funnel_builder.py:228-351` è già lì).
- **L'editing video assistito**: sub-progetto D. In A gli step 7/8 sono solo upload + status pipeline (la pipeline `masterclass_factory` esiste).
- **L'integrazione automatica Systeme.io**: continua a essere manuale (Antonella lavora dietro le quinte). Sub-progetto C copre la notifica + l'upload asset.
- **Animazioni elaborate / confetti sulla schermata celebrativa**: placeholder testuale + card semplice. Il polish visivo dopo.
- **Operativo Continuo post-lancio dettagliato**: in A è un placeholder ("Hai lanciato. Qui arriveranno KPI + next-best-action — work in progress"). Sarà spec separata quando arriviamo al primo partner post-lancio.

## 9. Criteri di accettazione

1. Un partner in F1 si logga su `ciak.io/partner` → atterra su `/operativo` → vede progress bar 1/13 + step "Contratto + distinta" + Stefania voce narrante che dice "Carichiamo subito contratto firmato + distinta di pagamento".
2. Carica 2 PDF, clicca "Fatto, avanti →" → step 1 marcato done → automaticamente si apre step 2 "Discovery video" → Stefania dice "Bene. Adesso guardiamo insieme un video di 15 min sul percorso".
3. Step 9 chiuso → Antonella riceve notifica Telegram + email entro 30 secondi.
4. Partner inattivo da 3+ giorni su step 5 → riceve email proattiva + al prossimo login vede banner in cima + Stefania apre con tono proattivo.
5. Step 13 chiuso → al prossimo login il partner vede schermata celebrativa per 1 sessione, poi `OperativoContinuo.jsx` placeholder.
6. Vecchia `PartnerDashboard.jsx` accessibile da menu hamburger come "Strumenti avanzati" — non più home default.

## 10. Decisioni locked (17/5/2026)

1. **Skip / re-do step**: il partner **può modificare** step già done cliccando lo step nella progress bar (es. cambiare logo). **Non può saltare** step non ancora aperti — il percorso resta lineare. Implementazione: ogni step done è cliccabile sulla progress bar, apre lo stesso componente con i `data` correnti pre-popolati. Save → resta nello stato done. Per ri-aprire un altro step interrotto, partner naviga manualmente avanti.
2. **Multi-device autosave**: salvataggio cloud (Cloudinary per file, MongoDB per form data) ad ogni `onSaveDraft` debounced 1s. Il `data` blob nel record `partner_journey_steps` è la single source of truth per la bozza. Apertura su nuovo device → ripristina da quello senza prompt.
3. **Migrazione 26 partner esistenti**: script one-shot al deploy che legge `partners.phase` per ogni partner attivo e seeda `partner_journey_steps`:
   - Partner in F5+ (già lanciati): tutti 13 step seedati con `status: done`, `journey_current_step = "completato"`. Al login atterra su `OperativoContinuo.jsx`.
   - Partner in F1-F4: step 1..N seedati `done`, step N+1 `in_progress`, resto `pending`. Mapping F→N: F1→2, F2→4, F3→6, F4→8 (conservativo, partner può sempre riaprire step già done se ha buchi).
   - Script in `backend/scripts/seed_partner_journey_v1.py`, idempotente (re-run safe via check su esistenza record).
4. **Stefania NON valida**: nessuna validation automatica in v1. Gli upload sono accettati così come sono. Antonella in admin backoffice vede gli output di ogni step e può "riaprire" uno step per richiesta correzione (endpoint admin `POST /api/admin/partner/{id}/journey/{step_id}/reopen` + notifica al partner via email + banner in-app). Validation AI è feature futura, fuori scope di A.

## 11. Sub-progetti dipendenti

| Sub-prog | Cosa serve | Quando può partire |
|---|---|---|
| **B — Generatori AI** | Steps 5/6/11/12 attivati con placeholder. B implementa i tool reali uno alla volta. | Dopo A in produzione |
| **C — Asset + handoff** | Steps 1/3/7/8/9 usano upload + step 10 mostra status handoff Antonella. Già coperto da A a livello minimo. C aggiunge UX upload più rifinita + checklist Antonella in admin. | In parallelo ad A |
| **D — Editing video** | Steps 7/8 sostituiscono upload semplice con upload + pipeline video-use B. | Dopo A in produzione + dopo primo partner che chiede |
