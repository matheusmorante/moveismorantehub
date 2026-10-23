import type Order from '@/pages/types/order.type';
import { toast } from 'react-toastify';
import type { PrintDocumentType, PrintJobResult } from './print.types';

/** Abre a aba no clique, antes de os dados fiscais serem carregados. */
export const openDanfePrintPreparationWindow = (): Window | null => {
  let printWindow: Window | null = null;
  try {
    printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(
        'O navegador bloqueou a janela de impressão. Permita pop-ups para este ERP e tente novamente.'
      );
      return null;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Preparando DANFE</title>
      <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#334155;font:16px system-ui,-apple-system,"Segoe UI",sans-serif}main{text-align:center;padding:24px}.spinner{width:24px;height:24px;margin:0 auto 12px;border:3px solid #cbd5e1;border-top-color:#2563eb;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style>
      </head><body><main role="status" aria-live="polite"><div class="spinner" aria-hidden="true"></div><strong>Preparando o DANFE para impressão…</strong></main></body></html>`);
    printWindow.document.close();
    return printWindow;
  } catch {
    if (printWindow && !printWindow.closed) printWindow.close();
    toast.error('Não foi possível abrir a janela de impressão do DANFE.');
    return null;
  }
};

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
