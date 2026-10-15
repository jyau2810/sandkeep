import type { SandTransferGrain, SandTransferKind } from './loose-sand';

type Point = Readonly<{ x: number; y: number }>;
type TransferFrame = Readonly<{ left: number; top: number; width: number; height: number }>;
export type SandStream = {
  element: HTMLCanvasElement;
  draw(kind: SandTransferKind, progress: number, mouth: Point, direction: Point, frame: TransferFrame, grains: readonly SandTransferGrain[]): void;
  clear(): void;
  dispose(): void;
};

const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const random = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const curve = (a: Point, b: Point, c: Point, d: Point, t: number): Point => {
  const s = 1 - t;
  return { x: s * s * s * a.x + 3 * s * s * t * b.x + 3 * s * t * t * c.x + t * t * t * d.x, y: s * s * s * a.y + 3 * s * s * t * b.y + 3 * s * t * t * c.y + t * t * t * d.y };
};

export function createSandStream(host: HTMLElement): SandStream {
  const element = document.createElement('canvas');
  element.className = 'sand-transfer-canvas';
  element.setAttribute('aria-hidden', 'true');
  element.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none';
  element.hidden = true;
  const context = element.getContext('2d');
  if (!context) throw new Error('浏览器暂时无法显示细沙流动。');
  host.append(element);
  let bitmapWidth = 0;
  let bitmapHeight = 0;

  function grain(point: Point, color: number, size: number, alpha = 1): void {
    const r = color & 255;
    const g = (color >>> 8) & 255;
    const b = (color >>> 16) & 255;
    context!.globalAlpha = alpha;
    context!.fillStyle = `rgb(${r} ${g} ${b})`;
    context!.fillRect(point.x, point.y, size, size);
    if (size > 1.05) {
      context!.fillStyle = `rgb(${Math.min(255, r + 29)} ${Math.min(255, g + 25)} ${Math.min(255, b + 18)})`;
      context!.fillRect(point.x, point.y, size * 0.48, size * 0.42);
    }
  }

  return {
    element,
    draw(kind, progress, mouth, direction, frame, grains): void {
      const rect = host.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.round(rect.width * ratio);
      const nextHeight = Math.round(rect.height * ratio);
      if (bitmapWidth !== nextWidth || bitmapHeight !== nextHeight) {
        bitmapWidth = element.width = nextWidth;
        bitmapHeight = element.height = nextHeight;
      }
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
      context!.clearRect(0, 0, rect.width, rect.height);
      element.hidden = false;
      const collect = { x: frame.left + frame.width * 0.88, y: frame.top + frame.height * 0.10 };
      const landing = { x: frame.left + frame.width * (0.28 + 0.35 * Math.sin(progress * Math.PI)), y: frame.top + frame.height * (0.16 + 0.70 * progress) };
      const outside = { x: mouth.x + direction.x * 32, y: mouth.y + direction.y * 32 };
      for (let i = 0; i < grains.length; i++) {
        const sample = grains[i];
        let point: Point;
        if (kind === 'assemble') {
          const t = (progress - 0.17 - sample.rank * 0.70) / 0.12;
          if (t <= 0 || t >= 1) continue;
          const origin = { x: collect.x + (random(i + 1) - 0.5) * 5, y: collect.y + (random(i + 45) - 0.5) * 3 };
          point = curve(origin, { x: origin.x + rect.width * 0.08, y: origin.y - rect.height * 0.25 }, outside, mouth, t);
        } else {
          const t = (progress - sample.rank * 0.79) / 0.20;
          if (t <= 0 || t >= 1) continue;
          const target = { x: frame.left + sample.homeX * frame.width, y: frame.top + sample.homeY * frame.height };
          const funnel = { x: landing.x + (random(i) - 0.5) * 8, y: landing.y };
          if (t < 0.72) point = curve(mouth, outside, { x: funnel.x, y: funnel.y - frame.height * 0.20 }, funnel, t / 0.72);
          else {
            const local = (t - 0.72) / 0.28;
            point = mix(funnel, target, local);
            point = { x: point.x, y: point.y - Math.sin(local * Math.PI) * (8 + random(i + 77) * 12) };
          }
        }
        grain(point, sample.color, 0.75 + random(i + 933) * 0.85);
      }
      if (progress > 0.025 && progress < 0.97 && kind === 'pour') {
        const strength = Math.min(1, progress * 18, (1 - progress) * 18);
        for (let i = 0; i < 130; i++) {
          const t = (random(i + 161) + progress * 5.3) % 1;
          const point = curve(mouth, outside, { x: landing.x, y: landing.y - frame.height * 0.2 }, landing, t);
          const spread = 1.5 + t * 3.5;
          grain({ x: point.x + (random(i + 923) - 0.5) * spread, y: point.y + (random(i + 703) - 0.5) * spread }, grains[i % grains.length].color, 0.8 + random(i + 413) * 0.8, strength);
        }
      }
      context!.globalAlpha = 1;
    },
    clear(): void {
      context!.setTransform(1, 0, 0, 1, 0, 0);
      context!.clearRect(0, 0, element.width, element.height);
      element.hidden = true;
    },
    dispose(): void {
      element.remove();
      element.width = element.height = 0;
    },
  };
}
