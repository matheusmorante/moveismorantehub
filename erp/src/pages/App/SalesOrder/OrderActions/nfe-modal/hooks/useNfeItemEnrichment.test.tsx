// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNfeItemEnrichment } from './useNfeItemEnrichment';

const mocks = vi.hoisted(() => ({
  prepareHmlItemCsosns: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
  getCatalogEntry: vi.fn(),
  inferProductNcm: vi.fn(),
}));

vi.mock('@/pages/utils/nfe/csosnConfigurationService', () => ({
  prepareHmlItemCsosns: mocks.prepareHmlItemCsosns,
}));
vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({ companyUF: 'PR', companyCRT: '1', fiscalDefaults: { cst: '103' } }),
}));
vi.mock('react-toastify', () => ({
  toast: { error: mocks.toastError, info: mocks.toastInfo },
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { auth: { getSession: mocks.getSession }, from: mocks.from },
}));
vi.mock('@/services/fiscal/ncmService', () => ({
  ncmService: {
    getCatalogEntry: mocks.getCatalogEntry,
    inferProductNcm: mocks.inferProductNcm,
  },
}));
vi.mock('../../../../../../../../src/telemetry/nfeEmissionPerformance', () => ({
  withNfeEmissionStage: (_stage: string, operation: () => unknown) => operation(),
}));

