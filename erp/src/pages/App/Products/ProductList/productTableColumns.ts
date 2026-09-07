import type { ProductVisibilitySettings } from '../../../types/product.type';

export interface ProductTableColumn {
    key: keyof ProductVisibilitySettings;
    label: string;
    align?: string;
}

export const PRODUCT_TABLE_COLUMNS: ProductTableColumn[] = [
    { key: 'description', label: 'Produto/Variação' },
    { key: 'code', label: 'SKU' },
    { key: 'category', label: 'Categoria' },
    { key: 'unitPrice', label: 'Preço Venda', align: 'text-right' },
    { key: 'stock', label: 'Estoque', align: 'text-center' },
    { key: 'status', label: 'Status de Canais', align: 'text-center' },
    { key: 'actions', label: 'Ações', align: 'text-center' },
];

export function normalizeProductTableColumns(savedKeys: string[]): ProductTableColumn[] {
    const keys = [...savedKeys];
    const codeIndex = keys.indexOf('code');
    const descriptionIndex = keys.indexOf('description');

    if (codeIndex !== -1 && descriptionIndex !== -1 && codeIndex < descriptionIndex) {
        keys.splice(codeIndex, 1);
        keys.splice(keys.indexOf('description') + 1, 0, 'code');
    }

    const savedColumns = keys
        .map(key => PRODUCT_TABLE_COLUMNS.find(column => column.key === key))
        .filter((column): column is ProductTableColumn => Boolean(column));
    const missingColumns = PRODUCT_TABLE_COLUMNS.filter(column => !keys.includes(column.key));

    return [...savedColumns, ...missingColumns];
}

export function moveProductTableColumn(
    columns: ProductTableColumn[],
    draggedKey: string,
    targetKey: string,
): ProductTableColumn[] {
    if (draggedKey === targetKey) return columns;

    const draggedIndex = columns.findIndex(column => column.key === draggedKey);
    const targetIndex = columns.findIndex(column => column.key === targetKey);
    if (draggedIndex === -1 || targetIndex === -1) return columns;

    const orderedColumns = [...columns];
    const [draggedColumn] = orderedColumns.splice(draggedIndex, 1);
    orderedColumns.splice(targetIndex, 0, draggedColumn);
    return orderedColumns;
}
