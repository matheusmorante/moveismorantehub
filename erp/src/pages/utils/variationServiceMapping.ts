import type VariationType from '../types/variation.type';
import type { VariationOption } from '../types/variation.type';
import { sortAttributeValuesNaturally } from './attributeValueSorting';
import { inferAttributeDataType } from './attributeDataType';
import { isCatalogNeverRequiredCharacteristicName } from '../../../../shared-utils/catalogPublication/requiredCharacteristicPolicy';

type VariationRowsMappingInput = {
  attrData: any[] | null;
  valData: any[] | null;
  catAttrErr: any;
  catAttrData: any[] | null;
  categoryApplicationErr: any;
  categoryApplicationData: any[] | null;
  includeOptionValues: boolean;
  includeCategoryApplications?: boolean;
};

export const mapVariationRowsToDefinitions = ({
  attrData,
  valData,
  catAttrErr,
  catAttrData,
  categoryApplicationErr,
  categoryApplicationData,
  includeOptionValues,
  includeCategoryApplications,
}: VariationRowsMappingInput): VariationType[] => {
  const optionCounts = new Map<string, { optionCount: number; activeOptionCount: number }>();
  for (const value of valData || []) {
    const attributeId = String(value.attribute_id);
    const count = optionCounts.get(attributeId) ?? { optionCount: 0, activeOptionCount: 0 };
    count.optionCount += 1;
    if (value.active !== false) count.activeOptionCount += 1;
    optionCounts.set(attributeId, count);
  }

  // 3. Mapear para a estrutura VariationType usada no ERP
  const mapped: VariationType[] = (attrData || []).map((attr: any) => ({
    id: String(attr.id),
    name: attr.name,
    active: attr.active ?? true,
    dataType: inferAttributeDataType(attr.name, attr.data_type),
    unit: attr.unit || '',
    decimalPlaces:
      attr.decimal_places === 1 || attr.decimal_places === 2 || attr.decimal_places === 3
        ? attr.decimal_places
        : undefined,
    groupId: typeof attr.group_id === 'string' ? attr.group_id : undefined,
    configuration:
      attr.configuration && typeof attr.configuration === 'object' && !Array.isArray(attr.configuration)
        ? attr.configuration
        : {},
    isGloballyRequired:
      !isCatalogNeverRequiredCharacteristicName(attr.name) && Boolean(attr.is_globally_required),
    isCustom: Boolean(attr.is_custom),
    ...(includeOptionValues ? {} : {
      optionCount: optionCounts.get(String(attr.id))?.optionCount ?? 0,
      activeOptionCount: optionCounts.get(String(attr.id))?.activeOptionCount ?? 0,
    }),
    options: includeOptionValues ? (() => {
      const values = (valData || [])
        .filter((val: any) => val.attribute_id === attr.id)
        .map((val: any) => ({
          id: String(val.id),
          value: val.value,
          sortOrder: Number.isInteger(val.sort_order) ? val.sort_order : undefined,
          active: val.active !== false,
        }));
      return values.some((value: VariationOption) => value.sortOrder !== undefined)
        ? values.sort(
            (left: VariationOption, right: VariationOption) =>
              (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
              (right.sortOrder ?? Number.MAX_SAFE_INTEGER)
          )
        : sortAttributeValuesNaturally(values);
    })() : [],
    categoryAttributes: (catAttrErr ? [] : catAttrData || [])
      .filter((ca: any) => ca.attribute_id === attr.id)
      .map((ca: any) => ({
        categoryId: ca.category_id,
        isRequired:
          !isCatalogNeverRequiredCharacteristicName(attr.name) && Boolean(ca.is_required),
      })),
    ...(includeCategoryApplications === false
      ? {}
      : {
          categoryApplications: (categoryApplicationErr ? [] : categoryApplicationData || [])
            // Unconfigured rows carry the optional default and must still reach product forms.
            .filter((application: any) => application.attribute_id === attr.id)
            .map((application: any) => ({
              categoryId: String(application.category_id),
              application: application.application,
            })),
        }),
    deleted: false, // Exclusões sem uso são físicas; itens usados ficam ativos=false.
  }));

  return mapped;
};
