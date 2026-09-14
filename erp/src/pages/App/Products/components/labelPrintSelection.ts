import { normalizeSearchTerm } from '@/pages/utils/textUtils';

export interface LabelPrintProduct {
    readonly id: string;
    readonly description: string;
    readonly code?: string;
    readonly sku?: string;
    readonly unitPrice?: number;
    readonly images?: readonly string[];
}

export interface SelectedLabelPrintProduct {
    readonly product: LabelPrintProduct;
    readonly qty: number;
}

/**
 * Cria a seleção inicial para um produto individual com quantidade 1.
 */
export function createInitialLabelPrintSelection(product: LabelPrintProduct): Map<string, SelectedLabelPrintProduct> {
    return new Map([[product.id, { product, qty: 1 }]]);
}

/**
 * Alterna a inclusão de um produto na lista de impressão de etiquetas.
 */
export function toggleLabelPrintProduct(
    selected: ReadonlyMap<string, SelectedLabelPrintProduct>,
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

/**
 * Define a quantidade de etiquetas a imprimir para um produto, com proteção contra valores inválidos ou NaN.
 */
export function setLabelPrintQuantity(
    selected: ReadonlyMap<string, SelectedLabelPrintProduct>,
    productId: string,
    quantity: number,
): Map<string, SelectedLabelPrintProduct> {
    const nextSelection = new Map(selected);
    const item = nextSelection.get(productId);
    if (item) {
        const safeQty = Number.isNaN(quantity) ? 1 : Math.max(1, Math.floor(quantity));
        nextSelection.set(productId, { ...item, qty: safeQty });
    }

    return nextSelection;
}

/**
 * Filtra e ordena produtos para impressão de etiquetas priorizando os já selecionados.
 */
export function orderLabelPrintProducts(
    products: readonly LabelPrintProduct[],
    search: string,
    selected: ReadonlyMap<string, SelectedLabelPrintProduct>,
): LabelPrintProduct[] {
    const query = normalizeSearchTerm(search);
    const filteredProducts = (products || []).filter(product => (
        normalizeSearchTerm(product.description || '').includes(query) ||
        normalizeSearchTerm(product.code || '').includes(query) ||
        normalizeSearchTerm(product.sku || '').includes(query)
    ));

    return [
        ...filteredProducts.filter(product => selected.has(product.id)),
        ...filteredProducts.filter(product => !selected.has(product.id)),
    ];
}

