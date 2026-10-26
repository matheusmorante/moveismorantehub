// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Product, Variation } from '@/pages/types/product.type';
import { useVariationForm } from './useVariationForm';

const mocks = vi.hoisted(() => ({ saveVariation: vi.fn() }));
vi.mock('@/pages/utils/productService', () => ({
  ...mocks,
  generateVariationSku: () => '001-01',
  parseVariationImages: (_: unknown, images: string[] | undefined) => images || [],
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), warn: vi.fn(), success: vi.fn() } }));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  ecommerceSupabase: {
    from: () => {
      const query: any = {
        select: () => query,
        eq: () => query,
        order: () => query,
        then: (resolve: (response: any) => any) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return query;
    },
  },
}));

const variation: Variation = {
  id: 'variation-1',
  name: 'Armário',
  title: 'Armário',
  sku: '001-01',
  stock: 0,
  unitPrice: 0,
  active: false,
  status: 'draft',
  attributes: [],
  syncWidth: false,
  syncHeight: false,
  syncDepth: false,
  syncWeight: false,
  syncDescription: false,
  syncUnitPrice: false,
  syncCostPrice: false,
};

const parent: Product = {
  id: 'parent',
  name: 'Armário',
  description: '',
  unitPrice: 0,
  unit: 'UN',
  itemType: 'product',
  active: false,
  isDraft: true,
  status: 'draft',
  variations: [variation],
};

afterEach(cleanup);

