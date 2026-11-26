import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useZodForm } from '@/hooks/useZodForm';
import { createProductVariationFormSchema } from '../../../../../../../../shared-utils/productVariationValidation';
import type Person from '@/pages/types/person.type';
import type Product from '@/pages/types/product.type';
import { serializeProductFormForDirtyCheck } from '../../../utils/form/productFormDirtyCheck';
import { getProductDraftSnapshotWithoutPendingVariation } from '../../../utils/form/productDraftSnapshot';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { setTestArtifactMode } from '../../../../../../../../shared-utils/testing/testArtifactContext';
import { readTestArtifactIdentity } from '../../../../../../../../shared-utils/testing/testArtifactPolicy';
import { checkEcomLegibility } from '../../../domain/productLegibilityRules';
import { getProductFormTabs, isExistingRegisteredProduct } from '../../../modals/productFormTabs';
import { getProductCategoryRootNames } from '../../../components/tabs/sections/productCategoryEnvironment';
// Initial Data & Rules
import { INITIAL_PRODUCT_FORM_DATA } from '../../../utils/form/productFormInitialData';
import {
  type ProductFormTabKey,
  scrollToRequirementField,
} from '../../../utils/form/productRequirementNavigation';
import { useProductJevClassification } from '../../fiscal/useProductJevClassification';
import { useProductFormAi } from '../ai/useProductFormAi';
import { useProductFormDraft } from './useProductFormDraft';
import { useProductFormModalClose } from './useProductFormModalClose';
import { useProductFormImages } from '../fields/useProductFormImages';
import { useProductFormLoad } from './useProductFormLoad';
// Sub-hooks
import { useProductFormPricing } from '../fields/useProductFormPricing';
import { useProductFormSubmit } from '../submission/useProductFormSubmit';
import { useProductFormSync } from '../fields/useProductFormSync';
import { useProductFormVariations } from '../variations/useProductFormVariations';
import { useProductFormKeyboardShortcuts } from '../fields/useProductFormKeyboardShortcuts';
import { useProductFormCategorySelection } from '../fields/useProductFormCategorySelection';
import { useProductFormVariationLifecycle } from '../variations/useProductFormVariationLifecycle';
import { replaceProductImageGlobally } from '../../../components/tabs/images/productImageOrdering';
import {
  PRODUCT_FORM_ERROR_TOAST_OPTIONS,
  useProductFormVariationSave,
} from '../variations/useProductFormVariationSave';

export interface UseProductFormModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly product?: Product | null;
  readonly initialData?: Partial<Product> | null;
  readonly initialTab?: 'geral' | 'ambientes' | 'estoque' | 'variacoes' | 'ecommerce' | 'fiscal';
  readonly openAddVariationOnOpen?: boolean;
  readonly onSuccess?: (newProduct: Product) => void | boolean | Promise<void | boolean>;
  readonly onDraftSaved?: () => void;
  readonly onSave?: (savedProduct?: Product) => void | Promise<void>;
  readonly isQuickRegister?: boolean;
  readonly isStockistOnly?: boolean;
  readonly canMarkTestArtifact?: boolean;
}

