import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import PersonFormModal from '@/pages/App/Registrations/shared/PersonFormModal';
import { analyzeInboundInvoiceDocument, invoiceFromDocumentAnalysis } from '@/pages/utils/inboundNfe/inboundDocumentImportService';
import type { InboundDocumentAnalysisStage } from '@/pages/utils/inboundNfe/inboundDocumentImportService';
import { saveInboundInvoice, checkInboundInvoiceKeyExists } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { parseInboundNfeXml } from '@/pages/utils/inboundNfe/inboundXmlParser';
import { InboundInvoice, InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { fetchPersons } from '@/pages/utils/personService';
import { saveProductSupplierCode } from '@/pages/utils/productSupplierCodesService';
import { findProductSupplierCodes } from '@/pages/utils/productSupplierCodesService';
import { recordProductResolutionFeedback } from '@/pages/utils/inboundNfe/productResolutionFeedbackService';
import Person from '@/pages/types/person.type';
import { InboundInvoiceFiscalReview } from './InboundInvoiceFiscalReview';
import { InboundInvoiceItemsReview } from './InboundInvoiceItemsReview';
import { InboundDuplicateKeyAlertModal } from './InboundDuplicateKeyAlertModal';

type Props = { isOpen: boolean; onClose: () => void; onImportSuccess: (invoice: InboundInvoice) => void };
const accepted = 'application/pdf,image/png,image/jpeg,text/xml,application/xml,.pdf,.png,.jpg,.jpeg,.xml';

export function InboundDocumentImportModal({ isOpen, onClose, onImportSuccess }: Props) {
    const input = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [invoice, setInvoice] = useState<InboundInvoice | null>(null);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [newSupplier, setNewSupplier] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analysisStage, setAnalysisStage] = useState<InboundDocumentAnalysisStage | null>(null);
    const [isDraggingFile, setIsDraggingFile] = useState(false);

    // Estado do Alerta de Nota Duplicada
    const [duplicateAlertOpen, setDuplicateAlertOpen] = useState(false);
    const [duplicateKey, setDuplicateKey] = useState('');
    const [duplicateExistingInvoice, setDuplicateExistingInvoice] = useState<InboundInvoice | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setInvoice(null);
            setLoading(false);
            setAnalysisStage(null);
            setDuplicateAlertOpen(false);
            setDuplicateKey('');
            setDuplicateExistingInvoice(null);
        }
    }, [isOpen]);

    const setSupplier = (id: string) => setInvoice((current) => current ? ({
        ...current,
        supplierId: id || undefined,
        items: current.items.map((item) => ({ ...item, matchedProductId: undefined, matchedVariationId: undefined })),
    }) : current);

    // Vínculo confirmado é a primeira fonte de verdade: ele evita chamada à IA
    // e impede que um item já conhecido seja interpretado outra vez.
    useEffect(() => {
        if (!invoice?.supplierId) return;
        let active = true;
        const resolveConfirmedMappings = async () => {
            try {
                const mappings = await findProductSupplierCodes(invoice.supplierId!, invoice.items.map((item) => item.productCode));
                if (!active || !mappings.size) return;
                setInvoice((current) => {
                    if (!current || current.supplierId !== invoice.supplierId) return current;
                    return {
                    ...current,
                    items: current.items.map((item) => {
                        const mapping = mappings.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
                        return mapping ? {
                            ...item,
                            matchedProductId: mapping.productId,
                            matchedVariationId: mapping.productVariationId,
                            productErpName: 'Variação vinculada anteriormente a este código do fornecedor',
                        } : item;
                    }),
                };
                });
            } catch (error) {
                console.warn('Não foi possível consultar vínculos confirmados do fornecedor.', error);
            }
        };
        void resolveConfirmedMappings();
        return () => { active = false; };
    }, [invoice?.supplierId]);

    const analyze = async (fileToAnalyze = file) => {
        if (!fileToAnalyze || loading) return;
        try {
            setLoading(true);
            const result = invoiceFromDocumentAnalysis(await analyzeInboundInvoiceDocument(fileToAnalyze, setAnalysisStage));

            if (result.nfeKey) {
                const existing = await checkInboundInvoiceKeyExists(result.nfeKey);
                if (existing) {
                    setDuplicateKey(result.nfeKey);
                    setDuplicateExistingInvoice(existing);
                    setDuplicateAlertOpen(true);
                    setFile(null);
                    setInvoice(null);
                    return;
                }
            }

            const list = await fetchPersons('suppliers');
            const document = result.emitterCnpj.replace(/\D/g, '');
            const match = document ? list.find((person) => (person.cpfCnpj || '').replace(/\D/g, '') === document) : undefined;
            setSuppliers(list);
            setInvoice({ ...result, supplierId: match?.id });
        } catch (error: any) {
            toast.error(error.message || 'Falha ao analisar a NF.');
        } finally {
            setLoading(false);
            setAnalysisStage(null);
        }
    };

    const handleFile = async (selectedFile?: File) => {
        if (!selectedFile) return;

        const isXml = selectedFile.name.toLowerCase().endsWith('.xml') || selectedFile.type.includes('xml');
        const isPdfOrImage = ['application/pdf', 'image/png', 'image/jpeg'].includes(selectedFile.type) || /\.(pdf|png|jpg|jpeg)$/i.test(selectedFile.name);

        if (isXml) {
            try {
                setLoading(true);
                const xmlText = await selectedFile.text();
                const parsedInvoice = parseInboundNfeXml(xmlText);

                if (parsedInvoice.nfeKey) {
                    const existing = await checkInboundInvoiceKeyExists(parsedInvoice.nfeKey);
                    if (existing) {
                        setDuplicateKey(parsedInvoice.nfeKey);
                        setDuplicateExistingInvoice(existing);
                        setDuplicateAlertOpen(true);
                        setFile(null);
                        setInvoice(null);
                        return;
                    }
                }

                const list = await fetchPersons('suppliers');
                const document = (parsedInvoice.emitterCnpj || '').replace(/\D/g, '');
                const match = document ? list.find((person) => (person.cpfCnpj || '').replace(/\D/g, '') === document) : undefined;
                
                setFile(selectedFile);
                setSuppliers(list);
                setInvoice({ ...parsedInvoice, supplierId: match?.id });
                toast.success('Arquivo XML lido e processado com sucesso!');
            } catch (error: any) {
                toast.error(error.message || 'Falha ao ler o arquivo XML.');
                setFile(null);
                setInvoice(null);
            } finally {
                setLoading(false);
            }
            return;
        }

        if (isPdfOrImage && selectedFile.size <= 12 * 1024 * 1024) {
            setFile(selectedFile);
            setInvoice(null);
            void analyze(selectedFile);
            return;
        }

        toast.error('Envie um arquivo XML, PDF, PNG ou JPG de até 12 MB.');
    };

    const save = async () => {
        if (!invoice) return;
        if (String(invoice.model || '').replace(/\D/g, '') === '65') return toast.error('NFC-e não pode ser cadastrada como NF de Entrada.');
        if (!invoice.supplierId) return toast.error('Selecione ou crie o fornecedor antes de salvar.');

        if (invoice.nfeKey) {
            const existing = await checkInboundInvoiceKeyExists(invoice.nfeKey, invoice.id);
            if (existing) {
                setDuplicateKey(invoice.nfeKey);
                setDuplicateExistingInvoice(existing);
                setDuplicateAlertOpen(true);
                return;
            }
        }
        const invoiceToSave: InboundInvoice = {
            ...invoice,
        };

        try {
            await Promise.all(invoiceToSave.items.filter((item) => item.matchedProductId && item.productCode).map((item) => saveProductSupplierCode({
                supplierId: invoiceToSave.supplierId!,
                productId: item.matchedProductId!,
                productVariationId: item.matchedVariationId,
                supplierProductCode: item.productCode,
                supplierDescription: item.productDescription,
                normalizedDescription: item.normalizedParentName,
            })));
            await Promise.all(invoiceToSave.items.filter((item) => item.matchedProductId).map((item) => recordProductResolutionFeedback({
                supplierId: invoiceToSave.supplierId!,
                supplierProductCode: item.productCode,
                supplierCodeFamily: item.detectedSupplierCodeFamily,
                nfItemDescription: item.productDescription,
                normalizedParentName: item.normalizedParentName,
                detectedAttributes: Object.fromEntries(Object.entries(item.extractedAttributes || {}).filter(([, value]) => typeof value === 'string')) as Record<string, string>,
                unitCost: item.unitCost,
                userDecision: 'accepted',
                finalProductId: item.matchedProductId!,
                finalVariationId: item.matchedVariationId,
                relationType: item.matchedVariationId ? 'existing_variation' : 'new_product',
            })));
            const saved = await saveInboundInvoice(invoiceToSave);
            toast.success('NF salva e pronta para recebimento.');
            onImportSuccess(saved);
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Não foi possível salvar a NF.');
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[1000002] flex items-center justify-center p-3">
                <button className="absolute inset-0 bg-slate-950/60" onClick={onClose} />
                <section className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900">
                    <header className="flex items-center justify-between border-b p-5">
                        <div><h2 className="font-black text-slate-800 dark:text-slate-100">Adicionar Nota Fiscal de Entrada</h2><p className="text-xs text-slate-500">Importe, selecione o fornecedor e vincule os produtos.</p></div>
                        <button onClick={onClose}><i className="bi bi-x-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" /></button>
                    </header>
                    <main className="space-y-5 overflow-y-auto p-5">
                        <input ref={input} type="file" accept={accepted} capture="environment" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
                        {!invoice && <button
                            type="button"
                            disabled={loading}
                            onClick={() => input.current?.click()}
                            onDragOver={(event) => { event.preventDefault(); if (!loading) setIsDraggingFile(true); }}
                            onDragLeave={() => setIsDraggingFile(false)}
                            onDrop={(event) => { event.preventDefault(); setIsDraggingFile(false); void handleFile(event.dataTransfer.files?.[0]); }}
                            className={`flex w-full flex-col items-center rounded-2xl border-2 border-dashed p-8 transition-colors ${isDraggingFile ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-955/30' : 'border-slate-200 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-slate-700 dark:hover:bg-slate-800'} disabled:cursor-wait disabled:opacity-80`}
                        >
                            {loading ? <i className="bi bi-arrow-repeat animate-spin text-3xl text-indigo-600" /> : <i className="bi bi-cloud-arrow-up text-3xl" />}
                            <b className="mt-2 text-xs">{loading ? (analysisStage === 'uploading' ? 'Enviando documento...' : 'Extraindo dados da nota fiscal...') : 'Adicionar foto, documento ou XML'}</b>
                            {!loading && <span className="mt-1 text-[11px] text-slate-400">Clique ou arraste um arquivo XML, PDF, PNG ou JPG para esta área</span>}
                        </button>}
                        {file && <div className="flex justify-between rounded-xl bg-slate-50 p-3"><span className="text-xs font-bold">{file.name}</span><button className="text-xs text-red-600" onClick={() => { setFile(null); setInvoice(null); }}>Remover</button></div>}

                        {invoice && <div className="space-y-4">
                            {invoice.extractionWarnings?.length ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Confira os dados extraídos</b><ul className="mt-2 list-disc pl-5 text-xs">{invoice.extractionWarnings.map((warning) => <li key={warning}>{warning === 'access_key_missing' ? 'A chave de acesso não foi localizada; ela pode ser preenchida depois.' : warning === 'access_key_needs_review' || warning === 'access_key_check_digit_invalid' ? 'Confira a chave de acesso lida; você pode corrigir ou deixar em branco.' : warning}</li>)}</ul></section> : null}
                            <InboundInvoiceFiscalReview invoice={invoice} />
                            <section className="rounded-2xl border p-4"><h3 className="text-xs font-black uppercase text-slate-500">Dados da NF</h3><label className="mt-3 block text-xs font-bold text-slate-600">Chave de acesso <span className="font-normal text-slate-400">(opcional)</span><input value={invoice.nfeKey} onChange={(event) => setInvoice((current) => current ? ({ ...current, nfeKey: event.target.value.replace(/\D/g, '') }) : current)} inputMode="numeric" placeholder="Ex.: 3524 0511 1111 1111..." className="mt-1 w-full rounded-xl border p-2 text-sm" /></label><p className="mt-1 text-[11px] text-slate-500">No DANFE ela costuma aparecer em grupos de quatro dígitos sob “Chave de Acesso”.</p></section>
                            
                            {(() => {
                                const hasMatchedProducts = invoice.items.some((item) => Boolean(item.matchedProductId));
                                return (
                                    <section className="rounded-2xl border p-4">
                                        <h3 className="text-xs font-black uppercase text-slate-500">Fornecedor</h3>
                                        <p className="mt-2 font-bold">{invoice.emitterName || 'Emitente não identificado'}</p>
                                        <p className="text-xs text-slate-500">{invoice.emitterCnpj || 'CNPJ/CPF não encontrado'}</p>
                                        <div className="mt-3 flex gap-2">
                                            <select
                                                value={invoice.supplierId || ''}
                                                disabled={hasMatchedProducts}
                                                onChange={(event) => setSupplier(event.target.value)}
                                                className="min-w-0 flex-1 rounded-xl border p-2 text-sm disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Selecione o fornecedor</option>
                                                {suppliers.map((supplier) => (
                                                    <option key={supplier.id} value={supplier.id}>
                                                        {supplier.fullName} · {supplier.cpfCnpj || 'sem CNPJ/CPF'}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                disabled={hasMatchedProducts}
                                                className="rounded-xl border border-emerald-200 px-3 text-xs font-black text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                                onClick={() => setNewSupplier(true)}
                                            >
                                                + Novo fornecedor
                                            </button>
                                        </div>
                                        {hasMatchedProducts ? (
                                            <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                <i className="bi bi-lock-fill text-amber-600" />
                                                Para alterar o fornecedor da NF, desvincule primeiro todos os produtos da nota.
                                            </p>
                                        ) : invoice.supplierId ? (
                                            <p className="mt-2 text-xs font-bold text-emerald-700">Fornecedor vinculado. Os produtos estão liberados.</p>
                                        ) : (
                                            <p className="mt-2 text-xs text-amber-700">Selecione o fornecedor para habilitar os produtos.</p>
                                        )}
                                    </section>
                                );
                            })()}

                            <InboundInvoiceItemsReview items={invoice.items} supplierId={invoice.supplierId} suppliers={suppliers} onChange={(itemNumber, update) => setInvoice((current) => current ? { ...current, items: current.items.map((item) => item.itemNumber === itemNumber ? { ...item, ...update } : item) } : current)} />
                            <button onClick={() => void save()} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white cursor-pointer hover:bg-emerald-700 transition-colors">Confirmar Nota Fiscal</button>
                        </div>}
                    </main>
                </section>
            </div>
            <PersonFormModal isOpen={newSupplier} onClose={() => setNewSupplier(false)} collectionName="suppliers" title="Novo Fornecedor" onSuccess={(person) => { setSuppliers((current) => [...current, person]); setSupplier(person.id || ''); setNewSupplier(false); }} />
            <InboundDuplicateKeyAlertModal
                isOpen={duplicateAlertOpen}
                duplicateKey={duplicateKey}
                existingInvoice={duplicateExistingInvoice}
                onClose={() => setDuplicateAlertOpen(false)}
            />
        </>
    );
}
