import type { AiWorkflowConfig } from '../../settings/types.js';
import { DEFAULT_WORKFLOWS } from '../../../../../../shared-utils/whatsappAiAgentSchemas.js';

export const SITUATION_WORKFLOW_MAP: Record<string, string> = {
  consulta_formas_pagamento: 'compra',
  orcamento_produto: 'consulta_produto',
  duvida_entrega: 'duvida_entrega',
  reclamacao_avaria: 'reclamacao',
  solicitacao_atendente: 'humano',
};

/**
 * Encontra o fluxo de atendimento aplicável para a situação ou intenção
 */
export function findApplicableWorkflow(
  situationKey: string | null = null,
  workflows: readonly AiWorkflowConfig[] = DEFAULT_WORKFLOWS
): AiWorkflowConfig | null {
  if (!Array.isArray(workflows) || workflows.length === 0) {
    return null;
  }

  const activeWorkflows = workflows.filter((w) => w.enabled !== false);
  if (activeWorkflows.length === 0) {
    return null;
  }

  if (situationKey && SITUATION_WORKFLOW_MAP[situationKey]) {
    const targetKey = SITUATION_WORKFLOW_MAP[situationKey];
    const match = activeWorkflows.find((w) => w.workflowKey === targetKey);
    if (match) return match;
  }

  return activeWorkflows[0] || null;
}

/**
 * Formata as etapas do fluxo de atendimento para orientar o modelo
 */
export function formatWorkflowForPrompt(workflow: AiWorkflowConfig | null): string {
  if (!workflow || !Array.isArray(workflow.steps) || workflow.steps.length === 0) {
    return '';
  }

  const lines: string[] = [
    `\nFLUXO DE ATENDIMENTO APLICÁVEL: "${workflow.name}"`,
  ];

  if (workflow.description) {
    lines.push(`Objetivo do fluxo: ${workflow.description}`);
  }

  lines.push('Etapas orientadas para conduzir este atendimento:');
  workflow.steps.forEach((step) => {
    lines.push(`- ${step}`);
  });

  if (workflow.handoffTrigger) {
    lines.push('Atenção: Este fluxo prevê encaminhamento para equipe humana conforme necessidade.');
  }

  return lines.join('\n');
}
