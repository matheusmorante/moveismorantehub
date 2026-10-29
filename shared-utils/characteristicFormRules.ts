import { z } from 'zod';
import type {
  AttributeDataType,
  CharacteristicFillConfiguration,
  CharacteristicFillType,
  CharacteristicGroup,
  VariationOption,
  default as VariationType,
} from '../erp/src/pages/types/variation.type';
import { normalizeAttributeDataType } from './attributeDataType';
import { getCharacteristicTextLimits } from './characteristicTextLimits';
export type CharacteristicFormData = Pick<VariationType, 'name' | 'options' | 'active'> & {
  groupId: string;
  dataType: CharacteristicFillType;
  unit: string;
  decimalPlaces: 1 | 2 | 3;
  configuration: CharacteristicFillConfiguration;
};

export type CharacteristicFillConfigurationPayload = CharacteristicFillConfiguration;

export type CharacteristicSaveStatus = 'saved' | 'saving' | 'error';

export const VALID_MEASURE_UNITS = ['cm', 'mm', 'm'] as const;
export const CHARACTERISTIC_FILL_TYPES = [
  'text_short',
  'text_long',
  'radio',
  'multi_select',
  'boolean',
  'integer',
  'decimal',
] as const satisfies readonly CharacteristicFillType[];

export const isChoiceCharacteristicType = (value?: AttributeDataType): boolean =>
  value === 'radio' || value === 'multi_select';

export const normalizeCharacteristicText = (value: string): string =>
  value.trim().toLocaleLowerCase('pt-BR');

export const normalizeManagedCharacteristicType = (
  value?: AttributeDataType
): CharacteristicFillType => {
  const normalized = normalizeAttributeDataType(value);
  if (normalized === 'weight' || normalized === 'percentage' || normalized === 'measure') {
    return 'decimal';
  }
  return CHARACTERISTIC_FILL_TYPES.includes(normalized as CharacteristicFillType)
    ? normalized as CharacteristicFillType
    : 'text_short';
};

export const resolveCharacteristicUnit = (
  dataType: AttributeDataType,
  currentUnit = ''
): string => {
  if (dataType === 'weight') return 'kg';
  if (dataType === 'percentage') return '%';
  if (dataType === 'measure') {
    return VALID_MEASURE_UNITS.includes(currentUnit as (typeof VALID_MEASURE_UNITS)[number])
      ? currentUnit
      : 'cm';
  }
  return dataType === 'decimal' || dataType === 'integer' ? currentUnit : '';
};

export const getInitialCharacteristicFormData = (
  variation?: VariationType | null,
  defaultGroupId = ''
): CharacteristicFormData => {
  if (!variation) {
    return {
      name: '',
      groupId: defaultGroupId,
      options: [],
      active: true,
      dataType: 'text_short',
      unit: '',
      decimalPlaces: 2,
      configuration: getCharacteristicTextLimits('text_short') ?? {},
    };
  }

  const dataType = normalizeManagedCharacteristicType(variation.dataType);
  return {
    name: variation.name,
    groupId: variation.groupId ?? defaultGroupId,
    options: (variation.options ?? []).map((option, index) => ({
      ...option,
      active: option.active !== false,
      sortOrder: option.sortOrder ?? index,
    })),
    active: variation.active ?? true,
    dataType,
    unit: dataType === 'decimal' || dataType === 'integer' ? variation.unit || '' : '',
    decimalPlaces: variation.decimalPlaces ?? 2,
    configuration: getCharacteristicTextLimits(dataType) ?? variation.configuration ?? {},
  };
};

const isIntegerOrEmpty = (value: number | undefined) =>
  value === undefined || (Number.isInteger(value) && value >= 0);
const isNumberOrEmpty = (value: number | undefined) =>
  value === undefined || Number.isFinite(value);

const characteristicFillConfigurationSchema = z.object({
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  minValue: z.number().finite().optional(),
  maxValue: z.number().finite().optional(),
  minSelections: z.number().int().nonnegative().optional(),
  maxSelections: z.number().int().nonnegative().optional(),
});

export const normalizeCharacteristicFillConfiguration = (
  dataType: AttributeDataType | undefined,
  configuration: unknown,
): CharacteristicFillConfigurationPayload | undefined => {
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) {
    return undefined;
  }

  const fillType = normalizeManagedCharacteristicType(dataType);
  const allowedKeys: readonly (keyof CharacteristicFillConfigurationPayload)[] =
    fillType === 'text_short' || fillType === 'text_long'
      ? ['minLength', 'maxLength']
      : fillType === 'integer' || fillType === 'decimal'
        ? ['minValue', 'maxValue']
        : fillType === 'multi_select'
          ? ['minSelections', 'maxSelections']
          : [];
  const source = configuration as Record<string, unknown>;
  const normalized: CharacteristicFillConfigurationPayload = {};

  for (const key of allowedKeys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) normalized[key] = value;
  }
  return normalized;
};

