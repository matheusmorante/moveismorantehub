import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: 'mock-id', error: null }),
  },
  ecommerceSupabase: {},
}));

import { GOLDEN_DATASET } from './goldenDataset';
import { EvaluatorEngine } from './evaluatorEngine';
import { ReportFormatter } from './reportFormatter';
import { EvalResult } from './types';
import { GeminiAgentService } from '../../geminiAgentService';

const isLiveEvalEnabled =
  process.env.RUN_LIVE_AI_EVAL === '1' ||
  process.env.RUN_LIVE_AI_EVAL === 'true';

describe('Suíte de Avaliação do Agente com IA Real (Gemini Flash) - Nível B', () => {
  const evalResults: EvalResult[] = [];
  const startTime = Date.now();

  // Seleção de casos representativos de ponta a ponta
  const liveCases = GOLDEN_DATASET.filter((tc) =>
    ['AMBIG-SALARY-BUSINESS', 'REAL-LANG-001', 'INTENT-QUESTION-001', 'HALLUC-PAYMENT-001'].includes(tc.id)
  );

  liveCases.forEach((testCase) => {
    it.skipIf(!isLiveEvalEnabled)(
      `[LIVE-AI] ${testCase.id} -> ${testCase.description}`,
      async () => {
        const userMessage =
          typeof testCase.input === 'string'
            ? testCase.input
            : testCase.input.find((m) => m.role === 'user')?.parts[0]?.text || '';

        const execution = await GeminiAgentService.sendMessage(userMessage, []);
        const evalResult = EvaluatorEngine.evaluateCase(
          testCase,
          execution.result,
          execution.result.executedTools
        );

        evalResults.push(evalResult);

        if (!evalResult.passed) {
          const diagnostic = ReportFormatter.formatDiagnostic(evalResult);
          console.warn(diagnostic);
        }

        expect(evalResult.passed, `Divergência na IA Real (${testCase.id}): ${evalResult.divergences.join('; ')}`).toBe(true);
      },
      30000
    );
  });

  it.skipIf(!isLiveEvalEnabled)('deve consolidar o relatório de avaliação da IA Real', () => {
    const duration = Date.now() - startTime;
    const metrics = EvaluatorEngine.calculateMetrics(evalResults, duration);
    const summary = ReportFormatter.formatSummary(metrics);
    console.log(summary);
  });
});
