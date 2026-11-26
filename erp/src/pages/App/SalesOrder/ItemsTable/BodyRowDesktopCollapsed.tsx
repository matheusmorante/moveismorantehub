import React from 'react';
import Item from '../../../types/items.type';
import { calcItemTotalValue, getFixedDiscount } from '../../../utils/sales/calculations';
import CurrencyDisplay from '../../../../components/display/CurrencyDisplay';

interface Props {
  item: Item;
  displayNumber: string;
  isBudget?: boolean;
  useItemEditorModal?: boolean;
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
  isBudget = false,
  useItemEditorModal = false,
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
  const discountPercent =
    item.discountType === 'percentage'
      ? Number(item.unitDiscount) || 0
      : item.unitPrice > 0
        ? Math.round((unitDiscount / item.unitPrice) * 100 * 100) / 100
        : 0;
  const itemSummary = (
    <>
      <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${isService ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
        #{displayNumber}
      </span>
      <i className={`bi ${isService ? 'bi-tools text-amber-500' : 'bi-box-seam text-blue-600 dark:text-blue-400'}`} aria-hidden="true" />
      <span className={`line-clamp-2 min-w-0 flex-1 whitespace-normal break-words text-xs leading-4 text-slate-700 dark:text-slate-200 ${isService ? 'font-semibold' : 'font-bold'}`} title={item.description || (isService ? 'Serviço sem descrição' : 'Produto sem descrição')}>
        {item.description || (isService ? 'Serviço sem descrição' : 'Produto sem descrição')}
        {isLinkedProduct && <i className="bi bi-check-circle-fill ml-1 inline-block text-[10px] text-emerald-500 align-middle" aria-label="Produto vinculado" />}
      </span>
      {item.promotionId && <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" title={`Desconto informativo de ${item.promotionDiscountPercent || 0}%, sujeito às condições; não aplicado automaticamente${item.promotionName ? ` (${item.promotionName})` : ''}.`}>Campanha</span>}
      {showTemporaryProductLabel && <i className="bi bi-exclamation-triangle-fill shrink-0 text-[10px] text-amber-500" aria-label="Temporário — Pendente de conciliação" title="Temporário — Pendente de conciliação" />}
      {itemHasError && <i className="bi bi-exclamation-circle-fill shrink-0 text-[10px] text-red-500" aria-label="Pendência no item" />}
    </>
  );

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
        {isBudget || useItemEditorModal ? (
          <div className="flex min-w-0 items-center gap-2">{itemSummary}</div>
        ) : (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={false}
            aria-label={`Editar item ${displayNumber}: ${item.description || (isService ? 'serviço sem descrição' : 'produto sem descrição')}`}
            className="flex min-w-0 w-full items-center gap-2 text-left"
          >
            <i className="bi bi-chevron-right shrink-0 text-[10px] text-slate-400" aria-hidden="true" />
            {itemSummary}
          </button>
        )}
      </td>
      {!hideHandling && !compactDesktop && (
        <td className="px-2 py-2 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {isService ? '—' : item.handlingType || '—'}
        </td>
      )}
      <td className="px-2 py-2 text-center text-[13px] text-slate-600 dark:text-slate-300">
        {quantity.toLocaleString('pt-BR')} un
      </td>
      <td className="px-2 py-2 text-right text-[13px] text-slate-600 dark:text-slate-300">
        {item.isComboItem ? '—' : <CurrencyDisplay value={item.unitPrice} />}
      </td>
      <td colSpan={2} className="w-[150px] px-2 py-2 text-center text-[13px] text-slate-600 dark:text-slate-300">
        {item.isComboItem || unitDiscount <= 0 ? (
          '—'
        ) : (
          <span className="flex flex-col items-center whitespace-nowrap leading-tight">
            <span>−<CurrencyDisplay value={unitDiscount} /></span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {discountPercent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
            </span>
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-right text-[13px] text-slate-600 dark:text-slate-300">
        {item.isComboItem ? '—' : <CurrencyDisplay value={Math.max(0, item.unitPrice - unitDiscount)} />}
      </td>
      <td className="px-2 py-2 text-right text-[13px] font-bold text-slate-700 dark:text-slate-200">
        <CurrencyDisplay value={calcItemTotalValue(item)} />
      </td>
      <td className={isBudget ? 'px-2 py-2' : 'px-2 py-2 text-center'}>
        {(isBudget || useItemEditorModal) && !item.isComboItem ? (
          <div className="flex items-center justify-end gap-1.5">
            <button type="button" onClick={onToggleExpand} aria-haspopup="dialog" aria-expanded={false} aria-label={`Editar item ${displayNumber}`} title="Editar item" className="inline-flex h-8 w-8 items-center justify-center text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
              <i className="bi bi-pencil text-sm" aria-hidden="true" />
            </button>
            <button type="button" onClick={onDelete} aria-label={`Remover item ${displayNumber}`} title="Remover item" className="inline-flex h-8 w-8 items-center justify-center text-red-600 transition-colors hover:text-red-800 dark:text-red-400 dark:hover:text-red-200">
              <i className="bi bi-trash text-sm" aria-hidden="true" />
            </button>
          </div>
        ) : !item.isComboItem && (
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
