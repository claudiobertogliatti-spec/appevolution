# Evolution PRO Institutional Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire una prima versione locale completa, responsive e animata del nuovo sito istituzionale Evolution PRO, separata dalla SPA Ciak.

**Architecture:** Nuova applicazione Vite/React/TypeScript in `evolution-pro-site/`, con contenuti centralizzati, sezioni autonome e timeline scroll-linked isolate. Framer Motion gestisce reveal e progressi; CSS/Tailwind gestiscono layout e fallback statici. Vitest verifica contenuti e accessibilità di base; Playwright verifica il percorso completo nel browser.

**Tech Stack:** Vite 7, React 19, TypeScript 5, Tailwind CSS 3.4, Framer Motion 12, Vitest, Testing Library, Playwright, Lucide React.

## Global Constraints

- Palette obbligatoria: `#FBC002`, `#0D2952`, `#101326`, `#787878`, `#D8D8D8`.
- Font: Poppins 400/500/600/700 con fallback `system-ui, sans-serif`.
- Fonte copy: `www.evolution-pro.it`, sintetizzata senza cambiare fatti o promesse.
- CTA applicative esclusivamente verso `https://www.ciak.io`; vietato `app.evolution-pro.it`.
- Logo istituzionale: Evolution PRO; Ciak compare solo come piattaforma operativa.
- Animazioni principali controllate dallo scroll, reversibili e non bloccanti.
- `prefers-reduced-motion` deve mostrare tutti i contenuti nello stato finale.
- Mobile: stessa narrazione, sticky ridotti e nessun overflow orizzontale.
- Nessuna citazione testimonial inventata: pubblicare solo testo estratto dai video reali.
- Obiettivi Lighthouse produzione: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.

---

## File structure

```text
evolution-pro-site/
├── index.html                         # metadata e root Vite
├── package.json                       # dipendenze e script standalone
├── vite.config.ts                     # Vite + Vitest
├── playwright.config.ts               # test browser
├── tailwind.config.ts                 # token brand
├── postcss.config.cjs
├── tsconfig.json
├── public/
│   ├── brand/evolution-pro-logo.png
│   ├── agents/*.jpg
│   ├── founder/claudio-portrait.png
│   ├── founder/claudio-office.png
│   ├── partners/*                     # loghi e foto testimonial
│   ├── tools/*.svg                    # loghi ufficiali strumenti
│   └── testimonials/*                 # poster e file/URL video autorizzati
├── src/
│   ├── main.tsx
│   ├── App.tsx                        # ordine delle sezioni
│   ├── styles/globals.css             # base, token e reduced motion
│   ├── content/siteContent.ts          # unica fonte di copy e dati
│   ├── lib/motion.ts                  # preset e hook motion comuni
│   ├── components/ui/Section.tsx
│   ├── components/ui/HighlightedText.tsx
│   ├── components/ui/VideoModal.tsx
│   ├── components/Header.tsx
│   └── sections/*.tsx                 # una sezione per file
├── tests/
│   ├── setup.ts
│   ├── content.test.ts
│   ├── app.test.tsx
│   ├── motion.test.tsx
│   └── testimonials.test.tsx
└── e2e/homepage.spec.ts
```

---

### Task 1: Scaffold standalone e contratti dei contenuti

**Files:**
- Create: `evolution-pro-site/package.json`
- Create: `evolution-pro-site/vite.config.ts`
- Create: `evolution-pro-site/tsconfig.json`
- Create: `evolution-pro-site/tailwind.config.ts`
- Create: `evolution-pro-site/postcss.config.cjs`
- Create: `evolution-pro-site/index.html`
- Create: `evolution-pro-site/src/content/siteContent.ts`
- Create: `evolution-pro-site/tests/content.test.ts`
- Create: `evolution-pro-site/tests/setup.ts`

**Interfaces:**
- Produces: `siteContent: SiteContent`, `SiteContent`, `Agent`, `Tool`, `Testimonial`.
- Produces scripts: `dev`, `build`, `test`, `test:run`, `e2e`.

- [ ] **Step 1: Create package and test configuration**

Use this dependency contract in `package.json`:

```json
{
  "name": "evolution-pro-site",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "framer-motion": "^12.0.0",
    "lucide-react": "^0.507.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "autoprefixer": "^10.4.20",
    "jsdom": "latest",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Write the failing content contract test**

```ts
import { describe, expect, it } from 'vitest'
import { siteContent } from '../src/content/siteContent'

