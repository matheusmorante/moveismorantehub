import { toast } from "react-toastify";
import { ApiUsageGuard } from "@/services/apiMonitoring/apiUsageGuard";
import { ApiUsageTracker } from "@/services/apiMonitoring/apiUsageTracker";

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

/**
 * Chama diretamente a API Gemini (sem backend intermediário).
 * Lê o body de erro para expor o motivo real da falha (quota, chave inválida, etc.)
 */
async function callGeminiDirect(prompt: string, isJsonMode: boolean = true): Promise<string> {
    const rawApiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.VITE_GEMINI_API_KEY || process.env?.GEMINI_API_KEY : '');
    const apiKey = (rawApiKey || '').trim();
    console.log("[Gemini API Key Check]:", apiKey ? `Carregada (${apiKey.substring(0, 10)}...)` : "Vazia/Não encontrada");
    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY não configurada. Adicione a variável ao painel da Vercel / arquivo .env e faça novo deploy.");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const bodyPayload: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 }
        }
    };

    if (isJsonMode) {
        bodyPayload.generationConfig.responseMimeType = "application/json";
    }

    const guard = await ApiUsageGuard.check('gemini_flash');
    if (!guard.allowed) {
        throw new Error(`[ApiUsageGuard] Chamada à IA bloqueada: ${guard.reason}`);
    }

    const startTime = Date.now();
    let response: Response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyPayload)
        });
    } catch (networkErr: any) {
        ApiUsageTracker.record({
            provider: 'gemini',
            service: 'gemini_flash',
            operation: 'generateContent',
            units: 1,
            status: 'ERROR',
            response_time_ms: Date.now() - startTime,
            module_source: 'marketing',
            error_message: networkErr.message,
        });
        throw networkErr;
    }

    if (!response.ok) {
        let errDetail = `HTTP ${response.status}`;
        try {
            const errBody = await response.json();
            const msg = errBody?.error?.message || JSON.stringify(errBody);
            errDetail += `: ${msg}`;
        } catch {
            errDetail += `: ${response.statusText}`;
        }

        ApiUsageTracker.record({
            provider: 'gemini',
            service: 'gemini_flash',
            operation: 'generateContent',
            units: 1,
            status: response.status === 429 ? 'RATE_LIMITED' : 'ERROR',
            http_status: response.status,
            response_time_ms: Date.now() - startTime,
            module_source: 'marketing',
            error_message: errDetail,
        });

        if (response.status === 429) {
            throw new Error(`Limite de requisições da IA atingido. Aguarde um momento e tente novamente. (${errDetail})`);
        } else if (response.status === 403 || response.status === 401) {
            throw new Error(`Chave de API inválida ou sem permissão. Verifique VITE_GEMINI_API_KEY. (${errDetail})`);
        } else if (response.status === 400) {
            throw new Error(`Requisição inválida para a IA (prompt rejeitado). (${errDetail})`);
        }
        throw new Error(`Gemini API retornou erro. (${errDetail})`);
    }

    ApiUsageTracker.record({
        provider: 'gemini',
        service: 'gemini_flash',
        operation: 'generateContent',
        units: 1,
        status: 'SUCCESS',
        http_status: 200,
        response_time_ms: Date.now() - startTime,
        module_source: 'marketing',
    });

    const resJson = await response.json();

    // Verifica se a resposta foi bloqueada por safety filters
    const finishReason = resJson?.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
        throw new Error(`Resposta bloqueada pela IA (motivo: ${finishReason}). Tente reformular o conteúdo.`);
    }

    return resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export const aiService = {
    async detectIntent(message: string, detectionPrompt: string, context?: any): Promise<AIIntentResponse> {
        try {
            const finalPrompt = detectionPrompt.replace('{{context}}', JSON.stringify(context || {}));
            const systemPrompt = `Você é um assistente de inteligência artificial de ERP e PDV comercial.
Analise a mensagem do usuário e responda EXCLUSIVAMENTE em formato JSON com a seguinte estrutura:
{
  "intent": "create_product" | "create_service" | "create_order" | "chat",
  "status": "ready" | "incomplete",
  "summary": "resumo amigável em português",
  "data": { ... }
}
Sem blocos markdown (\`\`\`json), sem saudações antes ou depois.

Instruções da Tarefa:
${finalPrompt}

Mensagem do Usuário:
${message}`;

            const textResponse = await callGeminiDirect(systemPrompt);
            let cleanJson = textResponse.trim();
            if (cleanJson.startsWith('```json')) {
                cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
            } else if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
            }
            return JSON.parse(cleanJson);
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

    async generateDescription(productData: { productName: string; category: string; unitPrice: number; promptTemplate?: string }) {
        if (!productData.productName) throw new Error("Nome do produto é obrigatório");
        const prompt = `Gere uma descrição profissional para venda do produto abaixo para o catálogo da loja:
Produto: ${productData.productName}
Categoria: ${productData.category || "Móveis"}
Preço: R$ ${productData.unitPrice || 0}
${productData.promptTemplate ? `Diretriz: ${productData.promptTemplate}` : ''}
Retorne apenas o texto da descrição, sem títulos markdown ou saudações.`;

        const textResponse = await callGeminiDirect(prompt, false);
        let cleanText = textResponse.trim();
        if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
            try {
                const parsed = JSON.parse(cleanText);
                const extracted = parsed.product_description || parsed.improvedDescription || parsed.description || parsed.text || parsed.content;
                if (extracted && typeof extracted === 'string') {
                    cleanText = extracted.trim();
                }
            } catch {}
        }
        return { description: cleanText };
    },

    async generateMarketplaceTitle(data: { 
        description: string;
        material?: string;
        differential?: string;
    }) {
        if (!data.description) throw new Error("Título base/descrição é obrigatório");
        const prompt = `Você é um especialista em SEO e títulos para e-commerce e catálogo de móveis.
Gere um título atraente, claro e otimizado (em LETRAS MAIÚSCULAS) para o seguinte item:
Produto / Descrição: ${data.description}
Material: ${data.material || "Não informado"}
Diferencial: ${data.differential || "Não informado"}

Retorne APENAS um objeto JSON no formato exato: {"title": "TITULO DO PRODUTO AQUI EM MAIUSCULAS"}
Nenhum texto fora do JSON.`;

        try {
            const textResponse = await callGeminiDirect(prompt);
            let clean = textResponse.trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
            const parsed = JSON.parse(clean);
            return { title: String(parsed.title || data.description).toUpperCase() };
        } catch {
            return { title: data.description.toUpperCase() };
        }
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
        const isWhatsapp = data.type === 'whatsapp';
        const prompt = `Você é um redator de vendas para Móveis Morante.
Escreva uma descrição atraente do produto para envio via ${isWhatsapp ? 'WhatsApp' : 'Catálogo Online'}.
Produto: ${data.title}
Material: ${data.material || 'Não informado'}
Dimensões: ${data.dimensions || 'Não informado'}
Marca/Fornecedor: ${data.brand || 'Não informado'}
Linha: ${data.line || 'Não informado'}
Diferencial: ${data.mainDifferential || 'Não informado'}
Cores: ${data.colors || 'Não informado'}
Não Acompanha: ${data.notIncluded || 'Não informado'}

Formate com parágrafos curtos, emojis elegantes e liste características e medidas.
Retorne apenas o texto da descrição.`;

        const textResponse = await callGeminiDirect(prompt, false);
        let cleanText = textResponse.trim();
        if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
            try {
                const parsed = JSON.parse(cleanText);
                const extracted = parsed.product_description || parsed.improvedDescription || parsed.description || parsed.text || parsed.content;
                if (extracted && typeof extracted === 'string') {
                    cleanText = extracted.trim();
                }
            } catch {}
        }
        return { description: cleanText };
    },

    async suggestCategory(title: string, categories: string[]) {
        const prompt = `Dada a lista de categorias disponíveis abaixo:
${categories.join(', ')}

Qual é a categoria mais adequada para o produto: "${title}"?
Retorne APENAS um JSON no formato: {"category": "NOME DA CATEGORIA"}
Se nenhuma for adequada, escolha a mais próxima da lista. Sem blocos markdown adicionais.`;

        try {
            const textResponse = await callGeminiDirect(prompt);
            let clean = textResponse.trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
            const parsed = JSON.parse(clean);
            return { category: parsed.category };
        } catch {
            return { category: categories[0] || "" };
        }
    },

    async generateComboName(items: string) {
        const prompt = `Crie um nome comercial chamativo para um conjunto/combo composto pelos itens: ${items}.
Retorne APENAS o JSON: {"name": "NOME DO COMBO"}`;

        try {
            const textResponse = await callGeminiDirect(prompt);
            let clean = textResponse.trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
            const parsed = JSON.parse(clean);
            return { name: parsed.name };
        } catch {
            return { name: `COMBO ${items.toUpperCase()}` };
        }
    },

    async findNCM(productName: string, material: string): Promise<{ ncm: string, description: string }> {
        const result = await this.generateNCM(productName, material);
        return { ncm: result.ncm, description: result.desc };
    },

    async generateNCM(productName: string, material: string): Promise<{ ncm: string, desc: string }> {
        const prompt = `CLASSIFICADOR FISCAL DE PRODUTOS — NCM

Você é um especialista em classificação fiscal de mercadorias brasileiras, especializado principalmente em móveis, colchões, estofados, utilidades e produtos relacionados ao varejo de móveis.

Sua função é analisar os dados fornecidos de um produto e determinar a classificação NCM mais adequada.

Você NÃO deve classificar o produto apenas por palavras-chave isoladas. Primeiro determine o que o produto realmente é, sua função, seu material e sua utilização. Depois faça a classificação.

PROCESSO OBRIGATÓRIO DE ANÁLISE:
1. O que é o produto?
2. Qual é sua função principal?
3. Qual é o material relevante para sua classificação?
4. Qual é sua finalidade de uso?
5. Existe um ambiente específico ao qual esse tipo de produto se destina? (ex: quarto -> dormitório)
6. MDP/MDF são derivados de madeira.
7. Cômodas, Guarda-roupas, Criados-mudos, Camas em madeira/MDP/MDF para quarto pertencem estritamente ao NCM 94035000 (Móveis de madeira do tipo dos utilizados em quartos de dormir). NUNCA os classifique como 94036000.
8. Móveis genuinamente multiuso (ex: Armário Multiuso) não devem ser forçados para dormitório apenas pelo ambiente Quarto.
9. NÃO INVENTE NCM. Se não houver informações suficientes para determinar o NCM com segurança ou se a confiança for baixa (<0.50), retorne suggestedNcm: null e needsReview: true.

DADOS DO PRODUTO:
- Nome/Título: ${productName}
- Material: ${material || "Não informado"}

FORMATO OBRIGATÓRIO DA RESPOSTA:
Retorne SOMENTE JSON válido no formato exato abaixo, sem markdown:
{
  "productType": "string",
  "fiscalProductType": "string",
  "detectedMaterials": ["string"],
  "normalizedMaterial": "string | null",
  "catalogEnvironment": "string | null",
  "normalizedFiscalEnvironment": "string | null",
  "intendedUse": "string",
  "suggestedNcm": "8 dígitos apenas números (ex: 94035000) ou null",
  "ncmDescription": "descrição oficial do NCM na TIPI ou null",
  "confidence": 0.95,
  "needsReview": false,
  "missingInformation": [],
  "reasoningSummary": "justificativa técnica curta"
}`;

        try {
            const textResponse = await callGeminiDirect(prompt);
            const match = textResponse.match(/\{[\s\S]*\}/);
            const clean = match ? match[0] : textResponse.trim();
            const parsed = JSON.parse(clean);
            
            const ncmCode = parsed.suggestedNcm ? String(parsed.suggestedNcm).replace(/\D/g, '').slice(0, 8) : '';
            const isReliable = parsed.confidence >= 0.50 && !parsed.needsReview && ncmCode.length === 8;

            if (!isReliable || !ncmCode) {
                return { ncm: '', desc: '' };
            }

            return {
                ncm: ncmCode,
                desc: String(parsed.ncmDescription || parsed.reasoningSummary || '')
            };
        } catch (error) {
            console.error("Erro na classificação NCM por IA:", error);
            // NCM NÃO DEVE TER FALLBACK DUMMY / PADRÃO
            return { ncm: '', desc: '' };
        }
    },

    async suggestPrices(data: { description: string, costPrice: number, material?: string, differential?: string }) {
        if (!data.description || !data.costPrice) throw new Error("Título e Preço de Custo são obrigatórios");
        const prompt = `Você é um consultor financeiro de precificação para varejo de móveis no Brasil.
Com base no custo de R$ ${data.costPrice} do produto "${data.description}" (Material: ${data.material || 'Geral'}), sugira 3 faixas de preço de venda (competitivo/baixo, padrão/médio, premium/alto).
Retorne APENAS um JSON no formato:
{
  "low": { "price": número, "margin": porcentagem_numérica },
  "medium": { "price": número, "margin": porcentagem_numérica },
  "high": { "price": número, "margin": porcentagem_numérica }
}`;

        try {
            const textResponse = await callGeminiDirect(prompt);
            const match = textResponse.match(/\{[\s\S]*\}/);
            const clean = match ? match[0] : textResponse.trim();
            return JSON.parse(clean);
        } catch {
            const c = data.costPrice;
            return {
                low: { price: Number((c * 1.3).toFixed(2)), margin: 30 },
                medium: { price: Number((c * 1.5).toFixed(2)), margin: 50 },
                high: { price: Number((c * 1.8).toFixed(2)), margin: 80 }
            };
        }
    },

    async generateFiscalData(productData: {
        title: string;
        description: string;
        material?: string;
        category?: string;
        companyName?: string;
        companyAddress?: string;
        companyCnpj?: string;
    }): Promise<{
        ncm: string;
        cest: string;
        ncmDescription: string;
        cfop: string;
        icmsPercent: number;
        cst: string;
        origem: string;
        pisCst: string;
        cofinsCst: string;
    }> {
        const prompt = `CLASSIFICADOR FISCAL DE PRODUTOS — NCM E REGIME TRIBUTÁRIO

Você é um especialista em classificação fiscal de mercadorias brasileiras, especializado principalmente em móveis, colchões, estofados, utilidades e produtos relacionados ao varejo de móveis.

Sua função é analisar os dados fornecidos de um produto e determinar a classificação NCM mais adequada.

Você NÃO deve classificar o produto apenas por palavras-chave isoladas. Primeiro determine o que o produto realmente é, sua função, seu material e sua utilização. Depois faça a classificação.

PROCESSO OBRIGATÓRIO DE ANÁLISE:
1. O que é o produto?
2. Qual é sua função principal?
3. Qual é o material relevante para sua classificação? (MDP/MDF = derivado de madeira)
4. Qual é sua finalidade de uso? (quarto = dormitório, cozinha planejada = cozinha)
5. Cômodas, Guarda-roupas, Criados-mudos, Camas em madeira/MDP/MDF para quarto pertencem estritamente ao NCM 94035000 (Móveis de madeira do tipo dos utilizados em quartos de dormir). NUNCA os classifique como 94036000.
6. Armários Multiuso genuínos não devem ser forçados para dormitório apenas pelo ambiente Quarto.
7. NÃO INVENTE NCM. Se não houver informações suficientes para determinar o NCM com segurança ou se a confiança for baixa (<0.50), retorne suggestedNcm: null e needsReview: true.

DADOS DO PRODUTO:
- Nome/Título: ${productData.title}
- Categoria: ${productData.category || "Não informada"}
- Material/Composição: ${productData.material || "Não informado"}
- Descrição Completa: ${productData.description || "Não informada"}

DADOS DA EMPRESA:
- Razão Social: ${productData.companyName || "Móveis Morante"}
- CNPJ: ${productData.companyCnpj || "Não informado"}
- Localização/Estado: ${productData.companyAddress || "Paraná (PR)"}

FORMATO OBRIGATÓRIO DA RESPOSTA:
Retorne SOMENTE JSON válido no formato exato abaixo, sem markdown:
{
  "productType": "string",
  "fiscalProductType": "string",
  "detectedMaterials": ["string"],
  "normalizedMaterial": "string | null",
  "catalogEnvironment": "string | null",
  "normalizedFiscalEnvironment": "string | null",
  "intendedUse": "string",
  "suggestedNcm": "8 dígitos apenas números (ex: 94035000) ou null",
  "ncmDescription": "descrição oficial do NCM na TIPI ou null",
  "cest": null,
  "cfop": "5102",
  "cst": "102",
  "icmsPercent": 0,
  "origem": "0",
  "pisCst": "49",
  "cofinsCst": "49",
  "confidence": 0.95,
  "needsReview": false,
  "missingInformation": [],
  "reasoningSummary": "justificativa técnica curta"
}`;

        try {
            const textResponse = await callGeminiDirect(prompt);
            const match = textResponse.match(/\{[\s\S]*\}/);
            const cleanJson = match ? match[0] : textResponse.trim();
            const parsed = JSON.parse(cleanJson);
            
            const ncmCode = parsed.suggestedNcm ? String(parsed.suggestedNcm).replace(/\D/g, '').slice(0, 8) : '';
            const isReliable = parsed.confidence >= 0.50 && !parsed.needsReview && ncmCode.length === 8;

            return {
                ncm: isReliable ? ncmCode : '',
                cest: parsed.cest ? String(parsed.cest).replace(/\D/g, '').slice(0, 7) : '',
                ncmDescription: isReliable ? String(parsed.ncmDescription || parsed.reasoningSummary || '') : '',
                cfop: String(parsed.cfop || '5102').replace(/\D/g, '').slice(0, 4),
                cst: String(parsed.cst || '102'),
                icmsPercent: Number(parsed.icmsPercent || 0),
                origem: String(parsed.origem || '0'),
                pisCst: String(parsed.pisCst || '49').replace(/\D/g, '').slice(0, 2),
                cofinsCst: String(parsed.cofinsCst || '49').replace(/\D/g, '').slice(0, 2)
            };
        } catch (error: any) {
            console.error("Erro na classificação tributária automática:", error);
            // NCM NÃO DEVE TER FALLBACK DUMMY / PADRÃO
            return {
                ncm: '',
                cest: '',
                ncmDescription: '',
                cfop: "5102",
                cst: "102",
                icmsPercent: 0,
                origem: "0",
                pisCst: "49",
                cofinsCst: "49"
            };
        }
    },

    async improveProductDescription(data: {
        currentDescription: string;
        title: string;
        material?: string;
        brand?: string;
        line?: string;
        width?: string | number;
        height?: string | number;
        depth?: string | number;
        weight?: string | number;
    }): Promise<{ improvedDescription: string }> {
        const prompt = `Você é um redator expert em e-commerce de móveis e decoração no Brasil, com habilidade de criar textos que convertem visitantes em compradores.

═══════════════════════════════════════
REGRA ABSOLUTA — NUNCA INVENTE NADA:
• Use SOMENTE as informações fornecidas nos campos abaixo.
• NÃO adicione características, materiais, funcionalidades ou especificações que NÃO estejam explicitamente nos dados fornecidos.
• Se um campo estiver como "Não informado" ou "Não informada", IGNORE esse campo — não mencione e não deduza nada sobre ele.
• Seu papel é REESCREVER com linguagem melhor, não CRIAR informações novas.
═══════════════════════════════════════

COMO INTERPRETAR O NOME DO PRODUTO (MUITO IMPORTANTE):
• O nome do produto geralmente segue o padrão: [Tipo] [Linha/Modelo] [Complemento].
• Exemplos de nomes e como interpretá-los:
  - "Balcão Copa para Pia" → Tipo: Balcão | Linha/Modelo: Copa | Uso: para pia (ambiente: cozinha)
  - "Guarda Roupa Sidney 6 Portas" → Tipo: Guarda Roupa | Linha/Modelo: Sidney | Especificações: 6 Portas
  - "Cômoda Arizona 4 Gavetas" → Tipo: Cômoda | Linha/Modelo: Arizona | Especificações: 4 Gavetas
• Palavras como "Copa", "Sidney", "Arizona", "Dallas" são NOMES DE LINHA/MODELO, não ambientes.
• O ambiente real é inferido pelo tipo e uso do produto (pia → cozinha, guarda roupa → quarto, etc.).
• NUNCA use o nome da linha como se fosse um ambiente.

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:
1. PRIMEIRO PARÁGRAFO — deve ser chamativo, envolvente e persuasivo:
   • Comece diretamente pelo nome completo do produto.
   • Destaque o diferencial principal que está nos dados (ex: funcionalidade, praticidade, organização).
   • Use linguagem que crie desejo e conexão emocional com o cliente.
   • Seja específico usando apenas o que está nos dados — sem invenções.
2. Uma linha vazia.
3. A linha "Características:" (somente se houver características explícitas nos dados).
4. Lista das características — apenas o que está nos dados (sem asteriscos, sem hífens no início de cada linha).
5. Uma linha vazia (somente se houver dimensões informadas).
6. A linha "Dimensões:" seguida de Altura, Largura, Profundidade e Peso — somente os campos que foram informados.

DADOS DO PRODUTO (use SOMENTE estes):
- Nome/Título: ${data.title}
- Descrição atual: ${data.currentDescription || "Não informada"}
- Material: ${data.material || "Não informado"}
- Marca/Fornecedor: ${data.brand || "Não informado"}
- Linha/Modelo: ${data.line || "Não informado"}
- Altura: ${data.height ? data.height + ' cm' : "Não informada"}
- Largura: ${data.width ? data.width + ' cm' : "Não informada"}
- Profundidade: ${data.depth ? data.depth + ' cm' : "Não informada"}
- Peso: ${data.weight ? data.weight + ' kg' : "Não informado"}

REGRAS FINAIS:
- Retorne apenas o texto da descrição, sem blocos markdown (\`\`\`), sem saudações, sem notas explicativas.
- Se os dados forem insuficientes para criar uma lista de características, omita essa seção.
- NUNCA escreva informações que não estejam nos dados acima.`;

        try {
            const textResponse = await callGeminiDirect(prompt, false);
            if (!textResponse.trim()) {
                throw new Error("A IA retornou uma resposta vazia. Verifique se o produto tem título e descrição preenchidos.");
            }

            let cleanText = textResponse.trim();
            if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
                try {
                    const parsed = JSON.parse(cleanText);
                    const extracted = parsed.product_description || parsed.improvedDescription || parsed.description || parsed.text || parsed.content;
                    if (extracted && typeof extracted === 'string') {
                        cleanText = extracted.trim();
                    }
                } catch {}
            }

            return { improvedDescription: cleanText };
        } catch (error: any) {
            console.error("Erro ao aperfeiçoar descrição:", error);
            throw new Error(error?.message || "Falha ao aperfeiçoar descrição com o Gemini.");
        }
    },

    async parseOrderFromFreeText(
        freeText: string, 
        sellerList?: string[], 
        customHandlingOptions?: string[]
    ): Promise<{
        rawJSON: any;
        summary: string;
        identifiedFields: {
            clientName?: string;
            clientPhone?: string;
            clientAddress?: string;
            sellerName?: string;
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
     * "unitPrice": Preço unitário numérico.
     * "handlingType": UMA DAS OPÇÕES PERMITIDAS LISTADAS ACIMA.
     * "condition": "novo", "salvado" ou "outlet".
   - "payments": Array de pagamentos. Cada pagamento:
     * "method": UMA DAS FORMAS DE PAGAMENTO PERMITIDAS.
     * "amount": Valor numérico.
     * "status": "Pago" ou "Pendente".

3. AVISOS E CAMPOS OBRIGATÓRIOS FALTANTES:
   - "warnings": Array de avisos sobre dados incompletos.
   - "missingRequiredFields": Array de campos essenciais ausentes (Ex: "Nome do cliente não informado", "Forma de pagamento não especificada", etc.).

RETORNE EXCLUSIVAMENTE UM OBJETO JSON COM ESTA ESTRUTURA:
{
  "rawJSON": {
    "client": { ... },
    "order": { ... }
  },
  "summary": "Resumo amigável em 1 ou 2 linhas",
  "identifiedFields": { ... },
  "warnings": [ ... ],
  "missingRequiredFields": [ ... ]
}

TEXTO INFORMADO PELO USUÁRIO:
"""
${freeText}
"""`;

        const textResponse = await callGeminiDirect(prompt);
        let cleanJson = textResponse.trim();
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const match = cleanJson.match(/\{[\s\S]*\}/);
        const jsonStr = match ? match[0] : cleanJson;
        const parsed = JSON.parse(jsonStr);
        const rawJSON = parsed.rawJSON || parsed;

        // SANITIZAÇÃO RIGOROSA PÓS-IA (Garantia de 100% de conformidade com os selects)
        if (rawJSON?.order) {
            // 1. Sanitizar Vendedor
            if (sellerList && sellerList.length > 0 && rawJSON.order.seller) {
                const foundSeller = sellerList.find(s => 
                    s.toLowerCase().trim() === String(rawJSON.order.seller).toLowerCase().trim() ||
                    s.toLowerCase().includes(String(rawJSON.order.seller).toLowerCase()) ||
                    String(rawJSON.order.seller).toLowerCase().includes(s.toLowerCase())
                );
                if (foundSeller) {
                    rawJSON.order.seller = foundSeller;
                }
            }

            // 2. Sanitizar Método de Envio
            if (rawJSON.order.shipping?.deliveryMethod) {
                if (!validDeliveryMethods.includes(rawJSON.order.shipping.deliveryMethod)) {
                    rawJSON.order.shipping.deliveryMethod = "delivery";
                }
            }

            // 3. Sanitizar Itens (HandlingType e Condition)
            if (Array.isArray(rawJSON.order.items)) {
                rawJSON.order.items = rawJSON.order.items.map((item: any) => {
                    let hType = item.handlingType;
                    if (hType) {
                        const exactMatch = validHandlingOptions.find(opt => opt.toLowerCase().trim() === String(hType).toLowerCase().trim());
                        if (exactMatch) {
                            hType = exactMatch;
                        } else {
                            const partialMatch = validHandlingOptions.find(opt => opt.toLowerCase().includes(String(hType).toLowerCase()) || String(hType).toLowerCase().includes(opt.toLowerCase()));
                            hType = partialMatch || validHandlingOptions[0];
                        }
                    } else {
                        hType = validHandlingOptions[0];
                    }

                    let cond = (item.condition || "novo").toLowerCase();
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

            // 4. Sanitizar Pagamentos (Method)
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

        // Sanitizar Origem do Cliente
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

