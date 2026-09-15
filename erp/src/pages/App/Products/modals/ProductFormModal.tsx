import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Product, { Variation } from "../../../types/product.type";
import Person from "../../../types/person.type";
import { saveProduct, getFullProduct } from '@/pages/utils/productService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { getNextSequentialProductCode } from '@/pages/utils/productService';
import { toast } from "react-toastify";
import { computeVariationName, ensureDefaultVariation, hasMissingRequiredAttributes, hasVariationAttribute } from '@/pages/utils/productVariationDefaults';

// Modular Components
import VariationFormModal from "./VariationFormModal";
import CategorySearchModal from "../CategorySearchModal";
import ProductConversionModal from "../components/modals/ProductConversionModal";
import { ProductFormHeader } from '../components/ProductFormHeader';
import { ProductSaveResultModal } from '../components/modals/ProductSaveResultModal';

// Modular Tab Components
import ProductGeneralTab from "../components/tabs/ProductGeneralTab";
import ProductVariationsTab from "../components/tabs/ProductVariationsTab";
import ProductEcommerceTab from "../components/tabs/ProductEcommerceTab";
import ProductInventoryTab from "../components/tabs/ProductInventoryTab";
import ProductFiscalTab from "../components/tabs/ProductFiscalTab";
import ProductTechnicalTab from "../components/tabs/ProductTechnicalTab";

// Constants & Initial Data
import { PRODUCT_ENVIRONMENT_OPTIONS } from '../productEnvironmentOptions';
import { INITIAL_PRODUCT_FORM_DATA } from '../productFormInitialData';
import { checkERPLegibility, checkEcomLegibility } from '../productLegibilityRules';

// Custom Hooks
import { useProductFormPricing } from '../hooks/useProductFormPricing';
import { useProductFormAi } from '../hooks/useProductFormAi';
import { useProductFormDraft } from '../hooks/useProductFormDraft';
import { useProductFormImages } from '../hooks/useProductFormImages';
import { useProductFormVariations } from '../hooks/useProductFormVariations';


interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product | null;
    initialData?: Partial<Product> | null;
    initialTab?: 'geral' | 'ambientes' | 'estoque' | 'variacoes' | 'ecommerce' | 'fiscal';
    openAddVariationOnOpen?: boolean;
    onSuccess?: (newProduct: Product) => void;
    isQuickRegister?: boolean;
}

