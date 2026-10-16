import { makeDraft, type AppIssue, type BottleDraft, type Presentation } from './domain';
import { normalizePhoto } from './photo';
import { createBottleStore, type SaveResult } from './persistence';
import { createBottleScene, type BottleScene } from './scene';

type Ready = { kind: 'loose'; draft: BottleDraft } | { kind: 'sealed'; draft: BottleDraft };
type Phase = Ready | { kind: 'loading'; previous: Ready | null }
  | { kind: 'assembling' | 'pouring'; draft: BottleDraft }
  | { kind: 'failure'; issue: AppIssue; previous: Ready | null };
type SaveStatus = { kind: 'idle' } | { kind: 'saving' } | { kind: 'unavailable'; message: string };

const arrowRight = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 7 5 5-5 5M5 12h14"/></svg>';

function issueFrom(error: unknown): AppIssue {
  const codes: AppIssue['code'][] = ['invalid-photo', 'photo-too-large', 'decode-failed', 'webgl-unavailable', 'context-lost', 'render-failed'];
  const candidate = error as { code?: AppIssue['code']; message?: string } | null;
  const code = candidate?.code && codes.includes(candidate.code) ? candidate.code : 'render-failed';
  return { code, message: candidate?.message || '暂时没能装好这只瓶子，请重新试一次。' };
}

