import { Product } from '@/types/product.type';
import {
  parseDoorQuantityValue,
  parseDrawerQuantityValue,
  parseFeetQuantityValue,
  isMattressCategory,
  TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';
import { normalizeTechnicalName } from '../technicalTabUtils';

/**
 * Preenche valores técnicos iniciais com dimensões do produto quando as características
 * obrigatórias ainda não constam no formulário e normaliza estruturas de dados legadas.
 */
export const populateInitialTechnicalValues = (
  prev: Partial<Product>,
  fieldDefinitions: readonly TechnicalFieldDefinition[]
): Partial<Product> => {
  const technicalValues = { ...(prev.technicalValues || {}) };
  let changed = false;
  const isMattress = isMattressCategory(prev.categoryIds, fieldDefinitions);

  fieldDefinitions
    .filter((field) => {
      if (isMattress && normalizeTechnicalName(field.name) === 'altura') return false;
      const isReq =
        field.isRequired ||
        (isMattress && normalizeTechnicalName(field.name) === 'espessura do colchão');
      return isReq && field.active !== false;
    })
    .forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(technicalValues, field.name)) {
        const norm = normalizeTechnicalName(field.name);
        if (norm === 'altura' && prev.height) {
          technicalValues[field.name] = prev.height;
        } else if (norm === 'espessura do colchão' && prev.height) {
          technicalValues[field.name] = prev.height;
        } else if (norm === 'largura' && prev.width) {
          technicalValues[field.name] = prev.width;
        } else if ((norm === 'profundidade' || norm === 'comprimento') && prev.depth) {
          technicalValues[field.name] = prev.depth;
        } else {
          technicalValues[field.name] = '';
        }
        changed = true;
      }
    });

  // Normalização de quantidades legadas (ex: "3 portas" -> 3)
  if (
    technicalValues['Quantidade de portas'] !== undefined &&
    typeof technicalValues['Quantidade de portas'] === 'string'
  ) {
    const parsed = parseDoorQuantityValue(technicalValues);
    if (parsed !== null) {
      technicalValues['Quantidade de portas'] = parsed;
      changed = true;
    }
  }

  if (
    technicalValues['Quantidade de gavetas'] !== undefined &&
    typeof technicalValues['Quantidade de gavetas'] === 'string'
  ) {
    const parsed = parseDrawerQuantityValue(technicalValues);
    if (parsed !== null) {
      technicalValues['Quantidade de gavetas'] = parsed;
      changed = true;
    }
  }

  if (
    technicalValues['Quantidade de pés'] !== undefined &&
    typeof technicalValues['Quantidade de pés'] === 'string'
  ) {
    const parsed = parseFeetQuantityValue(technicalValues);
    if (parsed !== null) {
      technicalValues['Quantidade de pés'] = parsed;
      changed = true;
    }
  }

  // Normalização de multi_select legados (string -> array)
  if (technicalValues['Tipo de portas'] !== undefined) {
    const val = technicalValues['Tipo de portas'];
    if (typeof val === 'string' && val.trim()) {
      const parts = val.includes('+')
        ? val.split('+').map((s) => s.trim()).filter(Boolean)
        : [val.trim()];
      technicalValues['Tipo de portas'] = parts;
      changed = true;
    }
  }

  if (technicalValues['Tipo/Material das corrediças'] !== undefined) {
    const val = technicalValues['Tipo/Material das corrediças'];
    if (typeof val === 'string' && val.trim()) {
      technicalValues['Tipo/Material das corrediças'] = [val.trim()];
      changed = true;
    }
  }

  // Inferência automática e compatibilidade de switches mestres
  if (!Object.prototype.hasOwnProperty.call(technicalValues, 'Possui portas')) {
    const doorQty = parseDoorQuantityValue(technicalValues);
    if (
      (doorQty !== null && doorQty > 0) ||
      technicalValues['Tipo de portas'] ||
      technicalValues['Material das portas']
    ) {
      technicalValues['Possui portas'] = 'Sim';
      changed = true;
    }
  }

  if (!Object.prototype.hasOwnProperty.call(technicalValues, 'Possui gavetas')) {
    const drawerQty = parseDrawerQuantityValue(technicalValues);
    if (
      (drawerQty !== null && drawerQty > 0) ||
      technicalValues['Tipo/Material das corrediças'] ||
      technicalValues['Materiais das corrediças'] ||
      technicalValues['Material das gavetas']
    ) {
      technicalValues['Possui gavetas'] = 'Sim';
      changed = true;
    }
  }

  if (!Object.prototype.hasOwnProperty.call(technicalValues, 'Possui pés')) {
    const feetQty = parseFeetQuantityValue(technicalValues);
    if (
      (feetQty !== null && feetQty > 0) ||
      technicalValues['Material dos pés'] ||
      technicalValues['Pés reguláveis']
    ) {
      technicalValues['Possui pés'] = 'Sim';
      changed = true;
    }
  }

  // Consolidação de Modelo e Linha legados em Modelo/Linha para manter compatibilidade
  const legacyModelOrLine =
    technicalValues['Modelo/Linha'] ??
    technicalValues['Linha/Modelo'] ??
    technicalValues['Modelo'] ??
    technicalValues['Linha'] ??
    technicalValues['modelo'] ??
    technicalValues['linha'] ??
    prev.line;

  if (
    legacyModelOrLine !== undefined &&
    legacyModelOrLine !== null &&
    String(legacyModelOrLine).trim() !== ''
  ) {
    if (!technicalValues['Modelo/Linha'] || String(technicalValues['Modelo/Linha']).trim() === '') {
      technicalValues['Modelo/Linha'] = legacyModelOrLine;
      changed = true;
    }
  }
  if ('Modelo' in technicalValues) {
    delete technicalValues['Modelo'];
    changed = true;
  }
  if ('modelo' in technicalValues) {
    delete technicalValues['modelo'];
    changed = true;
  }
  if ('Linha' in technicalValues) {
    delete technicalValues['Linha'];
    changed = true;
  }
  if ('linha' in technicalValues) {
    delete technicalValues['linha'];
    changed = true;
  }

  return changed ? { ...prev, technicalValues } : prev;
};