export const validateCharacteristicFillConfiguration = (
  dataType: CharacteristicFillType,
  decimalPlaces: 1 | 2 | 3,
  configuration: CharacteristicFillConfiguration,
): string | null => {
  const textLimits = getCharacteristicTextLimits(dataType);
  if (textLimits && (
    configuration.minLength !== textLimits.minLength ||
    configuration.maxLength !== textLimits.maxLength
  )) {
    return 'Os limites de texto são definidos automaticamente pelo tipo de preenchimento.';
  }
  if (dataType === 'integer' || dataType === 'decimal') {
    if (!isNumberOrEmpty(configuration.minValue) || !isNumberOrEmpty(configuration.maxValue)) {
      return 'Os limites devem ser números válidos.';
    }
    if (
      dataType === 'integer' &&
      [configuration.minValue, configuration.maxValue].some((value) => value !== undefined && !Number.isInteger(value))
    ) return 'Os limites do número inteiro devem ser inteiros.';
    if (
      configuration.minValue !== undefined &&
      configuration.maxValue !== undefined &&
      configuration.minValue > configuration.maxValue
    ) return 'O valor mínimo não pode superar o valor máximo.';
    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 1 || decimalPlaces > 3) {
      return 'Selecione de 1 a 3 casas decimais.';
    }
  }
  if (dataType === 'multi_select') {
    if (!isIntegerOrEmpty(configuration.minSelections) || !isIntegerOrEmpty(configuration.maxSelections)) {
      return 'Os limites de seleção devem ser inteiros iguais ou maiores que zero.';
    }
    if (
      configuration.minSelections !== undefined &&
      configuration.maxSelections !== undefined &&
      configuration.minSelections > configuration.maxSelections
    ) return 'A quantidade mínima não pode superar a máxima.';
  }
  return null;
};

export const validateCharacteristicSnapshot = (
  snapshot: CharacteristicFormData,
  allVariations: readonly VariationType[],
  currentCharacteristicId?: string,
  groups: readonly CharacteristicGroup[] = []
): string | null => {
  const name = snapshot.name.trim();
  if (!name) return 'O nome da característica é obrigatório.';
  if (!snapshot.groupId) return 'Selecione um grupo para a característica.';
  if (groups.length > 0 && !groups.some((group) => group.id === snapshot.groupId)) {
    return 'Selecione um grupo válido.';
  }

  const normalizedName = normalizeCharacteristicText(name);
  if (
    allVariations.some(
      (candidate) =>
        candidate.id !== currentCharacteristicId &&
        normalizeCharacteristicText(candidate.name) === normalizedName
    )
  ) {
    return 'Já existe uma característica com esse nome.';
  }

  const activeOptions = snapshot.options.filter((option) => option.active !== false);
  const normalizedOptions = snapshot.options.map((option) => normalizeCharacteristicText(option.value));
  if (snapshot.options.some((option) => !option.value.trim())) {
    return 'Preencha ou remova as opções sem valor.';
  }
  if (new Set(normalizedOptions).size !== normalizedOptions.length) {
    return 'As opções não podem ter nomes duplicados.';
  }
  if (isChoiceCharacteristicType(snapshot.dataType) && activeOptions.length === 0) {
    return 'Mantenha pelo menos uma opção ativa para este tipo de característica.';
  }

  return validateCharacteristicFillConfiguration(
    snapshot.dataType,
    snapshot.decimalPlaces,
    snapshot.configuration,
  );
};

