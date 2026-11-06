import { hasInboundItemCommercialData } from '../../../../../../shared-utils/inboundInvoiceCompleteness';
import { supplierProvidesStockOrigin } from '../../../../../../shared-utils/productSupplierStockOrigin';
import type { MobilePurchase, MobilePurchaseItem } from '../../purchases/mobilePurchaseService';

export interface MobileReceiptItem extends MobilePurchaseItem {
  [key: string]: unknown;
  expectedQuantity?: number;
  freightFiscalUnit?: number;
  freightNonFiscalUnit?: number;
  freightUnit?: number;
  discountFiscalUnit?: number;
  discountNonFiscalUnit?: number;
  discountUnit?: number;
  otherExpensesFiscalUnit?: number;
  otherExpensesNonFiscalUnit?: number;
  ipiUnit?: number;
}

export interface MobileReceiptRateioOptions {
  discountMode: 'percent' | 'fixed';
  discountValue: number;
  freightMode: 'percent' | 'fixed';
  freightValue: number;
  otherExpensesMode?: 'percent' | 'fixed';
  otherExpensesValue?: number;
}

export interface ReceiptOrigin {
  kind: 'manual' | 'purchase' | 'invoice';
  supplierId?: string;
  supplierName?: string;
  purchaseId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  fiscalKey?: string;
  ipiPercent?: number;
  freightPercent?: number;
  fiscalIpi?: number;
  fiscalFreight?: number;
  fiscalDiscount?: number;
  fiscalOtherExpenses?: number;
  items: MobileReceiptItem[];
}

export const normalizeReceiptDraftItem = (raw: any): MobileReceiptItem => {
  const snapshot = raw?.item_snapshot && typeof raw.item_snapshot === 'object'
    ? raw.item_snapshot
    : {};
  const quantity = Number(raw?.quantity ?? snapshot.quantity ?? 0);
  const baseCost = Number(raw?.base_cost ?? snapshot.baseCost ?? snapshot.unitCost ?? 0);
  const unitCost = Number(raw?.unit_cost ?? snapshot.unitCost ?? baseCost);
  const discountFiscalUnit = raw?.discount_fiscal_unit ?? snapshot.discountFiscalUnit;
  const freightFiscalUnit = raw?.freight_fiscal_unit ?? snapshot.freightFiscalUnit;
  return {
    ...snapshot,
    receiptItemId: raw?.id || snapshot.receiptItemId,
    productId: String(raw?.product_id || snapshot.productId || ''),
    variationId: raw?.variation_id || snapshot.variationId || undefined,
    description: String(raw?.description || snapshot.description || 'Produto'),
    quantity,
    baseCost,
    unitCost,
    totalCost: Number(snapshot.totalCost ?? (quantity * unitCost).toFixed(2)),
    ...(freightFiscalUnit == null ? {} : { freightFiscalUnit: Number(freightFiscalUnit) }),
    freightNonFiscalUnit: Number(raw?.freight_non_fiscal_unit ?? snapshot.freightNonFiscalUnit ?? 0),
    discountUnit: Number(raw?.discount_unit ?? snapshot.discountUnit ?? 0),
    ...(discountFiscalUnit == null ? {} : { discountFiscalUnit: Number(discountFiscalUnit) }),
    discountNonFiscalUnit: Number(
      raw?.discount_non_fiscal_unit ?? snapshot.discountNonFiscalUnit ?? 0,
    ),
    freightUnit: Number(raw?.freight_unit ?? snapshot.freightUnit ?? 0),
    otherExpensesFiscalUnit: Number(
      raw?.other_expenses_fiscal_unit ?? snapshot.otherExpensesFiscalUnit ?? 0,
    ),
    otherExpensesNonFiscalUnit: Number(
      raw?.other_expenses_non_fiscal_unit ?? snapshot.otherExpensesNonFiscalUnit ?? 0,
    ),
    additionalCostUnit: Number(raw?.additional_cost_unit ?? snapshot.additionalCostUnit ?? 0),
  };
};

const number = (value: unknown) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new Error('Confira os valores e as quantidades do documento de origem.');
  return parsed;
};
const round2 = (value: number) => Number(value.toFixed(2));
const round4 = (value: number) => Number(value.toFixed(4));

export function receiptItemWithCosts(item: MobileReceiptItem): MobileReceiptItem {
  const unitCost = round2(
    Math.max(
      0,
      item.baseCost -
        (item.discountUnit || 0) +
        (item.ipiUnit || 0) +
        (item.freightFiscalUnit || 0) +
        (item.freightNonFiscalUnit || 0) +
        (item.otherExpensesFiscalUnit || 0) +
        (item.otherExpensesNonFiscalUnit || 0) +
        (item.additionalCostUnit || 0),
    ),
  );
  return { ...item, unitCost, totalCost: round2(item.quantity * unitCost) };
}

function amountForRateio(mode: 'percent' | 'fixed', value: number, baseTotal: number): number {
  const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
  return round2(mode === 'percent' ? (baseTotal * safeValue) / 100 : safeValue);
}

