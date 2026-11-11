export type ImageContentBounds = { x: number; y: number; width: number; height: number };

const ANALYSIS_MAX_SIDE = 600;

function median(values: number[]) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] ?? 0;
}

function analyzeImageContent(source: CanvasImageSource, width: number, height: number): ImageContentBounds {
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
    const corners = [0, analysisWidth - 1, (analysisHeight - 1) * analysisWidth, analysisHeight * analysisWidth - 1]
      .map((pixel) => pixel * 4);
    const transparent = corners.every((index) => data[index + 3] < 32);
    let background: [number, number, number] = [0, 0, 0];
    let differenceThreshold = 0;

    if (!transparent) {
      const samples: number[] = [];
      const step = Math.max(1, Math.floor(Math.max(analysisWidth, analysisHeight) / 256));
      const sample = (pixel: number) => {
        const offset = pixel * 4;
        samples.push(offset);
      };
      for (let x = 0; x < analysisWidth; x += step) {
        sample(x);
        sample((analysisHeight - 1) * analysisWidth + x);
      }
      for (let y = step; y < analysisHeight - step; y += step) {
        sample(y * analysisWidth);
        sample(y * analysisWidth + analysisWidth - 1);
      }
      const colors: [number, number, number] = [
        median(samples.map((offset) => data[offset])),
        median(samples.map((offset) => data[offset + 1])),
        median(samples.map((offset) => data[offset + 2])),
      ];
      const edgeDifferences = samples.map((offset) => {
        const red = Math.abs(data[offset] - colors[0]);
        const green = Math.abs(data[offset + 1] - colors[1]);
        const blue = Math.abs(data[offset + 2] - colors[2]);
        return Math.max(red, green, blue);
      }).sort((a, b) => a - b);
      const edgeSpread = edgeDifferences[Math.floor(edgeDifferences.length * .75)] ?? 0;
      if (edgeSpread > 84) return full;
      background = colors;
      differenceThreshold = Math.min(56, Math.max(28, Math.ceil(edgeSpread * 1.4 + 12)));
    }

    const rowCounts = new Uint16Array(analysisHeight);
    const columnCounts = new Uint16Array(analysisWidth);
    // Localiza a área de recorte sem alterar pixels, inclusive móveis brancos sobre fundo branco.
    const foreground = new Uint8Array(analysisWidth * analysisHeight);
    for (let pixel = 0; pixel < foreground.length; pixel++) {
      const offset = pixel * 4;
      const difference = transparent ? 0 : Math.max(Math.abs(data[offset] - background[0]),
        Math.abs(data[offset + 1] - background[1]), Math.abs(data[offset + 2] - background[2]));
      const isContent = data[offset + 3] >= 32 && (transparent || difference > differenceThreshold);
      if (!isContent) continue;
      foreground[pixel] = 1;
      rowCounts[Math.floor(pixel / analysisWidth)] += 1;
      columnCounts[pixel % analysisWidth] += 1;
    }

    const minimumRowPixels = Math.max(2, Math.ceil(analysisWidth * .0015));
    const minimumColumnPixels = Math.max(2, Math.ceil(analysisHeight * .0015));
    let left = analysisWidth, top = analysisHeight, right = -1, bottom = -1;
    for (let pixel = 0; pixel < foreground.length; pixel++) {
      if (!foreground[pixel]) continue;
      const x = pixel % analysisWidth;
      const y = Math.floor(pixel / analysisWidth);
      if (rowCounts[y] < minimumRowPixels && columnCounts[x] < minimumColumnPixels) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
    if (right < left || bottom < top) return full;

    const contentWidth = right - left + 1;
    const contentHeight = bottom - top + 1;
    if (contentWidth * contentHeight >= analysisWidth * analysisHeight * .95) return full;
    const x = Math.max(0, Math.floor(left * width / analysisWidth));
    const y = Math.max(0, Math.floor(top * height / analysisHeight));
    const rightEdge = Math.min(width, Math.ceil((right + 1) * width / analysisWidth));
    const bottomEdge = Math.min(height, Math.ceil((bottom + 1) * height / analysisHeight));
    return { x, y, width: rightEdge - x, height: bottomEdge - y };
  } catch {
    return full;
  }
}

export function imageContentBounds(source: CanvasImageSource, width: number, height: number, margin = .03): ImageContentBounds {
  const bounds = analyzeImageContent(source, width, height);
  const inset = Math.max(0, Math.min(.2, margin));
  const horizontal = Math.ceil(bounds.width * inset);
  const vertical = Math.ceil(bounds.height * inset);
  const x = Math.max(0, bounds.x - horizontal);
  const y = Math.max(0, bounds.y - vertical);
  const right = Math.min(width, bounds.x + bounds.width + horizontal);
  const bottom = Math.min(height, bounds.y + bounds.height + vertical);
  return { x, y, width: right - x, height: bottom - y };
}
