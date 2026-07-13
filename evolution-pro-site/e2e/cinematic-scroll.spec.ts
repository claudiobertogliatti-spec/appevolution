import { expect, test } from '@playwright/test';

test('strumenti e Ciak rispondono allo scroll in entrambe le direzioni', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  for (const selector of ['#strumenti', '#ciak']) {
    const section = page.locator(selector);
    const top = await section.evaluate(el => el.getBoundingClientRect().top + scrollY);
    const height = await section.evaluate(el => el.scrollHeight);
    await page.evaluate(y => scrollTo(0, y), top + height * .68);
    await expect.poll(async () => Number(await section.evaluate(el => getComputedStyle(el).getPropertyValue('--scroll-progress')))).toBeGreaterThan(.45);
    await page.evaluate(y => scrollTo(0, y), top + height * .25);
    await expect.poll(async () => Number(await section.evaluate(el => getComputedStyle(el).getPropertyValue('--scroll-progress')))).toBeLessThan(.45);
  }
});

test('mobile mostra le scene complete senza sticky cinematografico', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#strumenti')).toHaveClass(/tools-cinematic--static/);
  await expect(page.locator('#ciak')).toHaveClass(/ciak-demo--static/);
  await expect(page.locator('[data-testid="tool-card"]')).toHaveCount(12);
  await expect(page.locator('[data-ciak-state]')).toHaveCount(5);
});

test('un pannello desktop affiancato a 731px mantiene le animazioni', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.setViewportSize({ width: 731, height: 642 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#strumenti')).not.toHaveClass(/--static/);
  await expect(page.locator('#ciak')).not.toHaveClass(/--static/);
});
