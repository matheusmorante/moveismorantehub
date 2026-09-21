import React from 'react';
import { CategoryNode } from '../types/categoryEnvironment.types';
import { SecureDeleteButton } from './SecureDeleteButton';

interface OrphanCategoriesSectionProps {
    readonly categories: CategoryNode[];
    readonly onEditCategory: (cat: CategoryNode) => void;
    readonly onDeleteCategory: (id: string) => void;
}

export const OrphanCategoriesSection: React.FC<OrphanCategoriesSectionProps> = ({
    categories,
    onEditCategory,
    onDeleteCategory
}) => {
    const orphanCategories = categories.filter(c => !c.parents || c.parents.length === 0);

    if (orphanCategories.length === 0) {
        return null; // Se não há órfãs, não ocupa espaço desnecessário
    }

    return (
        <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div>
                <h2 className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight flex items-center gap-2">
                    <i className="bi bi-exclamation-circle-fill text-amber-500" />
                    Categorias sem Ambiente (Órfãs — {orphanCategories.length})
                </h2>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-400 font-bold uppercase tracking-wider">
                    Estas categorias não estão associadas a nenhum ambiente de catálogo
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                {orphanCategories.map(c => {
                    const prodCount = c.productCount || 0;
                    const isDeleteDisabled = prodCount > 0;
                    const disabledReason = `Não é possível excluir esta categoria porque ela está sendo utilizada por ${prodCount} produto${prodCount > 1 ? 's' : ''}. Remova ou altere a categoria desses produtos antes de excluí-la.`;

                    return (
                        <span
                            key={c.id}
                            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2.5 shadow-sm"
                        >
                            <button
                                type="button"
                                className="cursor-pointer hover:text-blue-600 transition-colors bg-transparent border-0 p-0 text-inherit font-inherit"
                                onClick={() => onEditCategory(c)}
                                title={`Editar categoria ${c.name}`}
                                aria-label={`Editar categoria ${c.name}`}
                            >
                                {c.name}
                            </button>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {prodCount} {prodCount === 1 ? 'prod' : 'prods'}
                            </span>
                            <SecureDeleteButton
                                size="sm"
                                disabled={isDeleteDisabled}
                                disabledReason={disabledReason}
                                onDelete={() => onDeleteCategory(c.id)}
                                ariaLabel={`Excluir categoria órfã ${c.name}`}
                                title={`Excluir categoria ${c.name}`}
                            />
                        </span>
                    );
                })}
            </div>
        </div>
    );
};
