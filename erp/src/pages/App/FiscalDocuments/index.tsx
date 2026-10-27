import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { canPerform } from '@/pages/utils/permissionService';
import { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
import { prefetchNfeNumberPreviews } from '@/pages/utils/nfe/nfeNumberPreviewPrefetch';
import { FiscalIssueCard } from '@/pages/App/shared/components/FiscalIssueCard';
import type { NfeDocumentRecord } from './types/fiscalDocuments.types';
import type { FiscalPendencyItem } from './types/fiscalPendencies.types';
import type { ReplacementPendingAction } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import type Order from '@/pages/types/order.type';
import { fetchOrderById } from '@/pages/utils/orderHistoryService';
import { beginFiscalEmissionReplacement } from '@/pages/utils/nfe/nfeEmissionRequestState';

import { useFiscalDocumentsList } from './hooks/useFiscalDocumentsList';
import { useFiscalDocumentDetails } from './hooks/useFiscalDocumentDetails';
import { useFiscalCancelModal } from './hooks/useFiscalCancelModal';
import { useFiscalSefazActions } from './hooks/useFiscalSefazActions';
import { useFiscalPendencies } from './hooks/useFiscalPendencies';

import { FiscalDocumentsHeader, type FiscalDocumentsMainTab } from './components/FiscalDocumentsHeader';
import { FiscalDocumentsFilterBar } from './components/FiscalDocumentsFilterBar';
import { FiscalDocumentsSummary } from './components/FiscalDocumentsSummary';
import { FiscalDocumentsTable } from './components/FiscalDocumentsTable';
import { FiscalDocumentsPagination } from './components/FiscalDocumentsPagination';
import { FiscalPendenciesView } from './components/pendencies/FiscalPendenciesView';
import { FiscalCancelModal } from './modals/FiscalCancelModal';
import { FiscalExportModal } from './modals/FiscalExportModal';
import NfeOperationDraftModal from './modals/NfeOperationDraftModal';
import { IssuedFiscalDocumentDetailsModal } from './modals/IssuedFiscalDocumentDetailsModal';
import NfeEmissionModal from '@/pages/App/SalesOrder/OrderActions/NfeEmissionModal';
import './FiscalDocumentsResponsive.css';

const FISCAL_SUMMARY_COLLAPSED_KEY = 'morantehub:fiscal-documents:summary-collapsed';

function readFiscalSummaryCollapsedPreference() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(FISCAL_SUMMARY_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function FiscalDocumentsPage() {
  const { profile } = useAuth();
  const roles = profile ? getProfileRoles(profile) : [];
  const canViewFiscal = canPerform('viewFiscal', roles);
  const canViewNcmCatalog = canPerform('viewNcmCatalog', roles);
  const canOperateFiscal = hasFiscalOperationRole(profile);
  const accountantView = roles.includes('accountant') && !canOperateFiscal;

  React.useEffect(() => {
    if (!canOperateFiscal) return;
    void prefetchNfeNumberPreviews();
  }, [canOperateFiscal]);

  const [activeMainTab, setActiveMainTab] = useState<FiscalDocumentsMainTab>('documents');
  const [summaryCollapsed, setSummaryCollapsed] = useState(readFiscalSummaryCollapsedPreference);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [showFiscalExportModal, setShowFiscalExportModal] = useState(false);
  const [operationSourceDoc, setOperationSourceDoc] = useState<NfeDocumentRecord | null>(null);
  const [automaticDraftId, setAutomaticDraftId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Pick<NfeDocumentRecord, 'id' | 'order_id' | 'ambiente'> | null>(null);
  const [emissionModalOrder, setEmissionModalOrder] = useState<Order | null>(null);
  const [emissionModalEnv, setEmissionModalEnv] = useState<1 | 2>(2);

  // Hook de Listagem e Filtros de Documentos
  const {
    documents,
    loading,
    loadError,
    pageIndex,
    setPageIndex,
    documentCount,
    summary,
    summaryLoading,
    summaryLoadError,
    reloadSummary,
    orderNumbers,
    cancellationEligibility,
    loadDocuments,
    filters,
    searchInput,
    setSearchInput,
    setStatusFilter,
    setModelFilter,
    setDocumentTypeFilter,
    setEnvironmentFilter,
    period,
    setPeriod,
    customDateFrom,
    customDateTo,
    setCustomDateFrom,
    setCustomDateTo,
  } = useFiscalDocumentsList(canViewFiscal, false, accountantView);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(FISCAL_SUMMARY_COLLAPSED_KEY, String(summaryCollapsed));
    } catch {
      // A preferência de layout é opcional quando o navegador bloqueia o armazenamento.
    }
  }, [summaryCollapsed]);

  const pendenciesHook = useFiscalPendencies(canViewFiscal);

  // Hook de Detalhes Fiscais
  const {
    detailsDocumentId,
    fiscalDetails,
    detailsLoadingId,
    toggleDetails,
  } = useFiscalDocumentDetails();

  // Hook de Cancelamento Modal
  const cancelModal = useFiscalCancelModal({
    onSuccess: async () => {
      await Promise.all([loadDocuments(), pendenciesHook.reload()]);
    },
    onEstornoTrigger: (doc, draftId) => {
      setAutomaticDraftId(draftId);
      setOperationSourceDoc(doc);
    },
  });

  // Hook de Ações SEFAZ e Arquivos
  const sefaz = useFiscalSefazActions({
    canOperateFiscal,
    loadDocuments: async () => {
      await Promise.all([loadDocuments(), pendenciesHook.reload()]);
    },
    onCancelledConfirmed: cancelModal.closeCancel,
  });

  const handleOpenPendencyAction = async (
    item: FiscalPendencyItem,
    actionKind: ReplacementPendingAction
  ) => {
    if (!canOperateFiscal) {
      handleViewPendencyDetails(item);
      return;
    }

    if (actionKind === 'awaiting_new_invoice') {
      const order = await fetchOrderById(item.orderId);
      if (order) {
        beginFiscalEmissionReplacement(order.id!, item.environment, item.originalDocumentId);
        setEmissionModalEnv(item.environment);
        setEmissionModalOrder(order);
        return;
      }
    }

    handleViewPendencyDetails(item);
  };

  const handleViewPendencyDetails = (item: FiscalPendencyItem) => {
    const docId = item.currentDocumentId || item.draftId || item.originalDocumentId;
    if (!docId) {
      toast.info('Esta pendência ainda não possui um documento fiscal para consultar.');
      return;
    }
    setSelectedDocument({ id: docId, order_id: item.orderId, ambiente: item.environment });
  };

  if (!canViewFiscal) {
    return (
      <div className="p-8 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
        Seu perfil não tem acesso às notas fiscais de saída.
      </div>
    );
  }

  return (
    <div
      className="fiscal-documents-page mx-auto max-w-[1700px] space-y-4 px-3 pt-4 pb-16 md:px-5 md:pt-4 md:pb-5"
      data-summary-expanded={summaryExpanded}
    >
      <FiscalDocumentsHeader
        activeTab={activeMainTab}
        onTabChange={setActiveMainTab}
        openPendenciesCount={pendenciesHook.metrics.openCount}
        canExport={accountantView || canOperateFiscal}
        canViewNcmCatalog={canViewNcmCatalog}
        onExport={() => setShowFiscalExportModal(true)}
      />

      {activeMainTab === 'pendencies' ? (
        <FiscalPendenciesView
          state={pendenciesHook}
          canOperateFiscal={canOperateFiscal}
          onOpenPendencyAction={handleOpenPendencyAction}
          onViewPendencyDetails={handleViewPendencyDetails}
        />
      ) : (
        <>
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
            accountantView={accountantView}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onModelChange={setModelFilter}
            onDocumentTypeChange={setDocumentTypeFilter}
            onStatusChange={setStatusFilter}
            onEnvironmentChange={setEnvironmentFilter}
            period={period}
            onPeriodChange={setPeriod}
            customDateFrom={customDateFrom}
            customDateTo={customDateTo}
            onCustomDateFromChange={setCustomDateFrom}
            onCustomDateToChange={setCustomDateTo}
          />

          {loadError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
            >
              Não foi possível carregar as notas fiscais: {loadError}
            </div>
          )}

          <div className="fiscal-summary-layout-control">
            <button
              type="button"
              aria-expanded={!summaryCollapsed}
              onClick={() => setSummaryCollapsed((collapsed) => !collapsed)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {summaryCollapsed ? 'Exibir resumo fiscal' : 'Recolher resumo fiscal'}
            </button>
          </div>

          <div className="fiscal-documents-workspace" data-summary-collapsed={summaryCollapsed}>
            <FiscalDocumentsSummary
              data={summary}
              loading={summaryLoading}
              error={summaryLoadError}
              expanded={summaryExpanded}
              onToggleExpanded={() => setSummaryExpanded((expanded) => !expanded)}
              onRetry={() => void reloadSummary()}
            />

            <div className="fiscal-documents-results overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
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
                onOpenFiscalTreatment={(doc) =>
                  cancelModal.openCancel(doc, cancellationEligibility[doc.id])
                }
                onPrepareLinkedOperation={setOperationSourceDoc}
                onRetryHml={sefaz.handleRetryHmlDocument}
              />

              {(loading || documentCount > 0) && (
                <FiscalDocumentsPagination
                  documentCount={documentCount}
                  pageIndex={pageIndex}
                  onPageChange={setPageIndex}
                  loading={loading}
                />
              )}
            </div>
          </div>
        </>
      )}

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
          void pendenciesHook.reload();
        }}
      />

      {selectedDocument && (
        <IssuedFiscalDocumentDetailsModal
          documentId={selectedDocument.id}
          initialEnvironment={selectedDocument.ambiente}
          orderNumber={selectedDocument.order_id ? orderNumbers[selectedDocument.order_id] : undefined}
          onClose={() => setSelectedDocument(null)}
          onIssueNfe={(targetOrder, env, actionKind, originalDocumentId) => {
            setSelectedDocument(null);
            if (actionKind === 'awaiting_new_invoice') {
              beginFiscalEmissionReplacement(
                String(targetOrder.id),
                env,
                originalDocumentId
              );
            }
            setEmissionModalEnv(env);
            setEmissionModalOrder(targetOrder);
          }}
        />
      )}

      {emissionModalOrder && (
        <NfeEmissionModal
          isOpen
          order={emissionModalOrder}
          initialEnvironment={emissionModalEnv}
          onClose={() => setEmissionModalOrder(null)}
          onSuccess={() => {
            setEmissionModalOrder(null);
            void loadDocuments();
            void pendenciesHook.reload();
          }}
        />
      )}

      <FiscalExportModal
        isOpen={showFiscalExportModal}
        accountantView={accountantView}
        onClose={() => setShowFiscalExportModal(false)}
      />
    </div>
  );
}

export type * from './types/fiscalDocuments.types';
export type * from './types/fiscalPendencies.types';
