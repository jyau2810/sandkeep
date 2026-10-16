import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import { createSandReservoir } from '../src/sand-reservoir';
import { createTransferPlan, bottleMass } from '../src/sand-motion';

test('remaining pouring grains occupy the gravity-low side at different bottle orientations', () => {
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
    const initial = Array.from(points.geometry.getAttribute('position').array);
    const worldY = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(reservoir.object.matrixWorld).y;
    for (const progress of [0.25, 0.55, 0.8]) {
      reservoir.draw(plan, progress, 1, 900);
      const current = points.geometry.getAttribute('position');
      let highestRemaining = -Infinity, lowestRemoved = Infinity, count = 0;
      for (let i = 0; i < current.count; i++) {
        if (current.getY(i) > 100) lowestRemoved = Math.min(lowestRemoved, worldY(initial[i*3], initial[i*3+1], initial[i*3+2]));
        else { count++; highestRemaining = Math.max(highestRemaining, worldY(current.getX(i), current.getY(i), current.getZ(i))); }
      }
      expect(Math.abs(count / current.count - bottleMass(plan, progress))).toBeLessThan(0.001);
      expect(highestRemaining).toBeLessThanOrEqual(lowestRemoved + 0.03);
    }
  }
  reservoir.dispose(); mantle.geometry.dispose(); mantle.material.dispose(); cap.geometry.dispose(); cap.material.dispose();
});
