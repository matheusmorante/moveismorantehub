// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyBackgroundRemovalMask,
  findConnectedForegroundPixels,
  hasTransparentCorners,
  inferFlatBackground,
  removeImageBackground,
  warmBackgroundRemoval,
} from './index';

function createRgbaImage(width: number, height: number, fill: [number, number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return data;
}

function paintRect(
  data: Uint8ClampedArray,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgba: [number, number, number, number],
) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      data[i] = rgba[0];
      data[i + 1] = rgba[1];
      data[i + 2] = rgba[2];
      data[i + 3] = rgba[3];
    }
  }
}

describe('backgroundRemovalPostProcess', () => {
  it('detects transparent corners cleanly', () => {
    const data = createRgbaImage(10, 10, [255, 255, 255, 0]);
    expect(hasTransparentCorners(data, 10, 10)).toBe(true);
    data[3] = 255;
    expect(hasTransparentCorners(data, 10, 10)).toBe(false);
  });

  it('infers flat background color and restores interior light cabinet parts without restoring edge-connected floor', () => {
    const width = 32;
    const height = 32;
    const data = createRgbaImage(width, height, [245, 245, 245, 255]);
    const mask = new Uint8Array(width * height);

    paintRect(data, width, 8, 8, 22, 22, [150, 95, 60, 255]);
    paintRect(data, width, 10, 10, 20, 18, [220, 212, 185, 255]);
    for (let y = 8; y < 22; y++) {
      for (let x = 8; x < 22; x++) {
        const insideLightDoor = x >= 10 && x < 20 && y >= 10 && y < 18;
        mask[y * width + x] = insideLightDoor ? 20 : 240;
      }
    }

    paintRect(data, width, 10, 22, 20, 24, [150, 150, 150, 255]);
    paintRect(data, width, 0, 26, 32, 32, [215, 210, 200, 255]);

    const bg = inferFlatBackground(data, width, height);
    expect(bg).not.toBeNull();

    const protectedPixels = findConnectedForegroundPixels(data, mask, width, height, bg!);
    expect(protectedPixels[14 * width + 14]).toBe(1);
    expect(protectedPixels[28 * width + 2]).toBe(0);

    applyBackgroundRemovalMask(data, mask, width, height);
    expect(data[3]).toBe(0);
    expect(data[(14 * width + 14) * 4 + 3]).toBeGreaterThan(200);
    expect(data[(23 * width + 14) * 4 + 3]).toBe(0);
    expect(data[(28 * width + 2) * 4 + 3]).toBe(0);
  });
});

describe('backgroundRemoval worker scheduling & options', () => {
  type PostedMsg = { id: number; type: string; width?: number; height?: number; modelInputSize?: number; pixels?: ArrayBuffer };
  const postedMessages: PostedMsg[] = [];
  let workerInstances: Array<{
    onmessage: ((ev: { data: unknown }) => void) | null;
    onerror: ((ev: { message?: string }) => void) | null;
    postMessage: (msg: PostedMsg) => void;
    terminate: () => void;
  }> = [];

  beforeEach(() => {
    postedMessages.length = 0;
    workerInstances = [];

    class MockWorker {
      onmessage: ((ev: { data: unknown }) => void) | null = null;
      onerror: ((ev: { message?: string }) => void) | null = null;
      constructor() {
        workerInstances.push(this);
      }
      postMessage = vi.fn((msg: PostedMsg) => {
        postedMessages.push(msg);
      });
      terminate = vi.fn();
    }

    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('ImageData', class MockImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(data: Uint8ClampedArray, width: number, height: number) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function stubCanvas(transparentCorners: boolean) {
    return vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag !== 'canvas') return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      const canvasEl = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => {
          const w = canvasEl.width;
          const h = canvasEl.height;
          return {
            drawImage: vi.fn(),
            putImageData: vi.fn(),
            getImageData: vi.fn(() => ({
              width: w,
              height: h,
              data: createRgbaImage(w, h, [240, 240, 240, transparentCorners ? 0 : 255]),
            })),
          };
        }),
      };
      return canvasEl as unknown as HTMLCanvasElement;
    });
  }

  it('skips worker dispatch when all four corners are already transparent', async () => {
    stubCanvas(true);
    const result = await removeImageBackground({} as CanvasImageSource, 1600, 800, {
      centerContent: false,
      maxSide: 768,
    });
    expect(result.alreadyTransparent).toBe(true);
    expect(result.width).toBe(768);
    expect(result.height).toBe(384);
    expect(postedMessages).toHaveLength(0);
  });

  it('prioritizes high-priority renders ahead of low-priority preloads and drops aborted queued tasks', async () => {
    stubCanvas(false);

    const warm = warmBackgroundRemoval();
    expect(postedMessages).toHaveLength(1);
    expect(postedMessages[0].type).toBe('warm');

    const lowPromise = removeImageBackground({} as CanvasImageSource, 400, 400, {
      centerContent: false,
      priority: 'low',
    });
    const abortedController = new AbortController();
    const abortedPromise = removeImageBackground({} as CanvasImageSource, 400, 400, {
      centerContent: false,
      priority: 'high',
      signal: abortedController.signal,
    });
    abortedController.abort();

    const highPromise = removeImageBackground({} as CanvasImageSource, 800, 600, {
      centerContent: false,
      maxSide: 768,
      modelInputSize: 512,
      priority: 'high',
    });

    await expect(abortedPromise).rejects.toThrow();

    const worker = workerInstances[0];
    worker.onmessage?.({ data: { id: postedMessages[0].id, warmed: true, backend: 'webgpu' } });
    await warm;

    expect(postedMessages).toHaveLength(2);
    expect(postedMessages[1]).toMatchObject({ type: 'segment', width: 768, height: 576, modelInputSize: 512 });

    const highOut = createRgbaImage(768, 576, [10, 20, 30, 255]).buffer as ArrayBuffer;
    worker.onmessage?.({ data: { id: postedMessages[1].id, width: 768, height: 576, pixels: highOut } });
    const highResult = await highPromise;
    expect(highResult.alreadyTransparent).toBe(false);

    expect(postedMessages).toHaveLength(3);
    expect(postedMessages[2]).toMatchObject({ type: 'segment', width: 400, height: 400 });
    const lowOut = createRgbaImage(400, 400, [10, 20, 30, 255]).buffer as ArrayBuffer;
    worker.onmessage?.({ data: { id: postedMessages[2].id, width: 400, height: 400, pixels: lowOut } });
    await expect(lowPromise).resolves.toMatchObject({ alreadyTransparent: false });
  });
});
