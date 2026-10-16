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
  await expect(page.getByText('轻轻拨动，玩一会儿沙', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'assembling');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed', { timeout: 8000 });
  await expect.poll(async () => (await latestBottle(page))?.colorMode).toBe('warm');
  await expect(page.getByTestId('app-status')).toBeHidden();
  await page.reload();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  expect(await latestBottle(page)).toMatchObject({ colorMode: 'warm', imageDataUrl: selectedPhoto });
  await expect(page.getByText('轻轻拨动，玩一会儿沙', { exact: true })).toBeHidden();
  await expect(thumbnail).toHaveAttribute('src', selectedPhoto!);
  await expect(page.getByText('拖动旋转 · 双击回正', { exact: true })).toBeVisible();
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
  await expect(page.getByRole('slider')).toHaveCount(0);
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect.poll(async () => (await latestBottle(page)).colorMode).toBe('warm');
  expect(await latestBottle(page)).toEqual({ ...original, colorMode: 'warm' });
});

test('flat sand keeps brush marks through resizing and restores the exact photograph', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDemo(page);
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  const canvas = page.getByTestId('loose-sand');
  await expect(canvas).toBeVisible();
  await expect(page.getByText('轻轻拨动，玩一会儿沙', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '拨沙', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /旋涡|漩涡/ })).toHaveCount(0);
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
  await page.getByRole('button', { name: '复原', exact: true }).click();
  expect(await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())).toBe(initial);
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  await expect(canvas).toBeHidden();
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await expect(page.getByText('轻轻拨动，玩一会儿沙', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '拨沙', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /旋涡|漩涡/ })).toHaveCount(0);
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

test('backlit sand clears to light and accumulated grains darken before exact restoration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDemo(page);
  const fixture = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 720; canvas.height = 432;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#888888'; ctx.fillRect(0, 0, 720, 432);
    ctx.fillStyle = '#111111'; ctx.fillRect(60, 40, 100, 100);
    ctx.fillStyle = '#eeeeee'; ctx.fillRect(560, 40, 100, 100);
    return canvas.toDataURL('image/png');
  });
  await page.locator('#photo-input').setInputFiles({ name: 'sand-light.png', mimeType: 'image/png', buffer: Buffer.from(fixture.split(',')[1], 'base64') });
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  const painting = page.getByTestId('loose-sand');
  const original = await flatPicture(page);
  const contrast = await painting.evaluate(node => {
    const ctx = (node as HTMLCanvasElement).getContext('2d')!;
    const mean = (x: number) => {
      const values = ctx.getImageData(x, 60, 60, 60).data;
      let total = 0;
      for (let i = 0; i < values.length; i += 4) total += values[i] * .2126 + values[i + 1] * .7152 + values[i + 2] * .0722;
      return total / (values.length / 4);
    };
    return { dark: mean(80), light: mean(580) };
  });
  expect(contrast.light - contrast.dark).toBeGreaterThan(80);
  const box = await painting.boundingBox();
  if (!box) throw new Error('Backlit frame is missing.');
  await page.mouse.move(box.x + box.width * .25, box.y + box.height * .55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .75, box.y + box.height * .55, { steps: 18 });
  await page.mouse.up();
  await stablePicture(painting);
  const changes = await painting.evaluate(async (node, original) => {
    const current = node as HTMLCanvasElement;
    const image = new Image(); image.src = original; await image.decode();
    const reference = document.createElement('canvas'); reference.width = current.width; reference.height = current.height;
    const ctx = reference.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const before = ctx.getImageData(0, 0, current.width, current.height).data;
    const after = current.getContext('2d')!.getImageData(0, 0, current.width, current.height).data;
    let cleared = 0, piled = 0;
    for (let y = 180; y < 300; y++) for (let x = 170; x < 560; x++) {
      const i = (y * current.width + x) * 4;
      const change = (after[i] - before[i]) * .2126 + (after[i + 1] - before[i + 1]) * .7152 + (after[i + 2] - before[i + 2]) * .0722;
      if (change > 35) cleared++;
      if (change < -20) piled++;
    }
    return { cleared, piled };
  }, original);
  expect(changes.cleared).toBeGreaterThan(2000);
  expect(changes.piled).toBeGreaterThan(500);
  await page.getByRole('button', { name: '复原', exact: true }).click();
  expect(await flatPicture(page)).toBe(original);
});

