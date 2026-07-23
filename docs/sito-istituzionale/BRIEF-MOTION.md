# Sito istituzionale Evolution PRO — Brief Motion

> Documento di lavoro. Base per la build. Stato: **v0.1 strawman** — da confermare i punti marcati ❓.
> Riferimenti memoria: brand `brand_logos_official`, agenti `agenti_team_evolution_pro`, progetto `project_evolution_pro_sito_istituzionale_rebuild`.

## 0. In una riga
Rifacimento della **vetrina istituzionale `evolution-pro.it`** (sito già esistente): chi siamo, il Metodo EVO, il team che ti accompagna, le prove (testimonianze). Non vende — dà **fiducia** e manda a `ciak.io` con **una** CTA. Motion design curato ma sobrio: premium, non circo.
**Logo: Evolution PRO** (sfera 3D + wordmark, `backend/assets/logo_evolutionpro.png`) — NON logo Ciak.

## 1. Principi di motion (la stella polare)
- **Il movimento serve il messaggio**, non decora. Ogni animazione ha un perché (guidare l'occhio, dare gerarchia, premiare uno scroll).
- **Sobrietà premium**: easing morbidi, durate 300–600ms, nessun bounce eccessivo, nessun parallax caotico.
- **Reveal on scroll** come linguaggio base (fade + translate 16–24px), non tutto insieme.
- **Rispetta `prefers-reduced-motion`**: fallback statico pulito (obbligatorio, target anche poco digitalizzato).
- **60fps**: solo `transform` e `opacity`, mai animare layout/width/height.
- **Mobile-first**: su mobile animazioni più corte e ridotte, mai bloccare lo scroll.

## 2. Brand — palette ESATTA dal logo (campionata dai pixel 13/7/2026)
Richiesta esplicita di Claudio: colori "esattamente in linea con il logo". Estratti da `evolution-pro-globe-only.png`.

| Ruolo | Hex | Da |
|---|---|---|
| Oro/giallo (accento) | `#FBC002` | archi sfera + "Pro" |
| Navy (brand primario) | `#0D2952` | archi blu sfera |
| Ink (testo/sfondo scuro) | `#101326` | wordmark "evolution" |
| Grigio argento | `#787878` | arco grigio |
| Grigio chiaro | `#D8D8D8` | riflesso arco |

- Font: **Poppins** 400/500/600/700.
- CTA primaria: sfondo `#FBC002` + testo `#101326`.
- Tono: diretto, educativo, caldo, concreto, anti-guru.
- Logo **ben visibile e d'impatto** (richiesta esplicita).

## 3. Struttura sezione per sezione (+ motion, con PRIORITÀ) — brief Claudio 13/7

| # | Sezione | Contenuto | Motion | Priorità |
|---|---------|-----------|--------|----------|
| 0 | **Header** | Logo Evolution PRO ben visibile + CTA ciak.io | Sticky, blur on scroll | 🟢 |
| 1 | **Hero** | Titolo ben visibile + **a fianco animazione 6 foto agenti** che ruotano ingrandendosi e si presentano ("sono X e ti aiuto a…") | Orbita di avatar: ruotano, scalano, in evidenza a turno con badge ruolo+frase | 🔴 ALTA |
| 2 | **Collaborazioni** | Loghi partner/clienti | **Marquee a scorrimento** continuo | 🟡 |
| 3 | **Direzione > Strumenti** | Concetto fondamentale: *prima la direzione, poi gli strumenti* | Animazione d'impatto "in faccia": lo strumento senza direzione si perde, poi bussola/rotta che allinea tutto | 🔴 ALTA |
| 4 | **Il problema del target** | Pain reali (caos, tool, nessun risultato) | Sezione dinamica: pain che scorrono/si accumulano poi si "risolvono" | 🔴 ALTA |
| 5 | **Presentazione (Claudio/Chi siamo)** | Track record (22 anni, €6M, 25k trattative, 26 partner) | Grafica animata + count-up | 🟡 |
| 6 | **Metodo EVO** | 3 Atti (Esamina/Valida/Ottimizza) · 12 fasi — **fulcro** | Animazione accattivante: timeline/orbita che si accende atto per atto | 🔴 ALTA |
| 7 | **Piattaforma ciak.io** | Dimostra semplicità: costruire un videocorso + brainstorming con gli agenti | Mockup animato/step: dal caos al corso pronto; chat agenti che risponde | 🔴 ALTA |
| 8 | **Videotestimonianze** | Frase partner + **5 stelle** + **CTA apri video** | Card con play; modal video; stelle in stagger | 🔴 ALTA |
| 9 | **FAQ** | Domande ricorrenti | Accordion animato | 🟡 |
| 10 | **CTA finale** | Una sola forte → ciak.io | Pulsante magnetico | 🟡 |
| 11 | **Footer** | Legale, contatti, P.IVA/LLC | Statico | — |

> **CTA verso ciak.io sparse in modo strategico** lungo la pagina (dopo Hero, dopo Metodo EVO, dopo ciak.io demo, finale).

### I 6 agenti (copy pronto, da memoria)
| Agente | Ruolo | Frase |
|--------|-------|-------|
| Stefania | Coordinatrice del tuo percorso | Ti rimette in ordine il percorso |
| Valentina | Brand & Posizionamento | Ti aiuta a dire la cosa giusta alle persone giuste |
| Andrea | Coach video e contenuti | Ti rende più sicuro prima di premere rec |
| Gaia | Supporto tecnico funnel | Traduce il caos tecnico in prossima azione |
| Marco | Strategia lancio | Tiene alta la trazione fino al go-live |
| Matteo | Analista Ciak Blueprint | Porta i dati dentro decisioni concrete |

## 4. Coerenza di marca (attenzione)
Dominio Evolution PRO + CTA verso ciak.io = gestire la transizione con un micro-testo ("il tuo percorso operativo continua su Ciak") per non confondere. Mai affiancare i due loghi come pari: Evolution è la firma istituzionale.

## 5. Stack tecnico proposto (default)
- **Vite + React + Tailwind + Framer Motion** (motion di prima classe, `prefers-reduced-motion` nativo).
- Progetto **standalone** (non dentro la SPA Ciak), deploy **Vercel**.
- Asset: logo Evolution PRO da `backend/assets/logo_evolutionpro.png` + SVG Ciak nuovi (per eventuali riferimenti).

## 6. Punti aperti (❓ — mi servono da te per finire)
1. **Dove vive** il sito: nuovo progetto standalone (consigliato) / dentro questo repo / altro. → decide dove costruisco.
2. **Testimonianze**: nomi + frase + link video reali (bastano quelli pronti).
3. ~~Dominio~~ → **`evolution-pro.it`** (confermato). È un **rifacimento** del sito esistente: da vedere il live per preservare i contenuti reali e rifare look + motion.
