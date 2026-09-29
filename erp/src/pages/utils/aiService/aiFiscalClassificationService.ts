import { callGeminiDirect } from './aiDirectClient';

export const aiFiscalClassificationService = {
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
    const prompt = `DADOS FISCAIS COMPLEMENTARES DO PRODUTO

Você é um especialista em classificação fiscal de mercadorias brasileiras, especializado principalmente em móveis, colchões, estofados, utilidades e produtos relacionados ao varejo de móveis.

Não escolha, sugira ou altere o NCM. A classificação NCM é feita separadamente pelo catálogo oficial pesquisável por código, descrição e aliases.

DADOS DO PRODUTO:
- Nome/Título: ${productData.title}
- Categoria: ${productData.category || 'Não informada'}
- Material/Composição: ${productData.material || 'Não informado'}
- Descrição Completa: ${productData.description || 'Não informada'}

DADOS DA EMPRESA:
- Razão Social: ${productData.companyName || 'Móveis Morante'}
- CNPJ: ${productData.companyCnpj || 'Não informado'}
- Localização/Estado: ${productData.companyAddress || 'Paraná (PR)'}

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

      return {
        // Mantém compatibilidade com consumidores antigos; NCM não é gerado por IA.
        ncm: '',
        cest: parsed.cest ? String(parsed.cest).replace(/\D/g, '').slice(0, 7) : '',
        ncmDescription: '',
        cfop: String(parsed.cfop || '5102')
          .replace(/\D/g, '')
          .slice(0, 4),
        cst: String(parsed.cst || '102'),
        icmsPercent: Number(parsed.icmsPercent || 0),
        origem: String(parsed.origem || '0'),
        pisCst: String(parsed.pisCst || '49')
          .replace(/\D/g, '')
          .slice(0, 2),
        cofinsCst: String(parsed.cofinsCst || '49')
          .replace(/\D/g, '')
          .slice(0, 2),
      };
    } catch (error: any) {
      console.error('Erro na classificação tributária automática:', error);
      return {
        ncm: '',
        cest: '',
        ncmDescription: '',
        cfop: '5102',
        cst: '102',
        icmsPercent: 0,
        origem: '0',
        pisCst: '49',
        cofinsCst: '49',
      };
    }
  },
};
