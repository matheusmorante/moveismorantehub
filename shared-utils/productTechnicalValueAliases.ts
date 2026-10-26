/**
 * Candidate names for reading technical-value aliases stored by older product forms.
 * Keep the candidate order stable: an explicitly stored canonical override (including
 * an empty value) takes precedence over legacy aliases, matching ERP variation rules.
 */
const normalizeTechnicalValueFieldName = (value: unknown) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const normalizeCombinedModelLineAlias = (value: unknown) =>
  normalizeTechnicalValueFieldName(value).replace(/\s/g, '');

const COMBINED_MODEL_LINE_ALIASES = new Set(['modelo/linha', 'linha/modelo']);

export const isCombinedProductModelLineAlias = (name: string): boolean =>
  COMBINED_MODEL_LINE_ALIASES.has(normalizeCombinedModelLineAlias(name));

export const getProductTechnicalValueFieldIdentity = (name: string): string =>
  isCombinedProductModelLineAlias(name)
    ? 'modelo/linha'
    : name.trim().toLocaleLowerCase('pt-BR');

export const getCanonicalProductTechnicalValueFieldName = (name: string): string =>
  isCombinedProductModelLineAlias(name) ? 'Modelo/Linha' : name.trim();

export const getProductTechnicalValueFieldAliasRank = (name: string): number =>
  !isCombinedProductModelLineAlias(name)
    ? 0
    : normalizeCombinedModelLineAlias(name).startsWith('modelo/')
      ? 0
      : 1;

type TechnicalValueFieldDefinitionLike = {
  readonly id?: string;
  readonly name: string;
  readonly categoryIds?: readonly unknown[];
  readonly requiredCategoryIds?: readonly unknown[];
  readonly options?: readonly { readonly value?: unknown }[];
  readonly active?: boolean | null;
  readonly isCustom?: boolean;
  readonly is_custom?: boolean;
  readonly isRequired?: boolean;
  readonly isRequiredForProduct?: boolean;
  readonly isRequiredForCatalog?: boolean;
};

const mergeStringIds = (
  definitions: readonly TechnicalValueFieldDefinitionLike[],
  property: 'categoryIds' | 'requiredCategoryIds'
) =>
  [
    ...new Set(
      definitions.flatMap((definition) =>
        Array.isArray(definition[property])
          ? definition[property]!.map((value) => String(value ?? '').trim()).filter(Boolean)
          : []
      )
    ),
  ].sort((left, right) => left.localeCompare(right, 'en'));

const mergeOptions = (definitions: readonly TechnicalValueFieldDefinitionLike[]) => {
  const seenValues = new Set<string>();
  return definitions.flatMap((definition) =>
    Array.isArray(definition.options)
      ? definition.options.filter((option) => {
          const value = String(option?.value ?? '').trim();
          const key = normalizeTechnicalValueFieldName(value);
          if (seenValues.has(key)) return false;
          seenValues.add(key);
          return true;
        })
      : []
  );
};

/**
 * Global attributes can contain two records that are aliases of the same
 * combined model/line field. Keep one stable form field while retaining all
 * category links and option values.
 */
export const deduplicateProductTechnicalValueAliasFields = <
  T extends TechnicalValueFieldDefinitionLike,
>(fields: readonly T[]): T[] => {
  const positions = new Map<string, number>();
  const aliasesByIdentity = new Map<string, T[]>();
  const result: Array<T | null> = [];

  fields.forEach((field) => {
    if (!isCombinedProductModelLineAlias(field.name)) {
      result.push(field);
      return;
    }

    const identity = getProductTechnicalValueFieldIdentity(field.name);
    const existing = aliasesByIdentity.get(identity);
    if (existing) {
      existing.push(field);
      return;
    }

    positions.set(identity, result.length);
    aliasesByIdentity.set(identity, [field]);
    result.push(null);
  });

  for (const [identity, definitions] of aliasesByIdentity) {
    const ordered = [...definitions].sort((left, right) => {
      const rankDifference =
        getProductTechnicalValueFieldAliasRank(left.name) -
        getProductTechnicalValueFieldAliasRank(right.name);
      if (rankDifference !== 0) return rankDifference;
      return String(left.id ?? '').localeCompare(String(right.id ?? ''), 'en');
    });
    const preferred = ordered[0];
    const merged: Record<string, unknown> = {
      ...preferred,
      name: getCanonicalProductTechnicalValueFieldName(preferred.name),
      categoryIds: mergeStringIds(ordered, 'categoryIds'),
      requiredCategoryIds: mergeStringIds(ordered, 'requiredCategoryIds'),
      options: mergeOptions(ordered),
    };

    if (ordered.some((definition) => definition.active === true)) merged.active = true;
    else if (ordered.every((definition) => definition.active === false)) merged.active = false;
    for (const property of [
      'isCustom',
      'is_custom',
      'isRequired',
      'isRequiredForProduct',
      'isRequiredForCatalog',
    ] as const) {
      if (ordered.some((definition) => definition[property] === true)) merged[property] = true;
    }

    result[positions.get(identity)!] = merged as T;
  }

  return result.filter((field): field is T => field !== null);
};

export const getProductTechnicalValueCandidateKeys = (key: string): string[] => {
  const normalized = key.trim().toLocaleLowerCase('pt-BR');
  if (
    normalized === 'modelo/linha' ||
    normalized === 'modelo / linha' ||
    normalized === 'linha/modelo' ||
    normalized === 'linha / modelo'
  ) {
    return [
      key,
      'Modelo/Linha',
      'modelo/linha',
      'Linha/Modelo',
      'linha/modelo',
      'Modelo',
      'modelo',
      'Linha',
      'linha',
    ];
  }
  if (normalized === 'modelo') {
    return [
      key,
      'Modelo',
      'modelo',
      'Modelo/Linha',
      'modelo/linha',
      'Linha/Modelo',
      'linha/modelo',
      'Linha',
      'linha',
    ];
  }
  if (normalized === 'linha') {
    return [
      key,
      'Linha',
      'linha',
      'Modelo/Linha',
      'modelo/linha',
      'Linha/Modelo',
      'linha/modelo',
      'Modelo',
      'modelo',
    ];
  }
  return [key];
};

export const findProductTechnicalValueEntry = (
  values: Readonly<Record<string, unknown>>,
  key: string
): { key: string; value: unknown } | undefined => {
  const entries = Object.entries(values);
  for (const candidate of getProductTechnicalValueCandidateKeys(key)) {
    const normalizedCandidate = candidate.trim().toLocaleLowerCase('pt-BR');
    const matchingEntry = entries.find(
      ([entryKey]) => entryKey.trim().toLocaleLowerCase('pt-BR') === normalizedCandidate
    );
    if (
      matchingEntry &&
      matchingEntry[1] !== undefined &&
      matchingEntry[1] !== null
    ) {
      return { key: matchingEntry[0], value: matchingEntry[1] };
    }
  }
  return undefined;
};
