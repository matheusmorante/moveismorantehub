import type { AuthorizedInvoiceLineSnapshot } from './invoiceLineSnapshot';
import { originalItemCfop, suggestEstornoCfop, suggestReturnCfop,
    type FiscalCfopConfiguration } from './fiscalCfopResolution';

export type FiscalSourceDocument = {
    id: string;
    accessKey: string;
    model: '55' | '65';
    environment: 1 | 2;
    status: 'autorizada' | 'homologada';
    lines: AuthorizedInvoiceLineSnapshot[];
};

export type FiscalReturnAllocation = {
    returnItemIndex: number;
    originalDocumentId: string;
    originalItemNumber: number;
    quantity: number;
};

export type FiscalDraftLine = {
    originalItemNumber: number;
    originalAccessKey: string;
    productCode: string;
    description: string;
    quantity: number;
    originalQuantity: number;
    grossValueForReview: number;
    discountValueForReview: number;
    originalTaxesXml: string;
    originalCfop: string | null;
    suggestedCfop: string | null;
    /** Must be explicitly reviewed; sale CFOP and tax XML cannot be reused as a return. */
    reviewedCfop: null;
    reviewedTaxesXml: null;
    returnItemIndexes: number[];
};

export type FiscalOperationDraft = {
    kind: 'estorno' | 'return';
    finalidade: 3 | 4;
    model: '55';
    environment: 1 | 2;
    originalDocumentId: string;
    originalAccessKey: string;
    returnOrderId?: string;
    reason?: string;
    lines: FiscalDraftLine[];
};

function assertAuthorizedSource(document: FiscalSourceDocument, environment: 1 | 2): void {
    if (!/^\d{44}$/.test(document.accessKey)) throw new Error('Chave fiscal de origem inválida.');
    if (document.environment !== environment || document.status !== (environment === 1 ? 'autorizada' : 'homologada')) {
        throw new Error('A NF-e de origem não está autorizada no ambiente escolhido.');
    }
    if (!document.lines.length) throw new Error('A NF-e de origem não possui linhas fiscais conferidas.');
}

function moneyForReview(original: number, quantity: number, billedQuantity: number): number {
    return Math.round(original * 100 * quantity / billedQuantity) / 100;
}

function draftLine(source: FiscalSourceDocument, line: AuthorizedInvoiceLineSnapshot, quantity: number,
    returnItemIndexes: number[], kind: 'estorno' | 'return', cfopConfig?: FiscalCfopConfiguration): FiscalDraftLine {
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > line.billedQuantity) {
        throw new Error(`Quantidade fiscal inválida para o item ${line.invoiceItemNumber} da NF-e de origem.`);
    }
    const originalCfop = originalItemCfop(line.productXml);
    return {
        originalItemNumber: line.invoiceItemNumber,
        originalAccessKey: source.accessKey,
        productCode: line.productCode,
        description: line.description,
        quantity,
        originalQuantity: line.billedQuantity,
        grossValueForReview: moneyForReview(line.grossValue, quantity, line.billedQuantity),
        discountValueForReview: moneyForReview(line.discountValue, quantity, line.billedQuantity),
        originalTaxesXml: line.taxesXml,
        originalCfop,
        suggestedCfop: kind === 'estorno'
            ? suggestEstornoCfop(originalCfop, cfopConfig)
            : suggestReturnCfop(cfopConfig),
        reviewedCfop: null,
        reviewedTaxesXml: null,
        returnItemIndexes,
    };
}

/** Draft only: no numbering, XML, stock or SEFAZ side effects. */
export function planEstornoFiscalDocument(input: {
    source: FiscalSourceDocument;
    environment: 1 | 2;
    operationDidNotOccur: boolean;
    goodsDidNotCirculate: boolean;
    cancellationWindowExpired: boolean;
    reason: string;
    cfopConfig?: FiscalCfopConfiguration;
}): FiscalOperationDraft {
    const { source, environment } = input;
    assertAuthorizedSource(source, environment);
    if (!input.operationDidNotOccur || !input.goodsDidNotCirculate || !input.cancellationWindowExpired) {
        throw new Error('Estorno exige operação não realizada, sem circulação e prazo de cancelamento expirado.');
    }
    const reason = input.reason.trim();
    if (reason.length < 15) throw new Error('Informe uma justificativa específica para o estorno.');
    return {
        kind: 'estorno', finalidade: 3, model: '55', environment,
        originalDocumentId: source.id, originalAccessKey: source.accessKey, reason,
        lines: source.lines.map((line) => draftLine(source, line, line.billedQuantity, [], 'estorno', input.cfopConfig)),
    };
}

/** One reviewable NF-e draft per original fiscal document, with references per original item. */
export function planReturnFiscalDocuments(input: {
    returnOrderId: string;
    returnOrderStatus: string;
    environment: 1 | 2;
    sources: FiscalSourceDocument[];
    allocations: FiscalReturnAllocation[];
    cfopConfig?: FiscalCfopConfiguration;
}): FiscalOperationDraft[] {
    if (input.returnOrderStatus !== 'fulfilled') throw new Error('A mercadoria precisa ter retornado antes do rascunho fiscal.');
    if (!input.returnOrderId || !input.allocations.length) throw new Error('Devolução sem pedido ou itens fiscais alocados.');
    const sources = new Map(input.sources.map((source) => [source.id, source]));
    const grouped = new Map<string, Map<number, { quantity: number; returnItemIndexes: number[] }>>();
    for (const allocation of input.allocations) {
        const source = sources.get(allocation.originalDocumentId);
        if (!source) throw new Error('Documento fiscal de origem não encontrado.');
        assertAuthorizedSource(source, input.environment);
        if (!Number.isInteger(allocation.returnItemIndex) || allocation.returnItemIndex < 0 ||
            !Number.isInteger(allocation.originalItemNumber) || allocation.originalItemNumber < 1 ||
            !Number.isFinite(allocation.quantity) || allocation.quantity <= 0) {
            throw new Error('Alocação fiscal inválida para a devolução.');
        }
        if (!source.lines.some((line) => line.invoiceItemNumber === allocation.originalItemNumber)) {
            throw new Error(`Item ${allocation.originalItemNumber} ausente da NF-e de origem.`);
        }
        const lines = grouped.get(source.id) || new Map<number, { quantity: number; returnItemIndexes: number[] }>();
        const previous = lines.get(allocation.originalItemNumber) || { quantity: 0, returnItemIndexes: [] };
        lines.set(allocation.originalItemNumber, {
            quantity: previous.quantity + allocation.quantity,
            returnItemIndexes: [...previous.returnItemIndexes, allocation.returnItemIndex],
        });
        grouped.set(source.id, lines);
    }
    return [...grouped].map(([documentId, allocations]) => {
        const source = sources.get(documentId)!;
        return {
            kind: 'return' as const, finalidade: 4 as const, model: '55' as const,
            environment: input.environment, originalDocumentId: documentId,
            originalAccessKey: source.accessKey, returnOrderId: input.returnOrderId,
            lines: [...allocations].map(([itemNumber, selection]) => draftLine(
                source, source.lines.find((line) => line.invoiceItemNumber === itemNumber)!,
                selection.quantity, selection.returnItemIndexes, 'return', input.cfopConfig,
            )),
        };
    });
}
