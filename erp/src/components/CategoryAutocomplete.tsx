import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../pages/utils/supabaseConfig';
import { normalizeSearchTerm } from '../pages/utils/textUtils';
import DropdownPortal from './shared/DropdownPortal';

interface CategoryNode {
    id: string;
    name: string;
    parents?: string[]; // IDs of environments (if it's a category)
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
    placeholder = "Digite para buscar...",
    className = "",
    inputClassName = "w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400/60",
    filter = "all"
}) => {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<CategoryNode[]>([]);
    const [allNodes, setAllNodes] = useState<CategoryNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            const { data: envs } = await supabase.from('environments').select('id, name').order('name');
            const { data: cats } = await supabase.from('categories').select('id, name').order('name');
            const { data: rels } = await supabase.from('environment_categories').select('environment_id, category_id');
            
            const nodes: CategoryNode[] = [];

            if (envs) {
                nodes.push(...envs.map((e: any) => ({
                    id: e.id,
                    name: e.name,
                    isEnvironment: true,
                    parents: []
                })));
            }

            if (cats) {
                nodes.push(...cats.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    isEnvironment: false,
                    parents: rels?.filter((r: any) => r.category_id === c.id).map((r: any) => r.environment_id) || []
                })));
            }

            setAllNodes(nodes);
            setIsLoading(false);
        };
        
        fetchAll();

        window.addEventListener('focus', fetchAll);
        return () => {
            window.removeEventListener('focus', fetchAll);
        };
    }, []);

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
        const filteredList = allNodes.filter(c => {
            if (filter === 'all') return true;
            if (filter === 'environments') return c.isEnvironment;
            if (filter === 'categories') return !c.isEnvironment;
            return true;
        });

        if (query.trim() === "") {
            setSuggestions(filteredList.slice(0, 30));
            return;
        }

        const normQuery = normalizeSearchTerm(query);
        const filtered = filteredList.filter(c => 
            normalizeSearchTerm(c.name).includes(normQuery)
        ).slice(0, 50);
        
        setSuggestions(filtered);
    }, [query, allNodes, filter]);

    const handleSelect = (category: CategoryNode) => {
        onSelect(category);
        setQuery("");
    };

    return (
        <div ref={wrapperRef} className={`relative flex flex-col gap-3 ${className}`}>
            {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-1">
                    {selectedIds.map(id => {
                        const cat = allNodes.find(c => c.id === id);
                        if (!cat) return null;
                        return (
                            <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl animate-in zoom-in-95 duration-200">
                                <span>{cat.name}</span>
                                <button type="button" onClick={() => onRemove(id)} className="hover:text-red-200 transition-colors">
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
                        className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded-2xl hover:bg-blue-100 transition-all shadow-sm"
                        title="Busca Avançada"
                    >
                        <i className="bi bi-search"></i>
                    </button>
                )}
            </div>

            <DropdownPortal anchorRef={wrapperRef} isOpen={showSuggestions}>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 p-2 space-y-1">
                    {suggestions.length > 0 ? (
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
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{cat.name}</span>
                                        {!cat.isEnvironment && cat.parents && cat.parents.length > 0 && (
                                            <span className="text-[9px] uppercase font-black text-slate-400">
                                                {allNodes.find(c => c.id === cat.parents![0])?.name || 'Ambiente'} &gt; Categoria
                                            </span>
                                        )}
                                        {cat.isEnvironment && (
                                            <span className="text-[9px] uppercase font-black text-blue-500">
                                                Ambiente
                                            </span>
                                        )}
                                    </div>
                                    {!isSelected && <i className="bi bi-plus-lg text-blue-500 opacity-0 group-hover:opacity-100 transition-all"></i>}
                                </button>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center">
                            <i className="bi bi-search text-2xl text-slate-200 mb-2 block"></i>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Nenhum resultado encontrado</p>
                        </div>
                    )}
                </div>
            </DropdownPortal>
        </div>
    );
};

export default CategoryAutocomplete;

