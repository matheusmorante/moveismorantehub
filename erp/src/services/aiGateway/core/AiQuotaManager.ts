import { supabase } from '../../../pages/utils/supabaseConfig';
import { AiCategory, AiErrorCode } from '../types/aiGatewayTypes';
import { AI_LIMITS, CHARACTERISTICS_AI_LIMITS } from '../config/aiLimitsConfig';

export interface QuotaReserveResult {
  allowed: boolean;
  requestId?: string;
  errorCode?: AiErrorCode;
  errorMessage?: string;
  usedToday?: number;
  limitToday?: number;
  usedThisMonth?: number;
  monthlyLimit?: number;
  costThisMonthBRL?: number;
  monthlyBudgetBRL?: number;
}

export interface MonthlyUsageReport {
  usedCount: number;
  limitCount: number;
  costBRL: number;
  budgetBRL: number;
  remainingCount: number;
  remainingBRL: number;
  percentUsed: number;
}

interface CountQueryOptions {
  since: string;
  operation?: string;
  moduleSource?: string;
}

interface CharacteristicsUsageSnapshot {
  usedMinute: number;
  usedHour: number;
  usedToday: number;
  error?: any;
}

/**
 * Gerenciador de cotas de IA com Fail-Closed estrito, limites diários,
 * janelas móveis (por minuto e hora) e controle financeiro mensal em BRL.
 */
export class AiQuotaManager {
  // ─── Auxiliares Temporais ──────────────────────────────────────────────────

