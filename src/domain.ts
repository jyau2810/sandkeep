export type ColorMode = 'original' | 'warm';
export type Presentation = 'loose' | 'sealed';

export type BottleDraft = Readonly<{
  schemaVersion: 1;
  imageDataUrl: string;
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
    title: '猫的午后',
    colorMode: 'original',
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
  return {
    schemaVersion: 1, imageDataUrl: d.imageDataUrl, title: d.title,
    colorMode: d.colorMode, seamWidth: d.seamWidth, createdAt: d.createdAt,
  };
}
