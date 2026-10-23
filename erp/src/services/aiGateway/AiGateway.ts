import { AiCategory, AiRequestOptions, AiResponse } from './types/aiGatewayTypes';
import { AI_LIMITS, AI_MODELS, CHARACTERISTICS_AI_LIMITS } from './config/aiLimitsConfig';
import { AiDeduplicator } from './core/AiDeduplicator';
import { AiConcurrencyLimiter } from './core/AiConcurrencyLimiter';
import { AiCircuitBreaker } from './core/AiCircuitBreaker';
import { AiQuotaManager } from './core/AiQuotaManager';
import { supabase } from '../../pages/utils/supabaseConfig';
import { parseGeminiResponse } from './core/parseGeminiResponse';

import { AiLatencyTracker } from './core/AiLatencyTracker';
import { ApiUsageTracker } from '../apiMonitoring/apiUsageTracker';
import { inferModuleFromOperation } from '../apiMonitoring/apiModuleMapper';
import { clearModelAiQuotaAlert } from './aiQuotaNotifier';

export class AiGateway {
  /**
   * Ponto de entrada ÚNICO para requisições de Texto Rápido/Econômico (Gemini 3.5 Flash Lite)
   * Usado para descrições, categorias, títulos, atributos e extrações leves.
   */
  public static async requestText(
    options: Omit<AiRequestOptions, 'category'>
  ): Promise<AiResponse<string>> {
    return this.execute<string>({ ...options, category: 'TEXT', tier: options.tier || 'lite' });
  }