  public static getStartOfMonthIso(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01T00:00:00.000Z`;
  }

  public static getStartOfDayIso(): string {
    const today = new Date().toISOString().split('T')[0];
    return `${today}T00:00:00.000Z`;
  }

  public static getIsoSince(millisecondsAgo: number): string {
    return new Date(Date.now() - millisecondsAgo).toISOString();
  }

  // ─── Consultas de Contagem DRY ─────────────────────────────────────────────

  private static async countUsage(
    options: CountQueryOptions
  ): Promise<{ count: number; error: any }> {
    let query: any = supabase
      .from('api_usage_logs')
      .select('id', { count: 'exact', head: true })
      .in('provider', ['gemini', 'openai']);

    if (options.operation) {
      query = query.eq('operation', options.operation);
    }
    if (options.moduleSource) {
      query = query.eq('module_source', options.moduleSource);
    }

    query = query.eq('status', 'SUCCESS').gte('created_at', options.since);
    const { count, error } = await query;
    return { count: count || 0, error };
  }

  private static async fetchCharacteristicsCounts(): Promise<CharacteristicsUsageSnapshot> {
    const startOfDay = this.getStartOfDayIso();
    const oneHourAgo = this.getIsoSince(60 * 60 * 1000);
    const oneMinuteAgo = this.getIsoSince(60 * 1000);
    const operation = CHARACTERISTICS_AI_LIMITS.operation;

    // Preserva rigorosamente a ordem: dia (0), hora (1), minuto (2)
    const [dayRes, hourRes, minuteRes] = await Promise.all([
      this.countUsage({ operation, since: startOfDay }),
      this.countUsage({ operation, since: oneHourAgo }),
      this.countUsage({ operation, since: oneMinuteAgo }),
    ]);

    const error = dayRes.error || hourRes.error || minuteRes.error;
    return {
      usedToday: dayRes.count,
      usedHour: hourRes.count,
      usedMinute: minuteRes.count,
      error,
    };
  }

  // ─── Relatório Mensal ──────────────────────────────────────────────────────

  public static async getMonthlyUsage(category: AiCategory = 'IMAGE'): Promise<MonthlyUsageReport> {
    const categoryConfig = AI_LIMITS.categories[category];
    const budgetBRL = categoryConfig.monthlyBudgetBRL ?? 30.0;
    const limitCount = categoryConfig.perMonth ?? 150;
    const unitCost = categoryConfig.estimatedCostPerUnitBRL ?? 0.2;

    try {
      const startOfMonth = this.getStartOfMonthIso();
      const { data: logs } = await supabase
        .from('api_usage_logs')
        .select('cost_estimated, units')
        .in('provider', ['gemini', 'openai'])
        .eq('module_source', category)
        .eq('status', 'SUCCESS')
        .gte('created_at', startOfMonth);

      const logsList = logs || [];
      const usedCount = logsList.length;
      const totalCost = logsList.reduce((acc, log: any) => {
        const val = Number(log.cost_estimated);
        return acc + (val > 0 ? val : unitCost);
      }, 0);

      const remainingBRL = Math.max(0, budgetBRL - totalCost);
      const remainingCount = Math.max(0, limitCount - usedCount);
      const percentUsed =
        budgetBRL > 0 ? Math.min(100, Math.round((totalCost / budgetBRL) * 100)) : 0;

      return {
        usedCount,
        limitCount,
        costBRL: Number(totalCost.toFixed(2)),
        budgetBRL,
        remainingCount,
        remainingBRL: Number(remainingBRL.toFixed(2)),
        percentUsed,
      };
    } catch {
      return {
        usedCount: 0,
        limitCount,
        costBRL: 0,
        budgetBRL,
        remainingCount: limitCount,
        remainingBRL: budgetBRL,
        percentUsed: 0,
      };
    }
  }

  // ─── Reserva de Cota por Categoria (Global & Categoria) ────────────────────

  public static async reserveQuota(category: AiCategory): Promise<QuotaReserveResult> {
    const categoryConfig = AI_LIMITS.categories[category];
    const globalConfig = AI_LIMITS.global;
    const unitCost = categoryConfig.estimatedCostPerUnitBRL ?? 0.2;

    try {
      const startOfDay = this.getStartOfDayIso();
      const startOfMonth = this.getStartOfMonthIso();

      // 1. Consultar consumo do dia para a categoria e global
      const [globalRes, categoryRes] = await Promise.all([
        this.countUsage({ since: startOfDay }),
        this.countUsage({ since: startOfDay, moduleSource: category }),
      ]);

      if (globalRes.error || categoryRes.error) {
        const error = globalRes.error || categoryRes.error;
        console.error('[AiQuotaManager] FAIL CLOSED: Erro ao consultar cotas:', error?.message);
        return {
          allowed: false,
          errorCode: 'AI_FAIL_CLOSED_BLOCKED',
          errorMessage: `FAIL CLOSED: Erro de comunicação com o sistema de cota (${error?.message}). Requisição IA bloqueada preventivamente.`,
        };
      }

      const globalTodayCount = globalRes.count;
      const categoryTodayCount = categoryRes.count;

      // 2. Validar Limite Global Diário
      if (globalTodayCount >= globalConfig.perDay) {
        return {
          allowed: false,
          errorCode: 'AI_DAILY_LIMIT_REACHED',
          errorMessage: `Limite Diário Global de IA Atingido: ${globalTodayCount}/${globalConfig.perDay} requisições utilizadas hoje. Tente novamente amanhã.`,
          usedToday: globalTodayCount,
          limitToday: globalConfig.perDay,
        };
      }

      // 3. Validar Limite da Categoria Diária
      if (categoryTodayCount >= categoryConfig.perDay) {
        return {
          allowed: false,
          errorCode: 'AI_DAILY_LIMIT_REACHED',
          errorMessage: `Limite Diário de ${category} Atingido: ${categoryTodayCount}/${categoryConfig.perDay} requisições utilizadas hoje.`,
          usedToday: categoryTodayCount,
          limitToday: categoryConfig.perDay,
        };
      }

      // 4. Validação de Limite Mensal em Reais (ex: R$ 30,00/mês para IMAGE)
      if (categoryConfig.monthlyBudgetBRL !== undefined || categoryConfig.perMonth !== undefined) {
        const { data: monthLogs, error: monthError } = await supabase
          .from('api_usage_logs')
          .select('cost_estimated')
          .in('provider', ['gemini', 'openai'])
          .eq('module_source', category)
          .eq('status', 'SUCCESS')
          .gte('created_at', startOfMonth);

        if (monthError) {
          console.error('[AiQuotaManager] FAIL CLOSED: Erro ao consultar cota mensal:', monthError.message);
          return {
            allowed: false,
            errorCode: 'AI_FAIL_CLOSED_BLOCKED',
            errorMessage: 'FAIL CLOSED: Erro ao verificar cota mensal. Requisição bloqueada preventivamente.',
          };
        }

        const monthList = monthLogs || [];
        const monthCount = monthList.length;
        const totalCostRaw = monthList.reduce((acc, l: any) => {
          const c = Number(l.cost_estimated);
          return acc + (c > 0 ? c : unitCost);
        }, 0);
        const totalCostThisMonth = Number(totalCostRaw.toFixed(2));

        if (
          categoryConfig.monthlyBudgetBRL &&
          totalCostThisMonth >= categoryConfig.monthlyBudgetBRL
        ) {
          return {
            allowed: false,
            errorCode: 'AI_MONTHLY_LIMIT_REACHED',
            errorMessage: `Limite Mensal de R$ ${categoryConfig.monthlyBudgetBRL.toFixed(2)} Atingido: O consumo deste mês alcançou R$ ${totalCostThisMonth.toFixed(2)} (${monthCount} gerações). A cota será renovada no dia 1º.`,
            usedToday: categoryTodayCount,
            limitToday: categoryConfig.perDay,
            usedThisMonth: monthCount,
            monthlyBudgetBRL: categoryConfig.monthlyBudgetBRL,
            costThisMonthBRL: totalCostThisMonth,
          };
        }

        if (categoryConfig.perMonth && monthCount >= categoryConfig.perMonth) {
          return {
            allowed: false,
            errorCode: 'AI_MONTHLY_LIMIT_REACHED',
            errorMessage: `Limite Mensal de ${categoryConfig.perMonth} gerações atingido (${monthCount} utilizadas este mês). A cota será renovada no dia 1º.`,
            usedToday: categoryTodayCount,
            limitToday: categoryConfig.perDay,
            usedThisMonth: monthCount,
            monthlyLimit: categoryConfig.perMonth,
          };
        }
      }

      // 5. Registrar pré-alocação com custo estimado antes da chamada externa
      const preAllocRequestId = await this.recordPreAllocation({
        service: categoryConfig.model,
        operation: 'pre_allocation_reservation',
        moduleSource: category,
        costEstimated: unitCost,
        prefix: 'pre_alloc',
      });

      return {
        allowed: true,
        usedToday: categoryTodayCount + 1,
        limitToday: categoryConfig.perDay,
        requestId: preAllocRequestId,
      };
    } catch (e: any) {
      console.error('[AiQuotaManager] FAIL CLOSED EXCEPTION:', e);
      return {
        allowed: false,
        errorCode: 'AI_FAIL_CLOSED_BLOCKED',
        errorMessage: 'FAIL CLOSED: Falha inesperada no validador de cota. Requisição bloqueada por segurança.',
      };
    }
  }

  // ─── Extração de Características (Minuto, Hora, Dia) ────────────────────────

  public static async getCharacteristicsUsageStats(): Promise<{
    usedToday: number;
    limitToday: number;
    usedHour: number;
    limitHour: number;
    usedMinute: number;
    limitMinute: number;
  }> {
    const limitMinute = CHARACTERISTICS_AI_LIMITS.perMinute;
    const limitHour = CHARACTERISTICS_AI_LIMITS.perHour;
    const limitToday = CHARACTERISTICS_AI_LIMITS.perDay;

    try {
      const counts = await this.fetchCharacteristicsCounts();
      if (counts.error) {
        return { usedToday: limitToday, limitToday, usedHour: limitHour, limitHour, usedMinute: limitMinute, limitMinute };
      }

      return {
        usedToday: counts.usedToday,
        limitToday,
        usedHour: counts.usedHour,
        limitHour,
        usedMinute: counts.usedMinute,
        limitMinute,
      };
    } catch {
      return { usedToday: limitToday, limitToday, usedHour: limitHour, limitHour, usedMinute: limitMinute, limitMinute };
    }
  }

  public static async reserveCharacteristicsQuota(): Promise<QuotaReserveResult> {
    const limitMinute = CHARACTERISTICS_AI_LIMITS.perMinute;
    const limitHour = CHARACTERISTICS_AI_LIMITS.perHour;
    const limitToday = CHARACTERISTICS_AI_LIMITS.perDay;
    const operation = CHARACTERISTICS_AI_LIMITS.operation;
    const model = CHARACTERISTICS_AI_LIMITS.model;

    try {
      const counts = await this.fetchCharacteristicsCounts();
      if (counts.error) {
        console.error('[AiQuotaManager] FAIL CLOSED: Erro de banco ao consultar cotas de características:', counts.error?.message);
        return {
          allowed: false,
          errorCode: 'AI_FAIL_CLOSED_BLOCKED',
          errorMessage: 'FAIL CLOSED: Erro de comunicação com o sistema de cotas. Requisição bloqueada preventivamente por segurança.',
        };
      }

      const { usedMinute, usedHour, usedToday } = counts;

      // 1. Limite móvel por minuto para bloquear rajadas de cliques ou loops
      if (usedMinute >= limitMinute) {
        return {
          allowed: false,
          errorCode: 'AI_RATE_LIMIT_REACHED',
          errorMessage: `Limite de segurança atingido: já foram realizadas ${usedMinute}/${limitMinute} requisições de preenchimento com IA no último minuto. Aguarde antes de tentar novamente.`,
          usedToday,
          limitToday,
        };
      }

      // 2. Trava da janela deslizante de 1 hora (20 requisições/hora)
      if (usedHour >= limitHour) {
        return {
          allowed: false,
          errorCode: 'AI_HOURLY_LIMIT_REACHED',
          errorMessage: `Limite de segurança atingido: já foram realizadas ${usedHour}/${limitHour} requisições de preenchimento com IA na última hora. Aguarde alguns minutos para novas tentativas.`,
          usedToday,
          limitToday,
        };
      }

      // 3. Trava diária (80 requisições/dia)
      if (usedToday >= limitToday) {
        return {
          allowed: false,
          errorCode: 'AI_DAILY_LIMIT_REACHED',
          errorMessage: `Limite diário atingido: ${usedToday}/${limitToday} requisições de preenchimento com IA utilizadas hoje. A cota será renovada amanhã.`,
          usedToday,
          limitToday,
        };
      }

      // 4. Registrar pré-alocação antes da chamada externa
      const preAllocRequestId = await this.recordPreAllocation({
        service: model,
        operation,
        moduleSource: 'characteristics_ai',
        costEstimated: 0.05,
        prefix: 'char_quota',
      });

      return {
        allowed: true,
        usedToday: usedToday + 1,
        limitToday,
        requestId: preAllocRequestId,
      };
    } catch (e: any) {
      console.error('[AiQuotaManager] FAIL CLOSED EXCEPTION:', e);
      return {
        allowed: false,
        errorCode: 'AI_FAIL_CLOSED_BLOCKED',
        errorMessage: 'FAIL CLOSED: Falha inesperada ao validar cota. Requisição bloqueada por segurança.',
      };
    }
  }

  // ─── Registro Atômico de Pré-alocação ───────────────────────────────────────

  private static async recordPreAllocation(params: {
    service: string;
    operation: string;
    moduleSource: string;
    costEstimated: number;
    prefix: string;
  }): Promise<string> {
    const isDev =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const requestId = `${params.prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const { error } = await supabase.from('api_usage_logs').insert([
      {
        provider: 'openai',
        service: params.service,
        operation: params.operation,
        units: 1,
        status: 'SUCCESS',
        http_status: 200,
        module_source: params.moduleSource,
        cost_estimated: params.costEstimated,
        environment: isDev ? 'development' : 'production',
        request_id: requestId,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      throw new Error(`Falha ao reservar cota de IA no banco: ${error.message}`);
    }
    return requestId;
  }
}
