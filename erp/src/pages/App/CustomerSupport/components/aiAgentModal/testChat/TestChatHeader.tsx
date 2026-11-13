import React from 'react';

interface TestChatHeaderProps {
  onSaveTestCase: () => void;
  onBack: () => void;
  onOpenSettings: () => void;
  supportMode: 'automatico' | 'assistido' | 'humano';
  isAiAgentEnabled: boolean;
  isAgentStatusKnown: boolean;
}

export const TestChatHeader: React.FC<TestChatHeaderProps> = ({
  onSaveTestCase,
  onBack,
  onOpenSettings,
  supportMode,
  isAiAgentEnabled,
  isAgentStatusKnown,
}) => {
  const modeLabel = supportMode === 'assistido' ? 'Assistido' : supportMode === 'humano' ? 'Somente humano' : 'Automático';

  return (
    <header className="p-3 sm:px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-2xs z-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar para conversas"
            title="Voltar para conversas"
            className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <i className="bi bi-arrow-left text-base" aria-hidden="true" />
          </button>
          <div className="w-9 h-9 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
            <img
              src="/lizandro.png"
              alt=""
              className="h-full w-full object-cover"
              onError={({ currentTarget }) => { currentTarget.src = '/seu-lizandro.jpg'; }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Seu Lizandro
              </h2>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Sandbox Isolado</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Consultas reais ao ERP · Sem envio ao WhatsApp
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Configurações do agente de IA"
            title="Configurações do agente de IA"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
          >
            <i className="bi bi-gear" aria-hidden="true" />
            <span className="hidden sm:inline">Configurações</span>
          </button>
          <button
            type="button"
            onClick={onSaveTestCase}
            aria-label="Salvar esta conversa como caso de teste"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
            title="Salvar esta conversa como caso de teste"
          >
            <i className="bi bi-bookmark-plus" aria-hidden="true" />
            <span className="hidden sm:inline">Salvar Teste</span>
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span>Atendimento de clientes por IA</span>
            <span
              role="status"
              className={isAgentStatusKnown && isAiAgentEnabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}
            >
              {isAgentStatusKnown ? (isAiAgentEnabled ? 'Ligado' : 'Desligado') : 'Status não confirmado'}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            Modo: {modeLabel} · Restrito aos números de teste cadastrados.
          </p>
        </div>
      </div>
    </header>
  );
};
