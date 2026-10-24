import React from 'react';
import type { Product } from '../../../../../types/product.type';
import { AttributeManagementModal } from '../../modals/attributes/AttributeManagementModal';
import { useProductTechnicalTab } from './useProductTechnicalTab';
import { TechnicalCharacteristicSearch } from './TechnicalCharacteristicSearch';
import { TechnicalFieldGroupSection } from './TechnicalFieldGroupSection';
import { TechnicalTabFeedbackState } from './TechnicalTabFeedbackState';
import { resolveVariableTechnicalFieldNames } from '@/pages/utils/technicalValuesService';

export interface ProductTechnicalTabProps {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly categoryName?: string;
  readonly isAdministrator?: boolean;
  readonly requiredFieldsOnly?: boolean;
  readonly validationErrors?: Record<string, boolean>;
}

const getSearchInsertionIndex = (
  groups: readonly { title: string }[],
  requiredGroupsCount: number
): number => {
  if (groups.length === 0) return 0;
  const principalIndex = groups.findIndex((g) => g.title === 'Características principais');
  const dimensionsIndex = groups.findIndex((g) => g.title === 'Dimensões e Peso');
  if (principalIndex >= 0 || dimensionsIndex >= 0) {
    return Math.max(principalIndex, dimensionsIndex) + 1;
  }
  return Math.min(requiredGroupsCount, groups.length);
};

export const ProductTechnicalTab: React.FC<ProductTechnicalTabProps> = ({
  formData,
  setFormData,
  categoryName = '',
  isAdministrator: _isAdministratorProp,
  requiredFieldsOnly = false,
  validationErrors,
}) => {
  const {
    loadingFields,
    visibleFields,
    fieldGroups,
    requiredFieldGroups,
    manualFieldNames,
    characteristicSearchTerm,
    normalizedSearchTerm,
    normalizedDebouncedSearchTerm,
    matchingOptionalFields,
    matchingGroups,
    isAttributeModalOpen,
    setCharacteristicSearchTerm,
    handleTechnicalValueChange,
    handleToggleVariableField,
    handleAddManualField,
    handleAddGroup,
    handleRemoveManualField,
    handleToggleDepthLength,
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

  const searchControl = !requiredFieldsOnly ? (
    <TechnicalCharacteristicSearch
      searchTerm={characteristicSearchTerm}
      onSearchTermChange={setCharacteristicSearchTerm}
      normalizedSearchTerm={normalizedSearchTerm}
      normalizedDebouncedSearchTerm={normalizedDebouncedSearchTerm}
      matchingFields={matchingOptionalFields}
      matchingGroups={matchingGroups}
      onAddField={handleAddManualField}
      onAddGroup={handleAddGroup}
    />
  ) : null;

  const searchInsertionIndex = getSearchInsertionIndex(
    fieldGroups,
    requiredFieldGroups.length
  );
  const mainGroup = fieldGroups.find((group) => group.title === 'Características principais');
  const dimensionsGroup = fieldGroups.find((group) => group.title === 'Dimensões e Peso');
  const mainGroupIndex = fieldGroups.findIndex(
    (group) => group.title === 'Características principais'
  );
  const dimensionsGroupIndex = fieldGroups.findIndex(
    (group) => group.title === 'Dimensões e Peso'
  );
  const mainGroupRenderIndex = [mainGroupIndex, dimensionsGroupIndex]
    .filter((index) => index >= 0)
    .reduce((earliest, index) => Math.min(earliest, index), fieldGroups.length);

  const renderGroup = (group: (typeof fieldGroups)[number], hideHeading = false) => (
    <TechnicalFieldGroupSection
      group={group}
      formData={formData}
      manualFieldNames={manualFieldNames}
      validationErrors={validationErrors}
      variableTechnicalFieldNames={variableTechnicalFieldNames}
      isSimpleProduct={isSimpleProduct}
      hideHeading={hideHeading}
      onToggleVariableField={handleToggleVariableField}
      onValueChange={handleTechnicalValueChange}
      onOpenAttributeModal={openAttributeModal}
      onToggleDepthLength={handleToggleDepthLength}
      onRemoveManualField={handleRemoveManualField}
    />
  );

  const showEmptyMessage = requiredFieldsOnly && visibleFields.length === 0;

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
            {fieldGroups.length === 0 && searchControl}
            {fieldGroups.map((group, index) => {
              const isMainCharacteristicsGroup =
                group.title === 'Características principais' || group.title === 'Dimensões e Peso';

              if (isMainCharacteristicsGroup) {
                if (index !== mainGroupRenderIndex) return null;

                return (
                  <React.Fragment key="Características principais">
                    <section
                      aria-labelledby="technical-group-Características principais"
                      className="flex flex-col gap-3"
                    >
                      <h4
                        id="technical-group-Características principais"
                        className="flex items-center gap-1.5 border-b border-slate-200 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:text-slate-400"
                      >
                        Características principais
                      </h4>
                      {mainGroup && renderGroup(mainGroup, true)}
                      {dimensionsGroup && (
                        <div className="ml-2 border-l border-slate-200 pl-3 dark:border-slate-800">
                          {renderGroup(dimensionsGroup)}
                        </div>
                      )}
                    </section>
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={group.title}>
                  {index === searchInsertionIndex && searchControl}
                  {renderGroup(group)}
                </React.Fragment>
              );
            })}
            {fieldGroups.length > 0 && searchInsertionIndex >= fieldGroups.length && searchControl}
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
