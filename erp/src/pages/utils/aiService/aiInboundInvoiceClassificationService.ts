import { callGeminiDirect } from "./aiDirectClient";

export type InboundSupplierClassificationResult = {
    decision: 'EXISTING_VARIATION' | 'NEW_VARIATION_OF_EXISTING_PRODUCT' | 'NEW_PRODUCT' | 'UNSURE';
    matchedProductId: string | null;
    matchedVariationId: string | null;
    normalizedParentName: string;
    extractedAttributes: { color: string | null; measure: string | null; material: string | null };
    confidence: number;
    reasons: string[];
};

export const aiInboundInvoiceClassificationService = {
    /**
     * Classifica um item de NF de entrada usando a lista de produtos existentes
     * do fornecedor como contexto.
     * Decide entre:
     *   - EXISTING_VARIATION: variação já cadastrada → vincular diretamente
     *   - NEW_VARIATION_OF_EXISTING_PRODUCT: família existe → criar variação dentro do pai
     *   - NEW_PRODUCT: produto totalmente novo → criar independente
     *   - UNSURE: sem contexto suficiente
     */
    async classifyInboundItemWithSupplierContext(data: {
        itemDescription: string;
        itemProductCode?: string;
        supplierContextSummary: string;
    }): Promise<InboundSupplierClassificationResult> {
        const prompt = `Você é um especialista em gestão de estoque de móveis e classificação de produtos.

Sua tarefa: analisar a descrição de um item de nota fiscal de entrada e decidir como ele se relaciona com os produtos já cadastrados do fornecedor.

DESCRIÇÃO DO ITEM DA NF:
"${data.itemDescription}"${data.itemProductCode ? `
Código do fornecedor: ${data.itemProductCode}` : ''}

PRODUTOS JÁ CADASTRADOS DESTE FORNECEDOR:
${data.supplierContextSummary}

DECISÕES POSSÍVEIS:
- EXISTING_VARIATION: O item da NF já existe como uma variação cadastrada. Informe matchedProductId e matchedVariationId.
- NEW_VARIATION_OF_EXISTING_PRODUCT: O item é uma nova cor/medida/material de um produto-pai já existente. Informe matchedProductId (do pai) e matchedVariationId null.
- NEW_PRODUCT: O item não tem nenhuma relação com os produtos cadastrados. É totalmente novo.
- UNSURE: Não há contexto suficiente para decidir com segurança.

EXTRAIA os atributos de variação detectados na descrição (cor, medida, material).

Retorne SOMENTE JSON neste formato (sem markdown):
{
  "decision": "EXISTING_VARIATION" | "NEW_VARIATION_OF_EXISTING_PRODUCT" | "NEW_PRODUCT" | "UNSURE",
  "matchedProductId": "uuid do produto pai ou null",
  "matchedVariationId": "uuid da variação existente ou null",
  "normalizedParentName": "nome normalizado do produto-pai (sem atributos de variação)",
  "extractedAttributes": { "color": "string ou null", "measure": "string ou null", "material": "string ou null" },
  "confidence": 0.0,
  "reasons": ["razão 1", "razão 2"]
}`;

        try {
            const textResponse = await callGeminiDirect(prompt);
            const match = textResponse.match(/\{[\s\S]*\}/);
            const clean = match ? match[0] : textResponse.trim();
            const parsed = JSON.parse(clean);
            const validDecisions = ['EXISTING_VARIATION', 'NEW_VARIATION_OF_EXISTING_PRODUCT', 'NEW_PRODUCT', 'UNSURE'];
            const decision = validDecisions.includes(parsed.decision) ? parsed.decision : 'UNSURE';
            const confidence = Number(parsed.confidence);
            return {
                decision,
                matchedProductId: parsed.matchedProductId || null,
                matchedVariationId: parsed.matchedVariationId || null,
                normalizedParentName: String(parsed.normalizedParentName || '').trim(),
                extractedAttributes: {
                    color: parsed.extractedAttributes?.color || null,
                    measure: parsed.extractedAttributes?.measure || null,
                    material: parsed.extractedAttributes?.material || null,
                },
                confidence: Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : 0.5,
                reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String).slice(0, 5) : [],
            };
        } catch {
            return {
                decision: 'UNSURE',
                matchedProductId: null,
                matchedVariationId: null,
                normalizedParentName: '',
                extractedAttributes: { color: null, measure: null, material: null },
                confidence: 0,
                reasons: ['Não foi possível classificar o item com a IA.'],
            };
        }
    }
};
