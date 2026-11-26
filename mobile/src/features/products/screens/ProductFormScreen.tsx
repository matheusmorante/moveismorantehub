import { useZodForm } from '../../../hooks/useZodForm';
import { createMobileProductFormSchema } from '../../../../../shared-utils/mobileProductFormSchema';
import { type MobileProductSaveAcknowledgement } from '../../../../../shared-utils/mobileProductSaveAcknowledgement';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './productFormScreen.styles';
import { useProductFormPermissions } from '../hooks/useProductFormPermissions';
import { useMobileProductJevClassification } from '../hooks/useMobileProductJevClassification';
import {
  applyInitialMobileProductCode,
  hydrateExistingMobileProductFormData,
} from '../domain/mobileProductFormHydration';
import { isMobileProductDescriptionTabDisabled } from '../domain/mobileProductFormErrorNavigation';
import {
  getMobileProductReadiness,
  isMobileSalvadoProduct,
} from '../domain/productRegistrationRules';
import {
  createMobileProductDraftSaveQueue,
  type MobileProductDraftSaveEntry,
} from '../domain/mobileProductDraftSaveQueue';
import { syncMobileVariationsWithParent } from '../domain/productVariationParentSync';
import { resolveMobileProductFinalPurchasePrice } from '../domain/productPurchasePrice';
import { ProductFormReadinessChecklist } from './ProductFormReadinessChecklist';
import { ProductFormHeader } from './ProductFormHeader';
import { buildMobileProductFormReadinessItems } from './productFormReadinessItems';
import { ProductFormTabNavigation } from './ProductFormTabNavigation';
import { ProductFormStepFooter } from './ProductFormStepFooter';
import { ProductFormTabContent } from './ProductFormTabContent';
import { useProductFormValidationFeedback } from './useProductFormValidationFeedback';
import { useProductFormSwipeNavigation } from './useProductFormSwipeNavigation';
import {
  createMobileProductOperationUuid,
  useMobileProductDraftAutoSave,
} from './useMobileProductDraftAutoSave';
import { useMobileProductSubmitFlow } from './useMobileProductSubmitFlow';
import { TABS, type TabId } from './productFormTabs';
import { INITIAL_FORM } from './productFormInitialState';
import { getNextSequentialProductCode } from '../services/products/mobileProductCodeService';
import { fetchMobileProductFiscalDefaults } from '../services/mobileProductFiscalService';

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  product?: any | null;
  initialData?: Record<string, any>;
  showInboundCostPrice?: boolean;
  inboundVariationCostPrice?: number;
  enableDraftAutoSave?: boolean;
  dark: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<string | void>;
  onAutoSave?: (data: any) => Promise<MobileProductSaveAcknowledgement>;
}

