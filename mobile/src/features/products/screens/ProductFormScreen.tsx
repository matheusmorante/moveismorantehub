import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
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
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid3X3,
  Images,
  Info,
  Lock,
  Package,
  Receipt,
  Save,
  X,
} from 'lucide-react-native';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProductFormPermissions } from '../hooks/useProductFormPermissions';
import { useMobileProductJevClassification } from '../hooks/useMobileProductJevClassification';
import {
  getMobileProductFormCompositionItems,
  synchronizeMobileProductFormCompositionItems,
} from '../domain/mobileProductCompositionItems';
import {
  initializeMobileProductCode,
  resolveMobileProductFormHasVariations,
  shouldShowMobileProductCompositionTab,
  shouldShowMobileProductVariationsTab,
} from '../domain/mobileProductVariationMode';
import { resolveMobileVariationImages } from '../domain/mobileVariationImages';
import {
  isMobileProductNameError,
  isMobileProductCategoryError,
  isMobileProductCostPriceError,
  isMobileProductSupplierError,
  isMobileProductUnitPriceError,
  hasMobileProductDescriptionTechnicalValidationError,
  isMobileProductDescriptionTabDisabled,
  resolveMobileProductFormErrorNavigation,
  resolveMobileProductFormErrorMessage,
  resolveMobileProductReadinessTab,
  type MobileProductFormErrorNavigation,
  type MobileProductFormTabId,
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
  getMobilePublishedCatalogEditLegibility,
  isMobileSalvadoProduct,
  type MobileVariationRegistrationIssue,
} from '../domain/productRegistrationRules';
import {
  prepareMobileProductSaveState,
  shouldValidatePublishedCatalogEdit,
} from '../domain/productSaveState';
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
import { getNextSequentialProductCode } from '../services/mobileProductCodeService';
import { fetchMobileProductFiscalDefaults } from '../services/mobileProductFiscalService';
import { fetchMobileProductTechnicalFields } from '../services/mobileProductTechnicalService';

// ─── Tabs ────────────────────────────────────────────────────────────────────
type TabId = MobileProductFormTabId;

interface Tab {
  id: TabId;
  label: string;
  Icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  condition?: (formData: any, isStockistOnly: boolean) => boolean;
}

const TABS: Tab[] = [
  { id: 'geral', label: 'Informações Básicas' },
  {
    id: 'fotos',
    label: 'Fotos',
    Icon: Images,
    condition: (formData, isStockistOnly) => formData.itemType !== 'service' && !isStockistOnly,
  },
  {
    id: 'technical',
    label: 'Características',
    Icon: Info,
    condition: (formData, isStockistOnly) => formData.itemType !== 'service' && !isStockistOnly,
  },
  {
    id: 'description',
    label: 'Descrição',
    Icon: FileText,
    condition: (formData, isStockistOnly) => formData.itemType !== 'service' && !isStockistOnly,
  },
  {
    id: 'estoque',
    label: 'Estoque e Precificação',
    Icon: Package,
    condition: (formData) => formData.itemType !== 'service',
  },
  {
    id: 'variacoes',
    label: 'Variações',
    Icon: Grid3X3,
    condition: (formData) => shouldShowMobileProductVariationsTab(formData),
  },
  {
    id: 'composicao',
    label: 'Composição',
    Icon: Package,
    condition: (formData) => shouldShowMobileProductCompositionTab(formData),
  },
  {
    id: 'fiscal',
    label: 'Tributário / NF',
    Icon: Receipt,
    condition: (formData) => formData.itemType !== 'composition',
  },
];

