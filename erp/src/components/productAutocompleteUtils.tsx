import React from 'react';
import Product, { Variation } from '../pages/types/product.type';
import { fetchProductsPage } from '../pages/utils/productService';

export type SuggestionItem = {
    product: Product;
    variation?: Variation;
};

export const getVariationDisplayName = (product: Product, variation?: Variation) => {
    if (variation && variation.name && variation.name.trim()) {
        return variation.name.trim();
    }
    const parentName = (product.name || product.title || '').trim();
    if (!variation) return parentName;

    const attrValues = (variation.attributes || [])
        .map((a: any) => (typeof a === 'object' ? a.value : a))
        .filter(Boolean)
        .join(' ');

    return [parentName, attrValues].filter(Boolean).join(' ');
};

export const fetchAllProductSearchResults = async (search: string, supplierId?: string) => {
    const products: Product[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
        const result = await fetchProductsPage(page, pageSize, { search, activeOnly: true, supplierId });
        products.push(...result.data);
        if (!result.data.length || products.length >= result.total) break;
        page += 1;
    }
    return products;
};

export const normalizeProductSearch = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const renderHighlightedProductText = (text: string, query: string) => {
    const words = query.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return <span>{text}</span>;

    const expression = new RegExp(`(${words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return <span>{text.split(expression).map((part, index) => expression.test(part)
        ? <span key={index} className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 rounded-sm px-0.5">{part}</span>
        : <span key={index}>{part}</span>)}</span>;
};
