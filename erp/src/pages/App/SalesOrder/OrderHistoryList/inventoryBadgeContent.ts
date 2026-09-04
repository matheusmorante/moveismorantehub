import { binaryOrderBadgeClass } from "./orderBadgeStyles";

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
