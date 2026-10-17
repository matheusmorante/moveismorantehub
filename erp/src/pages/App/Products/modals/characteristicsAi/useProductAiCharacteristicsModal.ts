import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import type { Product } from '../../../../../types/product.type';
import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { fetchTechnicalFieldDefinitions } from '../../services/technicalFieldService';
import { aiService } from '@/pages/utils/aiService';
import {
  productAiCharacteristicsModalFormSchema,
  ProductAiCharacteristicsModalFormValues,
  productAiDescriptiveTextFormSchema,
  ProductAiDescriptiveTextFormValues,
  ProductAiSuggestedCharacteristics,
} from '../../../../../../../shared-utils/productAiFormSchemas';
import { useAiCharacteristicsQuota } from '../../hooks/useAiCharacteristicsQuota';

export interface UseProductAiCharacteristicsModalParams {
  isOpen: boolean;
  onClose: () => void;
  formData: Partial<Product>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  availableAttributes?: readonly TechnicalFieldDefinition[];
  categoryName?: string;
  initialMode?: 'web_search' | 'descriptive_text';
  onCharacteristicsApplied?: () => void;
}

export const useProductAiCharacteristicsModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  availableAttributes: availableAttributesProp,
  categoryName = '',
  initialMode = 'web_search',
  onCharacteristicsApplied,
}: UseProductAiCharacteristicsModalParams) => {
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
  const prevIsOpenRef = useRef(isOpen);
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

  const effectiveAttributes =
    availableAttributesProp && availableAttributesProp.length > 0
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

  return {
    activeMode,
    setActiveMode,
    phase,
    setPhase,
    isAnalyzing,
    suggestedResult,
    selectedKeys,
    editedValues,
    stats,
    isHourlyLimitReached,
    isBlocked,
    productName,
    brand,
    model,
    description,
    effectiveCategory,
    hasCategory,
    images,
    hasName,
    hasDescription,
    hasBrand,
    hasModel,
    isPrerequisitesMet,
    webSearchForm,
    descriptiveTextForm,
    handleStartWebSearch,
    handleStartDescriptiveTextAnalysis,
    handleToggleKey,
    handleSelectAll,
    handleEditValue,
    selectedCount,
    handleApplyCharacteristics,
    handleReturnToModeSelection,
  };
};
