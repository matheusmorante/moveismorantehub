import {
  PostCampaignSpec,
  PostCreationSpecification,
  PostFileResource,
  PostShareSpecification,
} from '../types/postSpecification';
import {
  ABSOLUTE_FIDELITY_RULE,
  renderProductImagesPromptSection,
} from './postProductImageResolver';
import { renderOfficialAssetsPromptSection } from './postOfficialAssetResolver';
import {
  DIRECT_WORKFLOW_FORMAT_INSTRUCTION,
  GLOBAL_ART_DIRECTION_SECTION,
  VISUAL_GROUNDING_MANDATORY_RULE,
} from './postArtDirectionGuidelines';

const SEPARATOR = '='.repeat(50);

function renderResources(resources: PostFileResource[]): string {
  if (!resources.length) return '';

  return resources
    .map(resource => {
      const tag = resource.role === 'OFFICIAL_ASSET' ? '[ASSET OFICIAL]' : '[REFERÊNCIA VISUAL]';
      return `${tag} ${resource.name}\n  URL: ${resource.url}${resource.description ? `\n  Descrição: ${resource.description}` : ''}`;
    })
    .join('\n');
}

function renderCampaignSection(campaign: PostCampaignSpec): string {
  const lines: string[] = [SEPARATOR, `CAMPANHA: ${campaign.name}`, SEPARATOR];
  if (campaign.description) lines.push(`Descrição: ${campaign.description}`);
  if (campaign.instructions) lines.push(`\nInstruções gerais:\n${campaign.instructions}`);

  for (const element of campaign.elements) {
    lines.push('');
    if (element.elementType === 'POST_REFERENCE') {
      lines.push('--- ELEMENTO: POST_REFERENCE (POST DE EXEMPLO / REFERÊNCIA VISUAL DE SUCESSO) ---');
      lines.push(
        'INSTRUÇÃO OBRIGATÓRIA DE COMPOSIÇÃO: O arquivo de referência anexado representa a estrutura e o padrão visual oficial aprovado da Móveis Morante. ' +
          'Siga estritamente as mesmas posições, proporções e formato dos containers da imagem de exemplo: ' +
          '1. Topo esquerdo com título e especificações; ' +
          '2. Topo direito com slogan caligráfico sublinhado em amarelo; ' +
          '3. Meio esquerdo com card flutuante de visão interna limpo; ' +
          '4. Inferior esquerdo com o container de preço em degradê azul marinho e borda dourada destacada; ' +
          '5. Inferior direito com a galeria de outras cores; ' +
          '6. Rodapé em faixa azul contínua na base contendo o logo oficial à direita e EXCLUSIVAMENTE os 3 selos comerciais à esquerda/centro ("Entrega Rápida" [1 a 4 dias], "Montagem Inclusa" e "Compra Segura" [Pague na Entrega]). ' +
          'Não copie selos legados da imagem de exemplo como "Qualidade e Confiança" ou "Frete Grátis".',
      );
    } else {
      lines.push(`--- ELEMENTO: ${element.elementType} ---`);
    }
    if (element.prompt) lines.push(`Prompt:\n${element.prompt}`);
    if (element.instructions) lines.push(`Instruções adicionais:\n${element.instructions}`);
    const resources = renderResources(element.resources);
    if (resources) lines.push(`Recursos:\n${resources}`);
  }

  return lines.join('\n');
}

function appendSharedPromptSections(
  lines: string[],
  spec: PostCreationSpecification | PostShareSpecification,
): void {
  if (spec.productImages) {
    lines.push(renderProductImagesPromptSection(spec.productImages), '');
  }
  if (spec.officialAssets) {
    lines.push(renderOfficialAssetsPromptSection(spec.officialAssets), '');
  }
  lines.push(GLOBAL_ART_DIRECTION_SECTION, '');
}

