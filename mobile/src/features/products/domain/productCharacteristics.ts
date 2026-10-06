/** Características sem opção de desligar, conforme a regra canônica do ERP. */
export const REQUIRED_CHARACTERISTIC_NAMES = ['Cor', 'Material da estrutura'] as const;

export interface ProductCharacteristicAttribute {
  name: string;
  value: unknown;
  showName: boolean;
}

export interface ProductTechnicalField {
  name: string;
  isRequired?: boolean;
  is_globally_required?: boolean;
  requiredForCategory?: boolean;
  isCustom?: boolean;
  is_custom?: boolean;
  categoryIds?: readonly string[];
}

export interface ProductTechnicalFieldGroup<
  T extends ProductTechnicalField = ProductTechnicalField,
> {
  title: string;
  fields: T[];
}

const normalizeName = (name: string) =>
  String(name || '')
    .trim()
    .toLocaleLowerCase('pt-BR');

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string' || !value.trim()) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const readStructuredValue = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const structured = value as { value?: unknown; val?: unknown };
  return structured.value ?? structured.val;
};

/** Lê os formatos atuais e legados de atributos sem perder a preferência showName. */
export const getProductCharacteristicAttributes = (
  rawAttributes: unknown
): ProductCharacteristicAttribute[] => {
  const attributes = parseJson(rawAttributes);

  if (Array.isArray(attributes)) {
    return attributes
      .map((attribute: any) => ({
        name: String(attribute?.name || attribute?.attribute || attribute?.key || '').trim(),
        value: attribute?.value ?? attribute?.val,
        showName: attribute?.showName !== false,
      }))
      .filter(
        (attribute) => attribute.name && attribute.value !== undefined && attribute.value !== null
      );
  }

  if (attributes && typeof attributes === 'object') {
    return Object.entries(attributes)
      .map(([name, rawValue]) => {
        const value = readStructuredValue(rawValue);
        return {
          name: name.trim(),
          value,
          showName:
            !rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)
              ? true
              : (rawValue as { showName?: boolean }).showName !== false,
        };
      })
      .filter(
        (attribute) => attribute.name && attribute.value !== undefined && attribute.value !== null
      );
  }

  return [];
};

/** Atualiza valor sem apagar a opção de ocultar a característica do nome da variação. */
export const upsertProductCharacteristicAttribute = (
  rawAttributes: unknown,
  name: string,
  value: unknown
): ProductCharacteristicAttribute[] => {
  const next = getProductCharacteristicAttributes(rawAttributes);
  const normalizedName = normalizeName(name);
  const index = next.findIndex((attribute) => normalizeName(attribute.name) === normalizedName);

  if (!String(value ?? '').trim()) {
    if (index >= 0) next.splice(index, 1);
    return next;
  }

  const existing = index >= 0 ? next[index] : undefined;
  const updated = {
    ...existing,
    name,
    value: String(value),
    showName: existing?.showName ?? true,
  };
  if (index >= 0) next[index] = updated;
  else next.push(updated);
  return next;
};

const toTechnicalValuesMap = (source: unknown): Record<string, unknown> => {
  const parsed = parseJson(source);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed).map(([name, value]) => [name, readStructuredValue(value)])
  );
};

const normalizeValues = (values: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([name, value]) => normalizeName(name) && value !== undefined && value !== null)
      .map(([name, value]) => [normalizeName(name), value])
  );

export const isRequiredCharacteristicName = (name: string) =>
  REQUIRED_CHARACTERISTIC_NAMES.some(
    (requiredName) => normalizeName(requiredName) === normalizeName(name)
  );

/** Valores do produto pai: atributos legados e, depois, technicalValues como fonte prioritária. */
export const getEffectiveProductTechnicalValues = (product: any = {}) => {
  const legacyValues = Object.fromEntries(
    getProductCharacteristicAttributes(product?.attributes).map(({ name, value }) => [name, value])
  );
  const technicalValues = {
    ...toTechnicalValuesMap(product?.technical_specs?.technicalValues),
    ...toTechnicalValuesMap(product?.technicalValues),
  };

  return normalizeValues({ ...legacyValues, ...technicalValues });
};

/** Mescla fontes técnicas na ordem de prioridade sem alterar os rótulos salvos pelo ERP. */
export const getPersistableProductTechnicalValues = (
  product: any = {}
): Record<string, unknown> => {
  const legacyValues = Object.fromEntries(
    getProductCharacteristicAttributes(product?.attributes).map(({ name, value }) => [name, value])
  );
  const sources = [
    legacyValues,
    toTechnicalValuesMap(product?.technical_specs?.technicalValues),
    toTechnicalValuesMap(product?.technicalValues),
  ];
  const result: Record<string, unknown> = {};

  for (const source of sources) {
    for (const [name, value] of Object.entries(source)) {
      const previousName = Object.keys(result).find(
        (existingName) => normalizeName(existingName) === normalizeName(name)
      );
      if (previousName && previousName !== name) delete result[previousName];
      result[name] = value;
    }
  }

  return result;
};

/**
 * Mescla pai, atributos de versões antigas e sobrescritas da variação.
 * A variação vence, inclusive quando a sobrescrita foi definida como vazia.
 */
export const getEffectiveVariationTechnicalValues = (
  parentValues: Record<string, unknown> = {},
  variation: any = {}
): Record<string, unknown> => {
  const variationAttributes = Object.fromEntries(
    getProductCharacteristicAttributes(variation?.attributes).map(({ name, value }) => [
      name,
      value,
    ])
  );
  const variationTechnicalValues = toTechnicalValuesMap(variation?.technicalValues);

  return normalizeValues({
    ...parentValues,
    ...variationAttributes,
    ...variationTechnicalValues,
  });
};

