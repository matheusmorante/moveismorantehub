import type {
  ProductAiCharacteristicsContext,
  ProductAiDescriptiveTextContext,
} from '../../../../../shared-utils/productAiFormSchemas';

/**
 * Constrói o prompt para extração técnica com diretrizes de busca e visão
 */
export function buildCharacteristicsPrompt(context: ProductAiCharacteristicsContext): string {
  const brand = context.brand || 'Não informada';
  const model = context.model || 'Não informado';
  const category = context.categoryName || 'Não informada';
  const attributesPrompt = (context.availableAttributes || [])
    .map((attr) => {
      const optionsText =
        attr.options && attr.options.length > 0
          ? ` (Opções válidas: ${attr.options.join(', ')})`
          : '';
      return `- "${attr.name}" [Tipo: ${attr.dataType || 'text'}]${optionsText}`;
    })
    .join('\n');

  return `Você é um especialista em catálogo, ficha técnica e engenharia de móveis residenciais no Brasil.
Sua missão é pesquisar na internet e identificar com máximo rigor técnico e evidências reais as características do produto abaixo.

══════════════════════════════════════════════════════════════════
IDENTIFICAÇÃO DO PRODUTO:
- Nome do Produto: ${context.productName}
- Marca / Fabricante: ${brand}
- Modelo / Linha: ${model}
- Categoria do Produto: ${category}
- Descrição Atual: ${context.description || 'Não informada'}
- Informações Adicionais Fornecidas: ${context.additionalInfo || 'Nenhuma'}
══════════════════════════════════════════════════════════════════

DIRETRIZES DE PESQUISA E ANÁLISE (OBRIGATÓRIAS):
1. PESQUISA NA WEB:
   - Utilize a ferramenta Google Search para pesquisar a ficha técnica deste móvel.
   - O nome do produto é o único dado de identificação obrigatório. Use marca, linha/modelo, categoria, descrição e fotos como referências adicionais somente quando estiverem disponíveis.
   - Priorize o site oficial da marca "${brand}" quando a marca estiver informada; sem marca, pesquise pelo nome e demais dados disponíveis.
   - Procure fichas técnicas e manuais oficiais do modelo "${model}" quando houver modelo informado; sem modelo, identifique o produto usando as outras referências disponíveis.
   - Se o site do fabricante não possuir todas as informações, consulte fontes secundárias confiáveis (grandes marketplaces, lojas especializadas).
   - Verifique a correspondência entre o nome e cada referência opcional que estiver preenchida. Não trate campos vazios como critérios de pesquisa.
   - Se marca ou modelo não estiverem informados e não puderem ser confirmados por fontes confiáveis ou pelas fotos, omita esses dados identificados em vez de inventá-los.
   - Identifique possíveis versões e variações do produto.
   - Jamais misture características de modelos semelhantes. Não considere produtos semelhantes como correspondência exata sem evidência sólida.
   - Se houver divergências relevantes entre as fontes consultadas (ex: medidas divergentes ou material divergente), detalhe no campo "divergences".

2. ANÁLISE DE IMAGEM: Se houver fotos fornecidas, inspecione-as atentamente:
   - Tipo(s) de puxador: diferencie com rigor puxador "Cava" (usinagem/fenda no próprio MDF), perfil "Passante" (perfil de alumínio contínuo na borda), perfil "Perfilado" (pequena aba de sobrepor pontual), "Alça", etc. Se portas inferiores forem cava e superiores forem passante ou perfilado, inclua AMBOS na lista.
   - Quantidade e tipo de portas (ex: 2 portas, 3 portas, 4 portas, bater, basculante, correr).
   - Gavetas e corrediças (ex: telescópica, metálica).
   - Material da estrutura (ex: 100% MDF, MDP/MDF, Madeira Maciça).
   - Acabamentos e vidros (se houver).

3. DIMENSÕES: Se encontrar as dimensões exatas na ficha técnica ou fotos (Altura, Largura, Profundidade em cm, Peso em kg), extraia-as em números.

4. CONFIANÇA (NÃO inventar percentuais arbitrários):
   - Avalie a confiança geral na identificação do produto: "alta", "media" ou "baixa".
   - Avalie a confiança de CADA característica individual: "alta", "media" ou "baixa".
   - Se uma característica não tiver evidência confiável, marque com confiança "baixa".

CARACTERÍSTICAS DA CATEGORIA A SEREM PREENCHIDAS:
${attributesPrompt || 'Preencha as características comuns para esta categoria de móvel.'}

FORMATO OBRIGATÓRIO DE RESPOSTA (JSON PURO):
Retorne APENAS um objeto JSON no seguinte formato:
{
  "identifiedProduct": {
    "name": "Nome oficial identificado do produto",
    "brand": "Marca identificada ou string vazia se não confirmada",
    "model": "Modelo ou linha identificados ou string vazia se não confirmados",
    "confidence": "alta",
    "sources": [
      { "title": "Site Oficial ou Fonte", "uri": "https://..." }
    ],
    "divergences": "Divergências encontradas entre fontes, se houver, ou string vazia"
  },
  "technicalValues": {
    "Nome Exato da Característica": "Valor identificado ou array de valores se for múltipla escolha"
  },
  "itemConfidence": {
    "Nome Exato da Característica": "alta"
  },
  "height": 0,
  "width": 0,
  "depth": 0,
  "weight": 0,
  "reasoning": "Breve justificativa técnica das características identificadas (fontes e observações nas fotos)"
}`;
}

