import React from 'react';

export default function CatalogDesignTab() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                <i className="bi bi-palette text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Design & Cores (Em Breve)</h3>
            <p className="text-sm text-slate-500 max-w-sm">
                As configurações visuais da loja estarão disponíveis aqui. Você poderá alterar a logo, cores primárias e estilo do seu catálogo.
            </p>
        </div>
    );
}
