import type { AttributeDataType, default as VariationType } from '../../../types/variation.type';
import { normalizeAttributeDataType } from '../../../utils/attributeDataType';

export type CharacteristicFormData = Pick<VariationType, 'name' | 'options' | 'active'> & {
  dataType: NonNullable<VariationType['dataType']>;
  unit: string;
  decimalPlaces: 1 | 2 | 3;
};

export type CharacteristicSaveStatus = 'saved' | 'pending' | 'saving' | 'error';

export const VALID_MEASURE_UNITS = ['cm', 'mm', 'm'] as const;

export const isChoiceCharacteristicType = (value?: AttributeDataType): boolean =>
  value === 'radio' || value === 'multi_select';

export const normalizeCharacteristicText = (value: string): string =>
  value.trim().toLocaleLowerCase('pt-BR');

export const resolveCharacteristicUnit = (
  dataType: NonNullable<VariationType['dataType']>,
  currentUnit = ''
): string => {
  if (dataType === 'weight') return 'kg';
  if (dataType === 'percentage') return '%';
  if (dataType === 'measure') {
    return VALID_MEASURE_UNITS.includes(currentUnit as (typeof VALID_MEASURE_UNITS)[number])
      ? currentUnit
      : 'cm';
  }
  return '';
};

export const getInitialCharacteristicFormData = (
  variation?: VariationType | null
): CharacteristicFormData => {
  if (!variation) {
    return {
      name: '',
      options: [],
      active: true,
      dataType: 'text_short',
      unit: '',
      decimalPlaces: 2,
    };
  }

  const dataType = normalizeAttributeDataType(variation.dataType);
  return {
    name: variation.name,
    options: (variation.options ?? []).map((option, index) => ({
      ...option,
      sortOrder: option.sortOrder ?? index,
    })),
    active: variation.active ?? true,
    dataType,
    unit:
      dataType === 'measure'
        ? resolveCharacteristicUnit(dataType, variation.unit || '')
        : variation.unit || '',
    decimalPlaces: variation.decimalPlaces ?? 2,
  };
};

export const validateCharacteristicSnapshot = (
  snapshot: CharacteristicFormData,
  allVariations: readonly VariationType[],
  currentCharacteristicId?: string
): string | null => {
  const name = snapshot.name.trim();
  if (!name) return 'O nome da característica é obrigatório.';

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

  if (isChoiceCharacteristicType(snapshot.dataType)) {
    const normalizedOptions = snapshot.options.map((option) =>
      normalizeCharacteristicText(option.value)
    );
    if (snapshot.options.some((option) => !option.value.trim())) {
      return 'Preencha ou remova as opções sem valor.';
    }
    if (new Set(normalizedOptions).size !== normalizedOptions.length) {
      return 'As opções não podem ter nomes duplicados.';
    }
    if (snapshot.options.length === 0) {
      return 'Adicione pelo menos uma opção para este tipo de característica.';
    }
  }

  if (
    snapshot.dataType === 'measure' &&
    !VALID_MEASURE_UNITS.includes(snapshot.unit as (typeof VALID_MEASURE_UNITS)[number])
  ) {
    return 'Selecione uma unidade de medida válida.';
  }

  return null;
};

export const getCharacteristicSubtitle = (attribute: VariationType): string => {
  switch (attribute.dataType) {
    case 'measure':
      return `Medida${attribute.unit ? ` • ${attribute.unit}` : ''}`;
    case 'weight':
      return 'Peso • kg';
    case 'percentage':
      return 'Porcentagem';
    case 'integer':
    case 'number':
      return 'Número Inteiro';
    case 'decimal': {
      const places = attribute.decimalPlaces ?? 2;
      return `Número decimal • ${places} ${places === 1 ? 'casa' : 'casas'}`;
    }
    case 'text_short':
    case 'text':
      return 'Texto curto';
    case 'text_long':
      return 'Texto longo';
    case 'boolean':
      return 'Sim ou não';
    case 'radio':
      return `Escolha única • ${attribute.options.length} ${attribute.options.length === 1 ? 'opção' : 'opções'}`;
    case 'multi_select':
      return `Escolha múltipla • ${attribute.options.length} ${attribute.options.length === 1 ? 'opção' : 'opções'}`;
    default:
      return 'Texto';
  }
};

export const getCharacteristicFillTypeLabel = (
  dataType?: VariationType['dataType']
): string => {
  if (dataType === 'measure') return 'Número Decimal';
  if (dataType === 'integer') return 'Número Inteiro';
  return 'Texto';
};
