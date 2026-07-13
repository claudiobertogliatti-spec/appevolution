import { expect, test } from '@playwright/test';

test('testimonial segue start, metà, fine e reverse della timeline', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'La timeline geometrica è verificata una volta su Chromium desktop.');
  await page.goto('/e2e/fixtures/testimonial.html', { waitUntil: 'domcontentloaded' });

  const timeline = page.getByTestId('testimonial-timeline');
  const photo = page.getByTestId('testimonial-photo');
  const message = page.getByTestId('testimonial-message');
  const actions = page.getByTestId('testimonial-actions');
  const geometry = await timeline.evaluate((element) => ({
    start: element.getBoundingClientRect().top + window.scrollY,
    distance: element.scrollHeight - window.innerHeight,
    viewport: window.innerHeight,
  }));

  expect(geometry.distance).toBeGreaterThan(geometry.viewport);
  const opacity = async (locator: typeof actions) => Number(await locator.evaluate((element) => getComputedStyle(element).opacity));
  const moveTo = async (progress: number) => {
    const targetY = geometry.start + geometry.distance * progress;
    await page.evaluate(({ y }) => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, y);
    }, { y: targetY });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(targetY, 0);
    await page.waitForTimeout(500);
  };

  await moveTo(0);
  expect(await opacity(photo)).toBeLessThan(.15);
  expect(await opacity(actions)).toBeLessThan(.15);

  await moveTo(.55);
  expect(Number(await timeline.getAttribute('data-progress'))).toBeCloseTo(.55, 1);
  expect(await opacity(photo)).toBeGreaterThan(.7);
  expect(await opacity(message)).toBeGreaterThan(.4);

  await moveTo(1);
  expect(Number(await timeline.getAttribute('data-progress'))).toBeGreaterThan(.9);
  expect(await opacity(actions)).toBeGreaterThan(.9);

  await moveTo(.55);
  expect(await opacity(actions)).toBeLessThan(.3);
  expect(await opacity(message)).toBeGreaterThan(.4);

  await moveTo(0);
  expect(await opacity(photo)).toBeLessThan(.15);
});
