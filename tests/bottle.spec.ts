import { expect, test, type Locator, type Page } from '@playwright/test';
import type { BottleDraft } from '../src/domain';

async function openDemo(page: Page): Promise<void> {
  await page.goto('./');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed', { timeout: 15000 });
  await expect(page.getByRole('button', { name: '倒出成画', exact: true })).toBeEnabled();
  await page.waitForLoadState('networkidle');
}

async function photoFile(page: Page, reversed = false): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const dataUrl = await page.evaluate((reverse) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    const colors = ['#ca322e', '#e9b52b', '#2a8459', '#286bbc'];
    if (reverse) colors.reverse();
    colors.forEach((color, index) => {
      context.fillStyle = color;
      context.fillRect(index * 128, 0, 128, 256);
    });
    context.fillStyle = '#ffffff';
    context.fillRect(24, 24, 32, 32);
    context.fillRect(448, 200, 40, 32);
    return canvas.toDataURL('image/png');
  }, reversed);
  return { name: reversed ? 'another-memory.png' : 'four-colour-memory.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') };
}

async function uploadPhoto(page: Page, reversed = false): Promise<void> {
  await page.locator('#photo-input').setInputFiles(await photoFile(page, reversed));
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
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

async function latestBottle(page: Page): Promise<BottleDraft> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sandkeep', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<BottleDraft>((resolve, reject) => {
        const request = database.transaction('bottles', 'readonly').objectStore('bottles').get('latest');
        request.onsuccess = () => resolve(request.result as BottleDraft);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
}

async function pauseReadyScene(page: Page): Promise<void> {
  await page.clock.install();
  await openDemo(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
}

async function flatPicture(page: Page): Promise<string> {
  return page.getByTestId('loose-sand').evaluate(node => (node as HTMLCanvasElement).toDataURL());
}

async function depositedPixels(page: Page, emptyPicture: string): Promise<number> {
  return page.getByTestId('loose-sand').evaluate(async (node, empty) => {
    const canvas = node as HTMLCanvasElement;
    const baseline = new Image();
    baseline.src = empty;
    await baseline.decode();
    const reference = document.createElement('canvas');
    reference.width = canvas.width;
    reference.height = canvas.height;
    const context = reference.getContext('2d')!;
    context.drawImage(baseline, 0, 0);
    const before = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const after = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let changed = 0;
    for (let i = 0; i < after.length; i += 4) {
      if (before[i] !== after[i] || before[i + 1] !== after[i + 1] || before[i + 2] !== after[i + 2]) changed++;
    }
    return changed;
  }, emptyPicture);
}

async function expectVisibleTransfer(page: Page): Promise<void> {
  const canvas = page.locator('canvas.sand-transfer-canvas');
  await expect(canvas).toBeVisible();
  if (await page.locator('#app').getAttribute('data-phase') === 'assembling') {
    await expectGravityPacking(page);
    return;
  }
  const visiblePixels = await canvas.evaluate(node => {
    const surface = node as HTMLCanvasElement;
    const pixels = surface.getContext('2d')!.getImageData(0, 0, surface.width, surface.height).data;
    let count = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 100) count++;
    return count;
  });
  expect(visiblePixels).toBeGreaterThan(120);
}

async function expectGravityPacking(page: Page): Promise<void> {
  const geometry = await page.evaluate(() => {
    const frame = document.querySelector('.loose-sand-frame') as HTMLElement;
    const painting = document.querySelector('.loose-sand-canvas') as HTMLCanvasElement;
    const stream = document.querySelector('.sand-transfer-canvas') as HTMLCanvasElement;
    const host = document.querySelector('.scene-host')!;
    const matrix = new DOMMatrix(getComputedStyle(frame).transform);
    const box = painting.getBoundingClientRect();
    const hostBox = host.getBoundingClientRect();
    const w = painting.clientWidth;
    const h = painting.clientHeight;
    const originX = box.left - Math.min(0, matrix.a * w, matrix.c * h, matrix.a * w + matrix.c * h);
    const originY = box.top - Math.min(0, matrix.b * w, matrix.d * h, matrix.b * w + matrix.d * h);
    const outlet = { x: originX + matrix.a * w + matrix.c * h - hostBox.left, y: originY + matrix.b * w + matrix.d * h - hostBox.top };
    const pixels = stream.getContext('2d')!.getImageData(0, 0, stream.width, stream.height).data;
    let minX = stream.width, maxX = 0, minY = stream.height, maxY = 0, count = 0;
    const occupiedRows = new Set<number>();
    for (let y = 0; y < stream.height; y++) for (let x = 0; x < stream.width; x++) {
      if (pixels[(y * stream.width + x) * 4 + 3] < 128) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y); count++;
      occupiedRows.add(y);
    }
    const scale = stream.getBoundingClientRect().width / stream.width;
    return { angle: Math.atan2(matrix.b, matrix.a), outlet, minY: minY * scale, maxY: maxY * scale, streamWidth: (maxX - minX) * scale, count, rowCoverage: occupiedRows.size / (maxY - minY + 1) };
  });
  expect(geometry.angle).toBeGreaterThan(Math.PI / 18);
  expect(geometry.angle).toBeLessThan(Math.PI / 3);
  expect(geometry.count).toBeGreaterThan(40);
  expect(geometry.rowCoverage).toBeGreaterThan(0.65);
  expect(geometry.minY).toBeGreaterThanOrEqual(geometry.outlet.y - 5);
  expect(geometry.maxY).toBeGreaterThan(geometry.outlet.y + 12);
  expect(geometry.streamWidth).toBeLessThan(35);
}

