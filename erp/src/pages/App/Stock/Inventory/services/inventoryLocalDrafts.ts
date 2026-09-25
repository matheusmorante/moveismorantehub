import type { AuditItem } from '../types/inventoryAudit.types';

export interface WebInventoryDraft {
    id: string;
    code: string;
    date: string;
    name: string;
    responsibleId: string;
    hasStages: boolean;
    scopeType?: string;
    status: 'in_progress' | 'pending_sync';
    items: AuditItem[];
    scannedLabelIds?: string[];
    updatedAt: string;
}

const DATABASE_NAME = 'morante-inventory';
const STORE_NAME = 'drafts';
const CHANGE_EVENT = 'inventory-local-drafts-changed';

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
        reject(new Error('O navegador não disponibiliza IndexedDB para salvar a contagem.'));
        return;
    }
    const request = indexedDB.open(DATABASE_NAME, 2);
    request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
            request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!request.result.objectStoreNames.contains('catalog')) {
            request.result.createObjectStore('catalog', { keyPath: 'id' });
        }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const transact = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> => {
    const db = await openDatabase();
    return new Promise<T>((resolve, reject) => {
        let result: T;
        const transaction = db.transaction(STORE_NAME, mode);
        transaction.oncomplete = () => { db.close(); resolve(result); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
        transaction.onabort = () => { db.close(); reject(transaction.error); };
        run(transaction.objectStore(STORE_NAME), value => { result = value; });
    });
};

export const saveWebInventoryDraft = async (draft: WebInventoryDraft): Promise<void> => {
    await transact<void>('readwrite', store => { store.put(draft); });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const getWebInventoryDraft = (id: string): Promise<WebInventoryDraft | null> =>
    transact('readonly', (store, done) => {
        const request = store.get(id);
        request.onsuccess = () => done(request.result || null);
    });

export const listWebInventoryDrafts = (): Promise<WebInventoryDraft[]> =>
    transact('readonly', (store, done) => {
        const request = store.getAll();
        request.onsuccess = () => done(request.result as WebInventoryDraft[]);
    });

export const deleteWebInventoryDraft = async (id: string): Promise<void> => {
    await transact<void>('readwrite', store => { store.delete(id); });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const subscribeWebInventoryDrafts = (listener: () => void): (() => void) => {
    window.addEventListener(CHANGE_EVENT, listener);
    return () => window.removeEventListener(CHANGE_EVENT, listener);
};
