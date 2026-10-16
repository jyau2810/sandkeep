import { assemblyOutlet, projectFrame, pourFlight, sandNoise, type FrameProjection, type SandTransferPlan } from './sand-motion';

type Point = Readonly<{ x: number; y: number }>;
export type SandStream = {
  element: HTMLCanvasElement;
  draw(plan: SandTransferPlan, progress: number, mouth: Point, frame: FrameProjection): void;
  clear(): void;
  dispose(): void;
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
    draw(plan, progress, mouth, frame): void {
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
      if (plan.kind === 'assemble') {
        const outlet = projectFrame(frame, assemblyOutlet);
        for (let index = 0; index < plan.samples.length; index++) {
          const route = plan.samples[index];
          const t = (progress - route.depart) / (route.mouth - route.depart);
          if (t <= 0 || t >= 1) continue;
          const overRim = Math.min(1, t / 0.22);
          const fall = Math.max(0, (t - 0.22) / 0.78);
          const point = t < 0.22 ? {
            x: outlet.x + (frame.lip.x - outlet.x) * overRim,
            y: outlet.y + (frame.lip.y - outlet.y) * overRim,
          } : {
            x: frame.lip.x + (mouth.x - frame.lip.x) * fall + Math.sin(fall * Math.PI) * (sandNoise(index + 191) - 0.5) * 1.4,
            y: frame.lip.y + (mouth.y - frame.lip.y) * fall * (0.32 + 0.68 * fall),
          };
          grain(point, route.color, 0.72 + sandNoise(index + 933) * 0.72);
        }
        return;
      }
      for (let index = 0; index < plan.samples.length; index++) {
        const route = plan.samples[index];
        const t = (progress - route.mouth) / (route.land - route.mouth);
        if (t <= 0 || t >= 1) continue;
        const target = projectFrame(frame, { x: route.impactX, y: route.impactY });
        const fall = pourFlight(route, t);
        const point = {
          x: mouth.x + (target.x - mouth.x) * t + fall.x * frame.xAxis.x,
          y: mouth.y + (target.y - mouth.y) * fall.y,
        };
        grain(point, route.color, 0.55 + sandNoise(index + 933) * 0.55);
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
