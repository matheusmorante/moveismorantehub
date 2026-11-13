// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  colorRefinementCandidates,
  colorForegroundCandidates,
  hasTransparentBackground,
  inferUniformBackground,
  keepPrimaryForeground,
  removeBackgroundComponents,
  restoreConnectedForeground,
  resizeMatte,
  validateSegmentationMask,
} from './backgroundRemovalPostProcess';
import type { BackgroundRemovalWorkerRequest, BackgroundRemovalWorkerResponse } from './backgroundRemoval.worker';

function makeImage(width: number, height: number, rgba: readonly [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) data.set(rgba, index);
  return data;
}

describe('refinamento conservador do canal alfa', () => {
  it.each([[250, 250, 250], [24, 27, 33], [72, 126, 180]] as const)(
    'reconhece fundo uniforme RGB (%i, %i, %i) e preserva partes do móvel com a mesma cor',
    (r, g, b) => {
      const width = 32;
      const height = 32;
      const pixels = makeImage(width, height, [r, g, b, 255]);
      const mask = new Uint8Array(width * height);
      const door = 16 * width + 16;
      const leg = 25 * width + 12;
      mask[door] = 245;
      mask[leg] = 220;
      const background = inferUniformBackground(pixels, mask, width, height);
      expect(background).toEqual([r, g, b]);
      const candidates = colorRefinementCandidates(pixels, mask, background!);
      expect(candidates[0]).toBe(255);
      expect(candidates[door]).toBe(0);
      expect(candidates[leg]).toBe(0);
    },
  );

  it('mantém a máscara do modelo para um perímetro com parede, piso e iluminação diferentes', () => {
    const width = 48;
    const height = 48;
    const pixels = makeImage(width, height, [225, 225, 225, 255]);
    const mask = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) pixels.set([40 + x * 4, 30 + y * 4, 150, 255], (y * width + x) * 4);
    }
    expect(inferUniformBackground(pixels, mask, width, height)).toBeNull();
  });

  it('remove fundo conectado e aberturas com confiança, mantendo ilhas ambíguas e puxadores', () => {
    const width = 32;
    const height = 32;
    const mask = new Uint8Array(width * height).fill(255);
    const labels = new Int32Array(width * height);
    labels[0] = labels[1] = 1;
    mask[0] = 12;
    mask[1] = 145;
    for (let y = 10; y < 14; y++) {
      for (let x = 10; x < 14; x++) {
        const index = y * width + x;
        mask[index] = 20;
        labels[index] = 2;
      }
    }
    const door = 16 * width + 16;
    mask[door] = 115;
    labels[door] = 3;
    const handle = door + 1;
    mask[handle] = 246;
    removeBackgroundComponents(mask, labels, 4, width, height);
    expect(mask[1]).toBe(0);
    expect(mask[11 * width + 11]).toBe(0);
    expect(mask[door]).toBe(115);
    expect(mask[handle]).toBe(246);
  });

  it('restaura parte escura ligada ao móvel em fundo uniforme, sem restaurar objeto separado', () => {
    const width = 20;
    const height = 16;
    const pixels = makeImage(width, height, [250, 250, 250, 255]);
    const mask = new Uint8Array(width * height);
    const labels = new Int32Array(width * height);
    for (let y = 5; y < 9; y++) for (let x = 2; x < 16; x++) {
      const index = y * width + x;
      pixels.set([125, 75, 35, 255], index * 4);
      labels[index] = 1;
      if (x < 5 || x > 12) mask[index] = 255;
    }
    const unrelated = 12 * width + 18;
    pixels.set([100, 60, 30, 255], unrelated * 4);
    labels[unrelated] = 2;
    const candidates = colorForegroundCandidates(pixels, mask, [250, 250, 250]);
    expect(candidates[6 * width + 8]).toBe(255);
    restoreConnectedForeground(mask, pixels, [250, 250, 250], labels, 3, width, height);
    expect(mask[6 * width + 8]).toBe(255);
    expect(mask[unrelated]).toBe(0);
    expect(mask[0]).toBe(0);
  });

  it('mantém o móvel principal, remove objeto lateral e preserva um detalhe próximo', () => {
    const width = 64;
    const height = 64;
    const mask = new Uint8Array(width * height);
    const fill = (left: number, top: number, right: number, bottom: number, alpha: number) => {
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) mask[y * width + x] = alpha;
      }
    };
    fill(20, 18, 42, 48, 255);
    fill(50, 20, 62, 42, 255);
    fill(44, 30, 45, 31, 255);

    keepPrimaryForeground(mask, width, height);

    expect(mask[30 * width + 30]).toBe(255);
    expect(mask[30 * width + 55]).toBe(0);
    expect(mask[30 * width + 44]).toBe(255);
  });

  it('preserva componentes de tamanho parecido quando há dúvida sobre o produto principal', () => {
    const width = 64;
    const height = 64;
    const mask = new Uint8Array(width * height);
    for (let y = 25; y < 35; y++) for (let x = 27; x < 37; x++) mask[y * width + x] = 255;
    for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) mask[y * width + x] = 255;

    keepPrimaryForeground(mask, width, height);

    expect(mask[30 * width + 32]).toBe(255);
    expect(mask[8 * width + 8]).toBe(255);
  });

  it('preserva regiões de confiança média ligadas ao móvel e um pé separado próximo', () => {
    const width = 64;
    const height = 64;
    const mask = new Uint8Array(width * height);
    for (let y = 10; y < 35; y++) for (let x = 20; x < 40; x++) mask[y * width + x] = 255;
    for (let y = 15; y < 30; y++) for (let x = 40; x < 48; x++) mask[y * width + x] = 80;
    for (let y = 37; y < 44; y++) for (let x = 25; x < 28; x++) mask[y * width + x] = 255;
    for (let y = 5; y < 15; y++) for (let x = 2; x < 8; x++) mask[y * width + x] = 255;

    keepPrimaryForeground(mask, width, height);

    expect(mask[20 * width + 45]).toBe(80);
    expect(mask[40 * width + 26]).toBe(255);
    expect(mask[10 * width + 4]).toBe(0);
  });

  it('rejeita máscaras vazias e mantém a geometria ao redimensionar', () => {
    expect(() => validateSegmentationMask(new Uint8Array(100))).toThrow(/separar/);
    expect(() => validateSegmentationMask(new Uint8Array(100).fill(255))).toThrow(/separar/);
    const smallFalsePositive = new Uint8Array(1000).fill(0);
    smallFalsePositive.fill(255, 0, 14);
    expect(() => validateSegmentationMask(smallFalsePositive)).toThrow(/separar/);
    smallFalsePositive.fill(255, 14, 49);
    expect(() => validateSegmentationMask(smallFalsePositive)).toThrow(/separar/);
    smallFalsePositive.fill(255, 49, 50);
    expect(() => validateSegmentationMask(smallFalsePositive)).not.toThrow();
    const matte = resizeMatte({ data: [0, 255, 0, 255], width: 2, height: 2 }, 7, 3);
    expect(matte).toHaveLength(21);
    expect(matte[0]).toBe(0);
    expect(matte[3]).toBeCloseTo(128, 0);
    expect(matte[20]).toBe(255);
    expect(() => validateSegmentationMask(matte)).not.toThrow();
  });

  it('reconhece transparência existente mesmo quando o móvel encosta em um canto', () => {
    const data = makeImage(10, 10, [255, 255, 255, 255]);
    expect(hasTransparentBackground(data, 10, 10)).toBe(false);
    for (let i = 0; i < 10; i++) data[i * 4 + 3] = 0;
    expect(hasTransparentBackground(data, 10, 10)).toBe(true);
  });
});

