/**
 * Constantes, tópicos e ordens canônicas de exibição para Especificações Técnicas.
 */

export { SINK_CATEGORY_ID } from '../../../../../shared-utils/productSinkCategoryRules';
export { CHARACTERISTIC_GROUP_ORDER } from '../../../../../shared-utils/productCharacteristicGroupOrder';

export const REQUIRED_CHARACTERISTICS_TOPIC = 'Características principais';

export const CHARACTERISTIC_TOPICS: ReadonlyArray<{ title: string; matches: RegExp }> = [
  {
    title: 'Dimensões e Peso',
    matches:
      /\b(altura|largura|profundidade|comprimento|espessura|assento)\b|\bpeso\b(?!.*\b(?:prateleira|gaveta|suportad[oa])\b)/i,
  },
  {
    title: 'Estrutura',
    matches:
      /\b(estrutura|material da estrutura)\b|\bpeso\b(?!.*\b(?:prateleira|gaveta)\b).*\bsuportad[oa]\b/i,
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
  'espessura do tampo': 2,
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
  'quantidade de portas': 1,
  'quantidade de porta': 1,
  'tipo de portas': 2,
  'tipo de porta': 2,
  'tipo(s) de porta': 2,
  'tipo(s) de portas': 2,
  'material das portas': 3,
  'material da porta': 3,
};

/** Sequência canônica de exibição das gavetas */
export const DRAWERS_SORT_ORDER: Readonly<Record<string, number>> = {
  'quantidade de gavetas': 1,
  'quantidade de gaveta': 1,
  'tipo/material das corrediças': 2,
  'tipo/material da corrediça': 2,
  'materiais das corrediças': 2,
  'material das corrediças': 2,
  'material da corrediça': 2,
  'tipo de corrediça': 2,
  'tipo de corrediças': 2,
  corrediça: 2,
  corrediças: 2,
  'material das gavetas': 3,
  'material da gaveta': 3,
  'gavetas com chave': 4,
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
    masterField: 'Quantidade de portas',
    fieldNames: [
      'Quantidade de portas',
      'Quantidade de porta',
      'Tipo de portas',
      'Tipo de porta',
      'Material das portas',
      'Material da porta',
    ],
    description: 'Quantidade de portas, Tipo de portas e Material das portas',
  },
  {
    id: 'gavetas',
    title: 'Gavetas',
    searchKeywords: ['gaveta', 'gavetas', 'corredica', 'corredicas'],
    masterField: 'Quantidade de gavetas',
    fieldNames: [
      'Quantidade de gavetas',
      'Quantidade de gaveta',
      'Tipo/Material das corrediças',
      'Tipo/material da corrediça',
      'Materiais das corrediças',
      'Material das gavetas',
      'Material da gaveta',
    ],
    description: 'Quantidade de gavetas, Tipo/Material das corrediças e Material das gavetas',
  },
  {
    id: 'pes',
    title: 'Pés',
    searchKeywords: ['pe', 'pes', 'rodizio', 'rodizios'],
    masterField: 'Possui pés?',
    fieldNames: [
      'Possui pés?',
      'Material dos pés',
      'Material do pé',
      'Os pés são reguláveis?',
      'Possui rodízios?',
    ],
    description: 'Possui pés?, Material dos pés e regulagem',
  },
];

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
  'possui pé': 1,
  'possui pés?': 1,
  'possui pé?': 1,
  'material dos pés': 2,
  'material do pé': 2,
  'pés reguláveis': 3,
  'os pés são reguláveis?': 3,
  rodízios: 4,
  'possui rodízios?': 4,
};

/** Sequência canônica de exibição dos acessórios */
export const ACCESSORIES_SORT_ORDER: Readonly<Record<string, number>> = {
  'tipo(s) de puxador': 1,
  'tipo de puxador': 1,
  'material dos puxadores': 2,
  'material do puxador': 2,
  'quantidade de puxadores': 3,
};
