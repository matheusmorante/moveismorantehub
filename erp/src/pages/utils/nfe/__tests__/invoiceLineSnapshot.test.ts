import { describe, expect, it } from 'vitest';
import { allocateReturnQuantityAcrossInvoices, getBilledCapacityByOrderLine, getInvoiceLineReturnCapacity, parseAuthorizedInvoiceLines } from '../invoiceLineSnapshot';

const xml = `<nfeProc><NFe><infNFe><det nItem="1"><prod><cProd>SKU-1</cProd><xProd>Cadeira</xProd><qCom>4.0000</qCom><vUnCom>25.0000</vUnCom><vProd>100.00</vProd><vDesc>4.00</vDesc></prod><imposto><ICMS><ICMSSN102><orig>0</orig></ICMSSN102></ICMS></imposto></det></infNFe></NFe></nfeProc>`;

describe('authorized invoice line snapshots', () => {
    it('uses the billed line facts and keeps its original fiscal fragments', () => {
        const [line] = parseAuthorizedInvoiceLines(xml);
        expect(line).toMatchObject({ invoiceItemNumber: 1, productCode: 'SKU-1', billedQuantity: 4, grossValue: 100, discountValue: 4 });
        expect(line.taxesXml).toContain('ICMSSN102');
    });

    it('distinguishes reserved commercial returns from physically fulfilled returns', () => {
        const [line] = parseAuthorizedInvoiceLines(xml);
        const capacity = getInvoiceLineReturnCapacity('nfe-1', line, [
            { originalDocumentId: 'nfe-1', originalItemNumber: 1, quantity: 1, returnStatus: 'scheduled' },
            { originalDocumentId: 'nfe-1', originalItemNumber: 1, quantity: 1, returnStatus: 'fulfilled' },
            { originalDocumentId: 'other', originalItemNumber: 1, quantity: 2, returnStatus: 'fulfilled' },
        ]);
        expect(capacity).toEqual({ reservedQuantity: 2, physicallyReturnedQuantity: 1, availableToReserve: 2, availableForFiscalReturn: 3 });
    });

    it('fails closed when the invoice has no valid billed detail', () => {
        expect(() => parseAuthorizedInvoiceLines('<nfeProc><NFe><infNFe /></NFe></nfeProc>')).toThrow(/itens fiscais/);
    });

    it('allocates partial returns across separately authorized invoice lines without exceeding billed quantity', () => {
        const allocations = allocateReturnQuantityAcrossInvoices([{
            returnItemIndex: 0, originalOrderItemIndex: 0, productId: 'product-1', code: 'SKU-1', description: 'Cadeira', quantity: 3,
        }], [
            { originalDocumentId: 'nfe-1', originalItemNumber: 1, productCode: 'SKU-1', description: 'Cadeira', availableQuantity: 1 },
            { originalDocumentId: 'nfe-2', originalItemNumber: 1, productCode: 'SKU-1', description: 'Cadeira', availableQuantity: 2 },
        ]);
        expect(allocations.map((line) => [line.originalDocumentId, line.quantity])).toEqual([['nfe-1', 1], ['nfe-2', 2]]);
        expect(() => allocateReturnQuantityAcrossInvoices([{
            returnItemIndex: 0, originalOrderItemIndex: 0, code: 'SKU-1', description: 'Cadeira', quantity: 4,
        }], [{ originalDocumentId: 'nfe-1', originalItemNumber: 1, productCode: 'SKU-1', description: 'Cadeira', availableQuantity: 3 }])).toThrow(/Saldo faturado insuficiente/);
    });

    it('assigns duplicated commercial lines a non-overlapping share of billed quantity', () => {
        expect(getBilledCapacityByOrderLine([
            { code: 'SKU-1', description: 'Cadeira', quantity: 2 },
            { code: 'SKU-1', description: 'Cadeira', quantity: 2 },
        ], [{ originalDocumentId: 'nfe-1', originalItemNumber: 1, productCode: 'SKU-1', description: 'Cadeira', availableQuantity: 3 }])).toEqual([2, 1]);
    });
});
