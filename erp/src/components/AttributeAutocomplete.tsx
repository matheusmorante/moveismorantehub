import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../pages/utils/supabaseConfig';
import { normalizeSearchTerm } from '../pages/utils/textUtils';
import DropdownPortal from './shared/DropdownPortal';

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
    placeholder = "Digite para buscar atributos (ex: Cor, Voltagem)...",
    className = "",
    inputClassName = "w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400/60",
    disabled = false
}) => {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<AttributeNode[]>([]);
    const [allNodes, setAllNodes] = useState<AttributeNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            try {
                const { data } = await supabase.from('attributes').select('id, name').order('name');
                if (data) {
                    setAllNodes((data as AttributeRow[]).map(d => ({ id: d.id, name: d.name })));
                }
            } catch (err) {
                console.error('Erro ao buscar atributos:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setSuggestions(allNodes.filter(node => !selectedIds.includes(node.id)));
            return;
        }

        const normalizedQuery = normalizeSearchTerm(query);
        const filtered = allNodes.filter(node =>
            !selectedIds.includes(node.id) && normalizeSearchTerm(node.name).includes(normalizedQuery)
        );
        setSuggestions(filtered);
        setActiveIndex(0);
    }, [query, allNodes, selectedIds]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (node: AttributeNode) => {
        if (!selectedIds.includes(node.id)) {
            onSelect(node);
        }
        setQuery('');
        setShowSuggestions(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            setShowSuggestions(false);
            return;
        }

        if (!showSuggestions || suggestions.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex(index => Math.min(index + 1, suggestions.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex(index => Math.max(index - 1, 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            handleSelect(suggestions[activeIndex]);
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
                isOpen={showSuggestions}
                anchorRef={wrapperRef}
                onClose={() => setShowSuggestions(false)}
            >
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar p-2">
                    {suggestions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">
                            Nenhum atributo encontrado
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {suggestions.map((node, index) => {
                                return (
                                    <button
                                        type="button"
                                        key={node.id}
                                        onClick={() => handleSelect(node)}
                                        className={`flex items-center gap-3 w-full text-left p-3 rounded-xl transition-all ${
                                            index === activeIndex
                                                ? 'bg-blue-50/50 dark:bg-blue-500/10'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border border-slate-300 dark:border-slate-600">
                                            <i className="bi bi-plus text-sm" />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm font-semibold truncate text-slate-700 dark:text-slate-300">
                                                {node.name}
                                            </span>
                                        </div>
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
