import { chromium } from 'playwright';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = fileURLToPath(new URL('..', import.meta.url));
const media = path.join(project, 'submission/media');
const scratch = path.join(project, 'work/media-capture');
const url = process.argv[2] ?? 'http://127.0.0.1:4173/sandkeep/';
await mkdir(media, { recursive: true });
await mkdir(scratch, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });

async function ready(page, phase = 'sealed') {
  await page.locator(`#app[data-phase="${phase}"]`).waitFor();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

try {
  const desktop = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
    recordVideo: { dir: scratch, size: { width: 1280, height: 720 } },
  });
  const page = await desktop.newPage();
  const recordingStarted = performance.now();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await ready(page);
  const trimStartSeconds = (performance.now() - recordingStarted) / 1000;
  await page.screenshot({ path: path.join(media, '01-cover.png') });
  await page.waitForTimeout(1000);
  const firstBottle = await page.getByTestId('bottle-scene').boundingBox();
  if (!firstBottle) throw new Error('The bottle stage is missing.');
  await page.mouse.move(firstBottle.x + firstBottle.width * 0.4, firstBottle.y + firstBottle.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(firstBottle.x + firstBottle.width * 0.72, firstBottle.y + firstBottle.height * 0.5, { steps: 30 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: '倒出成画', exact: true }).click();
  await ready(page, 'loose');
  await page.screenshot({ path: path.join(media, '02-loose-sand.png') });
  const canvas = page.getByTestId('loose-sand');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('The flat sand canvas is missing.');
  await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.44, { steps: 30 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(media, '03-sand-play.png') });
  await page.getByRole('button', { name: '聚回照片', exact: true }).click();
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await ready(page);
  await page.waitForTimeout(700);
  const bottleBox = await page.getByTestId('bottle-scene').boundingBox();
  if (!bottleBox) throw new Error('The bottle stage is missing.');
  await page.mouse.move(bottleBox.x + bottleBox.width * 0.36, bottleBox.y + bottleBox.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(bottleBox.x + bottleBox.width * 0.73, bottleBox.y + bottleBox.height * 0.55, { steps: 60 });
  await page.mouse.up();
  await page.waitForTimeout(2700);
  const videoPath = await page.video().path();
  await desktop.close();
  await copyFile(videoPath, path.join(scratch, 'demo.webm'));
  await writeFile(path.join(scratch, 'capture.json'), JSON.stringify({ trimStartSeconds, url }, null, 2));
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const phone = await mobile.newPage();
  await phone.goto(url);
  await ready(phone);
  await phone.screenshot({ path: path.join(media, '04-mobile.png'), fullPage: true });
  await mobile.close();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ media, video: path.join(scratch, 'demo.webm'), url }));
} finally {
  await browser.close();
}
