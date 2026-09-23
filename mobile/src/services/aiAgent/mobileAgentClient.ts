import { supabase } from '../supabaseClient';
import { GeminiContent } from './mobileAgentTypes';

// Cliente HTTP leve e tipado para a API oficial do Google Gemini no Mobile

export class MobileAgentClient {
  public static clearApiKeyCache() {
    // Gemini credentials are server-side only; retained for old callers.
  }

  public static async getApiKey(): Promise<string> {
    // Compatibility shim for legacy callers. Never read a provider secret in the app.
    return '';
  }

  public static async generateContent(payload: {
    systemInstruction: { parts: { text: string }[] };
    contents: GeminiContent[];
    tools: any[];
    toolConfig?: any;
    temperature?: number;
  }): Promise<any> {
    const { data, error } = await supabase.functions.invoke('mobile-gemini-proxy', { body: payload });
    if (error) throw new Error('Assistente Gemini indisponível no servidor.');
    return data;
  }
}