const ProductFormModal = ({ isOpen, onClose, product, initialData, initialTab, openAddVariationOnOpen, onSuccess, isQuickRegister = false }: ProductFormModalProps) => {
    const [activeTab, setActiveTab] = useState<'geral' | 'ambientes' | 'estoque' | 'variacoes' | 'ecommerce' | 'technical' | 'fiscal'>('geral');
    const [activeEcommerceSubTab, setActiveEcommerceSubTab] = useState<'vitrine' | 'photos' | 'descriptions' | 'logistics' | 'seo'>('vitrine');
    const [loading, setLoading] = useState(false);
    const [saveResult, setSaveResult] = useState<{ erpLegible: boolean; ecomLegible: boolean; checksErp: any; checksEcom: any; product: Product } | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

    const [isCategorySearchOpen, setIsCategorySearchOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [availableCategories, setAvailableCategories] = useState<any[]>([]);
    const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);

    const [formData, setFormData] = useState<Partial<Product>>({
        ...INITIAL_PRODUCT_FORM_DATA,
        ...initialData
    });

    const hasChanged = useRef(false);
    const initialFormDataRef = useRef<string>("");
    const isService = formData.itemType === 'service';
    const isProductCreation = !product?.id;
    const isExistingRegisteredProduct = Boolean(product?.id && product.isDraft !== true && product.status !== 'draft');

    // Custom Hooks Integration
    const {
        discountPercent,
        discountFixed,
        setDiscountPercent,
        setDiscountFixed,
        handlePriceChange,
        handleDiscountPercentChange,
        handleDiscountFixedChange,
        handlePromoPriceFieldChange,
        initializeDiscounts
    } = useProductFormPricing(formData, setFormData);

    const ai = useProductFormAi(formData, setFormData, availableCategories, isQuickRegister, isOpen);

    const {
        editingVariationComboId,
        setEditingVariationComboId,
        editingVariationId,
        setEditingVariationId,
        pendingNewVariationIdRef,
        addVariation,
        removeVariation
    } = useProductFormVariations(formData, setFormData);

    const {
        isSavingDraft,
        saveDraftManually,
        canSaveDraft,
        getEnteredProductName
    } = useProductFormDraft(formData, setFormData, isOpen, isProductCreation, editingVariationId, hasChanged);

    const {
        isDraggingPhoto,
        setIsDraggingPhoto,
        removingPhoto,
        handleFileChange,
        removePhoto,
        handlePaste
    } = useProductFormImages(formData, setFormData, setLoading);

    const navigateToRequirementField = useCallback((fieldKey: string) => {
        const requirementMap: Record<string, { tab: 'geral' | 'ambientes' | 'estoque' | 'variacoes' | 'ecommerce' | 'technical' | 'fiscal'; fieldId: string }> = {
            description: { tab: 'geral', fieldId: 'field-product-description' },
            name: { tab: 'geral', fieldId: 'field-product-description' },
            code: { tab: 'geral', fieldId: 'field-product-code' },
            sku: { tab: 'geral', fieldId: 'field-product-code' },
            marketplaceTitle: { tab: 'geral', fieldId: 'field-marketplace-title' },
            title: { tab: 'geral', fieldId: 'field-marketplace-title' },
            categories: { tab: 'geral', fieldId: 'field-product-categories' },
            unitPrice: { tab: 'estoque', fieldId: 'field-unit-price' },
            supplier: { tab: 'estoque', fieldId: 'field-main-supplier' },
            mainSupplierId: { tab: 'estoque', fieldId: 'field-main-supplier' },
            stock: { tab: 'estoque', fieldId: 'field-stock' },
            costPrice: { tab: 'estoque', fieldId: 'field-cost-price' },
            images: { tab: 'ecommerce', fieldId: 'field-product-images' },
            dimensions: { tab: 'technical', fieldId: 'field-product-dimensions' },
            width: { tab: 'technical', fieldId: 'field-product-dimensions' },
            height: { tab: 'technical', fieldId: 'field-product-dimensions' },
            depth: { tab: 'technical', fieldId: 'field-product-dimensions' },
            ncm: { tab: 'fiscal', fieldId: 'field-product-ncm' }
        };

        const target = requirementMap[fieldKey];
        if (!target) return;

        setSaveResult(null);
        setActiveTab(target.tab);

        setTimeout(() => {
            const el = document.getElementById(target.fieldId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const input = el.querySelector('input, select, textarea') as HTMLElement;
                if (input && typeof input.focus === 'function') {
                    input.focus();
                }
                el.classList.add('ring-4', 'ring-amber-400', 'ring-offset-2', 'border-amber-500', 'animate-pulse', 'bg-amber-50/50', 'dark:bg-amber-950/20');
                setTimeout(() => {
                    el.classList.remove('ring-4', 'ring-amber-400', 'ring-offset-2', 'border-amber-500', 'animate-pulse', 'bg-amber-50/50', 'dark:bg-amber-950/20');
                }, 3000);
            }
        }, 150);
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

    useEffect(() => {
        if (!isOpen) return;

        hasChanged.current = false;
        initialFormDataRef.current = "";
        let isMounted = true;
        const loadFullData = async () => {
            if (product?.id) {
                const initialNext = ensureDefaultVariation({ ...INITIAL_PRODUCT_FORM_DATA, ...product, hasVariations: true });
                setFormData(initialNext);
                initializeDiscounts(product.unitPrice, product.promoPrice);

                const full = await getFullProduct(product.id);
                if (full && isMounted) {
                    const pendingVariations = isQuickRegister
                        ? (product.variations || []).filter(variation => !(full.variations || []).some(saved => saved.id === variation.id))
                        : [];
                    const nextFormData = ensureDefaultVariation({ ...full, variations: [...(full.variations || []), ...pendingVariations], hasVariations: true });
                    initialFormDataRef.current = JSON.stringify(nextFormData);
                    setFormData(nextFormData);
                    initializeDiscounts(full.unitPrice, full.promoPrice);
                }
            } else if (product) {
                const nextFormData = ensureDefaultVariation({ ...INITIAL_PRODUCT_FORM_DATA, ...product, hasVariations: true });
                initialFormDataRef.current = JSON.stringify(nextFormData);
                setFormData(nextFormData);
                initializeDiscounts(product.unitPrice, product.promoPrice);
            } else {
                const generatedId = crypto.randomUUID();
                const generatedSku = initialData?.code || await getNextSequentialProductCode();
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
                initialFormDataRef.current = JSON.stringify(nextFormData);
                setFormData(nextFormData);
                setDiscountFixed("");
                setDiscountPercent("");
            }
            setActiveTab((initialTab as any) || 'geral');
            if (openAddVariationOnOpen) {
                setTimeout(() => {
                    const firstVar = product?.variations?.[0];
                    if (firstVar && hasVariationAttribute(firstVar)) {
                        addVariation();
                    } else if (firstVar) {
                        setEditingVariationId(firstVar.id);
                    } else {
                        addVariation();
                    }
                }, 350);
            }
        };
        loadFullData();
        return () => { isMounted = false; };
    }, [product, initialData, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToPeople('suppliers', (data) => {
            setSuppliers(data);
        });

        const fetchCategories = async () => {
             try {
                const data = await fetchGroupsAndCategories();
                setAvailableCategories(data.categories);
             } catch (error) {
                console.error("Erro ao carregar categorias:", error);
             }
        };
        fetchCategories();
        return () => unsubscribe();
    }, [isOpen]);

    // Calculation for final purchase price
    useEffect(() => {
        let final = formData.costPrice || 0;
        if (formData.ipiPercent) {
            if (formData.ipiType === 'fixed') {
                final += formData.ipiPercent;
            } else {
                final += (formData.costPrice || 0) * (formData.ipiPercent / 100);
            }
        }
        if (formData.freightCost) {
            if (formData.freightType === 'percentage') {
                final += (formData.costPrice || 0) * (formData.freightCost / 100);
            } else {
                final += formData.freightCost;
            }
        }
        if (Math.abs(final - (formData.finalPurchasePrice || 0)) > 0.01) {
            setFormData(prev => ({ ...prev, finalPurchasePrice: final }));
        }
    }, [formData.costPrice, formData.ipiPercent, formData.ipiType, formData.freightCost, formData.freightType]);

    // Mantém, apenas no estado do formulário, todos os campos que a variação
    // declarou como herdados. A persistência continua acontecendo só no salvar.
    useEffect(() => {
        if (formData.variations?.length) {
            const nextVariations = formData.variations.map(v => {
                let updated = false;
                const newV = { ...v };
                const inherit = <K extends keyof typeof newV>(field: K, enabled: boolean, value: typeof newV[K]) => {
                    if (enabled && newV[field] !== value) {
                        newV[field] = value;
                        updated = true;
                    }
                };
                if (v.syncUnitPrice && v.unitPrice !== formData.unitPrice) {
                    newV.unitPrice = formData.unitPrice || 0;
                    updated = true;
                }
                if (v.syncCostPrice && v.costPrice !== formData.costPrice) {
                    newV.costPrice = formData.costPrice || 0;
                    updated = true;
                }
                if (v.syncPromoPrice !== false && v.promoPrice !== formData.promoPrice) {
                    newV.promoPrice = formData.promoPrice;
                    updated = true;
                }
                const variationName = computeVariationName(
                    formData.name || formData.description || '',
                    v.attributes || []
                ) || 'Variação';
                if (newV.name !== variationName) {
                    newV.name = variationName;
                    updated = true;
                }
                inherit('description', Boolean(v.syncDescription), formData.description);
                inherit('width', Boolean(v.syncWidth), formData.width);
                inherit('height', Boolean(v.syncHeight), formData.height);
                inherit('depth', Boolean(v.syncDepth), formData.depth);
                inherit('weight', Boolean(v.syncWeight), formData.weight);
                inherit('condition', Boolean(v.syncCondition), formData.condition);
                if (v.syncFiscal && JSON.stringify(v.fiscal || {}) !== JSON.stringify(formData.fiscal || {})) {
                    newV.fiscal = formData.fiscal ? { ...formData.fiscal } : undefined;
                    updated = true;
                }
                return updated ? newV : v;
            });
            if (JSON.stringify(nextVariations) !== JSON.stringify(formData.variations)) {
                setFormData(prev => ({ ...prev, variations: nextVariations }));
            }
        }
    }, [formData.name, formData.unitPrice, formData.costPrice, formData.promoPrice, formData.description, formData.width, formData.height, formData.depth, formData.weight, formData.condition, formData.fiscal]);

    // Sync variation aggregates (Children -> Parent)
    useEffect(() => {
        if (formData.hasVariations && formData.variations?.length) {
            const totalStock = formData.variations.reduce((acc, v) => acc + (v.stock || 0), 0);
            const varsWithCost = formData.variations.filter(v => (v.costPrice || 0) > 0);
            const avgCost = varsWithCost.length > 0
                ? varsWithCost.reduce((acc, v) => acc + (v.costPrice || 0), 0) / varsWithCost.length
                : 0;

            const shouldUpdateStock = formData.stock !== totalStock;
            const shouldUpdateCost = Math.abs((formData.costPrice || 0) - avgCost) > 0.01;

            if (shouldUpdateStock || shouldUpdateCost) {
                setFormData(prev => ({ 
                    ...prev, 
                    stock: totalStock,
                    costPrice: avgCost 
                }));
            }
        }
    }, [formData.variations, formData.hasVariations]);

    // Environment sync based on categoryIds
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

    const handleSubmit = async (showResult = true, saveAsDraft = false): Promise<boolean> => {
        const actualSaveAsDraft = isExistingRegisteredProduct ? false : saveAsDraft;

        if (!actualSaveAsDraft) {
            const errors: Record<string, boolean> = {};
            const enteredName = getEnteredProductName(formData);
            if (!enteredName) errors.name = true;
            const hasVars = Boolean(formData.hasVariations) && Array.isArray(formData.variations) && formData.variations.length > 0;
            if (!hasVars) errors.variations = true;
            if (!formData.categoryIds || formData.categoryIds.length === 0) errors.categoryIds = true;
            if (!formData.mainSupplierId && !formData.supplierId) errors.mainSupplierId = true;

            if (hasMissingRequiredAttributes(formData.variations || [])) {
                errors.variationsAttributes = true;
            }

            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                if (errors.name || errors.categoryIds) {
                    setActiveTab('geral');
                } else if (errors.mainSupplierId) {
                    setActiveTab('estoque');
                } else if (errors.variations || errors.variationsAttributes) {
                    setActiveTab('variacoes');
                }
                toast.error(errors.variations ? "Adicione pelo menos uma variação ao produto." : errors.variationsAttributes ? "Todas as variações devem conter pelo menos um atributo." : errors.mainSupplierId ? "Selecione um fornecedor." : "Preencha todos os campos obrigatórios.");
                return false;
            }
            setValidationErrors({});
        } else {
            const enteredName = getEnteredProductName(formData);
            if (!enteredName) return false;
        }

        setLoading(true);
        try {
            const enteredName = getEnteredProductName(formData);

            let targetCatalogStatus = formData.status;
            if (actualSaveAsDraft) {
                targetCatalogStatus = 'draft';
            } else if (isProductCreation && (!formData.status || formData.status === 'draft')) {
                // Ao cadastrar, o produto não deve ser publicado automaticamente no Catálogo Digital
                targetCatalogStatus = 'hidden';
            }

            const hasActiveVariations = Boolean(formData.hasVariations) && Array.isArray(formData.variations) && formData.variations.length > 0
                ? formData.variations.some(v => v.active !== false)
                : (formData.active !== undefined ? formData.active : true);

            const normalizedData = { 
                ...formData, 
                name: enteredName || formData.name || 'Produto',
                isDraft: actualSaveAsDraft,
                active: actualSaveAsDraft ? false : hasActiveVariations,
                status: targetCatalogStatus
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
                status: normalizedData.status
            }));
            hasChanged.current = false;
            
            if (isProductCreation && !actualSaveAsDraft) {
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
                onClose();
            }
            return true;
        } catch (error: any) {
            toast.error(`Erro ao salvar: ${error.message || "Erro desconhecido"}`);
            console.error(error);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        onClose();
    };

    const formTabs = ([
        { id: 'geral', label: 'Cadastro Geral' },
        !isService && { id: 'ecommerce', label: 'Fotos' },
        !isService && { id: 'technical', label: 'Informações Técnicas' },
        !isService && { id: 'estoque', label: 'Estoque e Precificação' },
        !isService && { id: 'variacoes', label: 'Variações' },
        { id: 'fiscal', label: 'Tributário / NF' },
    ] as any[]).filter(Boolean);

    const currentTabIndex = formTabs.findIndex((t) => t.id === activeTab);
    const isLastStep = currentTabIndex === formTabs.length - 1;
    const nextTabObj = formTabs[currentTabIndex + 1];

    if (!isOpen) return null;

    return createPortal(
        <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="product-form-title"
            onKeyDown={(e) => { if (e.key === 'Escape') handleCloseModal(); }}
            tabIndex={-1}
            className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden"
        >
            <button 
                type="button" 
                aria-label="Fechar formulário de produto" 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-default border-0 p-0 m-0 w-full h-full" 
                onClick={handleCloseModal} 
            />
            
            <div onPaste={handlePaste} className="relative bg-white dark:bg-slate-900 w-full h-full m-0 p-0 rounded-none shadow-none flex flex-col overflow-hidden animate-in fade-in duration-200 border-0">
                <ProductFormHeader
                    product={product}
                    formData={formData}
                    ecomStatus={ecomStatus}
                    isService={isService}
                    navigateToRequirementField={navigateToRequirementField}
                    handleCloseWithAutoSave={handleCloseModal}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    validationErrors={validationErrors}
                />

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {activeTab === 'geral' && (
                        <ProductGeneralTab
                            onOpenCategorySearch={() => setIsCategorySearchOpen(true)}
                            isService={isService}
                            formData={formData}
                            setFormData={setFormData}
                            availableCategories={availableCategories}
                            validationErrors={validationErrors}
                            isGeneratingCategory={ai.isGeneratingCategory}
                        />
                    )}

                    {!isService && activeTab === 'ecommerce' && (
                        <ProductEcommerceTab
                            formData={formData}
                            setFormData={setFormData}
                            activeEcommerceSubTab={activeEcommerceSubTab}
                            setActiveEcommerceSubTab={setActiveEcommerceSubTab}
                            isDraggingPhoto={isDraggingPhoto}
                            setIsDraggingPhoto={setIsDraggingPhoto}
                            handleFileChange={handleFileChange}
                            removingPhoto={removingPhoto}
                            removePhoto={removePhoto}
                            handleGenerateAIDescription={ai.handleGenerateAIDescription}
                            isGeneratingDescription={ai.isGeneratingDescription}
                            handleGenerateMarketplaceTitle={ai.handleGenerateMarketplaceTitle}
                            isGeneratingTitle={ai.isGeneratingTitle}
                        />
                    )}

                    {!isService && activeTab === 'technical' && (
                        <ProductTechnicalTab
                            formData={formData}
                            setFormData={setFormData}
                            handleImproveDescriptionWithAI={ai.handleImproveDescriptionWithAI}
                            isImprovingDescription={ai.isImprovingDescription}
                        />
                    )}

                    {!isService && activeTab === 'estoque' && (
                        <ProductInventoryTab
                            formData={formData}
                            setFormData={setFormData}
                            suppliers={suppliers}
                            discountPercent={discountPercent}
                            discountFixed={discountFixed}
                            setDiscountPercent={setDiscountPercent}
                            setDiscountFixed={setDiscountFixed}
                            handlePriceChange={handlePriceChange}
                            handleDiscountPercentChange={handleDiscountPercentChange}
                            handleDiscountFixedChange={handleDiscountFixedChange}
                            handlePromoPriceFieldChange={handlePromoPriceFieldChange}
                            validationErrors={validationErrors}
                            handleSuggestPrices={ai.handleSuggestPrices}
                            isSuggestingPrices={ai.isSuggestingPrices}
                            suggestPricesResults={ai.suggestPricesResults}
                        />
                    )}

                    {!isService && activeTab === 'variacoes' && (
                        <ProductVariationsTab
                            formData={formData}
                            setFormData={setFormData}
                            editingVariationComboId={editingVariationComboId}
                            setEditingVariationComboId={setEditingVariationComboId}
                            editingVariationId={editingVariationId}
                            setEditingVariationId={setEditingVariationId}
                            onEdit={(id) => setEditingVariationId(id)}
                            addVariation={addVariation}
                            removeVariation={removeVariation}
                        />
                    )}

                    {activeTab === 'fiscal' && (
                        <ProductFiscalTab
                            formData={formData}
                            setFormData={setFormData}
                            isNcmAutoEnabled={ai.isNcmAutoEnabled}
                            toggleNcmAuto={ai.toggleNcmAuto}
                            isGeneratingNCM={ai.isGeneratingNCM}
                        />
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {(!product || formData.isDraft) && (
                            <button
                                type="button"
                                onClick={() => saveDraftManually(formData)}
                                disabled={!canSaveDraft || loading || isSavingDraft}
                                className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer w-full md:w-auto justify-center"
                                title={!canSaveDraft ? "Informe o nome do produto para permitir salvar o rascunho" : "Salvar rascunho para continuar o cadastro posteriormente"}
                            >
                                {isSavingDraft ? (
                                    <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <i className="bi bi-bookmark-fill text-slate-500 dark:text-slate-400" />
                                )}
                                <span>Salvar rascunho</span>
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95 flex-1 md:flex-initial text-center cursor-pointer"
                        >
                            {product && !formData.isDraft ? "Descartar alterações" : "Cancelar"}
                        </button>

                        {!isLastStep ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (nextTabObj) setActiveTab(nextTabObj.id as any);
                                }}
                                className="px-6 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-xl w-full md:w-auto justify-center bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none"
                            >
                                <span>Próxima etapa</span>
                                <i className="bi bi-arrow-right text-sm"></i>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSubmit()}
                                disabled={loading || ai.isAiProcessing}
                                className="px-6 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xl w-full md:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none"
                            >
                                {(loading || ai.isAiProcessing) && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                <i className="bi bi-check-circle-fill"></i>
                                {ai.isAiProcessing ? "IA Processando..." : ((!product || formData.isDraft) ? "Cadastrar produto" : "Salvar alterações")}
                            </button>
                        )}
                    </div>
                </div>

                {editingVariationId && formData.variations?.some(v => v.id === editingVariationId || String(v.id) === String(editingVariationId)) && (
                    <VariationFormModal
                        isOpen={!!editingVariationId}
                        onClose={() => {
                            const pendingVariationId = pendingNewVariationIdRef.current;
                            if (pendingVariationId) {
                                setFormData(prev => ({
                                    ...prev,
                                    variations: prev.variations?.filter(v => v.id !== pendingVariationId && String(v.id) !== String(pendingVariationId))
                                }));
                                pendingNewVariationIdRef.current = null;
                            }
                            setEditingVariationId(null);
                        }}
                        parentId={formData.id}
                        parentProduct={formData as any}
                        variation={formData.variations?.find(v => v.id === editingVariationId || String(v.id) === String(editingVariationId)) || null}
                        onSave={(updatedVar) => {
                            pendingNewVariationIdRef.current = null;
                            setFormData(prev => ({
                                ...prev,
                                variations: prev.variations?.map(v => (v.id === updatedVar.id || String(v.id) === String(updatedVar.id)) ? updatedVar : v)
                            }));
                            setEditingVariationId(null);
                        }}
                    />
                )}

                {isCategorySearchOpen && (
                    <CategorySearchModal
                        isOpen={isCategorySearchOpen}
                        onClose={() => setIsCategorySearchOpen(false)}
                        categories={availableCategories}
                        selectedIds={formData.categoryIds || []}
                        onSelect={(cid) => {
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
                        }}
                    />
                )}
                
                {isConversionModalOpen && (
                    <ProductConversionModal
                        isOpen={isConversionModalOpen}
                        onClose={() => setIsConversionModalOpen(false)}
                        formData={formData}
                        onConvert={(updated) => {
                            setFormData(updated);
                            setActiveTab('variacoes');
                            toast.success("Produto convertido! O código e estoque agora estão na primeira variação.");
                        }}
                    />
                )}

                <ProductSaveResultModal
                    saveResult={saveResult}
                    onCloseModal={() => setSaveResult(null)}
                    onSuccess={onSuccess}
                    onCloseForm={onClose}
                    setFormData={setFormData}
                />
            </div>
        </div>,
        document.body
    );
};

export default ProductFormModal;
