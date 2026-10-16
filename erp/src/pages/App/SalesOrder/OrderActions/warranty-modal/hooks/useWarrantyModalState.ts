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
  const [activePage, setActivePage] = React.useState<number>(1);
  const [zoomLevel, setZoomLevel] = React.useState<number>(100);
  const totalPages = 3;

  const mainScrollRef = React.useRef<HTMLElement | null>(null);
  const pageRefs = React.useRef<Record<number, HTMLElement | null>>({});
  const activePageRef = React.useRef(activePage);
  activePageRef.current = activePage;

  const customer = order.customerData;

  // Travar o scroll da página de trás (body e html) com contagem de referências
  useBodyScrollLock(isOpen);

  const handlePageChange = React.useCallback(
    (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages) return;
      setActivePage(targetPage);

      const targetEl = pageRefs.current[targetPage];
      const scrollContainer = mainScrollRef.current;
      if (targetEl && scrollContainer) {
        const containerTop = scrollContainer.getBoundingClientRect().top;
        const elementTop = targetEl.getBoundingClientRect().top;
        const offset = elementTop - containerTop + scrollContainer.scrollTop - 20;

        scrollContainer.scrollTo({
          top: Math.max(0, offset),
          behavior: 'smooth',
        });
      }
    },
    [totalPages]
  );

  // Navegação e fechamento por teclado (Escape, ArrowRight, ArrowLeft)
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handlePageChange(activePageRef.current + 1);
      } else if (e.key === 'ArrowLeft') {
        handlePageChange(activePageRef.current - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePageChange]);

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

  const handlePrint = async () => {
    try {
      const { record, pdf } = await ensureDocumentReady();
      const targetUrl = pdf?.pdfUrl || record.file_url;
      if (targetUrl) {
        printWarrantyTermDocument(targetUrl);
      } else {
        toast.error('URL do documento não disponível para impressão.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao preparar impressão do termo.');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!customer?.phone) {
      toast.error('Cliente sem telefone cadastrado no pedido.');
      return;
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
    } catch (err: any) {
      toast.error(err.message || 'Falha ao enviar documento pelo WhatsApp.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendDirectCloudApi = async () => {
    if (!customer?.phone) {
      toast.error('Cliente sem telefone cadastrado no pedido.');
      return;
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
    } catch (err: any) {
      toast.error(err.message || 'Falha ao processar envio do documento.');
    } finally {
      setActionLoading(null);
    }
  };

  const zoomFactor = zoomLevel / 100;
  const pageBaseWidth = 840; // Largura base da folha A4 em pixels no zoom 100%
  const currentSheetWidth = `${pageBaseWidth * zoomFactor}px`;

  return {
    actionLoading,
    currentRecord,
    currentPdf,
    activePage,
    zoomLevel,
    setZoomLevel,
    totalPages,
    mainScrollRef,
    pageRefs,
    currentSheetWidth,
    handlePageChange,
    handlePrint,
    handleSendWhatsApp,
    handleSendDirectCloudApi,
  };
}
