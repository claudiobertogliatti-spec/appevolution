# Evolution PRO Cinematic Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare Strumenti, Videotestimonianze e Ciak in tre sequenze cinematiche reversibili e sincronizzate allo scroll.

**Architecture:** Ogni sezione espone un contenuto semantico unico e una scena sticky desktop guidata da `useSafeScrollProgress`. Le trasformazioni Framer Motion restano locali ai componenti e aggiornano `transform` e `opacity`; sotto `59.99rem` gli stessi contenuti vengono disposti in flusso statico.

**Tech Stack:** React 19, TypeScript 5.9, Framer Motion 12, Vitest, Testing Library, Playwright, CSS.

## Global Constraints

- Palette: oro `#FBC002`, navy `#0D2952`, ink `#101326`, argento `#787878`, grigio chiaro `#D8D8D8`.
- Movimento determinato dallo scroll, senza autoplay temporizzato.
- Timeline reversibili scorrendo indietro.
- Breakpoint statico mobile: `59.99rem`.
- CTA Ciak esclusivamente verso `https://www.ciak.io`.
- Nessuna nuova dipendenza e nessun uso del video Dribbble nel prodotto.
- Animare soltanto `transform` e `opacity` quando possibile.

---

## File Structure

- Modify `evolution-pro-site/src/sections/ToolsMarquee.tsx`: regia a ventaglio e dettaglio dello strumento attivo.
- Modify `evolution-pro-site/src/sections/EnvelopeTestimonials.tsx`: regia 3D di busta, lettera e CTA.
- Modify `evolution-pro-site/src/sections/CiakPlatformDemo.tsx`: collage 3D delle cinque schermate sintetiche.
- Modify `evolution-pro-site/src/styles/globals.css`: scene sticky, profondità, fallback mobile.
- Modify `evolution-pro-site/tests/marquees.test.tsx`: struttura e fallback degli strumenti.
- Modify `evolution-pro-site/tests/testimonials.test.tsx`: stati e interazione delle testimonianze.
- Modify `evolution-pro-site/tests/platform.test.tsx`: collage Ciak, ordine e CTA.
- Create `evolution-pro-site/e2e/cinematic-scroll.spec.ts`: verifica timeline avanti/indietro e browser runtime.

---

### Task 1: Ventaglio cinematografico degli strumenti

**Files:**
- Modify: `evolution-pro-site/src/sections/ToolsMarquee.tsx`
- Modify: `evolution-pro-site/src/styles/globals.css`
- Test: `evolution-pro-site/tests/marquees.test.tsx`

**Interfaces:**
- Consumes: `siteContent.tools`, `useSafeScrollProgress(ref)`, `useMediaQuery('(max-width: 59.99rem)')`.
- Produces: sezione `#strumenti`, attributo `data-tool-card`, card centrali con `data-active`, contenuto accessibile non duplicato.

- [ ] **Step 1: Write the failing tests**

Add to `tests/marquees.test.tsx`:

```tsx
it('costruisce un ventaglio scroll-linked senza duplicare gli strumenti', () => {
  render(<ToolsMarquee />);
  const section = screen.getByTestId('tools-cinematic');
  expect(section).toHaveAttribute('data-scroll-linked', 'true');
  expect(screen.getAllByTestId('tool-card')).toHaveLength(siteContent.tools.length);
  expect(screen.getByText('Canva')).toBeInTheDocument();
  expect(screen.getByText('HeyGen')).toBeInTheDocument();
});

it('espone un fallback mobile in flusso', () => {
  mockMobileViewport(true);
  render(<ToolsMarquee />);
  expect(screen.getByTestId('tools-cinematic')).toHaveClass('tools-cinematic--static');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm exec vitest run tests/marquees.test.tsx`

Expected: FAIL because `tools-cinematic`, `tool-card` and the static class do not exist.

- [ ] **Step 3: Implement the scroll-linked fan**

