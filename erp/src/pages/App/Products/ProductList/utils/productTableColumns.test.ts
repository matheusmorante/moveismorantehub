import { describe, expect, it } from 'vitest';
import {
    moveProductTableColumn,
    normalizeProductTableColumns,
    PRODUCT_TABLE_COLUMNS,
} from './productTableColumns';

describe('productTableColumns', () => {
    it('migra a ordem legada para manter a descrição antes do SKU', () => {
        expect(normalizeProductTableColumns(['code', 'description', 'stock']).map(column => column.key))
            .toEqual(['description', 'code', 'stock', 'category', 'unitPrice', 'status', 'actions']);
    });

    it('ignora chaves legadas desconhecidas e inclui colunas novas', () => {
        expect(normalizeProductTableColumns(['description', 'removed_column']).map(column => column.key))
            .toEqual(PRODUCT_TABLE_COLUMNS.map(column => column.key));
    });

    it('move uma coluna sem mutar a lista original', () => {
        const ordered = moveProductTableColumn(PRODUCT_TABLE_COLUMNS, 'stock', 'description');

        expect(ordered.map(column => column.key).slice(0, 2)).toEqual(['stock', 'description']);
        expect(PRODUCT_TABLE_COLUMNS[0].key).toBe('description');
    });
});
