import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { canPerform } from '@/pages/utils/permissionService';
import { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
import { prefetchNfeNumberPreviews } from '@/pages/utils/nfe/nfeNumberPreviewPrefetch';
import { FiscalIssueCard } from '@/pages/App/shared/components/FiscalIssueCard';
import type { NfeDocumentRecord } from './types/fiscalDocuments.types';

import { useFiscalDocumentsList } from './hooks/useFiscalDocumentsList';
import { useFiscalDocumentDetails } from './hooks/useFiscalDocumentDetails';
import { useFiscalCceModal } from './hooks/useFiscalCceModal';
import { useFiscalCancelModal } from './hooks/useFiscalCancelModal';
import { useFiscalSefazActions } from './hooks/useFiscalSefazActions';

import { FiscalDocumentsHeader } from './components/FiscalDocumentsHeader';
import { FiscalDocumentsFilterBar } from './components/FiscalDocumentsFilterBar';
import { FiscalDocumentsTable } from './components/FiscalDocumentsTable';
import { FiscalDocumentsPagination } from './components/FiscalDocumentsPagination';
import { FiscalCceModal } from './modals/FiscalCceModal';
import { FiscalCancelModal } from './modals/FiscalCancelModal';
import NfeOperationDraftModal from './modals/NfeOperationDraftModal';
import { IssuedFiscalDocumentDetailsModal } from './modals/IssuedFiscalDocumentDetailsModal';

export default function FiscalDocumentsPage() {
  const { profile } = useAuth();
  const roles = profile ? getProfileRoles(profile) : [];
  const canViewFiscal = canPerform('viewFiscal', roles);
  const canOperateFiscal = hasFiscalOperationRole(profile);

  React.useEffect(() => {
    if (!canOperateFiscal) return;
    void prefetchNfeNumberPreviews();
  }, [canOperateFiscal]);

  const [operationSourceDoc, setOperationSourceDoc] = useState<NfeDocumentRecord | null>(null);
  const [automaticDraftId, setAutomaticDraftId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<NfeDocumentRecord | null>(null);

  // Hook de Listagem e Filtros
  const {
    documents,
    loading,
    pageIndex,
    setPageIndex,
    documentCount,
    orderNumbers,
    cancellationEligibility,
    loadDocuments,
    filters,
    searchInput,
    setSearchInput,
    handleSearchSubmit,
    setStatusFilter,
    setModelFilter,
    setEnvironmentFilter,
    setSeriesFilter,
    setDateFrom,
    setDateTo,
  } = useFiscalDocumentsList(canViewFiscal);

  // Hook de Detalhes Fiscais
  const {
    detailsDocumentId,
    fiscalDetails,
    detailsLoadingId,
    toggleDetails,
  } = useFiscalDocumentDetails();

  // Hook de CC-e Modal
  const cceModal = useFiscalCceModal(loadDocuments);

  // Hook de Cancelamento Modal
  const cancelModal = useFiscalCancelModal({
    onSuccess: loadDocuments,
    onEstornoTrigger: (doc, draftId) => {
      setAutomaticDraftId(draftId);
      setOperationSourceDoc(doc);
    },
  });

  // Hook de Ações SEFAZ e Arquivos
  const sefaz = useFiscalSefazActions({
    canOperateFiscal,
    loadDocuments,
    onCancelledConfirmed: cancelModal.closeCancel,
  });

  if (!canViewFiscal) {
    return (
      <div className="p-8 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
        Seu perfil não tem acesso às notas fiscais de saída.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-4 px-3 pt-4 pb-16 md:px-5 md:pt-4 md:pb-5">
      <FiscalDocumentsHeader />

      {sefaz.fiscalIssueFeedback && (
        <FiscalIssueCard
          tone={sefaz.fiscalIssueFeedback.presentation.tone}
          title={sefaz.fiscalIssueFeedback.presentation.title}
          description={sefaz.fiscalIssueFeedback.presentation.description}
          nextStep={sefaz.fiscalIssueFeedback.presentation.nextStep}
          technicalDetails={sefaz.fiscalIssueFeedback.technicalDetails}
          onClose={() => sefaz.setFiscalIssueFeedback(null)}
        >
          {canOperateFiscal && sefaz.fiscalIssueFeedback.presentation.action === 'consult' && (
            <button
              type="button"
              onClick={() => void sefaz.handleConsultSituation(sefaz.fiscalIssueFeedback!.document)}
              disabled={!canOperateFiscal || sefaz.isConsulting}
              className="rounded-xl bg-amber-600 px-4 py-2 font-black text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {sefaz.isConsulting ? 'Consultando a SEFAZ…' : 'Consultar SEFAZ agora'}
            </button>
          )}
          {canOperateFiscal && sefaz.fiscalIssueFeedback.presentation.action === 'retransmit-same-document' && (
            <button
              type="button"
              onClick={() => void sefaz.handleRetryHmlDocument(sefaz.fiscalIssueFeedback!.document)}
              disabled={
                !canOperateFiscal ||
                Boolean(sefaz.retryingHmlDocumentId) ||
                sefaz.fiscalIssueFeedback.document.ambiente !== 2 ||
                !sefaz.fiscalIssueFeedback.document.fiscal_ruleset_version?.startsWith('HML_')
              }
              className="rounded-xl bg-blue-700 px-4 py-2 font-black text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
            >
              {sefaz.retryingHmlDocumentId === sefaz.fiscalIssueFeedback.document.id
                ? 'Verificando a mesma tentativa…'
                : 'Retomar esta tentativa confirmada'}
            </button>
          )}
          {canOperateFiscal && sefaz.fiscalIssueFeedback.presentation.action === 'configure-certificate' && (
            <a
              href="/settings/fiscal"
              className="inline-flex rounded-xl bg-blue-700 px-4 py-2 font-black text-white transition-colors hover:bg-blue-800"
            >
              Verificar certificado
            </a>
          )}
        </FiscalIssueCard>
      )}

      <FiscalDocumentsFilterBar
        filters={filters}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onModelChange={setModelFilter}
        onStatusChange={setStatusFilter}
        onEnvironmentChange={setEnvironmentFilter}
        onSeriesChange={setSeriesFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      <div className="bg-white dark:bg-slate-900/70 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <FiscalDocumentsTable
          documents={documents}
          allDocuments={documents}
          loading={loading}
          orderNumbers={orderNumbers}
          cancellationEligibility={cancellationEligibility}
          detailsDocumentId={detailsDocumentId}
          detailsLoadingId={detailsLoadingId}
          fiscalDetails={fiscalDetails}
          canOperateFiscal={canOperateFiscal}
          retryingHmlDocumentId={sefaz.retryingHmlDocumentId}
          onViewDetails={setSelectedDocument}
          onToggleDetails={toggleDetails}
          onPrintDanfe={sefaz.handlePrint}
          onDownloadXml={sefaz.handleDownload}
          onConsultSituation={sefaz.handleConsultSituation}
          onOpenCce={cceModal.openCce}
          onOpenFiscalTreatment={(doc) =>
            cancelModal.openCancel(doc, cancellationEligibility[doc.id])
          }
          onPrepareLinkedOperation={setOperationSourceDoc}
          onRetryHml={sefaz.handleRetryHmlDocument}
        />

        {documentCount > 0 && (
          <FiscalDocumentsPagination
            documentCount={documentCount}
            pageIndex={pageIndex}
            onPageChange={setPageIndex}
            loading={loading}
          />
        )}
      </div>

      <FiscalCceModal
        isOpen={cceModal.showCceModal}
        document={cceModal.selectedDoc}
        cceText={cceModal.cceText}
        onCceTextChange={cceModal.setCceText}
        isSubmitting={cceModal.isSubmittingCce}
        isLoadingInfo={cceModal.isLoadingCceInfo}
        previousCorrection={cceModal.ccePreviousCorrection}
        nextSequence={cceModal.cceNextSequence}
        isPending={cceModal.ccePending}
        productionConfirmed={cceModal.productionCceConfirmed}
        onProductionConfirmedChange={cceModal.setProductionCceConfirmed}
        onClose={cceModal.closeCce}
        onSubmit={cceModal.handleSubmit}
        onReconcile={cceModal.handleReconcile}
      />

      <FiscalCancelModal
        isOpen={cancelModal.showCancelModal}
        document={cancelModal.selectedDoc}
        eligibility={
          cancelModal.selectedDoc
            ? cancellationEligibility[cancelModal.selectedDoc.id]
            : undefined
        }
        orderNumber={
          cancelModal.selectedDoc?.order_id
            ? orderNumbers[cancelModal.selectedDoc.order_id]
            : undefined
        }
        cancelReason={cancelModal.cancelReason}
        onCancelReasonChange={cancelModal.setCancelReason}
        isCanceling={cancelModal.isCanceling}
        isConsulting={sefaz.isConsulting}
        productionConfirmed={cancelModal.productionCancelConfirmed}
        onProductionConfirmedChange={cancelModal.setProductionCancelConfirmed}
        onClose={cancelModal.closeCancel}
        onConsultSituation={() => {
          if (cancelModal.selectedDoc) {
            sefaz.handleConsultSituation(cancelModal.selectedDoc);
          }
        }}
        onConfirmCancel={() => {
          if (cancelModal.selectedDoc) {
            cancelModal.handleConfirmCancel(
              cancellationEligibility[cancelModal.selectedDoc.id]
            );
          }
        }}
      />

      <NfeOperationDraftModal
        sourceDocument={operationSourceDoc}
        initialDraftId={automaticDraftId}
        mode="estorno"
        onClose={() => {
          setOperationSourceDoc(null);
          setAutomaticDraftId(null);
        }}
        onAuthorized={() => {
          setOperationSourceDoc(null);
          setAutomaticDraftId(null);
          void loadDocuments();
        }}
      />

      {selectedDocument && (
        <IssuedFiscalDocumentDetailsModal
          document={selectedDocument}
          orderNumber={selectedDocument.order_id ? orderNumbers[selectedDocument.order_id] : undefined}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
}

export type * from './types/fiscalDocuments.types';