describe('site content', () => {
  it('contains six agents and the approved tools', () => {
    expect(siteContent.agents).toHaveLength(6)
    expect(siteContent.tools.map(tool => tool.name)).toEqual(expect.arrayContaining(['Canva', 'HeyGen']))
  })

  it('never uses the retired app domain', () => {
    expect(JSON.stringify(siteContent)).not.toContain('app.evolution-pro.it')
    expect(siteContent.primaryCta.href).toMatch(/^https:\/\/www\.ciak\.io/)
  })
})
```

- [ ] **Step 3: Run the test and confirm RED**

Run: `pnpm --dir evolution-pro-site install && pnpm --dir evolution-pro-site test:run -- tests/content.test.ts`  
Expected: FAIL because `siteContent.ts` does not exist.

- [ ] **Step 4: Implement typed content**

Define exact types and export:

```ts
export type Agent = { name: string; role: string; help: string; image: string }
export type Tool = { name: string; logo: string }
export type Testimonial = { name: string; role: string; photo: string; quote?: string; video?: string; poster?: string }

export type SiteContent = {
  primaryCta: { label: string; href: string }
  agents: Agent[]
  tools: Tool[]
  testimonials: Testimonial[]
}

export const siteContent: SiteContent = {
  primaryCta: { label: 'Guarda la masterclass gratuita', href: 'https://www.ciak.io' },
  agents: [
    { name: 'Stefania', role: 'Coordinatrice del tuo percorso', help: 'Ti aiuto a rimettere in ordine il percorso.', image: '/agents/stefania.jpg' },
    { name: 'Valentina', role: 'Brand & Posizionamento', help: 'Ti aiuto a dire la cosa giusta alle persone giuste.', image: '/agents/valentina.jpg' },
    { name: 'Andrea', role: 'Coach video e contenuti', help: 'Ti aiuto a sentirti più sicuro prima di premere rec.', image: '/agents/andrea.jpg' },
    { name: 'Gaia', role: 'Supporto tecnico funnel', help: 'Ti aiuto a trasformare il caos tecnico nella prossima azione.', image: '/agents/gaia.jpg' },
    { name: 'Marco', role: 'Strategia lancio', help: 'Ti aiuto a mantenere alta la trazione fino al go-live.', image: '/agents/marco.jpg' },
    { name: 'Matteo', role: 'Analista Ciak Blueprint', help: 'Ti aiuto a trasformare i dati in decisioni concrete.', image: '/agents/matteo.jpg' }
  ],
  tools: ['Systeme.io','Stripe','Cal.com','Vercel','Google Cloud','Meta','YouTube','ElevenLabs','Anthropic','Descript','Canva','HeyGen'].map(name => ({ name, logo: `/tools/${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.svg` })),
  testimonials: [
    { name: 'Michele Baggio', role: 'Partner Evolution', photo: '/partners/michele-baggio.webp' },
    { name: 'Mariantonietta Tornello', role: 'Partner Evolution', photo: '/partners/mariantonietta-tornello.webp' },
    { name: 'Sarah Arensi', role: 'Partner Evolution', photo: '/partners/sarah-arensi.webp' }
  ]
}
```

- [ ] **Step 5: Run GREEN and commit**

Run: `pnpm --dir evolution-pro-site test:run -- tests/content.test.ts`  
Expected: 2 tests PASS.

```bash
git add evolution-pro-site
git commit -m "feat(site): scaffold standalone Evolution PRO app"
```

---

### Task 2: Design system, shell e ordine narrativo

**Files:**
- Create: `evolution-pro-site/src/main.tsx`
- Create: `evolution-pro-site/src/App.tsx`
- Create: `evolution-pro-site/src/styles/globals.css`
- Create: `evolution-pro-site/src/components/ui/Section.tsx`
- Create: `evolution-pro-site/src/components/ui/HighlightedText.tsx`
- Create: `evolution-pro-site/src/components/Header.tsx`
- Create: `evolution-pro-site/tests/app.test.tsx`

**Interfaces:**
- Consumes: `siteContent.primaryCta`.
- Produces: `Section({tone,id,children})`, `HighlightedText`, semantic page landmarks.

- [ ] **Step 1: Write failing semantic-shell test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('homepage shell', () => {
  it('renders one main landmark and the complete section order', () => {
    render(<App />)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('link', { name: /masterclass gratuita/i })).toHaveAttribute('href', 'https://www.ciak.io')
    expect(screen.getAllByTestId('home-section').map(node => node.id)).toEqual([
      'hero','collaborazioni','strumenti','direzione','problema','claudio','metodo-evo','sistema','ciak','testimonianze','faq','inizia'
    ])
  })
})
```

- [ ] **Step 2: Run RED**

