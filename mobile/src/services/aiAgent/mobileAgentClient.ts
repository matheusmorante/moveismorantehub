import { supabase } from '../supabaseClient';
import { GeminiContent } from './mobileAgentTypes';

// Cliente HTTP leve e tipado para a API oficial do Google Gemini no Mobile

export class MobileAgentClient {
  public static clearApiKeyCache() {
    this.cachedApiKey = null;
  }

  public static async getApiKey(): Promise<string> {
    if (this.cachedApiKey) return this.cachedApiKey;

    // 1. Tentar tabela settings no Supabase (prioridade para permitir atualização dinâmica sem re-build)
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
      const dbKey =
        data?.data?.geminiApiKey ||
        data?.geminiApiKey ||
        data?.settings_data?.geminiApiKey ||
        data?.value?.geminiApiKey ||
        '';

      if (dbKey && typeof dbKey === 'string' && dbKey.trim()) {
        this.cachedApiKey = dbKey.trim();
        return this.cachedApiKey;
      }
    } catch (err) {
      console.warn('Aviso: falha ao carregar chave do Gemini da tabela settings:', err);
    }

    // 2. Tentar variaveis de ambiente
    const envKey =
      (typeof process !== 'undefined' &&
        (process.env?.EXPO_PUBLIC_GEMINI_API_KEY ||
          process.env?.VITE_GEMINI_API_KEY ||
          process.env?.GEMINI_API_KEY)) ||
      '';

    if (envKey && typeof envKey === 'string' && envKey.trim()) {
      this.cachedApiKey = envKey.trim();
      return this.cachedApiKey;
    }

    return '';
  }

  public static async generateContent(payload: {
    systemInstruction: { parts: { text: string }[] };
    contents: GeminiContent[];
    tools: any[];
    toolConfig?: any;
    temperature?: number;
  }): Promise<any> {
    let apiKey = await this.getApiKey();
    if (!apiKey) {
      this.clearApiKeyCache();
      apiKey = await this.getApiKey();
    }

    if (!apiKey) {
      throw new Error('Chave de API do Gemini não configurada no servidor. Acesse as Configurações do ERP > Assistente de IA para cadastrar a chave.');
    }

    const model = 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const body: Record<string, any> = {
      contents: payload.contents,
      generationConfig: {
        temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.1,
        maxOutputTokens: 2048,
      },
    };

    if (payload.systemInstruction) {
      body.systemInstruction = payload.systemInstruction;
    }
    if (payload.tools && payload.tools.length > 0) {
      body.tools = payload.tools;
    }
    if (payload.toolConfig) {
      body.toolConfig = payload.toolConfig;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Erro na API Gemini (${response.status}): ${errorBody || response.statusText}`);
    }

    return response.json();
  }
}
