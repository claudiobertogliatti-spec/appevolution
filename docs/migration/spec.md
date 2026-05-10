# Spec — Architettura Ciak.io e relazione con Evolution PRO

**Versione**: v1.0 DEFINITIVA
**Data**: 2026-05-09
**Autore**: Claudio Bertogliatti + Claude
**Status**: spec stabilizzata, pronta per implementation plan
**Lancio target**: ven 6/6/2026 ore 09:00 (T-28)

---

## 1) Insight chiave (che ha guidato lo spec)

**Nessuno ha mai visto `app.evolution-pro.it`.** Il pubblico generale (cold + 13k Systeme.io) non conosce Evolution PRO. Solo i 26 partner attuali interagiscono con l'app.

**Conseguenza**: il termine "migrazione" è fuorviante. Non c'è migrazione. **Ciak nasce nuovo. Evolution resta il motore invisibile.** Sono due mondi che non si toccano nel pubblico, si toccano solo internamente quando un lead Ciak diventa partner Evolution.

---

## 2) Architettura di brand finale

```
                  [Claudio Bertogliatti — il volto]
                             |
        ┌────────────────────┴────────────────────┐
        |                                          |
   [ciak.io]                            [evolution-pro.it]
   PRODOTTO / TOP-FUNNEL                CASA MADRE / BOTTOM-FUNNEL
   "8 domande, gratis"                  "Partnership operativa"
   Brand consumer-facing                Brand B2B partnership pitch
   Cold traffic primario                Warm/referral primario
        |                                          |
        ▼                                          ▼
   Funnel education-first                  CTA Partnership €2.790
   (4 livelli, vedi sezione 3)
                                              |
                             [app.evolution-pro.it]
                             PIATTAFORMA OPERATIVA PARTNER
                             Solo per i 26 partner attuali +
                             nuovi onboardati. Login, masterclass,
                             videocorsi, dashboard.
                             INVISIBILE AL PUBBLICO.
                             Resta intoccata.
```

### Tre domini, tre ruoli distinti

| Dominio | Hosting | Ruolo | Pubblico |
|---|---|---|---|
| `ciak.io` | Vercel (frontend) + Cloud Run (backend) | Top-funnel consumer-facing | Cold/warm pubblico esterno |
| `evolution-pro.it` | register.it (vetrina esistente) | Bottom-funnel partnership pitch | Hot/referral, candidati partnership |
| `app.evolution-pro.it` | Cloud Run (esistente, Google Frontend) | Piattaforma operativa back-office | Solo i 26+ partner attuali |

---

## 3) Funnel a 4 livelli (education-first)

```
LIV 1 — EDUCAZIONE
└─ Contenuti social organici (reel, carosello, YT, stories)
   Educano il target "scarsamente digitalizzato" e lo svegliano sul problema
   Canali: IG @claudio.bertogliatti + FB pagina + YouTube @evolution-partnership
   ↓
LIV 2 — INGRESSO (lead magnet zero) ⭐
└─ Masterclass on-demand 60' "I 5 errori che fanno perdere clienti ai consulenti"
   Lead capture (email) + nurturing 3-4 email automatiche
   Landing: ciak.io/masterclass
   ↓
LIV 3 — MONETIZZAZIONE INIZIALE
└─ Analisi Strategica €67 (call 90' + PDF 8-12pp)
   ⚠ STESSO PRODOTTO del €67 di evolution-pro.it (un Stripe product, un checkout)
   Diagnostica 8 domande Matteo = strumento operativo interno di Claudio durante l'analisi
   Landing Ciak: ciak.io/analisi
   Landing Evolution: evolution-pro.it (CTA "Inizia dall'Analisi 67€")
   ↓
LIV 4 — CHIUSURA
└─ Partnership Evolution PRO €2.790 + 70% covered + 10% rev share 12 mesi
   Solo per chi è davvero fit (filtrato post-Analisi)
   Landing: evolution-pro.it (sezione partnership)
```

### Ruolo della diagnostica 8 domande (decisione finale)

**Strumento operativo interno**, non asset visibile nel funnel pubblico.
- Quando un lead compra l'Analisi €67, Claudio (o sistema automatico) gli manda un link al flow 8 domande Matteo.
- Matteo genera il pre-report che Claudio usa come base per la call 90'.
- Il cliente percepisce un servizio premium ("ho ricevuto un report personalizzato in 24h"), Claudio guadagna efficienza AI.
- I 26 partner attuali continuano ad accedere alla diagnostica via app.evolution-pro.it se serve, indipendentemente dal funnel Ciak.

---

## 4) Stack tecnico

### Frontend `ciak.io`

| Componente | Scelta |
|---|---|
| Hosting | Vercel (DNS già configurato: `ciak.io` → `76.76.21.21`, `www.ciak.io` → `cname.vercel-dns.com`) |
| Framework | **Next.js 14+** (App Router) — SSR per SEO + API routes leggere |
| Stile | Tailwind CSS + shadcn/ui (coerenza visiva, velocità) |
| Repo | `ciak-frontend` (nuovo, GitHub) |
| Deploy | Auto da push `main` via Vercel integration |
| Pagine principali | `/` (home) • `/masterclass` (LIV 2 lead magnet) • `/analisi` (LIV 3 €67 checkout) • `/grazie` (post-checkout) • `/about` • `/legal/*` |