Run: `pnpm --dir evolution-pro-site test:run -- tests/app.test.tsx`  
Expected: FAIL because `App` is missing.

- [ ] **Step 3: Implement tokens and primitives**

In `globals.css`, define `--gold`, `--navy`, `--ink`, `--silver`, `--light`, `--paper`, fluid headings, focus ring, `.container`, `.section`, and:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
  }
}
```

Implement `Section` with `data-testid="home-section"` and tone classes. Implement `App` with the exact section ID order from the test, initially using headings as vertical slices.

- [ ] **Step 4: Run GREEN and build**

Run: `pnpm --dir evolution-pro-site test:run -- tests/app.test.tsx && pnpm --dir evolution-pro-site build`  
Expected: test PASS and Vite build exits 0.

- [ ] **Step 5: Commit**

```bash
git add evolution-pro-site
git commit -m "feat(site): add brand system and narrative shell"
```

---

### Task 3: Motion foundation e hero agenti

**Files:**
- Create: `evolution-pro-site/src/lib/motion.ts`
- Create: `evolution-pro-site/src/sections/HeroAgents.tsx`
- Create: `evolution-pro-site/tests/motion.test.tsx`
- Modify: `evolution-pro-site/src/App.tsx`
- Copy: `backend/assets/logo_evolutionpro.png` → `evolution-pro-site/public/brand/evolution-pro-logo.png`
- Copy: `frontend/public/agents/{stefania,valentina,andrea,gaia,marco,matteo}.jpg` → `evolution-pro-site/public/agents/`

**Interfaces:**
- Produces: `useSafeScrollProgress(ref)`, `reveal`, `stagger`, `HeroAgents`.
- Consumes: `siteContent.agents`, `siteContent.primaryCta`.

- [ ] **Step 1: Write failing reduced-motion test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HeroAgents } from '../src/sections/HeroAgents'

vi.mock('framer-motion', async importOriginal => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => true
}))

describe('HeroAgents', () => {
  it('keeps every agent discoverable when motion is reduced', () => {
    render(<HeroAgents />)
    for (const name of ['Stefania','Valentina','Andrea','Gaia','Marco','Matteo']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })
})
```

- [ ] **Step 2: Run RED**

Run: `pnpm --dir evolution-pro-site test:run -- tests/motion.test.tsx`  
Expected: FAIL because `HeroAgents` is missing.

- [ ] **Step 3: Implement scroll-linked hero**

Use a sticky visual stage on desktop. Map scroll progress to active agent index `Math.min(5, Math.floor(progress * 6))`. Animate only opacity, scale, rotate and translate. Render all six names in the DOM; inactive cards use visual hiding, not `display:none`. For reduced motion render a static six-avatar cluster with Stefania's card visible and a compact agent list for accessibility.

- [ ] **Step 4: Verify hero**

Run: `pnpm --dir evolution-pro-site test:run -- tests/motion.test.tsx && pnpm --dir evolution-pro-site build`  
Expected: PASS and build exit 0.

- [ ] **Step 5: Commit**

```bash
git add evolution-pro-site
git commit -m "feat(site): add scroll-driven agent hero"
```

---

### Task 4: Collaborazioni, strumenti, direzione e problema

**Files:**
- Create: `evolution-pro-site/src/sections/LogoMarquee.tsx`
- Create: `evolution-pro-site/src/sections/ToolsMarquee.tsx`
- Create: `evolution-pro-site/src/sections/DirectionSequence.tsx`
- Create: `evolution-pro-site/src/sections/ProblemSequence.tsx`
- Create: `evolution-pro-site/tests/marquees.test.tsx`
- Modify: `evolution-pro-site/src/App.tsx`

**Interfaces:**
- Consumes: `siteContent.tools`.
- Produces four section components; marquees pause on hover/focus and expose one accessible list.

- [ ] **Step 1: Write failing marquee test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ToolsMarquee } from '../src/sections/ToolsMarquee'

