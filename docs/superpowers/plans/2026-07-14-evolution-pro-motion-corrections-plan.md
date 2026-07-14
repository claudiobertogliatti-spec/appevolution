# Evolution PRO Motion Corrections — Implementation Plan

> **For Codex:** execute this plan inline with test-driven development. Do not delegate tasks.

**Goal:** correggere le sovrapposizioni delle animazioni e applicare tutti gli aggiornamenti di copy, immagini e layout approvati per `www.evolution-pro.it`.

**Architecture:** sostituire le pile di elementi assoluti sempre montati con scene a montaggio singolo tramite `AnimatePresence` e una variante condivisa. Mantenere l’autoplay indipendente dallo scroll, aggiungere pausa su interazione e fallback `prefers-reduced-motion`. Le nuove composizioni grafiche restano componenti React/CSS; solo le due immagini tematiche e il video sono asset raster/media.

**Tech Stack:** React 19, TypeScript, Framer Motion 12, Vitest/Testing Library, Playwright, Vite, CSS.

---

## Task 1: fissare i contratti di contenuto

**Files:**
- Modify: `evolution-pro-site/tests/content.test.ts`
- Modify: `evolution-pro-site/tests/app.test.tsx`
- Modify: `evolution-pro-site/src/content/siteContent.ts`
- Modify: `evolution-pro-site/src/sections/HeroAgents.tsx`
- Modify: `evolution-pro-site/src/sections/ProblemSequence.tsx`
- Modify: `evolution-pro-site/src/sections/EvoMethodSequence.tsx`

**Steps:**
1. Aggiungere test fallenti per pillola target, titolo su quattro righe, sottotitolo esatto, etichetta problema, testo Metodo EVO e 20 collaborazioni.
2. Eseguire i test mirati e verificare che falliscano per i valori correnti.
3. Aggiornare i contenuti e il markup editoriale minimo.
4. Rieseguire i test mirati fino al verde.

## Task 2: rendere le scene realmente esclusive

**Files:**
- Modify: `evolution-pro-site/tests/free-motion.test.tsx`
- Modify: `evolution-pro-site/tests/motion.test.tsx`
- Modify: `evolution-pro-site/src/lib/motion.ts`
- Modify: `evolution-pro-site/src/sections/HeroAgents.tsx`
- Modify: `evolution-pro-site/src/sections/DirectionSequence.tsx`
- Modify: `evolution-pro-site/src/sections/FounderStory.tsx`
- Modify: `evolution-pro-site/src/sections/EvoMethodSequence.tsx`

**Steps:**
1. Scrivere test che richiedano una sola scena visuale montata alla volta nella hero, nella direzione, nella storia e nel Metodo EVO.
2. Aggiungere un test per la pausa su hover/focus e per il fallback con movimento ridotto.
3. Verificare il fallimento dei test con l’attuale strategia basata solo sull’opacità.
4. Introdurre una variante condivisa e usare `AnimatePresence` con una chiave di scena.
5. Conservare una rappresentazione semanticamente accessibile dei contenuti non attivi senza duplicare elementi visuali.
6. Rieseguire i test mirati.

## Task 3: ricostruire la hero

**Files:**
- Modify: `evolution-pro-site/src/sections/HeroAgents.tsx`
- Modify: `evolution-pro-site/src/styles/globals.css`
- Modify: `evolution-pro-site/e2e/homepage.spec.ts`

**Steps:**
1. Aggiungere un test E2E per assenza di sovrapposizione, titolo leggibile e blocco agenti leggermente rialzato.
2. Implementare pillola gialla non interattiva e titolo con righe esplicite.
3. Ridimensionare il titolo in modo fluido e limitare la larghezza della colonna.
4. Montare una sola foto/scheda agente e rialzare il visual con una trasformazione responsiva.
5. Verificare desktop e mobile.

## Task 4: trasformare le collaborazioni in laptop dashboard

**Files:**
- Modify: `evolution-pro-site/tests/marquees.test.tsx`
- Modify: `evolution-pro-site/src/sections/LogoMarquee.tsx`
- Modify: `evolution-pro-site/src/styles/globals.css`

