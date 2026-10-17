import { supabase } from '../../../pages/utils/supabaseConfig';
import { AiCategory, AiErrorCode } from '../types/aiGatewayTypes';
import { AI_LIMITS, CHARACTERISTICS_AI_LIMITS } from '../config/aiLimitsConfig';

export interface QuotaReserveResult {
  allowed: boolean;
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

export class AiQuotaManager {
  /**
   * Retorna o início do mês corrente em formato ISO UTC
   */
  public static getStartOfMonthIso(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01T00:00:00.000Z`;
  }

  /**
   * Consulta o relatório de uso mensal de uma categoria (ex: IMAGE com teto de R$ 30,00)
   */
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
        .eq('provider', 'gemini')
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

  /**
   * Reserva a cota de forma atômica no banco ANTES da chamada.
   * REGRA CRÍTICA FAIL CLOSED: Em caso de falha de conexão ou erro no limiter,
   * a chamada é BLOQUEADA. Nunca assume liberado.
   */
  public static async reserveQuota(category: AiCategory): Promise<QuotaReserveResult> {
    const categoryConfig = AI_LIMITS.categories[category];
    const globalConfig = AI_LIMITS.global;
    const unitCost = categoryConfig.estimatedCostPerUnitBRL ?? 0.2;

    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const startOfMonth = this.getStartOfMonthIso();

      // 1. Consultar consumo do dia para a categoria e global
      const [globalRes, categoryRes] = await Promise.all([
        supabase
          .from('api_usage_logs')
          .select('id', { count: 'exact', head: true })
          .eq('provider', 'gemini')
          .eq('status', 'SUCCESS')
          .gte('created_at', startOfDay),
        supabase
          .from('api_usage_logs')
          .select('id', { count: 'exact', head: true })
          .eq('provider', 'gemini')
          .eq('status', 'SUCCESS')
          .eq('module_source', category)
          .gte('created_at', startOfDay),
      ]);

      if (globalRes.error || categoryRes.error) {
        const error = globalRes.error || categoryRes.error;
        console.error(
          '[AiQuotaManager] FAIL CLOSED: Erro de banco ao consultar cotas:',
          error?.message
        );
        return {
          allowed: false,
          errorCode: 'AI_FAIL_CLOSED_BLOCKED',
          errorMessage: `FAIL CLOSED: Erro de comunicação com o sistema de cota (${error?.message}). Requisição IA bloqueada preventivamente.`,
        };
      }

      const globalTodayCount = globalRes.count || 0;
      const categoryTodayCount = categoryRes.count || 0;

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

      // 4. Validação Específica de Limite Mensal em Reais (ex: R$ 30,00/mês para IMAGE)
      if (categoryConfig.monthlyBudgetBRL !== undefined || categoryConfig.perMonth !== undefined) {
        const { data: monthLogs, error: monthError } = await supabase
          .from('api_usage_logs')
          .select('cost_estimated')
          .eq('provider', 'gemini')
          .eq('module_source', category)
          .eq('status', 'SUCCESS')
          .gte('created_at', startOfMonth);

        if (monthError) {
          console.error(
            '[AiQuotaManager] FAIL CLOSED: Erro ao consultar cota mensal:',
            monthError.message
          );
          return {
            allowed: false,
            errorCode: 'AI_FAIL_CLOSED_BLOCKED',
            errorMessage: `FAIL CLOSED: Erro ao verificar cota mensal. Requisição bloqueada preventivamente.`,
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

      // 5. Reservar cota com registro atômico de pré-alocação com custo estimado persistido
      await this.recordPreAllocation({
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
      };
    } catch (e: any) {
      console.error('[AiQuotaManager] FAIL CLOSED EXCEPTION:', e);
      return {
        allowed: false,
        errorCode: 'AI_FAIL_CLOSED_BLOCKED',
        errorMessage: `FAIL CLOSED: Falha inesperada no validador de cota. Requisição bloqueada por segurança.`,
      };
    }
  }

  /**
   * Consulta o consumo atual da extração de características (hoje e na última hora)
   */
  public static async getCharacteristicsUsageStats(): Promise<{
    usedToday: number;
    limitToday: number;
    usedHour: number;
    limitHour: number;
  }> {
    const limitHour = CHARACTERISTICS_AI_LIMITS.perHour;
    const limitToday = CHARACTERISTICS_AI_LIMITS.perDay;

    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const [dayRes, hourRes] = await Promise.all([
        supabase
          .from('api_usage_logs')
          .select('id', { count: 'exact', head: true })
          .eq('provider', 'gemini')
          .eq('operation', CHARACTERISTICS_AI_LIMITS.operation)
          .eq('status', 'SUCCESS')
          .gte('created_at', startOfDay),
        supabase
          .from('api_usage_logs')
          .select('id', { count: 'exact', head: true })
          .eq('provider', 'gemini')
          .eq('operation', CHARACTERISTICS_AI_LIMITS.operation)
          .eq('status', 'SUCCESS')
          .gte('created_at', oneHourAgo),
      ]);

      return {
        usedToday: dayRes.count || 0,
        limitToday,
        usedHour: hourRes.count || 0,
        limitHour,
      };
    } catch {
      return {
        usedToday: 0,
        limitToday,
        usedHour: 0,
        limitHour,
      };
    }
  }

  /**
   * Reserva atômica para a extração de características com trava estrita de 20 req/hora.
   * REGRA FAIL-CLOSED: Qualquer erro de comunicação com o banco bloqueia preventivamente.
   */
  public static async reserveCharacteristicsQuota(): Promise<QuotaReserveResult> {
    const limitHour = CHARACTERISTICS_AI_LIMITS.perHour;
    const limitToday = CHARACTERISTICS_AI_LIMITS.perDay;
    const operation = CHARACTERISTICS_AI_LIMITS.operation;
    const model = CHARACTERISTICS_AI_LIMITS.model;

    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // 1. Consultar consumo hoje e na última hora de forma atômica
      const [dayRes, hourRes] = await Promise.all([
        supabase
          .from('api_usage_logs')
          .select('id', { count: 'exact', head: true })
          .eq('provider', 'gemini')
          .eq('operation', operation)
          .eq('status', 'SUCCESS')
          .gte('created_at', startOfDay),
        supabase
          .from('api_usage_logs')
          .select('id', { count: 'exact', head: true })
          .eq('provider', 'gemini')
          .eq('operation', operation)
          .eq('status', 'SUCCESS')
          .gte('created_at', oneHourAgo),
      ]);

      if (dayRes.error || hourRes.error) {
        const error = dayRes.error || hourRes.error;
        console.error(
          '[AiQuotaManager] FAIL CLOSED: Erro de banco ao consultar cotas de características:',
          error?.message
        );
        return {
          allowed: false,
          errorCode: 'AI_FAIL_CLOSED_BLOCKED',
          errorMessage:
            'FAIL CLOSED: Erro de comunicação com o sistema de cotas. Requisição bloqueada preventivamente por segurança.',
        };
      }

      const usedHour = hourRes.count || 0;
      const usedToday = dayRes.count || 0;

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

      // 4. Registrar pré-alocação atômica no api_usage_logs
      await this.recordPreAllocation({
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
      };
    } catch (e: any) {
      console.error('[AiQuotaManager] FAIL CLOSED EXCEPTION:', e);
      return {
        allowed: false,
        errorCode: 'AI_FAIL_CLOSED_BLOCKED',
        errorMessage:
          'FAIL CLOSED: Falha inesperada ao validar cota. Requisição bloqueada por segurança.',
      };
    }
  }

  /**
   * Helper privado para registro atômico de pré-alocação no log de consumo (DRY)
   */
  private static async recordPreAllocation(params: {
    service: string;
    operation: string;
    moduleSource: string;
    costEstimated: number;
    prefix: string;
  }): Promise<void> {
    const isDev =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    await supabase.from('api_usage_logs').insert([
      {
        provider: 'gemini',
        service: params.service,
        operation: params.operation,
        units: 1,
        status: 'SUCCESS',
        http_status: 200,
        module_source: params.moduleSource,
        cost_estimated: params.costEstimated,
        environment: isDev ? 'development' : 'production',
        request_id: `${params.prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        created_at: new Date().toISOString(),
      },
    ]);
  }
}

