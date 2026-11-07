import React from 'react';
import Item from '../../../types/items.type';
import { calcItemTotalValue, getFixedDiscount } from '../../../utils/calculations';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';

interface Props {
  item: Item;
  displayNumber: string;
  isService: boolean;
  isLinkedProduct: boolean;
  showTemporaryProductLabel: boolean;
  itemHasError: boolean;
  highlightAsTemporary?: boolean;
  hideHandling?: boolean;
  compactDesktop: boolean;
  onToggleExpand?: () => void;
  onDelete: () => void;
}

export const BodyRowDesktopCollapsed: React.FC<Props> = ({
  item,
  displayNumber,
  isService,
  isLinkedProduct,
  showTemporaryProductLabel,
  itemHasError,
  highlightAsTemporary,
  hideHandling,
  compactDesktop,
  onToggleExpand,
  onDelete,
}) => {
  const quantity = Number(item.quantity) || 0;
  const unitDiscount = getFixedDiscount(item);
  const totalDiscount = unitDiscount * quantity;

  return (
    <tr
      className={`group border-b border-slate-100 font-sans transition-colors dark:border-slate-800 ${
        highlightAsTemporary
          ? 'bg-amber-50/50 ring-2 ring-inset ring-amber-400/50 dark:bg-amber-950/20'
          : itemHasError
            ? 'bg-red-50/30 dark:bg-red-950/10'
            : 'bg-white hover:bg-slate-50/50 dark:bg-slate-900 dark:hover:bg-slate-800/20'
      }`}
    >
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={false}
          aria-label={`Editar item ${displayNumber}: ${item.description || (isService ? 'serviço sem descrição' : 'produto sem descrição')}`}
          className="flex min-w-0 w-full items-center gap-2 text-left"
        >
          <i className="bi bi-chevron-right shrink-0 text-[10px] text-slate-400" aria-hidden="true" />
          <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${isService ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
            #{displayNumber}
          </span>
          <i className={`bi ${isService ? 'bi-tools text-amber-500' : 'bi-box-seam text-blue-600 dark:text-blue-400'}`} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
            {item.description || (isService ? 'Serviço sem descrição' : 'Produto sem descrição')}
          </span>
          {item.promotionId && <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" title={`Desconto informativo de ${item.promotionDiscountPercent || 0}%, sujeito às condições; não aplicado automaticamente${item.promotionName ? ` (${item.promotionName})` : ''}.`}>Campanha</span>}
          {isLinkedProduct && <i className="bi bi-check-circle-fill shrink-0 text-[10px] text-emerald-500" aria-label="Produto vinculado" />}
          {showTemporaryProductLabel && <i className="bi bi-clock-history shrink-0 text-[10px] text-amber-500" aria-label="Produto temporário" />}
          {itemHasError && <i className="bi bi-exclamation-circle-fill shrink-0 text-[10px] text-red-500" aria-label="Pendência no item" />}
          <i className="bi bi-pencil-square shrink-0 text-[10px] text-blue-500" aria-hidden="true" />
        </button>
      </td>
      {!hideHandling && !compactDesktop && (
        <td className="px-2 py-2 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {isService ? '—' : item.handlingType || '—'}
        </td>
      )}
      <td className="px-2 py-2 text-center text-xs text-slate-600 dark:text-slate-300">
        {quantity.toLocaleString('pt-BR')} un.
      </td>
      <td className="px-2 py-2 text-right text-xs text-slate-600 dark:text-slate-300">
        {item.isComboItem ? '—' : <CurrencyDisplay value={item.unitPrice} />}
      </td>
      <td colSpan={2} className="w-[150px] px-2 py-2 text-center text-xs text-slate-600 dark:text-slate-300">
        {item.isComboItem || totalDiscount <= 0 ? '—' : <>−<CurrencyDisplay value={totalDiscount} /></>}
      </td>
      {!compactDesktop && (
        <td className="px-2 py-2 text-right text-xs text-slate-600 dark:text-slate-300">
          {item.isComboItem ? '—' : <CurrencyDisplay value={Math.max(0, item.unitPrice - unitDiscount)} />}
        </td>
      )}
      <td className="px-2 py-2 text-right text-xs font-bold text-slate-700 dark:text-slate-200">
        <CurrencyDisplay value={calcItemTotalValue(item)} />
      </td>
      <td className="px-2 py-2 text-center">
        {!item.isComboItem && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Remover item ${displayNumber}`}
            className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-all hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <i className="bi bi-trash text-xs" aria-hidden="true" />
          </button>
        )}
      </td>
    </tr>
  );
};
