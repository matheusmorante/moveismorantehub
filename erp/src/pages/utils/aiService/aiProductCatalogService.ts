import { callGeminiDirect } from "./aiDirectClient";

export const aiProductCatalogService = {
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
            } catch (err) {
                console.warn('[aiProductCatalogService.generateDescription] Falha no parse JSON de descrição:', err);
            }
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

    async extractProductColor(description: string): Promise<string | null> {
        if (!description || !description.trim()) return null;

        const prompt = `Você é um especialista em catálogo de móveis e decodificação de títulos de notas fiscais.
Sua tarefa é extrair a COR ou ACABAMENTO do móvel a partir da descrição abaixo.

DESCRIÇÃO DO PRODUTO:
"${description}"

REGRAS:
1. Extraia o nome exato da cor, estampa ou combinação de cores e tecidos (ex: "Cinamomo/Off White", "Cinamomo/off/veludo bege", "Marfim", "Nature/Preto", "Freijó", "Branco Brilho", "Grafite").
2. Remova medidas (ex: 120CM, 1.80m), códigos numéricos de modelo ou referências (ex: 16930.1-230, 4CAD, C/GRADE).
3. Se o produto não tiver cor identificável, retorne "color": null.
4. Retorne APENAS um objeto JSON no formato exato: {"color": "Nome da Cor ou null"}
Nenhum texto adicional fora do JSON.`;

        try {
            const textResponse = await callGeminiDirect(prompt);
            const match = textResponse.match(/\{[\s\S]*\}/);
            const cleanJson = match ? match[0] : textResponse.trim();
            const parsed = JSON.parse(cleanJson);
            if (parsed.color && typeof parsed.color === 'string' && parsed.color.trim()) {
                return parsed.color.trim();
            }
            return null;
        } catch (error) {
            console.warn('[aiProductCatalogService.extractProductColor] Falha na chamada do Gemini:', error);
            return null;
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
            } catch (err) {
                console.warn('[aiProductCatalogService.generateProductDescription] Falha no parse JSON:', err);
            }
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

            return {
                improvedDescription: textResponse.trim()
            };
        } catch (error: any) {
            console.error("Erro ao aperfeiçoar descrição com IA:", error);
            throw new Error(error.message || "Falha ao gerar nova descrição.");
        }
    }
};
