import React, { useState, useEffect } from "react";
import { supabase } from '@/pages/utils/supabaseConfig';

interface ProductFiltersData {
    search: string;
    category: string;
    activeOnly: boolean | undefined;
    sortBy: "description" | "unitPrice" | "stock" | "code" | "createdAt" | "category";
    sortOrder: "asc" | "desc";
    showTrash?: boolean;
}

interface ProductFiltersProps {
    filters: ProductFiltersData;
    setFilters: React.Dispatch<React.SetStateAction<ProductFiltersData>>;
}

const ProductFilters = ({ filters, setFilters }: ProductFiltersProps) => {
    const [availableCategories, setAvailableCategories] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        const loadCats = async () => {
            const { data } = await supabase.from('categories').select('id, name').order('name');
            if (data) setAvailableCategories(data);
        };
        loadCats();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as any;

        if (type === 'checkbox') {
            setFilters(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFilters(prev => ({ ...prev, [name]: value }));
        }
    };

    const resetFilters = () => {
        setFilters({
            search: "",
            category: "",
            activeOnly: undefined,
            sortBy: "createdAt",
            sortOrder: "desc",
            showTrash: filters.showTrash
        });
    };

    return (
        <aside className="w-full bg-white dark:bg-slate-900 flex flex-col h-full overflow-y-auto transition-colors">
            <div className="p-4 md:p-8 border-b border-slate-50 dark:border-slate-800">
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                    <i className="bi bi-filter-left text-blue-600 dark:text-blue-500"></i>
                    Filtros
                </h3>
                <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">Refine sua busca de produtos</p>
            </div>

            <div className="p-4 md:p-8 flex flex-col gap-6">
                {/* Search Inputs */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Busca</label>
                        <div className="relative">
                            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600"></i>
                            <input
                                type="text"
                                name="search"
                                value={filters.search}
                                onChange={handleChange}
                                placeholder="Título ou código..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tipo de Móvel</label>
                        <select
                            name="category"
                            value={filters.category}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer dark:text-slate-300"
                        >
                            <option value="" className="dark:bg-slate-900">Todos os Tipos</option>
                            <option value="Serviços" className="dark:bg-slate-900">Somente Serviços</option>
                            <option value="Produtos" className="dark:bg-slate-900">Somente Produtos</option>
                            {availableCategories.length > 0 && (
                                <optgroup label="Filtrar por Categoria" className="dark:text-slate-500 font-bold mt-2">
                                    {availableCategories.map(cat => (
                                        <option key={cat.id} value={cat.id} className="dark:bg-slate-900 font-normal">
                                            {cat.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</label>
                        <select
                            name="activeOnly"
                            value={filters.activeOnly === undefined ? "" : String(filters.activeOnly)}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilters(prev => ({ ...prev, activeOnly: val === "" ? undefined : val === "true" }));
                            }}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer dark:text-slate-300"
                        >
                            <option value="" className="dark:bg-slate-900">Todos Status</option>
                            <option value="true" className="dark:bg-slate-900">Ativos</option>
                            <option value="false" className="dark:bg-slate-900">Inativos</option>
                        </select>
                    </div>
                </div>

            </div>

            <div className="mt-auto p-4 border-t border-slate-50 dark:border-slate-800">
                <button
                    onClick={resetFilters}
                    className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center justify-center gap-2"
                >
                    <i className="bi bi-arrow-counterclockwise"></i>
                    Limpar Filtros
                </button>
            </div>
        </aside>
    );
};

export default ProductFilters;