// ─── Componente ──────────────────────────────────────────────────────────────
export const ProductFormScreen: React.FC<Props> = ({
  visible,
  product,
  initialData,
  showInboundCostPrice = false,
  inboundVariationCostPrice,
  enableDraftAutoSave = true,
  dark,
  onClose,
  onSave,
  onAutoSave,
}) => {
  const {
    isStockistOnly,
    canConfigureProductTaxes,
    canManageCategories,
    hideCatalogPublicationStatus,
  } = useProductFormPermissions();
  const [activeTab, setActiveTab] = useState<TabId>('geral');
  const [openReadiness, setOpenReadiness] = useState<'erp' | 'catalog' | null>(null);
  const [formData, setFormDataRaw] = useState<any>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveError, setAutoSaveError] = useState('');
  const {
    nameError,
    setNameError,
    categoryError,
    setCategoryError,
    costPriceError,
    setCostPriceError,
    unitPriceError,
    setUnitPriceError,
    supplierError,
    setSupplierError,
    descriptionTechnicalValidationError,
    setDescriptionTechnicalValidationError,
    variationValidationTarget,
    ncmError,
    clearVariationValidationTarget,
    resetFieldValidationErrors,
    presentValidationErrors,
  } = useProductFormValidationFeedback({ setActiveTab, setAutoSaveError });
  const tabScrollRef = useRef<ScrollView>(null);
  const dirtyRef = useRef(false);
  const saveOperationIdRef = useRef<string | null>(null);
  const saveRequestedAtRef = useRef<string | null>(null);
  const clientProductIdRef = useRef<string | null>(null);
  const clientProductCodeRef = useRef<string | null>(null);
  const serverProductIdRef = useRef<string | null>(null);
  const serverProductVersionRef = useRef<string | null>(null);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  const formRevisionRef = useRef(0);
  const persistedRevisionRef = useRef(0);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSavePausedRef = useRef(false);
  const autoSaveRunnerRef = useRef<
    (entry: MobileProductDraftSaveEntry<any>) => Promise<boolean>
  >(async () => false);
  const autoSaveQueueRef = useRef<ReturnType<typeof createMobileProductDraftSaveQueue<any>> | null>(null);
  const unconfirmedAutoSaveRef = useRef<{
    entry: MobileProductDraftSaveEntry<any>;
    payload: any;
  } | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setOpenReadiness(null);
    resetFieldValidationErrors();
  }, [visible, product?.id, resetFieldValidationErrors]);

  const categoryIds: string[] =
    Array.isArray(formData.categoryIds) && formData.categoryIds.length
      ? formData.categoryIds
      : formData.categoryId
        ? [formData.categoryId]
        : [];
  const hasCategory = categoryIds.length > 0;
  const hasProductName = String(formData.name || '').trim().length >= 2;

  const isTabDisabled = (tabId: TabId) => {
    if (tabId === 'technical') return !hasCategory;
    if (tabId === 'description')
      return isMobileProductDescriptionTabDisabled({
        hasCategory,
        hasProductName,
        hasTechnicalValidationError: descriptionTechnicalValidationError,
      });
    return false;
  };

  const visibleTabs = TABS.filter(
    (tab) => !tab.condition || tab.condition(formData, isStockistOnly)
  );
  const enabledTabs = visibleTabs.filter((tab) => !isTabDisabled(tab.id));

  useEffect(() => {
    if (isTabDisabled(activeTab)) setActiveTab('geral');
    else if (!visibleTabs.some((tab) => tab.id === activeTab)) setActiveTab('geral');
  }, [
    activeTab,
    formData.itemType,
    hasCategory,
    hasProductName,
    descriptionTechnicalValidationError,
    isStockistOnly,
  ]);

  // Wrapper estável para setFormData (aceita função ou objeto)
  const setFormData = useCallback((fn: any) => {
    dirtyRef.current = true;
    saveOperationIdRef.current = null;
    saveRequestedAtRef.current = null;
    formRevisionRef.current += 1;
    setAutoSaveStatus('idle');
    setAutoSaveError('');
    setFormDataRaw((prev: any) => {
      const next = typeof fn === 'function' ? fn(prev) : { ...prev, ...fn };
      const variations = syncMobileVariationsWithParent(next.variations, next, prev);
      return variations === next.variations ? next : { ...next, variations };
    });
  }, []);

  const handleCategoryNamesResolved = useCallback((resolvedIds: string[], names: string[]) => {
    setFormDataRaw((previous: any) => {
      const previousIds: string[] =
        Array.isArray(previous.categoryIds) && previous.categoryIds.length > 0
          ? previous.categoryIds
          : previous.categoryId
            ? [previous.categoryId]
            : [];
      if (previousIds.join('|') !== resolvedIds.join('|')) return previous;
      const previousNames = Array.isArray(previous.categoryNames) ? previous.categoryNames : [];
      if (previousNames.join('|') === names.join('|')) return previous;
      return { ...previous, categoryNames: names };
    });
  }, []);

  const jev = useMobileProductJevClassification(formData, setFormData, visible);

  // Preenche o formulário ao abrir (edição) ou limpa (criação)
  useEffect(() => {
    if (!visible) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;
    autoSaveQueueRef.current?.clearQueued();
    unconfirmedAutoSaveRef.current = null;
    formRevisionRef.current = 0;
    persistedRevisionRef.current = 0;
    autoSavePausedRef.current = false;
    setAutoSaveStatus('idle');
    setAutoSaveError('');
    saveOperationIdRef.current = null;
    saveRequestedAtRef.current = null;
    clientProductIdRef.current = product?.id ? null : createMobileProductOperationUuid();
    serverProductIdRef.current = product?.id ? String(product.id) : null;
    serverProductVersionRef.current = product?.updated_at || product?.updatedAt || null;
    clientProductCodeRef.current = null;
    dirtyRef.current = false;
    if (product) {
      setFormDataRaw(hydrateExistingMobileProductFormData(product));
    } else {
      const initialFormData = {
        ...INITIAL_FORM,
        ...(product && !product.id ? product : {}),
        ...(initialData || {}),
      };
      initialFormData.finalPurchasePrice = resolveMobileProductFinalPurchasePrice(initialFormData);
      initialFormData.variations = syncMobileVariationsWithParent(
        initialFormData.variations,
        initialFormData
      );
      setFormDataRaw(initialFormData);
      void (async () => {
        try {
          const defaults = await fetchMobileProductFiscalDefaults();
          setFormDataRaw((prev: any) =>
            Object.keys(prev.fiscal || {}).length > 0
              ? prev
              : {
                  ...prev,
                  fiscal: {
                    ncm: defaults?.ncm || '',
                    cest: defaults?.cest || '',
                    cst: prev.itemType === 'service' ? defaults?.cst || '103' : '103',
                    cfop: prev.itemType === 'service' ? '5933' : defaults?.cfop || '5102',
                    origem: defaults?.origem || '0',
                    icmsPercent: defaults?.icmsPercent ?? 0,
                    pisCst: defaults?.pisCst || '99',
                    cofinsCst: defaults?.cofinsCst || '99',
                  },
                }
          );
        } catch (error) {
          console.warn('[ProductFormScreen] Não foi possível carregar padrões fiscais:', error);
        }
      })();
      getNextSequentialProductCode()
        .then((nextCode) => {
          setFormDataRaw((prev: any) => {
            const productCode = String(prev.code || nextCode);
            clientProductCodeRef.current = productCode;
            return applyInitialMobileProductCode(prev, productCode);
          });
        })
        .catch((err) => {
          console.warn('[ProductFormScreen] Erro ao obter próximo código:', err);
        });
    }
    setActiveTab(product?.selectedVariationId ? 'variacoes' : 'geral');
  }, [visible, product, initialData]);

  const existingProductImageCount = Array.isArray(product?.images) ? product.images.length : 0;
  const draftForm = useZodForm(createMobileProductFormSchema({
    draft: true,
    isStockistOnly,
    published: false,
    existingProductImageCount,
    requireInboundCostPrice: showInboundCostPrice,
  }), formData);
  const finalForm = useZodForm(createMobileProductFormSchema({
    draft: false,
    isStockistOnly,
    published: false,
    existingProductImageCount,
    requireInboundCostPrice: showInboundCostPrice,
  }), formData);

  const {
    canAutoSaveDraft,
    prepareSavePayload,
    flushDraftAutoSave,
    handleRequestClose,
  } = useMobileProductDraftAutoSave({
    visible,
    saving,
    product,
    formData,
    setFormDataRaw,
    enableDraftAutoSave,
    onAutoSave,
    onClose,
    autoSaveError,
    setAutoSaveStatus,
    setAutoSaveError,
    draftFormEnqueueAndRun: draftForm.enqueueAndRun,
    presentValidationErrors,
    dirtyRef,
    saveOperationIdRef,
    saveRequestedAtRef,
    clientProductIdRef,
    clientProductCodeRef,
    serverProductIdRef,
    serverProductVersionRef,
    formDataRef,
    formRevisionRef,
    persistedRevisionRef,
    autoSaveTimerRef,
    autoSavePausedRef,
    autoSaveRunnerRef,
    autoSaveQueueRef,
    unconfirmedAutoSaveRef,
  });

  const { handleSubmit } = useMobileProductSubmitFlow({
    saving,
    setSaving,
    product,
    inboundVariationCostPrice,
    draftFormValidateAndRun: draftForm.validateAndRun,
    finalFormValidateAndRun: finalForm.validateAndRun,
    canAutoSaveDraft,
    flushDraftAutoSave,
    prepareSavePayload,
    presentValidationErrors,
    onSave,
    onClose,
    setNameError,
    setCategoryError,
    setCostPriceError,
    setUnitPriceError,
    setSupplierError,
    setDescriptionTechnicalValidationError,
    setAutoSaveStatus,
    setAutoSaveError,
    saveOperationIdRef,
    saveRequestedAtRef,
    serverProductIdRef,
    dirtyRef,
    formDataRef,
    formRevisionRef,
    persistedRevisionRef,
    autoSavePausedRef,
    unconfirmedAutoSaveRef,
  });

  const handleTabChange = (tabId: TabId) => {
    if (isTabDisabled(tabId)) return;
    setActiveTab(tabId);
    const idx = visibleTabs.findIndex((t) => t.id === tabId);
    if (idx >= 0) {
      tabScrollRef.current?.scrollTo({ x: idx * 90, animated: true });
    }
  };

  const { handleTouchStart, handleTouchEnd } = useProductFormSwipeNavigation({
    activeTab,
    enabledTabs,
    onTabChange: handleTabChange,
  });

  const activeStepIndex = enabledTabs.findIndex((tab) => tab.id === activeTab);
  const isLastStep = activeStepIndex < 0 || activeStepIndex === enabledTabs.length - 1;
  const isDraftProduct =
    !product?.id ||
    Boolean(
      formData.isDraft || product?.is_draft || product?.isDraft || product?.status === 'draft'
    );
  const handleNextStep = () => {
    const nextTab = enabledTabs[activeStepIndex + 1];
    if (nextTab) handleTabChange(nextTab.id);
  };

  const varCount = Array.isArray(formData.variations) ? formData.variations.length : 0;
  const photoCount = Array.isArray(formData.images) ? formData.images.length : 0;
  const readiness = getMobileProductReadiness(formData);
  const erpReady = readiness.erp.isLegible;
  const isSalvado = isMobileSalvadoProduct(formData);
  const catalogPublished = formData.status === 'published';
  const isService = formData.itemType === 'service' || formData.item_type === 'service';
  const isOwnProduction =
    formData.merchandiseOrigin === 'own_production' ||
    formData.isOwnProduction === true ||
    formData.fiscal?.merchandiseOrigin === 'own_production';
  const { erpReadinessItems, catalogReadinessItems } =
    buildMobileProductFormReadinessItems({ readiness, isOwnProduction, isService });
  const activeReadiness =
    openReadiness === 'erp' && !isSalvado
      ? 'erp'
      : openReadiness === 'catalog' && !hideCatalogPublicationStatus
        ? 'catalog'
        : null;
  const activeReadinessItems =
    activeReadiness === 'erp' ? erpReadinessItems : catalogReadinessItems;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleRequestClose}
    >
      <View
        style={[
          styles.safeArea,
          dark && styles.darkBg,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ProductFormHeader
            dark={dark}
            isExistingProduct={Boolean(product?.id)}
            productCode={formData.code}
            erpReady={erpReady}
            isSalvado={isSalvado}
            catalogPublished={catalogPublished}
            hideCatalogPublicationStatus={hideCatalogPublicationStatus}
            openReadiness={openReadiness}
            onRequestClose={handleRequestClose}
            onToggleReadiness={(readiness) =>
              setOpenReadiness(openReadiness === readiness ? null : readiness)
            }
          />

          {activeReadiness ? (
            <ProductFormReadinessChecklist
              activeReadiness={activeReadiness}
              items={activeReadinessItems}
              dark={dark}
              enabledTabs={enabledTabs}
              onClose={() => setOpenReadiness(null)}
              onSelectTab={(targetTab) => {
                setOpenReadiness(null);
                handleTabChange(targetTab);
              }}
            />
          ) : null}

          {/* ── Tabs Scrolláveis ── */}
          <View style={[styles.tabsContainer, dark && styles.darkTabsContainer]}>
            <ScrollView
              ref={tabScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
            >
              <ProductFormTabNavigation
                tabs={visibleTabs}
                activeTab={activeTab}
                isTabDisabled={isTabDisabled}
                onTabChange={handleTabChange}
                dark={dark}
                variationCount={varCount}
                photoCount={photoCount}
              />
            </ScrollView>
          </View>

          {/* ── Conteúdo da Aba ── */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <ProductFormTabContent
              activeTab={activeTab}
              formData={formData}
              setFormData={setFormData}
              product={product}
              dark={dark}
              isStockistOnly={isStockistOnly}
              canManageCategories={canManageCategories}
              canConfigureProductTaxes={canConfigureProductTaxes}
              showInboundCostPrice={showInboundCostPrice}
              nameError={nameError}
              setNameError={setNameError}
              categoryError={categoryError}
              setCategoryError={setCategoryError}
              costPriceError={costPriceError}
              setCostPriceError={setCostPriceError}
              unitPriceError={unitPriceError}
              setUnitPriceError={setUnitPriceError}
              supplierError={supplierError}
              setSupplierError={setSupplierError}
              ncmError={ncmError}
              variationValidationTarget={variationValidationTarget}
              clearVariationValidationTarget={clearVariationValidationTarget}
              handleCategoryNamesResolved={handleCategoryNamesResolved}
              jev={jev}
            />
          </ScrollView>

          {autoSaveStatus !== 'idle' && (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.autoSaveStatus,
                autoSaveStatus === 'error' && styles.autoSaveStatusError,
                dark && autoSaveStatus !== 'error' && styles.autoSaveStatusDark,
              ]}
            >
              {autoSaveStatus === 'saving'
                ? 'Salvando rascunho…'
                : autoSaveStatus === 'saved'
                  ? 'Rascunho salvo'
                  : autoSaveError || 'Não foi possível salvar o rascunho.'}
            </Text>
          )}

          <ProductFormStepFooter
            dark={dark}
            isDraftProduct={isDraftProduct}
            handleSubmit={handleSubmit}
            saving={saving}
            autoSaveStatus={autoSaveStatus}
            handleRequestClose={handleRequestClose}
            isLastStep={isLastStep}
            handleNextStep={handleNextStep}
            product={product}
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
