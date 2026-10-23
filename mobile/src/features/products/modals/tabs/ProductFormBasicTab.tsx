import type React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
import { inheritMobileSimpleVariationFromParent } from '../../domain/productVariationParentSync';
import { getMobileVariationColorSummary } from '../../domain/productCharacteristics';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
  isStockistOnly?: boolean;
  isExistingProduct?: boolean;
  canManageCategories?: boolean;
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

  const currentOrigin =
    formData.productKind === 'salvado' || formData.condition === 'salvado'
      ? 'salvado'
      : formData.productKind === 'usado' || formData.condition === 'usado'
        ? 'usado'
        : 'normal';

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
      const shouldInheritSimpleFields =
        !isExistingProduct &&
        !hasVariations &&
        Boolean(previous.hasVariations) &&
        currentVariations.length === 1;
      return {
        ...previous,
        hasVariations,
        ...(shouldInheritSimpleFields
          ? { variations: [inheritMobileSimpleVariationFromParent(previous, currentVariations[0])] }
          : {}),
      };
    });
  };

  return (
    <View style={styles.container}>
      {/* ORIGEM DO ESTOQUE */}
      {formData.itemType !== 'service' && (
        <View style={styles.field}>
          <Text style={[styles.label, dark && styles.lightLabel]}>
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

        <TextInput
          value={formData.name || ''}
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
          style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
        />
      </View>

      {/* CATEGORIA(S) */}
      {formData.itemType !== 'service' && (
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <View style={styles.labelBadgeRow}>
              <Text style={[styles.label, dark && styles.lightLabel]}>
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
        <TextInput
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

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  categorySuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  categorySuggestionLabel: {
    width: '100%',
    fontSize: 12,
    color: '#64748b',
  },
  categorySuggestionButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  darkCategorySuggestionButton: {
    borderColor: '#1d4ed8',
  },
  categorySuggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  darkCategorySuggestionText: {
    color: '#93c5fd',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedCategoryCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  manageCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  manageCategoriesText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
    color: '#64748b',
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  lightLabel: {
    color: '#94a3b8',
  },
  required: {
    color: '#ef4444',
  },
  catalogBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  catalogBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#9333ea',
    letterSpacing: 0.5,
  },
  diferenciarBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lightDiferenciarBtn: {
    backgroundColor: '#f1f5f9',
  },
  darkDiferenciarBtn: {
    backgroundColor: '#1e293b',
  },
  diferenciarBtnActive: {
    backgroundColor: '#f3e8ff',
  },
  diferenciarBtnText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  diferenciarBtnTextActive: {
    color: '#7e22ce',
  },
  dimText: {
    color: '#64748b',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  darkInput: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  lightText: {
    color: '#f8fafc',
  },
  slugBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  darkSlugBox: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  slugPrefix: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  slugText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  selectBox: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  selectBoxText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  textarea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  originRow: {
    flexDirection: 'row',
    gap: 8,
  },
  originBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  originBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  originBtnActiveSalvado: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  originBtnActiveUsado: {
    backgroundColor: '#faf5ff',
    borderColor: '#a855f7',
  },
  originBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  originBtnTextActive: {
    color: '#1d4ed8',
  },
  originBtnTextActiveSalvado: {
    color: '#ea580c',
  },
  originBtnTextActiveUsado: {
    color: '#9333ea',
  },
  salvadoWarning: {
    fontSize: 11,
    color: '#ea580c',
    marginTop: 4,
    fontWeight: '600',
  },
});
