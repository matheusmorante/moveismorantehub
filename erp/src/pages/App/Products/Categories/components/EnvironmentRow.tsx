import React from 'react';
import { EnvironmentNode, CategoryNode } from '../types/categoryEnvironment.types';
import { SecureDeleteButton } from './SecureDeleteButton';

interface EnvironmentRowProps {
    readonly environment: EnvironmentNode;
    readonly categories: CategoryNode[];
    readonly onEditEnvironment: (env: EnvironmentNode) => void;
    readonly onDeleteEnvironment: (id: string) => void;
    readonly onEditCategory: (cat: CategoryNode) => void;
    readonly onUnlinkCategory: (envId: string, catId: string) => void;
    readonly onLinkCategoryToEnvironment: (envId: string) => void;
}

export const EnvironmentRow: React.FC<EnvironmentRowProps> = ({
    environment,
    categories,
    onEditEnvironment,
    onDeleteEnvironment,
    onEditCategory,
    onUnlinkCategory,
    onLinkCategoryToEnvironment
}) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const envCategories = categories.filter(c => environment.categories?.includes(c.id));
    const linkedCategoriesCount = envCategories.length;
    const isEnvDeleteDisabled = linkedCategoriesCount > 0;
    const envDisabledReason = `Não é possível excluir este ambiente porque ele possui ${linkedCategoriesCount} categoria${linkedCategoriesCount > 1 ? 's vinculadas' : ' vinculada'}. Desvincule as categorias antes de excluir o ambiente.`;

    return (
        <div
            data-testid={`environment-row-${environment.id}`}
            className="p-3 sm:p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs flex flex-col gap-2 group/envcard transition-all hover:border-slate-300 dark:hover:border-slate-700"
        >
            {/* Cabeçalho do Ambiente: Nome, badge de contagem e ações */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsExpanded(prev => !prev)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors bg-transparent border-0 cursor-pointer flex items-center"
                        title={isExpanded ? 'Recolher ambiente' : 'Expandir ambiente'}
                        aria-label={isExpanded ? `Recolher ${environment.name}` : `Expandir ${environment.name}`}
                    >
                        <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} text-xs`} />
                    </button>
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                        {environment.name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 whitespace-nowrap leading-tight inline-flex items-center">
                        {linkedCategoriesCount} {linkedCategoriesCount === 1 ? 'categoria' : 'categorias'}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                    <button
                        type="button"
                        onClick={() => onEditEnvironment(environment)}
                        className="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg transition-colors border border-blue-200/50 dark:border-blue-800/50 cursor-pointer shadow-2xs"
                        title={`Editar ambiente ${environment.name}`}
                        aria-label={`Editar ambiente ${environment.name}`}
                    >
                        <i className="bi bi-pencil text-xs" />
                    </button>
                    <SecureDeleteButton
                        disabled={isEnvDeleteDisabled}
                        disabledReason={envDisabledReason}
                        onDelete={() => onDeleteEnvironment(environment.id)}
                        ariaLabel={`Excluir ambiente ${environment.name}`}
                        title={`Excluir ambiente ${environment.name}`}
                    />
                </div>
            </div>

            {/* Lista de Categorias Vinculadas em Chips + Botão de vincular */}
            {isExpanded && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                {envCategories.map(c => (
                    <span
                        key={c.id}
                        className="px-2.5 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2 group/chip transition-colors hover:border-slate-300"
                    >
                        <button
                            type="button"
                            className="cursor-pointer hover:text-blue-600 transition-colors bg-transparent border-0 p-0 text-inherit font-inherit text-left"
                            onClick={() => onEditCategory(c)}
                            title={`Editar categoria ${c.name}`}
                            aria-label={`Editar categoria ${c.name}`}
                        >
                            {c.name}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm(`Desvincular "${c.name}" de "${environment.name}"?`)) {
                                    onUnlinkCategory(environment.id, c.id);
                                }
                            }}
                            className="text-slate-300 hover:text-red-500 transition-colors opacity-70 group-hover/chip:opacity-100 focus:opacity-100 bg-transparent border-0 p-0 cursor-pointer"
                            title={`Desvincular de ${environment.name} (não exclui a categoria)`}
                            aria-label={`Desvincular categoria ${c.name} de ${environment.name}`}
                        >
                            <i className="bi bi-x-lg text-[10px]" />
                        </button>
                    </span>
                ))}

                <button
                    type="button"
                    onClick={() => onLinkCategoryToEnvironment(environment.id)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors border border-dashed border-blue-200 dark:border-blue-800 cursor-pointer"
                    title={`Vincular categoria ao ambiente ${environment.name}`}
                    aria-label={`Vincular nova categoria ao ambiente ${environment.name}`}
                >
                    <i className="bi bi-plus-lg text-[10px]" />
                    <span>Vincular categoria</span>
                </button>
            </div>
            )}
        </div>
    );
};
