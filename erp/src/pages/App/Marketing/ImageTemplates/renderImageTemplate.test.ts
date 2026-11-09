// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { createImageLayer, startImageTemplate, type TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';
import { createTemplatePictureLoader, interpolateTemplateFields, renderImageTemplate } from './renderImageTemplate';

const main = 'https://catalog.example/main.png';
const secondary = 'https://catalog.example/secondary.png';
const product: TemplatePreviewProduct = { id: '1', currency: 'BRL', fields: {}, images: [main, secondary] };

it('resolve campos do produto em textos com valores do produto selecionado', () => {
  const selected = {
    ...product,
    fields: {
      name: 'Mesa', price: 199, promoPrice: 79, currentPrice: 79,
      discount: '60%', discountPercent: 60, discountValue: 120,
      stockOrigin: 'Salvados', color: 'Branco', category: 'Cozinha',
      custom_label_0: 'Cozinha', custom_label_3: 'Queima dos Salvados',
    },
  };
  const result = interpolateTemplateFields('DE {{product.price}} POR {{product.currentPrice}} · {{product.name}}', selected);
  expect(result.replace(/\s/g, ' ')).toBe('DE R$ 199,00 POR R$ 79,00 · Mesa');
  expect(interpolateTemplateFields('{{product.name}} / {{product.brand}}', null, true)).toBe('[Nome do produto] / [Marca]');
  expect(interpolateTemplateFields('{{product.brand}} {{product.inexistente}}', selected)).toBe(' {{product.inexistente}}');

  // Parâmetros específicos do ERP e aliases em português
  expect(interpolateTemplateFields('{{product.desconto}} ({{product.desconto_percentual}})', selected)).toBe('60% (60%)');
  expect(interpolateTemplateFields('Economia: {{product.valor_desconto}}', selected).replace(/\s/g, ' ')).toBe('Economia: R$ 120,00');
  expect(interpolateTemplateFields('Origem: {{product.origem_estoque}} · Cor: {{product.cor}}', selected)).toBe('Origem: Salvados · Cor: Branco');
  expect(interpolateTemplateFields('Categoria: {{product.categoria}} · Promo: {{product.preco_promocional}}', selected).replace(/\s/g, ' ')).toBe('Categoria: Cozinha · Promo: R$ 79,00');
  expect(interpolateTemplateFields('Campanha: {{product.custom_label_3}}', selected)).toBe('Campanha: Queima dos Salvados');
});

it('resolve especificações técnicas do ERP como campos de texto dinâmicos', () => {
  const selected = { ...product, attributes: { attribute_material: { name: 'Material', value: 'MDF' } } };
  expect(interpolateTemplateFields('Material: {{product.attribute_material}}', selected)).toBe('Material: MDF');
  expect(interpolateTemplateFields('{{product.attribute_material}}', null, true)).toBe('[material]');
});

it.each(['product', 'image', 'text', 'catalog', 'sticker'] as const)('oculta %s no PNG sem carregar nem desenhar seu conteúdo', async (type) => {
  const layer = { ...createImageLayer(type, '1:1'), assetId: 'a'.repeat(64),
    condition: { field: 'name', operator: 'contains', value: 'Cadeira' } } as const;
  const context = { scale: vi.fn(), fillRect: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), arc: vi.fn(), fill: vi.fn(), restore: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })), fillText: vi.fn(), drawImage: vi.fn(), globalAlpha: 1 };
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockImplementation(() => context as unknown as CanvasRenderingContext2D);
  const getPicture = vi.fn().mockResolvedValue({ image: document.createElement('img'), width: 100, height: 100 });
  const options = { canvas, format: '1:1' as const, layout: { layers: [layer] },
    assets: new Map([[layer.assetId, main]]), getPicture };
  const hidden = await renderImageTemplate({ ...options, product: { ...product, fields: { name: 'Mesa' } } });
  expect(hidden.errors).toEqual([]);
  expect(getPicture).not.toHaveBeenCalled();
  expect(context.fillText).not.toHaveBeenCalled();
  expect(context.drawImage).not.toHaveBeenCalled();
  expect(context.fillRect).toHaveBeenCalledTimes(1);
  const visible = await renderImageTemplate({ ...options, product: { ...product, fields: { name: 'Cadeira' } } });
  expect(visible.errors).toEqual([]);
  if (type === 'product' || type === 'image') expect(context.drawImage).toHaveBeenCalledOnce();
  else expect(context.fillText).toHaveBeenCalled();
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

