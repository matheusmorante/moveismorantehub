import { useZodForm } from '../../../hooks/useZodForm';
import { createMobileProductFormSchema } from '../../../../../shared-utils/mobileProductFormSchema';
import {
  hasRequiredProductName,
} from '../../../../../shared-utils/productNameRequirement';
import {
  isVersionedProductSaveRpcUnavailable,
  type MobileProductSaveAcknowledgement,
} from '../../../../../shared-utils/mobileProductSaveAcknowledgement';
import { deriveProductDiscountFields } from '../../../../../shared-utils/productDiscountFields';
import { withOwnInboundVariationCost } from '../../../../../shared-utils/inboundQuickRegisterRules';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import {
  ChevronLeft,
  X,
} from 'lucide-react-native';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './productFormScreen.styles';
import { useProductFormPermissions } from '../hooks/useProductFormPermissions';
import { useMobileProductJevClassification } from '../hooks/useMobileProductJevClassification';
import {
  getMobileProductFormCompositionItems,
  synchronizeMobileProductFormCompositionItems,
} from '../domain/mobileProductCompositionItems';
import {
  initializeMobileProductCode,
  resolveMobileProductFormHasVariations,
} from '../domain/mobileProductVariationMode';
import { resolveMobileVariationImages } from '../domain/mobileVariationImages';
import {
  isMobileProductDescriptionTabDisabled,
} from '../domain/mobileProductFormErrorNavigation';
import {
  getPersistableProductTechnicalValues,
  getProductCharacteristicAttributes,
  getTechnicalValue,
  hasTechnicalValue,
  resolveMobileVariableTechnicalFieldNames,
} from '../domain/productCharacteristics';
import { parseLocalizedNumber as parseLocalizedPrice } from '../domain/productNumbers';
import {
  getMobileVariationRegistrationIssue,
  getMobileProductReadiness,
  isMobileSalvadoProduct,
  type MobileVariationRegistrationIssue,
} from '../domain/productRegistrationRules';
import {
  prepareMobileProductSaveState,
} from '../domain/productSaveState';
import { verifyAndConfirmMobilePublishedCatalogEdit } from '../domain/mobilePublishedCatalogConfirmation';
import {
  createMobileProductDraftSaveQueue,
  type MobileProductDraftSaveEntry,
} from '../domain/mobileProductDraftSaveQueue';
import { syncMobileVariationsWithParent } from '../domain/productVariationParentSync';
import { resolveMobileProductFinalPurchasePrice } from '../domain/productPurchasePrice';
import { createMobileProductVariationId } from '../domain/mobileProductVariationGeneration';
import { ProductFormBasicTab } from '../modals/tabs/ProductFormBasicTab';
import { ProductFormCompositionTab } from '../modals/tabs/ProductFormCompositionTab';
import { ProductFormDescriptionTab } from '../modals/tabs/ProductFormDescriptionTab';
import { ProductFormFiscalTab } from '../modals/tabs/ProductFormFiscalTab';
import { ProductFormPhotosTab } from '../modals/tabs/ProductFormPhotosTab';
import { ProductFormPricesTab } from '../modals/tabs/ProductFormPricesTab';
import { ProductFormTechnicalTab } from '../modals/tabs/ProductFormTechnicalTab';
import { ProductFormVariationsTab } from '../modals/tabs/ProductFormVariationsTab';
import {
  ProductFormReadinessChecklist,
  type ProductFormReadinessItem,
} from './ProductFormReadinessChecklist';
import { ProductFormTabNavigation } from './ProductFormTabNavigation';
import { ProductFormStepFooter } from './ProductFormStepFooter';
import { useProductFormValidationFeedback } from './useProductFormValidationFeedback';
import { TABS, type TabId } from './productFormTabs';
import { INITIAL_FORM } from './productFormInitialState';
import { getNextSequentialProductCode } from '../services/mobileProductCodeService';
import { fetchMobileProductFiscalDefaults } from '../services/mobileProductFiscalService';

const createUuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });

