// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InboundInvoiceItemsReview } from './InboundInvoiceItemsReview';
import type Product from '@/pages/types/product.type';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { getCompleteQuickVariationName, getInboundGtin, hasSiblingVariationName, normalizeNcm } from '../../../../../../../shared-utils/inboundQuickRegisterRules';
import { quickRegisterSelectionFormSchema } from '../../../../../../../shared-utils/operationsFormSchemas';
import { prepareExistingParentNewVariation } from '../services/inboundProductPreparationService';

const mocks = vi.hoisted(() => ({
  full: vi.fn(), code: vi.fn(), categories: vi.fn(), category: vi.fn(), change: vi.fn(),
  save: vi.fn(), variation: vi.fn(), find: vi.fn(), link: vi.fn(), barcode: vi.fn(), nameMatches: vi.fn(), categorySuggestion: vi.fn(), updateParent: vi.fn(),
  componentSequence: 0,
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {}, isTestEnvironment: false }));
vi.mock('@/pages/utils/personService', () => ({ fetchPersons: vi.fn().mockResolvedValue([]) }));
vi.mock('@/pages/utils/productService', () => ({ getFullProduct: mocks.full, saveProduct: mocks.save, saveVariation: mocks.variation, findProductByVariationBarcode: mocks.barcode, findInboundProductNameMatches: mocks.nameMatches }));
vi.mock('@/pages/utils/productService/productMutationService', () => ({ updateProduct: mocks.updateParent }));
vi.mock('@/pages/utils/productService/productSkuService', () => ({ getNextSequentialProductCode: mocks.code, generateVariationSku: (code: string, variations: unknown[]) => `${code}-${String(variations.length + 1).padStart(2, '0')}` }));
vi.mock('@/pages/utils/categoryService', () => ({ fetchGroupsAndCategories: mocks.categories }));
vi.mock('@/pages/utils/categoryResolutionService', () => ({ resolveAutoCategory: mocks.category }));
vi.mock('@/pages/App/Products/services/technicalFieldService', () => ({ fetchTechnicalFieldDefinitions: vi.fn().mockResolvedValue([]) }));
vi.mock('../services/inboundProductPreparationService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/inboundProductPreparationService')>()),
  suggestInboundProductCategory: mocks.categorySuggestion,
}));
vi.mock('@/pages/utils/aiService', () => ({ aiService: {} }));
vi.mock('@/pages/utils/productSupplierCodesService', () => ({ findProductSupplierCodes: mocks.find, saveProductSupplierCode: mocks.link, deleteProductSupplierCode: vi.fn() }));
vi.mock('@/pages/utils/inboundNfe/inboundSupplierProductContext', () => ({ fetchSupplierProductsForContext: vi.fn().mockResolvedValue([]), buildSupplierContextSummary: vi.fn() }));
vi.mock('../hooks/useInboundInvoiceSuggestions', () => ({ useInboundInvoiceSuggestions: () => ({ suggestionFor: () => undefined, rejectSuggestion: vi.fn(), isProcessingSuggestions: false, isItemProcessing: () => false, retrySuggestions: vi.fn() }) }));
vi.mock('react-toastify', () => ({ toast: mocks.toast }));
vi.mock('@/pages/App/Products/modals/ProductFormModal', () => ({ default: (props: { isOpen: boolean }) => props.isOpen ? <output aria-label="Produto aberto" /> : null }));
vi.mock('@/components/ProductAutocomplete', () => ({ default: (props: { disabled?: boolean; parentsOnly?: boolean; onSelect: (product: Partial<Product>) => void; onChange?: (value: string) => void }) => <>
  <input aria-label="Buscar produto pai" disabled={props.disabled} onChange={(event) => props.onChange?.(event.target.value)} />
  {props.parentsOnly
    ? <button type="button" disabled={props.disabled} onClick={() => props.onSelect({ id: ' parent-1 ', name: 'Pai' })}>Selecionar pai</button>
    : <button type="button" disabled={props.disabled} onClick={() => { const sequence = ++mocks.componentSequence; props.onSelect({ id: `component-${sequence}`, name: `Componente ${sequence}`, code: `COMP-${sequence}`, unitPrice: 20, stock: 5 }); }}>Selecionar componente</button>}
</> }));

