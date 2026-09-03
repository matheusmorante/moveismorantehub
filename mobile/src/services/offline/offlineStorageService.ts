import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncEvent, MediaUploadItem, SyncEventState } from './offlineTypes';

const EVENT_QUEUE_KEY = '@morante_offline_event_queue_v1';
const MEDIA_QUEUE_KEY = '@morante_offline_media_queue_v1';
const WORKING_SET_CACHE_KEY_PREFIX = '@morante_working_set_cache_v1_';

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
      const raw = await AsyncStorage.getItem(EVENT_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[OfflineStorage] Erro ao carregar fila de eventos:', e);
      return [];
    }
  },

  async saveEventQueue(queue: SyncEvent[]): Promise<void> {
    try {
      await AsyncStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(queue));
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

  async removeEvent(eventId: string): Promise<void> {
    const queue = await this.getEventQueue();
    const filtered = queue.filter((ev) => ev.eventId !== eventId);
    await this.saveEventQueue(filtered);
  },

  async clearConfirmedEvents(): Promise<void> {
    const queue = await this.getEventQueue();
    const remaining = queue.filter((ev) => ev.state !== 'CONFIRMED');
    await this.saveEventQueue(remaining);
  },

  // === FILA DE MÍDIA ===
  async getMediaQueue(): Promise<MediaUploadItem[]> {
    try {
      const raw = await AsyncStorage.getItem(MEDIA_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  async saveMediaQueue(queue: MediaUploadItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(MEDIA_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('[OfflineStorage] Erro ao salvar fila de mídia:', e);
    }
  },

  async pushMedia(
    entityType: MediaUploadItem['entityType'],
    entityId: string,
    localUri: string,
    storageBucket: string,
    storagePath: string,
    eventId?: string
  ): Promise<MediaUploadItem> {
    const item: MediaUploadItem = {
      id: generateUUID(),
      eventId,
      entityType,
      entityId,
      localUri,
      storageBucket,
      storagePath,
      state: 'PENDING',
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    const queue = await this.getMediaQueue();
    queue.push(item);
    await this.saveMediaQueue(queue);
    return item;
  },

  // === CACHE DE TRABALHO (WORKING SET) ===
  async cacheWorkingSet<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${WORKING_SET_CACHE_KEY_PREFIX}${key}`,
        JSON.stringify({ data, cachedAt: new Date().toISOString() })
      );
    } catch (e) {
      console.warn('[OfflineStorage] Erro ao gravar cache local:', e);
    }
  },

  async getWorkingSet<T>(key: string): Promise<{ data: T; cachedAt: string } | null> {
    try {
      const raw = await AsyncStorage.getItem(`${WORKING_SET_CACHE_KEY_PREFIX}${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
};