const isVersionedSaveAcknowledgement = (
  value: unknown
): value is MobileProductSaveAcknowledgement =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'productId' in value &&
      typeof value.productId === 'string' &&
      'updatedAt' in value &&
      typeof value.updatedAt === 'string' &&
      Number.isFinite(Date.parse(value.updatedAt))
  );

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
    clientProductIdRef.current = product?.id ? null : createUuid();
    serverProductIdRef.current = product?.id ? String(product.id) : null;
    serverProductVersionRef.current = product?.updated_at || product?.updatedAt || null;
    clientProductCodeRef.current = null;
    dirtyRef.current = false;
    if (product) {
      const productCategories = Array.isArray(product.product_categories)
        ? product.product_categories
            .map((relation: any) => relation.category_id || relation.categories?.id || relation.id)
            .filter(Boolean)
        : [];
      const rawVariations = Array.isArray(product.allVariations) ? product.allVariations : [];
      const hasVariations = resolveMobileProductFormHasVariations(product);
      const isComposition = (product.item_type || product.itemType) === 'composition';
      const technicalValues = getPersistableProductTechnicalValues(product);
      for (const [attribute, value] of [
        ['Altura', product.height],
        ['Largura', product.width],
        [
          product.depth_use_length || product.depthUseLength ? 'Comprimento' : 'Profundidade',
          product.depth,
        ],
        ['Peso', product.weight],
      ]) {
        if (
          value !== null &&
          value !== undefined &&
          String(value).trim() &&
          (!hasTechnicalValue(technicalValues, attribute) ||
            !String(getTechnicalValue(technicalValues, attribute) ?? '').trim())
        ) {
          technicalValues[attribute] = value;
        }
      }
      const comboItems = getMobileProductFormCompositionItems(
        product,
        isComposition && !hasVariations
      );
      const unitPrice = product.unitPrice ?? product.unit_price ?? '';
      const promoPrice = product.promoPrice ?? product.promo_price ?? '';
      const finalPurchasePrice = resolveMobileProductFinalPurchasePrice(product);
      const discountFields = deriveProductDiscountFields(
        parseLocalizedPrice(unitPrice),
        parseLocalizedPrice(promoPrice)
      );
      setFormDataRaw({
        ...INITIAL_FORM,
        ...product,
        id: product.id,
        name: product.name || '',
        slug: product.slug || '',
        title: product.title || product.marketplaceTitle || product.name || '',
        marketplaceTitle: product.marketplaceTitle || product.title || product.name || '',
        metaTitle: product.meta_title || product.metaTitle || '',
        metaDescription: product.meta_description || product.metaDescription || '',
        seoDescription: product.seo_description || product.seoDescription || '',
        code: product.code || '',
        itemType: product.item_type || product.itemType || 'product',
        environment: product.environment || '',
        includeEnvironment: product.include_environment !== false,
        includeBrand: product.include_brand !== false,
        titleOrder: Array.isArray(product.title_order)
          ? product.title_order
          : INITIAL_FORM.titleOrder,
        featured: Boolean(product.featured),
        productKind:
          product.product_kind ||
          product.productKind ||
          (product.condition === 'salvado' || product.is_salvado
            ? 'salvado'
            : product.condition === 'usado'
              ? 'usado'
              : 'normal'),
        condition: product.condition || (product.is_salvado ? 'salvado' : 'novo'),
        category: product.category || '',
        categoryId: product.category_id || product.categoryId || '',
        categoryIds:
          product.categoryIds ||
          (productCategories.length
            ? productCategories
            : product.category_id || product.categoryId
              ? [product.category_id || product.categoryId]
              : []),
        mainSupplierId: product.main_supplier_id || product.mainSupplierId || '',
        description: product.description || '',
        observations: product.observations || '',
        unitPrice,
        promoPrice,
        ...discountFields,
        costPrice: product.costPrice ?? product.cost_price ?? '',
        ipiPercent: product.ipi_percent ?? product.ipiPercent ?? '',
        freightType: product.freight_type || product.freightType || 'fixed',
        freightCost: product.freight_cost ?? product.freightCost ?? '',
        finalPurchasePrice,
        stock: product.stock ?? '',
        minStock: product.min_stock ?? product.minStock ?? '',
        width: product.width ?? '',
        height: product.height ?? '',
        depth: product.depth ?? '',
        weight: product.weight ?? '',
        images: Array.isArray(product.images) ? product.images : [],
        variations: syncMobileVariationsWithParent(
          rawVariations.map((variation: any) => ({
            ...variation,
            images: resolveMobileVariationImages(
              variation.image_url ?? variation.imageUrl,
              variation.images,
              hasVariations
            ),
            syncName: variation.syncName ?? variation.use_parent_name !== false,
            differentiateTitle: Boolean(
              variation.differentiateTitle ||
                (variation.title && variation.title !== variation.name) ||
                (variation.marketplaceTitle && variation.marketplaceTitle !== variation.name)
            ),
            attributes: (() => {
              const normalizedAttributes = getProductCharacteristicAttributes(variation.attributes);
              return normalizedAttributes.length
                ? normalizedAttributes
                : variation.attributes || {};
            })(),
            price: variation.price ?? variation.unit_price ?? '',
            costPrice: variation.costPrice ?? variation.cost_price ?? '',
            promoPrice: variation.promoPrice ?? variation.promo_price ?? '',
            syncUnitPrice: variation.syncUnitPrice ?? variation.use_parent_price !== false,
            syncPromoPrice: variation.syncPromoPrice ?? variation.use_parent_promo_price !== false,
            syncCostPrice:
              variation.syncCostPrice ?? variation.use_parent_cost_price !== false,
            syncDescription:
              variation.syncDescription ?? variation.use_parent_description !== false,
            syncCondition: variation.syncCondition ?? variation.use_parent_condition !== false,
            syncFiscal: variation.syncFiscal ?? variation.use_parent_fiscal !== false,
            syncIpi: variation.syncIpi ?? variation.use_parent_ipi !== false,
            syncFreight: variation.syncFreight ?? variation.use_parent_freight !== false,
            syncWidth: variation.syncWidth ?? variation.use_parent_dimensions !== false,
            syncHeight: variation.syncHeight ?? variation.use_parent_dimensions !== false,
            syncDepth: variation.syncDepth ?? variation.use_parent_dimensions !== false,
            syncWeight: variation.syncWeight ?? variation.use_parent_dimensions !== false,
            comboItems:
              typeof variation.combo_items === 'string'
                ? (() => {
                    try {
                      return JSON.parse(variation.combo_items);
                    } catch {
                      return [];
                    }
                  })()
                : variation.combo_items || variation.comboItems || [],
          })),
          product,
          product
        ),
        comboItems,
        hasVariations,
        active: product.active ?? true,
        isDraft: Boolean(product.is_draft || product.isDraft || product.status === 'draft'),
        status: product.status || (product.is_draft || product.isDraft ? 'draft' : 'hidden'),
        // Disponibilidade calculada de uma composição não é estoque inicial.
        initialStock: isComposition
          ? undefined
          : product.initial_stock ?? product.initialStock ?? product.stock ?? 0,
        unit: product.unit || 'UN',
        depthUseLength: product.depth_use_length ?? product.depthUseLength ?? false,
        technicalValues,
        ecommerceDescription: product.ecommerce_description || product.ecommerceDescription || '',
        whatsappDescription: product.whatsapp_description || product.whatsappDescription || '',
        fiscal: product.fiscal || {},
        variableTechnicalFields: resolveMobileVariableTechnicalFieldNames({
          ...product,
          variations: rawVariations,
        }),
      });
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
            const defaultVariation = {
              id: createMobileProductVariationId(),
              sku: `${productCode}-01`,
              name: prev.name || '',
              price: '',
              costPrice: '',
              stock: 0,
              attributes: [],
              images: [],
              comboItems: [],
              syncUnitPrice: true,
              syncPromoPrice: true,
              syncCostPrice: true,
              syncFiscal: true,
              syncCondition: true,
              syncDescription: true,
              syncIpi: true,
              syncFreight: true,
              syncWidth: true,
              syncHeight: true,
              syncDepth: true,
              syncWeight: true,
              active: false,
              status: 'hidden',
            };
            const variationFallback =
              prev.itemType === 'composition'
                ? defaultVariation
                : { ...defaultVariation, attributes: {} };
            const nextFormData = initializeMobileProductCode(
              prev,
              productCode,
              variationFallback
            );
            return {
              ...nextFormData,
              variations: syncMobileVariationsWithParent(
                nextFormData.variations,
                nextFormData,
                prev
              ),
            };
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

  const canAutoSaveDraft = useCallback(
    (snapshot: any) => {
      const isNewProduct = !product?.id;
      const isExistingDraft = Boolean(
        snapshot.isDraft ||
          product?.is_draft ||
          product?.isDraft ||
          product?.status === 'draft'
      );
      const enteredName = snapshot.name || snapshot.title || snapshot.marketplaceTitle;
      return (
        Boolean(onAutoSave) &&
        enableDraftAutoSave &&
        (isNewProduct || isExistingDraft) &&
        hasRequiredProductName(enteredName)
      );
    },
    [enableDraftAutoSave, onAutoSave, product]
  );

  const getSaveOperation = useCallback(() => {
    if (!saveOperationIdRef.current) {
      saveOperationIdRef.current = createUuid();
      saveRequestedAtRef.current = new Date().toISOString();
    }
    return {
      operationId: saveOperationIdRef.current,
      saveUpdatedAt: saveRequestedAtRef.current || new Date().toISOString(),
    };
  }, []);

  const prepareSavePayload = useCallback(
    async (validated: any, saveAsDraft: boolean) => {
      const operation = getSaveOperation();
      const productCode =
        String(validated.code || clientProductCodeRef.current || '').trim() ||
        (product?.id ? '' : await getNextSequentialProductCode());
      clientProductCodeRef.current = productCode;
      if (productCode && !validated.code) {
        setFormDataRaw((previous: any) => ({ ...previous, code: productCode }));
      }
      const isSalvado = validated.productKind === 'salvado' || validated.condition === 'salvado';
      const isUsado = validated.productKind === 'usado' || validated.condition === 'usado';
      const saveState = prepareMobileProductSaveState(product, validated, saveAsDraft);
      const productDataForSave = { ...validated };
      delete productDataForSave.categoryNames;
      const savedProductId = serverProductIdRef.current;
      const savedProductVersion = serverProductVersionRef.current;

      return {
        ...productDataForSave,
        ...(savedProductId
          ? {
              id: savedProductId,
              updated_at: savedProductVersion,
              updatedAt: savedProductVersion,
            }
          : {}),
        code: productCode,
        ...operation,
        clientProductId: savedProductId || product?.id || clientProductIdRef.current,
        productKind: isSalvado ? 'salvado' : isUsado ? 'usado' : 'normal',
        condition: isSalvado ? 'salvado' : isUsado ? 'usado' : 'novo',
        isDraft: saveState.isDraft,
        active: saveState.active,
        status: saveState.status,
        hasVariations:
          validated.itemType !== 'service' &&
          (Boolean(validated.hasVariations) ||
            (Array.isArray(validated.variations) && validated.variations.length > 1)),
        variations: saveState.variations,
      };
    },
    [getSaveOperation, product]
  );

  const runDraftAutoSave = useCallback(
    async (entry: MobileProductDraftSaveEntry<any>): Promise<boolean> => {
      setAutoSaveStatus('saving');
      setAutoSaveError('');
      const persistEntry = async (
        saveEntry: MobileProductDraftSaveEntry<any>,
        retryPayload?: any
      ) => {
        let attemptedPayload = retryPayload;
        const result = await draftForm.enqueueAndRun(
          {
            ...saveEntry.snapshot,
            isDraft: true,
            active: false,
            status: 'draft',
          },
          async (validated) => {
            const savePayload = retryPayload || await prepareSavePayload(validated, true);
            attemptedPayload = savePayload;
            let response: MobileProductSaveAcknowledgement;
            try {
              response = await onAutoSave!(savePayload);
              if (!isVersionedSaveAcknowledgement(response)) {
                throw new Error('O salvamento não retornou uma versão confirmada do rascunho.');
              }
            } catch (error: any) {
              if (
                attemptedPayload &&
                !isVersionedProductSaveRpcUnavailable(error) &&
                !unconfirmedAutoSaveRef.current
              ) {
                unconfirmedAutoSaveRef.current = { entry: saveEntry, payload: attemptedPayload };
              }
              throw error;
            }

            clientProductIdRef.current = response.productId;
            serverProductIdRef.current = response.productId;
            serverProductVersionRef.current = response.updatedAt;
            persistedRevisionRef.current = Math.max(
              persistedRevisionRef.current,
              saveEntry.revision
            );
            if (saveOperationIdRef.current === savePayload.operationId) {
              saveOperationIdRef.current = null;
              saveRequestedAtRef.current = null;
            }
            if (unconfirmedAutoSaveRef.current?.payload.operationId === savePayload.operationId) {
              unconfirmedAutoSaveRef.current = null;
            }
            if (formRevisionRef.current <= saveEntry.revision) dirtyRef.current = false;
            setFormDataRaw((previous: any) => ({
              ...previous,
              id: response.productId,
              updated_at: response.updatedAt,
              updatedAt: response.updatedAt,
              isDraft: true,
              active: false,
              status: 'draft',
            }));
            return true;
          },
          (errors) => presentValidationErrors(errors, true, false)
        );

        return result !== false;
      };

      try {
        const unresolved = unconfirmedAutoSaveRef.current;
        if (unresolved) {
          const recovered = await persistEntry(unresolved.entry, unresolved.payload);
          if (!recovered) {
            setAutoSaveStatus('error');
            return false;
          }
          if (entry.revision <= unresolved.entry.revision) {
            setAutoSaveStatus('saved');
            return true;
          }
        }

        if (!(await persistEntry(entry))) {
          setAutoSaveStatus('error');
          return false;
        }
        setAutoSaveStatus('saved');
        return true;
      } catch (error: any) {
        setAutoSaveStatus('error');
        setAutoSaveError(
          error?.message || 'Não foi possível confirmar o salvamento automático do rascunho.'
        );
        return false;
      }
    },
    [draftForm, onAutoSave, prepareSavePayload, presentValidationErrors]
  );
  autoSaveRunnerRef.current = runDraftAutoSave;
  if (!autoSaveQueueRef.current) {
    autoSaveQueueRef.current = createMobileProductDraftSaveQueue((entry) =>
      autoSaveRunnerRef.current(entry)
    );
  }

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;
    if (
      !visible ||
      saving ||
      autoSavePausedRef.current ||
      formRevisionRef.current <= persistedRevisionRef.current ||
      !canAutoSaveDraft(formData)
    ) {
      return;
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      const snapshot = formDataRef.current;
      const revision = formRevisionRef.current;
      if (
        revision > persistedRevisionRef.current &&
        canAutoSaveDraft(snapshot)
      ) {
        void autoSaveQueueRef.current
          ?.enqueue({ snapshot, revision })
          .catch((error: any) => {
            setAutoSaveStatus('error');
            setAutoSaveError(
              error?.message || 'Não foi possível salvar o rascunho automaticamente.'
            );
          });
      }
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    };
  }, [formData, visible, saving, canAutoSaveDraft]);

  const flushDraftAutoSave = useCallback(async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;

    while (formRevisionRef.current > persistedRevisionRef.current) {
      const snapshot = formDataRef.current;
      const revision = formRevisionRef.current;
      if (!canAutoSaveDraft(snapshot) || !autoSaveQueueRef.current) return false;
      const saved = await autoSaveQueueRef.current.enqueue({ snapshot, revision });
      if (!saved) return false;
    }

    return true;
  }, [canAutoSaveDraft]);

  const closeAfterDraftAutoSave = useCallback(async () => {
    const saved = await flushDraftAutoSave();
    if (saved && formRevisionRef.current <= persistedRevisionRef.current) {
      dirtyRef.current = false;
      onClose();
      return;
    }

    Alert.alert(
      'Rascunho não confirmado',
      autoSaveError || 'Não foi possível confirmar o salvamento. Tente novamente ou descarte as alterações.',
      [
        { text: 'Continuar editando', style: 'cancel' },
        { text: 'Tentar novamente', onPress: () => void closeAfterDraftAutoSave() },
        { text: 'Descartar', style: 'destructive', onPress: onClose },
      ]
    );
  }, [autoSaveError, flushDraftAutoSave, onClose]);

  const handleRequestClose = useCallback(() => {
    if (saving) return;
    if (!dirtyRef.current) {
      onClose();
      return;
    }
    const snapshot = formDataRef.current;
    if (
      !product?.id &&
      !serverProductIdRef.current &&
      !unconfirmedAutoSaveRef.current &&
      !hasRequiredProductName(snapshot.name || snapshot.title || snapshot.marketplaceTitle)
    ) {
      dirtyRef.current = false;
      onClose();
      return;
    }
    if (canAutoSaveDraft(snapshot)) {
      void closeAfterDraftAutoSave();
      return;
    }
    Alert.alert('Descartar alterações?', 'Existem alterações não salvas neste produto.', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: onClose },
    ]);
  }, [saving, product, canAutoSaveDraft, closeAfterDraftAutoSave, onClose]);

  const handleSubmit = useCallback(
    async (isDraft: boolean) => {
      if (saving) return;
      autoSavePausedRef.current = true;
      setSaving(true);
      try {
        const currentFormData = formDataRef.current;
        if (
          canAutoSaveDraft(currentFormData) &&
          formRevisionRef.current > persistedRevisionRef.current
        ) {
          const flushed = await flushDraftAutoSave();
          if (!flushed) {
            if (unconfirmedAutoSaveRef.current) {
              Alert.alert(
                'Rascunho ainda não confirmado',
                'A resposta do servidor foi incerta. Tente confirmar o mesmo rascunho antes de enviar outra gravação, ou descarte as alterações.'
              );
              return;
            }
            // A RPC versionada ausente é uma falha definitiva sem gravação; nesse
            // caso o botão manual ainda pode usar o contrato legado.
            saveOperationIdRef.current = null;
            saveRequestedAtRef.current = null;
          }
        }

        if (
          isDraft &&
          canAutoSaveDraft(formDataRef.current) &&
          serverProductIdRef.current &&
          formRevisionRef.current <= persistedRevisionRef.current
        ) {
          dirtyRef.current = false;
          onClose();
          return;
        }

        const existingVariationCount = Array.isArray(product?.allVariations)
          ? product.allVariations.length
          : Array.isArray(product?.product_variations)
            ? product.product_variations.length
            : Array.isArray(product?.variations)
              ? product.variations.length
              : 0;
        const currentData = formDataRef.current;
        const formDataToValidate =
          inboundVariationCostPrice !== undefined &&
          Array.isArray(currentData.variations) &&
          currentData.variations.length > existingVariationCount
            ? {
                ...currentData,
                variations: currentData.variations.map((variation: any, index: number) =>
                  index === currentData.variations.length - 1
                    ? withOwnInboundVariationCost(variation, inboundVariationCostPrice)
                    : variation
                ),
              }
            : currentData;

        setNameError(false);
        setCategoryError(false);
        setCostPriceError(false);
        setUnitPriceError(false);
        setSupplierError(false);
        await (isDraft ? draftForm : finalForm).validateAndRun(
          formDataToValidate,
          async (validated) => {
            setDescriptionTechnicalValidationError(false);
            let hideFromCatalog = false;
            const catalogCheck = await verifyAndConfirmMobilePublishedCatalogEdit(product, validated);
            if (!catalogCheck.shouldContinue) return;
            hideFromCatalog = catalogCheck.hideFromCatalog;

            const payload = await prepareSavePayload(validated, isDraft);
            if (hideFromCatalog && !isDraft) {
              payload.status = 'hidden';
              payload.variations = (payload.variations || []).map((variation: any) => ({
                ...variation,
                status: 'hidden',
              }));
            }
            await onSave(payload);
            saveOperationIdRef.current = null;
            saveRequestedAtRef.current = null;
            dirtyRef.current = false;
            persistedRevisionRef.current = formRevisionRef.current;
            setAutoSaveStatus(isDraft ? 'saved' : 'idle');
            setAutoSaveError('');
            onClose();
          },
          (errors) => presentValidationErrors(errors, isDraft, true)
        );
      } catch (error: any) {
        Alert.alert(
          'Erro ao Salvar',
          error?.message || 'Falha ao salvar o produto. Tente novamente.'
        );
      } finally {
        setSaving(false);
        autoSavePausedRef.current = false;
      }
    },
    [
      saving,
      canAutoSaveDraft,
      flushDraftAutoSave,
      autoSaveError,
      onClose,
      product,
      inboundVariationCostPrice,
      draftForm,
      finalForm,
      prepareSavePayload,
      presentValidationErrors,
      onSave,
    ]
  );

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
  };

  const handleTouchEnd = (e: any) => {
    const endX = e.nativeEvent.pageX;
    const endY = e.nativeEvent.pageY;
    const deltaX = endX - touchStartX.current;
    const deltaY = endY - touchStartY.current;

    // Se gesto for horizontal (deltaX > 60px) e pouco vertical (deltaY < 60px)
    if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 60) {
      const currentIdx = enabledTabs.findIndex((t) => t.id === activeTab);
      if (deltaX < 0) {
        // Deslizar para a esquerda -> Próxima aba
        if (currentIdx >= 0 && currentIdx < enabledTabs.length - 1) {
          handleTabChange(enabledTabs[currentIdx + 1].id);
        }
      } else {
        // Deslizar para a direita -> Aba anterior
        if (currentIdx > 0) {
          handleTabChange(enabledTabs[currentIdx - 1].id);
        }
      }
    }
  };

  const handleTabChange = (tabId: TabId) => {
    if (isTabDisabled(tabId)) return;
    setActiveTab(tabId);
    const idx = visibleTabs.findIndex((t) => t.id === tabId);
    if (idx >= 0) {
      tabScrollRef.current?.scrollTo({ x: idx * 90, animated: true });
    }
  };

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
  const erpReadinessItems: ProductFormReadinessItem[] = [
    {
      id: 'name',
      label: 'Nome do Produto (Mínimo 2 letras)',
      ready: readiness.erp.checks.description,
      tab: 'geral' as TabId,
    },
    {
      id: 'unitPrice',
      label: 'Preço de Venda > R$ 0 (ou Variações)',
      ready: readiness.erp.checks.unitPrice,
      tab: 'estoque' as TabId,
    },
    {
      id: 'categories',
      label: 'Pelo menos 1 Categoria',
      ready: readiness.erp.checks.categories,
      tab: 'geral' as TabId,
    },
    {
      id: 'supplier',
      label: isOwnProduction ? 'Fabricação Própria (Dispensado)' : 'Pelo menos 1 Fornecedor',
      ready: readiness.erp.checks.supplier,
      tab: 'estoque' as TabId,
    },
    {
      id: 'origin',
      label: 'Origem do Estoque Convencional',
      ready: readiness.erp.checks.origin,
      tab: 'geral' as TabId,
    },
    {
      id: 'variationPhotos',
      label: 'Fotos das Variações (mín. 1 vinculada por variação)',
      ready: readiness.variationPhotos,
      tab: 'variacoes' as TabId,
    },
  ];
  const catalogReadinessItems: ProductFormReadinessItem[] = [
    {
      id: 'marketplaceTitle',
      label: 'Nome do Produto',
      ready: readiness.catalog.checks.marketplaceTitle,
      tab: 'geral' as TabId,
    },
    {
      id: 'unitPrice',
      label: 'Preço de Venda > R$ 0',
      ready: readiness.catalog.checks.unitPrice,
      tab: 'estoque' as TabId,
    },
    {
      id: 'images',
      label: 'Pelo menos 1 Foto principal',
      ready: readiness.catalog.checks.images,
      tab: 'fotos' as TabId,
    },
    {
      id: 'categories',
      label: 'Pelo menos 1 Categoria',
      ready: readiness.catalog.checks.categories,
      tab: 'geral' as TabId,
    },
    ...(!isService
      ? [
          {
            id: 'dimensions',
            label: 'Ao menos uma dimensão ativa; todas as ativas > 0',
            ready: readiness.catalog.checks.dimensions,
          },
        ]
      : []),
  ];
  const activeReadiness =
    openReadiness === 'erp' && !isSalvado
      ? 'erp'
      : openReadiness === 'catalog' && !hideCatalogPublicationStatus
        ? 'catalog'
        : null;
  const activeReadinessItems =
    activeReadiness === 'erp' ? erpReadinessItems : catalogReadinessItems;
  const renderTab = () => {
    switch (activeTab) {
      case 'geral':
        return (
          <ProductFormBasicTab
            formData={formData}
            setFormData={setFormData}
            dark={dark}
            isExistingProduct={Boolean(product?.id)}
            isStockistOnly={isStockistOnly}
            canManageCategories={canManageCategories}
            nameError={nameError}
            onNameValidationCleared={() => setNameError(false)}
            categoryError={categoryError}
            onCategoryValidationCleared={() => setCategoryError(false)}
            onCategoryNamesResolved={handleCategoryNamesResolved}
            onFieldFocus={jev.onFieldFocus}
            onFieldBlur={jev.onFieldBlur}
          />
        );
      case 'fotos':
        return isStockistOnly ? null : (
          <ProductFormPhotosTab formData={formData} setFormData={setFormData} dark={dark} />
        );
      case 'technical':
        return (
          <ProductFormTechnicalTab
            formData={formData}
            setFormData={setFormData}
            dark={dark}
            requiredFieldsOnly={isStockistOnly}
          />
        );
      case 'description':
        return isStockistOnly ? null : (
          <ProductFormDescriptionTab
            formData={formData}
            setFormData={setFormData}
            dark={dark}
            onFieldFocus={jev.onFieldFocus}
            onFieldBlur={jev.onFieldBlur}
          />
        );
      case 'estoque':
        return (
          <ProductFormPricesTab
            formData={formData}
            setFormData={setFormData}
            dark={dark}
            showInboundCostPrice={showInboundCostPrice}
            costPriceError={costPriceError}
            onCostPriceValidationCleared={() => setCostPriceError(false)}
            unitPriceError={unitPriceError}
            onUnitPriceValidationCleared={() => setUnitPriceError(false)}
            supplierError={supplierError}
            onSupplierValidationCleared={() => setSupplierError(false)}
          />
        );
      case 'variacoes':
        return (
          <ProductFormVariationsTab
            formData={formData}
            setFormData={setFormData}
            dark={dark}
            isExistingProduct={Boolean(product?.id)}
            isStockistOnly={isStockistOnly}
            selectedVariationId={product?.selectedVariationId}
            validationTarget={variationValidationTarget}
            onValidationTargetHandled={clearVariationValidationTarget}
          />
        );
      case 'composicao':
        return (
          <ProductFormCompositionTab
            formData={formData}
            setFormData={(update) => setFormData((previous: any) => {
              const next = update(previous);
              return synchronizeMobileProductFormCompositionItems(
                next,
                Array.isArray(next.comboItems) ? next.comboItems : []
              );
            })}
            dark={dark}
            supplierId={formData.mainSupplierId || formData.supplierId}
          />
        );
      case 'fiscal':
        return (
          <ProductFormFiscalTab
            formData={formData}
            setFormData={setFormData}
            dark={dark}
            canConfigureProductTaxes={canConfigureProductTaxes}
            isStockistOnly={isStockistOnly}
            hasNcmError={ncmError}
            ncmSuggestion={jev.suggestion}
            isClassifyingNcm={jev.isClassifying}
            onAcceptNcmSuggestion={jev.acceptSuggestion}
            onRejectNcmSuggestion={jev.rejectSuggestion}
          />
        );
    }
  };

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
          {/* ── Header ── */}
          <View style={[styles.header, dark && styles.darkHeader]}>
            <TouchableOpacity
              onPress={handleRequestClose}
              style={[styles.backBtn, dark && styles.darkBtn]}
              accessibilityRole="button"
              accessibilityLabel="Voltar ou fechar formulário de produto"
            >
              <ChevronLeft size={20} color={dark ? '#94a3b8' : '#475569'} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, dark && styles.lightText]} numberOfLines={1}>
                {product?.id ? 'Editar Produto' : 'Cadastro de Produto'}
              </Text>
              <View style={styles.headerMeta}>
                {formData.code ? <Text style={styles.headerCode}>{formData.code}</Text> : null}
              {!isSalvado && (
                <TouchableOpacity
                  onPress={() => setOpenReadiness(openReadiness === 'erp' ? null : 'erp')}
                  style={[
                    styles.statusBadge,
                    erpReady ? styles.erpStatusReady : styles.erpStatusPending,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`ERP: ${erpReady ? 'Ativo' : 'Pendente'}, abrir requisitos`}
                  accessibilityState={{ expanded: openReadiness === 'erp' }}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      erpReady ? styles.erpStatusTextReady : styles.erpStatusTextPending,
                    ]}
                  >
                    ERP: {erpReady ? 'Ativo' : 'Pendente'}
                  </Text>
                </TouchableOpacity>
              )}
                {!hideCatalogPublicationStatus && (
                  <TouchableOpacity
                    onPress={() => setOpenReadiness(openReadiness === 'catalog' ? null : 'catalog')}
                    style={[
                      styles.statusBadge,
                      catalogPublished ? styles.catalogStatusPublished : styles.catalogStatusHidden,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Catálogo: ${catalogPublished ? 'Publicado' : 'Ocultado'}, abrir requisitos`}
                    accessibilityState={{ expanded: openReadiness === 'catalog' }}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        catalogPublished
                          ? styles.catalogStatusTextPublished
                          : styles.catalogStatusTextHidden,
                      ]}
                    >
                      CATÁLOGO: {catalogPublished ? 'Publicado' : 'Ocultado'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {!product?.id && (
              <TouchableOpacity
                onPress={handleRequestClose}
                style={[styles.closeBtn, dark && styles.darkBtn]}
                accessibilityRole="button"
                accessibilityLabel="Fechar formulário de produto"
              >
                <X size={18} color={dark ? '#94a3b8' : '#475569'} />
              </TouchableOpacity>
            )}
          </View>

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
            {renderTab()}
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
