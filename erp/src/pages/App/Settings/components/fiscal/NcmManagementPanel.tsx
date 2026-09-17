import React, { useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';

export function NcmManagementPanel() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{
        success: boolean;
        message?: string;
        upserted?: number;
        inactivated?: number;
        last_official_update?: string;
    } | null>(null);

    const handleSync = async () => {
        if (!window.confirm("Esta operação fará o download da tabela oficial do Siscomex (~15 mil NCMs) e atualizará o banco de dados. Pode levar alguns segundos. Tem certeza?")) {
            return;
        }

        setIsSyncing(true);
        setSyncResult(null);

        try {
            const { data, error } = await supabase.functions.invoke('sync-ncms');
            if (error) throw error;
            setSyncResult(data);
        } catch (error: any) {
            console.error("Erro ao sincronizar NCMs:", error);
            setSyncResult({
                success: false,
                message: error.message || "Erro desconhecido ao chamar a Edge Function."
            });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden mt-6">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <i className="bi bi-book text-blue-500"></i>
                            Tabela Oficial NCM (Receita Federal)
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                            O MoranteHub utiliza a tabela oficial do Siscomex para classificar produtos e emitir notas fiscais. 
                            Mantenha a base atualizada para evitar rejeições de NF-e por NCM inexistente ou revogado.
                        </p>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSyncing ? (
                            <><i className="bi bi-arrow-repeat animate-spin" /> Sincronizando...</>
                        ) : (
                            <><i className="bi bi-cloud-download" /> Sincronizar NCMs</>
                        )}
                    </button>
                </div>

                {syncResult && (
                    <div className={`mt-6 p-4 rounded-xl text-sm font-medium border ${
                        syncResult.success 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' 
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50'
                    }`}>
                        {syncResult.success ? (
                            <div className="flex flex-col gap-1">
                                <p className="font-bold mb-1"><i className="bi bi-check-circle-fill mr-2" /> Sincronização concluída com sucesso!</p>
                                <p>NCMs atualizados/inseridos: <b>{syncResult.upserted}</b></p>
                                <p>NCMs obsoletos inativados: <b>{syncResult.inactivated}</b></p>
                                {syncResult.last_official_update && (
                                    <p className="mt-2 text-xs opacity-80">Última atualização oficial do governo: {syncResult.last_official_update}</p>
                                )}
                            </div>
                        ) : (
                            <p><i className="bi bi-exclamation-triangle-fill mr-2" /> Falha na sincronização: {syncResult.message}</p>
                        )}
                    </div>
                )}
            </div>
            
            <div className="p-8">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Em breve: Painel de gestão de Aliases Comerciais para treinar a Inteligência Artificial a reconhecer termos específicos da Móveis Morante.
                </p>
                {/* Aqui futuramente será adicionada a tabela CRUD de ncm_aliases */}
            </div>
        </div>
    );
}
