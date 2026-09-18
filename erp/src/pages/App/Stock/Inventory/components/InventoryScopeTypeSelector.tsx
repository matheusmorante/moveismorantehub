import React from 'react';
import type { InventoryScopeType } from '../modals/InventoryScopeModal';

interface InventoryScopeTypeSelectorProps {
    readonly onSelect: (type: InventoryScopeType) => void;
}

export const InventoryScopeTypeSelector: React.FC<InventoryScopeTypeSelectorProps> = ({ onSelect }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
            <button
                onClick={() => onSelect('full')}
                className="flex flex-col items-start p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left"
            >
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center text-xl mb-4">
                    <i className="bi bi-boxes"></i>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">Estoque Completo</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Todas as variações ativas cadastradas no sistema.</span>
            </button>

            <button
                onClick={() => onSelect('supplier')}
                className="flex flex-col items-start p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left"
            >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-xl mb-4">
                    <i className="bi bi-truck"></i>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">Por Fornecedor</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Selecione um fornecedor e conte as variações relacionadas.</span>
            </button>

            <button
                onClick={() => onSelect('custom')}
                className="flex flex-col items-start p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left sm:col-span-2"
            >
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center text-xl mb-4">
                    <i className="bi bi-funnel"></i>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">Seleção Personalizada</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Pesquise e adicione manualmente produtos ou variações específicas ao escopo.</span>
            </button>
        </div>
    );
};
