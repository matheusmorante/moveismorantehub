import { useState, useEffect } from 'react';
import Product, { Variation } from '../../../types/product.type';
import { saveVariation, generateVariationSku, parseVariationImages } from '@/pages/utils/productService';
import { 
    computeVariationName, 
    getVariationAttributePairs, 
    getVariationAttributeValuesInNameOrder, 
    hasDuplicateVariationAttributeCombination,
    getIncompleteVariationAttributes,
    hasVariationAttribute
} from '@/pages/utils/productVariationDefaults';
import { toast } from "react-toastify";
import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import { toTitleCase } from '@/pages/utils/textUtils';

interface UseVariationFormOptions {
    isOpen: boolean;
    onClose: () => void;
    parentId?: string;
    parentProduct: Product;
    variation: Variation | null;
    onSuccess?: () => void;
    onSave?: (updatedVariation: Variation) => void;
}

export function useVariationForm({
    isOpen,
    onClose,
    parentId,
    parentProduct,
    variation,
    onSuccess,
    onSave
}: UseVariationFormOptions) {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'identificacao' | 'fotos' | 'estoque' | 'fiscal' | 'tecnico'>('identificacao');
    
    const [dbAttributes, setDbAttributes] = useState<{ id: string; name: string }[]>([
        { id: 'b9d3bcb2-18fb-4c87-8bcc-a59fc4300870', name: 'Cor' },
        { id: 'a50a7b4d-aad6-4dfe-aae0-a909e4b9bc06', name: 'Tamanho' }
    ]);
    const [dbAttributeValues, setDbAttributeValues] = useState<{ id: string; attribute_id: string; value: string }[]>([]);
    const [isManageAttributesOpen, setIsManageAttributesOpen] = useState(false);

    const [formData, setFormData] = useState<Variation | null>(null);
    const [allParentImages, setAllParentImages] = useState<string[]>([]);
    const [diferenciarTitulo, setDiferenciarTitulo] = useState<boolean>(false);

    const [varDiscountPercent, setVarDiscountPercent] = useState("");
    const [varDiscountFixed, setVarDiscountFixed] = useState("");

    useEffect(() => {
        if (formData && !diferenciarTitulo) {
            if (formData.title !== formData.name) {
                setFormData(prev => prev ? { ...prev, title: prev.name, marketplaceTitle: prev.name } : null);
            }
        }
    }, [formData?.name, diferenciarTitulo]);

    // O nome da variação é sempre composto pelo nome atual do pai e pelos
    // atributos. Isso mantém o valor salvo igual ao que é mostrado na tela.
    useEffect(() => {
        setFormData(previous => {
            if (!previous) return previous;
            const nextName = computeVariationName(
                parentProduct.name || parentProduct.description || '',
                previous.attributes || []
            ) || 'Variação';

            return previous.name === nextName ? previous : { ...previous, name: nextName };
        });
    }, [parentProduct.name, parentProduct.description, formData?.attributes]);

    // Atualiza a cópia de trabalho da variação enquanto o pai é editado. Isso
    // preserva a prévia correta ao alternar de "Herdado" para "Manual", sem
    // persistir a alteração fora do fluxo normal de salvar.
    useEffect(() => {
        setFormData(previous => {
            if (!previous) return previous;
            const next = { ...previous };
            let changed = false;
            const inherit = <K extends keyof Variation>(field: K, enabled: boolean, value: Variation[K]) => {
                if (enabled && next[field] !== value) {
                    next[field] = value;
                    changed = true;
                }
            };
            inherit('unitPrice', Boolean(previous.syncUnitPrice), parentProduct.unitPrice || 0);
            inherit('promoPrice', previous.syncPromoPrice !== false && Boolean(previous.syncUnitPrice), parentProduct.promoPrice);
            inherit('costPrice', Boolean(previous.syncCostPrice), parentProduct.costPrice || 0);
            inherit('description', Boolean(previous.syncDescription), parentProduct.description);
            inherit('width', Boolean(previous.syncWidth), parentProduct.width);
            inherit('height', Boolean(previous.syncHeight), parentProduct.height);
            inherit('depth', Boolean(previous.syncDepth), parentProduct.depth);
            inherit('weight', Boolean(previous.syncWeight), parentProduct.weight);
            if (previous.syncFiscal && JSON.stringify(previous.fiscal || {}) !== JSON.stringify(parentProduct.fiscal || {})) {
                next.fiscal = parentProduct.fiscal ? { ...parentProduct.fiscal } : undefined;
                changed = true;
            }
            return changed ? next : previous;
        });
    }, [parentProduct.unitPrice, parentProduct.promoPrice, parentProduct.costPrice, parentProduct.description, parentProduct.width, parentProduct.height, parentProduct.depth, parentProduct.weight, parentProduct.fiscal]);

    const getParentDiscountPercent = () => {
        const orig = parentProduct?.unitPrice || 0;
        const promo = parentProduct?.promoPrice || 0;
        if (orig > 0 && promo > 0 && promo < orig) {
            return ((orig - promo) / orig * 100).toFixed(1);
        }
        return "";
    };

    const getParentDiscountFixed = () => {
        const orig = parentProduct?.unitPrice || 0;
        const promo = parentProduct?.promoPrice || 0;
        if (orig > 0 && promo > 0 && promo < orig) {
            return (orig - promo).toFixed(2);
        }
        return "";
    };

    const getDefaultVariationName = (attributes: Variation['attributes'] = []) => {
        return computeVariationName(
            parentProduct.name || parentProduct.description || '',
            attributes
        ) || 'Variação';
    };

    const getDefaultVariationTitle = (attributes: Variation['attributes'] = []) => {
        const parentTitle = (parentProduct.title || parentProduct.marketplaceTitle || parentProduct.name || parentProduct.description || '').trim();
        const attributeValues = getVariationAttributeValuesInNameOrder(attributes);
        if (attributeValues.length > 0) {
            return toTitleCase([parentTitle, ...attributeValues].filter(Boolean).join(' '));
        }
        return toTitleCase(parentTitle || 'Variação');
    };

    const fetchDbAttributes = async () => {
        try {
            const [attrRes, valRes] = await Promise.all([
                supabase.from("attributes").select("*").order("name"),
                supabase.from("attribute_values").select("*").order("value")
            ]);
            setDbAttributes((attrRes.data || []) as { id: string; name: string }[]);
            setDbAttributeValues((valRes.data || []) as { id: string; attribute_id: string; value: string }[]);
        } catch (err) {
            console.error("Erro ao buscar atributos globais:", err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setAllParentImages([]);
            const realParentId = parentProduct?.parentId || parentId || parentProduct?.id;
            if (realParentId) {
                supabase
                    .from('product_images')
                    .select('image_url')
                    .eq('product_id', realParentId)
                    .order('created_at', { ascending: true })
                    .then(({ data }) => {
                        const databaseImages = (data || []).map(i => i.image_url).filter(Boolean);
                        const formImages = (parentProduct?.images || []).filter(Boolean);
                        setAllParentImages(Array.from(new Set([...databaseImages, ...formImages])));
                    });
            } else if (parentProduct?.images?.length) {
                setAllParentImages(parentProduct.images);
            }
        }
    }, [isOpen, parentProduct, parentId]);

    useEffect(() => {
        if (isOpen) {
            fetchDbAttributes();
            setActiveTab('identificacao');
            if (variation) {
                setFormData({
                    ...variation,
                    title: variation.title || variation.marketplaceTitle || '',
                    images: parseVariationImages((variation as any).image_url, variation.images),
                    syncUnitPrice: variation.syncUnitPrice ?? true,
                    syncDescription: variation.syncDescription ?? true,
                    syncCostPrice: variation.syncCostPrice ?? true,
                    syncFiscal: variation.syncFiscal ?? true,
                    syncWidth: variation.syncWidth ?? true,
                    syncHeight: variation.syncHeight ?? true,
                    syncDepth: variation.syncDepth ?? true,
                    syncWeight: variation.syncWeight ?? true
                });
                setDiferenciarTitulo(Boolean(variation.title && variation.title !== variation.name) || Boolean(variation.marketplaceTitle && variation.marketplaceTitle !== variation.name));
                
                const orig = Number(variation.syncUnitPrice ? parentProduct.unitPrice : variation.unitPrice || 0);
                const promo = Number(variation.syncUnitPrice ? parentProduct.promoPrice : variation.promoPrice || 0);
                if (orig > 0 && promo > 0 && promo < orig) {
                    const fixed = orig - promo;
                    const pct = (fixed / orig) * 100;
                    setVarDiscountFixed(fixed.toFixed(2));
                    setVarDiscountPercent(pct.toFixed(1));
                } else {
                    setVarDiscountPercent("");
                    setVarDiscountFixed("");
                }
            } else {
                const parentCode = parentProduct.code || '000000';
                setFormData({
                    id: crypto.randomUUID(),
                    sku: generateVariationSku(parentCode, parentProduct.variations || []),
                    name: getDefaultVariationName([]),
                    title: getDefaultVariationTitle([]),
                    marketplaceTitle: getDefaultVariationTitle([]),
                    stock: 0,
                    unitPrice: parentProduct.unitPrice || 0,
                    costPrice: parentProduct.costPrice || 0,
                    active: true,
                    attributes: [],
                    images: [],
                    syncUnitPrice: true,
                    syncDescription: true,
                    syncCostPrice: true,
                    syncFiscal: true,
                    syncWidth: true,
                    syncHeight: true,
                    syncDepth: true,
                    syncWeight: true,
                    fiscal: {
                        ncm: parentProduct.fiscal?.ncm || '',
                        cest: parentProduct.fiscal?.cest || '',
                        origem: parentProduct.fiscal?.origem || '0',
                        cst: parentProduct.fiscal?.cst || '',
                        cfop: parentProduct.fiscal?.cfop || '',
                        pisCst: parentProduct.fiscal?.pisCst || '',
                        cofinsCst: parentProduct.fiscal?.cofinsCst || '',
                        icmsPercent: parentProduct.fiscal?.icmsPercent || 0,
                        ncmDescription: parentProduct.fiscal?.ncmDescription || ''
                    }
                });
                setVarDiscountPercent("");
                setVarDiscountFixed("");
            }
        }
    // A inicialização deve ocorrer apenas ao abrir ou trocar a variação (pelo ID).
    // Alterar o pai durante a edição é tratado pelos efeitos de sincronização acima,
    // sem apagar os atributos que já foram informados.
    }, [variation?.id, isOpen]);

    const handlePriceChange = (valStr: string) => {
        if (!formData) return;
        const newPrice = parseFloat(valStr) || 0;
        setFormData(prev => prev ? { ...prev, unitPrice: newPrice, syncUnitPrice: false } : null);
        
        const orig = newPrice;
        if (orig <= 0) {
            setVarDiscountPercent("");
            setVarDiscountFixed("");
            setFormData(prev => prev ? { ...prev, promoPrice: undefined } : null);
            return;
        }

        if (varDiscountPercent) {
            const pct = parseFloat(varDiscountPercent);
            if (!isNaN(pct)) {
                const fixed = orig * (pct / 100);
                setVarDiscountFixed(fixed.toFixed(2));
                const promo = orig - fixed;
                setFormData(prev => prev ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0 } : null);
            }
        }
    };

    const handleDiscountPercentChange = (valStr: string) => {
        if (!formData) return;
        setVarDiscountPercent(valStr);
        const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
        if (orig <= 0 || valStr === "") {
            setVarDiscountFixed("");
            setFormData(prev => prev ? { ...prev, promoPrice: undefined } : null);
            return;
        }

        const pct = parseFloat(valStr);
        if (isNaN(pct) || pct < 0) {
            setVarDiscountFixed("");
            setFormData(prev => prev ? { ...prev, promoPrice: undefined } : null);
            return;
        }

        const fixed = orig * (pct / 100);
        setVarDiscountFixed(fixed.toFixed(2));
        const promo = orig - fixed;
        setFormData(prev => prev ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0, syncUnitPrice: false } : null);
    };

    const handleDiscountFixedChange = (valStr: string) => {
        if (!formData) return;
        setVarDiscountFixed(valStr);
        const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
        if (orig <= 0 || valStr === "") {
            setVarDiscountPercent("");
            setFormData(prev => prev ? { ...prev, promoPrice: undefined } : null);
            return;
        }

        const fixed = parseFloat(valStr);
        if (isNaN(fixed) || fixed < 0) {
            setVarDiscountPercent("");
            setFormData(prev => prev ? { ...prev, promoPrice: undefined } : null);
            return;
        }

        const pct = (fixed / orig) * 100;
        setVarDiscountPercent(pct.toFixed(1));
        const promo = orig - fixed;
        setFormData(prev => prev ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0, syncUnitPrice: false } : null);
    };

    const handlePromoPriceFieldChange = (valStr: string) => {
        if (!formData) return;
        const promo = parseFloat(valStr) || 0;
        setFormData(prev => prev ? { ...prev, promoPrice: promo > 0 ? promo : undefined, syncUnitPrice: false } : null);
        
        const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
        if (orig <= 0 || valStr === "" || promo >= orig) {
            setVarDiscountPercent("");
            setVarDiscountFixed("");
            return;
        }

        const fixed = orig - promo;
        const pct = (fixed / orig) * 100;
        setVarDiscountFixed(fixed.toFixed(2));
        setVarDiscountPercent(pct.toFixed(1));
    };

    const handleChange = (field: keyof Variation, value: any) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const updateCost = (fields: Partial<Variation>) => {
        setFormData(prev => {
            if (!prev) return null;
            const next = { ...prev, ...fields, syncCostPrice: false };
            const cost = next.costPrice || 0;
            const ipi = next.ipiPercent || 0;
            const freight = next.freightCost || 0;
            const freightType = next.freightType || 'fixed';

            let finalCost = cost + (cost * (ipi / 100));
            if (freightType === 'fixed') {
                finalCost += freight;
            } else {
                finalCost += cost * (freight / 100);
            }

            next.finalPurchasePrice = Number(finalCost.toFixed(2));
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        const cleanAttributes = (Array.isArray(formData.attributes) ? formData.attributes : []).map(attr => ({
            ...attr,
            name: toTitleCase(attr.name),
            value: toTitleCase(attr.value),
        }));
        const generatedName = computeVariationName(parentProduct.name || parentProduct.description || '', cleanAttributes);
        let finalVariation = {
            ...formData,
            attributes: cleanAttributes,
            name: toTitleCase(generatedName || formData.name || ''),
            title: toTitleCase(diferenciarTitulo ? (formData.title || generatedName || formData.name || '') : generatedName),
            marketplaceTitle: toTitleCase(diferenciarTitulo ? (formData.marketplaceTitle || formData.title || generatedName || formData.name || '') : generatedName),
            syncFiscal: true
        };

        // Validação estrita: obrigatório escolher pelo menos um atributo e definir seu valor
        const attributesList = cleanAttributes;
        if (attributesList.length === 0) {
            toast.warn("É obrigatório escolher pelo menos um atributo e definir seu valor para a variação.");
            setActiveTab('identificacao');
            return;
        }

        const incompleteAttrs = getIncompleteVariationAttributes(formData);
        if (incompleteAttrs.length > 0) {
            const firstIncomplete = incompleteAttrs[0];
            if (firstIncomplete.missingReason === 'missing_name') {
                toast.warn("Selecione o atributo para todos os itens adicionados.");
            } else {
                toast.warn(`O atributo "${firstIncomplete.name}" está sem valor. Todo atributo adicionado deve ter seu valor definido.`);
            }
            setActiveTab('identificacao');
            return;
        }

        if (!hasVariationAttribute(finalVariation)) {
            toast.warn("Informe pelo menos um atributo com valor válido para a variação!");
            setActiveTab('identificacao');
            return;
        }

        if (hasDuplicateVariationAttributeCombination(finalVariation, parentProduct.variations || [])) {
            toast.error("Já existe outra variação com a mesma combinação de atributos e valores.");
            setActiveTab('identificacao');
            return;
        }

        if (finalVariation.syncDescription) {
            finalVariation.description = parentProduct.description || '';
        }
        if (finalVariation.syncWidth) {
            finalVariation.width = parentProduct.width || 0;
        }
        if (finalVariation.syncHeight) {
            finalVariation.height = parentProduct.height || 0;
        }
        if (finalVariation.syncDepth) {
            finalVariation.depth = parentProduct.depth || 0;
        }
        if (finalVariation.syncWeight) {
            finalVariation.weight = parentProduct.weight || 0;
        }
        if (finalVariation.syncUnitPrice) {
            finalVariation.unitPrice = parentProduct.unitPrice || 0;
            finalVariation.promoPrice = parentProduct.promoPrice || 0;
        }
        if (finalVariation.syncCostPrice) {
            finalVariation.costPrice = parentProduct.costPrice || 0;
        }

        if (onSave) {
            onSave({
                ...finalVariation,
                sku: finalVariation.sku || 'VAR-' + Math.random().toString(36).substring(2, 10).toUpperCase()
            });
            onClose();
            return;
        }

        setLoading(true);
        try {
            await saveVariation(parentId || "", {
                ...finalVariation,
                sku: finalVariation.sku || 'VAR-' + Math.random().toString(36).substring(2, 10).toUpperCase()
            });
            toast.success("Variação salva com sucesso!");
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar a variação.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        activeTab,
        setActiveTab,
        formData,
        setFormData,
        allParentImages,
        diferenciarTitulo,
        setDiferenciarTitulo,
        dbAttributes,
        dbAttributeValues,
        isManageAttributesOpen,
        setIsManageAttributesOpen,
        fetchDbAttributes,
        varDiscountPercent,
        varDiscountFixed,
        getParentDiscountPercent,
        getParentDiscountFixed,
        getDefaultVariationName,
        getDefaultVariationTitle,
        handlePriceChange,
        handleDiscountPercentChange,
        handleDiscountFixedChange,
        handlePromoPriceFieldChange,
        handleChange,
        updateCost,
        handleSubmit
    };
}
