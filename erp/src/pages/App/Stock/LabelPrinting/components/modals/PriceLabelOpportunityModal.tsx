import React from 'react';
import { Opportunity } from '../../types/PriceLabelArtEditorTypes';

export interface PriceLabelOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  allOppOptions: Opportunity[];
  selectedOppId: string;
  onSelectOpportunityView: (oppId: string) => void;
}

export const PriceLabelOpportunityModal: React.FC<PriceLabelOpportunityModalProps> = ({
  isOpen,
  onClose,
  allOppOptions,
  selectedOppId,
  onSelectOpportunityView,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{ zIndex: 9999 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <i className="bi bi-tag-fill text-lg" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                Visão do produto
              </h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">
                Muda somente o contexto e as cores
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="bi bi-x-lg text-xs" />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-3">
          {allOppOptions.map(opp => {
            const isSelectedOpp = selectedOppId === opp.id;
            return (
              <button
                key={opp.id}
                type="button"
                onClick={() => {
                  onSelectOpportunityView(opp.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelectedOpp
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 active:scale-95'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50/50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isSelectedOpp ? 'bg-white ring-2 ring-white/40' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <span className="text-xs font-black uppercase tracking-wider">{opp.name}</span>
                </div>

                {isSelectedOpp ? (
                  <span className="text-[10px] font-black uppercase bg-white/20 px-3 py-1 rounded-xl tracking-wider">
                    SELECIONADO
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 uppercase">
                    Visualizar
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
