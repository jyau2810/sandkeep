import * as THREE from 'three';
import type { AppIssue, BottleDraft, LooseTool, Presentation, SceneResult } from './domain';
import { createLooseSand, type LooseSand } from './loose-sand';
import { createSandStream } from './sand-transfer';
import { createSandReservoir } from './sand-reservoir';
import { assemblyTilt, pourSweepX, type FrameProjection, type SandPoint, type SandTransferKind, type SandTransferPlan } from './sand-motion';

export interface BottleScene {
  show(draft: BottleDraft, mode: Presentation, signal?: AbortSignal): Promise<SceneResult>;
  assemble(signal?: AbortSignal): Promise<SceneResult>;
  disassemble(signal?: AbortSignal): Promise<SceneResult>;
  turnBy(radians: number, vertical?: number): void;
  resetView(): void;
  getDraft(): BottleDraft | null;
  setLooseTool(tool: LooseTool): void;
  setBrushRadius(radius: number): void;
  setSprinkleDensity(value: number): void;
  restoreLoose(): void;
  dispose(): void;
}

type Options = { reducedMotion: boolean; onFault(issue: AppIssue): void };
type Content = {
  draft: BottleDraft;
  loose: LooseSand;
  mantle: THREE.Mesh<THREE.LatheGeometry, THREE.MeshStandardMaterial>;
  cap: THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial>;
  fillPlane: THREE.Plane;
  reservoir: ReturnType<typeof createSandReservoir>;
  source: HTMLCanvasElement;
  group: THREE.Group;
};
type Transfer = {
  kind: SandTransferKind;
  sourceYaw: number;
  sourceOrientation: THREE.Quaternion;
  sourcePosition: THREE.Vector3;
  sourceMouth: THREE.Vector3;
  plan: SandTransferPlan;
  started: number;
  promise: Promise<SceneResult>;
  resolve: (result: SceneResult) => void;
  timeout: ReturnType<typeof setTimeout>;
  signal?: AbortSignal;
  abort: () => void;
};
type Gesture = { id: number; lastX: number; lastY: number; startY: number; tilting: boolean };

const radius = 0.966;
const bottom = -1.49;
const top = 1.20;
const bandHeight = top - bottom;
const sandBase = -1.535;
const fillTop = 2.10;
const sandProfile = [
  [0, sandBase], [0.69, sandBase], [0.895, -1.506], [0.953, -1.43],
  [0.963, -1.31], [radius, 1.20], [0.960, 1.35], [0.925, 1.52],
  [0.805, 1.68], [0.626, 1.84], [0.463, 1.98], [0.425, 2.05], [0.422, fillTop],
] as const;
const transferDuration = { assemble: 4000, pour: 2900 } as const;

