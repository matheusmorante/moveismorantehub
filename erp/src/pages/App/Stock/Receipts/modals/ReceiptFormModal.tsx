import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import { PurchaseItemsSection } from '@/components/PurchaseItemsSection';
import type Person from '@/pages/types/person.type';
import type { PurchaseItem } from '@/pages/types/purchase.type';
import { formatCurrency } from '@/pages/utils/formatters';
import { subscribeToPeople } from '@/pages/utils/personService';
import { type GoodsReceipt, finalizeGoodsReceipt, saveGoodsReceiptDraft } from '@/pages/utils/goodsReceiptService';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { markInvoiceAsReceived, normalizeInvoiceItem } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import type Purchase from '@/pages/types/purchase.type';
import type Product from '@/pages/types/product.type';
import ReceiptFiscalDocumentsSection from '../ReceiptFiscalDocumentsSection';
import ReturnObservationTags from '@/pages/App/SalesOrder/OrderActions/ReturnObservationTags';
import InboundNfeItemsSection, { type InboundReceiptItem } from '../InboundNfeItemsSection';
import { findProductSupplierCodes, saveProductSupplierCode } from '@/pages/utils/productSupplierCodesService';
import { getProductsByIds } from '@/pages/utils/productService';
import { calculateAdditionalCosts, getLegacyCompatibleCosts } from '@/pages/utils/inboundNfe/additionalCosts';
import { calculateReceiptItems } from '@/pages/utils/goodsReceiptCostCalculation';
import { formatGoodsReceiptCode } from '@/pages/utils/goodsReceiptCode';
import { InboundInvoiceFiscalReview } from '@/pages/App/Stock/InboundInvoices/components/InboundInvoiceFiscalReview';

interface ReceiptFormModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly initialReceipt?: GoodsReceipt | null;
    readonly copyReceipt?: boolean;
    readonly initialInboundInvoice?: InboundInvoice | null;
    readonly initialPurchase?: Purchase | null;
}