const item: InboundInvoiceItem = { itemNumber: 1, productDescription: ' Mesa ', productCode: ' FORN-1 ', unit: ' UN ', quantity: 2, unitCost: 10, totalCost: 20, ncm: '94036000', cfop: '1102' };
const parent = { id: 'parent-1', name: 'Pai', code: '100', unitPrice: 50, stock: 7, supplierId: 'supplier-1', itemType: 'product', active: true, variations: [{ id: '00000000-0000-4000-8000-000000000002', sku: '100-01', stock: 7, unitPrice: 50 }] } as unknown as Product;
const products = new Map<string, Product>();
const mappings = new Map();
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function Page({ items = [item], supplierId = ' supplier-1 ' }: { items?: InboundInvoiceItem[]; supplierId?: string }) {
  return <InboundInvoiceItemsReview contextKey="invoice-1" items={items} supplierId={supplierId} suppliers={[]} onChange={mocks.change} suggestionsEnabled={false} />;
}
async function open(mode: 'new' | 'existing' = 'new', ncmChoice: string | null = 'Usar o NCM da NF-e e atualizar o produto pai') {
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));
  if (mode === 'existing') {
    fireEvent.click(screen.getByRole('button', { name: /Nova variação de produto existente/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Selecionar pai' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cadastrar e vincular' }).hasAttribute('disabled')).toBe(false));
    const resolution = ncmChoice ? screen.queryByLabelText(ncmChoice) : null;
    if (resolution) fireEvent.click(resolution);
  } else {
    const category = await screen.findByRole('combobox', { name: /Categoria/ });
    fireEvent.change(category, { target: { value: 'cat-1' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo a categoria selecionada/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cadastrar e vincular' }).hasAttribute('disabled')).toBe(false));
  }
}
function submit() { fireEvent.click(screen.getByRole('button', { name: 'Cadastrar e vincular' })); }
beforeEach(() => {
  vi.clearAllMocks(); mocks.componentSequence = 0; products.clear(); mappings.clear(); products.set('parent-1', structuredClone(parent));
  mocks.full.mockReset().mockImplementation(async (id: string) => products.get(id));
  mocks.code.mockReset().mockResolvedValue('101');
  mocks.categories.mockReset().mockResolvedValue({ categories: [{ id: 'cat-1', name: 'Categoria', type: 'category', active: true }] }); mocks.category.mockReset().mockResolvedValue(null);
  mocks.categorySuggestion.mockReset().mockResolvedValue({ category: { id: 'cat-1', name: 'Categoria' }, source: 'ai' });
  mocks.find.mockReset().mockImplementation(async () => new Map(mappings));
  mocks.barcode.mockReset().mockResolvedValue(null); mocks.nameMatches.mockReset().mockResolvedValue([]); mocks.updateParent.mockReset().mockImplementation(async (id: string, update: Partial<Product>) => { const current = products.get(id); if (current) products.set(id, { ...current, ...update }); });
  mocks.link.mockReset().mockImplementation(async (reference) => { mappings.set(reference.supplierProductCode, reference); });
  mocks.save.mockReset().mockImplementation(async (product: Product) => { products.set(product.id!, product); return product.id; });
  mocks.variation.mockReset().mockImplementation(async (id: string, variation) => { const product = products.get(id)!; products.set(id, { ...product, variations: [...product.variations!, variation] }); });
  mocks.change.mockReset().mockResolvedValue(true);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('cadastro rápido da NF-e com resolver real, criação direta e vínculo confirmado', () => {
  it('prioriza cEAN, aplica fallback de cEANTrib e normaliza NCM/nome completo', () => {
    expect(getInboundGtin('7891234567895', '7890000000000')).toBe('7891234567895');
    expect(getInboundGtin('SEM GTIN', '7890000000000')).toBe('7890000000000');
    expect(getInboundGtin('', '7890000000000')).toBe('7890000000000');
    expect(normalizeNcm('9403.60.00')).toBe('94036000');
    expect(getCompleteQuickVariationName('Mesa', 'Branca')).toBe('Mesa Branca');
    expect(hasSiblingVariationName([{ name: 'Mesa Branca', attributes: [] }], 'Mesa', 'Mesa Brânca')).toBe(true);
  });
  it('schema exige confirmar categoria, NCM divergente, campos obrigatórios e componentes', () => {
    const simple = { mode: 'SIMPLE', name: 'Mesa', categoryId: 'cat-1', costPrice: 10 };
    expect(quickRegisterSelectionFormSchema.safeParse(simple).success).toBe(false);
    expect(quickRegisterSelectionFormSchema.safeParse({ ...simple, categoryConfirmed: true }).success).toBe(true);
    const variation = { mode: 'EXISTING_PARENT', parentProductId: 'parent', nameSuffix: 'Branca', variationFullName: 'Mesa Branca', ncmMismatch: true };
    expect(quickRegisterSelectionFormSchema.safeParse(variation).success).toBe(false);
    for (const ncmResolution of ['variation', 'update-parent', 'keep-parent'] as const) {
      expect(quickRegisterSelectionFormSchema.safeParse({ ...variation, ncmResolution }).success).toBe(true);
    }
    const noNcmMismatch = { ...variation, ncmMismatch: false };
    expect(quickRegisterSelectionFormSchema.safeParse({ ...noNcmMismatch, requiredVariableFields: ['Cor'], technicalValues: {} }).success).toBe(false);
    expect(quickRegisterSelectionFormSchema.safeParse({ ...noNcmMismatch, requiredVariableFields: [], technicalValues: {} }).success).toBe(true);
    const composition = { mode: 'COMPOSITION', name: 'Kit', categoryId: 'cat-1', categoryConfirmed: true, costPrice: 10 };
    expect(quickRegisterSelectionFormSchema.safeParse(composition).success).toBe(false);
    expect(quickRegisterSelectionFormSchema.safeParse({ ...composition, components: [{ productId: 'component', description: 'Cadeira', unitPrice: 20, stock: 5, quantity: 1 }] }).success).toBe(false);
    expect(quickRegisterSelectionFormSchema.safeParse({ ...composition, components: [
      { productId: 'chair', description: 'Cadeira', unitPrice: 20, stock: 5, quantity: 1 },
      { productId: 'table', description: 'Mesa', unitPrice: 50, stock: 2, quantity: 1 },
    ] }).success).toBe(true);
    expect(quickRegisterSelectionFormSchema.safeParse({ ...composition, components: [
      { productId: 'chair', description: 'Cadeira', unitPrice: 20, stock: 5, quantity: 1 },
      { productId: 'chair', description: 'Cadeira', unitPrice: 20, stock: 5, quantity: 2 },
    ] }).success).toBe(false);
  });
  it('materializa a variação simples virtual antes de acrescentar a segunda', async () => {
    const simpleProduct = {
      ...parent,
      id: '00000000-0000-4000-8000-000000000001',
      hasVariations: false,
      variations: [{ id: 'virtual-100-01', isVirtual: true, sku: '100-01', name: 'Pai', stock: 7, unitPrice: 50, attributes: [] }],
    } as unknown as Product;
    const prepared = await prepareExistingParentNewVariation(simpleProduct, { productDescription: 'Pai Azul', unitCost: 15 }, { name: 'Pai Azul', ncmResolution: 'keep-parent' });
    expect(prepared.hasVariations).toBe(true);
    expect(prepared.variations).toHaveLength(2);
    expect(prepared.variations?.[0]).toMatchObject({ id: expect.stringMatching(/^[0-9a-f-]{36}$/i), isVirtual: false, sku: '100-01', name: 'Pai', stock: 7 });
    expect(prepared.variations?.[1]).toMatchObject({ sku: '100-02', name: 'Pai Azul', stock: 0, costPrice: 15 });
  });
  it('persiste a variação virtual existente quando a primeira variação real é criada', async () => {
    const virtualParent = {
      ...parent,
      variations: [{ id: 'parent-1_100-01', isVirtual: true, sku: '100-01', name: 'Pai', stock: 7, unitPrice: 50, attributes: [] }],
    } as unknown as Product;
    products.set('parent-1', virtualParent);
    render(<Page />); await open('existing'); submit();
    await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce());
    expect(mocks.variation).not.toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.save.mock.calls[0][0].variations).toHaveLength(2);
    expect(mocks.save.mock.calls[0][0].variations[0]).toMatchObject({ sku: '100-01', name: 'Pai', stock: 7, isVirtual: false });
    expect(mocks.save.mock.calls[0][0].variations[1]).toMatchObject({ sku: '100-02', name: 'Pai Mesa', stock: 0, status: 'hidden' });
  });
  it('oferece uma escolha de NCM quando o produto pai ainda não tem esse dado', async () => {
    products.set('parent-1', { ...structuredClone(parent), fiscal: {} });
    render(<Page />); await open('existing', null);
    const choice = await screen.findByRole('radio', { name: 'Usar o NCM da NF-e apenas nesta variação' });
    expect(screen.getByText(/Produto pai: não informado/)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Ex.: Branco, 120 cm'), { target: { value: 'Azul' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cadastrar e vincular' }).hasAttribute('disabled')).toBe(false));
    submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('divergência de NCM'));
    expect(mocks.variation).not.toHaveBeenCalled();
    fireEvent.click(choice); submit();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.variation).toHaveBeenCalledWith('parent-1', expect.objectContaining({ syncNcm: false, fiscal: expect.objectContaining({ ncm: '94036000' }) }));
  });
  it('exige confirmar a categoria outra vez se o nome do produto mudar', async () => {
    render(<Page />); await open();
    const categoryConfirmation = screen.getByRole('checkbox', { name: /Confirmo a categoria selecionada/ }) as HTMLInputElement;
    expect(categoryConfirmation.checked).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome do produto *' }), { target: { value: 'Mesa de jantar extensível' } });
    expect(categoryConfirmation.checked).toBe(false);
    submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Confirme a categoria'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([
    ['produto', { matchedProductId: 'product-1', matchedVariationId: 'variation-1' }],
    ['composição', { linkMode: 'composition' as const, compositionLinks: [{ id: 'link-1', productId: 'product-1', variationId: 'variation-1', productErpName: 'Mesa', linkedProductCode: 'SKU-1', sellingPrice: 50, apportionedCost: 10, quantityMultiplier: 1 }] }],
  ])('oculta o atalho quando o item já tem vínculo de %s', (_kind, update) => {
    render(<Page items={[{ ...item, ...update }]} />);
    expect(screen.queryByRole('button', { name: 'Cadastrar' })).toBeNull();
  });
  it('exibe erro do resolver sem consultar quando falta selecionar pai', async () => {
    render(<Page />); await open(); fireEvent.click(screen.getByRole('button', { name: /Nova variação de produto existente/ })); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Selecione o produto pai'));
    expect(mocks.full).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each(['new', 'existing'] as const)('cria %s e vincula sem abrir formulário de produto', async (mode) => {
    render(<Page />); await open(mode); submit();
    await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByLabelText('Produto aberto')).toBeNull();
    expect(mocks.change).toHaveBeenCalledWith(1, expect.objectContaining({ matchedProductId: expect.any(String), matchedVariationId: expect.any(String), linkedProductCode: mode === 'new' ? '101-01' : '100-02' }));
    expect(mocks.link).toHaveBeenCalledWith(expect.objectContaining({ supplierId: 'supplier-1', supplierProductCode: 'FORN-1', supplierDescription: 'Mesa' }));
    if (mode === 'new') expect(mocks.save.mock.calls[0][0]).toMatchObject({ name: 'Mesa', supplierId: 'supplier-1', unit: 'UN', costPrice: 10, stock: 0, unitPrice: 0, hasVariations: false, status: 'hidden', ecommerceSync: false });
    else {
      expect(mocks.save).not.toHaveBeenCalled();
      expect(mocks.variation).toHaveBeenCalledWith('parent-1', expect.objectContaining({ costPrice: 10, stock: 0, syncCostPrice: false }));
      expect(mocks.updateParent).toHaveBeenCalledWith('parent-1', { fiscal: { ncm: '94036000' } });
      expect(products.get('parent-1')).toMatchObject({ unitPrice: 50, stock: 7, variations: [parent.variations![0], expect.any(Object)] });
    }
  });
  it.each([
    ['Usar o NCM da NF-e apenas nesta variação', 'variation', false, true],
    ['Usar o NCM da NF-e e atualizar o produto pai', 'update-parent', true, false],
    ['Manter o NCM do produto pai', 'keep-parent', false, false],
  ] as const)('resolve NCM divergente: %s', async (choice, resolution, updateParent, variationOnly) => {
    products.set('parent-1', { ...parent, fiscal: { ncm: '94039000' } });
    render(<Page />); await open('existing', choice); submit();
    await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce());
    const savedVariation = mocks.variation.mock.calls[0][1];
    expect(savedVariation).toMatchObject({ syncNcm: !variationOnly });
    if (variationOnly) expect(savedVariation.fiscal).toEqual({ ncm: '94036000' });
    else expect(savedVariation.fiscal).toBeUndefined();
    expect(mocks.updateParent).toHaveBeenCalledTimes(updateParent ? 1 : 0);
    expect(products.get('parent-1')?.fiscal?.ncm).toBe(updateParent ? '94036000' : '94039000');
  });
  it.each(['quantity', 'cost', 'description', 'code'] as const)('payload inválido %s impede consultas e gravações', async (kind) => {
    const invalid = { ...item, ...(kind === 'quantity' ? { quantity: 0 } : kind === 'cost' ? { unitCost: -1 } : kind === 'code' ? { productCode: ' ' } : { productDescription: ' ' }) };
    render(<Page items={[invalid]} />); await open(); submit();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(mocks.code).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([null, { ...parent, id: 'other' }, { ...parent, deleted: true }, { ...parent, isVariation: true }, { ...parent, active: false }, { ...parent, itemType: 'service' }, { ...parent, supplierId: 'other' }])('pai indisponível ou fora do fornecedor não recebe variação', async (value) => {
    mocks.full.mockResolvedValueOnce(value); render(<Page />); await open('existing'); submit();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(mocks.variation).not.toHaveBeenCalled(); expect(mocks.link).not.toHaveBeenCalled();
  });
  it('código do fornecedor já vinculado impede outro produto', async () => {
    mappings.set('FORN-1', { productId: 'existing' }); render(<Page />); await open(); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('já está cadastrado'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('reutiliza uma colisão exata de cProd sem criar outro produto', async () => {
    const existing = { ...parent, id: 'existing', variations: [{ ...parent.variations![0], id: 'existing-variation', name: 'Mesa' }] } as Product;
    products.set('existing', existing);
    mappings.set('FORN-1', { supplierId: 'supplier-1', supplierProductCode: 'FORN-1', productId: 'existing', productVariationId: 'existing-variation' });
    render(<Page />); await open(); submit();
    const reuse = await screen.findByRole('button', { name: 'Reutilizar e vincular' }); fireEvent.click(reuse);
    await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce());
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.variation).not.toHaveBeenCalled();
  });
  it('reutiliza a única variação quando o vínculo antigo de cProd não informa variação', async () => {
    const existing = { ...parent, id: 'legacy-existing', variations: [{ ...parent.variations![0], id: 'legacy-variation', name: 'Mesa única' }] } as Product;
    products.set(existing.id!, existing);
    mappings.set('FORN-1', { supplierId: 'supplier-1', supplierProductCode: 'FORN-1', productId: existing.id });
    render(<Page />); await open(); submit();
    fireEvent.click(await screen.findByRole('button', { name: 'Reutilizar e vincular' }));
    await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce());
    expect(mocks.change).toHaveBeenCalledWith(1, expect.objectContaining({ matchedProductId: existing.id, matchedVariationId: 'legacy-variation' }));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('bloqueia GTIN repetido e permite reutilizar o cadastro encontrado', async () => {
    const variation = { ...parent.variations![0], id: 'gtin-variation', name: 'Mesa' };
    const existing = { ...parent, id: 'gtin-product', variations: [variation] } as Product;
    products.set(existing.id!, existing); mocks.barcode.mockResolvedValue({ product: existing, variation });
    render(<Page items={[{ ...item, ean: '7891234567895' }]} />); await open(); submit();
    expect(await screen.findByText(/GTIN já está cadastrado/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reutilizar e vincular' }));
    await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce());
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.link).toHaveBeenCalledWith(expect.objectContaining({ productId: 'gtin-product', productVariationId: 'gtin-variation', supplierProductCode: 'FORN-1' }));
  });
  it('correspondência apenas por nome exige revisão antes de criar', async () => {
    mocks.nameMatches.mockResolvedValue(['Mesa de Jantar']); render(<Page />); await open(); submit();
    expect(await screen.findByText('Mesa de Jantar')).toBeTruthy(); expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Revisei os cadastros localizados/ })); submit();
    await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce()); expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('cria produto composto somente com componentes selecionados manualmente', async () => {
    render(<Page />); await open();
    fireEvent.click(screen.getByText('Mais opções de cadastro'));
    fireEvent.click(screen.getByRole('button', { name: /Novo produto composto/ }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Selecionar componente' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Selecionar componente' })); submit();
    await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce());
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ itemType: 'composition', isCombo: true, stock: 0, comboItems: [
      expect.objectContaining({ productId: 'component-1', quantity: 1 }),
      expect.objectContaining({ productId: 'component-2', quantity: 1 }),
    ] });
  });
  it('bloqueia clique repetido e fechamento enquanto cadastra', async () => {
    const pending = deferred<string>(); mocks.code.mockReturnValueOnce(pending.promise);
    render(<Page />); await open(); submit(); fireEvent.keyDown(window, { key: 'Escape' }); fireEvent.click(screen.getByText('Cancelar')); submit();
    await waitFor(() => expect(mocks.code).toHaveBeenCalledOnce()); expect(screen.getByRole('status').textContent).toContain('Cadastrando');
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => { pending.resolve('101'); }); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('erro anterior à gravação permite tentar de novo', async () => {
    mocks.code.mockRejectedValueOnce(new Error('Consulta indisponível')); render(<Page />); await open(); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Consulta indisponível'));
    submit(); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('produto salvo é reutilizado se a conferência do cadastro falhar', async () => {
    mocks.full.mockResolvedValueOnce(null); render(<Page />); await open(); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Produto cadastrado'));
    submit(); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('falha de confirmação do vínculo não cria novamente nem declara sucesso', async () => {
    mocks.change.mockResolvedValue(false); render(<Page />); await open(); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('gravação não foi confirmada'));
    submit(); await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(mocks.save).toHaveBeenCalledOnce(); expect(mocks.toast.success).not.toHaveBeenCalled();
  });
  it.each(['supplier', 'item', 'removed', 'unmount'] as const)('mudança de %s descarta resposta antes de gravar', async (kind) => {
    const pending = deferred<string>(); mocks.code.mockReturnValueOnce(pending.promise);
    const view = render(<Page />); await open(); submit(); await waitFor(() => expect(mocks.code).toHaveBeenCalledOnce());
    if (kind === 'unmount') view.unmount();
    else view.rerender(<Page supplierId={kind === 'supplier' ? 'supplier-2' : ' supplier-1 '} items={kind === 'removed' ? [] : kind === 'item' ? [{ ...item, quantity: 3 }] : [item]} />);
    await act(async () => { pending.resolve('101'); }); expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.link).not.toHaveBeenCalled();
  });
  it.each(['code', 'save'] as const)('timeout em %s libera interface e não continua após resposta tardia', async (stage) => {
    const pending = deferred<string>(); mocks[stage].mockReturnValueOnce(pending.promise);
    render(<Page />); await open(); vi.useFakeTimers(); submit();
    await act(async () => { for (let i = 0; i < 35; i++) await Promise.resolve(); }); expect(mocks[stage]).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(45001); }); expect(screen.getByRole('alert')).toBeTruthy();
    await act(async () => { pending.resolve(stage === 'code' ? '101' : mocks.save.mock.calls[0][0].id); }); expect(mocks.link).not.toHaveBeenCalled(); expect(mocks.change).not.toHaveBeenCalled();
  });
});
