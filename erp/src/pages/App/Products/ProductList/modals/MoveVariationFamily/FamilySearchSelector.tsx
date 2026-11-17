import React, { useState } from 'react';
import { Family, familyName, familySku, normalize } from './utils';

interface FamilySearchSelectorProps {
  readonly families: readonly Family[];
  readonly familySearch: string;
  readonly setFamilySearch: (value: string) => void;
  readonly suggestionLoading: boolean;
  readonly suggestionError: string;
  readonly retrySuggestions: () => void;
  readonly targetFamilyId: string;
  readonly setTargetFamilyId: (id: string) => void;
  readonly selectFamily: (family: Family) => void;
}

export const FamilySearchSelector: React.FC<FamilySearchSelectorProps> = ({
  families,
  familySearch,
  setFamilySearch,
  suggestionLoading,
  suggestionError,
  retrySuggestions,
  targetFamilyId,
  setTargetFamilyId,
  selectFamily,
}) => {
  const [isFamilySuggestionsOpen, setIsFamilySuggestionsOpen] = useState(false);

  const normalizedFamilySearch = normalize(familySearch);
  const familySuggestions =
    normalizedFamilySearch.length >= 3 && !targetFamilyId ? families.slice(0, 5) : [];

  return (
    <div className="relative z-50">
      <label
        htmlFor="new-family-search"
        className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200"
      >
        Novo produto pai
      </label>
      <div className="relative mt-2">
        <input
          id="new-family-search"
          value={familySearch}
          onChange={(event) => {
            setFamilySearch(event.target.value);
            if (targetFamilyId) setTargetFamilyId('');
            setIsFamilySuggestionsOpen(true);
          }}
          onFocus={() => setIsFamilySuggestionsOpen(true)}
          placeholder="Digite ao menos 3 caracteres do nome ou código do produto pai..."
          autoComplete="off"
          style={targetFamilyId ? { borderBottomColor: '#10b981' } : undefined}
          className={`w-full rounded-none border-0 border-b-2 border-slate-200 bg-transparent py-4 pl-4 pr-12 text-base font-medium outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-0 dark:border-slate-700 dark:text-slate-100 ${
            targetFamilyId
              ? 'text-slate-900 dark:text-slate-100 font-bold border-emerald-500 dark:border-emerald-400 focus:border-emerald-600'
              : ''
          }`}
        />
        {targetFamilyId && (
          <i className="bi bi-check-lg absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-lg font-bold" />
        )}
      </div>
      {isFamilySuggestionsOpen && !targetFamilyId && normalizedFamilySearch.length >= 3 && (
        <div className="absolute z-[10060] mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {suggestionLoading ? (
            <p role="status" className="p-4 text-xs text-slate-500 text-center font-medium">
              Buscando produtos pai…
            </p>
          ) : suggestionError ? (
            <div className="p-4 text-center">
              <p role="alert" className="text-xs text-rose-600 font-medium">{suggestionError}</p>
              <button type="button" onClick={retrySuggestions} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">
                Consultar novamente
              </button>
            </div>
          ) : familySuggestions.length > 0 ? (
            familySuggestions.map((family) => (
              <button
                type="button"
                key={family.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  selectFamily(family);
                  setIsFamilySuggestionsOpen(false);
                }}
                className="flex w-full flex-col px-4 py-3 text-left hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {familyName(family)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Código: {familySku(family) || 'não informado'}
                </span>
              </button>
            ))
          ) : (
            <p className="p-4 text-xs text-slate-500 text-center font-medium">
              Nenhum produto pai encontrado.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
