import { AiGateway } from "@/services/aiGateway/AiGateway";
import { isQuotaExceeded, notifyAiQuotaWarning } from "@/services/aiGateway/aiQuotaNotifier";

const AI_BACKEND_URL = "http://localhost:3003/api";

export async function callAIBackend(endpoint: string, body: any) {
    try {
        const response = await fetch(`${AI_BACKEND_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error(`AI Backend returned non-JSON response (${endpoint}):`, text.substring(0, 200));
            throw new Error(`AI Backend Error: Servidor retornou formato inválido (HTML/Texto). Verifique se o backend está rodando em ${AI_BACKEND_URL}`);
        }

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "AI Backend Error");
        }

        return await response.json();
    } catch (error: any) {
        console.error(`AI Backend Error (${endpoint}):`, error);
        throw error;
    }
}

export interface GeminiDirectOptions {
    tier?: 'lite' | 'reasoning';
    moduleSource?: string;
    thinkingBudget?: 'low' | 'medium' | 'high';
    operation?: string;
}

export async function callGeminiDirect(
    prompt: string,
    isJsonMode: boolean = true,
    options?: GeminiDirectOptions
): Promise<string> {
    const tier = options?.tier || 'lite';
    const operation = options?.operation || 'ai_service_call';
    const moduleSource = options?.moduleSource;

    let res;
    if (tier === 'reasoning') {
        res = await AiGateway.requestReasoning({
            operation,
            payload: prompt,
            moduleSource,
            thinkingBudget: options?.thinkingBudget || 'low',
            jsonMode: isJsonMode,
        });
    } else {
        res = await AiGateway.requestText({
            operation,
            payload: prompt,
            tier: 'lite',
            moduleSource,
            jsonMode: isJsonMode,
        });
    }

    if (!res.success) {
        const modelName = res.modelUsed || (tier === 'reasoning' ? 'gemini-3.8-flash' : 'gemini-3.5-flash-lite');
        if (isQuotaExceeded(res) || isQuotaExceeded(res.errorMessage) || isQuotaExceeded(res.userFriendlyMessage)) {
            notifyAiQuotaWarning(modelName);
        }
        throw new Error(res.userFriendlyMessage || res.errorMessage || 'Falha ao processar requisição de IA no AiGateway');
    }

    return res.data || '';
}
