// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Product from '@/pages/types/product.type';
import { HML_FISCAL_TEST_ORDER_MARKER } from '@/pages/utils/hmlTestData';
import { useProductFormSubmit } from './useProductFormSubmit';
import { toast } from 'react-toastify';
import { useRef, useState } from 'react';
import { useProductFormDraft } from './useProductFormDraft';

const mocks = vi.hoisted(() => ({ saveProduct: vi.fn(async (product: Product) => product.id) }));
vi.mock('@/pages/utils/productService', () => mocks);
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), warn: vi.fn(), success: vi.fn() } }));
afterEach(cleanup);

const complete: Product = {
  id: 'parent', name: 'Armário', description: '', unitPrice: 150, unit: 'UN', itemType: 'product',
  isDraft: true, status: 'draft', active: false, productKind: 'normal', hasVariations: true,
  opportunityId: 'opportunity-1',
  categoryIds: ['categoria'], mainSupplierId: 'fornecedor', width: 80, height: 180, depth: 50,
  technicalValues: {
    Cor: 'Azul',
    Modelo: 'Padrão',
    Marca: 'Morante',
    Altura: '180',
    Largura: '80',
    Profundidade: '50',
    Peso: '70',
    'Material da estrutura': 'Madeira',
  },
  variations: [{ id: 'v1', sku: '001-01', name: 'Armário Azul', unitPrice: 150, stock: 0,
    active: false, status: 'draft', attributes: [], syncUnitPrice: true }],
};

function renderSubmit(
  formData: Product,
  isRegisteredProduct = false,
  isStockistOnly = false,
  isTestArtifact = false,
) {
  const variations = { setEditingVariationId: vi.fn() };
  const setActiveTab = vi.fn();
  const hook = renderHook(() => useProductFormSubmit({
    formData, setFormData: vi.fn(), product: formData, isRegisteredProduct, isStockistOnly,
    setValidationErrors: vi.fn(), setActiveTab, variations, draft: {},
    setLoading: vi.fn(), setSaveResult: vi.fn(), hasChanged: { current: true }, onClose: vi.fn(),
    isTestArtifact,
  }));
  return { ...hook, variations, setActiveTab };
}

