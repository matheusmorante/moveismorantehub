import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type Person from '@/pages/types/person.type';
import type { PurchaseItem } from '@/pages/types/purchase.type';
import { subscribeToPeople } from '@/pages/utils/personService';
import { type GoodsReceipt, finalizeGoodsReceipt, saveGoodsReceiptDraft } from '@/pages/utils/goodsReceiptService';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { markInvoiceAsReceived, normalizeInvoiceItem, ensureInboundInvoiceAttachment } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import type Purchase from '@/pages/types/purchase.type';
import type Product from '@/pages/types/product.type';
import { type InboundReceiptItem } from '../InboundNfeItemsSection';
import { findProductSupplierCodes, saveProductSupplierCode } from '@/pages/utils/productSupplierCodesService';
import { getProductsByIds } from '@/pages/utils/productService';
import { calculateAdditionalCosts, getLegacyCompatibleCosts } from '@/pages/utils/inboundNfe/additionalCosts';
import { calculateReceiptItems } from '@/pages/utils/goodsReceiptCostCalculation';

export interface UseReceiptFormParams {
    isOpen: boolean;
    onClose: () => void;
    initialReceipt?: GoodsReceipt | null;
    copyReceipt?: boolean;
    initialInboundInvoice?: InboundInvoice | null;
    initialPurchase?: Purchase | null;
}

