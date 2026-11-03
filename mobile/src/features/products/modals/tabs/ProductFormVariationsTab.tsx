import type React from 'react';
import { useEffect, useState } from 'react';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import {
  Alert,
  Modal,
  Image as RNImage,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Plus,
  Link2,
  Unlink,
  Info,
  Settings,
  FileText,
  Images,
  Package,
  Network,
  X,
  Check,
  Camera,
  Pencil,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { parseLocalizedNumber as parseLocalizedPrice } from '../../domain/productNumbers';
import {
  calculateProductDiscountFromFixed,
  calculateProductDiscountFromPercent,
  calculateProductDiscountFromPromoPrice,
  deriveProductDiscountFields,
} from '../../../../../../shared-utils/productDiscountFields';
import { resolveProductVariationPricing } from '../../../../../../shared-utils/productVariationPricing';
import { generateVariationSku } from '../../domain/productSku';
import { getMobileProductReadiness } from '../../domain/productRegistrationRules';
import { getEffectiveProductForVariationReadiness } from '../../../../../../shared-utils/productErpLegibility';
import { checkMobileProductVariationHasMoves } from '../../services/mobileProductMutationService';
import { useMobileProductVariationUsage } from '../../hooks/useMobileProductVariationUsage';
import { ProductFormTechnicalTab } from './ProductFormTechnicalTab';
import { ProductVariationIdentificationTab } from './ProductVariationIdentificationTab';
import { ProductVariationPhotosEditor } from '../components/ProductVariationPhotosEditor';
import { ProductFormCompositionTab } from './ProductFormCompositionTab';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MergedBadge } from '../../components/MergedBadge';
import { styles } from './productFormVariationsTab.styles';
import { inheritMobileSimpleVariationFromParent } from '../../domain/productVariationParentSync';
import { replaceMobileProductImageGlobally } from '../../domain/mobileProductImageOrdering';
import type { MobileProductFormErrorNavigation } from '../../domain/mobileProductFormErrorNavigation';
import {
  createMobileProductVariationId,
  generateMobileProductVariations,
  getInitialMobileVariationName,
  getInitialMobileVariationStatus,
} from '../../domain/mobileProductVariationGeneration';
import { ProductVariationGenerationModal } from '../ProductVariationGenerationModal';
import { variationToSimpleConfirmationSchema } from '../../../../../../shared-utils/productVariationOperationFormSchemas';
import { isSingleProductVariationFormMode } from '../../../../../../shared-utils/productVariationMode';

import { FormTextInput } from '../../../../components/shared/FormTextInput';
type VariationTabId = 'identificacao' | 'tecnico' | 'descricao' | 'fotos' | 'compostos' | 'estoque';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
  isStockistOnly?: boolean;
  isExistingProduct?: boolean;
  selectedVariationId?: string;
  validationTarget?: MobileProductFormErrorNavigation | null;
  onValidationTargetHandled?: () => void;
}