describe('ToolsMarquee', () => {
  it('announces every approved tool exactly once to assistive technology', () => {
    render(<ToolsMarquee />)
    expect(screen.getAllByRole('listitem')).toHaveLength(12)
    expect(screen.getByText('Canva')).toBeInTheDocument()
    expect(screen.getByText('HeyGen')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run RED**

Run: `pnpm --dir evolution-pro-site test:run -- tests/marquees.test.tsx`  
Expected: FAIL because `ToolsMarquee` is missing.

- [ ] **Step 3: Implement sections**

Duplicate only the visual track using `aria-hidden="true"`; keep one semantic list. `DirectionSequence` uses a sticky three-state timeline: rumore → arresto → allineamento. `ProblemSequence` progressively reveals the five approved pain points and ends with “Non ti manca la competenza. Ti manca un sistema.”

- [ ] **Step 4: Run GREEN and build**

Run: `pnpm --dir evolution-pro-site test:run -- tests/marquees.test.tsx && pnpm --dir evolution-pro-site build`  
Expected: PASS and build exit 0.

- [ ] **Step 5: Commit**

```bash
git add evolution-pro-site
git commit -m "feat(site): add proof, tools and direction sequences"
```

---

### Task 5: Storia di Claudio e Metodo EVO

**Files:**
- Create: `evolution-pro-site/src/sections/FounderStory.tsx`
- Create: `evolution-pro-site/src/sections/EvoMethodSequence.tsx`
- Create: `evolution-pro-site/tests/founder-evo.test.tsx`
- Modify: `evolution-pro-site/src/App.tsx`
- Copy: user-provided Claudio portrait → `evolution-pro-site/public/founder/claudio-portrait.png`
- Copy: user-provided Claudio office image → `evolution-pro-site/public/founder/claudio-office.png`

**Interfaces:**
- Produces: `FounderStory`, `EvoMethodSequence`.
- Facts rendered exactly: `20+`, `13`, `25.000+`, `€6M+`, `7`.

- [ ] **Step 1: Write failing facts test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FounderStory } from '../src/sections/FounderStory'
import { EvoMethodSequence } from '../src/sections/EvoMethodSequence'

it('renders verified founder facts and all EVO phases', () => {
  render(<><FounderStory /><EvoMethodSequence /></>)
  for (const value of ['20+','13','25.000+','€6M+','7']) expect(screen.getByText(value)).toBeInTheDocument()
  for (const phase of ['Esamina','Valida','Ottimizza']) expect(screen.getByText(phase)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run RED**

Run: `pnpm --dir evolution-pro-site test:run -- tests/founder-evo.test.tsx`  
Expected: FAIL because both components are missing.

- [ ] **Step 3: Implement narrative sequences**

Founder sequence order: portrait → verified narrative → counters → office image → partner-operativo conclusion. Counters animate from zero only when motion is enabled; accessible text always contains final values. EVO sequence uses three sticky states and shows “12 fasi operative” as supporting detail, never as a fourth phase.

- [ ] **Step 4: Verify and commit**

Run: `pnpm --dir evolution-pro-site test:run -- tests/founder-evo.test.tsx && pnpm --dir evolution-pro-site build`  
Expected: PASS and build exit 0.

```bash
git add evolution-pro-site
git commit -m "feat(site): tell founder story and Metodo EVO"
```

---

### Task 6: Sistema umano + AI e demo Ciak

**Files:**
- Create: `evolution-pro-site/src/sections/HumanAiSystem.tsx`
- Create: `evolution-pro-site/src/sections/CiakPlatformDemo.tsx`
- Create: `evolution-pro-site/tests/platform.test.tsx`
- Modify: `evolution-pro-site/src/App.tsx`

**Interfaces:**
- Produces: `HumanAiSystem`, `CiakPlatformDemo`.
- Consumes: agent data and real Ciak screenshots added to `public/platform/`.

- [ ] **Step 1: Write failing platform-message test**

```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { HumanAiSystem } from '../src/sections/HumanAiSystem'
import { CiakPlatformDemo } from '../src/sections/CiakPlatformDemo'

it('keeps human supervision and Ciak transition explicit', () => {
  render(<><HumanAiSystem /><CiakPlatformDemo /></>)
  expect(screen.getByText(/supervisione umana/i)).toBeInTheDocument()
  expect(screen.getByText(/continua su Ciak/i)).toBeInTheDocument()
  expect(screen.getByText(/prossima azione/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run RED**

Run: `pnpm --dir evolution-pro-site test:run -- tests/platform.test.tsx`  
Expected: FAIL because components are missing.

- [ ] **Step 3: Implement product story**

Render relationship in this exact order: piattaforma organizes → agents support → human team supervises → partner decides. Ciak demo cycles on scroll through brainstorming, positioning, course structure, progress and next action. Use real screenshots as framed layers; if a screenshot is absent, render a branded neutral panel rather than a broken image.

- [ ] **Step 4: Verify and commit**

Run: `pnpm --dir evolution-pro-site test:run -- tests/platform.test.tsx && pnpm --dir evolution-pro-site build`  
Expected: PASS and build exit 0.

```bash
git add evolution-pro-site
git commit -m "feat(site): add human AI system and Ciak demo"
```

---

### Task 7: Buste testimonial, video modal, FAQ e CTA finale

**Files:**
- Create: `evolution-pro-site/src/components/ui/VideoModal.tsx`
- Create: `evolution-pro-site/src/sections/EnvelopeTestimonials.tsx`
- Create: `evolution-pro-site/src/sections/FaqAccordion.tsx`
- Create: `evolution-pro-site/src/sections/FinalCta.tsx`
- Create: `evolution-pro-site/tests/testimonials.test.tsx`
- Modify: `evolution-pro-site/src/App.tsx`
- Modify: `evolution-pro-site/src/content/siteContent.ts`

**Interfaces:**
- `VideoModal({open,onClose,src,title,poster})`.
- Testimonial cards render only when `quote` and `video` are both non-empty.

- [ ] **Step 1: Write failing publication-safety test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EnvelopeTestimonials } from '../src/sections/EnvelopeTestimonials'

describe('testimonial publishing', () => {
  it('does not publish an unverifiable quote or dead video CTA', () => {
    render(<EnvelopeTestimonials testimonials={[
      { name: 'Michele Baggio', role: 'Partner Evolution', photo: '/michele.webp' }
    ]} />)
    expect(screen.queryByText(/★★★★★/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /guarda/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run RED**

Run: `pnpm --dir evolution-pro-site test:run -- tests/testimonials.test.tsx`  
Expected: FAIL because `EnvelopeTestimonials` is missing.

- [ ] **Step 3: Extract real testimonial content before implementation**

For each confirmed file, record in `siteContent.ts`:

```ts
{ name, role, photo, quote: 'verbatim excerpt under 25 words', video: '/testimonials/file.mp4', poster: '/testimonials/file-poster.webp' }
```

Reject generated or paraphrased quotes. Keep each displayed excerpt under 25 words.

- [ ] **Step 4: Implement envelope timeline and accessible modal**

Envelope states: closed → flap open → photo rises → message rises → stars/CTA. `VideoModal` must use `role="dialog"`, `aria-modal="true"`, close on Escape, trap focus, restore focus to opener and stop playback on close. FAQ buttons expose `aria-expanded` and `aria-controls`.

- [ ] **Step 5: Verify interactions and commit**

Run: `pnpm --dir evolution-pro-site test:run -- tests/testimonials.test.tsx tests/app.test.tsx && pnpm --dir evolution-pro-site build`  
Expected: PASS and build exit 0.

```bash
git add evolution-pro-site
git commit -m "feat(site): add envelope testimonials and conversion close"
```

---

### Task 8: Browser verification, responsive polish e local handoff

**Files:**
- Create: `evolution-pro-site/playwright.config.ts`
- Create: `evolution-pro-site/e2e/homepage.spec.ts`
- Modify: relevant section styles only where failures are observed
- Create: `evolution-pro-site/README.md`

**Interfaces:**
- Produces a reproducible local command: `pnpm --dir evolution-pro-site dev`.
- Produces browser coverage for desktop and mobile.

- [ ] **Step 1: Write end-to-end test**

```ts
import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`homepage ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('direzione')
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', viewport.width)
    await expect(page.locator('a[href*="app.evolution-pro.it"]')).toHaveCount(0)
    await expect(page.getByRole('link', { name: /masterclass/i }).first()).toHaveAttribute('href', /^https:\/\/www\.ciak\.io/)
  })
}
```

- [ ] **Step 2: Run E2E and fix only observed failures**

Run: `pnpm --dir evolution-pro-site exec playwright install chromium && pnpm --dir evolution-pro-site e2e`  
Expected: both desktop and mobile tests PASS.

- [ ] **Step 3: Run complete verification**

Run:

```bash
pnpm --dir evolution-pro-site test:run
pnpm --dir evolution-pro-site build
pnpm --dir evolution-pro-site e2e
```

Expected: all unit tests PASS, TypeScript/Vite build exits 0, Playwright desktop/mobile PASS.

- [ ] **Step 4: Manually verify motion and accessibility**

Open local site and verify:

- scroll forward and backward through hero, direction, founder, EVO and Ciak;
- `prefers-reduced-motion: reduce` shows complete static content;
- keyboard opens/closes FAQ and testimonial modal;
- Escape closes the video and returns focus;
- no horizontal scroll at 390px;
- images use responsive dimensions and below-fold lazy loading;
- no autoplay audio;
- every CTA uses `www.ciak.io`.

- [ ] **Step 5: Document and commit local handoff**

`README.md` must contain exact install, dev, test and build commands plus asset inventory.

```bash
git add evolution-pro-site
git commit -m "test(site): verify responsive institutional experience"
```

