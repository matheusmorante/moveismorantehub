import type {
  BackgroundRemovalWorkerRequest,
  BackgroundRemovalWorkerResponse,
} from './backgroundRemoval.worker';

export type BackgroundRemovalPriority = 'high' | 'low';

type QueuedWorkerTask = {
  id: number;
  priority: BackgroundRemovalPriority;
  signal?: AbortSignal;
  request: BackgroundRemovalWorkerRequest;
  onAbortCleanup?: () => void;
  timer?: ReturnType<typeof setTimeout>;
  resolve: (response: BackgroundRemovalWorkerResponse) => void;
  reject: (error: Error) => void;
};

let segmentationWorker: Worker | null = null;
let nextWorkerRequestId = 0;
let inFlightTask: QueuedWorkerTask | null = null;
let forceWasm = false;
const highPriorityQueue: QueuedWorkerTask[] = [];
const lowPriorityQueue: QueuedWorkerTask[] = [];
const WORKER_TIMEOUT_MS = 180_000;

function clearTask(task: QueuedWorkerTask) {
  clearTimeout(task.timer);
  task.onAbortCleanup?.();
}

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
    if (segmentationWorker !== worker) return;
    const active = inFlightTask;
    if (!active || active.id !== data.id) return;
    if (data.retryPixels && !forceWasm) {
      // A rejected ONNX session can leave the Transformers.js queue rejected.
      worker.terminate();
      segmentationWorker = null;
      forceWasm = true;
      clearTimeout(active.timer);
      active.request.pixels = data.retryPixels;
      if (active.signal?.aborted) {
        inFlightTask = null;
        clearTask(active);
        pumpWorkerQueue();
      } else {
        dispatchTask(active);
      }
      return;
    }
    inFlightTask = null;
    clearTask(active);
    if (data.error) {
      active.reject(new Error(data.error));
    } else if (data.alpha) {
      active.resolve(data);
    } else {
      active.reject(new Error('A ferramenta não gerou uma máscara válida.'));
    }
    pumpWorkerQueue();
  };
  worker.onerror = (event) => {
    if (segmentationWorker !== worker) return;
    const error = new Error(event.message || 'Não foi possível iniciar o processamento da remoção de fundo.');
    const active = inFlightTask;
    inFlightTask = null;
    if (active) {
      clearTask(active);
      active.reject(error);
    }
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

  dispatchTask(nextTask);
}

function dispatchTask(task: QueuedWorkerTask) {
  inFlightTask = task;
  try {
    const worker = getSegmentationWorker();
    const request = { ...task.request, forceWasm };
    worker.postMessage(request, [request.pixels]);
    task.timer = setTimeout(() => {
      if (inFlightTask !== task) return;
      worker.terminate();
      segmentationWorker = null;
      inFlightTask = null;
      clearTask(task);
      task.reject(new Error('A ferramenta demorou para concluir o recorte. Tente novamente.'));
      pumpWorkerQueue();
    }, WORKER_TIMEOUT_MS);
  } catch (error) {
    inFlightTask = null;
    clearTask(task);
    task.reject(error instanceof Error ? error : new Error('Não foi possível iniciar a remoção de fundo.'));
    pumpWorkerQueue();
  }
}

export function enqueueWorkerTask(
  priority: BackgroundRemovalPriority,
  signal: AbortSignal | undefined,
  input: Omit<BackgroundRemovalWorkerRequest, 'id' | 'type' | 'forceWasm'>,
): Promise<BackgroundRemovalWorkerResponse> {
  if (signal?.aborted) return Promise.reject(createAbortError());
  const id = ++nextWorkerRequestId;
  return new Promise((resolve, reject) => {
    const queue = priority === 'high' ? highPriorityQueue : lowPriorityQueue;
    const task: QueuedWorkerTask = {
      id,
      priority,
      signal,
      request: { ...input, id, type: 'segment' },
      resolve,
      reject,
    };
    if (signal) {
      const onAbort = () => {
        if (inFlightTask === task) {
          // Allow the current inference to finish so its loaded model remains usable.
          reject(createAbortError());
          return;
        }
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