test('vertical and diagonal bottle drags rotate the object and Home restores its exact view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDemo(page);
  const stage = page.getByTestId('bottle-scene');
  const canvas = stage.locator('canvas.bottle-canvas');
  const picture = async () => {
    await page.getByRole('heading', { name: '把回忆装进沙子里' }).click();
    return stablePicture(canvas);
  };
  const original = await picture();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Bottle is missing.');
  for (const [dx, dy] of [[0, 70], [90, -60]]) {
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .5 + dx, box.y + box.height * .5 + dy, { steps: 10 });
    await page.mouse.up();
    await stablePicture(canvas);
    expect((await picture()).equals(original)).toBe(false);
    await stage.focus();
    await page.keyboard.press('Home');
    await stablePicture(canvas);
    expect((await picture()).equals(original)).toBe(true);
  }
  await stage.focus();
  await page.keyboard.press('ArrowDown');
  await stablePicture(canvas);
  expect((await picture()).equals(original)).toBe(false);
  await canvas.dblclick();
  await stablePicture(canvas);
  expect((await picture()).equals(original)).toBe(true);
  await stage.focus();
  for (let turn = 0; turn < 4; turn++) await page.keyboard.press('ArrowDown');
  const tilted = await picture();
  await page.getByRole('button', { name: '换回示例', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  expect((await picture()).equals(tilted)).toBe(true);
});

test('small vertical drift preserves horizontal rotation and reset animates through intermediate poses', async ({ page }) => {
  await page.clock.install();
  await openDemo(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const canvas = page.locator('canvas.bottle-canvas');
  const stage = page.getByTestId('bottle-scene');
  const picture = async () => {
    await page.getByRole('heading', { name: '把回忆装进沙子里' }).click();
    return canvas.screenshot();
  };
  const original = await picture();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Bottle is missing.');
  const drag = async (dx: number, dy: number) => {
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .5 + dx, box.y + box.height * .5 + dy, { steps: 8 });
    await page.clock.runFor(16);
    await page.mouse.up();
  };
  await drag(0, 24);
  expect((await picture()).equals(original)).toBe(true);
  await drag(90, 0);
  await stage.press('ArrowRight'); // Stop inertia with the same deterministic step in both samples.
  await page.clock.runFor(16);
  const horizontal = await picture();
  await stage.press('Home'); await page.clock.runFor(600);
  await drag(90, 24);
  await stage.press('ArrowRight'); await page.clock.runFor(16);
  expect((await picture()).equals(horizontal)).toBe(true);
  await stage.press('ArrowDown'); await page.clock.runFor(16);
  const tilted = await picture();
  await canvas.dblclick();
  expect((await picture()).equals(tilted)).toBe(true);
  await page.clock.runFor(260);
  const midway = await picture();
  expect(midway.equals(tilted)).toBe(false);
  expect(midway.equals(original)).toBe(false);
  await page.clock.runFor(320);
  expect((await picture()).equals(original)).toBe(true);
});

test('continuous sand range changes stroke width without resetting the painting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await openDemo(page);
  const range = page.getByRole('slider', { name: '作用范围' });
  await expect(range).toBeHidden();
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await expect(range).toHaveValue('28');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  const canvas = page.getByTestId('loose-sand');
  const original = await flatPicture(page);
  const pixels = () => canvas.evaluate(c => Array.from((c as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 720, 432).data));
  const before = await pixels();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Sand is missing.');
  const counts: number[] = [];
  for (const key of ['Home', 'End']) {
    await range.press(key);
    expect(await flatPicture(page)).toBe(original);
    await page.mouse.move(box.x + box.width * .3, box.y + box.height * .5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .7, box.y + box.height * .5, { steps: 14 });
    await page.mouse.up(); await page.clock.runFor(1400);
    const after = await pixels();
    let changed = 0;
    for (let i = 0; i < after.length; i += 4) if (Math.abs(after[i + 1] - before[i + 1]) > 30) changed++;
    counts.push(changed);
    const marked = await flatPicture(page);
    await range.press('ArrowLeft');
    expect(await flatPicture(page)).toBe(marked);
    await page.getByRole('button', { name: '复原', exact: true }).click();
    expect(await flatPicture(page)).toBe(original);
  }
  expect(counts[0]).toBeGreaterThan(500);
  expect(counts[1]).toBeGreaterThan(counts[0] * 2);
  await range.press('Home'); await range.press('ArrowRight');
  await expect(range).toHaveValue('9');
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(range).toBeHidden();
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await expect(range).toHaveValue('9');
});

