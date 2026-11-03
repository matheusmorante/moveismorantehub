import React from 'react';
import type { CategoryType } from '../hooks/useLabelCategory';

export type { CategoryType } from '../hooks/useLabelCategory';

interface Props {
  selectedCategory: CategoryType | null;
  onSelectCategory: (category: CategoryType) => void;
}

const CATEGORIES: { id: CategoryType; label: string; icon: string; desc: string }[] = [
  {
    id: 'logos',
    label: 'Logos da Loja',
    icon: '🏢',
    desc: 'Identidade visual e logotipo para embalagens',
  },
  {
    id: 'precos',
    label: 'Etiquetas de Preço',
    icon: '🏷️',
    desc: 'Gôndola, ofertas e preços destacados',
  },
  {
    id: 'identificacao',
    label: 'QR Code / Código de Barras',
    icon: '📱',
    desc: 'Rastreio de produto e SKU',
  },
  { id: 'posts', label: 'Redes Sociais & Mídias', icon: '📸', desc: 'Artes promocionais e mídias' },
];

export const LabelPrintingCategoryTabs: React.FC<Props> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="mb-4 grid min-w-0 grid-cols-2 gap-2 sm:mb-6 sm:gap-3 md:grid-cols-4">
      {CATEGORIES.map((cat) => {
        const isActive = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`min-w-0 rounded-xl border p-2.5 text-left transition-all sm:rounded-2xl sm:p-3.5 ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-sm text-blue-900 dark:text-blue-200'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="mb-1 flex min-w-0 items-start gap-1.5 font-bold sm:items-center sm:gap-2 sm:text-sm">
              <span className="shrink-0">{cat.icon}</span>
              <span className="min-w-0 break-words text-xs leading-tight sm:text-sm">{cat.label}</span>
            </div>
            <p className="line-clamp-2 text-[10px] leading-snug text-slate-500 dark:text-slate-400 sm:line-clamp-1 sm:text-[11px]">
              {cat.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
};
