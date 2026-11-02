import type React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, Settings } from 'lucide-react-native';
import {
  fetchMobileCategories,
  fetchMobileEnvironments,
  type MobileCategory,
} from '../../services/mobileCategoryService';
import {
  fetchMobileOpportunities,
  type MobileOpportunity,
} from '../../services/mobileOpportunityService';
import { OpportunitySelectModal } from '../components/OpportunitySelectModal';
import { CategoryMultiSelectList } from '../components/CategoryMultiSelectList';
import { CategoriesManagerModal } from '../CategoriesManagerModal';
import {
  getProductCategoryRootNames,
  keepManualCategorySelection,
  matchCategoryByRules,
} from '../../../../../../shared-utils/productCategoryResolution';
import { toTitleCase } from '../../../../../../shared-utils/productText';
import { productTitleFieldsFromName } from '../../../../../../shared-utils/productTitle';
import { PRODUCT_NAME_REQUIRED_MESSAGE } from '../../../../../../shared-utils/productNameRequirement';
import { getSelectedProductStockKind } from '../../../../../../shared-utils/productSupplierStockOrigin';
import { inheritMobileSimpleVariationFromParent } from '../../domain/productVariationParentSync';
import { getMobileVariationColorSummary } from '../../domain/productCharacteristics';
import { styles } from './productFormBasicTab.styles';

import { FormTextInput } from '../../../../components/shared/FormTextInput';
interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
  isStockistOnly?: boolean;
  isExistingProduct?: boolean;
  canManageCategories?: boolean;
  nameError?: boolean;
  onNameValidationCleared?: () => void;
  categoryError?: boolean;
  onCategoryValidationCleared?: () => void;
  onFieldFocus?: (fieldName: string) => void;
  onFieldBlur?: (fieldName: string) => void;
}

const FIXED_ENVIRONMENTS = [
  'SALA DE JANTAR',
  'SALA DE ESTAR',
  'COZINHA',
  'QUARTO',
  'LAVANDERIA',
  'BANHEIRO',
  'LAVANDEIRA',
  'ESCRITORIO',
  'ESCRITÓRIO',
  'VARANDA',
  'ÁREA GOURMET',
  'GARAGEM',
];

