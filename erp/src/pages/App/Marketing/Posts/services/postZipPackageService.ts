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

  const urlsToTry: string[] = [];

  // 1. Se for URL do Cloudflare R2 (.r2.dev), tenta via proxy Vite local (/r2-proxy) se disponível
  if (rawUrl.includes('.r2.dev')) {
    try {
      const pathname = new URL(rawUrl).pathname;
      urlsToTry.push(`/r2-proxy${pathname}`);
    } catch {
      const idx = rawUrl.indexOf('.r2.dev');
      if (idx !== -1) {
        urlsToTry.push(`/r2-proxy${rawUrl.substring(idx + 7)}`);
      }
    }
  }

  // 2. Tenta fetch direto
  urlsToTry.push(rawUrl);

  // 3. Fallbacks de proxies públicos universais com CORS liberado (weserv e allorigins)
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    urlsToTry.push(`https://images.weserv.nl/?url=${encodeURIComponent(rawUrl)}`);
    urlsToTry.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`);
  }

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

  // 4. Fallback no browser: carregar via elemento Image e converter em canvas
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

export interface GenerateZipOptions {
  specification: PostCreationSpecification;
  activeModels?: ElementModel[];
  onProgress?: (percent: number, message: string) => void;
}

export async function generatePostContextZip(options: GenerateZipOptions): Promise<Blob> {
  const { specification: spec, activeModels = [], onProgress } = options;
  const zip = new JSZip();

  onProgress?.(5, 'Criando arquivos de instruções...');

  // 1. INSTRUCOES.md
  const promptBody = renderSpecificationAsPrompt(spec);
  const instrucoesMd = `# INSTRUÇÕES DE CRIAÇÃO DE POST PUBLICITÁRIO — MÓVEIS MORANTE

Este pacote ZIP contém a especificação oficial e os arquivos de mídia reais para a criação do post publicitário.

