# Evolution PRO Final Motion Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** correggere definitivamente hero e animazioni, spostare il portatile realistico nella sezione strumenti, usare il video Dribbble come sfondo della direzione e rifinire busta e CTA finale.

**Architecture:** le sequenze usano un solo indice autoplay condiviso, sempre attivo e indipendente da scroll, hover e preferenze browser. Partner e strumenti tornano componenti separati: marquee semplice per i partner, asset fotorealistico con screen overlay per gli strumenti. Video e immagini vengono serviti localmente da `public/`.

**Tech Stack:** React 19, TypeScript, Framer Motion 12, CSS, Vitest/Testing Library, Playwright, Vite, Vercel.

## Global Constraints

- Palette obbligatoria: `#FBC002`, `#0D2952`, `#101326`, `#787878`, `#D8D8D8`.
- Hero su quattro righe esatte: `La tua` / `competenza` / `merita una` / `direzione`.
- Nessuna sequenza si ferma su hover o con `prefers-reduced-motion`.
- Il portatile fotorealistico compare solo negli strumenti ed è centrato.
- I partner restano nella barra semplice in scorrimento.
- Il video Dribbble è locale, in autoplay, muted, loop e playsInline.
- Il sigillo mostra solo la spirale grigia su trasparenza; il triangolo superiore è giallo.
- Nessuna modifica a `www.ciak.io` o alla destinazione delle CTA.

---

### Task 1: bloccare hero e autoplay con test di regressione

**Files:**
- Modify: `evolution-pro-site/tests/motion.test.tsx`
- Modify: `evolution-pro-site/tests/free-motion.test.tsx`
- Modify: `evolution-pro-site/e2e/homepage.spec.ts`
- Modify: `evolution-pro-site/src/lib/motion.ts`
- Modify: `evolution-pro-site/src/styles/globals.css`

**Interfaces:**
- Produces: `useAutoplaySequence(length, intervalMs)` con indice sempre attivo e `interactionProps: {}`.

- [ ] **Step 1: mantenere i test fallenti già creati**

I test devono richiedere rotazione con reduced motion e hover, `white-space: nowrap` sulle quattro righe e nessuna sovrapposizione a 1920 px.

- [ ] **Step 2: verificare il rosso e implementare il minimo**

```ts
export function useAutoplaySequence(length: number, intervalMs: number) {
  return { index: useAutoplayIndex(length, intervalMs), reduced: false, interactionProps: {} };
}
```

```css
.hero-agents__copy h1 { font-size: clamp(3.5rem, 6.1vw, 6.65rem); }
.hero-agents__copy h1 > span { white-space: nowrap; }
```

- [ ] **Step 3: eseguire unit ed E2E mirati**

Run: `npx vitest run tests/motion.test.tsx tests/free-motion.test.tsx --reporter=dot`

Run: `npx playwright test e2e/homepage.spec.ts --project=desktop-chromium --project=mobile-chromium --workers=1 --reporter=line`

Expected: tutti PASS; rotazione visibile e quattro righe senza overlap.

### Task 2: ripristinare partner e costruire il laptop realistico degli strumenti

**Files:**
- Create: `evolution-pro-site/public/visuals/tools-laptop.webp`
- Modify: `evolution-pro-site/tests/marquees.test.tsx`
- Modify: `evolution-pro-site/src/sections/LogoMarquee.tsx`
- Modify: `evolution-pro-site/src/sections/ToolsMarquee.tsx`
- Modify: `evolution-pro-site/src/styles/globals.css`

**Interfaces:**
- Produces: `[data-testid="tools-laptop"]` con `.tools-laptop__screen`; `LogoMarquee` senza laptop.

- [ ] **Step 1: scrivere test fallenti**

```ts
render(<><LogoMarquee /><ToolsMarquee /></>);
expect(screen.queryByTestId('collaboration-laptop')).not.toBeInTheDocument();
expect(screen.getByTestId('tools-laptop')).toBeInTheDocument();
expect(screen.getByTestId('tools-laptop-image')).toHaveAttribute('src', '/visuals/tools-laptop.webp');
expect(screen.getByTestId('logos-visual-track')).toHaveClass('marquee__track--clone');
```

- [ ] **Step 2: generare il portatile realistico**

Creare un portatile frontale fotorealistico, centrato, con chassis argento, schermo rettangolare scuro vuoto e sfondo trasparente o neutro uniforme. Convertire in WebP ottimizzato e verificare visivamente l’area schermo.