test('sprinkled and pushed sand survives bottling, pouring and reload while restore recovers the original', async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install(); await openDemo(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  const bottlePicture = async () => {
    await page.getByRole('heading', { name: '把回忆装进沙子里' }).click();
    await page.clock.runFor(32);
    return page.locator('canvas.bottle-canvas').screenshot();
  };
  const bottleBefore = await bottlePicture();
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  const original = await flatPicture(page);
  const canvas = page.getByTestId('loose-sand');
  const box = await canvas.boundingBox(); if (!box) throw new Error('Missing painting');
  const intensity = () => canvas.evaluate(c => {
    const pixels = (c as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 720, 432).data;
    let sum = 0; for (let i = 1; i < pixels.length; i += 4) sum += pixels[i]; return sum;
  });
  const before = await intensity();
  await page.getByRole('button', { name: '撒沙', exact: true }).click();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  await page.mouse.down(); await page.clock.runFor(400); await page.mouse.up(); await page.clock.runFor(32);
  expect(await intensity()).toBeLessThan(before - 10000);
  await page.getByRole('button', { name: '拨沙', exact: true }).click();
  await page.mouse.move(box.x + box.width * .3, box.y + box.height * .6);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * .7, box.y + box.height * .6, { steps: 14 });
  await page.mouse.up(); await page.clock.runFor(1600);
  const edited = await flatPicture(page); expect(edited).not.toBe(original);
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  await expect.poll(async () => (await latestBottle(page))?.sandState !== undefined).toBe(true);
  expect((await bottlePicture()).equals(bottleBefore)).toBe(false);
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  expect(await flatPicture(page)).toBe(edited);
  await page.reload(); await expect(page.locator('#app')).toHaveAttribute('data-phase', 'sealed');
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  expect(await flatPicture(page)).toBe(edited);
  await page.getByRole('button', { name: '复原', exact: true }).click();
  expect(await flatPicture(page)).toBe(original);
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  expect((await bottlePicture()).equals(bottleBefore)).toBe(true);
  await expect.poll(async () => (await latestBottle(page))?.sandState).toBeUndefined();
});

test('bad and oversized uploads explain the problem and preserve the previous bottle', async ({ page }) => {
  await openDemo(page);
  const thumbnail = page.getByAltText('当前照片预览');
  const originalPhoto = await thumbnail.getAttribute('src');
  await page.locator('#photo-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('a memory, not an image') });
  await expect(page.getByRole('alert')).toHaveText('请选择 JPG、PNG 或 WebP 格式的照片。');
  await expect(thumbnail).toHaveAttribute('src', originalPhoto!);
  await expect(page.getByText('拖动旋转 · 双击回正', { exact: true })).toBeVisible();
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
  await expect(page.getByText('轻轻拨动，玩一会儿沙', { exact: true })).toBeVisible();
  const brushBox = await painting.boundingBox();
  if (!brushBox) throw new Error('The painting must remain available after an invalid upload.');
  await page.mouse.move(brushBox.x + brushBox.width * 0.3, brushBox.y + brushBox.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(brushBox.x + brushBox.width * 0.7, brushBox.y + brushBox.height * 0.5, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => painting.evaluate(node => (node as HTMLCanvasElement).toDataURL())).not.toBe(intact);
  await page.getByRole('button', { name: '复原', exact: true }).click();
  await expect.poll(() => painting.evaluate(node => (node as HTMLCanvasElement).toDataURL()), { timeout: 3000 }).toBe(intact);
});

test.describe('a narrow touch screen', () => {
  test.use({ viewport: { width: 390, height: 650 }, isMobile: true, hasTouch: true });

  test('fits the screen and allows vertical touch rotation with scrolling outside the scene', async ({ page }) => {
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
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 9 }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect((await stablePicture(canvas)).equals(rotated)).toBe(false);
    box = await canvas.boundingBox();
    if (!box) throw new Error('The mobile bottle canvas disappeared.');
    const scrollBefore = await page.evaluate(() => scrollY);
    const scrollX = 10;
    const scrollStartY = Math.min(610, box.y + box.height * 0.7);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: scrollX, y: scrollStartY }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: scrollX, y: scrollStartY - step * 14 }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.evaluate((start) => scrollY > start + 30, scrollBefore)).toBe(true);
    await expect(page.getByRole('button', { name: /向[左右]旋转瓶子/ })).toHaveCount(0);
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
    await page.getByRole('button', { name: '复原', exact: true }).tap();
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
  await expect(page.getByText('拖动旋转 · 双击回正', { exact: true })).toBeVisible();
});


