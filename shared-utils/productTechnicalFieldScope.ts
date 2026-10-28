/** Regras de categoria e rótulos para características técnicas com escopo específico. */
const normalizeTechnicalRuleName = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isSofaCategoryName = (name: string): boolean =>
  /(?:^|[^a-z0-9])sofas?(?=$|[^a-z0-9])/.test(normalizeTechnicalRuleName(name));

export const isSofaRetractableCharacteristic = (name: string): boolean =>
  /^(?:(?:e|possui)\s+)?retratil$/.test(normalizeTechnicalRuleName(name));

const isRecliningCharacteristic = (name: string): boolean =>
  /^(?:(?:e|possui)\s+)?reclinavel$/.test(normalizeTechnicalRuleName(name));

export const isSofaRetractableDependentCharacteristic = (name: string): boolean => {
  const normalized = normalizeTechnicalRuleName(name);
  return normalized === 'profundidade aberto' || normalized === 'profundidade fechado';
};

export const isCountertopIncludedCharacteristic = (name: string): boolean =>
  /^(?:acompanha\s+tampo|acompanha\s+tampo\s+reto)$/.test(
    normalizeTechnicalRuleName(name)
  );

export const isCountertopMaterialCharacteristic = (name: string): boolean =>
  normalizeTechnicalRuleName(name) === 'material do tampo';

export const isKitchenCountertopCategoryName = (name: string): boolean => {
  const normalized = normalizeTechnicalRuleName(name);
  return (
    /\bcozinhas?\s+compactas?\b/.test(normalized) ||
    /\bcozinhas?\s+moduladas?\b/.test(normalized) ||
    /\bcozinhas?\s+moduladas?\s+e\s+compactas?\b/.test(normalized) ||
    /\bbalc(?:ao|oes)\s+para\s+pia\b/.test(normalized)
  );
};

export const isTechnicalFieldAllowedForCategories = (
  fieldName: string,
  categoryNames: readonly string[] = [],
  categoryApplications?: readonly {
    categoryId: string;
    application: 'unavailable' | 'optional' | 'required';
  }[],
  categoryIds: readonly string[] = []
): boolean => {
  const selectedIds = new Set(categoryIds.map(String));
  const configured = categoryApplications?.filter((item) =>
    selectedIds.has(String(item.categoryId))
  ) ?? [];
  if (configured.length > 0) {
    return configured.some((item) => item.application !== 'unavailable');
  }

  if (
    isSofaRetractableCharacteristic(fieldName) ||
    isSofaRetractableDependentCharacteristic(fieldName)
  ) {
    return categoryNames.some(isSofaCategoryName);
  }

  if (
    isCountertopIncludedCharacteristic(fieldName) ||
    isCountertopMaterialCharacteristic(fieldName)
  ) {
    return categoryNames.some(isKitchenCountertopCategoryName);
  }

  return true;
};

export const areTechnicalCharacteristicNamesEquivalent = (
  left: string,
  right: string
): boolean => {
  if (isSofaRetractableCharacteristic(left) && isSofaRetractableCharacteristic(right)) {
    return true;
  }
  if (isRecliningCharacteristic(left) && isRecliningCharacteristic(right)) return true;
  if (
    isCountertopIncludedCharacteristic(left) &&
    isCountertopIncludedCharacteristic(right)
  ) {
    return true;
  }
  return normalizeTechnicalRuleName(left) === normalizeTechnicalRuleName(right);
};

export const getTechnicalFieldDisplayName = (name: string): string => {
  if (isSofaRetractableCharacteristic(name)) return 'É retrátil?';
  if (isRecliningCharacteristic(name)) return 'É reclinável?';
  return name;
};
