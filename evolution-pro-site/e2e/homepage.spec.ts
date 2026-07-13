import { expect, test } from '@playwright/test';

const sectionOrder = ['hero', 'collaborazioni', 'strumenti', 'direzione', 'problema', 'claudio', 'metodo-evo', 'sistema', 'ciak', 'testimonianze', 'faq', 'inizia'];

test('homepage completa, accessibile e senza errori runtime', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toContainText(/direzione/i);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('[data-testid="home-section"]')).toHaveCount(12);
  expect(await page.locator('main > section').evaluateAll((sections) => sections.map((section) => section.id))).toEqual(sectionOrder);
  await expect(page.locator('.vite-error-overlay, #webpack-dev-server-client-overlay')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('a[href*="app.evolution-pro.it"]')).toHaveCount(0);
  await expect(page.locator('#hero a.button--primary')).toHaveAttribute('href', 'https://www.ciak.io');

  const firstFaq = page.locator('#faq button').first();
  await firstFaq.focus();
  await page.keyboard.press('Enter');
  await expect(firstFaq).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`#${await firstFaq.getAttribute('aria-controls')}`)).toBeVisible();

  expect(consoleErrors).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`homepage-${testInfo.project.name}.png`), fullPage: true });
});

test('reduced motion mantiene visibili i contenuti principali', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  for (const selector of ['#hero h1', '#hero .hero-agent', '#metodo-evo h2', '#ciak h2']) {
    await expect(page.locator(selector).first()).toBeVisible();
  }
});
