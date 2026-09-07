/**
 * aiFeedbackService.ts — Camada de persistência e consulta para Telemetria de Qualidade da IA.
 * Suporta Supabase com fallback resiliente local para evitar interrupções no chat.
 */

import { supabase } from '../../pages/utils/supabaseConfig';
import {
  AgentFeedbackFilter,
  AgentFeedbackItem,
  AgentFeedbackStatus,
  SaveAgentFeedbackInput,
} from './aiFeedbackTypes';

const LOCAL_STORAGE_KEY = 'morante_ai_feedback_fallback_v1';

function getLocalFeedbacks(): AgentFeedbackItem[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFeedback(item: AgentFeedbackItem): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const current = getLocalFeedbacks();
    current.unshift(item);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current.slice(0, 100)));
  } catch {}
}

export async function saveAgentFeedback(input: SaveAgentFeedbackInput): Promise<{ success: boolean; id: string }> {
  const generatedId = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const record: AgentFeedbackItem = {
    id: generatedId,
    conversation_id: input.conversationId || 'default-session',
    user_message: input.userMessage,
    agent_response: input.agentResponse || null,
    category: input.category,
    user_complaint: input.userComplaint,
    divergent_field: input.divergentField || null,
    tool_calls: input.toolCalls || [],
    severity: input.severity || 'medium',
    status: 'pending_review',
    source_app: input.sourceApp,
    operator_id: input.operatorId || null,
    operator_name: input.operatorName || null,
    created_at: nowIso,
  };

  try {
    const { data, error } = await supabase
      .from('ai_agent_feedback')
      .insert([
        {
          conversation_id: record.conversation_id,
          user_message: record.user_message,
          agent_response: record.agent_response,
          category: record.category,
          user_complaint: record.user_complaint,
          divergent_field: record.divergent_field,
          tool_calls: record.tool_calls,
          severity: record.severity,
          status: record.status,
          source_app: record.source_app,
          operator_id: record.operator_id,
          operator_name: record.operator_name,
        },
      ])
      .select('id')
      .single();

    if (error || !data?.id) {
      console.warn('[aiFeedbackService] Falha no Supabase, salvando em fallback local:', error?.message);
      saveLocalFeedback(record);
      return { success: true, id: generatedId };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.warn('[aiFeedbackService] Erro ao salvar feedback da IA, ativando fallback local:', err?.message);
    saveLocalFeedback(record);
    return { success: true, id: generatedId };
  }
}

export async function listAgentFeedbacks(filter: AgentFeedbackFilter = {}): Promise<AgentFeedbackItem[]> {
  try {
    let query = supabase.from('ai_agent_feedback').select('*').order('created_at', { ascending: false });

    if (filter.status && filter.status !== 'all') {
      query = query.eq('status', filter.status);
    }
    if (filter.category && filter.category !== 'all') {
      query = query.eq('category', filter.category);
    }
    if (filter.severity && filter.severity !== 'all') {
      query = query.eq('severity', filter.severity);
    }
    if (filter.sourceApp && filter.sourceApp !== 'all') {
      query = query.eq('source_app', filter.sourceApp);
    }
    if (filter.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;
    if (error || !data) {
      // Fallback local se a tabela ainda não existir ou Supabase estiver indisponível
      return getLocalFeedbacks();
    }

    return data as AgentFeedbackItem[];
  } catch (err) {
    console.warn('[aiFeedbackService] Erro ao listar feedbacks, retornando fallback local:', err);
    return getLocalFeedbacks();
  }
}

export async function updateAgentFeedbackStatus(
  id: string,
  status: AgentFeedbackStatus,
  options: { reviewedBy?: string; reviewNotes?: string } = {}
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('ai_agent_feedback')
      .update({
        status,
        reviewed_at: nowIso,
        reviewed_by: options.reviewedBy || 'Administrador',
        review_notes: options.reviewNotes || null,
      })
      .eq('id', id);

    if (error) {
      // Atualiza no cache local se for fallback
      const local = getLocalFeedbacks();
      const item = local.find(i => i.id === id);
      if (item) {
        item.status = status;
        item.reviewed_at = nowIso;
        item.reviewed_by = options.reviewedBy || 'Administrador';
        item.review_notes = options.reviewNotes || null;
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
        }
      }
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Gera o esqueleto de teste pronto para ser colado em goldenDataset.ts
 */
export function generateGoldenTestCaseSnippet(item: AgentFeedbackItem): string {
  const safeId = item.id.replace(/[^a-zA-Z0-9]/g, '_');
  return `  {
    id: 'regression_${safeId}',
    description: 'Regressão [${item.category}]: ${item.user_complaint.replace(/'/g, "\\'")}',
    input: '${item.user_message.replace(/'/g, "\\'")}',
    expectedIntent: 'FINANCIAL_TRANSACTION',
    expectedTools: ['criarMovimentacaoFinanceira'],
    expectedArgs: {
      // Preencher conforme o comportamento correto esperado
    },
    forbiddenTools: [],
    requiresConfirmation: false,
    tags: ['regression', '${item.category}', '${item.source_app.toLowerCase()}'],
  },`;
}