### Backend `ciak-backend`

| Componente | Scelta |
|---|---|
| Hosting | Cloud Run, region `europe-west1`, project `gen-lang-client-0744698012` (stesso di Evolution) |
| Stack | **Python 3.11 + FastAPI** (stesso di Evolution → riuso know-how, pattern auth, logging) |
| Repo | `ciak-backend` (nuovo, GitHub) |
| Deploy | Manuale `gcloud run deploy ciak-backend --source ./` (come Evolution) — **non auto-deploy** |
| Servizio Cloud Run | `ciak-backend` (nuovo, separato da `evolution-pro-backend`) |
| Domain mapping | `api.ciak.io` (da configurare) |

### Database

| Componente | Scelta |
|---|---|
| Provider | MongoDB Atlas (stesso cluster di Evolution) |
| Database | **`ciak`** (nuovo, isolato da `evolution_pro`) |
| Collection principali | `lead_subscriptions` (LIV 2 email capture) • `masterclass_views` (tracking visualizzazioni) • `diagnostic_sessions` (8 domande quando attivata internamente) • `analisi_orders` (Stripe orders 67€) • `analisi_reports` (PDF generati) • `partnership_referrals` (lead passati a Evolution) |

### Servizi esterni

| Servizio | Uso |
|---|---|
| **Stripe** | Checkout €67 — **stesso product Stripe condiviso con evolution-pro.it** (un solo `price_id`) |
| **Cal.com** | Booking call 90' Analisi €67 |
| **Anthropic API** (key `EMERGENT_LLM_KEY` esistente Evolution) | Agent Matteo per generazione report |
| **Email transazionale** (SendGrid o Brevo) | Nurturing 3-4 email post-masterclass + conferme + reminder Cal.com |
| **Systeme.io** | Email blast 13k esistenti (pre-launch) |
| **Meta Pixel + Google Tag** | Tracking conversioni cold traffic |

### Endpoint backend principali (W2 sprint)

| Endpoint | Metodo | Scopo |
|---|---|---|
| `/api/lead/subscribe` | POST | Lead magnet email capture |
| `/api/masterclass/track` | POST | Tracking visualizzazione masterclass (% completata) |
| `/api/analisi/checkout` | POST | Crea Stripe checkout session €67 |
| `/api/analisi/webhook` | POST | Stripe webhook (paid → trigger Cal.com booking link + email + diagnostica internal) |
| `/api/diagnostic/start` | POST | Crea sessione 8 domande (internal, post-acquisto €67) |
| `/api/diagnostic/answer` | POST | Salva risposta singola |
| `/api/diagnostic/complete` | POST | Calcola score + invoca Matteo + salva report |
| `/api/diagnostic/report/{token}` | GET | Render report internal per Claudio |
| `/api/booking/webhook` | POST | Cal.com webhook (booking.created/cancelled) |
| `/api/admin/leads` | GET | Lista lead con filtri (Claudio + Antonella) |
| `/api/admin/lead/{id}` | GET/PATCH | Dettaglio + override flag (`partnership_candidate`) |

---

## 5) Cosa NON cambia (asset esistenti intoccati)

| Asset | Stato |
|---|---|
| `app.evolution-pro.it` | **Intoccato.** Login partner, masterclass partner, videocorsi, dashboard, pipeline video Remotion/Shotstack — tutto come è. |
| `evolution-pro-backend` Cloud Run | **Intoccato.** Endpoint partner, JWT auth, partner data Mongo. |
| MongoDB `evolution_pro` database | **Intoccato.** Partner, evolution_id, masterclass, videocorsi. |
| Repo `appevolution` | **Continua come è.** Frontend partner + backend partner restano lì. Ciak vive in repo separati. |
| `evolution-pro.it` (sito vetrina su register.it) | **Intoccato.** Resta come bottom-funnel partnership pitch. Aggiungo solo cross-link footer → ciak.io. |
| 26 partner attuali | **Esperienza identica.** Stesso login, stesso URL, stesse credenziali. **Niente lettera T-30 o T-7 sul "cambio"** — non c'è cambio. |

---

## 6) Cosa serve fare (critical path)

| Settimana | Milestone | Stato W0 |
|---|---|---|
| **T-28 (oggi)** | DNS ciak.io ✅ verificato (Vercel attivo) | Deploy Vercel ancora vuoto |
| **W1 (8-14/5)** | Repo `ciak-frontend` creato + landing coming-soon + lead capture email + lead magnet PDF "Le 8 domande che ogni consulente dovrebbe farsi" su S3/Cloudinary | – |
| **W2 (15-21/5)** | Repo `ciak-backend` deployato Cloud Run + endpoint LIV 2 (subscribe + masterclass track) + Stripe €67 unificato testato | – |
| **W3 (22-28/5)** | Pagina `/masterclass` live + masterclass on-demand uploadata YouTube unlisted + email automation 3-4 sequence + integrazione Cal.com | – |
| **W4 (29/5-5/6)** | Pagina `/analisi` v1 + `evolution-pro.it` cross-link footer aggiornato + diagnostica internal (Matteo trigger post-€67) + test E2E completo | – |
| **T-2 (4/6)** | Backup Mongo + piano rollback + sito Vercel preview frozen | – |
| **T-0 (6/6 09:00)** | LIVE — homepage Ciak con masterclass CTA + blast email Systeme + post social | – |

