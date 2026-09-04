import { supabase } from '../../../services/supabaseClient';

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
    return (data || []).map(s => ({
      ...s,
      name: s.nickname || s.full_name || s.social_name || 'Fornecedor',
    }));
  } catch (err) {
    console.error('[mobileSupplierService] Exceção:', err);
    return [];
  }
};
