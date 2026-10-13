import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
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
// Initial Data & Rules
import { INITIAL_PRODUCT_FORM_DATA } from '../../utils/form/productFormInitialData';
import {
  type ProductFormTabKey,
  scrollToRequirementField,
} from '../../utils/form/productRequirementNavigation';
import { useProductJevClassification } from '../fiscal/useProductJevClassification';
import { isDraftSaveEligible } from './rules/productDraftRules';
import { useProductFormAi } from './useProductFormAi';
import { useProductFormDraft } from './useProductFormDraft';
import { useProductFormImages } from './useProductFormImages';
import { useProductFormLoad } from './useProductFormLoad';
// Sub-hooks
import { useProductFormPricing } from './useProductFormPricing';
import { useProductFormSubmit } from './useProductFormSubmit';
import { useProductFormSync } from './useProductFormSync';
import { useProductFormVariations } from './useProductFormVariations';

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
  const [deletingVariationId, setDeletingVariationId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    ...INITIAL_PRODUCT_FORM_DATA,
    ...initialData,
  });
  const latestFormDataRef = useRef(formData);
  latestFormDataRef.current = formData;
  const isTestArtifact = Boolean(readTestArtifactIdentity(formData));
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
  const pendingNewVariationIdRef = variations.pendingNewVariationIdRef;
  const setEditingVariationId = variations.setEditingVariationId;
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

  useProductFormSync({ formData, setFormData });

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
      } catch (_err) {
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
        else
          c.parents.forEach((pid: string) => {
            find(pid);
          });
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
    isTestArtifact,
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
        const saved = await autoSaveDraft(getDraftSnapshotWithoutPendingVariation());
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
    getDraftSnapshotWithoutPendingVariation,
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
    async (updatedVar: Variation): Promise<boolean> => {
      const current = latestFormDataRef.current;
      const sku = updatedVar.sku?.trim().toLocaleUpperCase();
      const duplicateSku = (current.variations || []).some(
        (item) =>
          Boolean(sku) &&
          String(item.id) !== String(updatedVar.id) &&
          item.sku?.trim().toLocaleUpperCase() === sku
      );
      if (duplicateSku) {
        toast.error(`O SKU "${updatedVar.sku}" já está em uso em outra variação.`);
        return false;
      }

      const next: Partial<Product> = {
        ...current,
        hasVariations: true,
        variations: (current.variations || []).some(
          (item) => String(item.id) === String(updatedVar.id)
        )
          ? current.variations?.map((item) =>
              String(item.id) === String(updatedVar.id) ? updatedVar : item
            )
          : [...(current.variations || []), updatedVar],
      };

      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;

      try {
        if (isDraftProduct) {
          if (!(await autoSaveDraft(next))) return false;
          setFormData((previous) => ({
            ...previous,
            hasVariations: true,
            variations: next.variations,
          }));
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
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao salvar a variação.');
        console.error('[ProductForm] Falha ao salvar variação concluída:', error);
        return false;
      }
    },
    [autoSaveDraft, isDraftProduct, pendingNewVariationIdRef, setEditingVariationId]
  );

  const handleDeleteVariation = useCallback(
    async (variationId: string) => {
      const current = latestFormDataRef.current;
      if ((current.variations?.length || 0) <= 1) {
        toast.info('A última variação só pode ser excluída junto com o produto.');
        return;
      }
      if (!isRegisteredProduct) return;
      if (
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
          toast.error(result.message || 'Não foi possível excluir a variação.');
          return;
        }
        if (result.parentDeactivated) {
          toast.success(result.message || 'Produto e variação desativados com sucesso.');
          onClose();
          return;
        }
        setFormData((previous) => ({
          ...previous,
          variations: previous.variations?.filter((variation) => variation.id !== variationId),
          hasVariations: true,
        }));
        toast.success(result.message || 'Variação excluída com sucesso.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao excluir a variação.');
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
    deletingVariationId,
    handleDeleteVariation,
    isCategorySearchOpen,
    setIsCategorySearchOpen,
    suppliers,
    availableCategories,
    isConversionModalOpen,
    setIsConversionModalOpen,
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
          error instanceof Error ? error.message : 'Não foi possível alterar o modo de teste.'
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
    handleConvertProduct,
    handleNextStep,
    isLastStep,
    formTabs,
  };
}
