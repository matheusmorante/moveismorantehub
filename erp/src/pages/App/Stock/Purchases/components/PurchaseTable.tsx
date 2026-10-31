import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Purchase from '@/pages/types/purchase.type';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { formatPurchaseNumber } from '../../../../../../../shared-utils/purchaseNumber';

export interface PurchaseTableProps {
  readonly purchases: readonly Purchase[];
  readonly onOpen: (purchase: Purchase) => void;
  readonly onEdit: (purchase: Purchase) => void;
  readonly onResumeDraft: (purchase: Purchase) => void;
  readonly canDiscardDrafts: boolean;
  readonly onDiscardDraft: (purchase: Purchase) => void;
  readonly onChangeStatus: (purchase: Purchase, status: Purchase['status']) => void;
  readonly canDeleteCancelled: boolean;
  readonly onDelete: (purchase: Purchase) => void;
}

const STATUS_LABELS: Record<Purchase['status'], string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  fulfilled: 'Atendido',
  ordered: 'Em Ordem',
  cancelled: 'Cancelado',
};

const PURCHASE_STATUSES: readonly Purchase['status'][] = ['ordered', 'fulfilled', 'cancelled'];

/**
 * Tabela com histórico e listagem de pedidos de compra, permitindo troca rápida de status e navegação para detalhes.
 */
