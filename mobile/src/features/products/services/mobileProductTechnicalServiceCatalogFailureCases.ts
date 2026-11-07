import { expect, it, vi } from 'vitest';
import type { fetchMobileProductTechnicalFields } from './mobileProductTechnicalService';
import type { missingCategoryApplicationsQuery } from './mobileProductTechnicalService.testUtils';

type CatalogFailureCaseDependencies = {
  supabaseMock: any;
  fetchMobileProductTechnicalFields: typeof fetchMobileProductTechnicalFields;
  missingCategoryApplicationsQuery: typeof missingCategoryApplicationsQuery;
};

export function registerMobileProductTechnicalCatalogFailureCases({
  supabaseMock,
  fetchMobileProductTechnicalFields,
  missingCategoryApplicationsQuery,
}: CatalogFailureCaseDependencies): void {
  it('falha ao verificar requisitos do catálogo quando a consulta de vínculos de categoria falha', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    const categoryLinksQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'offline' } }),
      }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(fetchMobileProductTechnicalFields({ requireCategoryLinks: true })).rejects.toMatchObject({
      message: 'offline',
    });
  });

  it('propaga falha ao carregar o cadastro global de atributos usado nos requisitos', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'attributes offline' } }),
    };
    supabaseMock.from.mockReturnValue(attributesQuery);

    await expect(fetchMobileProductTechnicalFields({ requireCategoryLinks: true })).rejects.toMatchObject({
      message: 'attributes offline',
    });
    expect(supabaseMock.from).toHaveBeenCalledOnce();
    expect(supabaseMock.from).toHaveBeenCalledWith('attributes');
  });

  it('propaga falha ao carregar opções de atributos em vez de validar requisitos incompletos', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'attr-color', name: 'Cor', active: true, data_type: 'list', unit: null }],
        error: null,
      }),
    };
    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'attribute values offline' } }),
      }),
    };
    const categoryLinksQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(fetchMobileProductTechnicalFields({ requireCategoryLinks: true })).rejects.toMatchObject({
      message: 'attribute values offline',
    });
  });
}
