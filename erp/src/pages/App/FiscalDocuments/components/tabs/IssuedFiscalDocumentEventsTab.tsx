import React from 'react';
import type {
  FiscalDocumentEventSummary,
  FiscalOperationDraftSummary,
} from '../../types/fiscalDocuments.types';
import {
  formatFiscalDateTime,
  getFiscalEventLabel,
} from '../../utils/fiscalPresentationHelpers';

interface IssuedFiscalDocumentEventsTabProps {
  events?: FiscalDocumentEventSummary[];
  operationDrafts?: FiscalOperationDraftSummary[];
}

export function IssuedFiscalDocumentEventsTab({
  events = [],
  operationDrafts = [],
}: IssuedFiscalDocumentEventsTabProps) {
  const hasEvents = events && events.length > 0;
  const hasDrafts = operationDrafts && operationDrafts.length > 0;

  if (!hasEvents && !hasDrafts) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <i className="bi bi-clock-history" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Nenhum evento registrado
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Este documento fiscal não possui cartas de correção, manifestações ou cancelamento fiscal averbados na SEFAZ.
        </p>
      </div>
    );
  }

  // Ordenar eventos do mais recente para o mais antigo
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Rascunhos e Procedimentos de Regularização Fiscal */}
      {hasDrafts && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Procedimentos de Regularização Fiscal
            </span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          {operationDrafts.map((draft) => {
            const isEstorno = draft.operation_kind === 'estorno';
            const draftTitle = isEstorno
              ? 'Rascunho de NF-e de Estorno Fiscal (Modelo 55)'
              : 'Rascunho de Devolução Fiscal';

            return (
              <div
                key={draft.id}
                className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm transition dark:border-indigo-900/60 dark:bg-indigo-950/30 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                      <i className="bi bi-arrow-counterclockwise text-lg" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {draftTitle}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Preparado em: {formatFiscalDateTime(draft.created_at)} ·{' '}
                        {draft.environment === 2 ? 'Homologação' : 'Produção'}
                      </span>
                    </div>
                  </div>

                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    {draft.status === 'draft' ? 'Em Elaboração' : draft.status === 'ready' ? 'Pronto para Transmissão' : draft.status}
                  </span>
                </div>

                {draft.reason && (
                  <div className="mt-3 rounded-xl border border-indigo-100 bg-white/80 p-3 text-xs dark:border-indigo-900/40 dark:bg-slate-900/60">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Motivação do Procedimento:
                    </span>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      {draft.reason}
                    </p>
                  </div>
                )}

                <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-[11px] text-[#3b1900] dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <i className="bi bi-info-circle-fill mr-1.5" />
                  Como o cancelamento fiscal direto pela SEFAZ ultrapassou o prazo legal da NFC-e (limite de 30 minutos no Paraná), a regularização desta operação comercial deve ser concluída emitindo esta NF-e de Estorno Fiscal.
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Histórico de Eventos Fiscais */}
      {hasEvents && (
        <div className="space-y-3">
          {hasDrafts && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Eventos e Tentativas Registradas
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
          )}

          {sortedEvents.map((event, index) => {
            const rawEvent = event as FiscalDocumentEventSummary & {
              tipo_evento?: string;
              numero_protocolo?: string;
              detalhes_evento?: { correcao?: string };
            };
            const eventType = String(rawEvent.event_type || rawEvent.tipo_evento || '').trim();
            const isCancel =
              eventType === '110111' || eventType.toLowerCase().includes('cancel');
            const isCce =
              eventType === '110110' ||
              eventType.toLowerCase().includes('cce') ||
              eventType.toLowerCase().includes('correcao');

            const statusLower = String(rawEvent.status || '').toLowerCase();
            const isRejected =
              statusLower === 'rejected' ||
              statusLower === 'rejeitada' ||
              statusLower === 'rejeitado' ||
              statusLower === 'falha' ||
              statusLower === 'error';

            const title =
              isCancel && isRejected
                ? 'Tentativa de Cancelamento Fiscal de NF-e'
                : getFiscalEventLabel(eventType);

            const rejectionReason =
              rawEvent.xmotivo ||
              rawEvent.justification ||
              rawEvent.detalhes_evento?.correcao ||
              '';
            const justification =
              rawEvent.justification ||
              rawEvent.detalhes_evento?.correcao ||
              rawEvent.xmotivo ||
              '';
            const operatorJustification =
              isRejected && rawEvent.justification && rawEvent.justification !== rejectionReason
                ? rawEvent.justification
                : null;
            const protocolNumber = rawEvent.protocol_number || rawEvent.numero_protocolo;

            return (
              <div
                key={event.id || `event-${index}`}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-slate-900 sm:p-5 ${
                  isRejected
                    ? 'border-rose-200 dark:border-rose-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-base ${
                        isRejected
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : isCancel
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : isCce
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      <i
                        className={`bi ${
                          isRejected
                            ? 'bi-x-octagon-fill text-rose-600'
                            : isCancel
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
                        : isRejected
                        ? 'border border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {isRejected ? 'Cancelamento Fiscal Rejeitado / Bloqueado' : rawEvent.status || 'Registrado'}
                  </span>
                </div>

                {/* Justificativa / Motivo da Rejeição / Detalhes */}
                {isRejected ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs dark:border-rose-900/60 dark:bg-rose-950/40">
                    <div>
                      <span className="font-bold text-rose-800 dark:text-rose-200">
                        Motivo da rejeição / bloqueio do cancelamento fiscal:
                      </span>
                      <p className="mt-1 font-medium whitespace-pre-line text-rose-900 dark:text-rose-100">
                        {rejectionReason || 'Motivo não especificado pela SEFAZ.'}
                      </p>
                    </div>

                    {operatorJustification && (
                      <div className="border-t border-rose-200/60 pt-2 dark:border-rose-900/40">
                        <span className="text-[11px] font-semibold text-rose-700/90 dark:text-rose-300/90">
                          Justificativa informada no cancelamento comercial:
                        </span>
                        <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                          {operatorJustification}
                        </p>
                      </div>
                    )}

                    {(rejectionReason.toLowerCase().includes('prazo') ||
                      rejectionReason.toLowerCase().includes('estorno') ||
                      rejectionReason.toLowerCase().includes('30 minutos')) && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-[#3b1900] dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                        <strong>Orientação Fiscal:</strong> O cancelamento fiscal direto foi bloqueado porque o prazo legal de cancelamento fiscal (30 minutos no Paraná para NFC-e) expirou. A regularização fiscal deve ser realizada por meio de uma <strong>NF-e de Estorno Fiscal (Modelo 55)</strong>.
                      </div>
                    )}
                  </div>
                ) : (
                  justification && (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800/80 dark:bg-slate-950/60">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {isCce ? 'Correção averbada:' : 'Justificativa do evento:'}
                      </span>
                      <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-400">
                        {justification}
                      </p>
                    </div>
                  )
                )}

                {/* Mensagem SEFAZ ou Protocolo */}
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {protocolNumber && (
                    <span>
                      <strong>Protocolo:</strong> {protocolNumber}
                    </span>
                  )}
                  {event.xmotivo && !isRejected && <span>{event.xmotivo}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