it('desenha a sombra opcional do texto', async () => {
  const layer = createImageLayer('text', '1:1');
  if (layer.type !== 'text') throw new Error('Camada de texto esperada.');
  layer.textShadow = true;
  const context = {
    scale: vi.fn(), fillRect: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), restore: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })), fillText: vi.fn(), globalAlpha: 1,
    shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
  };
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockImplementation(() => context as unknown as CanvasRenderingContext2D);
  await renderImageTemplate({ canvas, format: '1:1', layout: { layers: [layer] }, product, assets: new Map(), getPicture: vi.fn() });
  expect(context.shadowColor).toBe('rgba(0, 0, 0, 0.56)');
  expect(context.shadowBlur).toBeGreaterThan(0);
  expect(context.shadowOffsetY).toBeGreaterThan(0);
});

it('alinha linhas iguais sem contar duas vezes o espaçamento nativo do canvas', async () => {
  const layer = createImageLayer('text', '1:1');
  if (layer.type !== 'text') throw new Error('Camada de texto esperada.');
  Object.assign(layer, { text: 'AB\nAB', width: 200, height: 200, fontSize: 20, letterSpacing: 4, align: 'center' });
  const context = { scale: vi.fn(), fillRect: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), restore: vi.fn(), fillText: vi.fn(), globalAlpha: 1,
    letterSpacing: '0px', measureText(text: string) {
      return { width: text.length * 10 + Math.max(0, text.length - 1) * parseFloat(this.letterSpacing) };
    } };
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockImplementation(() => context as unknown as CanvasRenderingContext2D);
  await renderImageTemplate({ canvas, format: '1:1', layout: { layers: [layer] }, product, assets: new Map(), getPicture: vi.fn() });
  expect(context.fillText.mock.calls).toHaveLength(2);
  expect(context.fillText.mock.calls[0][1]).toBe(context.fillText.mock.calls[1][1]);
  expect(context.letterSpacing).toBe('0px');
});

it('mantém opacidade do preenchimento e do texto da forma independentes', async () => {
  const layer = createImageLayer('sticker', '1:1');
  if (layer.type !== 'sticker') throw new Error('Camada de forma esperada.');
  Object.assign(layer, { text: 'Oferta', opacity: 80, textOpacity: 50, fillOpacity: 35 });
  const shapeAlpha: number[] = [];
  const textAlpha: number[] = [];
  const alpha = { current: 1 };
  const context = {
    scale: vi.fn(), fillRect: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(() => shapeAlpha.push(alpha.current)), rect: vi.fn(), clip: vi.fn(), restore: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
    fillText: vi.fn(() => textAlpha.push(alpha.current)),
    get globalAlpha() { return alpha.current; }, set globalAlpha(value: number) { alpha.current = value; },
  };
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockImplementation(() => context as unknown as CanvasRenderingContext2D);
  await renderImageTemplate({ canvas, format: '1:1', layout: { layers: [layer] }, product, assets: new Map(), getPicture: vi.fn() });
  expect(shapeAlpha).toHaveLength(1);
  expect(shapeAlpha[0]).toBeCloseTo(0.28);
  expect(textAlpha).toHaveLength(1);
  expect(textAlpha[0]).toBeCloseTo(0.4);
  expect(context.fillText.mock.calls.map(([line]) => line)).toEqual(['Oferta']);
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