---

## 7) Vincoli e dipendenze

| Vincolo | Impatto |
|---|---|
| **Branding visivo Ciak: TBD** | Logo, palette, font non ancora definiti. Sblocca: design landing, masterclass cover, brand kit Canva. **Decisione richiesta entro T-22 (15/5)**. |
| **Masterclass content da girare** | 60 minuti di Claudio davanti a camera + 5 errori strutturati + pitch 67€ in coda. Setup studio + registrazione: 1 giornata in W2. |
| **Anthropic API quota** | Per Matteo, già coperta da `EMERGENT_LLM_KEY` Evolution. Verificare quota residua prima del lancio. |
| **Stripe product unificato** | Va creato/confermato un `price_id` Stripe usato sia da ciak.io/analisi sia da evolution-pro.it. Setup checkout flow Cal.com booking post-paid. |
| **Cal.com slot** | Claudio deve aprire 4-8 slot/sett post-lancio per call Analisi €67. Calendar dedicato "Analisi Ciak". |

---

## 8) Cosa è stato cancellato dalla roadmap originale (risparmio)

| Task originale | Stato | Perché |
|---|---|---|
| Lettera T-30 ai 26 partner sul "cambio brand" | ❌ Cancellata | Non c'è cambio per i partner |
| Lettera T-7 ai 26 partner | ❌ Cancellata | Idem |
| Redirect 301 `app.evolution-pro.it/*` → `ciak.io/*` | ❌ Cancellato | Pubblici diversi, nessun overlap |
| SSO Evolution↔Ciak / login unificato | ❌ Cancellato | Mondi separati |
| UI update di app.evolution con riferimenti Ciak | ❌ Cancellato | Idem |
| Comunicazione "stiamo migrando" | ❌ Cancellata | Idem |
| Done criterion "26 partner migrati senza ticket bloccanti" | ❌ Eliminato | Non c'è migrazione |

→ Risparmio stimato: **7-10 giorni di lavoro** W3-W4 originali, ricollocabili sulla masterclass + landing.

---

## 9) Open questions / decisioni rimaste

| # | Open question | Quando va risolta | Stato |
|---|---|---|---|
| ~~OQ1~~ | ~~Branding visivo Ciak (logo, palette, font)~~ | ~~Entro T-22 (15/5)~~ | ✅ **RISOLTA 2026-05-09** — vedi `docs/brand/ciak-brand-kit.md` (palette `#0F172A` / `#64748B` / `#E5E7EB` / `#FACC15`, Poppins SemiBold/Medium, logo + 4 varianti) |
| OQ2 | Stripe price unico vs separati | Entro T-15 (22/5) — al setup checkout | aperta |
| OQ3 | DNS `api.ciak.io` (mapping Cloud Run) o subpath `ciak.io/api/*` (Vercel rewrite) | Entro T-22 (15/5) — al deploy backend | aperta |
| OQ4 | Email provider (SendGrid vs Brevo) | Entro T-22 (15/5) — al setup automation | aperta |
| OQ5 | Cal.com tipo evento (60' vs 90' Analisi) | Entro T-15 (22/5) | aperta |
| OQ6 | Masterclass: registrazione live one-shot o studio multi-take | Entro T-22 (15/5) — block calendar 1 giornata registrazione | aperta |
| ~~OQ7~~ | ~~Asset originali brand (SVG/PNG) salvati in `docs/brand/assets/`~~ | ~~Entro T-25 (12/5)~~ | ✅ **RISOLTA 2026-05-10** — `ciak-logo-full.webp` + `ciak-icon.webp` in `docs/brand/assets/raster/` |

---

## 10) Riferimenti

- **Sito Evolution PRO casa madre**: <https://www.evolution-pro.it/>
- **Repo Evolution PRO esistente**: `claudiobertogliatti-spec/appevolution` (CLAUDE.md remoto da fetchare ad ogni sessione di lavoro)
- **Social plan v5** (post-questa-spec): `docs/marketing/linee-guida-social-v5.md`
- **Spec masterclass LIV 2**: `docs/marketing/masterclass-spec.md` (skeleton, da brainstormare in sessione dedicata)
- **Strategia funnel**: vedi anche `MEMORY.md` → `strategy_ciak_evolution_funnel.md`

---

*Questo documento sostituisce e supera la roadmap pre-Fondamenti che parlava di "sostituzione di app.evolution-pro.it". L'insight "nessuno ha mai visto Evolution" + "evolution-pro.it esiste già come funnel partnership" cambia la natura del progetto: non è migrazione, è lancio di un nuovo top-funnel consumer-facing.*
