import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { PurchaseItem } from '@/pages/types/purchase.type';

export interface ReceiptBadgeContentResult {
    title: string;
    explanation: string;
    statusLabel: string;
    statusTextColor: string;
    badgeColorClass: string;
}

export type ReceiptItemMovementStatus = 'effective' | 'reversed' | 'not_effective' | 'unregistered';

export interface ReceiptItemMovementDisplay {
    description: string;
    quantity: number;
    productId?: string;
    status: ReceiptItemMovementStatus;
    statusLabel: string;
    statusBadgeClass: string;
    tooltip?: string;
}

export const getReceiptBadgeContent = (receipt: GoodsReceipt): ReceiptBadgeContentResult => {
    const isDraft = receipt.isDraft || receipt.status === 'draft';
    const isReversed = receipt.status === 'estornado';
    const hasMovement = !isDraft && !isReversed;

    const title = isReversed
        ? 'Entrada de estoque estornada'
        : hasMovement
        ? 'Entrada de estoque registrada pelo recebimento'
        : 'Entrada de estoque ainda não registrada';

    const explanation = isReversed
        ? 'A entrada de estoque vinculada a este recebimento foi estornada / cancelada.'
        : hasMovement
        ? 'Este recebimento possui uma entrada de estoque vinculada e efetiva para todos os itens recebidos.'
        : 'Ainda não há entrada de estoque vinculada a este recebimento. O selo só ficará verde após a confirmação do recebimento.';

    const statusLabel = isReversed
        ? 'Entrada Estornada'
        : hasMovement
        ? 'Entrada Efetivada'
        : 'Sem Movimentação';

    const statusTextColor = isReversed
        ? 'text-red-600 dark:text-red-400'
        : hasMovement
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-400 dark:text-slate-500';

    const badgeColorClass = isReversed
        ? 'border-red-700 bg-red-600 text-white hover:bg-red-700'
        : hasMovement
        ? 'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700'
        : 'border-slate-500 bg-slate-400 text-white hover:bg-slate-500 dark:border-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500';

    return {
        title,
        explanation,
        statusLabel,
        statusTextColor,
        badgeColorClass,
    };
};

export const getReceiptItemsMovementList = (receipt: GoodsReceipt): ReceiptItemMovementDisplay[] => {
    if (!receipt.items || receipt.items.length === 0) return [];

    const isDraft = receipt.isDraft || receipt.status === 'draft';
    const isReversed = receipt.status === 'estornado';
    const hasMovement = !isDraft && !isReversed;

    return receipt.items.map((item: PurchaseItem) => {
        const description = item.description || 'Produto';
        const quantity = item.quantity || 1;
        const productId = item.productId;
        const isUnregistered = !productId || productId.trim() === '';

        if (isUnregistered) {
            return {
                description,
                quantity,
                productId,
                status: 'unregistered',
                statusLabel: 'Sem Cadastro',
                statusBadgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
                tooltip: 'Item sem cadastro no banco não gera entrada de estoque.',
            };
        }

        if (isReversed) {
            return {
                description,
                quantity,
                productId,
                status: 'reversed',
                statusLabel: 'Estornada',
                statusBadgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border-red-200 dark:border-red-900',
                tooltip: 'A movimentação deste item foi estornada.',
            };
        }

        if (hasMovement) {
            return {
                description,
                quantity,
                productId,
                status: 'effective',
                statusLabel: 'Efetivada',
                statusBadgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
            };
        }

        return {
            description,
            quantity,
            productId,
            status: 'not_effective',
            statusLabel: 'Não efetivada',
            statusBadgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        };
    });
};
