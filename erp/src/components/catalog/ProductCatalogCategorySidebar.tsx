import React from 'react';
import type { CategoryOption } from './productCatalogCategoryTree';

interface ProductCatalogCategorySidebarProps {
  categoryId: string;
  flattenedCategories: readonly { category: CategoryOption; depth: number }[];
  onCategoryChange: (categoryId: string) => void;
}

export const ProductCatalogCategorySidebar: React.FC<ProductCatalogCategorySidebarProps> = ({
  categoryId,
  flattenedCategories,
  onCategoryChange,
}) => (
  <aside className="catalog-category-sidebar" aria-labelledby="support-catalog-categories-title">
    <h3 id="support-catalog-categories-title" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Categorias</h3>
    <div className="catalog-category-options" role="radiogroup" aria-labelledby="support-catalog-categories-title">
      <label className={`catalog-category-option ${!categoryId ? 'is-selected' : ''}`}>
        <input
          type="radio"
          name="support-catalog-category-sidebar"
          className="sr-only"
          checked={!categoryId}
          onChange={() => onCategoryChange('')}
        />
        <span>Todas as categorias</span>
      </label>
      {flattenedCategories.map(({ category, depth }) => (
        <label
          key={category.id}
          className={`catalog-category-option ${categoryId === category.id ? 'is-selected' : ''}`}
          style={{ paddingInlineStart: `${0.75 + depth * 0.8}rem` }}
        >
          <input
            type="radio"
            name="support-catalog-category-sidebar"
            className="sr-only"
            value={category.id}
            checked={categoryId === category.id}
            onChange={() => onCategoryChange(category.id)}
          />
          <span className="truncate">{category.name}</span>
        </label>
      ))}
    </div>
  </aside>
);
