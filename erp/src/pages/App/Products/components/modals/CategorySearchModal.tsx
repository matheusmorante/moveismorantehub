import React, { useState, useMemo, useEffect } from "react";
import { normalizeSearchTerm } from "@/pages/utils/textUtils";

export interface CategoryItem {
    readonly id: string;
    readonly name: string;
    readonly parents?: readonly string[];
}

export interface CategorySearchModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly categories: readonly CategoryItem[];
    readonly onSelect: (categoryId: string) => void;
    readonly selectedIds: readonly string[];
}

export const CategorySearchModal: React.FC<CategorySearchModalProps> = ({
    isOpen,
    onClose,
    categories,
    onSelect,
    selectedIds
}) => {
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const filtered = useMemo(() => {
        const s = normalizeSearchTerm(search);
        return (categories || [])
            .filter(c => normalizeSearchTerm(c.name).includes(s))
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 30);
    }, [categories, search]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-search-modal-title"
            className="fixed inset-0 z-[1000020] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 id="category-search-modal-title" className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                            Categorias
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                            Selecione para associar ao produto
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        aria-label="Fechar busca de categorias"
                    >
                        <i className="bi bi-x-lg text-xl" aria-hidden="true" />
                    </button>
                </div>
                
                <div className="p-6 border-b border-slate-50 dark:border-slate-800">
                    <div className="relative">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
                        <input
                            autoFocus
                            aria-label="Buscar categoria ou subcategoria"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar categoria ou subcategoria..."
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[40vh] p-4 space-y-2 custom-scrollbar" role="listbox" aria-label="Lista de categorias disponíveis">
                    {filtered.map(cat => {
                        const isSelected = selectedIds.includes(cat.id);
                        const isEnv = !cat.parents || cat.parents.length === 0;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => onSelect(cat.id)}
                                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all cursor-pointer ${
                                    isSelected 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${isEnv ? 'bg-emerald-500' : 'bg-blue-400'}`} aria-hidden="true" />
                                    <div className="flex flex-col items-start translate-y-[-1px]">
                                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'dark:text-slate-200'}`}>
                                            {cat.name}
                                        </span>
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
                                            {isEnv ? 'Ambiente' : 'Categoria'}
                                        </span>
                                    </div>
                                </div>
                                {isSelected ? (
                                    <i className="bi bi-check-circle-fill text-lg" aria-hidden="true" />
                                ) : (
                                    <i className="bi bi-plus-circle opacity-30 text-lg" aria-hidden="true" />
                                )}
                            </button>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-xs font-bold">
                            Nenhuma categoria encontrada para "{search}".
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategorySearchModal;