function randomAt(seed: number): number {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function corkTexture(): THREE.CanvasTexture {
  const canvas = makeCanvas(128, 128);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#bd9567';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1800; i++) {
    const x = randomAt(i + 7) * 128;
    const y = randomAt(i + 93) * 128;
    const w = 0.5 + randomAt(i + 71) * 2.6;
    const light = randomAt(i + 3) > 0.49;
    ctx.fillStyle = light ? `rgba(247,224,180,${0.05 + randomAt(i) * 0.21})` : `rgba(65,39,20,${0.06 + randomAt(i) * 0.22})`;
    ctx.fillRect(x, y, w * 1.7, w * 0.7);
  }
  for (let i = 0; i < 160; i++) {
    const x = randomAt(i + 73) * 128;
    const y = randomAt(i + 911) * 128;
    const w = 0.7 + Math.pow(randomAt(i + 103), 3) * 9;
    const h = 0.4 + randomAt(i + 51) * 2.5;
    ctx.fillStyle = 'rgba(60,34,16,.43)';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, randomAt(i) * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(250,219,171,.3)';
    ctx.fillRect(x - w, y + h, w * 1.5, 0.6);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function photoCanvas(image: CanvasImageSource, width: number, height: number, seam = 0): HTMLCanvasElement {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#bda17a';
  ctx.fillRect(0, 0, width, height);
  const source = image as HTMLImageElement | HTMLCanvasElement;
  const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const scale = Math.min(width * (1 - seam) / w, height / h);
  ctx.drawImage(image, (width - w * scale) / 2, (height - h * scale) / 2, w * scale, h * scale);
  return canvas;
}

function packedSandMaterial(source: HTMLCanvasElement | null, draft: BottleDraft): THREE.MeshStandardMaterial {
  type Vertex = [x: number, y: number, height: number];
  type Mineral = [red: number, green: number, blue: number];
  const width = source ? 1536 : 256;
  const height = source ? Math.round(width * (fillTop - sandBase) / (Math.PI * 2 * radius)) : 256;
  const canvas = makeCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.fillStyle = '#bda17a';
  context.fillRect(0, 0, width, height);
  if (source) {
    const photoHeight = Math.round(height * bandHeight / (fillTop - sandBase));
    const photo = photoCanvas(source, width, photoHeight, draft.seamWidth);
    context.drawImage(photo, 0, Math.round(height * (fillTop - top) / (fillTop - sandBase)));
    photo.width = photo.height = 0;
  }
  const photo = context.getImageData(0, 0, width, height);
  const base = context.createImageData(width, height);
  const normalCanvas = makeCanvas(width, height);
  const normalContext = normalCanvas.getContext('2d')!;
  const normals = normalContext.createImageData(width, height);
  let seed = 173;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const sample = (x: number, y: number): Mineral => {
    const index = (Math.max(0, Math.min(height - 1, y | 0)) * width + ((x | 0) % width + width) % width) * 4;
    let r = photo.data[index], g = photo.data[index + 1], b = photo.data[index + 2];
    if (draft.colorMode === 'warm') {
      const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
      const t = Math.max(0, Math.min(1, (lum - 0.08) * 1.16));
      r = 49 + 196 * t;
      g = 31 + 161 * t;
      b = 19 + 111 * t;
    }
    return [r, g, b];
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = (y * width + x) * 4;
    const color = sample(x, y);
    base.data[index] = color[0] * 0.84;
    base.data[index + 1] = color[1] * 0.84;
    base.data[index + 2] = color[2] * 0.84;
    base.data[index + 3] = 255;
    normals.data[index] = normals.data[index + 1] = 128;
    normals.data[index + 2] = normals.data[index + 3] = 255;
  }
  const triangle = (a: Vertex, b: Vertex, c: Vertex, color: Mineral, gain: number) => {
    const ax = a[0], ay = a[1], bx = b[0], by = b[1], cx = c[0], cy = c[1];
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 0.001) return;
    const direction = area < 0 ? -1 : 1;
    const dx0 = (ay - by) * direction, dy0 = (bx - ax) * direction;
    const dx1 = (by - cy) * direction, dy1 = (cx - bx) * direction;
    const dx2 = (cy - ay) * direction, dy2 = (ax - cx) * direction;
    const slopeX = ((b[2] - a[2]) * (cy - ay) - (c[2] - a[2]) * (by - ay)) / area;
    const slopeY = ((bx - ax) * (c[2] - a[2]) - (cx - ax) * (b[2] - a[2])) / area;
    const length = Math.sqrt(slopeX * slopeX + slopeY * slopeY + 1);
    const nx = (1 - slopeX / length) * 127.5;
    const ny = (1 + slopeY / length) * 127.5;
    const nz = (1 + 1 / length) * 127.5;
    const left = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const right = Math.min(width - 1, Math.floor(Math.max(ax, bx, cx)));
    const first = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const last = Math.min(height - 1, Math.floor(Math.max(ay, by, cy)));
    for (let y = first; y <= last; y++) {
      let e0 = ((bx - ax) * (y + 0.25 - ay) - (by - ay) * (left + 0.25 - ax)) * direction;
      let e1 = ((cx - bx) * (y + 0.25 - by) - (cy - by) * (left + 0.25 - bx)) * direction;
      let e2 = ((ax - cx) * (y + 0.25 - cy) - (ay - cy) * (left + 0.25 - cx)) * direction;
      for (let x = left; x <= right; x++, e0 += dx0, e1 += dx1, e2 += dx2) {
        const coverage = (Number(e0 >= 0 && e1 >= 0 && e2 >= 0)
          + Number(e0 + dx0 * 0.5 >= 0 && e1 + dx1 * 0.5 >= 0 && e2 + dx2 * 0.5 >= 0)
          + Number(e0 + dy0 * 0.5 >= 0 && e1 + dy1 * 0.5 >= 0 && e2 + dy2 * 0.5 >= 0)
          + Number(e0 + (dx0 + dy0) * 0.5 >= 0 && e1 + (dx1 + dy1) * 0.5 >= 0 && e2 + (dx2 + dy2) * 0.5 >= 0)) * 0.25;
        if (!coverage) continue;
        const index = (y * width + x) * 4;
        base.data[index] += (color[0] * gain - base.data[index]) * coverage;
        base.data[index + 1] += (color[1] * gain - base.data[index + 1]) * coverage;
        base.data[index + 2] += (color[2] * gain - base.data[index + 2]) * coverage;
        normals.data[index] += (nx - normals.data[index]) * coverage;
        normals.data[index + 1] += (ny - normals.data[index + 1]) * coverage;
        normals.data[index + 2] += (nz - normals.data[index + 2]) * coverage;
      }
    }
  };
  const contact = (hull: Vertex[], color: Mineral) => {
    const offsetX = 0.28, offsetY = 0.4, blur = 0.35;
    const left = Math.max(0, Math.floor(Math.min(...hull.map(point => point[0])) + offsetX - 2));
    const right = Math.min(width - 1, Math.ceil(Math.max(...hull.map(point => point[0])) + offsetX + 2));
    const first = Math.max(0, Math.floor(Math.min(...hull.map(point => point[1])) + offsetY - 2));
    const last = Math.min(height - 1, Math.ceil(Math.max(...hull.map(point => point[1])) + offsetY + 2));
    for (let y = first; y <= last; y++) for (let x = left; x <= right; x++) {
      const px = x + 0.5 - offsetX, py = y + 0.5 - offsetY;
      let inside = false;
      let distanceSquared = Infinity;
      for (let i = 0; i < hull.length; i++) {
        const a = hull[i], b = hull[(i + 1) % hull.length];
        if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
        distanceSquared = Math.min(distanceSquared, (px - a[0] - dx * t) ** 2 + (py - a[1] - dy * t) ** 2);
      }
      const coverage = 0.24 * (inside ? 1 : Math.exp(-distanceSquared / (2 * blur * blur)));
      if (coverage < 0.01) continue;
      const index = (y * width + x) * 4;
      base.data[index] += (color[0] * 0.55 - base.data[index]) * coverage;
      base.data[index + 1] += (color[1] * 0.55 - base.data[index + 1]) * coverage;
      base.data[index + 2] += (color[2] * 0.55 - base.data[index + 2]) * coverage;
    }
  };
  const packing = [
    { pitch: source ? 3.8 : 2.2, minimum: 0.38, variation: 0.24 },
    { pitch: source ? 7.4 : 4.0, minimum: 0.4, variation: 0.28 },
  ];
  for (const { pitch, minimum, variation } of packing) {
    for (let y = -pitch; y < height + pitch; y += pitch) for (let x = -pitch; x < width + pitch; x += pitch) {
      const px = x + (rand() - 0.5) * pitch * 0.76;
      const py = y + (rand() - 0.5) * pitch * 0.76;
      const size = pitch * (minimum + Math.pow(rand(), 0.7) * variation);
      const stretch = 0.92 + rand() * 0.16;
      const rotation = rand() * Math.PI * 2;
      const cosine = Math.cos(rotation), sine = Math.sin(rotation);
      const shade = 0.91 + rand() * 0.22;
      const color = sample(px, py);
      const sides = 5 + Math.floor(rand() * 3);
      const hull: Vertex[] = [];
      const crown: Vertex[] = [];
      const centerLocalX = (rand() - 0.5) * size * 0.2;
      const centerLocalY = (rand() - 0.5) * size * 0.2;
      const centerX = px + centerLocalX * cosine - centerLocalY * sine;
      const centerY = py + centerLocalX * sine + centerLocalY * cosine;
      const peak = size * (0.32 + rand() * 0.12);
      const tiltX = (rand() - 0.5) * 0.44, tiltY = (rand() - 0.5) * 0.44;
      const rimHeight = size * 0.035;
      for (let side = 0; side < sides; side++) {
        const angle = (side + (rand() - 0.5) * 0.26) / sides * Math.PI * 2;
        const reach = size * (0.82 + rand() * 0.22);
        const localX = Math.cos(angle) * reach * stretch;
        const localY = Math.sin(angle) * reach / stretch;
        const ax = px + localX * cosine - localY * sine;
        const ay = py + localX * sine + localY * cosine;
        const inset = 0.48 + rand() * 0.16;
        const bx = centerX + (ax - centerX) * inset;
        const by = centerY + (ay - centerY) * inset;
        hull.push([ax, ay, rimHeight]);
        crown.push([bx, by, peak + (bx - centerX) * tiltX + (by - centerY) * tiltY]);
      }
      contact(hull, color);
      for (let side = 0; side < sides; side++) {
        const next = (side + 1) % sides;
        const a = hull[side], b = hull[next];
        const light = ((a[0] + b[0]) * 0.5 - px) * -0.06 / size + ((a[1] + b[1]) * 0.5 - py) * -0.09 / size;
        const gain = shade * (0.94 + light);
        triangle(crown[side], a, b, color, gain);
        triangle(crown[side], b, crown[next], color, gain);
        triangle([centerX, centerY, peak], crown[side], crown[next], color, shade * 1.02);
      }
    }
  }
  context.putImageData(base, 0, 0);
  normalContext.putImageData(normals, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.anisotropy = 4;
  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({
    map, normalMap, normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.94, metalness: 0, color: 0xdedede, envMapIntensity: 0.14,
  });
  material.addEventListener('dispose', () => normalMap.dispose());
  return material;
}

function packedSandGeometry(): THREE.LatheGeometry {
  const curve = new THREE.CatmullRomCurve3(sandProfile.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal');
  const profile = curve.getPoints(160).map(point => new THREE.Vector2(THREE.MathUtils.clamp(point.x, 0, radius), point.y));
  const geometry = new THREE.LatheGeometry(profile, 160);
  const positions = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < positions.count; index++) uv.setY(index, (positions.getY(index) - sandBase) / (fillTop - sandBase));
  return geometry;
}

function sandRadiusAt(y: number): number {
  for (let index = 2; index < sandProfile.length; index++) {
    const [r, level] = sandProfile[index];
    const [previousR, previousLevel] = sandProfile[index - 1];
    if (y <= level) return THREE.MathUtils.lerp(previousR, r, THREE.MathUtils.clamp((y - previousLevel) / (level - previousLevel), 0, 1));
  }
  return sandProfile[sandProfile.length - 1][0];
}

function clearGlass(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.FrontSide,
    vertexShader: `
      varying vec3 worldPosition;
      varying vec3 worldNormal;
      void main() {
        vec4 point = modelMatrix * vec4(position, 1.0);
        worldPosition = point.xyz;
        worldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * point;
      }
    `,
    fragmentShader: `
      varying vec3 worldPosition;
      varying vec3 worldNormal;
      void main() {
        vec3 normal = normalize(worldNormal);
        vec3 eye = normalize(cameraPosition - worldPosition);
        float facing = clamp(dot(normal, eye), 0.0, 1.0);
        float fresnel = pow(1.0 - facing, 3.2);
        float curve = pow(1.0 - facing, 1.6);
        // Fixed studio tint keeps the glass contour identical from the first frame.
        vec3 reflection = vec3(0.12, 0.19, 0.16) * 0.33;
        float pane = (1.0 - smoothstep(0.015, 0.08, abs(normal.x + 0.63))) * smoothstep(0.1, 0.3, normal.z);
        reflection = mix(reflection, vec3(1.45, 1.46, 1.4), pane * 0.9);
        float alpha = 0.012 + curve * 0.2 + fresnel * 0.5 + pane * 0.28;
        gl_FragColor = vec4(reflection, clamp(alpha, 0.0, 0.8));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function issue(code: AppIssue['code'], message: string): Error & { code: AppIssue['code'] } {
  return Object.assign(new Error(message), { code });
}

export function createBottleScene(host: HTMLElement, options: Options): BottleScene {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    const fault: AppIssue = { code: 'webgl-unavailable', message: '这个浏览器暂时无法显示瓶子，请开启硬件加速，或换用新版浏览器。' };
    options.onFault(fault);
    throw issue(fault.code, fault.message);
  }
  const canvas = renderer.domElement;
  canvas.className = 'bottle-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
  renderer.setClearColor(0xece6da, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  host.append(canvas);

  const resources = new Set<{ dispose(): void }>();
  const retain = <T extends { dispose(): void }>(resource: T): T => { resources.add(resource); return resource; };
  const world = new THREE.Scene();
  world.background = new THREE.Color(0xece6da);
  // Use immediate studio lights: a late environment map used to wash out the
  // glass and brighten the entire bottle after its first visible frame.
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 1.2, 9.4);
  camera.lookAt(0, 0.32, 0);
  world.add(new THREE.HemisphereLight(0xfff6e6, 0x8c7860, 1.6));
  const key = new THREE.DirectionalLight(0xfff4e2, 2.6);
  key.position.set(-3.5, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3.5;
  key.shadow.camera.right = 3.5;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  world.add(key);
  const fillLight = new THREE.DirectionalLight(0xe1ecff, 1.2);
  fillLight.position.set(4, 3, -3);
  world.add(fillLight);

  const bottle = new THREE.Group();
  world.add(bottle);
  const vessel = new THREE.Group();
  bottle.add(vessel);
  const outer = [
    [0, -1.69], [0.70, -1.69], [0.91, -1.67], [1.005, -1.59], [1.035, -1.47],
    [1.038, -1.35], [1.038, 1.20], [1.025, 1.38], [0.973, 1.53], [0.85, 1.67],
    [0.68, 1.82], [0.52, 1.94], [0.475, 2.04], [0.475, 2.16], [0.495, 2.18],
    [0.499, 2.22], [0.48, 2.25], [0.438, 2.25], [0.422, 2.22], [0.426, 2.17],
    [0.43, 2.05], [0.468, 1.98], [0.63, 1.84], [0.81, 1.68], [0.93, 1.52],
    [0.965, 1.35], [0.971, 1.20], [0.971, -1.31], [0.96, -1.43], [0.9, -1.51], [0.70, -1.54], [0, -1.54],
  ];
  const profileCurve = new THREE.CatmullRomCurve3(outer.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  const profile = profileCurve.getPoints(320).map(point => new THREE.Vector2(Math.max(0, point.x), point.y));
  const glassMaterial = retain(clearGlass());
  const glass = new THREE.Mesh(retain(new THREE.LatheGeometry(profile, 160)), glassMaterial);
  glass.renderOrder = 3;
  vessel.add(glass);
  const rimMaterial = retain(glassMaterial.clone());
  for (const [r, y, thickness] of [[0.466, 2.215, 0.033], [0.994, -1.59, 0.034], [0.473, 2.105, 0.012]]) {
    const rim = new THREE.Mesh(retain(new THREE.TorusGeometry(r, thickness, 12, 128)), rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    rim.renderOrder = 4;
    vessel.add(rim);
  }
  const cork = retain(corkTexture());
  const corkMaterial = retain(new THREE.MeshStandardMaterial({
    map: cork, bumpMap: cork, bumpScale: 0.028, roughness: 0.96,
    color: 0xffffff, envMapIntensity: 0.18,
  }));
  const corkMesh = new THREE.Mesh(retain(new THREE.CylinderGeometry(0.439, 0.42, 0.45, 96, 8)), corkMaterial);
  corkMesh.position.y = 2.38;
  corkMesh.castShadow = true;
  vessel.add(corkMesh);
  const corkBevel = new THREE.Mesh(retain(new THREE.TorusGeometry(0.422, 0.018, 8, 96)), corkMaterial);
  corkBevel.rotation.x = Math.PI / 2;
  corkBevel.position.y = 2.595;
  vessel.add(corkBevel);

  const plinth = new THREE.Mesh(retain(new THREE.CylinderGeometry(1.4, 1.46, 0.12, 128)), retain(new THREE.MeshStandardMaterial({
    color: 0xcabc9f, roughness: 0.82, envMapIntensity: 0.24,
  })));
  plinth.position.y = -1.77;
  plinth.receiveShadow = true;
  world.add(plinth);
  const shadowCanvas = makeCanvas(256, 256);
  const shadowContext = shadowCanvas.getContext('2d')!;
  const shadowGradient = shadowContext.createRadialGradient(128, 128, 13, 128, 128, 128);
  shadowGradient.addColorStop(0, 'rgba(60,43,23,.38)');
  shadowGradient.addColorStop(0.35, 'rgba(60,43,23,.19)');
  shadowGradient.addColorStop(1, 'rgba(60,43,23,0)');
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(retain(new THREE.PlaneGeometry(4.9, 3.7)), retain(new THREE.MeshBasicMaterial({
    map: retain(new THREE.CanvasTexture(shadowCanvas)), transparent: true, depthWrite: false, toneMapped: false,
  })));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.24, -1.835, 0.05);
  world.add(shadow);

  let content: Content | null = null;
  let mode: Presentation = 'loose';
  let transfer: Transfer | null = null;
  const stream = createSandStream(host);
  const stageBackground = world.background;
  let disposed = false;
  let contextLost = false;
  let generation = 0;
  let frame = 0;
  let previousTime = 0;
  let yawVelocity = 0;
  let pitchVelocity = 0;
  const horizontalAxis = new THREE.Vector3(0, 1, 0);
  const verticalAxis = new THREE.Vector3(1, 0, 0);
  const rotationStep = new THREE.Quaternion();
  const inspectionCenter = new THREE.Vector3(0, (2.613 - 1.69) / 2, 0);
  const rotatedCenter = new THREE.Vector3();
  let returning: { from: THREE.Quaternion; started: number } | null = null;
  let gesture: Gesture | null = null;
  let width = 1;
  let height = 1;
  const pendingDecodes = new Set<() => void>();

  function requestFrame(): void {
    if (!frame && !disposed && !contextLost && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function placeCamera(assemblyProgress?: number): void {
    const sealedDistance = Math.max(9.4, 8.5 / camera.aspect);
    const looseDistance = Math.max(9.4, 1.5 + 11.03 / camera.aspect);
    const blend = assemblyProgress === undefined ? (mode === 'sealed' ? 1 : 0) : assemblyProgress * assemblyProgress * (3 - 2 * assemblyProgress);
    const distance = looseDistance * (1 - blend) + sealedDistance * blend;
    const elevation = THREE.MathUtils.lerp(0.094, 0.45, blend);
    camera.position.set(0, 0.32 + distance * elevation, distance);
    camera.lookAt(0, 0.32, 0);
    camera.updateProjectionMatrix();
  }

  function resize(): void {
    if (disposed) return;
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (transfer) placeCamera(1);
    else placeCamera();
    requestFrame();
  }

  function releaseContent(value: Content): void {
    bottle.remove(value.group);
    value.loose.dispose();
    value.reservoir.dispose();
    for (const mesh of [value.mantle, value.cap]) {
      mesh.geometry.dispose();
      mesh.material.map?.dispose();
      if (mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.bumpMap?.dispose();
      mesh.material.dispose();
    }
    value.source.width = value.source.height = 0;
  }

  function applyPresentation(next: Presentation): void {
    mode = next;
    canvas.style.cursor = next === 'sealed' ? 'grab' : 'crosshair';
    vessel.visible = plinth.visible = shadow.visible = next === 'sealed';
    if (!content) return;
    content.loose.setActive(next === 'loose' && !disposed && !contextLost);
    content.reservoir.reset();
    content.mantle.visible = content.cap.visible = next === 'sealed';
    if (next === 'sealed') {
      content.cap.position.y = fillTop;
      content.cap.scale.setScalar(sandRadiusAt(fillTop));
      updateSandClip();
    } else {
      bottle.rotation.set(0, 0, 0);
      bottle.position.y = 0;
    }
    resize();
  }

  const clamp = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
  const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

  function resetTransferPose(): void {
    bottle.position.set(0, 0, 0);
    bottle.scale.setScalar(1);
    bottle.rotation.set(0, 0, 0);
    corkMesh.position.y = 2.38;
    corkBevel.position.y = 2.595;
    corkMesh.visible = corkBevel.visible = true;
    plinth.scale.setScalar(1);
    world.background = stageBackground;
    renderer.setClearColor(0xece6da, 1);
    canvas.style.position = canvas.style.inset = canvas.style.zIndex = canvas.style.pointerEvents = '';
    shadow.material.opacity = 1;
    stream.clear();
    delete host.dataset.transfer;
    if (!content) return;
    content.reservoir.reset();
    const frame = content.loose.element.firstElementChild as HTMLElement;
    frame.style.transform = frame.style.transformOrigin = frame.style.opacity = '';
    content.fillPlane.normal.set(0, -1, 0);
    content.fillPlane.constant = fillTop;
    content.cap.position.y = fillTop;
    content.cap.scale.setScalar(sandRadiusAt(fillTop));
  }

  function finishTransfer(result: SceneResult): void {
    const current = transfer;
    if (!current) return;
    transfer = null;
    clearTimeout(current.timeout);
    current.signal?.removeEventListener('abort', current.abort);
    content?.loose.finishTransfer(result === 'completed');
    resetTransferPose();
    const destination: Presentation = current.kind === 'assemble' ? 'sealed' : 'loose';
    const source: Presentation = current.kind === 'assemble' ? 'loose' : 'sealed';
    applyPresentation(result === 'completed' ? destination : source);
    if (result === 'cancelled' && source === 'sealed') {
      bottle.quaternion.copy(current.sourceOrientation);
      bottle.position.copy(current.sourcePosition);
    } else bottle.rotation.set(0, current.sourceYaw, 0);
    updateSandClip();
    current.resolve(result);
  }

  function screenPoint(point: THREE.Vector3): { x: number; y: number } {
    const projected = point.clone().project(camera);
    return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
  }

  function moveBottleTo(x: number, y: number): void {
    const point = new THREE.Vector3(x / width * 2 - 1, 1 - y / height * 2, 0).unproject(camera);
    const direction = point.sub(camera.position).normalize();
    bottle.position.copy(camera.position).addScaledVector(direction, -camera.position.z / direction.z);
  }

  function placeBottleMouth(target: SandPoint, scale: number): void {
    bottle.scale.setScalar(scale);
    bottle.position.set(0, 0, 0);
    for (let iteration = 0; iteration < 3; iteration++) {
      bottle.updateMatrixWorld(true);
      const mouth = screenPoint(bottle.localToWorld(new THREE.Vector3(0, 2.22, 0)));
      const center = screenPoint(bottle.position);
      moveBottleTo(center.x + target.x - mouth.x, center.y + target.y - mouth.y);
    }
    bottle.updateMatrixWorld(true);
  }

  function poseAssembly(frame: HTMLElement, progress: number): FrameProjection {
    const frameStyle = getComputedStyle(frame);
    const sand = frame.querySelector('canvas')!;
    const sandStyle = getComputedStyle(sand);
    const frameWidth = parseFloat(frameStyle.width);
    const frameHeight = parseFloat(frameStyle.height);
    const sandWidth = parseFloat(sandStyle.width);
    const sandHeight = parseFloat(sandStyle.height);
    const innerX = parseFloat(frameStyle.borderLeftWidth) + parseFloat(frameStyle.paddingLeft);
    const innerY = parseFloat(frameStyle.borderTopWidth) + parseFloat(frameStyle.paddingTop);
    const previous = new DOMMatrix(frameStyle.transform === 'none' ? undefined : frameStyle.transform);
    const rect = frame.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const layoutX = rect.left - hostRect.left - previous.e - Math.min(0, previous.a * frameWidth, previous.c * frameHeight, previous.a * frameWidth + previous.c * frameHeight);
    const layoutY = rect.top - hostRect.top - previous.f - Math.min(0, previous.b * frameWidth, previous.d * frameHeight, previous.b * frameWidth + previous.d * frameHeight);
    const cos = Math.cos(assemblyTilt);
    const sin = Math.sin(assemblyTilt);
    const finalScale = Math.min(Math.min(210, height * 0.46) / (frameWidth * sin + frameHeight * cos), (width - 28) / (frameWidth * cos + frameHeight * sin));
    const finalHeight = finalScale * (frameWidth * sin + frameHeight * cos);
    const centerX = width / 2;
    const centerY = 16 + finalHeight / 2;
    const finalLip = { x: centerX + finalScale * (frameWidth * cos - frameHeight * sin) / 2, y: 16 + finalHeight };
    const prepare = smooth(progress / 0.15);
    const angle = assemblyTilt * smooth((progress - 0.04) / 0.11);
    const aCos = Math.cos(angle);
    const aSin = Math.sin(angle);
    const scale = Math.min(THREE.MathUtils.lerp(1, finalScale, smooth(progress / 0.10)), (width - 20) / (frameWidth * aCos + frameHeight * aSin), (height - 20) / (frameWidth * aSin + frameHeight * aCos));
    const rotatedWidth = scale * (frameWidth * aCos + frameHeight * aSin);
    const rotatedHeight = scale * (frameWidth * aSin + frameHeight * aCos);
    const x = THREE.MathUtils.clamp(THREE.MathUtils.lerp(layoutX + frameWidth / 2, centerX, prepare), rotatedWidth / 2 + 10, width - rotatedWidth / 2 - 10);
    const y = THREE.MathUtils.clamp(THREE.MathUtils.lerp(layoutY + frameHeight / 2, centerY, prepare), rotatedHeight / 2 + 10, height - rotatedHeight / 2 - 10);
    const a = scale * aCos;
    const b = scale * aSin;
    const c = -scale * aSin;
    const d = scale * aCos;
    const e = x - layoutX - (a * frameWidth + c * frameHeight) / 2;
    const f = y - layoutY - (b * frameWidth + d * frameHeight) / 2;
    frame.style.transformOrigin = '0 0';
    frame.style.transform = `matrix(${a},${b},${c},${d},${e},${f})`;
    frame.style.opacity = String(1 - smooth((progress - 0.885) / 0.06));
    const target = { x: finalLip.x, y: finalLip.y + 26 };
    let bottleScale = 0.48;
    for (let iteration = 0; iteration < 2; iteration++) {
      placeBottleMouth(target, bottleScale);
      let baseY = target.y;
      for (const z of [-1.04, 0, 1.04]) {
        const base = screenPoint(bottle.localToWorld(new THREE.Vector3(0, -1.72, z)));
        baseY = Math.max(baseY, base.y);
      }
      bottleScale *= Math.min(145, height * 0.32) / (baseY - target.y);
    }
    const enter = smooth(progress / 0.15);
    placeBottleMouth({ x: THREE.MathUtils.lerp(width * 0.85, target.x, enter), y: THREE.MathUtils.lerp(height * 1.05, target.y, enter) }, bottleScale);
    const dock = smooth((progress - 0.89) / 0.10);
    bottle.position.multiplyScalar(1 - dock);
    bottle.scale.setScalar(THREE.MathUtils.lerp(bottleScale, 1, dock));
    return {
      origin: { x: layoutX + a * innerX + c * innerY + e, y: layoutY + b * innerX + d * innerY + f },
      xAxis: { x: sandWidth * a, y: sandWidth * b },
      yAxis: { x: sandHeight * c, y: sandHeight * d },
      lip: { x: layoutX + a * frameWidth + c * frameHeight + e, y: layoutY + b * frameWidth + d * frameHeight + f },
    };
  }

  function posePour(frame: HTMLElement, progress: number, flow: number, current: Transfer): FrameProjection {
    const frameStyle = getComputedStyle(frame);
    const sandStyle = getComputedStyle(frame.querySelector('canvas')!);
    const frameWidth = parseFloat(frameStyle.width);
    const frameHeight = parseFloat(frameStyle.height);
    const innerX = parseFloat(frameStyle.borderLeftWidth) + parseFloat(frameStyle.paddingLeft);
    const innerY = parseFloat(frameStyle.borderTopWidth) + parseFloat(frameStyle.paddingTop);
    const previous = new DOMMatrix(frameStyle.transform === 'none' ? undefined : frameStyle.transform);
    const rect = frame.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const layoutX = rect.left - hostRect.left - previous.e;
    const layoutY = rect.top - hostRect.top - previous.f;
    const finalScale = Math.min(280, width - 24) / frameWidth;
    const finalHeight = frameHeight * finalScale;
    const dock = smooth(progress / 0.16);
    const restore = flow < 1 ? 0 : smooth((progress - 0.86) / 0.14);
    const blend = dock * (1 - restore);
    const scale = THREE.MathUtils.lerp(1, finalScale, blend);
    const x = THREE.MathUtils.lerp(layoutX, (width - frameWidth * finalScale) / 2, blend);
    const y = THREE.MathUtils.lerp(layoutY, height - 60 - finalHeight, blend);
    const e = x - layoutX;
    const f = y - layoutY;
    frame.style.transformOrigin = '0 0';
    frame.style.transform = `matrix(${scale},0,0,${scale},${e},${f})`;
    frame.style.opacity = String(dock);

    const prepare = smooth(progress / 0.29);
    const tip = smooth((progress - 0.04) / 0.25);
    const upright = new THREE.Quaternion().setFromAxisAngle(horizontalAxis, current.sourceYaw);
    const leveled = current.sourceOrientation.clone().slerp(upright, smooth(progress / 0.18));
    bottle.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI * 0.69 * tip).multiply(leveled);
    const uncork = smooth(progress / 0.16);
    corkMesh.position.y = 2.38 + uncork * 0.9;
    corkBevel.position.y = 2.595 + uncork * 0.9;
    corkMesh.visible = corkBevel.visible = progress < 0.18;
    const restingMouth = screenPoint(current.sourceMouth);
    const target = {
      x: THREE.MathUtils.lerp(restingMouth.x, x + scale * innerX + parseFloat(sandStyle.width) * scale * pourSweepX(flow), prepare),
      y: THREE.MathUtils.lerp(restingMouth.y, height - 60 - finalHeight - 38, prepare),
    };
    let bottleScale = THREE.MathUtils.lerp(1, 0.46, prepare) * Math.max(0.001, 1 - restore);
    for (let iteration = 0; iteration < 4; iteration++) {
      placeBottleMouth(target, bottleScale);
      let fit = 1;
      for (const part of vessel.children) {
        if (!(part instanceof THREE.Mesh) || !part.visible) continue;
        if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
        const bounds = part.geometry.boundingBox!;
        for (const px of [bounds.min.x, bounds.max.x]) for (const py of [bounds.min.y, bounds.max.y]) for (const pz of [bounds.min.z, bounds.max.z]) {
          const point = screenPoint(part.localToWorld(new THREE.Vector3(px, py, pz)));
          if (point.x < target.x) fit = Math.min(fit, (Math.min(target.x, x + scale * innerX + parseFloat(sandStyle.width) * scale * pourSweepX(0)) - 12) / (target.x - point.x));
          if (point.x > target.x) fit = Math.min(fit, (width - 12 - target.x) / (point.x - target.x));
          if (point.y < target.y) fit = Math.min(fit, (target.y - 12) / (target.y - point.y));
          if (point.y > target.y) fit = Math.min(fit, (height - 60 - target.y) / (point.y - target.y));
        }
      }
      if (fit >= 1) break;
      bottleScale *= fit * 0.995;
    }
    placeBottleMouth(target, bottleScale);
    return {
      origin: { x: x + scale * innerX, y: y + scale * innerY },
      xAxis: { x: parseFloat(sandStyle.width) * scale, y: 0 },
      yAxis: { x: 0, y: parseFloat(sandStyle.height) * scale },
      lip: { x: x + frameWidth * scale, y: y + frameHeight * scale },
    };
  }

  function animateTransfer(now: number): void {
    if (!content || !transfer) return;
    const current = transfer;
    const progress = clamp((now - current.started) / transferDuration[current.kind]);
    if (progress >= 1) { finishTransfer('completed'); return; }
    const frame = content.loose.element.firstElementChild as HTMLElement;
    placeCamera(1);
    camera.updateMatrixWorld();
    vessel.visible = true;
    plinth.visible = shadow.visible = false;
    content.mantle.visible = content.cap.visible = true;
    let flow: number;
    let sandPlane: FrameProjection;
    if (current.kind === 'pour') {
      plinth.visible = shadow.visible = progress < 0.16;
      plinth.scale.setScalar(Math.max(0.001, 1 - smooth((progress - 0.02) / 0.14)));
      shadow.material.opacity = 1 - smooth(progress / 0.16);
      flow = clamp((progress - 0.27) / 0.59);
      sandPlane = posePour(frame, progress, flow, current);
    } else {
      bottle.rotation.set(0, current.sourceYaw, 0);
      flow = progress;
      sandPlane = poseAssembly(frame, progress);
      const close = smooth((progress - 0.91) / 0.08);
      corkMesh.visible = corkBevel.visible = progress > 0.91;
      corkMesh.position.y = 2.38 + (1 - close) * 0.8;
      corkBevel.position.y = 2.595 + (1 - close) * 0.8;
      if (progress > 0.94) {
        plinth.visible = shadow.visible = true;
        plinth.scale.setScalar(smooth((progress - 0.94) / 0.05));
      }
    }
    content.loose.transferProgress(flow);
    bottle.updateMatrixWorld(true);
    updateSandClip();
    const movingSand = current.kind === 'pour' ? progress > 0.11 : flow < current.plan.settledAt;
    content.mantle.visible = content.cap.visible = !movingSand;
    if (movingSand) content.reservoir.draw(current.plan, flow, current.kind === 'pour' ? smooth((progress - 0.04) / 0.25) : 0, height * renderer.getPixelRatio());
    else content.reservoir.reset();
    const mouth = screenPoint(bottle.localToWorld(new THREE.Vector3(0, 2.22, 0)));
    if (flow > 0 && flow < 1) stream.draw(current.plan, flow, mouth, sandPlane);
    else stream.clear();
  }

  function draw(now: number): void {
    frame = 0;
    if (disposed || contextLost) return;
    const dt = previousTime ? Math.min(0.05, (now - previousTime) / 1000) : 1 / 60;
    previousTime = now;
    if (transfer) animateTransfer(now);
    if (returning) {
      const progress = clamp((now - returning.started) / 520);
      bottle.quaternion.copy(returning.from).slerp(new THREE.Quaternion(), smooth(progress));
      if (progress === 1) { bottle.rotation.set(0, 0, 0); returning = null; }
      centerInspection();
      updateSandClip();
    }
    if (!returning && !transfer && !gesture && Math.abs(yawVelocity) + Math.abs(pitchVelocity) > 0.00005) {
      rotateBottle(yawVelocity * dt * 60, pitchVelocity * dt * 60);
      yawVelocity *= Math.pow(0.9, dt * 60);
      pitchVelocity *= Math.pow(0.9, dt * 60);
    } else if (!gesture) yawVelocity = pitchVelocity = 0;
    try { renderer.render(world, camera); }
    catch {
      contextLost = true;
      finishTransfer('cancelled');
      content?.loose.setActive(false);
      options.onFault({ code: 'render-failed', message: '瓶子显示中断了，刷新页面后再试试。' });
      return;
    }
    if (returning || transfer || Math.abs(yawVelocity) + Math.abs(pitchVelocity) > 0.00005) requestFrame();
  }

  function loadImage(source: string, signal?: AbortSignal): Promise<HTMLImageElement | null> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      let settled = false;
      const cleanup = () => {
        image.onload = image.onerror = null;
        signal?.removeEventListener('abort', cancel);
        pendingDecodes.delete(cancel);
      };
      const cancel = () => {
        if (settled) return;
        settled = true;
        cleanup();
        image.src = '';
        resolve(null);
      };
      pendingDecodes.add(cancel);
      signal?.addEventListener('abort', cancel, { once: true });
      image.onload = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(image);
      };
      image.onerror = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(issue('decode-failed', '这张照片没有打开，换一张 JPG、PNG 或 WebP 试试。'));
      };
      if (signal?.aborted || disposed) cancel();
      else image.src = source;
    });
  }

  function prepare(image: HTMLImageElement, draft: BottleDraft): Content {
    const source = makeCanvas(image.naturalWidth, image.naturalHeight);
    source.getContext('2d')!.drawImage(image, 0, 0);
    const mantleMaterial = packedSandMaterial(source, draft);
    const fillPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), fillTop);
    mantleMaterial.clippingPlanes = [fillPlane];
    mantleMaterial.clipShadows = true;
    const mantle = new THREE.Mesh(packedSandGeometry(), mantleMaterial);
    mantle.rotation.y = Math.PI;
    mantle.castShadow = true;
    mantle.receiveShadow = true;
    const cap = new THREE.Mesh(new THREE.CircleGeometry(1, 96), packedSandMaterial(null, draft));
    cap.rotation.x = -Math.PI / 2;
    cap.position.y = fillTop;
    cap.scale.setScalar(sandRadiusAt(fillTop));
    cap.receiveShadow = true;
    const group = new THREE.Group();
    group.add(mantle, cap);
    const looseSource = photoCanvas(source, 720, 432);
    const loose = createLooseSand(looseSource, options.reducedMotion, draft.sandState);
    const reservoir = createSandReservoir(looseSource, sandRadiusAt, { mantle, cap, bottom: sandBase, top: fillTop });
    group.add(reservoir.object);
    looseSource.width = looseSource.height = 0;
    return { draft, loose, mantle, cap, fillPlane, reservoir, source, group };
  }

  function bakeEditedSand(): void {
    if (!content) return;
    const state = content.loose.exportState();
    if (!state && !content.draft.sandState) return;
    const picture = state ? content.loose.snapshot() : photoCanvas(content.source, 720, 432);
    const material = packedSandMaterial(state ? picture : content.source, content.draft);
    material.clippingPlanes = [content.fillPlane];
    material.clipShadows = true;
    content.group.remove(content.reservoir.object);
    content.reservoir.dispose();
    const previous = content.mantle.material;
    content.mantle.material = material;
    previous.map?.dispose(); previous.bumpMap?.dispose(); previous.dispose();
    content.reservoir = createSandReservoir(picture, sandRadiusAt, { mantle: content.mantle, cap: content.cap, bottom: sandBase, top: fillTop });
    content.group.add(content.reservoir.object);
    picture.width = picture.height = 0;
    content.draft = { ...content.draft, sandState: state };
  }

  async function show(draft: BottleDraft, next: Presentation, signal?: AbortSignal): Promise<SceneResult> {
    returning = null;
    const operation = ++generation;
    for (const cancel of [...pendingDecodes]) cancel();
    finishTransfer('cancelled');
    if (disposed || contextLost || signal?.aborted) return 'cancelled';
    if (content && content.draft.imageDataUrl === draft.imageDataUrl && content.draft.colorMode === draft.colorMode && content.draft.seamWidth === draft.seamWidth && content.draft.sandState === draft.sandState) {
      content.draft = draft;
      applyPresentation(next);
      return 'completed';
    }
    const image = await loadImage(draft.imageDataUrl, signal);
    if (!image || operation !== generation || disposed || signal?.aborted || contextLost) return 'cancelled';
    let prepared: Content;
    try { prepared = prepare(image, draft); }
    catch { throw issue('render-failed', '照片暂时没能变成彩砂，换一张小一点的照片试试。'); }
    image.src = '';
    if (operation !== generation || disposed || signal?.aborted || contextLost) {
      releaseContent(prepared);
      return 'cancelled';
    }
    const previous = content;
    content = prepared;
    if (draft.sandState) bakeEditedSand();
    bottle.add(prepared.group);
    host.append(prepared.loose.element);
    if (!previous || previous.draft.imageDataUrl !== draft.imageDataUrl) {
      bottle.rotation.set(0, 0, 0);
      bottle.position.set(0, 0, 0);
    }
    if (previous) releaseContent(previous);
    yawVelocity = pitchVelocity = 0;
    applyPresentation(next);
    resize();
    return 'completed';
  }

  function startTransfer(kind: SandTransferKind, signal?: AbortSignal): Promise<SceneResult> {
    if (disposed || contextLost || signal?.aborted) return Promise.resolve('cancelled');
    if (transfer?.kind === kind) return transfer.promise;
    if (transfer) return Promise.resolve('cancelled');
    if (!content) return Promise.reject(new Error('请先选择一张照片。'));
    returning = null;
    const destination: Presentation = kind === 'assemble' ? 'sealed' : 'loose';
    if (mode === destination) return Promise.resolve('completed');
    if (kind === 'assemble') bakeEditedSand();
    if (options.reducedMotion || document.hidden) {
      const sourceYaw = 2 * Math.atan2(bottle.quaternion.y, bottle.quaternion.w);
      content.loose.beginTransfer(kind);
      content.loose.finishTransfer(true);
      applyPresentation(destination);
      bottle.rotation.set(0, sourceYaw, 0);
      bottle.position.set(0, 0, 0);
      yawVelocity = pitchVelocity = 0;
      return Promise.resolve('completed');
    }
    let resolve!: (result: SceneResult) => void;
    const promise = new Promise<SceneResult>((done) => { resolve = done; });
    const abort = () => finishTransfer('cancelled');
    const timeout = setTimeout(() => finishTransfer('completed'), transferDuration[kind] + 80);
    const plan = content.loose.beginTransfer(kind);
    bottle.updateMatrixWorld(true);
    transfer = {
      kind, sourceYaw: 2 * Math.atan2(bottle.quaternion.y, bottle.quaternion.w),
      sourceOrientation: bottle.quaternion.clone(), sourcePosition: bottle.position.clone(),
      sourceMouth: bottle.localToWorld(new THREE.Vector3(0, 2.22, 0)),
      plan, started: performance.now(), promise, resolve, timeout, signal, abort,
    };
    yawVelocity = pitchVelocity = 0;
    if (gesture && canvas.hasPointerCapture(gesture.id)) canvas.releasePointerCapture(gesture.id);
    gesture = null;
    canvas.style.cursor = 'default';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.zIndex = '2';
    canvas.style.pointerEvents = 'none';
    world.background = null;
    renderer.setClearColor(0xece6da, 0);
    host.dataset.transfer = kind;
    signal?.addEventListener('abort', abort, { once: true });
    animateTransfer(transfer.started);
    requestFrame();
    return promise;
  }

  function onPointerDown(event: PointerEvent): void {
    if (transfer || !content || mode !== 'sealed' || gesture || (event.pointerType === 'mouse' && event.button !== 0)) return;
    returning = null;
    gesture = { id: event.pointerId, lastX: event.clientX, lastY: event.clientY, startY: event.clientY, tilting: false };
    yawVelocity = pitchVelocity = 0;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = mode === 'sealed' ? 'grabbing' : 'crosshair';
  }

  function onPointerMove(event: PointerEvent): void {
    if (!content || transfer) return;
    if (!gesture || event.pointerId !== gesture.id || mode !== 'sealed') return;
    const delta = (event.clientX - gesture.lastX) / Math.max(250, width) * Math.PI * 2;
    let verticalPixels = 0;
    if (gesture.tilting) verticalPixels = event.clientY - gesture.lastY;
    else {
      const travel = event.clientY - gesture.startY;
      if (Math.abs(travel) > 32) {
        gesture.tilting = true;
        verticalPixels = travel - Math.sign(travel) * 32;
      }
    }
    const vertical = verticalPixels / Math.max(250, height) * Math.PI * 2;
    rotateBottle(delta, vertical);
    yawVelocity = options.reducedMotion ? 0 : delta * 0.65;
    pitchVelocity = options.reducedMotion ? 0 : vertical * 0.65;
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
    requestFrame();
  }

  function onPointerUp(event: PointerEvent): void {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    gesture = null;
    canvas.style.cursor = mode === 'sealed' ? 'grab' : 'crosshair';
    requestFrame();
  }

  function rotateBottle(horizontal: number, vertical: number): void {
    if (vertical === 0 && bottle.rotation.x === 0 && bottle.rotation.z === 0) bottle.rotation.y += horizontal;
    else {
      bottle.quaternion.premultiply(rotationStep.setFromAxisAngle(horizontalAxis, horizontal));
      bottle.quaternion.premultiply(rotationStep.setFromAxisAngle(verticalAxis, vertical)).normalize();
    }
    centerInspection();
    updateSandClip();
  }

  function centerInspection(): void {
    rotatedCenter.copy(inspectionCenter).applyQuaternion(bottle.quaternion);
    bottle.position.copy(inspectionCenter).sub(rotatedCenter);
  }

  function updateSandClip(): void {
    if (!content) return;
    bottle.updateMatrixWorld(true);
    content.fillPlane.normal.set(0, -1, 0);
    content.fillPlane.constant = fillTop;
    content.fillPlane.applyMatrix4(bottle.matrixWorld);
  }

  function resetView(): void {
    if (disposed || contextLost || transfer || mode !== 'sealed') return;
    yawVelocity = pitchVelocity = 0;
    if (options.reducedMotion) {
      returning = null;
      bottle.rotation.set(0, 0, 0);
      bottle.position.set(0, 0, 0);
      updateSandClip();
    } else returning = { from: bottle.quaternion.clone(), started: performance.now() };
    requestFrame();
  }

  function onVisibility(): void {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (transfer) finishTransfer('completed');
    } else {
      previousTime = 0;
      requestFrame();
    }
  }

  function onContextLost(event: Event): void {
    event.preventDefault();
    contextLost = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    for (const cancel of [...pendingDecodes]) cancel();
    finishTransfer('cancelled');
    content?.loose.setActive(false);
    options.onFault({ code: 'context-lost', message: '浏览器暂停了瓶子的显示，刷新页面就能重新打开。' });
  }

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('lostpointercapture', onPointerUp);
  canvas.addEventListener('dblclick', resetView);
  canvas.addEventListener('webglcontextlost', onContextLost);
  document.addEventListener('visibilitychange', onVisibility);
  vessel.visible = plinth.visible = shadow.visible = false;
  resize();

  return {
    show,
    assemble: (signal?: AbortSignal) => startTransfer('assemble', signal),
    disassemble: (signal?: AbortSignal) => startTransfer('pour', signal),
    setSprinkleDensity(value: number): void { content?.loose.setSprinkleDensity(value); },
    setLooseTool(tool: LooseTool): void {
      if (disposed || contextLost || transfer || mode !== 'loose') return;
      content?.loose.setTool(tool);
    },
    setBrushRadius(radius: number): void {
      content?.loose.setBrushRadius(radius);
    },
    restoreLoose(): void {
      if (disposed || contextLost || transfer || mode !== 'loose') return;
      content?.loose.restore();
    },
    turnBy(radians: number, vertical = 0): void {
      if (disposed || contextLost || transfer || mode !== 'sealed' || !Number.isFinite(radians) || !Number.isFinite(vertical)) return;
      returning = null;
      rotateBottle(radians, vertical);
      yawVelocity = pitchVelocity = 0;
      requestFrame();
    },
    resetView,
    getDraft: () => content?.draft ?? null,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      generation++;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      finishTransfer('cancelled');
      for (const cancel of [...pendingDecodes]) cancel();
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('lostpointercapture', onPointerUp);
      canvas.removeEventListener('dblclick', resetView);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      document.removeEventListener('visibilitychange', onVisibility);
      if (content) releaseContent(content);
      content = null;
      for (const resource of resources) resource.dispose();
      resources.clear();
      world.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      stream.dispose();
      canvas.remove();
      shadowCanvas.width = shadowCanvas.height = 0;
    },
  };
}
