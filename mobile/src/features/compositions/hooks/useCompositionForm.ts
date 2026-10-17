import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import type { Composition, CompositionVariationItem } from '../types/composition.type';
import { saveComposition } from '../services/mobileCompositionService';
import { useZodForm, flattenFormErrors } from '../../../hooks/useZodForm';
import { mobileCompositionFormSchema } from '../schemas/compositionFormSchema';

export type CompositionTab = 'info' | 'items' | 'variations' | 'images';

interface UseCompositionFormOptions {
  visible: boolean;
  composition?: Composition | null;
  onSuccess?: () => void;
  onClose: () => void;
}

/**
 * Hook de controle de estado do formulário de composições no app mobile.
 * Gerencia validação Zod via useZodForm, persistência atômica e navegação entre abas.
 */
export function useCompositionForm({
  visible,
  composition,
  onSuccess,
  onClose,
}: UseCompositionFormOptions) {
  const [activeTab, setActiveTab] = useState<CompositionTab>('info');
  const [formData, setFormData] = useState<Partial<Composition>>({
    active: true,
    catalog_published: true,
    pricing_mode: 'sum',
  });
  const [items, setItems] = useState<CompositionVariationItem[]>([]);
  const [manualPriceInput, setManualPriceInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const formValues = {
    data: {
      ...formData,
      name: formData.name || '',
      pricing_mode: formData.pricing_mode || 'sum',
      manual_price:
        formData.pricing_mode === 'sum'
          ? formData.manual_price
          : manualPriceInput.trim()
          ? Number(manualPriceInput.trim().replace(',', '.'))
          : undefined,
    },
    items,
  };

  const { validateAndRun } = useZodForm(mobileCompositionFormSchema, formValues);

  useEffect(() => {
    if (visible && composition) {
      setFormData(composition);
      setManualPriceInput(
        composition.manual_price === undefined ? '' : String(composition.manual_price)
      );
      setItems(composition.variations?.[0]?.items || []);
    } else if (visible) {
      setFormData({
        active: true,
        catalog_published: true,
        pricing_mode: 'sum',
      });
      setItems([]);
      setManualPriceInput('');
      setActiveTab('info');
    }
  }, [visible, composition]);

  const handleAddItem = (product: any, variation?: any) => {
    const newItem: CompositionVariationItem = {
      product_id: product.id,
      variation_id: variation?.id,
      quantity: 1,
      productName: product.description || product.name,
      productSku: variation ? variation.sku : product.code,
      unitPrice: Number(
        variation?.unitPrice ??
          variation?.price ??
          product.unitPrice ??
          product.sellPrice ??
          product.price ??
          0
      ),
      currentStock: variation ? variation.stock : product.stock,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], quantity };
      return newItems;
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    await validateAndRun(
      formValues,
      async (values) => {
        try {
          setIsSaving(true);
          const variationsToSave = [
            {
              id: composition?.variations?.[0]?.id,
              name: 'Padrão',
              sku: values.data.sku,
              items: values.items,
              active: true,
            },
          ];

          await saveComposition(values.data, variationsToSave);
          Alert.alert('Sucesso', 'Composição salva com sucesso!');
          if (onSuccess) onSuccess();
          onClose();
        } catch (error) {
          console.error('Erro ao salvar:', error);
          Alert.alert('Erro', 'Ocorreu um erro ao salvar a composição.');
        } finally {
          setIsSaving(false);
        }
      },
      (errors) => {
        Alert.alert(
          'Revise a composição',
          Object.values(flattenFormErrors(errors))[0] || 'Revise os campos informados.'
        );
        setActiveTab(errors.data ? 'info' : 'items');
      }
    );
  };

  return {
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    items,
    setItems,
    manualPriceInput,
    setManualPriceInput,
    isSaving,
    handleAddItem,
    removeItem,
    updateItemQuantity,
    handleSave,
  };
}
