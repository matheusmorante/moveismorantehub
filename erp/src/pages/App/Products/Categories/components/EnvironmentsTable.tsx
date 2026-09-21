import React from 'react';
import { EnvironmentNode, CategoryNode } from '../types/categoryEnvironment.types';
import { EnvironmentRow } from './EnvironmentRow';

interface EnvironmentsTableProps {
    readonly environments: EnvironmentNode[];
    readonly categories: CategoryNode[];
    readonly onEditEnvironment: (env: EnvironmentNode) => void;
    readonly onDeleteEnvironment: (id: string) => void;
    readonly onEditCategory: (cat: CategoryNode) => void;
    readonly onUnlinkCategory: (envId: string, catId: string) => void;
    readonly onLinkCategoryToEnvironment: (envId: string) => void;
    readonly searchTerm?: string;
}

export const EnvironmentsTable: React.FC<EnvironmentsTableProps> = ({
    environments,
    categories,
    onEditEnvironment,
    onDeleteEnvironment,
    onEditCategory,
    onUnlinkCategory,
    onLinkCategoryToEnvironment,
    searchTerm = ''
}) => {
    const filteredEnvironments = React.useMemo(() => {
        if (!searchTerm.trim()) return environments;
        const norm = searchTerm.toLowerCase();
        return environments.filter(env => {
            if (env.name.toLowerCase().includes(norm)) return true;
            // Busca também se alguma categoria vinculada ao ambiente tem o termo
            const envCats = categories.filter(c => env.categories?.includes(c.id));
            return envCats.some(c => c.name.toLowerCase().includes(norm));
        });
    }, [environments, categories, searchTerm]);

    return (
        <div className="flex flex-col gap-2.5">
            {filteredEnvironments.map(env => (
                <EnvironmentRow
                    key={env.id}
                    environment={env}
                    categories={categories}
                    onEditEnvironment={onEditEnvironment}
                    onDeleteEnvironment={onDeleteEnvironment}
                    onEditCategory={onEditCategory}
                    onUnlinkCategory={onUnlinkCategory}
                    onLinkCategoryToEnvironment={onLinkCategoryToEnvironment}
                />
            ))}

            {filteredEnvironments.length === 0 && (
                <div className="py-12 px-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
                    <i className="bi bi-inbox text-3xl text-slate-300 dark:text-slate-600" />
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                        {searchTerm.trim() ? 'Nenhum ambiente encontrado para a busca' : 'Nenhum ambiente cadastrado'}
                    </span>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                        {searchTerm.trim()
                            ? 'Tente buscar por outro termo ou limpe a busca.'
                            : 'Crie seu primeiro ambiente usando o botão acima.'}
                    </p>
                </div>
            )}
        </div>
    );
};