export function ReceiptFormModal({
    isOpen,
    onClose,
    initialReceipt,
    copyReceipt = false,
    initialInboundInvoice,
    initialPurchase
}: ReceiptFormModalProps) {
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
    const [fiscalKey, setFiscalKey] = useState('');
    const [attachments, setAttachments] = useState<string[]>([]);
    const [observations, setObservations] = useState<string[]>([]);
    const [isDraftSaved, setIsDraftSaved] = useState(false);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fechamento com tecla Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

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

    // Base de cálculo para conversão dinâmica entre % e R$ (valor da NF ou dos produtos)
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

    // Auto-save rascunho de forma contínua quando fornecedor e pelo menos 1 item estão selecionados
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

    if (!isOpen) return null;
    const supplier = suppliers.find((person) => person.id === supplierId);

    const handleFinalize = async () => {
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
        if (inboundItems?.some((item) => !item.linkedProductId)) {
            toast.error('Vincule todos os itens da NF-e a um produto do ERP antes de confirmar.');
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

        // Dados Fiscais Oficiais da NF
        setFiscalIpi(invoice.totalIpi || 0);
        setFiscalFreight(invoice.totalFreight || 0);
        setFiscalDiscount(invoice.totalDiscount || 0);
        const calcFiscalOther = (invoice.totalOtherExpenses || 0) + (invoice.totalInsurance || 0) + (invoice.totalIcmsSt || 0);
        setFiscalOtherExpenses(calcFiscalOther);

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
        const convertedItems: PurchaseItem[] = linkedItems.map((item) => {
            const quantity = Math.max(1, Number(item.quantity || item.expectedQuantity || 1));
            const itemBaseUnit = Number(item.unitCost || 0);
            const itemBaseTotal = item.totalCost ? Number(item.totalCost) : Number((itemBaseUnit * quantity).toFixed(2));
            const unitFreightFiscal = item.freightValue ? Number((item.freightValue / quantity).toFixed(4)) : 0;
            const unitOtherFiscal = Number((((item.insuranceValue || 0) + (item.otherExpensesValue || 0) + (item.icmsStValue || 0)) / quantity).toFixed(4));
            const unitDiscountFiscal = item.discountValue ? Number((item.discountValue / quantity).toFixed(4)) : 0;
            
            const rawDescription = (item as Record<string, unknown>).descricao || (item as Record<string, unknown>).xProd;
            const itemDesc = item.linkedProductName || item.productErpName || item.productDescription || (typeof rawDescription === 'string' ? rawDescription : 'Produto sem descrição');

            return {
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
            };
        });

        setInboundItems(null);
        setItems(convertedItems);
        toast.success(`NF-e #${invoice.nfeNumber} carregada com ${convertedItems.length} item(ns)!`);
    };

    const handleInboundItemChange = (itemNumber: number, update: Partial<InboundReceiptItem>) => {
        setInboundItems((current) => {
            if (!current) return current;
            const updated = current.map((item) => item.itemNumber === itemNumber ? { ...item, ...update } : item);
            setItems(updated.map((item) => {
                const quantity = Math.max(1, item.expectedQuantity || item.quantity);
                const itemBaseUnit = item.unitCost;
                const itemBaseTotal = Number((itemBaseUnit * item.quantity).toFixed(2));
                const unitFreightFiscal = item.freightValue ? Number((item.freightValue / quantity).toFixed(4)) : 0;
                const unitOtherFiscal = Number((((item.insuranceValue || 0) + (item.otherExpensesValue || 0) + (item.icmsStValue || 0)) / quantity).toFixed(4));
                const unitDiscountFiscal = item.discountValue ? Number((item.discountValue / quantity).toFixed(4)) : 0;

                return {
                    productId: item.linkedProductId || '',
                    variationId: item.linkedVariationId || '',
                    description: item.productDescription,
                    quantity: item.quantity,
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
                };
            }));
            return updated;
        });
    };

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

    const content = (
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-0 xl:p-6 bg-slate-900/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-form-modal-title"
        >
            <button
                type="button"
                aria-label="Fechar modal"
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-default"
                onClick={onClose}
            />
            <section className="relative flex flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 h-full w-full xl:h-auto xl:max-h-[90vh] xl:max-w-7xl xl:rounded-[2.5rem]">
                <header className="flex shrink-0 items-center justify-between bg-emerald-600 px-5 py-3 text-white xl:px-8 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                            <i className={`bi ${fiscalKey || initialInboundInvoice ? 'bi-file-earmark-text-fill' : 'bi-box-seam'} text-lg`} aria-hidden="true" />
                        </div>
                        <div>
                            <h2 id="receipt-form-modal-title" className="text-base sm:text-lg font-black uppercase tracking-wide">
                                {fiscalKey || initialInboundInvoice ? 'Registrar Recebimento com NF-e' : initialPurchase ? 'Registrar Recebimento com Pedido de Compra' : 'Registrar Recebimento sem Nota Fiscal'}
                            </h2>
                            {fiscalKey || initialInboundInvoice ? (
                                <p className="text-xs text-emerald-100 font-normal">
                                    NF-e #{invoiceNumber || initialInboundInvoice?.nfeNumber || '—'} · {supplier?.fullName || initialInboundInvoice?.emitterName || 'Fornecedor'}
                                </p>
                            ) : (
                                <p className="text-xs text-emerald-100 font-normal">
                                    Entrada de mercadorias no estoque e conciliação de custos
                                </p>
                            )}
                        </div>
                        {(receiptIndex || (!copyReceipt && initialReceipt?.receiptIndex)) && (
                            <span className="font-mono text-xs font-black bg-emerald-800/60 border border-emerald-400/40 px-2.5 py-0.5 rounded-lg text-emerald-100">
                                #{formatGoodsReceiptCode({ receiptIndex: receiptIndex || (!copyReceipt ? initialReceipt?.receiptIndex : undefined) })}
                            </span>
                        )}
                        {isDraftSaved && (
                            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white border border-white/30 animate-pulse">
                                <i className="bi bi-cloud-check-fill text-emerald-300" aria-hidden="true" /> Rascunho salvo
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 hover:bg-white/10 transition-colors"
                        title="Fechar"
                        aria-label="Fechar"
                    >
                        <i className="bi bi-x-lg text-lg" aria-hidden="true" />
                    </button>
                </header>
                <div className="flex-1 space-y-6 overflow-y-auto p-5 xl:p-8 max-w-7xl mx-auto w-full">
                    {/* Resumo Fiscal da NF-e */}
                    {initialInboundInvoice && (
                        <InboundInvoiceFiscalReview invoice={initialInboundInvoice} />
                    )}

                    {/* Bloco de Dados da NF e Fornecedor */}
                    {initialInboundInvoice ? (
                        <section className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                                        Dados da NF-e e Fornecedor
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Emitente: <b>{initialInboundInvoice.emitterName || 'Emitente não identificado'}</b> · CNPJ: {initialInboundInvoice.emitterCnpj || '—'}
                                    </p>
                                </div>
                                {initialInboundInvoice.nfeKey && (
                                    <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        Chave: {initialInboundInvoice.nfeKey.replace(/(\d{4})/g, '$1 ').trim()}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3 pt-1">
                                <div className="md:col-span-2">
                                    <SupplierAutocomplete
                                        suppliers={suppliers}
                                        selectedSupplierId={supplierId}
                                        onSelect={(id) => setSupplierId(id)}
                                        disabled={true}
                                        disabledReason="O fornecedor foi vinculado automaticamente a partir dos dados do emitente da NF-e."
                                        customLabel="Fornecedor Vinculado no ERP"
                                        placeholder="Fornecedor do ERP..."
                                    />
                                </div>
                                <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Data do recebimento
                                    <input
                                        type="date"
                                        value={receiptDate}
                                        onChange={(event) => setReceiptDate(event.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
                                    />
                                </label>
                            </div>
                        </section>
                    ) : (
                        /* Barra Principal Normal: Fornecedor e Data */
                        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                            <div className="md:col-span-2">
                                <SupplierAutocomplete
                                    suppliers={suppliers}
                                    selectedSupplierId={supplierId}
                                    onSelect={(id) => setSupplierId(id)}
                                    disabled={Boolean(initialPurchase) || (Boolean(initialReceipt) && !copyReceipt) || items.length > 0}
                                    disabledReason={
                                        (initialPurchase || (initialReceipt && !copyReceipt))
                                            ? 'O fornecedor foi pré-definido pelo documento/pedido de origem.'
                                            : items.length > 0
                                            ? 'Para alterar o fornecedor, remova os itens adicionados e selecione o fornecedor correto.'
                                            : undefined
                                    }
                                    customLabel="Fornecedor"
                                    placeholder="Digite 2 ou mais letras para buscar fornecedor..."
                                    minChars={2}
                                />
                            </div>
                            <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Data do recebimento
                                <input
                                    type="date"
                                    value={receiptDate}
                                    onChange={(event) => setReceiptDate(event.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
                                />
                            </label>
                        </div>
                    )}

                    {/* Parâmetros do Recebimento (Desconto, Frete e Outras Despesas com rateio dinâmico) */}
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <i className="bi bi-calculator-fill text-emerald-600 text-sm" aria-hidden="true" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                                    Despesas e Descontos do Recebimento
                                </h3>
                            </div>
                            <span className="group relative inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 cursor-help">
                                <i className="bi bi-info-circle text-slate-500 text-xs" aria-hidden="true" />
                                Rateio Operacional
                                <span className="absolute right-0 top-full mt-1.5 hidden w-72 rounded-xl bg-slate-900 p-2.5 text-[11px] font-medium normal-case tracking-normal text-white shadow-xl group-hover:block z-50 border border-slate-800">
                                    Estes valores são operacionais e serão rateados proporcionalmente entre os itens, ajustando o custo unitário final e o estoque.
                                </span>
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <ToggleValueField
                                label="Desconto"
                                mode={nonFiscalDiscountMode}
                                value={nonFiscalDiscountValue}
                                baseTotal={baseValueForRateio}
                                onModeChange={setNonFiscalDiscountMode}
                                onValueChange={setNonFiscalDiscountValue}
                                color="amber"
                            />
                            <ToggleValueField
                                label="Frete"
                                mode={nonFiscalFreightMode}
                                value={nonFiscalFreightValue}
                                baseTotal={baseValueForRateio}
                                onModeChange={setNonFiscalFreightMode}
                                onValueChange={setNonFiscalFreightValue}
                                color="blue"
                            />
                            <ToggleValueField
                                label="Outras Despesas"
                                mode={nonFiscalOtherExpensesMode}
                                value={nonFiscalOtherExpensesValue}
                                baseTotal={baseValueForRateio}
                                onModeChange={setNonFiscalOtherExpensesMode}
                                onValueChange={setNonFiscalOtherExpensesValue}
                                color="slate"
                            />
                        </div>
                    </div>

                    <ReceiptFiscalDocumentsSection
                        attachments={attachments}
                        fiscalKey={fiscalKey}
                        onAttachmentsChange={setAttachments}
                        onFiscalKeyChange={setFiscalKey}
                    />
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                        <ReturnObservationTags
                            label="Observações do Recebimento"
                            observations={observations}
                            onChange={setObservations}
                        />
                    </div>
                    {inboundItems ? (
                        <InboundNfeItemsSection
                            items={inboundItems}
                            processedItems={processedItems}
                            supplierId={supplierId}
                            onChange={handleInboundItemChange}
                            formatCurrency={formatCurrency}
                        />
                    ) : (
                        <PurchaseItemsSection
                            items={processedItems}
                            onAddItem={(item) => setItems((current) => [...current, item])}
                            onRemoveItem={(index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                            onUpdateItem={(index, updatedItem) => setItems((current) => current.map((item, i) => (i === index ? updatedItem : item)))}
                            ipiPercent={ipiPercent}
                            freightPercent={freightPercent}
                            formatCurrency={formatCurrency}
                            supplierId={supplierId}
                            onSupplierAutoSelect={setSupplierId}
                            isReceiptMode={true}
                        />
                    )}
                </div>
                <footer className="flex shrink-0 flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-955/40 sm:flex-row xl:px-8 shadow-inner">
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-100">
                            Total final: <span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">{formatCurrency(totalValue)}</span>
                        </p>
                        {inboundItems && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-200/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg">
                                {inboundItems.filter((i) => Boolean(i.linkedProductId)).length} de {inboundItems.length} itens vinculados
                            </span>
                        )}
                    </div>
                    <div className="flex w-full gap-3 sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-initial rounded-2xl px-5 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleFinalize}
                            className="flex-1 sm:flex-initial rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-black uppercase text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md"
                        >
                            {isSaving ? 'Confirmando...' : 'Confirmar recebimento'}
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );

    return typeof document === 'undefined' ? content : createPortal(content, document.body);
}

interface ToggleValueFieldProps {
    readonly label: string;
    readonly mode: 'percent' | 'fixed';
    readonly value: number;
    readonly baseTotal?: number;
    readonly onModeChange: (mode: 'percent' | 'fixed') => void;
    readonly onValueChange: (value: number) => void;
    readonly color?: 'amber' | 'blue' | 'slate' | 'emerald';
    readonly isWarning?: boolean;
    readonly warningTooltip?: string;
}

function ToggleValueField({
    label,
    mode,
    value,
    baseTotal = 0,
    onModeChange,
    onValueChange,
    color = 'amber',
    isWarning,
    warningTooltip,
}: ToggleValueFieldProps) {
    const isPercent = mode === 'percent';
    const activeBtnClass = color === 'amber'
        ? 'bg-amber-600 text-white shadow-sm'
        : color === 'blue'
        ? 'bg-blue-600 text-white shadow-sm'
        : color === 'emerald'
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'bg-slate-700 text-white shadow-sm';

    const handleSwitchMode = (newMode: 'percent' | 'fixed') => {
        if (newMode === mode) return;

        // Se houver valor base positivo e valor preenchido, converte dinamicamente
        if (baseTotal > 0 && value > 0) {
            if (newMode === 'fixed' && mode === 'percent') {
                const convertedToReais = Number(((baseTotal * value) / 100).toFixed(2));
                onValueChange(Number.isNaN(convertedToReais) ? 0 : convertedToReais);
            } else if (newMode === 'percent' && mode === 'fixed') {
                const convertedToPercent = Number(((value / baseTotal) * 100).toFixed(2));
                onValueChange(Number.isNaN(convertedToPercent) ? 0 : convertedToPercent);
            }
        }
        onModeChange(newMode);
    };

    return (
        <div className={`p-3 bg-white dark:bg-slate-900 rounded-xl border flex flex-col justify-between gap-1.5 shadow-sm transition-colors ${isWarning ? 'border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-400/20' : 'border-slate-200/80 dark:border-slate-800'}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="group relative flex items-center gap-1.5 min-w-0">
                    <span className={`text-[9px] font-black uppercase tracking-wider truncate ${isWarning ? 'text-amber-700 dark:text-amber-400 font-black' : 'text-slate-400'}`} title={label}>
                        {label}
                    </span>
                    {isWarning && (
                        <>
                            <i className="bi bi-info-circle-fill text-[11px] text-amber-500 cursor-help" aria-hidden="true" />
                            {warningTooltip && (
                                <span className="absolute left-0 bottom-full mb-1.5 hidden w-64 rounded-xl bg-slate-900 p-2 text-[10px] font-medium normal-case tracking-normal text-white shadow-xl group-hover:block z-50 border border-slate-800">
                                    {warningTooltip}
                                </span>
                            )}
                        </>
                    )}
                </div>
                <div className="flex items-center rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0">
                    <button
                        type="button"
                        onClick={() => handleSwitchMode('percent')}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-all ${isPercent ? activeBtnClass : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        title="Calcular em porcentagem (%)"
                        aria-pressed={isPercent}
                    >
                        %
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSwitchMode('fixed')}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-all ${!isPercent ? activeBtnClass : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        title="Calcular em reais (R$)"
                        aria-pressed={!isPercent}
                    >
                        R$
                    </button>
                </div>
            </div>

            <div className="relative flex items-center">
                <input
                    type="number"
                    min="0"
                    step={isPercent ? '0.1' : '0.01'}
                    value={value || ''}
                    onChange={(e) => {
                        const parsed = Number(e.target.value);
                        onValueChange(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
                    }}
                    placeholder={isPercent ? '0 %' : '0,00'}
                    className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none py-1.5 pl-1 pr-8 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
                />
                <span className="absolute right-2 text-[11px] font-black text-slate-400 pointer-events-none">
                    {isPercent ? '%' : 'R$'}
                </span>
            </div>
        </div>
    );
}

export default ReceiptFormModal;
