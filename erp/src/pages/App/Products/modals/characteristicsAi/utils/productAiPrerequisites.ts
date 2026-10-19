import type { Product } from '../../../../../types/product.type';

export interface ProductAiPrerequisites {
  productName: string;
  brand: string;
  model: string;
  description: string;
  effectiveCategory: string;
  hasCategory: boolean;
  images: string[];
  hasName: boolean;
  hasDescription: boolean;
  hasBrand: boolean;
  hasModel: boolean;
  isPrerequisitesMet: boolean;
}

/**
 * Extrai e normaliza os dados base e pré-requisitos do produto para consulta de IA.
 * Garante compatibilidade canônica com 'Modelo/Linha', além de chaves legadas e variações de maiúsculas.
 */
export const extractProductAiPrerequisites = (
  formData: Partial<Product> = {},
  categoryName = ''
): ProductAiPrerequisites => {
  const productName = (formData.name || formData.title || '').trim();

  const brand = (
    formData.brand ||
    formData.technicalValues?.Marca ||
    formData.technicalValues?.marca ||
    ''
  )
    .toString()
    .trim();

  const model = (
    formData.technicalValues?.['Modelo/Linha'] ||
    formData.technicalValues?.['Linha/Modelo'] ||
    formData.technicalValues?.Modelo ||
    formData.technicalValues?.modelo ||
    formData.technicalValues?.Linha ||
    formData.technicalValues?.linha ||
    formData.line ||
    ''
  )
    .toString()
    .trim();

  const description = (formData.description || formData.ecommerceDescription || '').trim();
  const effectiveCategory = (categoryName || '').trim();
  const hasCategory = effectiveCategory.length > 0;

  const images = (formData.images || []).filter(
    (img): img is string => typeof img === 'string' && img.startsWith('http')
  );

  const hasName = productName.length >= 2;
  const hasDescription = description.length > 0;
  const hasBrand = brand.length > 0;
  const hasModel = model.length > 0;
  const isPrerequisitesMet = hasName;

  return {
    productName,
    brand,
    model,
    description,
    effectiveCategory,
    hasCategory,
    images,
    hasName,
    hasDescription,
    hasBrand,
    hasModel,
    isPrerequisitesMet,
  };
};
