import React, { useState } from 'react';
import { toast } from 'react-toastify';
import type {
  FiscalOperationDraftSummary,
  NfeDocumentRecord,
} from '../../types/fiscalDocuments.types';
import { formatFiscalDateTime } from '../../utils/fiscalPresentationHelpers';
import { formatAccessKey } from '@/pages/utils/nfe/nfeAccessKey';
import { formatCurrency } from '@/pages/utils/formatters';
import { downloadXml, printDanfe } from '../../services/fiscalDanfeXmlService';
import { FiscalXmlViewer } from '../FiscalXmlViewer';

interface IssuedFiscalDocumentLinkedTabProps {
  linkedDocuments?: NfeDocumentRecord[];
  operationDrafts?: FiscalOperationDraftSummary[];
  orderEmissions?: NfeDocumentRecord[];
  currentDocumentId?: string;
  onSelectDocument?: (documentId: string) => void;
}

export function IssuedFiscalDocumentLinkedTab({
  linkedDocuments = [],
  operationDrafts = [],
  orderEmissions = [],
  currentDocumentId,
  onSelectDocument,
}: IssuedFiscalDocumentLinkedTabProps) {
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [viewingXml, setViewingXml] = useState<string | null>(null);

  const handleCopyKey = async (id: string, key: string) => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key.replace(/\s+/g, ''));
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handlePrint = async (doc: NfeDocumentRecord) => {
    try {
      await printDanfe(doc);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível abrir o DANFE.');
    }
  };

  const handleDownload = async (doc: NfeDocumentRecord) => {
    try {
      await downloadXml(doc);
      toast.success('XML baixado com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível baixar o XML.');
    }
  };

  // Segregar documentos por tipo
  const estornoDocs = linkedDocuments.filter((d) => d.document_type === 'estorno');
  const returnDocs = linkedDocuments.filter((d) => d.document_type === 'return');
  const otherLinkedDocs = linkedDocuments.filter(
    (d) => d.document_type !== 'estorno' && d.document_type !== 'return'
  );

  const estornoDrafts = operationDrafts.filter((d) => d.operation_kind === 'estorno');
  const returnDrafts = operationDrafts.filter((d) => d.operation_kind === 'return');

  const totalCount =
    linkedDocuments.length +
    operationDrafts.length +
    (orderEmissions.length > 1 ? orderEmissions.length : 0);

  if (totalCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <i className="bi bi-link-45deg" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Nenhum documento vinculado
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Esta nota fiscal não possui histórico de emissões anteriores, notas de estorno ou devoluções vinculadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho da aba */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
              <i className="bi bi-link-45deg text-xl" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Documentos vinculados ({totalCount})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Histórico de emissões, notas de estorno, devolução e procedimentos fiscais vinculados.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção A: Histórico de Emissões da Venda (1ª, 2ª, 3ª emissão...) */}
      {orderEmissions.length > 1 && (
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
              const isAuthorized = doc.status === 'autorizada' || doc.status === 'homologada';
              const statusBadgeClass = isAuthorized
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                : doc.status === 'cancelada'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300';

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
                            onClick={() => void handleCopyKey(doc.id, doc.chave_acesso)}
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
                        onClick={() => setViewingXml(doc.xml_nfe || null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <i className="bi bi-code-slash text-slate-500" /> Ver XML
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handlePrint(doc)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                    >
                      <i className="bi bi-printer-fill" /> Imprimir DANFE
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownload(doc)}
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
      )}

      {/* Seção B: Notas e Procedimentos de Estorno Fiscal */}
      {(estornoDocs.length > 0 || estornoDrafts.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              <i className="bi bi-arrow-counterclockwise mr-1.5" />
              Estorno Fiscal (finNFe=3)
            </span>
            <div className="h-px flex-1 bg-indigo-100 dark:bg-indigo-950" />
          </div>

          {/* Documentos de Estorno Autorizados */}
          {estornoDocs.map((doc) => {
            const isAuthorized = doc.status === 'autorizada' || doc.status === 'homologada';
            const statusBadgeClass = isAuthorized
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
              : doc.status === 'cancelada'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300';

            return (
              <div
                key={doc.id}
                className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                      <i className="bi bi-arrow-counterclockwise text-base" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        NF-e de Estorno nº {doc.numero_nfe || '—'} · Série {doc.serie || '1'}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Modelo 55 · Finalidade de Ajuste ·{' '}
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
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      Nota de estorno
                    </span>
                  </div>
                </div>

                {/* Detalhes da Nota de Estorno */}
                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Chave de acesso:</span>
                    <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                      <span>{doc.chave_acesso ? formatAccessKey(doc.chave_acesso) : '—'}</span>
                      {doc.chave_acesso && (
                        <button
                          type="button"
                          onClick={() => void handleCopyKey(doc.id, doc.chave_acesso)}
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

                {/* Ações da Nota de Estorno */}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {doc.xml_nfe && (
                    <button
                      type="button"
                      onClick={() => setViewingXml(doc.xml_nfe || null)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <i className="bi bi-code-slash text-slate-500" /> Ver XML
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handlePrint(doc)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                  >
                    <i className="bi bi-printer-fill" /> Imprimir DANFE
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownload(doc)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <i className="bi bi-filetype-xml text-slate-500" /> Baixar XML
                  </button>
                </div>
              </div>
            );
          })}

          {/* Rascunhos de Estorno em Andamento */}
          {estornoDrafts.map((draft) => {
            const draftStatusLabel =
              ({
                draft: 'Em elaboração',
                ready: 'Pronto para transmissão',
                authorized: 'Autorizado',
                cancelled: 'Cancelado',
                transmitting: 'Em transmissão',
                unknown: 'Confirmação pendente',
                rejected: 'Rejeitado',
              } as Record<string, string>)[draft.status] || draft.status;

            return (
              <div
                key={draft.id}
                className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/30 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                      <i className="bi bi-clock-history text-base" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Rascunho de NF-e de Estorno Fiscal (Modelo 55)
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Preparado em: {formatFiscalDateTime(draft.created_at)} ·{' '}
                        {draft.environment === 2 ? 'Homologação' : 'Produção'}
                      </span>
                    </div>
                  </div>

                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    {draftStatusLabel}
                  </span>
                </div>

                {draft.reason && (
                  <div className="mt-3 rounded-xl border border-indigo-100 bg-white/80 p-3 text-xs dark:border-indigo-900/40 dark:bg-slate-900/60">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Motivação:
                    </span>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">{draft.reason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Seção 2: Notas de Devolução Fiscal (NFD) */}
      {(returnDocs.length > 0 || returnDrafts.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <i className="bi bi-box-arrow-in-left mr-1.5" />
              Devolução Fiscal (finNFe=4)
            </span>
            <div className="h-px flex-1 bg-emerald-100 dark:bg-emerald-950" />
          </div>

          {returnDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                    <i className="bi bi-box-arrow-in-left text-base" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      NF-e de Devolução nº {doc.numero_nfe || '—'} · Série {doc.serie || '1'}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Modelo 55 · Finalidade de Devolução ·{' '}
                      {doc.ambiente === 2 ? 'Homologação' : 'Produção'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    {doc.status}
                  </span>
                  {doc.valor_total !== undefined && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {formatCurrency(doc.valor_total)}
                    </span>
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
                        onClick={() => void handleCopyKey(doc.id, doc.chave_acesso)}
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
                    onClick={() => setViewingXml(doc.xml_nfe || null)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <i className="bi bi-code-slash text-slate-500" /> Ver XML
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handlePrint(doc)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  <i className="bi bi-printer-fill" /> Imprimir DANFE
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownload(doc)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <i className="bi bi-filetype-xml text-slate-500" /> Baixar XML
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Seção 3: Outros Documentos Vinculados (ex: Substituta/Corrigida) */}
      {otherLinkedDocs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <i className="bi bi-file-earmark-check mr-1.5" />
              Documentos Relacionados
            </span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          {otherLinkedDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    NF-e nº {doc.numero_nfe || '—'} · Série {doc.serie || '1'}
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Modelo {doc.modelo} · {doc.ambiente === 2 ? 'Homologação' : 'Produção'}
                  </span>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {doc.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handlePrint(doc)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  <i className="bi bi-printer-fill" /> Imprimir DANFE
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownload(doc)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <i className="bi bi-filetype-xml text-slate-500" /> Baixar XML
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visualizador de XML Flutuante */}
      {viewingXml && (
        <FiscalXmlViewer xml={viewingXml} onClose={() => setViewingXml(null)} />
      )}
    </div>
  );
}
