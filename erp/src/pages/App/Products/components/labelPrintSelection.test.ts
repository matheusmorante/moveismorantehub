import { describe, expect, it } from 'vitest';
import {
    createInitialLabelPrintSelection,
    orderLabelPrintProducts,
    setLabelPrintQuantity,
    toggleLabelPrintProduct,
    type LabelPrintProduct,
} from './labelPrintSelection';

const chair: LabelPrintProduct = { id: 'chair', description: 'Cadeira', code: 'CAD-01' };
const table: LabelPrintProduct = { id: 'table', description: 'Mesa', sku: 'MES-01' };

describe('labelPrintSelection', () => {
    it('inicia o produto de origem com uma etiqueta', () => {
        expect(createInitialLabelPrintSelection(chair).get('chair')).toEqual({ product: chair, qty: 1 });
    });

    it('alterna seleção sem mutar a seleção anterior', () => {
        const initial = createInitialLabelPrintSelection(chair);
        const selected = toggleLabelPrintProduct(initial, table);

        expect(initial.has('table')).toBe(false);
        expect(selected.has('table')).toBe(true);
        expect(toggleLabelPrintProduct(selected, chair).has('chair')).toBe(false);
    });

    it('mantém no mínimo uma etiqueta e ordena os selecionados primeiro', () => {
        const selected = setLabelPrintQuantity(createInitialLabelPrintSelection(chair), 'chair', 0);

        expect(selected.get('chair')?.qty).toBe(1);
        expect(orderLabelPrintProducts([table, chair], 'mes', selected).map(product => product.id)).toEqual(['table']);
        expect(orderLabelPrintProducts([table, chair], '', selected).map(product => product.id)).toEqual(['chair', 'table']);
    });
});
