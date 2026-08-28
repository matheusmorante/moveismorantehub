import React from 'react';
import Product, { Variation } from '../pages/types/product.type';

export type SuggestionItem = {
    product: Product;
    variation?: Variation;
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
