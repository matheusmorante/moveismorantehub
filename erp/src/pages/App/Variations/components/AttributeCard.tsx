import { useState } from 'react';
import type VariationType from '../../../types/variation.type';
import { normalizeSearchTerm } from '../../../utils/textUtils';

export interface AttributeCardProps {
  readonly attribute: VariationType;
  readonly onEdit: (attribute: VariationType) => void;
}

export function AttributeCard({ attribute, onEdit }: AttributeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article
      data-attribute-name={normalizeSearchTerm(attribute.name)}
      className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-visible"
    >
      <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1 text-left">
          <span className="block text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 truncate">
            {attribute.name}
            {!attribute.active && (
              <span className="ml-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                • Inativa
              </span>
            )}
          </span>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label={`Abrir ações da característica ${attribute.name}`}
            aria-expanded={menuOpen}
          >
            <i className="bi bi-three-dots-vertical" aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-30 w-52 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(attribute);
                }}
                className="w-full px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <i className="bi bi-pencil mr-2" aria-hidden="true" />
                Editar característica
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
