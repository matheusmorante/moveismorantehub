import React from 'react';

export const QUICK_TEST_QUERIES = [
  'Qual o preço do Sofá Retrátil no catálogo de vocês?',
  'Qual o valor do frete e o prazo de entrega para Colombo?',
  'Vocês parcelam em até 10 vezes no cartão? Tem desconto no Pix?',
  'Vocês montam os móveis ou cobram montador por fora?',
  'Quero falar com um atendente humano por favor',
  'O guarda-roupa que recebi veio com defeito e peça riscada',
];

interface SimulatorInputCardProps {
  testInput: string;
  setTestInput: (value: string) => void;
  isRunningReal: boolean;
  onRunDiagnosis: (query?: string) => void;
  onRunRealSimulation: (query?: string) => void;
}

export const SimulatorInputCard: React.FC<SimulatorInputCardProps> = ({
  testInput,
  setTestInput,
  isRunningReal,
  onRunDiagnosis,
  onRunRealSimulation,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
        Mensagem Simulada do Cliente
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onRunDiagnosis();
            }
          }}
          placeholder="Digite a mensagem do cliente para testar..."
          className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onRunDiagnosis()}
            disabled={isRunningReal}
            className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Analisa situação, palavras-chave e artigos sem chamar a IA"
          >
            <i className="bi bi-cpu text-xs" aria-hidden="true" />
            Diagnóstico Rápido
          </button>

          <button
            type="button"
            onClick={() => onRunRealSimulation()}
            disabled={isRunningReal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            title="Executa o assistente real com Function Calling no banco do ERP (sem envio ao WhatsApp)"
          >
            {isRunningReal ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Executando IA...
              </>
            ) : (
              <>
                <i className="bi bi-play-circle-fill text-sm" aria-hidden="true" />
                Simular com IA + ERP
              </>
            )}
          </button>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
          Exemplos Rápidos para Testar:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TEST_QUERIES.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setTestInput(q);
                onRunDiagnosis(q);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
