import { useState, useEffect, useRef } from 'react';
import type Product from '../../../types/product.type';
import { aiService } from '@/pages/utils/aiService';
import type { NcmAiSuggestion } from '@/pages/utils/aiService/aiFiscalClassificationService';
import { getSettings } from '@/pages/utils/settingsService';
import { matchCategoryByRules } from '@/pages/utils/categoryResolutionService';
import { isQuotaExceeded, notifyAiQuotaWarning } from '@/services/aiGateway/aiQuotaNotifier';
import { toast } from 'react-toastify';

export interface CategoryOptionLike {
    readonly id: string;
    readonly name?: string;
    readonly category?: string;
}

export interface PriceSuggestionTier {
    price: number;
    margin?: number;
}

export interface SuggestPricesResult {
    readonly low?: PriceSuggestionTier;
    readonly medium?: PriceSuggestionTier;
    readonly high?: PriceSuggestionTier;
}

export function useProductFormAi(
    formData: Partial<Product>,
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>,
    availableCategories: readonly CategoryOptionLike[],
    isQuickRegister = false,
    isOpen = true
) {
    const [isGeneratingCategory, setIsGeneratingCategory] = useState(false);
    const [isGeneratingComboName, setIsGeneratingComboName] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isGeneratingNCM, setIsGeneratingNCM] = useState(false);
    const [ncmSuggestion, setNcmSuggestion] = useState<NcmAiSuggestion | null>(null);
    const [isNcmAutoEnabled, setIsNcmAutoEnabled] = useState(true);
    const ncmEnabledRef = useRef(true);
    const ncmRequestVersion = useRef(0);
    const ncmInFlight = useRef(false);
    const ncmAttempt = useRef('');
    const ncmContext = JSON.stringify([
        formData.name?.trim(), (formData.title || formData.marketplaceTitle || formData.name)?.trim(),
        formData.description?.trim(), formData.categoryIds, formData.category, formData.material,
    ]);
    const latestNcmContext = useRef(ncmContext);
    latestNcmContext.current = ncmContext;
    const canGenerateNcm = Boolean(formData.name?.trim() &&
        (formData.title || formData.marketplaceTitle || formData.name)?.trim() &&
        formData.description?.trim() && (formData.categoryIds?.length || formData.category) &&
        formData.itemType !== 'service');
    const toggleNcmAuto = () => {
        ncmEnabledRef.current = !ncmEnabledRef.current;
        ncmRequestVersion.current += 1;
        ncmAttempt.current = '';
        setIsNcmAutoEnabled(ncmEnabledRef.current);
    };
    useEffect(() => () => { ncmRequestVersion.current += 1; }, []);
    useEffect(() => {
        ncmRequestVersion.current += 1;
        ncmAttempt.current = '';
        ncmEnabledRef.current = isOpen;
        setIsNcmAutoEnabled(true);
    }, [isOpen]);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [isImprovingDescription, setIsImprovingDescription] = useState(false);
    const [isFillingFiscalWithAI, setIsFillingFiscalWithAI] = useState(false);
    const [isSuggestingPrices, setIsSuggestingPrices] = useState(false);
    const [suggestPricesResults, setSuggestPricesResults] = useState<SuggestPricesResult | null>(null);

    const handleGenerateCategory = async (isAutoTrigger = false) => {
        const title = (formData.name || formData.title || formData.description || '').trim();
        if (!title) {
            if (!isAutoTrigger) toast.warning('Digite o nome ou título para sugerir categoria');
            return;
        }
        setIsGeneratingCategory(true);
        try {
            const direct = matchCategoryByRules(title, availableCategories as any);
            if (direct) {
                setFormData((prev: Partial<Product>) => {
                    if (prev.categoryIds?.includes(direct.id)) return prev;
                    return { ...prev, categoryIds: [...(prev.categoryIds || []), direct.id] };
                });
                if (!isAutoTrigger) toast.success(`Categoria identificada: ${direct.name || direct.category}`);
                return;
            }

            const categoryNames = availableCategories.map(c => c.name || c.category || '').filter(Boolean);
            const suggestionRes = await aiService.suggestCategory(title, categoryNames);
            const suggestedCatName = typeof suggestionRes === 'string' ? suggestionRes : (suggestionRes?.category || '');
            if (suggestedCatName?.trim()) {
                const found = availableCategories.find(c => (c.name || c.category || '').trim().toLowerCase() === suggestedCatName.trim().toLowerCase());
                if (found) {
                    setFormData((prev: Partial<Product>) => {
                        if (prev.categoryIds?.includes(found.id)) return prev;
                        return { ...prev, categoryIds: [...(prev.categoryIds || []), found.id] };
                    });
                    if (!isAutoTrigger) toast.success(`Categoria sugerida: ${found.name || found.category}`);
                }
            }
        } catch (error: unknown) {
            console.error(error);
        } finally {
            setIsGeneratingCategory(false);
        }
    };

    const handleGenerateComboName = async () => {
        if (!formData.comboItems?.length) return toast.warning('Adicione itens ao combo primeiro');
        setIsGeneratingComboName(true);
        try {
            const items = formData.comboItems.map(i => `${i.quantity}x ${i.description}`).join(', ');
            const name = await aiService.generateComboName(items);
            setFormData((prev: Partial<Product>) => ({ ...prev, description: name }));
        } catch (error: unknown) {
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
                    cest: fiscalData.cest,
                    cfop: fiscalData.cfop,
                    cst: fiscalData.cst,
                    icmsPercent: fiscalData.icmsPercent,
                    origem: fiscalData.origem,
                    pisCst: fiscalData.pisCst,
                    cofinsCst: fiscalData.cofinsCst
                }
            }));

            toast.success(`Dados fiscais sugeridos pela IA. Revise CFOP ${fiscalData.cfop} e CSOSN ${fiscalData.cst} antes de salvar.`);
        } catch (error: any) {
            console.error(error);
            if (!isQuotaExceeded(error)) {
                toast.error(error?.message || 'Erro ao preencher dados fiscais com IA.');
            }
        } finally {
            setIsFillingFiscalWithAI(false);
        }
    };

    const handleGenerateNCM = async (isAutoTrigger = false) => {
        if (!ncmEnabledRef.current || !canGenerateNcm || ncmInFlight.current) return;
        const title = (formData.name || formData.description || '').trim();
        if (!title) {
            if (!isAutoTrigger) toast.warning('Título necessário para buscar NCM');
            return;
        }
        ncmInFlight.current = true;
        const requestVersion = ncmRequestVersion.current;
        const context = ncmContext;
        ncmAttempt.current = context;
        setIsGeneratingNCM(true);
        setNcmSuggestion(null);
        try {
            const category = availableCategories.find(c => formData.categoryIds?.includes(c.id))?.name || formData.category || '';
            const description = formData.description || formData.ecommerceDescription || '';
            const suggestion = await aiService.findNCM(
                title,
                formData.material || '',
                description,
                category
            );
            if (suggestion.ncm && ncmEnabledRef.current && requestVersion === ncmRequestVersion.current && context === latestNcmContext.current) {
                setNcmSuggestion(suggestion);
                if (!isAutoTrigger) {
                    toast.info(`Sugestão de NCM ${suggestion.ncm} pronta para revisão.`);
                }
            } else if (!isAutoTrigger && suggestion.reviewReason) {
                toast.warning(suggestion.reviewReason);
            }
        } catch (error) {
            console.error(error);
        } finally {
            ncmInFlight.current = false;
            setIsGeneratingNCM(false);
        }
    };

    const acceptNcmSuggestion = () => {
        if (!ncmSuggestion?.ncm) return;
        setFormData((prev: Partial<Product>) => ({
            ...prev,
            fiscal: { ...prev.fiscal!, ncm: ncmSuggestion.ncm, ncmDescription: ncmSuggestion.description }
        }));
        setNcmSuggestion(null);
        toast.success(`NCM ${ncmSuggestion.ncm} aplicado ao cadastro após confirmação.`);
    };

    // Uma tentativa por contexto; religar permite solicitar uma nova sugestão.
    useEffect(() => {
        if (isOpen && isNcmAutoEnabled && canGenerateNcm && !isGeneratingNCM && ncmAttempt.current !== ncmContext) {
            const timer = setTimeout(() => {
                handleGenerateNCM(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, isNcmAutoEnabled, canGenerateNcm, isGeneratingNCM, ncmContext]);

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
                weight: formData.weight,
                technicalValues: formData.technicalValues
            });

            setFormData((prev: Partial<Product>) => ({
                ...prev,
                description: result.improvedDescription
            }));
            toast.success('Descrição aperfeiçoada com sucesso! ✨');
        } catch (error: any) {
            console.error(error);
            if (!isQuotaExceeded(error)) {
                toast.error(error?.message || 'Erro ao aperfeiçoar descrição com IA.');
            }
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
        isNcmAutoEnabled,
        toggleNcmAuto,
        isAiProcessing,
        isGeneratingCategory,
        isGeneratingComboName,
        isGeneratingDescription,
        isGeneratingNCM,
        ncmSuggestion,
        acceptNcmSuggestion,
        dismissNcmSuggestion: () => setNcmSuggestion(null),
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
