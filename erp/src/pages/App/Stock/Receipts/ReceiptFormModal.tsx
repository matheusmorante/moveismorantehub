import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import { PurchaseItemsSection } from '@/components/PurchaseItemsSection';
import Person from '../../../types/person.type';
import { PurchaseItem } from '../../../types/purchase.type';
import { formatCurrency } from '../../../utils/formatters';
import { subscribeToPeople } from '../../../utils/personService';
import { GoodsReceipt, finalizeGoodsReceipt, saveGoodsReceiptDraft } from '../../../utils/goodsReceiptService';
import { InboundInvoice } from '../../../utils/inboundNfe/inboundNfeTypes';
import { markInvoiceAsReceived } from '../../../utils/inboundNfe/inboundInvoicesService';
import Purchase from '../../../types/purchase.type';
import Product from '../../../types/product.type';
import ReceiptFiscalDocumentsSection from './ReceiptFiscalDocumentsSection';
import InboundNfeItemsSection, { InboundReceiptItem } from './InboundNfeItemsSection';
import { findProductSupplierCodes, saveProductSupplierCode } from '../../../utils/productSupplierCodesService';
import { getProductsByIds } from '../../../utils/productService';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    initialReceipt?: GoodsReceipt | null;
    initialInboundInvoice?: InboundInvoice | null;
    initialPurchase?: Purchase | null;
    preselectedSupplierId?: string;
};

const calculateItems = (items: PurchaseItem[], ipi: number, freight: number) => items.map((item) => {
    const baseCost = item.baseCost || item.unitCost;
    const quantity = Math.max(1, item.quantity);
    const unitIpi = typeof item.ipiValue === 'number' ? item.ipiValue / quantity : baseCost * ipi / 100;
    const unitFreight = typeof item.freightValue === 'number' ? item.freightValue / quantity : baseCost * freight / 100;
    const unitCost = baseCost + unitIpi + unitFreight;
    return { ...item, baseCost, unitCost: Number(unitCost.toFixed(2)), totalCost: Number((item.quantity * unitCost).toFixed(2)) };
});

