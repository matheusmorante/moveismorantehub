import { supabase } from '../../../pages/utils/supabaseConfig';
import { AiCategory, AiErrorCode } from '../types/aiGatewayTypes';
import { AI_LIMITS } from '../config/aiLimitsConfig';

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
    const unitCost = categoryConfig.estimatedCostPerUnitBRL ?? 0.20;

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
      const percentUsed = budgetBRL > 0 ? Math.min(100, Math.round((totalCost / budgetBRL) * 100)) : 0;

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
    const unitCost = categoryConfig.estimatedCostPerUnitBRL ?? 0.20;

    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const startOfMonth = this.getStartOfMonthIso();

      // 1. Consultar consumo do dia para a categoria e global
      const { data: logs, error } = await supabase
        .from('api_usage_logs')
        .select('module_source, created_at')
        .eq('provider', 'gemini')
        .eq('status', 'SUCCESS')
        .gte('created_at', startOfDay);

      if (error) {
        console.error('[AiQuotaManager] FAIL CLOSED: Erro de banco ao consultar cotas:', error.message);
        return {
          allowed: false,
          errorCode: 'AI_FAIL_CLOSED_BLOCKED',
          errorMessage: `FAIL CLOSED: Erro de comunicação com o sistema de cota (${error.message}). Requisição IA bloqueada preventivamente.`
        };
      }

      const logsList = logs || [];
      const globalTodayCount = logsList.length;
      const categoryTodayCount = logsList.filter((l: any) => l.module_source === category).length;

      // 2. Validar Limite Global Diário
      if (globalTodayCount >= globalConfig.perDay) {
        return {
          allowed: false,
          errorCode: 'AI_DAILY_LIMIT_REACHED',
          errorMessage: `Limite Diário Global de IA Atingido: ${globalTodayCount}/${globalConfig.perDay} requisições utilizadas hoje. Tente novamente amanhã.`,
          usedToday: globalTodayCount,
          limitToday: globalConfig.perDay
        };
      }

      // 3. Validar Limite da Categoria Diária
      if (categoryTodayCount >= categoryConfig.perDay) {
        return {
          allowed: false,
          errorCode: 'AI_DAILY_LIMIT_REACHED',
          errorMessage: `Limite Diário de ${category} Atingido: ${categoryTodayCount}/${categoryConfig.perDay} gerações utilizadas hoje. Tente novamente amanhã.`,
          usedToday: categoryTodayCount,
          limitToday: categoryConfig.perDay
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
          console.error('[AiQuotaManager] FAIL CLOSED: Erro ao consultar cota mensal:', monthError.message);
          return {
            allowed: false,
            errorCode: 'AI_FAIL_CLOSED_BLOCKED',
            errorMessage: `FAIL CLOSED: Erro ao verificar cota mensal. Requisição bloqueada preventivamente.`
          };
        }

        const monthList = monthLogs || [];
        const monthCount = monthList.length;
        const totalCostRaw = monthList.reduce((acc, l: any) => {
          const c = Number(l.cost_estimated);
          return acc + (c > 0 ? c : unitCost);
        }, 0);
        const totalCostThisMonth = Number(totalCostRaw.toFixed(2));

        if (categoryConfig.monthlyBudgetBRL && totalCostThisMonth >= categoryConfig.monthlyBudgetBRL) {
          return {
            allowed: false,
            errorCode: 'AI_MONTHLY_LIMIT_REACHED',
            errorMessage: `Limite Mensal de R$ ${categoryConfig.monthlyBudgetBRL.toFixed(2)} Atingido: O consumo deste mês alcançou R$ ${totalCostThisMonth.toFixed(2)} (${monthCount} gerações). A cota será renovada no dia 1º.`,
            usedToday: categoryTodayCount,
            limitToday: categoryConfig.perDay,
            usedThisMonth: monthCount,
            monthlyBudgetBRL: categoryConfig.monthlyBudgetBRL,
            costThisMonthBRL: totalCostThisMonth
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
            monthlyLimit: categoryConfig.perMonth
          };
        }
      }

      // 5. Reservar cota com registro atômico de pré-alocação com custo estimado persistido
      await supabase.from('api_usage_logs').insert([{
        provider: 'gemini',
        service: categoryConfig.model,
        operation: 'pre_allocation_reservation',
        units: 1,
        status: 'SUCCESS',
        http_status: 200,
        module_source: category,
        cost_estimated: unitCost,
        environment: typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'development' : 'production',
        request_id: `pre_alloc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        created_at: new Date().toISOString()
      }]);

      return {
        allowed: true,
        usedToday: categoryTodayCount + 1,
        limitToday: categoryConfig.perDay
      };
    } catch (e: any) {
      console.error('[AiQuotaManager] FAIL CLOSED EXCEPTION:', e);
      return {
        allowed: false,
        errorCode: 'AI_FAIL_CLOSED_BLOCKED',
        errorMessage: `FAIL CLOSED: Falha inesperada no validador de cota. Requisição bloqueada por segurança.`
      };
    }
  }
}
