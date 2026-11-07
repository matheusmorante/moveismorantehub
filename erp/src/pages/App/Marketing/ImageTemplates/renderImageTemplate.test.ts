// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { createImageLayer, startImageTemplate, type TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';
import { createTemplatePictureLoader, interpolateTemplateFields, renderImageTemplate } from './renderImageTemplate';

const main = 'https://catalog.example/main.png';
const secondary = 'https://catalog.example/secondary.png';
const product: TemplatePreviewProduct = { id: '1', currency: 'BRL', fields: {}, images: [main, secondary] };

it('resolve campos do produto em textos com valores do produto selecionado', () => {
  const selected = { ...product, fields: { name: 'Mesa', price: 199, currentPrice: 79 } };
  const result = interpolateTemplateFields('DE {{product.price}} POR {{product.currentPrice}} · {{product.name}}', selected);
  expect(result.replace(/\s/g, ' ')).toBe('DE R$ 199,00 POR R$ 79,00 · Mesa');
  expect(interpolateTemplateFields('{{product.name}} / {{product.brand}}', null, true)).toBe('[Nome] / [Marca]');
  expect(interpolateTemplateFields('{{product.brand}} {{product.inexistente}}', selected)).toBe(' {{product.inexistente}}');
});

it('desenha os valores dinâmicos na imagem final', async () => {
  const layer = createImageLayer('text', '1:1');
  if (layer.type !== 'text') throw new Error('Camada de texto esperada.');
  layer.text = 'DE {{product.price}} POR {{product.currentPrice}}';
  const context = {
    scale: vi.fn(), fillRect: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), restore: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })), fillText: vi.fn(), globalAlpha: 1,
  };
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockImplementation(() => context as unknown as CanvasRenderingContext2D);
  const result = await renderImageTemplate({ canvas, format: '1:1', layout: { layers: [layer] },
    product: { ...product, fields: { currentPrice: 79, price: 199 } }, assets: new Map(), getPicture: vi.fn() });
  expect(result.errors).toEqual([]);
  expect(context.fillText.mock.calls[0][0]).toBe('DE R$ 199,00 POR R$ 79,00');
});

it('desenha espaçamento, sublinhado, alinhamento vertical e opacidade da tipografia', async () => {
  const layer = createImageLayer('text', '1:1');
  if (layer.type !== 'text') throw new Error('Camada de texto esperada.');
  Object.assign(layer, { text: 'AB\nCD', x: 0, y: 0, width: 120, height: 200, fontSize: 20,
    lineSpacing: 2, letterSpacing: 2, textOpacity: 50, underline: true, verticalAlign: 'top', opacity: 80 });
  const context = {
    scale: vi.fn(), fillRect: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), restore: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })), fillText: vi.fn(), globalAlpha: 0.8,
  };
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockImplementation(() => context as unknown as CanvasRenderingContext2D);
  await renderImageTemplate({ canvas, format: '1:1', layout: { layers: [layer] }, product, assets: new Map(), getPicture: vi.fn() });
  const textCalls = context.fillText.mock.calls;
  expect(textCalls.map(([character]) => character)).toEqual(['A', 'B', 'C', 'D']);
  expect(textCalls[2][2] - textCalls[0][2]).toBe(40);
  expect(textCalls[1][1] - textCalls[0][1]).toBe(12);
  expect(context.fillRect).toHaveBeenCalledTimes(3); // canvas background plus one underline per line
  expect(context.globalAlpha).toBe(0.4);
});

function pictureFallback(fallback: 'main' | 'none', preview: boolean, images = product.images) {
  const layout = startImageTemplate('blank').formats['1:1'];
  const productLayer = layout.layers.find((layer) => layer.type === 'product')!;
  Object.assign(productLayer, { imageIndex: 1, fallback });
  const image = document.createElement('img');
  const getPicture = vi.fn(async (url: string) => {
    if (url !== main) throw new Error('Foto indisponível');
    return { image, width: 100, height: 100 };
  });
  const context = {
    scale: vi.fn(), fillRect: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), drawImage: vi.fn(), restore: vi.fn(),
  };
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockImplementation(() => context as unknown as CanvasRenderingContext2D);
  return { render: renderImageTemplate({ canvas, format: '1:1', layout, product: { ...product, images }, assets: new Map(), getPicture, preview }),
    context, getPicture, image };
}

it('desenha a foto principal quando o endereço da adicional falha', async () => {
  const { render, context, getPicture, image } = pictureFallback('main', false);
  expect(await render).toEqual({ errors: [], notices: [] });
  expect(getPicture.mock.calls.map(([url]) => url)).toEqual([secondary, main]);
  expect(context.drawImage.mock.calls[0][0]).toBe(image);
});

it('mostra o motivo de a camada ficar vazia quando a alternativa foi desativada', async () => {
  const { render, context, getPicture } = pictureFallback('none', true);
  const result = await render;
  expect(result.errors).toEqual([]);
  expect(result.notices[0]).toContain('A camada fica em branco.');
  expect(getPicture.mock.calls.map(([url]) => url)).toEqual([secondary]);
  expect(context.drawImage).not.toHaveBeenCalled();
});

it('sinaliza o erro para exportação quando nem a imagem alternativa existe', async () => {
  const { render, context } = pictureFallback('main', false, [null, secondary]);
  expect((await render).errors[0]).toContain('Não foi possível abrir a imagem');
  expect(context.drawImage).not.toHaveBeenCalled();
});

it('evita repetir a requisição de imagem quebrada ao redesenhar e permite nova tentativa', async () => {
  vi.useFakeTimers();
  let requests = 0;
  vi.stubGlobal('Image', class {
    onerror: (() => void) | null = null;
    set src(_value: string) { requests++; this.onerror?.(); }
  });
  try {
    const load = createTemplatePictureLoader();
    await expect(load(secondary, false)).rejects.toThrow('Imagem indisponível.');
    await expect(load(secondary, false)).rejects.toThrow('Imagem indisponível.');
    expect(requests).toBe(1);
    vi.advanceTimersByTime(10_000);
    await expect(load(secondary, false)).rejects.toThrow('Imagem indisponível.');
    expect(requests).toBe(2);
  } finally {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
});
