import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = fileURLToPath(new URL('..', import.meta.url));
const destination = path.join(project, 'test-results/wrap');
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:4173/sandkeep/');
  await page.locator('#app[data-phase="sealed"]').waitFor();
  const fixture = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 600;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Fixture canvas unavailable.');
    ['#c52b35', '#e6b22f', '#278757', '#2468bf'].forEach((color, index) => {
      context.fillStyle = color;
      context.fillRect(index * 300, 0, 300, 600);
      context.fillStyle = '#fff5db';
      context.font = 'bold 130px sans-serif';
      context.textAlign = 'center';
      context.fillText(String(index + 1), index * 300 + 150, 350);
    });
    context.strokeStyle = '#fff5db'; context.lineWidth = 15;
    context.strokeRect(15, 15, 1170, 570);
    return canvas.toDataURL('image/png');
  });
  await page.locator('#photo-input').setInputFiles({ name: 'wrap-diagnostic.png', mimeType: 'image/png', buffer: Buffer.from(fixture.split(',')[1], 'base64') });
  await page.locator('#app[data-phase="loose"]').waitFor();
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await page.locator('#app[data-phase="sealed"]').waitFor();
  const canvas = page.getByTestId('bottle-scene').locator('canvas');
  const box = await canvas.boundingBox();
  assert(box, 'The diagnostic bottle must be visible.');
  const signatures = [];
  for (let quarter = 0; quarter <= 4; quarter++) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const capture = await canvas.screenshot({ path: path.join(destination, `${quarter * 90}-degrees.png`) });
    signatures.push(await page.evaluate(async data => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const sample = document.createElement('canvas'); sample.width = 32; sample.height = 24;
      const context = sample.getContext('2d');
      if (!context) throw new Error('Sample canvas unavailable.');
      context.drawImage(image, 0, 0, 32, 24);
      return Array.from(context.getImageData(0, 0, 32, 24).data);
    }, capture.toString('base64')));
    if (quarter < 4) {
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.6);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.6, { steps: 12 });
      await page.mouse.up();
    }
  }
  const difference = (a, b) => a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0) / a.length;
  assert(difference(signatures[0], signatures[1]) > 1, 'A quarter turn must reveal different photo content.');
  assert(difference(signatures[0], signatures[4]) < 3, 'A full turn must return to the same photo content.');
  console.log(JSON.stringify({ result: 'passed', captures: destination, inspect: 'Four numbered columns should appear once in order; the rear seam joins columns 4 and 1.' }));
} finally {
  await browser.close();
}
