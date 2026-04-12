import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const logs = [];
function addLog(type, message, data = null) {
    const log = {
        timestamp: new Date().toISOString(),
        type,
        message,
        data
    };
    logs.unshift(log);
    if (logs.length > 50) logs.pop();
    console.log(`[${type}] ${message}`);
}

// Initialize Gemini (SDK Estável para API Key gratuita)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function extractJSON(text) {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse JSON from AI response:", text);
        throw new Error("A IA retornou um formato inválido.");
    }
}

app.get('/', (req, res) => res.send("AI Server is running (v8 - Gemini 2.5 Flash)"));
app.get('/api/logs', (req, res) => res.json(logs));

async function safePrompt(prompt, systemPrompt = null) {
    // Usando gemini-2.5-flash conforme disponibilidade na conta do usuário
    const modelName = "gemini-2.5-flash"; 
    try {
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: systemPrompt || undefined 
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error(`Gemini Error with model ${modelName}:`, error.message);
        addLog("AI_ERROR", `Falha no Gemini (${modelName}): ${error.message}`);
        
        if (prompt.includes("JSON")) {
            return JSON.stringify({
                error: true,
                message: `Erro de Conexão: ${error.message}`,
                next_step: "Salvar relato bruto"
            });
        }
        return JSON.stringify({ error: `Serviço de IA indisponível: ${error.message}` });
    }
}

