import { useState, useEffect, useCallback, useRef } from "react";
import Product, { Variation } from '@/pages/types/product.type';
import Person from '@/pages/types/person.type';
import { subscribeToPeople } from '@/pages/utils/personService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { toast } from "react-toastify";

// Initial Data & Rules
import { INITIAL_PRODUCT_FORM_DATA } from '../productFormInitialData';
import { checkEcomLegibility } from '../productLegibilityRules';
import { scrollToRequirementField, ProductFormTabKey } from '../utils/productRequirementNavigation';
import { getProductFormTabs, isExistingRegisteredProduct } from '../modals/productFormTabs';

// Sub-hooks
import { useProductFormPricing } from './useProductFormPricing';
import { useProductFormAi } from './useProductFormAi';
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
    readonly onSave?: (savedProduct?: Product) => void | Promise<void>;
    readonly isQuickRegister?: boolean;
}

export function useProductFormModal({
    isOpen,
    onClose,
    product,
    initialData,
    initialTab,
    openAddVariationOnOpen,
    onSuccess,
    onSave,
    isQuickRegister = false
}: UseProductFormModalProps) {
    const [activeTab, setActiveTab] = useState<ProductFormTabKey>('geral');
    const [activeEcommerceSubTab, setActiveEcommerceSubTab] = useState<'vitrine' | 'photos' | 'descriptions' | 'logistics' | 'seo'>('vitrine');
    const [loading, setLoading] = useState(false);
    const [saveResult, setSaveResult] = useState<{ erpLegible: boolean; ecomLegible: boolean; checksErp: any; checksEcom: any; product: Product } | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

    const [isCategorySearchOpen, setIsCategorySearchOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [availableCategories, setAvailableCategories] = useState<any[]>([]);
    const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
    const [variationsInUse, setVariationsInUse] = useState<Set<string>>(new Set());

    const [formData, setFormData] = useState<Partial<Product>>({
        ...INITIAL_PRODUCT_FORM_DATA,
        ...initialData
    });

    const hasChanged = useRef(false);
    const initialFormDataRef = useRef<string>("");
    const isService = formData.itemType === 'service';
    const isProductCreation = !product?.id;
    const isRegisteredProduct = isExistingRegisteredProduct(product);
    const isDraftProduct = (!product || Boolean(formData.isDraft) || Boolean((formData as any).is_draft) || formData.status === 'draft');

    const pricing = useProductFormPricing(formData, setFormData);
    const ai = useProductFormAi(formData, setFormData, availableCategories, isQuickRegister, isOpen);
    const variations = useProductFormVariations(formData, setFormData);
    const draft = useProductFormDraft(formData, setFormData, isOpen, isProductCreation, variations.editingVariationId, hasChanged);
    const images = useProductFormImages(formData, setFormData, setLoading);

    useProductFormSync({ formData, setFormData });

    useEffect(() => {
        if (!isOpen) setVariationsInUse(new Set());
    }, [isOpen]);

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
        isOpen, product, initialData, initialTab, isQuickRegister, openAddVariationOnOpen,
        prevOpenRef, loadedProductIdRef, hasChanged, initialFormDataRef,
        setValidationErrors, setFormData, pricing, setActiveTab, variations
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
                const c = availableCategories.find(item => item.id === catId);
                if (!c) return;
                if (!c.parents || c.parents.length === 0) roots.add(c.name);
                else c.parents.forEach((pid: string) => find(pid));
            };
            formData.categoryIds.forEach(find);
            const allEnvs = Array.from(roots);
            
            setFormData(prev => {
                const next = { ...prev };
                let changed = false;
                if (allEnvs.length > 0 && JSON.stringify(prev.availableEnvironments) !== JSON.stringify(allEnvs)) {
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
        formData, setFormData, product, isRegisteredProduct, setValidationErrors,
        setActiveTab, variations, draft, setLoading, setSaveResult, hasChanged,
        onSuccess, onSave, onClose
    });

    const handleCloseWithAutoSave = useCallback(() => {
        if (hasChanged.current) {
            if (window.confirm("Você tem alterações não salvas. Deseja realmente sair e descartar?")) onClose();
        } else {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (saveResult) { setSaveResult(null); return; }
                if (isCategorySearchOpen) { setIsCategorySearchOpen(false); return; }
                if (isConversionModalOpen) { setIsConversionModalOpen(false); return; }
                if (variations.editingVariationId) {
                    const pendingVariationId = variations.pendingNewVariationIdRef.current;
                    if (pendingVariationId) {
                        setFormData(prev => ({
                            ...prev,
                            variations: prev.variations?.filter(v => v.id !== pendingVariationId && String(v.id) !== String(pendingVariationId))
                        }));
                        variations.pendingNewVariationIdRef.current = null;
                    }
                    variations.setEditingVariationId(null);
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
    }, [isOpen, isCategorySearchOpen, isConversionModalOpen, variations, saveResult, handleCloseWithAutoSave, handleSubmit]);

    const handleCategorySelect = useCallback((cid: string) => {
        const isSelected = formData.categoryIds?.includes(cid);
        const newIds = isSelected ? formData.categoryIds?.filter(id => id !== cid) : [...(formData.categoryIds || []), cid];
        let detectedEnv = formData.environment;
        if (newIds && newIds.length > 0) {
            const selectedCats = availableCategories.filter(c => newIds.includes(c.id));
            const rootSelected = selectedCats.find(c => !c.parents || c.parents.length === 0);
            if (rootSelected) detectedEnv = rootSelected.name;
            else {
                const firstCat = selectedCats[0];
                if (firstCat?.parents?.length > 0) {
                    const parentCat = availableCategories.find(c => c.id === firstCat.parents[0]);
                    if (parentCat) detectedEnv = parentCat.name;
                }
            }
        }
        setFormData(prev => ({ ...prev, categoryIds: newIds, environment: detectedEnv }));
    }, [formData.categoryIds, formData.environment, availableCategories]);

    const handleCloseVariationModal = useCallback(() => {
        const pendingVariationId = variations.pendingNewVariationIdRef.current;
        if (pendingVariationId) {
            setFormData(prev => ({
                ...prev,
                variations: prev.variations?.filter(v => v.id !== pendingVariationId && String(v.id) !== String(pendingVariationId))
            }));
            variations.pendingNewVariationIdRef.current = null;
        }
        variations.setEditingVariationId(null);
    }, [variations, setFormData]);

    const handleSaveVariation = useCallback((updatedVar: Variation) => {
        variations.pendingNewVariationIdRef.current = null;
        setFormData(prev => ({
            ...prev,
            variations: prev.variations?.map(v => (v.id === updatedVar.id || String(v.id) === String(updatedVar.id)) ? updatedVar : v)
        }));
        variations.setEditingVariationId(null);
    }, [variations, setFormData]);

    const handleConvertProduct = useCallback((updated: Partial<Product>) => {
        setFormData(updated);
        setActiveTab('variacoes');
        toast.success("Produto convertido! O código e estoque agora estão na primeira variação.");
    }, [setFormData, setActiveTab]);

    const formTabs = getProductFormTabs(isService);
    const currentTabIndex = formTabs.findIndex((t) => t.id === activeTab);
    const isLastStep = currentTabIndex === formTabs.length - 1;
    const handleNextStep = useCallback(() => {
        if (formTabs[currentTabIndex + 1]) setActiveTab(formTabs[currentTabIndex + 1].id);
    }, [currentTabIndex, formTabs]);

    return {
        activeTab, setActiveTab, activeEcommerceSubTab, setActiveEcommerceSubTab, loading,
        saveResult, setSaveResult, validationErrors, setValidationErrors, variationsInUse,
        isCategorySearchOpen, setIsCategorySearchOpen, suppliers, availableCategories,
        isConversionModalOpen, setIsConversionModalOpen, formData, setFormData,
        isService, isProductCreation, isDraftProduct, isRegisteredProduct, ecomStatus,
        pricing, ai, variations, draft, images, navigateToRequirementField, handleSubmit,
        handleCloseWithAutoSave, handleCategorySelect, handleCloseVariationModal,
        handleSaveVariation, handleConvertProduct, handleNextStep, isLastStep, formTabs
    };
}
