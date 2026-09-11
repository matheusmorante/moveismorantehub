import { callAIBackend, callGeminiDirect } from "./aiDirectClient";
import { AiHybridDispatcher } from "@/services/aiGateway/core/AiHybridDispatcher";

export interface AIIntentResponse {
    intent: 'create_product' | 'create_service' | 'create_order' | 'create_transaction' | 'chat';
    status?: 'ready' | 'incomplete';
    summary?: string;
    data: any;
}

export interface AIChatResponse {
    answer: string;
}

export const aiOrderExtractionService = {
    async detectIntent(message: string, detectionPrompt: string, context?: any): Promise<AIIntentResponse> {
        try {
            const hybridResult = await AiHybridDispatcher.dispatchIntent(
                message,
                context,
                async (msg) => {
                    const finalPrompt = detectionPrompt.replace('{{context}}', JSON.stringify(context || {}));
                    const systemPrompt = `Você é um assistente de inteligência artificial de ERP, PDV comercial e gestão financeira.
Analise a mensagem do usuário e responda EXCLUSIVAMENTE em formato JSON com a seguinte estrutura:
{
  "intent": "create_product" | "create_service" | "create_order" | "create_transaction" | "chat",
  "status": "ready" | "incomplete",
  "summary": "resumo amigável em português",
  "data": { ... }
}
Regras de Classificação:
- Se o usuário mencionar despesa, pagamento, almoço, gasolina, combustível, mercado, transporte, recebimento ou movimentação financeira, use "intent": "create_transaction".
  "data" deve conter:
  - "type": "expense" | "income"
  - "amount": número (ex: 45)
  - "description": texto descritivo (ex: "Almoço")
  - "category": nome da categoria (ex: "Alimentação", "Transporte")
  - "payment_method": "Dinheiro" | "Pix" | "Cartão de Crédito" | "Cartão de Débito" | "Boleto"
  - "date": data no formato YYYY-MM-DD
Sem blocos markdown (\`\`\`json), sem saudações antes ou depois.

Instruções da Tarefa:
${finalPrompt}

Mensagem do Usuário:
${msg}`;

                    const textResponse = await callGeminiDirect(systemPrompt);
                    let cleanJson = textResponse.trim();
                    if (cleanJson.startsWith('```json')) {
                        cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
                    } else if (cleanJson.startsWith('```')) {
                        cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
                    }
                    return JSON.parse(cleanJson);
                }
            );

            return {
                intent: hybridResult.intent,
                status: hybridResult.status,
                summary: hybridResult.summary,
                data: hybridResult.data
            };
        } catch (error) {
            console.warn("Falha no detectIntent direto via Gemini, tentando backend local ou fallback:", error);
            try {
                return await callAIBackend("ai-detect-intent", { message, detectionPrompt });
            } catch (fallbackError) {
                console.error("AI Detect Intent Error:", fallbackError);
                throw error;
            }
        }
    },

    async chat(message: string, chatPrompt: string, context?: any): Promise<AIChatResponse> {
        try {
            let systemContext = chatPrompt || "Você é um assistente prestativo para uma loja de móveis e decoração.";
            if (context && Object.keys(context).length > 0) {
                systemContext += `\nCONTEÚDO ATUAL DO PEDIDO EM ANDAMENTO: ${JSON.stringify(context)}`;
            }

            const prompt = `${systemContext}\n\nUsuário: ${message}\nAssistente:`;
            const textResponse = await callGeminiDirect(prompt, false);
            return { answer: textResponse.trim() };
        } catch (error: any) {
            console.warn("Falha no chat direto via Gemini, tentando backend local:", error);
            try {
                return await callAIBackend("ai-chat", { message, systemPrompt: chatPrompt });
            } catch (fallbackError) {
                console.error("AI Chat Error:", fallbackError);
                return { answer: "Desculpe, ocorreu uma falha ao conectar com o serviço de IA. Verifique as configurações de chave de API." };
            }
        }
    },

    async parseOrderFreeText(freeText: string, sellerList?: string[], customHandlingOptions?: string[]): Promise<{
        rawJSON: any;
        summary: string;
        identifiedFields: {
            clientName?: string;
            clientPhone?: string;
            clientAddress?: string;
            itemsCount?: number;
            totalAmount?: number;
            paymentMethod?: string;
            deliveryMethod?: string;
            schedulingDate?: string;
        };
        warnings: string[];
        missingRequiredFields: string[];
    }> {
        if (!freeText || !freeText.trim()) {
            throw new Error("Por favor, digite ou fale os dados do pedido antes de gerar.");
        }

        const validHandlingOptions = customHandlingOptions && customHandlingOptions.length > 0
            ? customHandlingOptions
            : [
                "Na caixa > Montagem no deposito > Entregue montado",
                "Na caixa > Montagem no local da entrega",
                "De mostruário montado > Entregue montado",
                "Na caixa > Montagem por conta do cliente",
                "Item não necessita de montagem",
                "De mostruário > Desmontagem do mostruário > Montagem na entrega",
                "De mostruario > Entregue desmontado para o cliente montar"
            ];

        const validPaymentMethods = ["Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Promissória", "Boleto"];
        const validDeliveryMethods = ["delivery", "pickup"];
        const validConditions = ["novo", "salvado", "outlet"];
        const validMarketingOrigins = ["paid", "organic"];

        const sellersInfo = sellerList && sellerList.length > 0 
            ? `LISTA OFICIAL DE VENDEDORES CADASTRADOS (Escolha exatamente um se identificado): ${sellerList.join(", ")}` 
            : "";

        const prompt = `Você é uma inteligência artificial especialista em ERP para a loja 'Móveis Morante'.
Sua missão é extrair todas as informações de um pedido de venda a partir de um texto livre e retornar um JSON estrito para autopreenchimento do formulário de pedidos.

REGRAS ABSOLUTAS E OBRIGATÓRIAS PARA CAMPOS DE SELEÇÃO (SELECTS):
1. A IA É PROIBIDA DE INVENTAR, CRIAR OU ADICIONAR OPÇÕES QUE NÃO EXISTAM NAS LISTAS ABAIXO.
2. Para cada campo de seleção, você DEVE selecionar ESTRITAMENTE e EXATAMENTE uma das opções válidas fornecidas, respeitando acentos, maiúsculas e minúsculas:

• MANUSEIO DO PRODUTO ("handlingType"):
  Escolha EXATAMENTE uma destas opções permitidas:
  ${validHandlingOptions.map(o => `"${o}"`).join("\n  ")}

• FORMA DE PAGAMENTO ("payments[].method"):
  Escolha EXATAMENTE uma destas opções: ${validPaymentMethods.map(m => `"${m}"`).join(", ")}

• MÉTODO DE ENVIO ("shipping.deliveryMethod"):
  Escolha EXATAMENTE "delivery" (para entrega) ou "pickup" (para retirada na loja).

• CONDIÇÃO DO ITEM ("items[].condition"):
  Escolha EXATAMENTE "novo", "salvado" ou "outlet".

• ORIGEM DE MARKETING ("client.marketingOrigin"):
  Escolha EXATAMENTE "paid" (se for Tráfego Pago) ou "organic" (se for Orgânico).

${sellersInfo}

DATA ATUAL DE REFERÊNCIA: ${new Date().toISOString().split('T')[0]}

ESTRUTURA DE EXTRAÇÃO:
1. CLIENTE ("client"):
   - "fullName": Nome completo do cliente.
   - "phone": Telefone com DDD.
   - "cpfCnpj": CPF ou CNPJ.
   - "marketingOrigin": "paid" ou "organic".
   - "fullAddress": Objeto com "street", "number", "neighborhood", "city", "state", "complement", "cep", "observation".
   - Omita a chave "client" se não houver dados de cliente.

2. PEDIDO ("order"):
   - "seller": Nome do vendedor (Mapeie obrigatoriamente para a lista de vendedores se aplicável).
   - "date": Data do pedido YYYY-MM-DD.
   - "observation": Observações gerais.
   - "shipping":
     * "deliveryMethod": "delivery" ou "pickup".
     * "value": Valor numérico do frete.
     * "scheduling": { "notInformed": boolean, "dateType": "fixed"|"range", "date": "YYYY-MM-DD", "endDate"?: "YYYY-MM-DD", "type": "fixed"|"range", "time"?: "HH:MM", "startTime"?: "HH:MM", "endTime"?: "HH:MM" }
   - "items": Array de produtos. Cada item:
     * "description": Nome do produto/móvel.
     * "quantity": Quantidade numérica (mínimo 1).
     * "unitPrice": Preço unitário.
     * "condition": "novo", "salvado" ou "outlet".
     * "handlingType": Opção exata da lista de manuseios.
   - "payments": Array de pagamentos:
     * "method": Opção exata da lista de métodos.
     * "value": Valor numérico.
     * "installments": Número de parcelas (padrão 1).

3. "summary": Resumo das informações encontradas em 1 a 2 frases.
4. "warnings": Lista de avisos sobre ambiguidades.
5. "missingRequiredFields": Lista de dados essenciais faltantes.

TEXTO DO OPERADOR:
"${freeText}"

Retorne EXCLUSIVAMENTE o JSON estruturado, sem markdown.`;

        const textResponse = await callGeminiDirect(prompt);
        let clean = textResponse.trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(clean);
        const rawJSON = parsed.order ? parsed : { order: parsed };

        if (rawJSON?.order) {
            if (Array.isArray(rawJSON.order.items)) {
                rawJSON.order.items = rawJSON.order.items.map((item: any) => {
                    let hType = item.handlingType;
                    if (!validHandlingOptions.includes(hType)) {
                        hType = validHandlingOptions[0];
                    }
                    let cond = item.condition;
                    if (!validConditions.includes(cond)) {
                        cond = "novo";
                    }
                    return {
                        ...item,
                        handlingType: hType,
                        condition: cond
                    };
                });
            }

            if (Array.isArray(rawJSON.order.payments)) {
                rawJSON.order.payments = rawJSON.order.payments.map((pay: any) => {
                    let method = pay.method || "Pix";
                    const foundMethod = validPaymentMethods.find(m => m.toLowerCase() === String(method).toLowerCase());
                    return {
                        ...pay,
                        method: foundMethod || "Pix"
                    };
                });
            }
        }

        if (rawJSON?.client?.marketingOrigin) {
            if (!validMarketingOrigins.includes(rawJSON.client.marketingOrigin)) {
                rawJSON.client.marketingOrigin = "organic";
            }
        }

        return {
            rawJSON,
            summary: parsed.summary || "Pedido analisado com sucesso pela IA.",
            identifiedFields: parsed.identifiedFields || {},
            warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
            missingRequiredFields: Array.isArray(parsed.missingRequiredFields) ? parsed.missingRequiredFields : []
        };
    }
};
