import { InboundInvoice, InboundInvoiceItem } from '../types/inboundNfeTypes';

export const toInboundInvoiceStatus = (value: string | null | undefined): InboundInvoice['status'] => {
    if (value === 'recebida' || value === 'received') return 'received';
    if (value === 'manifestada' || value === 'manifested') return 'manifested';
    return 'pending';
};

export const normalizeAdditionalCost = (value: any) => {
    const calculationType = value?.calculationType === 'fixed' ? 'fixed' : 'percentage';
    const inputValue = value?.inputValue ?? (calculationType === 'percentage' ? value?.percentage : value?.fixedAmount);
    return {
        id: String(value?.id || `additional-cost-${Math.random().toString(36).slice(2)}`),
        description: String(value?.description || ''),
        calculationType,
        inputValue: inputValue === null || inputValue === undefined ? null : Number(inputValue),
        calculationBase: 'products_base_value' as const,
        calculatedAmount: Number(value?.calculatedAmount || 0),
        calculatedRate: Number(value?.calculatedRate ?? (value?.calculatedAmount && Number(value?.calculatedAmount) > 0 ? 0 : 0)),
    };
};

export const normalizeAdditionalCosts = (value: unknown) => Array.isArray(value) ? value.map(normalizeAdditionalCost) : [];

export const normalizeInvoiceItem = (r: any, idx: number): InboundInvoiceItem => {
    const snap = (r && typeof r === 'object' && r.item_snapshot && typeof r.item_snapshot === 'object') ? r.item_snapshot : {};

    const descFromSnap = snap.productDescription || snap.descricao || snap.descricao_produto || snap.xProd || snap.xprod || '';
    const descFromR = r.productDescription || r.descricao || r.descricao_produto || r.xProd || r.xprod || r.codigo_produto_descricao || '';
    let desc = descFromSnap && descFromSnap !== 'Item sem descrição' ? descFromSnap : descFromR;
    if (!desc || desc === 'Item sem descrição') desc = descFromSnap || descFromR || 'Item sem descrição';

    const code = snap.productCode || snap.codigo || snap.cProd || snap.codigo_produto || r.productCode || r.codigo_produto || r.codigo || r.cProd || '';
    const num = snap.itemNumber ?? snap.numeroItem ?? r.itemNumber ?? r.item_index ?? r.numeroItem ?? idx + 1;
    const unit = snap.unit || snap.unidade || r.unit || r.unidade || 'UN';

    const qtySnap = snap.quantity ?? snap.quantidade;
    const qtyR = r.quantity ?? r.quantidade;
    const qty = Number(qtySnap !== undefined && qtySnap !== null && Number(qtySnap) > 0 ? qtySnap : (qtyR ?? 0));

    const uCostSnap = snap.unitCost ?? snap.valorUnitario ?? snap.valor_unitario;
    const uCostR = r.unitCost ?? r.valor_unitario ?? r.valorUnitario;
    const uCost = Number(uCostSnap !== undefined && uCostSnap !== null && Number(uCostSnap) > 0 ? uCostSnap : (uCostR ?? 0));

    const tCostSnap = snap.totalCost ?? snap.valorTotal ?? snap.valor_total;
    const tCostR = r.totalCost ?? r.valor_total ?? r.valorTotal;
    const calcTotal = qty * uCost;
    const tCost = Number(tCostSnap !== undefined && tCostSnap !== null && Number(tCostSnap) > 0 ? tCostSnap : (tCostR ?? calcTotal));

    const ncm = snap.ncm || r.ncm || '';
    const cfop = snap.cfop || r.cfop || '';

    return {
        ...r,
        ...snap,
        itemNumber: num,
        productCode: code,
        productDescription: desc,
        unit,
        quantity: qty,
        unitCost: uCost,
        totalCost: tCost,
        ncm,
        cfop,
        discountValue: Number(snap.discountValue ?? snap.valorDesconto ?? r.valor_desconto ?? r.discountValue ?? 0),
        freightValue: Number(snap.freightValue ?? snap.valorFrete ?? r.valor_frete ?? r.freightValue ?? 0),
        insuranceValue: Number(snap.insuranceValue ?? snap.valorSeguro ?? r.valor_seguro ?? r.insuranceValue ?? 0),
        otherExpensesValue: Number(snap.otherExpensesValue ?? snap.outrasDespesas ?? r.outras_despesas ?? r.otherExpensesValue ?? 0),
        matchedProductId: snap.matchedProductId || snap.matched_product_id || r.matched_product_id || r.matchedProductId || undefined,
        matchedVariationId: snap.matchedVariationId || snap.matched_variation_id || r.matched_variation_id || r.matchedVariationId || undefined,
        productErpName: snap.productErpName || snap.product_erp_name || r.product_erp_name || r.productErpName || undefined,
        linkedProductCode: snap.linkedProductCode || snap.linked_product_code || r.linked_product_code || r.linkedProductCode || undefined,
        normalizedParentName: snap.normalizedParentName || r.normalizedParentName || undefined,
        extractedAttributes: snap.extractedAttributes || r.extractedAttributes || undefined,
        detectedSupplierCodeFamily: snap.detectedSupplierCodeFamily || r.detectedSupplierCodeFamily || undefined,
    };
};
