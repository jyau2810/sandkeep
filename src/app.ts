import { makeDraft, reviseDraft, type AppIssue, type BottleDraft, type DraftEdits, type LooseTool, type Presentation } from './domain';
import { normalizePhoto } from './photo';
import { createBottleStore, type SaveResult } from './persistence';
import { createBottleScene, type BottleScene } from './scene';

type Ready = { kind: 'loose'; draft: BottleDraft } | { kind: 'sealed'; draft: BottleDraft };
type Phase = Ready | { kind: 'loading'; previous: Ready | null }
  | { kind: 'assembling'; draft: BottleDraft }
  | { kind: 'failure'; issue: AppIssue; previous: Ready | null };
type SaveStatus = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'unavailable'; message: string };

const arrowLeft = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 7-5 5 5 5M5 12h14"/></svg>';
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
        <span class="header-note">留住一刻，慢慢看。</span>
      </header>
      <main>
        <div class="intro">
          <h1>把一张回忆，<br>藏进一瓶沙。</h1>
          <p class="intro-copy">照片化成暖砂，回忆有了形状。<br>装好以后，转一转，看看另一面。</p>
        </div>
        <div class="studio">
          <section class="bottle-gallery" aria-label="瓶子预览">
            <div class="stage-topline"><span class="stage-state" data-testid="stage-state">正在准备彩砂</span><span class="local-badge"><span aria-hidden="true"></span>只留在你的浏览器</span></div>
            <div class="scene-host" tabindex="0" role="img" aria-label="暖调沙画瓶。左右拖动旋转，也可使用左右方向键。" data-testid="bottle-scene"></div>
            <div class="loose-tools" role="group" aria-label="平面沙画玩法" hidden><div class="loose-tool-options"><button type="button" class="loose-tool-button" data-tool="push" aria-pressed="true">拨沙</button><button type="button" class="loose-tool-button" data-tool="swirl" aria-pressed="false">旋涡</button></div><button type="button" class="text-button loose-restore" data-action="restore">聚回照片</button></div>
            <div class="scene-fallback" hidden><p>这里需要浏览器支持 3D 画面。</p><p>请试试新版 Chrome、Edge 或 Safari，并开启硬件加速。</p><button class="text-button" type="button" data-action="retry">重新尝试</button></div>
            <div class="gallery-bottom"><div class="bottle-caption"><span class="caption-name">那天的海</span><span class="caption-detail">一张照片 · 一瓶回忆</span></div><div class="rotation"><button class="rotation-button" type="button" aria-label="向左旋转瓶子" data-action="left">${arrowLeft}</button><span class="rotation-hint">左右拖动，转一转</span><button class="rotation-button" type="button" aria-label="向右旋转瓶子" data-action="right">${arrowRight}</button></div></div>
          </section>
          <section class="creation-panel" aria-label="制作你的瓶子">
            <div class="panel-heading"><h2>这一瓶，装什么？</h2><p>一片海、一只猫，或某个想留住的瞬间。</p></div>
            <div class="photo-picker"><img class="photo-thumb" alt="当前照片预览"><div class="photo-choice"><label class="upload-button" for="photo-input">选一张自己的照片<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M5 15v5h14v-5"/></svg></label><input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp"><span class="file-help">JPG / PNG / WebP · 不超过 15 MB</span></div></div>
            <div class="title-field"><label for="bottle-title">给这瓶回忆起个名字</label><input id="bottle-title" type="text" maxlength="60" placeholder="比如，那天的海" autocomplete="off"><span class="field-help">最多 30 个字</span></div>
            <details class="seam-details"><summary>瓶身接缝<svg class="disclosure-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="seam-setting"><label for="seam-width">用一道细沙纹连接照片两端</label><input id="seam-width" type="range" min="0" max="4" step="0.2" value="1.8"><div class="range-labels"><span>无沙纹</span><span>宽一点</span></div></div></details>
            <div class="make-area"><button class="primary-button" type="button" data-action="bottle" disabled><span>装进瓶子</span>${arrowRight}</button><p class="action-hint">装瓶前，试着在彩砂上划一划。</p><div class="status-message" role="status" aria-live="polite" data-testid="app-status"></div><div class="issue-message" role="alert" hidden></div><button class="text-button reset-button" type="button" data-action="reset">换回示例，重新开始</button></div>
          </section>
        </div>
      </main>
      <footer class="site-footer"><span>每一粒沙，都是照片里的一点颜色。</span><span>照片在本机处理 · 自动保存最近一瓶</span></footer>
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
  const titleInput = element<HTMLInputElement>('#bottle-title');
  const seamInput = element<HTMLInputElement>('#seam-width');
  const primary = element<HTMLButtonElement>('[data-action="bottle"]');
  const stageState = element<HTMLSpanElement>('.stage-state');
  const captionName = element<HTMLSpanElement>('.caption-name');
  const actionHint = element<HTMLParagraphElement>('.action-hint');
  const status = element<HTMLDivElement>('.status-message');
  const issue = element<HTMLDivElement>('.issue-message');
  const fallback = element<HTMLDivElement>('.scene-fallback');
  const looseTools = element<HTMLDivElement>('.loose-tools');
  const toolButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-tool]')];
  const rotationButtons = [...root.querySelectorAll<HTMLButtonElement>('.rotation-button')];
  const store = createBottleStore();
  const lifetime = new AbortController();
  let scene: BottleScene | null = null;
  let phase: Phase = { kind: 'loading', previous: null };
  let saveStatus: SaveStatus = { kind: 'idle' };
  let generation = 0;
  let operation = new AbortController();
  let saveTimer: number | undefined;
  let disposed = false;
  let started = false;
  let fatal = false;
  let looseTool: LooseTool = 'push';

  function ready(): Ready | null {
    if (phase.kind === 'loose' || phase.kind === 'sealed') return phase;
    if (phase.kind === 'loading' || phase.kind === 'failure') return phase.previous;
    return { kind: 'loose', draft: phase.draft };
  }

  function canPlayLoose(): boolean {
    return ready()?.kind === 'loose' && phase.kind !== 'loading' && phase.kind !== 'assembling' && !fatal;
  }

  function render(): void {
    if (disposed) return;
    const current = ready();
    const busy = phase.kind === 'loading' || phase.kind === 'assembling';
    const sealed = current?.kind === 'sealed';
    root.dataset.phase = phase.kind;
    host.setAttribute('aria-busy', String(busy));
    const looseReady = canPlayLoose();
    host.setAttribute('aria-label', sealed ? '暖调沙画瓶，左右拖动旋转，也可使用左右方向键。' : '带画框的平面暖调沙画。选择拨沙或旋涡后，在画中拖动。聚回照片可以复原。');
    host.dataset.presentation = phase.kind === 'assembling' ? 'assembling' : sealed ? 'sealed' : 'loose';
    stageState.textContent = phase.kind === 'loading' ? '正在准备彩砂' : phase.kind === 'assembling' ? '把这一刻，慢慢装好' : sealed ? '回忆已装瓶' : '先玩一会儿彩砂';
    primary.disabled = busy || !current || fatal;
    primary.querySelector('span')!.textContent = phase.kind === 'assembling' ? '彩砂正在入瓶' : sealed ? '拆开再玩' : '装进瓶子';
    actionHint.textContent = phase.kind === 'assembling' ? '稍等片刻，照片正在沙子里重现。' : sealed ? '拖动瓶身，转一圈看完整张照片。' : looseTool === 'swirl' ? '在画中按住，卷起一阵旋涡。' : '在画中拖动拨沙，聚回照片可以复原。';
    titleInput.disabled = busy || !current || fatal;
    seamInput.disabled = busy || !current || fatal;
    looseTools.hidden = !looseReady;
    toolButtons.forEach(button => {
      button.disabled = !looseReady;
      button.setAttribute('aria-pressed', String(looseTool === button.dataset.tool));
    });
    rotationButtons.forEach(button => { button.disabled = busy || !sealed || fatal; });
    element<HTMLSpanElement>('.rotation-hint').textContent = sealed ? '左右拖动，转一转' : '装好以后，转着看';
    if (current) {
      if (thumb.getAttribute('src') !== current.draft.imageDataUrl) thumb.src = current.draft.imageDataUrl;
      captionName.textContent = current.draft.title || '无题的回忆';
      if (document.activeElement !== titleInput) titleInput.value = current.draft.title;
      seamInput.value = String(current.draft.seamWidth * 100);
    }
    status.textContent = saveStatus.kind === 'saving' ? '正在保存到这个浏览器…' : saveStatus.kind === 'saved' ? '已保存在这个浏览器，下次打开还能看见。' : saveStatus.kind === 'unavailable' ? saveStatus.message : '';
    issue.hidden = phase.kind !== 'failure';
    issue.textContent = phase.kind === 'failure' ? phase.issue.message : '';
    fallback.hidden = !fatal;
    host.hidden = fatal;
  }

  function begin(): { id: number; signal: AbortSignal } {
    generation += 1;
    operation.abort();
    operation = new AbortController();
    window.clearTimeout(saveTimer);
    saveTimer = undefined;
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
    saveStatus = result.kind === 'saved' ? { kind: 'saved' } : result;
    render();
  }

  async function showDraft(draft: BottleDraft, mode: Presentation, id: number, signal: AbortSignal): Promise<boolean> {
    const result = await ensureScene().show(draft, mode, signal);
    if (!currentIntent(id) || result === 'cancelled') return false;
    phase = { kind: mode, draft };
    if (mode === 'loose') {
      looseTool = 'push';
      scene?.setLooseTool(looseTool);
    }
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
      const initial = makeDraft(imageDataUrl);
      const draft = source instanceof File ? reviseDraft(initial, { title: '我的一瓶回忆' }) : initial;
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

  async function editAppearance(edits: DraftEdits): Promise<void> {
    const previous = ready();
    if (!previous || phase.kind === 'assembling' || phase.kind === 'loading') return;
    const draft = reviseDraft(previous.draft, edits);
    const { id, signal } = begin();
    phase = { kind: 'loading', previous };
    render();
    try {
      if (await showDraft(draft, previous.kind, id, signal) && previous.kind === 'sealed') await saveDraft(draft, id);
    } catch (error) {
      if (!currentIntent(id)) return;
      phase = { kind: 'failure', issue: issueFrom(error), previous };
      render();
    }
  }

  async function bottle(): Promise<void> {
    const previous = ready();
    if (!previous || phase.kind === 'assembling' || phase.kind === 'loading' || fatal) return;
    const { id, signal } = begin();
    try {
      if (previous.kind === 'sealed') {
        phase = { kind: 'loading', previous };
        render();
        await showDraft(previous.draft, 'loose', id, signal);
        return;
      }
      phase = { kind: 'assembling', draft: previous.draft };
      render();
      const result = await ensureScene().assemble(signal);
      if (!currentIntent(id) || result === 'cancelled') return;
      phase = { kind: 'sealed', draft: previous.draft };
      render();
      await saveDraft(previous.draft, id);
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
  primary.addEventListener('click', () => { void bottle(); }, { signal: lifetime.signal });
  toolButtons.forEach(button => button.addEventListener('click', () => {
    if (!canPlayLoose()) return;
    looseTool = button.dataset.tool === 'swirl' ? 'swirl' : 'push';
    scene?.setLooseTool(looseTool);
    render();
  }, { signal: lifetime.signal }));
  element<HTMLButtonElement>('[data-action="restore"]').addEventListener('click', () => {
    if (canPlayLoose()) scene?.restoreLoose();
  }, { signal: lifetime.signal });
  seamInput.addEventListener('change', () => { void editAppearance({ seamWidth: Number(seamInput.value) / 100 }); }, { signal: lifetime.signal });
  titleInput.addEventListener('input', () => {
    const previous = ready();
    if (!previous || phase.kind === 'loading' || phase.kind === 'assembling') return;
    const entered = Array.from(titleInput.value).slice(0, 30).join('');
    if (entered !== titleInput.value) titleInput.value = entered;
    const draft = reviseDraft(previous.draft, { title: entered });
    phase = { kind: previous.kind, draft };
    window.clearTimeout(saveTimer);
    const id = generation;
    if (previous.kind === 'sealed') saveTimer = window.setTimeout(() => { void saveDraft(draft, id); }, 350);
    render();
  }, { signal: lifetime.signal });
  titleInput.addEventListener('blur', () => { titleInput.value = ready()?.draft.title ?? ''; }, { signal: lifetime.signal });
  element<HTMLButtonElement>('[data-action="reset"]').addEventListener('click', () => { void loadPhoto(options.demoUrl, true); }, { signal: lifetime.signal });
  element<HTMLButtonElement>('[data-action="retry"]').addEventListener('click', () => {
    scene?.dispose();
    scene = null;
    fatal = false;
    void loadPhoto(ready()?.draft.imageDataUrl ?? options.demoUrl);
  }, { signal: lifetime.signal });
  function turn(direction: number): void {
    if (ready()?.kind === 'sealed' && phase.kind !== 'loading' && !fatal) scene?.turnBy(direction * Math.PI / 5);
  }
  element<HTMLButtonElement>('[data-action="left"]').addEventListener('click', () => turn(-1), { signal: lifetime.signal });
  element<HTMLButtonElement>('[data-action="right"]').addEventListener('click', () => turn(1), { signal: lifetime.signal });
  host.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      turn(event.key === 'ArrowLeft' ? -1 : 1);
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
          if (await showDraft(loaded.draft, 'sealed', id, signal)) saveStatus = { kind: 'saved' };
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
      window.clearTimeout(saveTimer);
      scene?.dispose();
      store.close();
      thumb.removeAttribute('src');
      root.replaceChildren();
    },
  };
}
