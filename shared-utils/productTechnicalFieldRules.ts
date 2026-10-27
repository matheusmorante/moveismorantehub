/** Predicados canônicos dos campos técnicos reutilizados pelo ERP e app mobile. */
export {
  isChairWeightCapacityCharacteristic,
  isDimensionCharacteristicName,
  isShelfWeightCapacityCharacteristic,
  isWeightCharacteristicName,
  isWeightCapacityCharacteristic,
} from '../erp/src/pages/utils/technicalValuesService';

/** Identifica a característica inteira que representa quantidade de lugares. */
export const isTechnicalFieldPlacesCount = (name: string): boolean => /lugar(es)?/i.test(name);

/** Força como multi-select as características legadas de corrediças e tipos de porta. */
export const isTechnicalFieldMultiSelect = (name: string): boolean =>
  /corredi[çc]a/i.test(name) || /tipo.*de.*porta/i.test(name) || /tipo.*porta/i.test(name);

/** Limite de entrada inteiro usado pelo ERP para características técnicas. */
export const getTechnicalFieldIntegerMaxValue = (name: string): number =>
  isTechnicalFieldPlacesCount(name) ? 100 : 50;

/** Placeholders ERP/mobile para características técnicas com entrada de texto curta. */
export const getTechnicalFieldTextPlaceholder = (name: string): string | undefined => {
  const fieldName = String(name || '').trim();
  if (/^marca$/i.test(fieldName)) return 'Digite a marca';
  if (/^modelo$/i.test(fieldName)) return 'Digite o modelo';
  if (/^(modelo\s*\/\s*linha|linha\s*\/\s*modelo)$/i.test(fieldName)) {
    return 'Digite o modelo / linha';
  }
  if (/^linha$/i.test(fieldName)) return 'Digite a linha';
  return undefined;
};

export const isSofaCategoryName = (name: string): boolean => {
  const normalized = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
  return /(?:^|[^a-z0-9])sofas?(?=$|[^a-z0-9])/.test(normalized);
};

export const isWardrobeCategoryName = (name: string): boolean => {
  const normalized = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
  return /(?:^|[^a-z0-9])(?:guarda[\s-]*roupas?|roupeiros?|closets?|armarios?\s+(?:de\s+)?(?:roupa|quarto|dormitorio))(?=$|[^a-z0-9])/.test(
    normalized
  );
};
