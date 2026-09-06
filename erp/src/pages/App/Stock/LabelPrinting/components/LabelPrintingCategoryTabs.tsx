import React from 'react';

export type CategoryType = 'identificacao' | 'precos' | 'logos' | 'posts';

interface Props {
  selectedCategory: CategoryType | null;
  onSelectCategory: (category: CategoryType) => void;
}

const CATEGORIES: { id: CategoryType; label: string; icon: string; desc: string }[] = [
  { id: 'logos', label: 'Logos da Loja', icon: '🏢', desc: 'Identidade visual e logotipo para embalagens' },
  { id: 'precos', label: 'Etiquetas de Preço', icon: '🏷️', desc: 'Gôndola, ofertas e preços destacados' },
  { id: 'identificacao', label: 'QR Code / Código de Barras', icon: '📱', desc: 'Rastreio de produto e SKU' },
  { id: 'posts', label: 'Redes Sociais & Mídias', icon: '📸', desc: 'Artes promocionais e mídias' },
];

export const LabelPrintingCategoryTabs: React.FC<Props> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {CATEGORIES.map((cat) => {
        const isActive = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-sm text-blue-900 dark:text-blue-200'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{cat.desc}</p>
          </button>
        );
      })}
    </div>
  );
};
