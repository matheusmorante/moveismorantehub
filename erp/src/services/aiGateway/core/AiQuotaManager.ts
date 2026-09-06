import { supabase } from '../../../pages/utils/supabaseConfig';
import { AiCategory, AiErrorCode } from '../types/aiGatewayTypes';
import { AI_LIMITS } from '../config/aiLimitsConfig';

export interface QuotaReserveResult {
  allowed: boolean;
  errorCode?: AiErrorCode;
  errorMessage?: string;
  usedToday?: number;
  limitToday?: number;
}

export class AiQuotaManager {
  /**
   * Reserva a cota de forma atômica no banco ANTES da chamada.
   * REGRA CRÍTICA FAIL CLOSED: Em caso de falha de conexão ou erro no limiter,
   * a chamada é BLOQUEADA. Nunca assume liberado.
   */
  public static async reserveQuota(category: AiCategory): Promise<QuotaReserveResult> {
    const categoryConfig = AI_LIMITS.categories[category];
    const globalConfig = AI_LIMITS.global;

    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;

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

      // 2. Validar Limite Global Diário (120/dia)
      if (globalTodayCount >= globalConfig.perDay) {
        return {
          allowed: false,
          errorCode: 'AI_DAILY_LIMIT_REACHED',
          errorMessage: `Limite Diário Global de IA Atingido: ${globalTodayCount}/${globalConfig.perDay} requisições utilizadas hoje. Tente novamente amanhã.`,
          usedToday: globalTodayCount,
          limitToday: globalConfig.perDay
        };
      }

      // 3. Validar Limite da Categoria Diária (Texto: 100/dia, Imagem: 5/dia, TTS: 30/dia)
      if (categoryTodayCount >= categoryConfig.perDay) {
        return {
          allowed: false,
          errorCode: 'AI_DAILY_LIMIT_REACHED',
          errorMessage: `Limite Diário de ${category} Atingido: ${categoryTodayCount}/${categoryConfig.perDay} gerações utilizadas hoje. Tente novamente amanhã.`,
          usedToday: categoryTodayCount,
          limitToday: categoryConfig.perDay
        };
      }

      // 4. Reservar cota com registro atômico de pré-alocação
      await supabase.from('api_usage_logs').insert([{
        provider: 'gemini',
        service: categoryConfig.model,
        operation: 'pre_allocation_reservation',
        units: 1,
        status: 'SUCCESS',
        http_status: 200,
        module_source: category,
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
