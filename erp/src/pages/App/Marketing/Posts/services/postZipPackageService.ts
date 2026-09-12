/**
 * postZipPackageService.ts — Gerador do pacote post-context.zip para IA.
 *
 * Estrutura gerada: CAMADA ÚNICA (FLAT, SEM SUBPASTAS)
 * post-context.zip
 * ├── prompt.md (Instruções completas consolidadas em arquivo único)
 * ├── foto-principal-var-01.<ext> (Foto principal da Variação 1)
 * ├── foto-secundaria-var-01.<ext> (Foto secundária da Variação 1 - se houver)
 * ├── variacao-02-<slug>.<ext> (Primeira variação adicional - se houver foto)
 * ├── variacao-03-<slug>.<ext> (Segunda variação adicional - se houver foto)
 * ├── logo-moveis-morante.<ext> (se houver)
 * ├── selo-oficial.<ext> (se houver)
 * └── referencia-01-<slug>.<ext> (se houver anexos de modelo)
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
 * Gera o arquivo ZIP contendo as fotos baixadas, assets e o prompt.md.
 * Organizado em camada única plana (flat, sem pastas nem subpastas) e no máximo 10 imagens.
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
      const filename = `logo-moveis-morante.${asset.extension}`;
      zip.file(filename, asset.buffer);
      specClone.officialAssets.logo.file = filename;
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
      const filename = `selo-oficial.${resolvedBadge.asset.extension}`;
      zip.file(filename, resolvedBadge.asset.buffer);
      badge.url = resolvedBadge.source;
      badge.file = filename;
      totalImageCount++;
    } else {
      onProgress?.(30, 'Selo indisponível; continuando o pacote sem esse asset.');
      specClone.officialAssets.badge = null;
      specClone.campaign.elements = specClone.campaign.elements.filter(element => element.elementType !== 'BADGE');
    }
  }

  // 3. Baixar imagem principal do produto (Variação 1) (Prioridade 3)
  if (specClone.productImages?.primary?.url && totalImageCount < MAX_IMAGES) {
    onProgress?.(40, 'Baixando foto principal do produto...');
    const url = specClone.productImages.primary.url;
    const asset = await tryFetchValidatedImage(url);
    if (asset) {
      const filename = `foto-principal-var-01.${asset.extension}`;
      zip.file(filename, asset.buffer);
      specClone.productImages.primary.file = filename;
      totalImageCount++;
    }
  }

  // 4. Baixar imagem secundária do produto (Foto 2 da Variação 1) (Prioridade 4)
  if (specClone.productImages?.openView?.url && totalImageCount < MAX_IMAGES) {
    onProgress?.(50, 'Baixando imagem secundária...');
    const url = specClone.productImages.openView.url;
    const asset = await tryFetchValidatedImage(url);
    if (asset) {
      const filename = `foto-secundaria-var-01.${asset.extension}`;
      zip.file(filename, asset.buffer);
      specClone.productImages.openView.file = filename;
      totalImageCount++;
    }
  }

  // 5. Baixar imagens das variações adicionais (Prioridade 5, numerando Variação 02 em diante)
  if (specClone.productImages?.variations && specClone.productImages.variations.length > 0) {
    onProgress?.(65, 'Baixando fotos das variações...');
    for (let i = 0; i < specClone.productImages.variations.length; i++) {
      if (totalImageCount >= MAX_IMAGES) break;
      const v = specClone.productImages.variations[i];
      if (!v.url) continue;
      const asset = await tryFetchValidatedImage(v.url);
      if (asset) {
        const slug = sanitizeFilename(v.variationName || 'variacao') || 'variacao';
        const varNumber = String(i + 2).padStart(2, '0');
        const filename = `variacao-${varNumber}-${slug}.${asset.extension}`;
        zip.file(filename, asset.buffer);
        v.file = filename;
        totalImageCount++;
      }
    }
  }

  // 6. Baixar anexos de referência se restarem vagas até o teto de 10 imagens
  onProgress?.(75, 'Processando anexos de referência...');
  const centralizedAssetUrls = new Set(
    [specClone.officialAssets?.logo?.url, specClone.officialAssets?.badge?.url].filter(Boolean),
  );
  let refCount = 0;
  for (let elementIndex = 0; elementIndex < specClone.campaign.elements.length; elementIndex++) {
    if (totalImageCount >= MAX_IMAGES) break;
    const element = specClone.campaign.elements[elementIndex];
    for (let resourceIndex = 0; resourceIndex < element.resources.length; resourceIndex++) {
      if (totalImageCount >= MAX_IMAGES) break;
      const resource = element.resources[resourceIndex];
      if (!resource.url) continue;
      if (element.elementType === 'BADGE' && resource.role === 'OFFICIAL_ASSET') continue;
      if (centralizedAssetUrls.has(resource.url)) continue;
      const asset = await tryFetchValidatedImage(resource.url);
      if (!asset) continue;

      refCount++;
      const resourceSlug = sanitizeFilename(resource.name) || 'anexo';
      const filename = `referencia-${String(refCount).padStart(2, '0')}-${resourceSlug}.${asset.extension}`;
      zip.file(filename, asset.buffer);
      resource.file = filename;
      totalImageCount++;
    }
  }

  // 7. Gerar prompt consolidado em arquivo único prompt.md
  onProgress?.(85, 'Gerando arquivo prompt.md de instruções...');
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

  // Validação estrita: subpastas e diretórios são terminantemente proibidos no pacote ZIP (camada única flat)
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || entry.name.includes('/')) {
      throw new Error(`Subpastas são proibidas no pacote ZIP: ${entry.name}`);
    }
  }

  const fileNames = Object.values(zip.files)
    .filter(entry => !entry.dir && !entry.name.endsWith('.md'))
    .map(entry => entry.name);

  const referencedFiles = new Set(
    Array.from(
      prompt.matchAll(/`([a-z0-9_-]+\.(?:png|jpg|jpeg|webp|svg|gif))`|`((?:foto-|variacao-|logo-|selo-|referencia-)[^`]+)`/gi),
      match => match[1] || match[2],
    ),
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
