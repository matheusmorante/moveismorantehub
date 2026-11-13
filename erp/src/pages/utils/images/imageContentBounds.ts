export type ImageContentBounds = { x: number; y: number; width: number; height: number };

type PixelBox = { left: number; top: number; right: number; bottom: number };
type AlphaComponentBounds = PixelBox & { area: number; touchesEdge: boolean };
type BorderBackgroundEstimate = { color: [number, number, number]; threshold: number };

const ANALYSIS_MAX_SIDE = 600;

function median(values: number[]): number {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] ?? 0;
}

function isFullyOpaque(data: Uint8ClampedArray): boolean {
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] < 224) return false;
  }
  return true;
}

function hasMostlyTransparentCorners(data: Uint8ClampedArray, width: number, height: number): boolean {
  const cornerWidth = Math.max(1, Math.ceil(width * .02));
  const cornerHeight = Math.max(1, Math.ceil(height * .02));
  const totalPixels = cornerWidth * cornerHeight;

  const isTransparentPatch = (startX: number, startY: number) => {
    let transparentPixels = 0;
    for (let y = startY; y < startY + cornerHeight; y++) {
      for (let x = startX; x < startX + cornerWidth; x++) {
        if (data[(y * width + x) * 4 + 3] < 32) transparentPixels++;
      }
    }
    return transparentPixels / totalPixels >= .8;
  };

  const corners = [
    isTransparentPatch(0, 0),
    isTransparentPatch(width - cornerWidth, 0),
    isTransparentPatch(0, height - cornerHeight),
    isTransparentPatch(width - cornerWidth, height - cornerHeight),
  ];
  return corners.filter(Boolean).length >= 3;
}

function estimateBorderBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): BorderBackgroundEstimate | null {
  const sampleOffsets: number[] = [];
  const step = Math.max(1, Math.floor(Math.max(width, height) / 256));
  for (let x = 0; x < width; x += step) {
    sampleOffsets.push(x * 4, ((height - 1) * width + x) * 4);
  }
  for (let y = step; y < height - step; y += step) {
    sampleOffsets.push((y * width) * 4, (y * width + width - 1) * 4);
  }

  const color: [number, number, number] = [
    median(sampleOffsets.map((offset) => data[offset])),
    median(sampleOffsets.map((offset) => data[offset + 1])),
    median(sampleOffsets.map((offset) => data[offset + 2])),
  ];
  const edgeDifferences = sampleOffsets
    .map((offset) => Math.max(
      Math.abs(data[offset] - color[0]),
      Math.abs(data[offset + 1] - color[1]),
      Math.abs(data[offset + 2] - color[2]),
    ))
    .sort((a, b) => a - b);
  const edgeSpread = edgeDifferences[Math.floor(edgeDifferences.length * .75)] ?? 0;
  if (edgeSpread > 84) return null;

  return { color, threshold: Math.min(56, Math.max(28, Math.ceil(edgeSpread * 1.4 + 12))) };
}

function selectAlphaComponents(components: AlphaComponentBounds[]): PixelBox | null {
  if (!components.length) return null;
  const largest = components.reduce((best, item) => (item.area > best.area ? item : best));
  const largestInterior = components
    .filter((item) => !item.touchesEdge)
    .reduce<AlphaComponentBounds | null>((best, item) => (!best || item.area > best.area ? item : best), null);
  const useInterior = Boolean(largestInterior && largestInterior.area >= largest.area * .02);
  const anchor = useInterior ? largestInterior! : largest;
  const selected = useInterior
    ? components.filter((item) => !item.touchesEdge && item.area >= anchor.area * .005)
    : [anchor];

  return selected.reduce<PixelBox>((bounds, item) => ({
    left: Math.min(bounds.left, item.left),
    top: Math.min(bounds.top, item.top),
    right: Math.max(bounds.right, item.right),
    bottom: Math.max(bounds.bottom, item.bottom),
  }), { left: anchor.left, top: anchor.top, right: anchor.right, bottom: anchor.bottom });
}

