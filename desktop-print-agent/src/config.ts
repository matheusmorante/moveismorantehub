import fs from 'fs';
import path from 'path';

export interface MachinePrintConfig {
    defaultPrinter: string;
    orderPrinter: string;    // vazio ou nome específico
    receiptPrinter: string;  // vazio ou nome específico
    danfePrinter: string;    // vazio ou nome específico
    orderQuality: 'draft' | 'normal' | 'high';
    receiptQuality: 'draft' | 'normal' | 'high';
    danfeQuality: 'draft' | 'normal' | 'high';
    orderScale: number;
    receiptScale: number;
    danfeScale: number;
}

const PROGRAM_DATA_DIR = process.env.ProgramData 
    ? path.join(process.env.ProgramData, 'MoranteHub') 
    : 'C:\\ProgramData\\MoranteHub';

const CONFIG_FILE = path.join(PROGRAM_DATA_DIR, 'print-config.json');

const DEFAULT_MACHINE_CONFIG: MachinePrintConfig = {
    defaultPrinter: 'EPSON L3250 Series',
    orderPrinter: '',      // vazio significa "Usar impressora padrão"
    receiptPrinter: '',    // vazio significa "Usar impressora padrão"
    danfePrinter: '',      // vazio significa "Usar impressora padrão"
    orderQuality: 'normal',
    receiptQuality: 'draft', // Ultra rápida para recibo
    danfeQuality: 'normal',
    orderScale: 0.92,
    receiptScale: 1.0,
    danfeScale: 1.0,
};

const ensureDirectoryExists = () => {
    try {
        if (!fs.existsSync(PROGRAM_DATA_DIR)) {
            fs.mkdirSync(PROGRAM_DATA_DIR, { recursive: true });
        }
    } catch (err) {
        console.warn(`[Config] Aviso ao criar pasta ${PROGRAM_DATA_DIR}:`, err);
    }
};

export const getMachineConfigPath = (): string => CONFIG_FILE;

export const loadMachineConfig = (): MachinePrintConfig => {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_MACHINE_CONFIG, ...parsed };
        }
    } catch (err) {
        console.warn('[Config] Erro ao ler print-config.json, usando padrão:', err);
    }

    // Se o arquivo não existir ainda, salva o padrão na primeira leitura
    saveMachineConfig(DEFAULT_MACHINE_CONFIG);
    return { ...DEFAULT_MACHINE_CONFIG };
};

export const saveMachineConfig = (newConfig: Partial<MachinePrintConfig>): MachinePrintConfig => {
    ensureDirectoryExists();
    let current = { ...DEFAULT_MACHINE_CONFIG };
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            current = { ...current, ...JSON.parse(raw) };
        }
    } catch {
        // Ignora erro de leitura e usa current
    }

    const merged: MachinePrintConfig = { ...current, ...newConfig };

    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
        console.log(`[Config] Configurações da máquina salvas em ${CONFIG_FILE}`);
    } catch (err) {
        console.error(`[Config] Falha ao gravar ${CONFIG_FILE}:`, err);
    }

    return merged;
};

/**
 * Resolve qual impressora deve ser utilizada para o documento solicitado.
 * Prioridade:
 * 1. Override explícito vindo do payload (se informado)
 * 2. Impressora específica para o tipo de documento no print-config.json
 * 3. Impressora padrão (defaultPrinter) do print-config.json
 */
export const resolvePrinterForDocument = (
    type: 'sales_order' | 'receipt' | 'danfe' | 'test',
    explicitPrinter?: string
): string => {
    if (explicitPrinter && explicitPrinter.trim()) {
        return explicitPrinter.trim();
    }

    const config = loadMachineConfig();

    if (type === 'sales_order' && config.orderPrinter) {
        return config.orderPrinter;
    }
    if (type === 'receipt' && config.receiptPrinter) {
        return config.receiptPrinter;
    }
    if (type === 'danfe' && config.danfePrinter) {
        return config.danfePrinter;
    }

    return config.defaultPrinter || 'EPSON L3250 Series';
};
