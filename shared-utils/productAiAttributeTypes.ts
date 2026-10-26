const MEASURE_ATTRIBUTE_NAMES = new Set([
  'altura',
  'altura total',
  'largura',
  'largura total',
  'profundidade',
  'profundidade total',
  'comprimento',
  'comprimento total',
  'espessura',
  'espessura do colchão',
  'profundidade fechado',
  'profundidade aberto',
  'altura do assento ao chão',
  'altura do chão até o assento',
]);

export const isProductMeasureCharacteristic = (name: string): boolean =>
  MEASURE_ATTRIBUTE_NAMES.has(name.trim().toLocaleLowerCase('pt-BR'));

/** Mantém o mesmo tipo efetivo que o ERP envia ao prompt do assistente. */
export const resolveProductAiAttributeDataType = (
  name: string,
  dataType: string | null | undefined
): string => (isProductMeasureCharacteristic(name) ? 'measure' : dataType || 'list');
