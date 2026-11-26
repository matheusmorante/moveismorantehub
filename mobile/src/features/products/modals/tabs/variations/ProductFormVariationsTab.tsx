import type React from 'react';
import { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Plus, Network, Sparkles } from 'lucide-react-native';
import { parseLocalizedNumber as parseLocalizedPrice } from '../../../domain/productNumbers';
import {
  deriveProductDiscountFields,
  toOptionalProductDiscountNumber,
} from '../../../../../../../shared-utils/productDiscountFields';
import { resolveProductVariationPricing } from '../../../../../../../shared-utils/productVariationPricing';
import { useMobileProductVariationUsage } from '../../../hooks/useMobileProductVariationUsage';
import { styles } from './productFormVariationsTab.styles';
import type { MobileProductFormErrorNavigation } from '../../../domain/mobileProductFormErrorNavigation';
import { generateMobileProductVariations } from '../../../domain/mobileProductVariationGeneration';
import { ProductVariationGenerationModal } from '../../managers/ProductVariationGenerationModal';
import { isSingleProductVariationFormMode } from '../../../../../../../shared-utils/productVariationMode';
import { getMobileProductVariationTabs, type VariationTabId } from './productVariationTabs';
import { ProductVariationSummaryCard } from './ProductVariationSummaryCard';
import type { VariationReadinessMode } from './ProductVariationEditorHeader';
import { ProductVariationEditModal } from './ProductVariationEditModal';
import { applyMobileVariationPricingFieldUpdate } from './productVariationPricingUpdates';
import {
  buildMobileVariationReadinessSummary,
  buildNewMobileProductVariation,
} from './mobileVariationTabHelpers';
import { useMobileVariationRemoval } from './useMobileVariationRemoval';

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
  const [openReadiness, setOpenReadiness] = useState<VariationReadinessMode | null>(null);
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);

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
  const { handleRemove } = useMobileVariationRemoval({
    variations,
    formData,
    isExistingProduct,
    expanded,
    setExpanded,
    setFormData,
  });

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
    const newVariation = buildNewMobileProductVariation(formData, variations);

    setFormData((prev) => {
      const isConvertingSimpleProduct =
        !prev.hasVariations && (prev.variations?.length || 0) <= 1;
      return {
        ...prev,
        hasVariations: true,
        variations: [...(prev.variations || []), newVariation],
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
    value: number | null
  ) => {
    setFormData((prev) => {
      const vars = [...(prev.variations || [])];
      vars[idx] = applyMobileVariationPricingFieldUpdate(vars[idx], prev, field, value);
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

  const variationTabs = getMobileProductVariationTabs(isComposition, isStockistOnly);

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
          const openVariation = () => {
            setOpenReadiness(null);
            setExpanded(idx);
            setActiveVariationTab('identificacao');
          };
          const { erpReady, readinessItems } = buildMobileVariationReadinessSummary({
            formData,
            variation: v,
            openReadiness,
          });
          const catalogPublished = formData.status === 'published';
          const derivedDiscount = deriveProductDiscountFields(regularPrice, promoPrice);
          const discountPercent = toOptionalProductDiscountNumber(derivedDiscount.discountPercent);
          const discountFixed = toOptionalProductDiscountNumber(derivedDiscount.discountFixed);
          return (
            <View
              key={v.id || v.sku || `${v.name || 'variacao'}-${idx}`}
              style={[styles.varItem, dark && styles.darkCard]}
            >
              <ProductVariationSummaryCard
                variation={v}
                variationCount={variations.length}
                shouldCheckVariationUsage={shouldCheckVariationUsage}
                variationUsage={variationUsageById[String(v.id || '')]}
                dark={dark}
                hasDiscount={hasDiscount}
                regularPrice={regularPrice}
                finalPrice={finalPrice}
                onOpen={openVariation}
                onRemove={() => handleRemove(idx)}
              />

              {/* Modal de edição da variação, equivalente ao ERP */}
              {isOpen && (
                <ProductVariationEditModal
                  visible={isOpen}
                  dark={dark}
                  variation={v}
                  variationIndex={idx}
                  formData={formData}
                  setFormData={setFormData}
                  variationFormData={variationFormData}
                  setVariationTechnicalData={setVariationTechnicalData}
                  isStockistOnly={isStockistOnly}
                  isComposition={isComposition}
                  isSingleVariation={isSingleVariation}
                  isSingleExistingVariation={isSingleExistingVariation}
                  showInheritedDataNotice={showInheritedDataNotice}
                  inheritedDataTabs={inheritedDataTabs}
                  variationTabs={variationTabs}
                  activeVariationTab={activeVariationTab}
                  setActiveVariationTab={setActiveVariationTab}
                  openReadiness={openReadiness}
                  setOpenReadiness={setOpenReadiness}
                  erpReady={erpReady}
                  readinessItems={readinessItems}
                  catalogPublished={catalogPublished}
                  effectivePricing={effectivePricing}
                  discountPercent={discountPercent}
                  discountFixed={discountFixed}
                  onClose={() => setExpanded(null)}
                  onUpdateField={updateVar}
                  onUpdateName={updateVarName}
                  onToggleDescription={toggleVariationDescription}
                  onUpdatePricing={updateVariationPricing}
                />
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
