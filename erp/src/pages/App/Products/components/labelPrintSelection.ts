import { normalizeSearchTerm } from '@/pages/utils/textUtils';

export interface LabelPrintProduct {
    id: string;
    description: string;
    code?: string;
    sku?: string;
    unitPrice?: number;
    images?: string[];
}

export interface SelectedLabelPrintProduct {
    product: LabelPrintProduct;
    qty: number;
}

export function createInitialLabelPrintSelection(product: LabelPrintProduct): Map<string, SelectedLabelPrintProduct> {
    return new Map([[product.id, { product, qty: 1 }]]);
}

export function toggleLabelPrintProduct(
    selected: Map<string, SelectedLabelPrintProduct>,
    product: LabelPrintProduct,
): Map<string, SelectedLabelPrintProduct> {
    const nextSelection = new Map(selected);
    if (nextSelection.has(product.id)) {
        nextSelection.delete(product.id);
    } else {
        nextSelection.set(product.id, { product, qty: 1 });
    }

    return nextSelection;
}

export function setLabelPrintQuantity(
    selected: Map<string, SelectedLabelPrintProduct>,
    productId: string,
    quantity: number,
): Map<string, SelectedLabelPrintProduct> {
    const nextSelection = new Map(selected);
    const item = nextSelection.get(productId);
    if (item) {
        nextSelection.set(productId, { ...item, qty: Math.max(1, quantity) });
    }

    return nextSelection;
}

export function orderLabelPrintProducts(
    products: LabelPrintProduct[],
    search: string,
    selected: Map<string, SelectedLabelPrintProduct>,
): LabelPrintProduct[] {
    const query = normalizeSearchTerm(search);
    const filteredProducts = products.filter(product => (
        normalizeSearchTerm(product.description || '').includes(query) ||
        normalizeSearchTerm(product.code || '').includes(query) ||
        normalizeSearchTerm(product.sku || '').includes(query)
    ));

    return [
        ...filteredProducts.filter(product => selected.has(product.id)),
        ...filteredProducts.filter(product => !selected.has(product.id)),
    ];
}
