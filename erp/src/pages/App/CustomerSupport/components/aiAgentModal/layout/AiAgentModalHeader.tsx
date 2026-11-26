import React, { memo } from 'react';

export interface AiAgentModalHeaderProps {
  onClose: () => void;
}

export const AiAgentModalHeader: React.FC<AiAgentModalHeaderProps> = memo(({ onClose }) => (
  <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
    <div className="flex min-w-0 items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
        <i className="bi bi-robot text-lg" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id="ai-agent-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 break-words">
            Treinamento do Seu Lizandro
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
            Fase de Testes
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Ajuste comportamento, conhecimento, procedimentos e ferramentas; valide as respostas em sandbox.
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label="Fechar configurações do agente"
      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
    >
      <i className="bi bi-x-lg text-sm" aria-hidden="true" />
    </button>
  </div>
));

AiAgentModalHeader.displayName = 'AiAgentModalHeader';
