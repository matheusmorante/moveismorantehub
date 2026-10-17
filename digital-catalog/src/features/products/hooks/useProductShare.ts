'use client';

import { toast } from 'sonner';
import { sendProductInterest, getProductShareText } from '@/services/whatsapp';

interface UseProductShareOptions {
  product: any;
  displayTitle: string;
  displayPrice: number | null | undefined;
  displayPromoPrice: number | null | undefined;
  displayWidth?: string | number | null;
  displayDepth?: string | number | null;
  displayHeight?: string | number | null;
  displayThickness?: string | number | null;
}

/**
 * Hook de domínio responsável pelo compartilhamento do produto
 * (contato via WhatsApp, envio de recomendação com link formatado e cópia para clipboard).
 */
export function useProductShare({
  product,
  displayTitle,
  displayPrice,
  displayPromoPrice,
  displayWidth,
  displayDepth,
  displayHeight,
  displayThickness,
}: UseProductShareOptions) {
  const handleWhatsApp = () => {
    sendProductInterest(displayTitle);
  };

  const handleShareWhatsApp = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.href;
    const oppName = product?.opportunities?.name || (product?.is_salvado ? 'Salvados' : '');
    const parts: string[] = [];
    if (displayWidth) parts.push(`${displayWidth}L`);
    if (displayDepth) parts.push(`${displayDepth}${product?.depth_use_length ? 'C' : 'P'}`);
    if (displayHeight) parts.push(`${displayHeight}A`);
    if (displayThickness) parts.push(`${displayThickness}E`);
    const measuresText = parts.join(' x ');
    const text = getProductShareText(
      displayTitle,
      displayPrice,
      displayPromoPrice,
      shareUrl,
      oppName,
      measuresText
    );
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.href;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success('Link copiado para a área de transferência!');
      })
      .catch((err) => {
        console.error('Erro ao copiar link:', err);
        toast.error('Não foi possível copiar o link automaticamente.');
      });
  };

  return {
    handleWhatsApp,
    handleShareWhatsApp,
    handleCopyLink,
  };
}
