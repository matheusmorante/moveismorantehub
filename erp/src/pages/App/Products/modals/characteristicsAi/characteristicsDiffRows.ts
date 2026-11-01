import type { Product } from '@/pages/types/product.type';
import type { ProductAiSuggestedCharacteristics } from '../../../../../../shared-utils/productAiFormSchemas';

export interface DiffRowItem {
  key: string;
  group: 'Geral' | 'Dimensões' | 'Especificações Técnicas';
  label: string;
  currentValue: any;
  suggestedValue: any;
  isFilledInErp: boolean;
  confidence: 'alta' | 'media' | 'baixa';
}

const hasErpValue = (value: any) =>
  value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== '0';

export function buildCharacteristicsDiffRows(
  suggestedResult: ProductAiSuggestedCharacteristics | null,
  formData: Partial<Product>,
  identifiedProduct = suggestedResult?.identifiedProduct,
): DiffRowItem[] {
  if (!suggestedResult) return [];

  const items: DiffRowItem[] = [];
  const confidence = suggestedResult.itemConfidence || {};

  if (identifiedProduct?.name) {
    items.push({
      key: '__field_name__',
      group: 'Geral',
      label: 'Nome do Produto',
      currentValue: formData.name || formData.title,
      suggestedValue: identifiedProduct.name,
      isFilledInErp: hasErpValue(formData.name || formData.title),
      confidence: identifiedProduct.confidence || 'alta',
    });
  }

  if (identifiedProduct?.brand) {
    const currentBrand =
      formData.brand || formData.technicalValues?.Marca || formData.technicalValues?.marca;
    items.push({
      key: '__field_brand__',
      group: 'Geral',
      label: 'Marca / Fabricante',
      currentValue: currentBrand,
      suggestedValue: identifiedProduct.brand,
      isFilledInErp: hasErpValue(currentBrand),
      confidence: identifiedProduct.confidence || 'alta',
    });
  }

  if (identifiedProduct?.model) {
    const currentModel =
      formData.technicalValues?.Modelo || formData.technicalValues?.modelo || formData.line;
    items.push({
      key: '__field_model__',
      group: 'Geral',
      label: 'Modelo / Linha',
      currentValue: currentModel,
      suggestedValue: identifiedProduct.model,
      isFilledInErp: hasErpValue(currentModel),
      confidence: identifiedProduct.confidence || 'alta',
    });
  }

  if (suggestedResult.description) {
    items.push({
      key: '__field_description__',
      group: 'Geral',
      label: 'Descrição Detalhada',
      currentValue: formData.description,
      suggestedValue: suggestedResult.description,
      isFilledInErp: hasErpValue(formData.description),
      confidence: 'alta',
    });
  }

  const dimensions = [
    ['height', 'Altura', 'Altura (cm)'],
    ['width', 'Largura', 'Largura (cm)'],
    ['depth', 'Profundidade', 'Profundidade (cm)'],
    ['weight', 'Peso', 'Peso (kg)'],
  ] as const;

  for (const [field, key, label] of dimensions) {
    const value = suggestedResult[field];
    if (value === undefined || !(Number(value) > 0)) continue;

    const currentValue = formData[field];
    items.push({
      key: `__field_${field}__`,
      group: 'Dimensões',
      label,
      currentValue,
      suggestedValue: value,
      isFilledInErp: hasErpValue(currentValue),
      confidence: confidence[key] || 'alta',
    });
  }

  const technicalValues = suggestedResult.technicalValues || {};
  const currentTechnicalValues = formData.technicalValues || {};
  Object.entries(technicalValues).forEach(([key, value]) => {
    items.push({
      key,
      group: 'Especificações Técnicas',
      label: key,
      currentValue: currentTechnicalValues[key],
      suggestedValue: value,
      isFilledInErp: hasErpValue(currentTechnicalValues[key]),
      confidence: confidence[key] || 'alta',
    });
  });

  return items;
}
