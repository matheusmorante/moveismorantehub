// @vitest-environment happy-dom
import { useState } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductFormAi } from './useProductFormAi';
import type Product from '@/pages/types/product.type';

const mocks = vi.hoisted(() => ({ category: vi.fn(), combo: vi.fn(), description: vi.fn(), title: vi.fn(), fiscal: vi.fn(), improve: vi.fn(), prices: vi.fn(), error: vi.fn(), warning: vi.fn(), quota: false }));
vi.mock('@/pages/utils/aiService', () => ({ aiService: { generateComboName: mocks.combo, generateProductDescription: mocks.description, generateMarketplaceTitle: mocks.title, generateFiscalData: mocks.fiscal, improveProductDescription: mocks.improve, suggestPrices: mocks.prices } }));
vi.mock('@/pages/utils/categoryResolutionService', () => ({ matchCategoryByRules: mocks.category }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({ companyName: 'Loja', companyAddress: 'Curitiba - PR', companyCnpj: '12.abc.345/01de-35' }) }));
vi.mock('@/services/aiGateway/aiQuotaNotifier', () => ({ isQuotaExceeded: () => mocks.quota }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, warning: mocks.warning, success: vi.fn(), info: vi.fn() } }));

const product: Partial<Product> = {
  id: 'draft', isDraft: true, name: '  Armário Azul  ', description: '  Armário de madeira  ',
  width: 80, height: 180, depth: 50, weight: 10, material: 'Madeira', brand: 'Morante', line: 'Linha A',
  categoryIds: ['category'], finalPurchasePrice: 100, itemType: 'product', fiscal: { cst: '500' },
  comboItems: [{ productId: 'piece', description: '  Mesa  ', quantity: 2, unitPrice: 50, stock: 10 }],
};
const categories = [{ id: 'category', name: 'Armários', keywords: ['Armário'] }];
type Owner = ReturnType<typeof useProductFormAi>;
type Action = 'handleGenerateCategory' | 'handleGenerateComboName' | 'handleGenerateAIDescription' | 'handleGenerateMarketplaceTitle' | 'handleAutoFillFiscalWithAI' | 'handleImproveDescriptionWithAI' | 'handleSuggestPrices';
const run = async (owner: Owner, action: Action) => {
  if (action === 'handleGenerateAIDescription') await owner.handleGenerateAIDescription('whatsapp');
  else await owner[action]();
};
const mount = (initial: Partial<Product> = product, choices = categories) => renderHook(() => {
  const [data, setData] = useState(initial);
  return { ...useProductFormAi(data, setData, choices), data };
});
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks(); mocks.quota = false;
  mocks.category.mockReturnValue({ id: 'category', name: 'Armários' });
  mocks.combo.mockResolvedValue({ name: 'Combo Mesa' }); mocks.description.mockResolvedValue({ description: 'Texto do canal' });
  mocks.title.mockResolvedValue({ title: 'Título do marketplace' });
  mocks.fiscal.mockResolvedValue({ ncm: '94035000', cest: '2800100', cfop: '5102', cst: '00', icmsPercent: 0, origem: '0', pisCst: '49', cofinsCst: '49' });
  mocks.improve.mockResolvedValue({ improvedDescription: 'Descrição revisada' });
  mocks.prices.mockResolvedValue({ low: { price: 150 }, medium: { price: 180, margin: 45 } });
});

