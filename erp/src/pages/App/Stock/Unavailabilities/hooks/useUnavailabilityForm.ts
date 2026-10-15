import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { erpStockUnavailabilityFormSchema } from '../../../../../../../shared-utils/operationsFormSchemas';
import { imageFilesFormSchema } from '../../../../../../../shared-utils/fileFormSchemas';
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
  const formValues = { productId: selectedProduct?.id || '', variationId: selectedVariation?.id || '', quantity: Number(quantity.replace(',', '.')), availableStock: selectedVariation?.stock || 0, supplierId, reason, treatment, physicalLocation, observation, photos };
  const form = useZodForm(erpStockUnavailabilityFormSchema, formValues);
  const photoForm = useZodForm(imageFilesFormSchema, { files: [] });
  const selectPhotos = async (files: File[]) => {
    if (!files.length) { setPhotos([]); return; }
    await photoForm.validateAndRun({ files }, (values) => setPhotos(values.files),
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0]));
  };

  // Carrega apenas os fornecedores vinculados ao produto selecionado
  useEffect(() => {
    if (!isOpen || !selectedProduct?.id) {
      setSuppliers([]);
      setSupplierId('');
      return;
    }

    let isMounted = true;

    async function loadSuppliers() {
      const prodId = selectedProduct?.id;
      if (!prodId) return;
      const list = await fetchSuppliersForProduct(prodId);
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
    if (!selectedProduct || !selectedVariation) { toast.error('Selecione um produto e uma variação.'); return; }
    return form.validateAndRun(formValues, async (validated) => {
    setIsLoading(true);
    try {
      await createStockUnavailability({
        product: selectedProduct,
        variation: selectedVariation,
        quantity: validated.quantity,
        reason: validated.reason,
        treatment: validated.treatment,
        physicalLocation: validated.physicalLocation,
        observation: validated.observation,
        supplierId: validated.supplierId || null,
        photos: validated.photos,
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
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0]));
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
      setPhotos: selectPhotos,
      handleSubmit,
      resetForm,
    },
  };
}
