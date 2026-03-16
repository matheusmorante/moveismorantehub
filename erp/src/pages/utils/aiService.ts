import { toast } from "react-toastify";

export interface AIIntentResponse {
    intent: 'create_product' | 'create_service' | 'create_order' | 'chat';
    status?: 'ready' | 'incomplete';
    summary?: string;
    data: any;
}

export interface AIChatResponse {
    answer: string;
}

const AI_BACKEND_URL = "http://localhost:3003/api";

async function callAIBackend(endpoint: string, body: any) {
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

export const aiService = {
    async detectIntent(message: string, detectionPrompt: string, context?: any): Promise<AIIntentResponse> {
        try {
            const finalPrompt = detectionPrompt.replace('{{context}}', JSON.stringify(context || {}));
            return await callAIBackend("ai-detect-intent", { message, detectionPrompt: finalPrompt });
        } catch (error) {
            console.error("AI Detect Intent Error:", error);
            throw error;
        }
    },

    async chat(message: string, chatPrompt: string, context?: any): Promise<AIChatResponse> {
        try {
            let systemContext = chatPrompt || "";
            if (context && Object.keys(context).length > 0) {
                systemContext += `\nCONTEÚDO ATUAL DO PEDIDO EM ANDAMENTO: ${JSON.stringify(context)}`;
            }
            return await callAIBackend("ai-chat", { message, systemPrompt: systemContext });
        } catch (error) {
            console.error("AI Chat Error:", error);
            // Retorna um JSON stringificado que representa um erro, para não quebrar o JSON.parse
            return { answer: JSON.stringify({ error: "Falha no processamento da IA", next_step: "Salvar relato bruto" }) };
        }
    },

    async generateDescription(productData: { productName: string; category: string; unitPrice: number; promptTemplate: string }) {
        if (!productData.productName) throw new Error("Nome do produto é obrigatório");
        return await callAIBackend("generate-description", productData);
    },

    async generateMarketplaceTitle(data: { 
        description: string;
        material?: string;
        differential?: string;
    }) {
        if (!data.description) throw new Error("Título base/descrição é obrigatório");
        const result = await callAIBackend("generate-marketplace-title", data);
        if (result && result.title) {
            result.title = result.title.toUpperCase();
        }
        return result;
    },

    async generateProductDescription(data: { 
        title: string; 
        material?: string; 
        dimensions?: string; 
        brand?: string;
        line?: string;
        mainDifferential?: string;
        colors?: string;
        notIncluded?: string;
        type: 'whatsapp' | 'ecommerce' 
    }) {
        const result = await callAIBackend("generate-product-description", data);
        if (result && result.description) {
            result.description = result.description.toUpperCase();
        }
        return result;
    },

    async suggestCategory(title: string, categories: string[]) {
        return await callAIBackend("suggest-category", { title, categories });
    },

    async generateComboName(items: string) {
        return await callAIBackend("generate-combo-name", { items });
    },

    async findNCM(productName: string, material: string): Promise<{ ncm: string, description: string }> {
        const result = await this.generateNCM(productName, material);
        return { ncm: result.ncm, description: result.desc };
    },

    async generateNCM(productName: string, material: string): Promise<{ ncm: string, desc: string }> {
        const prompt = `Você é um classificador fiscal (especialista tributário do Brasil). 
        Sua tarefa é encontrar o NCM mais provável para o seguinte produto:
        Produto: ${productName}
        Material / Composição: ${material || "Não informado"}
        
        RETORNE APENAS um objeto JSON no formato exato: {"ncm": "8 digitos apenas numeros", "desc": "uma descricao curta de ate 50 caracteres que explica que tipo de produto eh"}
        NÃO inclua markdown como \`\`\`json ou texto adicional. Se não souber exatamente, dê a melhor aproximação.`;

        try {
            const result = await this.chat(prompt, "Sempre retorne apenas JSON. Sem explicações ou saudações.");
            let ans = result.answer.trim();
            // Fallback limpar o json caso venha blocos de markdown
            if (ans.startsWith('```json')) {
                ans = ans.replace(/^```json/, '').replace(/```$/, '').trim();
            } else if (ans.startsWith('```')) {
                ans = ans.replace(/^```/, '').replace(/```$/, '').trim();
            }
            return JSON.parse(ans);
        } catch (error) {
            console.error("Erro extraindo o NCM", error);
            throw new Error("Não foi possível gerar um NCM automaticamente. Verifique se a IA respondeu num formato válido.");
        }
    },

    async suggestPrices(data: { description: string, costPrice: number, material?: string, differential?: string }) {
        if (!data.description || !data.costPrice) throw new Error("Título e Preço de Custo são obrigatórios");
        return await callAIBackend("suggest-prices", data);
    }
};
