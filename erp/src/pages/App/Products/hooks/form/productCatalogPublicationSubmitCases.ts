import { act } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type Product from '@/pages/types/product.type';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { fetchTechnicalFieldDefinitions } from '../../services/technicalFieldService';

type SubmitResult = {
  result: {
    current: {
      handleSubmit: (showResult?: boolean, saveAsDraft?: boolean) => Promise<boolean>;
    };
  };
};

export function registerProductCatalogPublicationSubmitCases({
  complete,
  renderSubmit,
  saveProductMock,
  confirmCatalogHide,
}: {
  complete: Product;
  renderSubmit: (formData: Product, isRegisteredProduct?: boolean) => SubmitResult;
  saveProductMock: unknown;
  confirmCatalogHide: (isConfirmed: boolean) => void;
}) {
  it('exibe modal com motivo e campos faltantes ao salvar produto publicado sem descrição do catálogo', async () => {
    const publishedWithoutDesc: Product = {
      ...complete,
      isDraft: false,
      status: 'published',
      active: true,
      title: 'Armário publicado',
      images: ['https://example.com/foto1.jpg'],
      ecommerceDescription: '',
      description: '',
    };
    confirmCatalogHide(true);
    const { result } = renderSubmit(publishedWithoutDesc, true);

    await act(async () => {
      expect(await result.current.handleSubmit(false)).toBe(true);
    });

    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Ocultar produto do Catálogo Digital?',
      text: expect.stringContaining('Campo Descrição: a descrição do catálogo deve ser preenchida'),
    }));
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining('ajuste a conformidade do campo citado acima antes de salvar'),
    }));
    expect(saveProductMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'hidden',
    }));
  });
  it('mantém produto normal publicado sem salvar quando a leitura dos requisitos de categoria falha', async () => {
    const publishedProduct: Product = {
      ...complete,
      isDraft: false,
      status: 'published',
      active: true,
      title: 'Armário publicado',
    };
    vi.mocked(fetchTechnicalFieldDefinitions).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderSubmit(publishedProduct, true);

    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(false); });

    expect(fetchTechnicalFieldDefinitions).toHaveBeenCalledWith('product-form', {
      categoryIds: ['categoria'],
      forceRefresh: true,
      requireCategoryLinks: true,
    });
    expect(saveProductMock).not.toHaveBeenCalled();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      'Não foi possível verificar as características obrigatórias da categoria. O produto publicado não foi alterado.',
      { autoClose: 8000 }
    );
  });
  it('não salva produto publicado se o operador cancelar salvar e ocultar do Catálogo', async () => {
    const publishedProduct: Product = {
      ...complete,
      isDraft: false,
      status: 'published',
      active: true,
      title: 'Armário publicado',
      images: ['https://example.com/foto1.jpg'],
      ecommerceDescription: 'Armário de madeira.',
      technicalValues: { ...complete.technicalValues, 'Material da estrutura': '' },
    };
    vi.mocked(fetchTechnicalFieldDefinitions).mockResolvedValueOnce([
      { name: 'Material da estrutura', requiredCategoryIds: ['categoria'] },
    ]);
    confirmCatalogHide(false);
    const { result } = renderSubmit(publishedProduct, true);

    await act(async () => {
      expect(await result.current.handleSubmit(false)).toBe(false);
    });

    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Ocultar produto do Catálogo Digital?',
      confirmButtonText: 'Salvar e ocultar',
      cancelButtonText: 'Continuar editando',
      showCancelButton: true,
      text: expect.stringContaining('Material da estrutura'),
    }));
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining('ajuste a conformidade do campo citado acima antes de salvar'),
    }));
    expect(saveProductMock).not.toHaveBeenCalled();
  });
  it('salva pai e variações ocultos depois da confirmação do Catálogo', async () => {
    const publishedProduct: Product = {
      ...complete,
      isDraft: false,
      status: 'published',
      active: true,
      title: 'Armário publicado',
      ecommerceDescription: 'Armário de madeira.',
      technicalValues: { ...complete.technicalValues, 'Material da estrutura': '' },
    };
    vi.mocked(fetchTechnicalFieldDefinitions).mockResolvedValueOnce([
      { name: 'Material da estrutura', requiredCategoryIds: ['categoria'] },
    ]);
    confirmCatalogHide(true);
    const { result } = renderSubmit(publishedProduct, true);

    await act(async () => {
      expect(await result.current.handleSubmit(false)).toBe(true);
    });

    expect(saveProductMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'hidden',
      variations: [expect.objectContaining({ status: 'hidden' })],
    }));
  });
}
