import * as THREE from 'three';
import { bottleMass, sampleAssembly, sandNoise, unit, type SandTransferPlan } from './sand-motion';

type Reservoir = {
  object: THREE.Group;
  draw(plan: SandTransferPlan, progress: number, tip: number, viewport: number): void;
  reset(): void;
  dispose(): void;
};
type PackedSurface = Readonly<{
  mantle: THREE.Mesh<THREE.LatheGeometry, THREE.MeshStandardMaterial>;
  cap: THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial>;
  bottom: number; top: number;
}>;
type Particle = Readonly<{ routeIndex: number; x: number; y: number; z: number; noise: number }>;

export function createSandReservoir(source: HTMLCanvasElement, radiusAt: (y: number) => number, packed: PackedSurface): Reservoir {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.ShaderMaterial({
    uniforms: { viewport: { value: 460 }, pointLimits: { value: new THREE.Vector2(1.35, 4.8) } },
    vertexColors: true,
    vertexShader: `
      attribute float grainSize;
      uniform float viewport;
      uniform vec2 pointLimits;
      varying vec3 mineral;
      void main() {
        mineral = color;
        vec4 point = modelViewMatrix * vec4(position, 1.0);
        float scale = length(modelMatrix[0].xyz);
        gl_PointSize = clamp(grainSize * 0.023 * viewport * scale / -point.z, pointLimits.x, pointLimits.y);
        gl_Position = projectionMatrix * point;
      }
    `,
    fragmentShader: `
      varying vec3 mineral;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        if (dot(p, p) > 0.97 || abs(p.x + p.y * 0.3) > 0.94) discard;
        float facet = 0.83 + (1.0 - p.x - p.y) * 0.12;
        gl_FragColor = vec4(mineral * facet, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const object = new THREE.Group();
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 1;
  object.visible = false;
  const fillMaterial = packed.mantle.material.clone();
  const capMaterial = packed.cap.material.clone();
  const fillPlane = new THREE.Plane();
  fillMaterial.clippingPlanes = [fillPlane];
  const fill = new THREE.Mesh(packed.mantle.geometry, fillMaterial);
  fill.rotation.copy(packed.mantle.rotation);
  fill.castShadow = packed.mantle.castShadow;
  fill.receiveShadow = packed.mantle.receiveShadow;
  const pile = { value: new THREE.Vector4(packed.bottom, radiusAt(packed.bottom), 0, 0) };
  const moundBoundary = `
    float reach = length(assemblyPosition.xz) / max(assemblyPile.y, 0.001);
    float slope = max(0.0, 1.0 - reach);
    float ripple = sin(reach * 24.0 - assemblyPile.w) * sin(reach * 9.0 + assemblyPile.w * 0.7)
      * reach * slope * assemblyPile.z * 0.06;
    if (assemblyPosition.y > assemblyPile.x + assemblyPile.z * slope + ripple + 0.0001) discard;
  `;
  function bindBoundary(target: THREE.Material): void {
    target.onBeforeCompile = shader => {
      shader.uniforms.assemblyPile = pile;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 assemblyPosition;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nassemblyPosition = position;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 assemblyPosition;\nuniform vec4 assemblyPile;')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${moundBoundary}`);
    };
    target.customProgramCacheKey = () => 'assembly-pile-boundary-v1';
  }
  bindBoundary(fillMaterial);
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, clippingPlanes: [fillPlane], clipShadows: true });
  bindBoundary(depthMaterial);
  fill.customDepthMaterial = depthMaterial;
  const rings = 24;
  const sectors = 96;
  const capGeometry = new THREE.BufferGeometry();
  const capPositions = new Float32Array((rings + 1) * (sectors + 1) * 3);
  const capUvs = new Float32Array((rings + 1) * (sectors + 1) * 2);
  const capIndices: number[] = [];
  for (let ring = 0; ring <= rings; ring++) for (let sector = 0; sector <= sectors; sector++) {
    const angle = sector / sectors * Math.PI * 2;
    const index = ring * (sectors + 1) + sector;
    capUvs[index * 2] = 0.5 + Math.cos(angle) * ring / rings * 0.5;
    capUvs[index * 2 + 1] = 0.5 - Math.sin(angle) * ring / rings * 0.5;
    if (ring < rings && sector < sectors) {
      const outer = index + sectors + 1;
      capIndices.push(index, outer + 1, outer, index, index + 1, outer + 1);
    }
  }
  capGeometry.setAttribute('position', new THREE.BufferAttribute(capPositions, 3).setUsage(THREE.DynamicDrawUsage));
  capGeometry.setAttribute('uv', new THREE.BufferAttribute(capUvs, 2));
  capGeometry.setIndex(capIndices);
  const cap = new THREE.Mesh(capGeometry, capMaterial);
  cap.receiveShadow = packed.cap.receiveShadow;
  cap.frustumCulled = false;
  fill.visible = cap.visible = false;
  object.add(points, fill, cap);
  const volumes = [0];
  const levels = 1024;
  const step = (packed.top - packed.bottom) / levels;
  for (let index = 1; index <= levels; index++) {
    const previous = radiusAt(packed.bottom + (index - 1) * step);
    const current = radiusAt(packed.bottom + index * step);
    volumes.push(volumes[index - 1] + (previous * previous + current * current) * step * 0.5);
  }
  const totalVolume = volumes[levels];
  function volumeAt(y: number): number {
    const offset = unit((y - packed.bottom) / (packed.top - packed.bottom)) * levels;
    const index = Math.min(levels - 1, Math.floor(offset));
    return THREE.MathUtils.lerp(volumes[index], volumes[index + 1], offset - index);
  }
  function heightForMass(mass: number): number {
    const target = unit(mass) * totalVolume;
    let low = 0, high = levels;
    while (low + 1 < high) {
      const middle = (low + high) >>> 1;
      if (volumes[middle] <= target) low = middle;
      else high = middle;
    }
    return packed.bottom + (low + (target - volumes[low]) / (volumes[high] - volumes[low])) * step;
  }
  function surfaceHeight(x: number, z: number): number {
    const reach = Math.hypot(x, z) / Math.max(pile.value.y, 0.001);
    const slope = Math.max(0, 1 - reach);
    const ripple = Math.sin(reach * 24 - pile.value.w) * Math.sin(reach * 9 + pile.value.w * 0.7)
      * reach * slope * pile.value.z * 0.06;
    return pile.value.x + pile.value.z * slope + ripple;
  }
  function drawPacked(mass: number, progress: number): void {
    fill.visible = cap.visible = mass > 0;
    if (!mass) { pile.value.set(packed.bottom, radiusAt(packed.bottom), 0, progress * 72); return; }
    const nominal = heightForMass(mass);
    const amplitude = Math.min(0.15, (nominal - packed.bottom) * 0.6) * unit((1 - mass) / 0.1);
    let low = packed.bottom, high = nominal;
    for (let iteration = 0; iteration < 14; iteration++) {
      const middle = (low + high) * 0.5;
      const r = radiusAt(middle);
      if (volumeAt(middle) + r * r * amplitude / 3 < mass * totalVolume) low = middle;
      else high = middle;
    }
    const level = mass === 1 ? packed.top : (low + high) * 0.5;
    const r = radiusAt(level);
    pile.value.set(level, r, amplitude, progress * 72);
    fillPlane.normal.set(0, -1, 0);
    fillPlane.constant = level + amplitude + 0.001;
    fillPlane.applyMatrix4(fill.matrixWorld);
    for (let ring = 0; ring <= rings; ring++) for (let sector = 0; sector <= sectors; sector++) {
      const angle = sector / sectors * Math.PI * 2;
      const reach = ring / rings * r;
      const x = Math.cos(angle) * reach;
      const z = Math.sin(angle) * reach;
      const index = (ring * (sectors + 1) + sector) * 3;
      capPositions[index] = x;
      capPositions[index + 1] = surfaceHeight(x, z);
      capPositions[index + 2] = z;
    }
    capGeometry.getAttribute('position').needsUpdate = true;
    capGeometry.computeVertexNormals();
  }
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  const data = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, sourceWidth, sourceHeight).data;
  const gravity = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const color = new THREE.Color();
  let held: SandTransferPlan | null = null;
  let particles: Particle[] = [];
  let positions = new Float32Array(0);
  let gravityHeights = new Float32Array(0);

  function prepare(plan: SandTransferPlan): void {
    held = plan;
    particles = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    for (let index = 0; index < plan.grains.length; index += 3) {
      const noise = sandNoise(index + 843);
      const layer = plan.kind === 'assemble' ? plan.grains[index].layer : sandNoise(index + 199);
      const y = heightForMass(layer);
      const around = sandNoise(index + 53);
      const angle = around * Math.PI * 2;
      const radial = noise < 0.66 ? 0.993 - sandNoise(index + 19) * 0.026 : Math.sqrt(sandNoise(index + 29)) * 0.96;
      const r = radiusAt(y) * radial;
      particles.push({ routeIndex: index, x: -Math.sin(angle) * r, y, z: -Math.cos(angle) * r, noise });
      let red = 189, green = 161, blue = 122;
      if (plan.kind === 'pour' && y <= 1.20 && y >= -1.49) {
        const px = Math.min(sourceWidth - 1, (around * sourceWidth) | 0);
        const py = Math.min(sourceHeight - 1, ((1.20 - y) / 2.69 * sourceHeight) | 0);
        const offset = (py * sourceWidth + px) * 4;
        const lum = (data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722) / 255;
        const t = unit((lum - 0.08) * 1.16);
        red = 49 + 196 * t; green = 31 + 161 * t; blue = 19 + 111 * t;
      }
      if (plan.kind === 'assemble') {
        const mineral = plan.grains[index].color;
        red = mineral & 255;
        green = (mineral >>> 8) & 255;
        blue = (mineral >>> 16) & 255;
      }
      const shade = 0.82 + sandNoise(index + 37) * 0.31;
      color.setRGB(red * shade / 255, green * shade / 255, blue * shade / 255, THREE.SRGBColorSpace);
      colors.push(color.r, color.g, color.b);
      sizes.push(0.83 + sandNoise(index + 71) * 0.5);
    }
    gravityHeights = new Float32Array(particles.length);
    if (positions.length !== particles.length * 3) {
      positions = new Float32Array(particles.length * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('grainSize', new THREE.Float32BufferAttribute(sizes, 1));
    } else {
      const colorAttribute = geometry.getAttribute('color');
      (colorAttribute.array as Float32Array).set(colors);
      colorAttribute.needsUpdate = true;
    }
  }

  return {
    object,
    draw(plan, progress, tip, viewport): void {
      if (held !== plan) prepare(plan);
      object.visible = true;
      material.uniforms.viewport.value = viewport;
      object.getWorldQuaternion(quaternion);
      gravity.set(0, -1, 0).applyQuaternion(quaternion.invert());
      const assembly = plan.kind === 'assemble' ? sampleAssembly(plan, progress) : null;
      const mass = assembly ? assembly.settled : bottleMass(plan, progress);
      material.uniforms.pointLimits.value.set(assembly ? 0.45 : 1.35, assembly ? 1.2 : 4.8);
      if (assembly) drawPacked(mass, progress);
      else fill.visible = cap.visible = false;
      // Keep the remaining sand on the downward side of the tilted vessel.
      // Compressing in bottle-local Y left an unsupported diagonal block.
      let surface = Infinity;
      if (!assembly) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          gravityHeights[i] = -(p.x * gravity.x + p.y * gravity.y + p.z * gravity.z);
        }
        gravityHeights.sort();
        const count = Math.floor(mass * particles.length);
        surface = count === 0 ? -Infinity : gravityHeights[Math.min(count - 1, particles.length - 1)];
      }
      for (let index = 0; index < particles.length; index++) {
        const particle = particles[index];
        const route = plan.grains[particle.routeIndex];
        let x = particle.x;
        let y = particle.y;
        let z = particle.z;
        if (plan.kind === 'pour') {
          const elevation = -(x * gravity.x + y * gravity.y + z * gravity.z);
          if (elevation > surface + 0.000001) { positions[index * 3 + 1] = 10000; continue; }
          // A thin, mobile surface layer settles downward; the bed stays packed
          // against the lower glass instead of shrinking toward the bottle axis.
          const mobile = unit(1 - (surface - elevation) / 0.16) * tip;
          const slip = (0.5 + 0.5 * Math.sin(progress * 38 + particle.noise * 97)) * 0.025 * mobile;
          x += gravity.x * slip;
          y += gravity.y * slip;
          z += gravity.z * slip;
        } else {
          if (progress < route.mouth || progress >= route.land) { positions[index * 3 + 1] = 10000; continue; }
          const fall = unit((progress - route.mouth) / (route.land - route.mouth));
          const spread = fall * fall * 0.13;
          x = Math.sin(particle.noise * 79) * pile.value.y * spread;
          z = Math.cos(particle.noise * 53) * pile.value.y * spread;
          y = 2.22 + (surfaceHeight(x, z) - 2.22) * fall * fall;
        }
        y = Math.max(-1.53, Math.min(2.22, y));
        const radial = Math.hypot(x, z);
        const limit = y > 2.1 ? 0.405 : radiusAt(y) * 0.996;
        if (radial > limit) { x *= limit / radial; z *= limit / radial; }
        positions[index * 3] = x;
        positions[index * 3 + 1] = y;
        positions[index * 3 + 2] = z;
      }
      geometry.getAttribute('position').needsUpdate = true;
    },
    reset(): void { object.visible = false; held = null; },
    dispose(): void {
      object.removeFromParent();
      geometry.dispose();
      material.dispose();
      fillMaterial.dispose();
      capMaterial.dispose();
      depthMaterial.dispose();
      capGeometry.dispose();
      particles = [];
      held = null;
    },
  };
}
