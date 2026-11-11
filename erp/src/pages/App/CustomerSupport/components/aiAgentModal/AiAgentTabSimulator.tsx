import React, { memo, useState } from 'react';
import type {
  AiSituationRule,
  AiKnowledgeArticle,
  AiWorkflowConfig,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas';
import {
  detectCustomerSituation,
  enforceMandatoryPhrases,
} from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiRuleEngine';
import { retrieveRelevantKnowledge } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiKnowledgeService';
import { findApplicableWorkflow } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiWorkflowEngine';
import {
  simulateWhatsAppAiTurn,
  createSimulatorOpenAiFetch,
  type SimulationTurnResult,
} from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings } from '@/pages/utils/settings';
import {
  QUICK_TEST_QUERIES,
  SimulatorInputCard,
  SimulatorRealResultCard,
  SimulatorDiagnosisCard,
} from './simulator';

export interface AiAgentTabSimulatorProps {
  rules: AiSituationRule[];
  knowledgeBase: AiKnowledgeArticle[];
  workflows: AiWorkflowConfig[];
  enabledTools?: string[];
  systemPrompt?: string;
}

export const AiAgentTabSimulator: React.FC<AiAgentTabSimulatorProps> = memo(({
  rules,
  knowledgeBase,
  workflows,
  enabledTools = [],
  systemPrompt,
}) => {
  const [testInput, setTestInput] = useState(QUICK_TEST_QUERIES[0]);
  const [isRunningReal, setIsRunningReal] = useState(false);
  const [realResult, setRealResult] = useState<SimulationTurnResult | null>(null);

  const [simulationResult, setSimulationResult] = useState<{
    situation: AiSituationRule | null;
    matchedKeywords: string[];
    relevantArticles: AiKnowledgeArticle[];
    workflow: AiWorkflowConfig | null;
    mandatoryPhrases: string[];
    simulatedReplyPreview: string;
  } | null>(null);

  const handleRunDiagnosis = (queryToTest?: string) => {
    const text = (queryToTest ?? testInput).trim();
    if (!text) return;

    setRealResult(null);
    const { situation, matchedKeywords } = detectCustomerSituation(text, rules);
    const relevantArticles = retrieveRelevantKnowledge(text, situation?.situationKey || null, knowledgeBase, 3);
    const workflow = findApplicableWorkflow(situation?.situationKey || null, workflows);
    const mandatoryPhrases = situation?.mandatoryPhrases || [];

    const sampleAiDraft = `Olá! Que ótimo falar com você sobre nossos móveis na Móveis Morante.`;
    const { text: simulatedReply } = enforceMandatoryPhrases(sampleAiDraft, mandatoryPhrases, text);

    setSimulationResult({
      situation,
      matchedKeywords,
      relevantArticles,
      workflow,
      mandatoryPhrases,
      simulatedReplyPreview: simulatedReply,
    });
  };

  const handleRunRealSimulation = async (queryToTest?: string) => {
    const text = (queryToTest ?? testInput).trim();
    if (!text) return;

    setIsRunningReal(true);
    setSimulationResult(null);

    try {
      const currentSettings = getSettings();
      const res = await simulateWhatsAppAiTurn(
        supabase,
        text,
        {
          enabled: true,
          testMode: true,
          testPhoneNumbers: ['5541999998888'],
          systemPrompt,
          enabledTools,
          knowledgeBase,
          situationRules: rules,
          workflows,
        },
        currentSettings,
        { fetchOpenAi: createSimulatorOpenAiFetch(supabase) }
      );
      setRealResult(res);
    } catch (err: any) {
      setRealResult({
        executed: false,
        userQuery: text,
        situation: null,
        matchedKeywords: [],
        articlesUsed: [],
        workflowApplied: null,
        toolsCalled: [],
        mandatoryPhrasesEnforced: [],
        aiResponseText: '',
        executionTimeMs: 0,
        error: err?.message || String(err),
      });
    } finally {
      setIsRunningReal(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Simulador & Diagnóstico de Atendimento
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Teste em tempo real como o assistente, as regras, o ERP e as frases obrigatórias respondem a qualquer pergunta do cliente.
        </p>
      </div>

      {/* Caixa de Entrada e Ações */}
      <SimulatorInputCard
        testInput={testInput}
        setTestInput={setTestInput}
        isRunningReal={isRunningReal}
        onRunDiagnosis={handleRunDiagnosis}
        onRunRealSimulation={handleRunRealSimulation}
      />

      {/* Resultado da simulação real com OpenAI e ferramentas do ERP. */}
      {realResult && <SimulatorRealResultCard result={realResult} />}

      {/* Resultado do Diagnóstico Rápido */}
      {simulationResult && (
        <SimulatorDiagnosisCard
          situation={simulationResult.situation}
          matchedKeywords={simulationResult.matchedKeywords}
          relevantArticles={simulationResult.relevantArticles}
          workflow={simulationResult.workflow}
        />
      )}
    </div>
  );
});

AiAgentTabSimulator.displayName = 'AiAgentTabSimulator';
