import React, { useState, useEffect, useMemo } from 'react';
import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import {
  TechnicalFieldDefinition,
  getAvailableAdditionalFields,
  getApplicableTechnicalFields,
  getEffectiveTechnicalValue,
  hasVariationOverride,
  setVariationOverride,
  removeVariationOverride,
  groupTechnicalFields,
  isDepthCharacteristic,
} from '@/pages/utils/technicalValuesService';
import { fetchTechnicalFieldDefinitions } from '../../services/technicalFieldService';
import { AttributeManagementModal } from '../modals/attributes/AttributeManagementModal';
import { VariationTechnicalFieldItem } from './VariationTechnicalFieldItem';
import { VariationTechnicalSearchControl } from './VariationTechnicalSearchControl';
import { VariationTechnicalDescriptionSection } from './VariationTechnicalDescriptionSection';

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
      try {
        const mapped = await fetchTechnicalFieldDefinitions('variation-form');
        if (!isMounted) return;
        setAllTechnicalFields(mapped || []);
      } catch (err) {
        console.error('Erro ao carregar Características na variação:', err);
      } finally {
        if (isMounted) setLoadingFields(false);
      }
    };

    loadFields();

    return () => {
      isMounted = false;
    };
  }, [refreshKey, initialTechnicalFields]);

  // Atributos definidos na própria variação (ex: Cor, Material, Tamanho)
  const variationAttributeValues = useMemo(() => {
    const map: Record<string, any> = {};
    (formData?.attributes || []).forEach((attr) => {
      if (attr.name && attr.value) {
        map[attr.name] = attr.value;
        map[attr.name.trim().toLowerCase()] = attr.value;
      }
    });
    return map;
  }, [formData?.attributes]);

  const parentNormalizedValues = useMemo(() => {
    const map: Record<string, any> = {};
    (parentProduct?.attributes || []).forEach((attr) => {
      if (attr.name && attr.value) {
        map[attr.name] = attr.value;
      }
    });
    return { ...map, ...(parentProduct?.technicalValues || {}) };
  }, [parentProduct?.attributes, parentProduct?.technicalValues]);

  // Campos visíveis na variação: categorias do pai + valores do pai + overrides da variação + atributos da variação + manuais
  const combinedValues = useMemo(() => {
    return {
      ...parentNormalizedValues,
      ...variationAttributeValues,
      ...(formData?.technicalValues || {}),
    };
  }, [parentNormalizedValues, variationAttributeValues, formData?.technicalValues]);

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

  const visibleFields = useMemo(
    () => (requiredFieldsOnly ? applicableFields.filter((field) => field.isRequired) : applicableFields),
    [applicableFields, requiredFieldsOnly]
  );

  const requiredFields = useMemo(
    () => visibleFields.filter((field) => field.isRequired),
    [visibleFields]
  );

  const requiredFieldGroups = useMemo(
    () => groupTechnicalFields(requiredFields),
    [requiredFields]
  );

  const optionalFields = useMemo(
    () => visibleFields.filter((field) => !field.isRequired),
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
      hasSelectedParentValue
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
      ]).filter((field) => !requiredFieldNames.has(normalizeSearchTerm(field.name))),
    [allTechnicalFields, requiredFields, selectedOptionalFields, requiredFieldNames]
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
    () => [...requiredFieldGroups, ...groupTechnicalFields(selectedOptionalFields)],
    [requiredFieldGroups, selectedOptionalFields]
  );

  const handleSetOverride = (fieldName: string, value: any) => {
    const currentOverrides = formData.technicalValues || {};
    const updated = setVariationOverride(currentOverrides, fieldName, value);
    handleChange('technicalValues', updated);

    // Manter sincronizado com formData.attributes para retrocompatibilidade
    const currentAttrs = [...(formData.attributes || [])];
    const lowerName = fieldName.trim().toLowerCase();
    const existingIdx = currentAttrs.findIndex((a) => a.name?.trim().toLowerCase() === lowerName);
    if (value) {
      if (existingIdx >= 0) {
        currentAttrs[existingIdx] = { ...currentAttrs[existingIdx], value: String(value) };
      } else {
        currentAttrs.push({
          name: fieldName,
          value: String(value),
          showName: !/^cor$/i.test(fieldName.trim()),
        });
      }
      handleChange('attributes', currentAttrs);
    } else if (existingIdx >= 0) {
      currentAttrs.splice(existingIdx, 1);
      handleChange('attributes', currentAttrs);
    }
  };

  const handleRemoveOverride = (fieldName: string) => {
    const currentOverrides = formData.technicalValues || {};
    const updated = removeVariationOverride(currentOverrides, fieldName);
    handleChange('technicalValues', updated);

    // Ao remover override e voltar a herdar, limpa também atributo correspondente se existir
    const currentAttrs = (formData.attributes || []).filter(
      (a) => a.name?.trim().toLowerCase() !== fieldName.trim().toLowerCase()
    );
    handleChange('attributes', currentAttrs);
  };

  const handleAddManualField = (field: TechnicalFieldDefinition) => {
    setManualFieldNames((prev) => Array.from(new Set([...prev, field.name])));
    handleSetOverride(field.name, '');
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
    let nextAttrs = [...(formData.attributes || [])];
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
      <div className="flex flex-col gap-4">
        {loadingFields ? (
          <div className="py-6 text-center text-slate-400 text-xs font-bold animate-pulse">
            <i className="bi bi-arrow-clockwise animate-spin mr-2" />
            Carregando especificações técnicas...
          </div>
        ) : requiredFieldsOnly && visibleFields.length === 0 ? (
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
                        formDataTechnicalValues={formData.technicalValues}
                        isManual={manualFieldNames.includes(field.name)}
                        isSingleVariation={isSingleVariation}
                        onSetOverride={handleSetOverride}
                        onRemoveOverride={handleRemoveOverride}
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
