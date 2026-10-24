import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Search, Save, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  formatAttributeDecimalValue,
  limitAttributeIntegerInput,
  maskAttributeDecimalInput,
} from '../../../../../shared-utils/attributeInputFormatting';
import { bulkAttributeFormSchema } from '../../../../../shared-utils/catalogFormSchemas';
import {
  applyReconciliationAttributeToVariations,
  getActiveReconciliationPendencies,
  updateReconciliationVariationAttribute,
} from '../../../../../shared-utils/productReconciliation';
import {
  createReconciliationProductFormSchema,
  reconciliationSupplierSearchSchema,
  type ReconciliationProductValues,
} from '../../../../../shared-utils/reconciliationFormSchemas';
import type {
  ProductPendency,
  ReconciliationProductItem,
  ReconciliationVariationItem,
} from '../../../../../shared-utils/productReconciliationTypes';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { isWeightCharacteristicName } from '../domain/productCharacteristics';
import type { MobileCategory } from '../services/mobileCategoryService';
import {
  saveMobileReconciliationAttributeValue,
  saveMobileProductReconciliation,
  searchMobileReconciliationSuppliers,
} from '../services/mobileProductReconciliationService';

interface Props {
  product: ReconciliationProductItem;
  categories: MobileCategory[];
  dark: boolean;
  isSelected: boolean;
  onToggleSelect: (isSelected: boolean) => void;
  onSaved: () => void | Promise<void>;
}

const getInitialPrice = (price?: number) => (price ? String(price) : '');

