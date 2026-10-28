import { useState } from 'react';
import type VariationType from '../../../types/variation.type';
import { normalizeSearchTerm } from '../../../utils/textUtils';
import { getCharacteristicSubtitle } from '../domain/characteristicFormRules';

export interface AttributeCardProps {
  readonly attribute: VariationType;
  readonly onEdit: (attribute: VariationType) => void;
  readonly onDelete: (attribute: VariationType) => void;
}

export function AttributeCard({ attribute, onEdit, onDelete }: AttributeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article
      data-attribute-name={normalizeSearchTerm(attribute.name)}
      className="flex min-h-12 items-center gap-3 border-b border-slate-100 py-2.5 last:border-b-0 dark:border-slate-800"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{attribute.name}</span>
          <span className="text-xs text-slate-500">{getCharacteristicSubtitle(attribute)}</span>
        </div>
      </div>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="px-2 py-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          aria-label={`Abrir ações da característica ${attribute.name}`}
          aria-expanded={menuOpen}
        >
          <i className="bi bi-three-dots-vertical" aria-hidden="true" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-30 w-48 bg-white p-1 shadow-xl dark:bg-slate-900">
            <button type="button" onClick={() => { setMenuOpen(false); onEdit(attribute); }} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
              Editar característica
            </button>
            <button type="button" onClick={() => { setMenuOpen(false); onDelete(attribute); }} className="w-full px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30">
              Excluir característica
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
