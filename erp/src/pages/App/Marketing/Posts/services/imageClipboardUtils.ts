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

/**
 * Converte qualquer imagem (JPG, WebP, PNG) em um Blob PNG
 * através de um elemento Canvas para compatibilidade total com o ClipboardItem da Clipboard API.
 */
export async function fetchImageAsPngBlob(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Não foi possível obter contexto 2D do canvas.');
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao converter canvas para blob PNG.'));
          }
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem para o canvas.'));
    img.src = url;
  });
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
    // Fallback: abrir em nova aba para salvar manualmente se o clipboard for bloqueado por CORS
    toast.warn('Não foi possível colar direto via Clipboard. Abrindo a imagem em nova aba...');
    window.open(url, '_blank');
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

  // 2. Visão Interna / Aberto
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
