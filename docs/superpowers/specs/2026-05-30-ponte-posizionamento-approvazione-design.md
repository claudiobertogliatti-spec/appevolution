# Ponte Documento di Posizionamento → "I Miei File" + coda approvazione admin

**Data:** 2026-05-30  
**Stato:** Approvato in brainstorming, pronto per implementation plan  
**Riferimento aperto:** sessione 29/5/2026 — aperti #1 (vista partner EVO)  
**Owner:** Claudio + assistente AI

## Contesto

La vista partner Ciak `/partner` è stata ristrutturata sulle 3 fasi del Metodo EVO (Esamina · Valida · Ottimizza) e deployata il 29/5/2026 (commit `1ef9bf7`, backend rev `00300-9v5`).

Lo step `04-posizionamento` (n.5 in fase Esamina) chiude logicamente la fase: è il primo deliverable concreto del Metodo EVO. Oggi:

- Quando il partner completa il wizard, `complete_operativo_step` chiama `_notify_admin_partner_activity(..., requires_approval=True)` → alert in `alerts` con `requires_approval=true`, ping Telegram admin.
- Lo step va in `done` e il successivo (`05-script-masterclass`, fase Valida) parte subito.
- **NIENTE produce un file**: il `positioning_output` resta JSON in `partner_posizionamento`.
- **NIENTE legge la coda di approvazione**: `Oggi.jsx` ha un counter "Approvazioni in attesa" che conta solo analisi + bonifici, non i materiali partner.
- `PartnerFilesPage` ha già la categoria `posizionamento` definita in UI, ma vuota.

Risultato operativo: il flag `requires_approval=true` esiste solo come testo nel feed alert. Non c'è materiale da aprire, niente azione Approva/Rifiuta, niente riflesso sullo stato di fase. Il "ponte" è da costruire.

## Obiettivo

Connettere produzione → registrazione → approvazione del Documento di Posizionamento, in modo che:

1. Completando il wizard, il partner trova un **PDF** brandizzato in "I Miei File".
2. L'admin, da `Oggi`, vede una **coda di approvazioni materiali** con azione Approva/Rifiuta.
3. L'approvazione fa **chiudere visivamente Esamina** (badge 5/5 verde); il rifiuto **riapre lo step** con una nota dell'admin nella chat di Valentina.

Gate **soft**: il partner avanza subito allo step successivo, ma lo stato di approvazione resta tracciato e visibile.

## Out of scope

- Brand-kit approval (`03-brand-kit` riceverà lo stesso pattern in una spec successiva).
- Storia versioni PDF nel partner UI (solo "current" in MVP).
- Email transactional al partner su rifiuto (Telegram opzionale già coperto).
- Migrazione retroattiva per partner che hanno già completato `04-posizionamento` prima di questa feature.
- Approvazione del Doc Posizionamento prima dell'integrazione con il `positioning_output` reale (lo stesso pattern coprirà gli altri step deliverable).

## Architettura

Tre moduli connessi, niente refactor dello state machine del journey:

```
PARTNER completa wizard Posizionamento (UI esistente)
        │
        ▼
[1] PRODUZIONE  — backend renderizza PDF da template HTML
        │      (Playwright/Chromium, riuso pattern Analisi Plan B)
        ▼
[2] REGISTRAZIONE — inserisce record in collection `files` con
        │           category=posizionamento, status=under_review
        │           + journey step `04-posizionamento` riceve
        │             campo nuovo `approval_status=pending_review`
        │           + alert esistente con `requires_approval=true`
        │             ottiene `file_id` per il deep-link admin
        ▼
[3] APPROVAZIONE — admin in Oggi vede coda, clicca Apri → vede PDF
                   ├─ Approva → step.approval_status=approved,
                   │           file.status=approved,
                   │           alert.resolved=true,
                   │           Esamina mostra 5/5 verde
                   └─ Rifiuta+nota → step torna in_progress,
                                     file.status=rejected,
                                     messaggio bot nella chat
                                     Valentina con la nota,
                                     badge "Da rivedere" sullo step
```

**Cambiamenti zero a:**
- modello `PartnerJourneyStep` (aggiungo solo campi opzionali `approval_*`)
- `complete_operativo_step` (resta invariato; hook nuovo post-completamento)
- `get_operativo_state` (espone i nuovi campi opzionali, default `null`)
- routing partner esistente

**Cambiamenti chirurgici a:**
- `PartnerFilesPage` (badge "In revisione" / "Rifiutato" + nota inline)
- `Oggi.jsx` (sezione "Approvazioni materiali" cliccabile)
- nuovo router admin per Approva/Rifiuta
- nuovo endpoint partner `/finalize`

## Modello dati

