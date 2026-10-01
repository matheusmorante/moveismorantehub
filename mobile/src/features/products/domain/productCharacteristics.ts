/** Características sem opção de desligar, conforme a regra canônica do ERP. */
export const REQUIRED_CHARACTERISTIC_NAMES = ['Cor', 'Material da estrutura'] as const;

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('pt-BR');

export const isRequiredCharacteristicName = (name: string) =>
  REQUIRED_CHARACTERISTIC_NAMES.some((requiredName) => normalizeName(requiredName) === normalizeName(name));

export const getEffectiveVariationTechnicalValues = (
  parentValues: Record<string, unknown> = {},
  variation: any = {}
): Record<string, unknown> => {
  const valuesByName = new Map<string, unknown>();
  Object.entries(parentValues).forEach(([name, value]) => valuesByName.set(normalizeName(name), value));

  let attributes = variation?.attributes;
  if (typeof attributes === 'string' && attributes.trim()) {
    try {
      attributes = JSON.parse(attributes);
    } catch {
      attributes = undefined;
    }
  }
  const legacyValues = Array.isArray(attributes)
    ? attributes.reduce<Record<string, unknown>>((result, attribute) => {
        const name = String(attribute?.name || attribute?.attribute || attribute?.key || '').trim();
        const value = attribute?.value ?? attribute?.val;
        if (name && value !== undefined && value !== null) result[name] = value;
        return result;
      }, {})
    : attributes && typeof attributes === 'object'
      ? attributes
      : {};

  [legacyValues, variation?.technicalValues || {}].forEach((source) => {
    Object.entries(source).forEach(([name, value]) => {
      if (value !== undefined && value !== null) valuesByName.set(normalizeName(name), value);
    });
  });

  return Object.fromEntries(valuesByName);
};

export const getMissingRequiredCharacteristics = (values: Record<string, unknown> = {}) => {
  const valuesByName = new Map<string, unknown>();
  Object.entries(values).forEach(([name, value]) => valuesByName.set(normalizeName(name), value));
  return REQUIRED_CHARACTERISTIC_NAMES.filter((name) => {
    const value = String(valuesByName.get(normalizeName(name)) ?? '')
      .trim()
      .toLocaleLowerCase('pt-BR');
    return !value || ['não se aplica', 'nao se aplica', 'n/a'].includes(value);
  });
};
