export interface AuthorizedInvoiceLineSnapshot {
    invoiceItemNumber: number;
    productCode: string;
    description: string;
    billedQuantity: number;
    unitValue: number;
    grossValue: number;
    discountValue: number;
    productXml: string;
    taxesXml: string;
}

const decodeXml = (value: string) => value
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const childText = (xml: string, tag: string) => {
    const found = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
    return found ? decodeXml(found[1].replace(/<[^>]+>/g, '').trim()) : '';
};

const decimal = (value: string) => {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : NaN;
};

/** Extracts billed line facts only from an already authorized nfeProc/NFe XML snapshot. */
export function parseAuthorizedInvoiceLines(xml: string): AuthorizedInvoiceLineSnapshot[] {
    if (!/<(?:\w+:)?infNFe\b/i.test(xml)) throw new Error('XML não contém uma NF-e identificável.');
    const details = [...xml.matchAll(/<(?:\w+:)?det\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?det>/gi)];
    if (!details.length) throw new Error('XML autorizado não contém itens fiscais.');

    return details.map(([, attributes, content]) => {
        const itemNumber = attributes.match(/\bnItem=["'](\d+)["']/i)?.[1];
        const productXml = content.match(/<(?:\w+:)?prod\b[^>]*>[\s\S]*?<\/(?:\w+:)?prod>/i)?.[0] || '';
        const taxesXml = content.match(/<(?:\w+:)?imposto\b[^>]*>[\s\S]*?<\/(?:\w+:)?imposto>/i)?.[0] || '';
        const billedQuantity = decimal(childText(productXml, 'qCom'));
        const unitValue = decimal(childText(productXml, 'vUnCom'));
        const grossValue = decimal(childText(productXml, 'vProd'));
        const discountValue = decimal(childText(productXml, 'vDesc') || '0');
        if (!itemNumber || !productXml || !Number.isFinite(billedQuantity) || billedQuantity <= 0 ||
            !Number.isFinite(unitValue) || unitValue < 0 || !Number.isFinite(grossValue) || grossValue < 0 ||
            !Number.isFinite(discountValue) || discountValue < 0) {
            throw new Error(`Linha fiscal inválida no item ${itemNumber || 'sem nItem'}.`);
        }
        return {
            invoiceItemNumber: Number(itemNumber),
            productCode: childText(productXml, 'cProd'),
            description: childText(productXml, 'xProd'),
            billedQuantity,
            unitValue,
            grossValue,
            discountValue,
            productXml,
            taxesXml,
        };
    });
}

export interface InvoiceReturnAllocation {
    originalDocumentId: string;
    originalItemNumber: number;
    quantity: number;
    returnStatus: string;
}

export interface ReturnLineRequest {
    returnItemIndex: number;
    originalOrderItemIndex: number;
    productId?: string;
    code?: string;
    description: string;
    quantity: number;
}

export interface AvailableInvoiceLine {
    originalDocumentId: string;
    originalItemNumber: number;
    productCode: string;
    description: string;
    availableQuantity: number;
}

export function getBilledCapacityByOrderLine(
    orderItems: Array<{ code?: string; productId?: string; description: string; quantity: number }>,
    invoiceLines: AvailableInvoiceLine[],
) {
    const remaining = new Map(invoiceLines.map((line) => [`${line.originalDocumentId}:${line.originalItemNumber}`, line.availableQuantity]));
    return orderItems.map((item, index) => {
        const codes = [item.code, item.productId, String(index + 1)].filter(Boolean);
        const matches = invoiceLines.filter((line) => codes.includes(line.productCode) ||
            line.description.trim().toLocaleLowerCase() === item.description.trim().toLocaleLowerCase());
        let needed = Math.max(Number(item.quantity) || 0, 0);
        let capacity = 0;
        for (const line of matches) {
            const key = `${line.originalDocumentId}:${line.originalItemNumber}`;
            const current = remaining.get(key) || 0;
            const assigned = Math.min(current, needed);
            remaining.set(key, current - assigned);
            needed -= assigned;
            capacity += assigned;
            if (needed <= 0) break;
        }
        return capacity;
    });
}

export function allocateReturnQuantityAcrossInvoices(
    requestedItems: ReturnLineRequest[],
    invoiceLines: AvailableInvoiceLine[],
) {
    const remaining = new Map(invoiceLines.map((line) => [`${line.originalDocumentId}:${line.originalItemNumber}`, line.availableQuantity]));
    const allocations: Array<{
        returnItemIndex: number;
        originalOrderItemIndex: number;
        originalDocumentId: string;
        originalItemNumber: number;
        quantity: number;
    }> = [];
    for (const item of requestedItems) {
        let needed = item.quantity;
        const codes = [item.code, item.productId, String(item.originalOrderItemIndex + 1)].filter(Boolean);
        const matches = invoiceLines.filter((line) => codes.includes(line.productCode) ||
            line.description.trim().toLocaleLowerCase() === item.description.trim().toLocaleLowerCase());
        if (!matches.length) throw new Error(`O item “${item.description}” não foi encontrado em uma NF-e autorizada.`);
        for (const line of matches) {
            const key = `${line.originalDocumentId}:${line.originalItemNumber}`;
            const available = remaining.get(key) || 0;
            if (available <= 0) continue;
            const quantity = Math.min(available, needed);
            allocations.push({ returnItemIndex: item.returnItemIndex, originalOrderItemIndex: item.originalOrderItemIndex,
                originalDocumentId: line.originalDocumentId, originalItemNumber: line.originalItemNumber, quantity });
            remaining.set(key, available - quantity);
            needed -= quantity;
            if (needed <= 0) break;
        }
        if (needed > 0) throw new Error(`Saldo faturado insuficiente para devolver “${item.description}”; confira as NF-e autorizadas.`);
    }
    return allocations;
}

export function getInvoiceLineReturnCapacity(
    documentId: string,
    line: AuthorizedInvoiceLineSnapshot,
    allocations: InvoiceReturnAllocation[],
) {
    const related = allocations.filter((allocation) => allocation.originalDocumentId === documentId &&
        allocation.originalItemNumber === line.invoiceItemNumber && allocation.returnStatus !== 'cancelled');
    const reservedQuantity = related.reduce((sum, allocation) => sum + allocation.quantity, 0);
    const physicallyReturnedQuantity = related
        .filter((allocation) => allocation.returnStatus === 'fulfilled')
        .reduce((sum, allocation) => sum + allocation.quantity, 0);
    return {
        reservedQuantity,
        physicallyReturnedQuantity,
        availableToReserve: Math.max(line.billedQuantity - reservedQuantity, 0),
        availableForFiscalReturn: Math.max(line.billedQuantity - physicallyReturnedQuantity, 0),
    };
}