export const PurchaseTable: React.FC<PurchaseTableProps> = ({
  purchases,
  onOpen,
  onEdit,
  onResumeDraft,
  canDiscardDrafts,
  onDiscardDraft,
  onChangeStatus,
  canDeleteCancelled,
  onDelete,
}) => {
  const [activePurchase, setActivePurchase] = useState<Purchase | null>(null);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  useEffect(() => {
    if (!activePurchase) return;
    const closeMenu = () => {
      setActivePurchase(null);
      setMenuPos(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [activePurchase]);

  const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>, purchase: Purchase) => {
    event.stopPropagation();
    if (activePurchase?.id === purchase.id) {
      setActivePurchase(null);
      setMenuPos(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setMenuPos(spaceBelow < 100
      ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
      : { top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setActivePurchase(purchase);
  };

  const displayCode = (purchase: Purchase) =>
    formatPurchaseNumber(purchase.purchaseNumber) || purchase.id?.slice(-4) || '—';
  const renderMenuButton = (purchase: Purchase) => (
    <button
      type="button"
      aria-label={`Opções do pedido de compra #${displayCode(purchase)}`}
      aria-haspopup="menu"
      aria-expanded={activePurchase?.id === purchase.id}
      onClick={(event) => toggleMenu(event, purchase)}
      className="shrink-0 p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
    >
      <i className="bi bi-three-dots-vertical" aria-hidden="true" />
    </button>
  );
  const renderStatus = (purchase: Purchase) => {
    const draft = purchase.status === 'draft';
    const statusOptions =
      purchase.status === 'pending'
        ? (['pending', 'ordered', 'fulfilled', 'cancelled'] as const)
        : PURCHASE_STATUSES;

    return (
      <div onClick={(event) => event.stopPropagation()}>
        {draft ? (
          <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-indigo-700 dark:border-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-300">
            {STATUS_LABELS.draft}
          </span>
        ) : (
          <select
            value={purchase.status}
            onChange={(event) =>
              onChangeStatus(purchase, event.target.value as Purchase['status'])
            }
            aria-label={`Alterar status do pedido de compra #${displayCode(purchase)}`}
            title="Alterar status"
            className="max-w-full rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-center text-[9px] font-black uppercase tracking-wider text-blue-700 outline-none transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-400 cursor-pointer sm:px-3"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status] || status}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-2 xl:hidden">
        {purchases.map((purchase) => {
          const cancelled = purchase.status === 'cancelled';
          const code = displayCode(purchase);
          return (
            <article
              key={purchase.id}
              onClick={() => onOpen(purchase)}
              className={`min-w-0 cursor-pointer rounded-2xl border p-4 shadow-md transition-all sm:p-5 ${
                cancelled
                  ? 'border-slate-200 bg-slate-100/90 opacity-60 dark:border-slate-800 dark:bg-slate-900/90'
                  : 'border-slate-300 bg-blue-50/70 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-100/80 hover:shadow-lg dark:border-slate-600 dark:bg-slate-800/80 dark:hover:border-blue-700 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <button
                  type="button"
                  aria-label={`Ver pedido de compra #${code}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(purchase);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Pedido #{code}
                  </h3>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {formatToBRDate(purchase.date)}
                  </span>
                  <p
                    title={purchase.supplierName}
                    className={`mt-1 truncate text-sm font-bold ${
                      cancelled
                        ? 'text-slate-400 line-through'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {purchase.supplierName}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  {renderStatus(purchase)}
                  {renderMenuButton(purchase)}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {purchase.items.length} {purchase.items.length === 1 ? 'item' : 'itens'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Total
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-700 dark:text-slate-200">
                    {formatCurrency(purchase.totalValue)}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[900px] text-left">
        <thead>
          <tr className="bg-slate-50/50 dark:bg-slate-950/20">
            {['Cód.', 'Data', 'Fornecedor', 'Status', 'Total', ''].map((title, index) => (
                <th
                  key={title}
                  className={`border-b border-slate-50 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:border-slate-800 xl:px-6 xl:py-5 ${
                  index > 3 ? 'text-right' : index === 3 ? 'text-center' : ''
                  }`}
                >
                  {title}
                </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {purchases.map((purchase) => {
            const cancelled = purchase.status === 'cancelled';
            const code = displayCode(purchase);

            return (
              <tr
                key={purchase.id}
                onClick={() => onOpen(purchase)}
                className={`group cursor-pointer transition-colors ${
                  cancelled
                    ? 'bg-slate-100/90 opacity-60 dark:bg-slate-900/90'
                    : 'even:bg-slate-50/70 dark:even:bg-slate-900/50 hover:bg-blue-50/80 dark:hover:bg-blue-950/25'
                }`}
              >
                <td className="px-4 py-4 text-xs font-mono font-bold text-slate-500 xl:px-6 xl:py-5">
                  #{code}
                </td>
                <td className="px-4 py-4 text-xs text-slate-500 xl:px-6 xl:py-5">
                  {formatToBRDate(purchase.date)}
                </td>
                <td className="max-w-[280px] px-4 py-4 xl:px-6 xl:py-5">
                  <span
                    title={purchase.supplierName}
                    className={`block truncate font-bold ${
                      cancelled
                        ? 'text-slate-400 line-through'
                        : 'text-slate-700 group-hover:text-blue-600 dark:text-slate-200'
                    }`}
                  >
                    {purchase.supplierName}
                  </span>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {purchase.items.length} {purchase.items.length === 1 ? 'item' : 'itens'}
                  </span>
                </td>
                <td className="px-4 py-4 text-center xl:px-6 xl:py-5">{renderStatus(purchase)}</td>
                <td className="px-4 py-4 text-right font-black text-slate-700 dark:text-slate-200 xl:px-6 xl:py-5">
                  {formatCurrency(purchase.totalValue)}
                </td>
                <td className="px-3 py-3 text-right">{renderMenuButton(purchase)}</td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
      {activePurchase && menuPos && typeof document !== 'undefined' && createPortal(
        <>
          <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-[99998] cursor-default bg-transparent"
            onClick={() => { setActivePurchase(null); setMenuPos(null); }} />
          <div role="menu" aria-label="Opções do pedido de compra"
            className="fixed z-[99999] w-60 rounded-xl border border-slate-100 bg-white py-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            style={{ top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right }}>
            {activePurchase.status === 'draft' && (
              <button type="button" role="menuitem" onClick={() => { onResumeDraft(activePurchase); setActivePurchase(null); setMenuPos(null); }}
                title="Retomar cadastramento do pedido"
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-black text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30">
                <i className="bi bi-play-fill text-base" aria-hidden="true" /> Retomar Cadastramento
              </button>
            )}
            {canDiscardDrafts && activePurchase.status === 'draft' && (
              <button type="button" role="menuitem" onClick={() => { onDiscardDraft(activePurchase); setActivePurchase(null); setMenuPos(null); }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30">
                <i className="bi bi-trash3" aria-hidden="true" /> Descartar rascunho
              </button>
            )}
            {['pending', 'ordered'].includes(activePurchase.status) && !activePurchase.stockProcessed && (
              <button type="button" role="menuitem" onClick={() => { onEdit(activePurchase); setActivePurchase(null); setMenuPos(null); }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                <i className="bi bi-pencil-square text-slate-400" aria-hidden="true" /> Editar pedido
              </button>
            )}
            {activePurchase.status === 'ordered' && (
              <button type="button" role="menuitem" onClick={() => { onChangeStatus(activePurchase, 'pending'); setActivePurchase(null); setMenuPos(null); }}
                title="Voltar o pedido para Pendente"
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30">
                <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Voltar para Pendente
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => { onOpen(activePurchase); setActivePurchase(null); setMenuPos(null); }}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
              <i className="bi bi-eye text-slate-400" aria-hidden="true" /> Ver detalhes
            </button>
            {canDeleteCancelled && activePurchase.status === 'cancelled' && (
              <button type="button" role="menuitem" onClick={() => { onDelete(activePurchase); setActivePurchase(null); setMenuPos(null); }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30">
                <i className="bi bi-trash3" aria-hidden="true" /> Apagar pedido
              </button>
            )}
          </div>
        </>, document.body
      )}
    </>
  );
};

export default PurchaseTable;
