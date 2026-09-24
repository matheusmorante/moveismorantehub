import { exec } from 'child_process';
import { promisify } from 'util';
import { getPrinters as getPdfPrinters, getDefaultPrinter as getPdfDefaultPrinter } from 'pdf-to-printer';

const execAsync = promisify(exec);

export interface PrinterDevice {
    name: string;
    isDefault: boolean;
    status?: string;
    portName?: string;
}

let cachedPrinters: PrinterDevice[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60000; // 60 segundos de cache

export const listWindowsPrinters = async (forceRefresh = false): Promise<PrinterDevice[]> => {
    const now = Date.now();
    if (!forceRefresh && cachedPrinters && (now - lastCacheTime < CACHE_TTL_MS)) {
        return cachedPrinters;
    }

    try {
        // Consulta nativa no Windows via CIM / WMI
        const cmd = 'powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object Name, Default, PortName | ConvertTo-Json"';
        const { stdout } = await execAsync(cmd);
        if (stdout && stdout.trim()) {
            const raw = JSON.parse(stdout.trim());
            const list = Array.isArray(raw) ? raw : [raw];
            const result = list.map((item: any) => ({
                name: item.Name,
                isDefault: Boolean(item.Default),
                portName: item.PortName,
            }));
            cachedPrinters = result;
            lastCacheTime = Date.now();
            return result;
        }
    } catch (err) {
        console.warn('[Printers] Falha na consulta CIM do PowerShell, tentando fallback pdf-to-printer:', err);
    }

    try {
        const printers = await getPdfPrinters();
        const defaultPrinter = await getPdfDefaultPrinter().catch(() => null);
        const result = printers.map((p) => ({
            name: p.name,
            isDefault: defaultPrinter?.name === p.name,
        }));
        cachedPrinters = result;
        lastCacheTime = Date.now();
        return result;
    } catch (fallbackErr) {
        console.error('[Printers] Erro ao listar impressoras:', fallbackErr);
        return cachedPrinters || [];
    }
};

/**
 * Pré-carrega a lista de impressoras no boot do agente em background
 */
export const warmupPrintersCache = (): void => {
    listWindowsPrinters(true).catch(err => {
        console.warn('[Printers] Falha no warmup do cache de impressoras:', err);
    });
};