==================================================
ESTRUTURA DOS ARQUIVOS NESTE PACOTE
==================================================
- product/primary.*: FOTOGRAFIA REAL PRINCIPAL DO PRODUTO (FONTE VISUAL DE VERDADE).
- product/open-view.*: FOTOGRAFIA DO MÓVEL ABERTO / INTERNO (quando aplicável).
- product/variations/*: FOTOGRAFIAS REAIS DAS DEMAIS CORES E VARIAÇÕES.
- official-assets/logo.*: ARQUIVO DO LOGO OFICIAL DA MÓVEIS MORANTE (usar fielmente).
- official-assets/badge.*: SELO OFICIAL DE OPORTUNIDADE (se houver oportunidade ativa).
- references/*: IMAGENS DE REFERÊNCIA VISUAL DE ELEMENTOS (apenas direção estética).
- specification.json: ESPECIFICAÇÃO COMPLETA EM JSON ESTRUTURADO (com identificadores "file" e "url").

==================================================
REGRA CRÍTICA — REFERÊNCIAS VISUAIS OBRIGATÓRIAS (GROUNDING)
==================================================
1. EXTRAÇÃO E IDENTIFICAÇÃO PRELIMINAR:
Ao receber este pacote ZIP, extraia e identifique explicitamente os arquivos das fotos do produto ("product/primary.*", "product/open-view.*", "product/variations/*") e do logo oficial ("official-assets/logo.*") antes de qualquer tentativa de geração.

2. ANCORAGEM COMO REFERÊNCIA VISUAL DIRETA:
As imagens identificadas DEVEM ser efetivamente anexadas e utilizadas como REFERÊNCIAS VISUAIS DIRETAS na chamada de geração da imagem. NÃO basta apenas ler, descrever ou compreender as imagens textualmente.
É terminantemente PROIBIDO gerar a arte apenas a partir de uma descrição textual do produto quando existem fotografias reais no pacote.

3. CONFIRMAÇÃO INTERNA OBRIGATÓRIA:
Antes de chamar o gerador de imagem, confirme internamente:
- Qual é o produto exato do pacote?
- Quais arquivos locais são suas fotografias?
- Essas fotografias estão efetivamente vinculadas como referências para a geração?
Se as fotografias não puderem ser fornecidas ao gerador como referência visual, NÃO GERE A IMAGEM. Informe que não foi possível utilizar as referências do pacote.
Nunca substitua uma referência ausente por conhecimento próprio, produto semelhante ou objeto aleatório (como relógios, carteiras ou outro produto diferente).

4. FLUXO CONTÍNUO EM SEQUÊNCIA ÚNICA (FORMATO FEED 4:5):
O formato padrão solicitado é FEED (4:5 — 1080 × 1350).
NÃO pare para perguntar qual formato deseja.
Execute em sequência única: Extração do ZIP → Ancoragem das Fotos → Geração Imediata da Arte no formato Feed 4:5.
Se o usuário responder com uma mensagem contendo apenas "4:5", isso NÃO inicia uma nova interpretação: reutilize obrigatoriamente as mesmas imagens do produto identificadas na etapa anterior.

==================================================
REGRA CENTRAL: FIDELIDADE DO PRODUTO VS. DIREÇÃO DE ARTE
==================================================
1. FIDELIDADE DO PRODUTO É ABSOLUTA: NÃO REDESENHE O PRODUTO. Não altere portas, gavetas, pés, puxadores, espelhos ou acabamentos. Utilize as fotos reais de "product/primary.*" e "product/variations/*" como representação factual do móvel.
2. DIREÇÃO DE ARTE PROFISSIONAL AO REDOR DO PRODUTO: A fidelidade do móvel NÃO autoriza uma arte simplista, vazia ou chapada. Crie uma peça publicitária sofisticada de varejo de móveis, com ambientação comercial realista (quarto, sala, cozinha conforme a categoria), iluminação de estúdio com sombras reais projetadas, bloco de preço destacado nas cores da marca (azul escuro e amarelo), hierarquia tipográfica comercial forte e acabamento gráfico premium.
3. O logo em "official-assets/logo.*" é um arquivo pronto: insira-o com fidelidade sem redesenhar.

==================================================
PROMPT ESTRUTURADO
==================================================
${promptBody}
`;

  zip.file('INSTRUCOES.md', instrucoesMd);
  zip.file('prompt.txt', promptBody);

  // 2. specification.json com caminhos relativos "file", URLs de origem e roles semânticas
  const enrichedSpec: any = JSON.parse(JSON.stringify(spec));

  if (enrichedSpec.productImages?.primary) {
    const ext = getFileExtension(enrichedSpec.productImages.primary.url, 'jpg');
    enrichedSpec.productImages.primary.file = `product/primary.${ext}`;
    enrichedSpec.productImages.primary.role = 'PRIMARY';
  }

  if (enrichedSpec.productImages?.openView) {
    const ext = getFileExtension(enrichedSpec.productImages.openView.url, 'jpg');
    enrichedSpec.productImages.openView.file = `product/open-view.${ext}`;
    enrichedSpec.productImages.openView.role = 'OPEN_VIEW';
  }

  if (Array.isArray(enrichedSpec.productImages?.variations)) {
    enrichedSpec.productImages.variations = enrichedSpec.productImages.variations.map(
      (v: any, i: number) => {
        const safeName = sanitizeFilename(v.variationName || `variacao-${i + 1}`);
        const ext = getFileExtension(v.url, 'jpg');
        return {
          ...v,
          file: `product/variations/${safeName}.${ext}`,
          role: 'VARIATION',
        };
      },
    );
  }

  if (enrichedSpec.officialAssets?.logo) {
    const ext = getFileExtension(enrichedSpec.officialAssets.logo.url, 'png');
    enrichedSpec.officialAssets.logo.file = `official-assets/logo.${ext}`;
    enrichedSpec.officialAssets.logo.role = 'OFFICIAL_ASSET';
  }

  if (enrichedSpec.officialAssets?.badge) {
    const ext = getFileExtension(enrichedSpec.officialAssets.badge.url, 'png');
    enrichedSpec.officialAssets.badge.file = `official-assets/badge.${ext}`;
    enrichedSpec.officialAssets.badge.role = 'OFFICIAL_ASSET';
  }

  zip.file('specification.json', JSON.stringify(enrichedSpec, null, 2));

  onProgress?.(15, 'Baixando fotos do produto...');

  let downloadedProductPhotos = 0;
  let totalProductPhotos = 0;

  // 3. Pasta product/
  const productFolder = zip.folder('product');
  const variationsFolder = productFolder?.folder('variations');

  // Foto Principal
  if (spec.productImages?.primary?.url && productFolder) {
    totalProductPhotos++;
    onProgress?.(25, 'Baixando foto principal...');
    const buffer = await fetchFileArrayBuffer(spec.productImages.primary.url);
    if (buffer) {
      downloadedProductPhotos++;
      const ext = getFileExtension(spec.productImages.primary.url, 'jpg');
      productFolder.file(`primary.${ext}`, buffer);
    }
  }

  // Foto Visão Interna / Aberta
  if (spec.productImages?.openView?.url && productFolder) {
    totalProductPhotos++;
    onProgress?.(40, 'Baixando foto aberta...');
    const buffer = await fetchFileArrayBuffer(spec.productImages.openView.url);
    if (buffer) {
      downloadedProductPhotos++;
      const ext = getFileExtension(spec.productImages.openView.url, 'jpg');
      productFolder.file(`open-view.${ext}`, buffer);
    }
  }

  // Variações
  if (spec.productImages?.variations && variationsFolder) {
    onProgress?.(55, 'Baixando fotos das variações...');
    for (let i = 0; i < spec.productImages.variations.length; i++) {
      const v = spec.productImages.variations[i];
      if (v.url) {
        totalProductPhotos++;
        const buffer = await fetchFileArrayBuffer(v.url);
        if (buffer) {
          downloadedProductPhotos++;
          const safeName = sanitizeFilename(v.variationName || `variacao-${i + 1}`);
          const ext = getFileExtension(v.url, 'jpg');
          variationsFolder.file(`${safeName}.${ext}`, buffer);
        }
      }
    }
  }

  onProgress?.(70, 'Baixando assets oficiais...');

  // 4. Pasta official-assets/
  const officialFolder = zip.folder('official-assets');
  if (officialFolder) {
    // Logo oficial
    if (spec.officialAssets?.logo?.url) {
      const buffer = await fetchFileArrayBuffer(spec.officialAssets.logo.url);
      if (buffer) {
        const ext = getFileExtension(spec.officialAssets.logo.url, 'png');
        officialFolder.file(`logo.${ext}`, buffer);
      }
    }

    // Selo de Oportunidade
    if (spec.officialAssets?.badge?.url) {
      const buffer = await fetchFileArrayBuffer(spec.officialAssets.badge.url);
      if (buffer) {
        const ext = getFileExtension(spec.officialAssets.badge.url, 'png');
        officialFolder.file(`badge.${ext}`, buffer);
      }
    }
  }

  onProgress?.(85, 'Baixando referências visuais...');

  // 5. Pasta references/
  const referencesFolder = zip.folder('references');
  if (referencesFolder) {
    for (const model of activeModels) {
      const typeName = sanitizeFilename(model.elementType || 'elemento');
      const isPostReference = model.elementType === 'POST_REFERENCE';
      const typeFolder = isPostReference
        ? referencesFolder.folder('posts')
        : referencesFolder.folder(typeName);

      // 5.1 Arquivos anexados diretamente no modelo (referenceFiles)
      if (Array.isArray(model.referenceFiles) && model.referenceFiles.length > 0) {
        for (let i = 0; i < model.referenceFiles.length; i++) {
          const fileRef = model.referenceFiles[i];
          if (fileRef.fileUrl) {
            const buffer = await fetchFileArrayBuffer(fileRef.fileUrl);
            if (buffer) {
              const safeName = sanitizeFilename(fileRef.name || `${model.name || 'post'}-${i + 1}`);
              const ext = getFileExtension(fileRef.name || fileRef.fileUrl, 'png');
              typeFolder?.file(`${safeName}.${ext}`, buffer);
            }
          }
        }
      }

      // 5.2 Asset gerado ou URL de referência direta
      const refUrl = (model.content as any)?.referenceUrl || (model.content as any)?.assetUrl || (model as any).generatedAssetUrl;
      if (refUrl && typeof refUrl === 'string' && (refUrl.startsWith('http') || refUrl.startsWith('data:'))) {
        const buffer = await fetchFileArrayBuffer(refUrl);
        if (buffer) {
          const safeName = sanitizeFilename(model.name || 'referencia');
          const ext = getFileExtension(refUrl, 'png');
          typeFolder?.file(`${safeName}.${ext}`, buffer);
        }
      }
    }
  }

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
