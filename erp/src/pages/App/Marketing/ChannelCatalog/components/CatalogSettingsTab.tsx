import React from 'react';

export default function CatalogSettingsTab() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                <i className="bi bi-gear text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Integrações Meta (Em Breve)</h3>
            <p className="text-sm text-slate-500 max-w-sm">
                Configurações de integração do seu catálogo com o Facebook e Instagram, mappings e prefixos globais.
            </p>
        </div>
    );
}
