import React from 'react';

interface SummaryXmlStatusBadgeProps {
  readonly onClick: () => void;
}

export const SummaryXmlStatusBadge: React.FC<SummaryXmlStatusBadgeProps> = ({ onClick }) => (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    aria-haspopup="dialog"
    aria-label="XML incompleto. Abrir instruções para obter o XML completo."
    className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase text-amber-800 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
  >
    <i className="bi bi-exclamation-triangle" aria-hidden="true" />
    XML incompleto
  </button>
);
