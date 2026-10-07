import React from 'react';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import CurrencyInput from '@/components/CurrencyInput';
import type { PurchaseItemsViewProps } from './PurchaseItemsViewProps';

export const PurchaseItemsMobileList = ({
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
}: PurchaseItemsViewProps) => {
  return (
    <div className="block lg:hidden space-y-4">
      {items.map((item, idx) => {
        const unitDiscount = item.discountUnit || 0;
        const unitFreight = item.freightUnit ?? (item.baseCost || 0) * (freightPercent / 100);
        const unitOther = item.otherExpensesUnit ?? (item.additionalCostUnit || 0);
        const isRowEditing = isReceiptMode && !item.productId;
        const itemSubtotal = item.quantity * (item.baseCost || 0);

        return (
          <div
            key={idx}
            className="bg-white dark:bg-slate-955 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4 relative shadow-sm"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                {isRowEditing ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Produto
                    </label>
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
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-1.5 px-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                      {item.description}
                    </span>
                    {isReceiptMode && (
                      <button
                        type="button"
                        onClick={() => handleEditProductInRow(idx)}
                        className="text-xs text-slate-400 hover:text-blue-600 p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors"
                        title="Trocar produto"
                      >
                        <i className="bi bi-pencil-square" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => onRemoveItem(idx)}
                className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors shrink-0"
                title="Remover Item"
              >
                <i className="bi bi-trash text-base" />
              </button>
            </div>

            {/* Campo de Quantidade em Destaque: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1.5">
              <span className="text-slate-400 uppercase tracking-widest text-[9px] font-black block">
                {isReceiptMode ? 'Qtd. recebida' : 'Qtd. pedida'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQtyChange(idx, item.quantity - 1)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                  className="w-24 sm:w-32 h-11 bg-white dark:bg-slate-800 text-center font-black text-base text-slate-800 dark:text-slate-100 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none rounded-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleQtyChange(idx, item.quantity + 1)}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-black text-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Flex de Valores e Métricas: Largura mínima igual ao conteúdo interno (min-w-fit), permitindo diminuir até o mínimo para caber mais campos por linha */}
            <div className="flex flex-wrap gap-2 text-xs border-t border-slate-100 dark:border-slate-800/50 pt-3 items-stretch">
              {/* Custo Unitário: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
              <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">
                  Custo unitário
                </span>
                <CurrencyInput
                  showBadge={false}
                  prefix="R$ "
                  value={item.baseCost || 0}
                  onChange={(val) => handleCostChange(idx, val)}
                  className="w-full min-w-[85px] bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-xs font-bold text-slate-800 dark:text-slate-200 px-1 py-1 mt-0.5 rounded-none transition-colors text-right"
                />
              </div>

              {/* Desconto: Não-Editável -> Fundo Cinza */}
              <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">
                  Desconto
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400 block text-xs leading-normal whitespace-nowrap">
                  {unitDiscount > 0 ? `- ${formatCurrency(unitDiscount)}` : '—'}
                </span>
              </div>

              {/* Frete: Não-Editável -> Fundo Cinza */}
              <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">
                  Frete
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal whitespace-nowrap">
                  {formatCurrency(unitFreight)}
                </span>
              </div>

              {/* Outras despesas: Não-Editável -> Fundo Cinza */}
              <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">
                  Outras despesas
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal whitespace-nowrap">
                  {unitOther > 0 ? formatCurrency(unitOther) : '—'}
                </span>
              </div>

              {/* Custo unitário final: Não-Editável -> Fundo Cinza */}
              <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-center">
                <span className="text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">
                  Custo unitário final
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 block text-xs leading-normal whitespace-nowrap">
                  {formatCurrency(item.unitCost || 0)}
                </span>
              </div>

              {/* Subtotal: Não-Editável -> Fundo Cinza */}
              <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">
                  Subtotal
                </span>
                <span
                  className="font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal whitespace-nowrap"
                  title="Valor total antes do frete, desconto e outras despesas"
                >
                  {formatCurrency(itemSubtotal)}
                </span>
              </div>

              {/* Total do item final: Não-Editável -> Fundo Cinza */}
              <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-center">
                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">
                  Total do item final
                </span>
                <span className="font-black text-slate-800 dark:text-slate-100 block text-sm leading-normal whitespace-nowrap">
                  {formatCurrency(item.totalCost || 0)}
                </span>
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
          {isReceiptMode && supplierId && (
            <button
              type="button"
              onClick={handleAddNewItemRow}
              className="mt-1 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <i className="bi bi-plus-circle-fill" /> Clique para adicionar o primeiro item
            </button>
          )}
        </div>
      )}
    </div>
  );
};
