import React from 'react';

export const SCENARIO_SUGGESTIONS = [
  'Qual o preço do Sofá Retrátil Madri no catálogo?',
  'Vocês têm guarda-roupa 6 portas em estoque?',
  'Como funciona o frete e entrega para Colombo?',
  'Vocês parcelam em até 10x sem juros no cartão?',
  'Quero falar com um atendente humano por favor',
  'O guarda-roupa que comprei veio com defeito e peça riscada',
];

interface TestChatQuickScenariosProps {
  isGenerating: boolean;
  onSelectScenario: (scenario: string) => void;
}

export const TestChatQuickScenarios: React.FC<TestChatQuickScenariosProps> = ({
  isGenerating,
  onSelectScenario,
}) => {
  return (
    <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 min-w-max">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 select-none">
          Cenários:
        </span>
        {SCENARIO_SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isGenerating}
            onClick={() => onSelectScenario(s)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};
