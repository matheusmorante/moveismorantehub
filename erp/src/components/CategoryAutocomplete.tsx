import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../pages/utils/supabaseConfig';
import { matchesSearchText } from '../pages/utils/textUtils';
import DropdownPortal from './shared/DropdownPortal';
import { buildAccentInsensitiveWordsRegex } from '../../../shared-utils/searchText';

interface CategoryNode {
  id: string;
  name: string;
  parents?: string[]; // IDs of environments (if it's a category)
  parentNames?: string[];
  isEnvironment?: boolean;
}

interface CategoryAutocompleteProps {
  onSelect: (category: CategoryNode) => void;
  onRemove: (categoryId: string) => void;
  selectedIds: string[];
  onSearch?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  filter?: 'environments' | 'categories' | 'all';
}

const CategoryAutocomplete: React.FC<CategoryAutocompleteProps> = ({
  onSelect,
  onRemove,
  selectedIds,
  onSearch,
  placeholder = 'Digite pelo menos 3 caracteres para buscar...',
  className = '',
  inputClassName = 'w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400/60',
  filter = 'all',
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [resultsQuery, setResultsQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CategoryNode[]>([]);
  const [knownSelectedNodes, setKnownSelectedNodes] = useState<CategoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchReady = query.trim().length >= 3 && query.trim() === debouncedQuery;
  const selectedIdsKey = JSON.stringify(selectedIds);

  useEffect(() => {
    const ids = JSON.parse(selectedIdsKey) as string[];
    if (ids.length === 0) {
      setKnownSelectedNodes([]);
      return;
    }

    let active = true;
    const loadSelectedNames = async () => {
      try {
        const [categoryResult, environmentResult] = await Promise.all([
          supabase.from('categories').select('id, name').in('id', ids),
          supabase.from('environments').select('id, name').in('id', ids),
        ]);
        if (!active || categoryResult.error || environmentResult.error) return;
        setKnownSelectedNodes([
          ...(categoryResult.data || []).map((category) => ({ ...category, isEnvironment: false })),
          ...(environmentResult.data || []).map((environment) => ({ ...environment, isEnvironment: true })),
        ]);
      } catch {
        // Preserve current selected labels if the metadata lookup is temporarily unavailable.
      }
    };

    void loadSelectedNames();
    return () => { active = false; };
  }, [selectedIdsKey]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      setDebouncedQuery('');
      return;
    }

    const timeoutId = setTimeout(() => setDebouncedQuery(trimmedQuery), 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmedQuery = debouncedQuery.trim();
    if (trimmedQuery.length < 3) {
      setSuggestions([]);
      setResultsQuery('');
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setSearchFailed(false);
    const pattern = buildAccentInsensitiveWordsRegex(trimmedQuery);

    const searchCategories = async () => {
      try {
        const [environmentResult, categoryResult] = await Promise.all([
          filter !== 'categories'
            ? supabase.from('environments').select('id, name').filter('name', 'imatch', pattern).order('name').limit(5)
            : Promise.resolve({ data: [], error: null }),
          filter !== 'environments'
            ? supabase.from('categories').select('id, name').filter('name', 'imatch', pattern).order('name').limit(5)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (environmentResult.error) throw environmentResult.error;
        if (categoryResult.error) throw categoryResult.error;
        if (!active) return;

        const categoryRows = categoryResult.data || [];
        let relations: Array<{ environment_id: string; category_id: string }> = [];
        if (categoryRows.length > 0) {
          const relationResult = await supabase
            .from('environment_categories')
            .select('environment_id, category_id')
            .in('category_id', categoryRows.map((category) => category.id));
          if (relationResult.error) throw relationResult.error;
          relations = relationResult.data || [];
        }
        if (!active) return;

        const parentIds = [...new Set(relations.map((relation) => relation.environment_id))].slice(0, 5);
        const parentResult = parentIds.length > 0
          ? await supabase.from('environments').select('id, name').in('id', parentIds)
          : { data: [], error: null };
        if (parentResult.error) throw parentResult.error;
        if (!active) return;
        const parentNames = new Map((parentResult.data || []).map((parent) => [parent.id, parent.name]));

        const nodes: CategoryNode[] = [
          ...(environmentResult.data || []).map((environment) => ({
            id: environment.id,
            name: environment.name,
            isEnvironment: true,
            parents: [],
          })),
          ...categoryRows.map((category) => ({
            id: category.id,
            name: category.name,
            isEnvironment: false,
            parents: relations
              .filter((relation) => relation.category_id === category.id)
              .map((relation) => relation.environment_id),
            parentNames: relations
              .filter((relation) => relation.category_id === category.id)
              .map((relation) => parentNames.get(relation.environment_id))
              .filter((name): name is string => Boolean(name)),
          })),
        ];
        setSuggestions(
          nodes
            .filter((node) => matchesSearchText(node.name, trimmedQuery))
            .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
            .slice(0, 5),
        );
        setResultsQuery(trimmedQuery);
      } catch {
        if (active) {
          setSuggestions([]);
          setResultsQuery(trimmedQuery);
          setSearchFailed(true);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void searchCategories();
    return () => { active = false; };
  }, [debouncedQuery, filter]);

  const handleSelect = (category: CategoryNode) => {
    setKnownSelectedNodes((current) => [
      ...current.filter((node) => node.id !== category.id),
      category,
    ]);
    onSelect(category);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className={`relative flex flex-col gap-3 ${className}`}>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-1">
          {selectedIds.map((id) => {
            const cat = knownSelectedNodes.find((c) => c.id === id);
            if (!cat) return null;
            return (
              <div
                key={id}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl animate-in zoom-in-95 duration-200"
              >
                <span>{cat.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  className="hover:text-red-200 transition-colors"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <i className="bi bi-tag absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className={inputClassName}
          />
          {isLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <i className="bi bi-arrow-repeat animate-spin text-blue-500"></i>
            </div>
          )}
        </div>

        {onSearch && (
          <button
            type="button"
            onClick={onSearch}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded-2xl hover:bg-blue-100 transition-all shadow-sm md:hidden"
            title="Busca Avançada"
          >
            <i className="bi bi-search"></i>
          </button>
        )}
      </div>

      <DropdownPortal anchorRef={wrapperRef} isOpen={showSuggestions && query.trim().length > 0}>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 p-2 space-y-1">
          {query.trim().length < 3 ? (
            <div className="p-4 text-center text-xs font-semibold text-slate-500">
              Digite pelo menos 3 caracteres para buscar.
            </div>
          ) : !searchReady || isLoading || resultsQuery !== debouncedQuery ? (
            <div className="p-4 text-center text-xs font-semibold text-slate-500">Buscando...</div>
          ) : searchFailed ? (
            <div className="p-4 text-center text-xs font-semibold text-red-500">
              Não foi possível buscar categorias. Tente novamente.
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((cat) => {
              const isSelected = selectedIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  disabled={isSelected}
                  className={`w-full px-4 py-3 text-left rounded-xl transition-all flex items-center justify-between group ${isSelected ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {cat.name}
                    </span>
                    {!cat.isEnvironment && cat.parents && cat.parents.length > 0 && (
                      <span className="text-[9px] uppercase font-black text-slate-400">
                        {cat.parentNames?.[0] || 'Ambiente'} &gt;
                        Categoria
                      </span>
                    )}
                    {cat.isEnvironment && (
                      <span className="text-[9px] uppercase font-black text-blue-500">
                        Ambiente
                      </span>
                    )}
                  </div>
                  {!isSelected && (
                    <i className="bi bi-plus-lg text-blue-500 opacity-0 group-hover:opacity-100 transition-all"></i>
                  )}
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <i className="bi bi-search text-2xl text-slate-200 mb-2 block"></i>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                Nenhum resultado encontrado
              </p>
            </div>
          )}
        </div>
      </DropdownPortal>
    </div>
  );
};

export default CategoryAutocomplete;
