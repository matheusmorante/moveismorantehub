import { supabase } from '../../../services/supabaseClient';

export const fetchMobileSuppliers = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('persons')
      .select('id, name, full_name, type, is_supplier')
      .or('type.eq.supplier,is_supplier.eq.true')
      .order('name');
    if (error) {
      console.warn('[mobileSupplierService] Erro ao buscar fornecedores:', error);
      return [];
    }
    return (data || []).map(s => ({
      ...s,
      name: s.name || s.full_name || 'Fornecedor',
    }));
  } catch (err) {
    console.error('[mobileSupplierService] Exceção:', err);
    return [];
  }
};
