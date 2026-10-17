import { OrderDatabaseRow } from './orderMapperTypes';

export interface MappedItemsResult {
  items: any[];
  itemsSummary: {
    itemsSubtotal: number;
    totalQuantity: number;
    totalItemsCost: number;
    itemsTotalValue: number;
    totalFixedDiscount: number;
  };
}

export function mapOrderItemsAndSummary(
  row: OrderDatabaseRow,
  rawLegacy: any,
  totalAmount: number
): MappedItemsResult {
  // Itens: Prioridade absoluta para tabela normalizada order_items, depois row.items (coluna JSONB), e fallback para rawLegacy.items
  let items: any[] = [];
  if (Array.isArray(row.order_items) && row.order_items.length > 0) {
    items = row.order_items.map((item: any) => {
      const snapshot = item.item_snapshot || {};
      return {
        ...snapshot,
        id: item.id || snapshot.id,
        productId: item.product_id || snapshot.productId || '',
        variationId: item.variation_id || snapshot.variationId || undefined,
        code: item.code || snapshot.code || '',
        description: item.description || snapshot.description || '',
        quantity: item.quantity != null ? Number(item.quantity) : Number(snapshot.quantity || 1),
        unitPrice:
          item.unit_price != null ? Number(item.unit_price) : Number(snapshot.unitPrice || 0),
        unitDiscount:
          item.unit_discount != null
            ? Number(item.unit_discount)
            : Number(snapshot.unitDiscount || 0),
        discountType: item.discount_type || snapshot.discountType || 'fixed',
        costPrice:
          item.cost_price != null
            ? Number(item.cost_price)
            : snapshot.costPrice != null
              ? Number(snapshot.costPrice)
              : undefined,
        condition: item.condition || snapshot.condition || 'novo',
        handlingType: item.handling_type || snapshot.handlingType || '',
        observation: item.observation !== undefined ? item.observation : snapshot.observation,
        isTemporaryProduct:
          item.is_temporary_product != null
            ? Boolean(item.is_temporary_product)
            : Boolean(snapshot.isTemporaryProduct),
        returnedQuantity:
          item.returned_quantity != null
            ? Number(item.returned_quantity)
            : snapshot.returnedQuantity,
        returnedUnitPrice:
          item.returned_unit_price != null
            ? Number(item.returned_unit_price)
            : snapshot.returnedUnitPrice,
        returnedTotalValue:
          item.returned_total_value != null
            ? Number(item.returned_total_value)
            : snapshot.returnedTotalValue,
        originalUnitPrice:
          item.original_unit_price != null
            ? Number(item.original_unit_price)
            : snapshot.originalUnitPrice,
        originalTotalValue:
          item.original_total_value != null
            ? Number(item.original_total_value)
            : snapshot.originalTotalValue,
      };
    });
  } else if (Array.isArray(row.items) && row.items.length > 0) {
    items = row.items;
  } else if (Array.isArray(rawLegacy.items) && rawLegacy.items.length > 0) {
    items = rawLegacy.items;
  }

  // Itens Summary
  const itemsSummary = rawLegacy.itemsSummary || {
    itemsSubtotal: row.items_subtotal != null ? Number(row.items_subtotal) : totalAmount,
    totalQuantity: items.reduce((acc: number, item: any) => acc + (Number(item?.quantity) || 0), 0),
    totalItemsCost: row.total_cost != null ? Number(row.total_cost) : 0,
    itemsTotalValue: totalAmount,
    totalFixedDiscount: row.total_discount != null ? Number(row.total_discount) : 0,
  };

  return { items, itemsSummary };
}
