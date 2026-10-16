export type SandTransferKind = 'assemble' | 'pour';
export type SandTransferGrain = Readonly<{
  homeX: number; homeY: number; startX: number; startY: number;
  impactX: number; impactY: number; color: number;
  depart: number; mouth: number; land: number; settle: number;
}>;
export type PourGrain = SandTransferGrain & Readonly<{
  launch: number; drift: number; entry: number; rest: number; slip: number;
}>;
export type AssemblyGrain = SandTransferGrain & Readonly<{
  capacity: number; across: number; layer: number;
}>;
export type SandTransferPlan = Readonly<{
  kind: 'pour';
  grains: readonly PourGrain[];
  samples: readonly PourGrain[];
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

export const pourSweepX = (progress: number): number => 0.14 + 0.72 * eased((progress - 0.08) / 0.67);

export function pourFlight(route: PourGrain, progress: number): SandPoint {
  const t = unit(progress);
  return { x: route.launch * (1 - t) + route.drift * t * (1 - t), y: t * (route.entry + (1 - route.entry) * t) };
}

export function pourDeposit(route: PourGrain, progress: number): SandPoint {
  const t = unit((progress - route.land - route.rest) / (route.settle - route.land - route.rest));
  const firstEnd = 0.25 + route.slip * 0.1;
  const secondStart = 0.4 + route.slip * 0.12;
  const roll = 0.35 * eased(t / firstEnd) + 0.65 * eased((t - secondStart) / (1 - secondStart));
  return {
    x: route.impactX + (route.homeX - route.impactX) * roll,
    y: route.impactY + (route.homeY - route.impactY) * roll + Math.sin(t * Math.PI) * 0.002,
  };
}

export function createTransferPlan(kind: SandTransferKind, source: readonly GrainSource[]): SandTransferPlan {
  if (kind === 'assemble') return createAssemblyPlan(source);
  const grains = source.map((grain, index): PourGrain => {
    const homeX = grain.hx / 720;
    const homeY = grain.hy / 432;
    // Follow the moving mouth continuously. Coarse release packets used to leave
    // vertical seams, while a downward landing bias left an empty top strip.
    const reach = unit((homeX - 0.14) / 0.72);
    let low = 0, high = 1;
    for (let iteration = 0; iteration < 12; iteration++) {
      const middle = (low + high) * 0.5;
      if (eased(middle) < reach) low = middle;
      else high = middle;
    }
    const sweepTime = 0.08 + 0.67 * (low + high) * 0.5;
    const mouth = Math.max(0.08, Math.min(0.77, sweepTime
      + Math.sin(homeY * 17 + homeX * 24) * 0.012
      + (sandNoise(index + 317) - 0.5) * 0.035));
    const depart = mouth - 0.065 - sandNoise(index + 719) * 0.018;
    const scatter = 0.004 + sandNoise(index + 839) * 0.008;
    const impactX = Math.max(0.002, Math.min(0.998, homeX + (sandNoise(index + 79) - 0.5) * scatter));
    const impactY = Math.max(0.002, Math.min(0.998, homeY + (sandNoise(index + 131) - 0.5) * scatter));
    const land = mouth + 0.065 + Math.sqrt(impactY) * 0.045 + sandNoise(index + 419) * 0.008;
    const rest = 0.004 + sandNoise(index + 929) * 0.008;
    const settle = Math.min(0.98, land + rest + 0.035 + sandNoise(index + 557) * 0.025);
    return {
      homeX, homeY, startX: grain.x / 720, startY: grain.y / 432,
      impactX, impactY, color: grain.color, depart, mouth, land, settle,
      launch: (sandNoise(index + 223) - 0.5) * 0.006,
      drift: (sandNoise(index + 593) - 0.5) * 0.03,
      entry: 0.08 + sandNoise(index + 647) * 0.14,
      rest, slip: sandNoise(index + 883),
    };
  });
  const samples = grains.filter((_, index) => sandNoise(index + 1301) < 0.022);
  return { kind, grains, samples, mouthTimes: grains.map(grain => grain.mouth).sort((a, b) => a - b), settledAt: 1 };
}

export function bottleMass(plan: SandTransferPlan, progress: number): number {
  return plan.kind === 'assemble' ? sampleAssembly(plan, progress).settled : 1 - crossed(plan.mouthTimes, progress);
}
