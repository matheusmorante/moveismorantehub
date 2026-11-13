import { useEffect, useRef, useState } from 'react';
import {
  imageTemplateFormSchema,
  isTemplateLayerVisible,
  type ImageFormat,
  type ImageTemplateFormValues,
} from '../../../../../../../shared-utils/catalogImageTemplate';
import { assetSource, imageTemplateError, readTemplateAssets } from '../imageTemplateService';
import { createTemplatePictureLoader, renderImageTemplate } from '../renderImageTemplate';
import type { PreviewProductSource } from '../productPreviewService';

/**
 * Coordinates abortable full-resolution PNG export for the active template format and product.
 */
export function useImageTemplateExport({
  getFormValues,
  currentFormat,
  productId,
  detailRefetch,
  resolveFresh,
  assetSources,
  getPicture,
  isBusy,
  setError,
  setMessage,
}: {
  getFormValues: () => ImageTemplateFormValues;
  currentFormat: ImageFormat;
  productId: string | undefined;
  detailRefetch: (options: { cancelRefetch: boolean; throwOnError: boolean }) => Promise<{ data?: PreviewProductSource }>;
  resolveFresh: (source: PreviewProductSource) => ReturnType<typeof import('../productPreviewService').mapPreviewProduct>;
  assetSources: ReadonlyMap<string, string>;
  getPicture: ReturnType<typeof createTemplatePictureLoader>;
  isBusy: () => boolean;
  setError: (message: string) => void;
  setMessage: (message: string) => void;
}) {
  const [exporting, setExporting] = useState(false);
  const exportRequest = useRef<AbortController | null>(null);

  useEffect(() => () => exportRequest.current?.abort(), []);

  async function download() {
    if (!productId || isBusy()) return;
    const controller = new AbortController();
    exportRequest.current = controller;
    setExporting(true);
    setError('');
    setMessage('');
    try {
      const result = imageTemplateFormSchema.safeParse(getFormValues());
      if (!result.success) throw new Error(result.error.issues[0].message);
      const parsed = result.data;
      const currentLayout = parsed.design.formats[currentFormat]!;
      const { data: freshSource } = await detailRefetch({ cancelRefetch: false, throwOnError: true });
      if (controller.signal.aborted) return;
      if (!freshSource) throw new Error('Não foi possível atualizar o produto para gerar o PNG.');

      const fresh = resolveFresh(freshSource);
      const sources = new Map(assetSources);
      const missing = [
        ...new Set(
          currentLayout.layers.flatMap((layer) =>
            layer.type === 'image' && layer.assetId && isTemplateLayerVisible(currentLayout, layer, fresh) && !sources.has(layer.assetId)
              ? [layer.assetId]
              : [],
          ),
        ),
      ];
      const extra = await readTemplateAssets(missing, controller.signal);
      extra.forEach((asset) => sources.set(asset.id, assetSource(asset)));

      const canvas = document.createElement('canvas');
      const rendered = await renderImageTemplate({
        canvas,
        format: currentFormat,
        layout: currentLayout,
        product: fresh,
        assets: sources,
        getPicture,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (rendered.errors.length) throw new Error(rendered.errors.join(' '));

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('O navegador não conseguiu gerar o PNG.');
      if (controller.signal.aborted) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const label = `${parsed.name}-${fresh.fields.retailerId || fresh.id}-${currentFormat}`.replace(/[^\p{L}\p{N}]+/gu, '-');
      link.href = url;
      link.download = `${label}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Imagem gerada com os dados atuais do produto.');
    } catch (cause) {
      if (!controller.signal.aborted) setError(imageTemplateError(cause));
    } finally {
      if (!controller.signal.aborted) setExporting(false);
    }
  }

  return { exporting, download };
}