export default function ReceiptFormModal({ isOpen, onClose, initialReceipt, initialInboundInvoice, initialPurchase, preselectedSupplierId }: Props) {
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [draftId, setDraftId] = useState<string>('');
    const [supplierId, setSupplierId] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [inboundItems, setInboundItems] = useState<InboundReceiptItem[] | null>(null);
    const [ipiPercent, setIpiPercent] = useState(0);
    const [freightPercent, setFreightPercent] = useState(0);
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
    const [isSaving, setIsSaving] = useState(false);
    const [fiscalKey, setFiscalKey] = useState('');
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isDraftSaved, setIsDraftSaved] = useState(false);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        if (initialReceipt) {
            setDraftId(initialReceipt.id);
            setSupplierId(initialReceipt.supplierId || '');
            setItems(initialReceipt.items || []);
            setInboundItems(null);
            setIpiPercent(initialReceipt.ipiPercent || 0);
            setFreightPercent(initialReceipt.freightPercent || 0);
            setReceiptDate(initialReceipt.receivedAt ? initialReceipt.receivedAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
            setFiscalKey(initialReceipt.fiscalKey || '');
            setAttachments(initialReceipt.attachments || []);
            setIsDraftSaved(initialReceipt.isDraft);
        } else if (initialPurchase) {
            setDraftId('');
            applyPurchase(initialPurchase);
            setInboundItems(null);
            setReceiptDate(new Date().toISOString().slice(0, 10));
            setFiscalKey(''); setAttachments([]); setIsDraftSaved(false);
        } else if (initialInboundInvoice) {
            setDraftId('');
            setSupplierId(preselectedSupplierId || '');
            void applyInboundInvoice(initialInboundInvoice);
        } else {
            setDraftId(''); setSupplierId(preselectedSupplierId || ''); setItems([]); setIpiPercent(0); setFreightPercent(0);
            setInboundItems(null);
            setReceiptDate(new Date().toISOString().slice(0, 10)); setFiscalKey(''); setAttachments([]); setIsDraftSaved(false);
        }
        return subscribeToPeople('suppliers', (data) => setSuppliers(data.filter((person) => !person.deleted && person.type === 'suppliers')));
    }, [isOpen, initialReceipt, initialInboundInvoice, initialPurchase, preselectedSupplierId]);

    const processedItems = calculateItems(items, ipiPercent, freightPercent);
    const totalValue = processedItems.reduce((sum, item) => sum + item.totalCost, 0);

    // Auto-save rascunho de forma contínua quando fornecedor e pelo menos 1 item estão selecionados
    useEffect(() => {
        if (!isOpen) return;
        if (!supplierId || !items.length) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                const currentSupplier = suppliers.find((p) => p.id === supplierId);
                const savedDraft = await saveGoodsReceiptDraft({
                    id: draftId || undefined,
                    supplierId,
                    supplierName: currentSupplier?.fullName || 'Fornecedor',
                    receivedAt: new Date(`${receiptDate}T12:00:00`).toISOString(),
                    items: processedItems,
                    totalValue,
                    fiscalKey,
                    attachments,
                    ipiPercent,
                    freightPercent,
                });
                if (!draftId && savedDraft.id) setDraftId(savedDraft.id);
                setIsDraftSaved(true);
            } catch (err) {
                console.error('Erro ao auto-salvar rascunho:', err);
            }
        }, 500);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [isOpen, supplierId, items, ipiPercent, freightPercent, receiptDate, fiscalKey, attachments]);

    if (!isOpen) return null;
    const supplier = suppliers.find((person) => person.id === supplierId);

    const handleFinalize = async () => {
        if (!supplier) return toast.error('Selecione o fornecedor para continuar.');
        if (!items.length) return toast.error('Adicione pelo menos um item para confirmar o recebimento.');
        if (inboundItems?.some((item) => !item.linkedProductId)) return toast.error('Vincule todos os itens da NF-e a um produto do ERP antes de confirmar.');
        if (fiscalKey && fiscalKey.length !== 44) return toast.error('A chave de acesso da nota fiscal deve conter exatamente 44 dígitos.');
        setIsSaving(true);
        try {
            const receiptId = draftId || `rcpt_${Date.now()}`;
            if (inboundItems) {
                await Promise.all(inboundItems.map((item) => saveProductSupplierCode({
                    supplierId,
                    productId: item.linkedProductId!,
                    productVariationId: item.linkedVariationId,
                    supplierProductCode: item.productCode,
                    supplierDescription: item.productDescription,
                })));
            }
            await finalizeGoodsReceipt({
                id: receiptId,
                supplierId,
                supplierName: supplier.fullName,
                receivedAt: new Date(`${receiptDate}T12:00:00`).toISOString(),
                items: processedItems,
                totalValue,
                fiscalKey,
                attachments,
                ipiPercent,
                freightPercent,
                status: 'received',
                isDraft: false,
            });
            if (fiscalKey && fiscalKey.length === 44) {
                await markInvoiceAsReceived(fiscalKey, receiptId);
            }
            toast.success('Recebimento de mercadorias confirmado com sucesso!');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Não foi possível concluir o recebimento.');
        } finally { setIsSaving(false); }
    };

    const applyInboundInvoice = async (invoice: InboundInvoice) => {
        const cleanCnpj = (cnpj = '') => cnpj.replace(/\D/g, '');
        const normalize = (val = '') => val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

        let matchedSupplier = suppliers.find((p) => {
            if (p.cnpj && invoice.emitterCnpj) {
                return cleanCnpj(p.cnpj) === cleanCnpj(invoice.emitterCnpj);
            }
            return false;
        });

        if (!matchedSupplier && invoice.emitterName) {
            const emitterTerm = normalize(invoice.emitterName);
            matchedSupplier = suppliers.find((p) => {
                const name = normalize(p.fullName || '');
                const trade = normalize(p.tradeName || '');
                return name.includes(emitterTerm) || emitterTerm.includes(name) || (trade && (trade.includes(emitterTerm) || emitterTerm.includes(trade)));
            });
        }

        const resolvedSupplierId = matchedSupplier?.id || preselectedSupplierId || '';
        if (resolvedSupplierId) setSupplierId(resolvedSupplierId);

        setFiscalKey(invoice.nfeKey);
        if (invoice.issuedAt) {
            setReceiptDate(invoice.issuedAt.slice(0, 10));
        }

        const baseSubtotal = invoice.totalProducts || 1;
        const calcIpi = invoice.totalIpi > 0 ? Number(((invoice.totalIpi / baseSubtotal) * 100).toFixed(2)) : 0;
        const calcFreight = invoice.totalFreight > 0 ? Number(((invoice.totalFreight / baseSubtotal) * 100).toFixed(2)) : 0;
        setIpiPercent(calcIpi);
        setFreightPercent(calcFreight);

        let references = new Map();
        try {
            references = resolvedSupplierId ? await findProductSupplierCodes(resolvedSupplierId, invoice.items.map((item) => item.productCode)) : new Map();
        } catch (error) {
            console.warn('Não foi possível consultar referências de produtos do fornecedor.', error);
        }
        let products: Product[] = [];
        try {
            products = await getProductsByIds([...new Set([...references.values()].map((reference) => reference.productId))]);
        } catch (error) {
            console.warn('Não foi possível carregar os produtos vinculados à NF-e.', error);
        }
        const linkedItems: InboundReceiptItem[] = invoice.items.map((item) => {
            const reference = references.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
            const product = products.find((candidate) => candidate.id === reference?.productId);
            const variation = product?.variations?.find((candidate) => candidate.id === reference?.productVariationId);
            return {
                ...item,
                linkedProductId: reference?.productId || item.matchedProductId,
                linkedVariationId: reference?.productVariationId || item.matchedVariationId,
                linkedProductCode: variation?.sku || product?.code || '',
                linkedProductName: variation?.name || product?.name || product?.title || '',
                linkStatus: reference || item.matchedProductId ? 'automatic' : 'pending',
            };
        });
        const convertedItems: PurchaseItem[] = linkedItems.map((item) => ({
            productId: item.linkedProductId || '', variationId: item.linkedVariationId || '', description: item.productDescription,
            quantity: item.quantity, baseCost: item.unitCost, unitCost: item.unitCost, totalCost: item.totalCost,
            ipiValue: item.ipiValue, freightValue: item.freightValue,
        }));

        setInboundItems(linkedItems);
        setItems(convertedItems);
        toast.success(`NF-e #${invoice.nfeNumber} carregada com ${convertedItems.length} item(ns)!`);
    };

    const handleInboundItemChange = (itemNumber: number, update: Partial<InboundReceiptItem>) => {
        setInboundItems((current) => {
            if (!current) return current;
            const updated = current.map((item) => item.itemNumber === itemNumber ? { ...item, ...update } : item);
            setItems(updated.map((item) => ({
                productId: item.linkedProductId || '', variationId: item.linkedVariationId || '', description: item.productDescription,
                quantity: item.quantity, baseCost: item.unitCost, unitCost: item.unitCost, totalCost: item.unitCost * item.quantity,
                ipiValue: item.ipiValue, freightValue: item.freightValue,
            })));
            return updated;
        });
    };

    const applyPurchase = (purchase: Purchase) => {
        setSupplierId(purchase.supplierId);
        setItems(purchase.items.map((item) => ({ ...item, baseCost: item.baseCost || item.unitCost, unitCost: item.baseCost || item.unitCost, totalCost: (item.baseCost || item.unitCost) * item.quantity })));
        setIpiPercent(purchase.ipiPercent || 0); setFreightPercent(purchase.freightPercent || 0);
        toast.info('Pedido carregado. Confira e ajuste os itens recebidos antes de registrar.');
    };

    const content = <div className="fixed inset-0 z-[999999] flex items-center justify-center p-0 xl:p-6">
        <button aria-label="Fechar" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
        <section className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 xl:h-auto xl:max-h-[90vh] xl:max-w-7xl xl:rounded-[2.5rem]">
            <header className="flex shrink-0 items-center justify-between bg-emerald-600 px-5 py-2.5 text-white xl:px-8 xl:py-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black uppercase">Registrar recebimento</h2>
                    {isDraftSaved && (
                        <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white border border-white/30 animate-pulse">
                            <i className="bi bi-cloud-check-fill text-emerald-300" /> Rascunho salvo
                        </span>
                    )}
                </div>
                <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10"><i className="bi bi-x-lg text-lg" /></button>
            </header>
            <div className="flex-1 space-y-7 overflow-y-auto p-5 xl:p-8">
                <div className="grid grid-cols-1 items-end gap-5 md:grid-cols-5">
                    <div className="md:col-span-2">
                        <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="flex items-center gap-1.5">
                                Fornecedor
                                {supplier && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[9px] font-bold tracking-wider">
                                        <i className="bi bi-check2-circle text-[10px]" /> Selecionado
                                    </span>
                                )}
                            </span>
                            <div className="relative">
                                <input
                                    type="text"
                                    readOnly
                                    disabled
                                    value={supplier?.fullName || supplier?.tradeName || (supplierId ? 'Fornecedor selecionado' : 'Selecione um fornecedor na tela inicial')}
                                    className="w-full border-b-2 border-emerald-500 bg-emerald-50/30 p-2 pr-9 text-sm font-bold text-emerald-900 cursor-not-allowed outline-none dark:border-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-100"
                                    title="Fornecedor selecionado na tela inicial."
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400">
                                    <i className="bi bi-check-circle-fill text-base" />
                                </div>
                            </div>
                        </label>
                    </div>
                    <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Data do recebimento<input type="date" value={receiptDate} onChange={(event) => setReceiptDate(event.target.value)} className="border-b-2 border-slate-200 bg-transparent p-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-600 dark:border-slate-700 dark:text-slate-200" /></label>
                    <NumberField label="IPI (%)" value={ipiPercent} onChange={setIpiPercent} />
                    <NumberField label="Frete (%)" value={freightPercent} onChange={setFreightPercent} />
                </div>
                <ReceiptFiscalDocumentsSection attachments={attachments} fiscalKey={fiscalKey} onAttachmentsChange={setAttachments} onFiscalKeyChange={setFiscalKey} />
                {inboundItems ? <InboundNfeItemsSection items={inboundItems} supplierId={supplierId} onChange={handleInboundItemChange} formatCurrency={formatCurrency} /> : <PurchaseItemsSection
                    items={items}
                    onAddItem={(item) => setItems((current) => [...current, item])}
                    onRemoveItem={(index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    onUpdateItem={(index, updatedItem) => setItems((current) => current.map((item, i) => (i === index ? updatedItem : item)))}
                    ipiPercent={ipiPercent}
                    freightPercent={freightPercent}
                    formatCurrency={formatCurrency}
                    supplierId={supplierId}
                    onSupplierAutoSelect={setSupplierId}
                    isReceiptMode={true}
                />}
            </div>
            <footer className="flex shrink-0 flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-955/40 sm:flex-row xl:px-8"><p className="text-sm font-black text-slate-700 dark:text-slate-100">Total final: <span className="text-emerald-600">{formatCurrency(totalValue)}</span></p><div className="flex w-full gap-3 sm:w-auto"><button type="button" onClick={onClose} className="flex-1 rounded-2xl px-5 py-3 text-xs font-black uppercase text-slate-500">Cancelar</button><button type="button" disabled={isSaving} onClick={handleFinalize} className="flex-1 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-black uppercase text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md">{isSaving ? 'Confirmando...' : 'Confirmar recebimento'}</button></div></footer>
        </section>
    </div>;
    return typeof document === 'undefined' ? content : createPortal(content, document.body);
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    return <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}<input type="number" min="0" value={value || ''} onChange={(event) => onChange(Math.max(0, Number(event.target.value)))} className="border-b-2 border-slate-200 bg-transparent p-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-600 dark:border-slate-700 dark:text-slate-200" placeholder="0" /></label>;
}
