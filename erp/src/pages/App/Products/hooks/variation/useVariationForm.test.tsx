// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
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

  it('não conclui uma variação incompleta', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useVariationForm({ isOpen: true, onClose, parentProduct: parent, variation, onSave })
    );

    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.activeTab).toBe('tecnico');
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
});
