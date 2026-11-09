import React from 'react';
import { CATEGORY_LABELS } from './knowledgeCategories';

interface KnowledgeFilterBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

export const KnowledgeFilterBar: React.FC<KnowledgeFilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <i
          className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Buscar por termo ou conteúdo no conhecimento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setSelectedCategory('todos')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 ${
            selectedCategory === 'todos'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          Todas
        </button>
        {Object.entries(CATEGORY_LABELS).map(([catKey, item]) => (
          <button
            key={catKey}
            type="button"
            onClick={() => setSelectedCategory(catKey)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 ${
              selectedCategory === catKey
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
