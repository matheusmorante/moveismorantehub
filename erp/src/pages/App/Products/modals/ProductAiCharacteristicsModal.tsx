import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import type { Product } from '../../../../types/product.type';
import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { fetchTechnicalFieldDefinitions } from '../services/technicalFieldService';
import { aiService } from '@/pages/utils/aiService';
import {
  productAiCharacteristicsModalFormSchema,
  ProductAiCharacteristicsModalFormValues,
  productAiDescriptiveTextFormSchema,
  ProductAiDescriptiveTextFormValues,
  ProductAiSuggestedCharacteristics,
} from '../../../../../../shared-utils/productAiFormSchemas';
import { useAiCharacteristicsQuota } from '../hooks/useAiCharacteristicsQuota';
import {
  CharacteristicsQuotaBar,
  CharacteristicsPrerequisitesCard,
  CharacteristicsDiffTable,
} from './characteristicsAi';

export interface ProductAiCharacteristicsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly availableAttributes?: readonly TechnicalFieldDefinition[];
  readonly categoryName?: string;
  readonly initialMode?: 'web_search' | 'descriptive_text';
  readonly onCharacteristicsApplied?: () => void;
}

export const ProductAiCharacteristicsModal: React.FC<ProductAiCharacteristicsModalProps> = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  availableAttributes: availableAttributesProp,
  categoryName = '',
  initialMode = 'web_search',
  onCharacteristicsApplied,
}) => {
  const { stats, refresh: refreshQuota, isHourlyLimitReached, isBlocked } =
    useAiCharacteristicsQuota(isOpen);

  const [activeMode, setActiveMode] = useState<'web_search' | 'descriptive_text'>(initialMode);
  const [phase, setPhase] = useState<'input' | 'preview'>('input');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedResult, setSuggestedResult] = useState<ProductAiSuggestedCharacteristics | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({});
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [loadedAttributes, setLoadedAttributes] = useState<TechnicalFieldDefinition[]>([]);

  // Sincronizar estado apenas quando o modal for aberto (evita resetar phase ao atualizar estado)
  const prevIsOpenRef = React.useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setActiveMode(initialMode);
      setPhase('input');
      void refreshQuota();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialMode]);

  // Carregar atributos se não vierem nas props
  useEffect(() => {
    if (isOpen && (!availableAttributesProp || availableAttributesProp.length === 0)) {
      void fetchTechnicalFieldDefinitions('product-form')
        .then((attrs) => setLoadedAttributes(attrs || []))
        .catch(() => setLoadedAttributes([]));
    }
  }, [isOpen, availableAttributesProp]);

  const effectiveAttributes = availableAttributesProp && availableAttributesProp.length > 0
    ? availableAttributesProp
    : loadedAttributes;

  // Form para Modo 1 (Pesquisa na Web)
  const webSearchForm = useForm<ProductAiCharacteristicsModalFormValues>({
    resolver: zodResolver(productAiCharacteristicsModalFormSchema),
    defaultValues: {
      additionalInfo: '',
    },
  });

  // Form para Modo 2 (Texto Descritivo)
  const descriptiveTextForm = useForm<ProductAiDescriptiveTextFormValues>({
    resolver: zodResolver(productAiDescriptiveTextFormSchema),
    defaultValues: {
      descriptiveText: '',
      additionalInfo: '',
    },
  });

  // Normalização e extração de dados base do produto
  const productName = (formData.name || formData.title || '').trim();
  const brand = (
    formData.brand ||
    formData.technicalValues?.Marca ||
    formData.technicalValues?.marca ||
    ''
  ).toString().trim();
  const model = (
    formData.technicalValues?.Modelo ||
    formData.technicalValues?.modelo ||
    formData.line ||
    ''
  ).toString().trim();
  const description = (formData.description || formData.ecommerceDescription || '').trim();
  const effectiveCategory = (categoryName || '').trim();
  const hasCategory = effectiveCategory.length > 0;
  const images = useMemo(() => {
    return (formData.images || []).filter((img) => typeof img === 'string' && img.startsWith('http'));
  }, [formData.images]);

  // Regra do Modo 1: Nome, Marca e Modelo são obrigatórios
  const hasName = productName.length >= 2;
  const hasDescription = description.length > 0;
  const hasBrand = brand.length > 0;
  const hasModel = model.length > 0;
  const isPrerequisitesMet = hasName && hasBrand && hasModel;

  const hasErpValue = (val: any) =>
    val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '0';

  // Configura seleção padrão com proteção a dados já preenchidos no ERP
  const applyInitialSelectionRules = (result: ProductAiSuggestedCharacteristics) => {
    const initialSelected: Record<string, boolean> = {};
    const conf = result.itemConfidence || {};

    // 1. Campos Gerais
    if (result.identifiedProduct?.name) {
      initialSelected['__field_name__'] = !hasErpValue(formData.name || formData.title);
    }
    if (result.identifiedProduct?.brand) {
      const currentBrand =
        formData.brand || formData.technicalValues?.Marca || formData.technicalValues?.marca;
      initialSelected['__field_brand__'] = !hasErpValue(currentBrand);
    }
    if (result.identifiedProduct?.model) {
      const currentModel =
        formData.technicalValues?.Modelo || formData.technicalValues?.modelo || formData.line;
      initialSelected['__field_model__'] = !hasErpValue(currentModel);
    }
    if (result.description) {
      initialSelected['__field_description__'] = !hasErpValue(formData.description);
    }

    // 2. Dimensões
    if (result.height !== undefined && Number(result.height) > 0) {
      initialSelected['__field_height__'] = !hasErpValue(formData.height);
    }
    if (result.width !== undefined && Number(result.width) > 0) {
      initialSelected['__field_width__'] = !hasErpValue(formData.width);
    }
    if (result.depth !== undefined && Number(result.depth) > 0) {
      initialSelected['__field_depth__'] = !hasErpValue(formData.depth);
    }
    if (result.weight !== undefined && Number(result.weight) > 0) {
      initialSelected['__field_weight__'] = !hasErpValue(formData.weight);
    }

    // 3. Características Técnicas
    const currentTechnical = formData.technicalValues || {};
    Object.keys(result.technicalValues || {}).forEach((key) => {
      const isAlreadyFilled = hasErpValue(currentTechnical[key]);
      const isLowConfidence = conf[key] === 'baixa';
      initialSelected[key] = !isAlreadyFilled && !isLowConfidence;
    });

    setSelectedKeys(initialSelected);
  };

  // Disparo Modo 1: Pesquisa na Web
  const handleStartWebSearch = async (values: ProductAiCharacteristicsModalFormValues) => {
    if (!isPrerequisitesMet) {
      toast.warning('Preencha os campos obrigatórios (Nome do produto, Marca e Modelo) para consultar com IA.');
      return;
    }
    if (isBlocked) {
      toast.error('Limite de requisições de IA atingido. Aguarde a renovação da cota.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await aiService.extractProductCharacteristicsWithAI({
        productName,
        categoryName: effectiveCategory,
        description,
        brand,
        model,
        additionalInfo: values.additionalInfo || '',
        images,
        availableAttributes: effectiveAttributes.map((attr) => ({
          id: attr.id,
          name: attr.name,
          dataType: attr.dataType,
          options: attr.options || [],
        })),
      });

      setSuggestedResult(result);
      setEditedValues({});
      applyInitialSelectionRules(result);
      setPhase('preview');
      void refreshQuota();
      toast.success('Informações e características pesquisadas com sucesso na internet! ✨');
    } catch (err: any) {
      console.error('[ProductAiCharacteristicsModal] Erro ao consultar na web:', err);
      toast.error(err.message || 'Falha ao pesquisar na internet com IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Disparo Modo 2: Texto Descritivo
  const handleStartDescriptiveTextAnalysis = async (values: ProductAiDescriptiveTextFormValues) => {
    if (isBlocked) {
      toast.error('Limite de requisições de IA atingido. Aguarde a renovação da cota.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await aiService.extractFromDescriptiveTextWithAI({
        descriptiveText: values.descriptiveText,
        currentName: productName,
        currentBrand: brand,
        currentModel: model,
        categoryName: effectiveCategory,
        additionalInfo: values.additionalInfo || '',
        availableAttributes: effectiveAttributes.map((attr) => ({
          id: attr.id,
          name: attr.name,
          dataType: attr.dataType,
          options: attr.options || [],
        })),
      });

      setSuggestedResult(result);
      setEditedValues({});
      applyInitialSelectionRules(result);
      setPhase('preview');
      void refreshQuota();
      toast.success('Dados extraídos com sucesso do texto descritivo! ✨');
    } catch (err: any) {
      console.error('[ProductAiCharacteristicsModal] Erro ao extrair de texto descritivo:', err);
      toast.error(err.message || 'Falha ao processar texto descritivo com IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleKey = (key: string) => {
    setSelectedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = (select: boolean) => {
    if (!suggestedResult) return;
    const updated: Record<string, boolean> = {};

    if (suggestedResult.identifiedProduct?.name) updated['__field_name__'] = select;
    if (suggestedResult.identifiedProduct?.brand) updated['__field_brand__'] = select;
    if (suggestedResult.identifiedProduct?.model) updated['__field_model__'] = select;
    if (suggestedResult.description) updated['__field_description__'] = select;

    if (suggestedResult.height !== undefined && Number(suggestedResult.height) > 0) {
      updated['__field_height__'] = select;
    }
    if (suggestedResult.width !== undefined && Number(suggestedResult.width) > 0) {
      updated['__field_width__'] = select;
    }
    if (suggestedResult.depth !== undefined && Number(suggestedResult.depth) > 0) {
      updated['__field_depth__'] = select;
    }
    if (suggestedResult.weight !== undefined && Number(suggestedResult.weight) > 0) {
      updated['__field_weight__'] = select;
    }

    Object.keys(suggestedResult.technicalValues || {}).forEach((key) => {
      updated[key] = select;
    });

    setSelectedKeys(updated);
  };

  const handleEditValue = (key: string, value: any) => {
    setEditedValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const selectedCount = Object.values(selectedKeys).filter(Boolean).length;

  const handleApplyCharacteristics = () => {
    if (!suggestedResult) return;

    setFormData((prev) => {
      const next: Partial<Product> = { ...prev };
      const nextTechnical: Record<string, any> = { ...(prev.technicalValues || {}) };

      // 1. Campos Gerais
      if (selectedKeys['__field_name__']) {
        const val = editedValues['__field_name__'] ?? suggestedResult.identifiedProduct?.name;
        if (val) {
          next.name = String(val);
          next.title = String(val);
          next.marketplaceTitle = String(val);
        }
      }
      if (selectedKeys['__field_brand__']) {
        const val = editedValues['__field_brand__'] ?? suggestedResult.identifiedProduct?.brand;
        if (val) {
          next.brand = String(val);
          nextTechnical['Marca'] = String(val);
        }
      }
      if (selectedKeys['__field_model__']) {
        const val = editedValues['__field_model__'] ?? suggestedResult.identifiedProduct?.model;
        if (val) {
          next.line = String(val);
          nextTechnical['Modelo'] = String(val);
        }
      }
      if (selectedKeys['__field_description__']) {
        const val = editedValues['__field_description__'] ?? suggestedResult.description;
        if (val) {
          next.description = String(val);
        }
      }

      // 2. Dimensões e Peso
      if (selectedKeys['__field_height__']) {
        const val = editedValues['__field_height__'] ?? suggestedResult.height;
        if (Number(val) > 0) {
          next.height = Number(val);
          nextTechnical['Altura'] = String(val);
        }
      }
      if (selectedKeys['__field_width__']) {
        const val = editedValues['__field_width__'] ?? suggestedResult.width;
        if (Number(val) > 0) {
          next.width = Number(val);
          nextTechnical['Largura'] = String(val);
        }
      }
      if (selectedKeys['__field_depth__']) {
        const val = editedValues['__field_depth__'] ?? suggestedResult.depth;
        if (Number(val) > 0) {
          next.depth = Number(val);
          nextTechnical['Profundidade'] = String(val);
        }
      }
      if (selectedKeys['__field_weight__']) {
        const val = editedValues['__field_weight__'] ?? suggestedResult.weight;
        if (Number(val) > 0) {
          next.weight = Number(val);
          nextTechnical['Peso'] = String(val);
        }
      }

      // 3. Características Técnicas
      Object.entries(suggestedResult.technicalValues || {}).forEach(([key, originalVal]) => {
        if (selectedKeys[key]) {
          const finalVal = editedValues[key] !== undefined ? editedValues[key] : originalVal;
          nextTechnical[key] = finalVal;
        }
      });

      next.technicalValues = nextTechnical;
      return next;
    });

    toast.success(`${selectedCount} campo(s) aplicado(s) ao formulário! 🎉`);
    if (onCharacteristicsApplied) {
      onCharacteristicsApplied();
    }
    onClose();
  };

  const handleReturnToModeSelection = () => {
    setPhase('input');
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-characteristics-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shadow-sm">
              <i className="bi bi-stars" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="ai-characteristics-modal-title"
                  className="text-sm font-bold text-slate-800 dark:text-slate-100"
                >
                  {phase === 'input'
                    ? 'Preenchimento Inteligente do Cadastro'
                    : 'Revisão das Informações Sugeridas pela IA'}
                </h3>
                <span className="text-[10px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {activeMode === 'web_search' ? 'Pesquisa Web' : 'Texto Descritivo'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {phase === 'input'
                  ? 'Escolha a forma de preenchimento automático para preencher dados e especificações'
                  : 'Revise os campos sugeridos, desmarque o que não quiser e edite os valores'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isAnalyzing}
            aria-label="Fechar modal"
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            <i className="bi bi-x-lg text-xs" />
          </button>
        </div>

        {/* Barra de Consumo / Cota */}
        <CharacteristicsQuotaBar
          stats={stats}
          isHourlyLimitReached={isHourlyLimitReached}
          isBlocked={isBlocked}
        />

        {/* Seletor de Modo (visível na fase de escolha de tipo de preenchimento) */}
        {phase === 'input' && (
          <div className="px-5 pt-3 pb-0 bg-slate-50/40 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveMode('web_search')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeMode === 'web_search'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <i className="bi bi-globe2" />
              <span>1. Pesquisar na Web (Nome, Marca e Modelo)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('descriptive_text')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeMode === 'descriptive_text'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <i className="bi bi-file-earmark-text" />
              <span>2. Texto Descritivo / Ficha Técnica</span>
            </button>
          </div>
        )}

        {/* Conteúdo Dinâmico com Formulário e Rodapé Integrados */}
        {phase === 'input' ? (
          activeMode === 'web_search' ? (
            /* Modo 1: Pesquisa na Web por Nome, Marca e Modelo */
            <form
              id="ai-web-search-form"
              onSubmit={webSearchForm.handleSubmit(handleStartWebSearch)}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
                <CharacteristicsPrerequisitesCard
                  productName={productName}
                  effectiveCategory={effectiveCategory}
                  brand={brand}
                  model={model}
                  hasName={hasName}
                  hasCategory={hasCategory}
                  hasBrand={hasBrand}
                  hasModel={hasModel}
                  hasDescription={hasDescription}
                  imageCount={images.length}
                  isPrerequisitesMet={isPrerequisitesMet}
                />

                <div className="space-y-1.5">
                  <label
                    htmlFor="additionalInfo"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Informações Adicionais (Opcional)
                  </label>
                  <textarea
                    id="additionalInfo"
                    {...webSearchForm.register('additionalInfo')}
                    disabled={isAnalyzing || isBlocked}
                    rows={4}
                    placeholder="Insira detalhes adicionais para ajudar a identificar o produto (ex: tipo de puxador, corrediça telescópica, link ou notas do fabricante)..."
                    className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                  />
                  {webSearchForm.formState.errors.additionalInfo && (
                    <p className="text-[11px] text-red-500">
                      {webSearchForm.formState.errors.additionalInfo.message}
                    </p>
                  )}
                  <span className="text-[10px] text-slate-400 block">
                    A pesquisa prioriza o site oficial do fabricante e cruza especificações técnicas com fotos e dados disponíveis.
                  </span>
                </div>
              </div>

              {/* Rodapé Modo 1 */}
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isAnalyzing}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isPrerequisitesMet || isBlocked || isAnalyzing}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all ${
                    !isPrerequisitesMet || isBlocked || isAnalyzing
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20 active:scale-95 cursor-pointer'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin text-sm" />
                      <span>Pesquisando na internet...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-stars text-sm" />
                      <span>Consultar com IA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Modo 2: Texto Descritivo / Ficha Técnica do Fornecedor */
            <form
              id="ai-descriptive-text-form"
              onSubmit={descriptiveTextForm.handleSubmit(handleStartDescriptiveTextAnalysis)}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
                  <i className="bi bi-info-circle-fill text-lg text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block font-bold">Como funciona o preenchimento por texto:</strong>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                      Cole a mensagem do fornecedor, texto do catálogo, ficha técnica ou especificações brutas.
                      A IA analisará o texto e estruturará automaticamente: Nome, Marca, Modelo, Dimensões, Descrição comercial e Características técnicas!
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="descriptiveText"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Texto Descritivo / Ficha Técnica do Produto <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="descriptiveText"
                    {...descriptiveTextForm.register('descriptiveText')}
                    disabled={isAnalyzing || isBlocked}
                    rows={8}
                    placeholder="Cole aqui o texto completo recebido do fornecedor, especificações de catálogo, medidas, cores, portas, gavetas..."
                    className="w-full text-xs font-mono rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-y"
                  />
                  {descriptiveTextForm.formState.errors.descriptiveText && (
                    <p className="text-[11px] text-red-500">
                      {descriptiveTextForm.formState.errors.descriptiveText.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="descriptiveAdditionalInfo"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Instruções Extras (Opcional)
                  </label>
                  <input
                    id="descriptiveAdditionalInfo"
                    type="text"
                    {...descriptiveTextForm.register('additionalInfo')}
                    disabled={isAnalyzing || isBlocked}
                    placeholder="Instruções específicas para a IA (ex: focar nas medidas com espelho, etc.)..."
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Rodapé Modo 2 */}
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isAnalyzing}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isBlocked || isAnalyzing}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all ${
                    isBlocked || isAnalyzing
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20 active:scale-95 cursor-pointer'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin text-sm" />
                      <span>Processando texto...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-stars text-sm" />
                      <span>Gerar com IA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )
        ) : (
          /* Fase 2: Modal de Revisão / Confirmação com Lista Unificada de Campos */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
              <CharacteristicsDiffTable
                suggestedResult={suggestedResult}
                formData={formData}
                selectedKeys={selectedKeys}
                onToggleKey={handleToggleKey}
                onSelectAll={handleSelectAll}
                editedValues={editedValues}
                onEditValue={handleEditValue}
                hasCategory={hasCategory}
              />
            </div>

            {/* Rodapé Fase 2 */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
              <button
                type="button"
                onClick={handleReturnToModeSelection}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <i className="bi bi-arrow-left" />
                <span>Voltar / Escolher Modo</span>
              </button>
              <button
                type="button"
                onClick={handleApplyCharacteristics}
                disabled={selectedCount === 0}
                title={
                  selectedCount === 0
                    ? 'Selecione pelo menos um campo para aplicar'
                    : undefined
                }
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all ${
                  selectedCount === 0
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95 cursor-pointer'
                }`}
              >
                <i className="bi bi-check-lg text-sm" />
                <span>
                  {selectedCount === 1
                    ? 'Aplicar 1 campo selecionado'
                    : `Aplicar ${selectedCount} campos selecionados`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductAiCharacteristicsModal;
