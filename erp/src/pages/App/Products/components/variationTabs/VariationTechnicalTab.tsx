import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import {
  TechnicalFieldDefinition,
  getAvailableAdditionalFields,
  getApplicableTechnicalFields,
  getEffectiveTechnicalValue,
  isCharacteristicDependent,
  isCharacteristicDependentOnVariableField,
  isQuantityCharacteristic,
  hasVariationOverride,
  isTechnicalFieldVariable,
  setVariationOverride,
  removeVariationOverride,
  resolveVariableTechnicalFieldNames,
  groupTechnicalFields,
  isDepthCharacteristic,
  mergeCharacteristicGroups,
  isChairWeightCapacityCharacteristic,
} from '@/pages/utils/technicalValuesService';
import { fetchTechnicalFieldDefinitions } from '../../services/technicalFieldService';
import { AttributeManagementModal } from '../modals/attributes/AttributeManagementModal';
import { VariationTechnicalFieldItem } from './VariationTechnicalFieldItem';
import { VariationTechnicalSearchControl } from './VariationTechnicalSearchControl';
import { VariationTechnicalDescriptionSection } from './VariationTechnicalDescriptionSection';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { getDefaultShowNameForVariationOverride } from '../../../../../../../shared-utils/productVariationAttributeDefaults';
import {
  removeProductVariationTechnicalAttribute,
  syncProductVariationTechnicalAttribute,
} from '../../../../../../../shared-utils/productVariationTechnicalAttributes';
import {
  isDoorDependentCharacteristic,
  isDoorQuantityCharacteristic,
  isDrawerDependentCharacteristic,
  isDrawerQuantityCharacteristic,
  isHasDoorsCharacteristic,
  isHasDrawersCharacteristic,
} from '@/pages/utils/technicalValues/predicates/furniture';
import { cleanupDependentCharacteristicsOnZero } from '../tabs/technical/sync/dependentCleanup';
import { isSofaCategoryName } from '../../../../../../../shared-utils/productTechnicalFieldRules';

export interface VariationTechnicalTabProps {
  readonly formData: Variation & { readonly material?: string | null };
  readonly setFormData?: React.Dispatch<React.SetStateAction<Variation | null>>;
  readonly parentProduct: Product & { readonly attributes?: Variation['attributes'] };
  readonly handleChange: <K extends keyof Variation>(field: K, value: Variation[K]) => void;
  readonly showDescription?: boolean;
  readonly requiredFieldsOnly?: boolean;
  readonly isSingleVariation?: boolean;
  readonly showAiImprove?: boolean;
  readonly initialTechnicalFields?: TechnicalFieldDefinition[];
}

const normalizeSearchTerm = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

