import { useState, useEffect } from 'react';
import Product from '../../../types/product.type';
import { aiService } from '@/pages/utils/aiService';
import { getSettings } from '@/pages/utils/settingsService';
import { toast } from 'react-toastify';

export function useProductFormAi(
    formData: Partial<Product>,
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>,
    availableCategories: any[]
) {
    const [isGeneratingCategory, setIsGeneratingCategory] = useState(false);
    const [isGeneratingComboName, setIsGeneratingComboName] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isGeneratingNCM, setIsGeneratingNCM] = useState(false);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [isImprovingDescription, setIsImprovingDescription] = useState(false);
    const [isFillingFiscalWithAI, setIsFillingFiscalWithAI] = useState(false);
    const [isSuggestingPrices, setIsSuggestingPrices] = useState(false);
    const [suggestPricesResults, setSuggestPricesResults] = useState<{ low: any; medium: any; high: any } | null>(null);

    const handleGenerateCategory = async (isAutoTrigger = false) => {
        const title = (formData.name || formData.title || formData.description || '').trim();
        if (!title) {
            if (!isAutoTrigger) toast.warning('Digite o nome ou título para sugerir categoria');
            return;
        }
        setIsGeneratingCategory(true);
        try {
            const suggestionRes = await aiService.suggestCategory(title, availableCategories.map(c => c.name || c.category || ''));
            const suggestedCatName = typeof suggestionRes === 'string' ? suggestionRes : (suggestionRes?.category || '');
            if (suggestedCatName) {
                const found = availableCategories.find(c => (c.name || c.category || '').trim().toLowerCase() === suggestedCatName.trim().toLowerCase());
                if (found) {
                    setFormData((prev: Partial<Product>) => {
                        if (prev.categoryIds?.includes(found.id)) return prev;
                        return { ...prev, categoryIds: [...(prev.categoryIds || []), found.id] };
                    });
                    if (!isAutoTrigger) toast.success(`Categoria sugerida: ${found.name || found.category}`);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingCategory(false);
        }
    };

    const handleGenerateComboName = async () => {
        if (!formData.comboItems?.length) return toast.warning('Adicione itens ao combo primeiro');
        setIsGeneratingComboName(true);
        try {
            const items = formData.comboItems.map((i: any) => `${i.quantity}x ${i.description}`).join(', ');
            const name = await aiService.generateComboName(items);
            setFormData((prev: Partial<Product>) => ({ ...prev, description: name }));
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingComboName(false);
        }
    };

    const handleGenerateAIDescription = async (type: 'whatsapp' | 'ecommerce') => {
        if (!formData.description) return toast.warning('O produto precisa de um título');
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
            if (type === 'whatsapp') setFormData((prev: Partial<Product>) => ({ ...prev, whatsappDescription: desc }));
            else setFormData((prev: Partial<Product>) => ({ ...prev, ecommerceDescription: desc }));
            toast.success('Descrição gerada com IA!');
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleGenerateMarketplaceTitle = async () => {
        if (!formData.description) return toast.warning('O produto precisa de um título base');
        setIsGeneratingTitle(true);
        try {
            const { title } = await aiService.generateMarketplaceTitle({
                description: formData.description,
                material: formData.material
            });
            setFormData((prev: Partial<Product>) => ({ ...prev, title, marketplaceTitle: title }));
            toast.success('Título para marketplace gerado!');
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingTitle(false);
        }
    };

    const handleAutoFillFiscalWithAI = async () => {
        const title = (formData.name || formData.description || '').trim();
        if (!title) {
            return toast.warning('Informe o nome ou título do produto para preenchimento fiscal.');
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
                companyName: settings.companyName || 'Móveis Morante',
                companyAddress: settings.companyAddress || 'Curitiba - PR',
                companyCnpj: settings.companyCnpj || ''
            });

            setFormData((prev: Partial<Product>) => ({
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
            toast.error(error?.message || 'Erro ao preencher dados fiscais com IA.');
        } finally {
            setIsFillingFiscalWithAI(false);
        }
    };

    const handleGenerateNCM = async (isAutoTrigger = false) => {
        const title = (formData.name || formData.description || '').trim();
        if (!title) {
            if (!isAutoTrigger) toast.warning('Título necessário para buscar NCM');
            return;
        }
        setIsGeneratingNCM(true);
        try {
            const category = availableCategories.find(c => formData.categoryIds?.includes(c.id))?.name || formData.category || '';
            const description = formData.description || formData.ecommerceDescription || '';
            const { ncm, description: ncmDescription } = await aiService.findNCM(
                title,
                formData.material || '',
                description,
                category
            );
            if (ncm) {
                setFormData((prev: Partial<Product>) => ({
                    ...prev,
                    fiscal: { ...prev.fiscal!, ncm, ncmDescription }
                }));
                if (!isAutoTrigger) {
                    toast.success(`NCM Encontrado: ${ncm}`);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingNCM(false);
        }
    };

    // Auto-preencher NCM com IA quando Título, Descrição e Categoria forem preenchidos e NCM estiver vazio
    useEffect(() => {
        const title = (formData.name || formData.description || '').trim();
        const temCategoria = (formData.categoryIds && formData.categoryIds.length > 0) || !!formData.category;
        const ncmVazio = !formData.fiscal?.ncm || formData.fiscal.ncm.trim() === '';

        if (title && temCategoria && ncmVazio && !isGeneratingNCM) {
            const timer = setTimeout(() => {
                handleGenerateNCM(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [formData.name, formData.description, formData.categoryIds, formData.category, formData.fiscal?.ncm]);

    // Auto-selecionar Categoria por correspondência inteligente ou IA quando Nome do Produto mudar e categoria estiver vazia
    useEffect(() => {
        const title = (formData.name || formData.title || formData.description || '').trim();
        const hasCategories = Boolean(formData.categoryIds && formData.categoryIds.length > 0);

        if (title.length >= 3 && !hasCategories && availableCategories.length > 0 && !isGeneratingCategory) {
            const timer = setTimeout(() => {
                const titleLower = title.toLowerCase();
                // 1. Tenta correspondência direta com as categorias disponíveis (ex: "BELICHE" -> "Beliches")
                const matchedCategory = availableCategories.find(c => {
                    const cName = (c.name || c.category || '').toLowerCase().trim();
                    if (!cName) return false;
                    return titleLower.includes(cName) || cName.includes(titleLower);
                });

                if (matchedCategory) {
                    setFormData((prev: Partial<Product>) => {
                        if (prev.categoryIds && prev.categoryIds.length > 0) return prev;
                        return { ...prev, categoryIds: [matchedCategory.id] };
                    });
                } else {
                    // 2. Se não casar diretamente por nome, consulta a IA
                    handleGenerateCategory(true);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [formData.name, formData.title, formData.description, formData.categoryIds, availableCategories]);

    const handleImproveDescriptionWithAI = async () => {
        const nome = (formData.name || formData.description || '').trim();
        const temMedida = Number(formData.width) > 0 || Number(formData.height) > 0 || Number(formData.depth) > 0;
        const temCategoria = formData.categoryIds && formData.categoryIds.length > 0;

        if (!nome) {
            return toast.warning('Preencha o nome do produto antes de aperfeiçoar a descrição.');
        }
        if (!temMedida) {
            return toast.warning('Informe pelo menos uma medida (Altura, Largura ou Profundidade) antes de aperfeiçoar.');
        }
        if (!temCategoria) {
            return toast.warning('Selecione pelo menos uma categoria antes de aperfeiçoar a descrição.');
        }

        setIsImprovingDescription(true);
        try {
            const result = await aiService.improveProductDescription({
                currentDescription: formData.description || '',
                title: formData.name || '',
                material: formData.material,
                brand: formData.brand,
                line: formData.line,
                width: formData.width,
                height: formData.height,
                depth: formData.depth,
                weight: formData.weight
            });

            setFormData((prev: Partial<Product>) => ({
                ...prev,
                description: result.improvedDescription
            }));
            toast.success('Descrição aperfeiçoada com sucesso! ✨');
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || 'Erro ao aperfeiçoar descrição com IA.');
        } finally {
            setIsImprovingDescription(false);
        }
    };

    const handleSuggestPrices = async () => {
        if (!formData.description) return toast.warning('O produto precisa de um título');
        if (!formData.finalPurchasePrice || formData.finalPurchasePrice <= 0)
            return toast.warning('Preço de custo final é necessário para sugerir preços');

        setIsSuggestingPrices(true);
        try {
            const suggestions = await aiService.suggestPrices({
                description: formData.description,
                costPrice: formData.finalPurchasePrice,
                material: formData.material
            });

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
            toast.info('Sugestões de preço geradas!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao sugerir preços');
        } finally {
            setIsSuggestingPrices(false);
        }
    };

    const isAiProcessing = isGeneratingCategory || isGeneratingComboName || isGeneratingDescription || isGeneratingNCM || isGeneratingTitle || isImprovingDescription || isFillingFiscalWithAI || isSuggestingPrices;

    return {
        isAiProcessing,
        isGeneratingCategory,
        isGeneratingComboName,
        isGeneratingDescription,
        isGeneratingNCM,
        isGeneratingTitle,
        isImprovingDescription,
        isFillingFiscalWithAI,
        isSuggestingPrices,
        suggestPricesResults,
        setSuggestPricesResults,
        handleGenerateCategory,
        handleGenerateComboName,
        handleGenerateAIDescription,
        handleGenerateMarketplaceTitle,
        handleAutoFillFiscalWithAI,
        handleGenerateNCM,
        handleImproveDescriptionWithAI,
        handleSuggestPrices
    };
}

