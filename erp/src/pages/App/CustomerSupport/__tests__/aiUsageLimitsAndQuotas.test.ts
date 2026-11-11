import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  aiUsageLimitsSchema,
  operatingHoursQuotaSchema,
  DEFAULT_AI_USAGE_LIMITS,
} from '../../../../../../shared-utils/aiUsageLimitSchemas';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import { ApiConfigService } from '@/services/apiMonitoring/apiConfigService';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';
import { supabase } from '@/pages/utils/supabaseConfig';
import { runAiTurnWithFallback } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiModelRunner';

describe('Limites de Uso de IA e Cotas (ERP, Mobile e WhatsApp) — Teto R$ 30,00/mês', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiUsageGuard.clearCache();
  });

  describe('1. Validação de Schemas Zod de Limites de IA', () => {
    it('valida com sucesso os valores padrão (DEFAULT_AI_USAGE_LIMITS) de R$ 30,00 mensal', () => {
      const parsed = aiUsageLimitsSchema.safeParse(DEFAULT_AI_USAGE_LIMITS);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.monthlyBudgetBRL).toBe(30.0);
        expect(parsed.data.hardLimitPercent).toBe(95);
        expect(parsed.data.dailyMaxRequests).toBe(250);
        expect(parsed.data.hourlyMaxRequests).toBe(60);
        expect(parsed.data.operatingHours.start).toBe('08:00');
        expect(parsed.data.operatingHours.end).toBe('22:00');
        expect(parsed.data.operatingHours.offHoursHourlyMaxRequests).toBe(5);
      }
    });

    it('rejeita orçamento mensal negativo ou zero', () => {
      const invalidNegative = {
        ...DEFAULT_AI_USAGE_LIMITS,
        monthlyBudgetBRL: -5,
      };
      const resultNegative = aiUsageLimitsSchema.safeParse(invalidNegative);
      expect(resultNegative.success).toBe(false);

      const invalidZero = {
        ...DEFAULT_AI_USAGE_LIMITS,
        monthlyBudgetBRL: 0,
      };
      const resultZero = aiUsageLimitsSchema.safeParse(invalidZero);
      expect(resultZero.success).toBe(false);
    });

    it('valida o formato HH:mm de horários de funcionamento operacional', () => {
      const valid = operatingHoursQuotaSchema.safeParse({
        enabled: true,
        start: '07:30',
        end: '21:45',
        allowOffHoursEmergency: true,
        offHoursHourlyMaxRequests: 3,
      });
      expect(valid.success).toBe(true);

      const invalidTime = operatingHoursQuotaSchema.safeParse({
        enabled: true,
        start: '25:00',
        end: '22:00',
        allowOffHoursEmergency: true,
        offHoursHourlyMaxRequests: 3,
      });
      expect(invalidTime.success).toBe(false);
    });
  });

  describe('2. ApiUsageGuard com RPC Autoritativa e Trava de Orçamento', () => {
    it('permite chamada quando check_and_reserve_ai_quota autoriza dentro da cota', async () => {
      vi.spyOn(ApiConfigService, 'getConfiguration').mockResolvedValue({
        service_id: 'openai_gpt',
        metric: 'tokens', billing_unit: 'tokens', free_allowance: 0, currency: 'BRL',
        service_name: 'OpenAI GPT-4o-mini / Luna',
        provider: 'openai',
        monthly_limit: 10000,
        warning_threshold: 80,
        critical_threshold: 90,
        hard_limit: 95,
        price_per_unit: 0.002,
        max_monthly_budget_brl: 30.0,
        circuit_breaker_max_per_minute: 15,
        enabled: true,
        block_on_hard_limit: true,
        criticality: 'IMPORTANT',
      });

      vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: {
          allowed: true,
          status: 'ALLOW',
          monthly_budget_brl: 30.0,
          month_cost_brl: 12.5,
          remaining_month_budget_brl: 17.5,
          month_percent: 41.7,
          today_requests: 45,
          hour_requests: 8,
        },
        error: null,
      } as any);

      vi.spyOn(ApiUsageTracker, 'getCurrentMonthUsage').mockResolvedValue(450);

      const result = await ApiUsageGuard.check('openai_gpt');
      expect(result.allowed).toBe(true);
      expect(result.status).toBe('ALLOW');
    });

    it('bloqueia na pré-validação local quando a estimativa mensal alcança o teto', async () => {
      vi.spyOn(ApiConfigService, 'getConfiguration').mockResolvedValue({
        service_id: 'openai_gpt',
        metric: 'tokens', billing_unit: 'tokens', free_allowance: 0, currency: 'BRL',
        service_name: 'OpenAI GPT-4o-mini / Luna',
        provider: 'openai',
        monthly_limit: 10000,
        warning_threshold: 80,
        critical_threshold: 90,
        hard_limit: 95,
        price_per_unit: 0.002,
        max_monthly_budget_brl: 30.0,
        circuit_breaker_max_per_minute: 15,
        enabled: true,
        block_on_hard_limit: true,
        criticality: 'IMPORTANT',
      });

      vi.spyOn(ApiUsageTracker, 'getCurrentMonthUsage').mockResolvedValue(15000);

      const result = await ApiUsageGuard.check('openai_gpt');
      expect(result.allowed).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.reason).toContain('teto limite financeiro');
    });

    it('deixa a avaliação de horário para a cota autoritativa do servidor', async () => {
      vi.spyOn(ApiConfigService, 'getConfiguration').mockResolvedValue({
        service_id: 'gemini_flash',
        metric: 'tokens', billing_unit: 'tokens', free_allowance: 0, currency: 'BRL',
        service_name: 'Google Gemini Flash',
        provider: 'gemini',
        monthly_limit: 10000,
        warning_threshold: 80,
        critical_threshold: 90,
        hard_limit: 95,
        price_per_unit: 0.001,
        max_monthly_budget_brl: 30.0,
        circuit_breaker_max_per_minute: 15,
        enabled: true,
        block_on_hard_limit: true,
        criticality: 'IMPORTANT',
      });

      vi.spyOn(ApiUsageTracker, 'getCurrentMonthUsage').mockResolvedValue(0);

      const result = await ApiUsageGuard.check('gemini_flash');
      expect(result.allowed).toBe(true);
      expect(result.status).toBe('ALLOW');
    });
  });

  describe('3. WhatsApp AI Agent — Handoff Gracioso ao Atingir Limite de Cota', () => {
    it('intercepta turno no pré-flight de cota e encaminha diretamente para atendimento humano', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockImplementation(async (name: string) => name === 'customer_support_record_ai_handoff'
          ? { data: true, error: null } : ({
          data: {
            allowed: false,
            status: 'BLOCKED',
            code: 'MONTHLY_BUDGET_EXCEEDED',
            reason: 'Teto de R$ 30,00 mensal atingido.',
          },
          error: null,
        })),
      } as any;

      const fetchOpenAi = vi.fn();
      const fetchGemini = vi.fn();

      const result = await runAiTurnWithFallback({
        shouldUseOpenAi: true,
        openAiApiKey: 'sk-test-key',
        geminiApiKey: 'gemini-test-key',
        modelToUse: 'gpt-6-luna',
        fetchOpenAi,
        fetchGemini,
        systemInstructionText: 'Você é Lizandro.',
        historyForOpenAi: [{ role: 'user', content: 'Gostaria de ver sofás' }],
        contentsForGemini: [],
        toolsDeclarations: [],
        toolsPayloadGemini: [],
        supabase: mockSupabase,
        toolContext: { conversationId: 'conv-quota-test', contactPhone: '+5541999999999' },
      });

      // Não deve chamar rede de nenhum provedor se a cota foi atingida
      expect(fetchOpenAi).not.toHaveBeenCalled();
      expect(fetchGemini).not.toHaveBeenCalled();

      // Deve retornar mensagem acolhedora de esgotamento e a ferramenta de transbordo
      expect(result.text).toContain('atingiu o limite de atendimentos automáticos');
      expect(result.toolsCalled).toContain('encaminharParaAtendimentoHumano');
      expect(result.errorInfo?.type).toBe('quota_exhausted');
      expect(result.errorInfo?.canFallback).toBe(false);
    });

    it('prossegue com OpenAI e grava tokens consumidos quando a cota está liberada', async () => {
      const rpcCalls: string[] = [];
      const mockSupabase = {
        rpc: vi.fn().mockImplementation(async (fn: string) => {
          rpcCalls.push(fn);
          if (fn === 'customer_support_reserve_ai_quota') {
            return {
              data: {
                allowed: true,
                reservation_id: 'reservation-test',
                status: 'ALLOW',
                monthly_budget_brl: 30.0,
                month_cost_brl: 5.2,
              },
              error: null,
            };
          }
          if (fn === 'record_ai_token_usage') {
            return { data: { log_id: 'log-test', reservation_committed: true }, error: null };
          }
          return { data: null, error: null };
        }),
      } as any;

      const fetchOpenAi = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output_text: 'Temos excelentes opções de sofás retráteis!',
          output: [],
          usage: {
            input_tokens: 350,
            output_tokens: 60,
            total_tokens: 410,
          },
        }),
      });

      const fetchGemini = vi.fn();

      const result = await runAiTurnWithFallback({
        shouldUseOpenAi: true,
        openAiApiKey: 'sk-test-key',
        geminiApiKey: 'gemini-test-key',
        modelToUse: 'gpt-6-luna',
        fetchOpenAi,
        fetchGemini,
        systemInstructionText: 'Você é Lizandro.',
        historyForOpenAi: [{ role: 'user', content: 'Olá' }],
        contentsForGemini: [],
        toolsDeclarations: [],
        toolsPayloadGemini: [],
        supabase: mockSupabase,
      });

      expect(fetchOpenAi).toHaveBeenCalledTimes(1);
      expect(result.text).toBe('Temos excelentes opções de sofás retráteis!');
      // Comprova que verificou a cota antes e registrou os tokens depois
      expect(rpcCalls).toContain('customer_support_reserve_ai_quota');
      expect(rpcCalls).toContain('record_ai_token_usage');
    });
  });
});
