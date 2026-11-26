export const SINK_CATEGORY_ID = '1b5a4933-f762-4918-ae68-70e109e8c45d';

export interface SinkCategoryTechnicalField {
  name: string;
  categoryIds?: readonly string[] | null;
}

const normalizeCharacteristicName = (name: string): string =>
  String(name || '').trim().toLocaleLowerCase('pt-BR');

export const isStructureMaterialCharacteristic = (name: string): boolean =>
  normalizeCharacteristicName(name) === 'material da estrutura';

export const isSinkMaterialCharacteristic = (name: string): boolean =>
  normalizeCharacteristicName(name) === 'material da pia';

export const isConcretadaCharacteristic = (name: string): boolean =>
  ['concretada', 'é concretada'].includes(
    normalizeCharacteristicName(name).replace(/\?/g, '').trim()
  );

export const isHasInoxBowlCharacteristic = (name: string): boolean => {
  const normalized = normalizeCharacteristicName(name).replace(/\?/g, '').trim();
  return ['possui cuba de inox', 'possui cuba inox', 'cuba de inox', 'cuba inox'].includes(
    normalized
  );
};

export const isSinkCategory = (
  categoryIds: readonly string[] = [],
  allFields?: readonly SinkCategoryTechnicalField[]
): boolean => {
  if (categoryIds.includes(SINK_CATEGORY_ID)) return true;
  if (!allFields) return false;

  const sinkField = allFields.find(
    (field) => isSinkMaterialCharacteristic(field.name) || isConcretadaCharacteristic(field.name)
  );
  return Boolean(sinkField?.categoryIds?.some((id) => categoryIds.includes(id)));
};
