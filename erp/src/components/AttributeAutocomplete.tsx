import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../pages/utils/supabaseConfig';
import { normalizeSearchTerm } from '../pages/utils/textUtils';
import DropdownPortal from './shared/DropdownPortal';
import { isCategoryAttributeSelectable } from '../../../shared-utils/categoryAttributeSelection';
import { withCatalogAttributesLoadTimeout } from '../../../shared-utils/catalogAttributesLoadTimeout';
import { buildPostgrestAccentInsensitivePattern } from '../../../shared-utils/searchText';

export interface AttributeNode {
  id: string;
  name: string;
}

interface AttributeRow {
  id: string;
  name: string;
}

interface AttributeAutocompleteProps {
  onSelect: (attribute: AttributeNode) => void;
  selectedIds: string[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

const AttributeAutocomplete: React.FC<AttributeAutocompleteProps> = ({
  onSelect,
  selectedIds,
  placeholder = 'Digite para buscar atributos (ex: Cor, Voltagem)...',
  className = '',
  inputClassName = 'w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400/60',
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [resultsQuery, setResultsQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AttributeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchReady = query.trim().length >= 3 && query.trim() === debouncedQuery;

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setDebouncedQuery('');
      return;
    }

    const timeoutId = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setResultsQuery('');
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setLoadFailed(false);
    const escapedQuery = trimmed.replace(/[\\%_]/g, '\\$&');

    const fetchSuggestions = async () => {
      try {
        const { data, error } = await withCatalogAttributesLoadTimeout(
          supabase
            .from('attributes')
            .select('id, name')
            .filter('name', 'imatch', buildPostgrestAccentInsensitivePattern(trimmed))
            .order('name')
            .limit(5),
          'erp:category-attributes:search',
        );
        if (error) throw error;
        if (!active) return;

        const normalizedQuery = normalizeSearchTerm(trimmed);
        const filtered = ((data || []) as AttributeRow[])
          .filter((attribute) => isCategoryAttributeSelectable(String(attribute.name)))
          .filter((attribute) => normalizeSearchTerm(attribute.name).includes(normalizedQuery))
          .slice(0, 5)
          .map(({ id, name }) => ({ id, name }));
        setSuggestions(filtered);
        setResultsQuery(trimmed);
        setActiveIndex(0);
      } catch {
        if (active) {
          setSuggestions([]);
          setResultsQuery(trimmed);
          setLoadFailed(true);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void fetchSuggestions();
    return () => { active = false; };
  }, [debouncedQuery, searchAttempt]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (node: AttributeNode) => {
    onSelect(node);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setShowSuggestions(false);
      return;
    }

    if (!showSuggestions || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (suggestions[activeIndex]) {
        handleToggle(suggestions[activeIndex]);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName}
          autoComplete="off"
          disabled={disabled}
        />
        {isLoading && (
          <i className="bi bi-arrow-repeat absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
        )}
      </div>
      <DropdownPortal
        isOpen={showSuggestions && query.trim().length > 0}
        anchorRef={wrapperRef}
        onClose={() => setShowSuggestions(false)}
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar p-2">
          {query.trim().length < 3 ? (
            <div className="p-4 text-center text-xs font-semibold text-slate-500">
              Digite pelo menos 3 caracteres para buscar.
            </div>
          ) : !searchReady || isLoading || resultsQuery !== debouncedQuery ? (
            <div className="p-4 text-center text-xs font-semibold text-slate-500">Buscando...</div>
          ) : loadFailed ? (
            <div role="alert" className="p-4 text-center text-xs font-semibold text-red-500">
              <p>Não foi possível buscar características.</p>
              <button
                type="button"
                onClick={() => setSearchAttempt((attempt) => attempt + 1)}
                className="mt-2 font-bold underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-4 text-center text-xs font-semibold text-slate-500">
              Nenhuma característica encontrada para &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {suggestions.slice(0, 5).map((node, index) => {
                const isChecked = selectedIds.includes(node.id);
                return (
                  <button
                    type="button"
                    key={node.id}
                    onClick={() => handleToggle(node)}
                    className={`flex items-center justify-between w-full text-left p-2.5 rounded-xl transition-all ${
                      index === activeIndex
                        ? 'bg-blue-50/70 dark:bg-blue-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // controlado pelo clique do container
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                      />
                      <span
                        className={`text-xs font-semibold truncate ${
                          isChecked
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {node.name}
                      </span>
                    </div>
                    {isChecked && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                        Ativo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DropdownPortal>
    </div>
  );
};

export default AttributeAutocomplete;
