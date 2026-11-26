import type React from 'react';
import { Text, View } from 'react-native';
import {
  getProductTechnicalFieldDisplayName,
  getTechnicalValue,
  hasTechnicalValue,
  isProductTechnicalFieldRequiredForCatalog,
} from '../../../domain/productCharacteristics';
import {
  applyProductCharacteristicToVariationNames,
  canUseProductCharacteristicInVariationName,
  isProductCharacteristicIncludedInVariationNames,
} from '../../../domain/productVariationName';
import {
  getProductTechnicalDimensionField,
} from '../../../../../../../shared-utils/productTechnicalDimensions';
import {
  getCharacteristicDependencyState,
  isCharacteristicDependent,
  isCharacteristicDependentOnVariableField,
  isQuantityCharacteristic,
  type CharacteristicDependencyState,
} from '../../../../../../../shared-utils/productCharacteristicDependencies';
import {
  isDresserOrWardrobeCategoryName,
  isDresserOrWardrobeRequiredCharacteristic,
} from '../../../../../../../shared-utils/productTechnicalFieldScope';
import { ProductTechnicalFieldActions } from './ProductTechnicalFieldActions';
import { ProductTechnicalFieldInput } from './ProductTechnicalFieldInput';
import { ProductTechnicalFieldScopeControl } from './ProductTechnicalFieldScopeControl';
import { normalizeName, normalizeSearchTerm } from './productTechnicalTabFieldVisibility';
import { styles } from './productFormTechnicalTab.styles';

interface ProductTechnicalFieldItemProps {
  field: any;
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  parentData?: any;
  dark: boolean;
  isSimpleProduct: boolean;
  isSingleVariation: boolean;
  categoryIds: string[];
  selectedCategoryName: string;
  ownTechnicalValues: Record<string, any>;
  parentTechnicalValues: Record<string, any>;
  dependencyValues: Record<string, any>;
  variableTechnicalFieldNames: string[];
  manualFieldNames: string[];
  visibleDependencyReason: string | null;
  setVisibleDependencyReason: React.Dispatch<React.SetStateAction<string | null>>;
  isFieldRequired: (field: any) => boolean;
  isVariableField: (name: string) => boolean;
  onSetTechnicalValue: (name: string, value: any) => void;
  onRemoveManualVariationField: (fieldName: string) => void;
  onSetFieldScope: (fieldName: string, scope: 'global' | 'variation' | 'not_inform') => void;
  onToggleDepthLength: (field: any) => void;
}

