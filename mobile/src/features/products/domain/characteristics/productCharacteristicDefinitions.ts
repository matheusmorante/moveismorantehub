
// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

export interface ProductCharacteristicAttribute {
  name: string;
  value: unknown;
  showName: boolean;
}

export interface ProductTechnicalCharacteristicDependency {
  referenceAttributeId: string;
  operator:
    | 'contains'
    | 'not_contains'
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'greater_or_equal'
    | 'less_than'
    | 'less_or_equal';
  value: string;
}

export interface ProductTechnicalField {
  id?: string;
  name: string;
  active?: boolean | null;
  isRequired?: boolean;
  isRequiredForProduct?: boolean;
  isRequiredForCatalog?: boolean;
  is_globally_required?: boolean;
  requiredForCategory?: boolean;
  requiredCategoryIds?: readonly string[];
  isCustom?: boolean;
  is_custom?: boolean;
  categoryIds?: readonly string[];
  groupId?: string;
  groupName?: string;
  categoryApplications?: readonly {
    categoryId: string;
    application: 'unavailable' | 'optional' | 'required';
  }[];
  decimal_places?: 1 | 2 | 3 | null;
  data_type?: string | null;
  dependency?: ProductTechnicalCharacteristicDependency | null;
  dependencyAlternatives?: readonly ProductTechnicalCharacteristicDependency[];
  dependencyLogic?: 'all' | 'any';
}

export interface ProductTechnicalFieldGroup<
  T extends ProductTechnicalField = ProductTechnicalField,
> {
  title: string;
  fields: T[];
}

// ============================================================================
// 2. CONSTANTS & TOPIC DEFINITIONS
// ============================================================================

export const REQUIRED_DIMENSION_NAMES = [
  'Altura total',
  'Largura total',
  'Profundidade total',
  'Altura',
  'Largura',
  'Profundidade',
] as const;

export const REQUIRED_CHARACTERISTIC_NAMES = ['Cor', 'Modelo', 'Marca'] as const;

export const GLOBAL_REQUIRED_ATTRIBUTE_NAMES = [
  ...REQUIRED_CHARACTERISTIC_NAMES,
  ...REQUIRED_DIMENSION_NAMES,
] as const;

export const MATTRESS_CATEGORY_ID = '3b616449-7d0c-40fc-9917-70a20836f3b8';

export const CHARACTERISTIC_TOPICS: ReadonlyArray<{ title: string; matches: RegExp }> = [
  {
    title: 'Medidas e peso',
    matches:
      /\b(altura|largura|profundidade|comprimento|espessura|assento)\b|\bpeso\b(?!.*\b(?:prateleira|gaveta|suportad[oa])\b)/i,
  },
  {
    title: 'Estrutura',
    matches: /\b(estrutura|material da estrutura)\b|\bpeso\b(?!.*\b(?:prateleira|gaveta)\b).*\bsuportad[oa]\b/i,
  },
  { title: 'Portas', matches: /\b(portas?)\b/i },
  { title: 'Gavetas', matches: /\b(gavetas?|corredi[çc]as?)\b/i },
  { title: 'Prateleiras', matches: /\b(prateleiras?)\b/i },
  { title: 'Pés', matches: /\b(p[eé]s?|rod[ií]zios?)\b/i },
  { title: 'Tecido e revestimento', matches: /\b(tecido|revestimento|espuma|densidade|estofad)/i },
  {
    title: 'Funcionalidades',
    matches:
      /\b(espelhos?|deslizamento|mecanismo|retr[aá]til|extens[íi]vel|cabideiros?|calceiros?|maleiros?|usb|led)\b/i,
  },
  { title: 'Acessórios', matches: /\b(puxador(es)?)\b/i },
  {
    title: 'Materiais e acabamento',
    matches: /\b(material|acabamento|cor|madeira|metal|vidro)\b/i,
  },
];

/** Sequência canônica de exibição das medidas e pesos */
export const DIMENSIONS_SORT_ORDER: Readonly<Record<string, number>> = {
  'altura total': 1,
  altura: 1,
  espessura: 2,
  'espessura do colchão': 2,
  'espessura do tampo': 2,
  'espessura do tampo da mesa': 2,
  'largura total': 3,
  largura: 3,
  'largura do tampo da mesa': 3,
  'profundidade total': 4,
  profundidade: 4,
  'profundidade do tampo da mesa': 4,
  'comprimento total': 5,
  comprimento: 5,
  'profundidade fechado': 6,
  'profundidade aberto': 7,
  'altura do assento ao chão': 8,
  'altura do chão até o assento': 8,
  peso: 9,
};

/** Sequência canônica de exibição das portas */
export const DOORS_SORT_ORDER: Readonly<Record<string, number>> = {
  'possui portas': 1,
  'possui porta': 1,
  'possui portas?': 1,
  'possui porta?': 1,
  'quantidade de portas': 2,
  'quantidade de porta': 2,
  'tipo de portas': 3,
  'tipo de porta': 3,
  'material das portas': 4,
  'material da porta': 4,
};

/** Sequência canônica de exibição das gavetas */
export const DRAWERS_SORT_ORDER: Readonly<Record<string, number>> = {
  'possui gavetas': 1,
  'possui gaveta': 1,
  'possui gavetas?': 1,
  'possui gaveta?': 1,
  'quantidade de gavetas': 2,
  'quantidade de gaveta': 2,
  'materiais das corrediças': 3,
  'material das corrediças': 3,
  'material da corrediça': 3,
  'tipo/material da corrediça': 3,
  'tipo/material das corrediças': 3,
  'tipo de corrediça': 3,
  'tipo de corrediças': 3,
  corrediça: 3,
  corrediças: 3,
  'material das gavetas': 4,
  'material da gaveta': 4,
  'gavetas com chave': 5,
};

/** Sequência canônica de exibição das prateleiras */
export const SHELVES_SORT_ORDER: Readonly<Record<string, number>> = {
  'quantidade de prateleiras': 1,
  'material das prateleiras': 2,
  'peso suportado por prateleira': 3,
  'peso suportado': 3,
};

/** Sequência canônica de exibição dos pés */
export const FEET_SORT_ORDER: Readonly<Record<string, number>> = {
  'possui pés': 1,
  'possui pés?': 1,
  'quantidade de pés': 2,
  'material dos pés': 3,
  'pés reguláveis': 4,
  'os pés são reguláveis?': 4,
  rodízios: 5,
  'possui rodízios?': 5,
};

/** Sequência canônica de exibição dos acessórios */
export const ACCESSORIES_SORT_ORDER: Readonly<Record<string, number>> = {
  'tipo de puxador': 1,
  'material dos puxadores': 2,
  'material do puxador': 2,
  'quantidade de puxadores': 3,
};

