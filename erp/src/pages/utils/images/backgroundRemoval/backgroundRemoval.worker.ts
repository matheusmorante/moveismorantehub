import { AutoModel, AutoProcessor, RawImage, type Tensor } from '@huggingface/transformers';
import { BACKGROUND_REMOVAL_MODELS } from './backgroundRemovalModel';
import { INVALID_BACKGROUND_MASK, validateSegmentationMask } from './backgroundRemovalPostProcess';
import { refineBackgroundMask } from './backgroundRemovalOpenCv';

export type SegmentationBackend = 'webgpu' | 'wasm';

export type BackgroundRemovalWorkerRequest = {
  id: number; type: 'segment'; width: number; height: number; pixels: ArrayBuffer; forceWasm?: boolean;
};

export type BackgroundRemovalWorkerResponse = {
  id: number;
  backend?: SegmentationBackend;
  alpha?: ArrayBuffer;
  error?: string;
  retryPixels?: ArrayBuffer;
};

type WorkerScope = {
  navigator?: { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } };
  onmessage: ((event: MessageEvent<BackgroundRemovalWorkerRequest>) => void) | null;
  postMessage(message: BackgroundRemovalWorkerResponse, transfer?: Transferable[]): void;
};

const scope = self as unknown as WorkerScope;
let processorPromise: ReturnType<typeof AutoProcessor.from_pretrained> | undefined;
let modelPromise: ReturnType<typeof loadModel> | undefined;
let attemptedWebGpu = false;

async function loadModel(forceWasm: boolean) {
  let backend: SegmentationBackend = 'wasm';
  if (!forceWasm) {
    try {
      const adapter = await scope.navigator?.gpu?.requestAdapter();
      if (adapter?.features.has('shader-f16')) backend = 'webgpu';
    } catch {
      // Browsers can expose WebGPU without providing an adapter.
    }
  }
  attemptedWebGpu = backend === 'webgpu';
  const { id, revision } = BACKGROUND_REMOVAL_MODELS[backend];
  const model = await AutoModel.from_pretrained(id, {
    revision,
    device: backend,
    dtype: 'fp32',
    model_file_name: attemptedWebGpu ? 'model_fp16' : undefined,
    session_options: { graphOptimizationLevel: attemptedWebGpu ? 'basic' : 'all' },
  });
  return { model, backend };
}

function getModel(forceWasm: boolean) {
  return modelPromise ??= loadModel(forceWasm).catch((error: unknown) => {
    modelPromise = undefined;
    throw error;
  });
}

function getProcessor(backend: SegmentationBackend) {
  const { id, revision } = BACKGROUND_REMOVAL_MODELS[backend];
  return processorPromise ??= AutoProcessor.from_pretrained(id, { revision }).catch((error: unknown) => {
    processorPromise = undefined;
    throw error;
  });
}

async function infer(pixels: Tensor, entry: Awaited<ReturnType<typeof loadModel>>) {
  const outputs = await entry.model.forward({ input_image: pixels }) as Record<string, Tensor | undefined>;
  try {
    const logits = outputs.output_image ?? outputs.logits;
    const width = logits?.dims.at(-1);
    const height = logits?.dims.at(-2);
    if (!logits || !width || !height || logits.size !== width * height) throw new Error(INVALID_BACKGROUND_MASK);
    const values = logits.to('float32');
    try {
      const data = new Uint8ClampedArray(values.size);
      const scores = values.data;
      for (let index = 0; index < data.length; index++) {
        const value = Number(scores[index]);
        if (!Number.isFinite(value)) throw new Error(INVALID_BACKGROUND_MASK);
        data[index] = 255 / (1 + Math.exp(-value));
      }
      validateSegmentationMask(data);
      return { data, width, height };
    } finally {
      if (values !== logits) values.dispose();
    }
  } finally {
    for (const output of new Set(Object.values(outputs))) output?.dispose?.();
  }
}

async function segment(data: Uint8ClampedArray, width: number, height: number, forceWasm: boolean) {
  const entry = await getModel(forceWasm);
  const processor = await getProcessor(entry.backend);
  const image = new RawImage(data, width, height, 4).rgb();
  const { pixel_values: pixels } = await processor(image) as { pixel_values: Tensor };
  try {
    return { mask: await infer(pixels, entry), backend: entry.backend };
  } finally {
    pixels.dispose();
  }
}

scope.onmessage = async ({ data: request }) => {
  const { id } = request;
  try {
    const { width, height, pixels } = request;
    const original = new Uint8ClampedArray(pixels);
    if (original.length !== width * height * 4) throw new Error(INVALID_BACKGROUND_MASK);
    const { mask, backend } = await segment(original, width, height, request.forceWasm ?? false);
    const alpha = await refineBackgroundMask(mask, original, width, height);
    validateSegmentationMask(alpha);
    const buffer = alpha.buffer as ArrayBuffer;
    scope.postMessage({ id, backend, alpha: buffer }, [buffer]);
  } catch (error) {
    const restartInWasm = attemptedWebGpu
      && !(error instanceof Error && error.message === INVALID_BACKGROUND_MASK);
    if (restartInWasm) {
      scope.postMessage({ id, retryPixels: request.pixels }, [request.pixels]);
      return;
    }
    scope.postMessage({
      id,
      error: error instanceof Error && error.message.startsWith('A ferramenta')
        ? error.message
        : 'Não foi possível carregar ou executar o recorte no navegador. A foto original foi preservada.',
    });
  }
};
