import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createProductVariationFormSchema } from '../../../../../../../shared-utils/productVariationValidation';
import type Person from '@/pages/types/person.type';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { physicalDeleteVariation, saveVariation } from '@/pages/utils/productService';
import { setTestArtifactMode } from '../../../../../../../shared-utils/testArtifactContext';
import { readTestArtifactIdentity } from '../../../../../../../shared-utils/testArtifactPolicy';
import { checkEcomLegibility } from '../../domain/productLegibilityRules';
import { getProductFormTabs, isExistingRegisteredProduct } from '../../modals/productFormTabs';
import { getProductCategoryRootNames } from '../../components/tabs/sections/productCategoryEnvironment';
// Initial Data & Rules
import { INITIAL_PRODUCT_FORM_DATA } from '../../utils/form/productFormInitialData';
import {
  type ProductFormTabKey,
  scrollToRequirementField,
} from '../../utils/form/productRequirementNavigation';
import { useProductJevClassification } from '../fiscal/useProductJevClassification';
import { isDraftSaveEligible, getEnteredProductName } from './rules/productDraftRules';
import { ensureDefaultVariation } from '@/pages/utils/productVariationDefaults';
import { useProductFormAi } from './useProductFormAi';
import { useProductFormDraft } from './useProductFormDraft';
import { useProductFormImages } from './useProductFormImages';
import { useProductFormLoad } from './useProductFormLoad';
// Sub-hooks
import { useProductFormPricing } from './useProductFormPricing';
import { useProductFormSubmit } from './useProductFormSubmit';
import { useProductFormSync } from './useProductFormSync';
import { useProductFormVariations } from './useProductFormVariations';
import { replaceProductImageGlobally } from '../../components/tabs/images/productImageOrdering';
import { inheritSimpleProductVariationFromParent } from '../../../../../../../shared-utils/simpleProductVariationInheritance';

const PRODUCT_FORM_ERROR_TOAST_OPTIONS = { autoClose: 8000 } as const;

const sortFormSnapshotKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortFormSnapshotKeys);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(
      ([key, nestedValue]) => [key, sortFormSnapshotKeys(nestedValue)]
    )
  );
};

