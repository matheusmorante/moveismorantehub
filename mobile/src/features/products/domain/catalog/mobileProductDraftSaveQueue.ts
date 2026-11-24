export interface MobileProductDraftSaveEntry<T> {
  revision: number;
  snapshot: T;
}

/** Serializes writes and coalesces queued edits to the newest full snapshot. */
export const createMobileProductDraftSaveQueue = <T,>(
  save: (entry: MobileProductDraftSaveEntry<T>) => Promise<boolean>
) => {
  let inFlight: Promise<boolean> | null = null;
  let activeRevision: number | null = null;
  let queued: MobileProductDraftSaveEntry<T> | null = null;

  const enqueue = (entry: MobileProductDraftSaveEntry<T>): Promise<boolean> => {
    if (inFlight && activeRevision !== null && entry.revision <= activeRevision) {
      return inFlight;
    }
    if (queued && entry.revision < queued.revision) return inFlight ?? Promise.resolve(true);
    queued = entry;
    if (inFlight) return inFlight;

    const run = async () => {
      while (queued) {
        const next = queued;
        queued = null;
        activeRevision = next.revision;
        let saved: boolean;
        try {
          saved = await save(next);
        } catch (error) {
          queued = null;
          throw error;
        } finally {
          activeRevision = null;
        }
        if (!saved) {
          queued = null;
          return false;
        }
      }
      return true;
    };

    const task = run();
    inFlight = task.finally(() => {
      inFlight = null;
      activeRevision = null;
    });
    return inFlight;
  };

  return {
    enqueue,
    waitForIdle: () => inFlight ?? Promise.resolve(true),
    clearQueued: () => {
      queued = null;
    },
  };
};
