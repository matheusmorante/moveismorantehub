import { AiCategory, AiRequestOptions, AiResponse } from './types/aiGatewayTypes';
import { AI_LIMITS, AI_MODELS, CHARACTERISTICS_AI_LIMITS } from './config/aiLimitsConfig';
import { AiDeduplicator } from './core/AiDeduplicator';
import { AiConcurrencyLimiter } from './core/AiConcurrencyLimiter';
import { AiCircuitBreaker } from './core/AiCircuitBreaker';
import { AiQuotaManager } from './core/AiQuotaManager';
import { supabase } from '../../pages/utils/supabaseConfig';
import { parseOpenAiResponse } from './core/parseOpenAiResponse';
import { AiLatencyTracker } from './core/AiLatencyTracker';
import { inferModuleFromOperation } from '../apiMonitoring/apiModuleMapper';
import { clearModelAiQuotaAlert } from './aiQuotaNotifier';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { buildOpenAiPayload } from './core/openAiPayloadBuilder';
import { calculateOpenAiCost } from './core/openAiCostCalculator';
import { AiGatewayUsageLogger } from './core/aiGatewayUsageLogger';

export class AiGateway {
  /**
   * Ponto de entrada para geração de texto com GPT-6 Luna.
   * Usado para descrições, categorias, títulos, atributos e extrações leves.
   */
  public static async requestText(
    options: Omit<AiRequestOptions, 'category'>
  ): Promise<AiResponse<string>> {
    return this.execute<string>({ ...options, category: 'TEXT', tier: options.tier || 'lite' });
  }

  /**
   * Ponto de entrada para tarefas de raciocínio estruturado e fiscais com GPT-6 Luna.
   * Usado para sugestão de NCM, regras tributárias e casos difíceis com thinking low/medium.
   */
  public static async requestReasoning(
    options: Omit<AiRequestOptions, 'category' | 'tier'>
  ): Promise<AiResponse<string>> {
    return this.execute<string>({
      ...options,
      category: 'TEXT',
      tier: 'reasoning',
      model: AI_MODELS.REASONING,
      thinkingBudget: options.thinkingBudget || 'low',
    });
  }

  /**
   * Ponto de entrada para embeddings e busca vetorial com o modelo OpenAI especializado.
   */
  public static async requestEmbedding(
    text: string,
    moduleSource = 'general'
  ): Promise<AiResponse<number[]>> {
    return this.execute<number[]>({
      operation: 'generate_embedding',
      payload: text,
      category: 'TEXT',
      tier: 'embedding',
      model: AI_MODELS.EMBEDDING,
      moduleSource,
    });
  }

  /**
   * Ponto de entrada obrigatório para geração de imagens com GPT Image 2.
   */
  public static async requestImage(
    options: Omit<AiRequestOptions, 'category'>
  ): Promise<AiResponse<string>> {
    return this.execute<string>({ ...options, category: 'IMAGE' });
  }

