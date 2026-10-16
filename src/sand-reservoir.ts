import * as THREE from 'three';
import { bottleMass, eased, sandNoise, unit, type SandTransferPlan } from './sand-motion';

type Reservoir = {
  object: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  draw(plan: SandTransferPlan, progress: number, tip: number, viewport: number): void;
  reset(): void;
  dispose(): void;
};
type Particle = Readonly<{ routeIndex: number; x: number; y: number; z: number; noise: number }>;

export function createSandReservoir(source: HTMLCanvasElement, radiusAt: (y: number) => number): Reservoir {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.ShaderMaterial({
    uniforms: { viewport: { value: 460 } },
    vertexColors: true,
    vertexShader: `
      attribute float grainSize;
      uniform float viewport;
      varying vec3 mineral;
      void main() {
        mineral = color;
        vec4 point = modelViewMatrix * vec4(position, 1.0);
        float scale = length(modelMatrix[0].xyz);
        gl_PointSize = clamp(grainSize * 0.023 * viewport * scale / -point.z, 1.35, 4.8);
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
  const object = new THREE.Points(geometry, material);
  object.visible = false;
  object.frustumCulled = false;
  object.renderOrder = 1;
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  const data = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, sourceWidth, sourceHeight).data;
  const gravity = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const color = new THREE.Color();
  let held: SandTransferPlan | null = null;
  let particles: Particle[] = [];
  let positions = new Float32Array(0);

  function prepare(plan: SandTransferPlan): void {
    held = plan;
    particles = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    for (let index = 0; index < plan.grains.length; index += 3) {
      const noise = sandNoise(index + 843);
      const layer = plan.kind === 'assemble' ? plan.grains[index].layer : sandNoise(index + 199);
      const y = -1.535 + layer * 3.635;
      const around = sandNoise(index + 53);
      const angle = around * Math.PI * 2;
      const radial = noise < 0.66 ? 0.993 - sandNoise(index + 19) * 0.026 : Math.sqrt(sandNoise(index + 29)) * 0.96;
      const r = radiusAt(y) * radial;
      particles.push({ routeIndex: index, x: -Math.sin(angle) * r, y, z: -Math.cos(angle) * r, noise });
      let red = 189, green = 161, blue = 122;
      if (y <= 1.20 && y >= -1.49) {
        const px = Math.min(sourceWidth - 1, (around * sourceWidth) | 0);
        const py = Math.min(sourceHeight - 1, ((1.20 - y) / 2.69 * sourceHeight) | 0);
        const offset = (py * sourceWidth + px) * 4;
        const lum = (data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722) / 255;
        const t = unit((lum - 0.08) * 1.16);
        red = 49 + 196 * t; green = 31 + 161 * t; blue = 19 + 111 * t;
      }
      const shade = 0.82 + sandNoise(index + 37) * 0.31;
      color.setRGB(red * shade / 255, green * shade / 255, blue * shade / 255, THREE.SRGBColorSpace);
      colors.push(color.r, color.g, color.b);
      sizes.push(0.83 + sandNoise(index + 71) * 0.5);
    }
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
      const mass = bottleMass(plan, progress);
      const lost = 1 - mass;
      const compression = Math.pow(Math.max(0.0001, mass), 0.30);
      for (let index = 0; index < particles.length; index++) {
        const particle = particles[index];
        const route = plan.grains[particle.routeIndex];
        let x = particle.x;
        let y = particle.y;
        let z = particle.z;
        if (plan.kind === 'pour') {
          if (progress >= route.mouth) { positions[index * 3 + 1] = 10000; continue; }
          const slump = tip * 0.13 + lost * 0.55;
          x = x * compression + gravity.x * slump;
          y = -1.535 + (y + 1.535) * compression + lost * 1.86 + Math.max(0, gravity.y) * tip * 0.12;
          z = z * compression + gravity.z * slump;
          const slide = eased((progress - route.depart) / (route.mouth - route.depart));
          const jitter = Math.sin(progress * 33 + particle.noise * 97) * 0.014 * tip;
          x = x * (1 - slide) + jitter;
          z = z * (1 - slide) + jitter * 0.6;
          y += (2.22 - y) * slide;
        } else {
          if (progress <= route.mouth) { positions[index * 3 + 1] = 10000; continue; }
          const fall = unit((progress - route.mouth) / (route.land - route.mouth));
          const spread = eased((fall - 0.22) / 0.78);
          const mound = (1 - Math.hypot(x, z)) * 0.13 * (1 - mass);
          x *= spread;
          z *= spread;
          y = 2.22 + (y + mound - 2.22) * fall * fall;
          const settle = unit((progress - route.land) / (route.settle - route.land));
          x += Math.sin(settle * Math.PI * 2 + particle.noise * 9) * (1 - settle) * 0.02;
          z += Math.cos(settle * Math.PI + particle.noise * 9) * (1 - settle) * 0.02;
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
    dispose(): void { object.removeFromParent(); geometry.dispose(); material.dispose(); particles = []; held = null; },
  };
}
