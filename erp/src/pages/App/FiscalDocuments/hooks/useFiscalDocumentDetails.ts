import { useState } from 'react';
import { toast } from 'react-toastify';
import type {
  FiscalDocumentDetails,
  NfeDocumentRecord,
} from '../types/fiscalDocuments.types';
import { fetchFiscalDocumentDetails } from '../services/fiscalDocumentsService';

export function useFiscalDocumentDetails() {
  const [detailsDocumentId, setDetailsDocumentId] = useState<string | null>(null);
  const [fiscalDetails, setFiscalDetails] = useState<Record<string, FiscalDocumentDetails>>({});
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);

  const toggleDetails = async (doc: NfeDocumentRecord) => {
    if (detailsDocumentId === doc.id) {
      setDetailsDocumentId(null);
      return;
    }

    setDetailsDocumentId(doc.id);
    if (fiscalDetails[doc.id] || detailsLoadingId === doc.id) return;

    setDetailsLoadingId(doc.id);
    try {
      const details = await fetchFiscalDocumentDetails(doc.id);
      setFiscalDetails((current) => ({
        ...current,
        [doc.id]: details,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao consultar detalhes fiscais.');
    } finally {
      setDetailsLoadingId(null);
    }
  };

  return {
    detailsDocumentId,
    setDetailsDocumentId,
    fiscalDetails,
    detailsLoadingId,
    toggleDetails,
  };
}
