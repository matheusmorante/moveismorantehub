import type React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Check, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseLocalizedNumber as parseLocalizedPrice } from '../../../domain/productNumbers';
import { ProductFormTechnicalTab } from '../ProductFormTechnicalTab';
import { ProductVariationIdentificationTab } from './ProductVariationIdentificationTab';
import { ProductVariationReadinessPanel } from './ProductVariationReadinessPanel';
import { ProductVariationPricingPanel } from './ProductVariationPricingPanel';
import { ProductVariationPhotosEditor } from '../../components/ProductVariationPhotosEditor';
import { ProductFormCompositionTab } from '../ProductFormCompositionTab';
import { ProductVariationDescriptionTab } from './ProductVariationDescriptionTab';
import {
  ProductVariationEditorHeader,
  type VariationReadinessMode,
} from './ProductVariationEditorHeader';
import type { EffectiveProductVariationPricing } from '../../../../../../../shared-utils/productVariationPricing';
import type { VariationTab, VariationTabId } from './productVariationTabs';
import { replaceMobileProductImageGlobally } from '../../../domain/mobileProductImageOrdering';
import { styles } from './productFormVariationsTab.styles';

interface ProductVariationEditModalProps {
  visible: boolean;
  dark: boolean;
  variation: any;
  variationIndex: number;
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  variationFormData: any;
  setVariationTechnicalData: (updater: (previous: any) => any) => void;
  isStockistOnly: boolean;
  isComposition: boolean;
  isSingleVariation: boolean;
  isSingleExistingVariation: boolean;
  showInheritedDataNotice: boolean;
  inheritedDataTabs: readonly VariationTabId[];
  variationTabs: VariationTab[];
  activeVariationTab: VariationTabId;
  setActiveVariationTab: (tab: VariationTabId) => void;
  openReadiness: VariationReadinessMode | null;
  setOpenReadiness: React.Dispatch<React.SetStateAction<VariationReadinessMode | null>>;
  erpReady: boolean;
  readinessItems: Array<{ label: string; complete: boolean }>;
  catalogPublished: boolean;
  effectivePricing: EffectiveProductVariationPricing;
  discountPercent: number | null;
  discountFixed: number | null;
  onClose: () => void;
  onUpdateField: (idx: number, field: string, val: any) => void;
  onUpdateName: (idx: number, name: string) => void;
  onToggleDescription: (idx: number) => void;
  onUpdatePricing: (
    idx: number,
    field: 'price' | 'discountPercent' | 'discountFixed' | 'promoPrice',
    value: number | null
  ) => void;
}

