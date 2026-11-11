type BackgroundRemovalPipeline = import('@huggingface/transformers').ImageSegmentationPipeline;

export const BACKGROUND_REMOVAL_REVISION = '5349b617911fd60c619b52f32e2b593517b78df3';
const MASK_BACKGROUND_THRESHOLD = 48;
const MASK_FOREGROUND_THRESHOLD = 200;
const FOREGROUND_BOUNDS_ALPHA_THRESHOLD = 32;
const FLAT_BACKGROUND_COLOR_TOLERANCE = 24;
const RESTORE_FOREGROUND_COLOR_START = 16;
const RESTORE_FOREGROUND_COLOR_FULL = 48;

// shortcut: recuperação de cor é limitada a fundos planos; fundos texturizados exigiriam uma trimap guiada.
function inferFlatBackground(data: Uint8ClampedArray, width: number, height: number): number[] | null {
  const step = Math.max(1, Math.floor(Math.min(width, height) / 48));
  const samples: number[][] = [];
  const addSample = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    if (data[offset + 3] < 20) return;
    samples.push([data[offset], data[offset + 1], data[offset + 2]]);
  };
  for (let x = 0; x < width; x += step) {
    addSample(x, 0);
    if (height > 1) addSample(x, height - 1);
  }
  for (let y = step; y < height - 1; y += step) {
    addSample(0, y);
    if (width > 1) addSample(width - 1, y);
  }
  if (samples.length < 10) return null;

  let bestCluster: number[][] = [];
  for (const seed of samples) {
    const cluster = samples.filter((sample) => sample.every((value, channel) =>
      Math.abs(value - seed[channel]) <= FLAT_BACKGROUND_COLOR_TOLERANCE));
    if (cluster.length > bestCluster.length) bestCluster = cluster;
  }
  if (bestCluster.length < samples.length * .55) return null;
  return [0, 1, 2].map((channel) =>
    bestCluster.reduce((sum, color) => sum + color[channel], 0) / bestCluster.length);
}

function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function findConnectedForegroundPixels(
  data: Uint8ClampedArray,
  mask: ArrayLike<number>,
  width: number,
  height: number,
  background: number[],
): Uint8Array {
  const pixelCount = width * height;
  const candidates = new Uint8Array(pixelCount);
  const protectedPixels = new Uint8Array(pixelCount);
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const offset = pixel * 4;
    if (data[offset + 3] < 20) continue;
    const colorDifference = Math.max(
      Math.abs(data[offset] - background[0]),
      Math.abs(data[offset + 1] - background[1]),
      Math.abs(data[offset + 2] - background[2]),
    );
    if (colorDifference >= RESTORE_FOREGROUND_COLOR_START) candidates[pixel] = 1;
  }

  const queue = new Uint32Array(pixelCount);
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    if (candidates[pixel] !== 1) continue;
    let head = 0, tail = 0, containsConfidentForeground = false, touchesImageEdge = false;
    queue[tail++] = pixel;
    candidates[pixel] = 2;
    while (head < tail) {
      const current = queue[head++];
      if (mask[current] >= MASK_FOREGROUND_THRESHOLD) containsConfidentForeground = true;
      const x = current % width;
      const y = Math.floor(current / width);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesImageEdge = true;
      for (let dy = -1; dy <= 1; dy++) {
        const nextY = y + dy;
        if (nextY < 0 || nextY >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nextX = x + dx;
          if (nextX < 0 || nextX >= width) continue;
          const next = nextY * width + nextX;
          if (candidates[next] !== 1) continue;
          candidates[next] = 2;
          queue[tail++] = next;
        }
      }
    }
    // Fundo conectado à borda, como o piso atrás dos pés, não deve ser recuperado
    // como primeiro plano só por tocar numa parte confiante do móvel.
    if (containsConfidentForeground && !touchesImageEdge) {
      for (let index = 0; index < tail; index++) protectedPixels[queue[index]] = 1;
    }
  }
  return protectedPixels;
}

let backgroundRemovalPipeline: Promise<BackgroundRemovalPipeline> | null = null;

function centerForeground(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const { width, height } = canvas;
  const sourceContext = canvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) return canvas;
  const { data } = sourceContext.getImageData(0, 0, width, height);
  let left = width, top = height, right = -1, bottom = -1;
  for (let pixel = 0; pixel < width * height; pixel++) {
    if (data[pixel * 4 + 3] < FOREGROUND_BOUNDS_ALPHA_THRESHOLD) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) return canvas;

  const objectWidth = right - left + 1;
  const objectHeight = bottom - top + 1;
  const centered = document.createElement('canvas');
  centered.width = width;
  centered.height = height;
  const context = centered.getContext('2d');
  if (!context) return canvas;
  context.drawImage(canvas, left, top, objectWidth, objectHeight,
    Math.round((width - objectWidth) / 2), Math.round((height - objectHeight) / 2), objectWidth, objectHeight);
  return centered;
}

export interface BackgroundRemovalResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  alreadyTransparent: boolean;
}