export const ProductFormVariationsTab: React.FC<Props> = ({
  formData,
  setFormData,
  dark,
  isStockistOnly = false,
  isExistingProduct = false,
  selectedVariationId,
  validationTarget,
  onValidationTargetHandled,
}) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [activeVariationTab, setActiveVariationTab] = useState<VariationTabId>('identificacao');
  const [openReadiness, setOpenReadiness] = useState<'erp' | 'catalog' | null>(null);
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const simpleConversionForm = useZodForm(variationToSimpleConfirmationSchema, {
    variationId: '',
    acknowledged: true,
  });

  const variations: any[] = Array.isArray(formData.variations) ? formData.variations : [];
  const variationCount = variations.length;
  const variationIds = variations.map((variation) => String(variation.id || '')).join('|');
  const shouldCheckVariationUsage = Boolean(
    isExistingProduct && formData.id && variationCount > 1
  );
  const variationUsageById = useMobileProductVariationUsage(
    formData.id,
    shouldCheckVariationUsage,
    variationIds
  );

  useEffect(() => {
    if (!selectedVariationId) return;
    const selectedIndex = variations.findIndex(
      (variation) => String(variation.id || '') === String(selectedVariationId)
    );
    if (selectedIndex < 0) return;
    setOpenReadiness(null);
    setExpanded(selectedIndex);
    setActiveVariationTab('identificacao');
  }, [selectedVariationId, variationIds]);

  useEffect(() => {
    const target = validationTarget;
    if (!target) return;

    const variationIndex = target.variationIndex;
    if (variationIndex === undefined) return;

    if (variationIndex < 0 || variationIndex >= variationCount) {
      onValidationTargetHandled?.();
      return;
    }

    setOpenReadiness(null);
    setExpanded(variationIndex);
    if (target.variationPanel) {
      setActiveVariationTab(target.variationPanel);
    }
    onValidationTargetHandled?.();
  }, [validationTarget, variationCount, variationIds, onValidationTargetHandled]);

  const handleAdd = () => {
    const parentCode = (formData.code || '000000').trim();
    const resolvedSku = generateVariationSku(parentCode, variations);
    const name = getInitialMobileVariationName(formData);

    const v = {
      id: createMobileProductVariationId(),
      name,
      title: name,
      marketplaceTitle: name,
      differentiateTitle: false,
      sku: resolvedSku,
      price: parseLocalizedPrice(formData.unitPrice),
      promoPrice: parseLocalizedPrice(formData.promoPrice) || undefined,
      costPrice: parseLocalizedPrice(formData.costPrice),
      stock: 0,
      description: formData.description || '',
      width: formData.width || '',
      height: formData.height || '',
      depth: formData.depth || '',
      weight: formData.weight || '',
      status: getInitialMobileVariationStatus(formData),
      active: false,
      syncUnitPrice: true,
      syncPromoPrice: true,
      syncCostPrice: true,
      syncFiscal: true,
      syncCondition: true,
      syncDescription: true,
      syncWidth: true,
      syncHeight: true,
      syncDepth: true,
      syncWeight: true,
      syncIpi: true,
      syncFreight: true,
      attributes: [],
      technicalValues: {},
      images: [],
      comboItems: [],
    };

    setFormData((prev) => {
      const isConvertingSimpleProduct =
        !prev.hasVariations && (prev.variations?.length || 0) <= 1;
      return {
        ...prev,
        hasVariations: true,
        variations: [...(prev.variations || []), v],
        ...(isConvertingSimpleProduct ? { variableTechnicalFields: [] } : {}),
      };
    });
    setOpenReadiness(null);
    setExpanded(variations.length);
    setActiveVariationTab('identificacao');
  };

  const handleGenerateVariations = (options: Array<{ name: string; values: string[]; showName: boolean }>) => {
    const generated = generateMobileProductVariations(options, formData, variations);
    if (generated.variations.length === 0) {
      Alert.alert('Não foi possível gerar', 'Selecione pelo menos um valor para cada característica.');
      return;
    }
    setFormData((previous) => ({
      ...previous,
      hasVariations: true,
      variations: [...(previous.variations || []), ...generated.variations],
      variableTechnicalFields: generated.variableTechnicalFields,
    }));
    Alert.alert(
      'Variações geradas',
      `${generated.variations.length} ${generated.variations.length === 1 ? 'variação foi adicionada' : 'variações foram adicionadas'} ao produto.`
    );
  };

  const handleRemove = async (index: number) => {
    if (variations.length <= 1) {
      Alert.alert(
        'Variação obrigatória',
        'O produto precisa manter pelo menos uma variação operacional.'
      );
      return;
    }

    const variation = variations[index];
    const isMerged = Boolean(
      variation?.is_merged ||
      variation?.isMerged ||
      variation?.merged_to_variation_id ||
      variation?.mergedToVariationId
    );
    if (isMerged) {
      Alert.alert(
        'Variação mesclada',
        'Esta variação está mesclada em outra e não pode ser removida.'
      );
      return;
    }
    if (formData.id && variation?.id) {
      try {
        const hasMoves = await checkMobileProductVariationHasMoves(formData.id, variation.id);
        if (hasMoves) {
          Alert.alert(
            'Variação com histórico',
            'Esta variação possui movimentações de estoque ou pedidos vinculados e não pode ser removida.'
          );
          return;
        }
      } catch {
        Alert.alert(
          'Não foi possível verificar o histórico',
          'A variação não foi removida. Tente novamente quando a conexão estiver disponível.'
        );
        return;
      }
    }

    const remainsSimple = variations.length === 2;
    const confirmRemoval = () => {
      setFormData((previous) => {
        const nextVariations = (previous.variations || []).filter(
          (_: any, currentIndex: number) => currentIndex !== index
        );
        const becomesSimple = nextVariations.length === 1;
        const remainingVariation = nextVariations[0];
        const variations = becomesSimple
          ? [
              isExistingProduct
                ? inheritMobileSimpleVariationFromParent(previous, remainingVariation, {
                    preserveVariationStock: true,
                    preserveVariationAttributes: true,
                  })
                : inheritMobileSimpleVariationFromParent(previous, remainingVariation),
            ]
          : nextVariations;
        return {
          ...previous,
          variations,
          hasVariations: !becomesSimple,
        };
      });
      if (expanded === index) setExpanded(null);
      else if (expanded !== null && expanded > index) setExpanded(expanded - 1);
    };
    Alert.alert(
      remainsSimple ? 'O produto se tornará simples' : 'Remover variação?',
      remainsSimple
        ? 'Restará uma variação simples, que herdará nome, preços, descrição, dimensões e fotos do produto pai. UUID/SKU, características e saldo da variação restante serão mantidos. As fotos da variação removida não serão excluídas automaticamente da aba Galeria; revise ou remova-as por lá se necessário. Você poderá voltar a “Com variações” nas informações básicas.'
        : `A variação “${variation?.name || variation?.sku || 'Variação'}” será removida ao salvar o produto.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: remainsSimple ? 'Confirmar e tornar simples' : 'Remover',
          style: 'destructive',
          onPress: () => {
            if (!remainsSimple) {
              confirmRemoval();
              return;
            }

            const variationId = String(
              variation?.id || variation?.sku || `draft-${index}`
            );
            void simpleConversionForm.validateAndRun(
              { variationId, acknowledged: true },
              () => confirmRemoval(),
              (errors) => {
                Alert.alert(
                  'Não foi possível confirmar',
                  Object.values(flattenFormErrors(errors))[0] ||
                    'Revise a confirmação e tente novamente.'
                );
              }
            );
          },
        },
      ]
    );
  };

  const updateVar = (idx: number, field: string, val: any) => {
    setFormData((prev) => {
      const vars = [...(prev.variations || [])];
      vars[idx] = {
        ...vars[idx],
        [field]: val,
        ...(['price', 'promoPrice'].includes(field)
          ? { syncUnitPrice: false, syncPromoPrice: false }
          : {}),
      };
      return { ...prev, variations: vars };
    });
  };

  const updateVariationPricing = (
    idx: number,
    field: 'price' | 'discountPercent' | 'discountFixed' | 'promoPrice',
    value: string
  ) => {
    setFormData((prev) => {
      const vars = [...(prev.variations || [])];
      const current = vars[idx];
      const effectivePricing = resolveProductVariationPricing(
        {
          syncUnitPrice: current.syncUnitPrice,
          syncPromoPrice: current.syncPromoPrice,
          unitPrice: current.price,
          promoPrice: current.promoPrice,
        },
        { unitPrice: prev.unitPrice, promoPrice: prev.promoPrice }
      );
      const regularPrice = parseLocalizedPrice(effectivePricing.unitPrice);
      const currentPromoPrice = parseLocalizedPrice(effectivePricing.promoPrice);
      const inheritedDiscount = deriveProductDiscountFields(regularPrice, currentPromoPrice);
      let next = current;

      if (field === 'discountPercent') {
        const percent = Number(value.replace(',', '.'));
        const discount = calculateProductDiscountFromPercent(regularPrice, percent);
        next = {
          ...current,
          discountPercent: value,
          discountFixed: discount.discountFixed,
          promoPrice: discount.promoPrice,
        };
      } else if (field === 'discountFixed') {
        const fixed = parseLocalizedPrice(value);
        const discount = calculateProductDiscountFromFixed(regularPrice, fixed);
        next = {
          ...current,
          discountFixed: value,
          discountPercent: discount.discountPercent,
          promoPrice: discount.promoPrice,
        };
      } else if (field === 'promoPrice') {
        const discount = calculateProductDiscountFromPromoPrice(
          regularPrice,
          parseLocalizedPrice(value)
        );
        next = {
          ...current,
          promoPrice: discount.promoPrice,
          discountPercent: discount.discountPercent,
          discountFixed: discount.discountFixed,
        };
      } else {
        const price = parseLocalizedPrice(value);
        const percent = String(current.discountPercent ?? inheritedDiscount.discountPercent);
        const fixedRaw = String(current.discountFixed ?? '');
        if (price <= 0) {
          next = {
            ...current,
            price: value,
            discountPercent: '',
            discountFixed: '',
            promoPrice: undefined,
          };
        } else if (percent) {
          const discount = calculateProductDiscountFromPercent(
            price,
            Number(percent.replace(',', '.'))
          );
          next = {
            ...current,
            price: value,
            discountPercent: percent,
            discountFixed: discount.discountFixed,
            promoPrice: discount.promoPrice,
          };
        } else if (fixedRaw.trim()) {
          next = { ...current, price: value };
        } else {
          const discount = calculateProductDiscountFromPromoPrice(price, currentPromoPrice);
          next = {
            ...current,
            price: value,
            discountPercent: discount.discountPercent,
            discountFixed: discount.discountFixed,
            promoPrice: discount.promoPrice,
          };
        }
      }

      vars[idx] = {
        ...next,
        syncUnitPrice: field === 'price' ? false : current.syncUnitPrice,
        syncPromoPrice: false,
      };
      return { ...prev, variations: vars };
    });
  };

  const toggleVariationDescription = (idx: number) => {
    setFormData((prev) => {
      const vars = [...(prev.variations || [])];
      const current = vars[idx];
      const nextSyncDescription = current.syncDescription === false;
      vars[idx] = {
        ...current,
        syncDescription: nextSyncDescription,
        description: prev.description || current.description || '',
      };
      return { ...prev, variations: vars };
    });
  };

  const updateVarName = (idx: number, name: string) => {
    setFormData((prev) => {
      const vars = [...(prev.variations || [])];
      const current = vars[idx];
      const titleIsSynced = current.differentiateTitle !== true;
      vars[idx] = {
        ...current,
        name,
        ...(titleIsSynced ? { title: name, marketplaceTitle: name } : {}),
      };
      return { ...prev, variations: vars };
    });
  };

  const parentCategoryIds: string[] =
    formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []);
  const isComposition = formData.itemType === 'composition' || formData.item_type === 'composition';
  const isSingleVariation = isSingleProductVariationFormMode(
    formData,
    variations.length,
    false
  );
  const isSingleExistingVariation = isExistingProduct && isSingleVariation;
  const inheritedDataTabs: readonly VariationTabId[] = [
    'tecnico',
    'descricao',
    'estoque',
    'compostos',
  ];
  const showInheritedDataNotice =
    isSingleExistingVariation &&
    inheritedDataTabs.includes(activeVariationTab);

  const variationTabs = [
    { id: 'identificacao' as const, label: 'Informações Básicas', Icon: Info },
    ...(!isStockistOnly
      ? [
          { id: 'fotos' as const, label: 'Fotos vinculadas', Icon: Images },
        ]
      : []),
    ...(!isStockistOnly
      ? [{ id: 'tecnico' as const, label: 'Características', Icon: Settings }]
      : []),
    ...(!isStockistOnly
      ? [{ id: 'descricao' as const, label: 'Descrição', Icon: FileText }]
      : []),
    { id: 'estoque' as const, label: 'Estoque e Precificação', Icon: Package },
    ...(isComposition
      ? [{ id: 'compostos' as const, label: 'Produtos Componentes', Icon: Network }]
      : []),
  ];

  useEffect(() => {
    if (!variationTabs.some((tab) => tab.id === activeVariationTab)) {
      setActiveVariationTab('identificacao');
    }
  }, [activeVariationTab, isComposition, isStockistOnly]);

  return (
    <View style={styles.container}>
      <View style={[styles.card, dark && styles.darkCard]}>
        <View style={styles.variationOverview}>
          <View style={styles.variationOverviewIcon}>
            <Network size={19} color="#ffffff" />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.cardTitle, dark && styles.lightText]}>VARIAÇÕES DO PRODUTO</Text>
            <Text style={[styles.toggleDesc, dark && styles.dimText]}>
              Cada variação herda as características do produto pai e pode definir valores próprios
              ao editar a variação.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, dark && styles.lightText]}>
          Variações ({variations.length})
        </Text>
        <View style={styles.variationActions}>
          <TouchableOpacity
            onPress={() => setIsGenerationModalOpen(true)}
            disabled={!String(formData.name || '').trim()}
            style={[
              styles.generateVariationButton,
              !String(formData.name || '').trim() && styles.addBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Gerar variações por características"
          >
            <Sparkles size={14} color="#2563eb" />
            <Text style={styles.generateVariationText}>Gerar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAdd}
            disabled={!String(formData.name || '').trim()}
            style={[
              styles.addVariationButton,
              !String(formData.name || '').trim() && styles.addBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Adicionar variação"
          >
            <Plus size={14} color="#ffffff" />
            <Text style={styles.addBtnText}>Adicionar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de Variações */}
      {variations.length === 0 ? (
          <View style={[styles.emptyBox, dark && styles.darkCard]}>
            <Text style={styles.emptyText}>Nenhuma variação ainda. Adicione acima.</Text>
          </View>
        ) : (
          variations.map((v: any, idx: number) => {
            const effectivePricing = resolveProductVariationPricing(
              {
                syncUnitPrice: v.syncUnitPrice,
                syncPromoPrice: v.syncPromoPrice,
                unitPrice: v.price,
                promoPrice: v.promoPrice,
              },
              { unitPrice: formData.unitPrice, promoPrice: formData.promoPrice }
            );
            const regularPrice = parseLocalizedPrice(effectivePricing.unitPrice);
            const promoPrice = parseLocalizedPrice(effectivePricing.promoPrice);
            const finalPrice =
              promoPrice > 0 && promoPrice < regularPrice ? promoPrice : regularPrice;
            const hasDiscount = finalPrice < regularPrice;
            const variationFormData = { ...v, categoryIds: parentCategoryIds };
            const setVariationTechnicalData = (updater: (previous: any) => any) =>
              setFormData((previous) => {
                const currentVariation = previous.variations[idx];
                const updatedVariation = updater({
                  ...currentVariation,
                  categoryIds: parentCategoryIds,
                });
                const persistedVariation = { ...updatedVariation };
                delete persistedVariation.categoryIds;
                const nextVariations = [...previous.variations];
                nextVariations[idx] = persistedVariation;
                return { ...previous, variations: nextVariations };
              });
            const isOpen = expanded === idx;
            const variationImage = Array.isArray(v.images) ? v.images[0] : null;
            const openVariation = () => {
              setOpenReadiness(null);
              setExpanded(idx);
              setActiveVariationTab('identificacao');
            };
            const effectiveVariationProduct = getEffectiveProductForVariationReadiness(
              formData,
              { ...v, unitPrice: v.unitPrice ?? v.price ?? v.unit_price }
            );
            const readiness = getMobileProductReadiness(effectiveVariationProduct);
            const erpReady = readiness.erp.isLegible;
            const readinessItems =
              openReadiness === 'erp'
                ? [
                    { label: 'Nome / Identificação Válida', complete: readiness.erp.checks.description },
                    { label: 'Preço de Venda > R$ 0', complete: readiness.erp.checks.unitPrice },
                    { label: 'Categoria (Herdada do Pai)', complete: readiness.erp.checks.categories },
                    { label: 'Fornecedor (Herdado do Pai)', complete: readiness.erp.checks.supplier },
                  ]
                : [
                    { label: 'Preço de Venda > R$ 0', complete: readiness.catalog.checks.unitPrice },
                    { label: 'Fotos vinculadas (Pai ou Variação)', complete: readiness.catalog.checks.images },
                  ];
            const catalogPublished = formData.status === 'published';
            const derivedDiscount = deriveProductDiscountFields(regularPrice, promoPrice);
            const discountPercent = derivedDiscount.discountPercent;
            const discountFixed = derivedDiscount.discountFixed;
            return (
              <View
                key={v.id || v.sku || `${v.name || 'variacao'}-${idx}`}
                style={[styles.varItem, dark && styles.darkCard]}
              >
                {/* Header da variação */}
                <View style={styles.varHeader}>
                  <TouchableOpacity
                    onPress={openVariation}
                    style={[styles.variationThumbnail, dark && styles.darkVariationThumbnail]}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar detalhes da variação ${v.name || v.sku}`}
                  >
                    {variationImage ? (
                      <RNImage
                        source={{ uri: variationImage }}
                        style={styles.variationImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Camera size={17} color={dark ? '#94a3b8' : '#94a3b8'} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={openVariation}
                    style={styles.varHeaderLeft}
                    accessibilityRole="button"
                  >
                    <View style={styles.varSkuRow}>
                      <View style={[styles.skuBadge, dark && styles.darkSkuBadge]}>
                        <Text style={[styles.varSku, dark && styles.lightText]}>{v.sku}</Text>
                      </View>
                      {Boolean(
                        v.is_merged ||
                        v.isMerged ||
                        v.merged_to_variation_id ||
                        v.mergedToVariationId
                      ) && (
                        <MergedBadge
                          targetVariationId={v.merged_to_variation_id || v.mergedToVariationId}
                          dark={dark}
                          size="xs"
                        />
                      )}
                    </View>
                    <Text style={styles.variationNameLabel}>NOME DA VARIAÇÃO</Text>
                    <Text style={[styles.varAttr, dark && styles.lightText]} numberOfLines={2}>
                      {v.name || 'Variação'}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.varHeaderRight}>
                    <Text style={styles.variationPriceLabel}>PREÇO VENDA</Text>
                    {hasDiscount && (
                      <Text style={styles.varRegularPrice}>
                        R$ {regularPrice.toFixed(2).replace('.', ',')}
                      </Text>
                    )}
                    <Text style={styles.varPrice}>
                      R$ {finalPrice.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                  <View style={styles.varHeaderActions}>
                    <TouchableOpacity
                      onPress={openVariation}
                      style={[styles.editVariationButton, dark && styles.darkEditVariationButton]}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar características da variação ${v.name || v.sku}`}
                    >
                      <Pencil size={16} color={dark ? '#cbd5e1' : '#64748b'} />
                    </TouchableOpacity>
                    {(() => {
                      const isVariationMerged = Boolean(
                        v.is_merged ||
                        v.isMerged ||
                        v.merged_to_variation_id ||
                        v.mergedToVariationId
                      );
                      const variationId = String(v.id || '');
                      const usageStatus = shouldCheckVariationUsage && variationId
                        ? variationUsageById[variationId]
                        : false;
                      const isUsageBlocked = Boolean(
                        shouldCheckVariationUsage && variationId && usageStatus !== false
                      );
                      const isDeleteDisabled =
                        variations.length <= 1 || isVariationMerged || isUsageBlocked;
                      return (
                        <TouchableOpacity
                          onPress={() => void handleRemove(idx)}
                          disabled={isDeleteDisabled}
                          style={[
                            styles.editVariationButton,
                            dark && styles.darkEditVariationButton,
                            isDeleteDisabled && styles.removeVariationDisabled,
                          ]}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          accessibilityRole="button"
                          accessibilityLabel={
                            variations.length <= 1
                              ? 'A última variação não pode ser removida'
                              : isVariationMerged
                              ? 'Esta variação está mesclada e não pode ser removida'
                              : isUsageBlocked && usageStatus === undefined
                              ? `Verificando vínculos de estoque e vendas da variação ${v.name || v.sku}`
                              : isUsageBlocked
                              ? 'A variação possui vínculos de histórico ou não foi possível verificá-los'
                              : `Remover variação ${v.name || v.sku}`
                          }
                        >
                          <Trash2 size={16} color={isDeleteDisabled ? '#94a3b8' : '#dc2626'} />
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                </View>
                {shouldCheckVariationUsage &&
                  Boolean(v.id) &&
                  variationUsageById[String(v.id)] !== false && (
                    <Text style={[styles.variationDeletionStatus, dark && styles.darkVariationDeletionStatus]}>
                      {variationUsageById[String(v.id)] === undefined
                        ? 'Verificando vínculos de estoque e vendas…'
                        : 'Esta variação possui vínculos de histórico ou não foi possível verificá-los.'}
                    </Text>
                  )}

                {/* Modal de edição da variação, equivalente ao ERP */}
                {isOpen && (
                  <Modal
                    visible={isOpen}
                    animationType="slide"
                    presentationStyle="fullScreen"
                    onRequestClose={() => setExpanded(null)}
                  >
                    <View
                      style={[
                        styles.variationModalRoot,
                        dark && styles.darkModalRoot,
                        { paddingTop: insets.top, paddingBottom: insets.bottom },
                      ]}
                    >
                      <View style={styles.varEdit}>
                        <View style={styles.variationFormHeader}>
                          <View style={styles.variationHeaderTitle}>
                            <Text
                              style={[styles.variationHeaderTitleText, dark && styles.lightText]}
                              numberOfLines={2}
                            >
                              Editar Variação |{' '}
                              {formData.name || formData.description || 'Produto pai'}
                            </Text>
                            <Text style={[styles.helperText, dark && styles.dimText]}>
                              Configure os dados específicos desta variação.
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setExpanded(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Fechar edição da variação"
                            style={styles.closeVariationButton}
                          >
                            <X size={18} color={dark ? '#94a3b8' : '#64748b'} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.statusPills}>
                          <TouchableOpacity
                            hitSlop={8}
                            onPress={() =>
                              setOpenReadiness((current) => (current === 'erp' ? null : 'erp'))
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`ERP: ${erpReady ? 'Ativo' : 'Pendente'}, abrir requisitos da variação`}
                            accessibilityState={{ expanded: openReadiness === 'erp' }}
                            style={[
                              styles.statusPill,
                              erpReady ? styles.erpReadyPill : styles.erpPendingPill,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                erpReady ? styles.erpReadyText : styles.erpPendingText,
                              ]}
                            >
                              ERP: {erpReady ? 'Ativo' : 'Pendente'}
                            </Text>
                          </TouchableOpacity>
                          {!isStockistOnly && <TouchableOpacity
                            hitSlop={8}
                            onPress={() =>
                              setOpenReadiness((current) => (current === 'catalog' ? null : 'catalog'))
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`Catálogo: ${catalogPublished ? 'Publicado' : 'Ocultado'}, abrir requisitos da variação`}
                            accessibilityState={{ expanded: openReadiness === 'catalog' }}
                            style={[
                              styles.statusPill,
                              catalogPublished
                                ? styles.catalogPublishedPill
                                : styles.catalogHiddenPill,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                catalogPublished
                                  ? styles.catalogPublishedText
                                  : styles.catalogHiddenText,
                              ]}
                            >
                              Catálogo: {catalogPublished ? 'Publicado' : 'Ocultado'}
                            </Text>
                          </TouchableOpacity>}
                        </View>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.variationTabs}
                          accessibilityRole="tablist"
                        >
                          {variationTabs.map(({ id, label, Icon }) => {
                            const selected = activeVariationTab === id;
                            const isInheritedDataTab =
                              isSingleExistingVariation &&
                              inheritedDataTabs.includes(id) &&
                              !(isComposition && id === 'compostos');
                            return (
                              <TouchableOpacity
                                key={id}
                                onPress={() => setActiveVariationTab(id)}
                                accessibilityRole="tab"
                                accessibilityState={{ selected }}
                                style={[
                                  styles.variationTab,
                                  selected && styles.activeVariationTab,
                                  isInheritedDataTab && styles.inheritedDataTab,
                                ]}
                              >
                                <Icon
                                  size={14}
                                  color={selected ? '#2563eb' : dark ? '#94a3b8' : '#64748b'}
                                />
                                <Text
                                  style={[
                                    styles.variationTabText,
                                    dark && styles.dimText,
                                    selected && styles.activeVariationTabText,
                                  ]}
                                >
                                  {label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                      <View style={{ flex: 1, position: 'relative' }}>
                        <ScrollView
                          style={styles.variationModalBody}
                          contentContainerStyle={styles.variationModalBodyContent}
                          keyboardShouldPersistTaps="handled"
                        >
                          {openReadiness && (openReadiness === 'erp' || !isStockistOnly) && (
                            <View style={[styles.readinessPanel, dark && styles.darkReadinessPanel]}>
                              <Text style={[styles.readinessPanelTitle, dark && styles.lightText]}>
                                {openReadiness === 'erp'
                                  ? 'Requisitos do ERP (Variação / Ativação)'
                                  : 'Requisitos para o Catálogo'}
                              </Text>
                              {readinessItems.map((item) => (
                                <View
                                  key={item.label}
                                  accessible
                                  accessibilityLabel={`${item.label}: ${item.complete ? 'atendido' : 'pendente'}`}
                                  style={styles.readinessItem}
                                >
                                  {item.complete ? (
                                    <Check size={14} color={openReadiness === 'erp' ? '#3b82f6' : '#10b981'} />
                                  ) : (
                                    <X size={14} color={openReadiness === 'erp' ? '#f59e0b' : '#94a3b8'} />
                                  )}
                                  <Text
                                    style={[
                                      styles.readinessItemText,
                                      dark && styles.dimText,
                                      item.complete && (openReadiness === 'erp'
                                        ? styles.erpReadinessComplete
                                        : styles.catalogReadinessComplete),
                                      !item.complete && styles.readinessItemPending,
                                    ]}
                                  >
                                    {item.label}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                          <View
                            style={showInheritedDataNotice ? styles.inheritedNoticeDisabledContent : null}
                            pointerEvents={showInheritedDataNotice ? 'none' : 'auto'}
                          >
                        {activeVariationTab === 'identificacao' && (
                          <ProductVariationIdentificationTab
                            variation={v}
                            parentPrefix={String(
                              formData.name || formData.description || 'Produto'
                            ).trim()}
                            dark={dark}
                            onDifferentTitleModeChange={(enabled) => {
                              updateVar(idx, 'differentiateTitle', enabled);
                              updateVar(idx, 'title', enabled ? '' : v.name);
                              updateVar(idx, 'marketplaceTitle', enabled ? '' : v.name);
                            }}
                            onVariationNameChange={(name) => updateVarName(idx, name)}
                            onCatalogTitleChange={(title) => {
                              updateVar(idx, 'title', title);
                              updateVar(idx, 'marketplaceTitle', title);
                            }}
                          />
                        )}

                        {activeVariationTab === 'tecnico' && (
                          <View style={styles.tabContent}>
                            <Text style={[styles.sectionTitle, dark && styles.lightText]}>
                              Características
                            </Text>
                            <ProductFormTechnicalTab
                              formData={variationFormData}
                              setFormData={setVariationTechnicalData}
                              parentData={formData}
                              dark={dark}
                              requiredFieldsOnly={isStockistOnly}
                              isSingleVariation={isSingleVariation}
                            />
                          </View>
                        )}

                        {!isStockistOnly && activeVariationTab === 'descricao' && (
                          <View style={[styles.card, dark && styles.darkCard]}>
                            <View style={styles.cardHeader}>
                              <View style={styles.flex1}>
                                <Text style={[styles.sectionTitle, dark && styles.lightText]}>
                                  Descrição da Variação
                                </Text>
                                <Text style={[styles.helperText, dark && styles.dimText]}>
                                  {v.syncDescription !== false
                                    ? 'Sincronizada com a descrição do produto pai'
                                    : 'Descrição própria desta variação'}
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => toggleVariationDescription(idx)}
                                style={[
                                  styles.inheritButton,
                                  v.syncDescription !== false && styles.inheritButtonActive,
                                ]}
                                accessibilityRole="switch"
                                accessibilityLabel="Sincronizar descrição com o produto pai"
                                accessibilityState={{ checked: v.syncDescription !== false }}
                              >
                                {v.syncDescription !== false ? (
                                  <Link2 size={14} color="#ffffff" />
                                ) : (
                                  <Unlink size={14} color="#64748b" />
                                )}
                                <Text
                                  style={[
                                    styles.inheritButtonText,
                                    v.syncDescription !== false && styles.inheritButtonTextActive,
                                  ]}
                                >
                                  {v.syncDescription !== false ? 'Sincronizado' : 'Manual'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                            {v.syncDescription !== false ? (
                              <View
                                style={[
                                  styles.inheritedDescription,
                                  dark && styles.darkInheritedDescription,
                                ]}
                              >
                                <Text style={[styles.descriptionText, dark && styles.dimText]}>
                                  {String(
                                    formData.description || 'O produto pai ainda não tem descrição.'
                                  )}
                                </Text>
                              </View>
                            ) : (
                              <FormTextInput
                                value={String(v.description || '')}
                                onChangeText={(value) => updateVar(idx, 'description', value)}
                                placeholder="Descrição específica desta variação..."
                                placeholderTextColor="#94a3b8"
                                multiline
                                textAlignVertical="top"
                                style={[
                                  styles.descriptionInput,
                                  dark && styles.darkInput,
                                  dark && styles.lightText,
                                ]}
                                accessibilityLabel="Descrição específica da variação"
                              />
                            )}
                          </View>
                        )}

                        {!isStockistOnly && activeVariationTab === 'fotos' && (
                          <ProductVariationPhotosEditor
                            images={Array.isArray(v.images) ? v.images : []}
                            parentImages={Array.isArray(formData.images) ? formData.images : []}
                            onChangeImages={(images) => updateVar(idx, 'images', images)}
                            onCropPhoto={(oldUrl, newUrl) => {
                              setFormData((prev) => replaceMobileProductImageGlobally(prev, oldUrl, newUrl));
                            }}
                            inheritsParentGallery={isSingleVariation}
                            dark={dark}
                          />
                        )}

                        {activeVariationTab === 'compostos' && isComposition && (
                          <ProductFormCompositionTab
                            formData={variationFormData}
                            setFormData={setVariationTechnicalData}
                            dark={dark}
                            supplierId={formData.mainSupplierId || formData.supplierId}
                          />
                        )}

                        {activeVariationTab === 'estoque' && (
                          <View style={styles.tabContent}>
                            <View style={styles.cardHeader}>
                              <Text style={[styles.sectionTitle, dark && styles.lightText]}>
                                Precificação de Venda
                              </Text>
                              <TouchableOpacity
                                onPress={() => {
                                  const sync = !effectivePricing.inheritsUnitPrice;
                                  setFormData((prev) => {
                                    const vars = [...(prev.variations || [])];
                                    vars[idx] = {
                                      ...vars[idx],
                                      syncUnitPrice: sync,
                                      syncPromoPrice: sync,
                                      ...(sync
                                        ? {
                                            price: parseLocalizedPrice(prev.unitPrice),
                                            promoPrice:
                                              parseLocalizedPrice(prev.promoPrice) || undefined,
                                          }
                                        : {}),
                                    };
                                    return { ...prev, variations: vars };
                                  });
                                }}
                                disabled={isSingleVariation}
                                style={[
                                  styles.inheritButton,
                                  isSingleVariation && { opacity: 0.7 },
                                  effectivePricing.hasMixedInheritance
                                    ? styles.inheritButtonPartial
                                    : effectivePricing.inheritsUnitPrice &&
                                        styles.inheritButtonActive,
                                ]}
                                accessibilityRole="switch"
                                accessibilityHint={
                                  isSingleVariation
                                    ? 'A única variação herda os dados do produto.'
                                    : undefined
                                }
                                accessibilityLabel={
                                  effectivePricing.hasMixedInheritance
                                    ? effectivePricing.inheritsUnitPrice
                                      ? 'Herança parcial: preço regular herdado e promoção própria. Toque para tornar ambos próprios, preservando os valores.'
                                      : 'Herança parcial: preço regular próprio e promoção herdada. Toque para herdar ambos do pai.'
                                    : effectivePricing.inheritsUnitPrice
                                      ? 'Preço herdado do pai'
                                      : 'Preço personalizado'
                                }
                                accessibilityState={{
                                  disabled: isSingleVariation,
                                  checked: effectivePricing.hasMixedInheritance
                                    ? 'mixed'
                                    : effectivePricing.inheritsUnitPrice,
                                }}
                              >
                                <Text
                                  style={[
                                    styles.inheritButtonText,
                                    effectivePricing.hasMixedInheritance
                                      ? styles.inheritButtonTextPartial
                                      : effectivePricing.inheritsUnitPrice &&
                                          styles.inheritButtonTextActive,
                                  ]}
                                >
                                  {effectivePricing.hasMixedInheritance
                                    ? 'Herança Parcial'
                                    : effectivePricing.inheritsUnitPrice
                                      ? 'Preço Herdado do Pai'
                                      : 'Preço Personalizado'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                            <View style={styles.pricingGrid}>
                              <View style={styles.flex1}>
                                <Text style={[styles.label, dark && styles.dimText]}>
                                  Preço de Venda
                                </Text>
                                <FormTextInput
                                  value={String(
                                    effectivePricing.unitPrice ?? ''
                                  )}
                                  onChangeText={(val) => updateVariationPricing(idx, 'price', val)}
                                  editable={v.syncUnitPrice === false}
                                  keyboardType="numeric"
                                  placeholder="Herdado do pai"
                                  style={[
                                    styles.input,
                                    dark && styles.darkInput,
                                    dark && styles.lightText,
                                    effectivePricing.inheritsUnitPrice && styles.inheritedInput,
                                  ]}
                                  accessibilityLabel="Preço de venda da variação"
                                />
                              </View>
                              <View style={styles.flex1}>
                                <Text style={[styles.label, dark && styles.dimText]}>
                                  Desconto (%)
                                </Text>
                                <FormTextInput
                                  value={String(discountPercent)}
                                  onChangeText={(val) => updateVariationPricing(idx, 'discountPercent', val)}
                                  editable={v.syncPromoPrice === false}
                                  keyboardType="numeric"
                                  placeholder="0"
                                  style={[
                                    styles.input,
                                    dark && styles.darkInput,
                                    dark && styles.lightText,
                                    effectivePricing.inheritsPromoPrice && styles.inheritedInput,
                                  ]}
                                  accessibilityLabel="Desconto em percentual da variação"
                                />
                              </View>
                              <View style={styles.flex1}>
                                <Text style={[styles.label, dark && styles.dimText]}>
                                  Desconto (R$)
                                </Text>
                                <FormTextInput
                                  value={String(discountFixed)}
                                  onChangeText={(val) => updateVariationPricing(idx, 'discountFixed', val)}
                                  editable={v.syncPromoPrice === false}
                                  keyboardType="numeric"
                                  placeholder="0,00"
                                  style={[
                                    styles.input,
                                    dark && styles.darkInput,
                                    dark && styles.lightText,
                                    effectivePricing.inheritsPromoPrice && styles.inheritedInput,
                                  ]}
                                  accessibilityLabel="Desconto fixo em reais da variação"
                                />
                              </View>
                              <View style={styles.flex1}>
                                <Text style={[styles.label, dark && styles.dimText]}>
                                  Preço Promocional
                                </Text>
                                <FormTextInput
                                  value={String(
                                    effectivePricing.promoPrice ?? ''
                                  )}
                                  onChangeText={(val) => updateVariationPricing(idx, 'promoPrice', val)}
                                  editable={v.syncPromoPrice === false}
                                  keyboardType="numeric"
                                  placeholder="Sem desconto"
                                  style={[
                                    styles.input,
                                    dark && styles.darkInput,
                                    dark && styles.lightText,
                                    effectivePricing.inheritsPromoPrice && styles.inheritedInput,
                                  ]}
                                  accessibilityLabel="Preço promocional da variação"
                                />
                              </View>
                            </View>
                          </View>
                        )}
                        </View>
                      </ScrollView>
                        {showInheritedDataNotice && (
                          <View style={styles.singleVariationNoticeOverlay} pointerEvents="box-none">
                            <View style={[styles.singleVariationNoticeCard, dark && styles.darkCard]}>
                              <Info size={28} color="#2563eb" style={{ marginBottom: 10, alignSelf: 'center' }} />
                              <Text style={[styles.singleVariationNoticeText, dark && styles.lightText]}>
                                Esta variação única herda os dados do produto principal. A galeria de Fotos vinculadas é apenas para consulta; edite os dados nas abas correspondentes do produto.
                              </Text>
                              <Text style={[styles.singleVariationNoticeSubtext, dark && styles.dimText]}>
                                Para editar as demais informações, atualize o produto principal ou adicione outra variação.
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                      <View style={[styles.variationModalFooter, dark && styles.darkModalFooter]}>
                        <TouchableOpacity
                          onPress={() => setExpanded(null)}
                          style={styles.completeVariationButton}
                          accessibilityRole="button"
                          accessibilityLabel="Concluir edição da variação"
                        >
                          <Check size={16} color="#ffffff" />
                          <Text style={styles.completeVariationButtonText}>Concluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                )}
              </View>
            );
          })
      )}
      <ProductVariationGenerationModal
        visible={isGenerationModalOpen}
        dark={dark}
        onClose={() => setIsGenerationModalOpen(false)}
        onGenerate={handleGenerateVariations}
      />
    </View>
  );
};
