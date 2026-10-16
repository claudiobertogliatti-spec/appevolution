---
name: storico-funnel-systeme
description: "Automazione e storico dei funnel Systeme.io dei partner (aprile 2026, caso Daniele Andolfi). Caricala prima di creare o modificare un funnel Systeme o le sue automazioni."
user-invocable: false
---

> Contenuto spostato alla lettera da `CLAUDE.md` il 30/9/2026. Sono note di sessione con
> la loro data: descrivono lo stato di allora. Prima di agire verifica sul codice attuale.

## Automazione Funnel Systeme.io (2026-04-21)

### Stack tecnico editor
Systeme.io usa React + TipTap/ProseMirror. I contenteditable della pagina Optin sono accessibili via React fiber tree.

### ⚠️ DISTINZIONE FONDAMENTALE: Duplica vs Condividi

- **Duplica** (⋯ menu) → clona il funnel nello STESSO account Systeme.io (evolutionpro). Utile per varianti interne. NON crea il funnel nell'account del partner.
- **Condividi** (⋯ menu) → genera un link. Quando aperto dall'account del partner, importa il funnel in quell'account. Questo è il meccanismo corretto per i partner.

### Workflow corretto per creare il funnel di un partner
1. systeme.io/dashboard/funnels → ⋯ Template Master → **Condividi** → copia il link
2. Login nell'account Systeme.io del partner
3. Apri il link condivisione nel browser del partner → funnel importato automaticamente
4. Clicca sul funnel → step Optin → Modifica Pagina
5. Esegui script iniezione nella console del browser (getTipTapEditor + setEditorText)
6. Click Salvare — chiama POST /dashboard/editor/api/page/{ID}/save
7. Salva URL nel campo Systeme.io del FunnelBuilder admin

### Funzione helper (incollare nella console dell'editor Systeme.io)
```
function getTipTapEditor(el) {
  let node = el.parentElement;
  for (let i=0;i<5;i++) {
    const key = Object.keys(node).find(k=>k.startsWith('__reactFiber'));
    if (key) { let f=node[key]; for(let j=0;j<30;j++) { if(f?.memoizedProps?.editor?.commands) return f.memoizedProps.editor; f=f?.return; if(!f)break; } }
    node=node.parentElement; if(!node)break;
  } return null;
}
function setEditorText(editor,text){editor.commands.focus();editor.commands.selectAll();editor.commands.insertContent(text);}
const fields = { /* optin_page_fields dal payload JSON di FunnelBuilder */ };
const els = Array.from(document.querySelectorAll('[contenteditable]'));
Object.entries(fields).forEach(([i,t])=>{ const ed=getTipTapEditor(els[+i]); if(ed)setEditorText(ed,t); });
```

### Mappatura indici Optin
0=HEADLINE_PRINCIPALE | 1=SOTTOTITOLO | 2=copyright breve | 3=PARTNER_BIO
4=intro bullet | 5=DOLORE_1 | 6=DOLORE_2 | 7=DOLORE_3 | 8=DOLORE_4
9=footer info | 10=copyright footer

### Card FunnelBuilder aggiunta (2026-04-21)
File: frontend/src/components/admin/FunnelBuilder.jsx
Card 'Funnel Systeme.io' con: URL input (salva in partner_funnel.funnel_systeme_url),
link 'Apri funnel', pulsante 'Copia dati per Claude (JSON)' con optin_page_fields mappati.

### Template Master Systeme.io
ID: 6706257 | URL: evolutionpro.systeme.io/optin-f2485c57
NON modificare il Template Master — usare sempre Duplica.

### Struttura Template Master aggiornata (2026-04-21)
Il Template Master ora include:
- **Urgency bar in cima** con countdown (giorni/ore/minuti/secondi) — componente nativo Systeme.io, NON TipTap
- **Footer con link legali**: Cookie Policy | Privacy Policy | Condizioni di Vendita

### Mappatura indici contenteditable (post-aggiornamento)
| Idx | Contenuto | Campo FunnelBuilder |
|-----|-----------|---------------------|
| 0 | Headline | HEADLINE_PRINCIPALE |
| 1 | Sottotitolo | SOTTOTITOLO |
| 2 | Copyright breve | © {PARTNER_NOME} |
| 3 | Bio trainer | PARTNER_BIO |
| 4 | Intro bullet | generato |
| 5 | Bullet 1 | DOLORE_1 |
| 6 | Bullet 2 | DOLORE_2 |
| 7 | Bullet 3 | DOLORE_3 |
| 8 | Bullet 4 | DOLORE_4 |
| 9 | Footer info | {PARTNER_NOME} + {PARTNER_NICCHIA} + tel |
| 10 | Copyright + link legali | Copyright ANNO © {PARTNER_NOME} + link Cookie/Privacy/Vendita |

