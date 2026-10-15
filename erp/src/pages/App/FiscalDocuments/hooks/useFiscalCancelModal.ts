import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createFiscalCancellationFormSchema } from '../../../../../../shared-utils/fiscalOperationFormSchemas';
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
  const submissionInFlight = useRef(false);
  const formValues = { reason: cancelReason, productionConfirmed: productionCancelConfirmed };
  const cancellationForm = useZodForm(createFiscalCancellationFormSchema({
    isCancelEvent: true, environment: selectedDoc?.ambiente || 2,
  }), formValues);
  const estornoForm = useZodForm(createFiscalCancellationFormSchema({
    isCancelEvent: false, environment: selectedDoc?.ambiente || 2,
  }), formValues);

  const openCancel = (doc: NfeDocumentRecord, eligibility?: CancellationEligibility) => {
    if (submissionInFlight.current) return;
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
    if (submissionInFlight.current) return;
    if (!selectedDoc) return;
    if (!eligibility?.canProceed || !selectedDoc.order_id) {
      toast.error(eligibility?.reason || 'Não foi possível validar o pedido vinculado.');
      return;
    }

    const isCancelEvent = eligibility.action === 'cancel';

    submissionInFlight.current = true;
    try {
      return await (isCancelEvent ? cancellationForm : estornoForm).validateAndRun(formValues, async (validated) => {
        setIsCanceling(true);
        let commercialCommitted = false;

        try {
          const result = await executeFiscalCancellation({
            document: selectedDoc,
            reason: validated.reason,
            isCancelEvent,
            productionConfirmed: validated.productionConfirmed,
          });

          commercialCommitted = result.commercialCommitted;

          if (result.action === 'failed') {
            toast.warning(
              `Pedido cancelado e estoque atualizado. Falha na tentativa de cancelamento fiscal: ${result.error || 'consulte a NF no pedido.'}`
            );
          } else if (result.action === 'batch') {
            const outcomes = result.results || [];
            const failed = outcomes.filter((item) => item.action === 'failed').length;
            const pending = outcomes.filter((item) => item.action === 'reconcile').length;
            if (failed || pending) {
              toast.warning(
                `Pedido cancelado e estoque atualizado. ${failed} nota(s) com falha e ${pending} pendente(s) de confirmação. Atualize a lista para ver o estado de cada NF/NFH.`
              );
            } else {
              toast.success('Pedido cancelado; tratamento fiscal das notas autorizadas concluído.');
            }
          } else if (result.action === 'cancel') {
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
      }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0] || 'Cancelamento fiscal inválido.'));
    } finally {
      submissionInFlight.current = false;
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
