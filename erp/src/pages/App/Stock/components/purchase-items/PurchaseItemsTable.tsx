import React from 'react';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import CurrencyInput from '@/components/CurrencyInput';
import { calculatePurchaseItemCostBreakdown } from '@/pages/App/Stock/Purchases/utils/purchaseCalculationUtils';
import type { PurchaseItemsTableProps } from './PurchaseItemsViewProps';

export const PurchaseItemsTable = ({
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
  totalValue,
}: PurchaseItemsTableProps) => {
  return (
    <div className="hidden xl:block overflow-x-auto bg-white dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <table className={`w-full ${isReceiptMode ? 'min-w-[1060px]' : 'min-w-[1200px]'} text-left border-collapse`}>
        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <tr>
            <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Produto
            </th>
            <th className="px-3 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-28">
              {isReceiptMode ? 'Qtd. recebida' : 'Qtd.'}
            </th>
            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">
              {isReceiptMode ? 'Custo unitário' : 'Custo base por unidade'}
            </th>
            {isReceiptMode && (
              <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">
                Frete por unidade
              </th>
            )}
            {isReceiptMode && (
              <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">
                Outras despesas por unidade
              </th>
            )}
            {!isReceiptMode && (
              <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right" title="Desconto em reais aplicado por unidade">
                Desconto unitário
              </th>
            )}
            {!isReceiptMode && (
              <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">
                IPI por unidade
              </th>
            )}
            {!isReceiptMode && (
              <>
                <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">
                  Frete por unidade
                </th>
                <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 text-right bg-emerald-50/40 dark:bg-emerald-950/20">
                  Custo unitário final
                </th>
              </>
            )}
            <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 text-right">
              {isReceiptMode ? 'Custo total' : 'Total do item'}
            </th>
            <th className="px-3 py-3.5 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
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
            const finalUnitCost = costs?.unitCost ?? item.unitCost;
            const finalTotalCost = costs?.totalCost ?? item.totalCost;

            return (
              <tr
                key={idx}
                className="group hover:bg-slate-50/30 dark:hover:bg-slate-900/15 transition-colors"
              >
                <td className="px-5 py-3.5 min-w-[260px]">
                  {isRowEditing ? (
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
                      inputClassName="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 rounded-none transition-colors"
                    />
                  ) : (
                    <div className={isReceiptMode
                      ? 'group/item flex min-w-0 items-center justify-between gap-2 border-0 border-b-2 border-emerald-500 bg-slate-50 px-2 py-1.5 dark:bg-slate-900/40'
                      : 'group/item flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-1.5 px-2.5 dark:border-slate-800 dark:bg-slate-900/40'}>
                      <span className={isReceiptMode
                        ? 'min-w-0 flex-1 whitespace-normal break-words text-sm font-bold text-slate-900 dark:text-slate-100'
                        : 'text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-2'}>
                        {item.description || 'Produto não selecionado'}
                      </span>
                      {isReceiptMode && <button
                        type="button"
                        onClick={() => handleEditProductInRow(idx)}
                        className="opacity-0 group-hover/item:opacity-100 text-[10px] font-bold text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-white dark:hover:bg-slate-800 transition-all shrink-0 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        title="Trocar produto"
                      >
                        <i className="bi bi-pencil-square" />
                      </button>}
                      {isReceiptMode && <i className="bi bi-check-lg shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                    </div>
                  )}
                </td>
                {/* Quantidade: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
                <td className="px-3 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 bg-white dark:bg-slate-900 rounded-xl p-1 w-28 mx-auto border border-slate-100 dark:border-slate-800 shadow-sm">
                    {isReceiptMode && <button
                      type="button"
                      onClick={() => handleQtyChange(idx, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center text-xs"
                    >
                      -
                    </button>}
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                      aria-label={`Quantidade de ${item.description || 'item'}`}
                      className={`${isReceiptMode ? 'w-12' : 'w-full'} bg-white dark:bg-slate-900 text-center font-black text-sm text-slate-800 dark:text-slate-100 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none rounded-none py-0.5 transition-colors`}
                    />
                    {isReceiptMode && <button
                      type="button"
                      onClick={() => handleQtyChange(idx, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors flex items-center justify-center text-xs shadow-sm"
                    >
                      +
                    </button>}
                  </div>
                </td>
                {/* Custo Unitário: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
                <td className="px-4 py-3.5 text-right">
                  <label className="sr-only" htmlFor={`purchase-item-base-desktop-${idx}`}>
                    {isReceiptMode ? 'Custo unitário' : 'Custo base por unidade'} de {item.description || 'item'}
                  </label>
                  <CurrencyInput
                    id={`purchase-item-base-desktop-${idx}`}
                    showBadge={false}
                    prefix="R$ "
                    value={item.baseCost || 0}
                    onChange={(val) => handleCostChange(idx, val)}
                    className="w-28 bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1 text-right text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
                  />
                </td>
                {isReceiptMode && (
                  <td className="bg-slate-50/70 px-4 py-3.5 text-right text-xs font-medium text-slate-600 dark:bg-slate-900/30 dark:text-slate-400">
                    {formatCurrency(item.freightUnit ?? item.freightFiscalUnit ?? item.freightNonFiscalUnit ?? 0)}
                  </td>
                )}
                {isReceiptMode && (
                  <td className="bg-slate-50/70 px-4 py-3.5 text-right text-xs font-medium text-slate-600 dark:bg-slate-900/30 dark:text-slate-400">
                    {formatCurrency(unitOtherExpenses)}
                  </td>
                )}
                {!isReceiptMode && (
                  <td className="bg-white px-4 py-3.5 text-right text-xs font-medium dark:bg-slate-900">
                    <>
                      <label className="sr-only" htmlFor={`purchase-item-discount-desktop-${idx}`}>
                        Desconto unitário de {item.description || 'item'}
                      </label>
                      <CurrencyInput
                        id={`purchase-item-discount-desktop-${idx}`}
                        showBadge={false}
                        prefix="R$ "
                        value={unitDiscount}
                        onChange={(value) => handleDiscountChange(idx, value)}
                        className="w-28 bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1 text-right text-sm font-bold text-amber-700 dark:text-amber-400 rounded-none transition-colors"
                      />
                    </>
                  </td>
                )}
                {!isReceiptMode && (
                  <td className="px-4 py-3.5 text-right text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/30">
                    {formatCurrency(unitIpi)}
                  </td>
                )}
                {!isReceiptMode && (
                  <>
                    <td className="px-4 py-3.5 text-right text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/30">
                      {formatCurrency(unitFreight)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-black text-emerald-600 dark:text-emerald-400 bg-slate-100/60 dark:bg-slate-900/50">
                      {formatCurrency(finalUnitCost || 0)}
                    </td>
                  </>
                )}
                <td className="px-5 py-3.5 text-right text-sm font-black text-slate-800 dark:text-slate-100 bg-slate-100/60 dark:bg-slate-900/50">
                  {formatCurrency(finalTotalCost || 0)}
                </td>
                <td className="px-3 py-3.5 text-right">
                  {isReceiptMode ? (
                    <button
                      onClick={() => onRemoveItem(idx)}
                      className="text-slate-400 hover:text-red-500 transition-all p-1"
                      title="Remover Item"
                      aria-label="Remover item"
                    >
                      <i className="bi bi-trash text-sm" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="text-xs font-bold text-red-600 hover:underline dark:text-red-400"
                    >
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={isReceiptMode ? 7 : 9} className="px-6 py-10 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <i className="bi bi-box-seam text-2xl text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Nenhum item adicionado
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
        {items.length > 0 && (
          <tfoot className="bg-slate-900 text-white">
            <tr>
              <td
                colSpan={isReceiptMode ? 5 : 7}
                className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-400"
              >
                {isReceiptMode ? 'Valor Total do Recebimento' : 'Valor Total do Pedido'}
              </td>
              <td className="px-5 py-4 text-right text-xl font-black text-emerald-400">
                {formatCurrency(totalValue)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};
