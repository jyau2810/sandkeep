import { sandNoise, unit, type SandTransferPlan } from './sand-motion';

type Point = Readonly<{ x: number; y: number }>;
type TransferFrame = Readonly<{ left: number; top: number; width: number; height: number }>;
export type SandStream = {
  element: HTMLCanvasElement;
  draw(plan: SandTransferPlan, progress: number, mouth: Point, direction: Point, frame: TransferFrame): void;
  clear(): void;
  dispose(): void;
};

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

  function grain(point: Point, color: number, size: number): void {
    const r = color & 255;
    const g = (color >>> 8) & 255;
    const b = (color >>> 16) & 255;
    context!.fillStyle = `rgb(${r} ${g} ${b})`;
    context!.fillRect(point.x, point.y, size, size);
    if (size > 1.05) {
      context!.fillStyle = `rgb(${Math.min(255, r + 24)} ${Math.min(255, g + 20)} ${Math.min(255, b + 16)})`;
      context!.fillRect(point.x, point.y, size * 0.45, size * 0.4);
    }
  }

  return {
    element,
    draw(plan, progress, mouth, direction, frame): void {
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
      for (let index = 0; index < plan.samples.length; index++) {
        const route = plan.samples[index];
        let point: Point;
        if (plan.kind === 'pour') {
          const t = (progress - route.mouth) / (route.land - route.mouth);
          if (t <= 0 || t >= 1) continue;
          const target = { x: frame.left + route.impactX * frame.width, y: frame.top + route.impactY * frame.height };
          const spread = (sandNoise(index + 191) - 0.5) * (1.2 + t * 3);
          const outward = { x: mouth.x + direction.x * 19, y: mouth.y + direction.y * 19 };
          point = curve(mouth, outward, { x: target.x, y: mouth.y + Math.max(18, target.y - mouth.y) * 0.32 }, target, t);
          point = { x: point.x + spread, y: point.y };
        } else {
          const t = (progress - route.depart) / (route.mouth - route.depart);
          if (t <= 0 || t >= 1) continue;
          const origin = { x: frame.left + route.startX * frame.width, y: frame.top + route.startY * frame.height };
          const outside = { x: mouth.x + direction.x * 17, y: mouth.y + direction.y * 17 };
          point = curve(origin, { x: origin.x + (mouth.x - origin.x) * 0.35, y: origin.y - Math.min(82, rect.height * 0.19) }, outside, mouth, unit(t));
        }
        grain(point, route.color, 0.72 + sandNoise(index + 933) * 0.72);
      }
    },
    clear(): void {
      context!.setTransform(1, 0, 0, 1, 0, 0);
      context!.clearRect(0, 0, element.width, element.height);
      element.hidden = true;
    },
    dispose(): void { element.remove(); element.width = element.height = 0; },
  };
}
