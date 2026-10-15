export type SandTransferKind = 'assemble' | 'pour';
export type SandTransferGrain = Readonly<{
  homeX: number; homeY: number; startX: number; startY: number;
  impactX: number; impactY: number; color: number;
  depart: number; mouth: number; land: number; settle: number;
}>;
export type SandTransferPlan = Readonly<{
  kind: SandTransferKind;
  grains: readonly SandTransferGrain[];
  samples: readonly SandTransferGrain[];
  mouthTimes: readonly number[];
}>;
export type GrainSource = Readonly<{ x: number; y: number; hx: number; hy: number; color: number }>;

export const sandNoise = (seed: number): number => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
export const unit = (value: number): number => Math.max(0, Math.min(1, value));
export const eased = (value: number): number => { const t = unit(value); return t * t * (3 - 2 * t); };

export function createTransferPlan(kind: SandTransferKind, source: readonly GrainSource[]): SandTransferPlan {
  const grains = source.map((grain, index): SandTransferGrain => {
    const homeX = grain.hx / 720;
    const homeY = grain.hy / 432;
    const order = unit(((1 - homeY) + 0.84 * Math.abs(homeX - 0.5)) / 1.42 + (sandNoise(index + 51) - 0.5) * 0.018);
    const depart = 0.015 + order * 0.61;
    const mouth = depart + (kind === 'pour' ? 0.095 : 0.16);
    const land = mouth + (kind === 'pour' ? 0.145 : 0.115);
    return {
      homeX, homeY, startX: grain.x / 720, startY: grain.y / 432,
      impactX: 0.5 + (sandNoise(index + 79) - 0.5) * 0.02,
      impactY: Math.min(homeY, unit(1 - order * 1.42 - sandNoise(index + 131) * 0.008)),
      color: grain.color, depart, mouth, land, settle: land + (kind === 'pour' ? 0.105 : 0.045),
    };
  });
  const samples = grains.filter((_, index) => index % 12 === 0);
  return { kind, grains, samples, mouthTimes: grains.map(grain => grain.mouth).sort((a, b) => a - b) };
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
