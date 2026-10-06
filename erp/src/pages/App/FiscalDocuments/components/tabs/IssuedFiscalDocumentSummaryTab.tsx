import React, { useState } from 'react';
import { formatCurrency } from '@/pages/utils/formatters';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { formatAccessKey } from '@/pages/utils/nfe/nfeAccessKey';
import { getAuthorizedAt } from '@/pages/utils/nfe/nfeEventRules';
import type {
  FiscalDocumentDetails,
  NfeDocumentRecord,
  ParsedFiscalDetails,
} from '../../types/fiscalDocuments.types';
import {
  formatFiscalDateTime,
  getDestinationLabel,
  getEnvironmentLabel,
  getFinalConsumerLabel,
  getFiscalModelLabel,
  getInvoicePurposeLabel,
  getOperationTypeLabel,
  getPresenceLabel,
} from '../../utils/fiscalPresentationHelpers';
import { FiscalDocumentStatusBadge } from '../FiscalDocumentStatusBadge';

interface IssuedFiscalDocumentSummaryTabProps {
  emissionResult?: NfeEmissionResult;
  fallbackDocument?: NfeDocumentRecord;
  details: FiscalDocumentDetails | null;
  parsed: ParsedFiscalDetails | null;
}

export function IssuedFiscalDocumentSummaryTab({
  emissionResult,
  fallbackDocument,
  details,
  parsed,
}: IssuedFiscalDocumentSummaryTabProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedRefKey, setCopiedRefKey] = useState(false);

  const document = details?.document || fallbackDocument;
  const general = parsed?.general;
  const authorizedAt = details
    ? getAuthorizedAt(details.document.xml_protocolo || '', details.document.created_at)
    : emissionResult?.protocolDate || fallbackDocument?.created_at || '';

  const total =
    general?.total || (document?.valor_total !== undefined ? String(document.valor_total) : '');
  const accessKey = document?.chave_acesso || emissionResult?.accessKey || '';
  const refKey = general?.referencedKey || '';
  const docModel = document?.modelo || emissionResult?.model || general?.model || '55';
  const docEnv = document?.ambiente ?? emissionResult?.environment ?? 1;
  const docStatus = document?.status || (docEnv === 2 ? 'homologada' : 'autorizada');

  const handleCopyAccessKey = async (key: string, isRef = false) => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key.replace(/\s+/g, ''));
      if (isRef) {
        setCopiedRefKey(true);
        setTimeout(() => setCopiedRefKey(false), 2000);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-4">
      {/* Card Principal: Resumo Executivo da Nota */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {getFiscalModelLabel(docModel)}
              </span>
            </div>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100 sm:text-xl">
              Nº {document?.numero_nfe ?? emissionResult?.nfeNumber ?? general?.number ?? '—'} · Série{' '}
              {document?.serie || emissionResult?.series || general?.series || '1'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Emitida em {formatFiscalDateTime(general?.issueDate || authorizedAt)}
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-left dark:border-blue-900/40 dark:bg-slate-950/50 sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Valor total da nota
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 sm:text-2xl">
              {total ? formatCurrency(Number(total) || 0) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Seções: Identificação e Autorização */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Bloco 1: Dados da Emissão e Finalidade */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <i className="bi bi-file-earmark-text text-blue-600 dark:text-blue-400" />
            Dados da operação
          </h4>
          <dl className="divide-y divide-slate-100 text-xs dark:divide-slate-800/80">
            <div className="flex justify-between py-2">
              <dt className="text-slate-500 dark:text-slate-400">Natureza da operação</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                {general?.natureOperation || '—'}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500 dark:text-slate-400">Finalidade</dt>
              <dd className="font-semibold text-blue-700 dark:text-blue-400 text-right">
                {getInvoicePurposeLabel(general?.purpose)}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500 dark:text-slate-400">Tipo de operação</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                {getOperationTypeLabel(general?.operationType)}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500 dark:text-slate-400">Consumidor final</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                {getFinalConsumerLabel(general?.finalConsumer)}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500 dark:text-slate-400">Destino</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                {getDestinationLabel(general?.destination)}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500 dark:text-slate-400">Presença do comprador</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                {getPresenceLabel(general?.presence)}
              </dd>
            </div>
            {general?.exitDate && (
              <div className="flex justify-between py-2">
                <dt className="text-slate-500 dark:text-slate-400">Saída da mercadoria</dt>
                <dd className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                  {formatFiscalDateTime(general.exitDate)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Bloco 2: Autorização e Protocolo SEFAZ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <i className="bi bi-shield-check text-emerald-600 dark:text-emerald-400" />
            Autorização SEFAZ
          </h4>
          <dl className="divide-y divide-slate-100 text-xs dark:divide-slate-800/80">
            <div className="flex justify-between py-2">
              <dt className="text-slate-500 dark:text-slate-400">Situação</dt>
              <dd className="font-bold text-slate-800 dark:text-slate-200 capitalize text-right">
                {docStatus}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500 dark:text-slate-400">Protocolo SEFAZ</dt>
              <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-right">
                {document?.numero_protocolo || emissionResult?.protocolNumber || '—'}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500 dark:text-slate-400">Data autorização</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                {formatFiscalDateTime(authorizedAt)}
              </dd>
            </div>
          </dl>

          {/* Chave de Acesso com botão Copiar */}
          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                Chave de acesso
              </span>
              <button
                type="button"
                onClick={() => void handleCopyAccessKey(accessKey)}
                disabled={!accessKey}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-950/60"
              >
                <i className={`bi ${copiedKey ? 'bi-check-lg text-emerald-600' : 'bi-clipboard'}`} />
                {copiedKey ? 'Copiada!' : 'Copiar'}
              </button>
            </div>
            <div className="mt-1 break-all font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
              {accessKey ? formatAccessKey(accessKey) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Bloco Condicional: Documento de Origem Referenciado (NFref) */}
      {refKey && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <i className="bi bi-link-45deg text-base" />
                Documento de origem referenciado (NF-e de origem)
              </div>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                Operação vinculada a documento fiscal anterior (devolução, complemento ou ajuste).
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyAccessKey(refKey, true)}
              className="inline-flex items-center gap-1 self-start rounded-lg bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 transition hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200"
            >
              <i className={`bi ${copiedRefKey ? 'bi-check-lg text-emerald-600' : 'bi-clipboard'}`} />
              {copiedRefKey ? 'Chave copiada!' : 'Copiar chave referenciada'}
            </button>
          </div>
          <div className="mt-2 break-all font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
            {formatAccessKey(refKey)}
          </div>
        </div>
      )}

      {/* Informações adicionais do contribuinte / SEFAZ */}
      {(document?.motivo_status || general?.additionalInfo) && (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Informações adicionais do documento fiscal:
          </span>
          <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-400">
            {document?.motivo_status || general?.additionalInfo}
          </p>
        </div>
      )}
    </div>
  );
}