export const getTechnicalValue = (values: Record<string, unknown> = {}, name: string) => {
  const normalizedName = normalizeName(name);
  const matchingEntry = Object.entries(values).find(
    ([key]) => normalizeName(key) === normalizedName
  );
  return matchingEntry?.[1];
};

export const hasTechnicalValue = (values: Record<string, unknown> = {}, name: string) =>
  Object.keys(values).some((key) => normalizeName(key) === normalizeName(name));

const CHARACTERISTIC_TOPICS: Array<{ title: string; matches: RegExp }> = [
  { title: 'Dimensões e peso', matches: /\b(altura|largura|profundidade|comprimento|peso)\b/i },
  { title: 'Tecido e revestimento', matches: /\b(tecido|revestimento|espuma|densidade|estofad)/i },
  {
    title: 'Estrutura',
    matches: /\b(estrutura|material da estrutura|tipo de portas|quantidade de portas)\b/i,
  },
  {
    title: 'Funcionalidades',
    matches: /\b(espelho|porta|gaveta|deslizamento|mecanismo|retr[aá]til|extens[íi]vel)\b/i,
  },
  { title: 'Acessórios', matches: /\b(p[eé]s?|puxador|rod[ií]zio|sapata)\b/i },
  {
    title: 'Materiais e acabamento',
    matches: /\b(material|acabamento|cor|madeira|metal|vidro)\b/i,
  },
];

/** Mantém a mesma seleção de campos do ERP e a exclusividade Profundidade/Comprimento. */
export const getApplicableProductTechnicalFields = <T extends ProductTechnicalField>(
  allFields: readonly T[],
  categoryIds: readonly string[] = [],
  values: Record<string, unknown> = {},
  manuallyAddedFieldNames: readonly string[] = []
): T[] => {
  const activeCategories = new Set(categoryIds.map(String));
  const manualNames = new Set(manuallyAddedFieldNames.map(normalizeName));

  let applicable = allFields.filter((field) => {
    if (field.isRequired ?? isRequiredCharacteristicName(field.name)) return true;
    if (hasTechnicalValue(values, field.name)) return true;
    if (manualNames.has(normalizeName(field.name))) return true;
    return Boolean(field.categoryIds?.some((id) => activeCategories.has(String(id))));
  });

  const depthField = applicable.find((field) => normalizeName(field.name) === 'profundidade');
  const lengthField = applicable.find((field) => normalizeName(field.name) === 'comprimento');

  if (depthField && lengthField) {
    const depthValue = String(getTechnicalValue(values, depthField.name) ?? '').trim();
    const lengthValue = String(getTechnicalValue(values, lengthField.name) ?? '').trim();
    let activeName = normalizeName(depthField.name);

    if (
      manualNames.has(normalizeName(lengthField.name)) &&
      !manualNames.has(normalizeName(depthField.name))
    ) {
      activeName = normalizeName(lengthField.name);
    } else if (
      manualNames.has(normalizeName(depthField.name)) &&
      !manualNames.has(normalizeName(lengthField.name))
    ) {
      activeName = normalizeName(depthField.name);
    } else if (lengthValue && !depthValue) {
      activeName = normalizeName(lengthField.name);
    } else if (depthValue && !lengthValue) {
      activeName = normalizeName(depthField.name);
    } else if (
      hasTechnicalValue(values, lengthField.name) &&
      !hasTechnicalValue(values, depthField.name)
    ) {
      activeName = normalizeName(lengthField.name);
    }

    applicable = applicable.filter((field) => {
      const name = normalizeName(field.name);
      return (name !== 'profundidade' && name !== 'comprimento') || name === activeName;
    });
  }

  return applicable;
};

/** Agrupa os campos como no ERP e mantém a ordem das dimensões. */
export const groupProductTechnicalFields = <T extends ProductTechnicalField>(
  fields: readonly T[]
): ProductTechnicalFieldGroup<T>[] => {
  const groups = new Map<string, T[]>();
  const otherFields: T[] = [];

  fields.forEach((field) => {
    if (field.isCustom === true || field.is_custom === true) {
      otherFields.push(field);
      return;
    }
    const topic = CHARACTERISTIC_TOPICS.find((candidate) => candidate.matches.test(field.name));
    if (!topic) {
      otherFields.push(field);
      return;
    }
    groups.set(topic.title, [...(groups.get(topic.title) || []), field]);
  });

  const dimensionsOrder: Record<string, number> = {
    altura: 1,
    largura: 2,
    profundidade: 3,
    comprimento: 4,
    peso: 5,
  };

  return [
    ...CHARACTERISTIC_TOPICS.flatMap(({ title }) => {
      const groupedFields = groups.get(title);
      if (!groupedFields?.length) return [];
      if (title === 'Dimensões e peso') {
        groupedFields.sort(
          (left, right) =>
            (dimensionsOrder[normalizeName(left.name)] ?? 99) -
            (dimensionsOrder[normalizeName(right.name)] ?? 99)
        );
      }
      return [{ title, fields: groupedFields }];
    }),
    ...(otherFields.length ? [{ title: 'Outras características', fields: otherFields }] : []),
  ];
};

export const getMissingRequiredCharacteristics = (values: Record<string, unknown> = {}) => {
  return REQUIRED_CHARACTERISTIC_NAMES.filter((name) => {
    const value = String(getTechnicalValue(values, name) ?? '')
      .trim()
      .toLocaleLowerCase('pt-BR');
    return !value || ['não se aplica', 'nao se aplica', 'n/a'].includes(value);
  });
};
