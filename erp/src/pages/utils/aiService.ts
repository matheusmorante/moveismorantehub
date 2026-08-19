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

/**
 * Chama diretamente a API Gemini (sem backend intermediário).
 * Lê o body de erro para expor o motivo real da falha (quota, chave inválida, etc.)
 */
async function callGeminiDirect(prompt: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY não configurada. Adicione a variável ao arquivo .env e reinicie o servidor.");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        let errDetail = `HTTP ${response.status}`;
        try {
            const errBody = await response.json();
            const msg = errBody?.error?.message || JSON.stringify(errBody);
            errDetail += `: ${msg}`;
        } catch {
            errDetail += `: ${response.statusText}`;
        }

        if (response.status === 429) {
            throw new Error(`Limite de requisições da IA atingido. Aguarde um momento e tente novamente. (${errDetail})`);
        } else if (response.status === 403 || response.status === 401) {
            throw new Error(`Chave de API inválida ou sem permissão. Verifique VITE_GEMINI_API_KEY. (${errDetail})`);
        } else if (response.status === 400) {
            throw new Error(`Requisição inválida para a IA (prompt rejeitado). (${errDetail})`);
        }
        throw new Error(`Gemini API retornou erro. (${errDetail})`);
    }

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
            const textResponse = await callGeminiDirect(prompt);
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

        const textResponse = await callGeminiDirect(prompt);
        return { description: textResponse.trim() };
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

        const textResponse = await callGeminiDirect(prompt);
        return { description: textResponse.trim() };
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
        const prompt = `Você é um classificador fiscal (especialista tributário do Brasil). 
Sua tarefa é encontrar o NCM mais provável para o seguinte produto:
Produto: ${productName}
Material / Composição: ${material || "Não informado"}

RETORNE APENAS um objeto JSON no formato exato: {"ncm": "8 digitos apenas numeros", "desc": "uma descricao curta de ate 50 caracteres que explica que tipo de produto eh"}
NÃO inclua markdown como \`\`\`json ou texto adicional. Se não souber exatamente, dê a melhor aproximação.`;

        try {
            const textResponse = await callGeminiDirect(prompt);
            let ans = textResponse.trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
            return JSON.parse(ans);
        } catch (error) {
            console.error("Erro extraindo o NCM", error);
            throw new Error("Não foi possível gerar um NCM automaticamente. Verifique se a IA respondeu num formato válido.");
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
            let clean = textResponse.trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
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
        companyName: string;
        companyAddress: string;
    }): Promise<{
        ncm: string;
        cest: string;
        ncmDescription: string;
        cfop: string;
        icmsPercent: number;
        cst: string;
        origem: string;
    }> {
        const prompt = `Você é um especialista tributário do Brasil. 
Sua tarefa é analisar os dados do produto e da empresa abaixo e sugerir a classificação fiscal e tributária exata para a emissão de Nota Fiscal Eletrônica (NF-e).

DADOS DO PRODUTO:
- Título/Nome: ${productData.title}
- Descrição Detalhada: ${productData.description || "Não informada"}

DADOS DA EMPRESA EMITENTE:
- Razão Social/Nome: ${productData.companyName || "Não informado"}
- Endereço/Localização: ${productData.companyAddress || "Não informado"}

RETORNE APENAS um objeto JSON no formato abaixo, sem nenhum bloco markdown (\`\`\`json), sem saudações ou explicações:
{
  "ncm": "string com 8 dígitos numéricos do NCM correto para o produto",
  "cest": "string com 7 dígitos do CEST correto (ou string vazia se não aplicável)",
  "ncmDescription": "descrição oficial resumida do NCM (máx 100 caracteres)",
  "cfop": "CFOP correto para venda interna (geralmente 5102 para mercadoria geral, ou outro aplicável se houver Substituição Tributária)",
  "cst": "CST ou CSOSN de ICMS mais adequado (ex: 102 para Simples Nacional sem permissão de crédito, ou outro adequado para o tipo de produto e empresa)",
  "icmsPercent": alíquota padrão de ICMS sugerida como número (ex: 12 ou 18),
  "origem": "origem da mercadoria de 0 a 8 (geralmente 0 para Nacional)"
}`;

        try {
            const textResponse = await callGeminiDirect(prompt);

            let cleanJson = textResponse.trim();
            if (cleanJson.startsWith('```json')) {
                cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
            } else if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
            }

            const parsed = JSON.parse(cleanJson);
            return {
                ncm: String(parsed.ncm || '').replace(/\D/g, '').slice(0, 8),
                cest: String(parsed.cest || '').replace(/\D/g, '').slice(0, 7),
                ncmDescription: String(parsed.ncmDescription || ''),
                cfop: String(parsed.cfop || '').replace(/\D/g, '').slice(0, 4),
                cst: String(parsed.cst || ''),
                icmsPercent: Number(parsed.icmsPercent || 0),
                origem: String(parsed.origem || '0')
            };
        } catch (error: any) {
            console.error("Erro na classificação tributária automática:", error);
            throw new Error(error?.message || "Falha ao gerar dados fiscais com Gemini.");
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
            const textResponse = await callGeminiDirect(prompt);
            if (!textResponse.trim()) {
                throw new Error("A IA retornou uma resposta vazia. Verifique se o produto tem título e descrição preenchidos.");
            }
            return { improvedDescription: textResponse.trim() };
        } catch (error: any) {
            console.error("Erro ao aperfeiçoar descrição:", error);
            throw new Error(error?.message || "Falha ao aperfeiçoar descrição com o Gemini.");
        }
    }
};
