import React, { useState, useEffect, useCallback, useRef } from "react";
import Product, { Variation, FiscalInfo } from "../../types/product.type";
import Person from "../../types/person.type";
import { saveProduct, getFullProduct } from '@/pages/utils/productService';
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
import VariationEditModal from "./components/VariationEditModal";
import CategorySearchModal from "./CategorySearchModal";

// Modular Tab Components
import ProductGeneralTab from "./components/tabs/ProductGeneralTab";
import ProductInventoryTab from "./components/tabs/ProductInventoryTab";
import ProductVariationsTab from "./components/tabs/ProductVariationsTab";
import { generateProductCode } from '@/pages/utils/formatters';
import ProductEcommerceTab from "./components/tabs/ProductEcommerceTab";
import ProductFiscalTab from "./components/tabs/ProductFiscalTab";
import ProductConversionModal from "./components/ProductConversionModal";
import CartesianVariationModal from "./components/CartesianVariationModal";
import ProductTypeManagementModal from "./components/ProductTypeManagementModal";

// [x] Novo: Regras Dinâmicas de Título de Produto
//     - [x] Atualizar `product.type.ts` e `productService.ts`
//     - [x] Criar CRUD de Tipos de Móveis (`ProductTypeManagementModal.tsx`)
//     - [x] Implementar interface de reordenação no `ProductFormModal.tsx`
//     - [x] Atualizar geração de título automática nos modais
//     - [x] Validar reordenação e composição final
interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product | null;
    initialData?: Partial<Product> | null;
    onSuccess?: (newProduct: Product) => void;
}

const VariationRow = React.memo(({ v, updateVariation, removeVariation, setFormData, isCombo, onEditCombo, onEdit }: {
    v: Variation,
    updateVariation: (id: string, field: keyof Variation, value: any) => void,
    removeVariation: (id: string) => void,
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>,
    isCombo?: boolean,
    onEditCombo?: (id: string) => void,
    onEdit?: (id: string) => void,
    parentTitle?: string
}) => (
    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
        <td className="px-6 py-4 cursor-pointer" onClick={() => onEdit?.(v.id)}>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => updateVariation(v.id, 'syncDescription', !v.syncDescription)}
                    className={`p-1 rounded-md transition-colors ${v.syncDescription ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-300 hover:bg-slate-100'}`}
                    title="Herdar título do pai"
                >
                    <i className={`bi ${v.syncDescription ? 'bi-link-45deg' : 'bi-link-45deg opacity-30'}`}></i>
                </button>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título</span>
                    <input
                        value={v.name || ''}

                        readOnly
                        className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 cursor-default"
                        placeholder="VARIAÇÃO GERADA"
                    />
                </div>
            </div>
        </td>

        <td className="px-6 py-4">
            <input
                value={v.sku || ''}
                onChange={(e) => updateVariation(v.id, 'sku', e.target.value.toUpperCase())}
                className="w-full bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg outline-none text-xs font-mono font-bold dark:text-blue-400 text-blue-600 border border-transparent focus:border-blue-500"
                placeholder="SKU"
            />
        </td>
        <td className="px-6 py-4">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => updateVariation(v.id, 'syncUnitPrice', !v.syncUnitPrice)}
                    className={`p-1 rounded-md transition-colors ${v.syncUnitPrice ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-300 hover:bg-slate-100'}`}
                    title="Sincronizar preço com pai"
                >
                    <i className={`bi ${v.syncUnitPrice ? 'bi-link-45deg' : 'bi-link-45deg opacity-30'}`}></i>
                </button>
                <input
                    type="number"
                    value={v.unitPrice}
                    disabled={v.syncUnitPrice}
                    onChange={(e) => updateVariation(v.id, 'unitPrice', parseFloat(e.target.value))}
                    className={`bg-transparent border-none outline-none text-sm font-black w-24 ${v.syncUnitPrice ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}
                />
            </div>
        </td>
        <td className="px-6 py-4">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => updateVariation(v.id, 'syncCostPrice', !v.syncCostPrice)}
                    className={`p-1 rounded-md transition-colors ${v.syncCostPrice ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-300 hover:bg-slate-100'}`}
                    title="Sincronizar custo com pai"
                >
                    <i className={`bi ${v.syncCostPrice ? 'bi-link-45deg' : 'bi-link-45deg opacity-30'}`}></i>
                </button>
                <input
                    type="number"
                    value={v.costPrice}
                    disabled={v.syncCostPrice}
                    onChange={(e) => updateVariation(v.id, 'costPrice', parseFloat(e.target.value))}
                    className={`bg-transparent border-none outline-none text-sm font-medium w-24 ${v.syncCostPrice ? 'text-slate-400' : 'text-slate-500'}`}
                />
            </div>
        </td>
        <td className="px-6 py-4">
            <input
                type="number"
                value={v.stock}
                onChange={(e) => updateVariation(v.id, 'stock', parseInt(e.target.value) || 0)}
                className="bg-slate-100 dark:bg-slate-800 border-none outline-none text-xs font-bold w-16 px-2 py-1 rounded-lg dark:text-slate-200"
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
));

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
    active: true,
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
    mainDifferential: "",
    notIncluded: "",
    supplierRef: "",
    observations: "",
    productTypeId: "",
    productTypeName: "",
    environment: "",
    includeEnvironment: true,
    includeLine: true,
    includeBrand: true,
    includeComplement: true,
    titleComplement: "",
    titleOrder: ["type", "environment", "line", "brand", "complement"]
};

