import type Order from '@/pages/types/order.type';
import { toast } from 'react-toastify';
import type { PrintDocumentType, PrintJobResult } from './print.types';

/** Abre o diálogo de impressão assim que o DANFE estiver carregado. */
export const executeDanfePrintFallback = (
  html: string,
  existingPrintWindow?: Window | null
): PrintJobResult => {
  let printWindow = existingPrintWindow ?? null;

  try {
    printWindow ??= window.open('', '_blank');
    if (!printWindow || printWindow.closed) {
      const message = 'O navegador bloqueou a janela de impressão. Permita pop-ups para este ERP e tente novamente.';
      toast.error(message);
      return { success: false, status: 'error', message };
    }

    const targetWindow = printWindow;
    targetWindow.document.open();
    targetWindow.addEventListener(
      'load',
      () => {
        if (targetWindow.closed) return;
        try {
          targetWindow.addEventListener(
            'afterprint',
            () => {
              if (!targetWindow.closed) targetWindow.close();
            },
            { once: true }
          );
          targetWindow.focus();
          targetWindow.print();
        } catch (error) {
          console.error('[PrintFallback] Erro ao iniciar impressão do DANFE:', error);
          toast.error('Não foi possível iniciar a impressão do DANFE.');
        }
      },
      { once: true }
    );
    targetWindow.document.write(html);
    targetWindow.document.close();
    toast.info('Abrindo a janela de impressão do DANFE.');
    return {
      success: true,
      status: 'fallback_browser',
      message: 'Janela de impressão do navegador aberta',
    };
  } catch (error) {
    console.error('[PrintFallback] Erro ao preparar DANFE para impressão:', error);
    if (printWindow && !printWindow.closed) printWindow.close();
    const message = 'Não foi possível abrir a janela de impressão do DANFE.';
    toast.error(message);
    return { success: false, status: 'error', message };
  }
};

/** Executa o fallback padrão do navegador para os documentos do ERP. */
export const executePrintFallback = (
  type: PrintDocumentType,
  order?: Order,
  html?: string,
  existingPrintWindow?: Window | null
): PrintJobResult => {
  if (type === 'danfe' && html) {
    return executeDanfePrintFallback(html, existingPrintWindow);
  }

  toast.info('Selecione a impressora na janela de impressão do navegador.');

  try {
    if (type === 'sales_order' && order) {
      sessionStorage.setItem('order', JSON.stringify(order));
      window.open('/order', '_blank');
      return {
        success: true,
        status: 'fallback_browser',
        message: 'Aberto na janela de impressão do navegador',
      };
    }

    if (type === 'receipt' && order) {
      sessionStorage.setItem('order', JSON.stringify(order));
      window.open('/receipt', '_blank');
      return {
        success: true,
        status: 'fallback_browser',
        message: 'Aberto na janela de impressão do navegador',
      };
    }

    window.print();
    return {
      success: true,
      status: 'fallback_browser',
      message: 'Disparada impressão padrão do navegador',
    };
  } catch (err: any) {
    console.error('[PrintFallback] Erro no fallback de impressão:', err);
    return { success: false, status: 'error', message: 'Falha ao abrir impressão convencional' };
  }
};