export function useProductFormModal({
  isOpen,
  onClose,
  product,
  initialData,
  initialTab,
  openAddVariationOnOpen,
  onSuccess,
  onDraftSaved,
  onSave,
  isQuickRegister = false,
  isStockistOnly = false,
  canMarkTestArtifact = false,
}: UseProductFormModalProps) {
  const [activeTab, setActiveTab] = useState<ProductFormTabKey>('geral');
  const [activeEcommerceSubTab, setActiveEcommerceSubTab] = useState<
    'vitrine' | 'photos' | 'descriptions' | 'logistics' | 'seo'
  >('vitrine');
  const [loading, setLoading] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    erpLegible: boolean;
    ecomLegible: boolean;
    checksErp: any;
    checksEcom: any;
    product: Product;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  const [isCategorySearchOpen, setIsCategorySearchOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Person[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [isDiscardChangesConfirmOpen, setIsDiscardChangesConfirmOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<Product>>({
    ...INITIAL_PRODUCT_FORM_DATA,
    ...initialData,
  });
  const latestFormDataRef = useRef(formData);
  latestFormDataRef.current = formData;
  const isSingleVariation =
    !formData.hasVariations && (formData.variations || []).length <= 1;
  const variationSchema = useMemo(
    () => createProductVariationFormSchema(formData, isSingleVariation),
    [formData, isSingleVariation]
  );
  const { validateAndRun: validateSavedVariation } = useZodForm(variationSchema, {
    id: '', sku: '', name: '', stock: 0, unitPrice: 0, active: true, attributes: [],
  });
  const isTestArtifact = Boolean(readTestArtifactIdentity(formData));
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasChanged = useRef(false);
  const initialFormDataRef = useRef<string>('');
  const isService = formData.itemType === 'service';
  const isMultiVariationMode =
    Boolean(formData.hasVariations) || (formData.variations || []).length > 1;
  const isProductCreation = !product?.id;
  const isRegisteredProduct = isExistingRegisteredProduct(product);
  const isDraftProduct =
    !product ||
    Boolean(formData.isDraft) ||
    Boolean((formData as any).is_draft) ||
    formData.status === 'draft';

  const pricing = useProductFormPricing(formData, setFormData);
  const ai = useProductFormAi(formData, setFormData, availableCategories, isQuickRegister, isOpen);
  const { selectedCategoryName, handleCategorySelect } = useProductFormCategorySelection(
    formData,
    availableCategories,
    setFormData
  );
  const jev = useProductJevClassification(
    formData,
    setFormData,
    isOpen,
    selectedCategoryName || formData.category || ''
  );
  const variations = useProductFormVariations(
    formData,
    setFormData,
    isRegisteredProduct,
    Boolean(product?.id)
  );
  const pendingNewVariationIdRef = variations.pendingNewVariationIdRef;
  const setEditingVariationId = variations.setEditingVariationId;
  const setEditingVariationIssue = variations.setEditingVariationIssue;
  const draft = useProductFormDraft(
    formData,
    setFormData,
    isOpen,
    isProductCreation,
    variations.editingVariationId,
    hasChanged,
    initialFormDataRef
  );
  const autoSaveDraft = draft.autoSaveDraft;
  const autoSaveStatus = draft.autoSaveStatus;
  const getDraftSnapshotWithoutPendingVariation = useCallback(
    () => getProductDraftSnapshotWithoutPendingVariation(
      latestFormDataRef.current,
      pendingNewVariationIdRef.current
    ),
    [pendingNewVariationIdRef]
  );
  const scheduleDraftAutoSave = useCallback(() => {
    if (!isDraftProduct) return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      autoSaveDraft(getDraftSnapshotWithoutPendingVariation());
    }, 500);
  }, [autoSaveDraft, getDraftSnapshotWithoutPendingVariation, isDraftProduct]);
  const images = useProductFormImages(formData, setFormData, setLoading, scheduleDraftAutoSave);

  useProductFormSync({ formData, setFormData, isExistingProduct: Boolean(product?.id) });

  useEffect(
    () => () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    },
    []
  );

  const navigateToRequirementField = useCallback((fieldKey: string) => {
    scrollToRequirementField(fieldKey, setActiveTab, () => setSaveResult(null));
  }, []);

  const ecomStatus = checkEcomLegibility(formData);

  useEffect(() => {
    if (isService && (activeTab === 'variacoes' || activeTab === 'ecommerce')) {
      setActiveTab('geral');
    }
  }, [isService, activeTab]);

  useEffect(() => {
    if (!isMultiVariationMode && activeTab === 'variacoes') {
      setActiveTab('geral');
    }
  }, [isMultiVariationMode, activeTab]);

  useEffect(() => {
    if (
      isStockistOnly &&
      (activeTab === 'ecommerce' || activeTab === 'technical' || activeTab === 'description')
    ) {
      setActiveTab('geral');
    }
  }, [isStockistOnly, activeTab]);

  useEffect(() => {
    if (isOpen) {
      const currentStr = JSON.stringify(formData);
      if (!initialFormDataRef.current) {
        initialFormDataRef.current = currentStr;
      } else {
        const initialData = JSON.parse(initialFormDataRef.current) as Partial<Product>;
        if (
          serializeProductFormForDirtyCheck(formData) !==
          serializeProductFormForDirtyCheck(initialData)
        ) {
          hasChanged.current = true;
        }
      }
    }
  }, [formData, isOpen]);

  const prevOpenRef = useRef(false);
  const loadedProductIdRef = useRef<string | null>(null);

  useProductFormLoad({
    isOpen,
    product,
    initialData,
    initialTab,
    isQuickRegister,
    openAddVariationOnOpen,
    prevOpenRef,
    loadedProductIdRef,
    hasChanged,
    initialFormDataRef,
    setValidationErrors,
    setFormData,
    pricing,
    setActiveTab,
    variations,
  });

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToPeople('suppliers', (data) => setSuppliers(data));

    const fetchCategories = async () => {
      try {
        const result = await fetchGroupsAndCategories();
        const categoriesList = Array.isArray(result?.categories) ? result.categories : [];
        setAvailableCategories(categoriesList.map((c: any) => ({ ...c, isGroup: false })));
      } catch (error) {
        console.warn('[useProductFormModal] Erro ao carregar categorias:', error);
        toast.error('Não foi possível atualizar as categorias. A lista anterior foi mantida.');
      }
    };
    fetchCategories();
    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (formData.categoryIds?.length && availableCategories.length) {
      const allEnvs = getProductCategoryRootNames(formData.categoryIds, availableCategories);

      setFormData((prev) => {
        const next = { ...prev };
        let changed = false;
        if (
          allEnvs.length > 0 &&
          JSON.stringify(prev.availableEnvironments) !== JSON.stringify(allEnvs)
        ) {
          next.availableEnvironments = allEnvs;
          changed = true;
        }
        if (isProductCreation && !prev.environment && allEnvs.length > 0) {
          next.environment = allEnvs[0];
          changed = true;
        }
        return changed ? next : prev;
      });
    }
  }, [formData.categoryIds, availableCategories, isProductCreation]);

  const { handleSubmit } = useProductFormSubmit({
    formData,
    categoryName: selectedCategoryName || formData.category || '',
    setFormData,
    product,
    isRegisteredProduct,
    isStockistOnly,
    setValidationErrors,
    setActiveTab,
    variations,
    draft,
    setLoading,
    setSaveResult,
    hasChanged,
    initialFormDataRef,
    onSuccess,
    onSave,
    onClose,
    closeAfterSuccessfulRegistration: !isQuickRegister,
    isTestArtifact,
  });

  const {
    handleCloseWithAutoSave,
    cancelDiscardChanges,
    confirmDiscardChanges,
  } = useProductFormModalClose({
    formData,
    isProductCreation,
    isDraftProduct,
    hasChanged,
    initialFormDataRef,
    draftSaveTimerRef,
    autoSaveDraft,
    getDraftSnapshotWithoutPendingVariation,
    autoSaveStatus,
    onDraftSaved,
    onClose,
    setIsDiscardChangesConfirmOpen,
  });

  useProductFormKeyboardShortcuts({
    isOpen,
    isCategorySearchOpen,
    isConversionModalOpen,
    isDiscardChangesConfirmOpen,
    variations,
    saveResult,
    setSaveResult,
    setIsCategorySearchOpen,
    setIsConversionModalOpen,
    cancelDiscardChanges,
    handleCloseWithAutoSave,
    handleSubmit,
  });

  const {
    deletingVariationId,
    handleCloseVariationModal,
    handleDeleteVariation,
  } = useProductFormVariationLifecycle({
    latestFormDataRef,
    setFormData,
    isRegisteredProduct,
    onClose,
    pendingNewVariationIdRef,
    setEditingVariationId,
    setEditingVariationIssue,
  });

  const handleSaveVariation = useProductFormVariationSave({
    validateSavedVariation,
    latestFormDataRef,
    autoSaveDraft,
    isDraftProduct,
    pendingNewVariationIdRef,
    setFormData,
    setEditingVariationId,
    setEditingVariationIssue,
    draftSaveTimerRef,
  });

  const handleReplaceImageGlobal = useCallback(async (oldUrl: string, newUrl: string) => {
    const current = latestFormDataRef.current;
    const next = replaceProductImageGlobally(current, oldUrl, newUrl);
    const available = [...(current.images || []), ...(current.variations || []).flatMap((item) => item.images || [])];
    if (!available.includes(oldUrl) && !available.includes(newUrl)) throw Object.assign(new Error('A foto de origem mudou. Reabra o recorte.'), { knownFailure: true });
    latestFormDataRef.current = next; setFormData(next);
    if (isDraftProduct) {
      if (draftSaveTimerRef.current) { clearTimeout(draftSaveTimerRef.current); draftSaveTimerRef.current = null; }
      if (!await autoSaveDraft(next)) throw Object.assign(new Error('O produto mantém a foto alterada, mas o rascunho não foi confirmado. Confira antes de repetir.'), { uncertain: true });
    }
    return true;
  }, [autoSaveDraft, isDraftProduct]);

  const handleConvertProduct = useCallback(
    (updated: Partial<Product>) => {
      setFormData(updated);
      setActiveTab('variacoes');
      toast.success('Produto convertido! O código e estoque agora estão na primeira variação.');
    },
    [setFormData, setActiveTab]
  );

  const isComposition =
    formData.itemType === 'composition' || (formData as any).item_type === 'composition';
  const formTabs = getProductFormTabs(
    isService,
    isComposition,
    isStockistOnly,
    isMultiVariationMode
  );
  const currentTabIndex = formTabs.findIndex((t) => t.id === activeTab);
  const isLastStep = currentTabIndex === formTabs.length - 1;
  const handleNextStep = useCallback(() => {
    if (formTabs[currentTabIndex + 1]) setActiveTab(formTabs[currentTabIndex + 1].id);
  }, [currentTabIndex, formTabs]);

  return {
    activeTab,
    setActiveTab,
    activeEcommerceSubTab,
    setActiveEcommerceSubTab,
    loading,
    saveResult,
    setSaveResult,
    validationErrors,
    setValidationErrors,
    deletingVariationId,
    handleDeleteVariation,
    isCategorySearchOpen,
    setIsCategorySearchOpen,
    suppliers,
    availableCategories,
    isConversionModalOpen,
    setIsConversionModalOpen,
    isDiscardChangesConfirmOpen,
    cancelDiscardChanges,
    confirmDiscardChanges,
    formData,
    setFormData,
    isService,
    isTestArtifact,
    setIsTestArtifact: (enabled: boolean) => {
      if (!canMarkTestArtifact || !isDraftProduct) return;
      try {
        const next = setTestArtifactMode(latestFormDataRef.current, 'technicalSpecs', enabled);
        latestFormDataRef.current = next;
        setFormData(next);
        hasChanged.current = true;
        scheduleDraftAutoSave();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Não foi possível alterar o modo de teste.',
          PRODUCT_FORM_ERROR_TOAST_OPTIONS
        );
      }
    },
    canMarkTestArtifact: canMarkTestArtifact && isDraftProduct,
    isProductCreation,
    isDraftProduct,
    isRegisteredProduct,
    ecomStatus,
    pricing,
    ai,
    jev,
    variations,
    draft,
    scheduleDraftAutoSave,
    images,
    navigateToRequirementField,
    handleSubmit,
    handleCloseWithAutoSave,
    handleCategorySelect,
    handleCloseVariationModal,
    handleSaveVariation,
    handleReplaceImageGlobal,
    handleConvertProduct,
    handleNextStep,
    isLastStep,
    formTabs,
  };
}
