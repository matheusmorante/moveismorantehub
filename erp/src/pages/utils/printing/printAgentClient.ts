import { 
    PrintAgentHealth, 
    PrinterDevice, 
    PrintJobPayload, 
    PrintJobResult, 
    PrintPreset,
    MachinePrintConfig 
} from "./print.types";

const PRINT_AGENT_URL = 'http://127.0.0.1:40405';
const HEALTH_TIMEOUT_MS = 2500;
const PRINT_TIMEOUT_MS = 30000;

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
};

/**
 * Verifica se o agente de impressão local está online e respondendo em 127.0.0.1:40405.
 */
export const checkPrintAgentHealth = async (): Promise<PrintAgentHealth> => {
    try {
        const res = await fetchWithTimeout(`${PRINT_AGENT_URL}/health`, { method: 'GET' }, HEALTH_TIMEOUT_MS);
        if (res.ok) {
            const data = await res.json();
            return { isOnline: true, version: data.version, agent: data.agent };
        }
        return { isOnline: false, error: `HTTP ${res.status}` };
    } catch (err: any) {
        return { isOnline: false, error: err.name === 'AbortError' ? 'Timeout' : 'Offline' };
    }
};

/**
 * Consulta a lista de impressoras instaladas no Windows.
 */
export const fetchAvailablePrinters = async (forceRefresh = false): Promise<PrinterDevice[]> => {
    try {
        const query = forceRefresh ? '?refresh=true' : '';
        const res = await fetchWithTimeout(`${PRINT_AGENT_URL}/printers${query}`, { method: 'GET' }, 10000);
        if (res.ok) {
            const data = await res.json();
            return data.printers || [];
        }
        return [];
    } catch (err) {
        console.warn('[PrintClient] Agente de impressão offline ao listar impressoras:', err);
        return [];
    }
};

/**
 * Consulta os presets de impressão configurados no agente.
 */
export const fetchPrintPresets = async (): Promise<Record<string, PrintPreset> | null> => {
    try {
        const res = await fetchWithTimeout(`${PRINT_AGENT_URL}/presets`, { method: 'GET' }, 3000);
        if (res.ok) {
            const data = await res.json();
            return data.presets || null;
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Consulta as configurações persistentes salvas fisicamente neste computador (C:\ProgramData\MoranteHub\print-config.json)
 */
export const fetchMachineConfig = async (): Promise<{ config: MachinePrintConfig; configPath: string } | null> => {
    try {
        const res = await fetchWithTimeout(`${PRINT_AGENT_URL}/config`, { method: 'GET' }, 3000);
        if (res.ok) {
            const data = await res.json();
            return data;
        }
        return null;
    } catch (err) {
        console.warn('[PrintClient] Erro ao buscar configuração da máquina física:', err);
        return null;
    }
};

/**
 * Salva as configurações de impressoras e presets fisicamente neste computador (C:\ProgramData\MoranteHub\print-config.json)
 */
export const saveMachineConfig = async (config: Partial<MachinePrintConfig>): Promise<boolean> => {
    try {
        const res = await fetchWithTimeout(`${PRINT_AGENT_URL}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        }, 5000);
        return res.ok;
    } catch (err) {
        console.warn('[PrintClient] Erro ao gravar configuração da máquina física:', err);
        return false;
    }
};

/**
 * Salva alterações nos presets de impressão no agente local.
 */
export const savePrintPresets = async (presets: Record<string, PrintPreset>): Promise<boolean> => {
    try {
        const res = await fetchWithTimeout(`${PRINT_AGENT_URL}/presets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(presets),
        }, 5000);
        return res.ok;
    } catch {
        return false;
    }
};

/**
 * Envia o trabalho diretamente para o agente local imprimir silenciosamente no Spooler.
 */
export const sendDirectPrintJob = async (payload: PrintJobPayload): Promise<PrintJobResult> => {
    try {
        const res = await fetchWithTimeout(`${PRINT_AGENT_URL}/print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }, PRINT_TIMEOUT_MS);

        if (res.ok) {
            const data = await res.json();
            return {
                success: true,
                status: data.status || 'sent_to_spooler',
                printer: data.printer,
                message: data.message,
            };
        }

        const errData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        return {
            success: false,
            status: 'error',
            message: errData.error || `Erro HTTP ${res.status}`,
        };
    } catch (err: any) {
        return {
            success: false,
            status: 'error',
            message: err.name === 'AbortError' ? 'Tempo limite esgotado' : 'Agente offline',
        };
    }
};

/**
 * Envia comando para imprimir folha de teste na impressora especificada.
 */
export const sendDirectPrintTest = async (printerName?: string): Promise<PrintJobResult> => {
    try {
        const res = await fetchWithTimeout(`${PRINT_AGENT_URL}/print-test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ printerName }),
        }, 8000);

        if (res.ok) {
            const data = await res.json();
            return {
                success: true,
                status: 'sent_to_spooler',
                printer: data.printer,
                message: data.message,
            };
        }
        return { success: false, status: 'error', message: `Erro HTTP ${res.status}` };
    } catch (err: any) {
        return { success: false, status: 'error', message: 'Agente offline' };
    }
};

export const printDirectTestPage = sendDirectPrintTest;

