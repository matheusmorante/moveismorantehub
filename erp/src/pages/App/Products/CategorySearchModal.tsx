import React, { useState, useMemo } from "react";

interface Category {
    id: string;
    name: string;
    parents?: string[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    onSelect: (categoryId: string) => void;
    selectedIds: string[];
}

const CategorySearchModal = ({ isOpen, onClose, categories, onSelect, selectedIds }: Props) => {
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return categories
            .filter(c => c.name.toLowerCase().includes(s))
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 30);
    }, [categories, search]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">Categorias</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Selecione para associar ao produto</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>
                
                <div className="p-6 border-b border-slate-50 dark:border-slate-800">
                    <div className="relative">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar categoria ou subcategoria..."
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[40vh] p-4 space-y-2 custom-scrollbar">
                    {filtered.map(cat => {
                        const isSelected = selectedIds.includes(cat.id);
                        const isEnv = !cat.parents || cat.parents.length === 0;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => onSelect(cat.id)}
                                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${isEnv ? 'bg-emerald-500' : 'bg-blue-400'}`}></div>
                                    <div className="flex flex-col items-start translate-y-[-1px]">
                                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'dark:text-slate-200'}`}>{cat.name}</span>
                                        <span className={`text-[8px] font-black uppercase tracking-widest opacity-60`}>
                                            {isEnv ? 'Ambiente' : 'Categoria'}
                                        </span>
                                    </div>
                                </div>
                                {isSelected ? <i className="bi bi-check-circle-fill"></i> : <i className="bi bi-plus-circle opacity-20"></i>}
                            </button>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="text-center py-12">
                            <i className="bi bi-search text-3xl text-slate-200 mb-3 block"></i>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Nenhuma categoria encontrada</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-50 dark:border-slate-800">
                    <button onClick={onClose} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl transition-all active:scale-95">
                        Concluir Seleção
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CategorySearchModal;
