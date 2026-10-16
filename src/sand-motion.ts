export type SandTransferKind = 'assemble' | 'pour';
export type SandTransferGrain = Readonly<{
  homeX: number; homeY: number; startX: number; startY: number;
  impactX: number; impactY: number; color: number;
  depart: number; mouth: number; land: number; settle: number;
}>;
export type AssemblyGrain = SandTransferGrain & Readonly<{
  slide: number; edge: number; edgeX: number; edgeY: number; layer: number;
}>;
export type SandTransferPlan = Readonly<{
  kind: 'pour';
  grains: readonly SandTransferGrain[];
  samples: readonly SandTransferGrain[];
  mouthTimes: readonly number[];
  settledAt: number;
}> | Readonly<{
  kind: 'assemble';
  grains: readonly AssemblyGrain[];
  samples: readonly AssemblyGrain[];
  mouthTimes: readonly number[];
  settledAt: number;
}>;
export type GrainSource = Readonly<{ x: number; y: number; hx: number; hy: number; color: number }>;
export type SandPoint = Readonly<{ x: number; y: number }>;
export type FrameProjection = Readonly<{ origin: SandPoint; xAxis: SandPoint; yAxis: SandPoint; lip: SandPoint }>;
export const assemblyTilt = 28 * Math.PI / 180;
export const assemblyOutlet = { x: 717 / 720, y: 429 / 432 } as const;

export const sandNoise = (seed: number): number => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
export const unit = (value: number): number => Math.max(0, Math.min(1, value));
export const eased = (value: number): number => { const t = unit(value); return t * t * (3 - 2 * t); };

export function projectFrame(frame: FrameProjection, point: SandPoint): SandPoint {
  return { x: frame.origin.x + frame.xAxis.x * point.x + frame.yAxis.x * point.y, y: frame.origin.y + frame.xAxis.y * point.x + frame.yAxis.y * point.y };
}

export function assemblyPosition(route: AssemblyGrain, progress: number): SandPoint {
  if (progress <= route.slide) return { x: route.startX, y: route.startY };
  if (progress < route.edge) {
    const t = unit((progress - route.slide) / (route.edge - route.slide));
    return { x: route.startX + (route.edgeX - route.startX) * t * t, y: route.startY + (route.edgeY - route.startY) * t * t };
  }
  const t = unit((progress - route.edge) / (route.depart - route.edge));
  const slide = t * (0.4 + t * 0.6);
  return { x: route.edgeX + (assemblyOutlet.x - route.edgeX) * slide, y: route.edgeY + (assemblyOutlet.y - route.edgeY) * slide };
}

function createAssemblyPlan(source: readonly GrainSource[]): SandTransferPlan {
  const dx = Math.sin(assemblyTilt);
  const dy = Math.cos(assemblyTilt);
  const routes = source.map((grain, index) => {
    const x = Math.max(1, Math.min(717, grain.x));
    const y = Math.max(1, Math.min(429, grain.y));
    const distance = Math.min((717 - x) / dx, (429 - y) / dy);
    const edgeX = x + dx * distance;
    const edgeY = y + dy * distance;
    const rim = Math.hypot(717 - edgeX, 429 - edgeY);
    const slide = 0.15 + sandNoise(index + 51) * 0.23;
    const edge = slide + 0.055 + distance / 720 * 0.18;
    const depart = edge + 0.035 + rim / 720 * 0.22;
    return { homeX: grain.hx / 720, homeY: grain.hy / 432, startX: x / 720, startY: y / 432, edgeX: edgeX / 720, edgeY: edgeY / 432, impactX: 0, impactY: 0, color: grain.color, slide, edge, depart, mouth: depart + 0.05, land: depart + 0.145, settle: depart + 0.18, layer: 0 };
  });
  const last = routes.reduce((last, route) => Math.max(last, route.settle), 0);
  const factor = (0.875 - 0.15) / (last - 0.15);
  const arrival = routes.map((route, index) => ({ time: route.land, index })).sort((a, b) => a.time - b.time);
  const layers = new Float32Array(routes.length);
  arrival.forEach((route, order) => { layers[route.index] = (order + 0.5) / routes.length; });
  const grains: AssemblyGrain[] = routes.map((route, index) => ({ ...route, slide: 0.15 + (route.slide - 0.15) * factor, edge: 0.15 + (route.edge - 0.15) * factor, depart: 0.15 + (route.depart - 0.15) * factor, mouth: 0.15 + (route.mouth - 0.15) * factor, land: 0.15 + (route.land - 0.15) * factor, settle: 0.15 + (route.settle - 0.15) * factor, layer: layers[index] }));
  return { kind: 'assemble', grains, samples: grains.filter((_, index) => index % 12 === 0), mouthTimes: grains.map(grain => grain.mouth).sort((a, b) => a - b), settledAt: 0.875 };
}

export function createTransferPlan(kind: SandTransferKind, source: readonly GrainSource[]): SandTransferPlan {
  if (kind === 'assemble') return createAssemblyPlan(source);
  const grains = source.map((grain, index): SandTransferGrain => {
    const homeX = grain.hx / 720;
    const homeY = grain.hy / 432;
    const order = unit(((1 - homeY) + 0.84 * Math.abs(homeX - 0.5)) / 1.42 + (sandNoise(index + 51) - 0.5) * 0.018);
    const depart = 0.015 + order * 0.61;
    const mouth = depart + 0.095;
    const land = mouth + 0.145;
    return {
      homeX, homeY, startX: grain.x / 720, startY: grain.y / 432,
      impactX: 0.5 + (sandNoise(index + 79) - 0.5) * 0.02,
      impactY: Math.min(homeY, unit(1 - order * 1.42 - sandNoise(index + 131) * 0.008)),
      color: grain.color, depart, mouth, land, settle: land + 0.105,
    };
  });
  const samples = grains.filter((_, index) => index % 12 === 0);
  return { kind, grains, samples, mouthTimes: grains.map(grain => grain.mouth).sort((a, b) => a - b), settledAt: 1 };
}

export function bottleMass(plan: SandTransferPlan, progress: number): number {
  let first = 0;
  let last = plan.mouthTimes.length;
  while (first < last) {
    const middle = (first + last) >>> 1;
    if (plan.mouthTimes[middle] <= progress) first = middle + 1;
    else last = middle;
  }
  const crossed = first / plan.mouthTimes.length;
  return plan.kind === 'pour' ? 1 - crossed : crossed;
}
