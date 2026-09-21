import React from 'react';
import { CategoryNode, EnvironmentNode } from '../types/categoryEnvironment.types';
import { SecureDeleteButton } from './SecureDeleteButton';

interface CategoriesListSectionProps {
    readonly categories: CategoryNode[];
    readonly environments: EnvironmentNode[];
    readonly onEditCategory: (cat: CategoryNode) => void;
    readonly onDeleteCategory: (id: string) => void;
    readonly initialFilter?: 'todas' | 'com_ambiente' | 'sem_ambiente';
    readonly searchTerm?: string;
}

export const CategoriesListSection: React.FC<CategoriesListSectionProps> = ({
    categories,
    environments,
    onEditCategory,
    onDeleteCategory,
    initialFilter = 'todas',
    searchTerm = ''
}) => {
    const [filterType, setFilterType] = React.useState<'todas' | 'com_ambiente' | 'sem_ambiente'>(initialFilter);

    React.useEffect(() => {
        setFilterType(initialFilter);
    }, [initialFilter]);

    const counts = React.useMemo(() => {
        const total = categories.length;
        const semAmbiente = categories.filter(c => !c.parents || c.parents.length === 0).length;
        const comAmbiente = total - semAmbiente;
        return { total, comAmbiente, semAmbiente };
    }, [categories]);

    const filteredCategories = React.useMemo(() => {
        return categories.filter(c => {
            const hasEnv = c.parents && c.parents.length > 0;
            if (filterType === 'com_ambiente' && !hasEnv) return false;
            if (filterType === 'sem_ambiente' && hasEnv) return false;

            if (searchTerm.trim()) {
                const norm = searchTerm.toLowerCase();
                return c.name.toLowerCase().includes(norm);
            }
            return true;
        });
    }, [categories, filterType, searchTerm]);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col gap-3.5">
            {/* Barra de Filtros Rápidos direta (sem repetições) */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold border border-slate-200/60 dark:border-slate-700/60">
                    <button
                        type="button"
                        onClick={() => setFilterType('todas')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                            filterType === 'todas'
                                ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-2xs'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        Todas ({counts.total})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterType('com_ambiente')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                            filterType === 'com_ambiente'
                                ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-2xs'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        Com ambiente ({counts.comAmbiente})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterType('sem_ambiente')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                            filterType === 'sem_ambiente'
                                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-2xs font-black'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        Sem ambiente ({counts.semAmbiente})
                    </button>
                </div>
            </div>

            {/* Visualização em Tabela (Desktop e Tablet: md+) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                            <th className="py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Categoria
                            </th>
                            <th className="py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Ambientes
                            </th>
                            <th className="py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                                Produtos
                            </th>
                            <th className="py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredCategories.map(cat => {
                            const envNames = environments
                                .filter(e => e.categories?.includes(cat.id))
                                .map(e => e.name);

                            const prodCount = cat.productCount || 0;
                            const isDeleteDisabled = prodCount > 0;
                            const disabledReason = `Não é possível excluir esta categoria porque ela está sendo utilizada por ${prodCount} produto${prodCount > 1 ? 's' : ''}. Remova ou altere a categoria desses produtos antes de excluí-la.`;

                            return (
                                <tr
                                    key={cat.id}
                                    data-testid={`category-row-${cat.id}`}
                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group/catrow"
                                >
                                    <td className="py-2.5 font-bold text-xs text-slate-850 dark:text-slate-200 uppercase">
                                        <button
                                            type="button"
                                            onClick={() => onEditCategory(cat)}
                                            className="hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit font-inherit text-left"
                                        >
                                            {cat.name}
                                        </button>
                                    </td>
                                    <td className="py-2.5">
                                        <div className="flex flex-wrap items-center gap-1">
                                            {envNames.length === 0 ? (
                                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-900/50">
                                                    Sem ambiente
                                                </span>
                                            ) : (
                                                <>
                                                    {envNames.slice(0, 3).map(name => (
                                                        <span
                                                            key={name}
                                                            className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md whitespace-nowrap"
                                                        >
                                                            {name}
                                                        </span>
                                                    ))}
                                                    {envNames.length > 3 && (
                                                        <span
                                                            title={envNames.slice(3).join(', ')}
                                                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md cursor-help border border-blue-200/60 dark:border-blue-800/60 whitespace-nowrap"
                                                        >
                                                            +{envNames.length - 3}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 text-center">
                                        <span
                                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                prodCount > 0
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'
                                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                                            }`}
                                        >
                                            <i className={`bi ${prodCount > 0 ? 'bi-box-seam-fill' : 'bi-check-circle'}`} />
                                            <span>{prodCount} produto{prodCount !== 1 ? 's' : ''}</span>
                                        </span>
                                    </td>
                                    <td className="py-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover/catrow:opacity-100 group-focus-within/catrow:opacity-100 focus-within:opacity-100 transition-opacity">
                                             <button
                                                type="button"
                                                onClick={() => onEditCategory(cat)}
                                                className="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg transition-colors border border-blue-200/50 dark:border-blue-800/50 cursor-pointer shadow-2xs"
                                                title={`Editar categoria ${cat.name}`}
                                                aria-label={`Editar categoria ${cat.name}`}
                                            >
                                                <i className="bi bi-pencil text-xs" />
                                            </button>
                                            <SecureDeleteButton
                                                disabled={isDeleteDisabled}
                                                disabledReason={disabledReason}
                                                onDelete={() => onDeleteCategory(cat.id)}
                                                ariaLabel={`Excluir categoria ${cat.name}`}
                                                title={`Excluir categoria ${cat.name}`}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredCategories.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    Nenhuma categoria encontrada.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Visualização em Cards (Mobile: < md) - ZERO scroll horizontal */}
            <div className="flex md:hidden flex-col gap-2.5">
                {filteredCategories.map(cat => {
                    const envNames = environments
                        .filter(e => e.categories?.includes(cat.id))
                        .map(e => e.name);

                    const prodCount = cat.productCount || 0;
                    const isDeleteDisabled = prodCount > 0;
                    const disabledReason = `Não é possível excluir esta categoria porque ela está sendo utilizada por ${prodCount} produto${prodCount > 1 ? 's' : ''}. Remova ou altere a categoria desses produtos antes de excluí-la.`;

                    return (
                        <div
                            key={cat.id}
                            className="p-3.5 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col gap-2"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => onEditCategory(cat)}
                                    className="font-bold text-xs text-slate-850 dark:text-slate-100 uppercase hover:text-blue-600 transition-colors text-left bg-transparent border-0 p-0"
                                >
                                    {cat.name}
                                </button>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => onEditCategory(cat)}
                                        className="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg transition-colors border border-blue-200/50 dark:border-blue-800/50 cursor-pointer shadow-2xs"
                                        title={`Editar categoria ${cat.name}`}
                                        aria-label={`Editar categoria ${cat.name}`}
                                    >
                                        <i className="bi bi-pencil text-xs" />
                                    </button>
                                    <SecureDeleteButton
                                        disabled={isDeleteDisabled}
                                        disabledReason={disabledReason}
                                        onDelete={() => onDeleteCategory(cat.id)}
                                        ariaLabel={`Excluir categoria ${cat.name}`}
                                        title={`Excluir categoria ${cat.name}`}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ambientes:</span>
                                    {envNames.length === 0 ? (
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-900/50">
                                            Sem ambiente
                                        </span>
                                    ) : (
                                        <>
                                            {envNames.slice(0, 3).map(name => (
                                                <span
                                                    key={name}
                                                    className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-md whitespace-nowrap"
                                                >
                                                    {name}
                                                </span>
                                            ))}
                                            {envNames.length > 3 && (
                                                <span
                                                    title={envNames.slice(3).join(', ')}
                                                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60 whitespace-nowrap"
                                                >
                                                    +{envNames.length - 3}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Produtos:</span>
                                    <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            prodCount > 0
                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'
                                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                                        }`}
                                    >
                                        <i className={`bi ${prodCount > 0 ? 'bi-box-seam-fill' : 'bi-check-circle'}`} />
                                        <span>{prodCount} produto{prodCount !== 1 ? 's' : ''}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredCategories.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Nenhuma categoria encontrada.
                    </div>
                )}
            </div>
        </div>
    );
};
