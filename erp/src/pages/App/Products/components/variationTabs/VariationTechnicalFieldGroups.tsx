import React from 'react';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { VariationTechnicalFieldItem } from './VariationTechnicalFieldItem';

interface FieldGroup {
  readonly title: string;
  readonly fields: TechnicalFieldDefinition[];
}

interface Props {
  readonly fieldGroups: FieldGroup[];
  readonly requiredGroupCount: number;
  readonly searchControl: React.ReactNode;
  readonly parentNormalizedValues: Record<string, any>;
  readonly variationAttributeValues: Record<string, any>;
  readonly dependencyValues: Record<string, any>;
  readonly formDataTechnicalValues?: Record<string, any>;
  readonly manualFieldNames: string[];
  readonly isSingleVariation: boolean;
  readonly onSetOverride: (fieldName: string, value: any) => void;
  readonly onRemoveManualField: (fieldName: string) => void;
  readonly onOpenAttributeModal: () => void;
}

export const VariationTechnicalFieldGroups: React.FC<Props> = ({
  fieldGroups,
  requiredGroupCount,
  searchControl,
  parentNormalizedValues,
  variationAttributeValues,
  dependencyValues,
  formDataTechnicalValues,
  manualFieldNames,
  isSingleVariation,
  onSetOverride,
  onRemoveManualField,
  onOpenAttributeModal,
}) => (
  <div className="flex flex-col gap-6 pt-1">
    {fieldGroups.map((group, index) => (
      <React.Fragment key={group.title}>
        {index === requiredGroupCount && searchControl}
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
                formDataTechnicalValues={formDataTechnicalValues}
                isManual={manualFieldNames.includes(field.name)}
                isVariable
                isSingleVariation={isSingleVariation}
                onSetOverride={onSetOverride}
                onRemoveManualField={onRemoveManualField}
                onOpenAttributeModal={onOpenAttributeModal}
              />
            ))}
          </div>
        </section>
      </React.Fragment>
    ))}
    {fieldGroups.length === requiredGroupCount && searchControl}
  </div>
);
