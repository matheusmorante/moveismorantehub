import Order from "../../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { formatOrderCode } from '../orderCode';
import {
    canMaintainSaleStock,
    getChangedSaleItems,
    isTemporarySaleItemReconciliation,
    reverseSaleItemMoves,
    syncLinkedReturnProductReferences
} from '../saleItemInventorySync';
import { isPartialSaleStockMovement, isStockEligibleSaleItem } from '../saleInventoryRules';
import { isEffectiveInventoryMove } from '../movingAverageCostRules';
import { handleStockAndBusinessRules } from '../orderStockOperations';

const TABLE_NAME = "orders";

/**
 * Reconcilia os itens de venda com as movimentações reais no estoque ao atualizar o pedido.
 */
export const reconcileSaleItemsStock = async (
    orderId: string,
    previousOrderData: any,
    merged: Order
): Promise<void> => {
    if (merged.orderType !== 'sale' || !canMaintainSaleStock(merged) || merged.status === 'cancelled') {
        return;
    }

    const orderCode = formatOrderCode(merged);
    const detectedItemChanges = previousOrderData ? getChangedSaleItems(previousOrderData, merged) : [];

    // 1. Reconciliação de produtos temporários que ganharam cadastro formal
    const reconciledItems = detectedItemChanges
        .filter(({ previous, current }) => isTemporarySaleItemReconciliation(previous, current))
        .map(({ current }) => current!)
        .filter(item => isStockEligibleSaleItem(item));

    if (reconciledItems.length > 0) {
        await handleStockAndBusinessRules(orderId, {
            ...merged,
            items: reconciledItems,
            stockProcessed: false,
            inventoryMovementNote: 'Produto cadastrado durante a conciliação do pedido.',
        }, true, true);
        await syncLinkedReturnProductReferences(orderId, previousOrderData, merged);
    }

    // 2. Itens modificados ou substituídos
    const changedItems = detectedItemChanges.filter(({ previous, current }) => !isTemporarySaleItemReconciliation(previous, current));
    if (previousOrderData?.stockProcessed && changedItems.length > 0) {
        for (const change of changedItems) {
            if (change.previous) {
                await reverseSaleItemMoves(orderId, change.previous, `Item alterado no pedido de venda #${orderCode}.`);
            }
            if (change.current && isStockEligibleSaleItem(change.current)) {
                await handleStockAndBusinessRules(orderId, {
                    ...merged,
                    items: [change.current],
                    stockProcessed: false,
                    inventoryMovementNote: `Item alterado no pedido de venda #${orderCode}.`,
                } as any, true);
            }
        }
    }

    // 3. Verificação de saídas efetivas no banco de dados
    const { data: dbMoves } = await supabase
        .from('inventory_moves')
        .select('product_id, observation, reason, type')
        .eq('order_id', orderId)
        .in('type', ['exit', 'withdrawal']);

    const effectiveMovedSet = new Set<string>();
    (dbMoves || []).forEach((move: any) => {
        if (isEffectiveInventoryMove(move) && move.product_id) {
            effectiveMovedSet.add(String(move.product_id));
        }
    });

    // 4. Lançamento de baixas pendentes
    const eligibleItems = (merged.items || []).filter(isStockEligibleSaleItem);
    const missingExitItems = eligibleItems.filter((item: any) => !effectiveMovedSet.has(String(item.productId)));

    if (missingExitItems.length > 0) {
        await handleStockAndBusinessRules(orderId, {
            ...merged,
            items: missingExitItems,
            stockProcessed: false,
            inventoryMovementNote: 'Baixa de estoque gerada ao salvar a edição do pedido.',
        }, true, true);

        missingExitItems.forEach((item: any) => {
            effectiveMovedSet.add(String(item.productId));
        });
    }

    const hasAnyMovement = effectiveMovedSet.size > 0;
    const isPartial = isPartialSaleStockMovement(merged, effectiveMovedSet);

    merged.stockProcessed = hasAnyMovement;
    merged.movedProductIds = Array.from(effectiveMovedSet);
    merged.isPartialStockProcessed = isPartial;

    await supabase.from(TABLE_NAME).update({
        order_data: merged,
        updated_at: new Date().toISOString(),
    }).eq('id', orderId);
};
