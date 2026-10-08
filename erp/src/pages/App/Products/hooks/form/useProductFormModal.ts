import { useState, useEffect, useCallback, useRef } from 'react';
import Product, { Variation } from '@/pages/types/product.type';
import Person from '@/pages/types/person.type';
import { subscribeToPeople } from '@/pages/utils/personService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { toast } from 'react-toastify';

// Initial Data & Rules
import { INITIAL_PRODUCT_FORM_DATA } from '../../utils/form/productFormInitialData';
import { checkEcomLegibility } from '../../domain/productLegibilityRules';
import {
  scrollToRequirementField,
  ProductFormTabKey,
} from '../../utils/form/productRequirementNavigation';
import { getProductFormTabs, isExistingRegisteredProduct } from '../../modals/productFormTabs';
import { isDraftSaveEligible } from './rules/productDraftRules';

// Sub-hooks
import { useProductFormPricing } from './useProductFormPricing';
import { useProductFormAi } from './useProductFormAi';
import { useProductJevClassification } from '../fiscal/useProductJevClassification';
import { useProductFormDraft } from './useProductFormDraft';
import { useProductFormImages } from './useProductFormImages';
import { useProductFormVariations } from './useProductFormVariations';
import { useProductFormSync } from './useProductFormSync';
import { useProductFormSubmit } from './useProductFormSubmit';
import { useProductFormLoad } from './useProductFormLoad';

