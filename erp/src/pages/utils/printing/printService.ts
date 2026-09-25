import Order from "@/pages/types/order.type";
import { toast } from "react-toastify";
import { DanfeData } from "../nfe/danfeGenerator";
import { 
    checkPrintAgentHealth, 
    fetchAvailablePrinters, 
    fetchPrintPresets, 
    savePrintPresets, 
    fetchMachineConfig,
    saveMachineConfig,
    sendDirectPrintJob, 
    sendDirectPrintTest 
} from "./printAgentClient";
import { executePrintFallback } from "./printFallbackHandler";
import { buildSalesOrderHtml, buildReceiptHtml, buildDanfeHtml } from "./printHtmlBuilder";
import { PrintAgentHealth, PrinterDevice, PrintJobResult, PrintPreset, MachinePrintConfig } from "./print.types";
import { 
    getLocalSelectedPrinter, 
    setLocalSelectedPrinter, 
    getLocalDocumentQuality, 
    setLocalDocumentQuality 
} from "./printStorage";

const generateJobId = (prefix: string): string => {
    return `job_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

interface PrintOptions {
    printerName?: string;
    autoFallback?: boolean;
}

/**
 * IMPRESSÃO DIRETA: Imprime o Recibo de Venda diretamente no Spooler do Windows via Print Agent.
 * Caso o agente local não esteja disponível ou ocorra falha, aciona automaticamente o fallback do navegador.
 */
export const printReceipt = async (
    order: Order,
    options?: PrintOptions
): Promise<PrintJobResult> => {
    if (!order.seller) {
        toast.error("Atendente obrigatório para imprimir recibo.");
        return { success: false, status: 'error', message: 'Atendente não informado' };
    }

    if (!order.customerData?.fullName || order.customerData.fullName === "Nenhum" || order.customerData.fullName === "Ao Consumidor") {
        toast.error("Não é possível imprimir o recibo para pedidos sem cliente associado.");
        return { success: false, status: 'error', message: 'Cliente não informado' };
    }

    const autoFallback = options?.autoFallback ?? true;
    const toastId = toast.loading("Enviando para impressão...");

    try {
        const health = await checkPrintAgentHealth();
        if (!health.isOnline) {
            toast.dismiss(toastId);
            if (autoFallback) {
                return executePrintFallback('receipt', order);
            }
            toast.error("Não foi possível imprimir diretamente. O agente de impressão local está desconectado.");
            return { success: false, status: 'error', message: 'Agente local de impressão offline' };
        }

        const html = buildReceiptHtml(order);
        const jobId = generateJobId('receipt');
        const targetPrinter = options?.printerName || getLocalSelectedPrinter() || undefined;
        const localQuality = getLocalDocumentQuality('receipt');

        const result = await sendDirectPrintJob({
            printJobId: jobId,
            type: 'receipt',
            html,
            printerName: targetPrinter,
            options: localQuality ? { quality: localQuality } : undefined,
        });

        toast.dismiss(toastId);

        if (result.success) {
            toast.success(`Recibo enviado para ${result.printer || targetPrinter || 'EPSON L3250'}.`);
            return result;
        }

        if (autoFallback) {
            return executePrintFallback('receipt', order);
        }

        toast.error(`Não foi possível imprimir diretamente: ${result.message || 'Erro no spooler'}`);
        return result;
    } catch (err: any) {
        toast.dismiss(toastId);
        console.error('[PrintService] Erro na impressão direta do recibo:', err);
        if (autoFallback) {
            return executePrintFallback('receipt', order);
        }
        const isOffline = err.message?.includes('Failed to fetch') || err.name === 'AbortError';
        toast.error(isOffline ? "Não foi possível imprimir diretamente. O agente local está desconectado." : "Não foi possível imprimir diretamente.");
        return { success: false, status: 'error', message: err.message };
    }
};

/**
 * IMPRESSÃO DIRETA: Imprime o Pedido de Venda diretamente no Spooler do Windows via Print Agent.
 * Caso o agente local não esteja disponível ou ocorra falha, aciona automaticamente o fallback do navegador.
 */
export const printSalesOrder = async (
    order: Order,
    options?: PrintOptions
): Promise<PrintJobResult> => {
    if (!order.seller) {
        toast.error("Atendente obrigatório para imprimir o pedido.");
        return { success: false, status: 'error', message: 'Atendente não informado' };
    }

    const autoFallback = options?.autoFallback ?? true;
    const toastId = toast.loading("Enviando para impressão...");

    try {
        const health = await checkPrintAgentHealth();
        if (!health.isOnline) {
            toast.dismiss(toastId);
            if (autoFallback) {
                return executePrintFallback('sales_order', order);
            }
            toast.error("Não foi possível imprimir diretamente. O agente de impressão local está desconectado.");
            return { success: false, status: 'error', message: 'Agente local de impressão offline' };
        }

        const html = buildSalesOrderHtml(order);
        const jobId = generateJobId('order');
        const targetPrinter = options?.printerName || getLocalSelectedPrinter() || undefined;
        const localQuality = getLocalDocumentQuality('sales_order');

        const result = await sendDirectPrintJob({
            printJobId: jobId,
            type: 'sales_order',
            html,
            printerName: targetPrinter,
            options: localQuality ? { quality: localQuality } : undefined,
        });

        toast.dismiss(toastId);

        if (result.success) {
            toast.success(`Pedido enviado para ${result.printer || targetPrinter || 'EPSON L3250'}.`);
            return result;
        }

        if (autoFallback) {
            return executePrintFallback('sales_order', order);
        }

        toast.error(`Não foi possível imprimir diretamente: ${result.message || 'Erro no spooler'}`);
        return result;
    } catch (err: any) {
        toast.dismiss(toastId);
        console.error('[PrintService] Erro na impressão direta do pedido:', err);
        if (autoFallback) {
            return executePrintFallback('sales_order', order);
        }
        const isOffline = err.message?.includes('Failed to fetch') || err.name === 'AbortError';
        toast.error(isOffline ? "Não foi possível imprimir diretamente. O agente local está desconectado." : "Não foi possível imprimir diretamente.");
        return { success: false, status: 'error', message: err.message };
    }
};

/**
 * IMPRESSÃO DIRETA: Imprime o DANFE oficial (NF-e ou NFC-e) diretamente via Print Agent.
 * Caso o agente local não esteja disponível ou ocorra falha, aciona automaticamente o fallback do navegador.
 */
export const printDanfe = async (
    danfeData: DanfeData,
    options?: PrintOptions
): Promise<PrintJobResult> => {
    const autoFallback = options?.autoFallback ?? true;
    const toastId = toast.loading("Enviando para impressão...");
    const html = buildDanfeHtml(danfeData);

    try {
        const health = await checkPrintAgentHealth();
        if (!health.isOnline) {
            toast.dismiss(toastId);
            if (autoFallback) {
                return executePrintFallback('danfe', danfeData.order, html);
            }
            toast.error("Não foi possível imprimir diretamente. O agente de impressão local está desconectado.");
            return { success: false, status: 'error', message: 'Agente local de impressão offline' };
        }

        const jobId = generateJobId('danfe');
        const targetPrinter = options?.printerName || getLocalSelectedPrinter() || undefined;
        const localQuality = getLocalDocumentQuality('danfe');

        const result = await sendDirectPrintJob({
            printJobId: jobId,
            type: 'danfe',
            html,
            printerName: targetPrinter,
            options: localQuality ? { quality: localQuality } : undefined,
        });

        toast.dismiss(toastId);

        if (result.success) {
            toast.success(`DANFE enviado para ${result.printer || targetPrinter || 'EPSON L3250'}.`);
            return result;
        }

        if (autoFallback) {
            return executePrintFallback('danfe', danfeData.order, html);
        }

        toast.error(`Não foi possível imprimir diretamente: ${result.message || 'Erro no spooler'}`);
        return result;
    } catch (err: any) {
        toast.dismiss(toastId);
        console.error('[PrintService] Erro na impressão direta do DANFE:', err);
        if (autoFallback) {
            return executePrintFallback('danfe', danfeData.order, html);
        }
        const isOffline = err.message?.includes('Failed to fetch') || err.name === 'AbortError';
        toast.error(isOffline ? "Não foi possível imprimir diretamente. O agente local está desconectado." : "Não foi possível imprimir diretamente.");
        return { success: false, status: 'error', message: err.message };
    }
};

/**
 * IMPRESSÃO CONVENCIONAL: Abre a janela padrão do navegador como contingência.
 */
export const printConventional = (
    type: 'sales_order' | 'receipt' | 'danfe',
    order?: Order,
    html?: string
): PrintJobResult => {
    return executePrintFallback(type, order, html);
};

export const printTestPage = async (printerName?: string): Promise<PrintJobResult> => {
    const targetPrinter = printerName || getLocalSelectedPrinter() || undefined;
    return sendDirectPrintTest(targetPrinter);
};

export const getAgentHealth = async (): Promise<PrintAgentHealth> => {
    return checkPrintAgentHealth();
};

export const getPrinters = async (forceRefresh = false): Promise<PrinterDevice[]> => {
    return fetchAvailablePrinters(forceRefresh);
};

export const getPresets = async (): Promise<Record<string, PrintPreset> | null> => {
    return fetchPrintPresets();
};

export const savePresets = async (presets: Record<string, PrintPreset>): Promise<boolean> => {
    return savePrintPresets(presets);
};

export const getMachinePrintConfig = async (): Promise<{ config: MachinePrintConfig; configPath: string } | null> => {
    return fetchMachineConfig();
};

export const updateMachinePrintConfig = async (config: Partial<MachinePrintConfig>): Promise<boolean> => {
    return saveMachineConfig(config);
};

export { 
    getLocalSelectedPrinter, 
    setLocalSelectedPrinter, 
    getLocalDocumentQuality, 
    setLocalDocumentQuality 
};

export default {
    printSalesOrder,
    printReceipt,
    printDanfe,
    printConventional,
    printTestPage,
    getAgentHealth,
    getPrinters,
    getPresets,
    savePresets,
    getMachinePrintConfig,
    updateMachinePrintConfig,
    getLocalSelectedPrinter,
    setLocalSelectedPrinter,
};
