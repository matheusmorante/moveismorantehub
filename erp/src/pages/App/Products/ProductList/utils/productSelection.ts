interface SelectableProduct {
    id?: string;
    isParent?: boolean;
    isVariation?: boolean;
    parentId?: string;
}

/** Atualiza a seleção preservando a cascata entre produto-pai e variações. */
export function toggleProductSelection(
    currentSelection: string[],
    productId: string,
    products: SelectableProduct[],
): string[] {
    const product = products.find(item => item.id === productId);
    let nextSelection = [...currentSelection];
    const isSelected = currentSelection.includes(productId);

    if (product?.isParent) {
        const childIds = products.filter(item => item.parentId === productId).map(item => item.id!).filter(Boolean);
        return isSelected
            ? nextSelection.filter(id => id !== productId && !childIds.includes(id))
            : [...new Set([...nextSelection, productId, ...childIds])];
    }

    if (product?.isVariation) {
        if (isSelected) {
            nextSelection = nextSelection.filter(id => id !== productId);
            return nextSelection.filter(id => id !== product.parentId);
        }

        nextSelection.push(productId);
        const siblingIds = products.filter(item => item.parentId === product.parentId).map(item => item.id!).filter(Boolean);
        if (siblingIds.every(id => nextSelection.includes(id))) {
            nextSelection.push(product.parentId!);
        }
        return nextSelection;
    }

    return isSelected
        ? nextSelection.filter(id => id !== productId)
        : [...nextSelection, productId];
}