export const ProductFormBasicTab: React.FC<Props> = ({
  formData,
  setFormData,
  dark,
  isStockistOnly = false,
  isExistingProduct = false,
  canManageCategories = false,
  nameError = false,
  onNameValidationCleared,
  categoryError = false,
  onCategoryValidationCleared,
  onFieldFocus,
  onFieldBlur,
}) => {
  const [categories, setCategories] = useState<MobileCategory[]>([]);
  const [categoryHierarchyReady, setCategoryHierarchyReady] = useState(false);
  const [opportunities, setOpportunities] = useState<MobileOpportunity[]>([]);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [showCategoriesManager, setShowCategoriesManager] = useState(false);

  useEffect(() => {
    if (!formData.hasVariations || !Array.isArray(formData.variations)) return;
    const colors = getMobileVariationColorSummary(formData.variations);
    if (colors && colors !== formData.colors) {
      setFormData((previous) => ({ ...previous, colors, noColors: false }));
    }
  }, [formData.hasVariations, formData.variations, formData.colors, setFormData]);

  const refreshCategories = useCallback(async () => {
    const [nextCategories, environmentResult] = await Promise.all([
      fetchMobileCategories(),
      fetchMobileEnvironments()
        .then((data) => ({ data }))
        .catch((error: unknown) => ({ error })),
    ]);

    if ('data' in environmentResult) {
      setCategories([
        ...nextCategories,
        ...environmentResult.data.map((environment) => ({
          id: environment.id,
          name: environment.name,
          type: 'environment',
          parents: [],
        })),
      ]);
      setCategoryHierarchyReady(true);
    } else {
      console.warn(
        '[ProductFormBasicTab] Erro ao carregar ambientes das categorias:',
        environmentResult.error
      );
      setCategories(nextCategories);
      setCategoryHierarchyReady(false);
    }
  }, []);

  useEffect(() => {
    void refreshCategories();
    fetchMobileOpportunities().then(setOpportunities);
  }, [refreshCategories]);

  const categoryHierarchy = categories;

  const set = (field: string, val: any) => setFormData((prev) => ({ ...prev, [field]: val }));

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const name = cat.name?.trim().toUpperCase() || '';
      const isFixed = FIXED_ENVIRONMENTS.includes(name);
      const hasChildren = categories.some((other) => other.parents?.includes(cat.id));
      const isEnvironment =
        isFixed ||
        (hasChildren && (!cat.parents || cat.parents.length === 0)) ||
        !cat.parents ||
        cat.parents.length === 0;
      return !isEnvironment;
    });
  }, [categories]);

  const handleToggleCategory = (cat: MobileCategory) => {
    const currentIds: string[] =
      Array.isArray(formData.categoryIds) && formData.categoryIds.length > 0
        ? formData.categoryIds
        : formData.categoryId
          ? [formData.categoryId]
          : [];
    const isChecked = currentIds.includes(cat.id);
    let nextIds: string[];

    if (isChecked) {
      nextIds = currentIds.filter((id) => id !== cat.id);
    } else {
      nextIds = [...currentIds, cat.id];
    }

    const firstSelected = categories.find((c) => c.id === nextIds[0]);
    const availableEnvironments = categoryHierarchyReady
      ? getProductCategoryRootNames(nextIds, categoryHierarchy)
      : [];

    setFormData((prev) => ({
      ...prev,
      categoryIds: nextIds,
      categoryId: nextIds[0] || '',
      category: firstSelected?.name || '',
      ...(categoryHierarchyReady
        ? {
            environment:
              prev.environment && availableEnvironments.includes(prev.environment)
                ? prev.environment
                : availableEnvironments[0] || '',
          }
        : {}),
    }));
    if (nextIds.length > 0) onCategoryValidationCleared?.();
  };

  const selectedOpportunity = opportunities.find((o) => o.id === formData.opportunityId);
  const selectedCategoryIds: string[] = useMemo(
    () =>
      Array.isArray(formData.categoryIds) && formData.categoryIds.length > 0
        ? formData.categoryIds
        : formData.categoryId
          ? [formData.categoryId]
          : [],
    [formData.categoryIds, formData.categoryId]
  );
  const selectedCategoryKey = selectedCategoryIds.join('|');

  useEffect(() => {
    if (!categoryHierarchyReady || selectedCategoryIds.length === 0) return;
    const availableEnvironments = getProductCategoryRootNames(selectedCategoryIds, categoryHierarchy);
    if (availableEnvironments.length === 0) return;

    setFormData((previous) => {
      const previousIds: string[] =
        Array.isArray(previous.categoryIds) && previous.categoryIds.length > 0
          ? previous.categoryIds
          : previous.categoryId
            ? [previous.categoryId]
            : [];
      if (previousIds.join('|') !== selectedCategoryKey) return previous;
      if (previous.environment) return previous;
      return { ...previous, environment: availableEnvironments[0] };
    });
  }, [categoryHierarchy, categoryHierarchyReady, selectedCategoryIds, selectedCategoryKey, setFormData]);

  const autoAppliedNameRef = useMemo(() => ({ current: '' }), []);

  useEffect(() => {
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName || trimmedName.length < 3) return;
    const currentIds: string[] =
      Array.isArray(formData.categoryIds) && formData.categoryIds.length > 0
        ? formData.categoryIds
        : formData.categoryId
          ? [formData.categoryId]
          : [];
    if (currentIds.length > 0) return;
    if (autoAppliedNameRef.current === trimmedName) return;

    const timer = setTimeout(() => {
      const matchedCategory = matchCategoryByRules(trimmedName, filteredCategories);
      if (matchedCategory) {
        autoAppliedNameRef.current = trimmedName;
        applySuggestedCategory(matchedCategory as MobileCategory);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.name, formData.categoryIds, formData.categoryId, filteredCategories]);

  const applySuggestedCategory = (category: MobileCategory) => {
    setFormData((prev) => {
      const currentIds: string[] =
        Array.isArray(prev.categoryIds) && prev.categoryIds.length > 0
          ? prev.categoryIds
          : prev.categoryId
            ? [prev.categoryId]
            : [];
      if (currentIds.length > 0) return prev;
      const categoryIds = keepManualCategorySelection(currentIds, category.id);
      const availableEnvironments = categoryHierarchyReady
        ? getProductCategoryRootNames(categoryIds, categoryHierarchy)
        : [];
      return {
        ...prev,
        categoryIds,
        categoryId: categoryIds[0] || '',
        category: category.name || '',
        ...(categoryHierarchyReady
          ? {
              environment:
                prev.environment && availableEnvironments.includes(prev.environment)
                  ? prev.environment
                  : availableEnvironments[0] || '',
            }
          : {}),
      };
    });
  };

  const currentOrigin = getSelectedProductStockKind(formData.productKind);

  const isNormal = currentOrigin === 'normal';
  const isSalvado = currentOrigin === 'salvado';
  const isOpportunityDisabled =
    formData.itemType !== 'service' &&
    (!formData.productKind || formData.productKind === 'salvado');
  const isUsado = currentOrigin === 'usado';
  const variationCount = Array.isArray(formData.variations) ? formData.variations.length : 0;
  const isMultiVariationMode = Boolean(formData.hasVariations) || variationCount > 1;

  const handleSelectOrigin = (origin: 'normal' | 'salvado' | 'usado') => {
    const salvadoOpp = opportunities.find((o) => o.name?.toLowerCase().includes('salvado'));
    setFormData((prev: any) => {
      const next = {
        ...prev,
        productKind: origin,
        condition: origin === 'salvado' ? 'salvado' : origin === 'usado' ? 'usado' : 'novo',
      };
      if (origin === 'salvado') {
        next.active = false;
        if (salvadoOpp) {
          next.opportunityId = salvadoOpp.id;
        }
      } else {
        if (salvadoOpp && prev.opportunityId === salvadoOpp.id) {
          next.opportunityId = null;
        }
      }
      return next;
    });
  };

  const handleSelectProductMode = (hasVariations: boolean) => {
    if (!hasVariations && variationCount > 1) {
      Alert.alert(
        'Remova as variações extras',
        'Para tornar o produto simples, remova as variações extras na aba Variações. Ao restar uma, ela herdará a galeria completa de fotos.'
      );
      return;
    }
    setFormData((previous) => {
      const currentVariations = Array.isArray(previous.variations) ? previous.variations : [];
      const isConvertingSimpleProduct =
        hasVariations && !previous.hasVariations && currentVariations.length <= 1;
      const shouldInheritSimpleFields =
        !isExistingProduct &&
        !hasVariations &&
        Boolean(previous.hasVariations) &&
        currentVariations.length === 1;
      const shouldLinkSimpleGallery = !hasVariations && currentVariations.length === 1;
      return {
        ...previous,
        hasVariations,
        ...(isConvertingSimpleProduct ? { variableTechnicalFields: [] } : {}),
        ...(shouldLinkSimpleGallery
          ? {
              variations: [
                shouldInheritSimpleFields
                  ? inheritMobileSimpleVariationFromParent(previous, currentVariations[0])
                  : {
                      ...currentVariations[0],
                      images: Array.isArray(previous.images) ? [...previous.images] : [],
                    },
              ],
            }
          : {}),
      };
    });
  };

  return (
    <View style={styles.container}>
      {/* ORIGEM DO ESTOQUE */}
      {formData.itemType !== 'service' && (
        <View style={styles.field}>
          <Text style={[styles.label, dark && styles.lightLabel, nameError && styles.errorLabel]}>
            ORIGEM DO ESTOQUE <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.originRow}>
            <TouchableOpacity
              onPress={() => handleSelectOrigin('normal')}
              style={[
                styles.originBtn,
                isNormal
                  ? styles.originBtnActive
                  : dark
                    ? styles.darkInput
                    : styles.lightDiferenciarBtn,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Origem do estoque Convencional"
            >
              <Text
                style={[
                  styles.originBtnText,
                  isNormal ? styles.originBtnTextActive : dark ? styles.lightText : styles.dimText,
                ]}
              >
                Convencional
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectOrigin('salvado')}
              style={[
                styles.originBtn,
                isSalvado
                  ? styles.originBtnActiveSalvado
                  : dark
                    ? styles.darkInput
                    : styles.lightDiferenciarBtn,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Origem do estoque Salvados"
            >
              <Text
                style={[
                  styles.originBtnText,
                  isSalvado
                    ? styles.originBtnTextActiveSalvado
                    : dark
                      ? styles.lightText
                      : styles.dimText,
                ]}
              >
                Salvados
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectOrigin('usado')}
              style={[
                styles.originBtn,
                isUsado
                  ? styles.originBtnActiveUsado
                  : dark
                    ? styles.darkInput
                    : styles.lightDiferenciarBtn,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Origem do estoque Usados"
            >
              <Text
                style={[
                  styles.originBtnText,
                  isUsado
                    ? styles.originBtnTextActiveUsado
                    : dark
                      ? styles.lightText
                      : styles.dimText,
                ]}
              >
                Usados
              </Text>
            </TouchableOpacity>
          </View>
          {isSalvado && (
            <Text style={styles.salvadoWarning}>
              O produto e suas variações serão desativados no ERP.
            </Text>
          )}
        </View>
      )}

      {formData.itemType !== 'service' && (
        <View style={styles.field}>
          <Text style={[styles.label, dark && styles.lightLabel]}>TIPO DE PRODUTO</Text>
          <View style={styles.originRow}>
            {[false, true].map((hasVariations) => {
              const selected = isMultiVariationMode === hasVariations;
              return (
                <TouchableOpacity
                  key={String(hasVariations)}
                  onPress={() => handleSelectProductMode(hasVariations)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.originBtn,
                    selected && styles.originBtnActive,
                    dark && !selected && styles.darkInput,
                  ]}
                >
                  <Text
                    style={[
                      styles.originBtnText,
                      selected
                        ? styles.originBtnTextActive
                        : dark
                          ? styles.lightText
                          : styles.dimText,
                    ]}
                  >
                    {hasVariations ? 'Com variações' : 'Simples'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.dimText, { fontSize: 11, lineHeight: 16 }]}>
            Produtos simples mantêm uma variação padrão. Para usar opções diferentes de cor,
            tamanho ou modelo, escolha “Com variações”.
          </Text>
        </View>
      )}

      {/* NOME DO PRODUTO */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, dark && styles.lightLabel]}>
            NOME <Text style={styles.required}>*</Text>
          </Text>
        </View>

        <FormTextInput
          value={formData.name || ''}
          accessibilityLabel="Nome do produto"
          accessibilityHint={nameError ? PRODUCT_NAME_REQUIRED_MESSAGE : undefined}
          onFocus={() => onFieldFocus?.('name')}
          onChangeText={(val) => {
            setFormData((prev) => ({
              ...prev,
              name: val,
              ...productTitleFieldsFromName(val),
            }));
          }}
          onBlur={() => {
            onFieldBlur?.('name');
            if (String(formData.name || '').trim()) onNameValidationCleared?.();
            if (!formData.name) return;
            const formatted = toTitleCase(formData.name);
            if (formatted !== formData.name) {
              setFormData((prev) => ({
                ...prev,
                name: formatted,
                ...productTitleFieldsFromName(formatted),
              }));
            }
            if (selectedCategoryIds.length === 0) {
              const matchedCategory = matchCategoryByRules(formData.name, filteredCategories);
              if (matchedCategory) {
                autoAppliedNameRef.current = formData.name.trim();
                applySuggestedCategory(matchedCategory as MobileCategory);
              }
            }
          }}
          placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..."
          placeholderTextColor="#94a3b8"
          style={[
            styles.input,
            dark && styles.darkInput,
            dark && styles.lightText,
            nameError && styles.errorInput,
          ]}
        />
      </View>

      {/* CATEGORIA(S) */}
      {formData.itemType !== 'service' && (
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <View style={styles.labelBadgeRow}>
              <Text style={[styles.label, dark && styles.lightLabel, categoryError && styles.errorLabel]}>
                CATEGORIA(S) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.catalogBadge}>
                <Text style={styles.catalogBadgeText}>CATÁLOGO</Text>
              </View>
              {canManageCategories && (
                <TouchableOpacity
                  onPress={() => setShowCategoriesManager(true)}
                  style={styles.manageCategoriesButton}
                  accessibilityRole="button"
                  accessibilityLabel="Gerenciar categorias de produtos"
                >
                  <Text style={styles.manageCategoriesText}>GERENCIAR</Text>
                  <Settings size={12} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
            {selectedCategoryIds.length > 0 && (
              <Text style={styles.selectedCategoryCount}>
                {selectedCategoryIds.length} selecionada{selectedCategoryIds.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          <CategoryMultiSelectList
            categories={categories}
            filteredCategories={filteredCategories}
            selectedCategoryIds={selectedCategoryIds}
            onToggleCategory={handleToggleCategory}
            dark={dark}
            hasValidationError={categoryError}
          />
        </View>
      )}

      {/* OPORTUNIDADE */}
      {!isStockistOnly && <View style={styles.field}>
        <View style={styles.labelRow}>
          <View style={styles.labelBadgeRow}>
            <Text style={[styles.label, dark && styles.lightLabel]}>OPORTUNIDADE</Text>
            <View style={styles.catalogBadge}>
              <Text style={styles.catalogBadgeText}>CATÁLOGO</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (isOpportunityDisabled) return;
            setShowOpportunityModal(true);
          }}
          disabled={isOpportunityDisabled}
          style={[styles.selectBox, dark && styles.darkInput, isOpportunityDisabled && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Selecionar Oportunidade"
          accessibilityState={{ disabled: isOpportunityDisabled }}
        >
          <Text style={[styles.selectBoxText, dark && styles.lightText]} numberOfLines={1}>
            {!formData.productKind && formData.itemType !== 'service'
              ? 'Selecione primeiro a origem do estoque'
              : selectedOpportunity
                ? selectedOpportunity.name
                : 'Nenhuma (Produto Convencional)'}
          </Text>
          {!isOpportunityDisabled && <ChevronDown size={16} color="#94a3b8" />}
        </TouchableOpacity>
      </View>}

      {/* OBSERVAÇÕES INTERNAS */}
      <View style={styles.field}>
        <Text style={[styles.label, dark && styles.lightLabel]}>OBSERVAÇÕES INTERNAS</Text>
        <FormTextInput
          value={formData.observations || ''}
          onChangeText={(val) => set('observations', val)}
          placeholder="Digite notas internas sobre este produto, processos ou detalhes específicos..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={[styles.textarea, dark && styles.darkInput, dark && styles.lightText]}
        />
      </View>

      {/* Modal Modular de Oportunidade */}
      <OpportunitySelectModal
        visible={showOpportunityModal}
        opportunities={
          isSalvado
            ? opportunities
            : opportunities.filter((o) => !o.name?.toLowerCase().includes('salvado'))
        }
        selectedOpportunityId={formData.opportunityId}
        onSelect={(id) => set('opportunityId', id)}
        onClose={() => setShowOpportunityModal(false)}
        dark={dark}
      />
      <CategoriesManagerModal
        visible={showCategoriesManager && canManageCategories}
        dark={dark}
        onCategoriesUpdated={() => {
          void refreshCategories();
        }}
        onClose={() => {
          setShowCategoriesManager(false);
          void refreshCategories();
        }}
      />
    </View>
  );
};
