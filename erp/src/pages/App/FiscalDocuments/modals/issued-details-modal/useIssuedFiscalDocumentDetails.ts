import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { parseFiscalXmlDetails } from '../../utils/fiscalXmlParser';
import { fetchFiscalDocumentDetails } from '../../services/fiscalDocumentsService';
import {
  createDanfeShareFile,
  downloadXml,
  printDanfe,
} from '../../services/fiscalDanfeXmlService';
import type { DetailTab } from '../../components/IssuedFiscalDocumentDetailsTabs';
import type {
  FiscalDocumentDetails,
  NfeDocumentRecord,
} from '../../types/fiscalDocuments.types';
import type { ReplacementPendingAction } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import { fetchOrderById } from '@/pages/utils/orderHistoryService';
import { downloadBlob, type IssuedFiscalDocumentDetailsModalProps } from './issuedDetailsModal.types';

export function useIssuedFiscalDocumentDetails(props: IssuedFiscalDocumentDetailsModalProps) {
  const {
    emissionResult,
    document,
    documentId: suppliedDocumentId,
    initialEnvironment,
    order,
    orderNumber: providedOrderNumber,
    onIssueNfe,
    onConsultSefaz,
    onClose,
  } = props;
  const [activeTab, setActiveTab] = useState<DetailTab>('general');
  const [details, setDetails] = useState<FiscalDocumentDetails | null>(null);
  const initialDocumentId = document?.id || emissionResult?.documentId || suppliedDocumentId;
  const [activeDocumentId, setActiveDocumentId] = useState<string | undefined>(initialDocumentId);

  useEffect(() => {
    setActiveDocumentId(initialDocumentId);
  }, [initialDocumentId]);

  const documentId = activeDocumentId || initialDocumentId;
  const [isLoading, setIsLoading] = useState(Boolean(documentId));
  const [loadError, setLoadError] = useState('');
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareFileError, setShareFileError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);
  const [reviewingDraft, setReviewingDraft] = useState(false);
  const [showXml, setShowXml] = useState(false);

  useEffect(() => {
    let active = true;
    if (!documentId) {
      setIsLoading(false);
      setLoadError('O identificador do documento autorizado não veio na resposta da emissão.');
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    setDetails(null);
    setLoadError('');
    setShareFile(null);
    setShareFileError('');
    setShowXml(false);
    void fetchFiscalDocumentDetails(documentId)
      .then((loaded) => {
        if (!active) return;
        setDetails(loaded);
        setIsLoading(false);
        if (
          loaded.operationDrafts?.some(
            (draft) => draft.id === loaded.document.id && draft.sourceDocument
          )
        ) {
          return;
        }
        void createDanfeShareFile(loaded.document)
          .then((file) => {
            if (active) setShareFile(file);
          })
          .catch((error: unknown) => {
            if (active) {
              setShareFileError(
                error instanceof Error ? error.message : 'Não foi possível preparar o arquivo do DANFE.'
              );
            }
          });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : 'Não foi possível carregar os detalhes fiscais.'
        );
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [documentId, reloadVersion]);

  const parsed = useMemo(
    () => details?.parsedXml || parseFiscalXmlDetails(emissionResult?.xml || document?.xml_nfe || ''),
    [details?.parsedXml, emissionResult?.xml, document?.xml_nfe]
  );
  const visibleDocument = details?.document || document;
  const storedXml = visibleDocument?.xml_nfe || emissionResult?.xml || '';
  const operationDraft = details?.operationDrafts?.find(
    (draft) => draft.id === visibleDocument?.id && draft.sourceDocument
  );
  const model = visibleDocument?.modelo || emissionResult?.model || '55';
  const environment =
    visibleDocument?.ambiente || emissionResult?.environment || initialEnvironment || 1;
  const status = visibleDocument?.status || (environment === 2 ? 'homologada' : 'autorizada');
  const isEstorno = visibleDocument?.document_type === 'estorno';
  const isDevolucao = visibleDocument?.document_type === 'return';
  const isEstornada = Boolean(
    details?.linkedDocuments?.some(
      (d) => d.document_type === 'estorno' && ['autorizada', 'homologada'].includes(d.status)
    ) ||
      details?.operationDrafts?.some(
        (d) => d.operation_kind === 'estorno' && d.status === 'authorized'
      )
  );
  const orderEmissions: readonly NfeDocumentRecord[] = details?.orderEmissions || [];
  const currentActiveEmission = useMemo(() => {
    if (orderEmissions.length <= 1) return null;
    const authorized = orderEmissions.find((e) =>
      ['autorizada', 'homologada'].includes(e.status)
    );
    return authorized || orderEmissions[orderEmissions.length - 1];
  }, [orderEmissions]);

  const isViewingAnteriorEmission = Boolean(
    currentActiveEmission &&
      visibleDocument?.id &&
      currentActiveEmission.id !== visibleDocument.id
  );

  const emissionCount = orderEmissions.length > 1 ? orderEmissions.length : 0;
  const linkedCount =
    (details?.linkedDocuments?.length || 0) +
    (details?.operationDrafts?.length || 0) +
    emissionCount;

  const title = isEstorno
    ? 'NF-e de Estorno Fiscal'
    : isDevolucao
    ? 'NF-e de Devolução Fiscal'
    : model === '65'
    ? 'NFC-e'
    : 'NF-e';

  const visibleDocumentNumber = visibleDocument?.numero_nfe ?? emissionResult?.nfeNumber;
  const documentNumberLabel =
    visibleDocumentNumber && visibleDocumentNumber > 0
      ? `nº ${visibleDocumentNumber}`
      : operationDraft
      ? '(Rascunho fiscal)'
      : isEstorno
      ? '(Rascunho de Ajuste)'
      : '—';

  const orderNumber = order?.orderNumber || order?.orderIndex || providedOrderNumber;

  const handleDownloadXml = async () => {
    if (details) {
      try {
        await downloadXml(details.document);
        toast.success('XML baixado com sucesso.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível baixar o XML.');
      }
      return;
    }
    if (document) {
      try {
        await downloadXml(document);
        toast.success('XML baixado com sucesso.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível baixar o XML.');
      }
      return;
    }
    if (!emissionResult?.xml) {
      toast.error('O XML ainda não está disponível.');
      return;
    }
    const file = new File(
      [emissionResult.xml],
      `NFe_${emissionResult.accessKey || emissionResult.nfeNumber || 'documento'}.xml`,
      { type: 'application/xml;charset=utf-8' }
    );
    downloadBlob(file);
  };

  const handlePrintDanfe = async () => {
    const printableDocument = details?.document || document;
    if (!printableDocument) {
      toast.error(loadError || 'Carregue os detalhes fiscais antes de imprimir o DANFE.');
      return;
    }
    try {
      await printDanfe(printableDocument);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível abrir o DANFE.');
    }
  };

  const handleShareDanfe = () => {
    if (!shareFile) {
      toast.error(shareFileError || 'O arquivo do DANFE ainda está sendo preparado.');
      return;
    }

    const shareNavigator = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    const files = [shareFile];
    if (shareNavigator.share && shareNavigator.canShare?.({ files })) {
      try {
        void shareNavigator
          .share({
            files,
            title: `DANFE ${title} ${visibleDocumentNumber || ''}`.trim(),
          })
          .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error(error instanceof Error ? error.message : 'Não foi possível compartilhar o DANFE.');
          });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível compartilhar o DANFE.');
      }
      return;
    }

    downloadBlob(shareFile);
    toast.info('Este navegador não compartilha arquivos diretamente. O DANFE foi baixado; anexe-o no WhatsApp.');
  };

  const handleExecuteSituationAction = async (actionKind: ReplacementPendingAction) => {
    const targetEnv: 1 | 2 = environment === 2 ? 2 : 1;

    if (actionKind === 'transmission_uncertain') {
      if (onConsultSefaz && visibleDocument?.id) {
        onConsultSefaz(visibleDocument.id, targetEnv);
        return;
      }
      setIsLoading(true);
      setReloadVersion((v) => v + 1);
      return;
    }

    if (actionKind === 'prior_regularization_failed') {
      setActiveTab('linked');
      return;
    }

    if (
      actionKind === 'awaiting_new_invoice' ||
      actionKind === 'draft' ||
      actionKind === 'rejected'
    ) {
      if (onIssueNfe) {
        let orderToEmit = order;
        if (!orderToEmit && visibleDocument?.order_id) {
          try {
            orderToEmit = (await fetchOrderById(visibleDocument.order_id)) || undefined;
          } catch {
            // fallback
          }
        }
        if (orderToEmit) {
          onIssueNfe(orderToEmit, targetEnv);
          onClose();
          return;
        }
      }
      toast.info('Para emitir a nova nota fiscal, acesse o pedido de venda na listagem.');
    }
  };

  return {
    activeTab,
    setActiveTab,
    details,
    documentId,
    activeDocumentId,
    setActiveDocumentId,
    isLoading,
    setIsLoading,
    loadError,
    shareFile,
    shareFileError,
    reloadVersion,
    setReloadVersion,
    reviewingDraft,
    setReviewingDraft,
    showXml,
    setShowXml,
    parsed,
    visibleDocument,
    storedXml,
    operationDraft,
    model,
    environment,
    status,
    isEstorno,
    isDevolucao,
    isEstornada,
    orderEmissions,
    currentActiveEmission,
    isViewingAnteriorEmission,
    emissionCount,
    linkedCount,
    title,
    visibleDocumentNumber,
    documentNumberLabel,
    orderNumber,
    handleDownloadXml,
    handlePrintDanfe,
    handleShareDanfe,
    handleExecuteSituationAction,
  };
}