- [ ] **Step 3: ripristinare la barra partner**

`LogoMarquee` deve rendere direttamente `.marquee > .marquee__track`, senza dashboard, statistiche o base del laptop.

- [ ] **Step 4: integrare i loghi nello schermo**

```tsx
<div className="tools-laptop" data-testid="tools-laptop">
  <img data-testid="tools-laptop-image" src="/visuals/tools-laptop.webp" alt="Computer portatile con gli strumenti Evolution PRO" />
  <div className="tools-laptop__screen">
    <ul className="tools-cinematic__fan" aria-label="Strumenti collegati">
      {siteContent.tools.map((tool, index) => <ToolCard key={tool.name} tool={tool} index={index} total={siteContent.tools.length} activeIndex={activeIndex} compact={compact} />)}
    </ul>
  </div>
</div>
```

Lo schermo overlay deve restare dentro la cornice a tutti i breakpoint.

- [ ] **Step 5: verificare**

Run: `npx vitest run tests/marquees.test.tsx --reporter=dot`

Expected: PASS con 20 partner nel marquee semplice e 12 loghi nel laptop.

### Task 3: usare il video Dribbble come sfondo della direzione

**Files:**
- Create: `evolution-pro-site/public/video/direction-background.mp4`
- Modify: `evolution-pro-site/tests/marquees.test.tsx`
- Modify: `evolution-pro-site/src/sections/DirectionSequence.tsx`
- Modify: `evolution-pro-site/src/styles/globals.css`

**Interfaces:**
- Produces: `[data-testid="direction-background-video"]` sempre montato dietro le tre scene.

- [ ] **Step 1: scrivere il test fallente**

```ts
expect(screen.getByTestId('direction-background-video')).toHaveAttribute('src', '/video/direction-background.mp4');
expect(screen.getByTestId('direction-background-video')).toHaveAttribute('autoplay');
expect(screen.getByTestId('direction-background-video')).toHaveAttribute('loop');
expect(screen.getByTestId('direction-background-video')).toHaveAttribute('muted');
```

- [ ] **Step 2: scaricare e verificare il video**

Scaricare `https://cdn.dribbble.com/userupload/48249026/file/a061928a6f36b905ec15d4d711e8391c.mp4` in `public/video/direction-background.mp4`; verificare MIME, dimensioni e riproduzione locale.

- [ ] **Step 3: montare video, overlay e scene**

```tsx
<video data-testid="direction-background-video" className="direction-sequence__background" src="/video/direction-background.mp4" autoPlay muted loop playsInline preload="auto" />
<div className="direction-sequence__overlay" aria-hidden="true" />
```

Rimuovere il vecchio video inserito sotto il testo. Le tre scene testuali restano sopra overlay e filmato.

- [ ] **Step 4: verificare**

Run: `npx vitest run tests/marquees.test.tsx --reporter=dot`

Expected: PASS e video di sfondo sempre presente.

### Task 4: rendere evidenti storia e Metodo EVO

**Files:**
- Modify: `evolution-pro-site/tests/founder-evo.test.tsx`
- Modify: `evolution-pro-site/src/sections/FounderStory.tsx`
- Modify: `evolution-pro-site/src/sections/EvoMethodSequence.tsx`

**Interfaces:**
- Consumes: `useAutoplaySequence` sempre attivo.
- Produces: scene con intervallo 3000 ms e attributi `data-active-founder-beat`, `data-testid="active-evo-phase"`.

- [ ] **Step 1: scrivere test fallenti con fake timer**

```ts
render(<FounderStory />);
expect(screen.getByText(/Mi chiamo Claudio/)).toBeInTheDocument();
act(() => vi.advanceTimersByTime(3100));
expect(screen.getByText(/Da oltre 20 anni/)).toBeInTheDocument();
```

```ts
render(<EvoMethodSequence />);
expect(screen.getByTestId('active-evo-phase')).toHaveTextContent('Esamina');
act(() => vi.advanceTimersByTime(3100));
expect(screen.getByTestId('active-evo-phase')).toHaveTextContent('Valida');
```

- [ ] **Step 2: uniformare gli intervalli a 3000 ms**

Usare `useAutoplaySequence(5, 3000)` nella storia e `useAutoplaySequence(3, 3000)` nel Metodo EVO; mantenere una sola scena visuale montata.

- [ ] **Step 3: verificare**

