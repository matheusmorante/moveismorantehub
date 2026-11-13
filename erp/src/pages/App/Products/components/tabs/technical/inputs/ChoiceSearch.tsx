import React, { useMemo, useState, useEffect, useRef } from 'react';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';
import {
  PRODUCT_TECHNICAL_CHOICE_INLINE_OPTION_LIMIT,
  PRODUCT_TECHNICAL_CHOICE_SEARCH_DEBOUNCE_MS,
  PRODUCT_TECHNICAL_CHOICE_SEARCH_MAX_RESULTS,
  PRODUCT_TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS,
} from '../../../../../../../../../shared-utils/productTechnicalFieldRules';
import { searchProductTechnicalChoiceOptions } from '../../../../../../../../../shared-utils/productTechnicalChoiceSearch';

export const SIMPLE_CHOICE_DROPDOWN_LIMIT = PRODUCT_TECHNICAL_CHOICE_INLINE_OPTION_LIMIT;
export const MIN_CHOICE_SEARCH_CHARACTERS = PRODUCT_TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS;
export const MAX_CHOICE_SEARCH_RESULTS = PRODUCT_TECHNICAL_CHOICE_SEARCH_MAX_RESULTS;
export const CHOICE_SEARCH_DEBOUNCE_MS = PRODUCT_TECHNICAL_CHOICE_SEARCH_DEBOUNCE_MS;

interface ChoiceSearchProps {
  options?: readonly { id?: string; value: string }[];
  value: string | string[];
  disabled?: boolean;
  multiple: boolean;
  onChange: (v: any) => void;
  onCreateOption?: (value: string) => Promise<{ id?: string; value: string } | null>;
  createOptionLabel?: string;
}