describe('preparação fiscal dos itens da emissão', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    mocks.from.mockImplementation(() => {
      const query: any = {
        select: () => query,
        eq: () => query,
        in: () => query,
        order: async () => ({ data: [] }),
        then: (resolve: any) => Promise.resolve({ data: [] }).then(resolve),
      };
      return query;
    });
    mocks.getCatalogEntry.mockImplementation(async (code: string) => ({
      code,
      official_description:
        code === '94035000'
          ? 'Móveis de madeira, do tipo utilizado em quartos de dormir'
          : 'Outros móveis de madeira',
      active: true,
      is_active: true,
      start_date: null,
      end_date: null,
    }));
    mocks.inferProductNcm.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it('usa o CSOSN do snapshot e não consulta preparação HML quando ele já existe', async () => {
    const order = {
      id: 'order-with-fiscal-snapshot',
      shipping: { deliveryMethod: 'pickup' },
      items: [
        {
          productId: 'product-1',
          description: 'Produto do pedido',
          quantity: 1,
          fiscalSnapshotVersion: 1,
          fiscal: {
            ncm: '94036000',
            cest: '',
            cfop: '5102',
            cst: '102',
            origem: '0',
            commercialUnit: 'UN',
            taxableUnit: 'UN',
          },
        },
      ],
    } as any;
    const manualFiscalFields = { current: new Map() };

    const { result } = renderHook(() =>
      useNfeItemEnrichment({
        order,
        environment: 2,
        model: '55',
        manualFiscalFields,
      })
    );

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));

    expect(mocks.prepareHmlItemCsosns).not.toHaveBeenCalled();
    expect(result.current.fiscalPreparationError).toBeNull();
    expect(result.current.nfeItems[0].fiscal.cst).toBe('102');
  });

  it('não aplica o padrão CSOSN de modelo 55 a um item NFC-e sem CSOSN salvo', async () => {
    const order = {
      id: 'order-without-nfce-csosn',
      shipping: { deliveryMethod: 'pickup' },
      items: [
        {
          productId: 'product-2',
          description: 'Produto NFC-e',
          quantity: 1,
          fiscalSnapshotVersion: 1,
          fiscal: {
            ncm: '94036000',
            cest: '',
            cfop: '5102',
            origem: '0',
            commercialUnit: 'UN',
            taxableUnit: 'UN',
          },
        },
      ],
    } as any;
    const manualFiscalFields = { current: new Map() };

    const { result } = renderHook(() =>
      useNfeItemEnrichment({
        order,
        environment: 2,
        model: '65',
        manualFiscalFields,
      })
    );

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));

    expect(mocks.prepareHmlItemCsosns).not.toHaveBeenCalled();
    expect(result.current.nfeItems[0].fiscal.cst).toBe('');
  });

  it('preenche o NCM de guarda-roupa no emissor se ainda não houver classificação', async () => {
    mocks.inferProductNcm.mockResolvedValue({
      code: '94035000',
      description: 'Móveis de madeira, do tipo utilizado em quartos de dormir',
      source: 'semantic_rule',
    });
    const order = {
      id: 'order-missing-ncm',
      shipping: { deliveryMethod: 'pickup' },
      items: [
        {
          productId: 'wardrobe-1',
          description: 'Geroupa Sidney 6 Portas',
          quantity: 1,
          fiscalSnapshotVersion: 1,
          fiscal: { ncm: '', cfop: '5102', cst: '102', origem: '0', commercialUnit: 'UN', taxableUnit: 'UN' },
        },
      ],
    } as any;
    const manualFiscalFields = { current: new Map() };

    const { result } = renderHook(() =>
      useNfeItemEnrichment({
        order,
        environment: 2,
        model: '55',
        manualFiscalFields,
      })
    );

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));

    expect(mocks.getCatalogEntry).toHaveBeenCalledWith('94035000');
    expect(result.current.nfeItems[0].fiscal.ncm).toBe('94035000');
    expect(result.current.nfeItems[0].fiscal.ncmDescription).toBe(
      'Móveis de madeira, do tipo utilizado em quartos de dormir'
    );
    expect(mocks.inferProductNcm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Geroupa Sidney 6 Portas' })
    );
  });

  it('usa categoria e material do produto na inferência central para outras categorias', async () => {
    mocks.inferProductNcm.mockResolvedValue({
      code: '94036000',
      description: 'Outros móveis de madeira',
      source: 'catalog_search',
    });
    mocks.from.mockImplementation((table: string) => {
      const query: any = {
        select: () => query,
        eq: () => query,
        in: async () => ({
          data:
            table === 'products'
              ? [{
                  id: 'product-3',
                  name: 'Mesa lateral modelo Luar',
                  title: 'Mesa lateral modelo Luar',
                  description: 'Mesa lateral para sala',
                  category: 'Móveis de sala',
                  material: 'Madeira maciça',
                  fiscal: { ncm: '' },
                }]
              : [],
        }),
        order: async () => ({ data: [] }),
      };
      return query;
    });
    const order = {
      id: 'order-generic-missing-ncm',
      shipping: { deliveryMethod: 'pickup' },
      items: [
        {
          productId: 'product-3',
          description: 'Mesa lateral modelo Luar',
          quantity: 1,
          fiscalSnapshotVersion: 1,
          fiscal: {
            ncm: '',
            material: 'Madeira maciça',
            cfop: '5102',
            cst: '102',
            origem: '0',
            commercialUnit: 'UN',
            taxableUnit: 'UN',
          },
        },
      ],
    } as any;
    const manualFiscalFields = { current: new Map() };

    const { result } = renderHook(() =>
      useNfeItemEnrichment({
        order,
        environment: 2,
        model: '55',
        manualFiscalFields,
      })
    );

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));

    expect(mocks.inferProductNcm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Mesa lateral modelo Luar',
        category: 'Móveis de sala',
        material: 'Madeira maciça',
      })
    );
    expect(result.current.nfeItems[0].fiscal.ncm).toBe('94036000');
  });

  it('usa a API como fallback se a inferência local não encontra código', async () => {
    const classify = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ncm: { code: '94036000', description: 'Outros móveis de madeira' } }),
    });
    vi.stubGlobal('fetch', classify);
    mocks.from.mockImplementation((table: string) => {
      const query: any = {
        select: () => query,
        eq: () => query,
        in: async () => ({
          data:
            table === 'products'
              ? [{
                  id: 'product-4',
                  name: 'Mesa lateral modelo Luar',
                  title: 'Mesa lateral modelo Luar',
                  description: 'Mesa lateral para sala',
                  category: 'Móveis de sala',
                  category_id: 'category-4',
                  material: 'Madeira maciça',
                  fiscal: { ncm: '' },
                }]
              : [],
        }),
        order: async () => ({ data: [] }),
      };
      return query;
    });
    const order = {
      id: 'order-classify-fallback',
      shipping: { deliveryMethod: 'pickup' },
      items: [
        {
          productId: 'product-4',
          description: 'Mesa lateral modelo Luar',
          quantity: 1,
          fiscalSnapshotVersion: 1,
          fiscal: { ncm: '', cfop: '5102', cst: '102', origem: '0', commercialUnit: 'UN', taxableUnit: 'UN' },
        },
      ],
    } as any;
    const manualFiscalFields = { current: new Map() };

    const { result } = renderHook(() =>
      useNfeItemEnrichment({ order, environment: 2, model: '55', manualFiscalFields })
    );

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));

    const requestBody = JSON.parse(classify.mock.calls[0][1].body as string);
    expect(requestBody).toEqual({
      source: 'invoice',
      title: 'Mesa lateral modelo Luar',
      ncm: '',
    });
    expect(mocks.getCatalogEntry).toHaveBeenCalledWith('94036000');
    expect(result.current.nfeItems[0].fiscal.ncm).toBe('94036000');
  });

  it('busca a descrição do produto cadastrado no banco para inferir o NCM quando a linha do pedido usa apenas código/referência', async () => {
    mocks.inferProductNcm.mockImplementation(async (facts: any) => {
      if (facts.description?.includes('Guarda-roupa')) {
        return {
          code: '94035000',
          description: 'Móveis de madeira, do tipo utilizado em quartos de dormir',
          source: 'semantic_rule',
        };
      }
      return null;
    });

    mocks.from.mockImplementation((table: string) => {
      const query: any = {
        select: () => query,
        eq: () => query,
        in: async (_field: string, values: string[]) => ({
          data:
            table === 'products' && values.includes('cadastrado-101')
              ? [
                  {
                    id: 'cadastrado-101',
                    name: 'REF-8841',
                    title: 'REF-8841',
                    description: 'Guarda-roupa casal 6 portas madeira maciça',
                    category: 'Quarto',
                    category_id: 'cat-quarto',
                    material: 'Madeira maciça',
                    fiscal: { ncm: '' },
                  },
                ]
              : [],
        }),
        order: async () => ({ data: [] }),
        then: (resolve: any) => Promise.resolve({ data: [] }).then(resolve),
      };
      return query;
    });

    const order = {
      id: 'order-registered-product',
      shipping: { deliveryMethod: 'pickup' },
      items: [
        {
          productId: 'cadastrado-101',
          description: 'REF-8841',
          quantity: 1,
          fiscalSnapshotVersion: 1,
          fiscal: { ncm: '', cfop: '5102', cst: '102', origem: '0', commercialUnit: 'UN', taxableUnit: 'UN' },
        },
      ],
    } as any;
    const manualFiscalFields = { current: new Map() };

    const { result } = renderHook(() =>
      useNfeItemEnrichment({
        order,
        environment: 2,
        model: '55',
        manualFiscalFields,
      })
    );

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));

    expect(mocks.inferProductNcm).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Guarda-roupa casal 6 portas madeira maciça',
        category: 'Quarto',
        material: 'Madeira maciça',
      })
    );
    expect(result.current.nfeItems[0].fiscal.ncm).toBe('94035000');
    expect(result.current.nfeItems[0].fiscal.ncmDescription).toBe(
      'Móveis de madeira, do tipo utilizado em quartos de dormir'
    );
  });

  it('utiliza estritamente o nome do item no pedido quando o produto não é cadastrado', async () => {
    mocks.inferProductNcm.mockImplementation(async (facts: any) => {
      if (facts.title?.includes('Guarda-roupa') || facts.description?.includes('Guarda-roupa')) {
        return {
          code: '94035000',
          description: 'Móveis de madeira, do tipo utilizado em quartos de dormir',
          source: 'semantic_rule',
        };
      }
      return null;
    });

    const selectSpy = vi.fn();
    mocks.from.mockImplementation(() => {
      const query: any = {
        select: selectSpy.mockReturnValue(query),
        eq: () => query,
        in: async () => ({ data: [] }),
        order: async () => ({ data: [] }),
        then: (resolve: any) => Promise.resolve({ data: [] }).then(resolve),
      };
      return query;
    });

    const order = {
      id: 'order-unregistered-item',
      shipping: { deliveryMethod: 'pickup' },
      items: [
        {
          productId: '',
          isTemporaryProduct: true,
          description: 'Guarda-roupa avulso sob medida',
          quantity: 1,
          fiscalSnapshotVersion: 1,
          fiscal: { ncm: '', cfop: '5102', cst: '102', origem: '0', commercialUnit: 'UN', taxableUnit: 'UN' },
        },
      ],
    } as any;
    const manualFiscalFields = { current: new Map() };

    const { result } = renderHook(() =>
      useNfeItemEnrichment({
        order,
        environment: 2,
        model: '55',
        manualFiscalFields,
      })
    );

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));

    expect(selectSpy).not.toHaveBeenCalled();
    expect(mocks.inferProductNcm).toHaveBeenCalledWith({
      title: 'Guarda-roupa avulso sob medida',
      name: 'Guarda-roupa avulso sob medida',
      description: 'Guarda-roupa avulso sob medida',
      material: undefined,
    });
    expect(result.current.nfeItems[0].fiscal.ncm).toBe('94035000');
    expect(result.current.nfeItems[0].fiscal.ncmDescription).toBe(
      'Móveis de madeira, do tipo utilizado em quartos de dormir'
    );
  });

  it('não classifica automaticamente itens com XML autorizado anterior', async () => {
    const order = {
      id: 'order-authorized-no-ncm',
      nfeData: { xml: '<NFe/>', status: 'autorizada' },
      shipping: { deliveryMethod: 'pickup' },
      items: [
        {
          productId: 'wardrobe-2',
          description: 'Guarda Roupa Sidney',
          quantity: 1,
          fiscalSnapshotVersion: 1,
          fiscal: { ncm: '', cfop: '5102', cst: '102', origem: '0', commercialUnit: 'UN', taxableUnit: 'UN' },
        },
      ],
    } as any;
    const manualFiscalFields = { current: new Map() };

    const { result } = renderHook(() =>
      useNfeItemEnrichment({
        order,
        environment: 2,
        model: '55',
        manualFiscalFields,
      })
    );

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));

    expect(mocks.getCatalogEntry).not.toHaveBeenCalled();
    expect(result.current.nfeItems[0].fiscal.ncm).toBe('');
  });
});
