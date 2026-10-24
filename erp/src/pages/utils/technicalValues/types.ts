/**
 * Tipos e interfaces de domínio para Especificações Técnicas e Características.
 */

export interface TechnicalFieldDefinition {
  id: string;
  name: string; // Ex: "Cor", "Quantidade de portas"
  dataType:
    | 'list'
    | 'integer'
    | 'decimal'
    | 'text'
    | 'text_short'
    | 'text_long'
    | 'radio'
    | 'multi_select'
    | 'boolean'
    | 'measure'
    | 'number'
    | 'weight'
    | 'percentage';
  unit?: string; // Ex.: "g", "cm", "mm" ou "m"
  decimalPlaces?: 1 | 2 | 3;
  active?: boolean;
  isRequired?: boolean;
  isRequiredForCatalog?: boolean;
  isCustom?: boolean;
  displayOrder?: number;
  includeInName?: boolean;
  nameOrder?: number;
  options: Array<{ id: string; value: string }>;
  categoryIds?: string[];
  requiredCategoryIds?: string[];
}

export interface TechnicalFieldGroup {
  title: string;
  fields: TechnicalFieldDefinition[];
}

export interface CharacteristicGroup<T extends { name: string }> {
  title: string;
  fields: T[];
}

export type TechnicalValuesMap = Record<string, any>;
