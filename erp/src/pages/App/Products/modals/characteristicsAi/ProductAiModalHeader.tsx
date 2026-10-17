import React from 'react';

interface ProductAiModalHeaderProps {
  phase: 'input' | 'preview';
  activeMode: 'web_search' | 'descriptive_text';
  isAnalyzing: boolean;
  onClose: () => void;
}

export const ProductAiModalHeader: React.FC<ProductAiModalHeaderProps> = ({
  phase,
  activeMode,
  isAnalyzing,
  onClose,
}) => {
  return (
    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shadow-sm">
          <i className="bi bi-stars" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3
              id="ai-characteristics-modal-title"
              className="text-sm font-bold text-slate-800 dark:text-slate-100"
            >
              {phase === 'input'
                ? 'Preenchimento Inteligente do Cadastro'
                : 'Revisão das Informações Sugeridas pela IA'}
            </h3>
            <span className="text-[10px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {activeMode === 'web_search' ? 'Pesquisa Web' : 'Texto Descritivo'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {phase === 'input'
              ? 'Escolha a forma de preenchimento automático para preencher dados e especificações'
              : 'Revise os campos sugeridos, desmarque o que não quiser e edite os valores'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={isAnalyzing}
        aria-label="Fechar modal"
        className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
      >
        <i className="bi bi-x-lg text-xs" />
      </button>
    </div>
  );
};
