import { isQuantityCharacteristic } from '../productCharacteristicDependencies';

export const normalizeCharacteristicName = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

export const normalizeCharacteristicKey = (value: unknown): string =>
  normalizeCharacteristicName(value).replace(/[\s/?¿]+/g, '');

export const isCatalogCoreRequiredCharacteristicName = (name: string): boolean => {
  const key = normalizeCharacteristicKey(name);
  return key === 'marca' || [
    'modelo',
    'linha',
    'modelolinha',
    'linhamodelo',
    'modeloelinha',
    'modeloulinha',
  ].includes(key);
};

export const getCharacteristicNameAliases = (name: string): string[] => {
  const normalized = normalizeCharacteristicKey(name);
  if (['retratil', 'eretratil', 'possuiretratil'].includes(normalized)) {
    return ['retratil', 'eretratil', 'possuiretratil'];
  }
  if (['reclinavel', 'ereclinavel', 'possuireclinavel'].includes(normalized)) {
    return ['reclinavel', 'ereclinavel', 'possuireclinavel'];
  }
  if (['modelo', 'linha', 'modelolinha', 'linhamodelo', 'modeloelinha', 'modeloulinha'].includes(normalized)) {
    return ['modelo', 'linha', 'modelolinha', 'linhamodelo', 'modeloelinha', 'modeloulinha'];
  }
  if (['altura', 'alturatotal'].includes(normalized)) {
    return ['altura', 'alturatotal'];
  }
  if (['largura', 'larguratotal'].includes(normalized)) {
    return ['largura', 'larguratotal'];
  }
  if (['profundidade', 'profundidadetotal'].includes(normalized)) {
    return ['profundidade', 'profundidadetotal'];
  }
  if (['comprimento', 'comprimentototal'].includes(normalized)) {
    return ['comprimento', 'comprimentototal'];
  }
  return [normalized];
};

export const isBlankCharacteristicValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0 || value.every(isBlankCharacteristicValue);
  if (typeof value === 'object') {
    const structured = value as { value?: unknown; val?: unknown };
    if (structured.value !== undefined || structured.val !== undefined) {
      return isBlankCharacteristicValue(structured.value ?? structured.val);
    }
    return true;
  }
  return false;
};

export const readCharacteristicValue = (record: Record<string, any>, name: string): unknown => {
  const aliases = new Set(getCharacteristicNameAliases(name));
  const valueMaps = [
    record.technicalValues,
    record.technical_values,
    record.technicalSpecs?.technicalValues,
    record.technical_specs?.technicalValues,
  ];

  for (const values of valueMaps) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) continue;
    const entry = Object.entries(values).find(([key, value]) =>
      aliases.has(normalizeCharacteristicKey(key)) && !isBlankCharacteristicValue(value)
    );
    if (entry) return entry[1];
  }

  if (Array.isArray(record.attributes)) {
    const attribute = record.attributes.find(
      (item: any) =>
        item?.name &&
        aliases.has(normalizeCharacteristicKey(item.name)) &&
        !isBlankCharacteristicValue(item.value)
    );
    if (attribute) return attribute.value;
  } else if (record.attributes && typeof record.attributes === 'object') {
    const entry = Object.entries(record.attributes).find(([key, value]) =>
      aliases.has(normalizeCharacteristicKey(key)) && !isBlankCharacteristicValue(value)
    );
    if (entry) return entry[1];
  }

  const normalized = normalizeCharacteristicName(name);
  const directFieldByName: Record<string, string[]> = {
    marca: ['brand'],
    altura: ['height'],
    'altura total': ['height'],
    largura: ['width'],
    'largura total': ['width'],
    profundidade: ['depth'],
    'profundidade total': ['depth'],
    peso: ['weight'],
    modelo: ['model'],
    linha: ['line'],
  };
  const normalizedKey = normalizeCharacteristicKey(name);
  const legacyDepthIsLength = record.depthUseLength === true || record.depth_use_length === true;
  const isDepthName = normalized === 'profundidade' || normalized === 'profundidade total';
  const isLengthName = normalized === 'comprimento' || normalized === 'comprimento total';
  let directFields: string[];
  if (['modelolinha', 'linhamodelo', 'modeloelinha', 'modeloulinha'].includes(normalizedKey)) {
    directFields = ['model', 'line'];
  } else if (
    (isDepthName && legacyDepthIsLength) ||
    (isLengthName && !legacyDepthIsLength)
  ) {
    directFields = [];
  } else if (isLengthName && legacyDepthIsLength) {
    directFields = ['depth'];
  } else {
    directFields = directFieldByName[normalized] || [];
  }
  for (const key of directFields) {
    const candidate = record[key];
    if (
      candidate !== undefined &&
      candidate !== null &&
      !isBlankCharacteristicValue(candidate) &&
      !(typeof candidate === 'number' && candidate <= 0)
    ) {
      return candidate;
    }
  }

  return undefined;
};

