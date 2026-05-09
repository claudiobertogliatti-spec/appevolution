# Spec Masterclass on-demand 60' — LIV 2 lead magnet Ciak

**Versione**: v0.1 SKELETON (da brainstormare in sessione dedicata)
**Data**: 2026-05-09
**Status**: scheletro — decisioni e contenuto da definire
**Deadline soft**: registrazione entro T-22 (15/5), live entro T-15 (22/5)

---

## ⚠️ Stato del documento

Questo è uno **scheletro**, non una spec completa. Va brainstormata in una sessione dedicata. Le decisioni di alto livello sono state prese (formato α masterclass on-demand 60'); manca tutto il contenuto e l'esecuzione.

---

## 1) Concept di base (deciso)

| Elemento | Scelta |
|---|---|
| Formato | Masterclass on-demand (NON live, NON webinar con Q&A) |
| Durata target | 60 minuti |
| Tema operativo | "I 5 errori che fanno perdere clienti ai consulenti — e come risolverli prima di spendere un euro in pubblicità" |
| Hosting video | YouTube unlisted (riuso pipeline esistente Evolution) |
| Landing | `ciak.io/masterclass` (Vercel/Next.js) |
| Lead capture | Email + nome (no telefono in fase 1) |
| Pitch finale | Analisi Strategica €67 (CTA in coda) |
| Replay disponibile | Sì, on-demand sempre |

---

## 2) Decisioni TBD (da brainstormare)

### 2.1 Struttura contenuto (60 min)

Skeleton proposto da raffinare:

```
Min 0-5    — Intro + chi sono + perché questa masterclass
Min 5-13   — Errore 1 + come risolverlo
Min 13-21  — Errore 2 + come risolverlo
Min 21-29  — Errore 3 + come risolverlo
Min 29-37  — Errore 4 + come risolverlo
Min 37-45  — Errore 5 + come risolverlo
Min 45-50  — Recap + sintesi metodologia
Min 50-60  — Pitch Analisi €67 + CTA + bonus
```

**Da decidere**: quali sono i 5 errori specifici? Possibili candidati (dai 7 pillar di evolution-pro.it):
- Blueprint che evita 90% di corsi che non vendono
- Topic selection che vende
- Lesson duration impact on sales
- Essential minimum sales funnel structure
- When advertising actually works
- Real social profile function
- Why DIY fails

→ Brainstorming dedicato necessario per scegliere e ordinare.

### 2.2 Modalità di registrazione

| Opzione | Pro | Contro |
|---|---|---|
| **One-shot diretto a camera** | Naturale, autentico, veloce (1 giornata) | Errori = retake completo |
| **Multi-take montato in studio** | Pulito, rifinibile | 2-3 giornate + montaggio |
| **HeyGen avatar** (vedi setup HeyGen attivo) | Scalabile, modificabile facilmente | Meno autentico per masterclass premium |
| **Mixed: girato vero + b-roll AI Higgsfield/stock** | Equilibrio tra autenticità e produzione | Setup più complesso |

→ Raccomandazione tentativa: **One-shot + b-roll stock Pexels** per slide visive durante i 5 errori.

### 2.3 Slide e supporti visivi

- Servono slide a supporto durante la masterclass?
- Stile: Keynote/Canva/Beautiful.ai?
- Branding: TBD (dipende da OQ1 della spec migrazione)

### 2.4 Pitch finale Analisi €67

Struttura proposta da definire:
- Recap value emerso dai 5 errori
- "Se vuoi un piano specifico per la TUA situazione, c'è l'Analisi Strategica €67"
- Cosa include (call 90' + PDF 8-12pp + stop list)
- Cosa NON include (no implementazione, no garanzia)
- CTA: "ciak.io/analisi" o link diretto Stripe
- Garanzia / risk reversal: ?
- Bonus aggiuntivo per chi compra entro X giorni?

### 2.5 Landing page `/masterclass`

Sezioni proposte (da raffinare):
- Hero: titolo + sottotitolo + bottone "guarda gratis"
- Email gate (form 2 campi: email, nome)
- Cosa imparerai (5 bullet sui 5 errori)
- Chi sono (mini bio Claudio + credibility)
- FAQ ("è gratis?", "quanto dura?", "fa per me?", "non sono tecnologico")
- Footer + link a evolution-pro.it

### 2.6 Email automation post-masterclass

3-4 email da definire:

| Email | Quando | Obiettivo |
|---|---|---|
| **#1 Conferma + link** | Subito dopo opt-in | Consegna link masterclass |
| **#2 Recap** | +1 giorno | Recap dei 5 errori per chi non ha guardato |
| **#3 Storia Daniele** | +3 giorni | Caso studio reale, pitch soft Analisi €67 |
| **#4 Pitch + scarcity** | +5 giorni | CTA forte Analisi €67 + eventuale bonus tempo-limitato |

→ Copy da scrivere in sessione dedicata.

### 2.7 Tracking e KPI

| KPI | Strumento | Target W1 post-lancio |
|---|---|---|
| Opt-in rate landing | Meta Pixel + GA4 | >25% |
| Watch rate masterclass (% completata) | YouTube Analytics + custom track endpoint | >40% di chi opt-in |
| Click su /analisi | Meta Pixel + UTM | >15% di chi completa masterclass |
| Conversione €67 da masterclass | Stripe + UTM | >5% di chi clicca /analisi |

---

## 3) Asset da produrre

| Asset | Owner | Deadline |
|---|---|---|
| Script masterclass 60' (5 errori dettagliati + pitch) | Claudio + Claude | T-22 (15/5) |
| Slide 30-50 a supporto (Canva o Keynote) | Designer/Antonella | T-20 (17/5) |
| Studio setup + registrazione | Claudio (solo) | T-22 (15/5) |
| Editing + sottotitoli + intro/outro | Editor video | T-19 (18/5) |
| Upload YouTube unlisted | Claudio | T-18 (19/5) |
| Landing page `/masterclass` (frontend Vercel) | Dev/Claude | T-15 (22/5) |
| Email automation 3-4 sequence (Brevo/SendGrid) | Antonella + Claude (copy) | T-15 (22/5) |
| Stripe checkout €67 unificato testato | Dev/Claude | T-15 (22/5) |
| Cal.com event "Analisi Ciak 90'" | Claudio | T-15 (22/5) |

---

## 4) Riferimenti

- Spec architettura: `docs/migration/spec.md`
- Social plan: `docs/marketing/linee-guida-social-v5.md`
- Sito Evolution PRO (pillar di riferimento): <https://www.evolution-pro.it/>

---

## 5) Next session

Quando si apre il brainstorming dedicato, partire da:
1. Decidere i 5 errori specifici (e in quale ordine raccontarli)
2. Scrivere lo script script di ogni capitolo (~8 min ognuno = ~1.200 parole × 5 + intro/outro)
3. Decidere modalità registrazione (one-shot vs multi-take)
4. Definire slide e brand (richiede OQ1 della spec migrazione: branding Ciak)
5. Scrivere copy pitch finale + landing + 4 email automation

Tempo stimato totale brainstorming + script: 1-2 sessioni lunghe.
