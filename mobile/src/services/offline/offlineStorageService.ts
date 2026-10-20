import { SyncEvent, MediaUploadItem, SyncEventState } from './offlineTypes';

const EVENT_QUEUE_KEY = '@morante_offline_event_queue_v1';
const MEDIA_QUEUE_KEY = '@morante_offline_media_queue_v1';
const WORKING_SET_CACHE_KEY_PREFIX = '@morante_working_set_cache_v1_';

const memoryStorageFallback = new Map<string, string>();
let asyncStoragePromise: Promise<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
} | null> | null = null;

const isTestEnvironment = (): boolean =>
  typeof process !== 'undefined' &&
  Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');

const resolveAsyncStorage = async () => {
  if (typeof window === 'undefined' && isTestEnvironment()) {
    return null;
  }
  if (!asyncStoragePromise) {
    asyncStoragePromise = Promise.resolve()
      .then(() => {
        const mod = require('@react-native-async-storage/async-storage');
        return mod.default || mod;
      })
      .catch(() => null);
  }
  return asyncStoragePromise;
};

const safeGetItem = async (key: string): Promise<string | null> => {
  const storage = await resolveAsyncStorage();
  if (!storage) {
    return memoryStorageFallback.get(key) ?? null;
  }
  try {
    return await storage.getItem(key);
  } catch {
    return memoryStorageFallback.get(key) ?? null;
  }
};

const safeSetItem = async (key: string, value: string): Promise<void> => {
  memoryStorageFallback.set(key, value);
  const storage = await resolveAsyncStorage();
  if (!storage) {
    return;
  }
  await storage.setItem(key, value);
};

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const offlineStorageService = {
  // === FILA DE EVENTOS ===
  async getEventQueue(): Promise<SyncEvent[]> {
    try {
      const raw = await safeGetItem(EVENT_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[OfflineStorage] Erro ao carregar fila de eventos:', e);
      return [];
    }
  },

  async saveEventQueue(queue: SyncEvent[]): Promise<void> {
    try {
      await safeSetItem(EVENT_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('[OfflineStorage] Erro ao salvar fila de eventos:', e);
    }
  },

  async pushEvent<T>(
    type: SyncEvent['type'],
    entityType: SyncEvent['entityType'],
    entityId: string,
    payload: T,
    occurredAt?: string
  ): Promise<SyncEvent<T>> {
    const now = new Date().toISOString();
    const newEvent: SyncEvent<T> = {
      eventId: generateUUID(),
      type,
      entityType,
      entityId,
      state: 'PENDING',
      occurredAt: occurredAt || now,
      createdAt: now,
      payload,
      retryCount: 0,
    };

    const queue = await this.getEventQueue();
    queue.push(newEvent);
    await this.saveEventQueue(queue);
    return newEvent;
  },

  async updateEventState(
    eventId: string,
    state: SyncEventState,
    rejectionReason?: string
  ): Promise<void> {
    const queue = await this.getEventQueue();
    const updated = queue.map((ev) => {
      if (ev.eventId === eventId) {
        return {
          ...ev,
          state,
          rejectionReason: rejectionReason || ev.rejectionReason,
          syncedAt: state === 'CONFIRMED' ? new Date().toISOString() : ev.syncedAt,
          retryCount: state === 'SYNCING' ? ev.retryCount + 1 : ev.retryCount,
        };
      }
      return ev;
    });
    await this.saveEventQueue(updated);
  },

  async clearConfirmedEvents(): Promise<void> {
    const queue = await this.getEventQueue();
    const active = queue.filter((ev) => ev.state !== 'CONFIRMED');
    await this.saveEventQueue(active);
  },

  // === FILA DE MÍDIA ===
  async getMediaQueue(): Promise<MediaUploadItem[]> {
    try {
      const raw = await safeGetItem(MEDIA_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[OfflineStorage] Erro ao carregar fila de mídia:', e);
      return [];
    }
  },

  async saveMediaQueue(queue: MediaUploadItem[]): Promise<void> {
    try {
      await safeSetItem(MEDIA_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('[OfflineStorage] Erro ao salvar fila de mídia:', e);
    }
  },

  async pushMedia(
    eventId: string,
    entityId: string,
    localUri: string,
    mimeType: string,
    targetField: string
  ): Promise<MediaUploadItem> {
    const item: MediaUploadItem = {
      mediaId: generateUUID(),
      eventId,
      entityId,
      localUri,
      mimeType,
      targetField,
      state: 'PENDING_UPLOAD',
      retryCount: 0,
    };
    const queue = await this.getMediaQueue();
    queue.push(item);
    await this.saveMediaQueue(queue);
    return item;
  },

  async updateMediaStatus(
    mediaId: string,
    state: MediaUploadItem['state'],
    remoteUrl?: string,
    errorReason?: string
  ): Promise<void> {
    const queue = await this.getMediaQueue();
    const updated = queue.map((m) => {
      if (m.mediaId === mediaId) {
        return {
          ...m,
          state,
          remoteUrl: remoteUrl || m.remoteUrl,
          errorReason: errorReason || m.errorReason,
          retryCount: state === 'UPLOADING' ? m.retryCount + 1 : m.retryCount,
        };
      }
      return m;
    });
    await this.saveMediaQueue(updated);
  },

  // === CACHE LOCAL DO WORKING SET ===
  async cacheWorkingSet<T>(key: string, data: T): Promise<void> {
    try {
      const payload = {
        data,
        cachedAt: new Date().toISOString(),
      };
      await safeSetItem(WORKING_SET_CACHE_KEY_PREFIX + key, JSON.stringify(payload));
    } catch (e) {
      console.error(`[OfflineStorage] Erro ao salvar working set (${key}):`, e);
    }
  },

  async getWorkingSet<T>(key: string): Promise<{ data: T; cachedAt: string } | null> {
    try {
      const raw = await safeGetItem(WORKING_SET_CACHE_KEY_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`[OfflineStorage] Erro ao carregar working set (${key}):`, e);
      return null;
    }
  },
};
