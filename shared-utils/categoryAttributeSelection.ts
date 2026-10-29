import { z } from 'zod';
import { isCatalogNeverRequiredCharacteristicName } from './catalogPublication/requiredCharacteristicPolicy';

/** Category attribute state shared by the ERP and mobile category forms. */
export const categoryAttributeSelectionSchema = z.object({
  id: z.string().min(1, 'Selecione uma característica válida.'),
  name: z
    .string()
    .refine((value) => Boolean(value.trim()), 'A característica precisa ter nome.'),
  isRequired: z.boolean(),
}).passthrough();

export const categoryAttributeSelectionsSchema = z.array(categoryAttributeSelectionSchema);
export type CategoryAttributeSelection = z.infer<typeof categoryAttributeSelectionSchema>;

const normalizeAttributeName = (name: string): string => name.trim().toLocaleLowerCase('pt-BR');

const ALWAYS_REQUIRED_CATEGORY_ATTRIBUTE_NAMES = new Set([
  'cor',
  'modelo',
  'marca',
  'altura total',
  'largura total',
  'profundidade total',
  'altura',
  'largura',
  'profundidade',
  'comprimento',
  'comprimento total',
  'modelo/linha',
  'modelo / linha',
  'linha/modelo',
  'linha / modelo',
  'modelo e linha',
  'modelo ou linha',
  'linha',
]);

export const isCategoryAttributeAlwaysRequired = (name: string): boolean =>
  ALWAYS_REQUIRED_CATEGORY_ATTRIBUTE_NAMES.has(normalizeAttributeName(name));

export const isCategoryAttributeAlwaysOptional = (name: string): boolean =>
  isCatalogNeverRequiredCharacteristicName(name);

export const isCategoryAttributeRequirementLocked = (name: string): boolean =>
  isCategoryAttributeAlwaysRequired(name) || isCategoryAttributeAlwaysOptional(name);

/** These technical fields are managed elsewhere and cannot be newly linked to a category. */
export const isCategoryAttributeSelectable = (name: string): boolean =>
  !/^(reclin[aá]vel|linha|modelo)$/i.test(name.trim());

export const getDefaultCategoryAttributeIsRequired = (name: string): boolean =>
  !isCategoryAttributeAlwaysOptional(name) && isCategoryAttributeAlwaysRequired(name);

export const resolveCategoryAttributeIsRequired = (
  attribute: Pick<CategoryAttributeSelection, 'name' | 'isRequired'>
): boolean =>
  !isCategoryAttributeAlwaysOptional(attribute.name) &&
  (attribute.isRequired || isCategoryAttributeAlwaysRequired(attribute.name));

export const setCategoryAttributeRequirement = <TAttribute extends CategoryAttributeSelection>(
  attributes: TAttribute[],
  attributeId: string,
  isRequired: boolean
): TAttribute[] =>
  attributes.map((attribute) =>
    attribute.id === attributeId
      ? {
          ...attribute,
          isRequired: resolveCategoryAttributeIsRequired({ ...attribute, isRequired }),
        }
      : attribute,
  );
