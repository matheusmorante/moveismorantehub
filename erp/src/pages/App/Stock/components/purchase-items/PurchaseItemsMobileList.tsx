import React from 'react';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import CurrencyInput from '@/components/CurrencyInput';
import { calculatePurchaseItemCostBreakdown } from '@/pages/App/Stock/Purchases/utils/purchaseCalculationUtils';
import type { PurchaseItemsViewProps } from './PurchaseItemsViewProps';

export const PurchaseItemsMobileList = ({
  items,
  isReceiptMode,
  supplierId,
  discountPercent,
  ipiPercent,
  freightPercent,
  formatCurrency,
  onRemoveItem,
  onUpdateItem,
  handleSelectProductInRow,
  handleEditProductInRow,
  handleQtyChange,
  handleCostChange,
  handleDiscountChange,
}: PurchaseItemsViewProps) => {
  const [expandedItemIndex, setExpandedItemIndex] = React.useState<number | null>(() => {
    if (isReceiptMode) return null;
    const firstUnselectedItem = items.findIndex((item) => !item.productId);
    if (firstUnselectedItem >= 0) return firstUnselectedItem;
    return items.length > 0 ? items.length - 1 : null;
  });
  const previousItemCount = React.useRef(items.length);
  const previousReceiptMode = React.useRef(isReceiptMode);

  React.useEffect(() => {
    if (isReceiptMode && !previousReceiptMode.current) {
      setExpandedItemIndex(null);
    }
    if (items.length > previousItemCount.current) {
      if (!isReceiptMode) setExpandedItemIndex(items.length - 1);
    } else if (items.length === 0) {
      setExpandedItemIndex(null);
    } else if (items.length < previousItemCount.current) {
      setExpandedItemIndex((current) =>
        current !== null && current >= items.length ? items.length - 1 : current
      );
    }
    previousItemCount.current = items.length;
    previousReceiptMode.current = isReceiptMode;
  }, [isReceiptMode, items.length]);

  const handleRemoveItem = (index: number) => {
    setExpandedItemIndex((current) => {
      if (current === null || current === index) return null;
      return current > index ? current - 1 : current;
    });
    onRemoveItem(index);
  };

  return (
    <div className="block xl:hidden space-y-4">
      {items.map((item, idx) => {
        const unitDiscount = item.discountUnit || 0;
        const costs = isReceiptMode
          ? null
          : calculatePurchaseItemCostBreakdown(item, discountPercent, ipiPercent, freightPercent);
        const unitIpi = costs?.ipiValue ?? 0;
        const unitFreight = costs?.freightValue ?? item.freightUnit ?? (item.baseCost || 0) * (freightPercent / 100);
        const unitOtherExpenses = Number(
          item.otherExpensesUnit ??
            Number(item.otherExpensesFiscalUnit || 0) +
              Number(item.otherExpensesNonFiscalUnit || 0) +
              Number(item.additionalCostUnit || 0),
        );
        const isRowEditing = isReceiptMode ? !item.productId : true;
        const isCollapsed = expandedItemIndex !== idx;
        const collapsedProductLabel = item.productId && item.description?.trim()
          ? item.description
          : 'Produto não informado';
        const summaryTotalCost = formatCurrency(costs?.totalCost ?? item.totalCost ?? 0);
        const finalUnitCost = costs?.unitCost ?? item.unitCost;
        const finalTotalCost = costs?.totalCost ?? item.totalCost;
        const quantityInput = (
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
            aria-label={`Quantidade de ${item.description || 'item'}`}
            className={`${isReceiptMode ? 'w-24 sm:w-32' : 'w-full'} h-11 bg-white dark:bg-slate-800 text-center font-black text-base text-slate-800 dark:text-slate-100 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none rounded-none transition-colors`}
          />
        );
        const receiptRemoveButton = isReceiptMode && (
          <button
            type="button"
            onClick={() => handleRemoveItem(idx)}
            className="shrink-0 rounded-lg py-1.5 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            title="Remover item"
            aria-label={`Remover ${item.description || 'item'}`}
          >
            Remover item
          </button>
        );

        return (
          <div
            key={idx}
            className="bg-white dark:bg-slate-955 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpandedItemIndex(isCollapsed ? idx : null)}
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed
                  ? `Expandir item ${collapsedProductLabel}, quantidade ${item.quantity} un, custo total ${summaryTotalCost}`
                  : `Recolher item ${collapsedProductLabel}`}
                className={`flex shrink-0 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${isCollapsed
                  ? isReceiptMode
                    ? 'min-h-10 w-full flex-col items-stretch gap-1.5 px-2.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-900/60'
                    : 'h-10 min-w-0 flex-1 items-center justify-between gap-2 px-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900/60'
                  : 'ml-auto mb-2 h-10 items-center gap-1.5 border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-900'}`}
              >
                {isCollapsed && isReceiptMode ? (
                  <>
                    <span className="min-w-0 break-words whitespace-normal text-sm font-black text-slate-800 dark:text-slate-100">
                      {collapsedProductLabel}
                    </span>
                    <span className="flex w-full items-center justify-end gap-2">
                      <span className="whitespace-nowrap text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {item.quantity} un
                      </span>
                      <span className="whitespace-nowrap text-[11px] font-black text-slate-700 dark:text-slate-200" title="Custo total">
                        Custo total {summaryTotalCost}
                      </span>
                      <i className="bi bi-chevron-down shrink-0 text-2xl text-slate-500 dark:text-slate-400" aria-hidden="true" />
                    </span>
                  </>
                ) : isCollapsed ? (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-800 dark:text-slate-100">
                      {collapsedProductLabel}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {item.quantity} un
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-[11px] font-black text-slate-700 dark:text-slate-200" title="Total">
                      Total {summaryTotalCost}
                    </span>
                    <i className="bi bi-chevron-down shrink-0 text-2xl text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <span>Recolher item</span>
                    <i className="bi bi-chevron-down shrink-0 rotate-180 text-2xl text-slate-600 transition-transform dark:text-slate-300" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
            <div
              aria-hidden={isCollapsed}
              inert={isCollapsed}
              className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none ${isCollapsed ? 'pointer-events-none max-h-0 opacity-0' : 'max-h-[1200px] opacity-100'}`}
            >
            <div className="space-y-4">
            <div className={isReceiptMode ? 'flex justify-between items-start gap-4' : 'grid grid-cols-1 min-[420px]:grid-cols-[minmax(0,1fr)_minmax(5.5rem,0.32fr)] items-stretch gap-3'}>
              <div className={isReceiptMode ? 'min-w-0 flex-1' : 'min-w-0 flex-1 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900'}>
                {isRowEditing ? (
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase tracking-widest text-[9px] font-black block">
                      Produto
                    </label>
                    <ProductAutocomplete
                      supplierId={supplierId || undefined}
                      value={item.description || ''}
                      isSelected={Boolean(item.productId)}
                      autoFocus={!item.productId && !isCollapsed}
                      onChange={(desc) => {
                        if (onUpdateItem) {
                          onUpdateItem(idx, {
                            ...item,
                            productId: '',
                            variationId: undefined,
                            description: desc,
                          });
                        }
                      }}
                      disabled={Boolean(isReceiptMode && !supplierId)}
                      onSelect={(p, v) => handleSelectProductInRow(idx, p, v)}
                      onSelectDescription={(desc) => {
                        if (onUpdateItem) onUpdateItem(idx, { ...item, description: desc });
                      }}
                      placeholder={
                        supplierId
                          ? 'Buscar produto deste fornecedor...'
                          : isReceiptMode
                            ? 'Selecione o fornecedor acima...'
                            : 'Buscar produto...'
                      }
                      inputClassName={`${isReceiptMode ? '' : 'h-11 '}w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 rounded-none transition-colors`}
                    />
                  </div>
                ) : (
                  <div className={isReceiptMode
                    ? 'flex min-w-0 items-center gap-2 border-0 border-b-2 border-emerald-500 bg-slate-50 px-2 py-1.5 dark:bg-slate-900/40'
                    : 'flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-1.5 px-2.5 dark:border-slate-800/60 dark:bg-slate-900/40'}>
                    <span className={isReceiptMode
                      ? 'min-w-0 flex-1 whitespace-normal break-words text-sm font-black leading-snug text-slate-900 dark:text-slate-100'
                      : 'min-w-0 flex-1 truncate text-sm font-black text-slate-800 dark:text-slate-100'}>
                      {item.description}
                    </span>
                    {isReceiptMode && <button
                      type="button"
                      onClick={() => handleEditProductInRow(idx)}
                      className="shrink-0 rounded p-1 text-xs text-slate-400 transition-colors hover:bg-white hover:text-blue-600 dark:hover:bg-slate-800"
                      title="Trocar produto"
                      aria-label={`Trocar produto: ${item.description}`}
                    >
                      <i className="bi bi-pencil-square" />
                    </button>}
                    {isReceiptMode && <i className="bi bi-check-lg shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                  </div>
                )}
              </div>
              {!isReceiptMode && (
                <div className="w-32 justify-self-end min-w-0 space-y-1 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-[420px]:w-auto min-[420px]:justify-self-stretch">
                  <span className="block whitespace-nowrap text-slate-400 uppercase tracking-widest text-[9px] font-black">
                    Qtd.
                  </span>
                  {quantityInput}
                </div>
              )}
            </div>

            {/* Campo de Quantidade em Destaque: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
            {isReceiptMode && <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1.5">
              <span className="text-slate-400 uppercase tracking-widest text-[9px] font-black block">
                Qtd. recebida
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQtyChange(idx, item.quantity - 1)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                >
                  -
                </button>
                {quantityInput}
                <button
                  type="button"
                  onClick={() => handleQtyChange(idx, item.quantity + 1)}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-black text-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>}

            {/* Métricas em grade fluida para não forçar largura mínima em telas estreitas. */}
            <div className={`grid grid-cols-2 ${!isReceiptMode ? 'min-[700px]:grid-cols-4' : ''} gap-2 text-xs border-t border-slate-100 dark:border-slate-800/50 pt-3`}>
              {/* Custo Unitário: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
              <div className={`${!isReceiptMode ? 'min-[700px]:col-span-2' : ''} min-w-0 p-2 sm:p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center`}>
                <label htmlFor={`purchase-item-base-mobile-${idx}`} className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                  {isReceiptMode ? 'Custo unitário' : 'Custo base por unidade'}
                </label>
                <CurrencyInput
                  id={`purchase-item-base-mobile-${idx}`}
                  showBadge={false}
                  prefix="R$ "
                  value={item.baseCost || 0}
                  onChange={(val) => handleCostChange(idx, val)}
                  className="w-full min-w-0 bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-xs font-bold text-slate-800 dark:text-slate-200 px-1 py-1 mt-0.5 rounded-none transition-colors text-right"
                />
              </div>

              {!isReceiptMode && (
                <div className="min-w-0 p-2 sm:p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center min-[700px]:col-span-2">
                  <label htmlFor={`purchase-item-discount-mobile-${idx}`} className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                    Desconto unitário
                  </label>
                  <CurrencyInput
                    id={`purchase-item-discount-mobile-${idx}`}
                    showBadge={false}
                    prefix="R$ "
                    value={unitDiscount}
                    onChange={(value) => handleDiscountChange(idx, value)}
                    className="w-full min-w-0 bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-xs font-bold text-amber-700 dark:text-amber-400 px-1 py-1 mt-0.5 rounded-none transition-colors text-right"
                  />
                </div>
              )}

              {isReceiptMode && (
                <>
                  <p className="col-span-full pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Composição do custo
                  </p>
                  <div className="min-w-0 p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                      Frete por unidade
                    </span>
                    <span className="min-w-0 break-words font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal">
                      {formatCurrency(unitFreight)}
                    </span>
                  </div>
                  <div className="min-w-0 p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                      Outras despesas por unidade
                    </span>
                    <span className="min-w-0 break-words font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal">
                      {formatCurrency(unitOtherExpenses)}
                    </span>
                  </div>
                </>
              )}

              {!isReceiptMode && (
                <p className="col-span-full pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Composição e total
                </p>
              )}
              {!isReceiptMode && (
                <div className="min-w-0 p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                  <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                    IPI por unidade
                  </span>
                  <span className="min-w-0 break-words font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal">
                    {formatCurrency(unitIpi)}
                  </span>
                </div>
              )}

              {!isReceiptMode && (
                <div className="min-w-0 p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                  <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                    Frete por unidade
                  </span>
                  <span className="min-w-0 break-words font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal">
                    {formatCurrency(unitFreight)}
                  </span>
                </div>
              )}

              {/* Custo unitário final: Não-Editável -> Fundo Cinza */}
              {!isReceiptMode && (
                <div className="min-w-0 p-2 sm:p-2.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-center">
                  <span className="text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                    Custo unitário final
                  </span>
                  <span className="min-w-0 break-words font-black text-emerald-600 dark:text-emerald-400 block text-xs leading-normal">
                    {formatCurrency(finalUnitCost || 0)}
                  </span>
                </div>
              )}

              {/* Total do item final: Não-Editável -> Fundo Cinza */}
              {isReceiptMode ? (
                <div className="col-span-2 flex items-center justify-between gap-2 pt-1">
                  {!isCollapsed && receiptRemoveButton}
                  <div className="ml-auto w-fit max-w-full min-w-0 bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 p-2 sm:p-2.5 rounded-xl border flex flex-col justify-center">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                      Custo total
                    </span>
                    <span className="min-w-0 break-words font-black text-slate-800 dark:text-slate-100 block text-sm leading-normal">
                      {formatCurrency(finalTotalCost || 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 rounded-xl border flex flex-col justify-center">
                  <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                    Total do item
                  </span>
                  <span className="min-w-0 break-words font-black text-slate-800 dark:text-slate-100 block text-sm leading-normal">
                    {formatCurrency(finalTotalCost || 0)}
                  </span>
                </div>
              )}
            </div>
            {!isReceiptMode && (
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                className="text-xs font-bold text-red-600 hover:underline dark:text-red-400"
                aria-label={`Remover ${item.description || 'item'}`}
              >
                Remover item
              </button>
            )}
            </div>
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="text-center py-10 bg-white dark:bg-slate-955 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-2">
          <i className="bi bi-box-seam text-2xl text-slate-300 dark:text-slate-600" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Nenhum item adicionado
          </p>
        </div>
      )}
    </div>
  );
};
