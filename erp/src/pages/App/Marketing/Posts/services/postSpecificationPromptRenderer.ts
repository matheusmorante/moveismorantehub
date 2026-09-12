import {
  PostCampaignSpec,
  PostCreationSpecification,
  PostBenefitSpec,
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
import { SYSTEM_OFFICIAL_BENEFITS } from './postBenefitsResolver';

const SEPARATOR = '='.repeat(50);

interface PromptRenderOptions {
  localFilesOnly?: boolean;
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

export function renderBenefitsPromptSection(
  benefits: PostBenefitSpec[],
  options: PromptRenderOptions = {},
): string {
  if (benefits.length === 0) {
    return `${SEPARATOR}
CONTEÚDO LITERAL OBRIGATÓRIO — BENEFÍCIOS DO RODAPÉ
${SEPARATOR}
Fonte estruturada: lista explicitamente vazia.
Quantidade exata: 0

OMITA integralmente o rodapé de benefícios. Não crie benefícios, ícones, selos, textos, espaços reservados ou itens de preenchimento.`;
  }

  const rows = benefits.map((benefit, index) =>
    `| ${index + 1} | ${escapeMarkdownCell(benefit.id)} | ${escapeMarkdownCell(benefit.title)} | ${escapeMarkdownCell(benefit.subtitle ?? '')} | ${escapeMarkdownCell(benefit.source)} |`,
  );
  const sources = [...new Set(benefits.map(benefit => benefit.source))].join(', ');

  const footerRefVisual = options.localFilesOnly
    ? 'Guia de estilo do rodapé: faixa contínua azul marinho com ícones amarelos, textos em branco e logotipo da loja à direita.'
    : 'Referência visual oficial do rodapé: /images/footer-benefits-morante-official.png';

  return `${SEPARATOR}
CONTEÚDO LITERAL OBRIGATÓRIO — BENEFÍCIOS DO RODAPÉ (FOOTER)
${SEPARATOR}
Fonte estruturada: ${sources}
Quantidade exata: ${benefits.length}
${footerRefVisual}

| Ordem | ID estável | Texto principal literal | Texto secundário literal | Fonte |
| ---: | --- | --- | --- | --- |
${rows.join('\n')}

ESTRUTURA VISUAL DO RODAPÉ OFICIAL:
- Faixa retangular contínua azul marinho escuro (#002B49) fixada na base do post.
- À esquerda e centro: 3 blocos verticais separados por linhas divisórias sutis, contendo ícone amarelo + título em branco negrito + subtítulo em branco/cinza claro.
- À direita: Logo oficial da Móveis Morante em destaque, com sua casinha amarela e o slogan "QUALIDADE QUE CABE NO SEU BOLSO".

REGRAS NEGATIVAS OBRIGATÓRIAS — APLICAR DIRETAMENTE À LISTA ACIMA:
- Renderize exatamente ${benefits.length} benefício(s), na mesma ordem da tabela.
- NÃO invente benefícios, textos, prazos, condições, slogans, selos ou itens adicionais.
- NÃO substitua, resuma, complete, corrija, traduza ou reescreva nenhum texto literal.
- NÃO remova, duplique, combine nem altere a ordem dos itens.
- Se houver menos itens que o espaço visual disponível, NÃO preencha os espaços restantes.

LIBERDADE VISUAL LIMITADA:
- A IA pode organizar visualmente os itens e desenhar ícones coerentes, sem alterar seu significado nem seu conteúdo textual.
- Rodapé em azul escuro (#002B49), destaques e ícones em amarelo (#F7B731 / #FFC107) e textos secundários em branco (#FFFFFF).
- A paleta, o layout e os ícones NÃO autorizam qualquer mudança no conteúdo literal acima.`;
}

function renderProductFactsSection(
  spec: PostCreationSpecification | PostShareSpecification,
): string {
  const fields = spec.productLiteralFields ?? [];
  const rows = fields.map((field, index) =>
    `| ${index + 1} | ${escapeMarkdownCell(field.id)} | ${escapeMarkdownCell(field.label)} | ${escapeMarkdownCell(field.value)} | ${escapeMarkdownCell(field.source)} |`,
  );
  const fallbackTable = rows.length
    ? `| Ordem | ID estável | Campo | Valor literal | Fonte ERP |\n| ---: | --- | --- | --- | --- |\n${rows.join('\n')}`
    : 'Nenhum dado textual/comercial de fallback foi fornecido pelo ERP.';

  return `${SEPARATOR}
FONTE OFICIAL DOS DADOS DO PRODUTO
${SEPARATOR}
Página pública do produto no Catálogo Digital: ${spec.product.catalogUrl}

INSTRUÇÃO OBRIGATÓRIA:
- Abra e consulte essa página pública. Ela é a fonte de verdade para nome/título, descrição, medidas, preço atual, preço anterior, parcelamento e demais dados textuais/comerciais.
- Copie os dados exatamente como publicados: NÃO invente, infira, calcule, arredonde, converta, complete, resuma ou reescreva valores e textos.
- Diferencie sem ambiguidade o PREÇO ANTERIOR/DE REFERÊNCIA (riscado) do PREÇO ATUAL/PROMOCIONAL (destacado). NUNCA troque os dois.
- Se um campo não existir na página nem no fallback literal abaixo, omita o elemento correspondente. NÃO derive um valor a partir de outro.
- Esta seção prevalece sobre qualquer texto conflitante em prompts de campanha, elementos ou referências visuais.
- O Catálogo Digital é fonte apenas dos dados textuais/comerciais. NÃO obtenha imagens por esse link.
- As únicas fontes visuais permitidas são os arquivos anexados e nomeados nas seções de imagens/assets deste prompt.

DADOS IMUTÁVEIS DO ERP — FALLBACK SE A PÁGINA NÃO PUDER SER CONSULTADA:
${fallbackTable}

REGRA DE FALLBACK:
Use estes valores literalmente e associados ao campo indicado. Não mostre IDs/fontes na arte. Se o campo não está na tabela, não o invente.`;
}

function renderResources(resources: PostFileResource[], options: PromptRenderOptions): string {
  if (!resources.length) return '';

  return resources
    .filter(resource => !options.localFilesOnly || Boolean(resource.file))
    .map(resource => {
      const tag = resource.role === 'OFFICIAL_ASSET' ? '[ASSET OFICIAL]' : '[REFERÊNCIA VISUAL]';
      const reference = resource.file
        ? `Arquivo: \`${resource.file}\``
        : `URL: ${resource.url}`;
      return `${tag} ${resource.name}\n  ${reference}${resource.description ? `\n  Descrição: ${resource.description}` : ''}`;
    })
    .join('\n');
}

function renderCampaignSection(campaign: PostCampaignSpec, options: PromptRenderOptions = {}): string {
  const lines: string[] = [SEPARATOR, `CAMPANHA: ${campaign.name}`, SEPARATOR];
  if (campaign.description) lines.push(`Descrição: ${campaign.description}`);
  if (campaign.instructions) lines.push(`\nInstruções gerais:\n${campaign.instructions}`);
  const hasVariations = Boolean(
    campaign.elements.some(e => e.elementType === 'VARIATION_GALLERY'),
  );

  for (const element of campaign.elements) {
    lines.push('');
    if (element.elementType === 'POST_REFERENCE') {
      const galleryInstruction = hasVariations
        ? '5. Inferior direito com a galeria de outras cores (exclusivamente as variações adicionais fornecidas); '
        : '5. Inferior direito: produto de cor única/sem fotos de outras variações, portanto OMITA integralmente a galeria de cores (NÃO crie miniaturas nem o título "DISPONÍVEL NAS CORES"); ';

      lines.push('--- ELEMENTO: POST_REFERENCE (POST DE EXEMPLO / REFERÊNCIA VISUAL DE SUCESSO) ---');
      lines.push(
        'INSTRUÇÃO OBRIGATÓRIA DE COMPOSIÇÃO: O arquivo de referência anexado representa a estrutura e o padrão visual oficial aprovado da Móveis Morante. ' +
          'Siga estritamente as mesmas posições, proporções e formato dos containers da imagem de exemplo: ' +
          '1. Topo esquerdo com título e especificações; ' +
          '2. Topo direito com slogan caligráfico sublinhado em amarelo; ' +
          '3. Meio esquerdo com imagem secundária flutuante, limpa e sem borda; ' +
          '4. Inferior esquerdo com o container de preço em degradê azul marinho e borda dourada destacada; ' +
          galleryInstruction +
          '6. Quando a lista estruturada de benefícios não estiver vazia, use rodapé em faixa azul contínua na base, com o logo oficial à direita e EXCLUSIVAMENTE os benefícios literais daquela lista à esquerda/centro. ' +
          'A referência visual define somente composição; nunca copie dela textos, selos ou benefícios.',
      );
    } else if (element.elementType === 'INSTALLMENT') {
      lines.push('--- ELEMENTO: INSTALLMENT (PRECIFICAÇÃO E PARCELAMENTO) ---');
      lines.push(
        'DIRETRIZ VISUAL OBRIGATÓRIA DE PRECIFICAÇÃO E PARCELAMENTO:\n' +
          '- Layout: Siga como modelo visual o container de preço oficial da Móveis Morante (cartão em fundo azul marinho escuro #002B49 com cantos arredondados e borda amarela/dourada fina contínua #FFC107).\n' +
          '- Linha 1: "DE [PREÇO ANTERIOR]" em branco com traço riscado vermelho vivo atravessando o valor.\n' +
          '- Linha 2: "POR APENAS" em branco maiúsculo destacado.\n' +
          '- Linha 3 (Protagonista): "R$ [PREÇO ATUAL]" com algarismos grandes e grossos em amarelo solar/dourado vibrante (#FFC107).\n' +
          '- Linha divisória: Traço horizontal fino e discreto em branco/cinza separando o preço do parcelamento.\n' +
          '- Linha 4 (Condições): Ícone de cartão de crédito à esquerda em traço branco + texto "EM ATÉ 10X SEM JUROS" em amarelo/branco e abaixo "NAS BANDEIRAS VISA, MASTER, ELO E HIPER" em branco nítido.\n' +
          'IMPORTANTE: Os valores numéricos de preço e parcelamento devem ser extraídos fielmente da tabela oficial de DADOS DO PRODUTO (nunca inventados ou copiados da imagem de exemplo).',
      );
    } else {
      lines.push(`--- ELEMENTO: ${element.elementType} ---`);
    }
    if (element.prompt) lines.push(`Prompt:\n${element.prompt}`);
    if (element.instructions) lines.push(`Instruções adicionais:\n${element.instructions}`);
    const resources = renderResources(element.resources, options);
    if (resources) lines.push(`Recursos:\n${resources}`);
  }

  return lines.join('\n');
}

function appendSharedPromptSections(
  lines: string[],
  spec: PostCreationSpecification | PostShareSpecification,
  options: PromptRenderOptions = {},
): void {
  lines.push(renderProductFactsSection(spec), '');
  if (spec.productImages) {
    lines.push(renderProductImagesPromptSection(spec.productImages, options), '');
  }
  if (spec.officialAssets) {
    lines.push(renderOfficialAssetsPromptSection(spec.officialAssets, options), '');
  }
  lines.push(renderBenefitsPromptSection(spec.benefits ?? SYSTEM_OFFICIAL_BENEFITS, options), '');
  lines.push(GLOBAL_ART_DIRECTION_SECTION, '');
}

function appendFormatAndFinalRules(
  lines: string[],
  spec: PostCreationSpecification | PostShareSpecification,
  includeGalleryRules: boolean,
  options: PromptRenderOptions = {},
): void {
  const hasRealVariations = Boolean(spec.productImages?.variations && spec.productImages.variations.length > 0);

  lines.push(SEPARATOR, 'FORMATOS', SEPARATOR);
  lines.push(...spec.formats.map(format => `${format.name.toUpperCase()}\n${format.aspectRatio}\n${format.referenceSize}\n`));
  lines.push(DIRECT_WORKFLOW_FORMAT_INSTRUCTION, '', SEPARATOR, 'REGRAS FINAIS', SEPARATOR);
  lines.push('- Preserve fielmente o produto e sua variação;');
  lines.push('- As fotos oficiais fornecidas em IMAGENS OFICIAIS DO PRODUTO são a fonte visual de verdade;');
  lines.push(options.localFilesOnly
    ? '- Use somente os dados comerciais estruturados neste prompt e o conteúdo visual dos arquivos anexados;'
    : '- Use somente fatos verificáveis na página do produto;');
  lines.push('- Não invente preço, desconto, parcelamento, oportunidade ou características;');
  lines.push('- Referências visuais definem direção visual — não copie literalmente;');
  lines.push('- Assets oficiais (logo, selos) são arquivos gráficos prontos: NUNCA redesenhe, recrie ou estilize;');
  lines.push('- Se a IA não puder inserir o asset fielmente, deixe o espaço reservado em vez de inventar uma marca;');
  lines.push('- Direção de arte profissional ao redor do móvel: crie ambientação comercial elegante, iluminação publicitária com sombras reais e bloco de preço destacado;');
  lines.push('- Proibição de esfumaçado ou halo luminoso: É TERMINANTEMENTE PROIBIDO criar esfumaçado branco, névoa, glow ou halo ao redor ou atrás do produto. A integração com o cenário deve ser limpa e realista unicamente via sombras de contato no piso;');
  lines.push('- Separar conceitos: Fidelidade do Produto (estritamente fiel às fotos reais) vs. Direção de Arte (rica, sofisticada e profissional, sem aspecto de catálogo simplista ou fundo chapado);');
  if (includeGalleryRules && hasRealVariations) {
    lines.push('- Galeria secundária de cores: apresente EXCLUSIVAMENTE as DEMAIS variações/cores listadas, NUNCA duplicando a Variação 1 (a cor principal já é o móvel em destaque no post);');
    lines.push('- Borda branca: aplique SOMENTE nas imagens das variações adicionais; a imagem principal e a imagem secundária da Variação 1 ficam sem borda;');
  } else {
    lines.push('- PRODUTO DE COR ÚNICA (SEM OUTRAS CORES): O produto fornecido NÃO possui outras cores com fotos disponíveis. É TERMINANTEMENTE PROIBIDO criar galeria de cores, miniaturas extras, inventar Variação 2 ou 3 ou escrever "DISPONÍVEL NAS CORES". O post deve conter exclusivamente o produto principal (e a secundária, se enviada);');
  }
  lines.push('- Slogans e rótulos proibidos: NUNCA invente slogans da empresa/loja (a logo da Móveis Morante já carrega a identidade oficial) nem insira slogans no canto inferior direito. NUNCA insira rótulos ou tags na imagem secundária como "material de qualidade", "amplo espaço interno" ou "design moderno";');
  lines.push('- Slogans autorizados: permitidos apenas 2 destaques do produto (um abaixo do título do produto e outro ao lado do móvel em estilo caligráfico com traçado amarelo);');
  lines.push('- Proibição de elementos extras: NUNCA adicione caixas, selos, textos ou elementos gráficos adicionais que não tenham sido solicitados;');
  lines.push('- Respeite o formato solicitado (aspecto e dimensões);');
  lines.push('- Componha todos os elementos como uma única peça coerente;');
  lines.push('- Não trate cada elemento como arte independente.', '');
  lines.push(`Versão da configuração: ${spec.configurationVersion}`);
  lines.push(`Gerado em: ${spec.generatedAt}`);
}

/** Renderiza uma especificação de campanha única como texto para o Prompt Preview. */
export function renderSpecificationAsPrompt(
  spec: PostCreationSpecification,
  options: PromptRenderOptions = {},
): string {
  const lines: string[] = [
    SEPARATOR,
    'MÓVEIS MORANTE — INSTRUÇÕES DE CRIAÇÃO DE POST',
    SEPARATOR,
    '',
    VISUAL_GROUNDING_MANDATORY_RULE,
    '',
    ABSOLUTE_FIDELITY_RULE,
    '',
  ];
  appendSharedPromptSections(lines, spec, options);
  lines.push(renderCampaignSection(spec.campaign, options), '');
  appendFormatAndFinalRules(lines, spec, true, options);
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
  ];
  appendSharedPromptSections(lines, spec);
  lines.push(...spec.campaigns.map(campaign => renderCampaignSection(campaign)), '');
  appendFormatAndFinalRules(lines, spec, false);
  return lines.join('\n');
}
