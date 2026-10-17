import type Product from '../../../../types/product.type';
import { getMissingRequiredCharacteristics } from '../../../../utils/technicalValuesService';

/**
 * Validação dos pré-requisitos para geração da descrição por características:
 * - Nome do produto preenchido (mínimo 2 caracteres)
 * - Características obrigatórias mínimas preenchidas (Marca, Modelo, Cor e obrigatórias de catálogo)
 */
export const validateProductDescriptionPrerequisites = (formData: Partial<Product>): string[] => {
  const missing: string[] = [];

  const name = formData.name?.trim() || '';
  if (name.length < 2) {
    missing.push('Nome do produto');
  }

  const techValues = formData.technicalValues || {};
  const hasBrand = Boolean(formData.brand?.trim() || techValues['Marca'] || techValues['marca']);
  if (!hasBrand) {
    missing.push('Marca');
  }

  const hasModel = Boolean(
    formData.model?.trim() ||
    formData.line?.trim() ||
    techValues['Modelo/Linha'] ||
    techValues['Modelo / Linha'] ||
    techValues['modelo/linha'] ||
    techValues['Modelo'] ||
    techValues['modelo'] ||
    techValues['Linha'] ||
    techValues['linha']
  );
  if (!hasModel) {
    missing.push('Modelo');
  }

  const hasColor = Boolean(formData.color?.trim() || techValues['Cor'] || techValues['cor']);
  if (!hasColor) {
    missing.push('Cor');
  }

  const missingFromUtils = getMissingRequiredCharacteristics({
    ...techValues,
    ...(formData.brand ? { Marca: formData.brand } : {}),
    ...(formData.model ? { Modelo: formData.model } : {}),
    ...(formData.color ? { Cor: formData.color } : {}),
  });

  missingFromUtils.forEach((field) => {
    if (!missing.includes(field)) {
      missing.push(field);
    }
  });

  return missing;
};
