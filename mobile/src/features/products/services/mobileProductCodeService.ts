import { supabase } from '../../../services/supabaseClient';

/** Fetches the next six-digit product code used by the ERP registration flow. */
export const getNextSequentialProductCode = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, code')
      .order('created_at', { ascending: false })
      .limit(500);

    let maxNum = 0;
    if (!error && Array.isArray(data)) {
      data.forEach((product) => {
        const match = String(product.code || '').trim().match(/^(\d+)/);
        const codeNumber = match?.[1] ? Number.parseInt(match[1], 10) : Number.NaN;
        if (Number.isFinite(codeNumber) && codeNumber > maxNum) maxNum = codeNumber;
      });
    }

    return String(maxNum + 1).padStart(6, '0');
  } catch (error) {
    console.error('[mobileProductCodeService] Erro ao obter próximo código sequencial:', error);
    return '000001';
  }
};
