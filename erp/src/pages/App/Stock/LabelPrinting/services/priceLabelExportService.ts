import html2canvas from 'html2canvas';
import type { z } from 'zod';
import { labelArtworkExportFormSchema } from '../../../../../../../shared-utils/labelArtworkFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

/** The owner validates the intent with RHF and keeps its preview stable until completion. */
export async function exportLabelImage(
  element: HTMLElement | null,
  input: z.output<typeof labelArtworkExportFormSchema>,
  stillCurrent: () => boolean,
): Promise<void> {
  const command = labelArtworkExportFormSchema.parse(input);
  if (!element) throw new Error('A prévia da etiqueta não está disponível.');
  let accepting = true;
  const check = () => {
    if (!accepting || !stillCurrent()) throw new Error('A arte mudou durante a exportação. Tente novamente.');
  };
  const operation = async () => {
    check();
    if (command.action === 'copy' && (!navigator.clipboard?.write || !window.ClipboardItem)) {
      throw new Error('Copiar não suportado neste navegador. Use Baixar PNG.');
    }
    const canvas = await html2canvas(element, {
      scale: 1, useCORS: true, backgroundColor: '#ffffff',
      width: element.clientWidth, height: element.clientHeight, scrollX: 0, scrollY: 0,
      ignoreElements: (candidate) => candidate.getAttribute('data-hide-export') === 'true',
    });
    check();
    if (command.action === 'copy') {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('Não foi possível gerar a imagem PNG.'));
      }, 'image/png'));
      check();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      check();
    } else {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `etiqueta_preco_${encodeURIComponent(command.snapshot.selectedOppId || 'arte')}_${Date.now()}.png`;
      check();
      link.click();
    }
    return true;
  };
  try {
    const completed = await withTimeout(operation(), 30000, false, 'etiquetas:exportar-png');
    if (!completed) throw new Error('A exportação excedeu o prazo. Tente novamente.');
  } finally { accepting = false; }
}