const invalidCases: Array<[string, Action, Partial<Product>]> = [
  ['categoria sem título', 'handleGenerateCategory', { name: '', title: '', description: '' }],
  ['combo vazio', 'handleGenerateComboName', { comboItems: [] }],
  ['quantidade zero no combo', 'handleGenerateComboName', { comboItems: [{ ...product.comboItems![0], quantity: 0 }] }],
  ['quantidade não finita no combo', 'handleGenerateComboName', { comboItems: [{ ...product.comboItems![0], quantity: Number.NaN }] }],
  ['item sem descrição', 'handleGenerateComboName', { comboItems: [{ ...product.comboItems![0], description: ' ' }] }],
  ['descrição do canal sem título', 'handleGenerateAIDescription', { description: ' ' }],
  ['medida negativa do canal', 'handleGenerateAIDescription', { width: -1 }],
  ['título marketplace vazio', 'handleGenerateMarketplaceTitle', { description: ' ' }],
  ['fiscal sem título', 'handleAutoFillFiscalWithAI', { name: '', description: '' }],
  ['aperfeiçoamento sem nome', 'handleImproveDescriptionWithAI', { name: '', description: '' }],
  ['aperfeiçoamento sem categoria', 'handleImproveDescriptionWithAI', { categoryIds: [] }],
  ['aperfeiçoamento sem medida', 'handleImproveDescriptionWithAI', { width: 0, height: 0, depth: 0 }],
  ['aperfeiçoamento com peso inválido', 'handleImproveDescriptionWithAI', { weight: Number.NaN }],
  ['preço sem título', 'handleSuggestPrices', { description: ' ' }],
  ['preço sem custo', 'handleSuggestPrices', { finalPurchasePrice: 0 }],
  ['preço com custo não finito', 'handleSuggestPrices', { finalPurchasePrice: Number.NaN }],
];
describe('intenções assistidas do proprietário de produto', () => {
  it.each(invalidCases)('bloqueia %s antes do efeito', async (_label, action, invalid) => {
    const { result } = mount({ ...product, ...invalid });
    await act(async () => { await run(result.current, action); });
    expect(mocks.warning).toHaveBeenCalled();
    for (const effect of [mocks.category, mocks.combo, mocks.description, mocks.title, mocks.fiscal, mocks.improve, mocks.prices]) expect(effect).not.toHaveBeenCalled();
    expect(result.current.data.isDraft).toBe(true); expect(result.current.isAiProcessing).toBe(false);
  });
  it('deriva categoria com título parseado e preserva os metadados das opções', async () => {
    const { result } = mount({ ...product, categoryIds: [] });
    await act(async () => { await result.current.handleGenerateCategory(); });
    expect(mocks.category).toHaveBeenCalledWith('Armário Azul', categories);
    expect(result.current.data.categoryIds).toEqual(['category']); expect(result.current.data.isDraft).toBe(true);
  });
  it('categoria automática sem título permanece silenciosa e sem efeito', async () => {
    const { result } = mount({ name: '', description: '' });
    await act(async () => { await result.current.handleGenerateCategory(true); });
    expect(mocks.warning).not.toHaveBeenCalled(); expect(mocks.category).not.toHaveBeenCalled();
  });
  it('bloqueia opção de categoria sem identificação antes do matcher', async () => {
    const { result } = mount(product, [{ id: ' ', name: 'Armários', keywords: [] }]);
    await act(async () => { await result.current.handleGenerateCategory(); });
    expect(mocks.warning).toHaveBeenCalledWith('Categoria sem identificação.'); expect(mocks.category).not.toHaveBeenCalled();
  });
  it('monta o nome do combo com quantidades e descrições parseadas', async () => {
    const { result } = mount();
    await act(async () => { await result.current.handleGenerateComboName(); });
    expect(mocks.combo).toHaveBeenCalledWith('2x Mesa'); expect(result.current.data.description).toBe('Combo Mesa'); expect(result.current.data.isDraft).toBe(true);
  });
  it.each(['whatsapp', 'ecommerce'] as const)('gera o texto somente no canal %s com payload parseado', async (type) => {
    const { result } = mount();
    await act(async () => { await result.current.handleGenerateAIDescription(type); });
    expect(mocks.description).toHaveBeenCalledWith({ title: 'Armário de madeira', material: 'Madeira', dimensions: '80x180x50', brand: 'Morante', line: 'Linha A', type });
    expect(result.current.data[type === 'whatsapp' ? 'whatsappDescription' : 'ecommerceDescription']).toBe('Texto do canal');
    expect(result.current.data[type === 'whatsapp' ? 'ecommerceDescription' : 'whatsappDescription']).toBeUndefined();
  });
  it('recusa canal inválido antes de gerar texto', async () => {
    const { result } = mount();
    await act(async () => { await result.current.handleGenerateAIDescription('invalid' as 'whatsapp'); });
    expect(mocks.warning).toHaveBeenCalled(); expect(mocks.description).not.toHaveBeenCalled();
  });
  it('não inventa medidas ausentes ao gerar a descrição de um rascunho', async () => {
    const { result } = mount({ ...product, width: undefined, height: undefined, depth: undefined });
    await act(async () => { await result.current.handleGenerateAIDescription('ecommerce'); });
    expect(mocks.description).toHaveBeenCalledWith(expect.objectContaining({ dimensions: undefined }));
  });
  it('usa a descrição parseada ao gerar o título', async () => {
    const { result } = mount(); await act(async () => { await result.current.handleGenerateMarketplaceTitle(); });
    expect(mocks.title).toHaveBeenCalledWith({ description: 'Armário de madeira', material: 'Madeira' });
    expect(result.current.data).toMatchObject({ title: 'Título do marketplace', marketplaceTitle: 'Título do marketplace', isDraft: true });
  });
  it.each(['product', 'service'] as const)('mantém contexto, normalização e revisão fiscal para %s', async (itemType) => {
    const { result } = mount({ ...product, itemType });
    await act(async () => { await result.current.handleAutoFillFiscalWithAI(); });
    expect(mocks.fiscal).toHaveBeenCalledWith(expect.objectContaining({ title: 'Armário Azul', category: 'Armários', companyCnpj: '12ABC34501DE35', companyName: 'Loja' }));
    expect(result.current.data.fiscal).toMatchObject({ ncm: '94035000', cfop: '5102', cst: itemType === 'service' ? '00' : '500' });
    expect(result.current.data.isDraft).toBe(true);
  });
  it('usa o título alternativo validado ao aperfeiçoar sem nome', async () => {
    const { result } = mount({ ...product, name: '' });
    await act(async () => { await result.current.handleImproveDescriptionWithAI(); });
    expect(mocks.improve).toHaveBeenCalledWith(expect.objectContaining({ title: 'Armário de madeira', width: 80, height: 180, depth: 50 }));
    expect(mocks.improve.mock.calls[0][0]).not.toHaveProperty('categoryIds');
    expect(result.current.data.description).toBe('Descrição revisada');
  });
  it('calcula margem com o custo parseado e conserva margem informada', async () => {
    const { result } = mount(); await act(async () => { await result.current.handleSuggestPrices(); });
    expect(mocks.prices).toHaveBeenCalledWith({ description: 'Armário de madeira', costPrice: 100, material: 'Madeira' });
    expect(result.current.suggestPricesResults).toEqual({ low: { price: 150, margin: 50 }, medium: { price: 180, margin: 45 } });
    expect(result.current.data.unitPrice).toBeUndefined();
  });
  it('conserva preço e margem zero informados na sugestão', async () => {
    mocks.prices.mockResolvedValueOnce({ low: { price: 0, margin: 0 } });
    const { result } = mount(); await act(async () => { await result.current.handleSuggestPrices(); });
    expect(result.current.suggestPricesResults).toEqual({ low: { price: 0, margin: 0 } });
  });
  it('bloqueia margem calculada não finita antes de exibir sugestões', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.prices.mockResolvedValueOnce({ low: { price: Number.MAX_VALUE } });
    const { result } = mount({ ...product, finalPurchasePrice: Number.MIN_VALUE });
    await act(async () => { await result.current.handleSuggestPrices(); });
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('margem válida')); expect(result.current.suggestPricesResults).toBeNull();
  });
  const invalidResponses: Array<[Action, ReturnType<typeof vi.fn>, unknown]> = [
    ['handleGenerateComboName', mocks.combo, { name: '' }],
    ['handleGenerateComboName', mocks.combo, { name: { value: 'invalid' } }],
    ['handleGenerateAIDescription', mocks.description, { description: '' }],
    ['handleGenerateAIDescription', mocks.description, { description: { value: 'invalid' } }],
    ['handleGenerateMarketplaceTitle', mocks.title, { title: 42 }],
    ['handleImproveDescriptionWithAI', mocks.improve, { improvedDescription: '' }],
    ['handleSuggestPrices', mocks.prices, {}],
    ['handleSuggestPrices', mocks.prices, { low: { price: Number.NaN } }],
    ['handleSuggestPrices', mocks.prices, { low: { price: -1 } }],
    ['handleSuggestPrices', mocks.prices, { low: { price: 120, margin: Number.POSITIVE_INFINITY } }],
  ];
  it.each(invalidResponses)('recusa resposta inválida de %s sem substituir dados', async (action, operation, response) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    operation.mockResolvedValueOnce(response);
    const { result } = mount(); await act(async () => { await run(result.current, action); });
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('sugestão'));
    expect(result.current.data).toEqual(product); expect(result.current.suggestPricesResults).toBeNull(); expect(result.current.isAiProcessing).toBe(false);
  });
  it('não duplica o aviso de quota já tratado pelo serviço', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); mocks.quota = true;
    mocks.improve.mockRejectedValueOnce({ status: 429 });
    const { result } = mount(); await act(async () => { await result.current.handleImproveDescriptionWithAI(); });
    expect(mocks.error).not.toHaveBeenCalled(); expect(result.current.isAiProcessing).toBe(false);
  });

  const pendingCases = [
    ['handleGenerateComboName', 'isGeneratingComboName', mocks.combo],
    ['handleGenerateAIDescription', 'isGeneratingDescription', mocks.description],
    ['handleGenerateMarketplaceTitle', 'isGeneratingTitle', mocks.title],
    ['handleAutoFillFiscalWithAI', 'isFillingFiscalWithAI', mocks.fiscal],
    ['handleImproveDescriptionWithAI', 'isImprovingDescription', mocks.improve],
    ['handleSuggestPrices', 'isSuggestingPrices', mocks.prices],
  ] as const;
  it.each(pendingCases)('protege %s até concluir e permite retomar após falha', async (action, flag, operation) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail!: (error: Error) => void;
    operation.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const { result } = mount(); let first!: Promise<void>;
    await act(async () => { first = run(result.current, action); });
    await waitFor(() => expect(operation).toHaveBeenCalledTimes(1));
    await act(async () => { await run(result.current, action); });
    expect(operation).toHaveBeenCalledTimes(1); expect(result.current[flag]).toBe(true); expect(result.current.data).toEqual(product);
    await act(async () => { fail(new Error('Falha simulada')); await first; });
    expect(mocks.error).toHaveBeenCalledWith('Falha simulada'); expect(result.current[flag]).toBe(false);
    await act(async () => { await run(result.current, action); });
    expect(operation).toHaveBeenCalledTimes(2); expect(result.current.isAiProcessing).toBe(false);
  });
});
