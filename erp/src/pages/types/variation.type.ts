export type AttributeDataType =
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

export type CharacteristicFillType =
  | 'text_short'
  | 'text_long'
  | 'radio'
  | 'multi_select'
  | 'boolean'
  | 'integer'
  | 'decimal';

export type CharacteristicFillConfiguration = {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  minSelections?: number;
  maxSelections?: number;
};

export type CharacteristicDependencyLogic = 'all' | 'any';
export type CharacteristicDefinitionConfiguration = CharacteristicFillConfiguration & {
  dependencyLogic?: CharacteristicDependencyLogic;
};

export type CharacteristicDependencyOperator =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_or_equal'
  | 'less_than'
  | 'less_or_equal';

export type CharacteristicDependency = {
  referenceAttributeId: string;
  operator: CharacteristicDependencyOperator;
  value: string;
};

export type CharacteristicCategoryApplication = 'unavailable' | 'optional' | 'required';

export type CharacteristicGroup = {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
};

export type CategoryApplication = {
  categoryId: string;
  application: CharacteristicCategoryApplication;
};

export type CategoryAttribute = {
  categoryId: string;
  isRequired: boolean;
};

export type VariationOption = {
  id: string;
  value: string; // Ex: "Azul"
  sortOrder?: number;
  active?: boolean;
};

export type VariationType = {
  id?: string;
  name: string; // Ex: "Cor"
  options: VariationOption[];
  active: boolean;
  dataType?: AttributeDataType;
  unit?: string;
  decimalPlaces?: 1 | 2 | 3;
  isGloballyRequired?: boolean;
  isCustom?: boolean;
  categoryAttributes?: CategoryAttribute[];
  categoryApplications?: CategoryApplication[];
  groupId?: string;
  configuration?: CharacteristicDefinitionConfiguration;
  dependencyLogic?: CharacteristicDependencyLogic;
  dependency?: CharacteristicDependency | null;
  dependencyAlternatives?: CharacteristicDependency[];
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type VariationVisibilitySettings = {
  id: boolean;
  name: boolean;
  options: boolean;
  actions: boolean;
};

export default VariationType;
