import { expect, test } from '@playwright/test';

test('testimonial esce dalla busta senza dipendere dallo scroll', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'L’autoplay viene verificato una volta su Chromium desktop.');
  await page.goto('/e2e/fixtures/testimonial.html', { waitUntil: 'domcontentloaded' });

  const timeline = page.getByTestId('testimonial-timeline').first();
  const photo = page.getByTestId('testimonial-photo').first();
  const message = page.getByTestId('testimonial-message').first();
  const actions = page.getByTestId('testimonial-actions').first();
  const opacity = async (locator: typeof actions) => Number(await locator.evaluate((element) => getComputedStyle(element).opacity));
  await expect(timeline).not.toHaveAttribute('data-scroll-linked');
  expect(await opacity(photo)).toBeLessThan(.15);
  expect(await opacity(actions)).toBeLessThan(.15);
  await expect.poll(() => opacity(photo), { timeout: 8_000 }).toBeGreaterThan(.7);
  await expect.poll(() => opacity(message), { timeout: 8_000 }).toBeGreaterThan(.5);
  await expect.poll(() => opacity(actions), { timeout: 9_000 }).toBeGreaterThan(.7);

  const actionsBox = await actions.boundingBox();
  const envelopeFrontBox = await page.locator('.envelope__front').first().boundingBox();
  expect(actionsBox).not.toBeNull();
  expect(envelopeFrontBox).not.toBeNull();
  expect(actionsBox!.y + actionsBox!.height).toBeLessThan(envelopeFrontBox!.y + 12);
});
