import React from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { FiscalSituationNotice } from '../components/FiscalSituationNotice';
import { FiscalXmlViewer } from '../components/FiscalXmlViewer';
import NfeOperationDraftModal from './NfeOperationDraftModal';
import {
  IssuedFiscalDocumentDetailsTabList,
  IssuedFiscalDocumentDetailsTabPanel,
} from '../components/IssuedFiscalDocumentDetailsTabs';
import {
  type IssuedFiscalDocumentDetailsModalProps,
  useIssuedFiscalDocumentDetails,
  IssuedFiscalDocumentDetailsHeader,
  IssuedFiscalDocumentAnteriorBanner,
  IssuedFiscalDocumentDetailsFooter,
} from './issued-details-modal';

export type { IssuedFiscalDocumentDetailsModalProps } from './issued-details-modal';

export const IssuedFiscalDocumentDetailsModal: React.FC<IssuedFiscalDocumentDetailsModalProps> = (
  props
) => {
  const { fullScreen = false, onClose, document, emissionResult } = props;
  const state = useIssuedFiscalDocumentDetails(props);
  useBodyScrollLock(true);

  if (state.reviewingDraft && state.operationDraft?.sourceDocument) {
    return (
      <NfeOperationDraftModal
        sourceDocument={state.operationDraft.sourceDocument}
        initialDraftId={state.operationDraft.id}
        mode={state.operationDraft.operation_kind}
        onClose={() => state.setReviewingDraft(false)}
        onAuthorized={() => {
          state.setReviewingDraft(false);
          state.setReloadVersion((version) => version + 1);
        }}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm ${
        fullScreen ? 'p-0' : 'p-0 md:p-4'
      }`}
      onWheelCapture={(event) => {
        const scrollBody = event.currentTarget.querySelector('[data-fiscal-details-scroll-body]');
        if (!scrollBody?.contains(event.target as Node)) event.preventDefault();
      }}
      onTouchMoveCapture={(event) => {
        const scrollBody = event.currentTarget.querySelector('[data-fiscal-details-scroll-body]');
        if (!scrollBody?.contains(event.target as Node)) event.preventDefault();
      }}
    >
      <button
        type="button"
        aria-label="Fechar detalhes da nota fiscal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="issued-fiscal-details-title"
        className={`relative z-10 flex flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-950 ${
          fullScreen
            ? 'h-full max-h-full w-full max-w-none rounded-none border-0'
            : 'h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none border-0 md:h-[min(92dvh,900px)] md:max-h-[calc(100dvh-2rem)] md:max-w-7xl md:rounded-3xl md:border md:border-slate-200 dark:border-slate-800'
        }`}
      >
        <IssuedFiscalDocumentDetailsHeader
          title={state.title}
          isEstorno={state.isEstorno}
          isDevolucao={state.isDevolucao}
          environment={state.environment}
          operationDraft={state.operationDraft}
          isEstornada={state.isEstornada}
          status={state.status}
          documentNumberLabel={state.documentNumberLabel}
          visibleDocument={state.visibleDocument}
          visibleDocumentNumber={state.visibleDocumentNumber}
          emissionResult={emissionResult}
          orderNumber={state.orderNumber}
          onClose={onClose}
        />

        {state.details?.fiscalSituation && (
          <FiscalSituationNotice
            situation={state.details.fiscalSituation}
            onExecuteAction={state.handleExecuteSituationAction}
            onOpenLinked={state.linkedCount > 0 ? () => state.setActiveTab('linked') : undefined}
          />
        )}

        {state.isViewingAnteriorEmission && state.currentActiveEmission && (
          <IssuedFiscalDocumentAnteriorBanner
            currentActiveEmission={state.currentActiveEmission}
            onReturnToActive={(id) => {
              state.setActiveDocumentId(id);
              state.setActiveTab('general');
            }}
          />
        )}

        <IssuedFiscalDocumentDetailsTabList
          activeTab={state.activeTab}
          eventsCount={state.details?.events?.length || 0}
          linkedCount={state.linkedCount}
          onChange={state.setActiveTab}
        />

        <main
          data-fiscal-details-scroll-body
          className="min-h-[280px] flex-1 overflow-y-auto overscroll-y-contain bg-slate-50/70 p-4 dark:bg-slate-950/30 sm:p-6"
        >
          {state.isLoading && (state.activeTab !== 'general' || (!state.details && !document)) ? (
            <div
              role="status"
              className="flex min-h-[240px] items-center justify-center gap-3 text-sm text-slate-500"
            >
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              Carregando informações do XML armazenado…
            </div>
          ) : state.loadError && !state.details && !document ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
              <p role="alert" className="max-w-xl text-sm text-rose-700 dark:text-rose-300">
                {state.loadError}
              </p>
              {state.documentId && (
                <button
                  type="button"
                  disabled={state.isLoading}
                  onClick={() => {
                    state.setIsLoading(true);
                    state.setReloadVersion((version) => version + 1);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {state.isLoading && (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Tentar carregar novamente
                </button>
              )}
            </div>
          ) : (
            <>
              {state.loadError && (
                <p
                  role="alert"
                  className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  {state.loadError}
                </p>
              )}
              {state.operationDraft && !state.visibleDocument?.xml_nfe && state.activeTab !== 'events' ? (
                <div
                  role="status"
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  <p>
                    Rascunho fiscal aguardando revisão. Os dados do documento serão exibidos após a
                    geração do seu próprio XML.
                  </p>
                  {state.operationDraft.sourceDocument && (
                    <p className="mt-2">
                      Documento de origem:{' '}
                      {state.operationDraft.sourceDocument.modelo === '65' ? 'NFC-e' : 'NF-e'} nº{' '}
                      {state.operationDraft.sourceDocument.numero_nfe} ·{' '}
                      {state.operationDraft.environment === 2 ? 'Homologação' : 'Produção'}.
                    </p>
                  )}
                  {state.operationDraft.reason && (
                    <p className="mt-2">{state.operationDraft.reason}</p>
                  )}
                </div>
              ) : (
                <IssuedFiscalDocumentDetailsTabPanel
                  activeTab={state.activeTab}
                  emissionResult={emissionResult}
                  fallbackDocument={document}
                  details={state.details}
                  parsed={state.parsed}
                  onSelectDocument={(id) => {
                    state.setActiveDocumentId(id);
                    state.setActiveTab('general');
                  }}
                />
              )}
            </>
          )}
        </main>

        <IssuedFiscalDocumentDetailsFooter
          operationDraft={state.operationDraft}
          model={state.model}
          storedXml={state.storedXml}
          hasDetailsOrDocument={Boolean(state.details || document)}
          hasXmlAvailable={Boolean(emissionResult?.xml)}
          isLoading={state.isLoading}
          shareFile={state.shareFile}
          shareFileError={state.shareFileError}
          onReviewDraft={() => state.setReviewingDraft(true)}
          onShowXml={() => state.setShowXml(true)}
          onPrintDanfe={() => void state.handlePrintDanfe('a4')}
          onPrintNfceCupom={() => void state.handlePrintDanfe('thermal_80mm')}
          onDownloadXml={() => void state.handleDownloadXml()}
          onShareDanfe={state.handleShareDanfe}
          onClose={onClose}
        />
      </section>
      {state.showXml && state.storedXml && (
        <FiscalXmlViewer xml={state.storedXml} onClose={() => state.setShowXml(false)} />
      )}
    </div>
  );
};

export default IssuedFiscalDocumentDetailsModal;
