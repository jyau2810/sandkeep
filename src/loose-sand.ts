import type { LooseTool } from './domain';
import { assemblyPosition, sampleAssembly, createTransferPlan, pourDeposit, type SandTransferKind, type SandTransferPlan } from './sand-motion';

export type LooseSand = {
  element: HTMLDivElement;
  setActive(active: boolean): void;
  exportState(): Uint8Array | undefined;
  snapshot(): HTMLCanvasElement;
  setTool(tool: LooseTool): void;
  setBrushRadius(radius: number): void;
  restore(): void;
  beginTransfer(kind: SandTransferKind): SandTransferPlan;
  transferProgress(progress: number): void;
  finishTransfer(completed: boolean): void;
  dispose(): void;
};

type Grain = {
  x: number;
  y: number;
  hx: number;
  hy: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  omega: number;
  cx: number;
  cy: number;
  color: number;
  density: number;
  delay: number;
};
type Stroke = { ax: number; ay: number; bx: number; by: number };
type Pointer = { id: number; x: number; y: number };

const width = 720;
const height = 432;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const rgba = (r: number, g: number, b: number) => (255 << 28) | (b << 16) | (g << 8) | r;

// The restore brush shares the same local force falloff as direct manipulation.
function pushGrain(grain: Grain, stroke: Stroke, radius: number): void {
  const dx = stroke.bx - stroke.ax;
  const dy = stroke.by - stroke.ay;
  const length = dx * dx + dy * dy;
  const t = length > 0 ? clamp(((grain.x - stroke.ax) * dx + (grain.y - stroke.ay) * dy) / length, 0, 1) : 0;
  const ox = grain.x - (stroke.ax + dx * t);
  const oy = grain.y - (stroke.ay + dy * t);
  const distance2 = ox * ox + oy * oy;
  if (distance2 < radius * radius) {
    const distance = Math.sqrt(distance2) + 0.01;
    const falloff = 1 - distance / radius;
    const speed = Math.min(1, Math.sqrt(length) / 14);
    const push = (1.7 + speed * 2.8) * falloff;
    grain.omega = 0;
    grain.vx += ox / distance * push + clamp(dx, -25, 25) * 0.18 * falloff;
    grain.vy += oy / distance * push + clamp(dy, -25, 25) * 0.18 * falloff;
  }
}

