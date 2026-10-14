import { useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { legacyCceFormSchema } from '../../../../../../shared-utils/legacyFiscalFormSchemas';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';
import {
  fetchCceHistory,
  reconcileCce,
} from '../services/fiscalCceService';

export function useFiscalCceModal(onDocumentUpdated?: () => Promise<void>) {
  const [showCceModal, setShowCceModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<NfeDocumentRecord | null>(null);
  const [cceText, setCceText] = useState('');
  const form = useZodForm(legacyCceFormSchema, { correction: cceText });
  const [isSubmittingCce, setIsSubmittingCce] = useState(false);
  const [isLoadingCceInfo, setIsLoadingCceInfo] = useState(false);
  const [ccePreviousCorrection, setCcePreviousCorrection] = useState('');
  const [cceNextSequence, setCceNextSequence] = useState<number | null>(1);
  const [ccePending, setCcePending] = useState(false);
  const [productionCceConfirmed, setProductionCceConfirmed] = useState(false);

  const loadHistory = async (document: NfeDocumentRecord) => {
    const result = await fetchCceHistory(document.id);
    setCcePreviousCorrection(result.previousCorrection || '');
    setCceText(result.previousCorrection || '');
    setCceNextSequence(result.nextSequence ?? null);
    setCcePending(Boolean(result.pending));
  };

  const openCce = async (document: NfeDocumentRecord) => {
    setSelectedDoc(document);
    setShowCceModal(true);
    setCceText('');
    setCcePreviousCorrection('');
    setCceNextSequence(null);
    setCcePending(false);
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
      if (onDocumentUpdated) await onDocumentUpdated();
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
    await form.validateAndRun({ correction: cceText }, () => undefined,
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0]));
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
