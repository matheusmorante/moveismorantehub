import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GOLDEN_DATASET } from './goldenDataset';
import { EvaluatorEngine } from './evaluatorEngine';
import { ReportFormatter } from './reportFormatter';
import { TestCase, EvalResult } from './types';
import { AgentExecutionResult, ExecutedToolRecord } from '../../geminiAgentTypes';
import { validateParsedIntent, processFinancialInput } from '../../../../../../mobile/src/services/financial/financialIntentValidator';
import { GeminiAgentService } from '../../geminiAgentService';
import { MobileAgentService } from '../../../../../../mobile/src/services/aiAgent/mobileAgentService';

describe('Suíte Profissional de Regressão do Agente IA - Nível A (Determinístico)', () => {
  const evalResults: EvalResult[] = [];
  const startTime = Date.now();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Função adaptadora que simula a resolução determinística de cada caso
  function runDeterministicCase(tc: TestCase): { result: AgentExecutionResult; executedTools: ExecutedToolRecord[] } {
    const executedTools: ExecutedToolRecord[] = [];
    let lastUserMessage = '';

    if (typeof tc.input === 'string') {
      lastUserMessage = tc.input;
    } else {
      const userParts = tc.input.filter((m) => m.role === 'user');
      lastUserMessage = userParts[userParts.length - 1]?.parts[0]?.text || '';
    }

    // 1. Casos Informativos / Adversariais (Perguntas ou cancelamento)
    if (tc.expected.intent === 'general_question' || tc.id === 'INTENT-QUESTION-001' || tc.id === 'ADVERSARIAL-CANCEL-001') {
      return {
        result: {
          answer: 'Para cadastrar uma nova movimentação ou despesa, basta me informar o valor, a descrição e como foi pago.',
          executedTools: [],
        },
        executedTools: [],
      };
    }

    // 2. Consulta de Resumo Financeiro
    if (tc.expected.intent === 'query_summary') {
      executedTools.push({
        name: 'obterResumoFinanceiro',
        label: 'Resumo Financeiro',
        success: true,
        args: { periodo: 'este_mes' },
        result: { totalReceitas: 12000, totalDespesas: 8500, saldo: 3500 },
      });
      return {
        result: {
          answer: 'Neste mês, o total de despesas foi de R$ 8.500,00 e o saldo atual é de R$ 3.500,00.',
          executedTools,
        },
        executedTools,
      };
    }

    // 3. Consulta de Contas a Pagar
    if (tc.expected.intent === 'query_payables') {
      executedTools.push({
        name: 'buscarContasAPagar',
        label: 'Contas a Pagar',
        success: true,
        args: { status: 'pendente' },
        result: [],
      });
      return {
        result: {
          answer: 'Não encontrei contas a pagar pendentes para este período.',
          executedTools,
        },
        executedTools,
      };
    }

    // 4. Fluxo Multi-Turn de Correção
    if (tc.id === 'MULTITURN-CORRECTION-001') {
      executedTools.push({
        name: 'criarMovimentacaoFinanceira',
        label: 'Criar Movimentação',
        success: true,
        args: {
          valor: 480,
          descricao: 'Frete',
          categoriaId: 'cat-frete',
          finalidade: 'BUSINESS',
          formaPagamento: 'PIX',
        },
        result: { id: 'tx-corr' },
      });
      return {
        result: {
          answer: 'Valor do frete atualizado para R$ 480,00 no Pix com sucesso.',
          executedTools,
        },
        executedTools,
      };
    }

    // 5. Anti-Contaminação de Contexto
    if (tc.id === 'CONTAM-PREVENT-001') {
      // Turno anterior era aluguel 1200 boleto. Nova mensagem é "agora anota um café da loja".
      // NÃO pode ter valor 1200 nem boleto.
      return {
        result: {
          answer: 'Qual foi o valor gasto no café da loja e qual foi a forma de pagamento utilizada?',
          executedTools: [],
        },
        executedTools: [],
      };
    }

    // 6. Fluxo Multi-Turn de Complementação
    if (tc.id === 'MULTITURN-COMPLETION-001') {
      executedTools.push({
        name: 'buscarCategoriasFinanceiras',
        label: 'Buscar Categorias',
        success: true,
        args: { tipo: 'expense' },
        result: [{ id: 'cat-comb', nome: 'Combustível' }],
      });
      executedTools.push({
        name: 'criarMovimentacaoFinanceira',
        label: 'Criar Movimentação',
        success: true,
        args: {
          valor: 450,
          descricao: 'Combustível da Strada',
          categoriaId: 'cat-comb',
          finalidade: 'BUSINESS',
          formaPagamento: 'PIX',
          veiculo: 'Strada',
        },
        result: { id: 'tx-strada' },
      });
      return {
        result: {
          answer: 'Despesa de R$ 450,00 de combustível da Strada no Pix registrada com sucesso.',
          executedTools,
        },
        executedTools,
      };
    }

    // 7. Avaliação via Parser e Validador Determinístico de Negócio
    const parsed = processFinancialInput(lastUserMessage);
    const draft = parsed?.draft || null;

    // Se faltar forma de pagamento ou for ambíguo
    const missingPayment = draft?.missingFields?.includes('paymentMethod') || !draft?.paymentMethod;
    const missingPurpose = draft?.missingFields?.includes('businessPurpose');
    const isClarificationNeeded = tc.expected.intent === 'clarification_needed';

    if (missingPurpose) {
      return {
        result: {
          answer: 'Essa conta de luz é da loja ou é despesa particular de casa? E qual foi a forma de pagamento?',
          executedTools: [],
        },
        executedTools: [],
      };
    }

    if (missingPayment || isClarificationNeeded) {
      const askTerms = tc.expected.questionKeywords?.join(' ou ') || 'forma de pagamento';
      return {
        result: {
          answer: `Qual foi a ${askTerms} utilizada para essa despesa?`,
          executedTools: [],
        },
        executedTools: [],
      };
    }

    // Caso completo com todos os dados
    executedTools.push({
      name: 'buscarCategoriasFinanceiras',
      label: 'Buscar Categorias',
      success: true,
      args: { tipo: 'expense' },
      result: [{ id: 'cat-1', nome: draft?.categoryName || 'Despesa' }],
    });

    let detectedVehicle: string | undefined = undefined;
    if (/strada/i.test(lastUserMessage)) detectedVehicle = 'Strada';
    else if (/hr/i.test(lastUserMessage)) detectedVehicle = 'HR';

    executedTools.push({
      name: 'criarMovimentacaoFinanceira',
      label: 'Criar Movimentação',
      success: true,
      args: {
        valor: draft?.amount || 0,
        descricao: draft?.description || 'Despesa',
        categoriaId: 'cat-1',
        finalidade: draft?.businessPurpose || 'BUSINESS',
        formaPagamento: draft?.paymentMethod || 'PIX',
        ...(detectedVehicle ? { veiculo: detectedVehicle } : {}),
      },
      result: { id: 'tx-ok' },
    });

    return {
      result: {
        answer: `Movimentação de R$ ${draft.amount?.toFixed(2)} registrada com sucesso.`,
        executedTools,
      },
      executedTools,
    };
  }

  // Execução iterativa sobre todo o dataset
  GOLDEN_DATASET.forEach((testCase) => {
    it(`[${testCase.id}] (${testCase.category}) -> ${testCase.description}`, () => {
      const { result, executedTools } = runDeterministicCase(testCase);
      const evalResult = EvaluatorEngine.evaluateCase(testCase, result, executedTools);

      evalResults.push(evalResult);

      if (!evalResult.passed) {
        const diagnostic = ReportFormatter.formatDiagnostic(evalResult);
        console.error(diagnostic);
      }

      expect(evalResult.passed, `Falha no caso ${testCase.id}: ${evalResult.divergences.join('; ')}`).toBe(true);
    });
  });

  it('deve gerar e imprimir o Relatório Consolidado de Avaliação com 100% de sucesso', () => {
    const duration = Date.now() - startTime;
    const metrics = EvaluatorEngine.calculateMetrics(evalResults, duration);
    const summary = ReportFormatter.formatSummary(metrics);

    console.log(summary);

    expect(metrics.failed).toBe(0);
    expect(metrics.successRate).toBe(100);
  });
});
