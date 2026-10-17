import type { Product } from '../../../../../types/product.type';
import type { ProductAiSuggestedCharacteristics } from '../../../../../../../shared-utils/productAiFormSchemas';

/**
 * Verifica se um campo do ERP já possui valor significativo preenchido.
 * Protege valores existentes contra sobrescrita acidental por sugestões da IA.
 */
export const hasErpValue = (val: unknown): boolean =>
  val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '0';

/**
 * Calcula a seleção inicial dos campos sugeridos pela IA.
 * Regras:
 * - Campos já preenchidos no ERP iniciam desmarcados (proteção a dados cadastrais).
 * - Características com confiança 'baixa' iniciam desmarcadas.
 * - Demais sugestões iniciam selecionadas para aprovação rápida.
 */
export const computeInitialSelectionKeys = (
  result: ProductAiSuggestedCharacteristics,
  formData: Partial<Product> = {}
): Record<string, boolean> => {
  const initialSelected: Record<string, boolean> = {};
  const conf = result.itemConfidence || {};

  // 1. Campos Gerais
  if (result.identifiedProduct?.name) {
    initialSelected['__field_name__'] = !hasErpValue(formData.name || formData.title);
  }
  if (result.identifiedProduct?.brand) {
    const currentBrand =
      formData.brand || formData.technicalValues?.Marca || formData.technicalValues?.marca;
    initialSelected['__field_brand__'] = !hasErpValue(currentBrand);
  }
  if (result.identifiedProduct?.model) {
    const currentModel =
      formData.technicalValues?.['Modelo/Linha'] ||
      formData.technicalValues?.['Linha/Modelo'] ||
      formData.technicalValues?.Modelo ||
      formData.technicalValues?.modelo ||
      formData.technicalValues?.Linha ||
      formData.technicalValues?.linha ||
      formData.line;
    initialSelected['__field_model__'] = !hasErpValue(currentModel);
  }
  if (result.description) {
    initialSelected['__field_description__'] = !hasErpValue(formData.description);
  }

  // 2. Dimensões
  if (result.height !== undefined && Number(result.height) > 0) {
    initialSelected['__field_height__'] = !hasErpValue(formData.height);
  }
  if (result.width !== undefined && Number(result.width) > 0) {
    initialSelected['__field_width__'] = !hasErpValue(formData.width);
  }
  if (result.depth !== undefined && Number(result.depth) > 0) {
    initialSelected['__field_depth__'] = !hasErpValue(formData.depth);
  }
  if (result.weight !== undefined && Number(result.weight) > 0) {
    initialSelected['__field_weight__'] = !hasErpValue(formData.weight);
  }

  // 3. Características Técnicas
  const currentTechnical = formData.technicalValues || {};
  Object.keys(result.technicalValues || {}).forEach((key) => {
    const isAlreadyFilled = hasErpValue(currentTechnical[key]);
    const isLowConfidence = conf[key] === 'baixa';
    initialSelected[key] = !isAlreadyFilled && !isLowConfidence;
  });

  return initialSelected;
};

/**
 * Seleciona ou desmarca todos os campos disponíveis no resultado da IA.
 */
export const computeSelectAllKeys = (
  suggestedResult: ProductAiSuggestedCharacteristics | null,
  select: boolean
): Record<string, boolean> => {
  if (!suggestedResult) return {};
  const updated: Record<string, boolean> = {};

  if (suggestedResult.identifiedProduct?.name) updated['__field_name__'] = select;
  if (suggestedResult.identifiedProduct?.brand) updated['__field_brand__'] = select;
  if (suggestedResult.identifiedProduct?.model) updated['__field_model__'] = select;
  if (suggestedResult.description) updated['__field_description__'] = select;

  if (suggestedResult.height !== undefined && Number(suggestedResult.height) > 0) {
    updated['__field_height__'] = select;
  }
  if (suggestedResult.width !== undefined && Number(suggestedResult.width) > 0) {
    updated['__field_width__'] = select;
  }
  if (suggestedResult.depth !== undefined && Number(suggestedResult.depth) > 0) {
    updated['__field_depth__'] = select;
  }
  if (suggestedResult.weight !== undefined && Number(suggestedResult.weight) > 0) {
    updated['__field_weight__'] = select;
  }

  Object.keys(suggestedResult.technicalValues || {}).forEach((key) => {
    updated[key] = select;
  });

  return updated;
};
