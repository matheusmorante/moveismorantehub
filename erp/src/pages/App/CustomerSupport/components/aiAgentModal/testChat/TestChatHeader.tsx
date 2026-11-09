import React from 'react';

interface TestChatHeaderProps {
  onSaveTestCase: () => void;
  onNewConversation: () => void;
}

export const TestChatHeader: React.FC<TestChatHeaderProps> = ({
  onSaveTestCase,
  onNewConversation,
}) => {
  return (
    <div className="p-3 sm:px-4 sm:py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-2xs z-10">
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-sm shadow-xs">
            <i className="bi bi-robot" aria-hidden="true" />
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute -bottom-0.5 -right-0.5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Lizandro — Chat de Testes do Agente
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Sandbox Isolado
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Consultas reais ao ERP · Sem envio externo · Multi-turnos ativos
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onSaveTestCase}
          className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
          title="Salvar esta conversa como caso de teste"
        >
          <i className="bi bi-bookmark-plus text-xs" />
          <span className="hidden sm:inline">Salvar Teste</span>
        </button>

        <button
          type="button"
          onClick={onNewConversation}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer flex items-center gap-1"
          title="Reiniciar sessão do chat"
        >
          <i className="bi bi-arrow-clockwise text-xs" />
          <span>Nova Conversa</span>
        </button>
      </div>
    </div>
  );
};
