# Funnel Factory — Engine Design (2026-07-16)

## Obiettivo
Generare il funnel di un partner come **codice owned** (deployato sul dominio del
partner via Vercel), sostituendo la vecchia browser-automation di Systeme. Il
funnel è **di proprietà del partner**; Systeme resta backend solo per CRM/tag/
workflow. Il motore funziona standalone (chiamabile da admin) e in seguito viene
orchestrato da Paperclip via webhook.

## Architettura
```
dati partner (posizionamento / offerta / brand)
  → GENERATORE  (riusa i generatori copy esistenti) → contenuti (modello unico)
  → RENDER      (riusa i template HTML esistenti)    → file statici owned
  → DEPLOYER    (Vercel API → dominio partner)       → funnel LIVE
  → CONNETTORE SYSTEME (opt-in/vendita → API contatti/tag/workflow)
```

## Riuso (già in repo — NON reinventare)
- `backend/routers/funnel_builder.py`:
  - `LANDING_PAGE_TEMPLATE` (:535) — landing di vendita HTML autonoma, brandizzabile via CSS vars.
  - `COOKIE_POLICY_TEMPLATE` / `PRIVACY_POLICY_TEMPLATE` / `CONDIZIONI_VENDITA_TEMPLATE` (:713-884) — pagine legali GDPR.
  - `genera_landing_page()` (:140) — riempie il template dai `LandingPageParams`.
  - `POST /{partner_id}/genera-ai` (:228) — copy AI (Claude) → ~55 campi.
- `backend/routers/partner_journey.py:2411` `generate_funnel()` — blueprint ricco (hero/problema/promessa/moduli/bonus/garanzia/faq/bio + 5 email) da posizionamento+masterclass+videocorso → `partner_funnel.content`.
- Dati brand: `BrandKit` (logo, colore) + record partner (name, niche, bio, photo).
- Dominio partner: `partner_funnel.domain = {domain, email, status}` (partner_journey.py:4508) + flusso verifica.

## Da costruire nuovo
1. **Modello contenuti unico** — oggi frammentato in 4 sistemi. Schema unico:
   `optin` / `sales` / `checkout` / `thankyou` + `legal`. In MVP: si parte dal
   `sales` (già completo) + `legal`; opt-in/checkout/thankyou in iterazioni successive.
2. **Render service** (`backend/funnel_factory.py`) — assembla i file statici del
   funnel (`index.html` + `privacy.html` + `cookie.html` + `termini.html`) dai
   contenuti+brand del partner, riusando i template di funnel_builder. Output:
   `dict[filename → html]`. Pura funzione, testabile senza rete.
3. **Deployer Vercel** — deploya i file statici come progetto Vercel; in MVP su URL
   di test, poi sul dominio del partner. Richiede `VERCEL_TOKEN` in env backend.
4. **Connettore Systeme** — l'opt-in del funnel posta a un endpoint Ciak che crea
   contatto+tag+workflow via API Systeme (riusa l'integrazione esistente).
5. **Consolidamento URL** — un solo `partner_funnel.deployed_url` (Vercel) al posto
   dei vari `funnel_systeme_url`/`funnel_url`/`vendita_url`.
6. **Endpoint orchestrabile** — `POST /api/funnel-factory/build/{partner_id}` che
   esegue generate→render→deploy con gate di approvazione prima del go-live.
   È l'aggancio per Paperclip (webhook), ma è chiamabile anche da admin.

## MVP — fetta verticale (primo build)
1. **Render service** (`funnel_factory.py`): partner → file statici owned. [questo slice]
2. **Deploy** su URL Vercel di **TEST** (non dominio partner reale): prova la catena in sicurezza.
3. **Opt-in → Systeme**: il form del funnel crea contatto+tag.
Niente pubblicato su domini reali di partner finché Claudio non sceglie il pilota.

## Fuori scope MVP
- Checkout owned (Stripe): in MVP il CTA punta a link Systeme/Stripe esistente.
- Multi-pagina completo (opt-in/masterclass/thankyou separati): si parte dalla sales+legal.
- Orchestrazione Paperclip: il motore espone l'endpoint; l'agente si aggancia dopo il self-host.
- CRM partner-owned (Brevo/Mautic): orizzonte autonomia, non ora (CRM = Systeme di Evolution).

## Ritiro
La `GAIA Systeme template system` (server.py:10738-10844) — solo wrapper di
share-link Systeme — si può ritirare quando il motore owned è operativo.

## Test
- Render service: genera i file per un partner di prova, verifica HTML valido,
  brand applicato (colore/logo), placeholder tutti sostituiti (nessun `{VAR}` residuo).
- Deploy: URL Vercel test raggiungibile (200), pagine legali linkate.
- Systeme: opt-in di prova crea il contatto col tag atteso.
