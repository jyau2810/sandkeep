import { parseDraft, type BottleDraft } from './domain';

export type LoadLatest = { kind: 'found'; draft: BottleDraft } | { kind: 'empty' } | { kind: 'unavailable'; message: string };
export type SaveResult = { kind: 'saved' } | { kind: 'unavailable'; message: string };
export interface BottleStore {
  readLatest(): Promise<LoadLatest>;
  writeLatest(draft: BottleDraft): Promise<SaveResult>;
  clear(): Promise<SaveResult>;
  close(): void;
}

const unavailable = { kind: 'unavailable', message: '浏览器未能保存这只瓶子，你仍然可以继续玩。' } as const;

async function validImage(draft: BottleDraft): Promise<boolean> {
  const image = new Image();
  try {
    image.src = draft.imageDataUrl;
    await image.decode();
    return image.naturalWidth > 0 && image.naturalHeight > 0
      && Math.max(image.naturalWidth, image.naturalHeight) <= 1536
      && image.naturalWidth * image.naturalHeight <= 32_000_000;
  } catch {
    return false;
  } finally {
    image.src = '';
  }
}

export function createBottleStore(): BottleStore {
  let closed = false;
  let database: Promise<IDBDatabase> | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  function open(): Promise<IDBDatabase> {
    if (closed) return Promise.reject(new Error('Store closed'));
    if (database) return database;
    database = new Promise((resolve, reject) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        settled = true;
        reject(new Error('Storage unavailable'));
      }, 2500);
      try {
        const request = indexedDB.open('sandkeep', 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('bottles')) request.result.createObjectStore('bottles');
        };
        request.onerror = () => {
          window.clearTimeout(timer);
          settled = true;
          reject(request.error);
        };
        request.onblocked = () => {
          window.clearTimeout(timer);
          settled = true;
          reject(new Error('Storage blocked'));
        };
        request.onsuccess = () => {
          window.clearTimeout(timer);
          if (closed || settled) {
            request.result.close();
            reject(new Error('Storage closed'));
          } else {
            settled = true;
            request.result.onversionchange = () => request.result.close();
            resolve(request.result);
          }
        };
      } catch (error) {
        window.clearTimeout(timer);
        settled = true;
        reject(error);
      }
    });
    return database;
  }

  function mutation(value: BottleDraft | null): Promise<SaveResult> {
    const failed: SaveResult = value === null ? { kind: 'unavailable', message: '浏览器未能清除本地收藏。当前仍可重新制作。' } : unavailable;
    const operation = queue.then(async (): Promise<SaveResult> => {
      try {
        const db = await open();
        if (closed) return failed;
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction('bottles', 'readwrite');
          const store = transaction.objectStore('bottles');
          if (value === null) store.delete('latest');
          else store.put(value, 'latest');
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
        return { kind: 'saved' };
      } catch {
        return failed;
      }
    });
    queue = operation;
    return operation;
  }

  return {
    async readLatest() {
      await queue;
      try {
        const db = await open();
        const value = await new Promise<unknown>((resolve, reject) => {
          const transaction = db.transaction('bottles', 'readonly');
          const request = transaction.objectStore('bottles').get('latest');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          transaction.onabort = () => reject(transaction.error);
        });
        if (value === undefined) return { kind: 'empty' };
        const draft = parseDraft(value);
        if (!draft || !await validImage(draft)) {
          return { kind: 'unavailable', message: '上次的瓶子没有完整保存，先试试内置示例吧。' };
        }
        return { kind: 'found', draft };
      } catch {
        return { kind: 'unavailable', message: '浏览器暂时无法读取本地收藏，你仍然可以制作瓶子。' };
      }
    },
    writeLatest(draft) {
      const admitted = parseDraft(draft);
      return admitted ? mutation(admitted) : Promise.resolve(unavailable);
    },
    clear() {
      return mutation(null);
    },
    close() {
      if (closed) return;
      closed = true;
      void database?.then(db => db.close(), () => undefined);
    },
  };
}
