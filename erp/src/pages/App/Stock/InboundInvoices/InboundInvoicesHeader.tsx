import React from 'react';

interface InboundInvoicesHeaderProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onOpenImportXml: () => void;
    onOpenAccessKey: () => void;
    isSyncing: boolean;
    lastSyncAt: string | null;
}

export const InboundInvoicesHeader: React.FC<InboundInvoicesHeaderProps> = ({
    searchTerm,
    onSearchChange,
    onOpenImportXml,
    onOpenAccessKey,
    isSyncing,
    lastSyncAt,
    onSyncNow,
}: InboundInvoicesHeaderProps & { onSyncNow?: () => void }) => {
    return (
        <header className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20">
                        <i className="bi bi-receipt-cutoff text-lg" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                            Notas Fiscais de Entrada
                        </h1>
                        <p className="text-xs font-medium text-slate-400">
                            Notas fiscais emitidas por fornecedores para nossa empresa via SEFAZ DF-e
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={onOpenAccessKey}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-all hover:bg-blue-700"
                    >
                        <i className="bi bi-key-fill text-sm" />
                        Adicionar NF-e por chave
                    </button>
                    <button
                        type="button"
                        onClick={onOpenImportXml}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm hover:bg-slate-50 transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <i className="bi bi-filetype-xml text-emerald-600 text-sm" />
                        Importar XML
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                <i className="bi bi-clock-history" />
                {lastSyncAt
                    ? `Sincronização automática em background ativa. Última consulta SEFAZ: ${new Date(lastSyncAt).toLocaleString('pt-BR')}. Próxima execução automática em 1 hora.`
                    : 'Sincronização automática em background ativa no servidor (ciclo de 1 hora).'}
            </div>

            <div className="relative">
                <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Pesquisar por fornecedor, número da NF-e ou chave de acesso de 44 dígitos..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
            </div>
        </header>
    );
};
