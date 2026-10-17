import type { Product } from '../../../../../types/product.type';
import type { ProductAiSuggestedCharacteristics } from '../../../../../../../shared-utils/productAiFormSchemas';

/**
 * Aplica os campos selecionados e editados pelo usuário a partir do resultado da IA
 * sobre a entidade de produto, sincronizando dimensões, marca e Modelo/Linha unificado.
 */
export const applyAiCharacteristicsToProduct = (
  prev: Partial<Product>,
  suggestedResult: ProductAiSuggestedCharacteristics,
  selectedKeys: Record<string, boolean>,
  editedValues: Record<string, any>
): Partial<Product> => {
  const next: Partial<Product> = { ...prev };
  const nextTechnical: Record<string, any> = { ...(prev.technicalValues || {}) };

  // 1. Campos Gerais
  if (selectedKeys['__field_name__']) {
    const val = editedValues['__field_name__'] ?? suggestedResult.identifiedProduct?.name;
    if (val) {
      const strVal = String(val);
      next.name = strVal;
      next.title = strVal;
      next.marketplaceTitle = strVal;
    }
  }

  if (selectedKeys['__field_brand__']) {
    const val = editedValues['__field_brand__'] ?? suggestedResult.identifiedProduct?.brand;
    if (val) {
      const strVal = String(val);
      next.brand = strVal;
      nextTechnical['Marca'] = strVal;
    }
  }

  if (selectedKeys['__field_model__']) {
    const val = editedValues['__field_model__'] ?? suggestedResult.identifiedProduct?.model;
    if (val) {
      const strVal = String(val);
      next.line = strVal;
      nextTechnical['Modelo/Linha'] = strVal;
      delete nextTechnical['Modelo'];
      delete nextTechnical['modelo'];
      delete nextTechnical['Linha'];
      delete nextTechnical['linha'];
    }
  }

  if (selectedKeys['__field_description__']) {
    const val = editedValues['__field_description__'] ?? suggestedResult.description;
    if (val) {
      next.description = String(val);
    }
  }

  // 2. Dimensões e Peso
  if (selectedKeys['__field_height__']) {
    const val = editedValues['__field_height__'] ?? suggestedResult.height;
    if (Number(val) > 0) {
      next.height = Number(val);
      nextTechnical['Altura'] = String(val);
    }
  }

  if (selectedKeys['__field_width__']) {
    const val = editedValues['__field_width__'] ?? suggestedResult.width;
    if (Number(val) > 0) {
      next.width = Number(val);
      nextTechnical['Largura'] = String(val);
    }
  }

  if (selectedKeys['__field_depth__']) {
    const val = editedValues['__field_depth__'] ?? suggestedResult.depth;
    if (Number(val) > 0) {
      next.depth = Number(val);
      nextTechnical['Profundidade'] = String(val);
    }
  }

  if (selectedKeys['__field_weight__']) {
    const val = editedValues['__field_weight__'] ?? suggestedResult.weight;
    if (Number(val) > 0) {
      next.weight = Number(val);
      nextTechnical['Peso'] = String(val);
    }
  }

  // 3. Características Técnicas
  Object.entries(suggestedResult.technicalValues || {}).forEach(([key, originalVal]) => {
    if (selectedKeys[key]) {
      const finalVal = editedValues[key] !== undefined ? editedValues[key] : originalVal;
      const normKey = key.trim().toLocaleLowerCase('pt-BR');
      if (normKey === 'modelo' || normKey === 'linha' || normKey === 'modelo/linha' || normKey === 'linha/modelo') {
        nextTechnical['Modelo/Linha'] = finalVal;
        delete nextTechnical['Modelo'];
        delete nextTechnical['modelo'];
        delete nextTechnical['Linha'];
        delete nextTechnical['linha'];
        if (typeof finalVal === 'string' && finalVal.trim()) {
          next.line = finalVal.trim();
        }
      } else {
        nextTechnical[key] = finalVal;
      }
    }
  });

  next.technicalValues = nextTechnical;
  return next;
};
