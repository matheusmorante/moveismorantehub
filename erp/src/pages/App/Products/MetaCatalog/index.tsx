import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { buildMetaCatalogItems } from './services/metaCatalogPayload';
import { fetchMetaCatalogStats, fetchMetaCatalogSyncSources } from './services/metaCatalogDataService';

export default function MetaCatalog() {
  const { isAdmin } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ processed: 0, total: 0 });

  const [stats, setStats] = useState({
    publishedSimple: 0,
    publishedVariations: 0,
    notPublished: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        setStats(await fetchMetaCatalogStats());
      } catch (err) {
        console.error('Erro ao calcular estatísticas do catálogo Meta:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [isSyncing]);

  const handleGraphApiSync = async () => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem iniciar a sincronização via Graph API.');
      return;
    }
    try {
      setIsSyncing(true);
      setSyncProgress({ processed: 0, total: 0 });
      toast.info('Iniciando busca e sincronização de todos os produtos... 🔄');

      const { whatsappGraphService } = await import('@/pages/utils/whatsappGraphService');

      const { products, variations, opportunities } = await fetchMetaCatalogSyncSources();

      // 3. Montar a lista completa de itens para o Meta Catalog (Pai + Variações como itens individuais)
      const allItems = buildMetaCatalogItems(products, variations, opportunities);

      // 4. Executar sync em lote via Graph API com callback de progresso
      const res = await whatsappGraphService.syncBatchProductsToCatalog(
        allItems,
        (processed, total) => {
          setSyncProgress({ processed, total });
        }
      );

      toast.success(
        `Sincronização concluída! ${res.count} itens processados no Meta Catalog via Graph API. 🎉`
      );
    } catch (err: any) {
      console.error('Erro no sync Meta Graph API:', err);
      toast.error(err.message || 'Erro ao sincronizar com a Meta Graph API.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto p-4 md:p-8 animate-fade-in relative">
      {/* Card Flutuante de Progresso da Sincronização (Canto Inferior Direito) */}
      {isSyncing && (
        <div className="fixed bottom-6 right-6 z-[999999] animate-slide-up pointer-events-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl w-80 sm:w-96 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center text-xl shrink-0">
                <i className="bi bi-arrow-repeat animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                  Sincronizando com Meta API
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                  Enviando produtos e variações...
                </p>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full flex flex-col gap-1.5">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                <div
                  className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${syncProgress.total > 0 ? Math.round((syncProgress.processed / syncProgress.total) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>
                  {syncProgress.processed} de {syncProgress.total} itens
                </span>
                <span>
                  {syncProgress.total > 0
                    ? Math.round((syncProgress.processed / syncProgress.total) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <i className="bi bi-meta text-2xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Catálogo Meta
              </h1>
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium mt-1">
              Resumo de publicação e sincronização direta via Meta Graph API
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGraphApiSync}
            disabled={isSyncing || !isAdmin}
            title={
              !isAdmin
                ? 'Apenas administradores podem iniciar a sincronização manual via Graph API'
                : 'Iniciar sincronização imediata'
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 ${
              !isAdmin
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700 shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 disabled:opacity-50'
            }`}
          >
            <i className={`bi bi-arrow-repeat text-sm ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar via Graph API (BETA)</span>
          </button>

        </div>
      </div>

      {/* Grid de Estatísticas do Catálogo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Produtos Simples Publicados */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0">
            <i className="bi bi-box-seam" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Produtos Simples
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                {loadingStats ? '...' : stats.publishedSimple}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                publicados
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Variações Publicadas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0">
            <i className="bi bi-tags" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Variações (Filhos)
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                {loadingStats ? '...' : stats.publishedVariations}
              </span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                publicados
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Produtos Não Publicados */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-lg shrink-0">
            <i className="bi bi-eye-slash" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Não Publicados
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                {loadingStats ? '...' : stats.notPublished}
              </span>
              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                inativos/ocultos
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <i className="bi bi-exclamation-triangle-fill" />
          <h2 className="text-sm font-black uppercase tracking-wider">Feed CSV legado</h2>
        </div>
        <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-100">
          A rota pública do CSV ainda existe no código do catálogo digital, mas o feed não deve ser
          configurado como fonte de sincronização do Meta. Use a sincronização via Graph API acima.
          Para confirmar publicação ou remoção, confira o item no próprio catálogo da Meta pelo
          identificador retailer_id/SKU; o status no ERP e o CSV não comprovam o resultado externo.
        </p>
      </div>
    </div>
  );
}
