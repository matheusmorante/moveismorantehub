import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    saveInboundInvoice,
    checkInboundInvoiceKeyExists,
    consultInboundInvoiceByAccessKey,
} from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { parseInboundNfeXml } from '@/pages/utils/inboundNfe/inboundXmlParser';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { fetchPersons } from '@/pages/utils/personService';
import { findProductSupplierCodes } from '@/pages/utils/productSupplierCodesService';
import { resolveLinkedProductDetails } from '@/pages/utils/inboundNfe/inboundItemProductResolver';
import Person from '@/pages/types/person.type';
import { InboundDuplicateKeyAlertModal } from './InboundDuplicateKeyAlertModal';

interface InboundDocumentImportModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onImportSuccess: (invoice: InboundInvoice) => void;
}

const ACCEPTED_FILE_TYPES = 'text/xml,application/xml,.xml';

/**
 * Localiza o fornecedor já cadastrado para vincular à nota de entrada.
 * A importação não cria fornecedores: a confirmação do cadastro é sempre manual.
 */
async function ensureSupplier(
    emitterName?: string,
    emitterTradeName?: string,
    emitterCnpj?: string
): Promise<Person | null> {
    const cleanDoc = (emitterCnpj || '').replace(/\D/g, '');
    try {
        const suppliers = await fetchPersons('suppliers');
        if (cleanDoc) {
            const matchByCnpj = suppliers.find((p) => (p.cpfCnpj || '').replace(/\D/g, '') === cleanDoc);
            if (matchByCnpj) return matchByCnpj;
        }

        if (emitterName?.trim()) {
            const matchByName = suppliers.find(
                (p) => (p.fullName || '').trim().toLowerCase() === emitterName.trim().toLowerCase()
            );
            if (matchByName) return matchByName;
        }
    } catch (err) {
        console.warn('[InboundDocumentImportModal] Aviso ao localizar fornecedor:', err);
    }
    return null;
}

