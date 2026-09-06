import { AiCategory, AiRequestOptions, AiResponse } from './types/aiGatewayTypes';
import { AI_LIMITS } from './config/aiLimitsConfig';
import { AiDeduplicator } from './core/AiDeduplicator';
import { AiConcurrencyLimiter } from './core/AiConcurrencyLimiter';
import { AiCircuitBreaker } from './core/AiCircuitBreaker';
import { AiQuotaManager } from './core/AiQuotaManager';
import { supabase } from '../../pages/utils/supabaseConfig';
import { parseGeminiResponse } from './core/parseGeminiResponse';

export class AiGateway {
  /**
   * Ponto de entrada ÚNICO e OBRIGATÓRIO para requisições de Texto (Gemini 2.5 Flash)
   */
  public static async requestText(options: Omit<AiRequestOptions, 'category'>): Promise<AiResponse<string>> {
    return this.execute<string>({ ...options, category: 'TEXT' });
  }

  /**
   * Ponto de entrada ÚNICO e OBRIGATÓRIO para requisições de Imagem (Gemini 3.1 Flash Image)
   */
  public static async requestImage(options: Omit<AiRequestOptions, 'category'>): Promise<AiResponse<string>> {
    return this.execute<string>({ ...options, category: 'IMAGE' });
  }

  /**
   * Ponto de entrada ÚNICO e OBRIGATÓRIO para requisições de TTS / Voz (Gemini 3.1 Flash TTS)
   * Possui FALLBACK AUTOMÁTICO para sintetizador nativo de voz (Google Maps) se a cota for atingida.
   */
  public static async requestTts(
    text: string,
    options?: Partial<AiRequestOptions>
  ): Promise<AiResponse<{ audioUrl?: string; speechContent: string }>> {
    const res = await this.execute<{ audioUrl?: string; speechContent: string }>({
      category: 'TTS',
      operation: 'tts_speech_summary',
      payload: { text, voice: AI_LIMITS.categories.TTS.voice },
      ...options
    });

    // Fallback gracioso se a cota diária de TTS (30/dia) ou limite for atingido
    if (!res.success && (res.errorCode === 'AI_DAILY_LIMIT_REACHED' || res.errorCode === 'AI_FAIL_CLOSED_BLOCKED')) {
      console.warn('[AiGateway] Cota de TTS Gemini atingida. Ativando fallback para voz nativa Google Maps/Speech API.');
      this.speakWithNativeFallback(text);
      return {
        success: true,
        data: { speechContent: text },
        category: 'TTS',
        modelUsed: 'native-speech-fallback (Google Maps)',
        fallbackUsed: true,
        userFriendlyMessage: 'Sintetizando voz via áudio nativo (Fallback ativado por cota).'
      };
    }

    return res;
  }

  /**
   * Orquestrador de Execução do Gateway com Proteções
   */
  private static async execute<T>(options: AiRequestOptions): Promise<AiResponse<T>> {
    const { category, operation, payload, bypassDeduplication } = options;
    const categoryConfig = AI_LIMITS.categories[category];
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
        userFriendlyMessage: 'Sistema de IA temporariamente pausado por segurança. Tente novamente em 2 minutos.',
        category,
        modelUsed: categoryConfig.model
      };
    }

    // 3. Controle de Concorrência
    const concurrency = AiConcurrencyLimiter.tryAcquire(category);
    if (!concurrency.acquired) {
      return {
        success: false,
        errorCode: 'AI_CONCURRENCY_LIMIT_REACHED',
        errorMessage: concurrency.reason,
        userFriendlyMessage: 'Muitas solicitações de IA ativas ao mesmo tempo. Aguarde alguns segundos.',
        category,
        modelUsed: categoryConfig.model
      };
    }

    // Criar a promessa da execução
    const executionPromise = (async (): Promise<AiResponse<T>> => {
      try {
        // 4. Reserva Atômica de Cota (Pre-Allocation + FAIL CLOSED)
        const quota = await AiQuotaManager.reserveQuota(category);
        if (!quota.allowed) {
          AiCircuitBreaker.recordError(category, quota.errorMessage || 'Quota blocked');
          return {
            success: false,
            errorCode: quota.errorCode || 'AI_DAILY_LIMIT_REACHED',
            errorMessage: quota.errorMessage,
            userFriendlyMessage: category === 'TTS'
              ? 'Limite diário de voz de IA atingido (30/dia). Ativando voz nativa.'
              : 'Limite de uso de IA atingido. Novas gerações estarão disponíveis amanhã.',
            category,
            modelUsed: categoryConfig.model
          };
        }

        // 5. Chamada de Produção Proxied ao Gemini HTTP Backend
        const rawResult = await this.callGeminiApiProxied<T>(category, categoryConfig.model, payload);

        AiCircuitBreaker.recordSuccess(category);
        return {
          success: true,
          data: rawResult,
          category,
          modelUsed: categoryConfig.model,
          executionTimeMs: Date.now() - startTime
        };
      } catch (err: any) {
        AiCircuitBreaker.recordError(category, err.message || 'Error executing call');
        return {
          success: false,
          errorCode: 'AI_SERVICE_ERROR',
          errorMessage: err.message || 'Erro na comunicação com a API Gemini',
          userFriendlyMessage: 'Não foi possível processar a requisição de IA no momento.',
          category,
          modelUsed: categoryConfig.model
        };
      } finally {
        AiConcurrencyLimiter.release(category);
      }
    })();

    if (!bypassDeduplication) {
      AiDeduplicator.registerRequest(hash, executionPromise);
    }

    return executionPromise;
  }

  private static async callGeminiApiProxied<T>(category: AiCategory, model: string, payload: any): Promise<T> {
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.VITE_GEMINI_API_KEY : '');
    if (!apiKey) {
      try {
        const { data } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
        apiKey = data?.data?.geminiApiKey || data?.geminiApiKey || data?.settings_data?.geminiApiKey || '';
      } catch {
        // Fallback silencioso se der erro no supabase
      }
    }
    if (!apiKey) {
      throw new Error('Chave de API Gemini não configurada.');
    }

    if (category === 'TTS') {
      this.speakWithNativeFallback(payload?.text || '');
      return { speechContent: payload?.text } as any;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contents = typeof payload === 'string' ? [{ parts: [{ text: payload }] }] : payload;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, ...(category === 'IMAGE' ? {
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
      } : {}) })
    });

    if (!res.ok) {
      throw new Error(`Erro na API Gemini (${res.status}): ${await res.text()}`);
    }

    const json = await res.json();
    return parseGeminiResponse(json, category) as T;
  }

  private static speakWithNativeFallback(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const femalePtVoice = voices.find(v => v.lang.includes('pt') && (v.name.includes('Luciana') || v.name.includes('Francisca') || v.name.includes('Google') || v.name.includes('Maria')));
      if (femalePtVoice) utterance.voice = femalePtVoice;

      window.speechSynthesis.speak(utterance);
    }
  }
}
