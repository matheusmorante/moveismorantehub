-- ==============================================================================
-- Migração: Tabela de Telemetria e Auditoria de Feedback do Agente IA
-- Data: 2026-09-07
-- Objetivo: Captura de divergências, reclamações e retificações para ciclo de regressão
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ai_agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  agent_response TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'misunderstanding',
    'wrong_tool',
    'wrong_arguments',
    'wrong_result',
    'unnecessary_question',
    'missing_context',
    'permission_disagreement',
    'other'
  )),
  user_complaint TEXT NOT NULL,
  divergent_field TEXT,
  tool_calls JSONB DEFAULT '[]'::jsonb,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',
    'confirmed_bug',
    'expected_behavior',
    'fixed',
    'ignored'
  )),
  source_app TEXT NOT NULL CHECK (source_app IN ('ERP', 'MOBILE')),
  operator_id TEXT,
  operator_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_feedback_status ON public.ai_agent_feedback(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_feedback_created_at ON public.ai_agent_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_feedback_category ON public.ai_agent_feedback(category);
CREATE INDEX IF NOT EXISTS idx_ai_agent_feedback_source ON public.ai_agent_feedback(source_app);

-- RLS (Row Level Security)
ALTER TABLE public.ai_agent_feedback ENABLE ROW LEVEL SECURITY;

-- Política de leitura: operadores autenticados podem ver os feedbacks
CREATE POLICY "Permitir leitura de feedback da IA para usuários autenticados"
  ON public.ai_agent_feedback
  FOR SELECT
  TO authenticated
  USING (true);

-- Política de inserção: operadores autenticados ou anônimos com service_role/chave pública
CREATE POLICY "Permitir inserção de feedback da IA para operadores autenticados"
  ON public.ai_agent_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política de atualização: apenas autenticados para auditoria/revisão
CREATE POLICY "Permitir atualização de status de feedback para operadores autenticados"
  ON public.ai_agent_feedback
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
