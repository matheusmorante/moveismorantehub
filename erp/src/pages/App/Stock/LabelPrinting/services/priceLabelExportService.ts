import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';

export async function copyLabelImageToClipboard(element: HTMLElement | null): Promise<void> {
  if (!element) return;
  const hiddenEls = element.querySelectorAll('[data-hide-export="true"]');
  try {
    hiddenEls.forEach(el => ((el as HTMLElement).style.display = 'none'));

    const canvas = await html2canvas(element, {
      scale: 1,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: element.clientWidth,
      height: element.clientHeight,
      scrollX: 0,
      scrollY: 0
    });

    canvas.toBlob(async (blob) => {
      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([new (window as any).ClipboardItem({ 'image/png': blob })]);
        toast.success('Imagem da etiqueta copiada para a área de transferência!');
      } else {
        toast.info('Copiar não suportado neste navegador. Use Baixar PNG.');
      }
    });
  } catch (error) {
    console.error('Falha ao copiar imagem da etiqueta:', error);
    toast.error('Erro ao copiar imagem.');
  } finally {
    // Garante restauração incondicional dos elementos de controle e seleção
    hiddenEls.forEach(el => ((el as HTMLElement).style.display = ''));
  }
}

export async function downloadLabelImage(element: HTMLElement | null, filename: string): Promise<void> {
  if (!element) return;
  const hiddenEls = element.querySelectorAll('[data-hide-export="true"]');
  try {
    hiddenEls.forEach(el => ((el as HTMLElement).style.display = 'none'));

    const canvas = await html2canvas(element, {
      scale: 1,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: element.clientWidth,
      height: element.clientHeight,
      scrollX: 0,
      scrollY: 0
    });

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    toast.success('Download da imagem PNG concluído!');
  } catch (error) {
    console.error('Falha ao baixar imagem da etiqueta:', error);
    toast.error('Erro ao baixar imagem PNG.');
  } finally {
    // Garante restauração incondicional dos elementos de controle e seleção
    hiddenEls.forEach(el => ((el as HTMLElement).style.display = ''));
  }
}
