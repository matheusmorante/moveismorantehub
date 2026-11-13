const MASK_BACKGROUND_THRESHOLD = 48;
const MASK_FOREGROUND_THRESHOLD = 200;
const FLAT_BACKGROUND_COLOR_TOLERANCE = 24;
const RESTORE_FOREGROUND_COLOR_START = 16;
const RESTORE_FOREGROUND_COLOR_FULL = 48;

export function hasTransparentCorners(data: Uint8ClampedArray, width: number, height: number): boolean {
  const corners = [0, width - 1, width * (height - 1), width * height - 1];
  return corners.every((pixel) => data[pixel * 4 + 3] < 20);
}

// shortcut: recuperação de cor é limitada a fundos planos; fundos texturizados exigiriam uma trimap guiada.
export function inferFlatBackground(data: Uint8ClampedArray, width: number, height: number): number[] | null {
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

function colorDifferenceFromBackground(data: Uint8ClampedArray, offset: number, background: number[]): number {
  return Math.max(
    Math.abs(data[offset] - background[0]),
    Math.abs(data[offset + 1] - background[1]),
    Math.abs(data[offset + 2] - background[2]),
  );
}

export function findConnectedForegroundPixels(
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
    if (colorDifferenceFromBackground(data, offset, background) >= RESTORE_FOREGROUND_COLOR_START) {
      candidates[pixel] = 1;
    }
  }

  const queue = new Uint32Array(pixelCount);
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    if (candidates[pixel] !== 1) continue;
    let head = 0;
    let tail = 0;
    let containsConfidentForeground = false;
    let touchesImageEdge = false;
    queue[tail++] = pixel;
    candidates[pixel] = 2;

    while (head < tail) {
      const current = queue[head++];
      if (mask[current] >= MASK_FOREGROUND_THRESHOLD) containsConfidentForeground = true;
      const y = (current / width) | 0;
      const x = current - y * width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesImageEdge = true;

      for (let dy = -1; dy <= 1; dy++) {
        const nextY = y + dy;
        if (nextY < 0 || nextY >= height) continue;
        const rowOffset = nextY * width;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nextX = x + dx;
          if (nextX < 0 || nextX >= width) continue;
          const next = rowOffset + nextX;
          if (candidates[next] !== 1) continue;
          candidates[next] = 2;
          queue[tail++] = next;
        }
      }
    }

    // Fundo conectado à borda, como o piso atrás dos pés, não deve ser recuperado
    // como primeiro plano só por tocar numa parte confiante do móvel.
    if (containsConfidentForeground && !touchesImageEdge) {
      for (let index = 0; index < tail; index++) {
        protectedPixels[queue[index]] = 1;
      }
    }
  }
  return protectedPixels;
}

function resolvePixelForegroundConfidence(
  data: Uint8ClampedArray,
  offset: number,
  maskValue: number,
  isProtected: boolean,
  background: number[] | null,
): number {
  const confidence = Math.max(0, Math.min(1,
    (maskValue - MASK_BACKGROUND_THRESHOLD) / (MASK_FOREGROUND_THRESHOLD - MASK_BACKGROUND_THRESHOLD)));
  const baseConfidence = smoothstep(confidence);
  if (!isProtected || !background) return baseConfidence;

  const redDiff = Math.abs(data[offset] - background[0]);
  const greenDiff = Math.abs(data[offset + 1] - background[1]);
  const blueDiff = Math.abs(data[offset + 2] - background[2]);
  const colorDiff = Math.max(redDiff, greenDiff, blueDiff);
  const minimumDiff = Math.min(redDiff, greenDiff, blueDiff);
  const neutralShadow = colorDiff > FLAT_BACKGROUND_COLOR_TOLERANCE * 2 && colorDiff - minimumDiff < 18;
  if (neutralShadow) return baseConfidence;

  // Recupera portas claras e bordas coloridas, mas deixa sombras neutras sob os pés para a máscara remover.
  const colorConfidence = smoothstep((colorDiff - RESTORE_FOREGROUND_COLOR_START)
    / (RESTORE_FOREGROUND_COLOR_FULL - RESTORE_FOREGROUND_COLOR_START));
  return Math.max(baseConfidence, colorConfidence);
}

function applyFlatColorDecontamination(data: Uint8ClampedArray, background: number[]) {
  for (let pixel = 0; pixel < data.length; pixel += 4) {
    const alpha = data[pixel + 3] / 255;
    if (alpha <= .02 || alpha >= .98) continue;
    for (let channel = 0; channel < 3; channel++) {
      data[pixel + channel] = Math.max(0, Math.min(255,
        Math.round((data[pixel + channel] - (1 - alpha) * background[channel]) / alpha)));
    }
  }
}

/**
 * Applies the segmentation confidence mask, protects interior furniture details, and removes background tint on edges.
 */
export function applyBackgroundRemovalMask(
  data: Uint8ClampedArray,
  maskData: ArrayLike<number>,
  width: number,
  height: number,
): Uint8ClampedArray {
  const background = inferFlatBackground(data, width, height);
  const colorProtectedPixels = background
    ? findConnectedForegroundPixels(data, maskData, width, height, background)
    : null;

  for (let pixel = 0; pixel < maskData.length; pixel++) {
    const offset = pixel * 4;
    const confidence = resolvePixelForegroundConfidence(
      data,
      offset,
      maskData[pixel],
      Boolean(colorProtectedPixels?.[pixel]),
      background,
    );
    data[offset + 3] = Math.round(confidence * data[offset + 3]);
  }

  if (background) applyFlatColorDecontamination(data, background);
  return data;
}
