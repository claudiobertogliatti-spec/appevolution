# Eliminazione definitiva `app.evolution-pro.it`

**Stato**: in corso · **Aggiornato**: 2026-06-18
**Contesto**: `app.evolution-pro.it` è un dominio **morto** (nessun partner ci accede più).
L'app operativa — admin e area partner — vive su **`ciak.io`** (build alias `ciak-frontend.vercel.app`),
stesso bundle `CiakApp` e stesso backend `evolution-pro-backend` su Cloud Run.

> **Vincolo non negoziabile**: eliminare tutto ciò che riguarda `app.evolution-pro.it`
> **senza toccare il runtime/deploy di `ciak.io`**.

Questo documento è la fonte di verità del lavoro di dismissione e **supera** la parte di
`docs/migration/spec.md` (v1.0, mag 2026) che teneva `app.evolution-pro.it` come piattaforma
partner "intoccata": quell'ipotesi è stata superata dal consolidamento su Ciak (giu 2026).

---

## 1) Cosa era già stato fatto (sessioni precedenti)

- **2026-06-03** — Ritirata la vecchia app Evolution PRO: `frontend/src/App.js` e `frontend/src/components/`
  rimossi. `frontend/src/index.js` monta `CiakApp` su **tutti** gli host.
- **2026-06-10** — Confermato che l'app operativa è `ciak-frontend.vercel.app` (`/admin`, `/partner`)
  e che `app.evolution-pro.it` risultava già irraggiungibile.

## 2) Fatto in questa sessione (2026-06-18) — codice, nessun impatto su ciak

| File | Modifica |
|---|---|
| `backend/server.py` | Rimosse da `ALLOWED_ORIGINS` le 2 origin `https://app.evolution-pro.it` e `https://www.app.evolution-pro.it`. Default `FRONTEND_URL` (2 punti) -> `https://www.ciak.io`. |
| `backend/routers/proposta.py` | Default `BASE_URL`/`FRONTEND_URL` -> `https://www.ciak.io`. |
| `backend/routers/servizi_extra.py` | Default `FRONTEND_URL` -> `https://www.ciak.io`. |
| `backend/routers/flusso_analisi.py` | Default `FRONTEND_URL` -> `https://www.ciak.io`. |
| `backend/gcs_cors.json` | Rimossa origin `https://app.evolution-pro.it` (restano `ciak.io` / `www.ciak.io`). |
| `funnel_analisi_embed.html`, `funnel_analisi_minimo.html` | `API_URL` dal dominio morto -> `https://www.ciak.io`. |
| `CLAUDE.md` | Aggiunta sezione "Dominio DISMESSO"; aggiornate le procedure di recovery (host `ciak.io/admin` invece di `app.evolution-pro.it`). |

Questi cambi non alterano il comportamento di `ciak.io`: `ciak.io`/`www.ciak.io` restano in tutte
le liste CORS; i default puntavano a un dominio morto e ora puntano al dominio vivo (fix, non rottura).

## 3) Residui lasciati intenzionalmente intatti (file runtime/deploy di ciak)

Per onorare il vincolo "non toccare ciak", **non** sono stati modificati i seguenti file, che
contengono `app.evolution-pro.it` solo in commenti o liste ridondanti senza effetto pratico:

- `frontend/src/index.js` — commento storico nell'entry condiviso.
- `frontend/src/ciak/CiakApp.jsx` — commento di header.
- `frontend/src/utils/api-config.js` — `PRODUCTION_DOMAINS` include `'app.evolution-pro.it'`, ma è
  già coperto dal match per sottostringa `'evolution-pro.it'`: rimuoverlo è puramente cosmetico.
- `frontend/scripts/postbuild-ciak.js` + `frontend/vercel.json` — pipeline di build host-aware (vedi Fase 2).

## 4) Fase 2 — consolidamento deploy (richiede via libera, tocca config di ciak)

Oggi `vercel.json` ha questo rewrite:
- host `(www.)?ciak.io` -> `index.ciak.html`
- **default (qualsiasi altro host, incl. `app.evolution-pro.it` e i preview `*.vercel.app`)** -> `index.evolution.html`

Cioè `index.evolution.html` + il rename in `postbuild-ciak.js` **esistono solo per servire host non-ciak**.
Consolidare significa rendere Ciak il default ed eliminare il ramo "evolution":

- [x] `frontend/vercel.json` — far puntare il rewrite di default a `index.ciak.html`; rimuovere la regola host-specifica ridondante.
- [x] `frontend/scripts/postbuild-ciak.js` — smettere di generare/rinominare `index.evolution.html`.
- [x] `frontend/src/utils/api-config.js` / `index.js` / `CiakApp.jsx` — pulizia commenti e lista domini.

ATTENZIONE: tocca direttamente la pipeline di `ciak.io`: da fare in un passaggio dedicato, con verifica del
build Vercel e degli OG meta dei crawler social, **dopo** la rimozione del dominio lato Vercel (sotto).

## 5) Fase 3 — infrastruttura (azioni di Claudio, fuori dal repo)

- [x] **Vercel** (nessun dominio evolution su Vercel — verificato 2026-06-19) — rimuovere il dominio `app.evolution-pro.it` (e `www.`) dal progetto frontend.
- [x] **Cloud Run** — 0 domain mapping in europe-west1; rimuovere l'eventuale mapping di `app.evolution-pro.it`
      (`gcloud run domain-mappings list --region europe-west1`; poi `... delete --domain app.evolution-pro.it`).
- [x] **DNS (register.it)** — record `app` CNAME rimosso 2026-06-19; — rimuovere i record `app` / `www.app` di `evolution-pro.it`.
- [x] **GCS CORS** — applicata su gs://gen-lang-client-0744698012_cloudbuild (solo ciak.io); — applicare il `gcs_cors.json` aggiornato al bucket asset:
      `gsutil cors set backend/gcs_cors.json gs://<bucket-asset>`.
- [x] **Cloud Run env** — `FRONTEND_URL` già `https://www.ciak.io`; — verificare che `FRONTEND_URL` / `BASE_URL` del servizio `evolution-pro-backend`
      **non** siano fissati a `https://app.evolution-pro.it` (un env stale scavalcherebbe i nuovi default nel codice).
      `gcloud run services describe evolution-pro-backend --region europe-west1 --format='value(spec.template.spec.containers[0].env)'`
      -> se presente, aggiornare a `https://www.ciak.io`.
- [ ] **Stripe / Cal.com / Systeme.io** — controllare eventuali success/cancel/redirect URL configurati
      verso `app.evolution-pro.it` e ripuntarli a `ciak.io`.

## 6) Lasciati come archivio storico (NON modificare)

- `EXPORT_ARCHIVE/**` — export storico della vecchia app.
- `docs/superpowers/plans/*` e `docs/**` datati — record storici; i riferimenti a `app.evolution-pro.it`
  sono testimonianze del periodo pre-Ciak e restano per tracciabilità.
- `CLAUDE.md` nota di sessione 2026-06-10 (dato storico).

## 7) Definition of Done

- [x] Nessun riferimento **operativo/funzionale** a `app.evolution-pro.it` nel codice backend.
- [x] CORS, default URL e embed puntano a `ciak.io`.
- [x] `CLAUDE.md` documenta la dismissione e non guida più verso il dominio morto.
- [x] Fase 2 (deploy Vercel consolidato su Ciak) completata — 2026-06-18.
- [x] Fase 3 (Vercel/Cloud Run/DNS/GCS/env) completata 2026-06-19 — resta solo il check Stripe/Cal.com/Systeme.io.
