import React from 'react';
import Item from '../../../types/items.type';
import { calcItemTotalValue, getFixedDiscount } from '../../../utils/calculations';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import TemporaryProductWarning from './TemporaryProductWarning';

interface BodyRowMobileCompactProps {
  item: Item;
  displayNumber: string;
  isBudget?: boolean;
  useItemEditorModal?: boolean;
  isCompositionComponent: boolean;
  isService: boolean;
  isLinkedProduct: boolean;
  showTemporaryProductLabel: boolean;
  itemHasError: boolean;
  isTablet: boolean;
  highlightAsTemporary?: boolean;
  onToggleExpand?: () => void;
  onDelete?: () => void;
}

export const BodyRowMobileCompact: React.FC<BodyRowMobileCompactProps> = ({
  item,
  displayNumber,
  isBudget = false,
  useItemEditorModal = false,
  isCompositionComponent,
  isService,
  isLinkedProduct,
  showTemporaryProductLabel,
  itemHasError,
  isTablet,
  highlightAsTemporary,
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
  const description = item.description?.trim() || (isService ? 'Serviço sem descrição' : 'Produto sem descrição');

  const itemIdentity = (
    <div className="flex min-w-0 items-center gap-2">
      <span className={`flex h-7 min-w-7 shrink-0 items-center justify-center gap-1 rounded-xl px-1.5 text-[9px] font-bold ${isService ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
        <i className={`bi ${isService ? 'bi-tools' : 'bi-box-seam'} text-xs`} aria-hidden="true" />
        {displayNumber}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <span
            className="line-clamp-2 min-w-0 flex-1 whitespace-normal break-words text-xs font-bold leading-snug text-slate-800 dark:text-slate-100"
            title={description}
          >
            {description}
            {isLinkedProduct && (
              <i
                className="bi bi-check-circle-fill ml-1 inline-block text-[10px] text-emerald-500 align-middle"
                aria-label="Produto vinculado"
              />
            )}
          </span>
          {showTemporaryProductLabel && <TemporaryProductWarning />}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {isCompositionComponent && (
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              Componente {Number(item.compositionGroup?.componentIndex ?? 0) + 1}/{item.compositionGroup?.componentCount}
            </span>
          )}
          {item.promotionId && <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" title={`Desconto informativo de ${item.promotionDiscountPercent || 0}%, sujeito às condições; não aplicado automaticamente${item.promotionName ? ` (${item.promotionName})` : ''}.`}>Campanha</span>}
          {itemHasError && <span className="text-[9px] font-bold text-red-600 dark:text-red-400">Pendência</span>}
        </div>
      </div>
    </div>
  );

  const quantityCell = (
    <div className="min-w-0 text-right">
      <span className="block h-4 whitespace-nowrap text-[11px] font-black uppercase leading-4 tracking-wider text-slate-400">Qtd.</span>
      <span className="block h-5 whitespace-nowrap text-[13px] font-semibold leading-5 text-slate-600 dark:text-slate-300">{quantity.toLocaleString('pt-BR')} un</span>
    </div>
  );
  const unitPriceCell = (
    <div className="min-w-0 text-right">
      <span className="block h-4 whitespace-nowrap text-[11px] font-black uppercase leading-4 tracking-wider text-slate-400">Unitário</span>
      <span className="block h-5 whitespace-nowrap text-[13px] font-semibold leading-5 text-slate-600 dark:text-slate-300">
        {item.isComboItem ? '—' : <CurrencyDisplay value={item.unitPrice} />}
      </span>
    </div>
  );
  const discountCell = (
    <div className="min-w-0 text-right">
      <span className="block h-4 whitespace-nowrap text-[11px] font-black uppercase leading-4 tracking-wider text-slate-400">Desconto UN</span>
      <span className="flex h-5 flex-nowrap items-center justify-end gap-x-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
        {item.isComboItem || unitDiscount <= 0 ? '—' : (
          <>
            <span className="whitespace-nowrap">−<CurrencyDisplay value={unitDiscount} /></span>
            <span className="whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">
              {discountPercent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
            </span>
          </>
        )}
      </span>
    </div>
  );
  const totalCell = (
    <div className="min-w-0 text-right">
      <span className="block h-4 whitespace-nowrap text-[11px] font-black uppercase leading-4 tracking-wider text-slate-400">Total</span>
      <span className="block h-5 whitespace-nowrap text-sm font-black leading-5 text-blue-600 dark:text-blue-400">
        <CurrencyDisplay value={calcItemTotalValue(item)} />
      </span>
    </div>
  );
  const budgetActions = (
    <div className="flex items-center justify-end gap-1">
      <button type="button" aria-haspopup="dialog" aria-expanded={false} aria-label={`Editar item ${displayNumber}`} title="Editar item" onClick={onToggleExpand} className="inline-flex h-8 w-8 items-center justify-center text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
        <i className="bi bi-pencil text-sm" aria-hidden="true" />
      </button>
      {!item.isComboItem && <button type="button" aria-label={`Remover item ${displayNumber}`} title="Remover item" onClick={onDelete} className="inline-flex h-8 w-8 items-center justify-center text-red-600 transition-colors hover:text-red-800 dark:text-red-400 dark:hover:text-red-200">
        <i className="bi bi-trash text-sm" aria-hidden="true" />
      </button>}
    </div>
  );
  const showEditorActions = Boolean(isBudget || useItemEditorModal);

  if (isTablet) {
    return (
      <div
        className={`grid ${showEditorActions ? 'grid-cols-[minmax(0,1fr)_64px_96px_128px_112px_76px]' : 'grid-cols-[minmax(0,1fr)_64px_96px_128px_112px_28px]'} items-center gap-1.5 border-b px-2.5 py-2.5 transition-colors last:border-b-0 group ${
          highlightAsTemporary
            ? 'border-b-amber-400 bg-amber-50/20 dark:border-b-amber-500 dark:bg-amber-950/10'
            : itemHasError
              ? 'border-b-red-400 bg-white dark:border-b-red-500 dark:bg-slate-900'
              : 'border-b-slate-200/80 bg-white dark:border-b-slate-800 dark:bg-slate-900'
        }`}
      >
        {itemIdentity}
        {quantityCell}
        {unitPriceCell}
        {discountCell}
        {totalCell}
        {showEditorActions ? budgetActions : <button
          type="button"
          aria-label={`Expandir item ${displayNumber}`}
          aria-expanded={false}
          onClick={onToggleExpand}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <i className="bi bi-chevron-down text-xs" aria-hidden="true" />
        </button>}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2.5 border-b px-3.5 py-2.5 transition-colors last:border-b-0 group ${
        highlightAsTemporary
          ? 'border-b-amber-400 bg-amber-50/20 dark:border-b-amber-500 dark:bg-amber-950/10'
          : itemHasError
            ? 'border-b-red-400 bg-white dark:border-b-red-500 dark:bg-slate-900'
            : 'border-b-slate-200/80 bg-white dark:border-b-slate-800 dark:bg-slate-900'
      }`}
    >
      <div className="flex w-full min-w-0 items-start justify-between gap-3">
        {itemIdentity}
        <div className="flex shrink-0 items-start gap-2">
          {quantityCell}
          {!isBudget && !useItemEditorModal && <button
            type="button"
            aria-label={`Expandir item ${displayNumber}`}
            aria-expanded={false}
            onClick={onToggleExpand}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <i className="bi bi-chevron-down text-xs transition-transform" aria-hidden="true" />
          </button>}
        </div>
      </div>
      <div className="flex w-full min-w-0 items-start justify-between gap-2 pt-2">
        {unitPriceCell}
        {discountCell}
        {totalCell}
      </div>
      {showEditorActions && budgetActions}
    </div>
  );
};
