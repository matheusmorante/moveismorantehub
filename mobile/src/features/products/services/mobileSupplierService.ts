import { supabase } from '../../../services/supabaseClient';

export interface MobileProductSupplier {
  id: string;
  full_name: string | null;
  nickname: string | null;
  stock_origins: string[] | null;
}

export const fetchActiveMobileProductSuppliers = async (): Promise<MobileProductSupplier[]> => {
  const { data, error } = await supabase
    .from('people')
    .select('id, full_name, nickname, stock_origins')
    .in('person_type', ['supplier', 'suppliers'])
    .eq('active', true)
    .eq('deleted', false)
    .order('full_name');

  if (error) {
    console.warn('[mobileSupplierService] Erro ao buscar fornecedores ativos de produtos:', error);
    return [];
  }

  return (data || []) as MobileProductSupplier[];
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
