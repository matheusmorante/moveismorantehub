import type Product from '../../../../types/product.type';
import { getMissingRequiredCharacteristics } from '../../../../utils/technicalValuesService';

/**
 * Validação dos pré-requisitos para geração da descrição por características:
 * - Nome do produto preenchido (mínimo 2 caracteres)
 * - Características obrigatórias mínimas preenchidas (Marca, Modelo/Linha e obrigatórias de catálogo)
 * - Nota: Cor NÃO é exigida aqui porque cor pertence às variações do produto e não deve constar na descrição.
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

  const missingFromUtils = getMissingRequiredCharacteristics({
    ...techValues,
    ...(formData.brand ? { Marca: formData.brand } : {}),
    ...(formData.model ? { Modelo: formData.model } : {}),
    // Passamos um valor para Cor para não bloqueá-la como requisito da descrição comercial do produto
    Cor: 'NaoAplicaParaDescricao',
  });

  missingFromUtils.forEach((field) => {
    if (!missing.includes(field) && field.trim().toLowerCase() !== 'cor') {
      missing.push(field);
    }
  });

  return missing;
};
