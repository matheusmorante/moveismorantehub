import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../../services/supabaseClient';
import {
  fetchMobileProductSuppliers,
  fetchMobileProductSuppliersWithStatus,
} from './mobileSupplierService';

vi.mock('../../../services/supabaseClient', () => ({ supabase: { from: vi.fn() } }));

describe('fetchMobileProductSuppliers', () => {
  const query = {
    select: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    query.select.mockReturnValue(query);
    query.or.mockReturnValue(query);
    query.order.mockReturnValue(query);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('usa filtros do ERP e preserva fornecedores inativos e linhas sem marca de exclusão', async () => {
    const supplier = {
      id: 'supplier-inactive-legacy',
      full_name: 'Fornecedor legado',
      social_name: 'Razão alternativa',
      nickname: 'Apelido',
      stock_origins: ['normal'],
      default_ipi_percent: 0,
      default_freight_cost: 0,
      default_freight_type: null,
      active: false,
      deleted: null,
      address: null,
      observation: '',
    };
    const testSupplier = {
      ...supplier,
      id: 'TEST_AUT_supplier',
      full_name: 'Fornecedor de teste',
      active: true,
    };
    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: [supplier, testSupplier], error: null });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await expect(fetchMobileProductSuppliers()).resolves.toEqual([
      { ...supplier, default_freight_type: 'none' },
    ]);
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining('social_name')
    );
    expect(query.or).toHaveBeenNthCalledWith(1, 'deleted.eq.false,deleted.is.null');
    expect(query.or).toHaveBeenNthCalledWith(
      2,
      'person_type.ilike.suppliers,person_type.ilike.supplier'
    );
    expect(query.order).toHaveBeenNthCalledWith(1, 'full_name', { ascending: true });
    expect(query.order).toHaveBeenNthCalledWith(2, 'id', { ascending: true });
  });

  it('omite artefatos marcados no endereço sem excluir a pessoa de teste autorizada pelo ERP', async () => {
    const artifact = {
      id: 'supplier-artifact',
      full_name: 'Fornecedor isolado',
      social_name: null,
      nickname: null,
      stock_origins: ['normal'],
      default_ipi_percent: null,
      default_freight_cost: null,
      default_freight_type: null,
      address: { testArtifact: { is_test: true } },
      observation: '',
    };
    const testOperator = {
      ...artifact,
      id: 'supplier-operator',
      full_name: 'Teste Alt NF-e HTML Operador',
      address: null,
    };
    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: [artifact, testOperator], error: null });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await expect(fetchMobileProductSuppliers()).resolves.toHaveLength(1);
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining('address'));
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining('observation'));
  });

  it('distingue uma resposta válida sem fornecedores de uma falha de carregamento', async () => {
    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await expect(fetchMobileProductSuppliersWithStatus()).resolves.toEqual({
      ok: true,
      suppliers: [],
    });

    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: null, error: new Error('offline') });
    vi.mocked(supabase.from).mockReturnValue(query as never);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(fetchMobileProductSuppliersWithStatus()).resolves.toEqual({
      ok: false,
      suppliers: [],
      errorMessage: 'Não foi possível carregar os fornecedores. Tente novamente.',
    });
  });

  it('encerra o estado de carregamento com erro após 10 segundos sem resposta', async () => {
    vi.useFakeTimers();
    query.order
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(new Promise(() => undefined) as never);
    vi.mocked(supabase.from).mockReturnValue(query as never);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const pending = fetchMobileProductSuppliersWithStatus();
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(pending).resolves.toEqual({
      ok: false,
      suppliers: [],
      errorMessage: 'Não foi possível carregar os fornecedores. Tente novamente.',
    });
  });
});
