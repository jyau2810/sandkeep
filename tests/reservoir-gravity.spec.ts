import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import { createSandReservoir } from '../src/sand-reservoir';
import { createTransferPlan, bottleMass } from '../src/sand-motion';

test('pouring grains travel along the vessel and leave only through the mouth', () => {
  const source = { width: 1, height: 1, getContext: () => ({ getImageData: () => ({ data: new Uint8ClampedArray([180, 140, 90, 255]) }) }) } as unknown as HTMLCanvasElement;
  const mantle = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(1, -1.535), new THREE.Vector2(1, 2.1)]), new THREE.MeshStandardMaterial());
  const cap = new THREE.Mesh(new THREE.CircleGeometry(1), new THREE.MeshStandardMaterial());
  const reservoir = createSandReservoir(source, () => 1, { mantle, cap, bottom: -1.535, top: 2.1 });
  const parent = new THREE.Group(); parent.add(reservoir.object);
  const grains = Array.from({ length: 6000 }, (_, i) => ({ x: i % 100 * 7.2, y: Math.floor(i / 100) * 7.2, hx: i % 100 * 7.2, hy: Math.floor(i / 100) * 7.2, color: 0 }));
  const plan = createTransferPlan('pour', grains);
  const points = reservoir.object.children.find(child => child instanceof THREE.Points) as THREE.Points;
  for (const yaw of [0, 0.8, -1.5]) {
    parent.rotation.set(0.12, yaw, 124 * Math.PI / 180); parent.updateMatrixWorld(true);
    reservoir.draw(plan, 0, 1, 900);
    let previous = Array.from(points.geometry.getAttribute('position').array);
    let departed = 0, travelled = 0, minimumExit = Infinity, maximumExitRadius = 0, maximumRadius = 0, massError = 0;
    for (let step = 1; step <= 820; step++) {
      const progress = step / 1000;
      reservoir.draw(plan, progress, 1, 900);
      const current = points.geometry.getAttribute('position');
      let count = 0;
      for (let i = 0; i < current.count; i++) {
        if (current.getY(i) > 100) {
          if (previous[i*3+1] < 100) {
            // No grain may disappear from the bed or mid-wall.
            minimumExit = Math.min(minimumExit, previous[i*3+1]);
            maximumExitRadius = Math.max(maximumExitRadius, Math.hypot(previous[i*3], previous[i*3+2]));
            departed++;
          }
        } else {
          count++;
          maximumRadius = Math.max(maximumRadius, Math.hypot(current.getX(i), current.getZ(i)));
          if (current.getY(i) - previous[i*3+1] > 0.001) travelled++;
        }
      }
      massError = Math.max(massError, Math.abs(count / current.count - bottleMass(plan, progress)));
      previous = Array.from(current.array);
    }
    expect(minimumExit).toBeGreaterThan(2.16);
    expect(maximumExitRadius).toBeLessThan(0.05);
    expect(maximumRadius).toBeLessThanOrEqual(1);
    expect(massError).toBeLessThan(0.015);
    expect(departed).toBe(points.geometry.getAttribute('position').count);
    expect(travelled).toBeGreaterThan(departed * 20);
  }
  reservoir.dispose(); mantle.geometry.dispose(); mantle.material.dispose(); cap.geometry.dispose(); cap.material.dispose();
});