function getAlphaContentBounds(foreground: Uint8Array, width: number, height: number): PixelBox | null {
  const visited = new Uint8Array(foreground.length);
  const queue = new Uint32Array(foreground.length);
  const components: AlphaComponentBounds[] = [];

  for (let start = 0; start < foreground.length; start++) {
    if (!foreground[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    let left = width, top = height, right = -1, bottom = -1, touchesEdge = false;
    queue[tail++] = start;
    visited[start] = 1;

    while (head < tail) {
      const current = queue[head++];
      const y = (current / width) | 0;
      const x = current - y * width;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
      touchesEdge ||= x === 0 || y === 0 || x === width - 1 || y === height - 1;

      for (let dy = -1; dy <= 1; dy++) {
        const nextY = y + dy;
        if (nextY < 0 || nextY >= height) continue;
        const rowOffset = nextY * width;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nextX = x + dx;
          if (nextX < 0 || nextX >= width) continue;
          const next = rowOffset + nextX;
          if (!foreground[next] || visited[next]) continue;
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }

    if (tail >= 4) components.push({ area: tail, left, top, right, bottom, touchesEdge });
  }

  return selectAlphaComponents(components);
}

function buildForegroundMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  background: BorderBackgroundEstimate | null,
  alphaOnly: boolean,
) {
  const rowCounts = new Uint16Array(height);
  const columnCounts = new Uint16Array(width);
  // Localiza a área de recorte sem alterar pixels, inclusive móveis brancos sobre fundo branco.
  const foreground = new Uint8Array(width * height);
  const alphaThreshold = alphaOnly ? 224 : 32;

  for (let pixel = 0; pixel < foreground.length; pixel++) {
    const offset = pixel * 4;
    if (data[offset + 3] < alphaThreshold) continue;
    if (background) {
      const difference = Math.max(
        Math.abs(data[offset] - background.color[0]),
        Math.abs(data[offset + 1] - background.color[1]),
        Math.abs(data[offset + 2] - background.color[2]),
      );
      if (difference <= background.threshold) continue;
    }
    foreground[pixel] = 1;
    const y = (pixel / width) | 0;
    rowCounts[y] += 1;
    columnCounts[pixel - y * width] += 1;
  }

  return { foreground, rowCounts, columnCounts };
}

function scanRowColumnBounds(
  foreground: Uint8Array,
  rowCounts: Uint16Array,
  columnCounts: Uint16Array,
  width: number,
  height: number,
): PixelBox | null {
  const minimumRowPixels = Math.max(2, Math.ceil(width * .0015));
  const minimumColumnPixels = Math.max(2, Math.ceil(height * .0015));
  let left = width, top = height, right = -1, bottom = -1;

  for (let pixel = 0; pixel < foreground.length; pixel++) {
    if (!foreground[pixel]) continue;
    const y = (pixel / width) | 0;
    const x = pixel - y * width;
    if (rowCounts[y] < minimumRowPixels || columnCounts[x] < minimumColumnPixels) continue;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }

  return right >= left && bottom >= top ? { left, top, right, bottom } : null;
}

function scaleAnalysisBounds(
  box: PixelBox,
  analysisWidth: number,
  analysisHeight: number,
  fullWidth: number,
  fullHeight: number,
): ImageContentBounds | null {
  const contentWidth = box.right - box.left + 1;
  const contentHeight = box.bottom - box.top + 1;
  if (contentWidth * contentHeight >= analysisWidth * analysisHeight * .95) return null;

  const x = Math.max(0, Math.floor(box.left * fullWidth / analysisWidth));
  const y = Math.max(0, Math.floor(box.top * fullHeight / analysisHeight));
  const rightEdge = Math.min(fullWidth, Math.ceil((box.right + 1) * fullWidth / analysisWidth));
  const bottomEdge = Math.min(fullHeight, Math.ceil((box.bottom + 1) * fullHeight / analysisHeight));
  return { x, y, width: rightEdge - x, height: bottomEdge - y };
}

function analyzeImageContent(source: CanvasImageSource, width: number, height: number, alphaOnly = false): ImageContentBounds {
  const full = { x: 0, y: 0, width, height };
  if (typeof document === 'undefined' || width < 1 || height < 1) return full;

  const scale = Math.min(1, ANALYSIS_MAX_SIDE / Math.max(width, height));
  const analysisWidth = Math.max(1, Math.round(width * scale));
  const analysisHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = analysisWidth;
  canvas.height = analysisHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return full;

  try {
    context.drawImage(source, 0, 0, analysisWidth, analysisHeight);
    const { data } = context.getImageData(0, 0, analysisWidth, analysisHeight);
    if (alphaOnly && isFullyOpaque(data)) return full;

    const transparent = alphaOnly || hasMostlyTransparentCorners(data, analysisWidth, analysisHeight);
    const background = transparent ? null : estimateBorderBackground(data, analysisWidth, analysisHeight);
    if (!transparent && !background) return full;

    const { foreground, rowCounts, columnCounts } = buildForegroundMask(
      data,
      analysisWidth,
      analysisHeight,
      background,
      alphaOnly,
    );
    const box = alphaOnly
      ? getAlphaContentBounds(foreground, analysisWidth, analysisHeight)
      : scanRowColumnBounds(foreground, rowCounts, columnCounts, analysisWidth, analysisHeight);
    if (!box) return full;

    return scaleAnalysisBounds(box, analysisWidth, analysisHeight, width, height) ?? full;
  } catch {
    return full;
  }
}

function addBoundsMargin(bounds: ImageContentBounds, width: number, height: number, margin: number): ImageContentBounds {
  const inset = Math.max(0, Math.min(.2, margin));
  const horizontal = Math.ceil(bounds.width * inset);
  const vertical = Math.ceil(bounds.height * inset);
  const x = Math.max(0, bounds.x - horizontal);
  const y = Math.max(0, bounds.y - vertical);
  const right = Math.min(width, bounds.x + bounds.width + horizontal);
  const bottom = Math.min(height, bounds.y + bounds.height + vertical);
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Estimates the visible subject bounding box within a product image, adding relative padding.
 */
export function imageContentBounds(source: CanvasImageSource, width: number, height: number, margin = .03): ImageContentBounds {
  return addBoundsMargin(analyzeImageContent(source, width, height), width, height, margin);
}

/**
 * Estimates the bounding box of opaque foreground pixels in an already-cutout transparent image.
 */
export function imageAlphaContentBounds(source: CanvasImageSource, width: number, height: number, margin = 0): ImageContentBounds {
  return addBoundsMargin(analyzeImageContent(source, width, height, true), width, height, margin);
}
