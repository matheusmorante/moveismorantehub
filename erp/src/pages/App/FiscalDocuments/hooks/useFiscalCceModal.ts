import { useState } from 'react';
import { toast } from 'react-toastify';
import { validateNfeCce } from '@/pages/utils/nfe/nfeCce';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';
import {
  fetchCceHistory,
  reconcileCce,
  submitCce as submitCceApi,
} from '../services/fiscalCceService';

export function useFiscalCceModal(onDocumentUpdated?: () => Promise<void>) {
  const [showCceModal, setShowCceModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<NfeDocumentRecord | null>(null);
  const [cceText, setCceText] = useState('');
  const [isSubmittingCce, setIsSubmittingCce] = useState(false);
  const [isLoadingCceInfo, setIsLoadingCceInfo] = useState(false);
  const [ccePreviousCorrection, setCcePreviousCorrection] = useState('');
  const [cceNextSequence, setCceNextSequence] = useState<number | null>(1);
  const [ccePending, setCcePending] = useState(false);
  const [cceRequestId, setCceRequestId] = useState<string | null>(null);
  const [productionCceConfirmed, setProductionCceConfirmed] = useState(false);

  const loadHistory = async (document: NfeDocumentRecord) => {
    const result = await fetchCceHistory(document.id);
    setCcePreviousCorrection(result.previousCorrection || '');
    setCceText(result.previousCorrection || '');
    setCceNextSequence(result.nextSequence ?? null);
    setCcePending(Boolean(result.pending));
    setCceRequestId(null);
  };

  const openCce = async (document: NfeDocumentRecord) => {
    setSelectedDoc(document);
    setShowCceModal(true);
    setCceText('');
    setCcePreviousCorrection('');
    setCceNextSequence(null);
    setCcePending(false);
    setCceRequestId(null);
    setProductionCceConfirmed(false);
    setIsLoadingCceInfo(true);

    try {
      await loadHistory(document);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível carregar o histórico de CC-e.'
      );
    } finally {
      setIsLoadingCceInfo(false);
    }
  };

  const closeCce = () => {
    setShowCceModal(false);
    setSelectedDoc(null);
    setCceText('');
    setCcePreviousCorrection('');
    setCceRequestId(null);
    setCcePending(false);
    setProductionCceConfirmed(false);
  };

  const handleReconcile = async () => {
    if (!selectedDoc || isSubmittingCce) return;
    setIsSubmittingCce(true);
    try {
      const result = await reconcileCce(selectedDoc.id);
      if (result.pending) {
        setCcePending(true);
        toast.warning(result.error || 'A SEFAZ ainda não confirmou o resultado da CC-e.');
        return;
      }
      if (!result.success) {
        throw new Error(result.error || result.xMotivo || 'A reconciliação da CC-e falhou.');
      }
      toast.success(
        `CC-e ${result.sequence} confirmada pela SEFAZ${result.protocolNumber ? ` (protocolo ${result.protocolNumber})` : ''}.`
      );
      await loadHistory(selectedDoc);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível reconciliar a CC-e.'
      );
    } finally {
      setIsSubmittingCce(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDoc || isSubmittingCce || ccePending) return;

    const correctionError = validateNfeCce(cceText);
    if (correctionError) {
      toast.error(correctionError);
      return;
    }
    if (selectedDoc.ambiente === 1 && !productionCceConfirmed) {
      toast.error('Confirme que deseja transmitir a CC-e no ambiente de Produção.');
      return;
    }

    setIsSubmittingCce(true);
    let transmissionStarted = false;
    try {
      const requestId = cceRequestId || window.crypto.randomUUID();
      setCceRequestId(requestId);
      transmissionStarted = true;

      const result = await submitCceApi({
        documentId: selectedDoc.id,
        correction: cceText,
        requestId,
        productionConfirmed: productionCceConfirmed,
      });

      if (result.pending) {
        setCcePending(true);
        toast.warning(result.error || 'Resultado incerto. Consulte a SEFAZ antes de repetir.');
        return;
      }
      if (!result.success) {
        setCceRequestId(null);
        throw new Error(result.error || result.xMotivo || 'A SEFAZ não confirmou a CC-e.');
      }

      toast.success(
        `CC-e ${result.sequence} registrada pela SEFAZ${result.protocolNumber ? ` (protocolo ${result.protocolNumber})` : ''}.`
      );
      closeCce();
      if (onDocumentUpdated) await onDocumentUpdated();
    } catch (error: unknown) {
      if (transmissionStarted) setCcePending(true);
      toast.error(
        transmissionStarted
          ? 'Não foi possível confirmar a resposta. Consulte a tentativa antes de enviar novamente.'
          : error instanceof Error && error.message
            ? error.message
            : 'Erro ao transmitir a CC-e.'
      );
    } finally {
      setIsSubmittingCce(false);
    }
  };

  return {
    showCceModal,
    selectedDoc,
    cceText,
    setCceText,
    isSubmittingCce,
    isLoadingCceInfo,
    ccePreviousCorrection,
    cceNextSequence,
    ccePending,
    productionCceConfirmed,
    setProductionCceConfirmed,
    openCce,
    closeCce,
    handleReconcile,
    handleSubmit,
  };
}