Replace the duplicated marquee presentation with one card per tool:

```tsx
export function ToolsMarquee() {
  const ref = useRef<HTMLElement>(null);
  const progress = useSafeScrollProgress(ref);
  const staticMode = useMediaQuery('(max-width: 59.99rem)');

  return (
    <section ref={ref} id="strumenti" data-testid="tools-cinematic"
      data-scroll-linked="true"
      className={`tools-cinematic${staticMode ? ' tools-cinematic--static' : ''}`}>
      <div className="tools-cinematic__stage container">
        <header><p className="eyebrow">Strumenti</p><h2>Gli strumenti giusti, già collegati.</h2></header>
        <ul className="tools-cinematic__fan" aria-label="Strumenti collegati">
          {siteContent.tools.map((tool, index) => (
            <ToolCard key={tool.name} tool={tool} index={index}
              total={siteContent.tools.length} progress={progress} staticMode={staticMode} />
          ))}
        </ul>
      </div>
    </section>
  );
}
```

Implement `ToolCard` in the same file. Map index to a normalized center, use `useTransform` for `x`, `y`, `rotate`, `scale` and `opacity`, and set `data-testid="tool-card"`. Keep the tool name as real text and mark only decorative initials `aria-hidden="true"`.

- [ ] **Step 4: Add layout and mobile CSS**

Add `.tools-cinematic { min-height: 360vh; }`, a `position: sticky` full-height stage and absolutely positioned card list. Add `.tools-cinematic--static` rules inside the existing `@media (max-width: 59.99rem)` block so all cards form a responsive grid with `position: relative; transform: none; opacity: 1`.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm exec vitest run tests/marquees.test.tsx`

Expected: all marquee tests PASS.

- [ ] **Step 6: Commit**

```bash
git add evolution-pro-site/src/sections/ToolsMarquee.tsx evolution-pro-site/src/styles/globals.css evolution-pro-site/tests/marquees.test.tsx
git commit -m "feat(site): add cinematic tools fan"
```

---

### Task 2: Busta 3D per le videotestimonianze

**Files:**
- Modify: `evolution-pro-site/src/sections/EnvelopeTestimonials.tsx`
- Modify: `evolution-pro-site/src/styles/globals.css`
- Test: `evolution-pro-site/tests/testimonials.test.tsx`

**Interfaces:**
- Consumes: `Testimonial`, `isPublishableTestimonial`, `VideoModal`, `useSafeScrollProgress`.
- Produces: `data-testid="testimonial-letter"`, progress numerico su `data-progress`, CTA invariata `Guarda la testimonianza`.

- [ ] **Step 1: Write the failing tests**

Add:

```tsx
it('compone busta e lettera come livelli distinti', () => {
  render(<EnvelopeTestimonials testimonials={[verifiedTestimonial]} />);
  expect(screen.getByTestId('testimonial-envelope')).toHaveClass('envelope--cinematic');
  expect(screen.getByTestId('testimonial-letter')).toBeInTheDocument();
  expect(screen.getByLabelText('5 stelle su 5')).toBeInTheDocument();
});

