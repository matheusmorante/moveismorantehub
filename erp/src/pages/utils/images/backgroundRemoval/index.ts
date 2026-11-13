import { imageAlphaContentBounds } from '../imageContentBounds';
import { loadHtmlImage } from '../imageHtmlLoader';
import { hasTransparentBackground } from './backgroundRemovalPostProcess';
import {
  createAbortError,
  enqueueWorkerTask,
  type BackgroundRemovalPriority,
} from './backgroundRemovalQueue';

export { BACKGROUND_REMOVAL_REVISION } from './backgroundRemovalModel';
export type { BackgroundRemovalPriority };

export interface RemoveImageBackgroundOptions {
  centerContent?: boolean;
  maxSide?: number;
  priority?: BackgroundRemovalPriority;
  signal?: AbortSignal;
}

export interface BackgroundRemovalResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  alreadyTransparent: boolean;
}

const MAX_IMAGE_PIXELS = 24_000_000;
const MAX_ANALYSIS_SIDE = 1200;

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
  if (!Number.isInteger(imageWidth) || !Number.isInteger(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
    throw new Error('A ferramenta não conseguiu ler as dimensões da foto.');
  }
  const scale = options.maxSide === undefined ? 1 : Math.min(1, Math.max(128, options.maxSide) / Math.max(imageWidth, imageHeight));
  const width = Math.max(1, Math.round(imageWidth * scale));
  const height = Math.max(1, Math.round(imageHeight * scale));
  if (width * height > MAX_IMAGE_PIXELS) throw new Error('A ferramenta aceita fotos de até 24 megapixels.');
  const analysisScale = Math.min(1, MAX_ANALYSIS_SIDE / Math.max(width, height));
  const analysis = document.createElement('canvas');
  const aw = analysis.width = Math.max(1, Math.round(width * analysisScale));
  const ah = analysis.height = Math.max(1, Math.round(height * analysisScale));
  const analysisContext = analysis.getContext('2d', { willReadFrequently: true });
  if (!analysisContext) throw new Error('Não foi possível preparar a imagem para remover o fundo.');
  analysisContext.drawImage(image, 0, 0, aw, ah);
  const pixels = analysisContext.getImageData(0, 0, aw, ah).data;
  const alreadyTransparent = hasTransparentBackground(pixels, aw, ah);

  const result = document.createElement('canvas');
  try {
    let alpha: ArrayBuffer | undefined;
    if (!alreadyTransparent) {
      if (typeof BigInt !== 'function' || typeof Worker !== 'function') {
        throw new Error('A ferramenta precisa de um navegador mais atualizado.');
      }
      const buffer = pixels.buffer as ArrayBuffer;
      const response = await enqueueWorkerTask(
        options.priority ?? 'high', options.signal,
        { width: aw, height: ah, pixels: buffer },
      );
      if (options.signal?.aborted) throw createAbortError();
      alpha = response.alpha;
      if (alpha?.byteLength !== aw * ah) throw new Error('A ferramenta não gerou uma máscara válida.');
    }

    result.width = width;
    result.height = height;
    const context = result.getContext('2d');
    if (!context) throw new Error('Não foi possível montar a imagem sem fundo.');
    context.drawImage(image, 0, 0, width, height);
    if (alpha) {
      const matte = new Uint8Array(alpha);
      const imageData = new ImageData(aw, ah);
      for (let i = 0; i < matte.length; i++) imageData.data[i * 4 + 3] = matte[i];
      analysisContext.putImageData(imageData, 0, 0);
      context.globalCompositeOperation = 'destination-in';
      context.imageSmoothingQuality = 'high';
      context.drawImage(analysis, 0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
    }
    const canvas = options.centerContent === false ? result : centerForeground(result);
    return { canvas, width, height, alreadyTransparent };
  } finally {
    analysis.width = 0;
    analysis.height = 0;
  }
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