test('a personal photo becomes a warm bottle and survives reopening without a naming step', async ({ page }) => {
  await openDemo(page);
  await uploadPhoto(page);
  const thumbnail = page.getByAltText('当前照片预览');
  await expect(thumbnail).toHaveJSProperty('naturalWidth', 512);
  const selectedPhoto = await thumbnail.getAttribute('src');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.locator('.header-note, .intro-copy, .stage-topline, .action-hint')).toHaveCount(0);
  await expect(page.getByText('每一粒沙，都是照片里的一点颜色。', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '照片原色', exact: true })).toHaveCount(0);
  await expect(page.getByRole('group', { name: '平面沙画玩法' })).toBeVisible();
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'assembling');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed', { timeout: 8000 });
  await expect.poll(async () => (await latestBottle(page))?.colorMode).toBe('warm');
  await expect(page.getByTestId('app-status')).toBeHidden();
  await page.reload();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  expect(await latestBottle(page)).toMatchObject({ colorMode: 'warm', imageDataUrl: selectedPhoto });
  await expect(page.getByRole('group', { name: '平面沙画玩法' })).toBeHidden();
  await expect(thumbnail).toHaveAttribute('src', selectedPhoto!);
  await expect(page.getByRole('group', { name: '旋转瓶子' })).toBeVisible();
});

test('a saved original-colour bottle reopens as warm sand without losing its photo or settings', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDemo(page);
  await uploadPhoto(page);
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect.poll(async () => (await latestBottle(page))?.colorMode).toBe('warm');
  await expect(page.getByTestId('app-status')).toBeHidden();
  const canvas = page.getByTestId('bottle-scene').locator('canvas.bottle-canvas');
  const warmPicture = await stablePicture(canvas);
  const original = { ...await latestBottle(page), colorMode: 'original' as const, title: '旧照片的回忆', createdAt: 1024 };
  await page.evaluate(async (draft) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sandkeep', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('bottles', 'readwrite');
        transaction.objectStore('bottles').put(draft, 'latest');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  }, original);
  await openDemo(page);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByText('旧照片的回忆', { exact: true })).toHaveCount(0);
  await expect(page.getByAltText('当前照片预览')).toHaveAttribute('src', original.imageDataUrl);
  expect((await stablePicture(canvas)).equals(warmPicture)).toBe(true);
  await page.getByText('瓶身接缝', { exact: true }).click();
  await page.getByRole('slider').focus();
  await page.keyboard.press('End');
  await expect.poll(async () => (await latestBottle(page)).seamWidth).toBe(0.04);
  expect(await latestBottle(page)).toEqual({ ...original, colorMode: 'warm', seamWidth: 0.04 });
});

