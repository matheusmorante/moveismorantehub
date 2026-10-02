import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { Product, Variation } from '@/pages/types/product.type';
import { createStockUnavailability } from '@/pages/utils/stockUnavailabilityService';
import { fetchSuppliersForProduct } from '../services/unavailabilitySupplierService';
import {
  DEFAULT_PHYSICAL_LOCATION,
  UNAVAILABILITY_REASONS,
  UNAVAILABILITY_TREATMENTS,
  type UnavailabilitySupplier,
} from '../types/unavailabilityForm.types';

interface UseUnavailabilityFormProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export function useUnavailabilityForm({ isOpen, onSuccess }: UseUnavailabilityFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<Variation | undefined>(undefined);

  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>(UNAVAILABILITY_REASONS[0]);
  const [treatment, setTreatment] = useState<string>(UNAVAILABILITY_TREATMENTS[0]);
  const physicalLocation = DEFAULT_PHYSICAL_LOCATION;
  const [observation, setObservation] = useState<string>('');
  const [suppliers, setSuppliers] = useState<UnavailabilitySupplier[]>([]);
  const [supplierId, setSupplierId] = useState<string>('');
  const [photos, setPhotos] = useState<File[]>([]);

  // Carrega apenas os fornecedores vinculados ao produto selecionado
  useEffect(() => {
    if (!isOpen || !selectedProduct?.id) {
      setSuppliers([]);
      setSupplierId('');
      return;
    }

    let isMounted = true;

    async function loadSuppliers() {
      const list = await fetchSuppliersForProduct(selectedProduct!.id);
      if (!isMounted) return;

      setSuppliers(list);
      if (list.length === 1) {
        setSupplierId(list[0].id);
      } else {
        setSupplierId('');
      }
    }

    void loadSuppliers();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedProduct?.id]);

  const resetForm = () => {
    setSelectedProduct(null);
    setSelectedVariation(undefined);
    setQuantity('1');
    setReason(UNAVAILABILITY_REASONS[0]);
    setTreatment(UNAVAILABILITY_TREATMENTS[0]);
    setObservation('');
    setSupplierId('');
    setPhotos([]);
  };

  const isFieldsDisabled = !selectedVariation || isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error('Selecione um produto.');
      return;
    }

    const qty = parseFloat(quantity.replace(',', '.'));
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error('Informe uma quantidade válida maior que zero.');
      return;
    }

    if (treatment === 'Devolução ao fornecedor' && !supplierId) {
      toast.error('Fornecedor é obrigatório para devolução.');
      return;
    }

    if (!selectedVariation) {
      toast.error('Selecione uma variação do produto.');
      return;
    }

    if (qty > (selectedVariation.stock || 0)) {
      toast.error(
        `Quantidade informada (${qty}) é maior que o estoque atual (${selectedVariation.stock || 0}).`
      );
      return;
    }

    setIsLoading(true);
    try {
      await createStockUnavailability({
        product: selectedProduct,
        variation: selectedVariation,
        quantity: qty,
        reason,
        treatment,
        physicalLocation,
        observation,
        supplierId: supplierId || null,
        photos,
      });

      toast.success('Indisponibilidade registrada com sucesso!');
      resetForm();
      onSuccess();
    } catch (error: unknown) {
      console.error('Erro ao registrar:', error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Erro ao registrar indisponibilidade.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    state: {
      isLoading,
      selectedProduct,
      selectedVariation,
      quantity,
      reason,
      treatment,
      physicalLocation,
      observation,
      suppliers,
      supplierId,
      photos,
      isFieldsDisabled,
    },
    actions: {
      setSelectedProduct,
      setSelectedVariation,
      setQuantity,
      setReason,
      setTreatment,
      setSupplierId,
      setObservation,
      setPhotos,
      handleSubmit,
      resetForm,
    },
  };
}