describe('conclusão do pai respeita os requisitos de cada variação', () => {
  it('aguarda onSuccess do cadastro existente e preserva a tela quando ele recusa a etapa seguinte', async () => {
    let finish!: (value: boolean) => void;
    const onSuccess = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; })), onClose = vi.fn();
    const { result } = renderHook(() => useProductFormSubmit({
      formData: { ...complete, isDraft: false, status: 'hidden', active: true }, product: complete, isRegisteredProduct: true,
      setFormData: vi.fn(), setValidationErrors: vi.fn(), setActiveTab: vi.fn(), variations: {}, draft: {}, setLoading: vi.fn(), setSaveResult: vi.fn(), hasChanged: { current: true }, onSuccess, onClose,
    }));
    let submitted!: Promise<boolean>;
    await act(async () => { submitted = result.current.handleSubmit(); }); expect(onSuccess).toHaveBeenCalledOnce(); expect(onClose).not.toHaveBeenCalled();
    await act(async () => { expect(await result.current.handleSubmit()).toBe(false); });
    await act(async () => { finish(false); expect(await submitted).toBe(false); }); expect(onClose).not.toHaveBeenCalled();
  });
  it.each([false, true])('resumes autosave after manual draft save or service failure (failure=%s)', async (failure) => {
    if (failure) mocks.saveProduct.mockRejectedValueOnce(new Error('Falha manual simulada'));
    else mocks.saveProduct.mockImplementationOnce(async (product) => { product.updatedAt = 'manual-version'; return product.id; });
    const { result } = renderHook(() => {
      const [formData, setFormData] = useState<Partial<Product>>(complete);
      const changed = useRef(true), initial = useRef('');
      const draft = useProductFormDraft(formData, setFormData, true, true, null, changed, initial);
      const submit = useProductFormSubmit({ formData, setFormData, product: null, isRegisteredProduct: false, setValidationErrors: vi.fn(), setActiveTab: vi.fn(), variations: {}, draft, setLoading: vi.fn(), setSaveResult: vi.fn(), hasChanged: changed, onClose: vi.fn() });
      return { formData, draft, ...submit };
    });
    await act(async () => { expect(await result.current.handleSubmit(false, true)).toBe(!failure); });
    await act(async () => { expect(await result.current.draft.autoSaveDraft({ ...result.current.formData, description: 'Nova alteração' })).toBe(true); });
    expect(mocks.saveProduct).toHaveBeenCalledTimes(2);
    expect(mocks.saveProduct).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'parent', isDraft: true, description: 'Nova alteração', ...(!failure ? { updatedAt: 'manual-version' } : {}) }), false, {});
  });
  it('waits for autosave identity, finalizes the same product and blocks a delayed draft rewrite', async () => {
    let finishDraft!: () => void;
    mocks.saveProduct.mockImplementationOnce(async (product) => {
      await new Promise<void>((resolve) => { finishDraft = resolve; });
      product.updatedAt = 'version-1';
      return 'created-draft';
    }).mockImplementationOnce(async (product) => { product.updatedAt = 'version-2'; return product.id; });
    const { result } = renderHook(() => {
      const [formData, setFormData] = useState<Partial<Product>>({ ...complete, id: undefined });
      const changed = useRef(true), initial = useRef('');
      const draft = useProductFormDraft(formData, setFormData, true, true, null, changed, initial);
      const submit = useProductFormSubmit({ formData, setFormData, product: null, isRegisteredProduct: false, setValidationErrors: vi.fn(), setActiveTab: vi.fn(), variations: { setEditingVariationId: vi.fn() }, draft, setLoading: vi.fn(), setSaveResult: vi.fn(), hasChanged: changed, onClose: vi.fn() });
      return { formData, setFormData, draft, ...submit };
    });
    let first!: Promise<boolean>, final!: Promise<boolean>;
    await act(async () => { first = result.current.draft.autoSaveDraft(result.current.formData); });
    await waitFor(() => expect(mocks.saveProduct).toHaveBeenCalledTimes(1));
    act(() => result.current.setFormData((current) => ({ ...current, unitPrice: 175 })));
    await act(async () => { final = result.current.handleSubmit(false, false); });
    expect(mocks.saveProduct).toHaveBeenCalledTimes(1);
    await act(async () => { expect(await result.current.draft.autoSaveDraft(result.current.formData)).toBe(false); });
    await act(async () => { finishDraft(); await first; expect(await final).toBe(true); });
    expect(mocks.saveProduct).toHaveBeenCalledTimes(2);
    expect(mocks.saveProduct).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'created-draft', isDraft: false, unitPrice: 175, updatedAt: 'version-2' }));
    expect(result.current.formData).toMatchObject({ id: 'created-draft', isDraft: false });
    await act(async () => { expect(await result.current.draft.autoSaveDraft(result.current.formData)).toBe(false); });
    expect(mocks.saveProduct).toHaveBeenCalledTimes(2);
  });
  it.each([false, true])('blocks invalid parent or variation numbers before saving (draft=%s)', async (draft) => {
    for (const invalid of [
      { unitPrice: -1 },
      { costPrice: Number.POSITIVE_INFINITY },
      { variations: [{ ...complete.variations![0], unitPrice: Number.NaN }] },
      { variations: ['invalid-variation'] },
      { variations: [null] },
    ]) {
      const { result, unmount } = renderSubmit({ ...complete, ...invalid } as Product);
      await act(async () => { expect(await result.current.handleSubmit(false, draft)).toBe(false); });
      expect(mocks.saveProduct).not.toHaveBeenCalled();
      expect(vi.mocked(toast.error).mock.calls.length + vi.mocked(toast.warn).mock.calls.length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('protects draft and final buttons with one lock and allows retry after a failed save', async () => {
    let fail!: (reason: Error) => void;
    mocks.saveProduct.mockImplementationOnce(() => new Promise<string>((_resolve, reject) => { fail = reject; }));
    const { result } = renderSubmit(complete);
    let first!: Promise<boolean>;
    await act(async () => { first = result.current.handleSubmit(false, true); });
    await waitFor(() => expect(mocks.saveProduct).toHaveBeenCalledTimes(1));
    await act(async () => { expect(await result.current.handleSubmit(false, false)).toBe(false); });
    expect(mocks.saveProduct).toHaveBeenCalledTimes(1);
    await act(async () => { fail(new Error('Falha simulada')); expect(await first).toBe(false); });
    await act(async () => { expect(await result.current.handleSubmit(false, false)).toBe(true); });
    expect(mocks.saveProduct).toHaveBeenCalledTimes(2);
  });

  it('reclama no produto pai (aba Estoque e Precificação) e não abre a variação quando o produto tem apenas 1 variação', async () => {
    const { result, variations, setActiveTab } = renderSubmit({
      ...complete,
      variations: [{ ...complete.variations![0], unitPrice: 0, syncUnitPrice: false }],
    });
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(false); });
    expect(mocks.saveProduct).not.toHaveBeenCalled();
    expect(variations.setEditingVariationId).not.toHaveBeenCalled();
    expect(setActiveTab).toHaveBeenCalledWith('estoque');
  });
  it('bloqueia a conclusão e abre a variação específica quando há mais de uma variação', async () => {
    const var2 = {
      ...complete.variations![0],
      id: 'v2',
      sku: '001-02',
      unitPrice: 0,
      syncUnitPrice: false,
    };
    const { result, variations, setActiveTab } = renderSubmit({
      ...complete,
      variations: [complete.variations![0], var2],
    });
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(false); });
    expect(mocks.saveProduct).not.toHaveBeenCalled();
    expect(variations.setEditingVariationId).toHaveBeenCalledWith('v2');
    expect(setActiveTab).toHaveBeenCalledWith('variacoes');
  });
  it('permite cadastrar produto pai e variação sem características ou dimensões (requisito exclusivo de catálogo digital)', async () => {
    const { result } = renderSubmit({
      ...complete,
      height: 0,
      technicalValues: {},
      variations: [{
        ...complete.variations![0],
        height: 0,
        technicalValues: {},
      }],
    });
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(true); });
    expect(mocks.saveProduct).toHaveBeenCalled();
  });
  it('bloqueia uma variação sem preço próprio mesmo com outra variação válida', async () => {
    const invalid = { ...complete.variations![0], id: 'v2', sku: '001-02', unitPrice: 0, syncUnitPrice: false };
    const { result, variations } = renderSubmit({ ...complete, variations: [...complete.variations!, invalid] });
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(false); });
    expect(mocks.saveProduct).not.toHaveBeenCalled();
    expect(variations.setEditingVariationId).toHaveBeenCalledWith('v2');
  });
  it('conclui pai e variação somente após os requisitos passarem', async () => {
    const { result } = renderSubmit(complete);
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(true); });
    expect(mocks.saveProduct).toHaveBeenCalledWith(expect.objectContaining({ isDraft: false, status: 'hidden',
      variations: [expect.objectContaining({ status: 'hidden', active: true })] }));
  });
  it('passa a marcação de teste ao serviço somente quando o controle está ligado', async () => {
    const { result } = renderSubmit(complete, false, false, true);

    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(true); });

    expect(mocks.saveProduct).toHaveBeenCalledWith(expect.any(Object), false, {
      isTestArtifact: true,
    });
  });
  it('força o canal Catálogo Digital para oculto ao salvar produto marcado como teste', async () => {
    const testProduct: Product = {
      ...complete,
      isDraft: false,
      status: 'published',
      observations: `Fixture ${HML_FISCAL_TEST_ORDER_MARKER}`,
      title: 'Produto Teste Fiscal',
      ecommerceDescription: 'Item sintético para homologação',
      hasVariations: true,
      images: ['https://example.com/teste.jpg'],
      variations: [{ ...complete.variations![0], status: 'published' }],
    };
    const { result } = renderSubmit(testProduct, true);

    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(true); });

    expect(mocks.saveProduct).toHaveBeenCalledWith(expect.objectContaining({
      status: 'hidden',
      variations: [expect.objectContaining({ status: 'hidden' })],
    }));
  });
  it('persiste as dimensões técnicas da variação que validou durante a conclusão do pai', async () => {
    const { result } = renderSubmit({ ...complete, width: 0, height: 0, depth: 0,
      variations: [{ ...complete.variations![0], technicalValues: { Largura: '80', Altura: '180', Profundidade: '50' } }] });
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(true); });
    expect(mocks.saveProduct).toHaveBeenCalledWith(expect.objectContaining({
      variations: [expect.objectContaining({ width: 80, height: 180, depth: 50, status: 'hidden' })],
    }));
  });
  it('salvar rascunho preserva campos incompletos e o status individual das variações', async () => {
    const { result } = renderSubmit({ ...complete, height: 0, variations: [
      complete.variations![0], { ...complete.variations![0], id: 'v2', sku: '001-02', status: 'hidden' },
    ] });
    await act(async () => { expect(await result.current.handleSubmit(false, true)).toBe(true); });
    expect(mocks.saveProduct).toHaveBeenCalledWith(expect.objectContaining({ isDraft: true, status: 'draft',
      variations: [expect.objectContaining({ status: 'draft', active: false }), expect.objectContaining({ status: 'hidden', active: false })] }));
  });

  it('permite concluir produto de fabricação própria sem informar fornecedor', async () => {
    const ownProdProduct: Product = {
      ...complete,
      mainSupplierId: undefined,
      supplierId: undefined,
      merchandiseOrigin: 'own_production',
    };
    const { result } = renderSubmit(ownProdProduct);
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(true); });
    expect(mocks.saveProduct).toHaveBeenCalled();
  });

  it('bloqueia produto adquirido de terceiros quando fornecedor não for informado', async () => {
    const thirdPartyProduct: Product = {
      ...complete,
      mainSupplierId: undefined,
      supplierId: undefined,
      merchandiseOrigin: 'third_party',
    };
    const { result, setActiveTab } = renderSubmit(thirdPartyProduct);
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(false); });
    expect(setActiveTab).toHaveBeenCalledWith('estoque');
  });

  it('exige NCM válido no cadastro do perfil estoquista', async () => {
    const stockistProduct = { ...complete, fiscal: { ncm: '' } };
    const { result, setActiveTab } = renderSubmit(stockistProduct, false, true);

    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(false); });

    expect(mocks.saveProduct).not.toHaveBeenCalled();
    expect(setActiveTab).toHaveBeenCalledWith('fiscal');
  });

  it('permite fabricação própria sem fornecedor quando o NCM válido estiver informado', async () => {
    const stockistOwnProduction: Product = {
      ...complete,
      mainSupplierId: undefined,
      supplierId: undefined,
      merchandiseOrigin: 'own_production',
      fiscal: { ncm: '94036000' },
    };
    const { result } = renderSubmit(stockistOwnProduction, false, true);

    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(true); });

    expect(mocks.saveProduct).toHaveBeenCalled();
  });
});