test('sand pours into the frame and the tilted frame drains downward while repeated actions stay blocked', async ({ page }) => {
  test.setTimeout(90000);
  await pauseReadyScene(page);
  const stage = page.getByTestId('bottle-scene');
  const primary = page.locator('[data-action="bottle"]');
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await expect(primary).toHaveText('正在倒出…');
  await expect(primary).toBeDisabled();
  await expect(stage).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('拖动旋转 · 双击回正', { exact: true })).toBeHidden();
  await expect(page.getByText('轻轻拨动，玩一会儿沙', { exact: true })).toBeHidden();
  await expect(page.locator('#seam-width')).toHaveCount(0);
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
  await expect(page.getByText('轻轻拨动，玩一会儿沙', { exact: true })).toBeVisible();
  const fullPainting = await flatPicture(page);
  expect(fullPainting).not.toBe(halfPoured);
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await expect(primary).toHaveText('正在装瓶…');
  await expect(primary).toBeDisabled();
  await expect(page.getByText('轻轻拨动，玩一会儿沙', { exact: true })).toBeHidden();
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
  await expect(page.getByText('拖动旋转 · 双击回正', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await page.clock.runFor(3000);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  expect(await flatPicture(page)).toBe(fullPainting);
});

test('a new photo interrupts either direction without an old animation taking over later', async ({ page }) => {
  test.setTimeout(90000);
  await pauseReadyScene(page);
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await page.clock.runFor(1300);
  await expectVisibleTransfer(page);
  await uploadPhoto(page);
  const firstPhoto = await page.getByAltText('当前照片预览').getAttribute('src');
  await page.clock.runFor(4000);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  await expect(page.getByText('轻轻拨动，玩一会儿沙', { exact: true })).toBeVisible();
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
  test.setTimeout(90000);
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

test('pouring falls below the mouth into the frame after any bottle rotation', async ({ page }) => {
  test.setTimeout(90000);
  let reference: { x: number; top: number; receivingBottom: number } | null = null;
  await page.clock.install();
  for (const [turns, tilts] of [[0, 0], [2, 0], [5, 0], [2, 2], [1, 5]]) {
    await openDemo(page);
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
    const stage = page.getByTestId('bottle-scene');
    await stage.focus();
    for (let turn = 0; turn < turns; turn++) await page.keyboard.press('ArrowRight');
    for (let tilt = 0; tilt < tilts; tilt++) await page.keyboard.press('ArrowDown');
    await page.clock.runFor(100);
    await page.getByRole('button', { name: '倒出成画', exact: true }).click();
    await page.clock.runFor(1400);
    const stream = await page.evaluate(() => {
      const canvas = document.querySelector('.sand-transfer-canvas') as HTMLCanvasElement;
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, right = 0, top = canvas.height, bottom = 0, count = 0;
      const rows = new Set<number>();
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] < 100) continue;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); count++; rows.add(y);
      }
      const host = document.querySelector('.scene-host')!.getBoundingClientRect();
      const frame = document.querySelector('.loose-sand-canvas')!.getBoundingClientRect();
      const scale = canvas.getBoundingClientRect().width / canvas.width;
      return { x: (left + right) * scale / 2, width: (right - left) * scale, top: top * scale, bottom: bottom * scale, count,
        density: count / ((right - left + 1) * (bottom - top + 1)), rowCoverage: rows.size / (bottom - top + 1),
        receivingX: frame.left + frame.width / 2 - host.left, receivingLeft: frame.left - host.left, receivingWidth: frame.width, receivingTop: frame.top - host.top, receivingBottom: frame.bottom - host.top };
    });
    expect(stream.count).toBeGreaterThan(40);
    expect(stream.width).toBeGreaterThan(8);
    expect(stream.width).toBeLessThan(85);
    expect(stream.density).toBeLessThan(0.42);
    expect(stream.rowCoverage).toBeLessThan(0.92);
    expect(stream.bottom - stream.top).toBeGreaterThan(30);
    expect(stream.top).toBeLessThan(stream.receivingTop);
    expect(stream.bottom).toBeLessThanOrEqual(stream.receivingBottom + 3);
    expect(stream.x).toBeGreaterThan(stream.receivingLeft + stream.receivingWidth * 0.14);
    expect(stream.x).toBeLessThan(stream.receivingX);
    if (reference) {
      // One RAF of the horizontal sweep plus a sparse edge grain can shift this
      // pixel bounding box by several pixels; receiver geometry stays exact below.
      expect(Math.abs(stream.x - reference.x)).toBeLessThan(8);
      expect(Math.abs(stream.top - reference.top)).toBeLessThan(8);
      // Sparse falling grains can differ by one RAF across navigations; the receiver
      // and mouth must remain aligned regardless of the original bottle orientation.
      expect(Math.abs(stream.receivingBottom - reference.receivingBottom)).toBeLessThan(1);
    } else reference = stream;
    await page.clock.runFor(1800);
    await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  }
});


