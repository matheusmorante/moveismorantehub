import type Person from '@/pages/types/person.type';
import type Product from '@/pages/types/product.type';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import {
  normalizeInvoiceItem,
  ensureInboundInvoiceAttachment,
} from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { findInboundSupplierItemMappings } from '@/pages/utils/inboundNfe/services/inboundSupplierItemMappingsService';
import { getProductsByIds } from '@/pages/utils/productService/productService';
import {
  calculateAdditionalCosts,
  getLegacyCompatibleCosts,
} from '@/pages/utils/inboundNfe/additionalCosts';
import { fetchPersons } from '@/pages/utils/personService';
import type { InboundReceiptItem } from '../components/InboundNfeItemsSection';

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
    val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  let availableSuppliers = suppliers;
  if ((!availableSuppliers || availableSuppliers.length === 0) && !invoice.supplierId) {
    try {
      availableSuppliers = await fetchPersons('suppliers');
    } catch {
      availableSuppliers = [];
    }
  }

  // Identificar fornecedor pelo CNPJ ou nome
  let matchedSupplier = availableSuppliers.find((p) =>
    p.cpfCnpj && invoice.emitterCnpj
      ? cleanCnpj(p.cpfCnpj) === cleanCnpj(invoice.emitterCnpj)
      : false
  );
  if (!matchedSupplier && invoice.emitterName) {
    const emitterTerm = normalize(invoice.emitterName);
    matchedSupplier = availableSuppliers.find((p) => {
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
  const rawIpiPercent =
    invoice.totalIpi > 0 ? Number(((invoice.totalIpi / baseSubtotal) * 100).toFixed(2)) : 0;
  const rawFreightPercent =
    invoice.totalFreight > 0 ? Number(((invoice.totalFreight / baseSubtotal) * 100).toFixed(2)) : 0;

  const fiscalOtherExpenses =
    (invoice.totalOtherExpenses || 0) + (invoice.totalInsurance || 0) + (invoice.totalIcmsSt || 0);

  // Garantir o anexo da NF-e (S3 / Storage)
  let attachmentUrl: string | null;
  onAttachmentProgress?.(true);
  try {
    attachmentUrl = await ensureInboundInvoiceAttachment(invoice);
  } finally {
    onAttachmentProgress?.(false);
  }

  // Normalizar e enriquecer os itens com vínculos automáticos
  let rawNormalizedItems = (invoice.items || []).map((item, idx) =>
    normalizeInvoiceItem(item, idx)
  );
  // Saved per-invoice snapshots are historical. Current receiveable links come only from
  // the supplier+full-code mapping, so a removed global link cannot reappear from old JSON.
  rawNormalizedItems = rawNormalizedItems.map((item) => ({
    ...item,
    matchedProductId: undefined,
    matchedVariationId: undefined,
    productErpName: undefined,
    linkedProductCode: undefined,
    sellingPrice: undefined,
    linkMode: undefined,
    compositionLinks: [],
    composition: [],
    inheritedSupplierLink: undefined,
  }));
  const globalMappings = resolvedSupplierId
    ? await findInboundSupplierItemMappings(
        resolvedSupplierId,
        rawNormalizedItems.map((item) => item.productCode)
      )
    : new Map();
  rawNormalizedItems = rawNormalizedItems.map((item) => {
    const mapping = globalMappings.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
    if (!mapping) return item;
    if (mapping.link_mode === 'single') {
      return {
        ...item,
        matchedProductId: mapping.product_id || undefined,
        matchedVariationId: mapping.variation_id || undefined,
        productErpName: mapping.product_name || undefined,
        linkedProductCode: mapping.product_sku || undefined,
        sellingPrice: Number(mapping.selling_price || 0),
        linkMode: 'single' as const,
        compositionLinks: [],
        composition: [],
        inheritedSupplierLink: true,
      };
    }
    if (mapping.link_mode === 'composition') {
      const composition = (mapping.components || []).map((component: any, index: number) => ({
        id: String(component.id ?? `${item.productCode}:${index + 1}`),
        productId: String(component.productId ?? component.product_id ?? ''),
        variationId: component.variationId ?? component.variation_id ?? undefined,
        productName: String(component.productErpName ?? component.product_erp_name ?? 'Produto'),
        quantity: Number(component.quantityMultiplier ?? component.quantity_multiplier ?? 1),
        referenceSalePrice: Number(component.sellingPrice ?? component.selling_price ?? 0),
      }));
      const compositionLinks = composition.map((component) => ({
        id: component.id,
        productId: component.productId,
        variationId: component.variationId,
        productErpName: component.productName,
        linkedProductCode: '',
        sellingPrice: component.referenceSalePrice,
        quantityMultiplier: component.quantity,
        apportionedCost: undefined,
      }));
      return {
        ...item,
        matchedProductId: undefined,
        matchedVariationId: undefined,
        productErpName: undefined,
        linkedProductCode: undefined,
        sellingPrice: undefined,
        linkMode: 'composition' as const,
        compositionLinks,
        composition,
        inheritedSupplierLink: true,
      };
    }
    return {
      ...item,
      matchedProductId: undefined,
      matchedVariationId: undefined,
      productErpName: undefined,
      linkedProductCode: undefined,
      sellingPrice: undefined,
      linkMode: mapping.link_mode === 'not_applicable'
        ? 'not_applicable' as const
        : mapping.link_mode === 'unlinked'
          ? 'unlinked' as const
          : undefined,
      compositionLinks: [],
      composition: [],
      inheritedSupplierLink: true,
    };
  });
  const applicableItems = rawNormalizedItems.filter((item) => item.linkMode !== 'not_applicable');

  let references = new Map<string, { productId: string; productVariationId?: string }>();
  try {
    references = new Map(
      applicableItems.flatMap((item) => {
        const mapping = globalMappings.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
        return mapping?.link_mode === 'single' && mapping.product_id
          ? [[item.productCode.trim().toLocaleUpperCase('pt-BR'), {
              productId: mapping.product_id,
              productVariationId: mapping.variation_id || undefined,
            }] as const]
          : [];
      })
    );
  } catch (error: unknown) {
    console.warn('Não foi possível consultar referências de produtos do fornecedor.', error);
  }

  let products: Product[] = [];
  try {
    products = await getProductsByIds([
      ...new Set([...references.values()].map((ref) => ref.productId)),
    ]);
  } catch (error: unknown) {
    console.warn('Não foi possível carregar os produtos vinculados à NF-e.', error);
  }

  const additionalCostsCalc = calculateAdditionalCosts(
    rawNormalizedItems,
    getLegacyCompatibleCosts(invoice.additionalCosts || [], invoice.additionalFreight)
  );
  const allocationByItem = new Map(additionalCostsCalc.allocations.map((a) => [a.itemNumber, a]));
  const hasItemSpecificIpi = rawNormalizedItems.some(
    (i) => (i.ipiValue || 0) > 0 || (i.ipiPercent || 0) > 0
  );

  const linkedItems: InboundReceiptItem[] = rawNormalizedItems.map((item) => {
    const notApplicable = item.linkMode === 'not_applicable';
    const reference = item.productCode
      ? references.get(item.productCode.trim().toLocaleUpperCase('pt-BR'))
      : undefined;
    const product = products.find((p) => p.id === reference?.productId);
    const variation = product?.variations?.find((v) => v.id === reference?.productVariationId);
    const allocation = allocationByItem.get(item.itemNumber);

    return {
      ...item,
      expectedQuantity: item.quantity,
      allocatedAdditionalCosts:
        allocation?.allocatedAdditionalCosts ?? item.allocatedAdditionalCosts ?? 0,
      totalAdditionalCosts: allocation?.allocatedAdditionalCosts ?? item.totalAdditionalCosts ?? 0,
      acquisitionCost: allocation?.acquisitionCost ?? item.acquisitionCost ?? item.totalCost,
      ipiValue: hasItemSpecificIpi ? item.ipiValue : undefined,
      ipiPercent: hasItemSpecificIpi ? item.ipiPercent : undefined,
      matchedProductId: notApplicable ? undefined : item.matchedProductId,
      matchedVariationId: notApplicable ? undefined : item.matchedVariationId,
      productErpName: notApplicable ? undefined : item.productErpName,
      sellingPrice: notApplicable ? undefined : item.sellingPrice,
      compositionLinks: notApplicable ? [] : item.compositionLinks,
      composition: notApplicable ? [] : item.composition,
      linkedProductId: notApplicable ? undefined : reference?.productId || item.matchedProductId,
      linkedVariationId: notApplicable ? undefined : reference?.productVariationId || item.matchedVariationId,
      linkedProductCode: notApplicable
        ? undefined
        : variation?.sku || product?.code || item.linkedProductCode || '',
      linkedProductName: notApplicable
        ? undefined
        : variation?.name || product?.name || product?.title || item.productErpName || '',
      linkStatus: notApplicable
        ? 'not_applicable'
        : reference || item.matchedProductId || item.compositionLinks?.some((link) => link.productId)
          ? 'automatic'
          : 'pending',
    } as InboundReceiptItem;
  });

  return {
    resolvedSupplierId,
    fiscalKey: invoice.nfeKey,
    invoiceNumber: invoice.nfeNumber ? String(invoice.nfeNumber) : '',
    receiptDate: invoice.issuedAt
      ? invoice.issuedAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
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
