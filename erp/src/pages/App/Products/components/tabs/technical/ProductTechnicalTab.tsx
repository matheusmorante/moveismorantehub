import React, { useEffect, useState } from 'react';
import type { Product } from '../../../../../types/product.type';
import { AttributeManagementModal } from '../../modals/attributes/AttributeManagementModal';
import { useProductTechnicalTab } from './useProductTechnicalTab';
import { TechnicalCharacteristicSearch } from './TechnicalCharacteristicSearch';
import { TechnicalFieldGroupSection } from './TechnicalFieldGroupSection';
import { TechnicalTabFeedbackState } from './TechnicalTabFeedbackState';
import {
  resolveVariableTechnicalFieldNames,
  groupTechnicalFields,
  mergeCharacteristicGroups,
} from '@/pages/utils/technicalValuesService';
import { areTechnicalCharacteristicNamesEquivalent } from '../../../../../../../../shared-utils/productTechnicalFieldScope';

export interface ProductTechnicalTabProps {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly categoryName?: string;
  readonly isAdministrator?: boolean;
  readonly requiredFieldsOnly?: boolean;
  readonly validationErrors?: Record<string, boolean>;
}

export const ProductTechnicalTab: React.FC<ProductTechnicalTabProps> = ({
  formData,
  setFormData,
  categoryName = '',
  isAdministrator: _isAdministratorProp,
  requiredFieldsOnly = false,
  validationErrors,
}) => {
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set());
  const [highlightedFieldName, setHighlightedFieldName] = useState<string | null>(null);
  const {
    loadingFields,
    visibleFields,
    requiredFieldGroups,
    displayedOptionalFields,
    manualFieldNames,
    characteristicSearchTerm,
    normalizedSearchTerm,
    normalizedDebouncedSearchTerm,
    matchingOptionalFields,
    matchingGroups,
    matchingProductGroups,
    matchingProductGroupFields,
    productGroupSections,
    isAttributeModalOpen,
    setCharacteristicSearchTerm,
    handleTechnicalValueChange,
    handleToggleVariableField,
    handleAddGroup,
    handleAddCharacteristicGroup,
    handleToggleCharacteristic,
    handleSetCharacteristicScope,
    handleAddCharacteristicFromSearch,
    handleRemoveManualField,
    openAttributeModal,
    closeAttributeModal,
  } = useProductTechnicalTab({
    formData,
    setFormData,
    categoryName,
    requiredFieldsOnly,
  });
  const variableTechnicalFieldNames = resolveVariableTechnicalFieldNames(
    formData.variableTechnicalFields,
    formData.variations || []
  );
  const isSimpleProduct =
    !formData.hasVariations && (formData.variations || []).length <= 1;

  const locateGroup = (groupId: string) => {
    const group = productGroupSections.find((candidate) => candidate.id === groupId);
    if (!group) return;
    setCollapsedGroupIds((current) => {
      const next = new Set(current);
      next.delete(group.id);
      return next;
    });
    setCharacteristicSearchTerm('');
    setHighlightedFieldName(null);
    document.getElementById(`technical-group-${group.name}`)?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const locateCharacteristic = (field: (typeof visibleFields)[number]) => {
    const group = field.groupId
      ? productGroupSections.find((candidate) => candidate.id === field.groupId)
      : undefined;
    if (group) {
      setCollapsedGroupIds((current) => {
        const next = new Set(current);
        next.delete(group.id);
        return next;
      });
    }
    setCharacteristicSearchTerm('');
    setHighlightedFieldName(field.name);
  };

  const addSearchGroup = (groupId: string, characteristicName?: string) => {
    handleAddCharacteristicGroup(groupId, characteristicName);
    setCollapsedGroupIds((current) => {
      const next = new Set(current);
      next.delete(groupId);
      return next;
    });
    setHighlightedFieldName(characteristicName ?? null);
  };

  useEffect(() => {
    if (!highlightedFieldName) return;
    const target = document.getElementById(`technical-field-${highlightedFieldName}`);
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const timeoutId = window.setTimeout(() => setHighlightedFieldName(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedFieldName]);

  const searchControl = !requiredFieldsOnly ? (
    <TechnicalCharacteristicSearch
      searchTerm={characteristicSearchTerm}
      onSearchTermChange={setCharacteristicSearchTerm}
      normalizedSearchTerm={normalizedSearchTerm}
      normalizedDebouncedSearchTerm={normalizedDebouncedSearchTerm}
      matchingFields={matchingOptionalFields}
      matchingGroups={matchingGroups}
      matchingProductGroups={matchingProductGroups}
      matchingProductGroupFields={matchingProductGroupFields}
      isSimpleProduct={isSimpleProduct}
      onAddField={(field) => {
        const existingField = visibleFields.find((candidate) =>
          areTechnicalCharacteristicNamesEquivalent(candidate.name, field.name)
        );
        if (existingField) locateCharacteristic(existingField);
        else handleAddCharacteristicFromSearch(field);
      }}
      onAddGroup={handleAddGroup}
      onAddCharacteristicGroup={addSearchGroup}
      onToggleCharacteristic={(field) => {
        if (field.characteristicActive) handleToggleCharacteristic(field);
        else if (field.groupId) handleAddCharacteristicGroup(field.groupId, field.name);
        else handleAddCharacteristicFromSearch(field);
      }}
      onSetCharacteristicScope={handleSetCharacteristicScope}
      onLocateCharacteristic={locateCharacteristic}
      onLocateGroup={locateGroup}
    />
  ) : null;

  const legacyOptionalGroups = !requiredFieldsOnly
    ? groupTechnicalFields(displayedOptionalFields)
    : [];
  const legacyFieldGroups = mergeCharacteristicGroups([
    ...requiredFieldGroups,
    ...legacyOptionalGroups,
  ]);
  const requiredProductGroups = productGroupSections.filter(
    (group) => group.fields.some((field) =>
      field.isRequired || field.isRequiredForCatalog ||
      (requiredFieldsOnly && field.isRequiredForProductEntry)
    )
  );
  const optionalProductGroups = productGroupSections.filter(
    (group) => !requiredProductGroups.includes(group)
  );
  const allProductGroups = productGroupSections.map((group) => ({
    title: group.name,
    fields: group.fields,
  }));
  const fieldGroups = [...legacyFieldGroups, ...allProductGroups];
  const allDisplayedFields = fieldGroups.flatMap((group) => group.fields);

  const toggleGroupExpanded = (groupId: string) => {
    setCollapsedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const renderGroup = (
    group: (typeof fieldGroups)[number],
    hideHeading = false,
    headingAccessory?: React.ReactNode,
    productGroup?: (typeof productGroupSections)[number]
  ) => (
    <TechnicalFieldGroupSection
      key={productGroup?.id ?? group.title}
      group={group}
      headingAccessory={headingAccessory}
      collapsible={Boolean(productGroup)}
      expanded={productGroup ? !collapsedGroupIds.has(productGroup.id) : true}
      onToggleExpanded={productGroup ? () => toggleGroupExpanded(productGroup.id) : undefined}
      allDisplayedFields={allDisplayedFields}
      formData={formData}
      manualFieldNames={manualFieldNames}
      validationErrors={validationErrors}
      highlightedFieldName={highlightedFieldName}
      variableTechnicalFieldNames={variableTechnicalFieldNames}
      isSimpleProduct={isSimpleProduct}
      suppressImplicitFields={Boolean(productGroup)}
      hideSimpleFieldToggles={false}
      hideHeading={hideHeading}
      onToggleVariableField={handleToggleVariableField}
      onToggleCharacteristic={productGroup && isSimpleProduct ? handleToggleCharacteristic : undefined}
      onValueChange={handleTechnicalValueChange}
      onOpenAttributeModal={openAttributeModal}
      onRemoveManualField={handleRemoveManualField}
    />
  );

  const hasVisibleProductGroupFields = productGroupSections.some((group) => group.fields.length > 0);
  const showEmptyMessage =
    requiredFieldsOnly && visibleFields.length === 0 && !hasVisibleProductGroupFields;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-4">
        {loadingFields || showEmptyMessage ? (
          <TechnicalTabFeedbackState
            loading={loadingFields}
            showEmpty={showEmptyMessage}
          />
        ) : (
          <div className="flex flex-col gap-6 pt-2">
            {searchControl}
            {(requiredFieldGroups.length > 0 || requiredProductGroups.length > 0) && (
              <section aria-labelledby="technical-required-groups" className="flex flex-col gap-3">
      <h4 id="technical-required-groups" className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  <span>Características adicionadas</span>
                  <span className="text-[10px] font-semibold normal-case tracking-normal text-slate-400">
                    {requiredProductGroups.length + requiredFieldGroups.length}{' '}
                    {requiredProductGroups.length + requiredFieldGroups.length === 1 ? 'grupo' : 'grupos'}
                  </span>
                </h4>
                {requiredProductGroups.map((productGroup) =>
                  renderGroup(
                    { title: productGroup.name, fields: productGroup.fields },
                    false,
                    undefined,
                    productGroup
                  )
                )}
                {requiredFieldGroups.map((group) => (
                  <React.Fragment key={`legacy-required-${group.title}`}>
                    {renderGroup(group)}
                  </React.Fragment>
                ))}
              </section>
            )}

            {!requiredFieldsOnly && (legacyOptionalGroups.length > 0 || optionalProductGroups.length > 0) && (
              <section aria-labelledby="technical-optional-groups" className="flex flex-col gap-3">
                <h4 id="technical-optional-groups" className="border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  Características opcionais adicionadas
                </h4>
                {optionalProductGroups.map((productGroup) =>
                  renderGroup(
                    { title: productGroup.name, fields: productGroup.fields },
                    false,
                    undefined,
                    productGroup
                  )
                )}
                {legacyOptionalGroups.map((group) => (
                  <React.Fragment key={`legacy-optional-${group.title}`}>
                    {renderGroup(group)}
                  </React.Fragment>
                ))}
              </section>
            )}

          </div>
        )}
      </div>

      <AttributeManagementModal
        isOpen={isAttributeModalOpen}
        focusAttributeName="Cor"
        onClose={closeAttributeModal}
      />
    </div>
  );
};

export default ProductTechnicalTab;
