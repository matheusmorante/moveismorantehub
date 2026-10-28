import type Product from '@/pages/types/product.type';
import {
  parseDoorQuantityValue,
  parseDrawerQuantityValue,
  parseFeetQuantityValue,
  isDoorQuantityCharacteristic,
  TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';
import { getProductTechnicalValueCandidateKeys } from '../../../../../../../../../shared-utils/productTechnicalValueAliases';
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

  fieldDefinitions.forEach((field) => {
    const candidates = getProductTechnicalValueCandidateKeys(field.name);
    const normalizedCandidates = new Set(candidates.map(normalizeTechnicalName));
    const matchingEntries = Object.entries(technicalValues).filter(([name]) =>
      normalizedCandidates.has(normalizeTechnicalName(name))
    );
    const preferredCandidate = candidates.find((candidate) =>
      matchingEntries.some(([name, value]) =>
        value !== undefined && normalizeTechnicalName(name) === normalizeTechnicalName(candidate)
      )
    );
    const preferredEntry = preferredCandidate
      ? matchingEntries.find(([name, value]) =>
          value !== undefined && normalizeTechnicalName(name) === normalizeTechnicalName(preferredCandidate)
        )
      : undefined;

    if (preferredEntry && (!Object.prototype.hasOwnProperty.call(technicalValues, field.name) ||
        technicalValues[field.name] === undefined)) {
      technicalValues[field.name] = preferredEntry[1];
      changed = true;
    }

    matchingEntries.forEach(([name]) => {
      if (name !== field.name) {
        delete technicalValues[name];
        changed = true;
      }
    });
  });

  fieldDefinitions
    .filter((field) => {
      const categoryApplications = field.categoryApplications?.filter((application) =>
        (prev.categoryIds || []).includes(application.categoryId)
      ) ?? [];
      const isReq = categoryApplications.length > 0
        ? categoryApplications.some((application) => application.application === 'required')
        : field.isRequired;
      return isReq && field.active !== false;
    })
    .forEach((field) => {
      const currentValue = technicalValues[field.name];
      if (
        !Object.prototype.hasOwnProperty.call(technicalValues, field.name) ||
        (field.dataType === 'boolean' && (currentValue === undefined || currentValue === null || currentValue === ''))
      ) {
        const norm = normalizeTechnicalName(field.name);
        if ((norm === 'altura' || norm === 'altura total') && prev.height) {
          technicalValues[field.name] = prev.height;
        } else if (norm === 'largura' && prev.width) {
          technicalValues[field.name] = prev.width;
        } else if (
          (norm === 'profundidade' || norm === 'profundidade total') &&
          !prev.depthUseLength &&
          prev.depth
        ) {
          technicalValues[field.name] = prev.depth;
        } else {
          technicalValues[field.name] = field.dataType === 'boolean' ? null : '';
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
    const hasDoorQuantityField = Object.keys(technicalValues).some(isDoorQuantityCharacteristic);
    if (
      !hasDoorQuantityField &&
      (technicalValues['Tipo de portas'] || technicalValues['Material das portas'])
    ) {
      technicalValues['Possui portas'] = true;
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
      technicalValues['Possui gavetas'] = true;
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
      technicalValues['Possui pés'] = true;
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
