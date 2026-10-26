/**
 * Tamanhos e qualidade das imagens derivadas são consumidos pelo ERP e pelo app.
 * O nome original continua sendo a referência para montar os caminhos irmãos.
 */
export const PRODUCT_IMAGE_DERIVATIVES = {
  medium: {
    suffix: '_medium',
    maxDimension: 1000,
    maxSizeBytes: 0.5 * 1024 * 1024,
    initialQuality: 0.85,
  },
  thumbnail: {
    suffix: '_thumb',
    maxDimension: 200,
    maxSizeBytes: 0.05 * 1024 * 1024,
    initialQuality: 0.75,
  },
} as const;

export type ProductImageDerivative =
  (typeof PRODUCT_IMAGE_DERIVATIVES)[keyof typeof PRODUCT_IMAGE_DERIVATIVES];