export const ChoiceSearch: React.FC<ChoiceSearchProps> = ({
  options = [],
  value,
  disabled,
  multiple,
  onChange,
  onCreateOption,
  createOptionLabel,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [hasBlurredQuery, setHasBlurredQuery] = useState(false);
  const [isCreatingOption, setIsCreatingOption] = useState(false);
  const [createdOptions, setCreatedOptions] = useState<{ id?: string; value: string }[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const rawArray = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.includes('+')
      ? value.split('+').map((s) => s.trim()).filter(Boolean)
      : [value].filter(Boolean);

  const selected = rawArray
    .map((item) => String(item).trim())
    .filter(
      (item) => item && normalizeSearchTerm(item) !== normalizeSearchTerm('Não se aplica')
    );
  const term = normalizeSearchTerm(query);
  const availableOptions = useMemo(() => {
    const existingValues = new Set(options.map((option) => normalizeSearchTerm(option.value)));
    return [
      ...options,
      ...createdOptions.filter((option) => !existingValues.has(normalizeSearchTerm(option.value))),
    ];
  }, [options, createdOptions]);
  const exactOption = availableOptions.find((option) => normalizeSearchTerm(option.value) === term);
  const canCreateOption = Boolean(
    !multiple && onCreateOption && !disabled && hasBlurredQuery && query.trim() && !exactOption
  );

  useEffect(() => {
    if (term.length < MIN_CHOICE_SEARCH_CHARACTERS) {
      setDebouncedTerm('');
      return;
    }

    const timeoutId = window.setTimeout(
      () => setDebouncedTerm(term),
      CHOICE_SEARCH_DEBOUNCE_MS
    );
    return () => window.clearTimeout(timeoutId);
  }, [term]);

  const isSearchActive = term.length >= MIN_CHOICE_SEARCH_CHARACTERS && debouncedTerm === term;
  const matchingOptions = useMemo(() => {
    return isSearchActive
      ? searchProductTechnicalChoiceOptions(availableOptions, debouncedTerm)
      : [];
  }, [availableOptions, debouncedTerm, isSearchActive]);

  const filtered = matchingOptions;
  const isSelected =
    !multiple &&
    (term.length === 0
      ? selected.length > 0
      : isSearchActive && selected.some((item) => normalizeSearchTerm(item) === debouncedTerm));

  useEffect(() => {
    const closeSuggestions = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (onCreateOption && query.trim() && !exactOption) {
          setHasBlurredQuery(true);
        } else {
          setQuery('');
          setHasBlurredQuery(false);
        }
      }
    };
    document.addEventListener('mousedown', closeSuggestions);
    return () => document.removeEventListener('mousedown', closeSuggestions);
  }, [exactOption, onCreateOption, query]);

  const handleCreateOption = async () => {
    if (!canCreateOption || !onCreateOption || isCreatingOption) return;
    setIsCreatingOption(true);
    try {
      const created = await onCreateOption(query.trim());
      if (!created) return;
      setCreatedOptions((previous) =>
        previous.some((option) => normalizeSearchTerm(option.value) === normalizeSearchTerm(created.value))
          ? previous
          : [...previous, created]
      );
      onChange(created.value);
      setQuery('');
      setIsOpen(false);
      setHasBlurredQuery(false);
    } finally {
      setIsCreatingOption(false);
    }
  };

  const inputPlaceholder = multiple
    ? selected.length > 0
      ? `Digite pelo menos ${MIN_CHOICE_SEARCH_CHARACTERS} caracteres para adicionar opções...`
      : `Digite pelo menos ${MIN_CHOICE_SEARCH_CHARACTERS} caracteres para pesquisar...`
    : `Digite pelo menos ${MIN_CHOICE_SEARCH_CHARACTERS} caracteres para pesquisar...`;

  const displayInputValue = multiple ? query : query || selected.join(', ');

  return (
    <div ref={searchRef} className="relative space-y-1.5">
      {multiple && selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
            >
              <span>{item}</span>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={displayInputValue}
          disabled={disabled}
          onFocus={() => {
            if (!disabled) {
              setHasBlurredQuery(false);
              setIsOpen(true);
            }
          }}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={(e) => {
            const nextQuery = e.target.value;
            setQuery(nextQuery);
            setHasBlurredQuery(false);
            if (!isOpen) setIsOpen(true);
            if (!multiple && !nextQuery.trim() && selected.length > 0) onChange('');
          }}
          onBlur={(event) => {
            if (!onCreateOption) return;
            if (exactOption) {
              onChange(exactOption.value);
              setQuery('');
              setIsOpen(false);
              setHasBlurredQuery(false);
              return;
            }
            setHasBlurredQuery(Boolean(onCreateOption && query.trim()));
            if (!searchRef.current?.contains(event.relatedTarget as Node | null)) {
              setIsOpen(false);
            }
          }}
          placeholder={inputPlaceholder}
          className={`w-full border-b-2 border-t-0 border-x-0 rounded-none bg-transparent py-2 pr-8 text-xs outline-none ${
            isSelected
              ? 'border-emerald-500 text-slate-900 focus:border-emerald-600 dark:border-emerald-400 dark:text-slate-100 dark:focus:border-emerald-300'
              : 'border-slate-300 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-400'
          }`}
        />
        {isSelected && (
          <i
            className="bi bi-check-lg absolute right-1 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
            aria-label="Opção selecionada"
          />
        )}
        {canCreateOption && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void handleCreateOption()}
            disabled={isCreatingOption}
            title={`Cadastrar esta ${createOptionLabel || 'opção'}`}
            aria-label={`Cadastrar ${createOptionLabel || 'nova opção'}`}
            aria-busy={isCreatingOption}
            className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isCreatingOption ? (
              <i className="bi bi-arrow-repeat animate-spin text-xs" aria-hidden="true" />
            ) : (
              <i className="bi bi-check-lg text-sm font-black" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in slide-in-from-top-1">
          {!isSearchActive ? (
            <span className="text-[10px] text-slate-400 p-1">
              {term.length < MIN_CHOICE_SEARCH_CHARACTERS
                ? `Digite pelo menos ${MIN_CHOICE_SEARCH_CHARACTERS} caracteres para pesquisar.`
                : 'Aguarde para exibir as opções...'}
            </span>
          ) : filtered.length === 0 ? (
            <span className="text-[10px] text-slate-400 p-1">Nenhuma opção encontrada.</span>
          ) : (
            filtered.map((option) =>
              multiple ? (
                <label
                  key={option.id || option.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs transition-colors"
                >
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={selected.includes(option.value)}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...selected, option.value]
                          : selected.filter((selectedValue) => selectedValue !== option.value)
                      )
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-200">{option.value}</span>
                </label>
              ) : (
                <button
                  key={option.id || option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
                >
                  {option.value}
                </button>
              )
            )
          )}
        </div>
      )}
    </div>
  );
};
