export type ReceiptAIItem = {
    productType?: string;
    model?: string;
    variation?: string;
    quantity: number;
    baseCost: number;
};

export type ReceiptAIResult = {
    supplierName?: string;
    items: ReceiptAIItem[];
    ipi?: { value: number; unit: 'percent' | 'currency' };
    freight?: { value: number; unit: 'percent' | 'currency' };
    warnings: string[];
};

const parseResponse = (text: string): ReceiptAIResult => {
    const source = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const match = source.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] || source);
    return {
        supplierName: parsed.supplierName || undefined,
        items: Array.isArray(parsed.items) ? parsed.items.map((item: any) => ({
            productType: String(item.productType || item.product || '').trim(), model: String(item.model || '').trim(),
            variation: String(item.variation || item.color || '').trim(), quantity: Math.max(1, Number(item.quantity) || 1),
            baseCost: Math.max(0, Number(item.baseCost ?? item.cost ?? 0))
        })) : [],
        ipi: parsed.ipi?.value !== undefined ? { value: Math.max(0, Number(parsed.ipi.value) || 0), unit: parsed.ipi.unit === 'currency' ? 'currency' : 'percent' } : undefined,
        freight: parsed.freight?.value !== undefined ? { value: Math.max(0, Number(parsed.freight.value) || 0), unit: parsed.freight.unit === 'currency' ? 'currency' : 'percent' } : undefined,
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : []
    };
};

export const parseReceiptWithAI = async (text: string): Promise<ReceiptAIResult> => {
    const apiKey = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim();
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada.');
    const prompt = `Extraia um recebimento de mercadorias para um ERP. Retorne APENAS JSON.
O fornecedor é obrigatório para localizar produtos: se não for citado, deixe supplierName vazio e adicione o aviso "Informe o fornecedor/fábrica".
Para CADA item, extraia tipo do produto, modelo, variação/cor, quantidade e custo base unitário. Nunca una itens diferentes nem omita um item citado; crie uma entrada por modelo/variação.
Exemplo: "2 guarda-roupas Florida de 500, 4 guarda-roupas Monza de 300 e 7 cômodas Texas de 600" gera exatamente 3 itens.
IPI e frete podem ser porcentagem ou valor em reais: retorne unit "percent" ou "currency".
Não invente informações.
Formato: {"supplierName":"","items":[{"productType":"","model":"","variation":"","quantity":1,"baseCost":0}],"ipi":{"value":0,"unit":"percent"},"freight":{"value":0,"unit":"currency"},"warnings":[]}
Texto: ${text}`;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } } });
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
            if (response.ok) return parseResponse((await response.json())?.candidates?.[0]?.content?.parts?.[0]?.text || '');
            if (response.status !== 503 && response.status !== 429) throw new Error('Não foi possível interpretar o recebimento com a IA.');
        } catch (error) {
            if (attempt === 2) throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
    throw new Error('A IA está temporariamente indisponível. Tente novamente em alguns instantes.');
};