### Nuovi campi su `partner_journey_steps`

```python
approval_status: Optional[str] = None
    # None | "pending_review" | "approved" | "rejected"
approval_file_id: Optional[str] = None      # FK → files.file_id
approval_note: Optional[str] = None         # nota admin in caso rejected
approval_resolved_at: Optional[datetime] = None
```

Default `None` (=step senza approvazione richiesta). Valorizzati solo per step in `_DOC_APPROVAL_STEPS` (oggi `{04-posizionamento, 03-brand-kit}`).

### Nuovo record in `files` (estende schema esistente)

```python
{
  "file_id": str,
  "partner_id": str,
  "category": "posizionamento",
  "file_type": "document",
  "original_name": "Documento di Posizionamento - <Nome Partner>.pdf",
  "internal_url": "/api/files/posizionamento/<file_id>.pdf",
  "status": "under_review" | "approved" | "rejected",
  "step_ref": "04-posizionamento",        # NEW — collega al journey step
  "rejection_note": Optional[str],        # NEW
  "approved_by": Optional[str],           # NEW — admin email
  "approved_at": Optional[datetime],      # NEW
  "rejected_at": Optional[datetime],      # NEW
  "superseded": bool = False,             # NEW — vecchie versioni dopo rifiuto
  "uploaded_at": datetime,
  "size": int,
  "size_readable": str,
}
```

### Storage PDF

Cloudinary se configurato (pattern `partner_documents.py`), fallback `file_storage` locale.  
Folder: `evolution-pro/partners/{partner_id}/posizionamento/`.  
Naming: `posizionamento-{timestamp}.pdf` — versioning by timestamp, vecchie versioni restano scaricabili come storia.

## Contratti API

### Partner-side

**`POST /api/partner/posizionamento/finalize`**  
Chiamato dal wizard quando il partner approva il `positioning_output`.

Body: `{ partner_id: str }`  
Effetti:
1. Renderizza PDF da template HTML (vedi sezione "Generatore PDF").
2. Upload Cloudinary (con fallback locale).
3. Insert record `files` con `status=under_review`.
4. Update `partner_journey_steps` con `approval_status=pending_review`, `approval_file_id=<file_id>`.
5. Esegue server-side la stessa POST a `/operativo/complete/{partner_id}/04-posizionamento` (chiamata interna alla funzione, non HTTP self-call) → riusa la logica esistente che mark step `done`, notifica admin con `requires_approval=true`, e advance del prossimo step. L'alert generato viene poi arricchito con `file_id` per il deep-link "Apri PDF" dalla coda admin.

Idempotenza:
- Se esiste già un file `posizionamento` con `status=under_review` per quel partner → ritorna lo stesso `file_id`, no-op.
- Se esiste con `status=approved` → 409 `{detail: "Documento già approvato; per modificarlo chiedi al team di riaprire lo step"}`.

Risposta: `{ file_id, internal_url, status, approval_status }`

**`GET /api/partner/posizionamento/document/{partner_id}`**  
Ritorna metadata del PDF corrente (current = non-superseded più recente).

Risposta: `{ file_id, internal_url, status, rejection_note, uploaded_at }` o `null` se nessuno.

### Admin-side

**`GET /api/admin/approvazioni/queue`**  
Lista record `files` con `status=under_review`, joined con partner name+email + step label.  
Ordine: più vecchi prima (FIFO).  
Query params opzionali: `category` (default `all`).

Risposta:
```json
{
  "total": 3,
  "items": [
    {
      "file_id": "...",
      "partner_id": "...",
      "partner_name": "Mario Rossi",
      "partner_email": "...",
      "category": "posizionamento",
      "category_label": "Documento di Posizionamento",
      "step_ref": "04-posizionamento",
      "step_label": "Posizionamento",
      "internal_url": "...",
      "uploaded_at": "...",
      "age_human": "2 ore fa"
    }
  ]
}
```

**`POST /api/admin/approvazioni/{file_id}/approve`**  
Admin email letta dal contesto di auth admin esistente (stesso pattern degli altri endpoint `admin_*`). Se l'admin non è autenticato, 401.

Effetti (in transazione logica — `findAndUpdate` ottimistico):
- `files.status: "approved"`, `approved_by`, `approved_at`.
- `partner_journey_steps.approval_status: "approved"`, `approval_resolved_at`.
- Alert collegato (`alerts` con `kind=partner_activity, requires_approval=true, partner_id, step_id`): `resolved=true`.

Race: filtro `files.status: "under_review"`. Se il filtro non matcha → 409 `{detail: "Già processato"}`.

**`POST /api/admin/approvazioni/{file_id}/reject`**  
Body: `{ note: str }` — required, min 10 char.

