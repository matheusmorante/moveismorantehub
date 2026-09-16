import React, { useRef } from 'react';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { InboundDuplicateKeyAlertModal } from './InboundDuplicateKeyAlertModal';
import { useInboundDocumentImport } from '../hooks/useInboundDocumentImport';

interface InboundDocumentImportModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onImportSuccess: (invoice: InboundInvoice) => void;
}

const ACCEPTED_FILE_TYPES = 'text/xml,application/xml,.xml';

export const InboundDocumentImportModal: React.FC<InboundDocumentImportModalProps> = ({
    isOpen,
    onClose,
    onImportSuccess,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
        accessKeyInput,
        setAccessKeyInput,
        isLoading,
        statusMessage,
        isDraggingFile,
        setIsDraggingFile,
        duplicateAlertOpen,
        setDuplicateAlertOpen,
        duplicateKey,
        duplicateExistingInvoice,
        handleFile,
        handleConsultAccessKey,
    } = useInboundDocumentImport({ isOpen, onClose, onImportSuccess });

    if (!isOpen) return null;

    const formattedKeyLength = accessKeyInput.replace(/\D/g, '').length;

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
                                Adicionar Nota Fiscal de Entrada
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Importe o arquivo da nota ou consulte pela chave de acesso de 44 dígitos.
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
                    <main className="p-6 space-y-6">
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

                        {/* Dropzone de Arquivo */}
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                                Opção 1: Inserir arquivo XML
                            </label>
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
                                className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                                    isDraggingFile
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40'
                                        : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-blue-400 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300'
                                } disabled:cursor-wait disabled:opacity-60`}
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 mb-2 shadow-sm">
                                    <i className="bi bi-cloud-arrow-up text-2xl" aria-hidden="true" />
                                </div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    Clique para escolher ou arraste o arquivo aqui
                                </span>
                                <span className="text-[11px] text-slate-400 mt-1">
                                    Formato aceito: <b>XML</b> oficial da NF-e
                                </span>
                            </button>
                        </div>

                        {/* Divisor "OU" */}
                        <div className="relative flex items-center justify-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                            <span className="absolute bg-white px-3 text-[11px] font-black uppercase text-slate-400 dark:bg-slate-900">
                                Ou digite a chave de acesso
                            </span>
                        </div>

                        {/* Campo Chave de Acesso */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label
                                    htmlFor="nfe-access-key-input"
                                    className="text-xs font-black uppercase tracking-wider text-slate-500"
                                >
                                    Opção 2: Chave de Acesso da NF-e
                                </label>
                                <span
                                    className={`text-[10px] font-mono font-bold ${
                                        formattedKeyLength === 44
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-slate-400'
                                    }`}
                                >
                                    {formattedKeyLength}/44 dígitos
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        id="nfe-access-key-input"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={60}
                                        value={accessKeyInput}
                                        disabled={isLoading}
                                        onChange={(e) => setAccessKeyInput(e.target.value.replace(/\D/g, '').slice(0, 44))}
                                        onBlur={(e) => setAccessKeyInput(e.target.value.replace(/\D/g, '').slice(0, 44))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                void handleConsultAccessKey();
                                            }
                                        }}
                                        placeholder="Ex.: 4126 0402 8697 6300 5168 5500 1000 1298 5310 5075 8366"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 font-mono text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-100 transition-colors"
                                    />
                                    {formattedKeyLength === 44 && (
                                        <i
                                            className="bi bi-check-circle-fill text-emerald-500 absolute right-3 top-3 text-sm"
                                            aria-hidden="true"
                                        />
                                    )}
                                </div>

                                <button
                                    type="button"
                                    disabled={isLoading || formattedKeyLength !== 44}
                                    onClick={() => void handleConsultAccessKey()}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                >
                                    <i className="bi bi-search" aria-hidden="true" />
                                    Consultar
                                </button>
                            </div>
                            <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex gap-3 items-start">
                                <i className="bi bi-info-circle-fill text-blue-500 mt-0.5" aria-hidden="true" />
                                <div className="space-y-2.5">
                                    <p className="text-[11px] text-slate-700 dark:text-slate-300">
                                        <strong>Consulta automática do XML:</strong> disponível para NF-e recebidas nos últimos 90 dias.
                                    </p>
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5">
                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                            <i className="bi bi-clock-history text-slate-400" aria-hidden="true" />
                                            NF-e com mais de 90 dias?
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                            A consulta automática do XML pelo serviço de distribuição da SEFAZ possui janela de até 90 dias e pode não estar mais disponível. 
                                            Você ainda pode <strong>importar o arquivo XML</strong> (opção 1 acima) ou consultar a chave manualmente no Portal da NF-e.
                                        </p>
                                        <a
                                            href="https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g="
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/50 px-2.5 py-1.5 text-[10px] font-black text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                                        >
                                            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                                            Consultar manualmente no Portal da NF-e
                                        </a>
                                    </div>
                                </div>
                            </div>
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
