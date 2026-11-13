import { imageAlphaContentBounds } from '../imageContentBounds';
import { loadHtmlImage } from '../imageHtmlLoader';
import { hasTransparentCorners } from './backgroundRemovalPostProcess';
import {
  createAbortError,
  enqueueWorkerTask,
  type BackgroundRemovalPriority,
  warmBackgroundRemoval,
} from './backgroundRemovalQueue';

export { BACKGROUND_REMOVAL_REVISION } from './backgroundRemovalModel';
export {
  applyBackgroundRemovalMask,
  findConnectedForegroundPixels,
  hasTransparentCorners,
  inferFlatBackground,
} from './backgroundRemovalPostProcess';
export { type BackgroundRemovalPriority, warmBackgroundRemoval };

export interface RemoveImageBackgroundOptions {
  centerContent?: boolean;
  maxSide?: number;
  modelInputSize?: number;
  priority?: BackgroundRemovalPriority;
  signal?: AbortSignal;
}

export interface BackgroundRemovalResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  alreadyTransparent: boolean;
}

const DEFAULT_MAX_SIDE = 1200;

function centerForeground(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const { width, height } = canvas;
  const bounds = imageAlphaContentBounds(canvas, width, height);
  if (bounds.x === 0 && bounds.y === 0 && bounds.width === width && bounds.height === height) return canvas;
  const centered = document.createElement('canvas');
  centered.width = width;
  centered.height = height;
  const context = centered.getContext('2d');
  if (!context) return canvas;
  context.drawImage(
    canvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    Math.round((width - bounds.width) / 2),
    Math.round((height - bounds.height) / 2),
    bounds.width,
    bounds.height,
  );
  return centered;
}

/**
 * Removes the background from an image source inside the segmentation worker and returns a cutout canvas.
 */
export async function removeImageBackground(
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  options: RemoveImageBackgroundOptions = {},
): Promise<BackgroundRemovalResult> {
  if (options.signal?.aborted) throw createAbortError();
  const sourceCanvas = document.createElement('canvas');
  const maxSide = Math.max(128, options.maxSide ?? DEFAULT_MAX_SIDE);
  const scale = Math.min(1, maxSide / Math.max(imageWidth, imageHeight));
  const width = sourceCanvas.width = Math.max(1, Math.round(imageWidth * scale));
  const height = sourceCanvas.height = Math.max(1, Math.round(imageHeight * scale));
  const context = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Não foi possível preparar a imagem para remover o fundo.');

  context.drawImage(image, 0, 0, width, height);
  const sourcePixels = context.getImageData(0, 0, width, height);
  if (hasTransparentCorners(sourcePixels.data, width, height)) {
    return {
      canvas: options.centerContent === false ? sourceCanvas : centerForeground(sourceCanvas),
      width,
      height,
      alreadyTransparent: true,
    };
  }

  if (typeof BigInt !== 'function') {
    throw new Error('A remoção de fundo precisa de um navegador mais atualizado.');
  }

  const pixelBuffer = sourcePixels.data.byteOffset === 0
    && sourcePixels.data.byteLength === sourcePixels.data.buffer.byteLength
    ? sourcePixels.data.buffer as ArrayBuffer
    : sourcePixels.data.slice().buffer as ArrayBuffer;

  const response = await enqueueWorkerTask(
    options.priority ?? 'high',
    options.signal,
    (id) => ({
      id,
      type: 'segment',
      width,
      height,
      pixels: pixelBuffer,
      modelInputSize: options.modelInputSize,
    }),
    () => [pixelBuffer],
  );
  if (!response.pixels) throw new Error('A ferramenta não gerou uma máscara válida.');

  const processedPixels = new Uint8ClampedArray(response.pixels);
  context.putImageData(new ImageData(processedPixels, width, height), 0, 0);
  return {
    canvas: options.centerContent === false ? sourceCanvas : centerForeground(sourceCanvas),
    width,
    height,
    alreadyTransparent: false,
  };
}

/**
 * Loads a product photo URL, removes its background, and encodes a centered transparent PNG File.
 */
export async function createBackgroundRemovedPngFile(imageUrl: string, fileName: string): Promise<File> {
  const image = await loadHtmlImage(imageUrl, {
    timeoutMs: 8_000,
    corsMode: 'http-and-https',
    errorMessage: 'Não foi possível carregar a foto para remover o fundo.',
  });
  let result: BackgroundRemovalResult;
  try {
    result = await removeImageBackground(image, image.naturalWidth, image.naturalHeight);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('A ferramenta')) throw error;
    throw new Error('Não foi possível carregar ou executar a remoção de fundo. Tente novamente.', { cause: error });
  }
  if (result.alreadyTransparent) throw new Error('Esta foto já tem o fundo transparente.');

  const blob = await new Promise<Blob>((resolve, reject) => {
    result.canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('Não foi possível gerar o PNG transparente.'))),
      'image/png',
    );
  });
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'produto';
  return new File([blob], `${baseName}-sem-fundo.png`, { type: 'image/png' });
}
