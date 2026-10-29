import React from 'react';
import type {
  TechnicalFieldDefinition,
  CharacteristicTopicGroupDefinition,
} from '@/pages/utils/technicalValuesService';
import { getTechnicalFieldDisplayName } from '../../../../../../../../shared-utils/productTechnicalFieldScope';
import { isCatalogNeverRequiredCharacteristicName } from '../../../../../../../../shared-utils/catalogPublication/requiredCharacteristicPolicy';
import type { ProductCharacteristicGroupView } from './productCharacteristicGroupRules';

export interface TechnicalCharacteristicSearchProps {
  readonly searchTerm: string;
  readonly onSearchTermChange: (value: string) => void;
  readonly normalizedSearchTerm: string;
  readonly normalizedDebouncedSearchTerm: string;
  readonly matchingFields: TechnicalFieldDefinition[];
  readonly matchingGroups?: CharacteristicTopicGroupDefinition[];
  readonly matchingProductGroups?: readonly ProductCharacteristicGroupView[];
  readonly matchingProductGroupFields?: readonly {
    field: TechnicalFieldDefinition;
    disabledReason?: string;
    scope?: 'not_inform' | 'global' | 'variation';
    selected?: boolean;
    active?: boolean;
  }[];
  readonly isSimpleProduct?: boolean;
  readonly onAddField: (field: TechnicalFieldDefinition) => void;
  readonly onAddGroup?: (group: CharacteristicTopicGroupDefinition) => void;
  readonly onAddCharacteristicGroup?: (groupId: string, characteristicName?: string) => void;
  readonly onToggleCharacteristic?: (field: TechnicalFieldDefinition) => void;
  readonly onSetCharacteristicScope?: (
    field: TechnicalFieldDefinition,
    scope: 'not_inform' | 'global' | 'variation'
  ) => void;
  readonly onLocateCharacteristic?: (field: TechnicalFieldDefinition) => void;
  readonly onLocateGroup?: (groupId: string) => void;
}

