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
 * Não cria pastas vazias: qualquer pasta só existe se contiver arquivos reais baixados.
 */
export async function generatePostContextZip(options: GenerateZipOptions): Promise<Blob> {
  const { specification, activeModels = [], onProgress } = options;
  const zip = new JSZip();

  // Clone estrutural para injetar os nomes de arquivos locais baixados
  const specClone: PostCreationSpecification = JSON.parse(JSON.stringify(specification));

  onProgress?.(5, 'Iniciando preparação do pacote...');

  // 1. Baixar imagem principal do produto
  if (specClone.productImages?.primary?.url) {
    onProgress?.(15, 'Baixando foto principal do produto...');
    const url = specClone.productImages.primary.url;
    const asset = await tryFetchValidatedImage(url);
    if (asset) {
      const filename = `primary.${asset.extension}`;
      const relativePath = `product/${filename}`;
      zip.file(relativePath, asset.buffer);
      specClone.productImages.primary.file = relativePath;
    }
  }

  // 2. Baixar imagem secundária do produto (Foto 2 da variação principal)
  if (specClone.productImages?.openView?.url) {
    onProgress?.(30, 'Baixando imagem secundária...');
    const url = specClone.productImages.openView.url;
    const asset = await tryFetchValidatedImage(url);
    if (asset) {
      const filename = `secondary.${asset.extension}`;
      const relativePath = `product/${filename}`;
      zip.file(relativePath, asset.buffer);
      specClone.productImages.openView.file = relativePath;
    }
  }

  // 3. Baixar imagens das variações
  if (specClone.productImages?.variations && specClone.productImages.variations.length > 0) {
    onProgress?.(45, 'Baixando fotos das variações...');
    for (let i = 0; i < specClone.productImages.variations.length; i++) {
      const v = specClone.productImages.variations[i];
      if (!v.url) continue;
      const asset = await tryFetchValidatedImage(v.url);
      if (asset) {
        const slug = sanitizeFilename(v.variationName || 'variacao') || 'variacao';
        const filename = `variation-${String(i + 1).padStart(2, '0')}-${slug}.${asset.extension}`;
        const relativePath = `product/variations/${filename}`;
        zip.file(relativePath, asset.buffer);
        v.file = relativePath;
      }
    }
  }

  // 4. Baixar assets oficiais (logo e badge)
  if (specClone.officialAssets?.logo?.url) {
    onProgress?.(60, 'Baixando logotipo oficial...');
    const url = specClone.officialAssets.logo.url;
    const asset = await tryFetchValidatedImage(url);
    if (asset) {
      const filename = `logo.${asset.extension}`;
      const relativePath = `official-assets/${filename}`;
      zip.file(relativePath, asset.buffer);
      specClone.officialAssets.logo.file = relativePath;
    }
  }

  if (specClone.officialAssets?.badge?.url) {
    onProgress?.(70, 'Baixando selo oficial...');
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
    } else {
      onProgress?.(75, 'Selo indisponível; continuando o pacote sem esse asset.');
      specClone.officialAssets.badge = null;
      specClone.campaign.elements = specClone.campaign.elements.filter(element => element.elementType !== 'BADGE');
    }
  }

  // 5. Baixar as referências estruturadas dos elementos da campanha.
  // O caminho inclui índices estáveis para impedir colisões entre nomes iguais.
  onProgress?.(80, 'Processando anexos de referência...');
  const centralizedAssetUrls = new Set(
    [specClone.officialAssets?.logo?.url, specClone.officialAssets?.badge?.url].filter(Boolean),
  );
  for (let elementIndex = 0; elementIndex < specClone.campaign.elements.length; elementIndex++) {
    const element = specClone.campaign.elements[elementIndex];
    const elementSlug = sanitizeFilename(element.elementType) || `element-${elementIndex + 1}`;
    for (let resourceIndex = 0; resourceIndex < element.resources.length; resourceIndex++) {
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
    }
  }

  // 6. Gerar prompt.md com o prompt completo e estruturado
  onProgress?.(85, 'Gerando prompt completo...');
  const promptBody = renderSpecificationAsPrompt(specClone, { localFilesOnly: true });
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

function validatePackageReferences(zip: JSZip, prompt: string): void {
  const urls = prompt.match(/https?:\/\/[^\s)]+/gi) ?? [];
  const allowedCatalogUrl = /^https:\/\/(?:www\.)?moveismorante\.com\.br\/produto\/[a-z0-9][a-z0-9-]*(?:\?var=[^\s)]+)?$/i;
  if (urls.some(url => !allowedCatalogUrl.test(url))) {
    throw new Error('O prompt do pacote contém URL externa não permitida; somente a página pública do produto pode permanecer.');
  }

  const fileNames = Object.values(zip.files)
    .filter(entry => !entry.dir && entry.name !== 'prompt.md')
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
