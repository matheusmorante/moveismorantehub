import React, { useState, useEffect, useCallback, useRef } from "react";
import Product, { Variation, FiscalInfo } from "../../types/product.type";
import Person from "../../types/person.type";
import { saveProduct, getFullProduct } from '@/pages/utils/productService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { getSettings } from '@/pages/utils/settingsService';
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
import ProductEcommerceTab from "./components/tabs/ProductEcommerceTab";
import ProductFiscalTab from "./components/tabs/ProductFiscalTab";
import ProductConversionModal from "./components/ProductConversionModal";

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
    onEdit?: (id: string) => void
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
                <input
                    value={v.name}
                    readOnly
                    className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-400 dark:text-slate-500 cursor-default"
                    placeholder="VARIAÇÃO GERADA"
                />
            </div>
        </td>
        <td className="px-6 py-4">
            <input
                value={v.sku}
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
                onChange={(e) => updateVariation(e.target.value === '' ? '' : v.id, 'stock', parseInt(e.target.value))}
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
    const [bulkVariationOptions, setBulkVariationOptions] = useState<{ name: string, values: string[] }[]>([]);
    const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
    const [editingVariationComboId, setEditingVariationComboId] = useState<string | null>(null);
    const [editingVariationId, setEditingVariationId] = useState<string | null>(null);
    const [isCategorySearchOpen, setIsCategorySearchOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [availableCategories, setAvailableCategories] = useState<{ id: string, name: string, parent_id?: string | null }[]>([]);
    const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);

    const [formData, setFormData] = useState<Partial<Product>>({
        description: "",
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
        ...initialData
    });

    useEffect(() => {
        let isMounted = true;
        const loadFullData = async () => {
            if (product?.id && isOpen) {
                const full = await getFullProduct(product.id);
                if (full && isMounted) {
                    setFormData(full);
                }
            } else if (product) {
                setFormData(product);
            } else if (initialData) {
                setFormData(prev => ({ ...prev, ...initialData }));
            }
        };
        loadFullData();
        return () => { isMounted = false; };
    }, [product, initialData, isOpen]);

    useEffect(() => {
        const fetchSuppliers = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const companyId = user?.user_metadata?.company_id;
            
            let query = supabase.from('people').select('*').eq('person_type', 'suppliers');
            
            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            const { data } = await query.order('full_name');
            if (data) setSuppliers(data);
        };
        fetchSuppliers();

        const fetchCategories = async () => {
            const { data } = await supabase.from('categories').select('id, name, parent_id').order('name');
            if (data) setAvailableCategories(data);
        };
        fetchCategories();
    }, []);

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

    // Sync variation prices/costs
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
                if (v.syncDescription && v.name !== formData.description) {
                    // updated name if sync description? actually name is usually Color/Size
                    // maybe we don't sync name but the base description in display
                }
                return updated ? newV : v;
            });
            if (JSON.stringify(nextVariations) !== JSON.stringify(formData.variations)) {
                setFormData(prev => ({ ...prev, variations: nextVariations }));
            }
        }
    }, [formData.unitPrice, formData.costPrice, formData.description]);

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

    const updateVariation = (id: string, field: keyof Variation, value: any) => {
        setFormData(prev => ({
            ...prev,
            variations: prev.variations?.map(v => v.id === id ? { ...v, [field]: value } : v)
        }));
    };

    const addVariation = () => {
        const newVar: Variation = {
            id: Math.random().toString(36).substr(2, 9),
            name: "",
            sku: "",
            unitPrice: formData.unitPrice || 0,
            costPrice: formData.costPrice || 0,
            stock: 0,
            syncUnitPrice: true,
            syncCostPrice: true,
            syncDescription: true,
            images: [],
            active: true,
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

    const generateBulkVariations = () => {
        setIsGeneratingBulk(true);
        setTimeout(() => {
            const attributes = bulkVariationOptions.filter(o => o.name && o.values.length > 0);
            if (attributes.length === 0) {
                setIsGeneratingBulk(false);
                return;
            }

            // Generate Cartesian Product
            // Start with an array containing one empty combination object
            let combinations: any[] = [{}];

            attributes.forEach(attr => {
                const newCombinations: any[] = [];
                combinations.forEach(combo => {
                    attr.values.forEach(val => {
                        // Create a new combination for each value of the current attribute
                        newCombinations.push({ ...combo, [attr.name]: val });
                    });
                });
                combinations = newCombinations;
            });

            const newVars: Variation[] = combinations.map(combo => {
                // Generate name in formal pattern: "COLOR: BLUE / SIZE: LARGE"
                // Sort keys to maintain consistency
                const sortedKeys = Object.keys(combo).sort();
                const nameParts = sortedKeys.map(key => `${key.toUpperCase()}: ${String(combo[key]).toUpperCase()}`);
                const name = nameParts.join(' / ');
                
                // SKU suffix based on values only
                const skuSuffix = sortedKeys.map(key => String(combo[key]).toUpperCase().replace(/\s+/g, '')).join('-');
                
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    name,
                    sku: formData.code ? `${formData.code}-${skuSuffix}` : "",
                    unitPrice: formData.unitPrice || 0,
                    costPrice: formData.costPrice || 0,
                    stock: 0,
                    syncUnitPrice: true,
                    syncCostPrice: true,
                    syncDescription: true,
                    images: [],
                    active: true,
                    attributes: Object.entries(combo).map(([name, value]) => ({ name, value: String(value) })),
                    comboItems: []
                };
            });

            setFormData(prev => ({
                ...prev,
                variations: [...(prev.variations || []), ...newVars],
                hasVariations: true
            }));
            setIsGeneratingBulk(false);
            setBulkVariationOptions([]); // Clear selector after generation
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
        if (!data.brand) missing.push("Marca / Fabricante");
        if (!data.line && !data.hasNoLine) missing.push("Modelo / Linha (ou marque 'Sem Modelo')");
        if (!data.material) missing.push("Material");
        if (!data.colors) missing.push("Cores Disponíveis");
        
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
            variations: prev.variations?.map(v => ({
                ...v,
                sku: `${prev.code}-${v.name.toUpperCase().replace(/\s+/g, '').replace(/\//g, '-')}`
            }))
        }));
        toast.success("SKUs das variações atualizados!");
    };

    const handleSubmit = async () => {
        const requiredFields = {
            product: {
                description: true,
                category: true,
                unitPrice: true,
                costPrice: true,
                brand: false,
                minStock: true
            }
        };

        if (!formData.description) {
            toast.error("O título do produto é obrigatório.");
            setActiveTab('geral');
            return;
        }

        if (!formData.code) {
            toast.error("O código (SKU) do produto é obrigatório.");
            setActiveTab('geral');
            return;
        }

        if (!formData.categoryIds?.length) {
            toast.error("Selecione pelo menos uma categoria.");
            setActiveTab('geral');
            return;
        }

        if (!formData.unitPrice || formData.unitPrice <= 0) {
            toast.error("O preço de venda é obrigatório.");
            setActiveTab('geral');
            return;
        }

        // Validate that variations have codes and they are different from parent
        if (formData.hasVariations && formData.variations?.length) {
            const invalidVar = formData.variations.find(v => !v.sku || v.sku === formData.code);
            if (invalidVar) {
                toast.error(`A variação "${invalidVar.name}" precisa de um SKU único e diferente do pai.`);
                setActiveTab('variacoes');
                return;
            }
            
            // Check for duplicate SKUs within variations
            const skus = formData.variations.map(v => v.sku);
            const duplicateSku = skus.find((sku, index) => skus.indexOf(sku) !== index);
            if (duplicateSku) {
                toast.error(`Existem variações com SKUs duplicados: ${duplicateSku}`);
                setActiveTab('variacoes');
                return;
            }
        }

        setLoading(true);
        try {
            // Normalização para MAIÚSCULAS global
            const normalizedData = { 
                ...formData, 
                description: formData.description?.toUpperCase(),
                marketplaceTitle: formData.marketplaceTitle?.toUpperCase(),
                brand: formData.brand?.toUpperCase(),
                line: formData.line?.toUpperCase(),
                material: formData.material?.toUpperCase(),
                colors: formData.colors?.toUpperCase(),
                variations: formData.variations?.map(v => ({
                    ...v,
                    name: v.name.toUpperCase(),
                    sku: v.sku.toUpperCase(),
                    attributes: v.attributes?.map(a => ({
                        name: a.name.toUpperCase(),
                        value: a.value.toUpperCase()
                    }))
                })),
                itemType: formData.itemType || 'product', 
                isDraft: false 
            } as Product;

            await saveProduct(normalizedData);
            toast.success(product ? "Atualizado com sucesso!" : "Criado com sucesso!");
            if (onSuccess) onSuccess(normalizedData);
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar o produto.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
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
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="px-10 border-b border-slate-50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
                    <div className="flex gap-10">
                        {[
                            { id: 'geral', label: 'Cadastro Geral', icon: 'bi-info-circle' },
                            { id: 'estoque', label: 'Estoque / Custos', icon: 'bi-box-seam' },
                            { id: 'variacoes', label: 'Atributos / Grade', icon: 'bi-grid-3x3-gap' },
                            { id: 'ecommerce', label: 'Vitrine / E-commerce / Marketplace', icon: 'bi-cart-check' },
                            { id: 'fiscal', label: 'Tributário / NF', icon: 'bi-file-earmark-text' },
                        ].map(tab => (
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
                            formData={formData}
                            setFormData={setFormData}
                            availableCategories={availableCategories}
                            isGeneratingCategory={isGeneratingCategory}
                            handleGenerateCategory={handleGenerateCategory}
                            handleGenerateComboName={handleGenerateComboName}
                            isGeneratingComboName={isGeneratingComboName}
                            onOpenCategorySearch={() => setIsCategorySearchOpen(true)}
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
                            bulkVariationOptions={bulkVariationOptions}
                            setBulkVariationOptions={setBulkVariationOptions}
                            generateBulkVariations={generateBulkVariations}
                            addVariation={addVariation}
                            VariationRow={VariationRow}
                            updateVariation={updateVariation}
                            removeVariation={removeVariation}
                            setFormData={setFormData}
                            isCombo={formData.isCombo || false}
                            onEditCombo={setEditingVariationComboId}
                            onEdit={setEditingVariationId}
                            regenerateAllSkus={regenerateAllVariationSkus}
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
                                title="Transformar este produto simples em um produto com grade de varia├º├╡es"
                            >
                                <i className="bi bi-layers-fill"></i> Converter para Varia├º├úo
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95"
                        >
                            Sair sem Salvar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-blue-200 dark:shadow-none"
                        >
                            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                            <i className="bi bi-check-circle-fill"></i>
                            {product ? "Salvar Alterações" : "Concluir Cadastro"}
                        </button>
                    </div>
                </div>

                {/* Modals */}
                <VariationEditModal
                    isOpen={!!editingVariationId}
                    onClose={() => setEditingVariationId(null)}
                    variation={formData.variations?.find(v => v.id === editingVariationId) || null}
                    parentProduct={{
                        id: formData.id,
                        unitPrice: formData.unitPrice || 0,
                        costPrice: formData.costPrice || 0,
                        isCombo: formData.isCombo || false
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
                    onSelect={(id) => {
                        setFormData(prev => {
                            const ids = prev.categoryIds || [];
                            if (ids.includes(id)) {
                                return { ...prev, categoryIds: ids.filter(i => i !== id) };
                            } else {
                                const cat = availableCategories.find(c => c.id === id);
                                let nextIds = [...ids, id];
                                if (cat?.parent_id && !nextIds.includes(cat.parent_id)) {
                                    nextIds.push(cat.parent_id);
                                }
                                return { ...prev, categoryIds: nextIds };
                            }
                        });
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
                            toast.success("Produto convertido! O c├│digo e estoque agora est├úo na primeira varia├º├úo.");
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default ProductFormModal;
