import React from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import {
  generateAndSaveWarrantyTerm,
  fetchWarrantyTermsByOrderId,
  sendWarrantyTermWhatsApp,
  sendDirectWarrantyTermViaMetaApi,
  printWarrantyTermDocument,
} from '@/pages/utils/warranty/warrantyTermService';
import type {
  WarrantyTermRecord,
  GeneratedWarrantyPdf,
} from '@/pages/utils/warranty/warrantyTypes';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface UseWarrantyModalStateParams {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export function useWarrantyModalState({
  order,
  isOpen,
  onClose,
}: UseWarrantyModalStateParams) {
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [currentRecord, setCurrentRecord] = React.useState<WarrantyTermRecord | null>(null);
  const [currentPdf, setCurrentPdf] = React.useState<GeneratedWarrantyPdf | null>(null);

  const customer = order.customerData;

  // Travar o scroll da página de trás (body e html) com contagem de referências
  useBodyScrollLock(isOpen);

  // Fechamento por teclado (Escape)
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadData = React.useCallback(async () => {
    if (!order?.id) return;
    try {
      const records = await fetchWarrantyTermsByOrderId(order.id);
      if (records && records.length > 0) {
        setCurrentRecord(records[0]);
      }
    } catch (err: any) {
      console.warn('Falha ao carregar termos de garantia existentes:', err.message);
    }
  }, [order?.id]);

  React.useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const ensureDocumentReady = async (): Promise<{
    record: WarrantyTermRecord;
    pdf?: GeneratedWarrantyPdf;
  }> => {
    if (currentRecord && currentPdf) {
      return { record: currentRecord, pdf: currentPdf };
    }

    setActionLoading('Gerando documento oficial...');
    try {
      const result = await generateAndSaveWarrantyTerm(order);
      setCurrentRecord(result.record);
      setCurrentPdf(result.generatedPdf);
      return { record: result.record, pdf: result.generatedPdf };
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrint = async (): Promise<boolean> => {
    try {
      const { record, pdf } = await ensureDocumentReady();
      const targetUrl = pdf?.pdfUrl || record.file_url;
      if (targetUrl) {
        printWarrantyTermDocument(targetUrl);
        return true;
      } else {
        toast.error('URL do documento não disponível para impressão.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao preparar impressão do termo.');
    }
    return false;
  };

  const handleSendWhatsApp = async (): Promise<boolean> => {
    if (!customer?.phone) {
      toast.error('Cliente sem telefone cadastrado no pedido.');
      return false;
    }

    setActionLoading('Enviando Termo de Garantia pelo WhatsApp...');
    try {
      const { record } = await ensureDocumentReady();
      const res = await sendWarrantyTermWhatsApp({
        order,
        warrantyRecord: record,
        recipientPhone: customer.phone,
      });

      if (res.success) {
        toast.success(res.message);
      } else {
        toast.warning(res.message);
      }
      await loadData();
      return res.success;
    } catch (err: any) {
      toast.error(err.message || 'Falha ao enviar documento pelo WhatsApp.');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendDirectCloudApi = async (): Promise<boolean> => {
    if (!customer?.phone) {
      toast.error('Cliente sem telefone cadastrado no pedido.');
      return false;
    }

    setActionLoading('Preparando Termo de Garantia...');
    try {
      const { record } = await ensureDocumentReady();
      setActionLoading(null);
      const success = await sendDirectWarrantyTermViaMetaApi({
        order,
        warrantyRecord: record,
        recipientPhone: customer.phone,
      });
      if (success) {
        await loadData();
      }
      return success;
    } catch (err: any) {
      toast.error(err.message || 'Falha ao processar envio do documento.');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  return {
    actionLoading,
    currentRecord,
    currentPdf,
    handlePrint,
    handleSendWhatsApp,
    handleSendDirectCloudApi,
  };
}
