import React from 'react';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import CurrencyInput from '@/components/CurrencyInput';
import type { PurchaseItemsTableProps } from './PurchaseItemsViewProps';

export const PurchaseItemsTable = ({
  items,
  isReceiptMode,
  supplierId,
  freightPercent,
  formatCurrency,
  onRemoveItem,
  onUpdateItem,
  onAddNewItemRow,
  handleSelectProductInRow,
  handleEditProductInRow,
  handleQtyChange,
  handleCostChange,
  totalValue,
}: PurchaseItemsTableProps) => {
  return (
    <div className="hidden lg:block overflow-hidden bg-white dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <tr>
            <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Produto
            </th>
            <th className="px-3 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-28">
              {isReceiptMode ? 'Qtd. recebida' : 'Qtd. pedida'}
            </th>
            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">
              Custo unitário
            </th>
            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">
              Desconto
            </th>
            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">
              Frete
            </th>
            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">
              Outras despesas
            </th>
            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 text-right bg-emerald-50/40 dark:bg-emerald-950/20">
              Custo unitário final
            </th>
            <th
              className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right"
              title="Valor total antes do frete, desconto e outras despesas"
            >
              Subtotal
            </th>
            <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 text-right">
              Total do item final
            </th>
            <th className="px-3 py-3.5 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {items.map((item, idx) => {
            const unitDiscount = item.discountUnit || 0;
            const unitFreight = item.freightUnit ?? (item.baseCost || 0) * (freightPercent / 100);
            const unitOther = item.otherExpensesUnit ?? (item.additionalCostUnit || 0);
            const isRowEditing = isReceiptMode && !item.productId;
            const itemSubtotal = item.quantity * (item.baseCost || 0);

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
                      onChange={(desc) => {
                        if (onUpdateItem) onUpdateItem(idx, { ...item, description: desc });
                      }}
                      disabled={Boolean(isReceiptMode && !supplierId)}
                      onSelect={(p, v) => handleSelectProductInRow(idx, p, v)}
                      onSelectDescription={(desc) => {
                        if (onUpdateItem) onUpdateItem(idx, { ...item, description: desc });
                      }}
                      placeholder={
                        supplierId
                          ? 'Buscar produto deste fornecedor...'
                          : 'Selecione o fornecedor acima...'
                      }
                      inputClassName="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 rounded-none transition-colors"
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-2 p-1.5 px-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 group/item">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-2">
                        {item.description || 'Produto não selecionado'}
                      </span>
                      {isReceiptMode && (
                        <button
                          type="button"
                          onClick={() => handleEditProductInRow(idx)}
                          className="opacity-0 group-hover/item:opacity-100 text-[10px] font-bold text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-white dark:hover:bg-slate-800 transition-all shrink-0 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                          title="Trocar produto"
                        >
                          <i className="bi bi-pencil-square" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
                {/* Quantidade: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
                <td className="px-3 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 bg-white dark:bg-slate-900 rounded-xl p-1 w-28 mx-auto border border-slate-100 dark:border-slate-800 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(idx, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center text-xs"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                      className="w-12 bg-white dark:bg-slate-900 text-center font-black text-sm text-slate-800 dark:text-slate-100 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none rounded-none py-0.5 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleQtyChange(idx, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors flex items-center justify-center text-xs shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </td>
                {/* Custo Unitário: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
                <td className="px-4 py-3.5 text-right">
                  <CurrencyInput
                    showBadge={false}
                    prefix="R$ "
                    value={item.baseCost || 0}
                    onChange={(val) => handleCostChange(idx, val)}
                    className="w-28 bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1 text-right text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
                  />
                </td>
                {/* Não-Editáveis (Calculados): Fundo Cinza */}
                <td className="px-4 py-3.5 text-right text-xs font-medium text-amber-600 dark:text-amber-400 bg-slate-50/70 dark:bg-slate-900/30">
                  {unitDiscount > 0 ? `- ${formatCurrency(unitDiscount)}` : '—'}
                </td>
                <td className="px-4 py-3.5 text-right text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/30">
                  {unitFreight > 0 ? formatCurrency(unitFreight) : '—'}
                </td>
                <td className="px-4 py-3.5 text-right text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/30">
                  {unitOther > 0 ? formatCurrency(unitOther) : '—'}
                </td>
                <td className="px-4 py-3.5 text-right text-sm font-black text-emerald-600 dark:text-emerald-400 bg-slate-100/60 dark:bg-slate-900/50">
                  {formatCurrency(item.unitCost || 0)}
                </td>
                {/* Subtotal: Valor total antes do frete, desconto e outras despesas */}
                <td
                  className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-900/30"
                  title="Valor total antes do frete, desconto e outras despesas"
                >
                  {formatCurrency(itemSubtotal)}
                </td>
                {/* Total do item final */}
                <td className="px-5 py-3.5 text-right text-sm font-black text-slate-800 dark:text-slate-100 bg-slate-100/60 dark:bg-slate-900/50">
                  {formatCurrency(item.totalCost || 0)}
                </td>
                <td className="px-3 py-3.5 text-right">
                  <button
                    onClick={() => onRemoveItem(idx)}
                    className="text-slate-400 hover:text-red-500 transition-all p-1"
                    title="Remover Item"
                  >
                    <i className="bi bi-trash text-sm" />
                  </button>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={10} className="px-6 py-10 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <i className="bi bi-box-seam text-2xl text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Nenhum item adicionado
                  </p>
                  {isReceiptMode && supplierId && (
                    <button
                      type="button"
                      onClick={handleAddNewItemRow}
                      className="mt-1 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <i className="bi bi-plus-circle-fill" /> Clique para adicionar o primeiro
                      item
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
        {items.length > 0 && (
          <tfoot className="bg-slate-900 text-white">
            <tr>
              <td
                colSpan={8}
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