Effetti:
- `files.status: "rejected"`, `rejection_note`, `rejected_at`, `superseded=false` (resta visibile in storia).
- `partner_journey_steps.status: "in_progress"`, `approval_status: "rejected"`, `approval_note`, `completed_at: null`.
- Alert collegato: `resolved=true`.
- Insert in `agent_chats` un messaggio bot da Valentina con la nota (vedi sotto).
- Se `partners.telegram_chat_id` esiste → ping Telegram al partner.

Validazione: `note.strip()` ≥ 10 caratteri → altrimenti 400.

## Componenti UI

### Partner side (3 tocchi)

**1. `WizardPosizionamento.jsx`** (esiste)  
Il bottone "Approva e invia al team" oggi chiama `/api/partner/posizionamento/approve` → ora chiama `/api/partner/posizionamento/finalize`. Dopo successo mostra inline:
> ✓ Documento generato. Il team lo sta revisionando — di solito entro 24h.  
> Nel frattempo puoi proseguire con lo step successivo.

Spinner durante la chiamata (3-8s per il rendering PDF): `Sto generando il tuo documento...`

**2. `PartnerFilesPage.jsx`** (esiste)  
Il record categoria `posizionamento` già supporta i 3 stati (`verified/approved`, `rejected`, `pending`). Aggiunte:
- Status mapping: `under_review` → badge giallo "In revisione"; `approved` → badge verde "✓ Approvato"; `rejected` → badge rosso "✗ Da rivedere" + bottone "Apri nota del team" → mostra `rejection_note` in mini-modal.

**3. Step Posizionamento nella home Operativo**  
Sul card/pill dello step `04-posizionamento` (componenti `OperativoMappaFasi` / `StepPosizionamento`):
- `approval_status=pending_review` → pill giallo soft "In revisione"
- `approval_status=rejected` → pill rosso soft "Da rivedere" + sottotitolo "Il team ti ha lasciato una nota nella chat di Valentina"
- `approval_status=approved` → comportamento attuale (verde, fatto).

Esamina conta lo step come 'completato visivo' ma marca col puntino arancione finché `pending_review`.

### Admin side (1 tocco a Oggi + 1 pannello nuovo)

**4. `Oggi.jsx`**  
Il counter `ActionCard "Approvazioni in attesa"` oggi conta `analisi_da_approvare + bonifici_in_attesa`. Estensione:
- Aggiungere `materiali_partner_in_attesa` al backend `/api/admin/approvazioni/summary` (estensione di endpoint esistente).
- Counter diventa cliccabile → apre `ApprovazioniMaterialiPanel`.

**5. `ApprovazioniMaterialiPanel.jsx`** (nuovo, ~150 righe)  
Drawer laterale o modal. Lista da `/api/admin/approvazioni/queue`:

```
┌─ Approvazioni materiali ───────────────────┐
│  3 in attesa                                │
├─────────────────────────────────────────────┤
│  [PDF icon] Mario Rossi — Posizionamento    │
│             completato 2h fa                │
│             [Apri PDF] [Approva] [Rifiuta]  │
├─────────────────────────────────────────────┤
│  [PDF icon] Lucia B. — Posizionamento       │
│             completato 1g fa                │
│             [Apri PDF] [Approva] [Rifiuta]  │
└─────────────────────────────────────────────┘
```

Click Apri PDF → apre `internal_url` in tab nuova.  
Click Approva → POST `/approve`, rimuove riga, decrementa counter.  
Click Rifiuta → mini-modal con `<textarea required minLength={10}>` + conferma → POST `/reject`.

### Chat Valentina (riuso, nessun componente nuovo)

Hook nell'endpoint `/reject` scrive in `agent_chats` con:
```python
{
  "partner_id": str,
  "agent": "VALENTINA",
  "role": "assistant",
  "kind": "rejection_note",
  "content": (
    "Il team ha lasciato delle note sul tuo Documento di Posizionamento.\n\n"
    f"{note}\n\n"
    "Quando vuoi, torna allo step Posizionamento, aggiorna le risposte "
    "e ricaricalo. Resto qui se hai dubbi."
  ),
  "created_at": now,
}
```

La UI chat Valentina è già esistente e legge `agent_chats`. Badge "1" appare nella prossima visita.

## Generatore PDF

**Pattern di riferimento:** Analisi Plan B (sessione 29/5/2026) — `backend/services/analisi_pdf_renderer.py` (o equivalente), Playwright/Chromium già installato nel container backend.

**Nuovo modulo:** `backend/services/posizionamento_pdf_renderer.py`

```python
async def render_posizionamento_pdf(partner_id: str) -> bytes:
    """
    Carica il positioning_output dal DB, applica al template HTML,
    apre con Playwright, esporta PDF, ritorna bytes.
    """
```

