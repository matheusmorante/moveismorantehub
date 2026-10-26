/** Predicados canônicos dos campos técnicos reutilizados pelo ERP e app mobile. */
export {
  isChairWeightCapacityCharacteristic,
  isShelfWeightCapacityCharacteristic,
  isWeightCharacteristicName,
  isWeightCapacityCharacteristic,
} from '../erp/src/pages/utils/technicalValuesService';

export const isSofaCategoryName = (name: string): boolean => {
  const normalized = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
  return /(?:^|[^a-z0-9])sofas?(?=$|[^a-z0-9])/.test(normalized);
};