// ─── Estado inicial ──────────────────────────────────────────────────────────
const INITIAL_FORM = {
  name: '',
  title: '',
  marketplaceTitle: '',
  metaTitle: '',
  metaDescription: '',
  seoDescription: '',
  code: '',
  slug: '',
  itemType: 'product',
  environment: '',
  includeEnvironment: true,
  includeBrand: true,
  titleOrder: ['type', 'environment', 'line', 'brand', 'complement'],
  featured: false,
  productKind: undefined,
  condition: 'novo',
  category: '',
  categoryId: '',
  categoryIds: [],
  opportunityId: null,
  mainSupplierId: '',
  description: '',
  observations: '',
  unitPrice: '',
  promoPrice: '',
  discountPercent: '',
  discountFixed: '',
  costPrice: '',
  ipiPercent: '',
  freightType: 'fixed',
  freightCost: '',
  finalPurchasePrice: 0,
  stock: '',
  minStock: 0,
  width: '',
  height: '',
  depth: '',
  weight: '',
  depthUseLength: false,
  images: [],
  variations: [],
  hasVariations: false,
  active: true,
  isDraft: false,
};

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
  const [nameError, setNameError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [costPriceError, setCostPriceError] = useState(false);
  const [unitPriceError, setUnitPriceError] = useState(false);
  const [supplierError, setSupplierError] = useState(false);
  const [descriptionTechnicalValidationError, setDescriptionTechnicalValidationError] = useState(false);
  const [variationValidationTarget, setVariationValidationTarget] =
    useState<MobileProductFormErrorNavigation | null>(null);
  const [openReadiness, setOpenReadiness] = useState<'erp' | 'catalog' | null>(null);
  const [formData, setFormDataRaw] = useState<any>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveError, setAutoSaveError] = useState('');
  const [ncmError, setNcmError] = useState(false);
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
    setNameError(false);
    setCategoryError(false);
    setCostPriceError(false);
    setUnitPriceError(false);
    setSupplierError(false);
    setDescriptionTechnicalValidationError(false);
  }, [visible, product?.id]);

  const clearVariationValidationTarget = useCallback(
    () => setVariationValidationTarget(null),
    []
  );

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
      const savedProductId = serverProductIdRef.current;
      const savedProductVersion = serverProductVersionRef.current;

      return {
        ...validated,
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

  const presentValidationErrors = useCallback((
    errors: Parameters<typeof flattenFormErrors>[0],
    isDraft: boolean,
    showAlert: boolean
  ) => {
    const messages = flattenFormErrors(errors);
    if (showAlert) {
      setDescriptionTechnicalValidationError(
        !isDraft && hasMobileProductDescriptionTechnicalValidationError(messages)
      );
    }
    const firstErrorPath = Object.keys(messages)[0] || '';
    const fieldPath = isMobileProductNameError('name', messages) ? 'name' : firstErrorPath;
    setNameError(fieldPath === 'name');
    setCategoryError(isMobileProductCategoryError('categoryIds', messages));
    setCostPriceError(isMobileProductCostPriceError(firstErrorPath, messages));
    setUnitPriceError(isMobileProductUnitPriceError(firstErrorPath, messages));
    setSupplierError(isMobileProductSupplierError(firstErrorPath, messages));
    const navigation = resolveMobileProductFormErrorNavigation(fieldPath);
    if (navigation) setActiveTab(navigation.tab);
    setVariationValidationTarget(
      navigation?.variationIndex !== undefined ? navigation : null
    );
    setNcmError(navigation?.tab === 'fiscal');
    const message = resolveMobileProductFormErrorMessage(fieldPath, messages, isDraft);
    if (showAlert) Alert.alert('Confira os campos', message);
    else setAutoSaveError(message);
  }, []);

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
            if (
              shouldValidatePublishedCatalogEdit(
                product?.status || validated.status,
                product,
                validated,
              )
            ) {
              let categoryRequirements: Awaited<
                ReturnType<typeof fetchMobileProductTechnicalFields>
              > | null = null;
              try {
                categoryRequirements = await withTimeout(
                  fetchMobileProductTechnicalFields({ requireCategoryLinks: true }),
                  15000,
                  null,
                  'produto:verificar-requisitos-do-catalogo'
                );
                if (!categoryRequirements) {
                  throw new Error('Requisitos de categoria indisponíveis.');
                }
              } catch {
                Alert.alert(
                  'Verificação indisponível',
                  'Não foi possível verificar as características obrigatórias da categoria. O produto publicado não foi alterado.'
                );
                return;
              }

              const catalogEditLegibility = getMobilePublishedCatalogEditLegibility(
                product,
                validated,
                categoryRequirements
              );
              if (catalogEditLegibility && !catalogEditLegibility.isLegible) {
                const missingCharacteristics =
                  catalogEditLegibility.missingCategoryCharacteristics;
                if (missingCharacteristics.length === 0) {
                  Alert.alert(
                    'Catálogo publicado',
                    'O produto ainda precisa atender aos requisitos do Catálogo Digital.'
                  );
                  return;
                }

                const characteristicLabel = missingCharacteristics.join(', ');
                const characteristicMessage =
                  missingCharacteristics.length === 1
                    ? `O campo obrigatório "${characteristicLabel}" está desativado ou sem valor.`
                    : `Os campos obrigatórios (${characteristicLabel}) estão desativados ou sem valor.`;
                const confirmed = await new Promise<boolean>((resolve) => {
                  Alert.alert(
                    'Ocultar produto do Catálogo Digital?',
                    `${characteristicMessage} Se confirmar, as alterações serão salvas e o produto será ocultado do Catálogo Digital.`,
                    [
                      { text: 'Continuar editando', style: 'cancel', onPress: () => resolve(false) },
                      { text: 'Salvar e ocultar', style: 'destructive', onPress: () => resolve(true) },
                    ],
                    { cancelable: true, onDismiss: () => resolve(false) }
                  );
                });
                if (!confirmed) return;
                hideFromCatalog = true;
              }
            }

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
  const erpReadinessItems = [
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
  const catalogReadinessItems = [
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
  const resolveReadinessTab = (itemId: string, tab?: TabId) =>
    resolveMobileProductReadinessTab(
      itemId,
      tab,
      enabledTabs.map((enabledTab) => enabledTab.id)
    );
  const renderReadinessItem = (item: {
    id: string;
    label: string;
    ready: boolean;
    tab?: TabId;
  }) => {
    const targetTab = resolveReadinessTab(item.id, item.tab);
    const contents = (
      <>
        <View
          style={[
            styles.readinessStatusIcon,
            item.ready ? styles.readinessStatusIconReady : styles.readinessStatusIconPending,
          ]}
        >
          <Text
            style={[
              styles.readinessStatusIconText,
              item.ready ? styles.readinessStatusIconTextReady : styles.readinessStatusIconTextPending,
            ]}
          >
            {item.ready ? '✓' : '!'}
          </Text>
        </View>
        <Text
          style={[
            styles.readinessItemLabel,
            item.ready ? styles.readinessItemLabelReady : styles.readinessItemLabelPending,
            dark && styles.readinessItemLabelDark,
          ]}
        >
          {item.label}
        </Text>
        <Text
          style={[
            styles.readinessItemStatus,
            item.ready ? styles.readinessItemStatusReady : styles.readinessItemStatusPending,
          ]}
        >
          {item.ready ? 'OK' : 'Pendente'}
        </Text>
        {targetTab ? <ChevronRight size={14} color={dark ? '#94a3b8' : '#94a3b8'} /> : null}
      </>
    );

    if (!targetTab) {
      return (
        <View key={item.id} style={styles.readinessItem}>
          {contents}
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => {
          setOpenReadiness(null);
          handleTabChange(targetTab);
        }}
        style={styles.readinessItem}
        accessibilityRole="button"
        accessibilityLabel={`${item.ready ? 'Concluído' : 'Pendente'}: ${item.label}`}
        accessibilityHint={`Abre a aba ${targetTab}`}
      >
        {contents}
      </TouchableOpacity>
    );
  };

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
            <View style={[styles.readinessPanel, dark && styles.darkReadinessPanel]}>
              <View style={styles.readinessPanelHeader}>
                <View style={styles.readinessPanelTitleGroup}>
                  <Text style={[styles.readinessPanelTitle, dark && styles.lightText]}>
                    {activeReadiness === 'erp'
                      ? 'Requisitos do ERP (Cadastro / Ativação)'
                      : 'Requisitos do Catálogo'}
                  </Text>
                  <Text style={[styles.readinessPanelHint, dark && styles.dimText]}>
                    Toque em um item para abrir a aba correspondente.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setOpenReadiness(null)}
                  style={styles.readinessCloseButton}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar checklist de prontidão"
                >
                  <X size={16} color={dark ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.readinessList}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                {activeReadinessItems.map(renderReadinessItem)}
              </ScrollView>
            </View>
          ) : null}

          {/* ── Tabs Scrolláveis ── */}
          <View style={[styles.tabsContainer, dark && styles.darkTabsContainer]}>
            <ScrollView
              ref={tabScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
            >
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const disabled = isTabDisabled(tab.id);
                const badge =
                  tab.id === 'variacoes' && varCount > 0
                    ? varCount
                    : tab.id === 'fotos' && photoCount > 0
                      ? photoCount
                      : null;
                const TabIcon = tab.Icon;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => handleTabChange(tab.id)}
                    disabled={disabled}
                    accessibilityRole="tab"
                    accessibilityState={{ disabled, selected: isActive }}
                    accessibilityHint={
                      disabled
                        ? tab.id === 'technical'
                          ? 'Selecione ao menos uma categoria no Cadastro Geral para liberar esta aba.'
                          : 'Informe o nome, selecione uma categoria e preencha as características obrigatórias.'
                        : undefined
                    }
                    style={[
                      styles.tab,
                      isActive && styles.tabActive,
                      dark && !isActive && styles.darkTab,
                      disabled && styles.tabDisabled,
                    ]}
                  >
                    {TabIcon && (
                      <TabIcon
                        size={13}
                        color={isActive ? '#2563eb' : dark ? '#94a3b8' : '#64748b'}
                      />
                    )}
                    <Text
                      style={[
                        styles.tabLabel,
                        isActive && styles.tabLabelActive,
                        dark && !isActive && styles.dimText,
                      ]}
                    >
                      {tab.label.toLocaleUpperCase('pt-BR')}
                    </Text>
                    {disabled && <Lock size={12} color={dark ? '#64748b' : '#94a3b8'} />}
                    {badge !== null && (
                      <View style={[styles.badge, isActive && styles.badgeActive]}>
                        <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                          {badge}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
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

          {/* ── Footer de Ações ── */}
          <View style={[styles.footer, dark && styles.darkFooter]}>
            {isDraftProduct && (
              <TouchableOpacity
                onPress={() => handleSubmit(true)}
                disabled={saving || autoSaveStatus === 'saving'}
                style={[styles.draftBtn, dark && styles.darkBtn]}
              >
                <Save size={15} color={dark ? '#94a3b8' : '#64748b'} />
                <Text style={[styles.draftBtnText, dark && styles.dimText]}>Salvar rascunho</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleRequestClose}
              disabled={saving || autoSaveStatus === 'saving'}
              style={[styles.discardBtn, dark && styles.darkBtn]}
              accessibilityRole="button"
            >
              <Text style={[styles.discardBtnText, dark && styles.dimText]}>
                {isDraftProduct ? 'Cancelar' : 'Descartar alterações'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={isLastStep ? () => handleSubmit(false) : handleNextStep}
              disabled={saving || autoSaveStatus === 'saving'}
              style={[styles.saveBtn, isLastStep && styles.finalSaveBtn]}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  {isLastStep ? <Check size={16} color="#ffffff" /> : null}
                  <Text style={styles.saveBtnText}>
                    {isLastStep
                      ? product
                        ? 'Salvar alterações'
                        : 'Cadastrar produto'
                      : 'Próxima etapa'}
                  </Text>
                  {!isLastStep ? <ChevronRight size={16} color="#ffffff" /> : null}
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  darkBg: { backgroundColor: '#0f172a' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  darkHeader: { borderBottomColor: '#1e293b' },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBtn: { backgroundColor: '#1e293b' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  headerCode: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2563eb',
    fontVariant: ['tabular-nums'] as any,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  statusBadge: {
    minHeight: 19,
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.35 },
  erpStatusReady: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  erpStatusPending: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  erpStatusTextReady: { color: '#1d4ed8' },
  erpStatusTextPending: { color: '#b45309' },
  catalogStatusPublished: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  catalogStatusHidden: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  catalogStatusTextPublished: { color: '#047857' },
  catalogStatusTextHidden: { color: '#475569' },
  readinessPanel: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  darkReadinessPanel: { borderColor: '#334155', backgroundColor: '#111827' },
  readinessPanelHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  readinessPanelTitleGroup: { flex: 1 },
  readinessPanelTitle: { color: '#334155', fontSize: 10, fontWeight: '900' },
  readinessPanelHint: { color: '#64748b', fontSize: 9, fontWeight: '600', marginTop: 2 },
  readinessCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readinessList: { maxHeight: 224 },
  readinessItem: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  readinessStatusIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readinessStatusIconReady: { backgroundColor: '#dbeafe' },
  readinessStatusIconPending: { backgroundColor: '#fef3c7' },
  readinessStatusIconText: { fontSize: 11, fontWeight: '900', lineHeight: 14 },
  readinessStatusIconTextReady: { color: '#1d4ed8' },
  readinessStatusIconTextPending: { color: '#b45309' },
  readinessItemLabel: { flex: 1, fontSize: 10, fontWeight: '700' },
  readinessItemLabelReady: { color: '#1d4ed8' },
  readinessItemLabelPending: { color: '#64748b' },
  readinessItemLabelDark: { color: '#cbd5e1' },
  readinessItemStatus: { fontSize: 8, fontWeight: '900' },
  readinessItemStatusReady: { color: '#1d4ed8' },
  readinessItemStatusPending: { color: '#b45309' },
  headerSubtitle: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },

  // Tabs
  tabsContainer: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#ffffff' },
  darkTabsContainer: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' },
  tabsContent: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 0, gap: 4 },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabDisabled: { opacity: 0.45 },
  tabActive: { backgroundColor: 'transparent', borderBottomColor: '#2563eb' },
  darkTab: { backgroundColor: 'transparent' },
  tabLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.35, color: '#64748b' },
  tabLabelActive: { color: '#2563eb' },
  badge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeActive: { backgroundColor: '#ffffff30' },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#475569' },
  badgeTextActive: { color: '#ffffff' },

  // Body
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 24 },

  // Footer
  autoSaveStatus: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  autoSaveStatusDark: { backgroundColor: '#0f172a', color: '#94a3b8' },
  autoSaveStatusError: { backgroundColor: '#fef2f2', color: '#b91c1c' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  darkFooter: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
  draftBtn: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  draftBtnText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  discardBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  discardBtnText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#64748b',
    textAlign: 'center',
  },
  saveBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  finalSaveBtn: { backgroundColor: '#059669' },
  saveBtnText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', color: '#ffffff' },
});