test('the quiet interface uses one shared gesture hint and only the requested controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDemo(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('把回忆装进沙子里');
  await expect(page.locator('.seam-details, #seam-width, .site-footer, .rotation-button, [data-tool]')).toHaveCount(0);
  const hint = page.locator('#gesture-hint');
  await expect(hint).toHaveText('拖动旋转 · 双击回正');
  const bottleHintStyle = await hint.evaluate(node => ({ font: getComputedStyle(node).font, color: getComputedStyle(node).color, bottom: getComputedStyle(node).bottom }));
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await expect(hint).toHaveText('轻轻拨动，玩一会儿沙');
  expect(await hint.evaluate(node => ({ font: getComputedStyle(node).font, color: getComputedStyle(node).color, bottom: getComputedStyle(node).bottom }))).toEqual(bottleHintStyle);
  const restore = page.getByRole('button', { name: '复原', exact: true });
  await expect(restore).toBeVisible();
  for (const width of [1440, 900, 718, 590, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => {
      const frame = document.querySelector('.loose-sand-frame')!.getBoundingClientRect();
      const hint = document.querySelector('#gesture-hint')!.getBoundingClientRect();
      const restore = document.querySelector('[data-action="restore"]')!.getBoundingClientRect();
      const bottle = document.querySelector('[data-action="bottle"]')!.getBoundingClientRect();
      return { gap: hint.top - frame.bottom, actionsGap: bottle.left - restore.right, topDifference: Math.abs(bottle.top - restore.top), overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(geometry.gap).toBeGreaterThanOrEqual(20);
    expect(geometry.actionsGap).toBeGreaterThanOrEqual(9);
    expect(geometry.actionsGap).toBeLessThanOrEqual(13);
    expect(geometry.topDifference).toBeLessThan(1);
    expect(geometry.overflow).toBe(0);
  }
});

test('restore sweeps sprinkled sand sideways before recovering the original canvas', async ({ page }) => {
  test.setTimeout(60000);
  await page.clock.install(); await openDemo(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await page.clock.runFor(3100);
  const canvas = page.getByTestId('loose-sand');
  const original = await flatPicture(page);
  const beforePixels = await canvas.evaluate(c => Array.from((c as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,720,432).data));
  await page.getByRole('button', { name: '撒沙', exact: true }).click();
  const box = await canvas.boundingBox(); if (!box) throw Error('No canvas');
  await page.mouse.click(box.x + box.width * .25, box.y + box.height * .5);
  await page.clock.runFor(32);
  await page.getByRole('button', { name: '复原', exact: true }).click();
  await page.clock.runFor(80);
  expect(await flatPicture(page)).not.toBe(original);
  const center = () => canvas.evaluate((c, before) => {
    const data = (c as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,720,432).data;
    let sum=0, mass=0;for(let i=0;i<data.length;i+=4){const d=Math.max(0,before[i+1]-data[i+1]);sum+=((i/4)%720)*d;mass+=d;}return sum/mass;
  }, beforePixels);
  const early = await center(); await page.clock.runFor(300);
  expect(await center()).toBeGreaterThan(early + 30);
  await page.clock.runFor(2800); expect(await flatPicture(page)).toBe(original);
});
