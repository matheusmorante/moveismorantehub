import React from 'react';
import type { FiscalDocumentEventSummary } from '../../types/fiscalDocuments.types';
import {
  formatFiscalDateTime,
  getFiscalEventLabel,
} from '../../utils/fiscalPresentationHelpers';

interface IssuedFiscalDocumentEventsTabProps {
  events?: FiscalDocumentEventSummary[];
}

export function IssuedFiscalDocumentEventsTab({
  events = [],
}: IssuedFiscalDocumentEventsTabProps) {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <i className="bi bi-clock-history" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Nenhum evento registrado
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Este documento fiscal não possui cartas de correção, manifestações ou cancelamento averbados na SEFAZ.
        </p>
      </div>
    );
  }

  // Ordenar do mais recente para o mais antigo
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedEvents.map((event, index) => {
        const rawEvent = event as FiscalDocumentEventSummary & {
          tipo_evento?: string;
          numero_protocolo?: string;
          detalhes_evento?: { correcao?: string };
        };
        const eventType = String(rawEvent.event_type || rawEvent.tipo_evento || '').trim();
        const isCancel =
          eventType === '110111' ||
          eventType.toLowerCase().includes('cancel');
        const isCce =
          eventType === '110110' ||
          eventType.toLowerCase().includes('cce') ||
          eventType.toLowerCase().includes('correcao');

        const title = getFiscalEventLabel(eventType);
        const justification =
          rawEvent.justification ||
          rawEvent.detalhes_evento?.correcao ||
          rawEvent.xmotivo ||
          '';
        const protocolNumber = rawEvent.protocol_number || rawEvent.numero_protocolo;
        const statusLower = String(rawEvent.status || '').toLowerCase();

        return (
          <div
            key={event.id || `event-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-base ${
                    isCancel
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      : isCce
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  }`}
                >
                  <i
                    className={`bi ${
                      isCancel
                        ? 'bi-x-circle'
                        : isCce
                        ? 'bi-pencil-square'
                        : 'bi-check2-circle'
                    }`}
                  />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {title}
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatFiscalDateTime(event.requested_at)}
                  </span>
                </div>
              </div>

              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  statusLower === 'homologado' ||
                  statusLower === 'registrado' ||
                  statusLower === 'autorizada'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {rawEvent.status || 'Registrado'}
              </span>
            </div>

            {/* Justificativa / Texto da Carta de Correção */}
            {justification && (
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800/80 dark:bg-slate-950/60">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {isCce ? 'Correção averbada:' : 'Justificativa do evento:'}
                </span>
                <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-400">
                  {justification}
                </p>
              </div>
            )}

            {/* Mensagem SEFAZ ou Protocolo */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              {protocolNumber && (
                <span>
                  <strong>Protocolo:</strong> {protocolNumber}
                </span>
              )}
              {event.xmotivo && <span>{event.xmotivo}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
