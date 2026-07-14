import { expect, test } from '@playwright/test';

const sectionOrder = ['hero', 'collaborazioni', 'strumenti', 'direzione', 'problema', 'claudio', 'metodo-evo', 'sistema', 'ciak', 'testimonianze', 'faq', 'inizia'];

test('homepage completa, accessibile e senza errori runtime', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: /preferenze cookie/i })).toBeVisible();
  await page.getByRole('button', { name: /solo necessari/i }).click();
  await expect(page.locator('h1')).toContainText(/direzione/i);
  expect(await page.locator('#hero h1 > span').evaluateAll((spans) => spans.map((span) => {
    const range = document.createRange();
    range.selectNodeContents(span);
    return { text: span.textContent?.trim(), lines: range.getClientRects().length };
  }))).toEqual([
    { text: 'La tua', lines: 1 },
    { text: 'competenza', lines: 1 },
    { text: 'merita una', lines: 1 },
    { text: 'direzione', lines: 1 },
  ]);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('[data-testid="home-section"]')).toHaveCount(12);
  expect(await page.locator('main > section').evaluateAll((sections) => sections.map((section) => section.id))).toEqual(sectionOrder);
  await expect(page.locator('.vite-error-overlay, #webpack-dev-server-client-overlay')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('html').innerHTML()).not.toContain('app.evolution-pro.it');
  await expect(page.locator('#hero a.button--primary')).toHaveAttribute('href', 'https://www.ciak.io');

  for (const [label, id] of [['Metodo EVO', 'metodo-evo'], ['Piattaforma', 'ciak'], ['Testimonianze', 'testimonianze'], ['FAQ', 'faq']] as const) {
    const anchor = page.getByRole('link', { name: label, exact: true });
    await expect(anchor).toHaveAttribute('href', `#${id}`);
    await anchor.click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
  }

  const firstFaq = page.locator('#faq button').first();
  await firstFaq.focus();
  await page.keyboard.press('Enter');
  await expect(firstFaq).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`#${await firstFaq.getAttribute('aria-controls')}`)).toBeVisible();

  expect(consoleErrors).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toBeVisible();
  expect(consoleErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath(`homepage-${testInfo.project.name}.png`), fullPage: true });
});

test('videotestimonianze, banner cookie e collegamenti footer sono operativi', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: /preferenze cookie/i })).toBeVisible();
  await page.getByRole('button', { name: /solo necessari/i }).click();

  await page.getByRole('button', { name: /guarda la testimonianza di michele baggio/i }).click();
  const modal = page.getByRole('dialog', { name: 'Michele Baggio' });
  await expect(modal).toBeVisible();
  await expect(modal.locator('source')).toHaveAttribute('src', '/testimonials/michele-baggio.mp4');
  expect((await page.request.get('/testimonials/michele-baggio.mp4')).status()).toBe(200);
  await page.getByRole('button', { name: 'Chiudi video' }).click();

  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Informativa Privacy' })).toBeVisible();
  await page.getByRole('button', { name: 'Chiudi informative' }).click();
  await page.getByRole('link', { name: 'Cookie', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Cookie Policy' })).toBeVisible();
});

test('hero espone una sequenza autonoma senza scroll', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('desktop-'), 'La rotazione completa viene verificata sui browser desktop.');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const activeAgent = page.getByTestId('active-hero-agent');
  await expect(activeAgent).toHaveCount(1);
  const firstAgent = await activeAgent.getAttribute('data-agent');
  const scrollBefore = await page.evaluate(() => scrollY);
  await expect.poll(async () => activeAgent.getAttribute('data-agent'), { timeout: 6_000 }).not.toBe(firstAgent);
  await expect(activeAgent).toHaveCount(1);
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
});

test('hero mantiene quattro righe senza sovrapporsi alla grafica a 1920px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Il controllo geometrico viene eseguito una volta sul desktop principale.');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const geometry = await page.evaluate(() => {
    const ranges = Array.from(document.querySelectorAll('.hero-agents__copy h1 > span')).flatMap((span) => {
      const range = document.createRange();
      range.selectNodeContents(span);
      return Array.from(range.getClientRects());
    });
    const shape = document.querySelector('.hero-agents__shape')!.getBoundingClientRect();
    return { titleRight: Math.max(...ranges.map((rect) => rect.right)), shapeLeft: shape.left };
  });

  expect(geometry.titleRight).toBeLessThanOrEqual(geometry.shapeLeft);
});

test('contenuto principale resta disponibile con rete rallentata', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() === 'document') await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/direzione/i);
  await expect(page.locator('main')).toBeVisible();
});

test('reduced motion mantiene visibili i contenuti principali', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  for (const selector of ['#hero h1', '#hero .hero-agent', '#metodo-evo h2', '#ciak h2']) {
    await expect(page.locator(selector).first()).toBeVisible();
  }
});
