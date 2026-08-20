import React, { useState, useEffect, useCallback, useRef } from "react";
import Product, { Variation, FiscalInfo } from "../../types/product.type";
import Person from "../../types/person.type";
import { saveProduct, getFullProduct, checkProductHasMoves, getNextSequentialProductCode, generateVariationSku } from '@/pages/utils/productService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { getSettings } from '@/pages/utils/settingsService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { toast } from "react-toastify";
import { compressImage, compressImageToFile } from '@/pages/utils/imageUtils';
import { uploadFile } from '@/pages/utils/storageService';
import { aiService } from '@/pages/utils/aiService';
import { supabase } from '@/pages/utils/supabaseConfig';

// Modular Components
import SmartInput from "../../../components/SmartInput";
import ComboItemSelector from "./components/ComboItemSelector";
import VariationFormModal from "./VariationFormModal";
import CategorySearchModal from "./CategorySearchModal";

// Modular Tab Components
import ProductGeneralTab from "./components/tabs/ProductGeneralTab";
import ProductVariationsTab from "./components/tabs/ProductVariationsTab";
import { generateProductCode } from '@/pages/utils/formatters';
import ProductEcommerceTab from "./components/tabs/ProductEcommerceTab";

import ProductInventoryTab from "./components/tabs/ProductInventoryTab";
import ProductFiscalTab from "./components/tabs/ProductFiscalTab";
import ProductTechnicalTab from "./components/tabs/ProductTechnicalTab";
import ProductConversionModal from "./components/ProductConversionModal";


// [x] Novo: Cadastro de Produtos e Serviços Simplificado (Manual)
interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product | null;
    initialData?: Partial<Product> | null;
    onSuccess?: (newProduct: Product) => void;
}

