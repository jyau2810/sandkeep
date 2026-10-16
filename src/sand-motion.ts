export type SandTransferKind = 'assemble' | 'pour';
export type SandTransferGrain = Readonly<{
  homeX: number; homeY: number; startX: number; startY: number;
  impactX: number; impactY: number; color: number;
  depart: number; mouth: number; land: number; settle: number;
}>;
export type AssemblyGrain = SandTransferGrain & Readonly<{
  capacity: number; across: number; layer: number;
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
  departureTimes: readonly number[];
  mouthTimes: readonly number[];
  landingTimes: readonly number[];
  settledAt: number;
}>;
export type AssemblyPlan = Extract<SandTransferPlan, { kind: 'assemble' }>;
export type AssemblySample = Readonly<{
  progress: number; discharged: number; source: number; external: number; airborne: number; settled: number;
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

const bankSlope = 428 * Math.cos(assemblyTilt) / (716 * Math.sin(assemblyTilt));
const assemblyStart = 0.22;
const assemblyDrain = 0.59;

function bankCapacity(reach: number): number {
  if (reach <= 1) return reach * reach / (2 * bankSlope);
  if (reach <= bankSlope) return (reach - 0.5) / bankSlope;
  return 1 - (1 + bankSlope - reach) ** 2 / (2 * bankSlope);
}

function bankReach(capacity: number): number {
  if (capacity <= 1 / (2 * bankSlope)) return Math.sqrt(2 * bankSlope * capacity);
  if (capacity <= 1 - 1 / (2 * bankSlope)) return bankSlope * capacity + 0.5;
  return 1 + bankSlope - Math.sqrt(2 * bankSlope * (1 - capacity));
}

function crossed(times: readonly number[], progress: number): number {
  let first = 0;
  let last = times.length;
  while (first < last) {
    const middle = (first + last) >>> 1;
    if (times[middle] <= progress) first = middle + 1;
    else last = middle;
  }
  return times.length ? first / times.length : 0;
}

export function sampleAssembly(plan: AssemblyPlan, progress: number): AssemblySample {
  const departed = crossed(plan.departureTimes, progress);
  const entered = crossed(plan.mouthTimes, progress);
  const settled = crossed(plan.landingTimes, progress);
  return { progress, discharged: unit((progress - assemblyStart) / assemblyDrain), source: 1 - departed, external: departed - entered, airborne: entered - settled, settled };
}

export function assemblyPosition(route: AssemblyGrain, sample: AssemblySample): SandPoint {
  if (sample.discharged === 0) return { x: route.startX, y: route.startY };
  if (sample.progress >= route.depart) return assemblyOutlet;
  const reach = bankReach(Math.max(0, route.capacity - sample.discharged));
  const minimum = Math.max(0, reach - bankSlope);
  const maximum = Math.min(1, reach);
  const u = minimum + route.across * (maximum - minimum);
  const v = (reach - u) / bankSlope;
  return { x: (717 - 716 * u) / 720, y: (429 - 428 * v) / 432 };
}

function createAssemblyPlan(source: readonly GrainSource[]): AssemblyPlan {
  const routes = source.map((grain) => {
    const x = Math.max(1, Math.min(717, grain.x));
    const y = Math.max(1, Math.min(429, grain.y));
    const u = (717 - x) / 716;
    const v = (429 - y) / 428;
    const reach = u + bankSlope * v;
    const minimum = Math.max(0, reach - bankSlope);
    const width = Math.min(1, reach) - minimum;
    const capacity = bankCapacity(reach);
    const depart = assemblyStart + assemblyDrain * capacity;
    const mouth = depart + 0.015;
    const land = mouth + 0.045 - 0.02 * capacity;
    return { homeX: grain.hx / 720, homeY: grain.hy / 432, startX: x / 720, startY: y / 432, capacity, across: width > 0 ? unit((u - minimum) / width) : 0.5, impactX: 0, impactY: 0, color: grain.color, depart, mouth, land, settle: land + 0.01, layer: 0 };
  });
  const arrival = routes.map((route, index) => ({ time: route.land, index })).sort((a, b) => a.time - b.time);
  arrival.forEach((route, order) => { routes[route.index].layer = (order + 0.5) / routes.length; });
  return { kind: 'assemble', grains: routes, samples: routes.filter((_, index) => index % 3 === 0), departureTimes: routes.map(grain => grain.depart).sort((a, b) => a - b), mouthTimes: routes.map(grain => grain.mouth).sort((a, b) => a - b), landingTimes: arrival.map(route => route.time), settledAt: 0.875 };
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
  return plan.kind === 'assemble' ? sampleAssembly(plan, progress).settled : 1 - crossed(plan.mouthTimes, progress);
}