export const NativeProductReconciliationCard: React.FC<Props> = ({
  product,
  categories,
  dark,
  isSelected,
  onToggleSelect,
  onSaved,
}) => {
  const insets = useSafeAreaInsets();
  const [supplierId, setSupplierId] = useState(product.mainSupplierId || product.supplierId || '');
  const [supplierName, setSupplierName] = useState(
    product.people?.tradeName || product.people?.fullName || ''
  );
  const [categoryId, setCategoryId] = useState(product.categoryId || product.categoryIds?.[0] || '');
  const [categoryName, setCategoryName] = useState(product.category || '');
  const [ncm, setNcm] = useState(product.fiscal?.ncm || '');
  const [price, setPrice] = useState(getInitialPrice(product.price));
  const [variations, setVariations] = useState<ReconciliationVariationItem[]>(product.variations || []);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierResults, setSupplierResults] = useState<Array<{ id: string; fullName: string; tradeName?: string }>>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierError, setSupplierError] = useState('');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [sharedAttributeDrafts, setSharedAttributeDrafts] = useState<Record<string, string>>({});
  const supplierRequest = useRef(0);
  const { validateValues: validateSupplierSearch } = useZodForm(
    reconciliationSupplierSearchSchema,
    { search: '' }
  );

  const formValues: ReconciliationProductValues = {
    productUpdates: {
      id: product.id,
      ...(supplierId ? { mainSupplierId: supplierId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(ncm ? { ncm } : {}),
      ...(price ? { price: Number(price.replace(',', '.')) } : {}),
    },
    variationUpdates: variations.map((variation) => ({
      id: variation.id,
      price: variation.price,
      attributes: variation.attributes?.map((attribute) => ({ ...attribute })),
    })),
  };
  const latestValuesKey = useRef(JSON.stringify(formValues));
  latestValuesKey.current = JSON.stringify(formValues);
  const form = useZodForm(
    createReconciliationProductFormSchema(
      product.pendencies.flatMap((pendency) =>
        pendency.attributeName
          ? [{ name: pendency.attributeName, dataType: pendency.attributeDataType }]
          : []
      )
    ),
    formValues
  );

  const { parent: activeParentPendencies, variations: activeVariationPendencies } = useMemo(
    () =>
      getActiveReconciliationPendencies(product.pendencies, {
        supplierId,
        categoryId,
        categoryName,
        ncm,
        price,
        variations,
      }),
    [product.pendencies, supplierId, categoryId, categoryName, ncm, price, variations]
  );
  const totalActivePendencies = activeParentPendencies.length + activeVariationPendencies.length;
  const parentPendencies = product.pendencies.filter((pendency) => pendency.level === 'parent');
  const sharedAttributePendencies = parentPendencies.filter(
    (pendency) =>
      Boolean(pendency.resolvesVariationsCount && pendency.resolvesVariationsCount > 1) &&
      Boolean(pendency.attributeName)
  );
  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLocaleLowerCase('pt-BR');
    return categories
      .filter((category) => !term || category.name.toLocaleLowerCase('pt-BR').includes(term))
      .slice(0, 50);
  }, [categories, categorySearch]);

  useEffect(() => {
    if (!supplierPickerOpen || supplierSearch.trim().length < 2) {
      supplierRequest.current += 1;
      setSupplierResults([]);
      setSupplierLoading(false);
      setSupplierError('');
      return;
    }

    const requestId = ++supplierRequest.current;
    const timer = setTimeout(async () => {
      const isCurrent = () => supplierRequest.current === requestId;
      setSupplierLoading(true);
      setSupplierError('');
      try {
        const values = await validateSupplierSearch(
          { search: supplierSearch },
          (errors) => {
            if (isCurrent()) {
              setSupplierError(Object.values(flattenFormErrors(errors))[0] || 'Confira a busca.');
            }
          }
        );
        if (!values || !isCurrent()) return;
        const results = await searchMobileReconciliationSuppliers(values.search);
        if (isCurrent()) setSupplierResults(results);
      } catch (cause) {
        if (isCurrent()) {
          setSupplierError(cause instanceof Error ? cause.message : 'Não foi possível buscar fornecedores.');
        }
      } finally {
        if (isCurrent()) setSupplierLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      supplierRequest.current += 1;
    };
  }, [supplierPickerOpen, supplierSearch, validateSupplierSearch]);

  const markChanged = () => {
    setHasChanges(true);
    setSaved(false);
    setSaveError('');
  };

  const updateVariationAttribute = (variationId: string, name: string, value: string) => {
    setVariations((previous) => updateReconciliationVariationAttribute(previous, variationId, name, value));
    markChanged();
  };

  const applySharedAttribute = (pendency: ProductPendency, value: string) => {
    const name = pendency.attributeName || pendency.label;
    setSharedAttributeDrafts((previous) => ({ ...previous, [pendency.id]: value }));
    if (!value.trim()) return;
    setVariations((previous) => applyReconciliationAttributeToVariations(previous, name, value));
    markChanged();
  };

  const handleSave = async () => {
    if (uncertain || isSaving) return;
    const submittedKey = JSON.stringify(formValues);
    setSaveError('');
    await form.validateAndRun(
      formValues,
      async (validated) => {
        setIsSaving(true);
        try {
          const result = await withTimeout(
            saveMobileProductReconciliation(
              validated.productUpdates,
              validated.variationUpdates
            ),
            25_000,
            {
              success: false,
              uncertain: true,
              error: 'Não foi possível confirmar a gravação. Confira o produto antes de repetir.',
            },
            'reconciliacao:salvar-produto'
          );
          if (result.uncertain) setUncertain(true);
          if (result.success) {
            if (latestValuesKey.current === submittedKey) setHasChanges(false);
            setSaved(true);
            void onSaved();
          } else {
            setSaveError(
              result.error ||
                'Não foi possível confirmar a gravação. Confira o produto antes de repetir.'
            );
          }
        } catch (cause) {
          setSaveError(cause instanceof Error ? cause.message : 'Não foi possível salvar as alterações.');
        } finally {
          setIsSaving(false);
        }
      },
      (errors) => {
        setSaveError(Object.values(flattenFormErrors(errors))[0] || 'Revise os dados informados.');
      }
    );
  };

  const productSurface = dark ? styles.surfaceDark : styles.surface;
  const textStyle = dark ? styles.textLight : styles.textDark;
  const disabled = isSaving || uncertain;

  return (
    <View style={[styles.card, productSurface]}>
      <View style={[styles.cardHeader, dark && styles.cardHeaderDark]}>
        <Pressable
          onPress={() => onToggleSelect(!isSelected)}
          accessibilityRole="checkbox"
          accessibilityLabel={`Selecionar produto ${product.name}`}
          accessibilityState={{ checked: isSelected }}
          style={styles.selectionButton}
        >
          <View style={[styles.selectionBox, isSelected && styles.selectionBoxSelected]}>
            {isSelected ? <Check size={15} color="#fff" /> : null}
          </View>
        </Pressable>
        <View style={styles.productInfo}>
          <Text style={[styles.productName, textStyle]}>{product.name}</Text>
          <Text style={styles.productCode}>{product.code || product.sku || 'S/ CÓDIGO'}</Text>
          <Text style={[styles.productMeta, dark && styles.mutedDark]}>
            {[categoryName, supplierName].filter(Boolean).join(' · ') || 'Categoria e fornecedor pendentes'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={[styles.statusBadge, totalActivePendencies > 0 ? styles.pendingBadge : styles.doneBadge]}>
            {totalActivePendencies > 0 ? <AlertTriangle size={13} color="#b45309" /> : <Check size={13} color="#15803d" />}
            <Text style={[styles.statusText, totalActivePendencies > 0 ? styles.pendingText : styles.doneText]}>
              {totalActivePendencies > 0
                ? `${totalActivePendencies} ${totalActivePendencies === 1 ? 'pendência' : 'pendências'}`
                : 'Concluído'}
            </Text>
          </View>
          {hasChanges && (
            <Pressable
              onPress={() => void handleSave()}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="Salvar correções do produto"
              style={[styles.saveButton, disabled && styles.disabled]}
            >
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={15} color="#fff" />}
              <Text style={styles.saveText}>Salvar</Text>
            </Pressable>
          )}
          {variations.length > 0 && (
            <Pressable
              onPress={() => setIsExpanded((value) => !value)}
              accessibilityRole="button"
              accessibilityLabel={isExpanded ? 'Recolher variações' : 'Ver variações'}
              style={[styles.expandButton, dark && styles.expandButtonDark]}
            >
              {isExpanded ? <ChevronUp size={17} color={dark ? '#cbd5e1' : '#64748b'} /> : <ChevronDown size={17} color={dark ? '#cbd5e1' : '#64748b'} />}
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        {(saveError || supplierError) ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText} accessibilityRole="alert">{saveError || supplierError}</Text>
          </View>
        ) : null}
        {saved && <Text style={styles.savedText}>Alterações salvas para “{product.name}”.</Text>}
        {uncertain && <Text style={styles.errorText}>A gravação não foi confirmada. Confira o produto antes de tentar novamente.</Text>}

        {parentPendencies.length > 0 && (
          <View style={[styles.parentSection, dark && styles.parentSectionDark]}>
            <Text style={styles.sectionTitle}>Pendências do Produto (Pai)</Text>

            {parentPendencies.some((pendency) => pendency.type === 'supplier') && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Fornecedores</Text>
                <View style={[styles.pickerValue, dark && styles.inputDark]}>
                  <Pressable
                    onPress={() => setSupplierPickerOpen(true)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel="Selecionar fornecedor"
                    style={styles.pickerTrigger}
                  >
                    <Search size={15} color="#64748b" />
                    <Text numberOfLines={1} style={[styles.pickerText, dark && styles.textLight]}>
                      {supplierName || 'Digite o nome do fornecedor...'}
                    </Text>
                  </Pressable>
                  {supplierId ? (
                    <Pressable
                      onPress={() => {
                        setSupplierId('');
                        setSupplierName('');
                        markChanged();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Remover fornecedor selecionado"
                      style={styles.iconButton}
                    ><X size={16} color="#64748b" /></Pressable>
                  ) : null}
                </View>
              </View>
            )}

            {parentPendencies.some((pendency) => pendency.type === 'category') && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Categoria</Text>
                <Pressable
                  onPress={() => setCategoryPickerOpen(true)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar categoria"
                  style={[styles.input, dark && styles.inputDark, styles.pickerTrigger]}
                >
                  <Text style={[styles.pickerText, dark && styles.textLight]}>{categoryName || 'Selecionar categoria...'}</Text>
                  <ChevronDown size={16} color="#64748b" />
                </Pressable>
              </View>
            )}

            {parentPendencies.some((pendency) => pendency.type === 'ncm') && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>NCM</Text>
                <TextInput
                  value={ncm}
                  onChangeText={(value) => { setNcm(value); markChanged(); }}
                  editable={!disabled}
                  placeholder="Ex: 9403.50.00"
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, dark && styles.inputDark, textStyle]}
                  accessibilityLabel="NCM"
                  autoCapitalize="none"
                />
              </View>
            )}

            {parentPendencies.some((pendency) => pendency.type === 'price') && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Preço de Venda</Text>
                <View style={[styles.priceInputWrap, dark && styles.inputDark]}>
                  <Text style={styles.currencyPrefix}>R$</Text>
                  <TextInput
                    value={price}
                    onChangeText={(value) => { setPrice(value); markChanged(); }}
                    editable={!disabled}
                    placeholder="0,00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    style={[styles.priceInput, textStyle]}
                    accessibilityLabel="Preço de Venda"
                  />
                </View>
                {variations.length > 0 && (
                  <Text style={styles.hint}>Definir aqui aplicará às {variations.length} variações sincronizadas.</Text>
                )}
              </View>
            )}

            {sharedAttributePendencies.map((pendency) => (
              <View key={pendency.id} style={[styles.sharedAttribute, dark && styles.sharedAttributeDark]}>
                <Text style={[styles.sharedAttributeName, textStyle]}>{pendency.attributeName}</Text>
                <Text style={styles.sharedAttributeHint}>Definir aqui resolverá {pendency.resolvesVariationsCount} variações.</Text>
                <ReconciliationAttributeInput
                  name={pendency.attributeName || pendency.label}
                  attributeId={pendency.attributeId}
                  dataType={pendency.attributeDataType || 'list'}
                  unit={pendency.attributeUnit}
                  value={sharedAttributeDrafts[pendency.id] || ''}
                  disabled={disabled}
                  dark={dark}
                  onChange={(value) => applySharedAttribute(pendency, value)}
                />
              </View>
            ))}
          </View>
        )}

        {isExpanded && variations.length > 0 && (
          <View style={styles.variationSection}>
            <Text style={styles.variationHeading}>Variações do Produto ({variations.length})</Text>
            {variations.map((variation, index) => {
              const pending = product.pendencies.filter(
                (pendency) => pendency.level === 'variation' && pendency.variationId === variation.id
              );
              const isValid = !activeVariationPendencies.some((pendency) => pendency.variationId === variation.id);
              return (
                <View key={variation.id || index} style={[styles.variationCard, dark && styles.variationCardDark]}>
                  <View style={styles.variationHeadingRow}>
                    <View style={styles.productInfo}>
                      <Text style={[styles.variationName, textStyle]}>{variation.name || `Variação #${index + 1}`}</Text>
                      <Text style={styles.productCode}>{variation.sku}</Text>
                    </View>
                    <Text style={[styles.variationStatus, isValid ? styles.doneText : styles.pendingText]}>
                      {isValid ? 'Válida' : `${pending.length} pendente(s)`}
                    </Text>
                  </View>

                  {pending.map((pendency) => {
                    if (pendency.type === 'category_attribute' || pendency.type === 'incomplete_attribute') {
                      const attributeName = pendency.attributeName || pendency.label;
                      const current = variation.attributes.find(
                        (attribute) => attribute.name.toLowerCase().trim() === attributeName.toLowerCase().trim()
                      );
                      return (
                        <View key={pendency.id} style={styles.field}>
                          <Text style={styles.fieldLabel}>{attributeName}</Text>
                          <ReconciliationAttributeInput
                            name={attributeName}
                          attributeId={pendency.attributeId}
                            dataType={pendency.attributeDataType || 'list'}
                          unit={pendency.attributeUnit}
                            value={current?.value || ''}
                            disabled={disabled}
                            dark={dark}
                            onChange={(value) => updateVariationAttribute(variation.id, attributeName, value)}
                          />
                        </View>
                      );
                    }
                    if (pendency.type === 'variation_price') {
                      return (
                        <View key={pendency.id} style={styles.field}>
                          <Text style={styles.fieldLabel}>Preço da Variação</Text>
                          <View style={[styles.priceInputWrap, dark && styles.inputDark]}>
                            <Text style={styles.currencyPrefix}>R$</Text>
                            <TextInput
                              value={variation.price ? String(variation.price) : ''}
                              onChangeText={(value) => {
                                const nextPrice = Number(value.replace(',', '.'));
                                setVariations((current) => current.map((item) => item.id === variation.id ? { ...item, price: nextPrice } : item));
                                markChanged();
                              }}
                              editable={!disabled}
                              placeholder="0,00"
                              placeholderTextColor="#94a3b8"
                              keyboardType="decimal-pad"
                              accessibilityLabel={`Preço da variação ${variation.name}`}
                              style={[styles.priceInput, textStyle]}
                            />
                          </View>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
              );
            })}
          </View>
        )}
      </View>

      <Modal visible={supplierPickerOpen} transparent animationType="slide" onRequestClose={() => setSupplierPickerOpen(false)}>
        <View style={[styles.modalBackdrop, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={[styles.modalPanel, dark && styles.modalPanelDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, textStyle]}>Selecionar fornecedor</Text>
              <Pressable onPress={() => setSupplierPickerOpen(false)} accessibilityRole="button" accessibilityLabel="Fechar fornecedores" style={styles.iconButton}><X size={20} color={dark ? '#e2e8f0' : '#64748b'} /></Pressable>
            </View>
            <View style={[styles.searchInputWrap, dark && styles.inputDark]}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                value={supplierSearch}
                onChangeText={setSupplierSearch}
                placeholder="Digite o nome do fornecedor..."
                placeholderTextColor="#94a3b8"
                accessibilityLabel="Buscar fornecedor"
                autoFocus
                style={[styles.searchInput, textStyle]}
              />
              {supplierLoading && <ActivityIndicator size="small" color="#2563eb" />}
            </View>
            {supplierError ? <Text style={styles.errorText} accessibilityRole="alert">{supplierError}</Text> : null}
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalOptions}>
              {supplierSearch.trim().length < 2 ? (
                <Text style={[styles.modalHint, dark && styles.mutedDark]}>Digite pelo menos 2 caracteres.</Text>
              ) : supplierLoading ? null : supplierResults.length === 0 ? (
                <Text style={[styles.modalHint, dark && styles.mutedDark]}>Nenhum fornecedor encontrado.</Text>
              ) : supplierResults.map((supplier) => (
                <Pressable
                  key={supplier.id}
                  onPress={() => {
                    setSupplierId(supplier.id);
                    setSupplierName(supplier.tradeName || supplier.fullName);
                    setSupplierPickerOpen(false);
                    setSupplierSearch('');
                    markChanged();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={supplier.fullName}
                  style={[styles.option, dark && styles.optionDark]}
                >
                  <View style={styles.productInfo}>
                    <Text style={[styles.optionTitle, textStyle]}>{supplier.fullName}</Text>
                    {supplier.tradeName ? <Text style={styles.modalHint}>Fantasia: {supplier.tradeName}</Text> : null}
                  </View>
                  {supplier.id === supplierId ? <Check size={17} color="#2563eb" /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={categoryPickerOpen} transparent animationType="slide" onRequestClose={() => setCategoryPickerOpen(false)}>
        <View style={[styles.modalBackdrop, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={[styles.modalPanel, dark && styles.modalPanelDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, textStyle]}>Selecionar categoria</Text>
              <Pressable onPress={() => setCategoryPickerOpen(false)} accessibilityRole="button" accessibilityLabel="Fechar categorias" style={styles.iconButton}><X size={20} color={dark ? '#e2e8f0' : '#64748b'} /></Pressable>
            </View>
            <View style={[styles.searchInputWrap, dark && styles.inputDark]}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                value={categorySearch}
                onChangeText={setCategorySearch}
                placeholder="Buscar categoria..."
                placeholderTextColor="#94a3b8"
                accessibilityLabel="Buscar categoria"
                style={[styles.searchInput, textStyle]}
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalOptions}>
              <Pressable
                onPress={() => {
                  setCategoryId('');
                  setCategoryName('');
                  setCategoryPickerOpen(false);
                  setCategorySearch('');
                  markChanged();
                }}
                accessibilityRole="button"
                style={[styles.option, dark && styles.optionDark]}
              ><Text style={[styles.optionTitle, textStyle]}>Remover categoria</Text></Pressable>
              {filteredCategories.length === 0 ? (
                <Text style={[styles.modalHint, dark && styles.mutedDark]}>Nenhuma categoria encontrada.</Text>
              ) : filteredCategories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => {
                    setCategoryId(category.id);
                    setCategoryName(category.name);
                    setCategoryPickerOpen(false);
                    setCategorySearch('');
                    markChanged();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={category.name}
                  style={[styles.option, dark && styles.optionDark]}
                >
                  <Text style={[styles.optionTitle, textStyle]}>{category.name}</Text>
                  {category.id === categoryId ? <Check size={17} color="#2563eb" /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const ReconciliationAttributeInput: React.FC<{
  name: string;
  attributeId?: string;
  dataType: NonNullable<ProductPendency['attributeDataType']>;
  unit?: string;
  value: string;
  disabled: boolean;
  dark: boolean;
  onChange: (value: string) => void;
}> = ({ name, attributeId, dataType, unit, value, disabled, dark, onChange }) => {
  const [registrationError, setRegistrationError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationUncertain, setRegistrationUncertain] = useState(false);
  const [registeredValue, setRegisteredValue] = useState('');
  const registerForm = useZodForm(bulkAttributeFormSchema, { name: attributeId || '', value });
  const registrationDisabled = disabled || isRegistering || registrationUncertain;
  const handleChange = (nextValue: string) => {
    setRegistrationError('');
    setRegistrationSuccess('');
    onChange(nextValue);
  };
  const registerValue = async () => {
    await registerForm.validateAndRun(
      { name: attributeId || '', value },
      async (validated) => {
        setRegistrationError('');
        setIsRegistering(true);
        try {
          const saved = await saveMobileReconciliationAttributeValue(validated.name, validated.value);
          setRegisteredValue(saved.value);
          handleChange(saved.value);
          setRegistrationSuccess('Valor do atributo cadastrado.');
        } catch (cause) {
          const error = cause as Error & { uncertain?: boolean };
          if (error.uncertain) setRegistrationUncertain(true);
          setRegistrationSuccess('');
          setRegistrationError(error.message || 'Não foi possível cadastrar o valor do atributo.');
        } finally {
          setIsRegistering(false);
        }
      },
      (errors) => setRegistrationError(Object.values(flattenFormErrors(errors))[0] || 'Revise o valor do atributo.')
    );
  };

  if (dataType === 'boolean') {
    return (
      <View style={styles.booleanOptions}>
        {[{ label: 'Sim', value: 'Sim' }, { label: 'Não', value: 'Não' }, { label: 'Selecione...', value: '' }].map((option) => {
          const selected = value.toLocaleLowerCase('pt-BR') === option.value.toLocaleLowerCase('pt-BR');
          return (
            <Pressable
              key={option.label}
              onPress={() => handleChange(option.value)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.booleanOption, dark && styles.optionDark, selected && styles.booleanSelected]}
            ><Text style={[styles.booleanText, dark && styles.textLight, selected && styles.booleanSelectedText]}>{option.label}</Text></Pressable>
          );
        })}
      </View>
    );
  }

  const isDecimal = dataType === 'decimal' || dataType === 'measure';
  const isNumeric = dataType === 'integer' || isDecimal;
  const decimalPlaces = isWeightCharacteristicName(name) ? 1 : 2;
  const displayedValue = isDecimal ? formatAttributeDecimalValue(value, decimalPlaces) : value;
  const handleNumericChange = (next: string) => {
    if (isDecimal) {
      handleChange(maskAttributeDecimalInput(next, decimalPlaces));
      return;
    }
    handleChange(limitAttributeIntegerInput(name, next));
  };
  const keyboardType = dataType === 'integer' ? 'number-pad' : isDecimal ? 'decimal-pad' : 'default';
  const placeholder = isDecimal
    ? decimalPlaces === 1 ? '0,0' : '0,00'
    : /porta|gaveta/i.test(name) ? 'Insira a quantidade de portas' : 'Insira um número inteiro';
  const isRegistered = dataType === 'list' && Boolean(value.trim()) && registeredValue.trim().toLocaleLowerCase('pt-BR') === value.trim().toLocaleLowerCase('pt-BR');
  const isUnregistered = dataType === 'list' && Boolean(attributeId && value.trim()) && !isRegistered;

  return (
    <View style={styles.attributeInputGroup}>
      <View style={[styles.attributeInputWrap, dark && styles.inputDark]}>
        <TextInput
          value={displayedValue}
          onChangeText={dataType === 'integer' || isDecimal ? handleNumericChange : handleChange}
          editable={!registrationDisabled}
          keyboardType={keyboardType}
          placeholder={dataType === 'list' || dataType === 'text' ? `Valor de ${name}...` : placeholder}
          placeholderTextColor="#94a3b8"
          accessibilityLabel={`Atributo ${name}`}
          style={[styles.input, dark ? styles.textLight : styles.textDark, isDecimal && styles.numericInput]}
        />
        {isNumeric && unit ? <Text style={[styles.attributeUnit, dark && styles.mutedDark]}>{unit}</Text> : null}
        {isRegistered ? <Check size={15} color="#15803d" /> : null}
        {isUnregistered ? (
          <Pressable
            onPress={() => void registerValue()}
            disabled={registrationDisabled}
            accessibilityRole="button"
            accessibilityLabel="Cadastrar este valor"
            style={[styles.registerButton, registrationDisabled && styles.disabled]}
          >
            {isRegistering ? <ActivityIndicator size="small" color="#fff" /> : <Check size={14} color="#fff" />}
          </Pressable>
        ) : null}
      </View>
      {isUnregistered ? <Text style={styles.registrationHint}>Esse valor não está cadastrado. Deseja cadastrar?</Text> : null}
      {registrationError ? <Text style={styles.errorText} accessibilityRole="alert">{registrationError}</Text> : null}
      {registrationSuccess ? <Text style={styles.registrationSuccess} accessibilityRole="text">{registrationSuccess}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 22, overflow: 'hidden' },
  surface: { backgroundColor: '#fff' },
  surfaceDark: { backgroundColor: '#0f172a', borderColor: '#334155' },
  textDark: { color: '#0f172a' },
  textLight: { color: '#f8fafc' },
  mutedDark: { color: '#94a3b8' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  cardHeaderDark: { backgroundColor: '#111c2f', borderBottomColor: '#334155' },
  selectionButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  selectionBox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#94a3b8', borderRadius: 6, backgroundColor: '#fff' },
  selectionBoxSelected: { borderColor: '#7c3aed', backgroundColor: '#7c3aed' },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { color: '#0f172a', fontSize: 13, fontWeight: '900' },
  productCode: { color: '#64748b', fontSize: 9, fontWeight: '800', marginTop: 2 },
  productMeta: { color: '#64748b', fontSize: 9, fontWeight: '700', marginTop: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, borderRadius: 10 },
  pendingBadge: { backgroundColor: '#fef3c7' },
  doneBadge: { backgroundColor: '#dcfce7' },
  statusText: { fontSize: 9, fontWeight: '900' },
  pendingText: { color: '#b45309' },
  doneText: { color: '#15803d' },
  saveButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#7c3aed' },
  saveText: { color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  expandButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 11 },
  expandButtonDark: { borderColor: '#334155' },
  disabled: { opacity: 0.5 },
  cardBody: { padding: 12, gap: 12 },
  attributeInputGroup: { gap: 4 },
  attributeInputWrap: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fff', borderRadius: 11, paddingHorizontal: 8 },
  numericInput: { flex: 1, minHeight: 42, paddingHorizontal: 3 },
  attributeUnit: { color: '#64748b', fontSize: 10, fontWeight: '800' },
  registerButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#16a34a' },
  registrationHint: { color: '#a16207', fontSize: 10, fontWeight: '600' },
  registrationSuccess: { color: '#15803d', fontSize: 10, fontWeight: '700' },
  errorBox: { backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3', borderRadius: 12, padding: 10 },
  errorText: { color: '#be123c', fontSize: 11, fontWeight: '700' },
  savedText: { color: '#15803d', fontSize: 11, fontWeight: '800' },
  parentSection: { borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb', borderRadius: 17, padding: 12, gap: 10 },
  parentSectionDark: { borderColor: '#713f12', backgroundColor: '#231f14' },
  sectionTitle: { color: '#92400e', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  field: { gap: 5 },
  fieldLabel: { color: '#92400e', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fff', borderRadius: 11, paddingHorizontal: 11, fontSize: 12, fontWeight: '700' },
  inputDark: { borderColor: '#475569', backgroundColor: '#0f172a' },
  pickerValue: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fff', borderRadius: 11, paddingHorizontal: 9 },
  pickerTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerText: { flex: 1, color: '#475569', fontSize: 11, fontWeight: '700' },
  iconButton: { minWidth: 38, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  priceInputWrap: { minHeight: 44, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fff', borderRadius: 11, paddingLeft: 10 },
  currencyPrefix: { color: '#64748b', fontSize: 11, fontWeight: '900' },
  priceInput: { flex: 1, minHeight: 42, paddingHorizontal: 7, fontSize: 12, fontWeight: '800' },
  hint: { color: '#a16207', fontSize: 9, fontWeight: '700' },
  sharedAttribute: { padding: 10, gap: 5, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fde68a' },
  sharedAttributeDark: { backgroundColor: '#0f172a', borderColor: '#713f12' },
  sharedAttributeName: { fontSize: 11, fontWeight: '900' },
  sharedAttributeHint: { color: '#7c3aed', fontSize: 10, fontWeight: '700' },
  variationSection: { gap: 9 },
  variationHeading: { color: '#64748b', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  variationCard: { padding: 10, gap: 9, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', borderRadius: 15 },
  variationCardDark: { borderColor: '#334155', backgroundColor: '#111c2f' },
  variationHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  variationName: { fontSize: 11, fontWeight: '900' },
  variationStatus: { fontSize: 9, fontWeight: '900' },
  booleanOptions: { flexDirection: 'row', gap: 8 },
  booleanOption: { minHeight: 42, minWidth: 80, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 11, backgroundColor: '#fff' },
  booleanSelected: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  booleanText: { color: '#475569', fontSize: 11, fontWeight: '800' },
  booleanSelectedText: { color: '#fff' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)', paddingHorizontal: 12 },
  modalPanel: { maxHeight: '82%', borderRadius: 22, padding: 15, gap: 12, backgroundColor: '#fff' },
  modalPanelDark: { backgroundColor: '#1e293b' },
  modalHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 15, fontWeight: '900' },
  searchInputWrap: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  searchInput: { flex: 1, minHeight: 44, color: '#0f172a', fontSize: 12, fontWeight: '600' },
  modalOptions: { gap: 7, paddingBottom: 10 },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 11, borderRadius: 11, backgroundColor: '#f8fafc' },
  optionDark: { backgroundColor: '#0f172a' },
  optionTitle: { color: '#0f172a', fontSize: 12, fontWeight: '800' },
  modalHint: { color: '#64748b', fontSize: 10, fontWeight: '600', paddingVertical: 10 },
});
