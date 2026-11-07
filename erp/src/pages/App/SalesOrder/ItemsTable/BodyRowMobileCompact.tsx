import React from 'react';
import Item from '../../../types/items.type';
import { calcItemTotalValue, getFixedDiscount } from '../../../utils/calculations';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import TemporaryProductWarning from './TemporaryProductWarning';

interface BodyRowMobileCompactProps {
  item: Item;
  displayNumber: string;
  isCompositionComponent: boolean;
  isService: boolean;
  isLinkedProduct: boolean;
  showTemporaryProductLabel: boolean;
  itemHasError: boolean;
  isTablet: boolean;
  highlightAsTemporary?: boolean;
  onToggleExpand?: () => void;
}

export const BodyRowMobileCompact: React.FC<BodyRowMobileCompactProps> = ({
  item,
  displayNumber,
  isCompositionComponent,
  isService,
  isLinkedProduct,
  showTemporaryProductLabel,
  itemHasError,
  isTablet,
  highlightAsTemporary,
  onToggleExpand,
}) => {
  const quantity = Number(item.quantity) || 0;
  const unitDiscount = getFixedDiscount(item);
  const totalDiscount = unitDiscount * quantity;
  const description = item.description?.trim() || (isService ? 'Serviço sem descrição' : 'Produto sem descrição');

  const itemIdentity = (
    <div className="flex min-w-0 items-center gap-2">
      <span className={`flex h-7 min-w-7 shrink-0 items-center justify-center gap-1 rounded-xl px-1.5 text-[9px] font-bold ${isService ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
        <i className={`bi ${isService ? 'bi-tools' : 'bi-box-seam'} text-xs`} aria-hidden="true" />
        {displayNumber}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{description}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {isCompositionComponent && (
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              Componente {Number(item.compositionGroup?.componentIndex ?? 0) + 1}/{item.compositionGroup?.componentCount}
            </span>
          )}
          {item.promotionId && <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" title={`Desconto informativo de ${item.promotionDiscountPercent || 0}%, sujeito às condições; não aplicado automaticamente${item.promotionName ? ` (${item.promotionName})` : ''}.`}>Campanha</span>}
          {isLinkedProduct && <i className="bi bi-check-circle-fill text-[10px] text-emerald-500" aria-label="Produto vinculado" />}
          {showTemporaryProductLabel && <TemporaryProductWarning />}
          {itemHasError && <span className="text-[9px] font-bold text-red-600 dark:text-red-400">Pendência</span>}
        </div>
      </div>
    </div>
  );

  const quantityCell = (
    <div className="text-right">
      <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Qtd.</span>
      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{quantity.toLocaleString('pt-BR')} un.</span>
    </div>
  );
  const unitPriceCell = (
    <div className="text-right">
      <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Unitário</span>
      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
        {item.isComboItem ? '—' : <CurrencyDisplay value={item.unitPrice} />}
      </span>
    </div>
  );
  const discountCell = (
    <div className="text-right">
      <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Desconto</span>
      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
        {item.isComboItem || totalDiscount <= 0 ? '—' : <>−<CurrencyDisplay value={totalDiscount} /></>}
      </span>
    </div>
  );
  const totalCell = (
    <div className="text-right">
      <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Total</span>
      <span className="text-xs font-black text-blue-600 dark:text-blue-400">
        <CurrencyDisplay value={calcItemTotalValue(item)} />
      </span>
    </div>
  );

  if (isTablet) {
    return (
      <div
        className={`grid grid-cols-[minmax(180px,2fr)_repeat(4,minmax(68px,1fr))_28px] items-center gap-3 border-b px-3.5 py-2.5 transition-colors last:border-b-0 group ${
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
        <button
          type="button"
          aria-label={`Expandir item ${displayNumber}`}
          aria-expanded={false}
          onClick={onToggleExpand}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <i className="bi bi-chevron-down text-xs" aria-hidden="true" />
        </button>
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
      <div className="flex min-w-0 items-start justify-between gap-3">
        {itemIdentity}
        <div className="flex shrink-0 items-start gap-2">
          {totalCell}
          <button
            type="button"
            aria-label={`Expandir item ${displayNumber}`}
            aria-expanded={false}
            onClick={onToggleExpand}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <i className="bi bi-chevron-down text-xs transition-transform" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        {quantityCell}
        {unitPriceCell}
        {discountCell}
      </div>
    </div>
  );
};
