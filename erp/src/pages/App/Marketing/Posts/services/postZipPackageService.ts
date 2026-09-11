/**
 * postZipPackageService.ts — Gerador do pacote post-context.zip para IA.
 *
 * Estrutura gerada:
 * post-context.zip
 * ├── prompt.md
 * ├── product/
 * │   ├── primary.<formato-real>
 * │   ├── secondary.<formato-real>
 * │   └── variations/
 * │       ├── variacao-01-branco.png
 * │       └── variacao-02-freijo.png
 * ├── official-assets/
 * │   ├── logo.<formato-real>
 * │   └── badge.<formato-real>
 * └── references/
 *     ├── title/
 *     ├── price/
 *     ├── background/
 *     └── ...
 */

import JSZip from 'jszip';
import { toast } from 'react-toastify';
import { buildImageFetchCandidates } from '@/pages/utils/imageFetchCandidates';
import { PostCreationSpecification } from '../types/postSpecification';
import { ElementModel } from '../types/postCreator';
import { renderSpecificationAsPrompt } from './postSpecificationBuilder';
import {
  decodeInlineImageSource,
  ValidatedImageAsset,
  validateImageBytes,
} from './postImageAssetCodec';

function sanitizeFilename(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function sourceLabel(source: string): string {
  if (source.startsWith('data:')) return 'data URL';
  if (source.startsWith('blob:')) return 'blob URL';
  if (!source.includes(':')) return 'base64';
  return source;
}

async function fetchValidatedImage(rawSource: string): Promise<ValidatedImageAsset> {
  if (!rawSource || typeof rawSource !== 'string') throw new Error('Fonte da imagem ausente.');

  const inline = decodeInlineImageSource(rawSource);
  if (inline) {
    const validated = validateImageBytes(inline.buffer, inline.contentType);
    if (validated) return validated;
    throw new Error(`O conteúdo de ${sourceLabel(rawSource)} não é uma imagem válida ou está incompleto.`);
  }
  if (rawSource.startsWith('data:')) {
    throw new Error('A data URL do asset está malformada ou não pôde ser decodificada.');
  }

  const candidates = rawSource.startsWith('blob:') ? [rawSource] : buildImageFetchCandidates(rawSource);
  const failures: string[] = [];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { mode: 'cors' });
      if (!response.ok) {
        failures.push(`HTTP ${response.status || 'inválido'}`);
        continue;
      }
      const buffer = await response.arrayBuffer();
      const contentType = response.headers?.get?.('content-type') || '';
      const validated = validateImageBytes(buffer, contentType);
      if (validated) return validated;
      failures.push(`conteúdo inválido (${contentType || 'Content-Type ausente'})`);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : 'falha de rede');
    }
  }

  const details = Array.from(new Set(failures)).slice(0, 3).join('; ');
  throw new Error(`Não foi possível obter uma imagem válida de ${sourceLabel(rawSource)}${details ? `: ${details}` : ''}.`);
}

async function tryFetchValidatedImage(rawSource: string): Promise<ValidatedImageAsset | null> {
  try {
    return await fetchValidatedImage(rawSource);
  } catch (error) {
    console.warn('[postZipPackageService] Imagem ignorada:', error);
    return null;
  }
}

export interface GenerateZipOptions {
  specification: PostCreationSpecification;
  activeModels?: ElementModel[];
  onProgress?: (percent: number, status: string) => void;
}

/**
 * Gera o arquivo ZIP contendo as fotos baixadas, assets, prompt.txt e instruções.
 * Organizado em exatamente 10 arquivos MD de texto e no máximo 10 imagens (respeitando o limite de 20 arquivos do ChatGPT).
 */
