import { expect, test, type Locator, type Page } from '@playwright/test';

async function openDemo(page: Page): Promise<void> {
  await page.goto('./');
  await expect(page.getByTestId('stage-state')).toHaveText('回忆已装瓶', { timeout: 15000 });
  await expect(page.getByRole('button', { name: '拆开再玩', exact: true })).toBeEnabled();
}

async function photoFile(page: Page): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    ['#ca322e', '#e9b52b', '#2a8459', '#286bbc'].forEach((color, index) => {
      context.fillStyle = color;
      context.fillRect(index * 128, 0, 128, 256);
    });
    context.fillStyle = '#ffffff';
    context.fillRect(24, 24, 32, 32);
    context.fillRect(448, 200, 40, 32);
    return canvas.toDataURL('image/png');
  });
  return { name: 'four-colour-memory.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') };
}

async function uploadPhoto(page: Page): Promise<void> {
  await page.locator('#photo-input').setInputFiles(await photoFile(page));
  await expect(page.getByTestId('stage-state')).toHaveText('先玩一会儿彩砂');
  await expect(page.getByRole('button', { name: '装进瓶子', exact: true })).toBeEnabled();
}

async function stablePicture(canvas: Locator): Promise<Buffer> {
  let previous = await canvas.screenshot();
  await expect.poll(async () => {
    const next = await canvas.screenshot();
    const settled = next.equals(previous);
    previous = next;
    return settled;
  }, { timeout: 5000, intervals: [100, 200, 300] }).toBe(true);
  return previous;
}

test('a personal photo becomes a named bottle and survives reopening', async ({ page }) => {
  await openDemo(page);
  await uploadPhoto(page);
  const thumbnail = page.getByAltText('当前照片预览');
  await expect(thumbnail).toHaveJSProperty('naturalWidth', 512);
  const selectedPhoto = await thumbnail.getAttribute('src');
  await page.getByLabel('给这瓶回忆起个名字').fill('十月的彩色回忆');
  await page.getByRole('button', { name: '暖调沙画', exact: true }).click();
  await expect(page.getByRole('button', { name: '暖调沙画', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(page.getByTestId('stage-state')).toHaveText('把这一刻，慢慢装好');
  await expect(page.getByTestId('stage-state')).toHaveText('回忆已装瓶', { timeout: 8000 });
  await expect(page.getByTestId('app-status')).toHaveText('已保存在这个浏览器，下次打开还能看见。');
  await page.reload();
  await expect(page.getByTestId('stage-state')).toHaveText('回忆已装瓶');
  await expect(page.getByLabel('给这瓶回忆起个名字')).toHaveValue('十月的彩色回忆');
  await expect(page.getByRole('button', { name: '暖调沙画', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(thumbnail).toHaveAttribute('src', selectedPhoto!);
  await expect(page.getByText('十月的彩色回忆', { exact: true })).toBeVisible();
});

test('horizontal drag and focused arrow keys change the visible bottle', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDemo(page);
  await uploadPhoto(page);
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(page.getByTestId('stage-state')).toHaveText('回忆已装瓶');
  const stage = page.getByTestId('bottle-scene');
  const canvas = stage.locator('canvas');
  const front = await stablePicture(canvas);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('The bottle canvas is not visible.');
  await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.67, box.y + box.height * 0.55, { steps: 8 });
  await page.mouse.up();
  const turned = await stablePicture(canvas);
  expect(turned.equals(front)).toBe(false);
  await stage.focus();
  await page.keyboard.press('ArrowRight');
  const keyboardTurned = await stablePicture(canvas);
  expect(keyboardTurned.equals(turned)).toBe(false);
  await expect(page.getByTestId('stage-state')).toHaveText('回忆已装瓶');
});

test('bad and oversized uploads explain the problem and preserve the previous bottle', async ({ page }) => {
  await openDemo(page);
  const thumbnail = page.getByAltText('当前照片预览');
  const originalPhoto = await thumbnail.getAttribute('src');
  await page.locator('#photo-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('a memory, not an image') });
  await expect(page.getByRole('alert')).toHaveText('请选择 JPG、PNG 或 WebP 格式的照片。');
  await expect(thumbnail).toHaveAttribute('src', originalPhoto!);
  await expect(page.getByRole('button', { name: '向右旋转瓶子' })).toBeEnabled();
  await page.locator('#photo-input').setInputFiles({ name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(15 * 1024 * 1024 + 1) });
  await expect(page.getByRole('alert')).toHaveText('这张照片超过 15 MB，请换一张小一点的。');
  await expect(thumbnail).toHaveAttribute('src', originalPhoto!);
  await expect(page.getByTestId('stage-state')).toHaveText('回忆已装瓶');
  await uploadPhoto(page);
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByLabel('给这瓶回忆起个名字')).toHaveValue('我的一瓶回忆');
});

test.describe('a narrow touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('fits the screen and allows touch rotation without trapping vertical scrolling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDemo(page);
    expect(await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth }))).toEqual({ width: 390, overflow: 0 });
    const canvas = page.getByTestId('bottle-scene').locator('canvas');
    await canvas.scrollIntoViewIfNeeded();
    const before = await stablePicture(canvas);
    let box = await canvas.boundingBox();
    if (!box) throw new Error('The mobile bottle canvas is not visible.');
    const session = await page.context().newCDPSession(page);
    const x = box.x + box.width * 0.4;
    const y = box.y + box.height * 0.5;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + step * 9, y }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const rotated = await stablePicture(canvas);
    expect(rotated.equals(before)).toBe(false);
    box = await canvas.boundingBox();
    if (!box) throw new Error('The mobile bottle canvas disappeared.');
    const scrollBefore = await page.evaluate(() => scrollY);
    const scrollX = box.x + box.width * 0.5;
    const scrollStartY = Math.min(740, box.y + box.height * 0.7);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: scrollX, y: scrollStartY }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: scrollX, y: scrollStartY - step * 14 }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.evaluate((start) => scrollY > start + 30, scrollBefore)).toBe(true);
    await page.getByRole('button', { name: '向右旋转瓶子' }).tap();
    await expect(page.getByTestId('stage-state')).toHaveText('回忆已装瓶');
    await session.detach();
  });
});

test('reduced motion still creates a bottle when browser storage is denied', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(IDBFactory.prototype, 'open', {
      value: () => { throw new DOMException('Storage blocked for this browser session', 'SecurityError'); },
    });
  });
  await openDemo(page);
  await expect(page.getByTestId('app-status')).toHaveText('浏览器暂时无法读取本地收藏，你仍然可以制作瓶子。');
  await page.getByRole('button', { name: '拆开再玩', exact: true }).click();
  await expect(page.getByTestId('stage-state')).toHaveText('先玩一会儿彩砂');
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(page.getByTestId('stage-state')).toHaveText('回忆已装瓶', { timeout: 1000 });
  await expect(page.getByTestId('app-status')).toHaveText('浏览器未能保存这只瓶子，你仍然可以继续玩。');
  await expect(page.getByRole('button', { name: '向右旋转瓶子' })).toBeEnabled();
});

test('an unavailable WebGL context shows a recoverable explanation', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
        if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') return null;
        return Reflect.apply(getContext, this, [contextId, ...args]);
      },
    });
  });
  await page.goto('./');
  await expect(page.getByText('这里需要浏览器支持 3D 画面。', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('这个浏览器暂时无法显示瓶子，请开启硬件加速，或换用新版浏览器。');
  await expect(page.getByRole('button', { name: '装进瓶子', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '重新尝试', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('这个浏览器暂时无法显示瓶子，请开启硬件加速，或换用新版浏览器。');
});