describe('edição explícita de variação', () => {
  it.each([
    ['unitPrice', NaN], ['unitPrice', -1], ['costPrice', -1], ['stock', -1],
  ] as const)('bloqueia %s inválido no resolver antes de salvar a variação', async (field, value) => {
    const complete: Variation = {
      ...variation,
      width: 80, height: 180, depth: 50, unitPrice: 120,
      attributes: [{ name: 'Cor', value: 'Azul' }],
      technicalValues: { Cor: 'Azul', Modelo: 'Padrão', Marca: 'Morante', 'Material da estrutura': 'Madeira' },
    };
    const completeParent: Product = {
      ...parent, unitPrice: 120, categoryIds: ['categoria'], mainSupplierId: 'fornecedor',
      variations: [complete, { ...complete, id: 'other', sku: 'other', attributes: [{ name: 'Cor', value: 'Verde' }] }],
    };
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useVariationForm({ isOpen: true, onClose, parentProduct: completeParent, variation: complete, onSave }));
    act(() => result.current.handleChange(field, value));
    await act(async () => { await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent); });
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.activeTab).toBe('estoque');
  });

  it('normaliza variação legada em rascunho para oculta', async () => {
    const { result } = renderHook(() =>
      useVariationForm({ isOpen: true, onClose: vi.fn(), parentProduct: parent, variation })
    );

    await act(async () => {});

    expect(result.current.formData?.status).toBe('hidden');
    expect(result.current.formData?.active).toBe(false);
  });

  it('não persiste alterações enquanto a pessoa edita ou fecha o modal', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useVariationForm({ isOpen: true, onClose, parentProduct: parent, variation, onSave })
    );

    await act(async () => {});
    act(() => result.current.handleChange('barcode', '789'));
    expect(onSave).not.toHaveBeenCalled();
    expect(mocks.saveVariation).not.toHaveBeenCalled();

    act(() => result.current.handleClose());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('não conclui uma variação independente incompleta', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const independentParent = { ...parent, variations: [variation, { ...variation, id: 'other', sku: 'SKU-2', attributes: [{ name: 'Cor', value: 'Verde' }] }] };
    const { result } = renderHook(() =>
      useVariationForm({ isOpen: true, onClose, parentProduct: independentParent, variation, onSave })
    );

    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.activeTab).toBe('identificacao');
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('persiste pelo callback somente depois da confirmação e fecha após sucesso', async () => {
    const complete: Variation = {
      ...variation,
      width: 80,
      height: 180,
      depth: 50,
      unitPrice: 120,
      technicalValues: {
        Cor: 'Azul',
        Modelo: 'Padrão',
        Marca: 'Morante',
        'Material da estrutura': 'Madeira',
      },
      syncFiscal: false,
      fiscal: { ncm: '94035000' },
    };
    const completeParent: Product = {
      ...parent,
      unitPrice: 120,
      categoryIds: ['categoria'],
      mainSupplierId: 'fornecedor',
      variations: [complete],
    };
    const onSave = vi.fn(async () => true);
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useVariationForm({
        isOpen: true,
        onClose,
        parentProduct: completeParent,
        variation: complete,
        onSave,
      })
    );

    await act(async () => {});
    expect(onSave).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent);
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'hidden', active: false })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(completeParent.status).toBe('draft');
  });

  it('mantém o modal aberto quando o salvamento explícito do pai falha', async () => {
    const complete: Variation = {
      ...variation,
      status: 'hidden',
      width: 80,
      height: 180,
      depth: 50,
      unitPrice: 120,
      technicalValues: {
        Cor: 'Azul',
        Modelo: 'Padrão',
        Marca: 'Morante',
        'Material da estrutura': 'Madeira',
      },
    };
    const completeParent: Product = {
      ...parent,
      unitPrice: 120,
      categoryIds: ['categoria'],
      mainSupplierId: 'fornecedor',
      variations: [complete],
    };
    const onSave = vi.fn(async () => false);
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useVariationForm({
        isOpen: true,
        onClose,
        parentProduct: completeParent,
        variation: complete,
        onSave,
      })
    );

    await act(async () => {});
    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('permite salvar os metadados da variação única sem concluir os campos herdados do pai em rascunho', async () => {
    const onSave = vi.fn().mockResolvedValue(true); const onClose = vi.fn();
    const { result } = renderHook(() => useVariationForm({ isOpen: true, onClose, parentProduct: parent, variation, onSave }));
    await act(async () => { await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent); });
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: 'hidden', active: false, width: 0, unitPrice: 0 }));
    expect(onClose).toHaveBeenCalledTimes(1); expect(parent.status).toBe('draft');
  });

  it.each(['callback', 'service'] as const)('bloqueia chamadas concorrentes e permite retomar após falha via %s', async (target) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const complete: Variation = { ...variation, width: 80, height: 180, depth: 50, unitPrice: 120, attributes: [{ name: 'Cor', value: 'Azul' }], technicalValues: { Cor: 'Azul', Marca: 'Morante', Modelo: 'Padrão', 'Material da estrutura': 'Madeira' } };
    const completeParent: Product = { ...parent, unitPrice: 120, categoryIds: ['categoria'], mainSupplierId: 'fornecedor', variations: [complete, { ...complete, id: 'other', sku: 'SKU-2', attributes: [{ name: 'Cor', value: 'Verde' }] }] };
    let fail!: (error: Error) => void;
    const callback = vi.fn().mockResolvedValue(true);
    const operation = target === 'callback' ? callback : mocks.saveVariation;
    operation.mockResolvedValue(true).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const onClose = vi.fn();
    const { result } = renderHook(() => useVariationForm({ isOpen: true, onClose, parentProduct: completeParent, variation: complete, onSave: target === 'callback' ? callback : undefined }));
    let first!: Promise<void>;
    await act(async () => { first = result.current.handleSubmit({ preventDefault() {} } as React.FormEvent); });
    await waitFor(() => expect(operation).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent); });
    expect(operation).toHaveBeenCalledTimes(1); expect(onClose).not.toHaveBeenCalled();
    await act(async () => { fail(new Error('Falha simulada')); await first; });
    expect(result.current.loading).toBe(false);
    await act(async () => { await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent); });
    expect(operation).toHaveBeenCalledTimes(2); expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sincroniza automaticamente a galeria completa do pai na variação simples', async () => {
    const singleVar: Variation = {
      ...variation,
      images: [],
    };
    const parentWithTwentyImages: Product = {
      ...parent,
      variations: [singleVar],
      images: Array.from({ length: 20 }, (_, i) => `https://img.test/photo-${i + 1}.jpg`),
    };
    const onSave = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useVariationForm({
        isOpen: true,
        onClose,
        parentProduct: parentWithTwentyImages,
        variation: singleVar,
        onSave,
      })
    );

    await waitFor(() => expect(result.current.formData?.images).toEqual(parentWithTwentyImages.images));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent);
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        images: parentWithTwentyImages.images,
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reabre rascunho em modo família com uma variação e preserva sua galeria própria limitada', async () => {
    const parentImages = ['https://img.test/pai.jpg'];
    const variationImages = Array.from(
      { length: 18 },
      (_, index) => `https://img.test/variacao-${index + 1}.jpg`
    );
    const familyVariation = { ...variation, images: variationImages };
    const familyDraft = {
      ...parent,
      hasVariations: true,
      images: parentImages,
      variations: [familyVariation],
    };

    const { result } = renderHook(() =>
      useVariationForm({
        isOpen: true,
        onClose: vi.fn(),
        parentProduct: familyDraft,
        variation: familyVariation,
        onSave: vi.fn(),
      })
    );

    await waitFor(() =>
      expect(result.current.formData?.images).toEqual(variationImages.slice(0, 15))
    );
    expect(result.current.formData?.images).not.toContain(parentImages[0]);
  });
});
