import React from 'react';

interface NfeEnvironmentSelectorProps {
  environment: 1 | 2;
  onSelect: (env: 1 | 2) => void;
  disabled?: boolean;
  isHmlIssued?: boolean;
  isProdIssued?: boolean;
}

export const NfeEnvironmentSelector: React.FC<NfeEnvironmentSelectorProps> = ({
  environment,
  onSelect,
  disabled = false,
  isHmlIssued = false,
  isProdIssued = false,
}) => {
  const isHmlDisabled = disabled || isHmlIssued;
  const isProdDisabled = disabled || isProdIssued;

  return (
    <div
      role="radiogroup"
      aria-label="Ambiente de emissão"
      className="inline-flex items-center rounded-xl bg-slate-200/80 p-1 border border-slate-300/70 dark:bg-slate-800 dark:border-slate-700/80"
    >
      {/* Botão Liga/Desliga: Homologação */}
      <label
        title={isHmlIssued ? 'Nota fiscal de homologação já emitida para este pedido.' : undefined}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all select-none ${
          isHmlDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${
          environment === 2
            ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-600/30'
            : isHmlDisabled
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
        }`}
      >
        <input
          type="radio"
          name="nfe-environment"
          aria-label="Homologação"
          value={2}
          checked={environment === 2}
          disabled={isHmlDisabled}
          onChange={() => {
            if (!isHmlDisabled) onSelect(2);
          }}
          className="sr-only"
        />
        <span
          className={`h-2 w-2 rounded-full ${environment === 2 ? 'bg-white' : 'bg-amber-500/70'}`}
        />
        <span>Homologação</span>
      </label>

      {/* Botão Liga/Desliga: Produção */}
      <label
        title={isProdIssued ? 'Nota fiscal de produção já emitida para este pedido.' : undefined}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all select-none ${
          isProdDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${
          environment === 1
            ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-700/30'
            : isProdDisabled
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
        }`}
      >
        <input
          type="radio"
          name="nfe-environment"
          aria-label="Produção"
          value={1}
          checked={environment === 1}
          disabled={isProdDisabled}
          onChange={() => {
            if (!isProdDisabled) onSelect(1);
          }}
          className="sr-only"
        />
        <span
          className={`h-2 w-2 rounded-full ${environment === 1 ? 'bg-white' : 'bg-rose-500/70'}`}
        />
        <span>Produção</span>
      </label>
    </div>
  );
};