**Steps:**
1. Aggiungere test per la struttura laptop, dashboard e lista completa accessibile.
2. Verificare il fallimento.
3. Costruire cornice, schermo, barra dashboard e moduli decorativi in HTML/CSS.
4. Inserire lo scorrimento dei partner soltanto dentro lo schermo.
5. Fornire griglia statica per movimento ridotto e layout mobile.
6. Rieseguire i test.

## Task 5: integrare media e immagini tematiche

**Files:**
- Create: `evolution-pro-site/public/visuals/human-ai-system.webp`
- Create: `evolution-pro-site/public/visuals/problem-direction.webp`
- Create: `evolution-pro-site/public/video/direction-tools.mp4`
- Modify: `evolution-pro-site/tests/platform.test.tsx`
- Modify: `evolution-pro-site/src/sections/HumanAiSystem.tsx`
- Modify: `evolution-pro-site/src/sections/ProblemSequence.tsx`
- Modify: `evolution-pro-site/src/sections/DirectionSequence.tsx`
- Modify: `evolution-pro-site/src/styles/globals.css`

**Steps:**
1. Aggiungere test fallenti per le due immagini e per il video nella scena centrale.
2. Individuare il file MP4 fornito da Claudio tra gli asset locali disponibili, copiarlo con nome descrittivo e ottimizzarlo solo se necessario.
3. Generare due immagini originali coerenti con il brand: professionista bloccato da attività frammentate; collaborazione umana con AI concreta e non fantascientifica.
4. Convertire/ottimizzare gli output e copiarli negli asset pubblici.
5. Portare Problema e Sistema umano a layout a due colonne.
6. Inserire il video sotto il testo della scena centrale con dimensioni stabili, `muted`, `loop` e `playsInline`.
7. Rieseguire i test.

## Task 6: correggere la storia di Claudio

**Files:**
- Modify: `evolution-pro-site/tests/founder-evo.test.tsx`
- Modify: `evolution-pro-site/src/sections/FounderStory.tsx`
- Modify: `evolution-pro-site/src/styles/globals.css`

**Steps:**
1. Aggiungere un test per la classe/attributo che ancora il ritratto in alto.
2. Verificare il fallimento.
3. Applicare `object-position` superiore e controllare i breakpoint.
4. Confermare che le scene esclusive impediscano sovrapposizioni con storia e numeri.

## Task 7: ricostruire busta, sigillo e lettera

**Files:**
- Modify: `evolution-pro-site/tests/testimonials.test.tsx`
- Modify: `evolution-pro-site/src/sections/EnvelopeTestimonials.tsx`
- Modify: `evolution-pro-site/src/styles/globals.css`
- Modify: `evolution-pro-site/e2e/testimonial-scroll.spec.ts`

**Steps:**
1. Scrivere test per flap grigio, sigillo, logo, sequenza di apertura e CTA cliccabile.
2. Aggiungere test E2E che misuri la lettera e confermi che foto, citazione, stelle e bottone restino sopra il fronte della busta.
3. Verificare il fallimento.
4. Costruire il sigillo navy con asset ufficiale oro e animazione di rottura/apertura.
5. Rendere grigio chiaro il triangolo e ridurre l’altezza coprente del fronte.
6. Alzare la lettera e mantenere il pulsante sopra lo strato non interattivo.
7. Rieseguire unit ed E2E mirati.

## Task 8: verifica completa e rifinitura responsive

**Files:**
- Modify as needed: `evolution-pro-site/src/styles/globals.css`
- Modify as needed: `evolution-pro-site/e2e/homepage.spec.ts`

**Steps:**
1. Eseguire l’intera suite Vitest.
2. Eseguire build di produzione.
3. Avviare preview Vite e l’intera suite Playwright.
4. Ispezionare screenshot a 1440×900, 1280×800, 768×1024 e 390×844.
5. Correggere overflow, crop e allineamenti; ripetere test e screenshot.
6. Controllare console del browser e richieste media fallite.

## Task 9: pubblicazione e controllo live

**Files:**
- Commit only files belonging to this site update.

**Steps:**
1. Rieseguire test, build e controlli essenziali immediatamente prima della pubblicazione.
2. Committare soltanto specifica, piano, codice, test e asset del sito.
3. Pubblicare il progetto `evolution-pro-site` su Vercel produzione.
4. Verificare che `https://www.evolution-pro.it` punti al deployment nuovo.
5. Controllare dal vivo hero, laptop, direzione/video, problema, storia e buste.
