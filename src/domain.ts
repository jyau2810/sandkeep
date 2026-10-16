export type ColorMode = 'original' | 'warm';
export type Presentation = 'loose' | 'sealed';
export type LooseTool = 'push' | 'swirl' | 'sprinkle';

export type BottleDraft = Readonly<{
  schemaVersion: 1;
  imageDataUrl: string;
  sandState?: Uint8Array;
  title: string;
  colorMode: ColorMode;
  seamWidth: number;
  createdAt: number;
}>;

export type DraftEdits = Partial<Pick<BottleDraft, 'title' | 'colorMode' | 'seamWidth'>>;
export type AppIssue = Readonly<{
  code: 'invalid-photo' | 'photo-too-large' | 'decode-failed' | 'webgl-unavailable' | 'context-lost' | 'render-failed';
  message: string;
}>;
export type SceneResult = 'completed' | 'cancelled';

const imagePattern = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;
const maxImageLength = 4 * 1024 * 1024;

export function makeDraft(imageDataUrl: string, now = Date.now()): BottleDraft {
  const draft = parseDraft({
    schemaVersion: 1,
    imageDataUrl,
    title: '',
    colorMode: 'warm',
    seamWidth: 0.018,
    createdAt: now,
  });
  if (!draft) throw new Error('照片数据无法使用，请换一张试试。');
  return draft;
}

export function reviseDraft(draft: BottleDraft, edits: DraftEdits): BottleDraft {
  const next = parseDraft({
    ...draft,
    ...edits,
    title: Array.from((edits.title ?? draft.title).trim()).slice(0, 30).join(''),
  });
  if (!next) throw new Error('瓶子设置无法使用，请重试。');
  return next;
}

export function parseDraft(value: unknown): BottleDraft | null {
  if (!value || typeof value !== 'object') return null;
  const d = value as Record<string, unknown>;
  if (d.schemaVersion !== 1 || typeof d.imageDataUrl !== 'string'
    || d.imageDataUrl.length > maxImageLength || !imagePattern.test(d.imageDataUrl)
    || typeof d.title !== 'string' || d.title !== d.title.trim() || Array.from(d.title).length > 30
    || (d.colorMode !== 'original' && d.colorMode !== 'warm')
    || typeof d.seamWidth !== 'number' || !Number.isFinite(d.seamWidth) || d.seamWidth < 0 || d.seamWidth > 0.04
    || typeof d.createdAt !== 'number' || !Number.isFinite(d.createdAt) || d.createdAt < 0) return null;
  if (d.sandState !== undefined) {
    if (!(d.sandState instanceof Uint8Array) || d.sandState.byteLength % 28 !== 0 || d.sandState.byteLength < 28 || d.sandState.byteLength > 150000 * 28) return null;
    const state = new DataView(d.sandState.buffer, d.sandState.byteOffset, d.sandState.byteLength);
    for (let i = 0; i < state.byteLength; i += 28) {
      const x = state.getFloat64(i, true), y = state.getFloat64(i + 8, true), density = state.getFloat64(i + 16, true);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(density) || x < 0 || x > 720 || y < 0 || y > 432 || density < 0 || density > 16) return null;
    }
  }
  return {
    schemaVersion: 1, imageDataUrl: d.imageDataUrl, title: d.title,
    ...(d.sandState instanceof Uint8Array ? { sandState: d.sandState } : {}),
    colorMode: 'warm', seamWidth: d.seamWidth, createdAt: d.createdAt,
  };
}