  /**
   * Orquestrador de Execução do Gateway com Proteções
   */
  private static async execute<T>(options: AiRequestOptions): Promise<AiResponse<T>> {
    const { category, operation, payload, bypassDeduplication } = options;
    const categoryConfig = AI_LIMITS.categories[category];
    const isCharacteristicsOp = operation === CHARACTERISTICS_AI_LIMITS.operation;
    const concurrencyOperationKey = isCharacteristicsOp ? operation : undefined;
    const startTime = Date.now();

    const effectiveModel =
      options.model ||
      (isCharacteristicsOp
        ? CHARACTERISTICS_AI_LIMITS.model
        : options.tier === 'reasoning'
          ? AI_MODELS.REASONING
          : options.tier === 'embedding'
            ? AI_MODELS.EMBEDDING
            : options.tier === 'lite'
              ? AI_MODELS.LITE
              : categoryConfig.model);

    // 1. Deduplicação com identidade das opções e do contexto da chamada.
    const hash = AiDeduplicator.generateHash(category, operation, {
      payload,
      model: effectiveModel,
      tier: options.tier,
      thinkingBudget: options.thinkingBudget,
      jsonMode: options.jsonMode,
      tools: options.tools,
      userOrSource: options.userOrSource,
      moduleSource: options.moduleSource,
    });
    if (!bypassDeduplication) {
      const inFlight = AiDeduplicator.getInFlightRequest<AiResponse<T>>(hash);
      if (inFlight) {
        return inFlight;
      }
    }

    // 2. Checagem de Circuit Breaker
    const cbCheck = AiCircuitBreaker.check(category);
    if (cbCheck.isOpen) {
      return {
        success: false,
        errorCode: 'AI_CIRCUIT_BREAKER_OPEN',
        errorMessage: cbCheck.reason,
        userFriendlyMessage:
          'Sistema de IA temporariamente pausado por segurança. Tente novamente em 2 minutos.',
        category,
        modelUsed: categoryConfig.model,
      };
    }

    // 3. Controle de Concorrência
    const concurrency = AiConcurrencyLimiter.tryAcquire(
      category,
      concurrencyOperationKey,
      isCharacteristicsOp ? CHARACTERISTICS_AI_LIMITS.concurrent : undefined
    );
    if (!concurrency.acquired) {
      return {
        success: false,
        errorCode: 'AI_CONCURRENCY_LIMIT_REACHED',
        errorMessage: concurrency.reason,
        userFriendlyMessage:
          'Muitas solicitações de IA ativas ao mesmo tempo. Aguarde alguns segundos.',
        category,
        modelUsed: categoryConfig.model,
      };
    }

    // Criar a promessa da execução
    const executionPromise = (async (): Promise<AiResponse<T>> => {
      try {
        // 4. Reserva de cota antes da chamada externa (FAIL CLOSED)
        const quota = isCharacteristicsOp
          ? await AiQuotaManager.reserveCharacteristicsQuota()
          : await AiQuotaManager.reserveQuota(category);

        if (!quota.allowed) {
          AiCircuitBreaker.recordError(category, quota.errorMessage || 'Quota blocked');
          return {
            success: false,
            errorCode: quota.errorCode || 'AI_DAILY_LIMIT_REACHED',
            errorMessage: quota.errorMessage,
            userFriendlyMessage:
              quota.errorMessage ||
              'Limite de uso de IA atingido. Novas gerações estarão disponíveis amanhã.',
            category,
            modelUsed: isCharacteristicsOp ? CHARACTERISTICS_AI_LIMITS.model : categoryConfig.model,
          };
        }

        // 5. Chamada de produção protegida ao backend OpenAI.
        const rawResult = await this.callOpenAiProxied<T>(
          category,
          effectiveModel,
          payload,
          operation,
          options.moduleSource,
          options.thinkingBudget,
          options.jsonMode,
          options.tools,
          quota.requestId
        );

        AiCircuitBreaker.recordSuccess(category);
        clearModelAiQuotaAlert(effectiveModel);
        return {
          success: true,
          data: rawResult,
          category,
          modelUsed: effectiveModel,
          executionTimeMs: Date.now() - startTime,
        };
      } catch (err: any) {
        AiCircuitBreaker.recordError(category, err.message || 'Error executing call');
        const isQuotaOrRateLimit = /429|resource_exhausted|quota|rate limit/i.test(
          err?.message || ''
        );
        const isEmptyResponse = err?.name === 'OpenAiEmptyResponseError';
        const modelUsed = options.model || categoryConfig.model;
        return {
          success: false,
          errorCode: isQuotaOrRateLimit ? 'AI_RATE_LIMIT_REACHED' : 'AI_SERVICE_ERROR',
          errorMessage: err.message || 'Erro na comunicação com a API OpenAI',
          userFriendlyMessage: isQuotaOrRateLimit
            ? `Cota do modelo ${modelUsed} atingida (HTTP 429).`
            : isEmptyResponse
              ? 'A OpenAI respondeu sem texto utilizável. O diagnóstico técnico foi salvo para investigação.'
              : 'Não foi possível processar a requisição de IA no momento.',
          category,
          modelUsed,
        };
      } finally {
        AiConcurrencyLimiter.release(category, concurrencyOperationKey);
      }
    })();

    if (!bypassDeduplication) {
      AiDeduplicator.registerRequest(hash, executionPromise);
    }

    return executionPromise;
  }

