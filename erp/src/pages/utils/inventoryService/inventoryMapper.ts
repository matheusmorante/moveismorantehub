import InventoryMove from '../../types/inventoryMove.type';
import { isEntryType, isExitType, isAdjustmentType } from './inventoryTypeRules';

export const mapInventoryMoveToDB = (move: InventoryMove) => {
    // Validação estrita dos tipos aceitos pela constraint do banco: 'entry' | 'exit' | 'adjustment'
    const dbType = isExitType(move.type) ? 'exit' : isAdjustmentType(move.type) ? 'adjustment' : 'entry';
    const resolvedStatus = move.status === 'reversed' || move.status === 'cancelled' ? 'reversed' : 'effective';

    let observationPayload: string | null = null;
    if (move.observation && (move.observation.startsWith('{') || move.observation.startsWith('['))) {
        try {
            const parsed = JSON.parse(move.observation);
            observationPayload = JSON.stringify({
                ...parsed,
                status: resolvedStatus,
                reversalReason: move.reversalReason || parsed.reversalReason || null,
                reversedAt: move.reversedAt || parsed.reversedAt || null
            });
        } catch {
            observationPayload = move.observation;
        }
    } else if (move.observation || resolvedStatus === 'reversed' || move.reversalReason) {
        observationPayload = JSON.stringify({
            note: move.observation || '',
            status: resolvedStatus,
            reversalReason: move.reversalReason || null,
            reversedAt: move.reversedAt || null
        });
    }

    return {
        product_id: move.productId,
        variation_id: move.variationId || null,
        product_description: move.productDescription,
        type: dbType,
        quantity: move.quantity,
        date: move.date,
        label: move.label || null,
        unit_cost: move.unitCost ?? null,
        unit_price: move.unitPrice || 0,
        observation: observationPayload,
        order_id: move.relatedEntityId || null,
        source_receipt_id: move.sourceReceiptId || null,
        source_item_index: move.sourceItemIndex ?? null,
        reason: move.reversalReason || move.label || null
    };
};

export const mapInventoryMoveFromDB = (data: any): InventoryMove => {
    // Normalizar tipos retornados do banco para compatibilidade da UI
    const normalizedType = isExitType(data.type) ? 'withdrawal' : isAdjustmentType(data.type) ? 'balance' : 'entry';

    let meta: any = {};
    let cleanObservation = data.observation;
    if (data.observation && (data.observation.startsWith('{') || data.observation.startsWith('['))) {
        try {
            meta = JSON.parse(data.observation);
            cleanObservation = meta.note || meta.observation || data.observation;
        } catch { }
    }

    const isReversed = 
        data.status === 'reversed' || 
        data.status === 'cancelled' ||
        meta.status === 'reversed' ||
        meta.status === 'cancelled' ||
        (typeof data.reason === 'string' && (
            data.reason.startsWith('Cancelamento da venda') ||
            data.reason.startsWith('Estorno de devolução') ||
            data.reason.startsWith('Estorno')
        ));

    const normalizedStatus = isReversed ? 'reversed' : 'effective';
    const reversalReason = data.reversal_reason || meta.reversalReason || (isReversed ? data.reason : undefined);
    const reversedAt = data.reversed_at || meta.reversedAt;

    return {
        id: String(data.id),
        productId: data.product_id,
        variationId: data.variation_id,
        productDescription: data.product_description,
        type: normalizedType,
        quantity: Number(data.quantity),
        date: data.date,
        label: data.label,
        unitCost: data.unit_cost === null || data.unit_cost === undefined ? undefined : Number(data.unit_cost),
        unitPrice: data.unit_price ? Number(data.unit_price) : undefined,
        observation: cleanObservation,
        relatedEntityId: data.order_id,
        sourceReceiptId: data.source_receipt_id || undefined,
        sourceItemIndex: data.source_item_index === null || data.source_item_index === undefined ? undefined : Number(data.source_item_index),
        relatedEntityType: (data.order_id && (
            /^(Entrada (a partir )?do Pedido|Entrada NF-)/i.test(data.label || '') ||
            /Pedido de Compra\s*#/i.test(data.observation || '')
        ))
            ? 'purchase_order'
            : (data.order_id && isExitType(data.type) && (/^Saída - Pedido/i.test(data.label || '') || /^Pedido #/i.test(data.label || '')))
                ? 'sales_order'
                : undefined,
        status: normalizedStatus,
        reversalReason: reversalReason,
        reversedAt: reversedAt,
        createdAt: data.created_at
    };
};