export const hasCatalogValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.some(hasCatalogValue);
  if (typeof value === 'object') {
    const structured = value as { value?: unknown; val?: unknown };
    if (structured.value !== undefined || structured.val !== undefined) {
      return hasCatalogValue(structured.value ?? structured.val);
    }
    return false;
  }
  if (typeof value === 'string') {
    const normalized = normalizeCharacteristicName(value);
    return Boolean(normalized && normalized !== 'nao se aplica' && normalized !== 'n/a' && normalized !== 'nao informar');
  }
  return true;
};

export const hasCatalogQuantityValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'object') {
    const structured = value as { value?: unknown; val?: unknown };
    if (structured.value !== undefined || structured.val !== undefined) {
      return hasCatalogQuantityValue(structured.value ?? structured.val);
    }
    return false;
  }
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0;
  const match = String(value).trim().match(/^(\d+)(?:[.,]0+)?(?:\s+.*)?$/);
  return Boolean(match && Number.isSafeInteger(Number(match[1])));
};

export const hasPositiveCatalogValue = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasPositiveCatalogValue);
  if (value === undefined || value === null) return false;
  if (typeof value === 'object') {
    const structured = value as { value?: unknown; val?: unknown };
    if (structured.value !== undefined || structured.val !== undefined) {
      return hasPositiveCatalogValue(structured.value ?? structured.val);
    }
    return false;
  }

  const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0;
};

export const POSITIVE_REQUIRED_CATALOG_CHARACTERISTICS = new Set([
  'peso',
  'profundidadetotal',
  'comprimentototal',
]);

export const hasRequiredCatalogValue = (name: string, value: unknown, dataType?: string): boolean => {
  if (['boolean', 'booleano'].includes(String(dataType ?? '').trim().toLocaleLowerCase('pt-BR'))) {
    let answer = value;
    if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
      const structured = answer as { value?: unknown; val?: unknown };
      if (Object.prototype.hasOwnProperty.call(structured, 'value')) answer = structured.value;
      else if (Object.prototype.hasOwnProperty.call(structured, 'val')) answer = structured.val;
    }
    return typeof answer === 'boolean';
  }
  if (isQuantityCharacteristic(name)) return hasCatalogQuantityValue(value);
  if (POSITIVE_REQUIRED_CATALOG_CHARACTERISTICS.has(normalizeCharacteristicKey(name))) {
    return hasPositiveCatalogValue(value);
  }
  return hasCatalogValue(value);
};

export const getProductCategoryIds = (data: Readonly<Record<string, any>>): string[] => {
  const ids = Array.isArray(data.categoryIds)
    ? data.categoryIds
    : data.categoryId || data.category_id
      ? [data.categoryId || data.category_id]
      : [];
  return ids.map((id: unknown) => String(id));
};

export function isPositiveNumber(value: unknown): boolean {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}
