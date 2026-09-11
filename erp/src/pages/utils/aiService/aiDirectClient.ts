import { AiGateway } from "@/services/aiGateway/AiGateway";

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

export async function callGeminiDirect(prompt: string, isJsonMode: boolean = true): Promise<string> {
    const res = await AiGateway.requestText({
        operation: 'ai_service_call',
        payload: prompt
    });

    if (!res.success) {
        throw new Error(res.userFriendlyMessage || res.errorMessage || 'Falha ao processar requisição de IA no AiGateway');
    }

    return res.data || '';
}
