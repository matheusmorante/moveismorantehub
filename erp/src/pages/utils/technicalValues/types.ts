/**
 * Tipos e interfaces de domínio para Especificações Técnicas e Características.
 */

import type {
  CharacteristicDependency,
  CharacteristicDefinitionConfiguration,
  CharacteristicDependencyLogic,
} from '@/pages/types/variation.type';

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
  options: Array<{ id: string; value: string; active?: boolean }>;
  categoryIds?: string[];
  unavailableCategoryIds?: string[];
  categoryApplications?: Array<{
    categoryId: string;
    application: 'unavailable' | 'optional' | 'required';
  }>;
  requiredCategoryIds?: string[];
  requiredProductCategoryIds?: string[];
  groupId?: string;
  groupName?: string;
  configuration?: CharacteristicDefinitionConfiguration;
  dependency?: CharacteristicDependency | null;
  dependencyAlternatives?: CharacteristicDependency[];
  dependencyLogic?: CharacteristicDependencyLogic;
  dependencySatisfied?: boolean;
  dependencyReferenceIsVariable?: boolean;
  characteristicActive?: boolean;
  characteristicToggleDisabled?: boolean;
  isRequiredForProductEntry?: boolean;
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
