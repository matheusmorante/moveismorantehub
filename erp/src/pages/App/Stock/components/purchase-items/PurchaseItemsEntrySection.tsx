import React from 'react';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import CurrencyInput from '@/components/CurrencyInput';
import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';

interface PurchaseItemsEntrySectionProps {
  itemCount: number;
  isReceiptMode: boolean;
  hasError: boolean;
  supplierId?: string;
  currentDescription: string;
  currentQty: number;
  currentCost: number;
  onDescriptionChange: (description: string) => void;
  onSelectProduct: (product: Product, variation?: Variation) => void;
  onQuantityChange: (quantity: number) => void;
  onCostChange: (cost: number) => void;
  onAddItemClick: () => void;
  onAddNewItemRow: () => void;
}

export const PurchaseItemsEntrySection = ({
  itemCount,
  isReceiptMode,
  hasError,
  supplierId,
  currentDescription,
  currentQty,
  currentCost,
  onDescriptionChange,
  onSelectProduct,
  onQuantityChange,
  onCostChange,
  onAddItemClick,
  onAddNewItemRow,
}: PurchaseItemsEntrySectionProps) => {
  return (
    <>
      {/* Modo Recebimento: Barra compacta com Título e Botão na MESMA linha */}
      {isReceiptMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <i className="bi bi-plus-circle-fill text-emerald-600 text-sm" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
              Adicionar Item
            </h3>
            {itemCount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40">
                {itemCount} item(ns)
              </span>
            )}
            {!supplierId && (
              <span className="text-[10px] font-bold text-amber-500 ml-2">
                (Selecione o fornecedor acima primeiro)
              </span>
            )}
            {hasError && (
              <span className="text-[10px] font-bold text-red-500 ml-2">
                Adicione pelo menos um item ao recebimento.
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onAddNewItemRow}
            disabled={!supplierId}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            title={!supplierId ? 'Selecione o fornecedor acima primeiro' : 'Adicionar Item'}
          >
            <i className="bi bi-plus-lg text-sm font-black" />
            <span>Adicionar Item</span>
          </button>
        </div>
      ) : (
        /* Container de Adicionar Item original para compras */
        <div
          className={`rounded-2xl border p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/30 space-y-4 ${hasError ? 'border-red-500 ring-2 ring-red-500/15' : 'border-slate-200 dark:border-slate-800'}`}
        >
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
            <i className="bi bi-plus-circle-fill text-emerald-600 text-sm" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
              Adicionar Item
            </h3>
          </div>
          {hasError && (
            <p className="text-xs font-bold text-red-500">
              {isReceiptMode
                ? 'Adicione pelo menos um item ao recebimento.'
                : 'Adicione pelo menos um item ao pedido de compra.'}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6 flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Produto
              </label>
              <ProductAutocomplete
                supplierId={supplierId || undefined}
                value={currentDescription}
                onChange={onDescriptionChange}
                disabled={Boolean(isReceiptMode && !supplierId)}
                onSelect={onSelectProduct}
                onSelectDescription={onDescriptionChange}
                placeholder="Buscar produto..."
                inputClassName="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all focus:ring-0 rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                Qtd
              </label>
              <div className="flex bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 p-1.5 focus-within:border-blue-600 transition-all items-center justify-center">
                <input
                  type="number"
                  placeholder="0"
                  value={currentQty || ''}
                  max={999}
                  onChange={(e) =>
                    onQuantityChange(Math.min(999, Math.max(1, Number(e.target.value))))
                  }
                  className="w-full bg-transparent outline-none font-bold text-sm text-center border-none focus:ring-0 p-0 text-slate-700 dark:text-slate-300 rounded-none"
                />
                <span className="text-[10px] font-black text-slate-400 ml-1">un</span>
              </div>
            </div>

            <div className="sm:col-span-3 flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                Custo unitário
              </label>
              <CurrencyInput
                showBadge={false}
                prefix="R$ "
                placeholder="R$ 0,00"
                value={currentCost || 0}
                onChange={(val) => onCostChange(val)}
                className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all text-center rounded-none"
              />
            </div>

            <div className="sm:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={onAddItemClick}
                className="py-2.5 px-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-1.5 font-bold shadow-md text-xs w-full"
              >
                <i className="bi bi-plus-lg text-lg font-black" />
                <span className="font-black uppercase tracking-wider">Adicionar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