test('flat sand keeps brush marks through resizing and restores the exact photograph', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDemo(page);
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  const canvas = page.getByTestId('loose-sand');
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('button', { name: '拨沙', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const flat = await canvas.evaluate(node => ({
    width: (node as HTMLCanvasElement).width,
    height: (node as HTMLCanvasElement).height,
    transform: getComputedStyle(node).transform,
    perspective: getComputedStyle(node.parentElement!).perspective,
    hasFrame: parseFloat(getComputedStyle(node.parentElement!).borderTopWidth) > 0,
  }));
  expect(flat).toEqual({ width: 720, height: 432, transform: 'none', perspective: 'none', hasFrame: true });
  const initial = await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL());
  const box = await canvas.boundingBox();
  if (!box) throw new Error('The flat sand painting is not visible.');
  await page.mouse.move(box.x + box.width * 0.28, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.5, { steps: 16 });
  await page.mouse.up();
  await stablePicture(canvas);
  const brushed = await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL());
  expect(brushed).not.toBe(initial);
  await page.setViewportSize({ width: 590, height: 900 });
  await expect(page.getByTestId('bottle-scene')).toHaveCSS('height', '420px');
  await stablePicture(canvas);
  expect(await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())).toBe(brushed);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  const resizedBox = await canvas.boundingBox();
  if (!resizedBox) throw new Error('The flat sand painting disappeared after resizing.');
  expect(resizedBox.width / resizedBox.height).toBeCloseTo(5 / 3, 2);
  await page.getByRole('button', { name: '聚回照片', exact: true }).click();
  expect(await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())).toBe(initial);
  await page.getByRole('button', { name: '旋涡', exact: true }).click();
  await expect(page.getByRole('button', { name: '旋涡', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await stablePicture(canvas);
  expect(await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())).not.toBe(initial);
  await page.getByRole('button', { name: '聚回照片', exact: true }).click();
  expect(await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())).toBe(initial);
  await page.getByRole('button', { name: '旋涡', exact: true }).click();
  await stablePicture(canvas);
  expect(await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())).not.toBe(initial);
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  await expect(canvas).toBeHidden();
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await expect(page.getByRole('button', { name: '拨沙', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())).toBe(initial);
});

test('horizontal drag and focused arrow keys change the visible bottle', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDemo(page);
  await uploadPhoto(page);
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  const stage = page.getByTestId('bottle-scene');
  const canvas = stage.locator('canvas.bottle-canvas');
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
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
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
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'failure');
  await uploadPhoto(page);
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  const painting = page.getByTestId('loose-sand');
  const intact = await painting.evaluate(node => (node as HTMLCanvasElement).toDataURL());
  await page.locator('#photo-input').setInputFiles({ name: 'still-not-a-photo.txt', mimeType: 'text/plain', buffer: Buffer.from('keep the current painting') });
  await expect(page.getByRole('alert')).toHaveText('请选择 JPG、PNG 或 WebP 格式的照片。');
  await expect(page.getByRole('group', { name: '平面沙画玩法' })).toBeVisible();
  await page.getByRole('button', { name: '旋涡', exact: true }).click();
  await expect.poll(() => painting.evaluate(node => (node as HTMLCanvasElement).toDataURL())).not.toBe(intact);
  await page.getByRole('button', { name: '聚回照片', exact: true }).click();
  await expect.poll(() => painting.evaluate(node => (node as HTMLCanvasElement).toDataURL()), { timeout: 3000 }).toBe(intact);
});

test.describe('a narrow touch screen', () => {
  test.use({ viewport: { width: 390, height: 650 }, isMobile: true, hasTouch: true });

  test('fits the screen and allows touch rotation without trapping vertical scrolling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDemo(page);
    expect(await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth }))).toEqual({ width: 390, overflow: 0 });
    const canvas = page.getByTestId('bottle-scene').locator('canvas.bottle-canvas');
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
    const scrollStartY = Math.min(610, box.y + box.height * 0.7);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: scrollX, y: scrollStartY }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: scrollX, y: scrollStartY - step * 14 }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.evaluate((start) => scrollY > start + 30, scrollBefore)).toBe(true);
    await page.getByRole('button', { name: '向右旋转瓶子' }).tap();
    await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
    await session.detach();
  });

  test('touch can brush the flat sand and restore it with reduced motion enabled', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDemo(page);
    await page.getByRole('button', { name: '倒出成画', exact: true }).tap();
    const canvas = page.getByTestId('loose-sand');
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveCSS('touch-action', 'none');
    const initial = await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL());
    const box = await canvas.boundingBox();
    if (!box) throw new Error('The touch sand painting is not visible.');
    const session = await page.context().newCDPSession(page);
    const x = box.x + box.width * 0.3;
    const y = box.y + box.height * 0.5;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + step * box.width * 0.05, y }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await stablePicture(canvas);
    expect(await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())).not.toBe(initial);
    await page.getByRole('button', { name: '聚回照片', exact: true }).tap();
    expect(await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())).toBe(initial);
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
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed', { timeout: 1000 });
  await expect(page.getByTestId('app-status')).toHaveText('浏览器未能保存这只瓶子，你仍然可以继续玩。');
  await expect(page.getByRole('button', { name: '向右旋转瓶子' })).toBeEnabled();
});


