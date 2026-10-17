import React from 'react';
import type {
  TechnicalFieldDefinition,
  CharacteristicTopicGroupDefinition,
} from '@/pages/utils/technicalValuesService';

export interface TechnicalCharacteristicSearchProps {
  readonly searchTerm: string;
  readonly onSearchTermChange: (value: string) => void;
  readonly normalizedSearchTerm: string;
  readonly normalizedDebouncedSearchTerm: string;
  readonly matchingFields: TechnicalFieldDefinition[];
  readonly matchingGroups?: CharacteristicTopicGroupDefinition[];
  readonly onAddField: (field: TechnicalFieldDefinition) => void;
  readonly onAddGroup?: (group: CharacteristicTopicGroupDefinition) => void;
}

export const TechnicalCharacteristicSearch: React.FC<TechnicalCharacteristicSearchProps> = ({
  searchTerm,
  onSearchTermChange,
  normalizedSearchTerm,
  normalizedDebouncedSearchTerm,
  matchingFields,
  matchingGroups = [],
  onAddField,
  onAddGroup,
}) => {
  const hasResults = matchingGroups.length > 0 || matchingFields.length > 0;

  return (
    <div className="w-full max-w-xl space-y-1.5">
      <label
        htmlFor="technical-characteristic-search"
        className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400"
      >
        Pesquisar característica
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        <i className="bi bi-search text-slate-400" aria-hidden="true" />
        <input
          id="technical-characteristic-search"
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Digite pelo menos 3 caracteres (ex: portas, gavetas...)"
          aria-describedby="technical-characteristic-search-hint"
          className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
      </div>
      <p
        id="technical-characteristic-search-hint"
        className="text-[10px] text-slate-400 dark:text-slate-500"
        aria-live="polite"
      >
        {normalizedSearchTerm.length < 3
          ? 'Digite pelo menos 3 caracteres para pesquisar.'
          : normalizedSearchTerm !== normalizedDebouncedSearchTerm
            ? 'Buscando características...'
            : !hasResults
              ? 'Nenhuma característica encontrada.'
              : matchingGroups.length > 0
                ? 'Exibindo grupos e características correspondentes.'
                : 'Exibindo até 3 características correspondentes.'}
      </p>
      {hasResults && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-sm">
          {matchingGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onAddGroup?.(group)}
              aria-label={`Adicionar grupo ${group.title}`}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-100 bg-blue-50/40 px-3 py-2.5 text-left text-xs transition-colors hover:bg-blue-50 dark:border-slate-800 dark:bg-blue-950/20 dark:hover:bg-slate-800 cursor-pointer"
            >
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                    Grupo
                  </span>
                  {group.title}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {group.description}
                </span>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                <i className="bi bi-collection" aria-hidden="true" />
                Adicionar grupo
              </span>
            </button>
          ))}
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
