import React from 'react';
import Product, { Variation } from '../pages/types/product.type';
import { fetchProductsPage } from '../pages/utils/productService';
import { buildAccentInsensitiveRegex } from '../pages/utils/textUtils';

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

// Cache em memória de curta duração para digitação ágil
let cachedActiveProducts: { data: Product[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

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

    // Se a busca direta retornar vazia ou incompleta devido a variações de acentuação,
    // utiliza a lista de produtos ativos em cache para filtragem precisa no cliente
    if (products.length === 0) {
        const now = Date.now();
        if (cachedActiveProducts && now - cachedActiveProducts.timestamp < CACHE_TTL_MS) {
            return cachedActiveProducts.data;
        }

        const fallback = await fetchProductsPage(1, 500, { activeOnly: true, supplierId });
        cachedActiveProducts = { data: fallback.data, timestamp: now };
        return fallback.data;
    }

    return products;
};

export const normalizeProductSearch = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const renderHighlightedProductText = (text: string, query: string) => {
    const words = query.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return <span>{text}</span>;

    const regexPatterns = words.map(w => buildAccentInsensitiveRegex(w)).filter(Boolean);
    if (!regexPatterns.length) return <span>{text}</span>;

    const expression = new RegExp(`(${regexPatterns.join('|')})`, 'gi');
    return <span>{text.split(expression).map((part, index) => expression.test(part)
        ? <span key={index} className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 rounded-sm px-0.5">{part}</span>
        : <span key={index}>{part}</span>)}</span>;
};