export function useReceiptForm({
    isOpen,
    onClose,
    initialReceipt,
    copyReceipt = false,
    initialInboundInvoice,
    initialPurchase,
}: UseReceiptFormParams) {
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [draftId, setDraftId] = useState<string>('');
    const [receiptIndex, setReceiptIndex] = useState<number | undefined>(undefined);
    const [sourcePurchaseId, setSourcePurchaseId] = useState<string>('');
    const [supplierId, setSupplierId] = useState<string>('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [inboundItems, setInboundItems] = useState<InboundReceiptItem[] | null>(null);
    const [ipiPercent, setIpiPercent] = useState(0);
    const [freightPercent, setFreightPercent] = useState(0);
    
    // Dados Não Fiscais (com toggle % e R$)
    const [nonFiscalDiscountMode, setNonFiscalDiscountMode] = useState<'percent' | 'fixed'>('percent');
    const [nonFiscalDiscountValue, setNonFiscalDiscountValue] = useState<number>(0);
    const [nonFiscalFreightMode, setNonFiscalFreightMode] = useState<'percent' | 'fixed'>('percent');
    const [nonFiscalFreightValue, setNonFiscalFreightValue] = useState<number>(0);
    const [nonFiscalOtherExpensesMode, setNonFiscalOtherExpensesMode] = useState<'percent' | 'fixed'>('percent');
    const [nonFiscalOtherExpensesValue, setNonFiscalOtherExpensesValue] = useState<number>(0);

    // Dados Fiscais de Referência (extraídos da NF-e)
    const [fiscalIpi, setFiscalIpi] = useState<number>(0);
    const [fiscalFreight, setFiscalFreight] = useState<number>(0);
    const [fiscalDiscount, setFiscalDiscount] = useState<number>(0);
    const [fiscalOtherExpenses, setFiscalOtherExpenses] = useState<number>(0);

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

    const applyPurchase = (purchase: Purchase) => {
        setSupplierId(purchase.supplierId);
        setItems(purchase.items.map((item) => ({
            ...item,
            baseCost: item.baseCost || item.unitCost,
            unitCost: item.baseCost || item.unitCost,
            totalCost: (item.baseCost || item.unitCost) * item.quantity
        })));
        setIpiPercent(purchase.ipiPercent || 0);
        setFreightPercent(purchase.freightPercent || 0);
        toast.info('Pedido carregado. Confira e ajuste os itens recebidos antes de registrar.');
    };

    const applyInboundInvoice = async (invoice: InboundInvoice) => {
        const cleanCnpj = (cnpj = '') => cnpj.replace(/\D/g, '');
        const normalize = (val = '') => val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

        let matchedSupplier = suppliers.find((p) => {
            if (p.cpfCnpj && invoice.emitterCnpj) {
                return cleanCnpj(p.cpfCnpj) === cleanCnpj(invoice.emitterCnpj);
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

        const resolvedSupplierId = invoice.supplierId || matchedSupplier?.id || '';
        if (resolvedSupplierId) setSupplierId(resolvedSupplierId);

        setFiscalKey(invoice.nfeKey);
        if (invoice.nfeNumber) setInvoiceNumber(String(invoice.nfeNumber));
        if (invoice.issuedAt) {
            setReceiptDate(invoice.issuedAt.slice(0, 10));
            setInvoiceDate(invoice.issuedAt.slice(0, 10));
        }

        const baseSubtotal = invoice.totalProducts && invoice.totalProducts > 0 ? invoice.totalProducts : 1;
        const calcIpi = invoice.totalIpi > 0 ? Number(((invoice.totalIpi / baseSubtotal) * 100).toFixed(2)) : 0;
        const calcFreight = invoice.totalFreight > 0 ? Number(((invoice.totalFreight / baseSubtotal) * 100).toFixed(2)) : 0;
        setIpiPercent(Number.isNaN(calcIpi) ? 0 : calcIpi);
        setFreightPercent(Number.isNaN(calcFreight) ? 0 : calcFreight);

        setFiscalIpi(invoice.totalIpi || 0);
        setFiscalFreight(invoice.totalFreight || 0);
        setFiscalDiscount(invoice.totalDiscount || 0);
        const calcFiscalOther = (invoice.totalOtherExpenses || 0) + (invoice.totalInsurance || 0) + (invoice.totalIcmsSt || 0);
        setFiscalOtherExpenses(calcFiscalOther);

        setIsAttachingInboundDocument(true);
        try {
            const attachmentUrl = await ensureInboundInvoiceAttachment(invoice);
            if (attachmentUrl) {
                setAttachments((prev) => (prev.includes(attachmentUrl) ? prev : [...prev, attachmentUrl]));
            }
        } finally {
            setIsAttachingInboundDocument(false);
        }

        const rawNormalizedItems = (invoice.items || []).map((item, idx) => normalizeInvoiceItem(item, idx));

        let references = new Map<string, { productId: string; productVariationId?: string }>();
        try {
            references = resolvedSupplierId ? await findProductSupplierCodes(resolvedSupplierId, rawNormalizedItems.map((item) => item.productCode)) : new Map();
        } catch (error: unknown) {
            console.warn('Não foi possível consultar referências de produtos do fornecedor.', error);
        }
        let products: Product[] = [];
        try {
            products = await getProductsByIds([...new Set([...references.values()].map((reference) => reference.productId))]);
        } catch (error: unknown) {
            console.warn('Não foi possível carregar os produtos vinculados à NF-e.', error);
        }
        const additionalCostsCalculation = calculateAdditionalCosts(
            rawNormalizedItems,
            getLegacyCompatibleCosts(invoice.additionalCosts || [], invoice.additionalFreight),
        );
        const allocationByItem = new Map(additionalCostsCalculation.allocations.map((allocation) => [allocation.itemNumber, allocation]));
        const hasItemSpecificIpi = rawNormalizedItems.some((item) => (item.ipiValue || 0) > 0 || (item.ipiPercent || 0) > 0);
        const linkedItems: InboundReceiptItem[] = rawNormalizedItems.map((item) => {
            const reference = item.productCode ? references.get(item.productCode.trim().toLocaleUpperCase('pt-BR')) : undefined;
            const product = products.find((candidate) => candidate.id === reference?.productId);
            const variation = product?.variations?.find((candidate) => candidate.id === reference?.productVariationId);
            const allocation = allocationByItem.get(item.itemNumber);
            return {
                ...item,
                expectedQuantity: item.quantity,
                allocatedAdditionalCosts: allocation?.allocatedAdditionalCosts ?? item.allocatedAdditionalCosts ?? 0,
                totalAdditionalCosts: allocation?.allocatedAdditionalCosts ?? item.totalAdditionalCosts ?? 0,
                acquisitionCost: allocation?.acquisitionCost ?? item.acquisitionCost ?? item.totalCost,
                ipiValue: hasItemSpecificIpi ? item.ipiValue : undefined,
                ipiPercent: hasItemSpecificIpi ? item.ipiPercent : undefined,
                linkedProductId: reference?.productId || item.matchedProductId,
                linkedVariationId: reference?.productVariationId || item.matchedVariationId,
                linkedProductCode: variation?.sku || product?.code || item.linkedProductCode || '',
                linkedProductName: variation?.name || product?.name || product?.title || item.productErpName || '',
                linkStatus: reference || item.matchedProductId ? 'automatic' : 'pending',
            };
        });
        const convertedItems = convertInboundToPurchaseItems(linkedItems);

        setInboundItems(linkedItems);
        setItems(convertedItems);
        toast.success(`NF-e #${invoice.nfeNumber} carregada com ${convertedItems.length} item(ns)!`);
    };

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
            setReceiptDate(copyReceipt ? new Date().toISOString().slice(0, 10) : (initialReceipt.receivedAt ? initialReceipt.receivedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)));
            setInvoiceNumber(initialReceipt.invoiceNumber || '');
            setInvoiceDate(initialReceipt.invoiceDate || '');
            setFiscalKey(initialReceipt.fiscalKey || '');
            setAttachments(initialReceipt.attachments || []);
            setObservations(initialReceipt.observation ? initialReceipt.observation.split('\n').map((s) => s.trim()).filter(Boolean) : []);
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
        }
        return subscribeToPeople('suppliers', (data) => setSuppliers(data.filter((person) => !person.deleted && person.type === 'suppliers')));
    }, [isOpen, initialReceipt, copyReceipt, initialInboundInvoice, initialPurchase]);

    const processedItems = calculateReceiptItems(items, {
        fallbackIpiPercent: ipiPercent,
        fallbackFreightPercent: freightPercent,
        nonFiscalDiscount: { mode: nonFiscalDiscountMode, value: nonFiscalDiscountValue },
        nonFiscalFreight: { mode: nonFiscalFreightMode, value: nonFiscalFreightValue },
        nonFiscalOtherExpenses: { mode: nonFiscalOtherExpensesMode, value: nonFiscalOtherExpensesValue },
    });
    const totalValue = processedItems.reduce((sum, item) => sum + item.totalCost, 0);

    const baseValueForRateio = useMemo(() => {
        if (initialInboundInvoice?.totalInvoice && initialInboundInvoice.totalInvoice > 0) {
            return initialInboundInvoice.totalInvoice;
        }
        if (initialInboundInvoice?.totalProducts && initialInboundInvoice.totalProducts > 0) {
            return initialInboundInvoice.totalProducts;
        }
        if (inboundItems && inboundItems.length > 0) {
            const sumInbound = inboundItems.reduce((acc, item) => acc + ((item.unitCost || 0) * Math.max(1, item.quantity)), 0);
            if (sumInbound > 0) return sumInbound;
        }
        if (items && items.length > 0) {
            const sumItems = items.reduce((acc, item) => acc + ((item.fiscalBaseCost ?? item.baseCost ?? item.unitCost ?? 0) * Math.max(1, item.quantity)), 0);
            if (sumItems > 0) return sumItems;
        }
        return 0;
    }, [initialInboundInvoice, inboundItems, items]);

    useEffect(() => {
        if (!isOpen) return;
        const hasItems = items.length > 0 || (inboundItems !== null && inboundItems.length > 0);
        if (!supplierId || !hasItems) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                const currentSupplier = suppliers.find((p) => p.id === supplierId);
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

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [isOpen, supplierId, items, inboundItems, draftId, receiptIndex, sourcePurchaseId, ipiPercent, freightPercent, nonFiscalDiscountMode, nonFiscalDiscountValue, nonFiscalFreightMode, nonFiscalFreightValue, nonFiscalOtherExpensesMode, nonFiscalOtherExpensesValue, fiscalIpi, fiscalFreight, fiscalDiscount, fiscalOtherExpenses, receiptDate, invoiceNumber, invoiceDate, fiscalKey, attachments, observations]);

    const handleFinalize = async () => {
        const supplier = suppliers.find((person) => person.id === supplierId);
        if (!supplier) {
            toast.error('Selecione o fornecedor para continuar.');
            return;
        }
        if (!items.length) {
            toast.error('Adicione pelo menos um item para confirmar o recebimento.');
            return;
        }
        if (items.some((item) => !item.productId)) {
            toast.error('Selecione o produto de todos os itens antes de confirmar o recebimento.');
            return;
        }
        if (inboundItems?.some((item) => {
            if (item.linkMode === 'composition') return !item.composition || item.composition.length === 0;
            return !item.linkedProductId;
        })) {
            toast.error('Vincule todos os itens da NF-e a um produto ou composição do ERP antes de confirmar.');
            return;
        }
        if (fiscalKey && fiscalKey.length !== 44) {
            toast.error('A chave de acesso da nota fiscal deve conter exatamente 44 dígitos.');
            return;
        }
        setIsSaving(true);
        try {
            const receiptId = draftId || crypto.randomUUID();
            if (inboundItems) {
                await Promise.all(inboundItems.flatMap((item) => {
                    if (item.linkMode === 'composition' && item.composition?.length) {
                        return item.composition.map(comp => saveProductSupplierCode({
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
            const isCompleteInvoiceReceipt = !inboundItems || inboundItems.every((item) => item.quantity >= (item.expectedQuantity || item.quantity));
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

    const handleInboundItemChange = (itemNumber: number, update: Partial<InboundReceiptItem>) => {
        setInboundItems((current) => {
            if (!current) return current;
            const updated = current.map((item) => item.itemNumber === itemNumber ? { ...item, ...update } : item);
            setItems(convertInboundToPurchaseItems(updated));
            return updated;
        });
    };

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

function convertInboundToPurchaseItems(inboundItems: InboundReceiptItem[]): PurchaseItem[] {
    return inboundItems.flatMap(item => {
        const quantity = Math.max(1, item.expectedQuantity || item.quantity);
        const itemBaseUnit = Number(item.unitCost || 0);
        const itemBaseTotal = item.totalCost ? Number(item.totalCost) : Number((itemBaseUnit * quantity).toFixed(2));
        
        const unitFreightFiscal = item.freightValue ? Number((item.freightValue / quantity).toFixed(4)) : 0;
        const unitOtherFiscal = Number((((item.insuranceValue || 0) + (item.otherExpensesValue || 0) + (item.icmsStValue || 0)) / quantity).toFixed(4));
        const unitDiscountFiscal = item.discountValue ? Number((item.discountValue / quantity).toFixed(4)) : 0;

        if (item.linkMode === 'composition' && item.composition && item.composition.length > 0) {
            const totalReferenceValue = item.composition.reduce((sum, c) => sum + (c.referenceSalePrice * c.quantity), 0);
            
            return item.composition.map((comp, idx) => {
                const compQty = Math.max(1, comp.quantity);
                const weightValue = comp.referenceSalePrice * compQty;
                const weightPercent = totalReferenceValue > 0 ? (weightValue / totalReferenceValue) : 0;
                
                let rateioBaseTotal = 0;
                let rateioFreight = 0;
                let rateioOther = 0;
                let rateioDiscount = 0;
                let rateioIpiValue = 0;
                
                if (idx === item.composition!.length - 1) {
                    const previousBaseTotal = item.composition!.slice(0, -1).reduce((sum, prevC) => sum + Number((itemBaseTotal * (totalReferenceValue > 0 ? ((prevC.referenceSalePrice * Math.max(1, prevC.quantity)) / totalReferenceValue) : 0)).toFixed(2)), 0);
                    rateioBaseTotal = Math.max(0, itemBaseTotal - previousBaseTotal);

                    const previousFreight = item.composition!.slice(0, -1).reduce((sum, prevC) => sum + Number(((item.freightValue || 0) * (totalReferenceValue > 0 ? ((prevC.referenceSalePrice * Math.max(1, prevC.quantity)) / totalReferenceValue) : 0)).toFixed(2)), 0);
                    rateioFreight = Math.max(0, (item.freightValue || 0) - previousFreight);

                    const previousOther = item.composition!.slice(0, -1).reduce((sum, prevC) => sum + Number((((item.insuranceValue || 0) + (item.otherExpensesValue || 0) + (item.icmsStValue || 0)) * (totalReferenceValue > 0 ? ((prevC.referenceSalePrice * Math.max(1, prevC.quantity)) / totalReferenceValue) : 0)).toFixed(2)), 0);
                    rateioOther = Math.max(0, (((item.insuranceValue || 0) + (item.otherExpensesValue || 0) + (item.icmsStValue || 0))) - previousOther);

                    const previousDiscount = item.composition!.slice(0, -1).reduce((sum, prevC) => sum + Number(((item.discountValue || 0) * (totalReferenceValue > 0 ? ((prevC.referenceSalePrice * Math.max(1, prevC.quantity)) / totalReferenceValue) : 0)).toFixed(2)), 0);
                    rateioDiscount = Math.max(0, (item.discountValue || 0) - previousDiscount);

                    if (item.ipiValue) {
                        const previousIpi = item.composition!.slice(0, -1).reduce((sum, prevC) => sum + Number(((item.ipiValue || 0) * (totalReferenceValue > 0 ? ((prevC.referenceSalePrice * Math.max(1, prevC.quantity)) / totalReferenceValue) : 0)).toFixed(2)), 0);
                        rateioIpiValue = Math.max(0, item.ipiValue - previousIpi);
                    }
                } else {
                    rateioBaseTotal = Number((itemBaseTotal * weightPercent).toFixed(2));
                    rateioFreight = Number(((item.freightValue || 0) * weightPercent).toFixed(2));
                    rateioOther = Number((((item.insuranceValue || 0) + (item.otherExpensesValue || 0) + (item.icmsStValue || 0)) * weightPercent).toFixed(2));
                    rateioDiscount = Number(((item.discountValue || 0) * weightPercent).toFixed(2));
                    if (item.ipiValue) rateioIpiValue = Number((item.ipiValue * weightPercent).toFixed(2));
                }

                const compBaseUnit = Number((rateioBaseTotal / compQty).toFixed(4));

                return {
                    productId: comp.productId,
                    variationId: comp.variationId || '',
                    description: comp.productName,
                    quantity: compQty,
                    baseCost: compBaseUnit,
                    unitCost: compBaseUnit,
                    totalCost: rateioBaseTotal,
                    fiscalBaseCost: compBaseUnit,
                    freightValue: rateioFreight > 0 ? rateioFreight : undefined,
                    freightFiscalUnit: Number((rateioFreight / compQty).toFixed(4)),
                    otherExpensesFiscalUnit: Number((rateioOther / compQty).toFixed(4)),
                    discountFiscalUnit: Number((rateioDiscount / compQty).toFixed(4)),
                    ipiValue: item.ipiValue ? rateioIpiValue : undefined,
                    ipiPercent: item.ipiPercent,
                    additionalCostUnit: 0,
                };
            });
        } else {
            const rawDescription = (item as Record<string, unknown>).descricao || (item as Record<string, unknown>).xProd;
            const itemDesc = item.linkedProductName || item.productErpName || item.productDescription || (typeof rawDescription === 'string' ? rawDescription : 'Produto sem descrição');

            return [{
                productId: item.linkedProductId || item.matchedProductId || '',
                variationId: item.linkedVariationId || item.matchedVariationId || '',
                description: itemDesc,
                quantity,
                baseCost: itemBaseUnit,
                unitCost: itemBaseUnit,
                totalCost: itemBaseTotal,
                fiscalBaseCost: itemBaseUnit,
                freightValue: item.freightValue,
                freightFiscalUnit: unitFreightFiscal,
                otherExpensesFiscalUnit: unitOtherFiscal,
                discountFiscalUnit: unitDiscountFiscal,
                ipiValue: item.ipiValue,
                ipiPercent: item.ipiPercent,
                additionalCostUnit: 0,
            }];
        }
    });
}
