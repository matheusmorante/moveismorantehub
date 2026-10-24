import { supabase } from '../../../services/supabaseClient';
import { isTestPerson } from '../../../../../shared-utils/personTestVisibility';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export interface MobileProductSupplier {
  id: string;
  full_name: string | null;
  nickname: string | null;
  stock_origins: string[] | null;
  default_ipi_percent: number | null;
  default_freight_cost: number | null;
  default_freight_type: 'fixed' | 'percentage' | 'none';
  social_name: string | null;
}

export type MobileProductSuppliersResult =
  | { ok: true; suppliers: MobileProductSupplier[] }
  | { ok: false; suppliers: MobileProductSupplier[]; errorMessage: string };

const SUPPLIER_LOAD_ERROR = 'Não foi possível carregar os fornecedores. Tente novamente.';

export const fetchMobileProductSuppliersWithStatus = async (): Promise<MobileProductSuppliersResult> => {
  try {
    const query = supabase
      .from('people')
      .select(
        'id, full_name, social_name, nickname, address, observation, stock_origins, default_ipi_percent, default_freight_cost, default_freight_type'
      )
      .or('deleted.eq.false,deleted.is.null')
      .or('person_type.ilike.suppliers,person_type.ilike.supplier')
      .order('full_name', { ascending: true })
      .order('id', { ascending: true });
    const queryPromise = Promise.resolve(query);
    const response = await withTimeout<Awaited<typeof queryPromise> | null>(
      queryPromise,
      10_000,
      null,
      'mobile:produto-fornecedores'
    );

    if (!response) {
      return { ok: false, suppliers: [], errorMessage: SUPPLIER_LOAD_ERROR };
    }
    if (response.error) {
      console.warn('[mobileSupplierService] Erro ao buscar fornecedores de produtos:', response.error);
      return { ok: false, suppliers: [], errorMessage: SUPPLIER_LOAD_ERROR };
    }

    const suppliers = (response.data || [])
      .filter((supplier) => !isTestPerson({ ...supplier, fullName: supplier.full_name || '' }))
      .map((supplier) => ({
        ...supplier,
        default_freight_type: supplier.default_freight_type || 'none',
      })) as MobileProductSupplier[];

    return { ok: true, suppliers };
  } catch (error) {
    console.warn('[mobileSupplierService] Falha ao carregar fornecedores de produtos:', error);
    return { ok: false, suppliers: [], errorMessage: SUPPLIER_LOAD_ERROR };
  }
};

export const fetchMobileProductSuppliers = async (): Promise<MobileProductSupplier[]> => {
  const result = await fetchMobileProductSuppliersWithStatus();
  return result.suppliers;
};

export const fetchMobileSuppliers = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('people')
      .select('id, full_name, nickname, social_name, person_type')
      .or('person_type.ilike.suppliers,person_type.ilike.supplier')
      .order('full_name');
    if (error) {
      console.warn('[mobileSupplierService] Erro ao buscar fornecedores:', error);
      return [];
    }
    return (data || []).map((s) => ({
      ...s,
      name: s.nickname || s.full_name || s.social_name || 'Fornecedor',
    }));
  } catch (err) {
    console.error('[mobileSupplierService] Exceção:', err);
    return [];
  }
};