  /**
   * Ponto de entrada para tarefas de Raciocínio Estruturado e Fiscais (Gemini 3.8 Flash)
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
   * Ponto de entrada para cálculo de similaridade semântica e busca vetorial (Gemini Embedding 2)
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
   * Ponto de entrada ÚNICO e OBRIGATÓRIO para requisições de Imagem (Gemini 2.5/3.1 Flash Image)
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

    // 1. Deduplicação por Hash de Payload
    const hash = AiDeduplicator.generateHash(category, operation, payload);
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

        // 5. Determinar modelo efetivo
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

        // 6. Chamada de Produção Proxied ao Gemini HTTP Backend
        const rawResult = await this.callGeminiApiProxied<T>(
          category,
          effectiveModel,
          payload,
          operation,
          options.moduleSource,
          options.thinkingBudget,
          options.jsonMode,
          options.tools
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
        const isEmptyResponse = err?.name === 'GeminiEmptyResponseError';
        const modelUsed = options.model || categoryConfig.model;
        return {
          success: false,
          errorCode: isQuotaOrRateLimit ? 'AI_RATE_LIMIT_REACHED' : 'AI_SERVICE_ERROR',
          errorMessage: err.message || 'Erro na comunicação com a API Gemini',
          userFriendlyMessage: isQuotaOrRateLimit
            ? `Cota do modelo ${modelUsed} atingida (HTTP 429).`
            : isEmptyResponse
              ? 'A Gemini respondeu sem texto utilizável. O diagnóstico técnico foi salvo para investigação.'
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

  private static async callGeminiApiProxied<T>(
    category: AiCategory,
    model: string,
    payload: any,
    operation = 'unknown_ai_op',
    moduleSource?: string,
    thinkingBudget?: 'low' | 'medium' | 'high',
    jsonMode?: boolean,
    tools?: any[]
  ): Promise<T> {
    const callId = AiLatencyTracker.startCall(operation, model, category);
    const resolvedModule = moduleSource || inferModuleFromOperation(operation);
    const serviceId = category === 'IMAGE' ? 'gemini_image' : 'gemini_flash';

    const isEmbedding = model.includes('embedding') || operation.includes('embedding');
    const action = isEmbedding ? 'embedContent' : 'generateContent';

    let requestBody: any;
    if (isEmbedding) {
      requestBody = {
        content: {
          parts: [{ text: typeof payload === 'string' ? payload : JSON.stringify(payload) }],
        },
      };
    } else {
      const contents = typeof payload === 'string' ? [{ parts: [{ text: payload }] }] : payload;
      const generationConfig: any = {};
      if (category === 'IMAGE') {
        generationConfig.responseModalities = ['TEXT', 'IMAGE'];
      } else {
        if (jsonMode) {
          // A API do Google Gemini não suporta responseMimeType: 'application/json' quando tools ativas
          // (como googleSearch) estão habilitadas, retornando HTTP 400 INVALID_ARGUMENT.
          // Quando tools estão presentes, o formato JSON é garantido pelas instruções do prompt e extraído no parsing.
          if (!tools || tools.length === 0) {
            generationConfig.responseMimeType = 'application/json';
          }
        }
        if (thinkingBudget) {
          generationConfig.thinkingConfig = {
            thinkingBudget:
              thinkingBudget === 'low' ? 1024 : thinkingBudget === 'medium' ? 2048 : 4096,
          };
        }
      }
      requestBody = {
        contents,
        ...(Object.keys(generationConfig).length ? { generationConfig } : {}),
        ...(tools && tools.length ? { tools } : {}),
      };
    }

    const startFetch = Date.now();
    let responseHttpStatus: number | null = null;

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) throw new Error('Sessão inválida. Entre novamente.');
      const res = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ model, action, payload: requestBody }),
      });
      responseHttpStatus = res.status;

      const durationMs = Date.now() - startFetch;

      if (!res.ok) {
        const errText = await res.text();
        AiLatencyTracker.endCall(callId, false, 0, `HTTP ${res.status}: ${errText}`);
        void ApiUsageTracker.record({
          provider: 'gemini',
          service: serviceId,
          operation: `${operation} [${model}]`,
          units: 0,
          status: res.status === 429 ? 'RATE_LIMITED' : 'ERROR',
          http_status: res.status,
          module_source: resolvedModule,
          error_message: `HTTP ${res.status}: ${errText}`,
          response_time_ms: durationMs,
        });
        throw new Error(`Erro na API Gemini (${res.status}): ${errText}`);
      }

      const json = await res.json();
      const parsed = parseGeminiResponse(json, category) as T;
      const respSize =
        typeof parsed === 'string' ? parsed.length : JSON.stringify(parsed || {}).length;
      AiLatencyTracker.endCall(callId, true, respSize);

      const promptTokens = Number(json?.usageMetadata?.promptTokenCount || 0);
      const candidateTokens = Number(json?.usageMetadata?.candidatesTokenCount || 0);
      const totalTokens = Number(json?.usageMetadata?.totalTokenCount || 0);

      let units = 1;
      let costEstimated = 0;
      const usdRate = 5.6; // Câmbio estimado USD -> BRL

      if (category === 'IMAGE') {
        units = 1;
        costEstimated = 0.2;
      } else if (category === 'TEXT') {
        units =
          totalTokens ||
          Math.max(1, Math.round((typeof payload === 'string' ? payload.length : 100) / 4));
        if (model.includes('embedding')) {
          costEstimated = Number((units * 0.00000015 * usdRate).toFixed(4));
        } else if (model.includes('3.8-flash')) {
          costEstimated = Number(
            ((promptTokens * 0.00000075 + candidateTokens * 0.00000375) * usdRate).toFixed(4)
          );
        } else if (model.includes('2.5-flash')) {
          costEstimated = Number(
            ((promptTokens * 0.0000003 + candidateTokens * 0.0000025) * usdRate).toFixed(4)
          );
        } else {
          // gemini-3.5-flash-lite (padrão)
          costEstimated = Number(
            ((promptTokens * 0.0000001 + candidateTokens * 0.0000004) * usdRate).toFixed(4)
          );
        }
        if (costEstimated <= 0 && units > 0) {
          costEstimated = Number((units * 0.0000005 * usdRate).toFixed(4));
        }
      }

      void ApiUsageTracker.record({
        provider: 'gemini',
        service: serviceId,
        operation: `${operation} [${model}]`,
        units,
        status: 'SUCCESS',
        http_status: res.status,
        module_source: resolvedModule,
        response_time_ms: durationMs,
      });

      return parsed;
    } catch (fetchErr: any) {
      const durationMs = Date.now() - startFetch;
      AiLatencyTracker.endCall(callId, false, 0, fetchErr?.message || 'Network fetch failure');
      if (!fetchErr?.message?.includes('Erro na API Gemini')) {
        void ApiUsageTracker.record({
          provider: 'gemini',
          service: serviceId,
          operation,
          units: 0,
          status: 'ERROR',
          // 0 indica que a conexão falhou antes de receber uma resposta HTTP.
          http_status: responseHttpStatus ?? 0,
          module_source: resolvedModule,
          error_message:
            responseHttpStatus === null
              ? `Falha antes de receber resposta HTTP: ${fetchErr?.message || 'Network fetch failure'}`
              : fetchErr?.message || 'Falha ao processar resposta da API Gemini',
          response_time_ms: durationMs,
        });
      }
      throw fetchErr;
    }
  }
}
