/** @jsxImportSource react */
import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  listAgentFeedbacks,
  updateAgentFeedbackStatus,
  generateGoldenTestCaseSnippet,
} from '../../../../services/aiAgent/aiFeedbackService';
import {
  AgentFeedbackCategory,
  AgentFeedbackItem,
  AgentFeedbackStatus,
} from '../../../../services/aiAgent/aiFeedbackTypes';

const CATEGORY_LABELS: Record<AgentFeedbackCategory, { label: string; color: string }> = {
  misunderstanding: { label: 'Compreensão de Intenção', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
  wrong_arguments: { label: 'Argumentos/Dados Incorretos', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  wrong_tool: { label: 'Ferramenta Incorreta', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' },
  wrong_result: { label: 'Resultado Divergente', color: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' },
  unnecessary_question: { label: 'Pergunta Desnecessária', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
  missing_context: { label: 'Falta de Contexto Multi-Turno', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300' },
  permission_disagreement: { label: 'Discordância de Regra/Permissão', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  other: { label: 'Outro', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
};

const STATUS_BADGES: Record<AgentFeedbackStatus, { label: string; color: string; icon: string }> = {
  pending_review: { label: 'Pendente de Revisão', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', icon: 'bi-hourglass-split' },
  confirmed_bug: { label: 'Bug Confirmado', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30', icon: 'bi-exclamation-octagon-fill' },
  expected_behavior: { label: 'Comportamento Esperado', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30', icon: 'bi-shield-check' },
  fixed: { label: 'Corrigido com Teste', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', icon: 'bi-check-circle-fill' },
  ignored: { label: 'Descartado', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30', icon: 'bi-slash-circle' },
};

export default function AiQualityFeedbackSection(): React.ReactElement {
  const [feedbacks, setFeedbacks] = useState<AgentFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AgentFeedbackStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<AgentFeedbackCategory | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<AgentFeedbackItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listAgentFeedbacks({
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
      });
      setFeedbacks(list);
    } catch (err: any) {
      toast.error('Erro ao carregar feedbacks da IA: ' + err?.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (item: AgentFeedbackItem, newStatus: AgentFeedbackStatus) => {
    const ok = await updateAgentFeedbackStatus(item.id, newStatus, {
      reviewedBy: 'Operador ERP',
      reviewNotes: `Status alterado para ${newStatus}`,
    });
    if (ok) {
      toast.success(`Status atualizado para "${STATUS_BADGES[newStatus].label}".`);
      loadData();
      if (selectedItem?.id === item.id) {
        setSelectedItem(prev => (prev ? { ...prev, status: newStatus } : null));
      }
    } else {
      toast.error('Falha ao atualizar status.');
    }
  };

  const handleCopySnippet = (item: AgentFeedbackItem) => {
    const snippet = generateGoldenTestCaseSnippet(item);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(snippet);
      toast.info('Snippet copiado! Cole no arquivo goldenDataset.ts para criar o caso de regressão.');
    } else {
      toast.info(snippet);
    }
  };

  // KPIs
  const totalCount = feedbacks.length;
  const pendingCount = feedbacks.filter(f => f.status === 'pending_review').length;
  const bugCount = feedbacks.filter(f => f.status === 'confirmed_bug').length;
  const fixedCount = feedbacks.filter(f => f.status === 'fixed').length;

  return (
    <div className="space-y-6">
      {/* Resumo / KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Relatos</span>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{totalCount}</p>
        </div>
        <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pendentes de Revisão</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20">
          <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Bugs Confirmados</span>
          <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{bugCount}</p>
        </div>
        <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Corrigidos c/ Teste</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{fixedCount}</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">Status:</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-medium"
            >
              <option value="all">Todos os Status</option>
              <option value="pending_review">Pendente de Revisão</option>
              <option value="confirmed_bug">Bug Confirmado</option>
              <option value="expected_behavior">Comportamento Esperado</option>
              <option value="fixed">Corrigido</option>
              <option value="ignored">Descartado</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">Categoria:</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-medium"
            >
              <option value="all">Todas as Categorias</option>
              <option value="wrong_arguments">Argumentos/Dados Incorretos</option>
              <option value="misunderstanding">Compreensão de Intenção</option>
              <option value="wrong_tool">Ferramenta Incorreta</option>
              <option value="wrong_result">Resultado Divergente</option>
              <option value="unnecessary_question">Pergunta Desnecessária</option>
              <option value="missing_context">Falta de Contexto</option>
              <option value="permission_disagreement">Regra/Permissão</option>
            </select>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-2"
        >
          <i className={`bi bi-arrow-clockwise ${loading ? 'animate-spin' : ''}`} />
          Recarregar
        </button>
      </div>

      {/* Lista de Relatos */}
      {feedbacks.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <i className="bi bi-robot text-4xl text-slate-300 dark:text-slate-700 mb-2 block" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Nenhum feedback registrado com os filtros selecionados.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Quando um operador corrigir o assistente no chat, o caso aparecerá aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map(item => {
            const statusConfig = STATUS_BADGES[item.status] || STATUS_BADGES.pending_review;
            const categoryConfig = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.other;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 transition-all shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1.5 ${statusConfig.color}`}>
                      <i className={`bi ${statusConfig.icon}`} />
                      {statusConfig.label}
                    </span>
                    <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg ${categoryConfig.color}`}>
                      {categoryConfig.label}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {item.source_app}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* Queixa do usuário */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reclamação do Operador:</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    "{item.user_complaint}"
                  </p>
                </div>

                {/* Detalhes de divergência e contexto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {item.divergent_field && (
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/40 dark:border-amber-900/30">
                      <span className="font-bold text-amber-700 dark:text-amber-400 block mb-0.5">Campo Divergente:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{item.divergent_field}</span>
                    </div>
                  )}

                  {item.agent_response && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-500 block mb-0.5">Resposta Anterior da IA:</span>
                      <span className="text-slate-600 dark:text-slate-400 line-clamp-2">{item.agent_response}</span>
                    </div>
                  )}
                </div>

                {/* Ações de Auditoria */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Alterar Status:</span>
                    <button
                      onClick={() => handleStatusChange(item, 'confirmed_bug')}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all"
                    >
                      Bug Confirmado
                    </button>
                    <button
                      onClick={() => handleStatusChange(item, 'expected_behavior')}
                      className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-all"
                    >
                      Comportamento Esperado
                    </button>
                    <button
                      onClick={() => handleStatusChange(item, 'fixed')}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all"
                    >
                      Corrigido
                    </button>
                  </div>

                  <button
                    onClick={() => handleCopySnippet(item)}
                    className="px-3.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <i className="bi bi-file-earmark-code" />
                    Copiar Snippet para Golden Dataset
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