it('mantiene la CTA video come ultimo livello della lettera', () => {
  render(<EnvelopeTestimonials testimonials={[verifiedTestimonial]} />);
  expect(screen.getByRole('button', { name: 'Guarda la testimonianza' }))
    .toBeInTheDocument();
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm exec vitest run tests/testimonials.test.tsx`

Expected: FAIL on missing `envelope--cinematic` and `testimonial-letter`.

- [ ] **Step 3: Implement the cinematic layers**

Retain the existing `stage()` ranges and add transforms for the whole letter:

```tsx
const letterY = 150 * (1 - stage(visualProgress, 0.2, 0.55));
const letterRotate = -4 + 4 * stage(visualProgress, 0.2, 0.55);

<article className="envelope envelope--cinematic" data-testid="testimonial-envelope">
  <motion.div className="envelope__flap" style={staticMode ? undefined : { rotateX: flap * 180 }} />
  <motion.div data-testid="testimonial-letter" className="envelope__letter"
    style={staticMode ? undefined : { y: letterY, rotate: letterRotate }}>
    {/* photo, quote, stars and CTA remain semantic children */}
  </motion.div>
  <div className="envelope__front" aria-hidden="true" />
</article>
```

Keep `VideoModal` behavior unchanged and keep filtering unpublished testimonials.

- [ ] **Step 4: Add 3D envelope CSS**

Use `perspective`, `transform-style: preserve-3d`, layered flap/front/letter, navy envelope and yellow interior accent. In mobile rules show the final open state with the full letter visible and no overlapping content.

- [ ] **Step 5: Verify GREEN and regressions**

Run: `pnpm exec vitest run tests/testimonials.test.tsx`

Expected: all testimonial tests PASS, including Escape and focus restoration.

- [ ] **Step 6: Commit**

```bash
git add evolution-pro-site/src/sections/EnvelopeTestimonials.tsx evolution-pro-site/src/styles/globals.css evolution-pro-site/tests/testimonials.test.tsx
git commit -m "feat(site): animate testimonial envelope in 3d"
```

---

### Task 3: Collage 3D delle schermate Ciak

**Files:**
- Modify: `evolution-pro-site/src/sections/CiakPlatformDemo.tsx`
- Modify: `evolution-pro-site/src/styles/globals.css`
- Test: `evolution-pro-site/tests/platform.test.tsx`

**Interfaces:**
- Consumes: `demoStates`, `PlatformPanel`, `siteContent.primaryCta`, `useSafeScrollProgress`.
- Produces: `data-testid="ciak-collage"`, cinque `data-ciak-state`, ciascuno con `data-depth`.

- [ ] **Step 1: Write the failing tests**

Add:

```tsx
it('presenta cinque schermate in un collage cinematico', () => {
  render(<CiakPlatformDemo />);
  expect(screen.getByTestId('ciak-collage')).toHaveAttribute('data-scroll-linked', 'true');
  const screens = document.querySelectorAll('[data-ciak-state]');
  expect(screens).toHaveLength(5);
  for (const screen of screens) expect(screen).toHaveAttribute('data-depth');
});

it('chiude il montaggio con la CTA Ciak corretta', () => {
  render(<CiakPlatformDemo />);
  expect(screen.getByRole('link', { name: /masterclass/i }))
    .toHaveAttribute('href', 'https://www.ciak.io');
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm exec vitest run tests/platform.test.tsx`

Expected: FAIL because `ciak-collage` and `data-depth` are absent.

- [ ] **Step 3: Implement the collage transforms**

For each state derive an entry, focus and exit window. Apply `x`, `y`, `rotate`, `scale`, `opacity` and `zIndex` to the existing `motion.li`:

```tsx
<ol className="ciak-demo__collage" data-testid="ciak-collage"
  data-scroll-linked="true" aria-label="Cinque momenti del percorso su Ciak">
  {demoStates.map((state, index) => (
    <CiakScreen key={state.id} state={state} index={index}
      progress={progress} staticMode={staticMode} />
  ))}
</ol>
```

`CiakScreen` sets `data-ciak-state={state.id}`, `data-depth={index + 1}` and renders the unchanged `PlatformPanel`. Initial offsets alternate left/right and use rotations between `-12deg` and `10deg`; the focused state reaches scale `1`, rotation `0` and the highest `zIndex`.

- [ ] **Step 4: Add collage CSS and mobile fallback**

Replace `.ciak-demo__states` selectors with `.ciak-demo__collage`. Preserve the navy full-height stage, use `perspective: 1400px` and keep overflow visible inside the collage viewport. On mobile return the five panels to normal document flow and remove transforms.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm exec vitest run tests/platform.test.tsx`

Expected: all platform tests PASS.

- [ ] **Step 6: Commit**

```bash
git add evolution-pro-site/src/sections/CiakPlatformDemo.tsx evolution-pro-site/src/styles/globals.css evolution-pro-site/tests/platform.test.tsx
git commit -m "feat(site): add cinematic Ciak collage"
```

---

### Task 4: Browser verification of all three timelines

**Files:**
- Create: `evolution-pro-site/e2e/cinematic-scroll.spec.ts`

**Interfaces:**
- Consumes: `#strumenti`, `#testimonianze`, `#ciak`, their `data-progress` and rendered transforms.
- Produces: repeatable desktop forward/reverse and mobile fallback acceptance test.

- [ ] **Step 1: Write the failing Playwright test**

```ts
import { expect, test } from '@playwright/test';

test('le tre scene avanzano e tornano indietro con lo scroll', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');
  for (const selector of ['#strumenti', '#testimonianze', '#ciak']) {
    const section = page.locator(selector);
    await section.scrollIntoViewIfNeeded();
    const before = await section.evaluate(el => el.getBoundingClientRect().top);
    await page.mouse.wheel(0, 700);
    const forward = await section.evaluate(el => getComputedStyle(el).getPropertyValue('--scroll-progress'));
    await page.mouse.wheel(0, -500);
    const reverse = await section.evaluate(el => getComputedStyle(el).getPropertyValue('--scroll-progress'));
    expect(before).toBeDefined();
    expect(Number(forward)).toBeGreaterThan(Number(reverse));
  }
});

test('mobile mostra tutti i contenuti senza scene sticky', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/');
  await expect(page.locator('#strumenti')).toHaveClass(/--static/);
  await expect(page.locator('#ciak')).toHaveClass(/--static/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm exec playwright test e2e/cinematic-scroll.spec.ts --project=desktop-chromium --project=mobile-chromium`

Expected: FAIL because sections do not yet expose `--scroll-progress`.

- [ ] **Step 3: Expose progress for observability**

In each cinematic section, subscribe with `useMotionValueEvent(progress, 'change', value => ref.current?.style.setProperty('--scroll-progress', value.toFixed(3)))`. This custom property is diagnostic only and must not drive layout.

- [ ] **Step 4: Run complete verification**

Run:

```bash
pnpm test:run
pnpm build
pnpm exec playwright test e2e/cinematic-scroll.spec.ts --project=desktop-chromium --project=mobile-chromium
```

Expected: 32+ unit tests PASS, build succeeds, cinematic Playwright tests PASS, browser console contains no runtime errors.

- [ ] **Step 5: Commit**

```bash
git add evolution-pro-site/e2e/cinematic-scroll.spec.ts evolution-pro-site/src/sections/ToolsMarquee.tsx evolution-pro-site/src/sections/EnvelopeTestimonials.tsx evolution-pro-site/src/sections/CiakPlatformDemo.tsx
git commit -m "test(site): verify cinematic scroll timelines"
```

---

### Task 5: Final visual and regression gate

**Files:**
- Modify only files that fail the checks above.

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: local draft ready for Claudio's visual review, without public deployment.

- [ ] **Step 1: Inspect desktop at 1440×900**

Confirm tools form a readable fan, testimonial letter clears the envelope, and Ciak panels never obscure the heading or CTA.

- [ ] **Step 2: Inspect mobile at 390×844**

Confirm no horizontal overflow, no sticky scene, all tools and five Ciak states visible, video CTA reachable.

- [ ] **Step 3: Run regression suite**

Run: `pnpm test:run && pnpm build && pnpm e2e`

Expected: all tests PASS. Existing intentional project skips remain the only skipped tests.

- [ ] **Step 4: Check diff scope**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and no unrelated files staged.

- [ ] **Step 5: Commit final polish if needed**

```bash
git add evolution-pro-site/src evolution-pro-site/tests evolution-pro-site/e2e
git commit -m "fix(site): polish cinematic section motion"
```
