import { describe, expect, it, vi } from 'vitest';
vi.mock('@/services/aiGateway/AiGateway', () => ({ AiGateway: { requestText: vi.fn(), requestImage: vi.fn() } }));
vi.mock('./templateService', () => ({ templateService: { getAll: vi.fn() } }));
import { composeAndValidate, composeWithAi } from './compositionAi';
import { composeLayout } from './compositionLayoutEngine';
import { insideSafeArea } from './layoutGeometry';
import { validateLayout } from './compositionValidator';
import { parseGeminiResponse } from '@/services/aiGateway/core/parseGeminiResponse';
import { environmentGuidance } from './environmentGuidance';
import { compositionLayers } from './compositionDefaults';
import { postProduct } from './postProduct';
import { applyElementModel, defaultElementModels } from './elementModels';
import { AiGateway } from '@/services/aiGateway/AiGateway';
import { Product } from '@/pages/types/product.type';

const fixture = { name: 'Guarda-roupa Monza completo', unitPrice: 949, promoPrice: 799, images: ['p1', 'p2'],
  variations: [{ id: 'v1', unitPrice: 949, promoPrice: 799, images: ['a', 'b', 'c'] },
    { id: 'v2', images: ['d', 'e'] }, { id: 'v3', images: ['f'] }] } as Product;
describe('composição e dados de posts', () => {
  it('escolhe orientação de ambiente pela categoria antes do nome do produto', () => {
    expect(environmentGuidance('Sala de jantar', 'Mesa escritório').prompt).toContain('sala de jantar');
    expect(environmentGuidance('', 'Guarda-roupa casal').prompt).toContain('quarto aconchegante');
    expect(environmentGuidance('Categoria nova', '').prompt).toContain('Categoria nova');
  });
  it('extrai a imagem real mesmo quando a resposta começa com texto', () => {
    expect(parseGeminiResponse({ candidates: [{ content: { parts: [{ text: 'Aqui está' },
      { inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } }] } }] }, 'IMAGE')).toBe('data:image/png;base64,aW1hZ2U=');
    expect(() => parseGeminiResponse({ candidates: [{ content: { parts: [{ text: 'Não gerada' }] } }] }, 'IMAGE')).toThrow();
  });
  it('usa duas fotos da primeira variação e uma das seguintes', () => {
    const result = postProduct(fixture);
    expect(result.mainImageUrl).toBe('a'); expect(result.galleryImages.map(i => i.image_url)).toEqual(['b', 'd', 'f']);
    expect(result.name).toBe(fixture.name); expect(result.price).toContain('799,00'); expect(result.oldPrice).toContain('949,00');
  });
  it('permite substituição e não duplica imagem ausente', () => {
    const product = { ...fixture, variations: [{ ...fixture.variations![0], images: ['a'] }] };
    expect(postProduct(product).galleryImages).toEqual([]);
    expect(postProduct(fixture, { 'v1:0': 'c', 'v2:0': 'e' }).mainImageUrl).toBe('c');
    expect(postProduct(fixture, { 'v2:0': 'e' }).galleryImages[1].image_url).toBe('e');
  });
  it('não mostra preço antigo quando não há promoção válida', () => {
    for (const promo of [0, 949, 1000, undefined]) {
      expect(postProduct({ ...fixture, variations: [], promoPrice: promo }).oldPrice).toBeUndefined();
    }
  });
  it('adapta produto simples sem campos novos', () => {
    const result = postProduct({ ...fixture, variations: undefined });
    expect(result.mainImageUrl).toBe('p1'); expect(result.galleryImages[0].image_url).toBe('p2');
  });
  it.each(['4:5', '9:16'] as const)('compõe %s dentro da safe area e sem colisões', format => {
    const result = composeAndValidate(compositionLayers, format);
    expect(result.validation.valid).toBe(true);
    expect(result.validation.score).toBeGreaterThanOrEqual(90);
    expect(result.layers.every(layer => !layer.visible || insideSafeArea({ ...layer, height: layer.height || .1 }, layer.safeMargin))).toBe(true);
  });
  it('repara coordenadas quebradas com uma composição agrupada', () => {
    const broken = compositionLayers.map(layer => layer.role === 'price' ? { ...layer, x: .10, y: .20 } : layer);
    const result = composeAndValidate(broken, '4:5');
    expect(result.validation.valid).toBe(true);
    expect(result.layers.find(layer => layer.role === 'price')!.x).toBeGreaterThan(.5);
  });
  it('mantém preço, preço antigo e parcelamento como bloco ordenado', () => {
    const layers = composeLayout(compositionLayers, '9:16');
    const oldPrice = layers.find(layer => layer.role === 'oldPrice')!;
    const price = layers.find(layer => layer.role === 'price')!;
    const installment = layers.find(layer => layer.role === 'installment')!;
    expect(oldPrice.y + (oldPrice.height || 0)).toBeLessThanOrEqual(price.y);
    expect(price.y + (price.height || 0)).toBeLessThanOrEqual(installment.y);
  });
  it.each([1, 2, 3])('mantém o bloco de variações válido com %s imagem(ns)', count => {
    const gallery = composeLayout(compositionLayers, '4:5', undefined, { variationCount: count }).find(layer => layer.role === 'gallery')!;
    expect(gallery.width).toBeGreaterThan(0);
    expect(gallery.height).toBeGreaterThan(0);
    expect(count).toBeGreaterThan(0);
  });
  it('dimensiona o grid pelo conteúdo e penaliza produto com bounds visuais pequenos', () => {
    const one = composeLayout(compositionLayers, '4:5', undefined, { variationCount: 1 }).find(layer => layer.role === 'gallery')!;
    const three = composeLayout(compositionLayers, '4:5', undefined, { variationCount: 3 }).find(layer => layer.role === 'gallery')!;
    expect(one.width).toBeLessThan(three.width);
    const sparseProduct = composeLayout(compositionLayers.map(layer => layer.role === 'main' ? { ...layer, subjectBounds: { x: .4, y: .1, width: .2, height: .5 } } : layer), '4:5');
    expect(validateLayout(sparseProduct).warnings).toContain('Produto abaixo da ocupação visual preferida.');
  });
  it('mantém slogan e título dentro do canvas para textos longos', () => {
    const layers = composeLayout(compositionLayers.map(layer => layer.role === 'title' ? { ...layer, maxLines: 2 } : layer), '9:16');
    const validation = validateLayout(layers);
    expect(validation.reasons.filter(reason => /safe area|duas linhas/i.test(reason))).toEqual([]);
  });
  it('preserva elementos bloqueados e impede troca do binding pelo modelo', () => {
    const title = { ...compositionLayers.find(l => l.role === 'title')!, locked: true };
    expect(composeLayout([title], '4:5')[0]).toEqual(title);
    const model = defaultElementModels.find(m => m.id === 'clean-title')!;
    expect(applyElementModel(title, model)).toMatchObject({ id: title.id, x: title.x, locked: true, textBinding: '{{product.name}}' });
  });
  it('propaga limites da API sem simular geração', async () => {
    vi.mocked(AiGateway.requestText).mockResolvedValue({ success: false, userFriendlyMessage: 'Cota atingida' } as any);
    await expect(composeWithAi({ name: 'Mesa', price: 'R$ 10,00' }, compositionLayers, '4:5')).rejects.toThrow('Cota atingida');
  });
});
