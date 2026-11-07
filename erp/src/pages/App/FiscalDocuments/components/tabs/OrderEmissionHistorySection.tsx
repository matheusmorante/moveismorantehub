import React from 'react';
import type { NfeDocumentRecord } from '../../types/fiscalDocuments.types';
import { formatFiscalDateTime } from '../../utils/fiscalPresentationHelpers';
import { formatAccessKey } from '@/pages/utils/nfe/nfeAccessKey';
import { formatCurrency } from '@/pages/utils/formatters';
import { getFiscalDocumentStatusBadgeClass } from './fiscalDocumentStatusBadge';

interface Props {
  orderEmissions: NfeDocumentRecord[];
  currentDocumentId?: string;
  copiedKeyId: string | null;
  onSelectDocument?: (documentId: string) => void;
  onCopyKey: (id: string, key: string) => Promise<void>;
  onViewXml: (xml: string | null) => void;
  onPrint: (doc: NfeDocumentRecord) => Promise<void>;
  onDownload: (doc: NfeDocumentRecord) => Promise<void>;
}

export function OrderEmissionHistorySection({
  orderEmissions,
  currentDocumentId,
  copiedKeyId,
  onSelectDocument,
  onCopyKey,
  onViewXml,
  onPrint,
  onDownload,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
          <i className="bi bi-clock-history mr-1.5" />
          Histórico de Emissões do Pedido ({orderEmissions.length})
        </span>
        <div className="h-px flex-1 bg-blue-100 dark:bg-blue-950" />
      </div>

      <div className="space-y-2.5">
        {orderEmissions.map((doc, idx) => {
          const seq = idx + 1;
          const isCurrent = doc.id === currentDocumentId;
          const statusBadgeClass = getFiscalDocumentStatusBadgeClass(doc.status);

          return (
            <div
              key={doc.id}
              className={`rounded-2xl border p-4 shadow-sm transition sm:p-5 ${
                isCurrent
                  ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-400 dark:border-blue-800 dark:bg-blue-950/20'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {seq}ª
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {doc.modelo === '65' ? 'NFC-e' : 'NF-e'} nº {doc.numero_nfe || '—'} · Série {doc.serie || '1'}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {seq}ª Emissão · Modelo {doc.modelo} ·{' '}
                      {doc.ambiente === 2 ? 'Homologação' : 'Produção'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass}`}
                  >
                    {doc.status}
                  </span>
                  {doc.valor_total !== undefined && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {formatCurrency(doc.valor_total)}
                    </span>
                  )}
                  {isCurrent ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                      <i className="bi bi-eye mr-1" /> Em visualização
                    </span>
                  ) : (
                    onSelectDocument && (
                      <button
                        type="button"
                        onClick={() => onSelectDocument(doc.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-blue-700"
                      >
                        <i className="bi bi-arrow-right-circle" /> Ver detalhes
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Chave de acesso:</span>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    <span>{doc.chave_acesso ? formatAccessKey(doc.chave_acesso) : '—'}</span>
                    {doc.chave_acesso && (
                      <button
                        type="button"
                        onClick={() => void onCopyKey(doc.id, doc.chave_acesso)}
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/60"
                      >
                        <i
                          className={`bi ${copiedKeyId === doc.id ? 'bi-check-lg text-emerald-600' : 'bi-clipboard'}`}
                        />
                        {copiedKeyId === doc.id ? ' Copiada!' : ' Copiar'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 sm:justify-end">
                  {doc.numero_protocolo && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Protocolo SEFAZ:</span>
                      <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {doc.numero_protocolo}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Data de emissão:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatFiscalDateTime(doc.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {doc.xml_nfe && (
                  <button
                    type="button"
                    onClick={() => onViewXml(doc.xml_nfe || null)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <i className="bi bi-code-slash text-slate-500" /> Ver XML
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onPrint(doc)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  <i className="bi bi-printer-fill" /> Imprimir DANFE
                </button>
                <button
                  type="button"
                  onClick={() => void onDownload(doc)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <i className="bi bi-filetype-xml text-slate-500" /> Baixar XML
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
