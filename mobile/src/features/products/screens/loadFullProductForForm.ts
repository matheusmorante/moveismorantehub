import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { fetchMobileProductsPage } from '../services/mobileProductFetchService';

type ProductFormLoadPurpose = 'edicao' | 'duplicacao';

export async function loadFullProductForForm(
  productId: string,
  showTestProducts: boolean,
  purpose: ProductFormLoadPurpose
) {
  const result = await withTimeout(
    fetchMobileProductsPage(1, 1, {
      productId,
      statusFilter: 'all',
      includeDeactivated: true,
      includeMerged: true,
      showTestProducts,
      throwOnError: true,
    }),
    10_000,
    null,
    `mobile:carregar-produto-completo-para-${purpose}`
  );
  const product = result?.data[0];
  if (!product) throw new Error('O cadastro completo do produto não foi encontrado.');
  return product;
}
