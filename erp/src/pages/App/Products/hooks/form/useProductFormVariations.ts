import { useState, useRef, useCallback } from 'react';
import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import { toast } from 'react-toastify';
import { isProductDraft } from '@/pages/utils/productService/productDraftSnapshot';
import {
  type BulkVariationOption,
  buildBulkVariations,
  createDefaultNewVariation,
  regenerateAllVariationSkusList,
} from '../../domain/variationGenerationRules';

/**
 * Hook para gerenciar estado das variações no formulário de produtos.
 * Aplica o Princípio da Responsabilidade Única (SRP): gerencia o estado do formulário
 * e delega as regras puras de combinação e SKUs para o módulo de domínio `variationGenerationRules`.
 */
export function useProductFormVariations(
  formData: Partial<Product>,
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>
) {
  const [editingVariationComboId, setEditingVariationComboId] = useState<string | null>(null);
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null);
  const pendingNewVariationIdRef = useRef<string | null>(null);

  const updateVariation = useCallback(
    <K extends keyof Variation>(id: string, field: K, value: Variation[K]) => {
      setFormData((prev: Partial<Product>) => ({
        ...prev,
        variations: prev.variations?.map((v) =>
          v.id === id
            ? {
                ...v,
                [field]: value,
                ...(isProductDraft(prev) ? { active: false } : {}),
              }
            : v
        ),
      }));
    },
    [setFormData]
  );

  const addVariation = useCallback(() => {
    const existing = formData.variations || [];
    const newVar = createDefaultNewVariation(formData, existing);

    setFormData((prev: Partial<Product>) => ({
      ...prev,
      variations: [...(prev.variations || []), newVar],
      hasVariations: true,
    }));
    pendingNewVariationIdRef.current = newVar.id;
    setEditingVariationId(newVar.id);
  }, [formData, setFormData]);

  const removeVariation = useCallback(
    (id: string) => {
      if ((formData.variations?.length || 0) <= 1) {
        toast.info('A última variação só pode ser removida junto com o produto.');
        return;
      }

      setFormData((prev: Partial<Product>) => {
        const filtered = prev.variations?.filter((v) => v.id !== id);
        return {
          ...prev,
          variations: filtered,
          hasVariations: true,
        };
      });
    },
    [formData.variations?.length, setFormData]
  );

  const generateBulkVariations = useCallback(
    (options: BulkVariationOption[]) => {
      const existing = formData.variations || [];
      const deduplicatedNewVars = buildBulkVariations(options, formData, existing);
      if (deduplicatedNewVars.length === 0) return;

      setFormData((prev: Partial<Product>) => ({
        ...prev,
        variations: [...(prev.variations || []), ...deduplicatedNewVars],
        hasVariations: true,
      }));
      toast.success(`${deduplicatedNewVars.length} variações geradas com sucesso!`);
    },
    [formData, setFormData]
  );

  const regenerateAllVariationSkus = useCallback(() => {
    setFormData((prev: Partial<Product>) => {
      if (!prev.variations || prev.variations.length === 0) return prev;
      const updated = regenerateAllVariationSkusList(prev.variations, prev.code || 'PROD');
      return { ...prev, variations: updated };
    });
    toast.info('SKUs das variações regenerados com exclusividade.');
  }, [setFormData]);

  return {
    editingVariationComboId,
    setEditingVariationComboId,
    editingVariationId,
    setEditingVariationId,
    pendingNewVariationIdRef,
    updateVariation,
    addVariation,
    removeVariation,
    generateBulkVariations,
    regenerateAllVariationSkus,
  };
}
