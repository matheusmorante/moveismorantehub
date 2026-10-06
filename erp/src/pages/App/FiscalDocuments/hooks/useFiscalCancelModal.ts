import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatToBRDate } from '@/pages/utils/formatters';
import type {
  CancellationEligibility,
  NfeDocumentRecord,
} from '../types/fiscalDocuments.types';
import { executeFiscalCancellation } from '../services/fiscalCancellationService';

export interface UseFiscalCancelModalParams {
  onSuccess: () => Promise<void>;
  onEstornoTrigger: (doc: NfeDocumentRecord, draftId: string) => void;
}

export function useFiscalCancelModal({
  onSuccess,
  onEstornoTrigger,
}: UseFiscalCancelModalParams) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<NfeDocumentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);
  const [productionCancelConfirmed, setProductionCancelConfirmed] = useState(false);

  const openCancel = (doc: NfeDocumentRecord, eligibility?: CancellationEligibility) => {
    if (!eligibility?.canProceed) {
      toast.info(eligibility?.reason || 'A elegibilidade fiscal não pôde ser confirmada.');
      return;
    }
    setSelectedDoc(doc);
    setCancelReason('');
    setProductionCancelConfirmed(false);
    setShowCancelModal(true);
  };

  const closeCancel = () => {
    setShowCancelModal(false);
    setSelectedDoc(null);
    setCancelReason('');
    setProductionCancelConfirmed(false);
  };

  const handleConfirmCancel = async (eligibility?: CancellationEligibility) => {
    if (!selectedDoc) return;
    if (!eligibility?.canProceed || !selectedDoc.order_id) {
      toast.error(eligibility?.reason || 'Não foi possível validar o pedido vinculado.');
      return;
    }

    const isCancelEvent = eligibility.action === 'cancel';

    if (
      isCancelEvent &&
      (!cancelReason ||
        Array.from(cancelReason.trim()).length < 15 ||
        Array.from(cancelReason.trim()).length > 255)
    ) {
      toast.error('A justificativa deve ter entre 15 e 255 caracteres.');
      return;
    }

    if (isCancelEvent && selectedDoc.ambiente === 1 && !productionCancelConfirmed) {
      toast.error('Confirme que deseja cancelar a nota no ambiente de Produção.');
      return;
    }

    setIsCanceling(true);
    let commercialCommitted = false;

    try {
      const result = await executeFiscalCancellation({
        document: selectedDoc,
        reason: cancelReason,
        isCancelEvent,
        productionConfirmed: productionCancelConfirmed,
      });

      commercialCommitted = result.commercialCommitted;

      if (result.action === 'cancel') {
        const fiscalEvidence = [
          result.protocolNumber ? `protocolo ${result.protocolNumber}` : '',
          result.cStat ? `cStat ${result.cStat}` : '',
          result.protocolDate ? formatToBRDate(result.protocolDate) : '',
        ]
          .filter(Boolean)
          .join(' · ');

        if (result.reconciliationRequired) {
          toast.warning(
            `SEFAZ confirmou o cancelamento da NF-e #${selectedDoc.numero_nfe}${fiscalEvidence ? ` (${fiscalEvidence})` : ''}, mas a situação local precisa ser reconciliada. Consulte a SEFAZ antes de qualquer nova ação.`
          );
        } else {
          toast.success(
            `Cancelamento da NF-e #${selectedDoc.numero_nfe} registrado pela SEFAZ${fiscalEvidence ? ` · ${fiscalEvidence}` : ''}${result.xMotivo ? ` · ${result.xMotivo}` : ''}`
          );
        }
      } else if (result.action === 'estorno' && result.draftId) {
        onEstornoTrigger(selectedDoc, result.draftId);
        toast.info('A política fiscal indicou estorno. O rascunho foi aberto para revisão fiscal.');
      } else {
        toast.info('O pedido foi cancelado; não há outro efeito fiscal autorizado pendente.');
      }

      closeCancel();
      await onSuccess();
    } catch (error: unknown) {
      const prefix = commercialCommitted
        ? 'Pedido e estoque foram cancelados; o tratamento fiscal ficou pendente: '
        : 'Não foi possível concluir o cancelamento: ';
      const message =
        error instanceof Error && error.message ? error.message : 'Falha inesperada.';
      toast.error(prefix + message);

      if (commercialCommitted) {
        closeCancel();
        await onSuccess();
      }
    } finally {
      setIsCanceling(false);
    }
  };

  return {
    showCancelModal,
    selectedDoc,
    cancelReason,
    setCancelReason,
    isCanceling,
    productionCancelConfirmed,
    setProductionCancelConfirmed,
    openCancel,
    closeCancel,
    handleConfirmCancel,
  };
}
