/**
 * Composição e formatação de valores técnicos para geração de títulos de variações.
 */

import { isDefined, isWeightCharacteristicName } from './predicates';
import type { TechnicalFieldDefinition, TechnicalValuesMap } from './types';

/**
 * Formata um valor de campo técnico para exibição no nome do produto/variação.
 * Trata booleanos (ex: "Com Espelho"), números com unidade (ex: "6 Portas", "2.10m").
 */
export const formatValueForName = (field: TechnicalFieldDefinition, value: any): string => {
  if (!isDefined(value)) return '';

  if (field.dataType === 'boolean') {
    if (value === true || String(value) === 'true') {
      return `Com ${field.name}`;
    }
    return '';
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }

  const isWeight = isWeightCharacteristicName(field.name) || field.dataType === 'weight';
  const rawValue = String(value).trim();
  const strVal =
    (field.dataType === 'decimal' || isWeight) && Number.isFinite(Number(value))
      ? Number(value)
          .toFixed(isWeight ? 1 : (field.decimalPlaces ?? 2))
          .replace('.', ',')
      : rawValue;
  if (!strVal) return '';

  if (field.unit) {
    return `${strVal} ${field.unit}`;
  }

  return strVal;
};

/**
 * Gera automaticamente o nome da variação combinando o nome do produto pai com as
 * Especificações Técnicas configuradas para compor o nome.
 */
export const computeEffectiveVariationName = (
  parentName: string,
  fields: TechnicalFieldDefinition[],
  effectiveValues: TechnicalValuesMap
): string => {
  const cleanParent = parentName ? parentName.trim() : '';

  // Filtrar campos marcados para inclusão no nome e ordenar
  const nameFields = fields
    .filter((f) => f.includeInName !== false)
    .sort((a, b) => (a.nameOrder ?? 10) - (b.nameOrder ?? 10));

  const parts: string[] = [];
  if (cleanParent) {
    parts.push(cleanParent);
  }

  for (const field of nameFields) {
    const val = effectiveValues[field.name];
    const formatted = formatValueForName(field, val);
    if (formatted) {
      parts.push(formatted);
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};
