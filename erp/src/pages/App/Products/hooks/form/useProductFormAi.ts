import { useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  productCategorySuggestionFormSchema, productComboNameFormSchema, productChannelDescriptionFormSchema,
  productMarketplaceTitleFormSchema, productFiscalSuggestionFormSchema, productDescriptionImprovementFormSchema,
  productPriceSuggestionFormSchema,
  productAiGeneratedTextSchema, productAiPriceResultsSchema,
} from '../../../../../../../shared-utils/productAiFormSchemas';
import type Product from '../../../../types/product.type';
import { aiService } from '@/pages/utils/aiService';
import { getSettings } from '@/pages/utils/settingsService';
import { matchCategoryByRules } from '@/pages/utils/categoryResolutionService';
import { isQuotaExceeded } from '@/services/aiGateway/aiQuotaNotifier';
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
  _isQuickRegister = false,
  _isOpen = true
) {
  const [isGeneratingCategory, setIsGeneratingCategory] = useState(false);
  const [isGeneratingComboName, setIsGeneratingComboName] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isImprovingDescription, setIsImprovingDescription] = useState(false);
  const [isFillingFiscalWithAI, setIsFillingFiscalWithAI] = useState(false);
  const [isSuggestingPrices, setIsSuggestingPrices] = useState(false);
  const [suggestPricesResults, setSuggestPricesResults] = useState<SuggestPricesResult | null>(
    null
  );

  const categoryForm = useZodForm(productCategorySuggestionFormSchema, { title: '', categories: [] });
  const comboForm = useZodForm(productComboNameFormSchema, { items: [] });
  const channelForm = useZodForm(productChannelDescriptionFormSchema, { title: '', type: 'whatsapp' });
  const titleForm = useZodForm(productMarketplaceTitleFormSchema, { description: '' });
  const fiscalForm = useZodForm(productFiscalSuggestionFormSchema, { title: '', description: '', material: '', category: '', companyName: '', companyAddress: '', companyCnpj: '' });
  const improvementForm = useZodForm(productDescriptionImprovementFormSchema, { title: '', currentDescription: '', categoryIds: [] });
  const pricesForm = useZodForm(productPriceSuggestionFormSchema, { description: '', costPrice: 0 });
  const showValidation = (errors: Parameters<typeof flattenFormErrors>[0]) =>
    toast.warning(Object.values(flattenFormErrors(errors))[0]);
  const showFailure = (error: unknown, fallback: string) => {
    console.error(error);
    if (!isQuotaExceeded(error)) toast.error(error instanceof Error ? error.message : fallback);
  };
  const readGeneratedText = (value: unknown) => {
    const parsed = productAiGeneratedTextSchema.safeParse(value);
    if (!parsed.success) throw new Error('A sugestão retornou um texto vazio ou inválido. Tente novamente.');
    return parsed.data;
  };

  const handleGenerateCategory = async (isAutoTrigger = false) => {
    await categoryForm.validateAndRun({
      title: formData.name || formData.title || formData.description || '',
      categories: availableCategories.map((category) => ({ ...category })),
    }, async (values) => {
      setIsGeneratingCategory(true);
      try {
        const direct = matchCategoryByRules(values.title, values.categories);
        if (!direct) {
          if (!isAutoTrigger) toast.warning('Não encontrei uma categoria com confiança. Selecione manualmente.');
          return;
        }
        setFormData((prev) => prev.categoryIds?.includes(direct.id) ? prev : { ...prev, categoryIds: [...(prev.categoryIds || []), direct.id] });
        if (!isAutoTrigger) toast.success(`Categoria identificada: ${direct.name || direct.category}`);
      } catch (error: unknown) {
        showFailure(error, 'Não foi possível sugerir uma categoria.');
      } finally {
        setIsGeneratingCategory(false);
      }
    }, (errors) => { if (!isAutoTrigger) showValidation(errors); });
  };

  const handleGenerateComboName = async () => {
    await comboForm.validateAndRun({ items: (formData.comboItems || []).map((item) => ({ description: item.description, quantity: item.quantity })) }, async (values) => {
      setIsGeneratingComboName(true);
      try {
        const items = values.items.map((item) => `${item.quantity}x ${item.description}`).join(', ');
        const result = await aiService.generateComboName(items);
        const name = readGeneratedText(result?.name);
        setFormData((prev) => ({ ...prev, description: name }));
      } catch (error: unknown) {
        showFailure(error, 'Não foi possível gerar o nome do combo.');
      } finally {
        setIsGeneratingComboName(false);
      }
    }, showValidation);
  };

  const handleGenerateAIDescription = async (type: 'whatsapp' | 'ecommerce') => {
    await channelForm.validateAndRun({
      title: formData.description || '', material: formData.material, width: formData.width,
      height: formData.height, depth: formData.depth, brand: formData.brand, line: formData.line, type,
    }, async (values) => {
      setIsGeneratingDescription(true);
      try {
        const { width, height, depth, ...request } = values;
        const dimensions = [width, height, depth].every((measure) => measure === undefined)
          ? undefined : [width, height, depth].map((measure) => measure ?? '?').join('x');
        const result = await aiService.generateProductDescription({ ...request, dimensions });
        const description = readGeneratedText(result?.description);
        setFormData((prev) => values.type === 'whatsapp'
          ? { ...prev, whatsappDescription: description }
          : { ...prev, ecommerceDescription: description });
        toast.success('Descrição gerada com IA!');
      } catch (error: unknown) {
        showFailure(error, 'Não foi possível gerar a descrição.');
      } finally {
        setIsGeneratingDescription(false);
      }
    }, showValidation);
  };

  const handleGenerateMarketplaceTitle = async () => {
    await titleForm.validateAndRun({ description: formData.description || '', material: formData.material }, async (values) => {
      setIsGeneratingTitle(true);
      try {
        const result = await aiService.generateMarketplaceTitle(values);
        const title = readGeneratedText(result?.title);
        setFormData((prev) => ({ ...prev, title, marketplaceTitle: title }));
        toast.success('Título para marketplace gerado!');
      } catch (error: unknown) {
        showFailure(error, 'Não foi possível gerar o título para marketplace.');
      } finally {
        setIsGeneratingTitle(false);
      }
    }, showValidation);
  };

  const handleAutoFillFiscalWithAI = async () => {
    const settings = getSettings();
    const categoryName = availableCategories.find((category) => formData.categoryIds?.includes(category.id))?.name || formData.category || '';
    await fiscalForm.validateAndRun({
      title: formData.name || formData.description || '',
      description: formData.description || formData.ecommerceDescription || '', material: formData.material || '',
      category: categoryName, companyName: settings.companyName || 'Móveis Morante',
      companyAddress: settings.companyAddress || 'Curitiba - PR', companyCnpj: settings.companyCnpj || '',
    }, async (values) => {
      setIsFillingFiscalWithAI(true);
      try {
        const fiscalData = await aiService.generateFiscalData(values);
        setFormData((prev) => ({ ...prev, fiscal: {
          ...(prev.fiscal || {}), ncm: fiscalData.ncm, cest: fiscalData.cest, cfop: fiscalData.cfop,
          cst: prev.itemType === 'service' ? fiscalData.cst : prev.fiscal?.cst || '103',
          icmsPercent: fiscalData.icmsPercent, origem: fiscalData.origem,
          pisCst: fiscalData.pisCst, cofinsCst: fiscalData.cofinsCst,
        } }));
        toast.success(`Dados fiscais sugeridos pela IA. Revise CFOP ${fiscalData.cfop} antes de salvar.`);
      } catch (error: unknown) {
        showFailure(error, 'Erro ao preencher dados fiscais com IA.');
      } finally {
        setIsFillingFiscalWithAI(false);
      }
    }, showValidation);
  };

  const handleImproveDescriptionWithAI = async () => {
    await improvementForm.validateAndRun({
      title: formData.name || formData.description || '', currentDescription: formData.description || '',
      material: formData.material, brand: formData.brand, line: formData.line,
      width: formData.width, height: formData.height, depth: formData.depth, weight: formData.weight,
      technicalValues: formData.technicalValues, categoryIds: formData.categoryIds || [],
    }, async (values) => {
      setIsImprovingDescription(true);
      try {
        const { categoryIds: _categoryIds, ...request } = values;
        const result = await aiService.improveProductDescription(request);
        const description = readGeneratedText(result?.improvedDescription);
        setFormData((prev) => ({ ...prev, description }));
        toast.success('Descrição aperfeiçoada com sucesso! ✨');
      } catch (error: unknown) {
        showFailure(error, 'Erro ao aperfeiçoar descrição com IA.');
      } finally {
        setIsImprovingDescription(false);
      }
    }, showValidation);
  };

  const handleSuggestPrices = async () => {
    await pricesForm.validateAndRun({ description: formData.description || '', costPrice: formData.finalPurchasePrice ?? 0, material: formData.material }, async (values) => {
      setIsSuggestingPrices(true);
      try {
        const suggestions = await aiService.suggestPrices(values);
        const parsed = productAiPriceResultsSchema.safeParse(suggestions);
        if (!parsed.success) throw new Error('A sugestão não retornou preços válidos. Tente novamente.');
        const processedSuggestions = parsed.data;
        (Object.keys(processedSuggestions) as Array<keyof typeof processedSuggestions>).forEach((tier) => {
          if (processedSuggestions[tier] && processedSuggestions[tier].margin === undefined) {
            const margin = Math.round((processedSuggestions[tier].price / values.costPrice - 1) * 100);
            if (!Number.isFinite(margin)) throw new Error('Não foi possível calcular uma margem válida para a sugestão.');
            processedSuggestions[tier].margin = margin;
          }
        });
        setSuggestPricesResults(processedSuggestions);
        toast.info('Sugestões de preço geradas!');
      } catch (error: unknown) {
        showFailure(error, 'Erro ao sugerir preços');
      } finally {
        setIsSuggestingPrices(false);
      }
    }, showValidation);
  };

  const isAiProcessing =
    isGeneratingCategory ||
    isGeneratingComboName ||
    isGeneratingDescription ||
    isGeneratingTitle ||
    isImprovingDescription ||
    isFillingFiscalWithAI ||
    isSuggestingPrices;

  return {
    isAiProcessing,
    isGeneratingCategory,
    isGeneratingComboName,
    isGeneratingDescription,
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
    handleImproveDescriptionWithAI,
    handleSuggestPrices,
  };
}
