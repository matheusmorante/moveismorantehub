import type { ProductWithImageReferences } from '../../../../../shared-utils/productImageOperations';

export type MobileProductWithImages = ProductWithImageReferences;

export {
  replaceProductImageGlobally as replaceMobileProductImageGlobally,
} from '../../../../../shared-utils/productImageOperations';

export {
  moveProductImageGlobally as moveMobileProductImageGlobally,
} from '../../../../../shared-utils/productImageOrdering';
