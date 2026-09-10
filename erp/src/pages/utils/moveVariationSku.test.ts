import { describe, expect, it } from 'vitest';
import { calculateNextVariationSku } from './productService';

describe('calculateNextVariationSku', () => {
    it('calcula próximo sufixo usando MAX(sufixo) + 1 quando há buracos na sequência (-01, -02, -04 → -05)', () => {
        const existingSkus = ['654321-01', '654321-02', '654321-04'];
        const nextSku = calculateNextVariationSku('654321', existingSkus);
        expect(nextSku).toBe('654321-05');
    });

    it('retorna -01 para pai sem nenhuma variação anterior', () => {
        const nextSku = calculateNextVariationSku('999888', []);
        expect(nextSku).toBe('999888-01');
    });

    it('ignora SKUs de outros produtos ou sem formato numérico', () => {
        const existingSkus = ['654321-01', '654321-03', 'OUTRO-99', 'INVALIDO'];
        const nextSku = calculateNextVariationSku('654321', existingSkus);
        expect(nextSku).toBe('654321-04');
    });

    it('suporta sufixos de dois dígitos com zero à esquerda', () => {
        const existingSkus = ['100000-09'];
        const nextSku = calculateNextVariationSku('100000', existingSkus);
        expect(nextSku).toBe('100000-10');
    });
});
