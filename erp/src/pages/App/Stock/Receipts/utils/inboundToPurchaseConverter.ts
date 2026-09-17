import type { InboundReceiptItem, InboundReceiptItemComposition } from '../InboundNfeItemsSection';
import type { PurchaseItem } from '@/pages/types/purchase.type';
import type Product from '@/pages/types/product.type';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';

/** Converte os itens normalizados da NF-e em PurchaseItems para o recebimento.
 *  - Modo Único: converte 1:1.
 *  - Modo Composição: expande cada componente com custo rateado proporcional ao preço de venda.
 *  O último componente sempre absorve o resíduo para garantir que a soma não perca centavos.
 */
export function convertInboundToPurchaseItems(inboundItems: InboundReceiptItem[]): PurchaseItem[] {
    return inboundItems.flatMap(item => {
        const quantity = Math.max(1, item.expectedQuantity || item.quantity);
        const itemBaseUnit = Number(item.unitCost || 0);
        const itemBaseTotal = item.totalCost
            ? Number(item.totalCost)
            : Number((itemBaseUnit * quantity).toFixed(2));

        const unitFreightFiscal = item.freightValue ? Number((item.freightValue / quantity).toFixed(4)) : 0;
        const unitOtherFiscal = Number(
            (((item.insuranceValue || 0) + (item.otherExpensesValue || 0) + (item.icmsStValue || 0)) / quantity).toFixed(4)
        );
        const unitDiscountFiscal = item.discountValue ? Number((item.discountValue / quantity).toFixed(4)) : 0;

        if (item.linkMode === 'composition' && item.composition && item.composition.length > 0) {
            return convertCompositionItems(item, itemBaseTotal, quantity);
        }

        return [convertSingleItem(item, { quantity, itemBaseUnit, itemBaseTotal, unitFreightFiscal, unitOtherFiscal, unitDiscountFiscal })];
    });
}

// ---- Funções auxiliares privadas ----

type SingleItemParams = {
    quantity: number;
    itemBaseUnit: number;
    itemBaseTotal: number;
    unitFreightFiscal: number;
    unitOtherFiscal: number;
    unitDiscountFiscal: number;
};

function convertSingleItem(item: InboundReceiptItem, params: SingleItemParams): PurchaseItem {
    const rawDescription = (item as unknown as Record<string, unknown>).descricao || (item as unknown as Record<string, unknown>).xProd;
    const description =
        item.linkedProductName ||
        item.productErpName ||
        item.productDescription ||
        (typeof rawDescription === 'string' ? rawDescription : 'Produto sem descrição');

    return {
        productId: item.linkedProductId || item.matchedProductId || '',
        variationId: item.linkedVariationId || item.matchedVariationId || '',
        description,
        quantity: params.quantity,
        baseCost: params.itemBaseUnit,
        unitCost: params.itemBaseUnit,
        totalCost: params.itemBaseTotal,
        fiscalBaseCost: params.itemBaseUnit,
        freightValue: item.freightValue,
        freightFiscalUnit: params.unitFreightFiscal,
        otherExpensesFiscalUnit: params.unitOtherFiscal,
        discountFiscalUnit: params.unitDiscountFiscal,
        ipiValue: item.ipiValue,
        ipiPercent: item.ipiPercent,
        additionalCostUnit: 0,
    };
}

function convertCompositionItems(item: InboundReceiptItem, itemBaseTotal: number, _quantity: number): PurchaseItem[] {
    const composition = item.composition!;
    const totalReferenceValue = composition.reduce(
        (sum, c) => sum + (c.referenceSalePrice * c.quantity),
        0
    );

    return composition.map((comp, idx) => {
        const compQty = Math.max(1, comp.quantity);
        const weightValue = comp.referenceSalePrice * compQty;
        const weightPercent = totalReferenceValue > 0 ? weightValue / totalReferenceValue : 0;
        const isLast = idx === composition.length - 1;

        const rateio = buildRateio(item, itemBaseTotal, totalReferenceValue, weightPercent, isLast, idx, composition);
        const compBaseUnit = Number((rateio.baseTotal / compQty).toFixed(4));

        return {
            productId: comp.productId,
            variationId: comp.variationId || '',
            description: comp.productName,
            quantity: compQty,
            baseCost: compBaseUnit,
            unitCost: compBaseUnit,
            totalCost: rateio.baseTotal,
            fiscalBaseCost: compBaseUnit,
            freightValue: rateio.freight > 0 ? rateio.freight : undefined,
            freightFiscalUnit: Number((rateio.freight / compQty).toFixed(4)),
            otherExpensesFiscalUnit: Number((rateio.other / compQty).toFixed(4)),
            discountFiscalUnit: Number((rateio.discount / compQty).toFixed(4)),
            ipiValue: item.ipiValue ? rateio.ipi : undefined,
            ipiPercent: item.ipiPercent,
            additionalCostUnit: 0,
        };
    });
}

type CompositionLink = InboundReceiptItemComposition;

function buildRateio(
    item: InboundReceiptItem,
    itemBaseTotal: number,
    totalReferenceValue: number,
    weightPercent: number,
    isLast: boolean,
    idx: number,
    composition: CompositionLink[]
) {
    if (!isLast) {
        return {
            baseTotal: Number((itemBaseTotal * weightPercent).toFixed(2)),
            freight: Number(((item.freightValue || 0) * weightPercent).toFixed(2)),
            other: Number((((item.insuranceValue || 0) + (item.otherExpensesValue || 0) + (item.icmsStValue || 0)) * weightPercent).toFixed(2)),
            discount: Number(((item.discountValue || 0) * weightPercent).toFixed(2)),
            ipi: item.ipiValue ? Number((item.ipiValue * weightPercent).toFixed(2)) : 0,
        };
    }

    // Último item absorve a diferença para garantir fechamento do total sem arredondamentos
    const prev = composition.slice(0, idx);
    const calcPrevWeight = (prevC: CompositionLink) =>
        totalReferenceValue > 0 ? (prevC.referenceSalePrice * prevC.quantity) / totalReferenceValue : 0;

    const prevBaseTotal = prev.reduce((s, c) => s + Number((itemBaseTotal * calcPrevWeight(c)).toFixed(2)), 0);
    const prevFreight = prev.reduce((s, c) => s + Number(((item.freightValue || 0) * calcPrevWeight(c)).toFixed(2)), 0);
    const prevOther = prev.reduce((s, c) => s + Number((((item.insuranceValue || 0) + (item.otherExpensesValue || 0) + (item.icmsStValue || 0)) * calcPrevWeight(c)).toFixed(2)), 0);
    const prevDiscount = prev.reduce((s, c) => s + Number(((item.discountValue || 0) * calcPrevWeight(c)).toFixed(2)), 0);
    const prevIpi = item.ipiValue
        ? prev.reduce((s, c) => s + Number(((item.ipiValue || 0) * calcPrevWeight(c)).toFixed(2)), 0)
        : 0;

    return {
        baseTotal: Math.max(0, itemBaseTotal - prevBaseTotal),
        freight: Math.max(0, (item.freightValue || 0) - prevFreight),
        other: Math.max(0, ((item.insuranceValue || 0) + (item.otherExpensesValue || 0) + (item.icmsStValue || 0)) - prevOther),
        discount: Math.max(0, (item.discountValue || 0) - prevDiscount),
        ipi: item.ipiValue ? Math.max(0, item.ipiValue - prevIpi) : 0,
    };
}