export interface UseProductFormModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly product?: Product | null;
  readonly initialData?: Partial<Product> | null;
  readonly initialTab?: 'geral' | 'ambientes' | 'estoque' | 'variacoes' | 'ecommerce' | 'fiscal';
  readonly openAddVariationOnOpen?: boolean;
  readonly onSuccess?: (newProduct: Product) => void;
  readonly onDraftSaved?: () => void;
  readonly onSave?: (savedProduct?: Product) => void | Promise<void>;
  readonly isQuickRegister?: boolean;
  readonly isStockistOnly?: boolean;
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
  const [variationsInUse, setVariationsInUse] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<Partial<Product>>({
    ...INITIAL_PRODUCT_FORM_DATA,
    ...initialData,
  });
  const latestFormDataRef = useRef(formData);
  latestFormDataRef.current = formData;
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasChanged = useRef(false);
  const initialFormDataRef = useRef<string>('');
  const isService = formData.itemType === 'service';
  const isProductCreation = !product?.id;
  const isRegisteredProduct = isExistingRegisteredProduct(product);
  const isDraftProduct =
    !product ||
    Boolean(formData.isDraft) ||
    Boolean((formData as any).is_draft) ||
    formData.status === 'draft';

  const pricing = useProductFormPricing(formData, setFormData);
  const ai = useProductFormAi(formData, setFormData, availableCategories, isQuickRegister, isOpen);
  const jev = useProductJevClassification(formData, setFormData, isOpen);
  const variations = useProductFormVariations(formData, setFormData);
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
  const scheduleDraftAutoSave = useCallback(() => {
    if (!isDraftProduct) return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      autoSaveDraft(latestFormDataRef.current);
    }, 500);
  }, [autoSaveDraft, isDraftProduct]);
  useEffect(() => {
    if (!isOpen || !isDraftProduct || !initialFormDataRef.current) return;
    const initial = JSON.parse(initialFormDataRef.current) as Partial<Product>;
    if (JSON.stringify(formData.variations) !== JSON.stringify(initial.variations)) {
      scheduleDraftAutoSave();
    }
  }, [formData.variations, isOpen, isDraftProduct, scheduleDraftAutoSave]);
  const images = useProductFormImages(formData, setFormData, setLoading, scheduleDraftAutoSave);

  useProductFormSync({ formData, setFormData });

  useEffect(() => {
    if (!isOpen) setVariationsInUse(new Set());
  }, [isOpen]);

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
    if (isStockistOnly && (activeTab === 'ecommerce' || activeTab === 'description')) {
      setActiveTab('geral');
    }
  }, [isStockistOnly, activeTab]);

  useEffect(() => {
    if (isOpen) {
      const currentStr = JSON.stringify(formData);
      if (!initialFormDataRef.current) {
        initialFormDataRef.current = currentStr;
      } else if (currentStr !== initialFormDataRef.current) {
        hasChanged.current = true;
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
      } catch (err) {
        setAvailableCategories([]);
      }
    };
    fetchCategories();
    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (formData.categoryIds?.length && availableCategories.length) {
      const roots = new Set<string>();
      const visited = new Set<string>();
      const find = (catId: string) => {
        if (visited.has(catId)) return;
        visited.add(catId);
        const c = availableCategories.find((item) => item.id === catId);
        if (!c) return;
        if (!c.parents || c.parents.length === 0) roots.add(c.name);
        else c.parents.forEach((pid: string) => find(pid));
      };
      formData.categoryIds.forEach(find);
      const allEnvs = Array.from(roots);

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
        if (!prev.environment && allEnvs.length > 0) {
          next.environment = allEnvs[0];
          changed = true;
        }
        return changed ? next : prev;
      });
    }
  }, [formData.categoryIds, availableCategories]);

  const { handleSubmit } = useProductFormSubmit({
    formData,
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
    onSuccess,
    onSave,
    onClose,
  });

  const handleCloseWithAutoSave = useCallback(async () => {
    const canSaveDraft = isDraftSaveEligible(formData);
    const isBasicallyEmpty = isProductCreation && !canSaveDraft;

    if (isDraftProduct && canSaveDraft) {
      const hasScheduledSave = draftSaveTimerRef.current !== null;
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
      if (
        hasChanged.current ||
        hasScheduledSave ||
        autoSaveStatus === 'saving' ||
        autoSaveStatus === 'error'
      ) {
        const saved = await autoSaveDraft(latestFormDataRef.current);
        if (!saved) return;
      }
      onDraftSaved?.();
      onClose();
      return;
    }

    if (hasChanged.current && !isBasicallyEmpty) {
      if (window.confirm('Você tem alterações não salvas. Deseja realmente sair e descartar?'))
        onClose();
    } else {
      onClose();
    }
  }, [
    hasChanged,
    onClose,
    onDraftSaved,
    isProductCreation,
    isDraftProduct,
    formData,
    autoSaveDraft,
    autoSaveStatus,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (saveResult) {
          setSaveResult(null);
          return;
        }
        if (isCategorySearchOpen) {
          setIsCategorySearchOpen(false);
          return;
        }
        if (isConversionModalOpen) {
          setIsConversionModalOpen(false);
          return;
        }
        if (variations.editingVariationId) {
          return;
        }
        handleCloseWithAutoSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    isCategorySearchOpen,
    isConversionModalOpen,
    variations,
    saveResult,
    handleCloseWithAutoSave,
    handleSubmit,
  ]);

  const handleCategorySelect = useCallback(
    (cid: string) => {
      const isSelected = formData.categoryIds?.includes(cid);
      const newIds = isSelected
        ? formData.categoryIds?.filter((id) => id !== cid)
        : [...(formData.categoryIds || []), cid];
      let detectedEnv = formData.environment;
      if (newIds && newIds.length > 0) {
        const selectedCats = availableCategories.filter((c) => newIds.includes(c.id));
        const rootSelected = selectedCats.find((c) => !c.parents || c.parents.length === 0);
        if (rootSelected) detectedEnv = rootSelected.name;
        else {
          const firstCat = selectedCats[0];
          if (firstCat?.parents?.length > 0) {
            const parentCat = availableCategories.find((c) => c.id === firstCat.parents[0]);
            if (parentCat) detectedEnv = parentCat.name;
          }
        }
      }
      setFormData((prev) => ({ ...prev, categoryIds: newIds, environment: detectedEnv }));
    },
    [formData.categoryIds, formData.environment, availableCategories]
  );

  const handleCloseVariationModal = useCallback(() => {
    const pendingVariationId = variations.pendingNewVariationIdRef.current;
    if (pendingVariationId) {
      setFormData((prev) => ({
        ...prev,
        variations: prev.variations?.filter(
          (v) => v.id !== pendingVariationId && String(v.id) !== String(pendingVariationId)
        ),
      }));
      variations.pendingNewVariationIdRef.current = null;
    }
    variations.setEditingVariationId(null);
  }, [variations, setFormData]);

  const handleSaveVariation = useCallback(
    (updatedVar: Variation) => {
      variations.pendingNewVariationIdRef.current = null;
      setFormData((prev) => ({
        ...prev,
        variations: prev.variations?.map((v) =>
          v.id === updatedVar.id || String(v.id) === String(updatedVar.id) ? updatedVar : v
        ),
      }));
      variations.setEditingVariationId(null);
    },
    [variations, setFormData]
  );

  const confirmDraftVariation = variations.confirmDraftVariation;
  const handleDraftVariationChange = useCallback((updatedVariation: Variation) => {
    if (!isDraftProduct) return;
    confirmDraftVariation();
    const current = latestFormDataRef.current;
    const next = {
      ...current,
      variations: current.variations?.map((item) =>
        item.id === updatedVariation.id ? updatedVariation : item
      ),
    };
    latestFormDataRef.current = next;
    hasChanged.current = true;
    setFormData(next);
  }, [isDraftProduct, confirmDraftVariation]);

  const handleDraftVariationSave = useCallback((updatedVariation: Variation) => {
    handleDraftVariationChange(updatedVariation);
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = null;
    return autoSaveDraft(latestFormDataRef.current);
  }, [handleDraftVariationChange, autoSaveDraft]);

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
  const formTabs = getProductFormTabs(isService, isComposition, isStockistOnly);
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
    variationsInUse,
    isCategorySearchOpen,
    setIsCategorySearchOpen,
    suppliers,
    availableCategories,
    isConversionModalOpen,
    setIsConversionModalOpen,
    formData,
    setFormData,
    isService,
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
    handleDraftVariationChange,
    handleDraftVariationSave,
    handleConvertProduct,
    handleNextStep,
    isLastStep,
    formTabs,
  };
}