const optionSchema = z.object({
  id: z.string(),
  value: z.string(),
  active: z.boolean().optional().default(true),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const createManagedCharacteristicFormSchema = (
  allVariations: readonly VariationType[] = [],
  currentCharacteristicId?: string | (() => string | undefined),
  groups: readonly CharacteristicGroup[] = []
) => z.object({
  name: z.string().trim().min(1, 'O nome da característica é obrigatório.'),
  groupId: z.string().min(1, 'Selecione um grupo para a característica.'),
  dataType: z.enum(CHARACTERISTIC_FILL_TYPES),
  unit: z.string().default(''),
  decimalPlaces: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  active: z.boolean(),
  options: z.array(optionSchema),
  configuration: characteristicFillConfigurationSchema,
}).superRefine((snapshot, context) => {
  const error = validateCharacteristicSnapshot(
    snapshot as CharacteristicFormData,
    allVariations,
    typeof currentCharacteristicId === 'function' ? currentCharacteristicId() : currentCharacteristicId,
    groups,
  );
  if (error) context.addIssue({ code: 'custom', path: ['name'], message: error });
});

/** Legacy schema retained for the product form's existing attribute editor. */
export const createCharacteristicFormSchema = (
  allVariations: readonly VariationType[] = [],
  currentCharacteristicId?: string | (() => string | undefined)
) => z.object({
  name: z.string().trim().min(1, 'O nome da característica é obrigatório.'),
  dataType: z.enum([
    'list', 'integer', 'decimal', 'text', 'text_short', 'text_long', 'radio',
    'multi_select', 'boolean', 'measure', 'number', 'weight', 'percentage',
  ]),
  unit: z.string().default(''),
  decimalPlaces: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  active: z.boolean(),
  configuration: characteristicFillConfigurationSchema.optional(),
  options: z.array(z.object({
    id: z.string(),
    value: z.string(),
    sortOrder: z.number().int().nonnegative().optional(),
  }).passthrough()),
}).passthrough().superRefine((snapshot, context) => {
  const name = snapshot.name.trim();
  const normalizedName = normalizeCharacteristicText(name);
  const currentId = typeof currentCharacteristicId === 'function'
    ? currentCharacteristicId()
    : currentCharacteristicId;
  let error: string | null = null;
  if (allVariations.some((item) => item.id !== currentId && normalizeCharacteristicText(item.name) === normalizedName)) {
    error = 'Já existe uma característica com esse nome.';
  } else if (isChoiceCharacteristicType(normalizeAttributeDataType(snapshot.dataType))) {
    const values = snapshot.options.map((option) => normalizeCharacteristicText(option.value));
    if (snapshot.options.some((option) => !option.value.trim())) {
      error = 'Preencha ou remova as opções sem valor.';
    } else if (new Set(values).size !== values.length) {
      error = 'As opções não podem ter nomes duplicados.';
    } else if (snapshot.options.length === 0) {
      error = 'Adicione pelo menos uma opção para este tipo de característica.';
    }
  } else if (snapshot.dataType === 'measure' && !VALID_MEASURE_UNITS.includes(snapshot.unit as (typeof VALID_MEASURE_UNITS)[number])) {
    error = 'Selecione uma unidade de medida válida.';
  }
  if (error) context.addIssue({ code: 'custom', path: ['name'], message: error });

  const fillType = normalizeManagedCharacteristicType(snapshot.dataType);
  const configuration = snapshot.configuration ?? getCharacteristicTextLimits(fillType) ?? {};
  const configurationError = validateCharacteristicFillConfiguration(
    fillType,
    snapshot.decimalPlaces,
    configuration,
  );
  if (configurationError) {
    context.addIssue({ code: 'custom', path: ['configuration'], message: configurationError });
  }
});

export const getCharacteristicSubtitle = (attribute: VariationType): string => {
  switch (normalizeManagedCharacteristicType(attribute.dataType)) {
    case 'boolean': return 'Sim/Não';
    case 'integer': return `Número inteiro${attribute.unit ? ` • ${attribute.unit}` : ''}`;
    case 'decimal': {
      const places = attribute.decimalPlaces ?? 2;
      return `Número decimal${attribute.unit ? ` • ${attribute.unit}` : ''} • ${places} ${places === 1 ? 'casa' : 'casas'}`;
    }
    case 'text_short': return 'Texto curto';
    case 'text_long': return 'Texto longo';
    case 'radio': {
      const count = attribute.options.filter((option) => option.active !== false).length;
      return `Opção única • ${count} ${count === 1 ? 'opção ativa' : 'opções ativas'}`;
    }
    case 'multi_select': {
      const count = attribute.options.filter((option) => option.active !== false).length;
      return `Opção múltipla • ${count} ${count === 1 ? 'opção ativa' : 'opções ativas'}`;
    }
  }
};

export const getCharacteristicFillTypeLabel = (dataType?: AttributeDataType): string => {
  switch (normalizeManagedCharacteristicType(dataType)) {
    case 'boolean': return 'Sim/Não';
    case 'text_short': return 'Texto curto (máx. 30 caracteres)';
    case 'text_long': return 'Texto longo (máx. 255 caracteres)';
    case 'radio': return 'Opção única';
    case 'multi_select': return 'Opção múltipla';
    case 'integer': return 'Número inteiro';
    case 'decimal': return 'Número decimal';
  }
};

export type { VariationOption };