/** Calcula o custo dos itens de recebimento após aplicar os rateios operacionais. */
export function calculateMobileReceiptItems(
  items: readonly MobileReceiptItem[],
  options: MobileReceiptRateioOptions,
): MobileReceiptItem[] {
  const itemBases = items.map((item) => {
    const baseCost = Math.max(0, Number(item.fiscalBaseCost ?? item.baseCost ?? item.unitCost ?? 0));
    const quantity = Math.max(1, Number(item.quantity || 0));
    return round2(baseCost * quantity);
  });
  const baseTotal = round2(itemBases.reduce((total, itemBase) => total + itemBase, 0));
  const discountAllocations = allocate(
    amountForRateio(options.discountMode, options.discountValue, baseTotal),
    itemBases,
  );
  const freightAllocations = allocate(
    amountForRateio(options.freightMode, options.freightValue, baseTotal),
    itemBases,
  );
  const otherExpensesAllocations = allocate(
    amountForRateio(options.otherExpensesMode ?? 'percent', options.otherExpensesValue ?? 0, baseTotal),
    itemBases,
  );

  return items.map((item, index) => {
    const baseCost = Math.max(0, Number(item.fiscalBaseCost ?? item.baseCost ?? item.unitCost ?? 0));
    const quantity = Math.max(1, Number(item.quantity || 0));
    const discountNonFiscalUnit = round4(discountAllocations[index] / quantity);
    const discountFiscalUnit = round4(
      Number(
        item.discountFiscalUnit ??
          Math.max(0, Number(item.discountUnit || 0) - Number(item.discountNonFiscalUnit || 0)),
      ),
    );
    const discountUnit = round4(
      discountFiscalUnit + discountNonFiscalUnit,
    );
    const freightNonFiscalUnit = round4(freightAllocations[index] / quantity);
    const freightUnit = round4(
      Number(item.freightFiscalUnit ?? 0) + freightNonFiscalUnit,
    );
    const otherExpensesNonFiscalUnit = round4(otherExpensesAllocations[index] / quantity);
    const otherExpensesUnit = round4(
      Number(item.otherExpensesFiscalUnit ?? 0) +
        otherExpensesNonFiscalUnit +
        Number(item.additionalCostUnit ?? 0),
    );
    const unitCost = round2(
      Math.max(
        0,
        baseCost - discountUnit +
          Number(item.ipiUnit ?? 0) + freightUnit + otherExpensesUnit,
      ),
    );

    return {
      ...item,
      baseCost: round2(baseCost),
      discountFiscalUnit,
      discountNonFiscalUnit,
      discountUnit,
      freightNonFiscalUnit,
      freightUnit,
      otherExpensesNonFiscalUnit,
      otherExpensesUnit,
      unitCost,
      totalCost: round2(quantity * unitCost),
    };
  });
}

export function purchaseReceiptOrigin(purchase: MobilePurchase): ReceiptOrigin {
  const ipiPercent = number(purchase.ipiPercent);
  const freightPercent = number(purchase.freightPercent);
  return {
    kind: 'purchase',
    purchaseId: purchase.id,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    ipiPercent,
    freightPercent,
    items: purchase.items.map((item) => {
      const baseCost = number(item.baseCost || item.unitCost);
      return receiptItemWithCosts({
        ...item,
        baseCost,
        expectedQuantity: item.quantity,
        ipiUnit: round4((baseCost * ipiPercent) / 100),
        freightFiscalUnit: round4((baseCost * freightPercent) / 100),
      });
    }),
  };
}

function allocate(total: number, weights: number[]): number[] {
  const cents = Math.round(total * 100);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let remaining = cents;
  return weights.map((weight, index) => {
    const share =
      index === weights.length - 1
        ? remaining
        : Math.min(remaining, Math.round(weightTotal ? (cents * weight) / weightTotal : 0));
    remaining -= share;
    return share / 100;
  });
}