Run: `npx vitest run tests/founder-evo.test.tsx --reporter=dot`

Expected: PASS e cambio scena dopo 3,1 secondi.

### Task 5: rifinire sigillo e CTA finale

**Files:**
- Create: `evolution-pro-site/public/brand/evolution-spiral-gray.webp`
- Create: `evolution-pro-site/public/visuals/final-direction.webp`
- Modify: `evolution-pro-site/tests/testimonials.test.tsx`
- Modify: `evolution-pro-site/tests/app.test.tsx`
- Modify: `evolution-pro-site/src/sections/EnvelopeTestimonials.tsx`
- Modify: `evolution-pro-site/src/sections/FinalCta.tsx`
- Modify: `evolution-pro-site/src/styles/globals.css`

**Interfaces:**
- Produces: `.envelope__seal-logo--spiral`, `.final-cta__layout`, `/visuals/final-direction.webp`.

- [ ] **Step 1: scrivere test fallenti**

```ts
expect(screen.getAllByTestId('testimonial-seal')[0]).toHaveAttribute('data-seal-style', 'gray-spiral');
expect(screen.getAllByTestId('testimonial-seal')[0].querySelector('img')).toHaveAttribute('src', '/brand/evolution-spiral-gray.webp');
```

```ts
expect(screen.getByRole('img', { name: /scelta della direzione/i })).toHaveAttribute('src', '/visuals/final-direction.webp');
```

- [ ] **Step 2: creare gli asset**

Estrarre la sola spirale del logo, convertirla in grigio e salvarla con trasparenza. Generare un’immagine orizzontale per la CTA: professionista a destra davanti a una mappa strategica/roadmap, palette navy e giallo, nessun testo.

- [ ] **Step 3: modificare la busta**

Il triangolo superiore usa `background: var(--brand-yellow)`. Il contenitore del sigillo non ha bordo, cerchio, sfondo o ombra; contiene solo la spirale grigia.

- [ ] **Step 4: modificare la CTA**

```tsx
<div className="final-cta__layout">
  <div className="final-cta__copy">
    <h2>Prima di costruire, scegli una direzione.</h2>
    <p>La masterclass gratuita ti spiega quali errori evitare e qual è il primo passo da fare.</p>
    <a className="button button--primary" href={siteContent.primaryCta.href}>{siteContent.primaryCta.label}</a>
  </div>
  <img className="final-cta__image" src="/visuals/final-direction.webp" alt="Professionista che sceglie la direzione strategica del progetto" />
</div>
```

Desktop: due colonne. Mobile: testo sopra, immagine sotto.

- [ ] **Step 5: verificare**

Run: `npx vitest run tests/testimonials.test.tsx tests/app.test.tsx --reporter=dot`

Expected: PASS.

### Task 6: verifica completa, commit e deploy

**Files:**
- Commit only: codice, test, specifica, piano e nuovi asset del sito.

- [ ] **Step 1: eseguire suite e build**

Run: `npm run test:run -- --reporter=dot`

Expected: tutti PASS.

Run: `npm run build`

Expected: build Vite completata.

- [ ] **Step 2: eseguire E2E essenziali**

Run: `npx playwright test e2e/homepage.spec.ts e2e/testimonial-scroll.spec.ts --project=desktop-chromium --project=mobile-chromium --workers=1 --reporter=line`

Expected: PASS, con skip previsto solo per test desktop su mobile.

- [ ] **Step 3: verificare visivamente**

Controllare screenshot 1920×1080 e 390×844: laptop reale centrato, partner senza laptop, video dietro il testo, storia/EVO in due momenti separati, spirale grigia, flap giallo e immagine CTA.

- [ ] **Step 4: commit e push**

```bash
git add docs/superpowers/plans/2026-07-14-evolution-pro-motion-corrections-plan.md evolution-pro-site/e2e/homepage.spec.ts evolution-pro-site/src evolution-pro-site/tests evolution-pro-site/public/brand/evolution-spiral-gray.webp evolution-pro-site/public/visuals/tools-laptop.webp evolution-pro-site/public/visuals/final-direction.webp evolution-pro-site/public/video/direction-background.mp4
git commit -m "fix(site): align motion sections with approved design"
git push origin main
```

- [ ] **Step 5: deploy e verifica live**

Run: `npx vercel --prod --yes`

Verificare su `https://www.evolution-pro.it` che le scene cambino dopo 3–4 secondi e che tutti i nuovi asset rispondano `200`.
