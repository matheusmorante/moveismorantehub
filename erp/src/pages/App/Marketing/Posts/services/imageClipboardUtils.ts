/**
 * imageClipboardUtils.ts — Utilitários de download e cópia de imagens para o Clipboard.
 *
 * Permite ao operador:
 * 1. Copiar imagem diretamente para a área de transferência (Ctrl+V direto no ChatGPT/WhatsApp).
 * 2. Baixar uma foto individual com nome amigável.
 * 3. Baixar todas as fotos oficiais do post em lote sequencial.
 */

import { toast } from 'react-toastify';
import { PostProductImagesSpec } from '../types/postSpecification';
import { buildImageFetchCandidates } from '@/pages/utils/imageFetchCandidates';

/**
 * Converte qualquer imagem (JPG, WebP, PNG) em um Blob PNG
 * com suporte a múltiplos candidatos de fetch (incluindo proxies/R2) e conversão via Bitmap/Canvas.
 */
export async function fetchImageAsPngBlob(url: string): Promise<Blob> {
  // 1. Se já for data URL PNG
  if (url.startsWith('data:image/png')) {
    const res = await fetch(url);
    return await res.blob();
  }

  // 2. Coletar candidatos de URL para contornar problemas de CORS / CDN
  const candidates = (url.startsWith('data:') || url.startsWith('blob:'))
    ? [url]
    : buildImageFetchCandidates(url);

  // 3. Tenta via fetch nos candidatos
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.type === 'image/png') {
          return blob;
        }

        // Converte para PNG via createImageBitmap ou ImageBitmap / OffscreenCanvas / Canvas
        if (typeof createImageBitmap === 'function') {
          try {
            const bmp = await createImageBitmap(blob);
            const canvas = document.createElement('canvas');
            canvas.width = bmp.width;
            canvas.height = bmp.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(bmp, 0, 0);
              const pngBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
              if (pngBlob) return pngBlob;
            }
          } catch {
            // Se createImageBitmap falhar com este blob específico, tenta fallback de elemento Image abaixo
          }
        }
      }
    } catch {
      // Candidato falhou, tenta o próximo
    }
  }

  // 4. Fallback: carregar via elemento Image clássico nos candidatos
  for (const candidate of candidates) {
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        if (!candidate.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Falha ao processar dimensões da imagem.');
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(b => {
              if (b) {
                resolve(b);
              } else {
                reject(new Error('Falha ao gerar formato PNG da imagem.'));
              }
            }, 'image/png');
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Falha ao carregar a imagem na resolução solicitada.'));
        img.src = candidate;
      });

      if (blob) return blob;
    } catch {
      // Continua para o próximo candidato se falhar
    }
  }

  throw new Error('Não foi possível carregar a imagem para cópia direta. Verifique a conexão com a imagem.');
}

/**
 * Copia uma imagem para o Clipboard para ser colada com Ctrl+V no ChatGPT.
 */
export async function copyImageUrlToClipboard(url: string, name = 'Foto'): Promise<boolean> {
  try {
    const blob = await fetchImageAsPngBlob(url);
    if (!navigator.clipboard?.write) {
      throw new Error('A API de área de transferência não suporta cópia direta neste navegador.');
    }
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
    toast.success(`📸 ${name} copiada! Cole no ChatGPT com Ctrl+V.`);
    return true;
  } catch (err: any) {
    console.error('Erro ao copiar imagem para clipboard:', err);
    toast.error(`Não foi possível copiar a imagem: ${err?.message || 'Erro no clipboard'}`);
    return false;
  }
}

/**
 * Dispara o download de um arquivo a partir de uma URL.
 */
export async function downloadFileFromUrl(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    // Fallback: download direto via link se fetch falhar por CORS
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Baixa todas as imagens selecionadas do post (Principal, Aberta e Variações) sequencialmente.
 */
export async function downloadAllPostImages(
  productImages: PostProductImagesSpec,
  productBaseName = 'produto',
): Promise<void> {
  const sanitize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  const base = sanitize(productBaseName);
  const queue: Array<{ url: string; filename: string }> = [];

  // 1. Imagem Principal
  if (productImages.primary?.url) {
    const varName = productImages.primary.variationName
      ? `-${sanitize(productImages.primary.variationName)}`
      : '';
    queue.push({
      url: productImages.primary.url,
      filename: `01-${base}-principal${varName}.jpg`,
    });
  }

  // 2. Imagem secundária da variação principal
  if (productImages.openView?.url) {
    queue.push({
      url: productImages.openView.url,
      filename: `02-${base}-aberto-visao-interna.jpg`,
    });
  }

  // 3. Variações
  if (Array.isArray(productImages.variations)) {
    productImages.variations.forEach((v, index) => {
      const idx = String(index + 3).padStart(2, '0');
      const varName = sanitize(v.variationName || `variacao-${index + 1}`);
      queue.push({
        url: v.url,
        filename: `${idx}-${base}-${varName}.jpg`,
      });
    });
  }

  if (queue.length === 0) {
    toast.warn('Nenhuma imagem disponível para download.');
    return;
  }

  toast.info(`Baixando ${queue.length} imagens do post...`);

  // Disparar downloads com pequeno intervalo para o navegador não cancelar requisições paralelas
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    await downloadFileFromUrl(item.url, item.filename);
    if (i < queue.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  toast.success(`✓ ${queue.length} fotos baixadas! Anexe-as no ChatGPT.`);
}
