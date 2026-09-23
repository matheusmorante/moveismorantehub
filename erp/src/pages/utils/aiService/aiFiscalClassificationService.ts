import { callGeminiDirect } from "./aiDirectClient";
import { buildNcmClassificationPrompt, NCM_PRODUCT_CLASSIFICATION_RULES } from "../ncmClassificationPrompt";
import { supabase } from "@/pages/utils/supabaseConfig";
import { ncmService } from "@/services/fiscal/ncmService";

export interface NcmAiSuggestion {
    ncm: string;
    description: string;
    confidence: number;
    materialDetermination: 'informado' | 'presumido' | 'nao_aplicavel' | 'desconhecido';
    needsReview: boolean;
    reviewReason: string;
}

const emptyNcmSuggestion: NcmAiSuggestion = {
    ncm: '', description: '', confidence: 0, materialDetermination: 'desconhecido',
    needsReview: true, reviewReason: 'Não foi possível gerar uma sugestão validada.',
};

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
                    desc: `NCM encontrado em documento de entrada semelhante (${data[0].product_description?.slice(0, 35) || 'registro anterior'})`
                };
            }
        }
    } catch {
        // Fallback gracioso para a IA
    }
    return null;
}

export const aiFiscalClassificationService = {
    async findNCM(productName: string, material: string, description = '', category = ''): Promise<NcmAiSuggestion> {
        const result = await this.generateNCM(productName, material, description, category);
        return result;
    },

    async generateNCM(productName: string, material: string, description = '', category = ''): Promise<NcmAiSuggestion> {
        // Um documento de entrada semelhante fornece apenas uma hipótese, nunca uma classificação confirmada.
        const historical = await findHistoricalNcm(productName);

        let candidateCode = historical?.ncm || '';
        let confidence = historical ? 0.65 : 0;
        let materialDetermination: NcmAiSuggestion['materialDetermination'] = 'desconhecido';
        let reviewReason = historical ? 'Sugestão baseada em documento de entrada semelhante; confirme o produto e a classificação.' : 'Sugestão da IA; revise antes de aplicar.';

        if (!candidateCode) {
            // 2. Buscar shortlist somente na base local oficial e em aliases internos
            const shortlist = await ncmService.generateShortlist({
                title: productName,
                category,
                description,
                material,
            });
            const prompt = buildNcmClassificationPrompt({
                title: productName,
                material,
                description,
                category,
                shortlistCandidates: shortlist.map(c => ({
                    code: c.code,
                    official_description: c.official_description,
                    alias_match: c.alias_match,
                })),
            });

            try {
                const textResponse = await callGeminiDirect(prompt, true, {
                    tier: 'reasoning',
                    moduleSource: 'fiscal',
                    thinkingBudget: 'low',
                    operation: 'fiscal_ncm_generate',
                });
                const match = textResponse.match(/\{[\s\S]*\}/);
                const parsed = JSON.parse(match ? match[0] : textResponse.trim());
                candidateCode = parsed.suggestedNcm ? String(parsed.suggestedNcm).replace(/\D/g, '').slice(0, 8) : '';
                confidence = Number(parsed.confidence) || 0;
                materialDetermination = ['informado', 'presumido', 'nao_aplicavel'].includes(parsed.materialDetermination)
                    ? parsed.materialDetermination
                    : 'desconhecido';
                reviewReason = materialDetermination === 'presumido'
                    ? 'O material foi presumido como MDF/MDP/madeira. Confirme o material real e a classificação fiscal.'
                    : (parsed.reasoningSummary || 'Sugestão da IA; valide a classificação antes de aplicar.');
            } catch (error) {
                console.error("Erro na classificação NCM por IA:", error);
                return emptyNcmSuggestion;
            }
        }

        if (candidateCode.length !== 8) return emptyNcmSuggestion;
        try {
            const officialEntry = await ncmService.getCatalogEntry(candidateCode);
            if (!officialEntry || !officialEntry.active) {
                return { ...emptyNcmSuggestion, reviewReason: `O NCM sugerido (${candidateCode}) não está vigente na base oficial local.` };
            }

            return {
                ncm: candidateCode,
                description: officialEntry.official_description,
                confidence,
                materialDetermination,
                needsReview: true,
                reviewReason,
            };
        } catch (error) {
            console.error("Erro ao conferir a vigência da sugestão NCM:", error);
            return { ...emptyNcmSuggestion, reviewReason: 'Não foi possível confirmar o código na tabela oficial local.' };
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
            const materialNeedsReview = parsed.materialDetermination === 'presumido';
            const isReliable = parsed.confidence >= 0.50 && !parsed.needsReview && !materialNeedsReview && ncmCode.length === 8;
            const officialEntry = isReliable ? await ncmService.getCatalogEntry(ncmCode) : null;
            const activeOfficialEntry = officialEntry?.active ? officialEntry : null;

            return {
                ncm: activeOfficialEntry ? ncmCode : '',
                cest: parsed.cest ? String(parsed.cest).replace(/\D/g, '').slice(0, 7) : '',
                ncmDescription: activeOfficialEntry?.official_description || '',
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
