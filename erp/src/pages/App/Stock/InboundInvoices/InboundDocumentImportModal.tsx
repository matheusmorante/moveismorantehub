import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import PersonFormModal from '@/pages/App/Registrations/shared/PersonFormModal';
import { analyzeInboundInvoiceDocument, invoiceFromDocumentAnalysis } from '@/pages/utils/inboundNfe/inboundDocumentImportService';
import type { InboundDocumentAnalysisStage } from '@/pages/utils/inboundNfe/inboundDocumentImportService';
import { saveInboundInvoice } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { InboundInvoice, InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { fetchPersons } from '@/pages/utils/personService';
import { saveProductSupplierCode } from '@/pages/utils/productSupplierCodesService';
import { findProductSupplierCodes } from '@/pages/utils/productSupplierCodesService';
import { recordProductResolutionFeedback } from '@/pages/utils/inboundNfe/productResolutionFeedbackService';
import Person from '@/pages/types/person.type';
import { calculateAdditionalCosts, getLegacyCompatibleCosts, isBlankAdditionalCost } from '@/pages/utils/inboundNfe/additionalCosts';
import { InboundAdditionalCostsSection } from './InboundAdditionalCostsSection';
import { InboundInvoiceFiscalReview } from './InboundInvoiceFiscalReview';
import { InboundInvoiceItemsReview } from './InboundInvoiceItemsReview';

type Props = { isOpen: boolean; onClose: () => void; onImportSuccess: (invoice: InboundInvoice) => void };
const accepted = 'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg';

export function InboundDocumentImportModal({ isOpen, onClose, onImportSuccess }: Props) {
    const input = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [invoice, setInvoice] = useState<InboundInvoice | null>(null);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [newSupplier, setNewSupplier] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analysisStage, setAnalysisStage] = useState<InboundDocumentAnalysisStage | null>(null);
    const [isDraggingFile, setIsDraggingFile] = useState(false);

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

    const handleFile = (selectedFile?: File) => {
        if (!selectedFile) return;
        if (['application/pdf', 'image/png', 'image/jpeg'].includes(selectedFile.type) && selectedFile.size <= 12 * 1024 * 1024) {
            setFile(selectedFile);
            setInvoice(null);
            void analyze(selectedFile);
            return;
        }
        toast.error('Envie PDF, PNG ou JPG de até 12 MB.');
    };

    const save = async () => {
        if (!invoice) return;
        if (String(invoice.model || '').replace(/\D/g, '') === '65') return toast.error('NFC-e não pode ser cadastrada como NF de Entrada.');
        if (!invoice.supplierId) return toast.error('Selecione ou crie o fornecedor antes de salvar.');
        const additionalCosts = getLegacyCompatibleCosts(invoice.additionalCosts || [], invoice.additionalFreight).filter((cost) => !isBlankAdditionalCost(cost));
        if (additionalCosts.some((cost) => !cost.description.trim() || cost.inputValue === null || !Number.isFinite(cost.inputValue) || cost.inputValue < 0)) return toast.error('Preencha descrição e valor de todas as outras despesas não fiscais.');

        const calculation = calculateAdditionalCosts(invoice.items, additionalCosts);
        const invoiceToSave: InboundInvoice = {
            ...invoice,
            additionalCosts: calculation.costs,
            additionalCostsTotal: calculation.totalAdditionalCosts,
            additionalFreight: undefined,
            additionalCostAllocations: undefined,
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
                        <div><h2 className="font-black">Adicionar NF</h2><p className="text-xs text-slate-500">Importe, selecione o fornecedor e vincule os produtos.</p></div>
                        <button onClick={onClose}><i className="bi bi-x-lg" /></button>
                    </header>
                    <main className="space-y-5 overflow-y-auto p-5">
                        <input ref={input} type="file" accept={accepted} capture="environment" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
                        {!invoice && <button
                            type="button"
                            disabled={loading}
                            onClick={() => input.current?.click()}
                            onDragOver={(event) => { event.preventDefault(); if (!loading) setIsDraggingFile(true); }}
                            onDragLeave={() => setIsDraggingFile(false)}
                            onDrop={(event) => { event.preventDefault(); setIsDraggingFile(false); handleFile(event.dataTransfer.files?.[0]); }}
                            className={`flex w-full flex-col items-center rounded-2xl border-2 border-dashed p-8 transition-colors ${isDraggingFile ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30' : 'border-slate-200 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-slate-700 dark:hover:bg-slate-800'} disabled:cursor-wait disabled:opacity-80`}
                        >
                            {loading ? <i className="bi bi-arrow-repeat animate-spin text-3xl text-indigo-600" /> : <i className="bi bi-cloud-arrow-up text-3xl" />}
                            <b className="mt-2 text-xs">{loading ? (analysisStage === 'uploading' ? 'Enviando documento...' : 'Preparando e extraindo informações da NF...') : 'Adicionar foto ou documento'}</b>
                            {!loading && <span className="mt-1 text-[11px] text-slate-400">Clique ou arraste um PDF, PNG ou JPG para esta área</span>}
                        </button>}
                        {file && <div className="flex justify-between rounded-xl bg-slate-50 p-3"><span className="text-xs font-bold">{file.name}</span><button className="text-xs text-red-600" onClick={() => { setFile(null); setInvoice(null); }}>Remover</button></div>}

                        {invoice && <div className="space-y-4">
                            {invoice.extractionWarnings?.length ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Confira os dados extraídos</b><ul className="mt-2 list-disc pl-5 text-xs">{invoice.extractionWarnings.map((warning) => <li key={warning}>{warning === 'access_key_missing' ? 'A chave de acesso não foi localizada; ela pode ser preenchida depois.' : warning === 'access_key_needs_review' || warning === 'access_key_check_digit_invalid' ? 'Confira a chave de acesso lida; você pode corrigir ou deixar em branco.' : warning}</li>)}</ul></section> : null}
                            <InboundInvoiceFiscalReview invoice={invoice} />
                            <InboundAdditionalCostsSection invoice={invoice} onChange={(update) => setInvoice((current) => current ? { ...current, ...update } : current)} />
                            <section className="rounded-2xl border p-4"><h3 className="text-xs font-black uppercase text-slate-500">Dados da NF</h3><label className="mt-3 block text-xs font-bold text-slate-600">Chave de acesso <span className="font-normal text-slate-400">(opcional)</span><input value={invoice.nfeKey} onChange={(event) => setInvoice((current) => current ? ({ ...current, nfeKey: event.target.value.replace(/\D/g, '') }) : current)} inputMode="numeric" placeholder="Ex.: 3524 0511 1111 1111..." className="mt-1 w-full rounded-xl border p-2 text-sm" /></label><p className="mt-1 text-[11px] text-slate-500">No DANFE ela costuma aparecer em grupos de quatro dígitos sob “Chave de Acesso”.</p></section>
                            <section className="rounded-2xl border p-4"><h3 className="text-xs font-black uppercase text-slate-500">Fornecedor</h3><p className="mt-2 font-bold">{invoice.emitterName || 'Emitente não identificado'}</p><p className="text-xs text-slate-500">{invoice.emitterCnpj || 'CNPJ/CPF não encontrado'}</p><div className="mt-3 flex gap-2"><select value={invoice.supplierId || ''} onChange={(event) => setSupplier(event.target.value)} className="min-w-0 flex-1 rounded-xl border p-2 text-sm"><option value="">Selecione o fornecedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.fullName} · {supplier.cpfCnpj || 'sem CNPJ/CPF'}</option>)}</select><button className="rounded-xl border border-emerald-200 px-3 text-xs font-black text-emerald-700" onClick={() => setNewSupplier(true)}>+ Novo fornecedor</button></div>{invoice.supplierId ? <p className="mt-2 text-xs font-bold text-emerald-700">Fornecedor vinculado. Os produtos estão liberados.</p> : <p className="mt-2 text-xs text-amber-700">Selecione o fornecedor para habilitar os produtos.</p>}</section>
                            <InboundInvoiceItemsReview items={invoice.items} supplierId={invoice.supplierId} suppliers={suppliers} onChange={(itemNumber, update) => setInvoice((current) => current ? { ...current, items: current.items.map((item) => item.itemNumber === itemNumber ? { ...item, ...update } : item) } : current)} />
                            <button onClick={() => void save()} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">Salvar NF revisada</button>
                        </div>}
                    </main>
                </section>
            </div>
            <PersonFormModal isOpen={newSupplier} onClose={() => setNewSupplier(false)} collectionName="suppliers" title="Novo Fornecedor" onSuccess={(person) => { setSuppliers((current) => [...current, person]); setSupplier(person.id || ''); setNewSupplier(false); }} />
        </>
    );
}
