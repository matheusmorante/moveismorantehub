import React, { useState, useEffect, useRef } from 'react';
import type { AuditItem } from "../modals/InventoryAuditModal";
import { toast } from 'react-toastify';
import { matchScannedProductItem, extractLabelIdentity } from '@/pages/utils/barcodeScannerUtils';

interface InventoryScannerModeProps {
    readonly items: readonly AuditItem[];
    readonly onUpdateCount: (id: string, count: number) => void;
    readonly onSwitchToManual: () => void;
}

export const InventoryScannerMode: React.FC<InventoryScannerModeProps> = ({
    items,
    onUpdateCount,
    onSwitchToManual,
}) => {
    const [scannerInput, setScannerInput] = useState('');
    const scannerInputRef = useRef<HTMLInputElement>(null);
    const [lastScanned, setLastScanned] = useState<{ item: AuditItem, timestamp: number } | null>(null);
    const scannedLabelsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (scannerInputRef.current) {
            scannerInputRef.current.focus();
        }
    }, []);

    const handleScannerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = scannerInput.trim();
        if (!code) return;

        const item = items.find((i) => matchScannedProductItem(i, code));

        if (!item) {
            toast.warn(`Código "${code}" não corresponde a nenhum produto neste inventário.`);
            setScannerInput('');
            return;
        }

        const { labelId } = extractLabelIdentity(code);

        // Bloqueio de duplicidade por unidade física individual (labelId)
        if (labelId && scannedLabelsRef.current.has(labelId)) {
            toast.warn(`Esta unidade física (${item.name}) já foi contabilizada neste inventário.`);
            setScannerInput('');
            return;
        }

        if (labelId) {
            scannedLabelsRef.current.add(labelId);
        }

        const currentCount = item.physicalCount === null ? 0 : item.physicalCount;
        const nextCount = currentCount + 1;
        onUpdateCount(item.id, nextCount);
        setLastScanned({ item, timestamp: Date.now() });
        toast.success(`${item.name}: +1 (${nextCount} ${item.unit || 'UN'})`);
        setScannerInput('');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 border-2 border-emerald-500/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                    <i className="bi bi-upc-scan text-3xl"></i>
                </div>
                <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">
                    Modo Scanner Ativo
                </h4>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                    Escaneie a etiqueta para somar +1 na contagem da variação correspondente.
                </p>
                
                <form onSubmit={handleScannerSubmit} className="w-full max-w-md relative">
                    <input
                        ref={scannerInputRef}
                        type="text"
                        value={scannerInput}
                        onChange={e => setScannerInput(e.target.value)}
                        placeholder="Código de barras ou SKU..."
                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-5 py-4 text-center font-mono text-lg focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all"
                        autoFocus
                    />
                    <button type="submit" className="hidden">Submit</button>
                </form>
            </div>

            {lastScanned && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between animate-slide-up">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 rounded-lg flex items-center justify-center">
                            <i className="bi bi-check-lg text-xl"></i>
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{lastScanned.item.name}</div>
                            <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Contagem atual: {lastScanned.item.physicalCount === null ? 1 : lastScanned.item.physicalCount + 1} {lastScanned.item.unit}</div>
                        </div>
                    </div>
                    <button 
                        onClick={onSwitchToManual}
                        className="text-sm font-bold text-slate-500 hover:text-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700"
                    >
                        Corrigir
                    </button>
                </div>
            )}
        </div>
    );
};