export const InboundDocumentImportModal: React.FC<InboundDocumentImportModalProps> = ({
    isOpen,
    onClose,
    onImportSuccess,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [accessKeyInput, setAccessKeyInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isDraggingFile, setIsDraggingFile] = useState(false);

    // Alerta de chave duplicada
    const [duplicateAlertOpen, setDuplicateAlertOpen] = useState(false);
    const [duplicateKey, setDuplicateKey] = useState('');
    const [duplicateExistingInvoice, setDuplicateExistingInvoice] = useState<InboundInvoice | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setAccessKeyInput('');
            setIsLoading(false);
            setStatusMessage('');
            setIsDraggingFile(false);
            setDuplicateAlertOpen(false);
            setDuplicateKey('');
            setDuplicateExistingInvoice(null);
        }
    }, [isOpen]);

    /**
     * Persiste a nota no banco de dados e aciona o callback de sucesso
     */
    const persistAndFinish = async (parsedInvoice: InboundInvoice) => {
        if (String(parsedInvoice.model || '').replace(/\D/g, '') === '65') {
            throw new Error('NFC-e (modelo 65) não pode ser cadastrada como NF de Entrada.');
        }

        const cleanKey = (parsedInvoice.nfeKey || '').replace(/\D/g, '');
        if (!cleanKey || cleanKey.length !== 44) {
            throw new Error('A chave de acesso da nota fiscal deve conter exatamente 44 dígitos.');
        }

        // Verifica duplicidade no banco
        setStatusMessage('Verificando notas existentes...');
        const existing = await checkInboundInvoiceKeyExists(cleanKey);
        if (existing) {
            setDuplicateKey(cleanKey);
            setDuplicateExistingInvoice(existing);
            setDuplicateAlertOpen(true);
            return;
        }

        // Localiza ou cadastra fornecedor
        setStatusMessage('Identificando fornecedor...');
        const supplier = await ensureSupplier(
            parsedInvoice.emitterName,
            parsedInvoice.emitterTradeName,
            parsedInvoice.emitterCnpj
        );
        const supplierId = supplier?.id;

        // Auto-match com vínculos anteriores do fornecedor
        let itemsWithMatches = parsedInvoice.items || [];
        if (supplierId && itemsWithMatches.length > 0) {
            setStatusMessage('Consultando vínculos de produtos...');
            try {
                const mappings = await findProductSupplierCodes(
                    supplierId,
                    itemsWithMatches.map((i) => i.productCode)
                );
                if (mappings.size > 0) {
                    itemsWithMatches = await Promise.all(itemsWithMatches.map(async (item) => {
                        const map = mappings.get((item.productCode || '').trim().toLocaleUpperCase('pt-BR'));
                        if (!map) return item;
                        const details = await resolveLinkedProductDetails(map.productId, map.productVariationId);
                        return {
                            ...item,
                            matchedProductId: map.productId,
                            matchedVariationId: map.productVariationId,
                            linkedProductCode: details?.linkedProductCode,
                            productErpName: details?.productErpName || 'Produto vinculado',
                        };
                    }));
                }
            } catch (mErr) {
                console.warn('[InboundDocumentImportModal] Erro ao recuperar histórico de vínculos:', mErr);
            }
        }

        const invoiceToSave: InboundInvoice = {
            ...parsedInvoice,
            nfeKey: cleanKey,
            supplierId: supplierId || parsedInvoice.supplierId,
            items: itemsWithMatches,
        };

        setStatusMessage('Salvando nota fiscal no sistema...');
        const saved = await saveInboundInvoice(invoiceToSave);
        toast.success(`NF-e #${saved.nfeNumber || ''} adicionada com sucesso!`);
        onImportSuccess(saved);
        onClose();
    };

    /**
     * Processa exclusivamente o XML oficial da NF-e. A importação por foto/PDF
     * e a extração por IA não fazem mais parte deste fluxo.
     */
    const handleFile = async (selectedFile?: File) => {
        if (!selectedFile || isLoading) return;

        const isXml = selectedFile.name.toLowerCase().endsWith('.xml') || selectedFile.type.includes('xml');
        try {
            setIsLoading(true);

            if (!isXml) throw new Error('Envie somente o arquivo XML oficial da NF-e.');

            setStatusMessage('Lendo e interpretando arquivo XML...');
            const xmlText = await selectedFile.text();
            const parsed = parseInboundNfeXml(xmlText);
            await persistAndFinish(parsed);
        } catch (error: any) {
            console.error('[InboundDocumentImportModal] Erro ao processar arquivo:', error);
            toast.error(error.message || 'Falha ao processar o arquivo da nota fiscal.');
        } finally {
            setIsLoading(false);
            setStatusMessage('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    /**
     * Consulta a nota diretamente pela chave de acesso de 44 dígitos
     */
    const handleConsultAccessKey = async () => {
        const cleanKey = accessKeyInput.replace(/\D/g, '');
        if (cleanKey.length !== 44) {
            toast.warning('A chave de acesso deve conter exatamente 44 dígitos.');
            return;
        }

        try {
            setIsLoading(true);
            setStatusMessage('Sincronizando com a SEFAZ...');

            const { syncSefazDfe, fetchInboundInvoicesPage } = await import('@/pages/utils/inboundNfe/inboundInvoicesService');
            await syncSefazDfe();

            setStatusMessage('Consultando chave de acesso...');
            const res = await fetchInboundInvoicesPage({
                page: 1,
                pageSize: 1,
                searchTerm: cleanKey,
                dateFilter: { mode: 'custom_range', startMonth: '', endMonth: '', customMonth: '' }
            });
            const foundInvoice = res.invoices.find((candidate) => candidate.nfeKey === cleanKey);

            if (foundInvoice) {
                toast.success('Nota Fiscal encontrada e importada com sucesso!');
                onImportSuccess(foundInvoice);
                onClose();
                return;
            }

            // Fallback (se não achou na listagem)
            const result = await consultInboundInvoiceByAccessKey(cleanKey);

            if (result.invoice) {
                await persistAndFinish(result.invoice);
                return;
            }

            toast.info(
                result.message ||
                    'A SEFAZ não liberou o XML completo dos itens para esta chave. Por favor, anexe o arquivo XML ou DANFE.'
            );
        } catch (error: any) {
            console.error('[InboundDocumentImportModal] Erro ao consultar chave:', error);
            toast.error(error.message || 'Não foi possível consultar a nota fiscal pela chave informada.');
        } finally {
            setIsLoading(false);
            setStatusMessage('');
        }
    };

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
                                        maxLength={44}
                                        value={accessKeyInput}
                                        disabled={isLoading}
                                        onChange={(e) => setAccessKeyInput(e.target.value.replace(/\D/g, ''))}
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
                            <p className="mt-1.5 text-[11px] text-slate-400">
                                A chave de acesso numérica encontra-se no cabeçalho do DANFE da nota fiscal.
                            </p>
                            <a
                                href="https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g="
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-black text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                            >
                                <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                                Consultar NF-e no portal da Fazenda
                            </a>
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