export function createApp(root: HTMLElement, options: { demoUrl: string }): { start(): Promise<void>; dispose(): void } {
  root.innerHTML = `
    <div class="page-shell">
      <header class="site-header">
        <a class="brand" href="./" aria-label="砂藏首页"><svg class="brand-mark" viewBox="0 0 32 40" aria-hidden="true"><path d="M11 3h10v7l5 6v17a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V16l5-6V3Z"/><path d="M7 25c6-7 12 6 18-1M7 29c7-5 12 5 18 0M12 7h8"/></svg><span class="brand-name">砂藏</span><span class="brand-english">SANDKEEP</span></a>
        <h1 class="site-tagline">把回忆装进沙子里</h1>
      </header>
      <main>
        <section class="studio" aria-label="沙画工作台">
          <div class="studio-toolbar">
            <div class="photo-picker"><img class="photo-thumb" alt="当前照片预览"><label class="upload-button" for="photo-input">换张照片<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M5 15v5h14v-5"/></svg></label><input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="换张照片" aria-describedby="photo-help"></div>
            <div class="studio-actions"><button type="button" class="secondary-button" data-action="restore" hidden>复原</button><button class="primary-button" type="button" data-action="bottle" disabled><span>装进瓶子</span>${arrowRight}</button></div>
            <span class="file-help" id="photo-help">JPG / PNG / WebP · 不超过 15 MB</span>
          </div>
          <div class="bottle-gallery">
            <div class="scene-host" tabindex="0" role="img" aria-label="暖调沙画瓶" aria-describedby="gesture-hint" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home" data-testid="bottle-scene"></div>
            <div class="scene-fallback" hidden><p>这里需要浏览器支持 3D 画面。</p><p>请试试新版 Chrome、Edge 或 Safari，并开启硬件加速。</p><button class="text-button" type="button" data-action="retry">重新尝试</button></div>
            <p class="gesture-hint" id="gesture-hint" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 8-4 4 4 4m12-8 4 4-4 4M2 12h20"/></svg><span>拖动旋转 · 双击回正</span></p>
          </div>
          <div class="workbench-feedback"><div class="status-message" role="status" aria-live="polite" data-testid="app-status" hidden></div><div class="issue-message" role="alert" hidden></div></div>
          <div class="workbench-options"><div class="sand-tools" role="group" aria-label="沙画操作" hidden><button type="button" data-sand-tool="push" aria-pressed="true">拨沙</button><button type="button" data-sand-tool="sprinkle" aria-pressed="false">撒沙</button></div><label class="brush-control" hidden>作用范围<input type="range" min="8" max="32" step="1" value="28" aria-label="作用范围"></label><label class="brush-control density-control" hidden>密度<input type="range" min="10" max="100" step="1" value="100" aria-label="撒沙密度" aria-valuetext="100%"></label><button class="text-button reset-button" type="button" data-action="reset">换回示例</button></div>
        </section>
      </main>
    </div>`;

  function element<T extends HTMLElement>(selector: string): T {
    const found = root.querySelector<T>(selector);
    if (!found) throw new Error(`Missing app element ${selector}`);
    return found;
  }

  const host = element<HTMLDivElement>('.scene-host');
  const thumb = element<HTMLImageElement>('.photo-thumb');
  thumb.src = options.demoUrl;
  const fileInput = element<HTMLInputElement>('#photo-input');
  const primary = element<HTMLButtonElement>('[data-action="bottle"]');
  const status = element<HTMLDivElement>('.status-message');
  const issue = element<HTMLDivElement>('.issue-message');
  const fallback = element<HTMLDivElement>('.scene-fallback');
  const gestureHint = element<HTMLParagraphElement>('.gesture-hint');
  const restore = element<HTMLButtonElement>('[data-action="restore"]');
  const brushControl = element<HTMLLabelElement>('.brush-control');
  const brushInput = element<HTMLInputElement>('.brush-control input');
  const densityControl = element<HTMLLabelElement>('.density-control');
  const densityInput = element<HTMLInputElement>('.density-control input');
  let sprinkleDensity = 100;
  let brushRadius = 28;
  let sandTool: 'push' | 'sprinkle' = 'push';
  const sandTools = element<HTMLDivElement>('.sand-tools');
  const store = createBottleStore();
  const lifetime = new AbortController();
  let scene: BottleScene | null = null;
  let phase: Phase = { kind: 'loading', previous: null };
  let saveStatus: SaveStatus = { kind: 'idle' };
  let generation = 0;
  let operation = new AbortController();
  let disposed = false;
  let started = false;
  let fatal = false;

  function ready(): Ready | null {
    if (phase.kind === 'loose' || phase.kind === 'sealed') return phase;
    if (phase.kind === 'loading' || phase.kind === 'failure') return phase.previous;
    return { kind: phase.kind === 'pouring' ? 'sealed' : 'loose', draft: phase.draft };
  }

  function busy(): boolean {
    return phase.kind === 'loading' || phase.kind === 'assembling' || phase.kind === 'pouring';
  }

  function canPlayLoose(): boolean {
    return ready()?.kind === 'loose' && !busy() && !fatal;
  }

  function render(): void {
    if (disposed) return;
    const current = ready();
    const pending = busy();
    const sealed = current?.kind === 'sealed';
    const looseReady = canPlayLoose();
    const sealedReady = sealed && !pending && !fatal;
    root.dataset.phase = phase.kind;
    host.setAttribute('aria-busy', String(pending));
    host.setAttribute('aria-label', phase.kind === 'pouring' ? '瓶子里的暖砂正在倒进平面画框。'
      : phase.kind === 'assembling' ? '画框里的暖砂正在装进瓶子。'
      : sealed ? '暖调沙画瓶。拖动或使用四个方向键旋转，双击或按 Home 回正。'
      : '带画框的平面暖调沙画。点击复原可以恢复原画。');
    host.dataset.presentation = phase.kind === 'assembling' || phase.kind === 'pouring' ? phase.kind : sealed ? 'sealed' : 'loose';
    primary.disabled = pending || !current || fatal;
    primary.querySelector('span')!.textContent = phase.kind === 'pouring' ? '正在倒出…'
      : phase.kind === 'assembling' ? '正在装瓶…' : phase.kind === 'loading' ? '正在准备…' : sealed ? '倒出成画' : '装进瓶子';
    gestureHint.hidden = !sealedReady && !looseReady;
    gestureHint.querySelector('span')!.textContent = sealed ? '拖动旋转 · 双击回正' : sandTool === 'sprinkle' ? '轻轻撒落，添一些沙' : '轻轻拨动，玩一会儿沙';
    sandTools.hidden = !looseReady;
    sandTools.querySelectorAll<HTMLButtonElement>('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sandTool === sandTool)));
    if (looseReady) scene?.setLooseTool(sandTool);
    brushControl.hidden = !looseReady;
    brushInput.disabled = !looseReady;
    scene?.setBrushRadius(brushRadius);
    densityControl.hidden = !looseReady || sandTool !== 'sprinkle';
    densityInput.disabled = !looseReady || sandTool !== 'sprinkle';
    scene?.setSprinkleDensity(sprinkleDensity);
    restore.hidden = !looseReady;
    restore.disabled = !looseReady;
    if (current) {
      if (thumb.getAttribute('src') !== current.draft.imageDataUrl) thumb.src = current.draft.imageDataUrl;
    }
    status.textContent = saveStatus.kind === 'saving' ? '正在保存到这个浏览器…'
      : saveStatus.kind === 'unavailable' ? saveStatus.message : '';
    status.hidden = !status.textContent;
    issue.hidden = phase.kind !== 'failure';
    issue.textContent = phase.kind === 'failure' ? phase.issue.message : '';
    fallback.hidden = !fatal;
    host.hidden = fatal;
  }

  function begin(): { id: number; signal: AbortSignal } {
    generation += 1;
    operation.abort();
    operation = new AbortController();
    return { id: generation, signal: operation.signal };
  }

  function currentIntent(id: number): boolean {
    return !disposed && id === generation && !operation.signal.aborted;
  }

  function onFault(fault: AppIssue): void {
    if (disposed) return;
    const previous = ready();
    begin();
    fatal = true;
    phase = { kind: 'failure', issue: fault, previous };
    render();
  }

  function ensureScene(): BottleScene {
    if (!scene) scene = createBottleScene(host, {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      onFault,
    });
    return scene;
  }

  async function saveDraft(draft: BottleDraft, id: number): Promise<void> {
    if (!currentIntent(id)) return;
    saveStatus = { kind: 'saving' };
    render();
    const result: SaveResult = await store.writeLatest(draft);
    if (!currentIntent(id)) return;
    saveStatus = result.kind === 'saved' ? { kind: 'idle' } : result;
    render();
  }

  async function showDraft(draft: BottleDraft, mode: Presentation, id: number, signal: AbortSignal): Promise<boolean> {
    const result = await ensureScene().show(draft, mode, signal);
    if (!currentIntent(id) || result === 'cancelled') return false;
    phase = { kind: mode, draft };
    fatal = false;
    render();
    return true;
  }

  async function loadPhoto(source: File | string, reset = false): Promise<void> {
    const previous = ready();
    const { id, signal } = begin();
    phase = { kind: 'loading', previous };
    render();
    try {
      if (reset) {
        saveStatus = { kind: 'idle' };
        const result = await store.clear();
        if (!currentIntent(id)) return;
        if (result.kind === 'unavailable') saveStatus = result;
      }
      const imageDataUrl = await normalizePhoto(source, signal);
      if (!currentIntent(id)) return;
      const draft = makeDraft(imageDataUrl);
      if (await showDraft(draft, source instanceof File ? 'loose' : 'sealed', id, signal)) {
        if (saveStatus.kind !== 'unavailable') saveStatus = { kind: 'idle' };
        render();
      }
    } catch (error) {
      if (!currentIntent(id)) return;
      const fault = issueFrom(error);
      fatal = fault.code === 'webgl-unavailable' || fault.code === 'context-lost';
      phase = { kind: 'failure', issue: fault, previous };
      render();
    }
  }

  async function bottle(): Promise<void> {
    const previous = ready();
    if (!previous || busy() || fatal) return;
    const { id, signal } = begin();
    try {
      if (previous.kind === 'sealed') {
        phase = { kind: 'pouring', draft: previous.draft };
        render();
        const result = await ensureScene().disassemble(signal);
        if (!currentIntent(id) || result === 'cancelled') return;
        phase = { kind: 'loose', draft: previous.draft };
        render();
        return;
      }
      phase = { kind: 'assembling', draft: previous.draft };
      render();
      const result = await ensureScene().assemble(signal);
      if (!currentIntent(id) || result === 'cancelled') return;
      const draft = scene?.getDraft() ?? previous.draft;
      phase = { kind: 'sealed', draft };
      render();
      await saveDraft(draft, id);
    } catch (error) {
      if (!currentIntent(id)) return;
      phase = { kind: 'failure', issue: issueFrom(error), previous };
      render();
    }
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) void loadPhoto(file);
  }, { signal: lifetime.signal });
  sandTools.querySelectorAll<HTMLButtonElement>('button').forEach(button => button.addEventListener('click', () => {
    if (!canPlayLoose()) return;
    sandTool = button.dataset.sandTool === 'sprinkle' ? 'sprinkle' : 'push';
    render();
  }, { signal: lifetime.signal }));
  densityInput.addEventListener('input', () => {
    sprinkleDensity = Number(densityInput.value);
    densityInput.setAttribute('aria-valuetext', `${sprinkleDensity}%`);
    scene?.setSprinkleDensity(sprinkleDensity);
  }, { signal: lifetime.signal });
  brushInput.addEventListener('input', () => {
    brushRadius = Number(brushInput.value);
    scene?.setBrushRadius(brushRadius);
  }, { signal: lifetime.signal });
  primary.addEventListener('click', () => { void bottle(); }, { signal: lifetime.signal });
  element<HTMLButtonElement>('[data-action="restore"]').addEventListener('click', () => {
    if (canPlayLoose()) scene?.restoreLoose();
  }, { signal: lifetime.signal });
  element<HTMLButtonElement>('[data-action="reset"]').addEventListener('click', () => { void loadPhoto(options.demoUrl, true); }, { signal: lifetime.signal });
  element<HTMLButtonElement>('[data-action="retry"]').addEventListener('click', () => {
    scene?.dispose();
    scene = null;
    fatal = false;
    void loadPhoto(ready()?.draft.imageDataUrl ?? options.demoUrl);
  }, { signal: lifetime.signal });
  host.addEventListener('keydown', event => {
    if (ready()?.kind !== 'sealed' || busy() || fatal) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') scene?.resetView();
      else {
        const step = Math.PI / 5;
        scene?.turnBy(event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
          event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0);
      }
    }
  }, { signal: lifetime.signal });
  render();

  return {
    async start() {
      if (started || disposed) return;
      started = true;
      const { id, signal } = begin();
      try {
        const loaded = await store.readLatest();
        if (!currentIntent(id)) return;
        if (loaded.kind === 'found') {
          await showDraft(loaded.draft, 'sealed', id, signal);
          render();
        } else {
          if (loaded.kind === 'unavailable') saveStatus = loaded;
          await loadPhoto(options.demoUrl);
        }
      } catch (error) {
        if (!currentIntent(id)) return;
        phase = { kind: 'failure', issue: issueFrom(error), previous: null };
        render();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation += 1;
      operation.abort();
      lifetime.abort();
      scene?.dispose();
      store.close();
      thumb.removeAttribute('src');
      root.replaceChildren();
    },
  };
}
