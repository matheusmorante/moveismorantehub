import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { importInboundInvoiceXml } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

interface InboundXmlImportModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onImportSuccess: (invoice: InboundInvoice) => void;
}

export const InboundXmlImportModal: React.FC<InboundXmlImportModalProps> = ({
    isOpen,
    onClose,
    onImportSuccess
}) => {
    const [xmlText, setXmlText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            setXmlText('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                setXmlText(content);
            }
        };
        reader.readAsText(file);
    };

    const handleProcessImport = async () => {
        if (!xmlText.trim()) {
            toast.error('Selecione um arquivo XML ou cole o conteúdo do XML da NF-e.');
            return;
        }

        setIsLoading(true);
        try {
            const imported = await importInboundInvoiceXml(xmlText);
            toast.success(`NF-e #${imported.nfeNumber} de ${imported.emitterName} importada com sucesso!`);
            onImportSuccess(imported);
            onClose();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro ao importar XML da NF-e de entrada.';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="xml-import-modal-title"
        >
            <button
                type="button"
                aria-label="Fechar"
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-default"
                onClick={onClose}
            />
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 animate-in fade-in zoom-in-95 border border-slate-100 dark:border-slate-800">
                <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600">
                            <i className="bi bi-filetype-xml text-xl" aria-hidden="true" />
                        </div>
                        <div>
                            <h2 id="xml-import-modal-title" className="text-base font-black text-slate-800 dark:text-slate-100">
                                Importar XML de NF-e de Entrada
                            </h2>
                            <p className="text-xs text-slate-400">
                                Carregue o arquivo XML da nota fiscal emitida pelo fornecedor
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xml,text/xml"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <button
                        type="button"
                        aria-label="Selecionar arquivo XML de NF-e da máquina"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all dark:border-slate-800 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/10"
                    >
                        <i className="bi bi-cloud-upload text-3xl text-emerald-600 mb-2" aria-hidden="true" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                            Clique para selecionar o arquivo XML da NF-e
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                            Suporte a NF-e Modelo 55 (Layout 4.00 da SEFAZ)
                        </span>
                    </button>

                    <div>
                        <label htmlFor="xml-paste-textarea" className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                            Ou cole o XML da NF-e diretamente:
                        </label>
                        <textarea
                            id="xml-paste-textarea"
                            rows={6}
                            aria-label="Conteúdo do XML da nota fiscal"
                            value={xmlText}
                            onChange={(e) => setXmlText(e.target.value)}
                            placeholder="<nfeProc versao='4.00'>...</nfeProc>"
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-slate-700 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 transition-colors"
                        />
                    </div>
                </div>

                <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-955/40">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2.5 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleProcessImport()}
                        disabled={isLoading || !xmlText.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
                    >
                        {isLoading ? 'Importando...' : 'Processar e Salvar'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default InboundXmlImportModal;