const VariationRow = React.memo(({ v, updateVariation, removeVariation, setFormData, isCombo, onEditCombo, onEdit, parentPrice, isEdit, hasPhotoError }: {
    v: Variation,
    updateVariation: (id: string, field: keyof Variation, value: any) => void,
    removeVariation: (id: string) => void,
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>,
    isCombo?: boolean,
    onEditCombo?: (id: string) => void,
    onEdit?: (id: string) => void,
    parentPrice?: number,
    isEdit?: boolean,
    hasPhotoError?: boolean
}) => {
    const varImage = v.images && v.images.length > 0 ? v.images[0] : null;

    return (
        <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
            <td className="px-6 py-4 cursor-pointer" onClick={() => onEdit?.(v.id)}>
                <div className={`relative h-10 w-10 rounded-xl border overflow-hidden flex items-center justify-center shrink-0 shadow-sm transition-all hover:scale-105 ${hasPhotoError || !varImage ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200 dark:border-slate-800'}`} title={!varImage ? "Foto pendente - obrigatória ao concluir o produto" : "Clique para editar"}>
                    {varImage ? (
                        <img src={varImage} alt="Variação" className="object-cover h-full w-full" />
                    ) : (
                            <div className="flex flex-col items-center justify-center text-red-500 bg-red-50 dark:bg-red-950/40 w-full h-full border border-red-300 dark:border-red-800 rounded-xl">
                                <i className="bi bi-camera-fill text-sm animate-pulse"></i>
                            </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 cursor-pointer" onClick={() => onEdit?.(v.id)}>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título</span>
                        {!varImage && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded-md border border-red-200 dark:border-red-800 flex items-center gap-1">
                                <i className="bi bi-exclamation-circle-fill text-[8px]"></i> Foto pendente
                            </span>
                        )}
                    </div>
                    <input
                        value={v.name || ''}
                        readOnly
                        className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 cursor-default font-sans"
                        placeholder="VARIAÇÃO GERADA"
                    />
                </div>
            </td>

            <td className="px-6 py-4">
                <input
                    type="number"
                    value={v.syncUnitPrice ? parentPrice : v.unitPrice}
                    disabled={v.syncUnitPrice}
                    onChange={(e) => updateVariation(v.id, 'unitPrice', parseFloat(e.target.value))}
                    className={`bg-transparent border-none outline-none text-sm font-black w-24 ${v.syncUnitPrice ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}
                />
            </td>
            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                {isCombo && (
                    <button
                        type="button"
                        onClick={() => onEditCombo?.(v.id)}
                        className={`p-1.5 rounded-xl transition-all ${v.comboItems?.length ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-purple-600'}`}
                        title="Configurar itens deste kit/combo"
                    >
                        <i className="bi bi-layers-fill text-lg"></i>
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onEdit?.(v.id)}
                    className="p-1.5 rounded-xl transition-all bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-600"
                    title="Editar detalhes da variação"
                >
                    <i className="bi bi-pencil-square text-lg"></i>
                </button>
                <button onClick={() => removeVariation(v.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <i className="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    );
});

const INITIAL_FORM_DATA: Partial<Product> = {
    description: "",
    code: "",
    unit: "UN",
    unitPrice: 0,
    costPrice: 0,
    finalPurchasePrice: 0,
    ipiPercent: 0,
    ipiType: 'percentage',
    freightCost: 0,
    freightType: 'fixed',
    stock: 0,
    minStock: 0,
    hasVariations: false,
    variations: [],
    images: [],
    marketplaceTitle: "",
    condition: 'novo',
    itemType: 'product',
    active: false,
    status: 'draft',
    isDraft: true,
    isCombo: false,
    comboItems: [],
    categoryIds: [],
    fiscal: {
        ncm: "",
        cest: "",
        ncmDescription: "",
        cfop: "5102",
        icmsPercent: 0
    },
    launchInitialStock: false,
    line: "",
    brand: "",
    colors: "",
    material: "",
    supplierRef: "",
    observations: "",
    noColors: false,
    environment: "",
    hasNoLine: false,
    noBrand: false
};

const ProductFormModal = ({ isOpen, onClose, product, initialData, onSuccess }: ProductFormModalProps) => {

    const [activeTab, setActiveTab] = useState<'geral' | 'ambientes' | 'estoque' | 'variacoes' | 'ecommerce' | 'fiscal'>('geral');
    const [activeEcommerceSubTab, setActiveEcommerceSubTab] = useState<'vitrine' | 'photos' | 'descriptions' | 'logistics' | 'seo'>('vitrine');
    const [loading, setLoading] = useState(false);
    // Estado separado para o auto-save silencioso (não mostra spinner no botão)
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const isSavingDraftRef = useRef(false);
    const [isGeneratingCategory, setIsGeneratingCategory] = useState(false);
    const [isGeneratingComboName, setIsGeneratingComboName] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isGeneratingNCM, setIsGeneratingNCM] = useState(false);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [isImprovingDescription, setIsImprovingDescription] = useState(false);
    const [isSuggestingPrices, setIsSuggestingPrices] = useState(false);
    const [suggestPricesResults, setSuggestPricesResults] = useState<{ low: any, medium: any, high: any } | null>(null);
    const [removingPhoto, setRemovingPhoto] = useState<string | null>(null);
    const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
    const [saveResult, setSaveResult] = useState<{ erpLegible: boolean; ecomLegible: boolean; checksErp: any; checksEcom: any; product: Product } | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

    const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
    const [editingVariationComboId, setEditingVariationComboId] = useState<string | null>(null);
    const [editingVariationId, setEditingVariationId] = useState<string | null>(null);
    const [isCategorySearchOpen, setIsCategorySearchOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [availableCategories, setAvailableCategories] = useState<any[]>([]);
    const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);

    const [formData, setFormData] = useState<Partial<Product>>({
        ...INITIAL_FORM_DATA,
        ...initialData
    });

    const [discountPercent, setDiscountPercent] = useState('');
    const [discountFixed, setDiscountFixed] = useState('');

    const parsePrice = useCallback((val: any): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const clean = String(val).replace(/[^\d.,]/g, '').replace(',', '.');
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : parsed;
    }, []);

    // Atualizar descontos ao alterar preço original
    const handlePriceChange = useCallback((newPrice: string | number) => {
        const orig = parsePrice(newPrice);
        setFormData(prev => {
            const next = { ...prev, unitPrice: orig };
            if (orig <= 0) {
                setDiscountPercent("");
                setDiscountFixed("");
                next.promoPrice = undefined;
                return next;
            }

            if (discountPercent) {
                const pct = parseFloat(discountPercent);
                if (!isNaN(pct)) {
                    const fixed = orig * (pct / 100);
                    setDiscountFixed(fixed.toFixed(2));
                    const promo = orig - fixed;
                    next.promoPrice = promo > 0 ? Number(promo.toFixed(2)) : 0;
                }
            } else if (prev.promoPrice && prev.promoPrice < orig) {
                const fixed = orig - prev.promoPrice;
                const pct = (fixed / orig) * 100;
                setDiscountFixed(fixed.toFixed(2));
                setDiscountPercent(pct.toFixed(1));
            }
            return next;
        });
    }, [discountPercent, parsePrice]);

    // Quando muda o desconto percentual (%)
    const handleDiscountPercentChange = useCallback((valStr: string) => {
        setDiscountPercent(valStr);
        setFormData(prev => {
            const orig = prev.unitPrice || 0;
            if (orig <= 0 || valStr === "") {
                setDiscountFixed("");
                return { ...prev, promoPrice: undefined };
            }

            const pct = parseFloat(valStr);
            if (isNaN(pct) || pct < 0) {
                setDiscountFixed("");
                return { ...prev, promoPrice: undefined };
            }

            const fixed = orig * (pct / 100);
            setDiscountFixed(fixed.toFixed(2));
            const promo = orig - fixed;
            return { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0 };
        });
    }, []);

    // Quando muda o desconto fixo (R$)
    const handleDiscountFixedChange = useCallback((valStr: string | number) => {
        const fixed = parsePrice(valStr);
        setDiscountFixed(String(valStr));
        setFormData(prev => {
            const orig = prev.unitPrice || 0;
            if (orig <= 0 || !valStr || fixed <= 0) {
                setDiscountPercent("");
                return { ...prev, promoPrice: undefined };
            }

            const pct = (fixed / orig) * 100;
            setDiscountPercent(pct.toFixed(1));
            const promo = orig - fixed;
            return { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0 };
        });
    }, [parsePrice]);

    // Quando muda o preço promocional final (R$)
    const handlePromoPriceFieldChange = useCallback((valStr: string | number) => {
        const promo = parsePrice(valStr);
        setFormData(prev => {
            const orig = prev.unitPrice || 0;
            if (orig > 0 && promo > 0 && promo < orig) {
                const fixed = orig - promo;
                const pct = (fixed / orig) * 100;
                setDiscountFixed(fixed.toFixed(2));
                setDiscountPercent(pct.toFixed(1));
            } else if (promo <= 0) {
                setDiscountFixed("");
                setDiscountPercent("");
            }
            return { ...prev, promoPrice: promo > 0 ? promo : undefined };
        });
    }, [parsePrice]);

    const checkERPLegibility = useCallback((data: Partial<Product>) => {
        const errors: string[] = [];
        const hasVars = Boolean(data.hasVariations) || (Array.isArray(data.variations) && data.variations.length > 0);

        if (!data.description || data.description.trim().length < 2) {
            errors.push("Nome do Produto (Interno) deve ter pelo menos 2 caracteres.");
        }
        if (!hasVars) {
            if (!data.unitPrice || data.unitPrice <= 0) {
                errors.push("Preço de Venda deve ser maior que zero.");
            }
            if (!data.costPrice || data.costPrice <= 0) {
                errors.push("Preço de Custo Final deve ser maior que zero.");
            }
            if (data.promoPrice !== undefined && data.promoPrice !== null && !isNaN(data.promoPrice) && data.promoPrice > 0) {
                const up = data.unitPrice || 0;
                if (data.promoPrice >= up) {
                    errors.push("O preço promocional deve ser menor que o preço de venda.");
                }
            }
        } else {
            if (!data.variations || data.variations.length === 0) {
                errors.push("Adicione pelo menos uma variação para o produto.");
            }
        }
        if (!data.categoryIds || data.categoryIds.length === 0) {
            errors.push("Pelo menos uma categoria deve ser selecionada.");
        }
        if (!data.mainSupplierId) {
            errors.push("Fornecedor Principal é obrigatório.");
        }

        return {
            isLegible: errors.length === 0,
            errors,
            checks: {
                description: !!data.description && data.description.trim().length >= 2,
                unitPrice: hasVars ? (data.variations && data.variations.length > 0) : (!!data.unitPrice && data.unitPrice > 0),
                categories: !!data.categoryIds && data.categoryIds.length > 0,
                supplier: !!data.mainSupplierId,
                costPrice: hasVars ? true : (!!data.costPrice && data.costPrice > 0)
            }
        };
    }, []);

    const checkEcomLegibility = useCallback((data: Partial<Product>) => {
        const errors: string[] = [];
        const hasVars = Boolean(data.hasVariations) || (Array.isArray(data.variations) && data.variations.length > 0);
        const catalogTitle = data.title || data.marketplaceTitle;
        if (!catalogTitle || catalogTitle.trim().length < 2) {
            errors.push("Título do Produto (E-commerce) deve ter pelo menos 2 caracteres.");
        }
        if (!hasVars && (!data.unitPrice || data.unitPrice <= 0)) {
            errors.push("Preço de Venda deve ser maior que zero.");
        }
        if (!data.categoryIds || data.categoryIds.length === 0) {
            errors.push("Pelo menos uma categoria deve ser selecionada.");
        }
        if (!data.images || data.images.length === 0) {
            errors.push("Pelo menos uma foto deve ser adicionada.");
        }
        const isService = data.itemType === 'service';
        if (!isService) {
            if (!data.width || Number(data.width) <= 0) {
                errors.push("Largura deve ser maior que zero.");
            }
            if (!data.height || Number(data.height) <= 0) {
                errors.push("Altura deve ser maior que zero.");
            }
            if (!data.depth || Number(data.depth) <= 0) {
                errors.push("Profundidade deve ser maior que zero.");
            }
        }
        
        if (data.promoPrice !== undefined && data.promoPrice !== null && !isNaN(data.promoPrice) && data.promoPrice > 0) {
            const up = data.unitPrice || 0;
            if (data.promoPrice >= up) {
                errors.push("O preço promocional deve ser menor que o preço de venda.");
            }
        }

        return {
            isLegible: errors.length === 0,
            errors,
            checks: {
                marketplaceTitle: !!catalogTitle && catalogTitle.trim().length >= 2,
                unitPrice: !!data.unitPrice && data.unitPrice > 0,
                categories: !!data.categoryIds && data.categoryIds.length > 0,
                images: !!data.images && data.images.length > 0,
                dimensions: isService || (!!data.width && Number(data.width) > 0 && !!data.height && Number(data.height) > 0 && !!data.depth && Number(data.depth) > 0)
            }
        };
    }, []);

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

    const erpStatus = checkERPLegibility(formData);
    const ecomStatus = checkEcomLegibility(formData);
    const hasProductName = Boolean((formData.name || formData.description || '').trim());

    const hasChanged = useRef(false);
    const initialFormDataRef = useRef<string>("");

    const isService = formData.itemType === 'service';

    // Reset tab when switching type to service (tabs variacoes/ecommerce are unavailable)
    useEffect(() => {
        if (isService && (activeTab === 'variacoes' || activeTab === 'ecommerce')) {
            setActiveTab('geral');
        }
    }, [isService, activeTab]);

    // Detect changes
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
                const full = await getFullProduct(product.id);
                if (full && isMounted) {
                    const hasVars = Boolean(full.hasVariations) || (Array.isArray(full.variations) && full.variations.length > 0);
                    const nextFormData = { ...full, hasVariations: hasVars };
                    initialFormDataRef.current = JSON.stringify(nextFormData);
                    setFormData(nextFormData);
                    // Inicializar descontos
                    const orig = full.unitPrice || 0;
                    const promo = full.promoPrice || 0;
                    if (orig > 0 && promo > 0 && promo < orig) {
                        const diff = orig - promo;
                        setDiscountFixed(diff.toFixed(2));
                        setDiscountPercent(((diff / orig) * 100).toFixed(1));
                    } else {
                        setDiscountFixed("");
                        setDiscountPercent("");
                    }
                }
            } else if (product) {
                const hasVars = Boolean(product.hasVariations) || (Array.isArray(product.variations) && product.variations.length > 0);
                const nextFormData = { ...INITIAL_FORM_DATA, ...product, hasVariations: hasVars };
                initialFormDataRef.current = JSON.stringify(nextFormData);
                setFormData(nextFormData);
                // Inicializar descontos
                const orig = product.unitPrice || 0;
                const promo = product.promoPrice || 0;
                if (orig > 0 && promo > 0 && promo < orig) {
                    const diff = orig - promo;
                    setDiscountFixed(diff.toFixed(2));
                    setDiscountPercent(((diff / orig) * 100).toFixed(1));
                } else {
                    setDiscountFixed("");
                    setDiscountPercent("");
                }
            } else {
                // If creating new, start with INITIAL_FORM_DATA then apply initialData, and auto-generate ID and 6-digit SKU (code)
                const generatedId = crypto.randomUUID();
                const generatedSku = await getNextSequentialProductCode();
                const nextFormData = {
                    ...INITIAL_FORM_DATA,
                    id: generatedId,
                    code: generatedSku,
                    name: "",
                    title: "",
                    description: "",
                    isDraft: true,
                    active: false,
                    ...initialData
                };
                initialFormDataRef.current = JSON.stringify(nextFormData);
                setFormData(nextFormData);
                setDiscountFixed("");
                setDiscountPercent("");
            }
            setActiveTab('geral');
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

    // Effect for calculating final purchase price
    useEffect(() => {
        let final = formData.costPrice || 0;
        
        // IPI Calculation
        if (formData.ipiPercent) {
            if (formData.ipiType === 'fixed') {
                final += formData.ipiPercent;
            } else {
                final += (formData.costPrice || 0) * (formData.ipiPercent / 100);
            }
        }
        
        // Freight Calculation
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

    // Sync variation prices/costs/promo (Parent -> Children)
    useEffect(() => {
        if (formData.variations?.length) {
            const nextVariations = formData.variations.map(v => {
                let updated = false;
                const newV = { ...v };
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
                return updated ? newV : v;
            });
            if (JSON.stringify(nextVariations) !== JSON.stringify(formData.variations)) {
                setFormData(prev => ({ ...prev, variations: nextVariations }));
            }
        }
    }, [formData.unitPrice, formData.costPrice, formData.promoPrice]);

    // Sync variation aggregates (Children -> Parent)
    useEffect(() => {
        if (formData.hasVariations && formData.variations?.length) {
            const totalStock = formData.variations.reduce((acc, v) => acc + (v.stock || 0), 0);
            
            // Average cost calculation (only for variations with cost > 0)
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

    // Sincronizar ambientes baseados nos categoryIds selecionados (Global)
    useEffect(() => {
        if (formData.categoryIds?.length && availableCategories.length) {
            const FIXED_ENVIRONMENTS = ["SALA DE JANTAR", "SALA DE ESTAR", "COZINHA", "QUARTO", "LAVANDERIA", "BANHEIRO", "LAVANDEIRA", "ESCRITORIO", "ESCRITÓRIO", "VARANDA", "ÁREA GOURMET", "GARAGEM"];
            
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent | { files: File[] }) => {
        let files: File[] = [];
        if ('files' in e && Array.isArray((e as any).files)) {
            files = (e as any).files;
        } else if ('target' in e && (e.target as HTMLInputElement).files) {
            files = Array.from((e.target as HTMLInputElement).files || []);
        } else if ('dataTransfer' in e && e.dataTransfer.files) {
            files = Array.from(e.dataTransfer.files);
        }

        if (files.length === 0) return;

        const MAX_PHOTOS = 15;
        const currentCount = (formData.images || []).length;

        if (currentCount >= MAX_PHOTOS) {
            toast.warning(`Limite máximo de ${MAX_PHOTOS} fotos atingido!`);
            return;
        }

        const availableSlots = MAX_PHOTOS - currentCount;
        let filesToProcess = files;

        if (files.length > availableSlots) {
            toast.info(`Apenas as primeiras ${availableSlots} foto(s) serão adicionadas (limite máximo de ${MAX_PHOTOS} fotos).`);
            filesToProcess = files.slice(0, availableSlots);
        }

        setLoading(true);
        try {
            const uploadPromises = filesToProcess.map(async (file) => {
                const compressed = await compressImageToFile(file, { maxMB: 0.1, maxWidth: 1200 });
                const fileExt = file.name.split('.').pop() || 'jpg';
                const fileName = `${crypto.randomUUID()}_${Date.now()}.${fileExt}`;
                const path = `products/${fileName}`;
                return uploadFile(compressed, path);
            });

            const urls = await Promise.all(uploadPromises);
            setFormData(prev => ({
                ...prev,
                images: [...(prev.images || []), ...urls]
            }));
            toast.success(`${urls.length} foto(s) otimizada(s) e enviada(s) com sucesso!`);
        } catch (error) {
            toast.error("Erro no upload e otimização das imagens.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const removePhoto = (url: string) => {
        setRemovingPhoto(url);
        // Em um sistema real, deletaríamos do Storage aqui. 
        // Para este MVP, apenas removemos do array de estado do produto.
        setFormData(prev => ({
            ...prev,
            images: prev.images?.filter(i => i !== url)
        }));
        setRemovingPhoto(null);
        toast.info("Foto removida localmente");
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
            const imageFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
            if (imageFiles.length > 0) {
                e.preventDefault();
                await handleFileChange({ files: imageFiles } as any);
            }
        }
    };

    const handleGenerateCategory = async () => {
        if (!formData.description) return toast.warning("Digite o título para sugerir categoria");
        setIsGeneratingCategory(true);
        try {
            const suggestion = await aiService.suggestCategory(formData.description, availableCategories.map(c => c.name));
            const found = availableCategories.find(c => c.name.toLowerCase() === suggestion.toLowerCase());
            if (found) {
                setFormData(prev => ({ ...prev, categoryIds: [...(prev.categoryIds || []), found.id] }));
                toast.success(`Sugerido: ${found.name}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingCategory(false);
        }
    };

    const handleGenerateComboName = async () => {
        if (!formData.comboItems?.length) return toast.warning("Adicione itens ao combo primeiro");
        setIsGeneratingComboName(true);
        try {
            const items = formData.comboItems.map(i => `${i.quantity}x ${i.description}`).join(', ');
            const name = await aiService.generateComboName(items);
            setFormData(prev => ({ ...prev, description: name }));
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingComboName(false);
        }
    };

    const handleGenerateAIDescription = async (type: 'whatsapp' | 'ecommerce') => {
        if (!formData.description) return toast.warning("O produto precisa de um título");
        setIsGeneratingDescription(true);
        try {
            const desc = await aiService.generateProductDescription({
                title: formData.description,
                material: formData.material,
                dimensions: `${formData.width}x${formData.height}x${formData.depth}`,
                brand: formData.brand,
                line: formData.line,
                type
            });
            if (type === 'whatsapp') setFormData(prev => ({ ...prev, whatsappDescription: desc }));
            else setFormData(prev => ({ ...prev, ecommerceDescription: desc }));
            toast.success("Descrição gerada com IA!");
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleGenerateMarketplaceTitle = async () => {
        if (!formData.description) return toast.warning("O produto precisa de um título base");
        setIsGeneratingTitle(true);
        try {
            const { title } = await aiService.generateMarketplaceTitle({
                description: formData.description,
                material: formData.material
            });
            setFormData(prev => ({ ...prev, title, marketplaceTitle: title }));
            toast.success("Título para marketplace gerado!");
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingTitle(false);
        }
    };

    const [isFillingFiscalWithAI, setIsFillingFiscalWithAI] = useState(false);

    const handleAutoFillFiscalWithAI = async () => {
        const title = (formData.name || formData.description || '').trim();
        if (!title) {
            return toast.warning("Informe o nome ou título do produto para preenchimento fiscal.");
        }

        setIsFillingFiscalWithAI(true);
        try {
            const settings = getSettings();
            const catName = availableCategories.find(c => formData.categoryIds?.includes(c.id))?.name || formData.category || '';
            
            const fiscalData = await aiService.generateFiscalData({
                title,
                description: formData.description || formData.ecommerceDescription || '',
                material: formData.material || '',
                category: catName,
                companyName: settings.companyName || "Móveis Morante",
                companyAddress: settings.companyAddress || "Curitiba - PR",
                companyCnpj: settings.companyCnpj || ""
            });

            setFormData(prev => ({
                ...prev,
                fiscal: {
                    ...(prev.fiscal || {}),
                    ncm: fiscalData.ncm,
                    cest: fiscalData.cest,
                    ncmDescription: fiscalData.ncmDescription,
                    cfop: fiscalData.cfop,
                    cst: fiscalData.cst,
                    icmsPercent: fiscalData.icmsPercent,
                    origem: fiscalData.origem,
                    pisCst: fiscalData.pisCst,
                    cofinsCst: fiscalData.cofinsCst
                }
            }));

            toast.success(`Dados fiscais preenchidos com IA! NCM: ${fiscalData.ncm}, CFOP: ${fiscalData.cfop}, CSOSN: ${fiscalData.cst}`);
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || "Erro ao preencher dados fiscais com IA.");
        } finally {
            setIsFillingFiscalWithAI(false);
        }
    };

    const handleGenerateNCM = async () => {
        if (!formData.description) return toast.warning("Título necessário para buscar NCM");
        setIsGeneratingNCM(true);
        try {
            const { ncm, description } = await aiService.findNCM(formData.description, formData.material || '');
            setFormData(prev => ({
                ...prev,
                fiscal: { ...prev.fiscal!, ncm, ncmDescription: description }
            }));
            toast.success(`NCM Encontrado: ${ncm}`);
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingNCM(false);
        }
    };

    const handleImproveDescriptionWithAI = async () => {
        // Validação de pré-requisitos
        const nome = (formData.name || formData.description || '').trim();
        const temMedida = Number(formData.width) > 0 || Number(formData.height) > 0 || Number(formData.depth) > 0;
        const temCategoria = formData.categoryIds && formData.categoryIds.length > 0;

        if (!nome) {
            return toast.warning('Preencha o nome do produto antes de aperfeiçoar a descrição.', { icon: '📝' });
        }
        if (!temMedida) {
            return toast.warning('Informe pelo menos uma medida (Altura, Largura ou Profundidade) antes de aperfeiçoar.', { icon: '📐' });
        }
        if (!temCategoria) {
            return toast.warning('Selecione pelo menos uma categoria antes de aperfeiçoar a descrição.', { icon: '🏷️' });
        }

        setIsImprovingDescription(true);
        try {
            const result = await aiService.improveProductDescription({
                currentDescription: formData.description || "",
                title: formData.name || "",
                material: formData.material,
                brand: formData.brand,
                line: formData.line,
                width: formData.width,
                height: formData.height,
                depth: formData.depth,
                weight: formData.weight
            });

            setFormData(prev => ({
                ...prev,
                description: result.improvedDescription
            }));
            toast.success("Descrição aperfeiçoada com sucesso! ✨");
        } catch (error: any) {
            toast.error(error.message || "Erro ao aperfeiçoar descrição");
        } finally {
            setIsImprovingDescription(false);
        }
    };

    const handleSuggestPrices = async () => {
        if (!formData.description) return toast.warning("O produto precisa de um título");
        if (!formData.finalPurchasePrice || formData.finalPurchasePrice <= 0) 
            return toast.warning("Preço de custo final é necessário para sugerir preços");
        
        setIsSuggestingPrices(true);
        try {
            const suggestions = await aiService.suggestPrices({
                description: formData.description,
                costPrice: formData.finalPurchasePrice,
                material: formData.material
            });

            // Calculate margins locally if not provided by AI
            const processedSuggestions = { ...suggestions };
            (Object.keys(processedSuggestions) as Array<keyof typeof processedSuggestions>).forEach(tier => {
                if (processedSuggestions[tier] && !processedSuggestions[tier].margin) {
                    const price = processedSuggestions[tier].price;
                    const cost = formData.finalPurchasePrice || 0;
                    if (cost > 0) {
                        processedSuggestions[tier].margin = Math.round(((price / cost) - 1) * 100);
                    }
                }
            });

            setSuggestPricesResults(processedSuggestions);
            toast.info("Sugestões de preço geradas!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao sugerir preços");
        } finally {
            setIsSuggestingPrices(false);
        }
    };

    const handleFieldChange = (field: keyof Product, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        hasChanged.current = true;
    };

    const handleSaveVariation = (updatedVar: Variation) => {
        const isDuplicate = (formData.variations || []).some(v => v.id !== updatedVar.id && v.sku?.toUpperCase() === updatedVar.sku?.toUpperCase());
        if (isDuplicate) {
            toast.error(`O SKU "${updatedVar.sku}" já está em uso em outra variação.`);
            return;
        }

        setFormData(prev => ({
            ...prev,
            variations: (prev.variations || []).map(v => v.id === updatedVar.id ? updatedVar : v)
        }));
        setEditingVariationId(null);
    };

    const updateVariation = (id: string, field: keyof Variation, value: any) => {
        setFormData(prev => ({
            ...prev,
            variations: prev.variations?.map(v => v.id === id ? { ...v, [field]: value } : v)
        }));
    };

    const addVariation = () => {
        const baseName = formData.name || formData.description || "NOVA VARIAÇÃO";
        const currentCount = (formData.variations || []).length;
        const parentCode = formData.code || '000000';
        const newSku = generateVariationSku(parentCode, currentCount);

        const newVar: Variation = {
            id: crypto.randomUUID(),
            name: baseName,
            sku: newSku,
            unitPrice: formData.unitPrice || 0,
            costPrice: formData.costPrice || 0,
            stock: 0,
            images: [],
            active: true,
            syncUnitPrice: true,
            syncPromoPrice: true,
            syncCostPrice: true,
            syncDescription: true,
            syncDimensions: true,
            syncWidth: true,
            syncHeight: true,
            syncDepth: true,
            syncWeight: true,
            syncIpi: true,
            syncFreight: true,
            attributes: [],
            comboItems: []
        };
        setFormData(prev => ({ ...prev, variations: [...(prev.variations || []), newVar], hasVariations: true }));
        setEditingVariationId(newVar.id);
    };

    const removeVariation = async (id: string) => {
        // Se o produto já existe no banco, verifica se a variação tem movimentações
        if (formData.id) {
            try {
                const hasMoves = await checkProductHasMoves(formData.id, id);
                if (hasMoves) {
                    toast.error("Esta variação possui movimentações de estoque vinculadas e não pode ser removida para preservar o histórico.");
                    return;
                }
            } catch (error) {
                console.error("Erro ao verificar movimentações da variação:", error);
            }
        }

        setFormData(prev => {
            const filtered = prev.variations?.filter(v => v.id !== id);
            return {
                ...prev,
                variations: filtered,
                hasVariations: filtered && filtered.length > 0
            };
        });
    };

    const generateBulkVariations = (options: { name: string, values: string[], showName: boolean }[]) => {
        setIsGeneratingBulk(true);
        setTimeout(() => {
            const attributes = options.filter(o => o.name && o.values.length > 0);
            if (attributes.length === 0) {
                setIsGeneratingBulk(false);
                return;
            }

            // Generate Cartesian Product
            let combinations: any[] = [{}];

            attributes.forEach(attr => {
                const newCombinations: any[] = [];
                combinations.forEach(combo => {
                    attr.values.forEach(val => {
                        newCombinations.push({ 
                            ...combo, 
                            [attr.name]: { value: val, showName: attr.showName } 
                        });
                    });
                });
                combinations = newCombinations;
            });

            const newVars: Variation[] = combinations.map((combo, idx) => {
                // [FIX] Use the original order from 'attributes' array instead of alphabetical sort
                const attributeValues = attributes.map(attr => {
                    const attrData = combo[attr.name];
                    return String(attrData.value);
                }).join(' ');
                
                const parentName = formData.name || formData.description || '';
                const name = [parentName, attributeValues].filter(Boolean).join(' ');
                const parentCode = formData.code || '000000';
                const finalSku = generateVariationSku(parentCode, idx);
                
                return {
                    id: crypto.randomUUID(),
                    name,
                    sku: finalSku,
                    unitPrice: formData.unitPrice || 0,
                    costPrice: formData.costPrice || 0,
                    stock: 0,
                    syncUnitPrice: true,
                    syncPromoPrice: true,
                    syncCostPrice: true,
                    syncDescription: true,
                    images: [],
                    active: true,
                    // Store attributes in the correct order as well
                    attributes: attributes.map(attr => ({ 
                        name: attr.name, 
                        value: String(combo[attr.name].value),
                        showName: combo[attr.name].showName
                    })),
                    comboItems: []
                };
            });

            // [FIX] Verificação de SKUs duplicados internamente antes de adicionar
            const existingSkus = new Set((formData.variations || []).map(v => v.sku?.toUpperCase()));
            const deduplicatedNewVars = newVars.map(v => {
                let currentSku = v.sku;
                let counter = 1;
                while (existingSkus.has(currentSku.toUpperCase())) {
                    const suffix = `-${counter}`;
                    currentSku = v.sku.substring(0, 50 - suffix.length) + suffix;
                    counter++;
                }
                existingSkus.add(currentSku.toUpperCase());
                return { ...v, sku: currentSku };
            });

            setFormData(prev => ({
                ...prev,
                variations: [...(prev.variations || []), ...deduplicatedNewVars],
                hasVariations: true
            }));
            setIsGeneratingBulk(false);
            setIsCartesianModalOpen(false);
            toast.success(`${newVars.length} variações geradas com sucesso!`);
        }, 800);
    };

    const showActivationErrors = (channel: string, errors: string[]) => {
        toast.error(`${channel} não pode ser ativado: ${errors.join(' ')}`, { autoClose: 8000 });
    };

    const handleToggleErpActive = () => {
        if (!formData.active && !erpStatus.isLegible) {
            showActivationErrors('ERP', erpStatus.errors);
            return;
        }
        setFormData(prev => ({ ...prev, active: !prev.active }));
    };

    const handleToggleCatalogPublished = () => {
        const isPublished = formData.status === 'published';
        if (!isPublished && !ecomStatus.isLegible) {
            showActivationErrors('Catálogo', ecomStatus.errors);
            return;
        }
        setFormData(prev => ({ ...prev, status: prev.status === 'published' ? 'draft' : 'published' }));
    };

    const regenerateAllVariationSkus = () => {
        setFormData(prev => {
            if (!prev.variations) return prev;
            
            const existingSkus = new Set<string>();
            const newVariations = prev.variations.map((v, idx) => {
                // Se já tem SKU e NÃO é um placeholder genérico, mantém ele e marca como usado
                const isGeneric = !v.sku || v.sku.startsWith('NEW-VAR') || v.sku.includes('-NEW');
                
                if (!isGeneric) {
                    existingSkus.add(v.sku.toUpperCase());
                    return v;
                }
                
                let base = prev.code || 'PROD';
                let suffix = v.name ? v.name.toUpperCase().replace(/\s+/g, '') : `V${idx + 1}`;
                
                // Tenta gerar um SKU único
                let newSku = `${base}-${suffix}`;
                if (newSku.length > 50) newSku = newSku.substring(0, 50);
                
                let counter = 1;
                let candidate = newSku;
                while (existingSkus.has(candidate.toUpperCase())) {
                    const countStr = `-${counter}`;
                    candidate = newSku.substring(0, 50 - countStr.length) + countStr;
                    counter++;
                }
                
                existingSkus.add(candidate.toUpperCase());
                return { ...v, sku: candidate };
            });
            return { ...prev, variations: newVariations };
        });
        toast.info("SKUs das variações regenerados com exclusividade.");
    };

    /**
     * Salva o produto manualmente (acionado pelo usuário).
     * Exibe o spinner no botão e toasts de erro.
     */
    const handleSubmit = async (showResult = true, saveAsDraft = false): Promise<boolean> => {
        if (!saveAsDraft) {
            const errors: Record<string, boolean> = {};
            if (!(formData.name || formData.description)?.trim()) {
                errors.name = true;
            }
            const hasVars = Boolean(formData.hasVariations) || (Array.isArray(formData.variations) && formData.variations.length > 0);
            if (!hasVars && (!formData.unitPrice || Number(formData.unitPrice) <= 0)) {
                errors.unitPrice = true;
            }
            if (!formData.categoryIds || formData.categoryIds.length === 0) {
                errors.categoryIds = true;
            }

            const hasVarsWithMissingPhoto = hasVars && Array.isArray(formData.variations) && formData.variations.some(v => !v.images || v.images.length === 0);
            if (hasVarsWithMissingPhoto) {
                errors.variationsImages = true;
            }

            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                if (errors.name || errors.categoryIds) {
                    setActiveTab('geral');
                } else if (errors.unitPrice) {
                    setActiveTab('estoque');
                } else if (errors.variationsImages) {
                    setActiveTab('variacoes');
                }
                toast.error(errors.variationsImages
                    ? "Cada variação deve ter pelo menos 1 foto vinculada."
                    : "Preencha todos os campos obrigatórios.");
                return false;
            }
            setValidationErrors({});
        } else {
            if (!hasProductName) {
                return false;
            }
        }

        const hasVars = Boolean(formData.hasVariations) || (Array.isArray(formData.variations) && formData.variations.length > 0);
        if (hasVars && Array.isArray(formData.variations) && formData.variations.length > 0) {
            const varWithoutImage = formData.variations.find(v => !v.images || v.images.length === 0);
            if (varWithoutImage) {
                setActiveTab('variacoes');
                toast.error(`A variação "${varWithoutImage.name || 'Sem título'}" deve ter pelo menos 1 foto vinculada.`);
                return false;
            }
        }

        const ecomVal = checkEcomLegibility(formData);

        if (formData.status === 'published' && !ecomVal.isLegible) {
            toast.error("Despublique o Catálogo antes de remover ou alterar um campo obrigatório.");
            return false;
        }

        // Cancela qualquer auto-save pendente antes de salvar manualmente
        isSavingDraftRef.current = true;
        setLoading(true);
        try {
            const normalizedData = { 
                ...formData, 
                isDraft: saveAsDraft,
                active: true,
                status: formData.status || 'draft'
            } as Product;

            await saveProduct(normalizedData);
            setFormData(prev => ({ ...prev, isDraft: saveAsDraft }));
            hasChanged.current = false;
            
            if (showResult) {
                if (normalizedData.status === 'published' && normalizedData.active !== false) {
                    toast.success("Produto publicado com sucesso! Feed Meta CSV (Facebook/Instagram) atualizado. 🛍️");
                    if (onSuccess) onSuccess(normalizedData);
                    onClose();
                } else {
                    toast.info("Produto salvo e mantido oculto do Feed Meta CSV.");
                    setSaveResult({
                        erpLegible: true,
                        ecomLegible: ecomVal.isLegible,
                        checksErp: { description: true, unitPrice: true, categories: true, supplier: true, costPrice: true },
                        checksEcom: ecomVal.checks,
                        product: normalizedData
                    });
                }
            }
            if (onSuccess) onSuccess(normalizedData);
            return true;
        } catch (error: any) {
            toast.error(`Erro ao salvar: ${error.message || "Erro desconhecido"}`);
            console.error(error);
            return false;
        } finally {
            setLoading(false);
            isSavingDraftRef.current = false;
        }
    };

    /**
     * Salva o rascunho silenciosamente (sem spinner no botão, sem toast de sucesso).
     * Usa isSavingDraftRef como guard para evitar chamadas concorrentes.
     */
    const autoSaveDraft = useCallback(async (data: Partial<Product>) => {
        if (isSavingDraftRef.current) return;
        isSavingDraftRef.current = true;
        setIsSavingDraft(true);
        try {
            const normalizedData = {
                ...data,
                isDraft: data.isDraft !== false,
                active: true,
                status: data.status || 'draft'
            } as Product;
            await saveProduct(normalizedData);
            hasChanged.current = false;
        } catch (error) {
            // Auto-save silencioso: apenas loga, não mostra toast
            console.error('[AutoSave] Falha ao salvar rascunho:', error);
        } finally {
            isSavingDraftRef.current = false;
            setIsSavingDraft(false);
        }
    }, []);

    // Durante a criação, cada alteração é salva automaticamente após uma breve
    // pausa. Produtos em edição permanecem exclusivamente com salvamento manual.
    // Não depende de `loading` para evitar loop de re-render.
    useEffect(() => {
        if (!isOpen || product || !hasProductName || !hasChanged.current) return;

        const timer = window.setTimeout(() => {
            autoSaveDraft(formData);
        }, 800);

        return () => window.clearTimeout(timer);
    }, [formData, hasProductName, isOpen, product, autoSaveDraft]);

    const handleSaveAndClose = async () => {
        const saved = await handleSubmit(false, !product && formData.isDraft !== false);
        if (saved) onClose();
    };

    const handleCloseWithAutoSave = async () => {
        if (!product && hasChanged.current && !loading && !isSavingDraftRef.current) {
            await autoSaveDraft(formData);
        }
        onClose();
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseWithAutoSave} />
            
            <div onPaste={handlePaste} className="relative bg-white dark:bg-slate-900 w-full max-w-full h-full md:max-w-[96vw] md:h-[96vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-4 flex-wrap">
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            {product ? "Editar Produto" : "Cadastro de Produto"}
                        </h2>
                        
                        <div className="flex items-center gap-2">
                            {/* Catálogo Indicator */}
                            <div className="relative group cursor-help">
                                <div className={`flex items-center gap-1.5 h-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${formData.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                                    <span>Catálogo: {formData.status === 'published' ? 'Publicado' : 'Ocultado'}</span>
                                </div>
                                
                                {/* Tooltip Catálogo */}
                                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Requisitos do Catálogo</p>
                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mb-3">💡 Clique em qualquer item pendente para ir direto ao campo.</p>
                                    <ul className="space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                                        <li onClick={() => navigateToRequirementField('marketplaceTitle')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                            <div className="flex items-center gap-2">
                                                <i className={`bi ${ecomStatus.checks.marketplaceTitle ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}></i>
                                                <span className={ecomStatus.checks.marketplaceTitle ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Título do Produto (Catálogo)</span>
                                            </div>
                                            <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                        </li>
                                        <li onClick={() => navigateToRequirementField('unitPrice')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                            <div className="flex items-center gap-2">
                                                <i className={`bi ${ecomStatus.checks.unitPrice ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}></i>
                                                <span className={ecomStatus.checks.unitPrice ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Preço de Venda &gt; R$ 0</span>
                                            </div>
                                            <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                        </li>
                                        <li onClick={() => navigateToRequirementField('images')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                            <div className="flex items-center gap-2">
                                                <i className={`bi ${ecomStatus.checks.images ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}></i>
                                                <span className={ecomStatus.checks.images ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Pelo menos 1 Foto principal</span>
                                            </div>
                                            <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                        </li>
                                        <li onClick={() => navigateToRequirementField('categories')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                            <div className="flex items-center gap-2">
                                                <i className={`bi ${ecomStatus.checks.categories ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}></i>
                                                <span className={ecomStatus.checks.categories ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Pelo menos 1 Categoria</span>
                                            </div>
                                            <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                        </li>
                                        {!isService && (
                                            <li onClick={() => navigateToRequirementField('dimensions')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                                <div className="flex items-center gap-2">
                                                    <i className={`bi ${ecomStatus.checks.dimensions ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}></i>
                                                    <span className={ecomStatus.checks.dimensions ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Dimensões físicas (L x A x P)</span>
                                                </div>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleCloseWithAutoSave} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all self-end sm:self-auto">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Tabs Navigation */}
                {(() => {
                    const formTabs = ([
                        { id: 'geral', label: 'Cadastro Geral', icon: '' },
                        !isService && { id: 'ecommerce', label: 'Fotos', icon: 'bi-images' },
                        !isService && { id: 'technical', label: 'Informações Técnicas', icon: 'bi-info-circle' },
                        !isService && { id: 'estoque', label: 'Estoque e Precificação', icon: 'bi-box-seam' },
                        !isService && { id: 'variacoes', label: 'Variações', icon: 'bi-grid-3x3-gap' },
                        { id: 'fiscal', label: 'Tributário / NF', icon: 'bi-file-earmark-text' },
                    ] as any[]).filter(Boolean);

                    const currentTabIndex = formTabs.findIndex(t => t.id === activeTab);
                    const isLastStep = currentTabIndex === formTabs.length - 1;
                    const nextTabObj = currentTabIndex >= 0 && currentTabIndex < formTabs.length - 1 ? formTabs[currentTabIndex + 1] : null;

                    return (
                        <>
                            <div className="px-6 border-b border-slate-50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10 overflow-x-auto scrollbar-none">
                                <div className="flex gap-6 min-w-max">
                                    {formTabs.map((tab: any) => {
                                        const hasTabErrors =
                                            (tab.id === 'geral' && (validationErrors.name || validationErrors.categoryIds)) ||
                                            (tab.id === 'estoque' && validationErrors.unitPrice) ||
                                            (tab.id === 'variacoes' && validationErrors.variationsImages);

                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all shrink-0 ${hasTabErrors
                                                    ? (activeTab === tab.id ? 'border-red-500 text-red-600' : 'border-red-200 text-red-500')
                                                    : (activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200')
                                                    }`}
                                            >
                                                {tab.icon && <i className={`bi ${tab.icon}`}></i>}
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                {activeTab === 'geral' && (
                                    <ProductGeneralTab
                                        onOpenCategorySearch={() => setIsCategorySearchOpen(true)}
                                        suppliers={suppliers}
                                        isService={isService}
                                        formData={formData}
                                        setFormData={setFormData}
                                        availableCategories={availableCategories}
                                        handleGenerateComboName={handleGenerateComboName}
                                        isGeneratingComboName={isGeneratingComboName}
                                        validationErrors={validationErrors}
                                        setValidationErrors={setValidationErrors}
                                    />
                                )}

                                {activeTab === 'technical' && (
                                    <ProductTechnicalTab
                                        formData={formData}
                                        setFormData={setFormData}
                                        handleImproveDescriptionWithAI={handleImproveDescriptionWithAI}
                                        isImprovingDescription={isImprovingDescription}
                                    />
                                )}

                                {activeTab === 'estoque' && (
                                    <ProductInventoryTab
                                        formData={formData}
                                        setFormData={setFormData}
                                        suppliers={suppliers}
                                        handleSuggestPrices={handleSuggestPrices}
                                        isSuggestingPrices={isSuggestingPrices}
                                        suggestPricesResults={suggestPricesResults}
                                        discountPercent={discountPercent}
                                        setDiscountPercent={setDiscountPercent}
                                        discountFixed={discountFixed}
                                        setDiscountFixed={setDiscountFixed}
                                        handlePriceChange={handlePriceChange}
                                        handleDiscountPercentChange={handleDiscountPercentChange}
                                        handleDiscountFixedChange={handleDiscountFixedChange}
                                        handlePromoPriceFieldChange={handlePromoPriceFieldChange}
                                        validationErrors={validationErrors}
                                        setValidationErrors={setValidationErrors}
                                    />
                                )}

                                {activeTab === 'variacoes' && (
                                    <ProductVariationsTab
                                        variations={formData.variations || []}
                                        isGeneratingBulk={isGeneratingBulk}
                                        addVariation={addVariation}
                                        VariationRow={(props: any) => <VariationRow {...props} parentPrice={formData.unitPrice} isEdit={!!product?.id} hasPhotoError={validationErrors.variationsImages && (!props.v.images || props.v.images.length === 0)} />}
                                        updateVariation={updateVariation}
                                        removeVariation={removeVariation}
                                        setFormData={setFormData}
                                        isCombo={false}
                                        onEditCombo={setEditingVariationComboId}
                                        onEdit={setEditingVariationId}
                                        regenerateAllSkus={regenerateAllVariationSkus}
                                        hasVariations={formData.hasVariations || false}
                                        setHasVariations={(val) => setFormData(prev => ({ ...prev, hasVariations: val }))}
                                    />
                                )}

                                {activeTab === 'ecommerce' && (
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
                                        handleGenerateAIDescription={handleGenerateAIDescription}
                                        isGeneratingDescription={isGeneratingDescription}
                                        handleGenerateMarketplaceTitle={handleGenerateMarketplaceTitle}
                                        isGeneratingTitle={isGeneratingTitle}
                                        handleToggleActive={handleToggleErpActive}
                                    />
                                )}

                                {activeTab === 'fiscal' && (
                                    <ProductFiscalTab
                                        formData={formData}
                                        setFormData={setFormData}
                                        handleGenerateNCM={handleGenerateNCM}
                                        isGeneratingNCM={isGeneratingNCM}
                                        handleAutoFillFiscalWithAI={handleAutoFillFiscalWithAI}
                                        isFillingFiscalWithAI={isFillingFiscalWithAI}
                                    />
                                )}
                            </div>

                            {/* Footer Buttons */}
                            <div className="p-4 md:p-6 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3 shrink-0">
                                {!product && (
                                    <div className="mr-auto flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        {isSavingDraft ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                                <span>Salvando rascunho...</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-cloud-check-fill text-emerald-500 text-sm" />
                                                <span>alterações salvas automaticamente.</span>
                                            </>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                                    {product && (
                                        <button
                                            onClick={onClose}
                                            className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95 flex-1 md:flex-initial text-center"
                                        >
                                            Descartar alterações
                                        </button>
                                    )}

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
                                                disabled={loading}
                                                className="px-6 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xl w-full md:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none"
                                            >
                                                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                                <i className="bi bi-check-circle-fill"></i>
                                                {(!product || formData.isDraft) ? "Cadastrar produto" : "Salvar alterações"}
                                            </button>
                                    )}
                                </div>
                            </div>
                        </>
                    );
                })()}


                {editingVariationId && formData.variations?.some(v => v.id === editingVariationId) && (
                    <VariationFormModal
                        isOpen={!!editingVariationId}
                        onClose={() => setEditingVariationId(null)}
                        parentId={formData.id}
                        parentProduct={formData as any}
                        variation={formData.variations?.find(v => v.id === editingVariationId) || null}
                        onSave={(updatedVar) => {
                            setFormData(prev => ({
                                ...prev,
                                variations: prev.variations?.map(v => v.id === updatedVar.id ? updatedVar : v)
                            }));
                            if (updatedVar.images?.length) {
                                setValidationErrors(prev => {
                                    const hasMissingPhoto = formData.variations?.some(v => v.id !== updatedVar.id && (!v.images || v.images.length === 0));
                                    if (hasMissingPhoto) return prev;
                                    const next = { ...prev };
                                    delete next.variationsImages;
                                    return next;
                                });
                            }
                        }}
                    />
                )}

                <CategorySearchModal
                    isOpen={isCategorySearchOpen}
                    onClose={() => setIsCategorySearchOpen(false)}
                    categories={availableCategories.filter(c => {
                        const FIXED_ENVIRONMENTS = ["SALA DE JANTAR", "SALA DE ESTAR", "COZINHA", "QUARTO", "LAVANDERIA", "BANHEIRO", "LAVANDEIRA", "ESCRITORIO", "ESCRITÓRIO", "VARANDA", "ÁREA GOURMET", "GARAGEM"];
                        const isFixed = FIXED_ENVIRONMENTS.includes(c.name?.trim().toUpperCase());
                        const hasChildren = availableCategories.some(other => other.parents?.includes(c.id));
                        const isEnvironment = isFixed || (hasChildren && (!c.parents || c.parents.length === 0)) || (!c.parents || c.parents.length === 0);
                        
                        if (activeTab === 'ambientes') return isEnvironment;
                        if (activeTab === 'geral') return !isEnvironment;
                        return true;
                    })}
                    selectedIds={formData.categoryIds || []}
                    onSelect={(cid) => {
                        const cat = availableCategories.find(c => c.id === cid);
                        const isSelected = formData.categoryIds?.includes(cid);
                        
                        const newIds = isSelected 
                            ? formData.categoryIds?.filter(id => id !== cid) 
                            : [...(formData.categoryIds || []), cid];
                        
                        // Auto-detect environment from selected categories
                        let detectedEnv = formData.environment;
                        
                        // Find root parents (environments) of the selected categories
                        if (newIds && newIds.length > 0) {
                            const selectedCats = availableCategories.filter(c => newIds.includes(c.id));
                            
                            // Priority 1: If the selected category is itself a root (Environment)
                            const rootSelected = selectedCats.find(c => !c.parents || c.parents.length === 0);
                            if (rootSelected) {
                                detectedEnv = rootSelected.name;
                            } else {
                                // Priority 2: Find the name of the first parent of the first selected category
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

                {/* Legacy Variation Combo Modal - kept for safety but should be replaced by VariationEditModal logic if needed */}
                {editingVariationComboId && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Composição da Variação</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Defina os itens que compõem esta variação específica</p>
                                </div>
                                <button onClick={() => setEditingVariationComboId(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                    <i className="bi bi-x-lg text-xl"></i>
                                </button>
                            </div>
                            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <ComboItemSelector
                                    currentItems={formData.variations?.find(v => v.id === editingVariationComboId)?.comboItems || []}
                                    onAdd={(item) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            variations: prev.variations?.map(v => v.id === editingVariationComboId ? {
                                                ...v,
                                                comboItems: [...(v.comboItems || []), item]
                                            } : v)
                                        }));
                                    }}
                                    onRemove={(idx) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            variations: prev.variations?.map(v => v.id === editingVariationComboId ? {
                                                ...v,
                                                comboItems: v.comboItems?.filter((_, i) => i !== idx)
                                            } : v)
                                        }));
                                    }}
                                    onUpdateQuantity={(idx, q) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            variations: prev.variations?.map(v => v.id === editingVariationComboId ? {
                                                ...v,
                                                comboItems: v.comboItems?.map((item, i) => i === idx ? { ...item, quantity: q } : item)
                                            } : v)
                                        }));
                                    }}
                                />
                            </div>
                            <div className="p-8 border-t border-slate-50 dark:border-slate-800 flex justify-between gap-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const v = formData.variations?.find(varItem => varItem.id === editingVariationComboId);
                                        const total = v?.comboItems?.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0) || 0;
                                        setFormData(prev => ({
                                            ...prev,
                                            variations: prev.variations?.map(varItem => varItem.id === editingVariationComboId ? {
                                                ...varItem,
                                                unitPrice: Number(total.toFixed(2)),
                                                syncUnitPrice: false
                                            } : varItem)
                                        }));
                                        toast.info(`Preço da variação atualizado: R$ ${total.toFixed(2)}`);
                                    }}
                                    className="flex items-center gap-2 px-6 py-3 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    <i className="bi bi-calculator"></i> Somar Itens e Atualizar Preço
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingVariationComboId(null)}
                                    className="px-10 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95"
                                >
                                    Concluído
                                </button>
                            </div>
                        </div>
                    </div>
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

                {saveResult && saveResult.product.status !== 'published' && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 text-center">
                            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="bi bi-check-circle-fill text-2xl"></i>
                            </div>
                            
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Produto Salvo com Sucesso!</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 mb-6">Deseja publicar no catálogo digital?</p>

                            {/* Checklist do Catálogo */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 flex flex-col gap-4 text-left mb-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-purple-600 uppercase tracking-widest">
                                        Catálogo
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${saveResult.ecomLegible ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}`}>
                                        {saveResult.ecomLegible ? 'Pronto para publicar' : 'Pendências'}
                                    </span>
                                </div>
                                
                                <ul className="space-y-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                                    <li className="flex items-center justify-between p-1.5 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${saveResult.checksEcom.marketplaceTitle ? 'bi-check-circle-fill text-emerald-500' : 'bi-exclamation-circle-fill text-amber-500'}`}></i>
                                            <span className={saveResult.checksEcom.marketplaceTitle ? 'text-slate-700 dark:text-slate-200' : 'text-amber-600 dark:text-amber-400 font-bold'}>Título do Catálogo</span>
                                        </div>
                                    </li>
                                    <li className="flex items-center justify-between p-1.5 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${saveResult.checksEcom.dimensions ? 'bi-check-circle-fill text-emerald-500' : 'bi-exclamation-circle-fill text-amber-500'}`}></i>
                                            <span className={saveResult.checksEcom.dimensions ? 'text-slate-700 dark:text-slate-200' : 'text-amber-600 dark:text-amber-400 font-bold'}>Dimensões Físicas</span>
                                        </div>
                                    </li>
                                    <li className="flex items-center justify-between p-1.5 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${saveResult.checksEcom.categories ? 'bi-check-circle-fill text-emerald-500' : 'bi-exclamation-circle-fill text-amber-500'}`}></i>
                                            <span className={saveResult.checksEcom.categories ? 'text-slate-700 dark:text-slate-200' : 'text-amber-600 dark:text-amber-400 font-bold'}>Categorias do Produto</span>
                                        </div>
                                    </li>
                                    <li className="flex items-center justify-between p-1.5 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${saveResult.checksEcom.images ? 'bi-check-circle-fill text-emerald-500' : 'bi-exclamation-circle-fill text-amber-500'}`}></i>
                                            <span className={saveResult.checksEcom.images ? 'text-slate-700 dark:text-slate-200' : 'text-amber-600 dark:text-amber-400 font-bold'}>Imagens do Produto</span>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const prod = saveResult.product;
                                        setSaveResult(null);
                                        if (onSuccess) onSuccess(prod);
                                        onClose();
                                    }}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Concluir
                                </button>
                                <button
                                    type="button"
                                    disabled={!saveResult.ecomLegible}
                                    onClick={async () => {
                                        const updatedData = { ...saveResult.product, status: 'published' } as Product;
                                        try {
                                            await saveProduct(updatedData);
                                            setFormData(prev => ({ ...prev, status: 'published' }));
                                            toast.success("Produto publicado no Catálogo Digital!");
                                        } catch (err: any) {
                                            toast.error(`Erro ao publicar: ${err.message}`);
                                        }
                                        setSaveResult(null);
                                        if (onSuccess) onSuccess(updatedData);
                                        onClose();
                                    }}
                                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <i className="bi bi-globe2"></i>
                                    Publicar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ProductFormModal;
