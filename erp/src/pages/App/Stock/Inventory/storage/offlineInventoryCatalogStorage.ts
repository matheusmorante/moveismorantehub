import type {
  OfflineInventoryCatalog,
  OfflineInventoryCatalogRow,
} from '../types/offlineInventoryCatalog.types';

const DATABASE_NAME = 'morante-inventory';
const STORE_NAME = 'catalog';
const LEGACY_CATALOG_KEY = 'inventory-identification-index';
const CATALOG_KEY = 'inventory-identification-index-v2';

export const createEmptyOfflineInventoryCatalog = (): OfflineInventoryCatalog => ({
  products: {},
  variations: {},
  labels: {},
  suppliers: {},
  cursors: {},
  syncedAt: null,
  deletionCursor: 0,
});

export const compactOfflineInventoryCatalogRows = (
  rows: Record<string, OfflineInventoryCatalogRow>,
  keys: readonly string[]
): Record<string, OfflineInventoryCatalogRow> =>
  Object.fromEntries(
    Object.entries(rows).map(([id, row]) => [
      id,
      Object.fromEntries(
        keys.filter((key) => row[key] !== undefined).map((key) => [key, row[key]])
      ),
    ])
  );

const openCatalogDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('drafts'))
        db.createObjectStore('drafts', { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_NAME))
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      if (!db.objectStoreNames.contains('outbox'))
        db.createObjectStore('outbox', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const usableSnapshot = (snapshot: unknown): snapshot is OfflineInventoryCatalog => {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const value = snapshot as Partial<OfflineInventoryCatalog>;
  return Boolean(
    value.products && value.variations && value.labels && value.suppliers && value.cursors
  );
};

export const readOfflineInventoryCatalogSnapshot = async (): Promise<
  OfflineInventoryCatalog | null
> => {
  const db = await openCatalogDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(CATALOG_KEY);
    request.onsuccess = () => {
      if (usableSnapshot(request.result?.snapshot)) {
        resolve(request.result.snapshot);
        return;
      }
      const legacyRequest = store.get(LEGACY_CATALOG_KEY);
      legacyRequest.onsuccess = () =>
        resolve(
          usableSnapshot(legacyRequest.result?.snapshot) ? legacyRequest.result.snapshot : null
        );
    };
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const writeOfflineInventoryCatalogSnapshot = async (
  snapshot: OfflineInventoryCatalog
): Promise<void> => {
  const db = await openCatalogDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction
      .objectStore(STORE_NAME)
      .put({ id: CATALOG_KEY, snapshot, updatedAt: new Date().toISOString() });
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
};
