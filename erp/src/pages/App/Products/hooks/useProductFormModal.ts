import { useState, useEffect, useCallback, useRef } from "react";
import Product, { Variation } from '@/pages/types/product.type';
import Person from '@/pages/types/person.type';
import { saveProduct, getFullProduct, getNextSequentialProductCode } from '@/pages/utils/productService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { toast } from "react-toastify";
import { ensureDefaultVariation, hasMissingRequiredAttributes, hasVariationAttribute, getIncompleteVariationAttributes } from '@/pages/utils/productVariationDefaults';
import { supabase } from '@/pages/utils/supabaseConfig';

// Initial Data & Rules
import { INITIAL_PRODUCT_FORM_DATA } from '../productFormInitialData';
import { checkERPLegibility, checkEcomLegibility } from '../productLegibilityRules';
import { scrollToRequirementField, ProductFormTabKey } from '../utils/productRequirementNavigation';
import { getProductFormTabs, isExistingRegisteredProduct } from '../modals/productFormTabs';

// Sub-hooks
import { useProductFormPricing } from './useProductFormPricing';
import { useProductFormAi } from './useProductFormAi';
import { useProductFormDraft } from './useProductFormDraft';
import { useProductFormImages } from './useProductFormImages';
import { useProductFormVariations } from './useProductFormVariations';
import { useProductFormSync } from './useProductFormSync';

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

    // Sub-hooks Integration
    const pricing = useProductFormPricing(formData, setFormData);
    const ai = useProductFormAi(formData, setFormData, availableCategories, isQuickRegister, isOpen);
    const variations = useProductFormVariations(formData, setFormData);
    const draft = useProductFormDraft(formData, setFormData, isOpen, isProductCreation, variations.editingVariationId, hasChanged);
    const images = useProductFormImages(formData, setFormData, setLoading);

    // Sincronização contínua de campos computados, herança e agregados
    useProductFormSync({ formData, setFormData });

    // Fetch variations usage
    useEffect(() => {
        if (!isOpen || !formData.variations || formData.variations.length === 0) {
            setVariationsInUse(new Set());
            return;
        }

        const variationIds = formData.variations.map(v => v.id).filter(Boolean);
        if (variationIds.length === 0) return;

        let isMounted = true;
        const checkUsage = async () => {
            try {
                const { data, error } = await supabase.rpc('get_variations_in_use', {
                    p_variation_ids: variationIds
                });
                
                if (error) {
                    console.warn('Falha na RPC get_variations_in_use (pode não estar criada ainda):', error);
                    return;
                }
                
                if (isMounted && data && Array.isArray(data)) {
                    setVariationsInUse(new Set(data));
                }
            } catch (err) {
                console.error('Erro ao buscar uso das variações:', err);
            }
        };

        checkUsage();

        return () => { isMounted = false; };
    }, [isOpen, formData.variations]);

    const navigateToRequirementField = useCallback((fieldKey: string) => {
        scrollToRequirementField(fieldKey, setActiveTab, () => setSaveResult(null));
    }, []);

    const ecomStatus = checkEcomLegibility(formData);

    // Redireciona serviço para tab geral se estiver em variações ou fotos
    useEffect(() => {
        if (isService && (activeTab === 'variacoes' || activeTab === 'ecommerce')) {
            setActiveTab('geral');
        }
    }, [isService, activeTab]);

    // Rastreia alterações no formulário
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

    // Carregamento de dados completos do produto
    useEffect(() => {
        if (!isOpen) {
            prevOpenRef.current = false;
            loadedProductIdRef.current = null;
            return;
        }

        const currentTargetId = product?.id || initialData?.code || 'new_product';
        const isJustOpened = !prevOpenRef.current;
        const isTargetChanged = loadedProductIdRef.current !== currentTargetId;

        if (!isJustOpened && !isTargetChanged) {
            return;
        }

        prevOpenRef.current = true;
        loadedProductIdRef.current = currentTargetId;
        hasChanged.current = false;
        initialFormDataRef.current = "";
        setValidationErrors({});
        let isMounted = true;
        const loadFullData = async () => {
            let resolvedFormData: Product | null = null;
            let targetVariationIdToOpen: string | null = null;

            if (product?.id) {
                const initialNext = ensureDefaultVariation({ ...INITIAL_PRODUCT_FORM_DATA, ...product, hasVariations: true });
                setFormData(initialNext);
                pricing.initializeDiscounts(product.unitPrice, product.promoPrice);

                const full = await getFullProduct(product.id);
                if (!isMounted) return;

                const baseProduct = full || product;
                const pendingVariations = isQuickRegister
                    ? (product.variations || []).filter(variation => !(baseProduct.variations || []).some(saved => saved.id === variation.id))
                    : [];

                const isDraftFromBase = Boolean(baseProduct.isDraft) || Boolean((baseProduct as any).is_draft) || baseProduct.status === 'draft';
                const nextFormData = ensureDefaultVariation({
                    ...baseProduct,
                    isDraft: isDraftFromBase,
                    variations: [...(baseProduct.variations || []), ...pendingVariations],
                    hasVariations: true
                });

                resolvedFormData = nextFormData;
                initialFormDataRef.current = JSON.stringify(nextFormData);
                setFormData(nextFormData);
                pricing.initializeDiscounts(nextFormData.unitPrice, nextFormData.promoPrice);

                if (openAddVariationOnOpen) {
                    if (pendingVariations.length > 0) {
                        targetVariationIdToOpen = pendingVariations[pendingVariations.length - 1].id;
                    }
                }
            } else if (product) {
                const nextFormData = ensureDefaultVariation({ ...INITIAL_PRODUCT_FORM_DATA, ...product, hasVariations: true });
                resolvedFormData = nextFormData;
                initialFormDataRef.current = JSON.stringify(nextFormData);
                setFormData(nextFormData);
                pricing.initializeDiscounts(product.unitPrice, product.promoPrice);
            } else {
                const generatedId = crypto.randomUUID();
                const generatedSku = initialData?.code || await getNextSequentialProductCode();
                if (!isMounted) return;

                const nextFormData = ensureDefaultVariation({
                    ...INITIAL_PRODUCT_FORM_DATA,
                    id: generatedId,
                    code: generatedSku,
                    name: "",
                    title: "",
                    description: "",
                    isDraft: true,
                    active: false,
                    ...initialData,
                    hasVariations: true
                });
                resolvedFormData = nextFormData as Product;
                initialFormDataRef.current = JSON.stringify(nextFormData);
                setFormData(nextFormData);
                pricing.setDiscountFixed("");
                pricing.setDiscountPercent("");
            }

            if (!isMounted) return;
            setActiveTab((initialTab as any) || 'geral');

            if (openAddVariationOnOpen) {
                if (targetVariationIdToOpen) {
                    variations.setEditingVariationId(targetVariationIdToOpen);
                } else {
                    const firstVar = resolvedFormData?.variations?.[0];
                    if (firstVar && hasVariationAttribute(firstVar)) {
                        variations.addVariation();
                    } else if (firstVar) {
                        variations.setEditingVariationId(firstVar.id);
                    } else {
                        variations.addVariation();
                    }
                }
            }
        };
        loadFullData();
        return () => { isMounted = false; };
    }, [product?.id, initialData?.code, isOpen]);

    // Fornecedores e Categorias
    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToPeople('suppliers', (data) => {
            setSuppliers(data);
        });

        const fetchCategories = async () => {
            try {
                const result = await fetchGroupsAndCategories();
                const categoriesList = Array.isArray(result?.categories) ? result.categories : [];
                const all: any[] = categoriesList.map((c: any) => ({
                    ...c,
                    isGroup: false
                }));
                setAvailableCategories(all);
            } catch (err) {
                console.error("Erro ao carregar categorias:", err);
                setAvailableCategories([]);
            }
        };
        fetchCategories();

        return () => {
            unsubscribe();
        };
    }, [isOpen]);

    // Sincronização de ambiente baseada em categorias
    useEffect(() => {
        if (formData.categoryIds?.length && availableCategories.length) {
            const roots = new Set<string>();
            const visited = new Set<string>();
            const find = (catId: string) => {
                if (visited.has(catId)) return;
                visited.add(catId);
                const c = availableCategories.find(item => item.id === catId);
                if (!c) return;
                if (!c.parents || c.parents.length === 0) {
                    roots.add(c.name);
                } else {
                    c.parents.forEach((pid: string) => find(pid));
                }
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

    // Submissão do formulário
    const handleSubmit = async (showResult = true, saveAsDraft = false): Promise<boolean> => {
        const actualSaveAsDraft = isRegisteredProduct ? false : saveAsDraft;

        if (!actualSaveAsDraft) {
            const errors: Record<string, boolean> = {};
            const enteredName = draft.getEnteredProductName(formData);
            if (!enteredName) errors.name = true;
            const hasVars = Boolean(formData.hasVariations) && Array.isArray(formData.variations) && formData.variations.length > 0;
            if (!hasVars) errors.variations = true;
            if (!formData.categoryIds || formData.categoryIds.length === 0) errors.categoryIds = true;
            if (!formData.mainSupplierId && !formData.supplierId) errors.mainSupplierId = true;

            if (hasMissingRequiredAttributes(formData.variations || [])) {
                errors.variationsAttributes = true;
            }

            // Validação de Preço de Venda (no produto pai ou em alguma variação)
            const hasParentPrice = formData.unitPrice !== undefined && 
                formData.unitPrice !== null && 
                !isNaN(Number(formData.unitPrice)) && 
                Number(formData.unitPrice) > 0;
            const hasVariationWithPrice = (formData.variations || []).some(v => 
                v.unitPrice !== undefined && v.unitPrice !== null && !isNaN(Number(v.unitPrice)) && Number(v.unitPrice) > 0
            );

            if (!hasParentPrice && !hasVariationWithPrice) {
                errors.unitPrice = true;
            }

            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                if (errors.name || errors.categoryIds) {
                    setActiveTab('geral');
                } else if (errors.unitPrice || errors.mainSupplierId) {
                    setActiveTab('estoque');
                } else if (errors.variations || errors.variationsAttributes) {
                    setActiveTab('variacoes');
                }

                if (errors.unitPrice) {
                    toast.warn("Por favor, informe o Preço de Venda do produto na aba Estoque e Precificação.");
                } else if (errors.variations) {
                    toast.error("Adicione pelo menos uma variação ao produto.");
                } else if (errors.variationsAttributes) {
                    const vars = formData.variations || [];
                    const varWithIncomplete = vars.find(v => getIncompleteVariationAttributes(v).length > 0) || vars.find(v => !hasVariationAttribute(v));
                    if (varWithIncomplete) {
                        variations.setEditingVariationId(varWithIncomplete.id);
                        const incomp = getIncompleteVariationAttributes(varWithIncomplete)[0];
                        if (incomp?.missingReason === 'missing_name') {
                            toast.warn("Selecione o tipo de atributo para a variação.");
                        } else if (incomp?.name) {
                            toast.warn(`O atributo "${incomp.name}" está sem valor definido. Para todo atributo adicionado, é obrigatório definir o valor.`);
                        } else {
                            toast.warn("É obrigatório escolher pelo menos um atributo e definir seu respectivo valor para a variação.");
                        }
                    } else {
                        toast.warn("É obrigatório escolher pelo menos um atributo e definir seu respectivo valor para cada variação.");
                    }
                } else if (errors.mainSupplierId) {
                    toast.error("Selecione um fornecedor.");
                } else {
                    toast.error("Preencha todos os campos obrigatórios.");
                }
                return false;
            }
            setValidationErrors({});
        } else {
            const enteredName = draft.getEnteredProductName(formData);
            if (!enteredName) return false;
        }

        const ecomVal = checkEcomLegibility(formData);
        if (formData.status === 'published' && !ecomVal.isLegible) {
            toast.error("Despublique o Catálogo antes de remover ou alterar um campo obrigatório.");
            return false;
        }

        setLoading(true);
        try {
            const enteredName = draft.getEnteredProductName(formData);

            let targetCatalogStatus: 'draft' | 'published' | 'hidden' = 'hidden';
            if (actualSaveAsDraft) {
                targetCatalogStatus = 'draft';
            } else if (isRegisteredProduct && product?.status === 'published' && ecomVal.isLegible) {
                targetCatalogStatus = 'published';
            } else {
                targetCatalogStatus = 'hidden';
            }

            // Ao concluir um rascunho, o canal ERP inicia ativo para o produto e variações
            const isCompletingDraft = !actualSaveAsDraft && !isRegisteredProduct;
            const erpActive = actualSaveAsDraft
                ? false
                : (isCompletingDraft ? true : formData.active !== false);

            const normalizedData = { 
                ...formData, 
                name: enteredName || formData.name || 'Produto',
                isDraft: actualSaveAsDraft,
                active: erpActive,
                status: targetCatalogStatus,
                variations: (formData.variations || []).map(v => ({
                    ...v,
                    active: actualSaveAsDraft ? false : (isCompletingDraft ? true : v.active),
                    status: actualSaveAsDraft 
                        ? 'draft' 
                        : (targetCatalogStatus === 'published' ? (v.status || 'published') : 'hidden')
                }))
            } as Product;

            const savedId = await saveProduct(normalizedData);
            if (savedId && typeof savedId === 'string') {
                normalizedData.id = savedId;
            }

            setFormData(prev => ({
                ...prev,
                id: normalizedData.id,
                isDraft: actualSaveAsDraft,
                active: normalizedData.active,
                status: normalizedData.status,
                variations: normalizedData.variations
            }));
            hasChanged.current = false;
            
            // Abre modal de canais tanto para produto novo quanto para conclusão de rascunho
            const isFinalizingDraft = !actualSaveAsDraft && !isRegisteredProduct;
            if (isFinalizingDraft) {
                const erpLeg = checkERPLegibility(normalizedData);
                const ecomLeg = checkEcomLegibility(normalizedData);
                setSaveResult({
                    erpLegible: erpLeg.isLegible,
                    ecomLegible: ecomLeg.isLegible,
                    checksErp: erpLeg.checks,
                    checksEcom: ecomLeg.checks,
                    product: normalizedData
                });
                toast.success("Produto cadastrado com sucesso! 🚀");
            } else {
                toast.success("Produto salvo com sucesso!");
                if (onSuccess) onSuccess(normalizedData);
                if (onSave) await onSave(normalizedData);
                onClose();
            }
            return true;
        } catch (error: any) {
            const rawMsg = String(error?.message || error || '');
            let friendlyMsg = rawMsg;

            if (rawMsg.includes('null value in column "price"') || rawMsg.includes('violates not-null constraint')) {
                friendlyMsg = 'Por favor, informe o Preço de Venda do produto na aba "Estoque e Precificação" para concluir o cadastro.';
                setActiveTab('estoque');
                setValidationErrors(prev => ({ ...prev, unitPrice: true }));
            } else if (rawMsg.includes('duplicate key') || rawMsg.includes('unique constraint') || rawMsg.includes('23505')) {
                friendlyMsg = 'Já existe um produto ou variação cadastrado com este código ou SKU. Um novo código foi sugerido.';
            }

            toast.warn(friendlyMsg);
            console.error('[useProductFormModal] Falha ao salvar produto:', error);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleCloseWithAutoSave = useCallback(() => {
        if (hasChanged.current) {
            if (window.confirm("Você tem alterações não salvas. Deseja realmente sair e descartar?")) {
                onClose();
            }
        } else {
            onClose();
        }
    }, [onClose]);

    // Atalhos globais do teclado
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
    }, [isOpen, isCategorySearchOpen, isConversionModalOpen, variations.editingVariationId, saveResult, handleCloseWithAutoSave, handleSubmit]);

    const handleCategorySelect = useCallback((cid: string) => {
        const isSelected = formData.categoryIds?.includes(cid);
        const newIds = isSelected 
            ? formData.categoryIds?.filter(id => id !== cid) 
            : [...(formData.categoryIds || []), cid];
        
        let detectedEnv = formData.environment;
        if (newIds && newIds.length > 0) {
            const selectedCats = availableCategories.filter(c => newIds.includes(c.id));
            const rootSelected = selectedCats.find(c => !c.parents || c.parents.length === 0);
            if (rootSelected) {
                detectedEnv = rootSelected.name;
            } else {
                const firstCat = selectedCats[0];
                if (firstCat && firstCat.parents && firstCat.parents.length > 0) {
                    const parentCat = availableCategories.find(c => c.id === firstCat.parents[0]);
                    if (parentCat) detectedEnv = parentCat.name;
                }
            }
        }

        setFormData(prev => ({ 
            ...prev, 
            categoryIds: newIds,
            environment: detectedEnv 
        }));
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
    const nextTabObj = formTabs[currentTabIndex + 1];

    const handleNextStep = useCallback(() => {
        if (nextTabObj) {
            setActiveTab(nextTabObj.id);
        }
    }, [nextTabObj, setActiveTab]);

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
        variations,
        draft,
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
        formTabs
    };
}
