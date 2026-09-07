import { TestCase, EvalResult, EvalMetrics } from './types';
import { AgentExecutionResult, ExecutedToolRecord } from '../../geminiAgentTypes';

/**
 * MOTOR DE AVALIAÇÃO DO AGENTE IA
 * 
 * Compara a saída real ou simulada do agente com os contratos do TestCase
 * e produz diagnósticos ricos de divergência (CASO, ESPERADO, RECEBIDO, DIFERENÇA).
 */
export class EvaluatorEngine {
  public static evaluateCase(
    testCase: TestCase,
    executionResult: AgentExecutionResult,
    executedTools: ExecutedToolRecord[]
  ): EvalResult {
    const divergences: string[] = [];
    const calledTools = executedTools.map((t) => (t as any).name || (t as any).toolName || '');
    const toolArgs = executedTools.map((t) => t.args);
    const agentAnswer = executionResult.answer || '';
    const askedUser =
      agentAnswer.includes('?') ||
      /\b(qual|quanto|como|foi|deseja|confirma)\b/i.test(agentAnswer);
    const mutatedDatabase = calledTools.some((t) =>
      ['criarMovimentacaoFinanceira', 'cancelarOuExcluirMovimentacaoFinanceira'].includes(t)
    );

    const { expected } = testCase;

    // 1. Verificação de Tools Esperadas
    if (expected.expectedTools) {
      for (const expTool of expected.expectedTools) {
        if (!calledTools.includes(expTool)) {
          divergences.push(
            `TOOL AUSENTE: Esperava que a ferramenta '${expTool}' fosse executada, mas as chamadas foram: [${calledTools.join(', ') || 'nenhuma'}].`
          );
        }
      }
    }

    // 2. Verificação de Tools Proibidas (Ex: Criar movimentação em perguntas ou dados incompletos)
    if (expected.prohibitedTools) {
      for (const prohTool of expected.prohibitedTools) {
        if (calledTools.includes(prohTool)) {
          divergences.push(
            `TOOL PROIBIDA EXECUTADA: A ferramenta '${prohTool}' NUNCA deveria ser chamada neste cenário, mas foi executada.`
          );
        }
      }
    }

    // 3. Verificação de Argumentos Esperados
    if (expected.expectedArgs) {
      // Localiza a chamada de criação ou a tool relevante
      const creationArgs = toolArgs.find((a) => a.valor !== undefined || a.finalidade !== undefined) || toolArgs[0] || {};
      for (const [key, expectedVal] of Object.entries(expected.expectedArgs)) {
        if (expectedVal === undefined) {
          if (creationArgs[key] !== undefined) {
            divergences.push(
              `CONTAMINAÇÃO/INFERÊNCIA INDEVIDA: O campo '${key}' não deveria ter sido preenchido, mas recebeu: ${JSON.stringify(creationArgs[key])}.`
            );
          }
        } else if (creationArgs[key] !== undefined) {
          const actualVal = creationArgs[key];
          if (typeof expectedVal === 'number') {
            if (Number(actualVal) !== Number(expectedVal)) {
              divergences.push(
                `ARGUMENTO DIVERGENTE (${key}): Esperado valor numérico ${expectedVal}, recebido ${actualVal}.`
              );
            }
          } else if (String(actualVal).toUpperCase() !== String(expectedVal).toUpperCase()) {
            divergences.push(
              `ARGUMENTO DIVERGENTE (${key}): Esperado '${expectedVal}', recebido '${actualVal}'.`
            );
          }
        }
      }
    }

    // 4. Verificação de Não-Alucinação / Campos que NÃO podem ser inferidos
    if (expected.prohibitedInferences) {
      const creationArgs = toolArgs.find((a) => a.valor !== undefined || a.formaPagamento !== undefined) || {};
      for (const field of expected.prohibitedInferences) {
        if (creationArgs[field] !== undefined && creationArgs[field] !== null && creationArgs[field] !== '') {
          divergences.push(
            `ALUCINAÇÃO DETECTADA: O campo '${field}' foi inventado/inferido pelo agente (${JSON.stringify(creationArgs[field])}) sem que o usuário o informasse.`
          );
        }
      }
    }

    // 5. Verificação de Pergunta Obrigatória ao Usuário
    if (expected.mustAskUser && !askedUser) {
      divergences.push(
        `PERGUNTA AUSENTE: O agente deveria ter feito uma pergunta ou solicitado esclarecimento, mas respondeu sem questionar: "${agentAnswer}".`
      );
    }

    // 6. Verificação de Palavras-Chave da Pergunta
    if (expected.questionKeywords && expected.questionKeywords.length > 0) {
      const lowerAnswer = agentAnswer.toLowerCase();
      const hasAnyKeyword = expected.questionKeywords.some((kw) =>
        lowerAnswer.includes(kw.toLowerCase())
      );
      if (!hasAnyKeyword) {
        divergences.push(
          `TEMA DA PERGUNTA INCORRETO: A resposta do agente deveria conter um dos seguintes termos: [${expected.questionKeywords.join(', ')}]. Resposta: "${agentAnswer}".`
        );
      }
    }

    // 7. Verificação de Termos Proibidos na Resposta (Jargões Técnicos em Inglês)
    if (expected.prohibitedResponseTerms) {
      for (const term of expected.prohibitedResponseTerms) {
        if (agentAnswer.includes(term)) {
          divergences.push(
            `JARGÃO TÉCNICO PROIBIDO NA RESPOSTA: A mensagem exibiu o termo técnico '${term}' ao usuário em vez de falar em linguagem natural.`
          );
        }
      }
    }

    // 8. Bloqueio de Execução Mutável
    if (expected.shouldBlockExecution && mutatedDatabase) {
      divergences.push(
        `SEGURANÇA VIOLADA: O agente alterou dados no ERP quando a ação deveria ter sido estritamente bloqueada.`
      );
    }

    const inputSummary =
      typeof testCase.input === 'string'
        ? testCase.input
        : testCase.input.map((m) => `${m.role}: ${m.parts[0]?.text || ''}`).join(' | ');

    return {
      testId: testCase.id,
      category: testCase.category,
      description: testCase.description,
      passed: divergences.length === 0,
      inputSummary,
      expected,
      received: {
        intent: expected.intent,
        calledTools,
        toolArgs,
        agentAnswer,
        askedUser,
        mutatedDatabase,
      },
      divergences,
    };
  }

  public static calculateMetrics(results: EvalResult[], durationMs: number): EvalMetrics {
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    const byCategory: Record<string, { total: number; passed: number }> = {};
    const byIntent: Record<string, { total: number; passed: number }> = {};
    let hallucinationsDetected = 0;
    let prohibitedToolViolations = 0;

    for (const r of results) {
      if (!byCategory[r.category]) {
        byCategory[r.category] = { total: 0, passed: 0 };
      }
      byCategory[r.category].total++;
      if (r.passed) byCategory[r.category].passed++;

      const intent = r.expected.intent;
      if (!byIntent[intent]) {
        byIntent[intent] = { total: 0, passed: 0 };
      }
      byIntent[intent].total++;
      if (r.passed) byIntent[intent].passed++;

      for (const d of r.divergences) {
        if (d.includes('ALUCINAÇÃO DETECTADA')) hallucinationsDetected++;
        if (d.includes('TOOL PROIBIDA EXECUTADA')) prohibitedToolViolations++;
      }
    }

    return {
      total,
      passed,
      failed,
      successRate,
      byCategory: byCategory as any,
      byIntent,
      hallucinationsDetected,
      prohibitedToolViolations,
      durationMs,
    };
  }
}