export async function generatePostContextZip(options: GenerateZipOptions): Promise<Blob> {
  const { specification, activeModels = [], onProgress } = options;
  const zip = new JSZip();

  // Clone estrutural para injetar os nomes de arquivos locais baixados
  const specClone: PostCreationSpecification = JSON.parse(JSON.stringify(specification));

  onProgress?.(5, 'Iniciando preparação do pacote...');

  let totalImageCount = 0;
  const MAX_IMAGES = 10;

  // 1. Baixar logo oficial (Prioridade 1)
  if (specClone.officialAssets?.logo?.url && totalImageCount < MAX_IMAGES) {
    onProgress?.(15, 'Baixando logotipo oficial...');
    const url = specClone.officialAssets.logo.url;
    const asset = await tryFetchValidatedImage(url);
    if (asset) {
      const filename = `logo.${asset.extension}`;
      const relativePath = `official-assets/${filename}`;
      zip.file(relativePath, asset.buffer);
      specClone.officialAssets.logo.file = relativePath;
      totalImageCount++;
    }
  }

  // 2. Baixar selo oficial (Prioridade 2)
  if (specClone.officialAssets?.badge?.url && totalImageCount < MAX_IMAGES) {
    onProgress?.(25, 'Baixando selo oficial...');
    const badge = specClone.officialAssets.badge;
    const matchingModel = activeModels.find(model =>
      model.elementType === 'BADGE' && model.opportunityId === badge.opportunityId,
    );
    const references = matchingModel?.referenceFiles.map(reference => reference.fileUrl).filter(Boolean) || [];
    const locallyPackableReferences = references.filter(source =>
      source.startsWith('data:') || source.startsWith('blob:') || !source.includes(':'),
    );
    const remoteReferences = references.filter(source => !locallyPackableReferences.includes(source));
    const badgeSources = Array.from(new Set([
      ...locallyPackableReferences,
      badge.url,
      matchingModel?.generatedAssetUrl || '',
      ...remoteReferences,
    ].filter(Boolean)));

    let resolvedBadge: { asset: ValidatedImageAsset; source: string } | null = null;
    for (const source of badgeSources) {
      try {
        resolvedBadge = { asset: await fetchValidatedImage(source), source };
        break;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'falha desconhecida';
        console.warn(`[postZipPackageService] Fonte do selo indisponível: ${reason}`);
      }
    }

    if (resolvedBadge) {
      const filename = `badge.${resolvedBadge.asset.extension}`;
      const relativePath = `official-assets/${filename}`;
      zip.file(relativePath, resolvedBadge.asset.buffer);
      badge.url = resolvedBadge.source;
      badge.file = relativePath;
      totalImageCount++;
    } else {
      onProgress?.(30, 'Selo indisponível; continuando o pacote sem esse asset.');
      specClone.officialAssets.badge = null;
      specClone.campaign.elements = specClone.campaign.elements.filter(element => element.elementType !== 'BADGE');
    }
  }

  // 3. Baixar imagem principal do produto (Prioridade 3)
  if (specClone.productImages?.primary?.url && totalImageCount < MAX_IMAGES) {
    onProgress?.(40, 'Baixando foto principal do produto...');
    const url = specClone.productImages.primary.url;
    const asset = await tryFetchValidatedImage(url);
    if (asset) {
      const filename = `primary.${asset.extension}`;
      const relativePath = `product/${filename}`;
      zip.file(relativePath, asset.buffer);
      specClone.productImages.primary.file = relativePath;
      totalImageCount++;
    }
  }

  // 4. Baixar imagem secundária do produto (Foto 2 da variação principal) (Prioridade 4)
  if (specClone.productImages?.openView?.url && totalImageCount < MAX_IMAGES) {
    onProgress?.(50, 'Baixando imagem secundária...');
    const url = specClone.productImages.openView.url;
    const asset = await tryFetchValidatedImage(url);
    if (asset) {
      const filename = `secondary.${asset.extension}`;
      const relativePath = `product/${filename}`;
      zip.file(relativePath, asset.buffer);
      specClone.productImages.openView.file = relativePath;
      totalImageCount++;
    }
  }

  // 5. Baixar imagens das variações (Prioridade 5, respeitando teto de 10 imagens)
  if (specClone.productImages?.variations && specClone.productImages.variations.length > 0) {
    onProgress?.(65, 'Baixando fotos das variações...');
    for (let i = 0; i < specClone.productImages.variations.length; i++) {
      if (totalImageCount >= MAX_IMAGES) break;
      const v = specClone.productImages.variations[i];
      if (!v.url) continue;
      const asset = await tryFetchValidatedImage(v.url);
      if (asset) {
        const slug = sanitizeFilename(v.variationName || 'variacao') || 'variacao';
        const filename = `variation-${String(i + 1).padStart(2, '0')}-${slug}.${asset.extension}`;
        const relativePath = `product/variations/${filename}`;
        zip.file(relativePath, asset.buffer);
        v.file = relativePath;
        totalImageCount++;
      }
    }
  }

  // 6. Baixar anexos de referência se restarem vagas até o teto de 10 imagens
  onProgress?.(75, 'Processando anexos de referência...');
  const centralizedAssetUrls = new Set(
    [specClone.officialAssets?.logo?.url, specClone.officialAssets?.badge?.url].filter(Boolean),
  );
  for (let elementIndex = 0; elementIndex < specClone.campaign.elements.length; elementIndex++) {
    if (totalImageCount >= MAX_IMAGES) break;
    const element = specClone.campaign.elements[elementIndex];
    const elementSlug = sanitizeFilename(element.elementType) || `element-${elementIndex + 1}`;
    for (let resourceIndex = 0; resourceIndex < element.resources.length; resourceIndex++) {
      if (totalImageCount >= MAX_IMAGES) break;
      const resource = element.resources[resourceIndex];
      if (!resource.url) continue;
      if (element.elementType === 'BADGE' && resource.role === 'OFFICIAL_ASSET') continue;
      if (centralizedAssetUrls.has(resource.url)) continue;
      const asset = await tryFetchValidatedImage(resource.url);
      if (!asset) continue;

      const resourceSlug = sanitizeFilename(resource.name) || 'anexo';
      const filename = `${String(resourceIndex + 1).padStart(2, '0')}-${resourceSlug}.${asset.extension}`;
      const relativePath = `references/${String(elementIndex + 1).padStart(2, '0')}-${elementSlug}/${filename}`;
      zip.file(relativePath, asset.buffer);
      resource.file = relativePath;
      totalImageCount++;
    }
  }

  // 7. Gerar prompt consolidado e os 10 arquivos .md organizados de instrução
  onProgress?.(85, 'Gerando 10 arquivos MD organizados de instrução...');
  const promptBody = renderSpecificationAsPrompt(specClone, { localFilesOnly: true });

  const mdFiles = generate10StructuredMdFiles(specClone, promptBody);
  for (const [filename, content] of Object.entries(mdFiles)) {
    zip.file(filename, content);
  }
  // Alias prompt.md para suporte e retrocompatibilidade
  zip.file('prompt.md', promptBody);

  validatePackageReferences(zip, promptBody);

  onProgress?.(95, 'Gerando arquivo ZIP compactado...');

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  onProgress?.(100, 'Pacote ZIP pronto!');
  return content;
}