I link nel footer (Cookie Policy, Privacy Policy, Condizioni di Vendita) devono avere href reali per ogni partner.

### Daniele Andolfi — funnel TEST creato
Funnel ID: 7114182 | Pagina Optin ID: 40213665
URL: evolutionpro.systeme.io/optin-f2485c57-7d6c3447
Demo completata: copy iniettato e salvato correttamente.
⚠️ Creato con Duplica (non Condividi) — è nell'account evolutionpro, NON nell'account Systeme.io di Daniele.
Va ricreato seguendo il workflow corretto con Condividi + account partner.


## Sessione 2026-04-23 — Funnel Systeme.io Daniele Andolfi + Fix pipeline video

### Funnel Systeme.io — workflow documentato e completato per Daniele Andolfi

**Funnel creato nell'account Daniele** (`daniele-andolfi.systeme.io`):
- Funnel ID: `7121027`
- URL Optin: `https://daniele-andolfi.systeme.io/optin-f2485c57-b026fccf`
- Salvato in Evolution PRO: `partner_funnel.funnel_systeme_url`

**4 step personalizzati** con copy estratto autonomamente dai documenti Drive:
1. **Optin** (pageID 40268226) — headline, bio, 4 bullet points (dai "5 segnali" del calendario lancio)
2. **Landing vendita** (pageID 40268227) — 24 campi, copy direct response con 12 moduli videocorso
3. **Modulo d'ordine 97€** (pageID 40268228) — struttura corso, testimonianze placeholder
4. **Pagina ringraziamento** (pageID 40268230) — 3 campi

**API Systeme.io utili** (da usare nell'account loggato):
- Lista funnel: `GET /api/dashboard/customer/funnels/list?pagination[limit]=25`
- Step list: `GET /api/dashboard/customer/funnels/{id}/steps/list`
- User info: `GET /api/dashboard/user/user-data`
- Editor pagina: `https://systeme.io/dashboard/page/{pageId}/edit`

**Workflow corretto per ogni nuovo partner:**
1. Account evolutionpro → Template Master → ⋯ → **Condividi** → copia link (finestra privata)
2. Tab loggata con account partner → incolla link → funnel importato automaticamente
3. Recupera funnel ID: `/api/dashboard/customer/funnels/list`
4. Per ogni step: naviga all'editor, inietta copy via script TipTap/React fiber, salva
5. Salva URL in Evolution PRO via `PATCH /api/admin/partner/{id}/journey`

### Fix strutturali pipeline video committate in questa sessione

**video_pipeline_task.py** (commit diretto):
1. `acks_late=True` + `reject_on_worker_lost=True` nel decorator — task re-accodato se worker muore
2. **Heartbeat loop** — aggiorna `pipeline_heartbeat_at` ogni 30s; permette al check di distinguere task vivi da morti
3. **Cancellazione heartbeat** nel `finally` block
4. **Error handler robusto** con riconnessione MongoDB di emergenza se `set_status("error")` fallisce
5. Tutti i timeout subprocess già presenti: silenceremove 3600s, loudnorm 1200s/3600s, extract_audio 1200s

**celery_tasks.py** — `check_stuck_video_pipelines` riscritto:
- Prima: reset dopo 45 min, nessun retrigger (pipeline valide venivano resettate prematuramente)
- Ora: usa `pipeline_heartbeat_at` — se heartbeat > 5 min → task morto → **reset + retrigger automatico**
- Fallback per task senza heartbeat (formato vecchio): reset dopo 240 min
- Copre sia masterclass che ogni lezione del videocorso
- Già presente in `beat_schedule` ogni 30 minuti

### Stato pipeline Daniele Andolfi (2026-04-23)
- Retrigger alle 07:10:57 UTC → cleaning alle 07:10:57 UTC
- Alle 09:40 UTC: ancora in cleaning (2h 30min), nessun errore
- Fix heartbeat non attiva su questo run (committata dopo) — pipeline monitora manualmente

### Da fare
1. ✅ Fix acks_late + heartbeat committate
2. ✅ check_stuck_video_pipelines con auto-retrigger committato
3. Attivare funnel Systeme.io di Daniele (bozza → attivo nel dashboard)
4. Aggiornare telefono Daniele nei footer funnel quando disponibile
5. Eseguire backfill evolution_id: `POST /api/admin/backfill-evolution-ids`


<!-- trigger build: 2026-04-23T16:28:19.119Z — worker separato su evolution-pro-worker -->

<!-- deploy: worker separato attivo 2026-04-23T16:39:17.810Z -->
