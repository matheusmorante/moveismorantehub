import { useState } from 'react';
import { toast } from 'react-toastify';
import type { FiscalIssueResult } from '@/pages/utils/nfe/fiscalIssuePresentation';
import type {
  FiscalIssueFeedback,
  NfeDocumentRecord,
} from '../types/fiscalDocuments.types';
import { makeFiscalIssueFeedback } from '../utils/fiscalFormatters';
import {
  consultSefazSituation,
  retryHmlDocument,
} from '../services/fiscalSefazService';
import { printDanfe, downloadXml } from '../services/fiscalDanfeXmlService';

export interface UseFiscalSefazActionsParams {
  canOperateFiscal: boolean;
  loadDocuments: () => Promise<void>;
  onCancelledConfirmed?: () => void;
}

export function useFiscalSefazActions({
  canOperateFiscal,
  loadDocuments,
  onCancelledConfirmed,
}: UseFiscalSefazActionsParams) {
  const [isConsulting, setIsConsulting] = useState(false);
  const [retryingHmlDocumentId, setRetryingHmlDocumentId] = useState<string | null>(null);
  const [fiscalIssueFeedback, setFiscalIssueFeedback] = useState<FiscalIssueFeedback | null>(null);

  const handleConsultSituation = async (document: NfeDocumentRecord) => {
    if (isConsulting) return;
    setFiscalIssueFeedback(null);
    setIsConsulting(true);
    try {
      const result: FiscalIssueResult = await consultSefazSituation(document.id);
      if (result.state === 'not_found' && result.pending === false) {
        setFiscalIssueFeedback(makeFiscalIssueFeedback(result, document));
        await loadDocuments();
        return;
      }
      if (!result.success) {
        setFiscalIssueFeedback(makeFiscalIssueFeedback(result, document));
        await loadDocuments();
        return;
      }
      toast.success(
        result.state === 'cancelled'
          ? 'SEFAZ confirmou o cancelamento; documento reconciliado.'
          : result.sefazConsulted === true
            ? `Consulta direta à SEFAZ confirmou a autorização${result.protocolNumber ? ` (protocolo ${result.protocolNumber})` : ''}.`
            : `Documento autorizado na SEFAZ${result.protocolNumber ? ` (protocolo ${result.protocolNumber})` : ''}.`
      );
      await loadDocuments();
      if (result.state === 'cancelled' && onCancelledConfirmed) {
        onCancelledConfirmed();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível consultar a situação fiscal.';
      setFiscalIssueFeedback(makeFiscalIssueFeedback({ error: message }, document));
    } finally {
      setIsConsulting(false);
    }
  };

  const handleRetryHmlDocument = async (document: NfeDocumentRecord) => {
    if (
      !canOperateFiscal ||
      retryingHmlDocumentId ||
      document.ambiente !== 2 ||
      !document.fiscal_ruleset_version?.startsWith('HML_') ||
      !['pendente', 'erro'].includes(document.status)
    ) {
      return;
    }

    setFiscalIssueFeedback(null);
    setRetryingHmlDocumentId(document.id);
    try {
      const result: FiscalIssueResult = await retryHmlDocument(document.id);
      if (!result.success) {
        setFiscalIssueFeedback(makeFiscalIssueFeedback(result, document));
        await loadDocuments();
        return;
      }

      toast.success(
        `NFC-e HML nº ${result.nfeNumber || document.numero_nfe} autorizada pela SEFAZ${result.protocolNumber ? ` (protocolo ${result.protocolNumber})` : ''}.`
      );
      await loadDocuments();
    } catch (error: unknown) {
      setFiscalIssueFeedback(
        makeFiscalIssueFeedback(
          {
            error:
              error instanceof Error && error.message
                ? error.message
                : 'Não foi possível retomar a tentativa HML.',
          },
          document
        )
      );
      await loadDocuments();
    } finally {
      setRetryingHmlDocumentId(null);
    }
  };

  const handlePrint = async (doc: NfeDocumentRecord) => {
    try {
      await printDanfe(doc);
    } catch (error: unknown) {
      toast.error(
        'Erro ao abrir DANFE: ' +
          (error instanceof Error ? error.message : 'Falha inesperada.')
      );
    }
  };

  const handleDownload = async (doc: NfeDocumentRecord) => {
    try {
      await downloadXml(doc);
      toast.success('XML baixado com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível baixar o XML.');
    }
  };

  return {
    isConsulting,
    retryingHmlDocumentId,
    fiscalIssueFeedback,
    setFiscalIssueFeedback,
    handleConsultSituation,
    handleRetryHmlDocument,
    handlePrint,
    handleDownload,
  };
}