const ProductFormModal = ({ isOpen, onClose, product, initialData, onSuccess }: ProductFormModalProps) => {

    const [activeTab, setActiveTab] = useState<'geral' | 'estoque' | 'variacoes' | 'ecommerce' | 'fiscal'>('geral');
    const [activeEcommerceSubTab, setActiveEcommerceSubTab] = useState<'vitrine' | 'photos' | 'descriptions' | 'logistics'>('vitrine');
    const [loading, setLoading] = useState(false);
    const [isGeneratingCategory, setIsGeneratingCategory] = useState(false);
    const [isGeneratingComboName, setIsGeneratingComboName] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isGeneratingNCM, setIsGeneratingNCM] = useState(false);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [isSuggestingPrices, setIsSuggestingPrices] = useState(false);
    const [suggestPricesResults, setSuggestPricesResults] = useState<{ low: any, medium: any, high: any } | null>(null);
    const [removingPhoto, setRemovingPhoto] = useState<string | null>(null);
    const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
    const [isCartesianModalOpen, setIsCartesianModalOpen] = useState(false);
    const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
    const [editingVariationComboId, setEditingVariationComboId] = useState<string | null>(null);
    const [editingVariationId, setEditingVariationId] = useState<string | null>(null);
    const [isCategorySearchOpen, setIsCategorySearchOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [availableCategories, setAvailableCategories] = useState<any[]>([]);
    const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
    const [isProductTypeModalOpen, setIsProductTypeModalOpen] = useState(false);
    const [productTypes, setProductTypes] = useState<{ id: string, name: string }[]>([]);

    const [formData, setFormData] = useState<Partial<Product>>({
        ...INITIAL_FORM_DATA,
        ...initialData
    });

    const hasChanged = useRef(false);
    const initialFormDataRef = useRef<string>("");

    const isService = formData.itemType === 'service';

    // Reset tab when switching type to service (tabs estoque/variacoes/ecommerce are unavailable)
    useEffect(() => {
        if (isService && (activeTab === 'estoque' || activeTab === 'variacoes' || activeTab === 'ecommerce')) {
            setActiveTab('geral');
        }
    }, [isService, activeTab]);

    // Detect changes
    useEffect(() => {
        if (isOpen && formData.description) {
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

        let isMounted = true;
        const loadFullData = async () => {
            if (product?.id) {
                const full = await getFullProduct(product.id);
                if (full && isMounted) {
                    setFormData(full);
                }
            } else if (product) {
                setFormData({ ...INITIAL_FORM_DATA, ...product });
            } else {
                // If creating new, start with INITIAL_FORM_DATA then apply initialData
                setFormData({ ...INITIAL_FORM_DATA, ...initialData });
            }
            setActiveTab('geral');
        };
        loadFullData();
        return () => { isMounted = false; };
    }, [product, initialData, isOpen]);

    // Handle automatic variation name updates when parent title changes
    useEffect(() => {
        if (!formData.description) return;
        
        setFormData(prev => {
            if (!prev.variations?.length) return prev;
            
            const updatedVars = prev.variations.map(v => {
                if (v.syncDescription !== false) { // Default to true or if explicitly true
                    const attrParts = v.attributes?.map(a => {
                        const val = a.value.toUpperCase();
                        return a.showName !== false ? `${a.name.toUpperCase()}:${val}` : val;
                    }).join(' ');
                    
                    // NEW: Prefix with parent description
                    const newName = attrParts ? `${prev.description} ${attrParts}` : prev.description!;
                    return { ...v, name: newName.toUpperCase() };
                }
                return v;
            });

            // Only update if something actually changed to avoid loops
            if (JSON.stringify(updatedVars) === JSON.stringify(prev.variations)) return prev;
            
            return { ...prev, variations: updatedVars };
        });
    }, [formData.description]);

    const generateAutoTitle = useCallback((currentData: Partial<Product>) => {
        const order = currentData.titleOrder || ["type", "environment", "line", "brand"];
        const parts: string[] = [];

        order.forEach(key => {
            if (key === "type" && currentData.productTypeName) {
                parts.push(currentData.productTypeName);
            } else if (key === "environment" && currentData.includeEnvironment && currentData.environment) {
                parts.push(currentData.environment);
            } else if (key === "line" && currentData.includeLine && currentData.line) {
                parts.push(currentData.line);
            } else if (key === "brand" && currentData.includeBrand && currentData.brand) {
                parts.push(currentData.brand);
            } else if (key === "complement" && currentData.includeComplement && currentData.titleComplement) {
                parts.push(currentData.titleComplement);
            }
        });

        return parts.join(' ').toUpperCase().trim();
    }, []);

    // Fetch product types
    useEffect(() => {
        if (!isOpen) return;
        const fetchProductTypes = async () => {
            const { data } = await supabase.from('product_types').select('id, name').order('name');
            if (data) setProductTypes(data);
        };
        fetchProductTypes();
    }, [isOpen, isProductTypeModalOpen]);



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

    // Sync variation prices/costs (Parent -> Children)
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
                return updated ? newV : v;
            });
            if (JSON.stringify(nextVariations) !== JSON.stringify(formData.variations)) {
                setFormData(prev => ({ ...prev, variations: nextVariations }));
            }
        }
    }, [formData.unitPrice, formData.costPrice]);

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        let files: FileList | File[] = [];
        if ('files' in e.target && e.target.files) {
            files = Array.from(e.target.files);
        } else if ('dataTransfer' in e && e.dataTransfer.files) {
            files = Array.from(e.dataTransfer.files);
        }

        if (files.length === 0) return;

        setLoading(true);
        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const compressed = await compressImageToFile(file as File);
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const path = `products/${fileName}`;
                return uploadFile(compressed, path);
            });

            const urls = await Promise.all(uploadPromises);
            setFormData(prev => ({
                ...prev,
                images: [...(prev.images || []), ...urls]
            }));
            toast.success(`${files.length} foto(s) enviada(s)`);
        } catch (error) {
            toast.error("Erro no upload das imagens");
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
                mainDifferential: formData.mainDifferential,
                colors: formData.colors,
                notIncluded: formData.notIncluded,
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
                material: formData.material,
                differential: formData.mainDifferential
            });
            setFormData(prev => ({ ...prev, marketplaceTitle: title }));
            toast.success("Título para marketplace gerado!");
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingTitle(false);
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

    const handleSuggestPrices = async () => {
        if (!formData.description) return toast.warning("O produto precisa de um título");
        if (!formData.finalPurchasePrice || formData.finalPurchasePrice <= 0) 
            return toast.warning("Preço de custo final é necessário para sugerir preços");
        
        setIsSuggestingPrices(true);
        try {
            const suggestions = await aiService.suggestPrices({
                description: formData.description,
                costPrice: formData.finalPurchasePrice,
                material: formData.material,
                differential: formData.mainDifferential
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
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            
            // Auto-gerar SKU do produto se estiver vazio e o título for digitado
            if (field === 'description' && !next.id && (!next.code || next.code.trim() === '')) {
                next.code = generateProductCode(value);
            }
            
            return next;
        });
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
        const baseName = "NOVA VARIAÇÃO";
        const existingSkus = new Set((formData.variations || []).map(v => v.sku?.toUpperCase()));
        
        let newSku = formData.code ? `${formData.code}-NEW` : "NEW-VAR";
        let counter = 1;
        while (existingSkus.has(newSku.toUpperCase())) {
            const suffix = `-${counter}`;
            newSku = (formData.code ? `${formData.code}-NEW` : "NEW-VAR").substring(0, 50 - suffix.length) + suffix;
            counter++;
        }

        const newVar: Variation = {
            id: Math.random().toString(36).substr(2, 9),
            name: baseName,
            sku: newSku,
            unitPrice: formData.unitPrice || 0,
            costPrice: formData.costPrice || 0,
            stock: 0,
            images: [],
            active: true,
            syncUnitPrice: true,
            syncCostPrice: true,
            syncDescription: true,
            attributes: [],
            comboItems: []

        };
        setFormData(prev => ({ ...prev, variations: [...(prev.variations || []), newVar], hasVariations: true }));
    };

    const removeVariation = (id: string) => {
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

            const newVars: Variation[] = combinations.map(combo => {
                const sortedKeys = Object.keys(combo).sort();
                const attrParts = sortedKeys.map(key => {
                    const attrData = combo[key];
                    const val = String(attrData.value).toUpperCase();
                    return attrData.showName ? `${key.toUpperCase()}:${val}` : val;
                }).join(' ');
                const name = attrParts.toUpperCase();

                const skuSuffix = sortedKeys.map(key => String(combo[key].value).toUpperCase().replace(/\s+/g, '')).join('-');
                
                let finalSku = formData.code ? `${formData.code}-${skuSuffix}` : skuSuffix;
                // [FIX] Aumentado limite de SKU para evitar duplicidade óbvia (6 era muito pouco)
                if (finalSku.length > 50) {
                    finalSku = finalSku.substring(0, 50);
                }
                
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    name,
                    sku: finalSku,
                    unitPrice: formData.unitPrice || 0,
                    costPrice: formData.costPrice || 0,
                    stock: 0,
                    syncUnitPrice: true,
                    syncCostPrice: true,
                    syncDescription: true,
                    images: [],
                    active: true,
                    attributes: Object.entries(combo).map(([name, data]: [string, any]) => ({ 
                        name, 
                        value: String(data.value),
                        showName: data.showName
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

    const validateProductActivation = (data: Partial<Product>) => {
        const missing: string[] = [];
        if (!data.description) missing.push("Título do Produto");
        
        // Ecommerce Content
        if (!data.ecommerceDescription) missing.push("Descrição E-commerce (Aba Marketplace)");
        if (!data.whatsappDescription) missing.push("Descrição WhatsApp (Aba Marketplace)");
        
        // Characteristics
        if (!data.brand && !data.noBrand) missing.push("Marca / Fabricante (ou marque 'Ocultar')");
        if (!data.line && !data.hasNoLine) missing.push("Modelo / Linha (ou marque 'Sem Modelo')");
        if (!data.material) missing.push("Material");
        if (!data.colors && !data.noColors) missing.push("Cores Disponíveis (ou marque 'Não Informar')");
        
        // SupplyChain / Financial
        if (!data.mainSupplierId) missing.push("Fornecedor Principal (Aba Estoque)");
        if (!data.costPrice || data.costPrice <= 0) missing.push("Preço de Custo (Aba Estoque/Geral)");
        if (!data.unitPrice || data.unitPrice <= 0) missing.push("Preço de Venda (Aba Geral)");
        
        // Visual
        if (!data.images || data.images.length === 0) missing.push("Pelo menos uma Foto (Aba Marketplace)");
        
        // Logistics / Dimensions
        if (!data.width || data.width <= 0) missing.push("Largura (Aba Geral)");
        if (!data.height || data.height <= 0) missing.push("Altura (Aba Geral)");
        if (!data.depth || data.depth <= 0) missing.push("Profundidade (Aba Geral)");
        if (!data.weight || data.weight <= 0) missing.push("Peso Bruto (Aba Marketplace)");
        
        return missing;
    };

    const handleToggleActive = () => {
        if (!formData.active) {
            // Attempting to Activate
            const missing = validateProductActivation(formData);
            if (missing.length > 0) {
                toast.error(
                    <div>
                        <p className="font-black text-[10px] uppercase mb-2">Requisitos de Ativação Pendentes:</p>
                        <ul className="list-disc list-inside text-[9px] font-bold space-y-1">
                            {missing.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                    </div>,
                    { autoClose: 8000 }
                );
                return;
            }
        }
        setFormData({ ...formData, active: !formData.active });
    };

    const regenerateAllVariationSkus = () => {
        if (!formData.code) return toast.error("O código do pai é necessário para gerar os SKUs das variações");
        
        setFormData(prev => ({
            ...prev,
            variations: prev.variations?.map(v => {
                let newSku = `${prev.code}-${v.name.toUpperCase().replace(/\s+/g, '')}`;
                if (newSku.length > 6) {
                    newSku = newSku.substring(0, 6);
                }
                return {
                    ...v,
                    sku: newSku
                };
            })
        }));
        toast.success("SKUs das variações atualizados!");
    };

    const handleSubmit = async (isDraft: boolean = false): Promise<boolean> => {
        let finalDescription = formData.description;

        if (!isDraft && !finalDescription) {
            toast.error("O título do produto é obrigatório.");
            return false;
        }

        if (isDraft && !finalDescription) {
            // If it's a draft and description is missing, provide a placeholder
            finalDescription = `[RASCUNHO S-TÍTULO] ${new Date().toLocaleDateString()}`;
        }
        
        setLoading(true);
        try {
            const normalizedData = { 
                ...formData, 
                description: finalDescription,
                isDraft: isDraft && !formData.id ? true : isDraft ? formData.isDraft : false,
                lastAutoSave: isDraft ? new Date().toISOString() : undefined
            } as Product;

            await saveProduct(normalizedData);
            hasChanged.current = false; // Reset before close
            if (!isDraft) toast.success(product ? "Atualizado com sucesso!" : "Criado com sucesso!");
            if (onSuccess) onSuccess(normalizedData);
            onClose();
            return true;
        } catch (error: any) {
            toast.error(`Erro ao salvar: ${error.message || "Erro desconhecido"}`);
            console.error(error);
            return false;
        } finally {
            setLoading(true); // Manter bloqueado um pouco mais para evitar duplo clique? Não, vamos resetar
            setLoading(false);
        }
    };

    const handleCloseWithAutoSave = async () => {
        const isNewOrDraft = !formData.id || formData.isDraft;

        if (hasChanged.current && !loading && isNewOrDraft) {
            const saved = await handleSubmit(true);
            if (!saved) {
                // Se falhou o auto-save, perguntamos se o usuário quer descartar
                if (window.confirm("Não foi possível salvar as alterações (SKU duplicado ou campos obrigatórios). Deseja sair assim mesmo e descartar as alterações?")) {
                    onClose();
                }
            }
        } else {
            onClose();
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseWithAutoSave} />
            
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-[96vw] h-[96vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${formData.isCombo ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                {formData.isCombo ? 'Ficha de Combo/Kit' : 'Ficha de Produto'}
                            </span>
                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">v2.5 Refined</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2 tracking-tight">
                            {product ? 'Editar Cadastro' : 'Novo Cadastro no Catálogo'}
                        </h2>
                    </div>
                    <button onClick={handleCloseWithAutoSave} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="px-10 border-b border-slate-50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
                    <div className="flex gap-10">
                        {([
                            { id: 'geral', label: 'Cadastro Geral', icon: 'bi-info-circle' },
                            !isService && { id: 'estoque', label: 'Estoque / Custos', icon: 'bi-box-seam' },
                            !isService && { id: 'variacoes', label: 'Variações', icon: 'bi-grid-3x3-gap' },
                            !isService && { id: 'ecommerce', label: 'Vitrine / E-commerce', icon: 'bi-cart-check' },
                            { id: 'fiscal', label: 'Tributário / NF', icon: 'bi-file-earmark-text' },
                        ] as any[]).filter(Boolean).map((tab: any) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            >
                                <i className={`bi ${tab.icon}`}></i>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                    {activeTab === 'geral' && (
                        <ProductGeneralTab
                            onOpenCategorySearch={() => setIsCategorySearchOpen(true)}
                            suppliers={suppliers}
                            isService={formData.itemType === 'service'}
                            productTypes={productTypes}
                            onOpenProductTypeModal={() => setIsProductTypeModalOpen(true)}
                            generateAutoTitle={generateAutoTitle}
                            formData={formData}
                            setFormData={setFormData}
                            availableCategories={availableCategories}
                            handleGenerateComboName={handleGenerateComboName}
                            isGeneratingComboName={isGeneratingComboName}
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
                        />
                    )}

                    {activeTab === 'variacoes' && (
                        <ProductVariationsTab
                            variations={formData.variations || []}
                            isGeneratingBulk={isGeneratingBulk}
                            addVariation={addVariation}
                            VariationRow={(props: any) => <VariationRow {...props} parentTitle={formData.description} />}
                            updateVariation={updateVariation}
                            removeVariation={removeVariation}
                            setFormData={setFormData}
                            isCombo={formData.isCombo || false}
                            onEditCombo={setEditingVariationComboId}
                            onEdit={setEditingVariationId}
                            regenerateAllSkus={regenerateAllVariationSkus}
                            onOpenCartesianModal={() => setIsCartesianModalOpen(true)}
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
                        />
                    )}

                    {activeTab === 'fiscal' && (
                        <ProductFiscalTab
                            formData={formData}
                            setFormData={setFormData}
                            handleGenerateNCM={handleGenerateNCM}
                            isGeneratingNCM={isGeneratingNCM}
                        />
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-between gap-3 shrink-0">
                    <div className="flex items-center">
                        <div className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${formData.active ? 'bg-emerald-500' : 'bg-slate-300'}`} onClick={handleToggleActive}>
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform ${formData.active ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Ativo no Catálogo (Anúncios)</span>
                    </div>

                    <div className="flex gap-3">
                        {!formData.hasVariations && !formData.isCombo && formData.id && (
                            <button
                                type="button"
                                onClick={() => setIsConversionModalOpen(true)}
                                className="px-6 py-3 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                title="Transformar este produto simples em um produto com grade de variações"
                            >
                                <i className="bi bi-layers-fill"></i> Converter para Variação
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95"
                        >
                            Sair sem Salvar
                        </button>

                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={loading}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-blue-200 dark:shadow-none"
                        >
                            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                            <i className="bi bi-check-circle-fill"></i>
                            {"Concluir Cadastro"}
                        </button>
                    </div>
                </div>


                {/* Modals */}
                <VariationEditModal
                    isOpen={!!editingVariationId}
                    onClose={() => setEditingVariationId(null)}
                    variation={formData.variations?.find(v => v.id === editingVariationId) || null}
                    suppliers={suppliers}
                    parentProduct={{
                        id: formData.id,
                        description: formData.description || '',
                        unitPrice: formData.unitPrice || 0,
                        costPrice: formData.costPrice || 0,
                        isCombo: formData.isCombo || false,
                        mainSupplierId: formData.mainSupplierId
                    }}

                    onSave={(updatedVar) => {
                        setFormData(prev => ({
                            ...prev,
                            variations: prev.variations?.map(v => v.id === updatedVar.id ? updatedVar : v)
                        }));
                    }}
                />

                <CategorySearchModal
                    isOpen={isCategorySearchOpen}
                    onClose={() => setIsCategorySearchOpen(false)}
                    categories={availableCategories}
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

                <CartesianVariationModal
                    isOpen={isCartesianModalOpen}
                    onClose={() => setIsCartesianModalOpen(false)}
                    isGenerating={isGeneratingBulk}
                    onGenerate={generateBulkVariations}
                />

                <ProductTypeManagementModal
                    isOpen={isProductTypeModalOpen}
                    onClose={() => setIsProductTypeModalOpen(false)}
                />
            </div>
        </div>
    );
};

export default ProductFormModal;
