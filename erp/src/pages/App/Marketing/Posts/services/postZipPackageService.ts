/**
 * postZipPackageService.ts — Gerador do pacote post-context.zip para IA.
 *
 * Estrutura gerada:
 * post-context.zip
 * ├── INSTRUCOES.md
 * ├── specification.json
 * ├── product/
 * │   ├── primary.png
 * │   ├── open-view.png
 * │   └── variations/
 * │       ├── variacao-01-branco.png
 * │       └── variacao-02-freijo.png
 * ├── official-assets/
 * │   ├── logo.png
 * │   └── badge.png
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

function sanitizeFilename(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function getFileExtension(url: string, defaultExt = 'png'): string {
  try {
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\.(png|jpg|jpeg|webp|svg)$/i);
    if (match) {
      const ext = match[1].toLowerCase();
      return ext === 'jpeg' ? 'jpg' : ext;
    }
  } catch {}
  return defaultExt;
}

async function fetchFileArrayBuffer(rawUrl: string): Promise<ArrayBuffer | null> {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const urlsToTry = buildImageFetchCandidates(rawUrl);

  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (buffer && buffer.byteLength > 0) {
          return buffer;
        }
      }
    } catch {
      // continua tentando o próximo fallback
    }
  }

  // Fallback no browser: carregar via elemento Image e converter em canvas
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const candidatesForCanvas = [
      `https://images.weserv.nl/?url=${encodeURIComponent(rawUrl)}`,
      rawUrl,
    ];
    for (const cUrl of candidatesForCanvas) {
      try {
        const buffer = await new Promise<ArrayBuffer | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return resolve(null);
              ctx.drawImage(img, 0, 0);
              canvas.toBlob(blob => {
                if (!blob) return resolve(null);
                blob.arrayBuffer().then(buf => {
                  if (buf && buf.byteLength > 0) resolve(buf);
                  else resolve(null);
                }).catch(() => resolve(null));
              }, 'image/jpeg', 0.95);
            } catch {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = cUrl;
        });
        if (buffer) return buffer;
      } catch {}
    }
  }

  console.warn(`[postZipPackageService] Falha ao baixar arquivo para ZIP: ${rawUrl}`);
  return null;
}

function buildInstrucoesMd(spec: PostCreationSpecification): string {
  const productName = spec.product?.name || 'Produto';
  const price = spec.product?.price ? `R$ ${spec.product.price.toFixed(2).replace('.', ',')}` : 'Não informado';
  const catalogUrl = spec.product?.catalogUrl || '';

  return `# INSTRUÇÕES DO PACOTE DE CRIAÇÃO — MÓVEIS MORANTE

Este pacote ZIP contém todos os materiais e diretrizes para a geração dos criativos publicitários da **Móveis Morante**.

## 📄 ARQUIVOS PRINCIPAIS

1. **\`prompt.txt\`**:
   - Contém o **PROMPT COMPLETO E DETALHADO** pronto para uso da IA.
   - Todo o direcionamento criativo, copy, regras de composição, precificação e formatos estão centralizados exclusivamente neste arquivo.

2. **\`specification.json\`**:
   - Especificação técnica estruturada (JSON) com metadados canônicos, URLs públicas e o mapeamento dos arquivos locais.

## 📁 PASTAS DE RECURSOS VISUAIS (Incluídas apenas quando houver arquivos reais)

- **\`product/\`**:
  - Fotos oficiais em alta definição do móvel (**${productName}**), como \`product/primary\` e variações.
  - **REGRA CRÍTICA**: O móvel é real e comercializado pela Móveis Morante. Utilize as imagens reais e preserve rigorosamente o design, puxadores, proporções, textura e cor exata. **NÃO REDESENHE O PRODUTO**.

- **\`official-assets/\`**:
  - Logotipos e selos institucionais oficiais da Móveis Morante (ex: \`official-assets/logo\`).
  - São arquivos gráficos oficiais prontos para aplicação direta. Não redesenhe nem recrie por aproximação.

- **\`references/\`**:
  - Imagens de referência estética e direção de arte selecionadas.
  - Servem como inspiração para iluminação, tipografia e diagramação.

---

## ℹ️ RESUMO DO PRODUTO
- **Produto**: ${productName}
- **Preço**: ${price}
${catalogUrl ? `- **Catálogo Digital**: ${catalogUrl}\n` : ''}
Consulte o arquivo **\`prompt.txt\`** para o prompt completo a ser enviado para a IA!
`;
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
    const ext = getFileExtension(url, 'jpg');
    const buffer = await fetchFileArrayBuffer(url);
    if (buffer) {
      const filename = `primary.${ext}`;
      const relativePath = `product/${filename}`;
      zip.file(relativePath, buffer);
      specClone.productImages.primary.file = relativePath;
    }
  }

  // 2. Baixar imagem de visão aberta/interna
  if (specClone.productImages?.openView?.url) {
    onProgress?.(30, 'Baixando foto de visão aberta...');
    const url = specClone.productImages.openView.url;
    const ext = getFileExtension(url, 'jpg');
    const buffer = await fetchFileArrayBuffer(url);
    if (buffer) {
      const filename = `open-view.${ext}`;
      const relativePath = `product/${filename}`;
      zip.file(relativePath, buffer);
      specClone.productImages.openView.file = relativePath;
    }
  }

  // 3. Baixar imagens das variações
  if (specClone.productImages?.variations && specClone.productImages.variations.length > 0) {
    onProgress?.(45, 'Baixando fotos das variações...');
    for (let i = 0; i < specClone.productImages.variations.length; i++) {
      const v = specClone.productImages.variations[i];
      if (!v.url) continue;
      const ext = getFileExtension(v.url, 'jpg');
      const buffer = await fetchFileArrayBuffer(v.url);
      if (buffer) {
        const slug = sanitizeFilename(v.variationName || `variacao-${i + 1}`);
        const filename = `${slug}.${ext}`;
        const relativePath = `product/variations/${filename}`;
        zip.file(relativePath, buffer);
        v.file = relativePath;
      }
    }
  }

  // 4. Baixar assets oficiais (logo e badge)
  if (specClone.officialAssets?.logo?.url) {
    onProgress?.(60, 'Baixando logotipo oficial...');
    const url = specClone.officialAssets.logo.url;
    const ext = getFileExtension(url, 'png');
    const buffer = await fetchFileArrayBuffer(url);
    if (buffer) {
      const filename = `logo.${ext}`;
      const relativePath = `official-assets/${filename}`;
      zip.file(relativePath, buffer);
      specClone.officialAssets.logo.file = relativePath;
    }
  }

  if (specClone.officialAssets?.badge?.url) {
    onProgress?.(70, 'Baixando selo oficial...');
    const url = specClone.officialAssets.badge.url;
    const ext = getFileExtension(url, 'png');
    const buffer = await fetchFileArrayBuffer(url);
    if (buffer) {
      const filename = `badge.${ext}`;
      const relativePath = `official-assets/${filename}`;
      zip.file(relativePath, buffer);
      specClone.officialAssets.badge.file = relativePath;
    }
  }

  // 5. Baixar referências visuais de modelos ativos (APENAS se houver arquivo com buffer válido)
  if (activeModels.length > 0) {
    onProgress?.(80, 'Processando referências visuais...');
    for (const model of activeModels) {
      if (!model.imageUrl) continue;
      const buffer = await fetchFileArrayBuffer(model.imageUrl);
      if (buffer) {
        const catSlug = sanitizeFilename(model.category || 'geral');
        const modelSlug = sanitizeFilename(model.name || 'modelo');
        const ext = getFileExtension(model.imageUrl, 'jpg');
        const relativePath = `references/${catSlug}/${modelSlug}.${ext}`;
        zip.file(relativePath, buffer);
      }
    }
  }

  // 6. Gerar prompt.txt com o prompt completo e estruturado
  onProgress?.(85, 'Gerando prompt completo...');
  const promptBody = renderSpecificationAsPrompt(specClone);
  zip.file('prompt.txt', promptBody);

  // 7. Gerar INSTRUCOES.md orientativo
  onProgress?.(90, 'Gerando arquivo de instruções...');
  const instrucoesContent = buildInstrucoesMd(specClone);
  zip.file('INSTRUCOES.md', instrucoesContent);

  // 8. Gerar specification.json canônico com os caminhos dos arquivos
  zip.file('specification.json', JSON.stringify(specClone, null, 2));

  onProgress?.(95, 'Gerando arquivo ZIP compactado...');

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  onProgress?.(100, 'Pacote ZIP pronto!');
  return content;
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
  } catch (err: any) {
    console.error('Erro ao gerar post-context.zip:', err);
    toast.error('Erro ao gerar pacote ZIP: ' + (err.message || 'Falha desconhecida.'));
  }
}
