import Product from '../../../types/product.type';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';

export interface ProductListFilters {
    activeOnly?: boolean;
    category?: string;
    isDraft?: boolean;
    search?: string;
    showTrash?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

/** Aplica os filtros locais legados e a ordenação da lista de produtos. */
export function filterAndSortProducts(products: Product[], filters: ProductListFilters = {}): Product[] {
    return products
        .filter(product => {
            const isDraft = Boolean(product.isDraft) || product.status === 'draft';
            const isActive = !isDraft && product.active !== false && !product.deleted;
            const isDeactivated = !isDraft && (product.active === false || product.deleted);

            if (filters.isDraft === true) {
                if (!isDraft) return false;
            } else if (filters.isDraft === false) {
                if (isDraft) return false;
            } else if (filters.showTrash || filters.activeOnly === false) {
                if (!isDeactivated) return false;
            } else if (filters.activeOnly === true) {
                if (!isActive) return false;
            }

            const searchTerm = normalizeSearchTerm(filters.search || '');
            const categoryMatch = !filters.category ||
                product.category === filters.category ||
                (filters.category === 'Serviços' && product.itemType === 'service') ||
                (filters.category === 'Produtos' && product.itemType === 'product');

            if (!searchTerm) {
                const activeMatch = filters.activeOnly === undefined || product.active === filters.activeOnly;
                return categoryMatch && activeMatch;
            }

            const matchesSearch = (value?: string) => normalizeSearchTerm(value || '').includes(searchTerm);
            const matchesSelf = matchesSearch(product.name);
            let matchesRelatedProduct = false;

            if (!product.parentId) {
                matchesRelatedProduct = product.variations?.some((variation: any) => matchesSearch(variation.name)) || false;
                if (!matchesRelatedProduct) {
                    matchesRelatedProduct = products.some(candidate => candidate.parentId === product.id && matchesSearch(candidate.name));
                }
            } else {
                const parent = products.find(candidate => candidate.id === product.parentId);
                matchesRelatedProduct = Boolean(parent && matchesSearch(parent.name));
            }

            return (matchesSelf || matchesRelatedProduct) && categoryMatch;
        })
        .sort((a, b) => {
            let comparison = 0;
            const sortBy = filters.sortBy || 'createdAt';

            if (sortBy === 'description') comparison = (a.description || '').localeCompare(b.description || '');
            else if (sortBy === 'unitPrice') comparison = (a.unitPrice || 0) - (b.unitPrice || 0);
            else if (sortBy === 'stock') comparison = (a.stock || 0) - (b.stock || 0);
            else if (sortBy === 'code') comparison = (a.code || '').localeCompare(b.code || '');
            else if (sortBy === 'createdAt') comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            else if (sortBy === 'category') comparison = (a.category || '').localeCompare(b.category || '');

            return (filters.sortOrder || 'desc') === 'asc' ? comparison : -comparison;
        });
}
