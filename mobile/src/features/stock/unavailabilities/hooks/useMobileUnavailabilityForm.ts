import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { stockUnavailabilityFormSchema } from '../../../../../../shared-utils/operationsFormSchemas';
import { createStockUnavailability } from '../../../../services/stock/stockUnavailabilitiesService';
import { searchProducts } from '../../../../services/stockService';
import { supabase } from '../../../../services/supabaseClient';
import {
  type ProductVariationSuggestion,
  REASONS,
  type SupplierOption,
  TREATMENTS,
} from '../types';

interface SupplierPersonRow {
  id: string;
  full_name?: string | null;
  nickname?: string | null;
  social_name?: string | null;
}

interface UseMobileUnavailabilityFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface UseMobileUnavailabilityFormReturn {
  state: {
    isLoading: boolean;
    productQuery: string;
    productSuggestions: ProductVariationSuggestion[];
    isSearchingProduct: boolean;
    selectedProductVariation: ProductVariationSuggestion | null;
    quantity: string;
    reason: string;
    treatment: string;
    observation: string;
    suppliers: SupplierOption[];
    selectedSupplierId: string;
    isFieldsDisabled: boolean;
  };
  actions: {
    setProductQuery: (query: string) => void;
    setSelectedProductVariation: (item: ProductVariationSuggestion | null) => void;
    setQuantity: (quantity: string) => void;
    setReason: (reason: string) => void;
    setTreatment: (treatment: string) => void;
    setSelectedSupplierId: (supplierId: string) => void;
    setObservation: (observation: string) => void;
    handleSubmit: () => Promise<void>;
    handleClose: () => void;
    resetForm: () => void;
  };
}

export function useMobileUnavailabilityForm({
  isOpen,
  onClose,
  onSuccess,
}: UseMobileUnavailabilityFormProps): UseMobileUnavailabilityFormReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<ProductVariationSuggestion[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [selectedProductVariation, setSelectedProductVariation] =
    useState<ProductVariationSuggestion | null>(null);

  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [treatment, setTreatment] = useState<string>(TREATMENTS[0]);
  const physicalLocation = 'Depósito';
  const [observation, setObservation] = useState('');

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const formValues = { productId: selectedProductVariation?.id || '', variationId: selectedProductVariation?.variation_id || '', quantity: Number(quantity.replace(',', '.')), availableStock: Number(selectedProductVariation?.stock || 0), supplierId: selectedSupplierId, reason, treatment };
  const form = useZodForm(stockUnavailabilityFormSchema, formValues);

  // Busca fornecedores vinculados ao produto selecionado
  useEffect(() => {
    if (!isOpen || !selectedProductVariation?.id) {
      setSuppliers([]);
      setSelectedSupplierId('');
      return;
    }

    let isMounted = true;

    const fetchProductSuppliers = async () => {
      try {
        const { data: prodData, error: productError } = await supabase
          .from('products')
          .select('supplier_id, main_supplier_id, supplier_ids')
          .eq('id', selectedProductVariation.id)
          .single();

        if (productError) throw productError;
        if (!isMounted) return;

        const linkedIds = Array.from(
          new Set(
            [
              prodData?.supplier_id,
              prodData?.main_supplier_id,
              ...(Array.isArray(prodData?.supplier_ids) ? prodData.supplier_ids : []),
            ].filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          )
        );

        if (linkedIds.length === 0) {
          setSuppliers([]);
          setSelectedSupplierId('');
          return;
        }

        const { data: supList, error: suppliersError } = await supabase
          .from('people')
          .select('id, full_name, nickname, social_name')
          .in('id', linkedIds)
          .or('person_type.ilike.suppliers,person_type.ilike.supplier');

        if (suppliersError) throw suppliersError;
        if (!isMounted) return;

        const list = ((supList || []) as SupplierPersonRow[])
          .map(
            (person): SupplierOption => ({
              id: person.id,
              fantasy_name:
                person.nickname?.trim() ||
                person.full_name?.trim() ||
                person.social_name?.trim() ||
                'Fornecedor sem nome',
            })
          )
          .sort((left, right) => left.fantasy_name.localeCompare(right.fantasy_name, 'pt-BR'));
        setSuppliers(list);
        if (list.length === 1) {
          setSelectedSupplierId(list[0].id);
        } else {
          setSelectedSupplierId('');
        }
      } catch (e) {
        console.warn('Erro ao carregar fornecedores do produto no mobile:', e);
        if (isMounted) {
          setSuppliers([]);
          setSelectedSupplierId('');
        }
      }
    };

    void fetchProductSuppliers();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedProductVariation?.id]);

  // Debounced search de produtos com variação
  useEffect(() => {
    if (productQuery.trim().length < 2 || selectedProductVariation) {
      setProductSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingProduct(true);
      try {
        const results = (await searchProducts(productQuery)) as ProductVariationSuggestion[];
        setProductSuggestions(results);
      } catch (e) {
        console.warn('Erro na busca de produtos:', e);
      } finally {
        setIsSearchingProduct(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [productQuery, selectedProductVariation]);

  const resetForm = useCallback(() => {
    setSelectedProductVariation(null);
    setProductQuery('');
    setQuantity('1');
    setReason(REASONS[0]);
    setTreatment(TREATMENTS[0]);
    setSelectedSupplierId('');
    setObservation('');
    setIsLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = async () => {
    await form.validateAndRun(
      formValues,
      async (validated) => {
        const targetSupplierId =
          validated.treatment === 'Devolução ao fornecedor' ? selectedSupplierId || null : null;

        setIsLoading(true);
        try {
          await createStockUnavailability({
            productId: validated.productId,
            variationId: validated.variationId,
            quantity: validated.quantity,
            reason: validated.reason,
            treatment: validated.treatment,
            physicalLocation,
            observation: observation.trim() || undefined,
            supplierId: targetSupplierId,
          });

          Alert.alert('Sucesso', 'Indisponibilidade registrada com sucesso!');
          resetForm();
          onSuccess();
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : typeof error === 'object' && error && 'message' in error
                ? String((error as { message: unknown }).message)
                : 'Falha ao registrar indisponibilidade.';
          Alert.alert('Erro ao registrar', errorMessage);
        } finally {
          setIsLoading(false);
        }
      },
      (errors) => Alert.alert('Atenção', Object.values(flattenFormErrors(errors))[0])
    );
  };

  const isFieldsDisabled = !selectedProductVariation || isLoading;

  return {
    state: {
      isLoading,
      productQuery,
      productSuggestions,
      isSearchingProduct,
      selectedProductVariation,
      quantity,
      reason,
      treatment,
      observation,
      suppliers,
      selectedSupplierId,
      isFieldsDisabled,
    },
    actions: {
      setProductQuery,
      setSelectedProductVariation,
      setQuantity,
      setReason,
      setTreatment,
      setSelectedSupplierId,
      setObservation,
      handleSubmit,
      handleClose,
      resetForm,
    },
  };
}
