import type Product from '@/pages/types/product.type';

export const groupOfflineInventoryProducts = (rows: readonly any[]): Product[] => {
    const products = new Map<string, Product>();
    for (const row of rows) {
        const id = String(row.id);
        const previous = products.get(id);
        if (!previous) {
            products.set(id, { ...row, variations: [...(row.variations || [])] } as Product);
            continue;
        }
        const variations = new Map((previous.variations || []).map(variation => [String(variation.id), variation]));
        for (const variation of row.variations || []) variations.set(String(variation.id), variation);
        products.set(id, { ...previous, variations: [...variations.values()] });
    }
    return [...products.values()];
};
