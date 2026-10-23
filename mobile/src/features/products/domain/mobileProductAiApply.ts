import type { ProductAiSuggestedCharacteristics } from '../../../../../shared-utils/productAiFormSchemas';
import { getEffectiveProductTechnicalValues, upsertProductCharacteristicAttribute } from './productCharacteristics';

type ProductState = Record<string, any>;

const parseMeasure = (value: unknown) => {
  const parsed = Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const editedValue = (key: string, suggested: unknown, edited: Record<string, unknown>) => {
  if (edited[key] === undefined) return suggested;
  if (Array.isArray(suggested)) {
    return String(edited[key]).split(',').map((value) => value.trim()).filter(Boolean);
  }
  if (typeof suggested === 'number') {
    const numeric = Number(String(edited[key]).trim().replace(',', '.'));
    return Number.isFinite(numeric) ? numeric : suggested;
  }
  return edited[key];
};

export const applyMobileAiCharacteristicsToProduct = (
  previous: ProductState,
  suggested: ProductAiSuggestedCharacteristics,
  selectedKeys: Record<string, boolean>,
  editedValues: Record<string, unknown>
) => {
  const next: ProductState = { ...previous };
  let technicalValues = { ...(previous.technicalValues || {}) };
  let attributes = previous.attributes;

  const applyField = (key: string, value: unknown) => {
    if (value === undefined || value === null || String(value).trim() === '') return;
    technicalValues[key] = value;
    attributes = upsertProductCharacteristicAttribute(attributes, key, value);
  };

  const applyGeneral = (key: string, target: 'name' | 'brand' | 'model' | 'description') => {
    if (!selectedKeys[key]) return;
    const original = target === 'name'
      ? suggested.identifiedProduct?.name
      : target === 'brand'
        ? suggested.identifiedProduct?.brand
        : target === 'model'
          ? suggested.identifiedProduct?.model
          : suggested.description;
    const value = String(editedValue(key, original, editedValues) ?? '').trim();
    if (!value) return;
    if (target === 'name') {
      next.name = value;
      next.title = value;
      next.marketplaceTitle = value;
    } else if (target === 'brand') {
      next.brand = value;
      applyField('Marca', value);
    } else if (target === 'model') {
      next.line = value;
      applyField('Modelo/Linha', value);
      Object.keys(technicalValues)
        .filter((name) => ['modelo', 'linha', 'modelo/linha', 'linha/modelo'].includes(name.trim().toLocaleLowerCase('pt-BR')) && name !== 'Modelo/Linha')
        .forEach((name) => delete technicalValues[name]);
    } else {
      next.description = value;
    }
  };

  applyGeneral('__field_name__', 'name');
  applyGeneral('__field_brand__', 'brand');
  applyGeneral('__field_model__', 'model');
  applyGeneral('__field_description__', 'description');

  const dimensions = [
    ['height', 'Altura', suggested.height],
    ['width', 'Largura', suggested.width],
    ['depth', 'Profundidade', suggested.depth],
    ['weight', 'Peso', suggested.weight],
  ] as const;
  for (const [field, technicalName, original] of dimensions) {
    const key = `__field_${field}__`;
    if (!selectedKeys[key]) continue;
    const measure = parseMeasure(editedValue(key, original, editedValues));
    if (measure === null) continue;
    next[field] = measure;
    applyField(technicalName, String(measure));
  }

  for (const [name, original] of Object.entries(suggested.technicalValues || {})) {
    if (!selectedKeys[name]) continue;
    const value = editedValue(name, original, editedValues);
    const normalizedName = name.trim().toLocaleLowerCase('pt-BR');
    if (['modelo', 'linha', 'modelo/linha', 'linha/modelo'].includes(normalizedName)) {
      applyField('Modelo/Linha', value);
      if (typeof value === 'string' && value.trim()) next.line = value.trim();
      Object.keys(technicalValues)
        .filter((field) => ['modelo', 'linha', 'modelo/linha', 'linha/modelo'].includes(field.trim().toLocaleLowerCase('pt-BR')) && field !== 'Modelo/Linha')
        .forEach((field) => delete technicalValues[field]);
    } else {
      applyField(name, value);
    }
  }

  next.technicalValues = technicalValues;
  next.attributes = attributes;
  return next;
};

export const buildMobileAiSuggestionRows = (
  result: ProductAiSuggestedCharacteristics,
  currentProduct: ProductState
) => {
  const rows: Array<{ key: string; label: string; value: string; confidence?: string }> = [];
  const add = (key: string, label: string, value: unknown, confidence?: string) => {
    if (value === undefined || value === null || !String(value).trim()) return;
    rows.push({ key, label, value: Array.isArray(value) ? value.join(', ') : String(value), confidence });
  };
  add('__field_name__', 'Nome', result.identifiedProduct?.name);
  add('__field_brand__', 'Marca', result.identifiedProduct?.brand);
  add('__field_model__', 'Modelo / Linha', result.identifiedProduct?.model);
  add('__field_description__', 'Descrição', result.description);
  for (const [field, label] of [['height', 'Altura'], ['width', 'Largura'], ['depth', 'Profundidade'], ['weight', 'Peso']] as const) {
    add(`__field_${field}__`, label, result[field]);
  }
  for (const [name, value] of Object.entries(result.technicalValues || {})) {
    add(name, name, value, result.itemConfidence?.[name]);
  }
  const existing = getEffectiveProductTechnicalValues(currentProduct);
  const existingNames = new Set(Object.keys(existing).map((name) => name.trim().toLocaleLowerCase('pt-BR')));
  return rows.map((row) => ({
    ...row,
    isExisting: row.key.startsWith('__field_')
      ? Boolean(currentProduct[row.key.replace('__field_', '').replace('__', '')])
      : existingNames.has(row.label.trim().toLocaleLowerCase('pt-BR')),
  }));
};