/**
 * Constrói o prompt para extração a partir de texto livre / ficha técnica do fornecedor
 */
export function buildDescriptiveTextPrompt(context: ProductAiDescriptiveTextContext): string {
  const attributesPrompt = (context.availableAttributes || [])
    .map((attr) => {
      const optionsText =
        attr.options && attr.options.length > 0
          ? ` (Opções válidas: ${attr.options.join(', ')})`
          : '';
      return `- "${attr.name}" [Tipo: ${attr.dataType || 'text'}]${optionsText}`;
    })
    .join('\n');

  return `Você é um especialista em catálogo, ficha técnica e engenharia de móveis residenciais no Brasil.
Sua missão é analisar minuciosamente o TEXTO DESCRITIVO / FICHA TÉCNICA fornecido e extrair de forma estruturada e precisa todas as informações do produto para autopreenchimento de cadastro no ERP.

══════════════════════════════════════════════════════════════════
TEXTO DESCRITIVO / FICHA TÉCNICA FORNECIDA:
${context.descriptiveText}

INFORMAÇÕES ADICIONAIS FORNECIDAS:
${context.additionalInfo || 'Nenhuma'}

DADOS JÁ PREENCHIDOS NO SISTEMA (SE HOUVER):
- Nome Atual: ${context.currentName || 'Vazio'}
- Marca Atual: ${context.currentBrand || 'Vazia'}
- Modelo Atual: ${context.currentModel || 'Vazio'}
- Categoria do Produto: ${context.categoryName || 'Não informada'}
══════════════════════════════════════════════════════════════════

DIRETRIZES DE EXTRAÇÃO:
1. IDENTIFICAÇÃO DO PRODUTO:
   - Extraia o Nome Comercial do Produto completo e atraente.
   - Identifique a Marca / Fabricante se mencionada no texto (ou preserve a atual se fizer sentido).
   - Identifique o Modelo / Linha se mencionado.
2. DESCRIÇÃO:
   - Redija uma descrição limpa, organizada e vendedora com base no texto fornecido.
3. DIMENSÕES:
   - Extraia Altura, Largura e Profundidade em cm (apenas números). Se houver peso em kg, extraia.
4. CARACTERÍSTICAS TÉCNICAS:
   - Mapeie rigorosamente as características encontradas para os atributos abaixo (quando disponíveis):
${attributesPrompt || 'Preencha as características comuns para este móvel (ex: Material da Estrutura, Tipo de Porta, etc.).'}
5. NÍVEIS DE CONFIANÇA:
   - Classifique cada item identificado com confiança: "alta", "media" ou "baixa".

FORMATO OBRIGATÓRIO DE RESPOSTA (JSON PURO):
Retorne APENAS um objeto JSON no seguinte formato:
{
  "identifiedProduct": {
    "name": "Nome oficial identificado",
    "brand": "Marca identificada",
    "model": "Modelo identificado",
    "confidence": "alta",
    "sources": [],
    "divergences": ""
  },
  "technicalValues": {
    "Nome Exato da Característica": "Valor identificado ou array de valores se for múltipla escolha"
  },
  "itemConfidence": {
    "Nome Exato da Característica": "alta"
  },
  "height": 0,
  "width": 0,
  "depth": 0,
  "weight": 0,
  "description": "Texto descritivo formatado e otimizado",
  "reasoning": "Resumo das informações extraídas a partir do texto fornecido"
}`;
}

