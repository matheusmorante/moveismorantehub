import Order from "@/pages/types/order.type";
import { toast } from "react-toastify";
import { PrintDocumentType, PrintJobResult } from "./print.types";

/**
 * Executa o fallback padrão do navegador abrindo a visualização/impressão tradicional.
 */
export const executePrintFallback = (
    type: PrintDocumentType,
    order?: Order,
    html?: string
): PrintJobResult => {
    toast.info("Agente de impressão local não detectado. Utilizando janela de impressão padrão.");

    try {
        if (type === 'sales_order' && order) {
            sessionStorage.setItem("order", JSON.stringify(order));
            window.open("/order", "_blank");
            return { success: true, status: 'fallback_browser', message: 'Aberto na janela de impressão do navegador' };
        }

        if (type === 'receipt' && order) {
            sessionStorage.setItem("order", JSON.stringify(order));
            window.open("/receipt", "_blank");
            return { success: true, status: 'fallback_browser', message: 'Aberto na janela de impressão do navegador' };
        }

        if (type === 'danfe' && html) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
            }
            return { success: true, status: 'fallback_browser', message: 'Aberto na janela de impressão do navegador' };
        }

        window.print();
        return { success: true, status: 'fallback_browser', message: 'Disparada impressão padrão do navegador' };
    } catch (err: any) {
        console.error('[PrintFallback] Erro no fallback de impressão:', err);
        return { success: false, status: 'error', message: 'Falha ao abrir impressão convencional' };
    }
};
