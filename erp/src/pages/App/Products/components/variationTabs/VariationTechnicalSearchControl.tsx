import React from 'react';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

export interface VariationTechnicalSearchControlProps {
  readonly searchTerm: string;
  readonly debouncedSearchTerm: string;
  readonly matchingFields: readonly TechnicalFieldDefinition[];
  readonly onSearchTermChange: (value: string) => void;
  readonly onAddField: (field: TechnicalFieldDefinition) => void;
}

export const VariationTechnicalSearchControl: React.FC<VariationTechnicalSearchControlProps> = ({
  searchTerm,
  debouncedSearchTerm,
  matchingFields,
  onSearchTermChange,
  onAddField,
}) => {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const normalizedDebouncedSearchTerm = debouncedSearchTerm.trim().toLowerCase();

  return (
    <div className="w-full max-w-xl space-y-1.5">
      <label
        htmlFor="variation-technical-characteristic-search"
        className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400"
      >
        Pesquisar característica
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        <i className="bi bi-search text-slate-400" aria-hidden="true" />
        <input
          id="variation-technical-characteristic-search"
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Digite pelo menos 3 caracteres"
          aria-describedby="variation-technical-characteristic-search-hint"
          className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
      </div>
      <p
        id="variation-technical-characteristic-search-hint"
        className="text-[10px] text-slate-400 dark:text-slate-500"
        aria-live="polite"
      >
        {normalizedSearchTerm.length < 3
          ? 'Digite pelo menos 3 caracteres para pesquisar.'
          : normalizedSearchTerm !== normalizedDebouncedSearchTerm
            ? 'Buscando características...'
            : matchingFields.length === 0
              ? 'Nenhuma característica encontrada.'
              : 'Exibindo até 3 características correspondentes.'}
      </p>
      {matchingFields.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {matchingFields.map((field) => (
            <button
              key={field.id}
              type="button"
              onClick={() => onAddField(field)}
              aria-label={`Adicionar característica ${field.name}`}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-700 transition-colors last:border-b-0 hover:bg-blue-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span className="truncate">
                {field.name}
                {field.unit ? ` (${field.unit})` : ''}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                <i className="bi bi-plus-circle" aria-hidden="true" />
                Adicionar
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
