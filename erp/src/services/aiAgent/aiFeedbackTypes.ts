/**
 * aiFeedbackTypes.ts — Tipagens para Telemetria e Auditoria de Feedback do Agente IA.
 * Garante contratos rigorosos em conformidade com modularizacao_codigo.
 */

export type AgentFeedbackCategory =
  | 'misunderstanding'
  | 'wrong_tool'
  | 'wrong_arguments'
  | 'wrong_result'
  | 'unnecessary_question'
  | 'missing_context'
  | 'permission_disagreement'
  | 'other';

export type AgentFeedbackSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AgentFeedbackStatus =
  | 'pending_review'
  | 'confirmed_bug'
  | 'expected_behavior'
  | 'fixed'
  | 'ignored';

export interface ToolCallRecord {
  name: string;
  arguments: Record<string, any>;
  result?: any;
}

export interface AgentFeedbackItem {
  id: string;
  conversation_id: string;
  user_message: string;
  agent_response?: string | null;
  category: AgentFeedbackCategory;
  user_complaint: string;
  divergent_field?: string | null;
  tool_calls: ToolCallRecord[];
  severity: AgentFeedbackSeverity;
  status: AgentFeedbackStatus;
  source_app: 'ERP' | 'MOBILE';
  operator_id?: string | null;
  operator_name?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
}

export interface SaveAgentFeedbackInput {
  conversationId: string;
  userMessage: string;
  agentResponse?: string;
  category: AgentFeedbackCategory;
  userComplaint: string;
  divergentField?: string;
  toolCalls?: ToolCallRecord[];
  severity?: AgentFeedbackSeverity;
  sourceApp: 'ERP' | 'MOBILE';
  operatorId?: string;
  operatorName?: string;
}

export interface AgentFeedbackFilter {
  status?: AgentFeedbackStatus | 'all';
  category?: AgentFeedbackCategory | 'all';
  severity?: AgentFeedbackSeverity | 'all';
  sourceApp?: 'ERP' | 'MOBILE' | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}
