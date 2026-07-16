import { expect, test } from '@playwright/test';

test('Ciak cambia scena senza movimento della pagina', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const scrollBefore = await page.evaluate(() => scrollY);
  const firstCiak = page.locator('#ciak [data-active="true"]');
  await expect(firstCiak).toHaveCount(1);
  const ciakBefore = await firstCiak.getAttribute('data-ciak-state');
  await expect.poll(async () => page.locator('#ciak [data-active="true"]').getAttribute('data-ciak-state'), { timeout: 6_000 }).not.toBe(ciakBefore);
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
});

test('mobile mantiene le scene autonome senza sticky cinematografico', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#ciak')).toHaveAttribute('data-animation', 'autoplay');
  await expect(page.locator('[data-ciak-state]')).toHaveCount(5);
  await expect(page.locator('#ciak [data-active="true"]')).toHaveCount(1);
});

test('un pannello desktop affiancato a 731px mantiene le animazioni', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.setViewportSize({ width: 731, height: 642 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#ciak')).toHaveAttribute('data-animation', 'autoplay');
});
