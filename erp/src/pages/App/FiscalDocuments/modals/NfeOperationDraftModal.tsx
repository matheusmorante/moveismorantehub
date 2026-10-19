import React, { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import type { NfeOperationDraftModalProps } from '../types/fiscalOperationDraft.types';
import { useNfeOperationDraft } from '../hooks/useNfeOperationDraft';
import { NfeOperationDraftSetup } from '../components/NfeOperationDraftSetup';
import { NfeOperationDraftReview } from '../components/NfeOperationDraftReview';

export default function NfeOperationDraftModal({
  sourceDocument,
  initialDraftId,
  mode,
  returnOrderId: initialReturnOrderId,
  returnOrderIndex,
  onClose,
  onAuthorized,
}: NfeOperationDraftModalProps) {
  const auth = useContext(AuthContext);
  const canPreviewXml = Boolean(auth?.isRealAdministrator && !auth?.activeRoleMode);

  const {
    kind,
    setKind,
    returnOrders,
    returnOrderId,
    setReturnOrderId,
    reason,
    setReason,
    operationDidNotOccur,
    setOperationDidNotOccur,
    goodsDidNotCirculate,
    setGoodsDidNotCirculate,
    payload,
    review,
    reviewedLines,
    setReviewedLines,
    productionConfirmed,
    setProductionConfirmed,
    loadingReturns,
    preparing,
    savingReview,
    transmitting,
    xmlPreview,
    isXmlPreviewOpen,
    loadingPreview,
    hasUnresolvedCfop,
    error,
    notice,
    retryAllowed,
    refreshRequired,
    prepareDraft,
    updateLineCfop,
    updateReview,
    saveFiscalReview,
    handlePreviewXml,
    closeXmlPreview,
    transmitOrReconcile,
    canPrepare,
  } = useNfeOperationDraft({ sourceDocument, initialDraftId, mode, returnOrderId: initialReturnOrderId, onAuthorized });

  if (!sourceDocument) return null;
  const isProduction = sourceDocument.ambiente === 1;
  return (
    <div
      className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nfe-operation-title"
    >
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2
              id="nfe-operation-title"
              className="text-base font-black text-slate-900 dark:text-white"
            >
              {mode === 'return' ? 'Emitir NF-e de devolução' : mode === 'estorno' ? 'Preparar estorno fiscal' : 'Estorno ou devolução fiscal'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              NF-e #{sourceDocument.numero_nfe} · {sourceDocument.chave_acesso} ·{' '}
              {isProduction ? 'Produção' : 'Homologação'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fechar"
          >
            <i className="bi bi-x-lg" />
          </button>
        </header>

        <main className="space-y-5 overflow-y-auto p-5">
          {!payload && (
            <NfeOperationDraftSetup
              kind={kind}
              mode={mode}
              fixedReturnOrderId={initialReturnOrderId}
              fixedReturnOrderIndex={returnOrderIndex}
              onKindChange={setKind}
              returnOrders={returnOrders}
              returnOrderId={returnOrderId}
              onReturnOrderChange={setReturnOrderId}
              loadingReturns={loadingReturns}
              reason={reason}
              onReasonChange={setReason}
              operationDidNotOccur={operationDidNotOccur}
              onOperationDidNotOccurChange={setOperationDidNotOccur}
              goodsDidNotCirculate={goodsDidNotCirculate}
              onGoodsDidNotCirculateChange={setGoodsDidNotCirculate}
              canPrepare={canPrepare}
              preparing={preparing}
              onPrepare={prepareDraft}
            />
          )}
          {payload && review && (
            <NfeOperationDraftReview
              payload={payload}
              review={review}
              reviewedLines={reviewedLines}
              isProduction={isProduction}
              productionConfirmed={productionConfirmed}
              onProductionConfirmedChange={setProductionConfirmed}
              onReviewChange={updateReview}
            />
          )}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200"
            >
              {notice}
            </div>
          )}
        </main>

        {payload && review && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            {payload.draft.status === 'rejected' && (
              <button
                type="button"
                onClick={() => void prepareDraft()}
                disabled={preparing || transmitting}
                className="rounded-xl border border-amber-300 px-4 py-2.5 text-xs font-bold text-amber-800 disabled:opacity-40 dark:border-amber-800 dark:text-amber-200"
              >
                {preparing ? 'Preparando nova tentativa…' : 'Iniciar nova tentativa fiscal'}
              </button>
            )}
            <button
              type="button"
              onClick={saveFiscalReview}
              disabled={
                savingReview ||
                transmitting ||
                refreshRequired ||
                payload.draft.status === 'transmitting' ||
                payload.draft.status === 'unknown' ||
                payload.draft.status === 'authorized'
              }
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold disabled:opacity-40 dark:border-slate-700"
            >
              {savingReview ? 'Salvando revisão…' : 'Salvar revisão fiscal'}
            </button>
            {canPreviewXml && (
              <button
                type="button"
                data-testid="nfe-preview-xml-button"
                onClick={() => void handlePreviewXml()}
                disabled={
                  loadingPreview ||
                  preparing ||
                  savingReview ||
                  transmitting ||
                  refreshRequired ||
                  hasUnresolvedCfop ||
                  payload.draft.status === 'transmitting' ||
                  payload.draft.status === 'unknown'
                }
                aria-busy={loadingPreview}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {loadingPreview ? 'Preparando prévia…' : 'Prévia do XML'}
              </button>
            )}
            <button
              type="button"
              onClick={transmitOrReconcile}
              disabled={
                transmitting ||
                savingReview ||
                hasUnresolvedCfop ||
                (!refreshRequired && isProduction && !productionConfirmed && (payload.draft.status === 'ready' || retryAllowed)) ||
                ['draft', 'rejected', 'authorized'].includes(payload.draft.status)
              }
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-40"
            >
              {transmitting
                ? 'Consultando/transmitindo…'
                : refreshRequired
                  ? 'Atualizar situação fiscal'
                : retryAllowed
                  ? 'Reenviar a mesma chave e XML'
                  : ['unknown', 'transmitting'].includes(payload.draft.status)
                    ? 'Consultar situação na SEFAZ'
                    : 'Transmitir NF-e revisada'}
            </button>
          </footer>
        )}
      </div>

      {canPreviewXml && isXmlPreviewOpen && xmlPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Prévia do XML fiscal"
          data-testid="nfe-xml-preview-dialog"
          className="fixed inset-0 z-[1000001] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"
        >
          <section className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Prévia do XML — ainda não transmitido
              </h2>
              <button
                type="button"
                data-testid="nfe-xml-preview-close"
                onClick={closeXmlPreview}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Fechar
              </button>
            </header>
            <pre
              data-testid="nfe-xml-preview-content"
              className="min-h-0 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-xs text-slate-800 dark:text-slate-200"
            >
              {xmlPreview.xml}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}
