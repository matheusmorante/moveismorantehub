export type AssistantOrderTimingPlatform = 'erp' | 'mobile';
export type AssistantOrderTimingAction = 'create' | 'edit';

export interface AssistantOrderTimingSample {
  platform: AssistantOrderTimingPlatform;
  action: AssistantOrderTimingAction;
  result: 'success' | 'failure';
  timeToFirstSignalMs: number | null;
  timeToFinalResultMs: number;
}

interface PendingTurn {
  startedAt: number;
  firstSignalAt: number | null;
}

interface AssistantOrderTimingStore {
  active: Partial<Record<AssistantOrderTimingPlatform, PendingTurn>>;
  samples: AssistantOrderTimingSample[];
}

type TimingGlobal = typeof globalThis & {
  __MORANTEHUB_ASSISTANT_ORDER_TIMINGS__?: AssistantOrderTimingStore;
};

const MAX_SAMPLES = 200;

function getStore(): AssistantOrderTimingStore {
  const target = globalThis as TimingGlobal;
  return (target.__MORANTEHUB_ASSISTANT_ORDER_TIMINGS__ ||= { active: {}, samples: [] });
}

function now(): number {
  return typeof globalThis.performance?.now === 'function'
    ? globalThis.performance.now()
    : Date.now();
}

/** Starts an in-memory timer for the next assistant turn on one platform. */
export function beginAssistantOrderTimingTurn(platform: AssistantOrderTimingPlatform): void {
  getStore().active[platform] = { startedAt: now(), firstSignalAt: null };
}

/** Called after the loading state has made it through two render frames. */
export function markAssistantOrderFirstSignal(platform: AssistantOrderTimingPlatform): void {
  const pending = getStore().active[platform];
  if (pending && pending.firstSignalAt === null) pending.firstSignalAt = now();
}

/** Records only fixed labels and timings; no prompt, order, item, or user data. */
export function recordAssistantOrderTiming(
  platform: AssistantOrderTimingPlatform,
  action: AssistantOrderTimingAction,
  succeeded: boolean,
): void {
  const store = getStore();
  const pending = store.active[platform];
  if (!pending) return;

  const completedAt = now();
  store.samples.push({
    platform,
    action,
    result: succeeded ? 'success' : 'failure',
    timeToFirstSignalMs: pending.firstSignalAt === null
      ? null
      : Math.max(0, Math.round(pending.firstSignalAt - pending.startedAt)),
    timeToFinalResultMs: Math.max(0, Math.round(completedAt - pending.startedAt)),
  });
  if (store.samples.length > MAX_SAMPLES) store.samples.splice(0, store.samples.length - MAX_SAMPLES);
}

export function cancelAssistantOrderTimingTurn(platform: AssistantOrderTimingPlatform): void {
  delete getStore().active[platform];
}

/** Returns a copy of the latest local samples for manual validation. */
export function getAssistantOrderTimingSamples(): AssistantOrderTimingSample[] {
  return getStore().samples.map((sample) => ({ ...sample }));
}
