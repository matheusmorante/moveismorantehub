import React, { useId } from 'react';

const NameCompositionInfo: React.FC = () => {
  const tooltipId = useId();

  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label="Informações sobre a característica que compõe o nome"
        aria-describedby={tooltipId}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-500 dark:hover:text-blue-400"
      >
        <i className="bi bi-info-circle text-[11px]" aria-hidden="true" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-slate-200 bg-white p-3 text-[11px] font-medium normal-case leading-relaxed tracking-normal text-slate-600 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        A cor será acrescentada ao final do nome do produto, depois de um traço, para ajudar na
        identificação. Exemplo: Sofá Capri - Azul.
      </span>
    </span>
  );
};

export default NameCompositionInfo;
