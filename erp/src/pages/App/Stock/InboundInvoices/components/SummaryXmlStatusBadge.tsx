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
    aria-label="NF incompleta. Obter XML da nota fiscal."
    title="Obter XML da nota fiscal"
    className="inline-flex items-center gap-1 rounded-full border border-red-200/60 bg-red-50 px-2.5 py-1 text-[9px] font-black uppercase text-red-800 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50"
  >
    <i className="bi bi-exclamation-triangle text-red-700 dark:text-red-300" aria-hidden="true" />
    <span>NF incompleta</span>
    <span className="normal-case font-bold text-blue-700 underline underline-offset-2 dark:text-blue-300">
      Obter XML
    </span>
  </button>
);
