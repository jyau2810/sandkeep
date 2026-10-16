import { chromium, expect } from '@playwright/test';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = fileURLToPath(new URL('..', import.meta.url));
const media = path.join(project, 'submission/media');
const scratch = path.join(project, 'work/media-capture');
const url = process.argv[2] ?? 'https://jyau2810.github.io/sandkeep/';
await mkdir(media, { recursive: true });
await mkdir(scratch, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
const errors = [];
const bundles = new Set();
async function ready(page, phase = 'loose') {
  await expect(page.locator('#app')).toHaveAttribute('data-phase', phase, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function open(context) {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url); await ready(page);
  bundles.add(await page.locator('script[type="module"]').getAttribute('src'));
  return page;
}
async function stroke(page, locator, from, to, steps = 36) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Interaction surface is missing');
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1]);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(box.x + box.width * (from[0] + (to[0] - from[0]) * t), box.y + box.height * (from[1] + (to[1] - from[1]) * t));
    await page.waitForTimeout(22);
  }
  await page.mouse.up();
}
async function edit(page) {
  const canvas = page.getByTestId('loose-sand');
  await stroke(page, canvas, [.18,.78], [.4,.7]);
  await page.getByRole('button', {name:'撒沙', exact:true}).click();
  await page.getByRole('slider', {name:'撒沙密度'}).fill('35');
  await stroke(page, canvas, [.72,.22], [.86,.32]);
  await page.mouse.move(20,20); await page.waitForTimeout(400);
}
try {
  const desktop = await browser.newContext({ viewport:{width:1920,height:1080}, deviceScaleFactor:1, reducedMotion:'reduce' });
  const page = await open(desktop);
  await page.screenshot({path:path.join(media,'02-loose-sand.png')});
  await edit(page);
  await page.screenshot({path:path.join(media,'03-sand-play.png')});
  await page.getByRole('button',{name:'复原',exact:true}).click();
  await page.getByRole('button',{name:'装进瓶子',exact:true}).click();
  await ready(page,'sealed'); await page.mouse.move(20,20);
  await page.screenshot({path:path.join(media,'01-cover.png')});
  await desktop.close();

  const mobile = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const phone = await open(mobile);
  await expect.poll(()=>phone.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
  await phone.screenshot({path:path.join(media,'04-mobile.png'),fullPage:true});
  await mobile.close();

  const recording = await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,recordVideo:{dir:scratch,size:{width:1280,height:720}}});
  const recordingStarted = performance.now();
  const video = await open(recording);
  const trimStartSeconds = (performance.now()-recordingStarted)/1000;
  const marks = {};
  const mark = name => { marks[name]=(performance.now()-recordingStarted)/1000-trimStartSeconds; };
  mark('frame'); await video.waitForTimeout(1000);
  mark('edit'); await edit(video);
  mark('restore'); await video.getByRole('button',{name:'复原',exact:true}).click();
  await video.waitForTimeout(3000);
  mark('assemble'); await video.getByRole('button',{name:'装进瓶子',exact:true}).click();
  await ready(video,'sealed'); await video.waitForTimeout(600);
  mark('rotate'); await stroke(video,video.getByTestId('bottle-scene'),[.38,.55],[.65,.47],50);
  await video.waitForTimeout(600);
  await video.locator('canvas.bottle-canvas').dblclick();await video.waitForTimeout(900);
  mark('pour'); await video.getByRole('button',{name:'倒出成画',exact:true}).click();
  await ready(video); await video.mouse.move(20,20);await video.waitForTimeout(1400);
  mark('end');
  const videoPath = await video.video().path();
  await recording.close();
  await copyFile(videoPath,path.join(scratch,'demo.webm'));
  if(errors.length)throw new Error(errors.join('\n'));
  if(bundles.size!==1)throw new Error('Deployment changed during capture');
  const report={trimStartSeconds,marks,url,bundles:[...bundles],errors};
  await writeFile(path.join(scratch,'capture.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
