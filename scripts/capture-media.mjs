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
  await page.getByRole('button', { name: '向右旋转瓶子' }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: '拆开再玩', exact: true }).click();
  await ready(page, 'loose');
  const canvas = page.getByTestId('bottle-scene').locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('The bottle canvas is missing.');
  await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.44, { steps: 30 });
  await page.mouse.up();
  await page.screenshot({ path: path.join(media, '02-loose-sand.png') });
  await page.waitForTimeout(800);
  await page.getByLabel('给这瓶回忆起个名字').fill('猫的午后');
  await page.getByRole('button', { name: '装进瓶子', exact: true }).click();
  await ready(page);
  await page.waitForTimeout(700);
  await page.mouse.move(box.x + box.width * 0.36, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.73, box.y + box.height * 0.55, { steps: 60 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '暖调沙画', exact: true }).click();
  await ready(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(media, '03-warm-sand.png') });
  await page.waitForTimeout(1500);
  const videoPath = await page.video().path();
  await desktop.close();
  await copyFile(videoPath, path.join(scratch, 'demo.webm'));
  await writeFile(path.join(scratch, 'capture.json'), JSON.stringify({ trimStartSeconds, url }, null, 2));
  const warm = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const warmPage = await warm.newPage();
  await warmPage.goto(url);
  await ready(warmPage);
  await warmPage.getByRole('button', { name: '暖调沙画', exact: true }).click();
  await ready(warmPage);
  await warmPage.screenshot({ path: path.join(media, '03-warm-sand.png') });
  await warm.close();
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
