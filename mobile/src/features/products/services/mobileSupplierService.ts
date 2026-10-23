import { supabase } from '../../../services/supabaseClient';

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

export const fetchActiveMobileProductSuppliers = async (): Promise<MobileProductSupplier[]> => {
  const { data, error } = await supabase
    .from('people')
    .select(
      'id, full_name, social_name, nickname, stock_origins, default_ipi_percent, default_freight_cost, default_freight_type'
    )
    .in('person_type', ['supplier', 'suppliers'])
    .eq('active', true)
    .eq('deleted', false)
    .order('full_name');

  if (error) {
    console.warn('[mobileSupplierService] Erro ao buscar fornecedores ativos de produtos:', error);
    return [];
  }

  return (data || []).map((supplier) => ({
    ...supplier,
    default_freight_type: supplier.default_freight_type || 'none',
  })) as MobileProductSupplier[];
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
