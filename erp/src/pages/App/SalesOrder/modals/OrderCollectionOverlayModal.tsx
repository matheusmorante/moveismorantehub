import React from 'react';
import OrderHistoryList, { OrderHistoryListRef } from '../OrderHistoryList';
import Order, { VisibilitySettings } from '../../../types/order.type';

interface OrderCollectionOverlayModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly variant: 'trash' | 'drafts';
  readonly listRef: React.RefObject<OrderHistoryListRef>;
  readonly filters: any;
  readonly visibilitySettings: VisibilitySettings;
  readonly onToggleColumn: (column: keyof VisibilitySettings) => void;
  readonly onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  readonly highlightOrderId: string | null;
  readonly onFilterByOrderId: (id: string) => void;
  readonly onAction: (actionKey: string, order: Order) => void;
  readonly onViewFiscalDocument: (documentId: string, environment: 1 | 2) => void;
  readonly onEdit: (
    order: Order,
    initialStep?: number,
    highlightTemporary?: boolean,
    reconciliationMode?: boolean
  ) => void;
}

export const OrderCollectionOverlayModal: React.FC<OrderCollectionOverlayModalProps> = ({
  isOpen,
  onClose,
  variant,
  listRef,
  filters,
  visibilitySettings,
  onToggleColumn,
  onSort,
  highlightOrderId,
  onFilterByOrderId,
  onAction,
  onViewFiscalDocument,
  onEdit,
}) => {
  if (!isOpen) return null;

  const isTrash = variant === 'trash';
  const title = isTrash ? 'Lixeira de Pedidos' : 'Rascunhos de Pedidos';
  const subtitle = isTrash
    ? 'Gerencie pedidos excluídos, restaure-os ou exclua permanentemente.'
    : 'Pedidos iniciados mas não finalizados.';
  const iconClass = isTrash ? 'bi-trash3-fill' : 'bi-pencil-square';
  const badgeBgClass = isTrash
    ? 'bg-red-600 shadow-red-100 dark:shadow-red-900/20'
    : 'bg-amber-500 shadow-amber-100 dark:shadow-amber-900/20';
  const closeHoverClass = isTrash
    ? 'hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400'
    : 'hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-500 dark:hover:text-amber-400';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-slate-900/50 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-950 w-full h-full md:w-[95vw] md:h-[95vh] rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 md:border border-white/20 dark:border-slate-800/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 md:px-10 py-6 md:py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-300">
          <div className="flex items-center gap-5">
            <div className={`${badgeBgClass} p-3 rounded-2xl shadow-xl`}>
              <i className={`bi ${iconClass} text-white text-xl`} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {title}
              </h2>
              <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 ${closeHoverClass} rounded-2xl transition-all shadow-sm border border-slate-100 dark:border-slate-800 active:scale-95`}
          >
            <i className="bi bi-x-lg text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50 dark:bg-slate-950">
          <div className="bg-transparent md:bg-white dark:bg-transparent dark:md:bg-slate-900 rounded-none md:rounded-3xl shadow-none overflow-visible md:overflow-hidden md:border border-slate-100 dark:border-slate-800 transition-colors">
            <OrderHistoryList
              onEdit={onEdit}
              filters={filters}
              visibilitySettings={visibilitySettings}
              onToggleColumn={onToggleColumn}
              onSort={onSort}
              highlightOrderId={highlightOrderId}
              ref={listRef}
              onFilterByOrderId={onFilterByOrderId}
              onAction={onAction}
              onViewFiscalDocument={onViewFiscalDocument}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
