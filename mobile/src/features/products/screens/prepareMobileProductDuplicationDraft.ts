import { buildMobileProductDuplicationDraft } from '../domain/mobileProductDuplication';
import { copyMobileProductImages } from '../services/mobileProductPhotoService';
import { getNextSequentialProductCode } from '../services/mobileProductCodeService';
import { loadFullProductForForm } from './loadFullProductForForm';

export const prepareMobileProductDuplicationDraft = async (
  productId: string,
  showTestProducts: boolean,
  onImageCopyFailure: (error: unknown) => void
) => {
  const source = await loadFullProductForForm(productId, showTestProducts, 'duplicacao');
  const code = await getNextSequentialProductCode();
  const sourceImages = Array.isArray(source.images) ? source.images : [];
  let images = sourceImages;
  if (sourceImages.length > 0) {
    try {
      images = await copyMobileProductImages(sourceImages);
    } catch (error) {
      onImageCopyFailure(error);
    }
  }
  return buildMobileProductDuplicationDraft(source, code, images);
};