  private static async callOpenAiProxied<T>(
    category: AiCategory,
    model: string,
    payload: any,
    operation = 'unknown_ai_op',
    moduleSource?: string,
    thinkingBudget?: 'low' | 'medium' | 'high',
    jsonMode?: boolean,
    tools?: any[],
    preAllocRequestId?: string
  ): Promise<T> {
    const callId = AiLatencyTracker.startCall(operation, model, category);
    const resolvedModule = moduleSource || inferModuleFromOperation(operation);
    const isEmbedding = model.includes('embedding') || operation.includes('embedding');
    const serviceId = category === 'IMAGE' ? 'openai_image' : isEmbedding ? 'openai_embedding' : 'openai_gpt';

    const { kind, requestBody } = buildOpenAiPayload({
      category,
      model: category === 'IMAGE' ? AI_MODELS.LITE : model,
      imageModel: AI_MODELS.IMAGE,
      payload,
      operation,
      jsonMode,
      thinkingBudget,
      tools,
    });

    const startFetch = Date.now();
    let responseHttpStatus: number | null = null;
    const controller = new AbortController();
    const expired = Symbol('expired');

    try {
      const request = async () => {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (controller.signal.aborted) throw new Error('Consulta OpenAI encerrada.');
        const accessToken = sessionData.session?.access_token;
        if (sessionError || !accessToken) throw new Error('Sessão inválida. Entre novamente.');
        const res = await fetch('/api/openai-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ action: kind, request: requestBody, moduleSource: resolvedModule }),
          signal: controller.signal,
        });
        responseHttpStatus = res.status;
        if (!res.ok) throw new Error(`Erro na API OpenAI (HTTP ${res.status}).`);
        return await res.json().catch(() => {
          throw new Error('A API OpenAI retornou uma resposta inválida.');
        });
      };

      // Margem sobre os 45 s do proxy, incluindo sessão e leitura do corpo.
      const json = await withTimeout(
        request(),
        60_000,
        expired,
        'gateway:transporte OpenAI'
      );
      if (json === expired) throw new Error('A consulta OpenAI excedeu o tempo de espera.');
      const durationMs = Date.now() - startFetch;
      const parsed = parseOpenAiResponse(json, category, kind) as T;
      const respSize =
        typeof parsed === 'string' ? parsed.length : JSON.stringify(parsed || {}).length;
      AiLatencyTracker.endCall(callId, true, respSize);

      const { units, costEstimated } = calculateOpenAiCost(
        category,
        kind,
        payload,
        json?.usage
      );

      AiGatewayUsageLogger.logSuccess({
        serviceId,
        operation,
        model,
        units,
        costEstimated,
        responseHttpStatus,
        moduleSource: resolvedModule,
        durationMs,
        preAllocRequestId,
      });

      return parsed;
    } catch (fetchErr: any) {
      const durationMs = Date.now() - startFetch;
      const safeMessage = responseHttpStatus === null
        ? 'Consulta OpenAI interrompida ou indisponível.'
        : `Falha na consulta OpenAI (HTTP ${responseHttpStatus}).`;
      AiLatencyTracker.endCall(callId, false, 0, safeMessage);

      AiGatewayUsageLogger.logFailure({
        serviceId,
        operation,
        responseHttpStatus,
        moduleSource: resolvedModule,
        durationMs,
        safeMessage,
        preAllocRequestId,
      });

      throw fetchErr;
    } finally {
      controller.abort();
    }
  }
}
