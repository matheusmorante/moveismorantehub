import React from 'react';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { formatAccessKey } from '@/pages/utils/nfe/nfeAccessKey';
import { getAuthorizedAt } from '@/pages/utils/nfe/nfeEventRules';
import type { FiscalDocumentDetails, NfeDocumentRecord } from '../types/fiscalDocuments.types';
import { getFiscalTransportSummary } from '../utils/fiscalPresentationHelpers';

interface FiscalDocumentDetailsRowProps {
  document: NfeDocumentRecord;
  isLoading: boolean;
  details?: FiscalDocumentDetails | null;
  asCard?: boolean;
}

export const FiscalDocumentDetailsRow: React.FC<FiscalDocumentDetailsRowProps> = ({
  document,
  isLoading,
  details,
  asCard = false,
}) => {
  const content = isLoading ? (
    <p className="text-[10px] text-slate-500 animate-pulse">
      Carregando XML, itens e histórico fiscal…
    </p>
  ) : details ? (
    <div className="space-y-1.5 text-[10px]">
      {/* Resumo e origem */}
      <details
        open
        className="rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900"
      >
        <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
          Resumo e origem
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-slate-500">Chave de acesso</span>
            <div className="break-all font-mono text-slate-800 dark:text-slate-200">
              {formatAccessKey(document.chave_acesso || '')}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Protocolo de autorização</span>
            <div className="font-mono text-slate-800 dark:text-slate-200">
              {document.numero_protocolo || 'Não informado'}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Autorização</span>
            <div className="text-slate-800 dark:text-slate-200">
              {formatToBRDate(
                getAuthorizedAt(
                  details.document.xml_protocolo || '',
                  details.document.created_at || document.created_at
                )
              )}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Último retorno</span>
            <div className="text-slate-800 dark:text-slate-200">
              {document.motivo_status || 'Sem observação adicional.'}
            </div>
          </div>
        </div>
      </details>

      {/* Itens e tributos */}
      <details className="rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
        <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
          Itens e tributos · {details.parsedXml?.items.length || 0} item(ns)
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-left text-[10px]">
            <thead className="text-slate-500">
              <tr>
                <th className="px-1 py-1">Item</th>
                <th className="px-1 py-1">NCM / CFOP</th>
                <th className="px-1 py-1 text-right">Qtd.</th>
                <th className="px-1 py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(details.parsedXml?.items || []).map((item, index) => (
                <tr key={`${document.id}-item-${index}`}>
                  <td className="px-1 py-1">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {item.description || 'Item'}
                    </span>
                    <span className="ml-1 text-slate-500">{item.code}</span>
                  </td>
                  <td className="px-1 py-1 font-mono text-slate-600 dark:text-slate-300">
                    {item.ncm} / {item.cfop}
                  </td>
                  <td className="px-1 py-1 text-right text-slate-600 dark:text-slate-300">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-1 py-1 text-right font-medium text-slate-800 dark:text-slate-100">
                    {formatCurrency(Number(item.total) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {(details.parsedXml?.totals || []).map((total) => (
              <span key={`${document.id}-${total.label}`}>
                <span className="text-slate-500">{total.label}:</span>{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {formatCurrency(Number(total.value) || 0)}
                </strong>
              </span>
            ))}
          </div>
        </div>
      </details>

      {/* Transporte e pagamentos */}
      <details className="rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
        <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
          Transporte e pagamentos
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-slate-500">Transporte</span>
            <div className="text-slate-700 dark:text-slate-200">
              {getFiscalTransportSummary(details.parsedXml?.transport)}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Pagamentos</span>
            <div className="text-slate-700 dark:text-slate-200">
              {details.parsedXml?.payments
                .map(
                  (payment) => `${payment.method}: ${formatCurrency(Number(payment.value) || 0)}`
                )
                .join(' · ') || 'Não informado'}
            </div>
          </div>
        </div>
      </details>

      {/* Histórico de eventos */}
      <details className="rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
        <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
          Histórico de eventos · {details.events?.length || 0}
        </summary>
        <div className="mt-2 space-y-1">
          {details.events?.length ? (
            details.events.map((event, index) => (
              <div
                key={`${document.id}-event-${index}`}
                className="grid gap-1 border-t border-slate-100 py-1 text-slate-600 dark:border-slate-800 dark:text-slate-300 sm:grid-cols-[130px_1fr]"
              >
                <span>
                  {formatToBRDate(event.requested_at)} · {event.event_type}
                </span>
                <span>
                  <strong>{event.status}</strong>
                  {event.cstat ? ` · cStat ${event.cstat}` : ''}
                  {event.attempt_number ? ` · tentativa ${event.attempt_number}` : ''}
                  {event.id ? ` · evento ${String(event.id).slice(0, 8)}` : ''}
                  {event.requested_by ? ` · usuário ${String(event.requested_by).slice(0, 8)}` : ''}
                  {event.protocol_number ? ` · prot. ${event.protocol_number}` : ''}
                  {event.xmotivo ? ` · ${event.xmotivo}` : ''}
                  {event.justification ? ` · ${event.justification}` : ''}
                </span>
              </div>
            ))
          ) : (
            <span className="text-slate-500">Nenhum evento registrado.</span>
          )}
        </div>
      </details>
    </div>
  ) : (
    <p className="text-[10px] text-slate-500">Detalhes indisponíveis.</p>
  );

  if (asCard) {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/30">
        {content}
      </div>
    );
  }

  return (
    <tr className="bg-slate-50/70 dark:bg-slate-950/30">
      <td colSpan={9} className="px-4 py-3">
        {content}
      </td>
    </tr>
  );
};
