import React from 'react';
import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';

export interface ReceiptsActionsMenuProps {
  readonly receipt: GoodsReceipt;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onOpenDetails: (receipt: GoodsReceipt) => void;
  readonly onOpenEdit?: (receipt: GoodsReceipt) => void;
  readonly onCopyReceipt?: (receipt: GoodsReceipt) => void;
  readonly onReverseRequest?: (e: React.MouseEvent, receipt: GoodsReceipt) => void;
  readonly onUnreverseRequest?: (e: React.MouseEvent, receipt: GoodsReceipt) => void;
  readonly onDelete?: (e: React.MouseEvent, id: string) => void;
  readonly onPrintIdentificationLabels?: (receipt: GoodsReceipt) => void;
}

/**
 * Menu dropdown de ações unificado para linhas de tabela e cards de recebimentos de estoque.
 * Princípio DRY e responsabilidade única de apresentação de ações.
 */
export const ReceiptsActionsMenu: React.FC<ReceiptsActionsMenuProps> = ({
  receipt,
  isOpen,
  onClose,
  onOpenDetails,
  onOpenEdit,
  onCopyReceipt,
  onReverseRequest,
  onUnreverseRequest,
  onDelete,
  onPrintIdentificationLabels,
}) => {
  if (!isOpen) return null;

  const isDraft = receipt.isDraft || receipt.status === 'draft';
  const isEstornado = receipt.status === 'estornado';
  const canPrintLabels = Boolean(
    receipt.status === 'received' &&
      !isDraft &&
      !isEstornado &&
      receipt.items?.length &&
      receipt.items.every((item) => Boolean(item.productId))
  );
  const labelBlockedReason = isDraft
    ? 'Conclua o recebimento para imprimir etiquetas.'
    : isEstornado
      ? 'Recebimentos estornados não podem gerar etiquetas.'
      : !receipt.items?.length || !receipt.items.every((item) => Boolean(item.productId))
        ? 'Este recebimento não tem produtos vinculados para etiquetar.'
        : 'As etiquetas ficam disponíveis após concluir o recebimento.';

  return (
    <div
      role="menu"
      className="absolute right-0 mt-2 z-50 w-56 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      {onPrintIdentificationLabels && (
        <button
          type="button"
          role="menuitem"
          disabled={!canPrintLabels}
          title={canPrintLabels ? 'Imprimir etiquetas dos produtos recebidos' : labelBlockedReason}
          onClick={() => {
            if (!canPrintLabels) return;
            onClose();
            onPrintIdentificationLabels(receipt);
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-400 disabled:hover:bg-transparent dark:text-blue-300 dark:hover:bg-slate-800 dark:disabled:text-slate-500"
        >
          <i className="bi bi-qr-code" aria-hidden="true" /> Imprimir etiquetas de identificação
        </button>
      )}

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          onOpenDetails(receipt);
        }}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
      >
        <i className="bi bi-eye text-emerald-600" /> Ver Detalhes
      </button>

      {isDraft && onOpenEdit && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onOpenEdit(receipt);
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
        >
          <i className="bi bi-pencil-square" /> Editar Rascunho
        </button>
      )}

      {onCopyReceipt && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onCopyReceipt(receipt);
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
        >
          <i className="bi bi-copy" /> Duplicar recebimento
        </button>
      )}

      {!isDraft && !isEstornado && onReverseRequest && (
        <button
          type="button"
          role="menuitem"
          onClick={(e) => {
            onClose();
            onReverseRequest(e, receipt);
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
        >
          <i className="bi bi-arrow-counterclockwise" /> Estornar Recebimento
        </button>
      )}

      {!isDraft && isEstornado && onUnreverseRequest && (
        <button
          type="button"
          role="menuitem"
          onClick={(e) => {
            onClose();
            onUnreverseRequest(e, receipt);
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
        >
          <i className="bi bi-arrow-clockwise" /> Desfazer Estorno
        </button>
      )}

      {isDraft && onDelete && (
        <button
          type="button"
          role="menuitem"
          onClick={(e) => {
            onClose();
            onDelete(e, receipt.id);
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
        >
          <i className="bi bi-trash" /> Excluir Rascunho
        </button>
      )}
    </div>
  );
};

export default ReceiptsActionsMenu;
