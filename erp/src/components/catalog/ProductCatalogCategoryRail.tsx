import type React from 'react';
import type { CategoryOption } from './productCatalogCategoryTree';

interface ProductCatalogCategoryRailProps {
  categories: ReadonlyArray<{ category: CategoryOption; depth: number }>;
  categoryId: string;
  total: number;
  onSelectCategory: (categoryId: string) => void;
}

export const ProductCatalogCategoryRail: React.FC<ProductCatalogCategoryRailProps> = ({
  categories,
  categoryId,
  total,
  onSelectCategory,
}) => (
  <aside className="catalog-category-rail" aria-label="Categorias do catálogo">
    <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
      Categorias
    </p>
    <button
      type="button"
      aria-pressed={!categoryId}
      onClick={() => onSelectCategory('')}
      className={`catalog-category-option ${!categoryId ? 'is-active' : ''}`}
    >
      <span>Todos</span><span>{!categoryId ? total : ''}</span>
    </button>
    {categories.map(({ category, depth }) => (
      <button
        key={category.id}
        type="button"
        aria-pressed={categoryId === category.id}
        onClick={() => onSelectCategory(category.id)}
        style={{ paddingLeft: `${12 + Math.min(depth, 5) * 12}px` }}
        className={`catalog-category-option ${categoryId === category.id ? 'is-active' : ''}`}
      >
        <span className="truncate">{category.name}</span>
      </button>
    ))}
  </aside>
);
