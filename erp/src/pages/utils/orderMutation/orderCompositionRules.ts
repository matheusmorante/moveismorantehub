import type Order from '../../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Produto composto pode servir para seleção, mas não pode ser persistido como linha do pedido. */
export const assertOrderHasNoCompositionLines = async (order: Pick<Order, 'orderType' | 'items'>) => {
  if (order.orderType !== 'sale' && order.orderType !== 'budget') return;

  const productIds = Array.from(
    new Set(
      (order.items || [])
        .flatMap((item) => [item.productId, item.fiscalSnapshotProductId])
        .map((id) => String(id || '').trim())
        .filter((id) => UUID_PATTERN.test(id))
    )
  );
  if (!productIds.length) return;

  const lookup = await withTimeout(
    supabase
      .from('products')
      .select('id, name, item_type')
      .in('id', productIds)
      .then((result) => ({ result })),
    10_000,
    null,
    'pedido:validar-produto-composto'
  );
  if (!lookup || lookup.result.error) {
    throw new Error('Não foi possível validar os produtos do pedido. Atualize e tente novamente.');
  }

  const composition = (lookup.result.data || []).find((product) => product.item_type === 'composition');
  if (composition) {
    throw new Error(
      `"${composition.name || 'Produto composto'}" serve apenas para selecionar os componentes. Adicione os produtos que o compõem ao pedido.`
    );
  }
};
