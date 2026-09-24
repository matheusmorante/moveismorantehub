import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
    getAgentHealth, 
    getPrinters, 
    printTestPage,
    getMachinePrintConfig,
    updateMachinePrintConfig
} from '@/pages/utils/printing/printService';
import { PrintAgentHealth, PrinterDevice, MachinePrintConfig } from '@/pages/utils/printing/print.types';

const DEFAULT_CONFIG: MachinePrintConfig = {
    defaultPrinter: 'EPSON L3250 Series',
    orderPrinter: '',
    receiptPrinter: '',
    danfePrinter: '',
    orderQuality: 'normal',
    receiptQuality: 'draft',
    danfeQuality: 'normal',
    orderScale: 0.92,
    receiptScale: 1.0,
    danfeScale: 1.0,
};

export default function PrintConfigSection() {
    const [health, setHealth] = useState<PrintAgentHealth>({ isOnline: false });
    const [printers, setPrinters] = useState<PrinterDevice[]>([]);
    const [config, setConfig] = useState<MachinePrintConfig>(DEFAULT_CONFIG);
    const [configPath, setConfigPath] = useState<string>('C:\\ProgramData\\MoranteHub\\print-config.json');
    const [isChecking, setIsChecking] = useState(false);
    const [isPrintingTest, setIsPrintingTest] = useState(false);

    const refreshStatus = async (force = false) => {
        setIsChecking(true);
        try {
            const h = await getAgentHealth();
            setHealth(h);
            if (h.isOnline) {
                const [prs, machineRes] = await Promise.all([
                    getPrinters(force),
                    getMachinePrintConfig()
                ]);
                setPrinters(prs);
                if (machineRes?.config) {
                    setConfig(machineRes.config);
                    if (machineRes.configPath) setConfigPath(machineRes.configPath);
                } else if (prs.length > 0) {
                    const defPrn = prs.find(p => p.isDefault)?.name || prs[0].name;
                    setConfig(prev => ({ ...prev, defaultPrinter: defPrn }));
                }
            }
        } catch {
            setHealth({ isOnline: false, error: 'Offline' });
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        refreshStatus();
    }, []);

    const handleUpdatePrinterField = async (
        field: 'defaultPrinter' | 'orderPrinter' | 'receiptPrinter' | 'danfePrinter',
        value: string
    ) => {
        const next = { ...config, [field]: value };
        setConfig(next);
        const ok = await updateMachinePrintConfig({ [field]: value });
        if (ok) {
            toast.success('Configuração da impressora salva neste computador.');
        } else {
            toast.error('Falha ao salvar configuração no agente local.');
        }
    };

    const handleUpdateQuality = async (
        field: 'orderQuality' | 'receiptQuality' | 'danfeQuality',
        value: 'draft' | 'normal' | 'high'
    ) => {
        const next = { ...config, [field]: value };
        setConfig(next);
        const ok = await updateMachinePrintConfig({ [field]: value });
        if (ok) {
            toast.success('Qualidade de impressão salva neste computador.');
        }
    };

    const handleUpdateScale = async (
        field: 'orderScale' | 'receiptScale' | 'danfeScale',
        value: number
    ) => {
        const safe = Math.max(0.5, Math.min(1.5, value));
        const next = { ...config, [field]: safe };
        setConfig(next);
        await updateMachinePrintConfig({ [field]: safe });
    };

    const handlePrintTest = async () => {
        setIsPrintingTest(true);
        try {
            const res = await printTestPage(config.defaultPrinter || undefined);
            if (res.success) {
                toast.success(`Página de teste enviada para ${res.printer || 'impressora padrão'}!`);
            } else {
                toast.error(`Falha no teste: ${res.message || 'Erro desconhecido'}`);
            }
        } catch (err: any) {
            toast.error(`Erro ao disparar impressão de teste: ${err.message}`);
        } finally {
            setIsPrintingTest(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Status do Agente Local */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-xs ${
                        health.isOnline 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}>
                        <i className={`bi ${health.isOnline ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                                Agente de Impressão Direta (Windows)
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                health.isOnline 
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}>
                                {health.isOnline ? 'Conectado (127.0.0.1:40405)' : 'Desconectado'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {health.isOnline 
                                ? `Agente operacional versão ${health.version || '1.0.0'}. Comunicação local de alta velocidade ativa.` 
                                : 'Inicie o desktop-print-agent para habilitar impressão silenciosa na Epson L3250.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => refreshStatus(true)}
                        disabled={isChecking}
                        className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                    >
                        <i className={`bi bi-arrow-repeat ${isChecking ? 'animate-spin' : ''}`} />
                        {isChecking ? 'Atualizando...' : 'Verificar'}
                    </button>
                    {health.isOnline && (
                        <button
                            type="button"
                            onClick={handlePrintTest}
                            disabled={isPrintingTest}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
                        >
                            <i className="bi bi-printer" />
                            {isPrintingTest ? 'Enviando...' : 'Página de Teste'}
                        </button>
                    )}
                </div>
            </div>

            {/* Configuração da Máquina Física */}
            {health.isOnline && (
                <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h5 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <i className="bi bi-display text-blue-600" />
                                Impressão deste computador
                            </h5>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                As opções abaixo são gravadas no arquivo local <code className="text-slate-600 dark:text-slate-300 font-mono">{configPath}</code>.
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-black border border-emerald-500/20 self-start sm:self-auto">
                            <i className="bi bi-check-lg" /> Configuração salva somente neste computador
                        </span>
                    </div>

                    {/* Grid de Impressoras por Documento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Impressora Padrão */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-slate-700 dark:text-slate-200">
                                    Impressora Padrão da Máquina
                                </label>
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded">
                                    Principal
                                </span>
                            </div>
                            <select
                                value={config.defaultPrinter}
                                onChange={(e) => handleUpdatePrinterField('defaultPrinter', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {printers.map((p) => (
                                    <option key={p.name} value={p.name}>
                                        {p.name} {p.isDefault ? '(Padrão do Windows)' : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400">
                                Impressora padrão para qualquer documento que não tenha direcionamento específico.
                            </p>
                        </div>

                        {/* Pedido de Venda */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-slate-700 dark:text-slate-200">
                                    Pedido de Venda
                                </label>
                                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                    A4 Retrato
                                </span>
                            </div>
                            <select
                                value={config.orderPrinter}
                                onChange={(e) => handleUpdatePrinterField('orderPrinter', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">[ Usar impressora padrão ({config.defaultPrinter}) ]</option>
                                {printers.map((p) => (
                                    <option key={p.name} value={p.name}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400">
                                Destino específico para vias de pedidos e romaneios gerados neste PC.
                            </p>
                        </div>

                        {/* Recibo */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-slate-700 dark:text-slate-200">
                                    Recibo de Venda
                                </label>
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                                    Balcão / Caixa
                                </span>
                            </div>
                            <select
                                value={config.receiptPrinter}
                                onChange={(e) => handleUpdatePrinterField('receiptPrinter', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">[ Usar impressora padrão ({config.defaultPrinter}) ]</option>
                                {printers.map((p) => (
                                    <option key={p.name} value={p.name}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400">
                                Destino para comprovantes rápidos de pagamento e recibos ao consumidor.
                            </p>
                        </div>

                        {/* DANFE */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-slate-700 dark:text-slate-200">
                                    DANFE (NF-e / NFC-e)
                                </label>
                                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                                    Fiscal
                                </span>
                            </div>
                            <select
                                value={config.danfePrinter}
                                onChange={(e) => handleUpdatePrinterField('danfePrinter', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">[ Usar impressora padrão ({config.defaultPrinter}) ]</option>
                                {printers.map((p) => (
                                    <option key={p.name} value={p.name}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400">
                                Destino para documentos fiscais com código de barras da chave de acesso.
                            </p>
                        </div>
                    </div>

                    {/* Presets de Velocidade e Qualidade */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Qualidade, Velocidade e Escala (Neste Computador)
                            </h5>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                                ⚡ Rascunho = Impressão Ultra-Rápida (~2s)
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Card Pedido */}
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                        Pedido de Venda
                                    </span>
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                                        A4
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 block">Qualidade</label>
                                    <select
                                        value={config.orderQuality}
                                        onChange={(e) => handleUpdateQuality('orderQuality', e.target.value as any)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                                    >
                                        <option value="draft">⚡ Rascunho / Econômica (~2s)</option>
                                        <option value="normal">⚖️ Padrão / Normal (~5s)</option>
                                        <option value="high">🔍 Alta Resolução (~20s)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                        <span>Escala</span>
                                        <span>{Math.round(config.orderScale * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.70"
                                        max="1.10"
                                        step="0.01"
                                        value={config.orderScale}
                                        onChange={(e) => handleUpdateScale('orderScale', parseFloat(e.target.value))}
                                        className="w-full accent-blue-600 cursor-pointer"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Ajustado em 92% para caber em 1 página A4 sem cortes de rodapé.
                                </p>
                            </div>

                            {/* Card Recibo */}
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                        Recibo de Venda
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">
                                        A4
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 block">Qualidade</label>
                                    <select
                                        value={config.receiptQuality}
                                        onChange={(e) => handleUpdateQuality('receiptQuality', e.target.value as any)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                                    >
                                        <option value="draft">⚡ Rascunho / Econômica (~2s)</option>
                                        <option value="normal">⚖️ Padrão / Normal (~5s)</option>
                                        <option value="high">🔍 Alta Resolução (~20s)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                        <span>Escala</span>
                                        <span>{Math.round(config.receiptScale * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.70"
                                        max="1.10"
                                        step="0.01"
                                        value={config.receiptScale}
                                        onChange={(e) => handleUpdateScale('receiptScale', parseFloat(e.target.value))}
                                        className="w-full accent-emerald-600 cursor-pointer"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Modo rascunho imprime na velocidade máxima física da Epson L3250.
                                </p>
                            </div>

                            {/* Card DANFE */}
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                        DANFE (NF-e / NFC-e)
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">
                                        A4 Fiscal
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 block">Qualidade</label>
                                    <select
                                        value={config.danfeQuality}
                                        onChange={(e) => handleUpdateQuality('danfeQuality', e.target.value as any)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                                    >
                                        <option value="draft">⚡ Rascunho / Econômica (~2s)</option>
                                        <option value="normal">⚖️ Padrão / Normal (~5s)</option>
                                        <option value="high">🔍 Alta Resolução (~20s)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                        <span>Escala</span>
                                        <span>{Math.round(config.danfeScale * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.70"
                                        max="1.10"
                                        step="0.01"
                                        value={config.danfeScale}
                                        onChange={(e) => handleUpdateScale('danfeScale', parseFloat(e.target.value))}
                                        className="w-full accent-amber-600 cursor-pointer"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Escala 100% oficial para validação do código de barras da NF-e.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