function generate10StructuredMdFiles(
  spec: PostCreationSpecification,
  fullPromptText: string,
): Record<string, string> {
  const brandName = spec.brand?.name || 'Móveis Morante';
  const productName = spec.product?.name || 'Produto';
  const campaignName = spec.campaign?.name || 'Campanha Padrão';
  const sep = '='.repeat(50);

  const md01 = `# 01 — ÍNDICE E INSTRUÇÕES GERAIS DE EXECUÇÃO

${sep}
${brandName.toUpperCase()} — INSTRUÇÕES DE CRIAÇÃO DE POST
${sep}

Este pacote contém os arquivos oficiais de instrução e assets visuais para a criação da arte publicitária do produto: **${productName}**.

## REGRAS DE EXECUÇÃO EM UMA ETAPA:
1. **Formato Padrão**: FEED (Aspect Ratio 4:5 — 1080 × 1350).
2. **Execução Contínua**: NÃO interrompa o fluxo para perguntar qual formato ou layout usar. Execute diretamente.
3. **Leitura dos Arquivos**: Leia todos os 10 arquivos Markdown deste pacote e utilize as fotos em \`product/\` e \`official-assets/\`.
4. **Fidelidade Total ao Produto**: Preserve rigorosamente o design, a cor e os detalhes da fotografia real do produto. Zero alucinação.

## ESTRUTURA DESTE PACOTE (10 ARQUIVOS MD):
- \`01_INDEX_INSTRUCOES_GERAIS.md\` — Guia principal e regras de execução.
- \`02_IDENTIDADE_E_REGRAS_MARCA.md\` — Diretrizes de marca e paleta de cores.
- \`03_PRODUTO_E_PRECO_ERP.md\` — Dados comerciais e informações do produto.
- \`04_FOTOS_PRODUTO_E_VARIACOES.md\` — Especificações de fotos do produto e variações.
- \`05_ASSETS_OFICIAIS_LOGO_E_SELO.md\` — Diretrizes de uso do Logo e Selo Oficial.
- \`06_ELEMENTOS_CONTEUDO_E_TITULO.md\` — Regras para Título e Slogans.
- \`07_ELEMENTOS_COMERCIAIS_E_PRECO.md\` — Regras para Preço, Parcelamento e Selo Comercial.
- \`08_ELEMENTOS_VISUAIS_E_BACKGROUND.md\` — Diretrizes de Fundo e Referências Visuais.
- \`09_ELEMENTOS_IMAGENS_E_ACAO.md\` — Regras para Foto Secundária, Galeria de Cores e CTA.
- \`10_PROMPT_CONSOLIDADO.md\` — Prompt completo unificado em texto único.
`;

  const md02 = `# 02 — IDENTIDADE E REGRAS DA MARCA

${sep}
IDENTIDADE VISUAL DA MÓVEIS MORANTE
${sep}

- **Nome da Marca**: Móveis Morante
- **Cores Principais**:
  - Azul Marinho (#002B49) — Utilizado em faixas de destaque, blocos de preço e rodapé.
  - Amarelo Ouro (#F7B731 / #FFC107) — Utilizado em bordas, destaques caligráficos e ícones.
  - Branco (#FFFFFF) — Utilizado em textos primários sobre fundo escuro.
- **Estilo de Composição**: Direção de arte publicitária premium para varejo de móveis.
- **Proibição de Simplicidade**: NUNCA crie composições chapadas do tipo "produto cortado + fundo branco liso + texto em caixa branca".
- **Ambientação Comercial**: Crie iluminação publicitária com sombras reais no móvel e profundidade de cena.
`;

  const md03 = `# 03 — DADOS COMERCIAIS DO PRODUTO (ERP)

${sep}
FONTE DE VERDADE DOS DADOS
${sep}
Link do Catálogo Digital: ${spec.product?.catalogUrl || 'https://www.moveismorante.com.br'}
Nome do Produto: ${spec.product?.name || 'Produto'}
Preço ERP: R$ ${spec.product?.price ?? 'N/A'}

## REGRAS LITERAIS DOS DADOS:
- Copie valores exatamente como informados pelo ERP.
- Diferencie sem ambiguidade o PREÇO ANTERIOR (riscado) do PREÇO PROMOCIONAL (em destaque).
- Não invente descontos ou características não verificadas.
`;

  const md04 = `# 04 — FOTOS DO PRODUTO E VARIAÇÕES

${sep}
ESTRUTURA DE IMAGENS DO PRODUTO
${sep}

1. **Foto Principal (PRIMARY)**: \`${spec.productImages?.primary?.file || 'product/primary.png'}\`
   - Opcional: móvel fechado em destaque protagonizando o post.
   - SEM borda branca.

2. **Imagem Secundária (OPEN_VIEW)**: \`${spec.productImages?.openView?.file || 'product/secondary.png'}\`
   - Foto secundária da Variação 1 (ex: móvel aberto, outro ângulo ou detalhe interno).
   - Exibida de forma flutuante, sem borda e sem textos/rótulos sobrepostos.

3. **Demais Variações (VARIATION_GALLERY)**:
   - Exiba apenas as DEMAIS variações/cores em miniatura.
   - Apenas estas miniaturas de cores adicionais recebem borda branca.
`;

  const md05 = `# 05 — ASSETS OFICIAIS (LOGO E SELO)

${sep}
DIRETRIZES DE ASSETS GRÁFICOS OFICIAIS
${sep}

- **Logo Oficial**: \`${spec.officialAssets?.logo?.file || 'official-assets/logo.png'}\`
  - Arquivo gráfico pronto. NUNCA redesenhe, recrie ou altere as cores da marca.
- **Selo Oficial**: \`${spec.officialAssets?.badge?.file || 'official-assets/badge.png'}\`
  - Selo oficial da campanha (ex: Queima dos Salvados, Oportunidade). NUNCA invente selos parecidos.
`;

  const titleElements = spec.campaign?.elements?.filter(e =>
    ['TITLE', 'PRODUCT_NAME', 'PRODUCT_SLOGAN_TITLE', 'PRODUCT_SLOGAN_SIDE', 'PRODUCT_SLOGAN'].includes(e.elementType),
  ) || [];
  const md06 = `# 06 — ELEMENTOS DE CONTEÚDO E TÍTULO

Campanha: ${campaignName}

${titleElements.map(e => `### Elemento: ${e.elementType}\n${e.prompt || ''}\n${e.instructions || ''}`).join('\n\n') || 'Siga o título e slogans cadastrados na campanha.'}
`;

  const commercialElements = spec.campaign?.elements?.filter(e =>
    ['PRICE', 'OLD_PRICE', 'INSTALLMENT', 'BADGE'].includes(e.elementType),
  ) || [];
  const md07 = `# 07 — ELEMENTOS COMERCIAIS E PREÇO

Campanha: ${campaignName}

${commercialElements.map(e => `### Elemento: ${e.elementType}\n${e.prompt || ''}\n${e.instructions || ''}`).join('\n\n') || 'Posicione o bloco de preço em destaque no container azul marinho com borda amarela.'}
`;

  const visualElements = spec.campaign?.elements?.filter(e =>
    ['POST_REFERENCE', 'COLOR_THEME', 'BACKGROUND', 'LOGO'].includes(e.elementType),
  ) || [];
  const md08 = `# 08 — ELEMENTOS VISUAIS E BACKGROUND

Campanha: ${campaignName}

${visualElements.map(e => `### Elemento: ${e.elementType}\n${e.prompt || ''}\n${e.instructions || ''}`).join('\n\n') || 'Siga a referência visual de layout e iluminação da Móveis Morante.'}
`;

  const actionElements = spec.campaign?.elements?.filter(e =>
    ['OPEN_VIEW', 'VARIATION_GALLERY', 'CTA'].includes(e.elementType),
  ) || [];
  const md09 = `# 09 — ELEMENTOS DE IMAGENS E AÇÃO

Campanha: ${campaignName}

${actionElements.map(e => `### Elemento: ${e.elementType}\n${e.prompt || ''}\n${e.instructions || ''}`).join('\n\n') || 'Posicione a imagem secundária flutuante e a galeria de variações no canto inferior.'}
`;

  const md10 = `# 10 — PROMPT COMPLETO UNIFICADO

${fullPromptText}
`;

  return {
    '01_INDEX_INSTRUCOES_GERAIS.md': md01,
    '02_IDENTIDADE_E_REGRAS_MARCA.md': md02,
    '03_PRODUTO_E_PRECO_ERP.md': md03,
    '04_FOTOS_PRODUTO_E_VARIACOES.md': md04,
    '05_ASSETS_OFICIAIS_LOGO_E_SELO.md': md05,
    '06_ELEMENTOS_CONTEUDO_E_TITULO.md': md06,
    '07_ELEMENTOS_COMERCIAIS_E_PRECO.md': md07,
    '08_ELEMENTOS_VISUAIS_E_BACKGROUND.md': md08,
    '09_ELEMENTOS_IMAGENS_E_ACAO.md': md09,
    '10_PROMPT_CONSOLIDADO.md': md10,
  };
}

function validatePackageReferences(zip: JSZip, prompt: string): void {
  const urls = prompt.match(/https?:\/\/[^\s)]+/gi) ?? [];
  const allowedCatalogUrl = /^https:\/\/(?:www\.)?moveismorante\.com\.br\/produto\/[a-z0-9][a-z0-9-]*(?:\?var=[^\s)]+)?$/i;
  if (urls.some(url => !allowedCatalogUrl.test(url))) {
    throw new Error('O prompt do pacote contém URL externa não permitida; somente a página pública do produto pode permanecer.');
  }

  const fileNames = Object.values(zip.files)
    .filter(entry => !entry.dir && !entry.name.endsWith('.md'))
    .map(entry => entry.name);
  const referencedFiles = new Set(
    Array.from(prompt.matchAll(/`((?:product|official-assets|references)\/[^`]+)`/g), match => match[1]),
  );

  for (const fileName of fileNames) {
    if (!referencedFiles.has(fileName)) {
      throw new Error(`Arquivo sem referência no prompt: ${fileName}`);
    }
  }
  for (const fileName of referencedFiles) {
    if (!zip.file(fileName)) {
      throw new Error(`Referência do prompt sem arquivo no pacote: ${fileName}`);
    }
  }
}

/**
 * Dispara o download do arquivo post-context.zip no navegador.
 */
export async function downloadPostContextZip(options: GenerateZipOptions): Promise<void> {
  const productName = options.specification.product?.name || 'post';
  const slug = sanitizeFilename(productName);
  const filename = `${slug}-post-context.zip`;

  try {
    toast.info('📦 Montando pacote ZIP com fotos, assets e instruções...');
    const zipBlob = await generatePostContextZip(options);

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    toast.success(`✓ Pacote "${filename}" baixado! Anexe o ZIP no ChatGPT.`);
  } catch (err: unknown) {
    console.error('Erro ao gerar post-context.zip:', err);
    throw err instanceof Error ? err : new Error('Falha desconhecida ao gerar o pacote ZIP.');
  }
}