/** Renderiza uma característica técnica com cabeçalho, escopo, dependência e controle de entrada. */
export const ProductTechnicalFieldItem: React.FC<ProductTechnicalFieldItemProps> = ({
  field,
  formData,
  setFormData,
  parentData,
  dark,
  isSimpleProduct,
  isSingleVariation,
  categoryIds,
  selectedCategoryName,
  ownTechnicalValues,
  parentTechnicalValues,
  dependencyValues,
  variableTechnicalFieldNames,
  manualFieldNames,
  visibleDependencyReason,
  setVisibleDependencyReason,
  isFieldRequired,
  isVariableField,
  onSetTechnicalValue,
  onRemoveManualVariationField,
  onSetFieldScope,
  onToggleDepthLength,
}) => {
  const hasOwnValue = hasTechnicalValue(ownTechnicalValues, field.name);
  const ownValue = getTechnicalValue(ownTechnicalValues, field.name);
  const parentValue = getTechnicalValue(parentTechnicalValues, field.name);
  const isCurrentVariableField = !isSimpleProduct && isVariableField(field.name);
  const isDependencyVariable = isCharacteristicDependentOnVariableField(
    field.name,
    variableTechnicalFieldNames
  );
  const storedValue = hasOwnValue
    ? ownValue
    : parentData && isCurrentVariableField
      ? ''
      : (parentValue ?? '');
  const currentValue = Array.isArray(storedValue)
    ? storedValue.join(', ')
    : String(storedValue ?? '');
  const isExplicitlyNotApplicable = ['nao se aplica', 'n/a', 'nao informar'].includes(
    normalizeSearchTerm(currentValue)
  );
  const isDependentCharacteristic = isCharacteristicDependent(field.name);
  const currentFieldIsRequired = isFieldRequired(field);
  const requiredForCatalog = isProductTechnicalFieldRequiredForCatalog(
    field,
    categoryIds,
    selectedCategoryName
  );
  const alwaysApplicable =
    currentFieldIsRequired ||
    (!parentData && requiredForCatalog && isSimpleProduct) ||
    Boolean(
      parentData &&
        isCurrentVariableField &&
        (!isDependentCharacteristic || requiredForCatalog)
    );
  const dependencyState: CharacteristicDependencyState = getCharacteristicDependencyState(
    field.name,
    dependencyValues
  );
  const isDependencyDisabled = dependencyState.isDisabled;
  const isDependencySatisfied = dependencyState.isDependent && !isDependencyDisabled;
  const currentScope = isCurrentVariableField
    ? 'variation'
    : requiredForCatalog
      ? 'global'
      : isExplicitlyNotApplicable
        ? 'not_inform'
        : hasTechnicalValue(ownTechnicalValues, field.name) ||
            (normalizeName(field.name) === 'marca' && Boolean(formData.brand)) ||
            alwaysApplicable ||
            isDependencySatisfied
          ? 'global'
          : 'not_inform';
  const isPhysicalDimension = getProductTechnicalDimensionField(field.name) !== null;
  const hasConfiguredParentValue =
    Boolean(parentData) && hasTechnicalValue(parentTechnicalValues, field.name);
  const applicable =
    requiredForCatalog ||
    alwaysApplicable ||
    (dependencyState.isDependent
      ? isDependencySatisfied && !isExplicitlyNotApplicable
      : isPhysicalDimension
        ? (hasOwnValue || hasConfiguredParentValue) &&
          currentValue.trim().toLocaleLowerCase('pt-BR') !== 'não se aplica'
        : currentValue.trim().toLocaleLowerCase('pt-BR') !== 'não se aplica');
  const isManual = manualFieldNames.includes(field.name);
  const isQuantityField = isQuantityCharacteristic(field.name);
  const isOptionalField = !currentFieldIsRequired && !requiredForCatalog;
  const showsApplicabilitySwitch =
    !requiredForCatalog &&
    (parentData
      ? isQuantityField && isOptionalField
      : !alwaysApplicable && (!isManual || isQuantityField));
  const parentText = String(parentValue ?? '').trim();
  const parentIsZero =
    ['integer', 'number', 'decimal', 'measure'].includes(field.data_type) &&
    Number(parentText.replace(',', '.')) === 0;
  const hasMeaningfulParentValue =
    parentText !== '' &&
    parentText.toLocaleLowerCase('pt-BR') !== 'não se aplica' &&
    !parentIsZero;
  const isInheritedFromParent = Boolean(
    parentData && !isCurrentVariableField && !hasOwnValue && hasMeaningfulParentValue
  );
  const productVariations =
    !parentData && Array.isArray(formData.variations) ? formData.variations : [];
  const nameSource = String(formData.name || formData.description || '').trim();
  const isColorField = normalizeName(field.name) === 'cor';
  const parentColor = getTechnicalValue(ownTechnicalValues, field.name);
  const canUseInVariationName =
    isColorField &&
    canUseProductCharacteristicInVariationName(productVariations, field.name, parentColor);
  const isIncludedInVariationName =
    canUseInVariationName &&
    isProductCharacteristicIncludedInVariationNames(
      productVariations,
      nameSource,
      field.name,
      parentColor
    );

  return (
    <View style={styles.attributeField}>
      <View style={styles.attributeHeading}>
        <View style={styles.attributeLabelWrap}>
          <Text
            style={[
              styles.label,
              dark && styles.dimText,
              isDependencyDisabled && styles.dependentFieldLabel,
            ]}
          >
            {getProductTechnicalFieldDisplayName(field.name)}
            {field.unit ? ` (${field.unit})` : ''}
            {isDresserOrWardrobeCategoryName(selectedCategoryName) &&
              isDresserOrWardrobeRequiredCharacteristic(field.name) && (
                <Text style={styles.requiredMark} accessibilityLabel="Obrigatória">
                  {' '}
                  *
                </Text>
              )}
          </Text>
        </View>
        <ProductTechnicalFieldActions
          model={{
            fieldName: field.name,
            dependencyDisabled: isDependencyDisabled,
            dependencyDisabledReason: dependencyState.disabledReason,
            dependencyReasonVisible: visibleDependencyReason === field.name,
            isSingleVariation,
            showsApplicabilitySwitch,
            hasParentData: Boolean(parentData),
            applicable,
            isColorField,
            canUseInVariationName,
            isIncludedInVariationName,
          }}
          onToggleDependencyReason={() =>
            setVisibleDependencyReason((current) =>
              current === field.name ? null : field.name
            )
          }
          onToggleDepthLength={() => onToggleDepthLength(field)}
          onApplicabilityChange={(value) => {
            if (parentData && isQuantityField) {
              if (!value) onRemoveManualVariationField(field.name);
              return;
            }
            onSetTechnicalValue(
              field.name,
              value
                ? hasOwnValue
                  ? isQuantityField
                    ? null
                    : ''
                  : currentValue
                : 'Não se aplica'
            );
          }}
          onUseColorInVariationName={() =>
            setFormData((previous: any) => {
              const variations = Array.isArray(previous.variations)
                ? previous.variations
                : [];
              const updatedVariations = applyProductCharacteristicToVariationNames(
                variations,
                String(previous.name || previous.description || '').trim(),
                field.name,
                getTechnicalValue(previous.technicalValues || {}, field.name) ?? parentColor
              );
              return updatedVariations === variations
                ? previous
                : { ...previous, variations: updatedVariations };
            })
          }
        />
      </View>
      {isDependencyDisabled &&
        visibleDependencyReason === field.name &&
        dependencyState.disabledReason && (
          <Text
            style={[
              styles.dependencyReason,
              dark && styles.darkDependencyReason,
            ]}
            accessibilityRole="text"
          >
            {dependencyState.disabledReason}
          </Text>
        )}
      <ProductTechnicalFieldScopeControl
        hasParentData={Boolean(parentData)}
        isSimpleProduct={isSimpleProduct}
        alwaysApplicable={alwaysApplicable}
        isDependencyVariable={isDependencyVariable}
        requiredForCatalog={requiredForCatalog}
        currentScope={currentScope}
        fieldName={field.name}
        dark={dark}
        onSetScope={(scope) => onSetFieldScope(field.name, scope)}
      />
      {(parentData
        ? isCurrentVariableField ||
          hasOwnValue ||
          (isDependentCharacteristic && isDependencyDisabled)
        : currentScope === 'global' ||
          currentScope === 'variation' ||
          isDependentCharacteristic) && (
        <ProductTechnicalFieldInput
          field={field}
          value={
            parentData && isExplicitlyNotApplicable
              ? ''
              : currentValue === 'Não se aplica'
                ? ''
                : storedValue
          }
          disabled={
            isSingleVariation ||
            isDependencyDisabled ||
            (!parentData && !applicable) ||
            isInheritedFromParent ||
            (!parentData && isCurrentVariableField) ||
            (parentData && !isCurrentVariableField && !hasOwnValue)
          }
          dark={dark}
          placeholder={
            !parentData && currentScope === 'variation' ? 'Defina na variação...' : undefined
          }
          onChange={(value) => onSetTechnicalValue(field.name, value)}
        />
      )}
    </View>
  );
};
