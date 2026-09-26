export interface InventorySubmission {
    contractVersion: 1 | 2;
    auditId: string;
    code: string;
    observation: Record<string, unknown>;
    items: Array<Record<string, unknown>>;
    responsibleName: string;
}

interface OutboxEntry {
    id: string;
    payload: InventorySubmission;
    status: 'pending';
    retryCount: number;
    lastError: string | null;
    createdAt: string;
    updatedAt: string;
}

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB indisponível para submissão do inventário.')); return; }
    const request = indexedDB.open('morante-inventory', 3);
    request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of ['catalog', 'drafts', 'outbox']) {
            if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
        }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const transact = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> => {
    const db = await openDatabase();
    return new Promise<T>((resolve, reject) => {
        let result: T;
        const transaction = db.transaction('outbox', mode);
        transaction.oncomplete = () => { db.close(); resolve(result); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
        transaction.onabort = () => { db.close(); reject(transaction.error); };
        run(transaction.objectStore('outbox'), value => { result = value; });
    });
};

export const getInventorySubmission = async (auditId: string): Promise<InventorySubmission | null> => {
    const entry = await transact<OutboxEntry | null>('readonly', (store, done) => {
        const request = store.get(auditId);
        request.onsuccess = () => done(request.result || null);
    });
    if (!entry) return null;
    if (![1, 2].includes(entry.payload.contractVersion) || entry.payload.auditId !== auditId) throw new Error('Submissão local de inventário inválida.');
    return entry.payload;
};

export const freezeInventorySubmission = async (submission: InventorySubmission): Promise<InventorySubmission> => {
    const stored = await transact<InventorySubmission>('readwrite', (store, done) => {
        const request = store.get(submission.auditId);
        request.onsuccess = () => {
            const existing = request.result as OutboxEntry | undefined;
            if (existing) { done(existing.payload); return; }
            const now = new Date().toISOString();
            store.put({ id: submission.auditId, payload: submission, status: 'pending', retryCount: 0,
                lastError: null, createdAt: now, updatedAt: now } satisfies OutboxEntry);
            done(submission);
        };
    });
    const verified = await getInventorySubmission(submission.auditId);
    if (!verified) throw new Error('Não foi possível confirmar a submissão local do inventário.');
    return stored;
};

export const recordInventorySubmissionFailure = async (auditId: string, error: unknown): Promise<void> => {
    await transact<void>('readwrite', (store, done) => {
        const request = store.get(auditId);
        request.onsuccess = () => {
            const entry = request.result as OutboxEntry | undefined;
            if (entry) store.put({ ...entry, retryCount: entry.retryCount + 1,
                lastError: String(error instanceof Error ? error.message : error).slice(0, 500), updatedAt: new Date().toISOString() });
            done();
        };
    });
};

export const deleteInventorySubmission = async (auditId: string): Promise<void> => {
    await transact<void>('readwrite', (store, done) => { store.delete(auditId); done(); });
};
