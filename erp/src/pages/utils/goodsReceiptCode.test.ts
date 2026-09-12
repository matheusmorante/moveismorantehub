import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatGoodsReceiptCode, getGoodsReceiptIndex, getNextGoodsReceiptIndex } from './goodsReceiptCode';

vi.mock('./supabaseConfig', () => ({
    supabase: {
        rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('RPC não disponível') }),
        from: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
    },
}));

describe('goodsReceiptCode', () => {
    describe('formatGoodsReceiptCode', () => {
        it('deve formatar código sequencial de 6 dígitos com padding', () => {
            expect(formatGoodsReceiptCode({ receiptIndex: 1 })).toBe('000001');
            expect(formatGoodsReceiptCode({ receiptIndex: 42 })).toBe('000042');
            expect(formatGoodsReceiptCode({ receiptIndex: 999999 })).toBe('999999');
        });

        it('deve suportar snake_case vindo diretamente do banco (receipt_index)', () => {
            expect(formatGoodsReceiptCode({ receipt_index: 7 } as any)).toBe('000007');
            expect(formatGoodsReceiptCode({ receipt_index: '123' } as any)).toBe('000123');
        });

        it('deve suportar string numérica em receiptIndex', () => {
            expect(formatGoodsReceiptCode({ receiptIndex: '15' as any })).toBe('000015');
        });

        it('deve retornar "—" quando receiptIndex for nulo, indefinido, 0 ou inválido', () => {
            expect(formatGoodsReceiptCode(undefined)).toBe('—');
            expect(formatGoodsReceiptCode({})).toBe('—');
            expect(formatGoodsReceiptCode({ receiptIndex: null })).toBe('—');
            expect(formatGoodsReceiptCode({ receiptIndex: 0 })).toBe('—');
            expect(formatGoodsReceiptCode({ receiptIndex: -5 })).toBe('—');
            expect(formatGoodsReceiptCode({ receiptIndex: 1000000 })).toBe('—');
        });
    });

    describe('getGoodsReceiptIndex', () => {
        it('deve extrair índice numérico de camelCase e snake_case', () => {
            expect(getGoodsReceiptIndex({ receiptIndex: 5 })).toBe(5);
            expect(getGoodsReceiptIndex({ receipt_index: 10 } as any)).toBe(10);
            expect(getGoodsReceiptIndex({ receiptIndex: '25' as any })).toBe(25);
            expect(getGoodsReceiptIndex(null as any)).toBeNull();
            expect(getGoodsReceiptIndex({ receiptIndex: null })).toBeNull();
        });
    });

    describe('getNextGoodsReceiptIndex', () => {
        it('deve calcular o próximo código com base no maior existente na lista local', async () => {
            const localList = [
                { receiptIndex: 1 },
                { receiptIndex: 5 },
                { receiptIndex: 3 },
            ];
            const next = await getNextGoodsReceiptIndex(localList);
            expect(next).toBe(6);
        });

        it('deve retornar 1 se a lista estiver vazia e o banco não tiver registros', async () => {
            const next = await getNextGoodsReceiptIndex([]);
            expect(next).toBe(1);
        });
    });
});
