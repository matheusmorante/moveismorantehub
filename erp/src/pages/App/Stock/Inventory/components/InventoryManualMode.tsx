import React, { useState } from 'react';
import type { AuditItem } from '../types/inventoryAudit.types';

import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import ProductSearchModal from '@/pages/App/SalesOrder/modals/ProductSearchModal';

interface InventoryManualModeProps {
  readonly items: readonly AuditItem[];
  readonly onUpdateCount: (id: string, count: number | null) => void;
  readonly isCustom?: boolean;
  readonly onUpdateItemProduct?: (itemId: string, product: Product, variation?: Variation) => void;
}

export const InventoryManualMode: React.FC<InventoryManualModeProps> = ({
  items,
  onUpdateCount,
  isCustom,
  onUpdateItemProduct,
}) => {
  const [itemSearchOpen, setItemSearchOpen] = useState<string | null>(null);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-3">
        {items.map((item) => {
          const isCounted = item.physicalCount !== null;
          const diff = isCounted ? item.physicalCount! - item.systemStock : 0;

          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-slate-800 border ${isCounted ? 'border-emerald-500/30 dark:border-emerald-500/20' : 'border-slate-200 dark:border-slate-700'} rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {item.productId === '' ? (
                    <div className="w-full relative z-50">
                      <button
                        onClick={() => setItemSearchOpen(item.id)}
                        className="w-full text-left bg-transparent border-0 border-b-2 border-slate-300 dark:border-slate-600 rounded-none px-1 py-1.5 focus:ring-0 focus:border-emerald-500 text-base font-bold text-slate-800 dark:text-slate-100 placeholder:font-normal text-slate-400"
                      >
                        Pesquisar produto...
                      </button>
                      {itemSearchOpen === item.id && (
                        <ProductSearchModal
                          onSelect={(p, v) => {
                            onUpdateItemProduct?.(item.id, p, v);
                            setItemSearchOpen(null);
                          }}
                          onClose={() => setItemSearchOpen(null)}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <h4
                        className={`font-bold min-w-0 flex-1 whitespace-normal break-words text-base ${isCustom ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}
                      >
                        {item.name}
                      </h4>
                      {isCustom && (
                        <i className="bi bi-check-circle-fill text-emerald-500 text-lg shrink-0"></i>
                      )}
                    </div>
                  )}
                  {isCounted && item.productId !== '' && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      Sistema
                    </span>
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      {item.systemStock} {item.unit}
                    </span>
                  </div>
                  {isCounted && diff !== 0 && (
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        Ajuste
                      </span>
                      <span
                        className={`font-bold ${diff > 0 ? 'text-emerald-600' : 'text-rose-500'}`}
                      >
                        {diff > 0 ? '+' : ''}
                        {diff}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl sm:shrink-0 w-full sm:w-auto justify-between sm:justify-center">
                <button
                  onClick={() => onUpdateCount(item.id, Math.max(0, (item.physicalCount || 0) - 1))}
                  disabled={(item.physicalCount ?? 0) <= 0}
                  className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-rose-600 hover:bg-rose-700 border border-rose-700 text-white disabled:opacity-50 disabled:cursor-not-allowed text-2xl sm:text-lg shadow-sm active:scale-95 transition-all"
                >
                  <i className="bi bi-dash text-white"></i>
                </button>

                <div className="flex flex-col items-center min-w-[50px]">
                  <input
                    type="number"
                    value={item.physicalCount ?? 0}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') onUpdateCount(item.id, 0);
                      else onUpdateCount(item.id, Math.max(0, parseInt(val, 10) || 0));
                    }}
                    placeholder="-"
                    className="inventory-count-input w-full text-center bg-transparent text-xl font-black text-slate-800 dark:text-slate-100 outline-none p-0 focus:ring-0 border-0"
                  />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Contado
                  </span>
                </div>

                <button
                  onClick={() => onUpdateCount(item.id, (item.physicalCount || 0) + 1)}
                  className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-2xl sm:text-lg shadow-sm active:scale-95 transition-all"
                >
                  <i className="bi bi-plus text-white"></i>
                </button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Nenhum item disponível neste inventário.
          </div>
        )}
      </div>
    </div>
  );
};
