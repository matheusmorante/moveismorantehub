import React from 'react';
import type { ReturnFiscalEligibility, ReturnFiscalSourceEligibility, SourceDocument } from '../types/fiscalOperationDraft.types';

interface ReturnFiscalSourcePickerModalProps {
  eligibility: ReturnFiscalEligibility;
  onClose: () => void;
  onSelect: (source: SourceDocument, draftId: string | null) => void;
  onView: (documentId: string, environment: 1 | 2) => void;
}

function sourceAction(source: ReturnFiscalSourceEligibility): string {
  if (source.state === 'authorized') return 'Visualizar NF-e autorizada';
  if (source.state === 'pending') return 'Consultar transmissão pendente';
  if (source.state === 'rejected') return 'Revisar rejeição e continuar';
  if (source.state === 'draft') return 'Continuar rascunho fiscal';
  return 'Preparar NF-e de devolução';
}

export function ReturnFiscalSourcePickerModal({
  eligibility,
  onClose,
  onSelect,
  onView,
}: ReturnFiscalSourcePickerModalProps) {
  return (
    <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="return-fiscal-source-title">
      <section className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 id="return-fiscal-source-title" className="text-base font-black text-slate-900 dark:text-white">
              NF-e original da devolução
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Selecione a NF-e vinculada aos itens e quantidades devolvidos. Cada rascunho permanece no ambiente da NF-e original.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">
            <i className="bi bi-x-lg" />
          </button>
        </header>

        <main className="space-y-3 overflow-y-auto p-5">
          {!eligibility.eligible && (
            <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              {eligibility.reason || 'A devolução não está elegível para emissão fiscal.'}
            </div>
          )}
          {eligibility.sources.map((entry, index) => {
            const source = entry.source;
            const canOpen = Boolean(source && entry.state !== 'blocked' && entry.state !== 'cancelled');
            return (
              <article key={source?.id || `invalid-${index}`} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black">
                      {source ? `NF-e ${source.serie}/${source.numero_nfe}` : 'Documento original sem validação'}
                    </h3>
                    {source && (
                      <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
                        {source.chave_acesso} · {source.ambiente === 1 ? 'Produção' : 'Homologação'}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${entry.state === 'authorized' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : entry.state === 'blocked' || entry.state === 'cancelled' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200' : 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200'}`}>
                    {entry.state === 'authorized' ? 'Autorizada' : entry.state === 'pending' ? 'Pendente' : entry.state === 'rejected' ? 'Rejeitada' : entry.state === 'cancelled' ? 'Cancelada' : entry.state === 'blocked' ? 'Bloqueada' : entry.state === 'draft' ? 'Rascunho' : 'Disponível'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {entry.allocatedItems.map((item, itemIndex) => (
                    <span key={`${item.returnItemIndex}-${item.originalItemNumber}-${itemIndex}`} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Devolução item {item.returnItemIndex + 1} → original {item.originalItemNumber} · {item.productCode || 'produto'} · qtd. {item.quantity}
                    </span>
                  ))}
                </div>

                {entry.blockReason && <p className="text-xs text-rose-700 dark:text-rose-300">{entry.blockReason}</p>}

                {canOpen && source && (
                  <button
                    type="button"
                    onClick={() => {
                      if (entry.state === 'authorized' && entry.returnDocumentId) {
                        onView(entry.returnDocumentId, source.ambiente);
                      } else {
                        onSelect(source, entry.draftId);
                      }
                    }}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700"
                  >
                    {sourceAction(entry)}
                  </button>
                )}
              </article>
            );
          })}
        </main>
      </section>
    </div>
  );
}
