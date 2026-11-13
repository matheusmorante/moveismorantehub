import type {
  BackgroundRemovalWorkerRequest,
  BackgroundRemovalWorkerResponse,
} from './backgroundRemoval.worker';

export type BackgroundRemovalPriority = 'high' | 'low';

type QueuedWorkerTask = {
  id: number;
  priority: BackgroundRemovalPriority;
  signal?: AbortSignal;
  buildRequest: () => BackgroundRemovalWorkerRequest;
  transfer?: () => Transferable[];
  onAbortCleanup?: () => void;
  resolve: (response: BackgroundRemovalWorkerResponse) => void;
  reject: (error: Error) => void;
};

let segmentationWorker: Worker | null = null;
let nextWorkerRequestId = 0;
let inFlightTask: QueuedWorkerTask | null = null;
let warmPromise: Promise<void> | null = null;
let pipelineReady = false;
const highPriorityQueue: QueuedWorkerTask[] = [];
const lowPriorityQueue: QueuedWorkerTask[] = [];

export function createAbortError(): Error {
  return typeof DOMException === 'function'
    ? new DOMException('Operação cancelada.', 'AbortError')
    : new Error('Operação cancelada.');
}

function removeFromQueue(queue: QueuedWorkerTask[], task: QueuedWorkerTask) {
  const index = queue.indexOf(task);
  if (index !== -1) queue.splice(index, 1);
}

function getSegmentationWorker(): Worker {
  if (segmentationWorker) return segmentationWorker;
  const worker = new Worker(new URL('./backgroundRemoval.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }: MessageEvent<BackgroundRemovalWorkerResponse>) => {
    const active = inFlightTask;
    if (!active || active.id !== data.id) return;
    inFlightTask = null;
    active.onAbortCleanup?.();
    if (data.error) {
      active.reject(new Error(data.error));
    } else if (data.warmed || data.pixels) {
      pipelineReady = true;
      active.resolve(data);
    } else {
      active.reject(new Error('A ferramenta não gerou uma máscara válida.'));
    }
    pumpWorkerQueue();
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || 'Não foi possível iniciar o processamento da remoção de fundo.');
    const active = inFlightTask;
    inFlightTask = null;
    pipelineReady = false;
    active?.onAbortCleanup?.();
    active?.reject(error);
    while (highPriorityQueue.length > 0) {
      const queued = highPriorityQueue.shift()!;
      queued.onAbortCleanup?.();
      queued.reject(error);
    }
    while (lowPriorityQueue.length > 0) {
      const queued = lowPriorityQueue.shift()!;
      queued.onAbortCleanup?.();
      queued.reject(error);
    }
    worker.terminate();
    if (segmentationWorker === worker) segmentationWorker = null;
  };
  segmentationWorker = worker;
  return worker;
}

function pumpWorkerQueue() {
  if (inFlightTask) return;
  const nextTask = highPriorityQueue.shift() ?? lowPriorityQueue.shift();
  if (!nextTask) return;

  if (nextTask.signal?.aborted) {
    nextTask.onAbortCleanup?.();
    nextTask.reject(createAbortError());
    pumpWorkerQueue();
    return;
  }

  inFlightTask = nextTask;
  try {
    const request = nextTask.buildRequest();
    const transfer = nextTask.transfer?.() ?? [];
    getSegmentationWorker().postMessage(request, transfer);
  } catch (error) {
    inFlightTask = null;
    nextTask.onAbortCleanup?.();
    nextTask.reject(error instanceof Error ? error : new Error('Não foi possível iniciar a remoção de fundo.'));
    pumpWorkerQueue();
  }
}

export function enqueueWorkerTask(
  priority: BackgroundRemovalPriority,
  signal: AbortSignal | undefined,
  buildRequest: (id: number) => BackgroundRemovalWorkerRequest,
  transfer?: () => Transferable[],
): Promise<BackgroundRemovalWorkerResponse> {
  if (signal?.aborted) return Promise.reject(createAbortError());
  const id = ++nextWorkerRequestId;
  return new Promise((resolve, reject) => {
    const queue = priority === 'high' ? highPriorityQueue : lowPriorityQueue;
    const task: QueuedWorkerTask = {
      id,
      priority,
      signal,
      buildRequest: () => buildRequest(id),
      transfer,
      resolve,
      reject,
    };
    if (signal) {
      const onAbort = () => {
        if (inFlightTask === task) return;
        removeFromQueue(queue, task);
        task.onAbortCleanup?.();
        reject(createAbortError());
      };
      signal.addEventListener('abort', onAbort, { once: true });
      task.onAbortCleanup = () => signal.removeEventListener('abort', onAbort);
    }
    queue.push(task);
    pumpWorkerQueue();
  });
}

/**
 * Pre-warms the segmentation worker and compiles GPU shaders in low priority before user interaction.
 */
export function warmBackgroundRemoval(): Promise<void> {
  if (pipelineReady || typeof BigInt !== 'function' || typeof Worker !== 'function') {
    return Promise.resolve();
  }
  warmPromise ??= enqueueWorkerTask('low', undefined, (id) => ({ id, type: 'warm' }))
    .then(() => undefined)
    .catch(() => {
      warmPromise = null;
    });
  return warmPromise;
}
