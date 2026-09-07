import { ApiUsageGuard } from '../apiMonitoring/apiUsageGuard';
import { ApiUsageTracker } from '../apiMonitoring/apiUsageTracker';
import { getSettings } from '../../pages/utils/settingsService';
import { GeminiContent, GeminiTool, GeminiToolConfig } from './geminiAgentTypes';

// Cliente HTTP para a API Gemini v1beta com monitoramento de cotas e circuit breaker

export interface GeminiGenerateRequest {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
  tools?: GeminiTool[];
  toolConfig?: GeminiToolConfig;
  temperature?: number;
}

export interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
}

export type GeminiTransportFn = (payload: GeminiGenerateRequest) => Promise<GeminiGenerateResponse>;

let customTransport: GeminiTransportFn | null = null;

export const setGeminiCustomTransport = (fn: GeminiTransportFn | null) => {
  customTransport = fn;
};

export class GeminiClient {
  public static async generateContent(payload: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
    if (customTransport) {
      return customTransport(payload);
    }

    const settings = typeof localStorage !== 'undefined' ? getSettings() : ({} as any);
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.VITE_GEMINI_API_KEY || process.env?.GEMINI_API_KEY : '');
    const apiKey = (envKey || (settings as any)?.geminiApiKey || '').trim();

    if (!apiKey) {
      throw new Error('Chave da API Gemini não configurada (VITE_GEMINI_API_KEY).');
    }

    const guard = await ApiUsageGuard.check('gemini_flash');
    if (!guard.allowed) {
      throw new Error(`[ApiUsageGuard] Chamada bloqueada: ${guard.reason}`);
    }

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const startTime = Date.now();

    const bodyData: any = {
      contents: payload.contents,
      generationConfig: {
        temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.2,
        maxOutputTokens: 2048,
      },
    };

    if (payload.systemInstruction) bodyData.systemInstruction = payload.systemInstruction;
    if (payload.tools && payload.tools.length > 0) bodyData.tools = payload.tools;
    if (payload.toolConfig) bodyData.toolConfig = payload.toolConfig;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
    } catch (networkErr: any) {
      ApiUsageTracker.record({
        provider: 'gemini',
        service: 'gemini_flash',
        operation: 'generateContent',
        units: 1,
        status: 'ERROR',
        response_time_ms: Date.now() - startTime,
        module_source: 'financial',
        error_message: networkErr.message,
      });
      throw networkErr;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed?.error?.message || errorMsg;
      } catch {}

      ApiUsageTracker.record({
        provider: 'gemini',
        service: 'gemini_flash',
        operation: 'generateContent',
        units: 1,
        status: res.status === 429 ? 'RATE_LIMITED' : 'ERROR',
        http_status: res.status,
        response_time_ms: Date.now() - startTime,
        module_source: 'financial',
        error_message: errorMsg,
      });

      throw new Error(`Erro na API Gemini: ${errorMsg}`);
    }

    ApiUsageTracker.record({
      provider: 'gemini',
      service: 'gemini_flash',
      operation: 'generateContent',
      units: 1,
      status: 'SUCCESS',
      http_status: 200,
      response_time_ms: Date.now() - startTime,
      module_source: 'financial',
    });

    return await res.json();
  }
}
