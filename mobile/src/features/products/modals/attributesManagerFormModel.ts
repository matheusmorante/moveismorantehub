import { z } from 'zod';
import { validateAttributeOption } from '../categories/domain/categoryEnvironmentRules';
import type { MobileAttribute, MobileAttributeDataType } from '../services/mobileAttributeService';
import { normalizeProductAttributeOptionValue } from '../../../../../shared-utils/productAttributeOptionRules';

export const ATTRIBUTE_TYPE_OPTIONS: Array<[MobileAttributeDataType, string]> = [
  ['radio', 'Escolha única'],
  ['multi_select', 'Múltiplas escolhas'],
  ['text_short', 'Texto curto'],
  ['text_long', 'Texto longo'],
  ['integer', 'Número inteiro'],
  ['decimal', 'Número decimal'],
  ['weight', 'Peso (kg)'],
  ['percentage', 'Porcentagem'],
  ['measure', 'Medida'],
  ['boolean', 'Sim ou não'],
];

type FillLimitInputKey = 'minValue' | 'maxValue' | 'minSelections' | 'maxSelections';
export type FillLimitInputValues = Record<FillLimitInputKey, string>;

export const parseOptionalNumber = (value: string): number | undefined =>
  value.trim() === '' ? undefined : Number(value);

export const attributeOptionFormSchema = z.object({
  value: z.string()
    .transform(normalizeProductAttributeOptionValue)
    .refine((value) => value.length > 0, 'O valor da opção não pode estar vazio.'),
  attributeId: z.string().min(1, 'Característica não encontrada.').optional(),
  existingOptions: z.array(z.object({ id: z.string(), value: z.string() })),
}).superRefine((values, ctx) => {
  const result = validateAttributeOption(values.value, values.existingOptions);
  if (!result.valid) ctx.addIssue({ code: 'custom', path: ['value'], message: result.error || 'Valor inválido.' });
});

export type CharacteristicOptionInput = {
  id: string;
  value: string;
  sortOrder?: number;
  [key: string]: unknown;
};

export const toCharacteristicOptionInput = (option: MobileAttribute['options'][number]): CharacteristicOptionInput =>
  ({ ...option }) as CharacteristicOptionInput;