export const TechnicalCharacteristicSearch: React.FC<TechnicalCharacteristicSearchProps> = ({
  searchTerm,
  onSearchTermChange,
  normalizedSearchTerm,
  normalizedDebouncedSearchTerm,
  matchingFields,
  matchingGroups = [],
  matchingProductGroups = [],
  matchingProductGroupFields = [],
  isSimpleProduct = true,
  onAddField,
  onAddGroup,
  onAddCharacteristicGroup,
  onToggleCharacteristic,
  onSetCharacteristicScope,
  onLocateCharacteristic,
  onLocateGroup,
}) => {
  const hasResults =
    matchingFields.length > 0 ||
    matchingGroups.length > 0 ||
    matchingProductGroups.length > 0 ||
    matchingProductGroupFields.length > 0;

  return (
    <div className="w-full max-w-xl space-y-1.5">
      <div className="flex items-center gap-2 border-x-0 border-t-0 border-b-2 border-slate-200 bg-transparent px-1 py-2 focus-within:border-blue-500 dark:border-slate-700 dark:bg-transparent dark:focus-within:border-blue-400">
        <i className="bi bi-search text-slate-400" aria-hidden="true" />
        <input
          id="technical-characteristic-search"
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Pesquisar grupos ou características..."
          aria-label="Pesquisar característica"
          aria-describedby="technical-characteristic-search-hint"
          className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
      </div>
      <p
        id="technical-characteristic-search-hint"
        className="text-[10px] text-slate-400 dark:text-slate-500"
        aria-live="polite"
      >
        {normalizedSearchTerm.length >= 3 && (normalizedSearchTerm !== normalizedDebouncedSearchTerm
            ? 'Buscando características...'
            : !hasResults
              ? 'Nenhuma característica encontrada.'
              : 'Resultados agrupados por grupo.')}
      </p>
      {hasResults && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-sm">
          {matchingProductGroups.map((group) => {
            const groupFields = matchingProductGroupFields.filter(
              ({ field }) => field.groupId === group.id
            );
            const groupAlreadyExists = group.fields.length > 0;
            return (
              <section key={`group-${group.id}`} aria-label={`Grupo ${group.name}`} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                  <span className="truncate font-semibold text-slate-700 dark:text-slate-200">{group.name}</span>
                  {groupAlreadyExists && (
                      <button
                        type="button"
                        onClick={() => onLocateGroup?.(group.id)}
                        aria-label={`Localizar grupo ${group.name}`}
                        className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Localizar
                      </button>
                  )}
                </div>
                {groupFields.map(({ field, disabledReason, scope = 'not_inform', active = false }) => {
                  const fieldIsPresent = group.fields.some((existing) => existing.id === field.id);
                  const isRequired = !isCatalogNeverRequiredCharacteristicName(field.name) &&
                    Boolean(field.isRequired || field.isRequiredForCatalog);
                  const canToggle = isSimpleProduct && !isRequired && Boolean(onToggleCharacteristic);
                  const canSelectScope = !isSimpleProduct && !isRequired && Boolean(onSetCharacteristicScope);
                  return (
                    <div
                      key={`group-field-${field.id}`}
                      className="flex w-full items-center justify-between gap-3 px-5 py-2 text-xs text-slate-700 dark:text-slate-200"
                    >
                      {fieldIsPresent ? (
                        <button
                          type="button"
                          onClick={() => onLocateCharacteristic?.(field)}
                          aria-label={`Localizar característica ${getTechnicalFieldDisplayName(field.name)}`}
                          className="min-w-0 truncate text-left hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {getTechnicalFieldDisplayName(field.name)}{field.unit ? ` (${field.unit})` : ''}
                        </button>
                      ) : (
                        <span className="min-w-0 truncate" title={disabledReason}>
                          {getTechnicalFieldDisplayName(field.name)}{field.unit ? ` (${field.unit})` : ''}
                        </span>
                      )}
                      {canToggle ? (
                        <button
                          type="button"
                          role="switch"
                          aria-label={`Ativar característica ${field.name}`}
                          aria-checked={active}
                          disabled={Boolean(disabledReason)}
                          title={disabledReason}
                          onClick={() => onToggleCharacteristic?.(field)}
                          className={`relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900 ${
                            active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span className={`absolute left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200 ${
                            active ? 'translate-x-[18px]' : 'translate-x-0'
                          }`} />
                        </button>
                      ) : canSelectScope ? (
                        <select
                          aria-label={`Escopo da característica ${field.name}`}
                          value={scope}
                          disabled={Boolean(disabledReason)}
                          title={disabledReason}
                          onChange={(event) => onSetCharacteristicScope?.(
                            field,
                            event.target.value as 'not_inform' | 'global' | 'variation'
                          )}
                          className="max-w-32 shrink-0 border-b border-slate-300 bg-transparent py-1 text-[10px] disabled:opacity-60 dark:border-slate-700"
                        >
                          <option value="not_inform">Não informar</option>
                          <option value="global">Global</option>
                          <option value="variation">Por variações</option>
                        </select>
                      ) : fieldIsPresent ? null : (
                        <button
                          type="button"
                          disabled={Boolean(disabledReason)}
                          onClick={() => onAddCharacteristicGroup?.(group.id, field.name)}
                          aria-label={`Adicionar característica ${getTechnicalFieldDisplayName(field.name)}`}
                          title={disabledReason}
                          className="font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
                        >
                          Adicionar
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
          {matchingGroups.map((group) => (
            <button
              key={`legacy-group-${group.id}`}
              type="button"
              onClick={() => onAddGroup?.(group)}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-700 transition-colors last:border-b-0 hover:bg-blue-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span className="truncate font-semibold">Grupo · {group.title}</span>
              <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">
                {group.fieldNames.length} características
              </span>
            </button>
          ))}
          {matchingFields.map((field) => (
            <button
              key={field.id}
              type="button"
              onClick={() => onAddField(field)}
              aria-label={`Selecionar característica ${getTechnicalFieldDisplayName(field.name)}`}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-700 transition-colors last:border-b-0 hover:bg-blue-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span className="truncate">
                {getTechnicalFieldDisplayName(field.name)}
                {field.unit ? ` (${field.unit})` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
