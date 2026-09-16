import React, { useRef } from 'react';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { InboundDuplicateKeyAlertModal } from './InboundDuplicateKeyAlertModal';
import { useInboundDocumentImport } from '../hooks/useInboundDocumentImport';

interface InboundDocumentImportModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onImportSuccess: (invoice: InboundInvoice) => void;
    readonly initialFile?: File | null;
}

const ACCEPTED_FILE_TYPES = 'text/xml,application/xml,.xml';

export const InboundDocumentImportModal: React.FC<InboundDocumentImportModalProps> = ({
    isOpen,
    onClose,
    onImportSuccess,
    initialFile,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
        isLoading,
        statusMessage,
        isDraggingFile,
        setIsDraggingFile,
        duplicateAlertOpen,
        setDuplicateAlertOpen,
        duplicateKey,
        duplicateExistingInvoice,
        handleFile,
    } = useInboundDocumentImport({ isOpen, onClose, onImportSuccess, initialFile });

    if (!isOpen) return null;

    return (
        <>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="inbound-doc-modal-title"
                onKeyDown={(e) => {
                    if (e.key === 'Escape' && !isLoading) onClose();
                }}
                className="fixed inset-0 z-[1000002] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in"
            >
                <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-in zoom-in-95 duration-150 overflow-hidden">
                    {/* Header */}
                    <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 px-6">
                        <div>
                            <h2
                                id="inbound-doc-modal-title"
                                className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"
                            >
                                <i className="bi bi-file-earmark-arrow-up text-blue-600 text-lg" aria-hidden="true" />
                                Importar XML da NF-e
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Importe o arquivo XML da nota fiscal para conferência e entrada no estoque.
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={onClose}
                            aria-label="Fechar modal"
                            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <i className="bi bi-x-lg text-sm" aria-hidden="true" />
                        </button>
                    </header>

                    {/* Conteúdo Principal */}
                    <main className="p-6 space-y-4">
                        {/* Estado de Carregamento / Progresso */}
                        {isLoading && (
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/40 flex items-center gap-3 animate-pulse">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                                    <i className="bi bi-arrow-repeat animate-spin text-xl" aria-hidden="true" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black text-blue-900 dark:text-blue-100">
                                        {statusMessage || 'Processando nota fiscal...'}
                                    </p>
                                    <p className="text-[11px] text-blue-700/80 dark:text-blue-300">
                                        Aguarde enquanto salvamos as informações.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Link de Consulta e Dropzone de Arquivo XML */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    Arquivo XML da NF-e
                                </span>
                                <a
                                    href="https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g="
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                >
                                    <i className="bi bi-box-arrow-up-right text-[11px]" aria-hidden="true" />
                                    Consultar manualmente no Portal da NF-e
                                </a>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_FILE_TYPES}
                                className="hidden"
                                onChange={(event) => void handleFile(event.target.files?.[0])}
                            />
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    if (!isLoading) setIsDraggingFile(true);
                                }}
                                onDragLeave={() => setIsDraggingFile(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDraggingFile(false);
                                    void handleFile(e.dataTransfer.files?.[0]);
                                }}
                                className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                                    isDraggingFile
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40'
                                        : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-blue-400 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300'
                                } disabled:cursor-wait disabled:opacity-60`}
                            >
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 mb-3 shadow-sm">
                                    <i className="bi bi-cloud-arrow-up text-3xl" aria-hidden="true" />
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Clique para escolher ou arraste o arquivo aqui
                                </span>
                                <span className="text-xs text-slate-400 mt-1">
                                    Formato aceito: <b>XML</b> oficial da NF-e
                                </span>
                            </button>
                        </div>
                    </main>

                    {/* Footer */}
                    <footer className="flex justify-end border-t border-slate-100 dark:border-slate-800 p-4 px-6 bg-slate-50/50 dark:bg-slate-950/40">
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                    </footer>
                </div>
            </div>

            {/* Modal de Alerta de Chave Duplicada */}
            <InboundDuplicateKeyAlertModal
                isOpen={duplicateAlertOpen}
                duplicateKey={duplicateKey}
                existingInvoice={duplicateExistingInvoice}
                onClose={() => setDuplicateAlertOpen(false)}
            />
        </>
    );
};

export default InboundDocumentImportModal;
