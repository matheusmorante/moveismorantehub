import type Person from '@/pages/types/person.type';
import type Product from '@/pages/types/product.type';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { normalizeInvoiceItem, ensureInboundInvoiceAttachment } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { findProductSupplierCodes } from '@/pages/utils/productSupplierCodesService';
import { getProductsByIds } from '@/pages/utils/productService';
import { calculateAdditionalCosts, getLegacyCompatibleCosts } from '@/pages/utils/inboundNfe/additionalCosts';
import type { InboundReceiptItem } from '../InboundNfeItemsSection';

export type InboundInvoiceAdaptedState = {
    resolvedSupplierId: string;
    fiscalKey: string;
    invoiceNumber: string;
    receiptDate: string;
    invoiceDate: string;
    ipiPercent: number;
    freightPercent: number;
    fiscalIpi: number;
    fiscalFreight: number;
    fiscalDiscount: number;
    fiscalOtherExpenses: number;
    attachmentUrl: string | null;
    linkedItems: InboundReceiptItem[];
};

/**
 * Adapter puro de orquestração assíncrona: recebe uma InboundInvoice e retorna
 * o estado pré-calculado para ser aplicado nos setEstados do useReceiptForm.
 * Não depende de hooks React – apenas de services e utilitários de domínio.
 */
export async function adaptInboundInvoiceToReceiptState(
    invoice: InboundInvoice,
    suppliers: Person[],
    onAttachmentProgress?: (loading: boolean) => void
): Promise<InboundInvoiceAdaptedState> {
    const cleanCnpj = (cnpj = '') => cnpj.replace(/\D/g, '');
    const normalize = (val = '') =>
        val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Identificar fornecedor pelo CNPJ ou nome
    let matchedSupplier = suppliers.find(p =>
        p.cpfCnpj && invoice.emitterCnpj
            ? cleanCnpj(p.cpfCnpj) === cleanCnpj(invoice.emitterCnpj)
            : false
    );
    if (!matchedSupplier && invoice.emitterName) {
        const emitterTerm = normalize(invoice.emitterName);
        matchedSupplier = suppliers.find(p => {
            const name = normalize(p.fullName || '');
            const trade = normalize(p.tradeName || '');
            return (
                name.includes(emitterTerm) ||
                emitterTerm.includes(name) ||
                (trade && (trade.includes(emitterTerm) || emitterTerm.includes(trade)))
            );
        });
    }

    const resolvedSupplierId = invoice.supplierId || matchedSupplier?.id || '';

    // Calcular percentuais IPI e Frete para o formulário
    const baseSubtotal = invoice.totalProducts > 0 ? invoice.totalProducts : 1;
    const rawIpiPercent = invoice.totalIpi > 0 ? Number(((invoice.totalIpi / baseSubtotal) * 100).toFixed(2)) : 0;
    const rawFreightPercent = invoice.totalFreight > 0 ? Number(((invoice.totalFreight / baseSubtotal) * 100).toFixed(2)) : 0;

    const fiscalOtherExpenses =
        (invoice.totalOtherExpenses || 0) +
        (invoice.totalInsurance || 0) +
        (invoice.totalIcmsSt || 0);

    // Garantir o anexo da NF-e (S3 / Storage)
    let attachmentUrl: string | null;
    onAttachmentProgress?.(true);
    try {
        attachmentUrl = await ensureInboundInvoiceAttachment(invoice);
    } finally {
        onAttachmentProgress?.(false);
    }

    // Normalizar e enriquecer os itens com vínculos automáticos
    const rawNormalizedItems = (invoice.items || []).map((item, idx) => normalizeInvoiceItem(item, idx));

    let references = new Map<string, { productId: string; productVariationId?: string }>();
    try {
        references = resolvedSupplierId
            ? await findProductSupplierCodes(resolvedSupplierId, rawNormalizedItems.map(i => i.productCode))
            : new Map();
    } catch (error: unknown) {
        console.warn('Não foi possível consultar referências de produtos do fornecedor.', error);
    }

    let products: Product[] = [];
    try {
        products = await getProductsByIds([
            ...new Set([...references.values()].map(ref => ref.productId)),
        ]);
    } catch (error: unknown) {
        console.warn('Não foi possível carregar os produtos vinculados à NF-e.', error);
    }

    const additionalCostsCalc = calculateAdditionalCosts(
        rawNormalizedItems,
        getLegacyCompatibleCosts(invoice.additionalCosts || [], invoice.additionalFreight)
    );
    const allocationByItem = new Map(
        additionalCostsCalc.allocations.map(a => [a.itemNumber, a])
    );
    const hasItemSpecificIpi = rawNormalizedItems.some(i => (i.ipiValue || 0) > 0 || (i.ipiPercent || 0) > 0);

    const linkedItems: InboundReceiptItem[] = rawNormalizedItems.map(item => {
        const reference = item.productCode
            ? references.get(item.productCode.trim().toLocaleUpperCase('pt-BR'))
            : undefined;
        const product = products.find(p => p.id === reference?.productId);
        const variation = product?.variations?.find(v => v.id === reference?.productVariationId);
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
            linkStatus: (reference || item.matchedProductId) ? 'automatic' : 'pending',
        } as InboundReceiptItem;
    });

    return {
        resolvedSupplierId,
        fiscalKey: invoice.nfeKey,
        invoiceNumber: invoice.nfeNumber ? String(invoice.nfeNumber) : '',
        receiptDate: invoice.issuedAt ? invoice.issuedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        invoiceDate: invoice.issuedAt ? invoice.issuedAt.slice(0, 10) : '',
        ipiPercent: Number.isNaN(rawIpiPercent) ? 0 : rawIpiPercent,
        freightPercent: Number.isNaN(rawFreightPercent) ? 0 : rawFreightPercent,
        fiscalIpi: invoice.totalIpi || 0,
        fiscalFreight: invoice.totalFreight || 0,
        fiscalDiscount: invoice.totalDiscount || 0,
        fiscalOtherExpenses,
        attachmentUrl,
        linkedItems,
    };
}
