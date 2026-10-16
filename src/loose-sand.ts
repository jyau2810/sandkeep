import type { LooseTool } from './domain';
import { assemblyPosition, sampleAssembly, createTransferPlan, pourDeposit, type SandTransferKind, type SandTransferPlan } from './sand-motion';

export type LooseSand = {
  element: HTMLDivElement;
  setActive(active: boolean): void;
  setTool(tool: LooseTool): void;
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
const rgba = (r: number, g: number, b: number) => (255 << 24) | (b << 16) | (g << 8) | r;

export function createLooseSand(source: HTMLCanvasElement, reducedMotion: boolean): LooseSand {
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
  let tool: LooseTool = 'push';
  let pointer: Pointer | null = null;
  let center = { x: width * 0.5, y: height * 0.48 };
  let strokes: Stroke[] = [];
  let animation = 0;
  let lastTime = 0;
  let restoreTime = -1;
  let spinUntil = 0;
  let active = false;
  let disposed = false;
  let pausedAt: number | null = null;
  let moving = false;
  let transfer: { plan: SandTransferPlan; progress: number } | null = null;

  function paint(): void {
    density.fill(0);
    const assembly = transfer?.plan.kind === 'assemble' ? sampleAssembly(transfer.plan, transfer.progress) : null;
    for (let i = 0; i < grains.length; i++) {
      const grain = grains[i];
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
      if (elapsed > 980) restoreTime = -1;
      else moving = true;
    } else {
      for (const grain of grains) {
        for (const stroke of activeStrokes) {
          const dx = stroke.bx - stroke.ax;
          const dy = stroke.by - stroke.ay;
          const length = dx * dx + dy * dy;
          const t = length > 0 ? clamp(((grain.x - stroke.ax) * dx + (grain.y - stroke.ay) * dy) / length, 0, 1) : 0;
          const ox = grain.x - (stroke.ax + dx * t);
          const oy = grain.y - (stroke.ay + dy * t);
          const distance2 = ox * ox + oy * oy;
          if (distance2 < 784) {
            const distance = Math.sqrt(distance2) + 0.01;
            const falloff = 1 - distance / 28;
            const speed = Math.min(1, Math.sqrt(length) / 14);
            const push = (1.7 + speed * 2.8) * falloff;
            grain.omega = 0;
            grain.vx += ox / distance * push + clamp(dx, -25, 25) * 0.18 * falloff;
            grain.vy += oy / distance * push + clamp(dy, -25, 25) * 0.18 * falloff;
          }
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
    paint();
    if (moving || spinning || strokes.length) wake();
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

  function onPointerDown(event: PointerEvent): void {
    if (!active || disposed || document.hidden || pointer || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    restoreTime = -1;
    spinUntil = 0;
    const next = point(event);
    pointer = { id: event.pointerId, ...next };
    center = next;
    canvas.setPointerCapture(event.pointerId);
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
    setActive(next): void {
      active = next;
      element.hidden = !next;
      syncActivity();
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
      active = false;
      syncActivity();
      const plan = createTransferPlan(kind, grains);
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
          grain.x = grain.hx;
          grain.y = grain.hy;
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
    },
  };
}
