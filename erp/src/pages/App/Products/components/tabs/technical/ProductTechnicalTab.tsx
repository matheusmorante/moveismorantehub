import React from 'react';
import type { Product } from '../../../../../types/product.type';
import { AttributeManagementModal } from '../../modals/attributes/AttributeManagementModal';
import { useProductTechnicalTab } from './useProductTechnicalTab';
import { TechnicalCharacteristicSearch } from './TechnicalCharacteristicSearch';
import { TechnicalFieldGroupSection } from './TechnicalFieldGroupSection';
import { TechnicalTabFeedbackState } from './TechnicalTabFeedbackState';

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
  return principalIndex >= 0 ? principalIndex + 1 : Math.min(requiredGroupsCount, groups.length);
};

export const ProductTechnicalTab: React.FC<ProductTechnicalTabProps> = ({
  formData,
  setFormData,
  categoryName: _categoryName = '',
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
    handleAddManualField,
    handleAddGroup,
    handleRemoveManualField,
    handleToggleDepthLength,
    openAttributeModal,
    closeAttributeModal,
  } = useProductTechnicalTab({
    formData,
    setFormData,
    requiredFieldsOnly,
  });

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
            {fieldGroups.map((group, index) => (
              <React.Fragment key={group.title}>
                {index === searchInsertionIndex && searchControl}
                <TechnicalFieldGroupSection
                  group={group}
                  formData={formData}
                  manualFieldNames={manualFieldNames}
                  validationErrors={validationErrors}
                  onValueChange={handleTechnicalValueChange}
                  onOpenAttributeModal={openAttributeModal}
                  onToggleDepthLength={handleToggleDepthLength}
                  onRemoveManualField={handleRemoveManualField}
                />
              </React.Fragment>
            ))}
            {fieldGroups.length > 0 && searchInsertionIndex >= fieldGroups.length && searchControl}
          </div>
        )}
      </div>

      {/* Descrição Detalhada do Produto */}
      <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
        <label
          htmlFor="field-product-description"
          className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
        >
          <i className="bi bi-file-text text-blue-600" aria-hidden="true" />
          <span>Descrição Detalhada</span>
        </label>
        <textarea
          id="field-product-description"
          rows={10}
          aria-label="Descrição detalhada do produto"
          value={formData.description || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Escreva a descrição detalhada do produto, diferenciais, especificações técnicas..."
          className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent outline-none text-xs font-semibold resize-y dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400 transition-all min-h-[180px]"
        />
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
