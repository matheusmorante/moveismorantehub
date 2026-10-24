import InventoryMove from '../../types/inventoryMove.type';
import { isExitType, isAdjustmentType } from './inventoryTypeRules';
import { toInventoryMoveDatabaseRow } from '../../../../../shared-utils/inventoryMoveToDb';

export const mapInventoryMoveToDB = (move: InventoryMove) => {
  return toInventoryMoveDatabaseRow(move);
};

export const mapInventoryMoveFromDB = (data: any): InventoryMove => {
  // Normalizar tipos retornados do banco para compatibilidade da UI
  const normalizedType = isExitType(data.type)
    ? 'withdrawal'
    : isAdjustmentType(data.type)
      ? 'balance'
      : 'entry';

  let meta: any = {};
  let cleanObservation = data.observation;
  if (data.observation && (data.observation.startsWith('{') || data.observation.startsWith('['))) {
    try {
      meta = JSON.parse(data.observation);
      cleanObservation = meta.note || meta.observation || data.observation;
    } catch {
      /* no-op: intencionalmente silencioso */
    }
  }

  const hasExplicitStatus = ['effective', 'active', 'reversed', 'cancelled'].includes(data.status)
    || ['effective', 'active', 'reversed', 'cancelled'].includes(meta.status);
  const isReversed =
    data.status === 'reversed' ||
    data.status === 'cancelled' ||
    meta.status === 'reversed' ||
    meta.status === 'cancelled' ||
    (!hasExplicitStatus && typeof data.reason === 'string' &&
      (data.reason.startsWith('Cancelamento da venda') ||
        data.reason.startsWith('Estorno de devolução') ||
        data.reason.startsWith('Estorno')));

  const normalizedStatus = isReversed ? 'reversed' : 'effective';
  const reversalReason =
    data.reversal_reason || meta.reversalReason || (isReversed ? data.reason : undefined);
  const reversedAt = data.reversed_at || meta.reversedAt;
  const variationRecord = Array.isArray(data.product_variations)
    ? data.product_variations[0]
    : data.product_variations;
  const variationName = variationRecord?.name || data.variation_name;

  return {
    id: String(data.id),
    productId: data.product_id,
    variationId: data.variation_id,
    // O pai é apenas agrupador. A descrição operacional da movimentação
    // deve ser a variação, quando disponível.
    productName: variationName || undefined,
    productDescription: variationName || data.product_description,
    type: normalizedType,
    quantity: Number(data.quantity),
    date: data.date,
    label: data.label,
    unitCost:
      data.unit_cost === null || data.unit_cost === undefined ? undefined : Number(data.unit_cost),
    unitPrice: data.unit_price == null ? undefined : Number(data.unit_price),
    observation: cleanObservation,
    relatedEntityId: data.order_id,
    sourceReceiptId: data.source_receipt_id || undefined,
    sourceItemIndex:
      data.source_item_index === null || data.source_item_index === undefined
        ? undefined
        : Number(data.source_item_index),
    relatedEntityType:
      data.order_id &&
      (/^(Entrada (a partir )?do Pedido|Entrada NF-)/i.test(data.label || '') ||
        /Pedido de Compra\s*#/i.test(data.observation || ''))
        ? 'purchase_order'
        : data.order_id &&
            isExitType(data.type) &&
            (/^Saída - Pedido/i.test(data.label || '') || /^Pedido #/i.test(data.label || ''))
          ? 'sales_order'
          : undefined,
    status: normalizedStatus,
    reversalReason: reversalReason,
    reversedAt: reversedAt,
    createdAt: data.created_at,
  };
};
