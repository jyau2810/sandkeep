import { test, expect } from '@playwright/test';

test('bottle glass remains stable after loading and a redraw', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  const bottle = page.locator('canvas.bottle-canvas');
  const initial = await bottle.screenshot();
  // Catch the former late-lighting change, including another requested render.
  await page.waitForTimeout(1500);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(async () => (await bottle.screenshot()).equals(initial)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'work/first-glass/stable-desktop.png' });
  await page.setViewportSize({ width: 590, height: 900 });
  await page.screenshot({ path: 'work/first-glass/stable-mobile.png' });
});
