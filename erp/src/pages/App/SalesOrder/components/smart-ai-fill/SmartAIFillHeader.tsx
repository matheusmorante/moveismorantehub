import React from 'react';
import { SmartAIFillTab } from './types';

interface SmartAIFillHeaderProps {
  activeTab: SmartAIFillTab;
  busy: boolean;
  onSelectTab: (tab: SmartAIFillTab) => void;
  onClose: () => void;
}

export const SmartAIFillHeader: React.FC<SmartAIFillHeaderProps> = ({
  activeTab,
  busy,
  onSelectTab,
  onClose,
}) => {
  return (
    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-violet-600/10 via-blue-600/10 to-transparent dark:from-violet-950/40 dark:via-blue-950/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
          <i className="bi bi-stars text-lg animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Preenchimento Inteligente IA
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-[9px] font-black uppercase text-white tracking-widest shadow-sm">
              Gemini 2.5
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            Fale ao vivo ou digite os dados e a IA estrutura o pedido instantaneamente
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            disabled={busy}
            onClick={() => onSelectTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <i className="bi bi-stars text-xs" /> IA & Voz
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSelectTab('json_manual')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'json_manual'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <i className="bi bi-filetype-json text-xs" /> JSON
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Fechar"
          className="w-8 h-8 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
        >
          <i className="bi bi-x-lg text-sm" />
        </button>
      </div>
    </div>
  );
};