describe('worker de remoção de fundo', () => {
  class MockWorker {
    onmessage: ((event: MessageEvent<BackgroundRemovalWorkerResponse>) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    postMessage = vi.fn<(request: BackgroundRemovalWorkerRequest) => void>();
    terminate = vi.fn();
    constructor() { workers.push(this); }
  }
  const workers: MockWorker[] = [];

  beforeEach(() => {
    vi.resetModules();
    workers.length = 0;
    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('ImageData', class {
      readonly data: Uint8ClampedArray;
      constructor(width: number, height: number) { this.data = new Uint8ClampedArray(width * height * 4); }
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return {
        drawImage: vi.fn(),
        putImageData: vi.fn(),
        getImageData: () => ({ data: makeImage(this.width, this.height, [245, 245, 245, 255]) }),
      } as unknown as CanvasRenderingContext2D;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function request(worker: MockWorker, index: number) {
    return worker.postMessage.mock.calls[index][0];
  }
  function reply(worker: MockWorker, data: BackgroundRemovalWorkerResponse) {
    worker.onmessage?.({ data } as MessageEvent<BackgroundRemovalWorkerResponse>);
  }
  function complete(worker: MockWorker, sent: BackgroundRemovalWorkerRequest) {
    reply(worker, { id: sent.id, alpha: new ArrayBuffer(sent.width * sent.height) });
  }

  it('mantém a resolução de saída e dá prioridade à foto atual sobre prévias em fila', async () => {
    const { removeImageBackground } = await import('./index');
    const source = {} as CanvasImageSource;
    const active = removeImageBackground(source, 1600, 800, { centerContent: false });
    const low = removeImageBackground(source, 400, 400, { centerContent: false, priority: 'low' });
    const controller = new AbortController();
    const cancelled = removeImageBackground(source, 500, 500, { signal: controller.signal, centerContent: false });
    const high = removeImageBackground(source, 800, 600, { centerContent: false, maxSide: 768 });
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
    const worker = workers[0];
    expect(request(worker, 0)).toMatchObject({ width: 1200, height: 600, forceWasm: false });
    complete(worker, request(worker, 0));
    await expect(active).resolves.toMatchObject({ width: 1600, height: 800 });
    expect(request(worker, 1)).toMatchObject({ width: 768, height: 576 });
    complete(worker, request(worker, 1));
    await high;
    expect(request(worker, 2)).toMatchObject({ width: 400, height: 400 });
    complete(worker, request(worker, 2));
    await low;
  });

  it('refaz a mesma solicitação num worker WASM após falha do WebGPU', async () => {
    const { removeImageBackground } = await import('./index');
    const output = removeImageBackground({} as CanvasImageSource, 200, 100, { centerContent: false });
    const first = workers[0];
    const sent = request(first, 0);
    reply(first, { id: sent.id, retryPixels: sent.pixels });
    expect(first.terminate).toHaveBeenCalledOnce();
    const fallback = workers[1];
    expect(request(fallback, 0)).toMatchObject({ id: sent.id, forceWasm: true });
    complete(fallback, request(fallback, 0));
    await expect(output).resolves.toMatchObject({ width: 200, height: 100 });
  });
});
