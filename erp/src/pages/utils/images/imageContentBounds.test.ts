// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { imageAlphaContentBounds, imageContentBounds } from './imageContentBounds';

function createRgbaPixelBuffer(
  width: number,
  height: number,
  fill: [number, number, number, number],
  paintSubject?: (setPixel: (x: number, y: number, rgba: [number, number, number, number]) => void) => void,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    data[offset] = fill[0];
    data[offset + 1] = fill[1];
    data[offset + 2] = fill[2];
    data[offset + 3] = fill[3];
  }
  paintSubject?.((x, y, rgba) => {
    const offset = (y * width + x) * 4;
    data[offset] = rgba[0];
    data[offset + 1] = rgba[1];
    data[offset + 2] = rgba[2];
    data[offset + 3] = rgba[3];
  });
  return data;
}

function mockAnalysisCanvas(data: Uint8ClampedArray, width: number, height: number) {
  const getImageData = vi.fn(() => ({ data, width, height, colorSpace: 'srgb' as const }));
  const drawImage = vi.fn();
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
    if (tagName.toLowerCase() !== 'canvas') return originalCreateElement(tagName);
    return {
      width,
      height,
      getContext: () => ({ drawImage, getImageData }),
    } as unknown as HTMLCanvasElement;
  }) as typeof document.createElement);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('imageContentBounds', () => {
  it('returns tight bounds for an interior opaque subject against a uniform flat border', () => {
    const width = 40;
    const height = 40;
    const data = createRgbaPixelBuffer(width, height, [255, 255, 255, 255], (setPixel) => {
      for (let y = 10; y < 30; y++) {
        for (let x = 12; x < 28; x++) {
          setPixel(x, y, [40, 20, 10, 255]);
        }
      }
    });
    mockAnalysisCanvas(data, width, height);

    const bounds = imageContentBounds({} as CanvasImageSource, width, height, 0);
    expect(bounds).toEqual({ x: 12, y: 10, width: 16, height: 20 });
  });

  it('falls back to full bounds when the image has no distinct border background', () => {
    const width = 20;
    const height = 20;
    const data = createRgbaPixelBuffer(width, height, [240, 240, 240, 255]);
    mockAnalysisCanvas(data, width, height);

    const bounds = imageContentBounds({} as CanvasImageSource, width, height);
    expect(bounds).toEqual({ x: 0, y: 0, width: 20, height: 20 });
  });
});

describe('imageAlphaContentBounds', () => {
  it('finds opaque foreground pixels on transparent canvas and excludes detached specks when main body dominates', () => {
    const width = 40;
    const height = 40;
    const data = createRgbaPixelBuffer(width, height, [0, 0, 0, 0], (setPixel) => {
      for (let y = 8; y < 32; y++) {
        for (let x = 10; x < 30; x++) {
          setPixel(x, y, [80, 50, 30, 255]);
        }
      }
      // Small stray speck in the top-left corner well separated from the main subject
      setPixel(1, 1, [80, 50, 30, 255]);
      setPixel(2, 1, [80, 50, 30, 255]);
    });
    mockAnalysisCanvas(data, width, height);

    const bounds = imageAlphaContentBounds({} as CanvasImageSource, width, height, 0);
    expect(bounds).toEqual({ x: 10, y: 8, width: 20, height: 24 });
  });

  it('returns full bounds immediately when the alpha channel is completely opaque', () => {
    const width = 16;
    const height = 12;
    const data = createRgbaPixelBuffer(width, height, [120, 90, 60, 255]);
    mockAnalysisCanvas(data, width, height);

    const bounds = imageAlphaContentBounds({} as CanvasImageSource, width, height);
    expect(bounds).toEqual({ x: 0, y: 0, width: 16, height: 12 });
  });
});