function appendFormatAndFinalRules(lines: string[], spec: PostCreationSpecification | PostShareSpecification, includeGalleryRules: boolean): void {
  lines.push(SEPARATOR, 'FORMATOS', SEPARATOR);
  lines.push(...spec.formats.map(format => `${format.name.toUpperCase()}\n${format.aspectRatio}\n${format.referenceSize}\n`));
  lines.push(DIRECT_WORKFLOW_FORMAT_INSTRUCTION, '', SEPARATOR, 'REGRAS FINAIS', SEPARATOR);
  lines.push('- Preserve fielmente o produto e sua variação;');
  lines.push('- As fotos oficiais fornecidas em IMAGENS OFICIAIS DO PRODUTO são a fonte visual de verdade;');
  lines.push('- Use somente fatos verificáveis na página do produto;');
  lines.push('- Não invente preço, desconto, parcelamento, oportunidade ou características;');
  lines.push('- Referências visuais definem direção visual — não copie literalmente;');
  lines.push('- Assets oficiais (logo, selos) são arquivos gráficos prontos: NUNCA redesenhe, recrie ou estilize;');
  lines.push('- Se a IA não puder inserir o asset fielmente, deixe o espaço reservado em vez de inventar uma marca;');
  lines.push('- Direção de arte profissional ao redor do móvel: crie ambientação comercial elegante, iluminação publicitária com sombras reais e bloco de preço destacado;');
  lines.push('- Separar conceitos: Fidelidade do Produto (estritamente fiel às fotos reais) vs. Direção de Arte (rica, sofisticada e profissional, sem aspecto de catálogo simplista ou fundo chapado);');
  if (includeGalleryRules) {
    lines.push('- Galeria secundária de cores: apresente EXCLUSIVAMENTE as DEMAIS variações/cores, NUNCA duplicando a Variação 1 (a cor principal já é o móvel em destaque no post);');
    lines.push('- Slogans e rótulos proibidos: NUNCA invente slogans da empresa/loja (a logo da Móveis Morante já carrega a identidade oficial) nem insira slogans no canto inferior direito. NUNCA insira rótulos ou tags na foto de visão interna como "material de qualidade", "amplo espaço interno" ou "design moderno";');
    lines.push('- Slogans autorizados: permitidos apenas 2 destaques do produto (um abaixo do título do produto e outro ao lado do móvel em estilo caligráfico com traçado amarelo);');
    lines.push('- Proibição de elementos extras: NUNCA adicione caixas, selos, textos ou elementos gráficos adicionais que não tenham sido solicitados;');
  }
  lines.push('- Respeite o formato solicitado (aspecto e dimensões);');
  lines.push('- Componha todos os elementos como uma única peça coerente;');
  lines.push('- Não trate cada elemento como arte independente.', '');
  lines.push(`Versão da configuração: ${spec.configurationVersion}`);
  lines.push(`Gerado em: ${spec.generatedAt}`);
}

/** Renderiza uma especificação de campanha única como texto para o Prompt Preview. */
export function renderSpecificationAsPrompt(spec: PostCreationSpecification): string {
  const lines: string[] = [
    SEPARATOR,
    'MÓVEIS MORANTE — INSTRUÇÕES DE CRIAÇÃO DE POST',
    SEPARATOR,
    '',
    VISUAL_GROUNDING_MANDATORY_RULE,
    '',
    ABSOLUTE_FIDELITY_RULE,
    '',
    'PRODUTO',
    '',
    'Página oficial do produto:',
    spec.product.catalogUrl,
    '',
    'Consulte esta página para obter as informações públicas reais do produto.',
    'Ela é a fonte factual de verdade para: nome, variação, características,',
    'fotos, preço, condições comerciais e oportunidade disponíveis publicamente.',
    'Não invente informações ausentes.',
    '',
  ];
  appendSharedPromptSections(lines, spec);
  lines.push(renderCampaignSection(spec.campaign), '');
  appendFormatAndFinalRules(lines, spec, true);
  return lines.join('\n');
}

/** Renderiza especificação de compartilhamento (todas as campanhas) como texto. */
export function renderShareSpecificationAsPrompt(spec: PostShareSpecification): string {
  const lines: string[] = [
    SEPARATOR,
    'MÓVEIS MORANTE — INSTRUÇÕES DE CRIAÇÃO DE POSTS (TODAS AS CAMPANHAS)',
    SEPARATOR,
    '',
    VISUAL_GROUNDING_MANDATORY_RULE,
    '',
    ABSOLUTE_FIDELITY_RULE,
    '',
    spec.masterInstruction,
    '',
    'PRODUTO',
    '',
    'Página oficial do produto:',
    spec.product.catalogUrl,
    '',
  ];
  appendSharedPromptSections(lines, spec);
  lines.push(...spec.campaigns.map(renderCampaignSection), '');
  appendFormatAndFinalRules(lines, spec, false);
  return lines.join('\n');
}
