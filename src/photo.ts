const maxBytes = 15 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function photoError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

function checkAbort(signal?: AbortSignal): void {
  signal?.throwIfAborted();
}

export async function normalizePhoto(source: File | string, signal?: AbortSignal): Promise<string> {
  checkAbort(signal);
  let blob: Blob;
  if (source instanceof File) {
    if (!allowedTypes.has(source.type)) throw photoError('invalid-photo', '请选择 JPG、PNG 或 WebP 格式的照片。');
    if (source.size > maxBytes) throw photoError('photo-too-large', '这张照片超过 15 MB，请换一张小一点的。');
    blob = source;
  } else {
    try {
      const response = await fetch(source, { signal });
      if (!response.ok) throw new Error('Photo unavailable');
      blob = await response.blob();
    } catch {
      checkAbort(signal);
      throw photoError('decode-failed', '照片没有载入，请刷新后再试一次。');
    }
    if (!allowedTypes.has(blob.type)) throw photoError('invalid-photo', '照片格式无法使用，请换一张 JPG、PNG 或 WebP。');
    if (blob.size > maxBytes) throw photoError('photo-too-large', '这张照片超过 15 MB，请换一张小一点的。');
  }
  checkAbort(signal);
  const signature = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  checkAbort(signal);
  const jpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const png = signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47;
  const webp = String.fromCharCode(...signature.slice(0, 4)) === 'RIFF' && String.fromCharCode(...signature.slice(8, 12)) === 'WEBP';
  if (!jpeg && !png && !webp) throw photoError('invalid-photo', '请选择真正的 JPG、PNG 或 WebP 图片文件。');
  let bitmap: ImageBitmap | null = null;
  let fallback: HTMLImageElement | null = null;
  let objectUrl: string | null = null;
  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } else {
      objectUrl = URL.createObjectURL(blob);
      fallback = new Image();
      fallback.src = objectUrl;
      await fallback.decode();
    }
    checkAbort(signal);
    const image = bitmap ?? fallback!;
    const width = bitmap ? bitmap.width : fallback!.naturalWidth;
    const height = bitmap ? bitmap.height : fallback!.naturalHeight;
    if (!width || !height) throw photoError('decode-failed', '没有读到照片内容，请换一张照片。');
    if (width * height > 32_000_000) throw photoError('photo-too-large', '这张照片的尺寸超过 3200 万像素，请缩小后再试。');
    const scale = Math.min(1, 1536 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw photoError('decode-failed', '浏览器暂时无法处理照片，请刷新后再试。');
    context.fillStyle = '#ddc8a7';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    canvas.width = 1;
    canvas.height = 1;
    checkAbort(signal);
    if (dataUrl.length > 4 * 1024 * 1024) throw photoError('photo-too-large', '照片处理后仍然太大，请换一张小一点的。');
    return dataUrl;
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    if (error instanceof Error && 'code' in error && typeof error.code === 'string') throw error;
    throw photoError('decode-failed', '没有读懂这张照片，请换一张 JPG、PNG 或 WebP。');
  } finally {
    bitmap?.close();
    if (fallback) fallback.src = '';
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
