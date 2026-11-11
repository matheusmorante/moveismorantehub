import React, { memo } from 'react';

export type AiAgentTabKey =
  | 'visao_geral'
  | 'regras_situacoes'
  | 'base_conhecimento'
  | 'fluxos'
  | 'ferramentas'
  | 'limites_cotas'
  | 'prompt';

export interface TabItem {
  key: AiAgentTabKey;
  label: string;
  icon: string;
  badge?: string | number;
}

export interface AiAgentModalTabsProps {
  activeTab: AiAgentTabKey;
  onTabChange: (tab: AiAgentTabKey) => void;
  knowledgeCount?: number;
  rulesCount?: number;
}

export const AiAgentModalTabs: React.FC<AiAgentModalTabsProps> = memo(({
  activeTab,
  onTabChange,
  knowledgeCount,
  rulesCount,
}) => {
  const tabs: TabItem[] = [
    { key: 'visao_geral', label: 'Visão Geral', icon: 'bi-speedometer2' },
    {
      key: 'regras_situacoes',
      label: 'Regras & Frases',
      icon: 'bi-diagram-3',
      badge: rulesCount,
    },
    {
      key: 'base_conhecimento',
      label: 'Conhecimento',
      icon: 'bi-book',
      badge: knowledgeCount,
    },
    { key: 'fluxos', label: 'Fluxos', icon: 'bi-signpost-split' },
    { key: 'ferramentas', label: 'Ferramentas ERP', icon: 'bi-tools' },
    { key: 'limites_cotas', label: 'Limites & Cotas', icon: 'bi-shield-check' },
    { key: 'prompt', label: 'Instruções', icon: 'bi-chat-square-text' },
  ];

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-3 sm:px-6 shrink-0 overflow-x-auto no-scrollbar">
      <nav className="flex space-x-1 sm:space-x-2 py-2 min-w-max" aria-label="Abas de configuração do Agente de IA">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <i className={`bi ${tab.icon} text-sm ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} aria-hidden="true" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                      : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
});

AiAgentModalTabs.displayName = 'AiAgentModalTabs';
