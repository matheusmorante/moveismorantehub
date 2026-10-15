import React from 'react';
import type { Product } from '../../../../../types/product.type';
import { AttributeManagementModal } from '../../modals/attributes/AttributeManagementModal';
import { useProductTechnicalTab } from './useProductTechnicalTab';
import { TechnicalCharacteristicSearch } from './TechnicalCharacteristicSearch';
import { TechnicalFieldRow } from './TechnicalFieldRow';

export interface ProductTechnicalTabProps {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly handleImproveDescriptionWithAI?: () => void;
  readonly isImprovingDescription?: boolean;
  readonly requiredFieldsOnly?: boolean;
  readonly validationErrors?: Record<string, boolean>;
}

export const ProductTechnicalTab: React.FC<ProductTechnicalTabProps> = ({
  formData,
  setFormData,
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
    isAttributeModalOpen,
    setCharacteristicSearchTerm,
    handleTechnicalValueChange,
    handleAddManualField,
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
      onAddField={handleAddManualField}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-4">
        {loadingFields ? (
          <div className="py-8 text-center text-slate-400 text-xs font-bold animate-pulse">
            <i className="bi bi-arrow-clockwise animate-spin mr-2" />
            Carregando especificações técnicas...
          </div>
        ) : requiredFieldsOnly && visibleFields.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2">
            <i className="bi bi-info-circle text-lg text-slate-400" />
            <span>Nenhuma especificação técnica cadastrada no sistema.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-2">
            {fieldGroups.map((group, index) => (
              <React.Fragment key={group.title}>
                {index === requiredFieldGroups.length && searchControl}
                <section
                  aria-labelledby={`technical-group-${group.title}`}
                  className="flex flex-col gap-3"
                >
                  <h4
                    id={`technical-group-${group.title}`}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2"
                  >
                    {group.title}
                  </h4>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,280px))] gap-x-5 gap-y-4">
                    {group.fields.map((field) => (
                      <TechnicalFieldRow
                        key={field.id}
                        field={field}
                        formData={formData}
                        manualFieldNames={manualFieldNames}
                        validationErrors={validationErrors}
                        onValueChange={handleTechnicalValueChange}
                        onOpenAttributeModal={openAttributeModal}
                        onToggleDepthLength={handleToggleDepthLength}
                        onRemoveManualField={handleRemoveManualField}
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

      <AttributeManagementModal
        isOpen={isAttributeModalOpen}
        focusAttributeName="Cor"
        onClose={closeAttributeModal}
      />
    </div>
  );
};

export default ProductTechnicalTab;
