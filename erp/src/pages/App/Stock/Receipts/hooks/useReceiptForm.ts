import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type Person from '@/pages/types/person.type';
import type { PurchaseItem } from '@/pages/types/purchase.type';
import { subscribeToPeople } from '@/pages/utils/personService';
import { type GoodsReceipt, finalizeGoodsReceipt, saveGoodsReceiptDraft } from '@/pages/utils/goodsReceiptService';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { markInvoiceAsReceived } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import type Purchase from '@/pages/types/purchase.type';
import { type InboundReceiptItem } from '../components/InboundNfeItemsSection';
import { saveProductSupplierCode } from '@/pages/utils/productSupplierCodesService';
import { calculateReceiptItems } from '@/pages/utils/goodsReceiptCostCalculation';
import { convertInboundToPurchaseItems } from '../utils/inboundToPurchaseConverter';
import { adaptInboundInvoiceToReceiptState } from '../utils/inboundInvoiceToReceiptAdapter';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface UseReceiptFormParams {
    isOpen: boolean;
    onClose: () => void;
    initialReceipt?: GoodsReceipt | null;
    copyReceipt?: boolean;
    initialInboundInvoice?: InboundInvoice | null;
    initialPurchase?: Purchase | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReceiptForm({
    isOpen,
    onClose,
    initialReceipt,
    copyReceipt = false,
    initialInboundInvoice,
    initialPurchase,
}: UseReceiptFormParams) {
    // ── Estado principal ───────────────────────────────────────────────────────
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [draftId, setDraftId] = useState<string>('');
    const [receiptIndex, setReceiptIndex] = useState<number | undefined>(undefined);
    const [sourcePurchaseId, setSourcePurchaseId] = useState<string>('');
    const [supplierId, setSupplierId] = useState<string>('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [inboundItems, setInboundItems] = useState<InboundReceiptItem[] | null>(null);
    const [ipiPercent, setIpiPercent] = useState(0);
    const [freightPercent, setFreightPercent] = useState(0);

    // ── Custos não fiscais ─────────────────────────────────────────────────────
    const [nonFiscalDiscountMode, setNonFiscalDiscountMode] = useState<'percent' | 'fixed'>('percent');
    const [nonFiscalDiscountValue, setNonFiscalDiscountValue] = useState<number>(0);
    const [nonFiscalFreightMode, setNonFiscalFreightMode] = useState<'percent' | 'fixed'>('percent');
    const [nonFiscalFreightValue, setNonFiscalFreightValue] = useState<number>(0);
    const [nonFiscalOtherExpensesMode, setNonFiscalOtherExpensesMode] = useState<'percent' | 'fixed'>('percent');
    const [nonFiscalOtherExpensesValue, setNonFiscalOtherExpensesValue] = useState<number>(0);

    // ── Dados fiscais de referência (NF-e) ────────────────────────────────────
    const [fiscalIpi, setFiscalIpi] = useState<number>(0);
    const [fiscalFreight, setFiscalFreight] = useState<number>(0);
    const [fiscalDiscount, setFiscalDiscount] = useState<number>(0);
    const [fiscalOtherExpenses, setFiscalOtherExpenses] = useState<number>(0);

    // ── Metadados ─────────────────────────────────────────────────────────────
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAttachingInboundDocument, setIsAttachingInboundDocument] = useState(false);
    const [fiscalKey, setFiscalKey] = useState('');
    const [attachments, setAttachments] = useState<string[]>([]);
    const [observations, setObservations] = useState<string[]>([]);
    const [isDraftSaved, setIsDraftSaved] = useState(false);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Aplicar pedido de compra ───────────────────────────────────────────────
    const applyPurchase = (purchase: Purchase) => {
        setSupplierId(purchase.supplierId);
        setItems(purchase.items.map(item => ({
            ...item,
            baseCost: item.baseCost || item.unitCost,
            unitCost: item.baseCost || item.unitCost,
            totalCost: (item.baseCost || item.unitCost) * item.quantity,
        })));
        setIpiPercent(purchase.ipiPercent || 0);
        setFreightPercent(purchase.freightPercent || 0);
        toast.info('Pedido carregado. Confira e ajuste os itens recebidos antes de registrar.');
    };

    // ── Aplicar NF-e (via adapter de domínio) ─────────────────────────────────
    const applyInboundInvoice = async (invoice: InboundInvoice) => {
        const adapted = await adaptInboundInvoiceToReceiptState(
            invoice,
            suppliers,
            setIsAttachingInboundDocument
        );

        if (adapted.resolvedSupplierId) setSupplierId(adapted.resolvedSupplierId);
        setFiscalKey(adapted.fiscalKey);
        if (adapted.invoiceNumber) setInvoiceNumber(adapted.invoiceNumber);
        setReceiptDate(adapted.receiptDate);
        setInvoiceDate(adapted.invoiceDate);
        setIpiPercent(adapted.ipiPercent);
        setFreightPercent(adapted.freightPercent);
        setFiscalIpi(adapted.fiscalIpi);
        setFiscalFreight(adapted.fiscalFreight);
        setFiscalDiscount(adapted.fiscalDiscount);
        setFiscalOtherExpenses(adapted.fiscalOtherExpenses);

        if (adapted.attachmentUrl) {
            setAttachments(prev =>
                prev.includes(adapted.attachmentUrl!) ? prev : [...prev, adapted.attachmentUrl!]
            );
        }

        const convertedItems = convertInboundToPurchaseItems(adapted.linkedItems);
        setInboundItems(adapted.linkedItems);
        setItems(convertedItems);
        toast.success(`NF-e #${invoice.nfeNumber} carregada com ${convertedItems.length} item(ns)!`);
    };

    // ── Reset de estado para formulário vazio ─────────────────────────────────
    const resetForm = () => {
        setDraftId('');
        setReceiptIndex(undefined);
        setSourcePurchaseId('');
        setSupplierId('');
        setItems([]);
        setIpiPercent(0);
        setFreightPercent(0);
        setNonFiscalDiscountMode('percent');
        setNonFiscalDiscountValue(0);
        setNonFiscalFreightMode('percent');
        setNonFiscalFreightValue(0);
        setNonFiscalOtherExpensesMode('percent');
        setNonFiscalOtherExpensesValue(0);
        setFiscalIpi(0);
        setFiscalFreight(0);
        setFiscalDiscount(0);
        setFiscalOtherExpenses(0);
        setInboundItems(null);
        setReceiptDate(new Date().toISOString().slice(0, 10));
        setInvoiceNumber('');
        setInvoiceDate('');
        setFiscalKey('');
        setAttachments([]);
        setObservations([]);
        setIsDraftSaved(false);
    };

    // ── Efeito de inicialização por tipo de origem ─────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        if (initialReceipt) {
            setDraftId(copyReceipt ? '' : initialReceipt.id);
            setReceiptIndex(copyReceipt ? undefined : initialReceipt.receiptIndex);
            setSourcePurchaseId(copyReceipt ? '' : initialReceipt.purchaseId || '');
            setSupplierId(initialReceipt.supplierId || '');
            setItems(initialReceipt.items.map(({ inventoryMoveId: _inventoryMoveId, ...item }) => ({ ...item })));
            setInboundItems(null);
            setIpiPercent(initialReceipt.ipiPercent || 0);
            setFreightPercent(initialReceipt.freightPercent || 0);
            setNonFiscalDiscountMode(initialReceipt.nonFiscalDiscountMode || 'percent');
            setNonFiscalDiscountValue(initialReceipt.nonFiscalDiscountValue || 0);
            setNonFiscalFreightMode(initialReceipt.nonFiscalFreightMode || 'percent');
            setNonFiscalFreightValue(initialReceipt.nonFiscalFreightValue || 0);
            setNonFiscalOtherExpensesMode(initialReceipt.nonFiscalOtherExpensesMode || 'percent');
            setNonFiscalOtherExpensesValue(initialReceipt.nonFiscalOtherExpensesValue || 0);
            setFiscalIpi(initialReceipt.fiscalIpi || 0);
            setFiscalFreight(initialReceipt.fiscalFreight || 0);
            setFiscalDiscount(initialReceipt.fiscalDiscount || 0);
            setFiscalOtherExpenses(initialReceipt.fiscalOtherExpenses || 0);
            setReceiptDate(
                copyReceipt
                    ? new Date().toISOString().slice(0, 10)
                    : (initialReceipt.receivedAt ? initialReceipt.receivedAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
            );
            setInvoiceNumber(initialReceipt.invoiceNumber || '');
            setInvoiceDate(initialReceipt.invoiceDate || '');
            setFiscalKey(initialReceipt.fiscalKey || '');
            setAttachments(initialReceipt.attachments || []);
            setObservations(
                initialReceipt.observation
                    ? initialReceipt.observation.split('\n').map(s => s.trim()).filter(Boolean)
                    : []
            );
            setIsDraftSaved(copyReceipt ? false : initialReceipt.isDraft);
        } else if (initialPurchase) {
            setDraftId('');
            setReceiptIndex(undefined);
            setSourcePurchaseId(initialPurchase.id || '');
            applyPurchase(initialPurchase);
            setInboundItems(null);
            setReceiptDate(new Date().toISOString().slice(0, 10));
            setInvoiceNumber('');
            setInvoiceDate('');
            setFiscalKey('');
            setAttachments([]);
            setObservations([]);
            setIsDraftSaved(false);
            setNonFiscalDiscountMode('percent');
            setNonFiscalDiscountValue(0);
            setNonFiscalFreightMode('percent');
            setNonFiscalFreightValue(0);
            setNonFiscalOtherExpensesMode('percent');
            setNonFiscalOtherExpensesValue(0);
        } else if (initialInboundInvoice) {
            setDraftId('');
            setReceiptIndex(undefined);
            setSourcePurchaseId('');
            setSupplierId('');
            setObservations([]);
            setNonFiscalDiscountMode('percent');
            setNonFiscalDiscountValue(0);
            setNonFiscalFreightMode('percent');
            setNonFiscalFreightValue(0);
            setNonFiscalOtherExpensesMode('percent');
            setNonFiscalOtherExpensesValue(0);
            void applyInboundInvoice(initialInboundInvoice);
        } else {
            resetForm();
        }

        return subscribeToPeople('suppliers', data =>
            setSuppliers(data.filter(person => !person.deleted && person.type === 'suppliers'))
        );
    }, [isOpen, initialReceipt, copyReceipt, initialInboundInvoice, initialPurchase]);

    // ── Cálculo dos itens processados (com custos adicionais rateados) ─────────
    const processedItems = calculateReceiptItems(items, {
        fallbackIpiPercent: ipiPercent,
        fallbackFreightPercent: freightPercent,
        nonFiscalDiscount: { mode: nonFiscalDiscountMode, value: nonFiscalDiscountValue },
        nonFiscalFreight: { mode: nonFiscalFreightMode, value: nonFiscalFreightValue },
        nonFiscalOtherExpenses: { mode: nonFiscalOtherExpensesMode, value: nonFiscalOtherExpensesValue },
    });
    const totalValue = processedItems.reduce((sum, item) => sum + item.totalCost, 0);

    const baseValueForRateio = useMemo(() => {
        if (initialInboundInvoice?.totalInvoice && initialInboundInvoice.totalInvoice > 0) return initialInboundInvoice.totalInvoice;
        if (initialInboundInvoice?.totalProducts && initialInboundInvoice.totalProducts > 0) return initialInboundInvoice.totalProducts;
        if (inboundItems && inboundItems.length > 0) {
            const sum = inboundItems.reduce((acc, item) => acc + ((item.unitCost || 0) * Math.max(1, item.quantity)), 0);
            if (sum > 0) return sum;
        }
        if (items && items.length > 0) {
            const sum = items.reduce((acc, item) => acc + ((item.fiscalBaseCost ?? item.baseCost ?? item.unitCost ?? 0) * Math.max(1, item.quantity)), 0);
            if (sum > 0) return sum;
        }
        return 0;
    }, [initialInboundInvoice, inboundItems, items]);

    // ── Auto-save do rascunho ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const hasItems = items.length > 0 || (inboundItems !== null && inboundItems.length > 0);
        if (!supplierId || !hasItems) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                const currentSupplier = suppliers.find(p => p.id === supplierId);
                const savedDraft = await saveGoodsReceiptDraft({
                    id: draftId || undefined,
                    receiptIndex: receiptIndex || (copyReceipt ? undefined : initialReceipt?.receiptIndex),
                    purchaseId: sourcePurchaseId || undefined,
                    supplierId,
                    supplierName: currentSupplier?.fullName || 'Fornecedor',
                    receivedAt: new Date(`${receiptDate}T12:00:00`).toISOString(),
                    invoiceNumber,
                    invoiceDate,
                    items: processedItems,
                    totalValue,
                    observation: observations.join('\n'),
                    fiscalKey,
                    attachments,
                    ipiPercent,
                    freightPercent,
                    nonFiscalDiscountMode,
                    nonFiscalDiscountValue,
                    nonFiscalFreightMode,
                    nonFiscalFreightValue,
                    nonFiscalOtherExpensesMode,
                    nonFiscalOtherExpensesValue,
                    fiscalIpi,
                    fiscalFreight,
                    fiscalDiscount,
                    fiscalOtherExpenses,
                });
                if (!draftId && savedDraft.id) setDraftId(savedDraft.id);
                if (savedDraft.receiptIndex) setReceiptIndex(savedDraft.receiptIndex);
                setIsDraftSaved(true);
            } catch (err: unknown) {
                console.error('Erro ao auto-salvar rascunho:', err);
            }
        }, 500);

        return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
    }, [isOpen, supplierId, items, inboundItems, draftId, receiptIndex, sourcePurchaseId, ipiPercent, freightPercent, nonFiscalDiscountMode, nonFiscalDiscountValue, nonFiscalFreightMode, nonFiscalFreightValue, nonFiscalOtherExpensesMode, nonFiscalOtherExpensesValue, fiscalIpi, fiscalFreight, fiscalDiscount, fiscalOtherExpenses, receiptDate, invoiceNumber, invoiceDate, fiscalKey, attachments, observations]);

    // ── Finalizar recebimento ──────────────────────────────────────────────────
    const handleFinalize = async () => {
        const supplier = suppliers.find(person => person.id === supplierId);
        if (!supplier) { toast.error('Selecione o fornecedor para continuar.'); return; }
        if (!items.length) { toast.error('Adicione pelo menos um item para confirmar o recebimento.'); return; }
        if (items.some(item => !item.productId)) { toast.error('Selecione o produto de todos os itens antes de confirmar o recebimento.'); return; }
        if (inboundItems?.some(item => {
            if (item.linkMode === 'composition') return !item.compositionLinks || item.compositionLinks.length === 0;
            return !item.linkedProductId;
        })) {
            toast.error('Vincule todos os itens da NF-e a um produto ou composição do ERP antes de confirmar.');
            return;
        }
        if (fiscalKey && fiscalKey.length !== 44) { toast.error('A chave de acesso da nota fiscal deve conter exatamente 44 dígitos.'); return; }

        setIsSaving(true);
        try {
            const receiptId = draftId || crypto.randomUUID();

            if (inboundItems) {
                await Promise.all(inboundItems.flatMap(item => {
                    if (item.linkMode === 'composition' && item.compositionLinks?.length) {
                        return item.compositionLinks.map(comp => saveProductSupplierCode({
                            supplierId,
                            productId: comp.productId,
                            productVariationId: comp.variationId,
                            supplierProductCode: item.productCode,
                            supplierDescription: item.productDescription,
                        }));
                    }
                    if (item.linkedProductId) {
                        return [saveProductSupplierCode({
                            supplierId,
                            productId: item.linkedProductId,
                            productVariationId: item.linkedVariationId,
                            supplierProductCode: item.productCode,
                            supplierDescription: item.productDescription,
                        })];
                    }
                    return [];
                }));
            }

            await finalizeGoodsReceipt({
                id: receiptId,
                receiptIndex: receiptIndex || (copyReceipt ? undefined : initialReceipt?.receiptIndex),
                purchaseId: sourcePurchaseId || undefined,
                supplierId,
                supplierName: supplier.fullName,
                receivedAt: new Date(`${receiptDate}T12:00:00`).toISOString(),
                invoiceNumber,
                invoiceDate,
                items: processedItems,
                totalValue,
                observation: observations.join('\n'),
                fiscalKey,
                attachments,
                ipiPercent,
                freightPercent,
                nonFiscalDiscountMode,
                nonFiscalDiscountValue,
                nonFiscalFreightMode,
                nonFiscalFreightValue,
                nonFiscalOtherExpensesMode,
                nonFiscalOtherExpensesValue,
                fiscalIpi,
                fiscalFreight,
                fiscalDiscount,
                fiscalOtherExpenses,
                status: 'received',
                isDraft: false,
            });

            const isCompleteInvoiceReceipt =
                !inboundItems || inboundItems.every(item => item.quantity >= (item.expectedQuantity || item.quantity));
            if (fiscalKey && fiscalKey.length === 44 && isCompleteInvoiceReceipt) {
                await markInvoiceAsReceived(fiscalKey, receiptId);
            }

            toast.success('Recebimento de mercadorias confirmado com sucesso!');
            onClose();
        } catch (error: unknown) {
            console.error('Erro ao finalizar recebimento:', error);
            toast.error('Não foi possível concluir o recebimento.');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Atualizar item da NF-e individualmente ─────────────────────────────────
    const handleInboundItemChange = (itemNumber: number, update: Partial<InboundReceiptItem>) => {
        setInboundItems(current => {
            if (!current) return current;
            const updated = current.map(item =>
                item.itemNumber === itemNumber ? { ...item, ...update } : item
            );
            setItems(convertInboundToPurchaseItems(updated));
            return updated;
        });
    };

    // ── Retorno público do hook ────────────────────────────────────────────────
    return {
        suppliers,
        supplierId,
        setSupplierId,
        items,
        setItems,
        inboundItems,
        setInboundItems,
        ipiPercent,
        freightPercent,
        nonFiscalDiscountMode,
        setNonFiscalDiscountMode,
        nonFiscalDiscountValue,
        setNonFiscalDiscountValue,
        nonFiscalFreightMode,
        setNonFiscalFreightMode,
        nonFiscalFreightValue,
        setNonFiscalFreightValue,
        nonFiscalOtherExpensesMode,
        setNonFiscalOtherExpensesMode,
        nonFiscalOtherExpensesValue,
        setNonFiscalOtherExpensesValue,
        receiptDate,
        setReceiptDate,
        invoiceNumber,
        invoiceDate,
        fiscalKey,
        setFiscalKey,
        attachments,
        setAttachments,
        observations,
        setObservations,
        isSaving,
        isAttachingInboundDocument,
        isDraftSaved,
        receiptIndex,
        processedItems,
        totalValue,
        baseValueForRateio,
        handleFinalize,
        handleInboundItemChange,
    };
}
