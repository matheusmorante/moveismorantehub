import React from 'react';
import type { FiscalOrderEditAudit } from '@/pages/utils/nfe/orderEditFiscalService';

interface FiscalOrderEditConfirmDialogProps {
  readonly audit: FiscalOrderEditAudit;
  readonly isConfirmingFiscalEdit: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export const FiscalOrderEditConfirmDialog: React.FC<FiscalOrderEditConfirmDialogProps> = ({
  audit,
  isConfirmingFiscalEdit,
  onCancel,
  onConfirm,
}) => {
  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fiscal-order-edit-title"
    >
      <section className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-amber-100 bg-amber-50 px-6 py-5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <h3
            id="fiscal-order-edit-title"
            className="text-lg font-black text-slate-900 dark:text-white"
          >
            Alterações na nota fiscal
          </h3>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            As alterações abaixo divergem de documento(s) autorizado(s). Para continuar, o ERP
            registrará a proposta e abrirá as etapas de reversão e nova emissão. O pedido e o
            estoque serão atualizados juntos após a confirmação da reversão fiscal.
          </p>
          {audit.documents.some((document) => document.environment === 1) && (
            <p className="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
              Esta substituição envolve documento em Produção. Cada transmissão será confirmada na
              etapa fiscal correspondente.
            </p>
          )}
        </div>
        <div className="max-h-[52vh] overflow-y-auto px-6 py-4">
          {audit.documents.map((document) => (
            <div
              key={document.id}
              className="mb-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <h4 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                {document.model === '65' ? 'NFC-e' : 'NF-e'} ·{' '}
                {document.environment === 2 ? 'Homologação' : 'Produção'}
              </h4>
              <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Procedimento:{' '}
                {document.action === 'cancel'
                  ? 'cancelamento'
                  : 'estorno, com revisão fiscal antes da transmissão'}
                .
              </p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {document.changes.map((change, index) => (
                  <li key={`${change.field}-${index}`}>
                    <strong>{change.field}</strong>: autorizado “{String(change.expected)}”; edição
                    “{String(change.actual)}”
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            disabled={isConfirmingFiscalEdit}
            onClick={onCancel}
            className="rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200"
          >
            Voltar à edição
          </button>
          <button
            type="button"
            disabled={isConfirmingFiscalEdit}
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {isConfirmingFiscalEdit
              ? 'Confirmando substituição…'
              : 'Confirmar substituição fiscal'}
          </button>
        </div>
      </section>
    </div>
  );
};