**Template:** `backend/templates/posizionamento_doc.html` — layout brand Ciak:
- Header: logo Ciak + nome partner + data
- Sezioni dal `positioning_output`: ICP, promessa, posizionamento, differenziatori, tone of voice
- Footer: "Documento generato dal Metodo EVO™ — Evolution Pro"
- Stile: palette LOCK (`#0F172A`, `#FACC15`, Poppins) coerente con materiali Ciak

Astrazione: se il rendering Chromium di Analisi è facilmente riusabile (funzione `html_to_pdf(html: str) -> bytes`), si estrae come `backend/services/chromium_pdf.py` condivisa. Altrimenti due moduli paralleli, niente over-engineering.

## Edge cases & error handling

| Scenario | Comportamento |
|---|---|
| Doppio submit `/finalize` con `under_review` esistente | Ritorna stesso file_id, no-op |
| `/finalize` con `approved` esistente | 409 con messaggio dedicato |
| Approve + Reject simultanei | `findAndUpdate` filtro `status=under_review`, secondo riceve 409 |
| Partner ricarica PDF dopo rifiuto | Vecchio file resta in DB con `superseded=true`; nuovo è current; `PartnerFilesPage` filtra `!superseded` |
| Playwright timeout / Chromium crash | `/finalize` cattura, ritorna 500, no step completato, alert admin tipo BLOCCO |
| Cloudinary upload fail | Fallback locale automatico (pattern `partner_documents.py`), log warning |
| Reject senza nota | 400; UI textarea required min 10 char |
| Partner storico già done | `approval_status=null` → niente coda admin, edge case accettato |
| Chat Valentina mai aperta dal partner | `agent_chats` create-on-write, badge "1" alla prossima visita |
| Doppio click admin Approva | Secondo click riceve 409 (filtro `status=under_review` non matcha); UI tratta 409 come "già fatto" e rimuove la riga senza errore visibile |

## Testing

**Backend (`backend/tests/test_posizionamento_approval.py`):**
- `test_finalize_creates_pdf_and_file_record` — happy path
- `test_finalize_idempotent_when_pending` — secondo submit ritorna stesso file_id
- `test_finalize_blocked_when_already_approved` — 409
- `test_admin_approve_flips_states_and_resolves_alert`
- `test_admin_reject_requires_note` — 400 senza note
- `test_admin_reject_reopens_step_and_posts_chat` — verifica insert in `agent_chats`
- `test_admin_double_action_race_returns_409`
- `test_pdf_render_failure_no_partial_state` — mock Playwright raise
- `test_cloudinary_fallback_to_local`
- `test_queue_endpoint_orders_fifo`

**Frontend (smoke test manuale via Claude-in-Chrome post-deploy):**
- Partner test `deploy-check-evo`: completare wizard → vedere badge "In revisione" in PartnerFilesPage + sullo step
- Admin login → Oggi → counter incrementato → apre coda → Apri PDF → Approva → counter -1, partner vede 5/5 Esamina
- Repeat con Rifiuta + nota "Manca target ICP" → partner vede badge "Da rivedere" + messaggio in chat Valentina

## Rollout

**Ordine implementazione (1 PR mergiabile):**

1. Backend modello + endpoint + test (sicuro stand-alone, nessun chiamante esistente).
2. Generatore PDF (template HTML + wrapper Playwright). Astrazione condivisa con Analisi se possibile.
3. Hook `WizardPosizionamento` → da qui in poi i nuovi posizionamenti generano PDF.
4. `PartnerFilesPage` badge nota di rifiuto.
5. Step Posizionamento pill `pending_review` / `rejected`.
6. `Oggi.jsx` counter cliccabile + `ApprovazioniMaterialiPanel`.
7. Hook chat Valentina sul reject.

**Deploy:**
- Frontend → Vercel auto-deploy alla merge.
- Backend → manuale (pattern consolidato sessione 29/5, baseline rev `00300-9v5`).
- ENV richiesta: nessuna nuova. Playwright/Chromium già nel container backend.

**Rischi noti:**

- Generazione PDF aggiunge ~3-8 secondi alla `/finalize`. Mitigation: spinner UI, niente background job per MVP.
- Coda admin embed in Oggi: scomoda se >20 materiali simultanei. Mitigation: paginazione + filtro categoria nel pannello.

## Aperti collegati post-merge

- Stesso pattern applicato a `03-brand-kit` (sarà spec separata, breve, riuso 90%).
- Migrazione `burocrazia` per partner esistenti (aperto #2 sessione 29/5).
- Domande del wizard Posizionamento (contenuto, non infrastruttura) — discussione separata già flaggata da Claudio 30/5.