/** Modal em tela cheia para edição detalhada de uma variação de produto no aplicativo mobile. */
export const ProductVariationEditModal: React.FC<ProductVariationEditModalProps> = ({
  visible,
  dark,
  variation,
  variationIndex,
  formData,
  setFormData,
  variationFormData,
  setVariationTechnicalData,
  isStockistOnly,
  isComposition,
  isSingleVariation,
  isSingleExistingVariation,
  showInheritedDataNotice,
  inheritedDataTabs,
  variationTabs,
  activeVariationTab,
  setActiveVariationTab,
  openReadiness,
  setOpenReadiness,
  erpReady,
  readinessItems,
  catalogPublished,
  effectivePricing,
  discountPercent,
  discountFixed,
  onClose,
  onUpdateField,
  onUpdateName,
  onToggleDescription,
  onUpdatePricing,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.variationModalRoot,
          dark && styles.darkModalRoot,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <ProductVariationEditorHeader
          dark={dark}
          parentName={formData.name || formData.description || 'Produto pai'}
          onClose={onClose}
          erpReady={erpReady}
          catalogPublished={catalogPublished}
          isStockistOnly={isStockistOnly}
          openReadiness={openReadiness}
          setOpenReadiness={setOpenReadiness}
          tabs={variationTabs}
          activeTab={activeVariationTab}
          isInheritedDataTab={(id) =>
            isSingleExistingVariation &&
            inheritedDataTabs.includes(id) &&
            !(isComposition && id === 'compostos')
          }
          onTabChange={setActiveVariationTab}
        />
        <View style={{ flex: 1, position: 'relative' }}>
          <ScrollView
            style={styles.variationModalBody}
            contentContainerStyle={styles.variationModalBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {openReadiness && (openReadiness === 'erp' || !isStockistOnly) && (
              <ProductVariationReadinessPanel
                mode={openReadiness}
                readinessItems={readinessItems}
                dark={dark}
              />
            )}
            <View
              style={showInheritedDataNotice ? styles.inheritedNoticeDisabledContent : null}
              pointerEvents={showInheritedDataNotice ? 'none' : 'auto'}
            >
              {activeVariationTab === 'identificacao' && (
                <ProductVariationIdentificationTab
                  variation={variation}
                  parentPrefix={String(
                    formData.name || formData.description || 'Produto'
                  ).trim()}
                  dark={dark}
                  onDifferentTitleModeChange={(enabled) => {
                    onUpdateField(variationIndex, 'differentiateTitle', enabled);
                    onUpdateField(variationIndex, 'title', enabled ? '' : variation.name);
                    onUpdateField(variationIndex, 'marketplaceTitle', enabled ? '' : variation.name);
                  }}
                  onVariationNameChange={(name) => onUpdateName(variationIndex, name)}
                  onCatalogTitleChange={(title) => {
                    onUpdateField(variationIndex, 'title', title);
                    onUpdateField(variationIndex, 'marketplaceTitle', title);
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
                <ProductVariationDescriptionTab
                  dark={dark}
                  syncWithParent={variation.syncDescription !== false}
                  parentDescription={String(
                    formData.description || 'O produto pai ainda não tem descrição.'
                  )}
                  description={String(variation.description || '')}
                  onToggleSync={() => onToggleDescription(variationIndex)}
                  onDescriptionChange={(value) =>
                    onUpdateField(variationIndex, 'description', value)
                  }
                />
              )}

              {!isStockistOnly && activeVariationTab === 'fotos' && (
                <ProductVariationPhotosEditor
                  images={Array.isArray(variation.images) ? variation.images : []}
                  parentImages={Array.isArray(formData.images) ? formData.images : []}
                  onChangeImages={(images) => onUpdateField(variationIndex, 'images', images)}
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
                <ProductVariationPricingPanel
                  variation={variation}
                  effectivePricing={effectivePricing}
                  discountPercent={discountPercent}
                  discountFixed={discountFixed}
                  dark={dark}
                  isSingleVariation={isSingleVariation}
                  onToggleInheritance={() => {
                    const sync = !effectivePricing.inheritsUnitPrice;
                    setFormData((prev) => {
                      const vars = [...(prev.variations || [])];
                      vars[variationIndex] = {
                        ...vars[variationIndex],
                        syncUnitPrice: sync,
                        syncPromoPrice: sync,
                        ...(sync
                          ? {
                              price: parseLocalizedPrice(prev.unitPrice),
                              promoPrice: parseLocalizedPrice(prev.promoPrice) || undefined,
                            }
                          : {}),
                      };
                      return { ...prev, variations: vars };
                    });
                  }}
                  onChangePricing={(field, value) =>
                    onUpdatePricing(variationIndex, field, value)
                  }
                />
              )}
            </View>
          </ScrollView>
          {showInheritedDataNotice && (
            <View style={styles.singleVariationNoticeOverlay} pointerEvents="box-none">
              <View style={[styles.singleVariationNoticeCard, dark && styles.darkCard]}>
                <Info
                  size={28}
                  color="#2563eb"
                  style={{ marginBottom: 10, alignSelf: 'center' }}
                />
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
            onPress={onClose}
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
  );
};
