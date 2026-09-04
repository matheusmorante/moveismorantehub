import { binaryOrderBadgeClass } from "./orderBadgeStyles";
import Order from "../../../types/order.type";
import Item from "../../../types/items.type";

export interface InventoryBadgeContentOptions {
    isReturn: boolean;
    hasMovement: boolean;
    isReversed?: boolean;
    isPartialMovement: boolean;
}

export interface InventoryBadgeContentResult {
    title: string;
    explanation: string;
    statusLabel: string;
    statusTextColor: string;
    badgeColorClass: string;
}

export type ItemMovementStatus = 'effective' | 'reversed' | 'not_effective' | 'unregistered';

export interface ItemMovementDisplay {
    description: string;
    quantity: number;
    status: ItemMovementStatus;
    statusLabel: string;
    statusBadgeClass: string;
    tooltip?: string;
}

export const getInventoryBadgeContent = ({
    isReturn,
    hasMovement,
    isReversed,
    isPartialMovement,
}: InventoryBadgeContentOptions): InventoryBadgeContentResult => {
    const title = isReversed
        ? (isReturn ? 'Entrada de estoque estornada' : 'Saída de estoque estornada')
        : isPartialMovement && hasMovement
        ? (isReturn ? 'Entrada parcial de estoque registrada' : 'Saída parcial de estoque (apenas alguns itens geraram saída)')
        : isReturn
        ? (hasMovement ? 'Entrada de estoque registrada pela devolução' : 'Entrada de estoque ainda não registrada')
        : (hasMovement ? 'Saída de estoque registrada pela venda' : 'Saída de estoque ainda não registrada');

    const explanation = isReversed
        ? (isReturn
            ? 'A entrada de estoque vinculada a esta devolução foi estornada / cancelada.'
            : 'A saída de estoque vinculada a esta venda foi estornada (ex: cancelamento do pedido).')
        : isPartialMovement && hasMovement
        ? (isReturn
            ? 'Esta devolução teve entrada de estoque registrada para apenas parte dos itens devolvidos.'
            : 'Apenas alguns itens deste pedido tiveram movimentação de saída de estoque gerada. Itens sem cadastro (temporários) ou itens que não geraram movimentação deixam o status de movimentação parcial.')
        : isReturn
        ? (hasMovement
            ? 'Esta devolução possui uma entrada de estoque vinculada e efetiva. A entrada foi criada quando a devolução foi atendida.'
            : 'Ainda não há entrada de estoque vinculada a esta devolução. O selo só ficará verde depois que uma entrada real for registrada para os itens devolvidos.')
        : (hasMovement
            ? 'Este pedido possui uma saída de estoque vinculada e efetiva para todos os itens vendidos.'
            : 'Ainda não há saída de estoque vinculada a este pedido. Alterar o status do pedido, por si só, não deixa este selo verde.');

    const statusLabel = isReversed
        ? (isReturn ? 'Entrada Estornada' : 'Saída Estornada')
        : isPartialMovement && hasMovement
        ? (isReturn ? 'Entrada Parcial' : 'Saída Parcial')
        : hasMovement
        ? (isReturn ? 'Entrada Efetivada' : 'Saída Efetivada')
        : 'Sem Movimentação';

    const statusTextColor = isReversed
        ? 'text-red-600 dark:text-red-400'
        : isPartialMovement && hasMovement
        ? 'text-amber-600 dark:text-amber-400'
        : hasMovement
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-400 dark:text-slate-500';

    const badgeColorClass = isReversed
        ? 'border-red-700 bg-red-600 text-white hover:bg-red-700'
        : isPartialMovement && hasMovement
        ? 'border-amber-600 bg-amber-500 text-white hover:bg-amber-600 dark:border-amber-700 dark:bg-amber-600 shadow-sm'
        : binaryOrderBadgeClass(hasMovement);

    return {
        title,
        explanation,
        statusLabel,
        statusTextColor,
        badgeColorClass,
    };
};

export const getOrderItemsMovementList = (
    order?: Order,
    hasMovement: boolean = false,
    isReversed: boolean = false
): ItemMovementDisplay[] => {
    if (!order || !order.items || order.items.length === 0) return [];

    const isOrderReversed = isReversed || order.status === 'cancelled' || Boolean(order.stockReversed) || Boolean(order.returnStockReversed);
    const movedSet = order.movedProductIds ? new Set(order.movedProductIds.map(String)) : null;

    return order.items.map((item: Item) => {
        const description = item.description || (item as any).name || 'Produto';
        const quantity = item.quantity || 1;
        const isUnregistered = !item.productId || item.productId.trim() === '' || Boolean(item.isTemporaryProduct);

        if (isUnregistered) {
            return {
                description,
                quantity,
                status: 'unregistered',
                statusLabel: 'Item não cadastrado (sem movimentação)',
                statusBadgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
                tooltip: 'Item sem cadastro no banco não gera saída de estoque.',
            };
        }

        if (isOrderReversed) {
            return {
                description,
                quantity,
                status: 'reversed',
                statusLabel: 'Estornada',
                statusBadgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border-red-200 dark:border-red-900',
                tooltip: 'A movimentação deste item foi estornada.',
            };
        }

        if (movedSet) {
            const wasMoved = movedSet.has(String(item.productId));
            if (wasMoved) {
                return {
                    description,
                    quantity,
                    status: 'effective',
                    statusLabel: 'Efetivada',
                    statusBadgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
                };
            } else {
                return {
                    description,
                    quantity,
                    status: 'not_effective',
                    statusLabel: 'Não efetivada',
                    statusBadgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
                };
            }
        }

        if (hasMovement) {
            return {
                description,
                quantity,
                status: 'effective',
                statusLabel: 'Efetivada',
                statusBadgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
            };
        }

        return {
            description,
            quantity,
            status: 'not_effective',
            statusLabel: 'Não efetivada',
            statusBadgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        };
    });
};
