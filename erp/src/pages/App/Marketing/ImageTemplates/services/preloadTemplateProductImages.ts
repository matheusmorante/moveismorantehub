import {
  isTemplateLayerVisible,
  type ImageLayout,
  type TemplatePreviewProduct,
} from '../../../../../../../shared-utils/catalogImageTemplate';
import { getDerivedImageUrl } from '@/utils/imageUrlUtils';
import {
  prepareTemplateProductPicture,
  type createTemplatePictureLoader,
} from '../renderImageTemplate';

type TemplatePictureLoader = ReturnType<typeof createTemplatePictureLoader>;

export function preloadTemplateProductImages(
  layout: ImageLayout,
  candidate: TemplatePreviewProduct,
  getPicture: TemplatePictureLoader
): void {
  const imageIndexes = new Set<number>();
  const cutoutIndexes = new Set<number>();

  for (const layer of layout.layers) {
    if (layer.type !== 'product' || !isTemplateLayerVisible(layout, layer, candidate)) continue;
    imageIndexes.add(layer.imageIndex);
    if (layer.imageIndex > 0 && layer.fallback === 'main') imageIndexes.add(0);
    if (layer.removeBackground) {
      cutoutIndexes.add(layer.imageIndex);
      if (layer.imageIndex > 0 && layer.fallback === 'main') cutoutIndexes.add(0);
    }
  }

  for (const index of imageIndexes) {
    const image = candidate.images[index];
    if (!image) continue;
    const mediumImage = getDerivedImageUrl(image, 'medium');
    const needsCutout = cutoutIndexes.has(index);
    const preloadCutout = (url: string) => {
      if (needsCutout) {
        void getPicture(url, true, { preview: true, priority: 'low' })
          .then(prepareTemplateProductPicture)
          .catch(() => {});
      }
    };

    void getPicture(mediumImage, false)
      .then((raw) => {
        prepareTemplateProductPicture(raw);
        preloadCutout(mediumImage);
      })
      .catch(() => {
        if (mediumImage !== image) {
          void getPicture(image, false)
            .then((raw) => {
              prepareTemplateProductPicture(raw);
              preloadCutout(image);
            })
            .catch(() => {});
        }
      });
  }
}