export const VariationTechnicalTab: React.FC<VariationTechnicalTabProps> = ({
  formData,
  setFormData,
  parentProduct,
  handleChange,
  showDescription = false,
  requiredFieldsOnly = false,
  isSingleVariation = false,
  showAiImprove = false,
  initialTechnicalFields,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [allTechnicalFields, setAllTechnicalFields] = useState<TechnicalFieldDefinition[]>(
    initialTechnicalFields || []
  );
  const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldsError, setFieldsError] = useState('');
  const [characteristicSearchTerm, setCharacteristicSearchTerm] = useState('');
  const [debouncedCharacteristicSearchTerm, setDebouncedCharacteristicSearchTerm] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedCharacteristicSearchTerm(characteristicSearchTerm),
      300
    );
    return () => window.clearTimeout(timeoutId);
  }, [characteristicSearchTerm]);

  // Carregar Informações Técnicas cadastradas e vínculos
  useEffect(() => {
    let isMounted = true;

    // Se já foi fornecido inicialmente e não houve refresh forçado, usa o estado inicial
    if (initialTechnicalFields && initialTechnicalFields.length > 0 && refreshKey === 0) {
      return;
    }

    const loadFields = async () => {
      setLoadingFields(true);
      setFieldsError('');
      try {
        const mapped = await withTimeout(fetchTechnicalFieldDefinitions('variation-form', { forceRefresh: refreshKey > 0 }), 15000, null, 'variacao:caracteristicas');
        if (!isMounted) return;
        if (!mapped) throw new Error('Consulta de características não confirmada.');
        setAllTechnicalFields(mapped);
      } catch {
        if (isMounted) setFieldsError('Não foi possível carregar as características. Consulte novamente.');
      } finally {
        if (isMounted) setLoadingFields(false);
      }
    };

    loadFields();

    return () => {
      isMounted = false;
    };
  }, [refreshKey, initialTechnicalFields]);

  // Características definidas na própria variação (ex: Cor, Material, Tamanho)
  const variationAttributeValues = useMemo(() => {
    const map: Record<string, any> = {};
    (formData?.attributes || []).forEach((attr) => {
      if (attr.name && attr.value !== undefined && attr.value !== null && attr.value !== '') {
        map[attr.name] = attr.value;
        map[attr.name.trim().toLowerCase()] = attr.value;
      }
    });
    return map;
  }, [formData?.attributes]);

  const parentNormalizedValues = useMemo(() => {
    const map: Record<string, any> = {};
    (parentProduct?.attributes || []).forEach((attr) => {
      if (attr.name && attr.value !== undefined && attr.value !== null && attr.value !== '') {
        map[attr.name] = attr.value;
      }
    });
    return { ...map, ...(parentProduct?.technicalValues || {}) };
  }, [parentProduct?.attributes, parentProduct?.technicalValues]);

  const variableFieldNames = useMemo(
    () =>
      resolveVariableTechnicalFieldNames(
        parentProduct.variableTechnicalFields,
        parentProduct.variations?.length ? parentProduct.variations : [formData]
      ),
    [parentProduct.variableTechnicalFields, parentProduct.variations, formData]
  );
  const isVariableField = useCallback(
    (fieldName: string) =>
      isCharacteristicDependent(fieldName)
        ? isCharacteristicDependentOnVariableField(fieldName, variableFieldNames)
        : isTechnicalFieldVariable(fieldName, variableFieldNames),
    [variableFieldNames]
  );

  // Campos visíveis na variação: categorias do pai + valores do pai + overrides da variação + características da variação + manuais
  const combinedValues = useMemo(() => {
    return {
      ...parentNormalizedValues,
      ...variationAttributeValues,
      ...(formData?.technicalValues || {}),
    };
  }, [parentNormalizedValues, variationAttributeValues, formData?.technicalValues]);

  const dependencyValues = useMemo(() => {
    const values = { ...combinedValues };

    const useVariationQuantity = (
      isQuantity: (name: string) => boolean,
      isLegacyToggle: (name: string) => boolean
    ) => {
      const quantityName = allTechnicalFields.find(
        (field) => isQuantity(field.name) && isTechnicalFieldVariable(field.name, variableFieldNames)
      )?.name;
      if (!quantityName) return;

      const ownQuantity =
        Object.entries(formData?.technicalValues || {}).find(([name]) => isQuantity(name)) ||
        Object.entries(variationAttributeValues).find(([name]) => isQuantity(name));
      Object.keys(values).forEach((name) => {
        if (isQuantity(name) || isLegacyToggle(name)) delete values[name];
      });
      if (ownQuantity) values[quantityName] = ownQuantity[1];
    };

    useVariationQuantity(isDoorQuantityCharacteristic, isHasDoorsCharacteristic);
    useVariationQuantity(isDrawerQuantityCharacteristic, isHasDrawersCharacteristic);
    return values;
  }, [
    allTechnicalFields,
    combinedValues,
    formData?.technicalValues,
    variableFieldNames,
    variationAttributeValues,
  ]);

  // Todas as especificações técnicas ativas cadastradas aparecem na variação
  const applicableFields = useMemo(
    () =>
      getApplicableTechnicalFields(
        allTechnicalFields,
        parentProduct.categoryIds || [],
        combinedValues,
        manualFieldNames
      ),
    [allTechnicalFields, parentProduct.categoryIds, combinedValues, manualFieldNames]
  );

  const isChairCategorySelected = /(?:^|[^a-z0-9])cadeiras?(?=$|[^a-z0-9])/i.test(
    normalizeSearchTerm(parentProduct.category || '')
  );
  const isSofaCategorySelected = isSofaCategoryName(parentProduct.category || '');

  const visibleFields = useMemo(() => {
    const fieldsByName = new Map<string, TechnicalFieldDefinition>();
    const selectedCategoryIds = new Set(parentProduct.categoryIds || []);
    [...applicableFields, ...allTechnicalFields].forEach((field) => {
      if (
        isChairWeightCapacityCharacteristic(field.name) &&
        !isChairCategorySelected &&
        !field.categoryIds?.some((id) => selectedCategoryIds.has(id))
      ) {
        return;
      }
      if (!isVariableField(field.name)) return;
      const key = normalizeSearchTerm(field.name);
      const visibleField =
        isSofaCategorySelected && isDepthCharacteristic(field.name)
          ? { ...field, isRequired: false, isRequiredForCatalog: false }
          : field;
      if (!fieldsByName.has(key)) fieldsByName.set(key, visibleField);
    });
    return [...fieldsByName.values()];
  }, [
    allTechnicalFields,
    applicableFields,
    isChairCategorySelected,
    isSofaCategorySelected,
    isVariableField,
    parentProduct.categoryIds,
  ]);

  const requiredFields = useMemo(
    () => visibleFields.filter((field) => field.isRequired || field.isRequiredForCatalog),
    [visibleFields]
  );

  const requiredFieldGroups = useMemo(
    () => groupTechnicalFields(requiredFields),
    [requiredFields]
  );

  const optionalFields = useMemo(
    () => visibleFields.filter((field) => !field.isRequired && !field.isRequiredForCatalog),
    [visibleFields]
  );

  const isOptionalFieldSelected = (field: TechnicalFieldDefinition) => {
    const normalizedFieldName = field.name.trim().toLowerCase();
    const hasAttributeValue =
      variationAttributeValues[field.name] !== undefined ||
      variationAttributeValues[normalizedFieldName] !== undefined;
    const parentValue = parentNormalizedValues[field.name];
    const hasSelectedParentValue =
      Object.prototype.hasOwnProperty.call(parentNormalizedValues, field.name) &&
      !['não se aplica', 'n/a'].includes(normalizeSearchTerm(String(parentValue ?? '')));
    return (
      manualFieldNames.includes(field.name) ||
      hasVariationOverride(formData.technicalValues, field.name) ||
      hasAttributeValue ||
      hasSelectedParentValue ||
      isCharacteristicDependent(field.name)
    );
  };

  const selectedOptionalFields = useMemo(
    () => optionalFields.filter(isOptionalFieldSelected),
    [optionalFields, variationAttributeValues, parentNormalizedValues, manualFieldNames, formData.technicalValues]
  );

  const requiredFieldNames = useMemo(
    () => new Set(requiredFields.map((field) => normalizeSearchTerm(field.name))),
    [requiredFields]
  );

  const searchableOptionalFields = useMemo(
    () =>
      getAvailableAdditionalFields(allTechnicalFields, [
        ...requiredFields,
        ...selectedOptionalFields,
      ]).filter(
        (field) =>
          !requiredFieldNames.has(normalizeSearchTerm(field.name)) &&
          isVariableField(field.name)
      ),
    [
      allTechnicalFields,
      requiredFields,
      selectedOptionalFields,
      requiredFieldNames,
      isVariableField,
    ]
  );

  const normalizedSearchTerm = normalizeSearchTerm(characteristicSearchTerm);
  const normalizedDebouncedSearchTerm = normalizeSearchTerm(debouncedCharacteristicSearchTerm);

  const matchingOptionalFields = useMemo(() => {
    if (
      requiredFieldsOnly ||
      normalizedSearchTerm.length < 3 ||
      normalizedSearchTerm !== normalizedDebouncedSearchTerm
    ) {
      return [];
    }
    return searchableOptionalFields
      .filter((field) => normalizeSearchTerm(field.name).includes(normalizedDebouncedSearchTerm))
      .slice(0, 3);
  }, [requiredFieldsOnly, normalizedSearchTerm, normalizedDebouncedSearchTerm, searchableOptionalFields]);

  const fieldGroups = useMemo(
    () =>
      mergeCharacteristicGroups([
        ...requiredFieldGroups,
        ...groupTechnicalFields(selectedOptionalFields),
      ]),
    [requiredFieldGroups, selectedOptionalFields]
  );


  const handleSetOverride = (fieldName: string, value: any) => {
    const currentOverrides = formData.technicalValues || {};
    const updated = cleanupDependentCharacteristicsOnZero(
      setVariationOverride(currentOverrides, fieldName, value),
      fieldName,
      value
    );
    handleChange('technicalValues', updated);

    // Manter sincronizado com formData.attributes para retrocompatibilidade
    let currentAttrs = [...(formData.attributes || [])];
    const isDoorQuantity = isDoorQuantityCharacteristic(fieldName);
    const isDrawerQuantity = isDrawerQuantityCharacteristic(fieldName);
    const isZero = value === 0 || (typeof value === 'string' && value.trim() === '0');
    if (isDoorQuantity || isDrawerQuantity) {
      currentAttrs = currentAttrs.filter((attribute) => {
        if (isDoorQuantity && isHasDoorsCharacteristic(attribute.name || '')) return false;
        if (isDrawerQuantity && isHasDrawersCharacteristic(attribute.name || '')) return false;
        if (isZero && isDoorQuantity && isDoorDependentCharacteristic(attribute.name || '')) return false;
        if (isZero && isDrawerQuantity && isDrawerDependentCharacteristic(attribute.name || '')) return false;
        return true;
      });
    }
    handleChange(
      'attributes',
      syncProductVariationTechnicalAttribute(
        currentAttrs,
        fieldName,
        value,
        getDefaultShowNameForVariationOverride(fieldName)
      )
    );
  };

  const handleRemoveOverride = (fieldName: string) => {
    const currentOverrides = formData.technicalValues || {};
    const updated = removeVariationOverride(currentOverrides, fieldName);
    handleChange('technicalValues', updated);

    // Ao remover override e voltar a herdar, limpa também a característica correspondente se existir
    const currentAttrs = removeProductVariationTechnicalAttribute(
      formData.attributes || [],
      fieldName
    );
    handleChange('attributes', currentAttrs);
  };

  const handleAddManualField = (field: TechnicalFieldDefinition) => {
    setManualFieldNames((prev) => Array.from(new Set([...prev, field.name])));
    handleSetOverride(field.name, isQuantityCharacteristic(field.name) ? null : '');
    setCharacteristicSearchTerm('');
  };

  const handleRemoveManualField = (fieldName: string) => {
    setManualFieldNames((prev) => prev.filter((name) => name !== fieldName));
    handleRemoveOverride(fieldName);
  };

  const handleToggleDepthLength = (currentField: TechnicalFieldDefinition) => {
    const isProfundidade = isDepthCharacteristic(currentField.name);
    const isTotal = currentField.name.toLowerCase().includes('total');
    const targetName = isProfundidade
      ? (isTotal ? 'Comprimento total' : 'Comprimento')
      : (isTotal ? 'Profundidade total' : 'Profundidade');
    const oldName = currentField.name;

    const newFieldDef =
      allTechnicalFields.find((f) => f.name.toLowerCase() === targetName.toLowerCase()) ||
      allTechnicalFields.find((f) =>
        isProfundidade
          ? f.name.toLowerCase().includes('comprimento')
          : f.name.toLowerCase().includes('profundidade')
      );
    if (!newFieldDef) {
      console.warn(`Campo '${targetName}' não encontrado no cadastro global de características.`);
      return;
    }
    const actualNewName = newFieldDef.name;

    const currentValue = getEffectiveTechnicalValue(
      parentProduct?.technicalValues || {},
      { ...variationAttributeValues, ...(formData.technicalValues || {}) },
      oldName
    );

    // Atualiza technicalValues de forma atômica para evitar stale closure
    const currentOverrides = formData.technicalValues || {};
    let nextOverrides = setVariationOverride(currentOverrides, actualNewName, currentValue || '');
    nextOverrides = removeVariationOverride(nextOverrides, oldName);
    handleChange('technicalValues', nextOverrides);

    // Atualiza attributes de forma atômica
    const nextAttrs = [...(formData.attributes || [])];
    const oldIdx = nextAttrs.findIndex(
      (a) => a.name?.trim().toLowerCase() === oldName.trim().toLowerCase()
    );
    if (oldIdx >= 0) {
      nextAttrs.splice(oldIdx, 1);
    }
    if (currentValue) {
      nextAttrs.push({
        name: actualNewName,
        value: String(currentValue),
        showName: true,
      });
    }
    handleChange('attributes', nextAttrs);

    setManualFieldNames((prev) => {
      const filtered = prev.filter((n) => n !== oldName && n !== actualNewName);
      return [...filtered, actualNewName];
    });
  };

  const searchControl = !requiredFieldsOnly ? (
    <VariationTechnicalSearchControl
      searchTerm={characteristicSearchTerm}
      debouncedSearchTerm={debouncedCharacteristicSearchTerm}
      matchingFields={matchingOptionalFields}
      onSearchTermChange={setCharacteristicSearchTerm}
      onAddField={handleAddManualField}
    />
  ) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-350">
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
          Características específicas
        </h3>
        <p className="mt-1 text-[10px] font-semibold text-slate-500">
          Os campos fixos vêm do produto pai; esta aba mostra somente os campos variáveis.
        </p>
      </div>
      {fieldsError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{fieldsError} <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loadingFields}>Consultar características novamente</button></p>}
      <div className="flex flex-col gap-4">
        {loadingFields ? (
          <div role="status" className="py-6 text-center text-slate-400 text-xs font-bold animate-pulse">
            <i className="bi bi-arrow-clockwise animate-spin mr-2" />
            Carregando especificações técnicas...
          </div>
        ) : requiredFieldsOnly && visibleFields.length === 0 && !fieldsError ? (
          <div className="py-6 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            Nenhuma característica cadastrada.
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-1">
            {fieldGroups.map((group, index) => (
              <React.Fragment key={group.title}>
                {index === requiredFieldGroups.length && searchControl}
                <section
                  aria-labelledby={`variation-technical-group-${group.title}`}
                  className="flex flex-col gap-3"
                >
                  <h4
                    id={`variation-technical-group-${group.title}`}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2"
                  >
                    {group.title}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {group.fields.map((field) => (
                      <VariationTechnicalFieldItem
                        key={field.id}
                        field={field}
                        parentNormalizedValues={parentNormalizedValues}
                        variationAttributeValues={variationAttributeValues}
                        dependencyValues={dependencyValues}
                        formDataTechnicalValues={formData.technicalValues}
                        isManual={manualFieldNames.includes(field.name)}
                        isVariable
                        isSingleVariation={isSingleVariation}
                        onSetOverride={handleSetOverride}
                        onRemoveManualField={handleRemoveManualField}
                        onToggleDepthLength={handleToggleDepthLength}
                        onOpenAttributeModal={() => setIsAttributeModalOpen(true)}
                      />
                    ))}
                  </div>
                </section>
              </React.Fragment>
            ))}
            {fieldGroups.length === requiredFieldGroups.length && searchControl}
          </div>
        )}
      </div>

      {showDescription && (
        <VariationTechnicalDescriptionSection
          formData={formData}
          parentProduct={parentProduct}
          handleChange={handleChange}
          isSingleVariation={isSingleVariation}
          showAiImprove={showAiImprove}
          parentNormalizedValues={parentNormalizedValues}
        />
      )}

      <AttributeManagementModal
        isOpen={isAttributeModalOpen}
        focusAttributeName="Cor"
        onClose={() => {
          setIsAttributeModalOpen(false);
          setRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
};
