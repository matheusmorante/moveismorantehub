import {
  isPercentageField,
  isPriceField,
  isTemplateField,
  parseCatalogPrice,
  parseConditionValues,
  templateFieldValue,
  type LayerCondition,
  type TemplateField,
  type TemplatePreviewProduct,
} from './catalogImageTemplateFields';

export function priceLayerMigration(name: unknown) {
  if (typeof name !== 'string') return null;
  const normalized = name
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
  if (normalized === 'preco maior' || normalized === 'preco antigo') {
    return { name: 'Preço Antigo', field: 'price' as const };
  }
  if (normalized === 'preco menor' || normalized === 'preco atual') {
    return { name: 'Preço Atual', field: 'currentPrice' as const };
  }
  return null;
}

export function normalizeNamedPriceLayer(
  layer: Record<string, unknown>,
  migration = priceLayerMigration(layer.name)
) {
  if (!migration) return layer;
  const text = typeof layer.text === 'string' ? layer.text : undefined;
  const token = text?.match(/^\s*\{\{\s*product\.([a-zA-Z0-9_]+)\s*\}\}\s*$/);
  const tokenField = token?.[1];
  const migratedText =
    tokenField && isTemplateField(tokenField) && isPriceField(tokenField as TemplateField)
      ? `{{product.${migration.field}}}`
      : text;
  return { ...layer, name: migration.name, ...(migratedText !== undefined ? { text: migratedText } : {}) };
}

/** Avalia a condição condicional de uma camada ou agrupamento contra um produto de prévia. */
export function isLayerVisible(
  layer: { condition?: LayerCondition | null },
  product: TemplatePreviewProduct | null
) {
  if (!('condition' in layer) || !layer.condition) return true;
  const { field, operator, value } = layer.condition;
  const actual = templateFieldValue(field, product);
  if (operator === 'exists' || operator === 'empty') {
    return (actual != null && actual !== '') === (operator === 'exists');
  }
  if (actual == null || actual === '') return false;
  if (isPriceField(field)) {
    const expected = parseCatalogPrice(value);
    if (typeof actual !== 'number' || expected === null) return false;
    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'ne':
        return actual !== expected;
      case 'gt':
        return actual > expected;
      case 'gte':
        return actual >= expected;
      case 'lt':
        return actual < expected;
      case 'lte':
        return actual <= expected;
      default:
        return false;
    }
  }
  if (
    isPercentageField(field) ||
    (field === 'discount' && ['gt', 'gte', 'lt', 'lte'].includes(operator))
  ) {
    const actualNum =
      typeof actual === 'number' ? actual : Number(String(actual).replace(/%/g, '').trim());
    const expectedNum = Number(String(value).replace(/%/g, '').trim());
    if (!Number.isFinite(actualNum) || !Number.isFinite(expectedNum)) return false;
    switch (operator) {
      case 'eq':
        return actualNum === expectedNum;
      case 'ne':
        return actualNum !== expectedNum;
      case 'gt':
        return actualNum > expectedNum;
      case 'gte':
        return actualNum >= expectedNum;
      case 'lt':
        return actualNum < expectedNum;
      case 'lte':
        return actualNum <= expectedNum;
      default:
        return false;
    }
  }
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .trim()
      .toLowerCase();
  const left = normalize(String(actual));
  const values = parseConditionValues(value).map(normalize);
  if (!values.length) return false;
  switch (operator) {
    case 'eq':
      return values.some((right) => left === right);
    case 'ne':
      return values.every((right) => left !== right);
    case 'contains':
      return values.some((right) => left.includes(right));
    case 'notContains':
      return values.every((right) => !left.includes(right));
    default:
      return false;
  }
}

/** Verifica visibilidade efetiva da camada considerando também a regra do agrupamento pai. */
export function isTemplateLayerVisible(
  layout: { groups?: { condition?: LayerCondition | null; layerIds: string[] }[] },
  layer: { id: string; condition?: LayerCondition | null },
  product: TemplatePreviewProduct | null
) {
  if (!isLayerVisible(layer, product)) return false;
  const group = layout.groups?.find((entry) => entry.layerIds.includes(layer.id));
  return !group || isLayerVisible(group, product);
}
