import { supabase } from '../../../services/supabaseClient';
import { getNextSequentialProductCodeFromValues } from '../../../../../shared-utils/productSequentialCode';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

/** Fetches the next six-digit product code used by the ERP registration flow. */
export const getNextSequentialProductCode = async (): Promise<string> => {
  try {
    const productsResult = await withTimeout(
      supabase
        .from('products')
        .select('code')
        .order('code', { ascending: false })
        .limit(50),
      10_000,
      null,
      'mobile:codigo-produto-produtos'
    );
    const variationsResult = await withTimeout(
      supabase
        .from('product_variations')
        .select('sku')
        .order('sku', { ascending: false })
        .limit(50),
      10_000,
      null,
      'mobile:codigo-produto-variacoes'
    );

    const codes = [
      ...(Array.isArray(productsResult?.data)
        ? productsResult.data.map((product: { code?: unknown; sku?: unknown }) => product.code || product.sku)
        : []),
      ...(Array.isArray(variationsResult?.data)
        ? variationsResult.data.map((variation: { sku?: unknown }) => variation.sku)
        : []),
    ];

    return getNextSequentialProductCodeFromValues(codes);
  } catch (error) {
    console.error('[mobileProductCodeService] Erro ao obter próximo código sequencial:', error);
    return '000001';
  }
};