export async function removeImageBackground(
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number
): Promise<BackgroundRemovalResult> {
  const sourceCanvas = document.createElement('canvas');
  const scale = Math.min(1, 1200 / Math.max(imageWidth, imageHeight));
  const width = sourceCanvas.width = Math.max(1, Math.round(imageWidth * scale));
  const height = sourceCanvas.height = Math.max(1, Math.round(imageHeight * scale));
  const context = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Não foi possível preparar a imagem para remover o fundo.');

  context.drawImage(image, 0, 0, width, height);
  const sourcePixels = context.getImageData(0, 0, width, height);
  const corners = [0, width - 1, width * (height - 1), width * height - 1].map((index) => index * 4);
  if (corners.every((index) => sourcePixels.data[index + 3] < 20)) {
    return { canvas: centerForeground(sourceCanvas), width, height, alreadyTransparent: true };
  }

  const background = inferFlatBackground(sourcePixels.data, width, height);
  if (typeof BigInt !== 'function') {
    throw new Error('A remoção de fundo precisa de um navegador mais atualizado.');
  }
  const { pipeline, RawImage, PretrainedConfig } = await import('@huggingface/transformers');
  backgroundRemovalPipeline ??= pipeline('image-segmentation', 'Ko033/isnet-general-use-onnx', {
    config: new PretrainedConfig({ model_type: 'isnet', is_encoder_decoder: false }),
    dtype: 'q8', revision: BACKGROUND_REMOVAL_REVISION,
  }).catch((error: unknown) => {
    backgroundRemovalPipeline = null;
    throw error;
  });

  const result = await (await backgroundRemovalPipeline)(RawImage.fromCanvas(sourceCanvas));
  const mask = result[0]?.mask;
  if (!mask || mask.channels !== 1 || mask.width !== width || mask.height !== height) {
    throw new Error('A ferramenta não gerou uma máscara válida.');
  }

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) throw new Error('Não foi possível finalizar a imagem recortada.');

  const { data } = sourcePixels;
  const colorProtectedPixels = background
    ? findConnectedForegroundPixels(data, mask.data, width, height, background)
    : null;

  for (let pixel = 0; pixel < mask.data.length; pixel++) {
    const offset = pixel * 4;
    const confidence = Math.max(0, Math.min(1,
      (mask.data[pixel] - MASK_BACKGROUND_THRESHOLD) / (MASK_FOREGROUND_THRESHOLD - MASK_BACKGROUND_THRESHOLD)));
    let foregroundConfidence = smoothstep(confidence);
    if (colorProtectedPixels?.[pixel] && background) {
      const colorDifference = Math.max(
        Math.abs(data[offset] - background[0]),
        Math.abs(data[offset + 1] - background[1]),
        Math.abs(data[offset + 2] - background[2]),
      );
      // Recupera portas claras que o modelo confunde com o fundo, sem preencher vãos da mesma cor do fundo.
      const colorConfidence = smoothstep((colorDifference - RESTORE_FOREGROUND_COLOR_START)
        / (RESTORE_FOREGROUND_COLOR_FULL - RESTORE_FOREGROUND_COLOR_START));
      foregroundConfidence = Math.max(foregroundConfidence, colorConfidence);
    }
    data[offset + 3] = Math.round(foregroundConfidence * data[offset + 3]);
  }
  if (background) {
    for (let pixel = 0; pixel < data.length; pixel += 4) {
      const alpha = data[pixel + 3] / 255;
      if (alpha <= .02 || alpha >= .98) continue;
      for (let channel = 0; channel < 3; channel++) {
        data[pixel + channel] = Math.max(0, Math.min(255,
          Math.round((sourcePixels.data[pixel + channel] - (1 - alpha) * background[channel]) / alpha)));
      }
    }
  }
  outputContext.putImageData(sourcePixels, 0, 0);
  return { canvas: centerForeground(outputCanvas), width, height, alreadyTransparent: false };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (url.startsWith('http')) image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    const timer = window.setTimeout(() => fail(), 8_000);
    const fail = () => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      reject(new Error('Não foi possível carregar a foto para remover o fundo.'));
    };
    image.onerror = fail;
    image.onload = () => {
      clearTimeout(timer);
      if (!image.naturalWidth || !image.naturalHeight) return fail();
      resolve(image);
    };
    image.src = url;
  });
}

export async function createBackgroundRemovedPngFile(imageUrl: string, fileName: string): Promise<File> {
  const image = await loadImage(imageUrl);
  let result: BackgroundRemovalResult;
  try {
    result = await removeImageBackground(image, image.naturalWidth, image.naturalHeight);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('A ferramenta')) throw error;
    throw new Error('Não foi possível carregar ou executar a remoção de fundo. Tente novamente.', { cause: error });
  }
  if (result.alreadyTransparent) throw new Error('Esta foto já tem o fundo transparente.');

  const blob = await new Promise<Blob>((resolve, reject) => {
    result.canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Não foi possível gerar o PNG transparente.')), 'image/png');
  });
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'produto';
  return new File([blob], `${baseName}-sem-fundo.png`, { type: 'image/png' });
}
