import { pipeline, PretrainedConfig, RawImage } from '@huggingface/transformers';
import { BACKGROUND_REMOVAL_MODEL, BACKGROUND_REMOVAL_REVISION } from './backgroundRemovalModel';
import { applyBackgroundRemovalMask } from './backgroundRemovalPostProcess';

export type SegmentationBackend = 'webgpu' | 'wasm';

export type BackgroundRemovalWorkerRequest =
  | { id: number; type: 'warm' }
  | { id: number; type: 'segment'; width: number; height: number; pixels: ArrayBuffer; modelInputSize?: number };

export type BackgroundRemovalWorkerResponse = {
  id: number;
  backend?: SegmentationBackend;
  warmed?: boolean;
  width?: number;
  height?: number;
  pixels?: ArrayBuffer;
  error?: string;
};

type BackgroundRemovalPipeline = import('@huggingface/transformers').ImageSegmentationPipeline;
type ImageProcessorWithSize = { size?: { width?: number; height?: number } };
type WorkerScope = {
  navigator?: {
    gpu?: {
      requestAdapter?: () => Promise<{ features?: { has?: (feature: string) => boolean } } | null>;
    };
  };
  onmessage: ((event: MessageEvent<BackgroundRemovalWorkerRequest>) => void) | null;
  postMessage(message: BackgroundRemovalWorkerResponse, transfer?: Transferable[]): void;
};

const WEBGPU_INPUT_SIZE = 1024;
const DEFAULT_WASM_INPUT_SIZE = 640;

const workerScope = self as unknown as WorkerScope;
let segmentationPromise: Promise<{ pipe: BackgroundRemovalPipeline; backend: SegmentationBackend }> | null = null;
let webGpuDisabled = false;
let webGpuWarmed = false;

async function supportsWebGpuFp16(): Promise<boolean> {
  if (webGpuDisabled) return false;
  try {
    const gpu = workerScope.navigator?.gpu;
    if (!gpu?.requestAdapter) return false;
    const adapter = await gpu.requestAdapter();
    return Boolean(adapter?.features?.has?.('shader-f16'));
  } catch {
    return false;
  }
}

async function createPipelineForBackend(backend: SegmentationBackend): Promise<{ pipe: BackgroundRemovalPipeline; backend: SegmentationBackend }> {
  const pipe = await pipeline('image-segmentation', BACKGROUND_REMOVAL_MODEL, {
    config: new PretrainedConfig({ model_type: 'isnet', is_encoder_decoder: false }),
    device: backend,
    dtype: backend === 'webgpu' ? 'fp16' : 'q8',
    revision: BACKGROUND_REMOVAL_REVISION,
  });
  return { pipe, backend };
}

function getSegmentationPipeline(forceWasm = false): Promise<{ pipe: BackgroundRemovalPipeline; backend: SegmentationBackend }> {
  if (forceWasm) {
    segmentationPromise = createPipelineForBackend('wasm').catch((error: unknown) => {
      segmentationPromise = null;
      throw error;
    });
    return segmentationPromise;
  }
  segmentationPromise ??= (async () => {
    if (await supportsWebGpuFp16()) {
      try {
        return await createPipelineForBackend('webgpu');
      } catch {
        webGpuDisabled = true;
        webGpuWarmed = false;
      }
    }
    return await createPipelineForBackend('wasm');
  })().catch((error: unknown) => {
    segmentationPromise = null;
    throw error;
  });
  return segmentationPromise;
}

function configureInputSize(pipe: BackgroundRemovalPipeline, backend: SegmentationBackend, requestedSize?: number) {
  const imageProcessor = (pipe.processor as unknown as { image_processor?: ImageProcessorWithSize } | undefined)?.image_processor;
  if (!imageProcessor) return;
  // Mantém shape fixo em WebGPU para compilar os shaders uma única vez; reduz em WASM para cortar latência de CPU.
  const size = backend === 'webgpu'
    ? WEBGPU_INPUT_SIZE
    : Math.max(256, Math.min(WEBGPU_INPUT_SIZE, requestedSize ?? DEFAULT_WASM_INPUT_SIZE));
  imageProcessor.size = { width: size, height: size };
}

async function runSegmentation(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  modelInputSize?: number,
): Promise<{ maskData: ArrayLike<number>; backend: SegmentationBackend }> {
  let entry = await getSegmentationPipeline();
  const image = new RawImage(pixelData, width, height, 4);
  try {
    configureInputSize(entry.pipe, entry.backend, modelInputSize);
    const result = await entry.pipe(image);
    const mask = result[0]?.mask;
    if (!mask || mask.channels !== 1 || mask.width !== width || mask.height !== height) {
      throw new Error('A ferramenta não gerou uma máscara válida.');
    }
    if (entry.backend === 'webgpu') webGpuWarmed = true;
    return { maskData: mask.data, backend: entry.backend };
  } catch (error) {
    if (entry.backend !== 'webgpu') throw error;
    webGpuDisabled = true;
    webGpuWarmed = false;
    await entry.pipe.dispose?.().catch(() => {});
    entry = await getSegmentationPipeline(true);
    configureInputSize(entry.pipe, entry.backend, modelInputSize);
    const result = await entry.pipe(image);
    const mask = result[0]?.mask;
    if (!mask || mask.channels !== 1 || mask.width !== width || mask.height !== height) {
      throw new Error('A ferramenta não gerou uma máscara válida.');
    }
    return { maskData: mask.data, backend: entry.backend };
  }
}

workerScope.onmessage = async ({ data }) => {
  const { id } = data;
  try {
    if (data.type === 'warm') {
      let entry = await getSegmentationPipeline();
      if (entry.backend === 'webgpu' && !webGpuWarmed) {
        configureInputSize(entry.pipe, 'webgpu');
        const warmImage = new RawImage(new Uint8ClampedArray(32 * 32 * 4), 32, 32, 4);
        try {
          await entry.pipe(warmImage);
          webGpuWarmed = true;
        } catch {
          webGpuDisabled = true;
          webGpuWarmed = false;
          await entry.pipe.dispose?.().catch(() => {});
          entry = await getSegmentationPipeline(true);
        }
      }
      workerScope.postMessage({ id, warmed: true, backend: entry.backend });
      return;
    }

    const { width, height, pixels, modelInputSize } = data;
    const pixelData = new Uint8ClampedArray(pixels);
    const { maskData, backend } = await runSegmentation(pixelData, width, height, modelInputSize);
    applyBackgroundRemovalMask(pixelData, maskData, width, height);
    const outputBuffer = pixelData.buffer as ArrayBuffer;
    workerScope.postMessage({ id, backend, width, height, pixels: outputBuffer }, [outputBuffer]);
  } catch (error) {
    workerScope.postMessage({
      id,
      error: error instanceof Error ? error.message : 'Falha ao remover o fundo.',
    });
  }
};
