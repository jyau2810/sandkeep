import { test, expect } from '@playwright/test';
import { createTransferPlan, pourDeposit } from '../src/sand-motion';

test('pouring reaches the top edge without a late fill strip or long position correction', () => {
  const source = Array.from({length: 3000}, (_, i) => ({x: 2 + i % 100 * 7.15, y: 2 + Math.floor(i / 100) * 14.7, hx: 2 + i % 100 * 7.15, hy: 2 + Math.floor(i / 100) * 14.7, color: 0}));
  const plan = createTransferPlan('pour', source);
  if (plan.kind !== 'pour') throw Error('Wrong plan');
  const top = plan.grains.filter(g => g.homeY < .02);
  expect(top.filter(g => g.impactY < .02).length / top.length).toBeGreaterThan(.95);
  for (const g of plan.grains) {
    expect(Math.hypot((g.impactX-g.homeX)*720,(g.impactY-g.homeY)*432)).toBeLessThan(6);
    expect(pourDeposit(g,1).x).toBeCloseTo(g.homeX, 12);
    expect(pourDeposit(g,1).y).toBeCloseTo(g.homeY, 12);
    expect(g.settle).toBeLessThan(.98);
  }
});