test('sand pours into the frame and the tilted frame drains downward while repeated actions stay blocked', async ({ page }) => {
  test.setTimeout(60000);
  await pauseReadyScene(page);
  const stage = page.getByTestId('bottle-scene');
  const primary = page.locator('[data-action="bottle"]');
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await expect(primary).toHaveText('正在倒出…');
  await expect(primary).toBeDisabled();
  await expect(stage).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('group', { name: '旋转瓶子' })).toBeHidden();
  await expect(page.getByRole('group', { name: '平面沙画玩法' })).toBeHidden();
  await expect(page.locator('#seam-width')).toBeDisabled();
  const emptyFrame = await flatPicture(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.clock.runFor(1300);
  await expect(stage).toHaveAttribute('data-presentation', 'pouring');
  await expectVisibleTransfer(page);
  const halfPoured = await flatPicture(page);
  expect(halfPoured).not.toBe(emptyFrame);
  const firstDeposit = await depositedPixels(page, emptyFrame);
  await page.clock.runFor(550);
  expect(await depositedPixels(page, emptyFrame)).toBeGreaterThan(firstDeposit * 1.35);
  await page.clock.runFor(1150);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  await expect(stage).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('group', { name: '平面沙画玩法' })).toBeVisible();
  const fullPainting = await flatPicture(page);
  expect(fullPainting).not.toBe(halfPoured);
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(primary).toHaveText('正在装瓶…');
  await expect(primary).toBeDisabled();
  await expect(page.getByRole('group', { name: '平面沙画玩法' })).toBeHidden();
  await page.keyboard.press('Enter');
  await page.clock.runFor(1300);
  await expect(stage).toHaveAttribute('data-presentation', 'assembling');
  await expectVisibleTransfer(page);
  expect(await flatPicture(page)).not.toBe(fullPainting);
  await page.clock.runFor(1000);
  await expectVisibleTransfer(page);
  expect(await depositedPixels(page, emptyFrame)).toBeGreaterThan(10000);
  await page.clock.runFor(500);
  await expectVisibleTransfer(page);
  expect(await depositedPixels(page, emptyFrame)).toBeGreaterThan(1000);
  await page.clock.runFor(1500);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  await expect(page.getByRole('group', { name: '旋转瓶子' })).toBeVisible();
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await page.clock.runFor(3000);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  expect(await flatPicture(page)).toBe(fullPainting);
});

test('a new photo interrupts either direction without an old animation taking over later', async ({ page }) => {
  test.setTimeout(60000);
  await pauseReadyScene(page);
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await page.clock.runFor(1300);
  await expectVisibleTransfer(page);
  await uploadPhoto(page);
  const firstPhoto = await page.getByAltText('当前照片预览').getAttribute('src');
  await page.clock.runFor(4000);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  await expect(page.getByRole('group', { name: '平面沙画玩法' })).toBeVisible();
  await expect(page.getByAltText('当前照片预览')).toHaveAttribute('src', firstPhoto!);
  await expect(page.locator('canvas.sand-transfer-canvas')).toBeHidden();
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await page.clock.runFor(1300);
  await expectVisibleTransfer(page);
  await uploadPhoto(page, true);
  const replacementPhoto = await page.getByAltText('当前照片预览').getAttribute('src');
  expect(replacementPhoto).not.toBe(firstPhoto);
  await page.clock.runFor(4000);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  await expect(page.getByRole('button', { name: '装进瓶子', exact: true })).toBeEnabled();
  await expect(page.getByAltText('当前照片预览')).toHaveAttribute('src', replacementPhoto!);
  await expect(page.locator('canvas.sand-transfer-canvas')).toBeHidden();
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await page.clock.runFor(4300);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  await expect.poll(async () => (await latestBottle(page)).imageDataUrl).toBe(replacementPhoto);
});

test('resizing during each transfer still returns a complete rectangular painting', async ({ page }) => {
  test.setTimeout(60000);
  await pauseReadyScene(page);
  const stage = page.getByTestId('bottle-scene');
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await page.clock.runFor(600);
  await page.setViewportSize({ width: 590, height: 900 });
  await page.clock.runFor(700);
  await expectVisibleTransfer(page);
  await page.clock.runFor(1700);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  await expect(stage).toHaveCSS('height', '420px');
  const complete = await flatPicture(page);
  const flat = await page.getByTestId('loose-sand').boundingBox();
  if (!flat) throw new Error('The frame is missing after pouring.');
  expect(flat.width / flat.height).toBeCloseTo(5 / 3, 2);
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await page.clock.runFor(700);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.runFor(600);
  await expectVisibleTransfer(page);
  await page.clock.runFor(3000);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await page.clock.runFor(3000);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  expect(await flatPicture(page)).toBe(complete);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
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
