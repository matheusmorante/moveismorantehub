import React, { useState, useEffect, useRef } from 'react';
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
import { extractProductAiPrerequisites } from './utils/productAiPrerequisites';
import {
  computeInitialSelectionKeys,
  computeSelectAllKeys,
} from './utils/productAiSelectionRules';
import { applyAiCharacteristicsToProduct } from './utils/productAiApplyHelpers';

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
  const requestInFlightRef = useRef(false);
  const [suggestedResult, setSuggestedResult] = useState<ProductAiSuggestedCharacteristics | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({});
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [loadedAttributes, setLoadedAttributes] = useState<TechnicalFieldDefinition[]>([]);

  // Sincronizar estado apenas quando o modal for aberto
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setActiveMode(initialMode);
      setPhase('input');
      void refreshQuota();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialMode, refreshQuota]);

  // Carregar características se não vierem nas props
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
  const prerequisites = extractProductAiPrerequisites(formData, categoryName);

  // Disparo Modo 1: Pesquisa na Web
  const handleStartWebSearch = async (values: ProductAiCharacteristicsModalFormValues) => {
    if (!prerequisites.isPrerequisitesMet) {
      toast.warning('Informe o nome do produto para consultar com IA.');
      return;
    }
    if (isBlocked) {
      toast.error('Limite de requisições de IA atingido. Aguarde a renovação da cota.');
      return;
    }
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setIsAnalyzing(true);
    try {
      const result = await aiService.extractProductCharacteristicsWithAI({
        productName: prerequisites.productName,
        categoryName: prerequisites.effectiveCategory,
        description: prerequisites.description,
        brand: prerequisites.brand,
        model: prerequisites.model,
        additionalInfo: values.additionalInfo || '',
        images: prerequisites.images,
        availableAttributes: effectiveAttributes.map((attr) => ({
          id: attr.id,
          name: attr.name,
          dataType: attr.dataType,
          options: attr.options || [],
        })),
      });

      setSuggestedResult(result);
      setEditedValues({});
      setSelectedKeys(computeInitialSelectionKeys(result, formData));
      setPhase('preview');
      void refreshQuota();
      toast.success('Informações e características pesquisadas com sucesso na internet! ✨');
    } catch (err: any) {
      console.error('[ProductAiCharacteristicsModal] Erro ao consultar na web:', err);
      toast.error(err.message || 'Falha ao pesquisar na internet com IA.');
    } finally {
      requestInFlightRef.current = false;
      setIsAnalyzing(false);
    }
  };

  // Disparo Modo 2: Texto Descritivo
  const handleStartDescriptiveTextAnalysis = async (values: ProductAiDescriptiveTextFormValues) => {
    if (isBlocked) {
      toast.error('Limite de requisições de IA atingido. Aguarde a renovação da cota.');
      return;
    }
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setIsAnalyzing(true);
    try {
      const result = await aiService.extractFromDescriptiveTextWithAI({
        descriptiveText: values.descriptiveText,
        currentName: prerequisites.productName,
        currentBrand: prerequisites.brand,
        currentModel: prerequisites.model,
        categoryName: prerequisites.effectiveCategory,
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
      setSelectedKeys(computeInitialSelectionKeys(result, formData));
      setPhase('preview');
      void refreshQuota();
      toast.success('Dados extraídos com sucesso do texto descritivo! ✨');
    } catch (err: any) {
      console.error('[ProductAiCharacteristicsModal] Erro ao extrair de texto descritivo:', err);
      toast.error(err.message || 'Falha ao processar texto descritivo com IA.');
    } finally {
      requestInFlightRef.current = false;
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
    setSelectedKeys(computeSelectAllKeys(suggestedResult, select));
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

    setFormData((prev) =>
      applyAiCharacteristicsToProduct(prev, suggestedResult, selectedKeys, editedValues)
    );

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
    productName: prerequisites.productName,
    brand: prerequisites.brand,
    model: prerequisites.model,
    description: prerequisites.description,
    effectiveCategory: prerequisites.effectiveCategory,
    hasCategory: prerequisites.hasCategory,
    images: prerequisites.images,
    hasName: prerequisites.hasName,
    hasDescription: prerequisites.hasDescription,
    hasBrand: prerequisites.hasBrand,
    hasModel: prerequisites.hasModel,
    isPrerequisitesMet: prerequisites.isPrerequisitesMet,
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
