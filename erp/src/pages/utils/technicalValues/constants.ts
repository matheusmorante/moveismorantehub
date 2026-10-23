/**
 * Constantes, tópicos e ordens canônicas de exibição para Especificações Técnicas.
 */

export { SINK_CATEGORY_ID } from '../../../../../shared-utils/productSinkCategoryRules';

export const REQUIRED_CHARACTERISTICS_TOPIC = 'Características principais';

export const CHARACTERISTIC_TOPICS: ReadonlyArray<{ title: string; matches: RegExp }> = [
  {
    title: 'Dimensões e Peso',
    matches:
      /\b(altura|largura|profundidade|comprimento|espessura|assento)\b|\bpeso\b(?!.*(prateleira|gaveta))/i,
  },
  { title: 'Estrutura', matches: /\b(estrutura|material da estrutura)\b/i },
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
  { title: 'Materiais e acabamento', matches: /\b(material|acabamento|madeira|metal|vidro)\b/i },
];

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

export const PRIMARY_CHARACTERISTIC_NAMES = [
  ...GLOBAL_REQUIRED_ATTRIBUTE_NAMES,
  'Modelo/Linha',
  'Comprimento total',
  'Comprimento',
] as const;

export const MATTRESS_CATEGORY_ID = '3b616449-7d0c-40fc-9917-70a20836f3b8';

/** Sequência canônica de exibição das medidas e pesos */
export const DIMENSIONS_SORT_ORDER: Readonly<Record<string, number>> = {
  'altura total': 1,
  altura: 1,
  espessura: 2,
  'espessura do colchão': 2,
  'largura total': 3,
  largura: 3,
  'profundidade total': 4,
  profundidade: 4,
  'comprimento total': 5,
  comprimento: 5,
  'profundidade fechado': 6,
  'profundidade aberto': 7,
  'altura do assento ao chão': 8,
  'altura do chão até o assento': 8,
  peso: 9,
  'peso suportado': 10,
};

/** Sequência canônica de exibição das portas */
export const DOORS_SORT_ORDER: Readonly<Record<string, number>> = {
  'possui portas': 1,
  'possui porta': 1,
  'quantidade de portas': 2,
  'quantidade de porta': 2,
  'tipo de portas': 3,
  'tipo de porta': 3,
  'tipo(s) de porta': 3,
  'tipo(s) de portas': 3,
  'material das portas': 4,
  'material da porta': 4,
};

/** Sequência canônica de exibição das gavetas */
export const DRAWERS_SORT_ORDER: Readonly<Record<string, number>> = {
  'possui gavetas': 1,
  'possui gaveta': 1,
  'quantidade de gavetas': 2,
  'quantidade de gaveta': 2,
  'tipo/material das corrediças': 3,
  'tipo/material da corrediça': 3,
  'materiais das corrediças': 3,
  'material das corrediças': 3,
  'material da corrediça': 3,
  'tipo de corrediça': 3,
  'tipo de corrediças': 3,
  corrediça: 3,
  corrediças: 3,
  'material das gavetas': 4,
  'material da gaveta': 4,
  'gavetas com chave': 5,
};

export interface CharacteristicTopicGroupDefinition {
  id: string;
  title: string;
  searchKeywords: string[];
  masterField: string;
  fieldNames: string[];
  description: string;
}

export const CHARACTERISTIC_TOPIC_GROUPS: ReadonlyArray<CharacteristicTopicGroupDefinition> = [
  {
    id: 'portas',
    title: 'Portas',
    searchKeywords: ['porta', 'portas'],
    masterField: 'Possui portas',
    fieldNames: [
      'Possui portas',
      'Quantidade de portas',
      'Quantidade de porta',
      'Tipo de portas',
      'Tipo de porta',
      'Material das portas',
      'Material da porta',
    ],
    description: 'Possui portas, Quantidade de portas, Tipo de portas e Material das portas',
  },
  {
    id: 'gavetas',
    title: 'Gavetas',
    searchKeywords: ['gaveta', 'gavetas', 'corredica', 'corredicas'],
    masterField: 'Possui gavetas',
    fieldNames: [
      'Possui gavetas',
      'Quantidade de gavetas',
      'Quantidade de gaveta',
      'Tipo/Material das corrediças',
      'Tipo/material da corrediça',
      'Materiais das corrediças',
      'Material das gavetas',
      'Material da gaveta',
    ],
    description: 'Possui gavetas, Quantidade de gavetas, Tipo/Material das corrediças e Material das gavetas',
  },
  {
    id: 'pes',
    title: 'Pés',
    searchKeywords: ['pe', 'pes', 'rodizio', 'rodizios'],
    masterField: 'Possui pés',
    fieldNames: [
      'Possui pés',
      'Quantidade de pés',
      'Quantidade de pé',
      'Material dos pés',
      'Material do pé',
      'Pés reguláveis',
      'Rodízios',
    ],
    description: 'Possui pés, Quantidade de pés e Material dos pés',
  },
];

/** Sequência canônica de exibição das prateleiras */
export const SHELVES_SORT_ORDER: Readonly<Record<string, number>> = {
  'quantidade de prateleiras': 1,
  'material das prateleiras': 2,
  'peso suportado por prateleira': 3,
};

/** Sequência canônica de exibição dos pés */
export const FEET_SORT_ORDER: Readonly<Record<string, number>> = {
  'possui pés': 1,
  'possui pé': 1,
  'quantidade de pés': 2,
  'quantidade de pé': 2,
  'material dos pés': 3,
  'material do pé': 3,
  'pés reguláveis': 4,
  rodízios: 5,
};

/** Sequência canônica de exibição dos acessórios */
export const ACCESSORIES_SORT_ORDER: Readonly<Record<string, number>> = {
  'tipo(s) de puxador': 1,
  'tipo de puxador': 1,
  'material dos puxadores': 2,
  'material do puxador': 2,
  'quantidade de puxadores': 3,
};
