import Product from '../../../types/product.type';

export function getEnteredProductName(data: Partial<Product>): string {
    return (data.name || data.title || data.marketplaceTitle || '').trim();
}

export function isDraftSaveEligible(data: Partial<Product>): boolean {
    const name = getEnteredProductName(data);
    return name.length > 0;
}