/** Recebe os dados de vínculo já persistidos; não altera a NF nem cria vínculos. */
export function inboundReceiptOrigin(invoice: any): ReceiptOrigin {
  if (!supplierProvidesStockOrigin(invoice.supplierStockOrigins, 'normal')) {
    throw new Error('Este fornecedor não gera recebimento de estoque normal.');
  }
  if (!invoice.supplier_id)
    throw new Error('Vincule o fornecedor na nota fiscal antes de receber.');
  if (!invoice.chave_acesso)
    throw new Error('A chave de acesso da nota fiscal não está disponível.');
  const sourceItems: any[] = Array.isArray(invoice.items) ? invoice.items : [];
  if (!hasInboundItemCommercialData(sourceItems)) {
    throw new Error('Importe o XML completo da nota antes de receber.');
  }

  const baseTotal = number(invoice.valor_produtos);
  const ipiPercent = baseTotal ? (number(invoice.valor_ipi) / baseTotal) * 100 : 0;
  const freightPercent = baseTotal ? (number(invoice.valor_frete) / baseTotal) * 100 : 0;
  const hasItemIpi = sourceItems.some(
    (item) =>
      number(item.ipiValue ?? item.ipi_value) || number(item.ipiPercent ?? item.ipi_percent),
  );
  const hasItemFreight = sourceItems.some((item) =>
    number(item.freightValue ?? item.freight_value),
  );
  const items: MobileReceiptItem[] = [];

  for (const item of sourceItems) {
    const mode = item.linkMode || item.link_mode || 'single';
    if (mode === 'not_applicable') continue;
    const quantity = number(item.quantity ?? item.quantidade);
    if (!quantity) throw new Error('Confira a quantidade dos itens da nota antes de receber.');
    const statedUnit = number(item.unitCost ?? item.unit_cost ?? item.valor_unitario);
    const base =
      number(item.totalCost ?? item.total_cost ?? item.valor_total) || statedUnit * quantity;
    const baseUnit = statedUnit || base / quantity;
    const lineIpi = hasItemIpi
      ? number(item.ipiValue ?? item.ipi_value) ||
        (base * number(item.ipiPercent ?? item.ipi_percent)) / 100
      : (base * ipiPercent) / 100;
    const lineFreight = hasItemFreight
      ? number(item.freightValue ?? item.freight_value)
      : (base * freightPercent) / 100;
    const discount = number(item.discountValue ?? item.discount_value);
    const other =
      number(item.insuranceValue ?? item.insurance_value) +
      number(item.otherExpensesValue ?? item.other_expenses_value) +
      number(item.icmsStValue ?? item.icms_st_value);
    const links = item.compositionLinks || item.composition_links || [];
    if (mode === 'composition') {
      if (
        !Array.isArray(links) ||
        !links.length ||
        links.some((link: any) => !link.productId && !link.product_id)
      ) {
        throw new Error('Conclua os vínculos dos itens compostos da nota antes de receber.');
      }
      const multipliers = links.map((link: any) => {
        const raw = link.quantityMultiplier ?? link.quantity_multiplier;
        const multiplier = raw == null ? 1 : number(raw);
        if (!multiplier)
          throw new Error('Confira as quantidades dos componentes vinculados à nota.');
        return multiplier;
      });
      const weights = links.map(
        (link: any, index: number) =>
          number(link.sellingPrice ?? link.selling_price) * multipliers[index],
      );
      const bases = allocate(base, weights);
      const ipis = allocate(lineIpi, weights);
      const freights = allocate(lineFreight, weights);
      const discounts = allocate(discount, weights);
      const others = allocate(other, weights);
      links.forEach((link: any, index: number) => {
        const componentQuantity = quantity * multipliers[index];
        items.push(
          receiptItemWithCosts({
            productId: String(link.productId || link.product_id),
            variationId: link.variationId || link.variation_id || undefined,
            description:
              link.productErpName || link.product_name || item.productDescription || 'Produto',
            sku: link.linkedProductCode || undefined,
            quantity: componentQuantity,
            expectedQuantity: componentQuantity,
            baseCost: round4(bases[index] / componentQuantity),
            ipiUnit: round4(ipis[index] / componentQuantity),
            freightFiscalUnit: round4(freights[index] / componentQuantity),
            discountUnit: round4(discounts[index] / componentQuantity),
            otherExpensesFiscalUnit: round4(others[index] / componentQuantity),
            unitCost: 0,
            totalCost: 0,
          }),
        );
      });
    } else {
      const productId = item.matchedProductId || item.matched_product_id || item.product_id;
      if (!productId)
        throw new Error('Vincule cada item da nota ou marque “Não se aplica” antes de receber.');
      items.push(
        receiptItemWithCosts({
          productId: String(productId),
          variationId:
            item.matchedVariationId || item.matched_variation_id || item.variation_id || undefined,
          description:
            item.productErpName || item.productDescription || item.product_description || 'Produto',
          sku: item.linkedProductCode || undefined,
          quantity,
          expectedQuantity: quantity,
          baseCost: baseUnit,
          ipiUnit: round4(lineIpi / quantity),
          freightFiscalUnit: round4(lineFreight / quantity),
          discountUnit: round4(discount / quantity),
          otherExpensesFiscalUnit: round4(other / quantity),
          unitCost: 0,
          totalCost: 0,
        }),
      );
    }
  }
  if (!items.length) throw new Error('A nota não possui itens para entrada no estoque.');

  return {
    kind: 'invoice',
    invoiceId: String(invoice.id),
    supplierId: String(invoice.supplier_id),
    supplierName: invoice.supplier?.full_name || invoice.emitente_nome || 'Fornecedor',
    invoiceNumber: String(invoice.numero_nfe || ''),
    invoiceDate: String(invoice.data_emissao || '').slice(0, 10),
    fiscalKey: String(invoice.chave_acesso),
    ipiPercent,
    freightPercent,
    fiscalIpi: number(invoice.valor_ipi),
    fiscalFreight: number(invoice.valor_frete),
    fiscalDiscount: number(invoice.valor_desconto),
    fiscalOtherExpenses:
      number(invoice.outras_despesas) +
      number(invoice.valor_seguro) +
      number(invoice.valor_icms_st),
    items,
  };
}