const serializeProductFormForDirtyCheck = (data: Partial<Product>) => {
  const trackedData = { ...data };
  delete trackedData.availableEnvironments;
  // This value is recomputed from cost, IPI, and freight by the form sync hook.
  delete trackedData.finalPurchasePrice;
  if (data.id) {
    // Existing stock balances are managed by inventory workflows, not this form.
    delete trackedData.stock;
  }
  if (data.hasVariations && data.variations?.length) {
    // ProductGeneralTab derives this legacy summary from the actual variation colors.
    const variationColors = Array.from(new Set(
      data.variations.flatMap((variation) =>
        (variation.attributes || [])
          .filter((attribute) => attribute.name?.trim().toLocaleUpperCase('pt-BR') === 'COR' && typeof attribute.value === 'string' && attribute.value.trim())
          .map((attribute) => (attribute.value as string).trim().toLocaleUpperCase('pt-BR'))
      )
    ));
    if (variationColors.length) trackedData.colors = variationColors.join(' / ');
  }
  trackedData.variations = data.variations?.map((variation) => {
    const trackedVariation = { ...variation };
    if (data.id) delete trackedVariation.stock;
    if (variation.syncUnitPrice) trackedVariation.unitPrice = 0;
    if (variation.syncCostPrice) trackedVariation.costPrice = 0;
    if (variation.syncPromoPrice !== false) trackedVariation.promoPrice = 0;
    if (variation.syncDescription) trackedVariation.description = '';
    if (variation.syncWidth) trackedVariation.width = 0;
    if (variation.syncHeight) trackedVariation.height = 0;
    if (variation.syncDepth) trackedVariation.depth = 0;
    if (variation.syncWeight) trackedVariation.weight = 0;
    if (variation.syncCondition) trackedVariation.condition = '';
    if (variation.syncFiscal) {
      if (variation.syncNcm === false) {
        trackedVariation.fiscal = variation.fiscal
          ? { ncm: variation.fiscal.ncm }
          : undefined;
      } else {
        trackedVariation.fiscal = undefined;
      }
    }
    return trackedVariation;
  });
  return JSON.stringify(sortFormSnapshotKeys(trackedData));
};

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
  const [deletingVariationId, setDeletingVariationId] = useState<string | null>(null);

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
  const selectedCategoryName = availableCategories
    .filter((category) => formData.categoryIds?.includes(category.id))
    .map((category) => category.name)
    .filter(Boolean)
    .join(' / ');
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
  const getDraftSnapshotWithoutPendingVariation = useCallback(() => {
    const current = latestFormDataRef.current;
    const pendingId = pendingNewVariationIdRef.current;
    return pendingId
      ? {
          ...current,
          variations: current.variations?.filter((item) => String(item.id) !== String(pendingId)),
        }
      : current;
  }, [pendingNewVariationIdRef]);
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
      } catch (_err) {
        setAvailableCategories([]);
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

  const handleCloseWithAutoSave = useCallback(async () => {
    const canSaveDraft = isDraftSaveEligible(formData);
    const isBasicallyEmpty = isProductCreation && !canSaveDraft;
    let hasUnsavedFormChanges = hasChanged.current;
    if (initialFormDataRef.current) {
      try {
        const initialData = JSON.parse(initialFormDataRef.current) as Partial<Product>;
        hasUnsavedFormChanges =
          serializeProductFormForDirtyCheck(formData) !==
          serializeProductFormForDirtyCheck(initialData);
      } catch {
        // Fall back to the interaction flag if a legacy snapshot cannot be parsed.
      }
    }

    if (isDraftProduct && canSaveDraft) {
      const hasScheduledSave = draftSaveTimerRef.current !== null;
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
      if (
        hasUnsavedFormChanges ||
        hasScheduledSave ||
        autoSaveStatus === 'saving' ||
        autoSaveStatus === 'error'
      ) {
        const saved = await autoSaveDraft(getDraftSnapshotWithoutPendingVariation());
        if (!saved) return;
      }
      onDraftSaved?.();
      onClose();
      return;
    }

    if (hasUnsavedFormChanges && !isBasicallyEmpty) {
      setIsDiscardChangesConfirmOpen(true);
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
    getDraftSnapshotWithoutPendingVariation,
    autoSaveStatus,
  ]);

  const cancelDiscardChanges = useCallback(() => {
    setIsDiscardChangesConfirmOpen(false);
  }, []);

  const confirmDiscardChanges = useCallback(() => {
    setIsDiscardChangesConfirmOpen(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDiscardChangesConfirmOpen) {
          cancelDiscardChanges();
          return;
        }
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
        if (variations.editingVariationId) return;
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    isCategorySearchOpen,
    isConversionModalOpen,
    isDiscardChangesConfirmOpen,
    variations,
    saveResult,
    handleCloseWithAutoSave,
    cancelDiscardChanges,
    handleSubmit,
  ]);

  const handleCategorySelect = useCallback(
    (cid: string) => {
      const isSelected = formData.categoryIds?.includes(cid);
      const newIds = isSelected
        ? formData.categoryIds?.filter((id) => id !== cid)
        : [...(formData.categoryIds || []), cid];
      const categoryIds = newIds || [];
      const availableEnvironments = getProductCategoryRootNames(categoryIds, availableCategories);
      setFormData((prev) => ({
        ...prev,
        categoryIds,
        environment:
          prev.environment && availableEnvironments.includes(prev.environment)
            ? prev.environment
            : availableEnvironments[0] || '',
        availableEnvironments,
      }));
    },
    [formData.categoryIds, formData.environment, availableCategories]
  );

  const handleCloseVariationModal = useCallback(() => {
    const pendingVariationId = variations.pendingNewVariationIdRef.current;
    if (pendingVariationId) {
      setFormData((prev) => {
        const remaining = (prev.variations || []).filter(
          (v) => v.id !== pendingVariationId && String(v.id) !== String(pendingVariationId)
        );
        const next = {
          ...prev,
          variations: remaining,
        };
        const ensured = remaining.length === 0 ? ensureDefaultVariation(next) : next;
        latestFormDataRef.current = ensured;
        return ensured;
      });
      variations.pendingNewVariationIdRef.current = null;
    } else {
      setFormData((prev) => {
        if (!prev.variations || prev.variations.length === 0) {
          const ensured = ensureDefaultVariation(prev);
          latestFormDataRef.current = ensured;
          return ensured;
        }
        latestFormDataRef.current = prev;
        return prev;
      });
    }
    variations.setEditingVariationId(null);
    variations.setEditingVariationIssue(null);
  }, [variations, setFormData]);

  const handleSaveVariation = useCallback(
    async (updatedVariation: Variation): Promise<boolean> => {
      return (await validateSavedVariation({ ...updatedVariation }, async (values) => {
        const updatedVar = values as Variation;
        const current = latestFormDataRef.current;
        const sku = updatedVar.sku?.trim().toLocaleUpperCase();
        const duplicateSku = (current.variations || []).some(
          (item) =>
            Boolean(sku) &&
            String(item.id) !== String(updatedVar.id) &&
            item.sku?.trim().toLocaleUpperCase() === sku
        );
        if (duplicateSku) {
          toast.error(`O SKU "${updatedVar.sku}" já está em uso em outra variação.`, PRODUCT_FORM_ERROR_TOAST_OPTIONS);
          return false;
        }

        const alreadyPresent = (current.variations || []).some(
          (item) => String(item.id) === String(updatedVar.id)
        );
        const nextVariations = alreadyPresent
          ? current.variations?.map((item) =>
              String(item.id) === String(updatedVar.id) ? updatedVar : item
            ) || []
          : [...(current.variations || []), updatedVar];
        const next: Partial<Product> = {
          ...current,
          hasVariations:
            nextVariations.length > 1 || Boolean(current.isDraft && current.hasVariations),
          variations: nextVariations,
        };

        if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;

        try {
          if (isDraftProduct) {
            const saved = await autoSaveDraft(next);
            if (!saved && getEnteredProductName(next)) return false;
            latestFormDataRef.current = next;
            setFormData(next);
          } else {
            const productId = String(current.parentId || current.id || '');
            if (!productId)
              throw new Error('O produto precisa estar salvo antes de cadastrar a variação.');
            await saveVariation(productId, updatedVar);
            latestFormDataRef.current = next;
            setFormData(next);
          }
          pendingNewVariationIdRef.current = null;
          setEditingVariationId(null);
          setEditingVariationIssue(null);
          return true;
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Erro ao salvar a variação.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
          console.error('[ProductForm] Falha ao salvar variação concluída:', error);
          return false;
        }
      }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0], PRODUCT_FORM_ERROR_TOAST_OPTIONS))) === true;
    },
    [autoSaveDraft, isDraftProduct, pendingNewVariationIdRef, setEditingVariationId, setEditingVariationIssue, validateSavedVariation]
  );

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

  const handleDeleteVariation = useCallback(
    async (variationId: string, skipConfirm = false) => {
      const current = latestFormDataRef.current;
      if ((current.variations?.length || 0) <= 1) {
        toast.info('A última variação só pode ser excluída junto com o produto.');
        return;
      }
      if (!isRegisteredProduct) return;
      if (
        !skipConfirm &&
        !window.confirm(
          'Excluir esta variação permanentemente? O sistema verificará se o UUID possui vínculos antes de continuar.'
        )
      )
        return;

      setDeletingVariationId(variationId);
      try {
        const productId = String(current.parentId || current.id || '');
        const result = await physicalDeleteVariation(productId, variationId);
        if (!result.success) {
          toast.error(result.message || 'Não foi possível excluir a variação.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
          return;
        }
        if (result.parentDeactivated) {
          toast.success(result.message || 'Produto e variação desativados com sucesso.');
          onClose();
          return;
        }
        setFormData((previous) => {
          const remainingVariations = (previous.variations || []).filter(
            (variation) => variation.id !== variationId
          );
          const variations = remainingVariations.length === 1
            ? [
                inheritSimpleProductVariationFromParent(previous, remainingVariations[0], {
                  preserveVariationStock: true,
                  preserveVariationAttributes: true,
                }),
              ]
            : remainingVariations;

          return {
            ...previous,
            variations,
            hasVariations: remainingVariations.length > 1,
          };
        });
        toast.success(result.message || 'Variação excluída com sucesso.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao excluir a variação.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
        console.error('[ProductForm] Falha ao excluir variação:', error);
      } finally {
        setDeletingVariationId(null);
      }
    },
    [isRegisteredProduct, onClose, setFormData]
  );

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
