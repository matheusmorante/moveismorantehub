import React from 'react';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

interface InboundInvoiceActionsMenuProps {
  readonly invoice: InboundInvoice;
  readonly canManageMappings: boolean;
  readonly canGenerateReceipt: boolean;
  readonly canPrintIdentificationLabels: boolean;
  readonly onClose: () => void;
  readonly onManageMappings: () => void;
  readonly onGenerateReceipt: () => void;
  readonly onPrintIdentificationLabels: () => void;
  readonly onDownloadXml: () => void;
}

export const InboundInvoiceActionsMenu: React.FC<InboundInvoiceActionsMenuProps> = ({
  invoice,
  canManageMappings,
  canGenerateReceipt,
  canPrintIdentificationLabels,
  onClose,
  onManageMappings,
  onGenerateReceipt,
  onPrintIdentificationLabels,
  onDownloadXml,
}) => (
  <div
    role="menu"
    aria-label="Opções da nota fiscal"
    className="absolute right-0 z-[100] mt-1 w-56 rounded-2xl border border-slate-100 bg-white py-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95"
  >
    {canPrintIdentificationLabels && (
      <button
        type="button"
        role="menuitem"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
          onPrintIdentificationLabels();
        }}
        className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800 cursor-pointer"
      >
        <i className="bi bi-qr-code text-blue-600 text-sm" aria-hidden="true" />
        Imprimir etiquetas de identificação
      </button>
    )}

    {canGenerateReceipt && (
      <button
        type="button"
        role="menuitem"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
          onGenerateReceipt();
        }}
        className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800 cursor-pointer"
      >
        <i className="bi bi-clipboard-check text-emerald-600 text-sm" aria-hidden="true" />
        Gerar recebimento
      </button>
    )}

    {canManageMappings && (
      <button
        type="button"
        role="menuitem"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
          onManageMappings();
        }}
        className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
      >
        <i className="bi bi-link-45deg text-blue-600 text-sm" aria-hidden="true" />
        Gerenciar vínculos
      </button>
    )}

    {invoice.rawXml && (
      <button
        type="button"
        role="menuitem"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
          onDownloadXml();
        }}
        className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
      >
        <i className="bi bi-download text-slate-400 text-sm" aria-hidden="true" />
        Baixar XML
      </button>
    )}

  </div>
);