app.post('/api/generate-description', async (req, res) => {
    try {
        const { productName, category, unitPrice, promptTemplate } = req.body;
        addLog("DESCRIPTION", `Gerando descrição para: ${productName}`);

        let prompt = promptTemplate || `Crie uma descrição persuasiva para o produto ${productName}.`;
        prompt = prompt
            .replace(/{{productName}}/g, productName || '')
            .replace(/{{category}}/g, category || '')
            .replace(/{{unitPrice}}/g, `R$ ${unitPrice || '0.00'}`);

        const answer = await safePrompt(prompt);
        res.json({ description: answer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate-product-description', async (req, res) => {
    try {
        const { title, material, dimensions, brand, line, mainDifferential, colors, notIncluded, type } = req.body;
        addLog("PRODUCT_DESCRIPTION", `Gerando descrição ${type} para: ${title}`);

        const systemPrompt = `Você é um especialista em vendas e copywriting de móveis da "Móveis Morante". 
        Seu objetivo é criar descrições altamente persuasivas e profissionais que destaquem a qualidade e o benefício do produto.

        DADOS DO PRODUTO:
        - Título: ${title}
        - Marca: ${brand || 'Móveis Morante'}
        - Material: ${material || 'Não informado'}
        - Dimensões: ${dimensions || 'Não informado'}
        - Linha/Modelo: ${line || 'Não informado'}
        - Diferencial: ${mainDifferential || 'Não informado'}
        - Cores: ${colors || 'Não informado'}
        - O que NÃO acompanha: ${notIncluded || 'Não informado'}

        FORMATAÇÃO DESEJADA:
        ${type === 'whatsapp' 
            ? 'Crie um texto curto, direto, com tópicos e emojis. Foco em urgência e praticidade para conversas no WhatsApp.' 
            : 'Crie uma descrição completa, estruturada com cabeçalhos, rica em detalhes técnicos e com foco em SEO para loja virtual. Use um tom elegante e profissional.'}

        REGRAS:
        - TUDO EM MAIÚSCULAS (ALL CAPS). Nunca use letras minúsculas.
        - Nunca invente características que não foram fornecidas.
        - Use uma linguagem que passe confiança e qualidade.
        - Não coloque preços, a menos que explicitamente solicitado (o que não é o caso aqui).`;

        const answer = await safePrompt("Gere a descrição agora.", systemPrompt);
        res.json({ description: answer.trim().toUpperCase() });
    } catch (error) {
        addLog("ERROR", `Erro ao gerar descrição: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate-marketplace-title', async (req, res) => {
    try {
        const { description, material, differential } = req.body;
        addLog("MARKETPLACE_TITLE", `Gerando título para: ${description}`);

        const systemPrompt = `Você é um especialista em vendas e SEO para marketplaces como Mercado Livre, Shopee e Magalu.
        Sua tarefa é criar um TÍTULO DE ALTO IMPACTO (máximo 60 caracteres) para o produto fornecido.

        DADOS DO PRODUTO:
        - Título base/Descrição curta: ${description}
        - Material: ${material || 'Não informado'}
        - Diferencial: ${differential || 'Não informado'}

        REGRAS DE OURO PARA O TÍTULO:
        1. TUDO EM MAIÚSCULAS (ALL CAPS). Nunca use letras minúsculas.
        2. Comece com o nome principal do produto (EX: GUARDA-ROUPA, SOFÁ, PAINEL).
        3. Inclua o material principal ou característica chave.
        4. Inclua o diferencial principal de forma curta.
        5. Mantenha o título com no máximo 60 caracteres.
        6. Não use emojis no título.
        7. Não use a palavra "Oferta" ou "Promoção" (marketplaces proíbem).
        8. Retorne APENAS o título gerado, sem aspas, explicações ou saudações.`;

        const answer = await safePrompt("Gere o título agora.", systemPrompt);
        res.json({ title: answer.trim().replace(/^"|"$/g, '').toUpperCase() });
    } catch (error) {
        addLog("ERROR", `Erro ao gerar título: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/suggest-prices', async (req, res) => {
    try {
        const { description, costPrice, material, differential } = req.body;
        addLog("PRICE_SUGGESTION", `Sugerindo preços para: ${description} (Custo: ${costPrice})`);

        const systemPrompt = `Você é um consultor financeiro e especialista em precificação para o setor moveleiro brasileiros.
        Sua tarefa é sugerir três valores de venda baseados no custo do produto e no seu posicionamento de mercado.

        DADOS DO PRODUTO:
        - Produto: ${description}
        - Preço de Custo (Final): R$ ${costPrice}
        - Material: ${material || 'Não informado'}
        - Diferencial: ${differential || 'Não informado'}

        REGRAS DE PRECIFICAÇÃO (ESTRATÉGIA MORANTE):
        1. Base de Cálculo: Custo de Compra (R$ ${costPrice}).
        2. Impostos Gerais: Considere 19% sobre o preço de venda final.
        3. Custos Fixos/Adm + Frete: Considere uma reserva de 10-15% do valor.
        4. Margens de Lucro Líquido Desejadas:
           - Opção 1 (Giro): Lucro Líquido de 5-10%.
           - Opção 2 (Ideal): Lucro Líquido de 15-20%.
           - Opção 3 (Premium): Lucro Líquido de 25-35%.

        REGRAS DE FORMATAÇÃO:
        - Os labels devem estar em MAIÚSCULAS.
        - Retorne APENAS um objeto JSON válido com a seguinte estrutura:
        {
            "low": { "price": number, "label": "COMPETITIVO (GIRO RÁPIDO)", "margin": number },
            "medium": { "price": number, "label": "EQUILIBRADO (IDEAL MORANTE)", "margin": number },
            "high": { "price": number, "label": "PREMIUM (LUCRO MÁXIMO)", "margin": number }
        }
        O campo 'margin' deve ser a porcentagem de margem de lucro LÍQUIDO estimada.
        Use números brutos, sem R$ ou strings no campo price e margin.`;

        const answer = await safePrompt("Gere as sugestões de preço agora.", systemPrompt);
        const parsed = extractJSON(answer);
        res.json(parsed);
    } catch (error) {
        addLog("ERROR", `Erro ao sugerir preços: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/suggest-category', async (req, res) => {
    try {
        const { title, categories } = req.body;
        addLog("CATEGORY_SUGGESTION", `Sugerindo categoria para: ${title}`);

        const systemPrompt = `Você é um classificador de produtos para um sistema de e-commerce e ERP de móveis chamado Móveis Morante.
        Dada uma lista de categorias disponíveis e o título do produto, retorne o nome exato da categoria mais adequada da lista.
        
        Produto: ${title}
        Categorias disponíveis: ${categories.join(', ')}
        
        Retorne APENAS um objeto JSON válido com a seguinte estrutura:
        {"category": "NOME DA CATEGORIA AQUI"}
        
        Se nenhuma categoria se encaixar perfeitamente, retorne "null" ou a mais próxima.`;

        const answer = await safePrompt("Verifique a melhor categoria.", systemPrompt);
        res.json(extractJSON(answer));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate-combo-name', async (req, res) => {
    try {
        const { items } = req.body;
        addLog("COMBO_NAME", `Gerando nome de combo`);

        const systemPrompt = `Você é um copywriter para e-commerce de móveis.
        Crie um nome atraente e comercial para um KIT/COMBO formado por estes itens:
        ${items}
        
        O nome deve começar com "Kit" ou "Conjunto", e ser descritivo mas curto (máx 60 caracteres). Tudo em MAIÚSCULAS.
        Retorne APENAS o nome gerado, sem aspas, sem markdown.`;

        const answer = await safePrompt("Gere o nome do kit agora.", systemPrompt);
        res.json({ name: answer.trim().toUpperCase() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai-chat', async (req, res) => {
    try {
        const { message, systemPrompt } = req.body;
        addLog("CHAT", `Nova mensagem recebida`);
        const answer = await safePrompt(message, systemPrompt);
        res.json({ answer });
    } catch (error) {
        addLog("ERROR", `Erro no Chat: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai-detect-intent', async (req, res) => {
    try {
        const { message, detectionPrompt } = req.body;
        addLog("INTENT", `Detectando intenção`);
        let prompt = detectionPrompt || `Analise: {{message}}`;
        prompt = prompt.replace(/{{message}}/g, message);

        const answer = await safePrompt(prompt, "Responda APENAS com um objeto JSON válido.");
        try {
            const parsed = extractJSON(answer);
            addLog("INTENT_SUCCESS", `Intenção detectada: ${parsed.intent || 'unknown'}`);
            res.json(parsed);
        } catch (e) {
            res.json({
                intent: 'chat',
                data: { message: answer }
            });
        }
    } catch (error) {
        addLog("ERROR", `Erro na Intenção: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// --- BLING INTEGRATION ---
app.post('/api/bling-oauth', async (req, res) => {
    try {
        const { action, code, clientId, clientSecret, redirectUri } = req.body;
        addLog("BLING_AUTH", `Iniciando troca de código Bling (${action})`);

        if (action === 'exchange_code') {
            const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            const response = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri
                })
            });

            const data = await response.json();
            console.log("--- RESPOSTA DO BLING ---");
            console.log(JSON.stringify(data, null, 2));
            console.log("-------------------------");
            
            if (!response.ok) {
                addLog("BLING_ERROR", "Erro ao trocar token no Bling", data);
                return res.status(response.status).json(data);
            }

            // Persiste no Supabase usando a SERVICE_ROLE se disponível, ou ANON se não
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
            
            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

            const dbUpdate = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bling_config`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    id: '00000000-0000-0000-0000-000000000001',
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires_at: expiresAt.toISOString(),
                    active: true,
                    updated_at: new Date().toISOString()
                })
            });

            if (!dbUpdate.ok) {
                const dbError = await dbUpdate.text();
                addLog("DB_ERROR", "Falha ao gravar tokens no Supabase", dbError);
                return res.status(500).json({ error: "Erro ao salvar tokens no banco", details: dbError });
            }

            addLog("BLING_SUCCESS", "Tokens salvos com sucesso no Supabase");
            res.json({ success: true, message: 'Tokens atualizados' });
        } else {
            res.status(400).json({ error: 'Ação inválida' });
        }
    } catch (error) {
        addLog("ERROR", `Erro no OAuth Bling: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/bling-proxy', async (req, res) => {
    try {
        const { endpoint, params, method = 'GET', body: reqBody } = req.body;
        
        // Busca o token no Supabase
        const configResp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bling_config?id=eq.00000000-0000-0000-0000-000000000001&select=*`, {
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
            }
        });
        const configs = await configResp.json();
        const config = configs[0];

        if (!config || !config.access_token) {
            return res.status(401).json({ error: 'Bling não autenticado' });
        }

        let queryString = '';
        if (params) {
            const usp = new URLSearchParams();
            Object.entries(params).forEach(([key, val]) => {
                if (Array.isArray(val)) {
                    val.forEach(v => usp.append(key, v));
                } else if (val !== undefined) {
                    usp.append(key, val);
                }
            });
            queryString = '?' + usp.toString();
        }
        const response = await fetch(`https://www.bling.com.br/Api/v3${endpoint}${queryString}`, {
            method,
            headers: {
                'Authorization': `Bearer ${config.access_token}`,
                'Content-Type': 'application/json'
            },
            body: reqBody ? JSON.stringify(reqBody) : undefined
        });

        const data = await response.json();

        // Se estivermos listando produtos, vamos buscar o estoque em lote para economizar chamadas
        if (endpoint === '/produtos' && data.data) {
            const ids = data.data.map(p => p.id);
            if (ids.length > 0) {
                const stockUrl = `https://www.bling.com.br/Api/v3/estoques/saldos?idsProdutos[]=${ids.join('&idsProdutos[]=')}`;
                console.log("--- BUSCANDO ESTOQUES ---", stockUrl);
                
                const stockResp = await fetch(stockUrl, {
                    headers: { 'Authorization': `Bearer ${config.access_token}` }
                });
                const stockData = await stockResp.json();
                console.log("--- RESPOSTA ESTOQUES ---", JSON.stringify(stockData).substring(0, 500));
                
                // Mescla o estoque no objeto do produto
                data.data = data.data.map(p => {
                    const stockInfo = stockData.data?.find(s => String(s.produto.id) === String(p.id));
                    return {
                        ...p,
                        estoque: {
                            saldoTotal: stockInfo ? (stockInfo.saldoFisicoTotal || 0) : 0
                        }
                    };
                });
            }
        }

        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const port = process.env.PORT || 3003;
app.listen(port, '0.0.0.0', () => {
    console.log("==========================================");
    console.log(`LIZANDRO (GEMINI) ONLINE NA PORTA ${port}`);
    console.log("==========================================");
});

process.on('SIGTERM', () => {
    console.log('Recebido SIGTERM, desligando graciosamente...');
    process.exit(0);
});
