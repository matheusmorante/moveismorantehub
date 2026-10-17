import React from 'react';
import type Order from '@/pages/types/order.type';
import type { AssistanceItem } from '@/pages/types/order.type';
import { formatToBRDate } from '@/pages/utils/formatters';
import { formatOrderCode } from '@/pages/utils/orderCode';

export interface AssistanceLinkedOrderSectionProps {
  currentLinkedOrder: Order;
  selectedAssistanceItems: AssistanceItem[];
  handleToggleItem: (desc: string, max: number) => void;
  handleUpdateItemQty: (desc: string, qty: number, max: number) => void;
}

const AssistanceLinkedOrderSection: React.FC<AssistanceLinkedOrderSectionProps> = ({
  currentLinkedOrder,
  selectedAssistanceItems,
  handleToggleItem,
  handleUpdateItemQty,
}) => {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-[2.5rem] bg-indigo-50/60 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/40 shadow-sm transition-all animate-slide-up">
      {/* Cabeçalho do Vínculo com a Venda Original */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-md shadow-indigo-300 dark:shadow-indigo-950/50">
            <i className="bi bi-link-45deg text-white text-xl" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
                Pedido de Venda Vinculado
              </span>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-200 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                Venda Atendida
              </span>
            </div>
            <h4 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
              #{formatOrderCode(currentLinkedOrder)} — {currentLinkedOrder.customerData?.fullName || 'Cliente'}
            </h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
              <span>Data da Venda: {formatToBRDate(currentLinkedOrder.date)}</span>
              {currentLinkedOrder.seller && <span>Vendedor: {currentLinkedOrder.seller}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Itens do Pedido Original Elegíveis para Assistência */}
      <div className="flex flex-col gap-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/40">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <i className="bi bi-box-seam text-indigo-500" />
            Selecione os Itens com Defeito / Sob Assistência
          </label>
          <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 rounded-full">
            {selectedAssistanceItems.length} selecionado(s)
          </span>
        </div>

        {(!currentLinkedOrder.items || currentLinkedOrder.items.length === 0) ? (
          <p className="text-xs text-slate-400 italic py-2">Nenhum produto listado no pedido de venda original.</p>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {currentLinkedOrder.items.map((item, idx) => {
              const isSelected = selectedAssistanceItems.some(
                (i) => i.description === item.description
              );
              const selectedItem = selectedAssistanceItems.find(
                (i) => i.description === item.description
              );

              return (
                <div
                  key={`${item.description}-${idx}`}
                  className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-800 cursor-pointer'
                  }`}
                  onClick={() => handleToggleItem(item.description, item.quantity)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && (
                        <i className="bi bi-check-lg text-white text-[11px] font-black" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                        {item.description}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Qtd na Venda: {item.quantity}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-indigo-100 dark:border-indigo-900/40 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateItemQty(
                            item.description,
                            (selectedItem?.quantity || 1) - 1,
                            item.quantity
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 shadow-sm transition-all"
                        aria-label="Diminuir quantidade"
                      >
                        <i className="bi bi-dash-lg text-xs" />
                      </button>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 min-w-[20px] text-center">
                        {selectedItem?.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateItemQty(
                            item.description,
                            (selectedItem?.quantity || 1) + 1,
                            item.quantity
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 shadow-sm transition-all"
                        aria-label="Aumentar quantidade"
                      >
                        <i className="bi bi-plus-lg text-xs" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistanceLinkedOrderSection;
