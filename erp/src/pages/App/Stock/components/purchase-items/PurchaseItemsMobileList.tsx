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
    const firstUnselectedItem = items.findIndex((item) => !item.productId);
    if (firstUnselectedItem >= 0) return firstUnselectedItem;
    return items.length > 0 ? items.length - 1 : null;
  });
  const previousItemCount = React.useRef(items.length);

  React.useEffect(() => {
    if (isReceiptMode) {
      previousItemCount.current = items.length;
      return;
    }

    if (items.length > previousItemCount.current) {
      setExpandedItemIndex(items.length - 1);
    } else if (items.length === 0) {
      setExpandedItemIndex(null);
    } else if (items.length < previousItemCount.current) {
      setExpandedItemIndex((current) =>
        current !== null && current >= items.length ? items.length - 1 : current
      );
    }
    previousItemCount.current = items.length;
  }, [isReceiptMode, items.length]);

  const handleRemoveItem = (index: number) => {
    if (!isReceiptMode) {
      setExpandedItemIndex((current) => {
        if (current === null || current === index) return null;
        return current > index ? current - 1 : current;
      });
    }
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
        const unitOther = item.otherExpensesUnit ?? (item.additionalCostUnit || 0);
        const isRowEditing = isReceiptMode ? !item.productId : true;
        const isCollapsed = !isReceiptMode && expandedItemIndex !== idx;
        const collapsedProductLabel = item.productId && item.description?.trim()
          ? item.description
          : 'Produto não informado';
        const summaryTotalCost = formatCurrency(costs?.totalCost ?? item.totalCost ?? 0);
        const itemSubtotal = costs?.subtotal ?? item.quantity * (item.baseCost || 0);
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

        return (
          <div
            key={idx}
            className="bg-white dark:bg-slate-955 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            {!isReceiptMode && (
              <button
                type="button"
                onClick={() => setExpandedItemIndex(isCollapsed ? idx : null)}
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed
                  ? `Expandir item ${collapsedProductLabel}, quantidade ${item.quantity} un, custo total ${summaryTotalCost}`
                  : `Recolher item ${collapsedProductLabel}`}
                className={`flex h-10 shrink-0 items-center rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${isCollapsed ? 'w-full justify-between gap-2 px-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900/60' : 'ml-auto mb-2 gap-1.5 border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-900'}`}
              >
                {isCollapsed && (
                  <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-800 dark:text-slate-100">
                    {collapsedProductLabel}
                  </span>
                )}
                {isCollapsed && (
                  <span className="shrink-0 whitespace-nowrap text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {item.quantity} un
                  </span>
                )}
                {isCollapsed && (
                  <span className="shrink-0 whitespace-nowrap text-[11px] font-black text-slate-700 dark:text-slate-200" title="Custo total">
                    Total {summaryTotalCost}
                  </span>
                )}
                {!isCollapsed && <span>Recolher item</span>}
                <i
                  className={`bi bi-chevron-down shrink-0 text-sm transition-transform ${isCollapsed ? 'text-slate-500 dark:text-slate-400' : 'rotate-180 text-slate-600 dark:text-slate-300'}`}
                  aria-hidden="true"
                />
              </button>
            )}
            <div className={isCollapsed ? 'hidden' : 'space-y-4'}>
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
                      autoFocus={!item.productId}
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
                  <div className="flex items-center gap-2 p-1.5 px-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-800 dark:text-slate-100">
                      {item.description}
                    </span>
                    {isReceiptMode && <button
                      type="button"
                      onClick={() => handleEditProductInRow(idx)}
                      className="text-xs text-slate-400 hover:text-blue-600 p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors"
                      title="Trocar produto"
                    >
                      <i className="bi bi-pencil-square" />
                    </button>}
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
              {isReceiptMode && <button
                onClick={() => handleRemoveItem(idx)}
                className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors shrink-0"
                title="Remover Item"
                aria-label="Remover item"
              >
                <i className="bi bi-trash text-base" />
              </button>}
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
            <div className={`grid grid-cols-2 ${isReceiptMode ? 'min-[480px]:grid-cols-3 min-[768px]:grid-cols-4' : 'min-[700px]:grid-cols-4'} gap-2 text-xs border-t border-slate-100 dark:border-slate-800/50 pt-3`}>
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

              <div className={`${isReceiptMode ? 'bg-slate-100/70 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60' : 'min-[700px]:col-span-2 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'} min-w-0 p-2 sm:p-2.5 rounded-xl border flex flex-col justify-center`}>
                <label htmlFor={`purchase-item-discount-mobile-${idx}`} className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                  {isReceiptMode ? 'Desconto por unidade' : 'Desconto unitário'}
                </label>
                {isReceiptMode ? (
                  <span className="min-w-0 break-words font-bold text-amber-600 dark:text-amber-400 block text-xs leading-normal">
                    {unitDiscount > 0 ? `- ${formatCurrency(unitDiscount)}` : '—'}
                  </span>
                ) : (
                  <CurrencyInput
                    id={`purchase-item-discount-mobile-${idx}`}
                    showBadge={false}
                    prefix="R$ "
                    value={unitDiscount}
                    onChange={(value) => handleDiscountChange(idx, value)}
                    className="w-full min-w-0 bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-xs font-bold text-amber-700 dark:text-amber-400 px-1 py-1 mt-0.5 rounded-none transition-colors text-right"
                  />
                )}
              </div>

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

              {/* Frete: Não-Editável -> Fundo Cinza */}
              <div className="min-w-0 p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                  {isReceiptMode ? 'Frete' : 'Frete por unidade'}
                </span>
                <span className="min-w-0 break-words font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal">
                  {isReceiptMode && unitFreight <= 0 ? '—' : formatCurrency(unitFreight)}
                </span>
              </div>

              {/* Outras despesas: Não-Editável -> Fundo Cinza */}
              {isReceiptMode && (
                <div className="min-w-0 p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                  <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                    Outras despesas
                  </span>
                  <span className="min-w-0 break-words font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal">
                    {unitOther > 0 ? formatCurrency(unitOther) : '—'}
                  </span>
                </div>
              )}

              {/* Custo unitário final: Não-Editável -> Fundo Cinza */}
              <div className="min-w-0 p-2 sm:p-2.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-center">
                <span className="text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                  Custo unitário final
                </span>
                <span className="min-w-0 break-words font-black text-emerald-600 dark:text-emerald-400 block text-xs leading-normal">
                  {formatCurrency(finalUnitCost || 0)}
                </span>
              </div>

              {/* Subtotal: Não-Editável -> Fundo Cinza */}
              {isReceiptMode && (
                <div className="min-w-0 p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                  <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                    Subtotal
                  </span>
                  <span
                    className="min-w-0 break-words font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal"
                    title="Valor total antes do frete, desconto e outras despesas"
                  >
                    {formatCurrency(itemSubtotal)}
                  </span>
                </div>
              )}

              {/* Total do item final: Não-Editável -> Fundo Cinza */}
              <div className={`${isReceiptMode ? 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'} min-w-0 p-2 sm:p-2.5 rounded-xl border flex flex-col justify-center`}>
                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 break-words leading-tight">
                  {isReceiptMode ? 'Total do item final' : 'Total do item'}
                </span>
                <span className="min-w-0 break-words font-black text-slate-800 dark:text-slate-100 block text-sm leading-normal">
                  {formatCurrency(finalTotalCost || 0)}
                </span>
              </div>
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
