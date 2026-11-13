const SOLID_FOREGROUND = 200;
const SOLID_BACKGROUND = 42;
const BORDER_COLOR_TOLERANCE = 20;
const MIN_FOREGROUND_MASK_RATIO = .05;

export const INVALID_BACKGROUND_MASK = 'A ferramenta não conseguiu separar o móvel do fundo nesta foto.';
export type AlphaMatte = { data: ArrayLike<number>; width: number; height: number };

export function hasTransparentBackground(data: Uint8ClampedArray, width: number, height: number): boolean {
  let transparent = 0;
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 20) transparent++;
  }
  const corners = [0, width - 1, width * (height - 1), width * height - 1];
  return transparent >= width * height * .02 && corners.some((pixel) => data[pixel * 4 + 3] < 20);
}

export function validateSegmentationMask(mask: ArrayLike<number>) {
  let foreground = 0;
  let background = 0;
  for (let index = 0; index < mask.length; index++) {
    if (mask[index] >= SOLID_FOREGROUND) foreground++;
    if (mask[index] <= SOLID_BACKGROUND) background++;
  }
  // A tiny foreground mask often means the model selected only a fragment of
  // furniture in a room. Keep the original and offer brush correction instead.
  const minimum = Math.max(1, Math.ceil(mask.length * MIN_FOREGROUND_MASK_RATIO));
  if (foreground < minimum || background < minimum) throw new Error(INVALID_BACKGROUND_MASK);
}

function colorDistance(data: Uint8ClampedArray, offset: number, rgb: readonly number[]) {
  return Math.max(
    Math.abs(data[offset] - rgb[0]),
    Math.abs(data[offset + 1] - rgb[1]),
    Math.abs(data[offset + 2] - rgb[2]),
  );
}

/**
 * Color refinement is enabled only when BiRefNet and the photo's perimeter
 * both support the same background color on at least three sides.
 */
export function inferUniformBackground(
  data: Uint8ClampedArray, mask: Uint8Array, width: number, height: number,
): readonly number[] | null {
  const sides = Array.from({ length: 4 }, () => [] as number[][]);
  const sample = (side: number, x: number, y: number) => {
    const pixel = y * width + x;
    const offset = pixel * 4;
    if (mask[pixel] > SOLID_BACKGROUND || data[offset + 3] < 245) return;
    sides[side].push([data[offset], data[offset + 1], data[offset + 2]]);
  };
  const samplesPerSide = 32;
  for (let i = 0; i < samplesPerSide; i++) {
    const x = Math.round(i * (width - 1) / (samplesPerSide - 1));
    const y = Math.round(i * (height - 1) / (samplesPerSide - 1));
    sample(0, x, 0);
    sample(1, x, height - 1);
    sample(2, 0, y);
    sample(3, width - 1, y);
  }

  const samples = sides.flat();
  if (samples.length < 2 * samplesPerSide) return null;
  const color = [0, 1, 2].map((channel) => {
    const values = samples.map((rgb) => rgb[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
  const matching = sides.map((side) =>
    side.filter((rgb) => rgb.every((value, channel) => Math.abs(value - color[channel]) <= BORDER_COLOR_TOLERANCE)).length);
  return matching.filter((count) => count >= samplesPerSide / 2).length >= 3
    && matching.reduce((sum, count) => sum + count, 0) >= samples.length * .85
    ? color
    : null;
}

/**
 * Selects likely residual background. Strong foreground, including white
 * panels and fine legs, never participates in the color-based operation.
 */
export function colorRefinementCandidates(
  data: Uint8ClampedArray, mask: Uint8Array, background: readonly number[],
) {
  const candidates = new Uint8Array(mask.length);
  for (let pixel = 0; pixel < mask.length; pixel++) {
    if (mask[pixel] < 160 && colorDistance(data, pixel * 4, background) <= BORDER_COLOR_TOLERANCE) {
      candidates[pixel] = 255;
    }
  }
  return candidates;
}

export function polishAlpha(mask: Uint8Array, softened: Uint8Array) {
  for (let index = 0; index < mask.length; index++) {
    const alpha = mask[index];
    if (alpha <= 12) mask[index] = 0;
    else if (alpha >= 245) mask[index] = 255;
    else mask[index] = Math.round(alpha * .8 + softened[index] * .2);
  }
}

/**
 * A closed opening must have a region already classified as background.
 * Smaller uncertain islands inside the object retain the BiRefNet mask.
 */
export function removeBackgroundComponents(
  mask: Uint8Array, labels: Int32Array, labelCount: number, width: number, height: number,
) {
  const exterior = new Uint8Array(labelCount);
  const lowConfidence = new Uint32Array(labelCount);
  const sizes = new Uint32Array(labelCount);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const label = labels[index];
      if (!label) continue;
      sizes[label]++;
      if (mask[index] <= SOLID_BACKGROUND) {
        lowConfidence[label]++;
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) exterior[label] = 1;
      }
    }
  }
  const remove = new Uint8Array(labelCount);
  const minimumCore = Math.max(8, Math.ceil(mask.length * .0002));
  for (let label = 1; label < labelCount; label++) {
    if (exterior[label] || (lowConfidence[label] >= minimumCore && lowConfidence[label] >= sizes[label] * .7)) {
      remove[label] = 1;
    }
  }
  for (let index = 0; index < mask.length; index++) {
    if (remove[labels[index]]) mask[index] = 0;
  }
}

export function resizeMatte(mask: AlphaMatte, width: number, height: number): Uint8Array {
  if (mask.width === width && mask.height === height) return Uint8Array.from(mask.data);
  const result = new Uint8Array(width * height);
  const left = new Int32Array(width);
  const horizontalWeight = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    const sourceX = Math.min(mask.width - 1, Math.max(0, (x + .5) * mask.width / width - .5));
    left[x] = Math.floor(sourceX);
    horizontalWeight[x] = sourceX - left[x];
  }
  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(mask.height - 1, Math.max(0, (y + .5) * mask.height / height - .5));
    const top = Math.floor(sourceY);
    const bottom = Math.min(top + 1, mask.height - 1);
    const dy = sourceY - top;
    for (let x = 0; x < width; x++) {
      const lx = left[x];
      const rx = Math.min(lx + 1, mask.width - 1);
      const dx = horizontalWeight[x];
      const upper = mask.data[top * mask.width + lx] * (1 - dx) + mask.data[top * mask.width + rx] * dx;
      const lower = mask.data[bottom * mask.width + lx] * (1 - dx) + mask.data[bottom * mask.width + rx] * dx;
      result[y * width + x] = Math.round(upper * (1 - dy) + lower * dy);
    }
  }
  return result;
}
