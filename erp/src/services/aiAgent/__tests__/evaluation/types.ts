import { GeminiContent } from '../../geminiAgentTypes';

export type EvalCategory =
  | 'INTENT'
  | 'EXTRACTION'
  | 'NON_HALLUCINATION'
  | 'AMBIGUITY'
  | 'TOOL_CALLING'
  | 'SAFETY'
  | 'MULTI_TURN'
  | 'CONTEXT_CONTAMINATION'
  | 'ADVERSARIAL'
  | 'REAL_LANGUAGE';

export type ExpectedIntent =
  | 'create_expense'
  | 'create_income'
  | 'query_summary'
  | 'query_payables'
  | 'query_receivables'
  | 'general_question'
  | 'clarification_needed';

export interface ExpectedOutcome {
  intent: ExpectedIntent;
  /** Tools que DEVEM ser chamadas no fluxo */
  expectedTools?: string[];
  /** Tools que são TERMINANTEMENTE PROIBIDAS de serem chamadas */
  prohibitedTools?: string[];
  /** Parâmetros esperados nos argumentos das tools */
  expectedArgs?: Record<string, unknown>;
  /** Campos que NÃO podem ser inferidos/inventados sem menção do usuário */
  prohibitedInferences?: string[];
  /** Se o agente DEVE fazer uma pergunta/esclarecimento ao usuário */
  mustAskUser?: boolean;
  /** Palavras ou temas obrigatórios na resposta/pergunta ao usuário */
  questionKeywords?: string[];
  /** Termos proibidos na resposta (ex: termos técnicos de banco como (BUSINESS)) */
  prohibitedResponseTerms?: string[];
  /** Se uma ação de mutação (criação/exclusão) NÃO pode ter sido executada */
  shouldBlockExecution?: boolean;
}

export interface TestCase {
  id: string;
  category: EvalCategory;
  description: string;
  /** Mensagem única ou histórico conversacional completo */
  input: string | GeminiContent[];
  expected: ExpectedOutcome;
  /** Estado prévio mockado do ERP (categorias, resumo, etc.) */
  mockState?: {
    categories?: Array<{ id: string; name: string; type: 'income' | 'expense' }>;
    currentDate?: string;
  };
}

export interface EvalResult {
  testId: string;
  category: EvalCategory;
  description: string;
  passed: boolean;
  inputSummary: string;
  expected: ExpectedOutcome;
  received: {
    intent?: string;
    calledTools: string[];
    toolArgs: Record<string, unknown>[];
    agentAnswer: string;
    askedUser: boolean;
    mutatedDatabase: boolean;
  };
  divergences: string[];
}

export interface EvalMetrics {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
  byCategory: Record<EvalCategory, { total: number; passed: number }>;
  byIntent: Record<string, { total: number; passed: number }>;
  hallucinationsDetected: number;
  prohibitedToolViolations: number;
  durationMs: number;
}
