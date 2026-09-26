import { describe, expect, it } from 'vitest';
import {
    planEstornoFiscalDocument,
    planReturnFiscalDocuments,
    type FiscalSourceDocument,
} from '../fiscalOperationPlanning';

const source = (id: string, itemNumber = 1): FiscalSourceDocument => ({
    id, accessKey: '1'.repeat(44), model: '55', environment: 1, status: 'autorizada',
    lines: [{ invoiceItemNumber: itemNumber, productCode: 'CHAIR', description: 'Cadeira',
        billedQuantity: 4, unitValue: 100, grossValue: 400, discountValue: 40,
        productXml: '<prod/>', taxesXml: '<imposto/>',
    }],
});

describe('rascunhos fiscais de estorno e devolução', () => {
    it('prepara estorno integral somente após os três fatos e sem presumir CFOP ou tributos', () => {
        const draft = planEstornoFiscalDocument({ source: source('A'), environment: 1,
            operationDidNotOccur: true, goodsDidNotCirculate: true, cancellationWindowExpired: true,
            reason: 'Operação não realizada e cancelamento fora do prazo.',
        });
        expect(draft.finalidade).toBe(3);
        expect(draft.model).toBe('55');
        expect(draft.lines[0]).toMatchObject({ quantity: 4, grossValueForReview: 400,
            reviewedCfop: null, reviewedTaxesXml: null });
    });

    it('recusa estorno quando houve circulação ou o cancelamento ainda cabe', () => {
        const base = { source: source('A'), environment: 1 as const, operationDidNotOccur: true,
            goodsDidNotCirculate: true, cancellationWindowExpired: true,
            reason: 'Operação não realizada e cancelamento fora do prazo.',
        };
        expect(() => planEstornoFiscalDocument({ ...base, goodsDidNotCirculate: false })).toThrow();
        expect(() => planEstornoFiscalDocument({ ...base, cancellationWindowExpired: false })).toThrow();
    });

    it('devolve somente a quantidade física alocada, com valores proporcionais para revisão', () => {
        const drafts = planReturnFiscalDocuments({ returnOrderId: 'R', returnOrderStatus: 'fulfilled',
            environment: 1, sources: [source('A')],
            allocations: [{ returnItemIndex: 0, originalDocumentId: 'A', originalItemNumber: 1, quantity: 1 }],
        });
        expect(drafts).toHaveLength(1);
        expect(drafts[0]).toMatchObject({ finalidade: 4, model: '55', originalDocumentId: 'A' });
        expect(drafts[0].lines[0]).toMatchObject({ quantity: 1, originalItemNumber: 1,
            grossValueForReview: 100, discountValueForReview: 10, reviewedCfop: null });
    });

    it('separa notas de origem diferentes e consolida repetição da mesma linha fiscal', () => {
        const drafts = planReturnFiscalDocuments({ returnOrderId: 'R', returnOrderStatus: 'fulfilled',
            environment: 1, sources: [source('A'), source('B', 2)], allocations: [
                { returnItemIndex: 0, originalDocumentId: 'A', originalItemNumber: 1, quantity: 1 },
                { returnItemIndex: 1, originalDocumentId: 'A', originalItemNumber: 1, quantity: 1 },
                { returnItemIndex: 2, originalDocumentId: 'B', originalItemNumber: 2, quantity: 1 },
            ],
        });
        expect(drafts).toHaveLength(2);
        expect(drafts[0].lines).toHaveLength(1);
        expect(drafts[0].lines[0].quantity).toBe(2);
        expect(drafts[1].lines[0].originalItemNumber).toBe(2);
    });

    it('recusa retorno não atendido, excesso, origem ausente e ambiente trocado', () => {
        const base = { returnOrderId: 'R', returnOrderStatus: 'fulfilled', environment: 1 as const,
            sources: [source('A')], allocations: [
                { returnItemIndex: 0, originalDocumentId: 'A', originalItemNumber: 1, quantity: 1 },
            ],
        };
        expect(() => planReturnFiscalDocuments({ ...base, returnOrderStatus: 'scheduled' })).toThrow();
        expect(() => planReturnFiscalDocuments({ ...base, allocations: [{ ...base.allocations[0], quantity: 5 }] })).toThrow();
        expect(() => planReturnFiscalDocuments({ ...base, allocations: [{ ...base.allocations[0], originalDocumentId: 'B' }] })).toThrow();
        expect(() => planReturnFiscalDocuments({ ...base, environment: 2 })).toThrow();
    });
});