export function createLooseSand(source: HTMLCanvasElement, reducedMotion: boolean, savedState?: Uint8Array): LooseSand {
  const element = document.createElement('div');
  element.className = 'loose-sand-layer';
  element.hidden = true;
  const frame = document.createElement('div');
  frame.className = 'loose-sand-frame';
  const canvas = document.createElement('canvas');
  canvas.className = 'loose-sand-canvas';
  canvas.width = width;
  canvas.height = height;
  canvas.dataset.testid = 'loose-sand';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '暖调平面沙画。按住鼠标或用手指划动，可拨开细沙。点击复原恢复原画。');
  canvas.style.touchAction = 'none';
  frame.append(canvas);
  element.append(frame);
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('浏览器暂时无法显示平面沙画。');
  const data = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height).data;
  const image = context.createImageData(width, height);
  const pixels = new Uint32Array(image.data.buffer);
  const background = new Uint32Array(width * height);
  const density = new Float32Array(width * height);
  const transmission = Array.from({ length: 3 }, () => new Float32Array(4096));
  for (let i = 0; i < 4096; i++) {
    transmission[0][i] = Math.exp(-i / 384 * 0.82);
    transmission[1][i] = Math.exp(-i / 384 * 1.07);
    transmission[2][i] = Math.exp(-i / 384 * 1.35);
  }
  let seed = 412;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < background.length; i++) {
    const x = (i % width) / width - 0.48;
    const y = Math.floor(i / width) / height - 0.43;
    const edge = Math.min(1, (x * x + y * y * 0.82) * 2.2);
    const d = (rand() - 0.5) * 3;
    background[i] = rgba(255 - edge * 25 + Math.min(0, d), 226 - edge * 58 + d, 128 - edge * 55 + d);
  }
  const grains: Grain[] = [];
  seed = 907;
  for (let y = 1; y < height - 2; y += 1.9) for (let x = 1; x < width - 2; x += 1.9) {
    const px = x + (rand() - 0.5) * 1.7;
    const py = y + (rand() - 0.5) * 1.7;
    const index = ((py | 0) * width + (px | 0)) * 4;
    const alpha = data[index + 3] / 255;
    const r = data[index] * alpha + 48 * (1 - alpha);
    const g = data[index + 1] * alpha + 40 * (1 - alpha);
    const b = data[index + 2] * alpha + 33 * (1 - alpha);
    const shade = 0.82 + rand() * 0.32;
    const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    const t = clamp((lum - 0.08) * 1.16, 0, 1);
    const sr = clamp((49 + 196 * t) * shade, 0, 255) | 0;
    const sg = clamp((31 + 161 * t) * shade, 0, 255) | 0;
    const sb = clamp((19 + 111 * t) * shade, 0, 255) | 0;
    grains.push({
      x: px, y: py, hx: px, hy: py, sx: px, sy: py,
      vx: 0, vy: 0, omega: 0, cx: 0, cy: 0,
      density: (0.06 + Math.pow(1 - t, 1.6) * 3.8) * (rand() < 0.85 ? 1 : 0.85),
      color: rgba(sr, sg, sb),
      delay: rand() * 140,
    });
  }
  const originalGrains = grains.map(grain => ({ ...grain }));
  let edited = false;
  if (savedState && savedState.byteLength / 28 >= grains.length && savedState.byteLength / 28 <= 150000) {
    const view = new DataView(savedState.buffer, savedState.byteOffset, savedState.byteLength);
    for (let i = 0; i < view.byteLength / 28; i++) {
      const x = view.getFloat64(i * 28, true), y = view.getFloat64(i * 28 + 8, true);
      const grain = grains[i] ?? { ...originalGrains[0], hx: x, hy: y };
      grain.x = grain.sx = x; grain.y = grain.sy = y;
      grain.density = view.getFloat64(i * 28 + 16, true); grain.color = view.getUint32(i * 28 + 24, true);
      grains[i] = grain;
    }
    edited = true;
  }
  let tool: LooseTool = 'push';
  let brushRadius = 28;
  let pointer: Pointer | null = null;
  let center = { x: width * 0.5, y: height * 0.48 };
  let strokes: Stroke[] = [];
  let animation = 0;
  let lastTime = 0;
  let restoreTime = -1;
  let sweptGrains: typeof grains = [];
  let sweepTime = -1;
  let spinUntil = 0;
  let active = false;
  let disposed = false;
  let pausedAt: number | null = null;
  let moving = false;
  let transfer: { plan: SandTransferPlan; progress: number } | null = null;

  function paint(): void {
    density.fill(0);
    const assembly = transfer?.plan.kind === 'assemble' ? sampleAssembly(transfer.plan, transfer.progress) : null;
    const visibleGrains = sweptGrains.length ? grains.concat(sweptGrains) : grains;
    for (let i = 0; i < visibleGrains.length; i++) {
      const grain = visibleGrains[i];
      let px = grain.x;
      let py = grain.y;
      if (transfer) {
        if (transfer.plan.kind === 'pour') {
          const route = transfer.plan.grains[i];
          if (transfer.progress < route.land) continue;
          const point = pourDeposit(route, transfer.progress);
          px = point.x * width;
          py = point.y * height;
        } else {
          const route = transfer.plan.grains[i];
          if (transfer.progress >= route.depart) continue;
          const point = assemblyPosition(route, assembly!);
          px = point.x * width;
          py = point.y * height;
        }
      }
      const x = px | 0;
      const y = py | 0;
      if (x < 1 || x >= width - 2 || y < 1 || y >= height - 2) continue;
      const index = y * width + x;
      const mass = grain.density;
      density[index] += mass;
      density[index - 1] += mass * 0.38;
      density[index + 1] += mass * 0.42;
      density[index - width] += mass * 0.28;
      density[index + width] += mass * 0.34;
      density[index - width - 1] += mass * 0.09;
      density[index - width + 1] += mass * 0.07;
      density[index + width - 1] += mass * 0.08;
      density[index + width + 1] += mass * 0.12;
    }
    for (let i = 0; i < pixels.length; i++) {
      const light = background[i];
      const amount = Math.min(4095, Math.round(density[i] * 384));
      const r = 39 + ((light & 255) - 39) * transmission[0][amount];
      const g = 20 + (((light >>> 8) & 255) - 20) * transmission[1][amount];
      const b = 11 + (((light >>> 16) & 255) - 11) * transmission[2][amount];
      pixels[i] = rgba(r, g, b);
    }
    context!.putImageData(image, 0, 0);
  }

  function wake(): void {
    if (!animation && active && !disposed && !document.hidden) {
      lastTime = performance.now();
      animation = requestAnimationFrame(tick);
    }
  }

  function tick(now: number): void {
    animation = 0;
    if (!active || disposed || document.hidden) return;
    const dt = clamp((now - lastTime) / 16.667, 0.2, 2);
    lastTime = now;
    const spinning = (pointer !== null && tool === 'swirl') || now < spinUntil;
    if (pointer && tool === 'sprinkle') sprinkle(pointer.x, pointer.y, Math.ceil(brushRadius * brushRadius * 0.025 * dt));
    const activeStrokes = strokes.splice(0);
    moving = false;
    if (restoreTime >= 0) {
      const elapsed = now - restoreTime;
      for (const grain of grains) {
        const t = clamp((elapsed - grain.delay) / 820, 0, 1);
        const e = 1 - Math.pow(1 - t, 3);
        const angle = Math.sin(t * Math.PI) * 0.10;
        const dx = grain.sx - grain.hx;
        const dy = grain.sy - grain.hy;
        grain.x = grain.hx + (dx * Math.cos(angle) - dy * Math.sin(angle)) * (1 - e);
        grain.y = grain.hy + (dx * Math.sin(angle) + dy * Math.cos(angle)) * (1 - e);
        grain.vx = grain.vy = grain.omega = 0;
      }
      if (elapsed > 980) { restoreTime = -1; edited = false; }
      else moving = true;
    } else {
      for (const grain of grains) {
        for (const stroke of activeStrokes) {
          pushGrain(grain, stroke, brushRadius);
        }
        if (spinning) {
          const ox = grain.x - center.x;
          const oy = grain.y - center.y;
          const distance2 = ox * ox + oy * oy;
          if (distance2 < 25600 && distance2 > 2) {
            grain.omega = 0.080 * Math.pow(1 - Math.sqrt(distance2) / 160, 0.8);
            grain.cx = center.x;
            grain.cy = center.y;
          }
        }
        if (grain.omega > 0.00012) {
          const ox = grain.x - grain.cx;
          const oy = grain.y - grain.cy;
          const angle = grain.omega * dt;
          const ca = Math.cos(angle);
          const sa = Math.sin(angle);
          grain.x = grain.cx + ox * ca - oy * sa;
          grain.y = grain.cy + ox * sa + oy * ca;
          grain.omega *= Math.pow(0.86, dt);
          moving = true;
        } else grain.omega = 0;
        if (Math.abs(grain.vx) + Math.abs(grain.vy) > 0.035) {
          const damping = Math.pow(spinning ? 0.965 : 0.83, dt);
          grain.vx = clamp(grain.vx, -12, 12) * damping;
          grain.vy = clamp(grain.vy, -12, 12) * damping;
          grain.x += grain.vx * dt;
          grain.y += grain.vy * dt;
          if (grain.x < 1) { grain.x = 1; grain.vx *= -0.2; }
          if (grain.x > width - 3) { grain.x = width - 3; grain.vx *= -0.2; }
          if (grain.y < 1) { grain.y = 1; grain.vy *= -0.2; }
          if (grain.y > height - 3) { grain.y = height - 3; grain.vy *= -0.2; }
          moving = true;
        } else grain.vx = grain.vy = 0;
      }
    }
    if (sweptGrains.length) {
      const elapsed = now - sweepTime;
      const reach = 84;
      for (const grain of sweptGrains) {
        // Slightly different brush contacts break the pile into loose grains;
        // a shared straight front would compress it into a rigid dark ridge.
        const seed = Math.sin(grain.sx * 12.9898 + grain.sy * 78.233) * 43758.5453;
        const roughness = seed - Math.floor(seed);
        const front = Math.min(grain.sx - reach + elapsed * (0.5 + roughness * 0.3), grain.x - 22 - roughness * 36);
        const cy = grain.y + (roughness - 0.5) * 40;
        pushGrain(grain, { ax: front - 14, ay: cy, bx: front, by: cy }, reach);
        const damping = Math.pow(0.83, dt);
        grain.vx = clamp(grain.vx, -12, 12) * damping;
        grain.vy = clamp(grain.vy, -12, 12) * damping;
        grain.x += grain.vx * dt;
        grain.y += grain.vy * dt;
        if (grain.y < 1) { grain.y = 1; grain.vy *= -0.2; }
        if (grain.y > height - 3) { grain.y = height - 3; grain.vy *= -0.2; }
      }
      // Retire sand only after it has physically crossed the open right edge.
      sweptGrains = sweptGrains.filter(grain => grain.x < width + 2);
      if (sweptGrains.length) moving = true;
    }
    paint();
    if (moving || spinning || strokes.length || (pointer && tool === 'sprinkle')) wake();
  }

  function point(event: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) * width / rect.width, 0, width),
      y: clamp((event.clientY - rect.top) * height / rect.height, 0, height),
    };
  }

  function releasePointer(): void {
    const id = pointer?.id;
    pointer = null;
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }

  function sprinkle(x: number, y: number, amount: number): void {
    edited = true;
    if (grains.length >= 150000) {
      for (const grain of grains) {
        const d = Math.hypot(grain.x - x, grain.y - y) / brushRadius;
        if (d < 1) grain.density = Math.min(16, grain.density + (1 - d) * amount / (brushRadius * brushRadius) * 0.4);
      }
    }
    for (let i = 0; i < amount && grains.length < 150000; i++) {
      const angle = rand() * Math.PI * 2;
      const distance = Math.sqrt(rand()) * brushRadius;
      const px = clamp(x + Math.cos(angle) * distance, 1, width - 3);
      const py = clamp(y + Math.sin(angle) * distance, 1, height - 3);
      grains.push({ ...originalGrains[0], x: px, y: py, hx: px, hy: py, sx: px, sy: py,
        vx: 0, vy: 0, omega: 0, density: Math.fround(0.9 + rand() * 1.2), color: rgba(115, 73, 34) });
    }
  }

  function onPointerDown(event: PointerEvent): void {
    if (!active || disposed || document.hidden || pointer || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    restoreTime = -1;
    edited = true;
    spinUntil = 0;
    const next = point(event);
    pointer = { id: event.pointerId, ...next };
    center = next;
    canvas.setPointerCapture(event.pointerId);
    if (tool === 'sprinkle') sprinkle(next.x, next.y, Math.ceil(brushRadius * brushRadius * 0.7));
    if (tool === 'push') strokes.push({ ax: next.x, ay: next.y, bx: next.x + 0.01, by: next.y });
    wake();
  }

  function onPointerMove(event: PointerEvent): void {
    if (!pointer || pointer.id !== event.pointerId) return;
    event.preventDefault();
    const next = point(event);
    if (tool === 'push') {
      strokes.push({ ax: pointer.x, ay: pointer.y, bx: next.x, by: next.y });
      if (strokes.length > 12) strokes.shift();
    }
    if (tool === 'sprinkle') {
      const dx = next.x - pointer.x, dy = next.y - pointer.y;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(2, brushRadius * 0.3)));
      for (let i = 1; i <= steps; i++) sprinkle(pointer.x + dx * i / steps, pointer.y + dy * i / steps, Math.ceil(brushRadius * brushRadius * 0.15));
    }
    Object.assign(pointer, next);
    center = next;
    wake();
  }

  function onPointerUp(event: PointerEvent): void {
    if (pointer?.id !== event.pointerId) return;
    releasePointer();
    wake();
  }

  function syncActivity(): void {
    if (!active || disposed || document.hidden) {
      releasePointer();
      spinUntil = 0;
      strokes = [];
      if (animation) cancelAnimationFrame(animation);
      animation = 0;
      if (pausedAt === null) pausedAt = performance.now();
    } else {
      if (pausedAt !== null && sweptGrains.length) sweepTime += performance.now() - pausedAt;
      if (pausedAt !== null && restoreTime >= 0) restoreTime += performance.now() - pausedAt;
      pausedAt = null;
      if (moving || restoreTime >= 0) wake();
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('lostpointercapture', onPointerUp);
  document.addEventListener('visibilitychange', syncActivity);
  paint();

  return {
    element,
    exportState(): Uint8Array | undefined {
      sweptGrains = [];
      if (!edited) return undefined;
      const bytes = new Uint8Array(grains.length * 28);
      const view = new DataView(bytes.buffer);
      grains.forEach((grain, i) => {
        view.setFloat64(i * 28, grain.x, true); view.setFloat64(i * 28 + 8, grain.y, true);
        view.setFloat64(i * 28 + 16, grain.density, true); view.setUint32(i * 28 + 24, grain.color, true);
      });
      return bytes;
    },
    snapshot(): HTMLCanvasElement {
      paint();
      const copy = document.createElement('canvas'); copy.width = width; copy.height = height;
      copy.getContext('2d')!.drawImage(canvas, 0, 0);
      return copy;
    },
    setActive(next): void {
      active = next;
      element.hidden = !next;
      syncActivity();
    },
    setBrushRadius(radius): void {
      if (Number.isFinite(radius)) brushRadius = clamp(radius, 8, 64);
    },
    setTool(next): void {
      if (disposed) return;
      releasePointer();
      tool = next;
      spinUntil = 0;
      if (next === 'swirl' && active && !document.hidden) {
        restoreTime = -1;
        center = { x: width * 0.5, y: height * 0.48 };
        spinUntil = performance.now() + (reducedMotion ? 180 : 1100);
        wake();
      }
    },
    restore(): void {
      if (!active || disposed || document.hidden) return;
      releasePointer();
      spinUntil = 0;
      strokes = [];
      if (!reducedMotion) {
        const extra = grains.slice(originalGrains.length).map(grain => ({ ...grain }));
        grains.slice(0, originalGrains.length).forEach((grain, i) => {
          const excess = grain.density - originalGrains[i].density;
          if (excess > 0) extra.push({ ...grain, density: excess });
        });
        sweptGrains = sweptGrains.concat(extra);
        sweptGrains.forEach(grain => { grain.sx = grain.x; grain.sy = grain.y; grain.vx = grain.vy = 0; });
        sweepTime = performance.now();
      } else sweptGrains = [];
      grains.length = originalGrains.length;
      grains.forEach((grain, i) => { grain.density = originalGrains[i].density; grain.color = originalGrains[i].color; });
      if (reducedMotion) edited = false;
      for (const grain of grains) {
        grain.sx = grain.x;
        grain.sy = grain.y;
        grain.vx = grain.vy = grain.omega = 0;
        if (reducedMotion) { grain.x = grain.hx; grain.y = grain.hy; }
      }
      restoreTime = reducedMotion ? -1 : performance.now();
      moving = !reducedMotion;
      if (reducedMotion) paint();
      else wake();
    },
    beginTransfer(kind): SandTransferPlan {
      sweptGrains = [];
      active = false;
      syncActivity();
      const plan = createTransferPlan(kind, grains.map(grain => ({ ...grain, hx: grain.x, hy: grain.y })));
      transfer = { plan, progress: 0 };
      element.hidden = false;
      paint();
      return plan;
    },
    transferProgress(progress): void {
      if (!transfer || disposed) return;
      transfer.progress = clamp(progress, 0, 1);
      paint();
    },
    finishTransfer(completed): void {
      if (!transfer || disposed) return;
      if (completed) {
        for (const grain of grains) {
          grain.vx = grain.vy = grain.omega = 0;
        }
        moving = false;
        restoreTime = -1;
      }
      transfer = null;
      paint();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      active = false;
      syncActivity();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('lostpointercapture', onPointerUp);
      document.removeEventListener('visibilitychange', syncActivity);
      element.remove();
      canvas.width = canvas.height = 0;
      grains.length = 0;
      sweptGrains = [];
    },
  };
}
