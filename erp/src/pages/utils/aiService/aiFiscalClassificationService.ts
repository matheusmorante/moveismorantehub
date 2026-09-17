import { callGeminiDirect } from "./aiDirectClient";
import { buildNcmClassificationPrompt, NCM_PRODUCT_CLASSIFICATION_RULES } from "../ncmClassificationPrompt";
import { supabase } from "@/pages/utils/supabaseConfig";
import { ncmService } from "@/services/fiscal/ncmService";

async function findHistoricalNcm(productName: string): Promise<{ ncm: string; desc: string } | null> {
    try {
        const cleanName = productName.trim().replace(/[^\w\s]/gi, '').slice(0, 30);
        if (!cleanName || cleanName.length < 3) return null;
        const { data } = await supabase
            .from('inbound_invoice_items')
            .select('ncm, product_description')
            .ilike('product_description', `%${cleanName}%`)
            .not('ncm', 'is', null)
            .limit(1);

        if (data && data.length > 0 && data[0].ncm) {
            const cleanNcm = String(data[0].ncm).replace(/\D/g, '');
            if (cleanNcm.length === 8) {
                return {
                    ncm: cleanNcm,
                    desc: `NCM validado pelo histórico confirmado no ERP (${data[0].product_description?.slice(0, 35) || 'registro anterior'})`
                };
            }
        }
    } catch {
        // Fallback gracioso para a IA
    }
    return null;
}

export const aiFiscalClassificationService = {
    async findNCM(productName: string, material: string, description = '', category = ''): Promise<{ ncm: string, description: string }> {
        const result = await this.generateNCM(productName, material, description, category);
        return { ncm: result.ncm, description: result.desc };
    },

    async generateNCM(productName: string, material: string, description = '', category = ''): Promise<{ ncm: string, desc: string }> {
        // 1. Autoridade do histórico do ERP: produto já homologado tem precedência total sobre a IA
        const historical = await findHistoricalNcm(productName);
        if (historical) {
            return historical;
        }

        // 2. Buscar shortlist de NCMs
        const shortlist = await ncmService.generateShortlist({
            title: productName,
            category: category,
            description: description,
            material: material
        });

        // 3. Classificação por raciocínio estruturado (Gemini 3.8 Flash, thinking: low)
        const prompt = buildNcmClassificationPrompt({ 
            title: productName, 
            material, 
            description, 
            category,
            shortlistCandidates: shortlist.map(c => ({
                code: c.code,
                official_description: c.official_description,
                alias_match: c.alias_match
            }))
        });

        try {
            const textResponse = await callGeminiDirect(prompt, true, {
                tier: 'reasoning',
                moduleSource: 'fiscal',
                thinkingBudget: 'low',
                operation: 'fiscal_ncm_generate',
            });
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
            return { ncm: '', desc: '' };
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
        const shortlist = await ncmService.generateShortlist({
            title: productData.title,
            category: productData.category,
            description: productData.description,
            material: productData.material
        });

        const candidatesStr = shortlist && shortlist.length > 0 
            ? shortlist.map(c => `- ${c.code}: ${c.official_description} (Alias: ${c.alias_match || 'N/A'})`).join('\n')
            : "Nenhum candidato encontrado na base local. Utilize seu conhecimento.";

        const prompt = `CLASSIFICADOR FISCAL DE PRODUTOS — NCM E REGIME TRIBUTÁRIO

Você é um especialista em classificação fiscal de mercadorias brasileiras, especializado principalmente em móveis, colchões, estofados, utilidades e produtos relacionados ao varejo de móveis.

Sua função é analisar os dados fornecidos de um produto e determinar a classificação NCM mais adequada.

Você NÃO deve classificar o produto apenas por palavras-chave isoladas. Primeiro determine o que o produto realmente é, sua função, seu material e sua utilização. Depois faça a classificação.

${NCM_PRODUCT_CLASSIFICATION_RULES}

DADOS DO PRODUTO:
- Nome/Título: ${productData.title}
- Categoria: ${productData.category || "Não informada"}
- Material/Composição: ${productData.material || "Não informado"}
- Descrição Completa: ${productData.description || "Não informada"}

CANDIDATOS (SHORTLIST GERADA PELO BANCO OFICIAL DA EMPRESA):
<shortlist>
${candidatesStr}
</shortlist>

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
  "materialDetermination": "informado | presumido | nao_aplicavel",
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
            const textResponse = await callGeminiDirect(prompt, true, {
                tier: 'reasoning',
                moduleSource: 'fiscal',
                thinkingBudget: 'low',
                operation: 'fiscal_complete_classification',
            });
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
    }
};
