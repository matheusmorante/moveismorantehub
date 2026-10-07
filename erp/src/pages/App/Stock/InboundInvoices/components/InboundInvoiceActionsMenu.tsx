import React from 'react';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

interface InboundInvoiceActionsMenuProps {
  readonly invoice: InboundInvoice;
  readonly isConfirmingDelete: boolean;
  readonly canManageMappings: boolean;
  readonly onClose: () => void;
  readonly onManageMappings: () => void;
  readonly onDownloadXml: () => void;
  readonly onStartDelete: () => void;
  readonly onCancelDelete: () => void;
  readonly onConfirmDelete: () => void;
}

export const InboundInvoiceActionsMenu: React.FC<InboundInvoiceActionsMenuProps> = ({
  invoice,
  isConfirmingDelete,
  canManageMappings,
  onClose,
  onManageMappings,
  onDownloadXml,
  onStartDelete,
  onCancelDelete,
  onConfirmDelete,
}) => (
  <div
    role="menu"
    aria-label="Opções da nota fiscal"
    className="absolute right-0 z-[100] mt-1 w-48 rounded-2xl border border-slate-100 bg-white py-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95"
  >
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

    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

    {isConfirmingDelete ? (
      <div className="px-4 py-2 space-y-1.5">
        <p className="text-[10px] font-bold text-red-600 dark:text-red-400">
          Confirmar remoção?
        </p>
        <p className="text-[9px] text-slate-400">Recebimentos e vínculos não são afetados.</p>
        <div className="flex gap-2 pt-0.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onConfirmDelete();
            }}
            className="flex-1 rounded-lg bg-red-600 py-1 text-[10px] font-black text-white hover:bg-red-700 cursor-pointer"
          >
            Remover
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCancelDelete();
            }}
            className="flex-1 rounded-lg bg-slate-100 py-1 text-[10px] font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    ) : (
      <button
        type="button"
        role="menuitem"
        onClick={(event) => {
          event.stopPropagation();
          onStartDelete();
        }}
        className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
      >
        <i className="bi bi-trash3 text-sm" aria-hidden="true" />
        Remover NF de entrada
      </button>
    )}
  </div>
);
