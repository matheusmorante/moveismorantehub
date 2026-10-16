import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { stockUnavailabilityOwnerFormSchema, stockUnavailabilityPhotosFormSchema, stockUnavailabilitySupplierQuerySchema,
  StockUnavailabilityUnconfirmedError, type StockUnavailabilityOperationGuard } from '../../../../../../../shared-utils/stockUnavailabilityFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import type { Product, Variation } from '@/pages/types/product.type';
import { createStockUnavailability } from '@/pages/utils/stockUnavailabilityService';
import { fetchSuppliersForProductResult } from '../services/unavailabilitySupplierService';
import { DEFAULT_PHYSICAL_LOCATION, UNAVAILABILITY_REASONS, UNAVAILABILITY_TREATMENTS, type UnavailabilitySupplier } from '../types/unavailabilityForm.types';

interface UseUnavailabilityFormProps { isOpen: boolean; onSuccess: () => void; operationGuard?: StockUnavailabilityOperationGuard }

export function useUnavailabilityForm({ isOpen, onSuccess, operationGuard }: UseUnavailabilityFormProps) {
  const ownedGuard = useRef<StockUnavailabilityOperationGuard>({ active: null, error: '' });
  const guard = operationGuard ?? ownedGuard.current;
  const active = useRef(false), submitting = useRef(false), completed = useRef(false), photoRevision = useRef(0), photoPending = useRef(false);
  const [isLoading, setIsLoading] = useState(false), [formError, setFormError] = useState(guard.error);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<Variation | undefined>();
  const [quantity, setQuantity] = useState('1'), [reason, setReason] = useState<string>(UNAVAILABILITY_REASONS[0]);
  const [treatment, setTreatment] = useState<string>(UNAVAILABILITY_TREATMENTS[0]), [observation, setObservation] = useState('');
  const [suppliers, setSuppliers] = useState<UnavailabilitySupplier[]>([]), [supplierId, setSupplierId] = useState('');
  const [photos, setPhotos] = useState<File[]>([]), [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierError, setSupplierError] = useState(''), [supplierRevision, setSupplierRevision] = useState(0);
  const physicalLocation = DEFAULT_PHYSICAL_LOCATION;
  const formValues = { productId: selectedProduct?.id || '', variationId: selectedVariation?.id || '', variationIsVirtual: Boolean(selectedVariation?.isVirtual), quantity: Number(quantity.replace(',', '.')),
    availableStock: selectedVariation?.stock ?? 0, supplierId, supplierIds: suppliers.map((supplier) => supplier.id), reason, treatment, physicalLocation, observation, photos };
  const form = useZodForm(stockUnavailabilityOwnerFormSchema, formValues);
  const photoForm = useZodForm(stockUnavailabilityPhotosFormSchema, { photos: [] });
  const { validateValues: validateQuery } = useZodForm(stockUnavailabilitySupplierQuerySchema, { productId: '' });
  const currentProductId = useRef(selectedProduct?.id); currentProductId.current = selectedProduct?.id;
  const currentVariationId = useRef(selectedVariation?.id); currentVariationId.current = selectedVariation?.id;
  const currentToken = useRef<symbol | null>(null);

  useEffect(() => {
    active.current = isOpen;
    if (isOpen && guard.active) {
      guard.error ||= 'Há um registro de outra abertura sem confirmação. Consulte as indisponibilidades e recarregue a página.';
      setFormError(guard.error);
    }
    return () => {
      active.current = false; photoRevision.current += 1;
      if (!completed.current && guard.active && guard.active === currentToken.current) guard.error ||= new StockUnavailabilityUnconfirmedError().message;
    };
  }, [isOpen, guard]);

  const showErrors = (errors: Parameters<typeof flattenFormErrors>[0]) => {
    if (!active.current) return;
    const message = Object.values(flattenFormErrors(errors))[0] || 'Confira os dados do formulário.';
    setFormError(message); toast.error(message);
  };
  const selectPhotos = async (files: File[]) => {
    if (!active.current || submitting.current || guard.error) return;
    const revision = ++photoRevision.current, productId = currentProductId.current;
    photoPending.current = true;
    try {
      await photoForm.enqueueAndRun({ photos: files }, (values) => {
        if (!active.current || revision !== photoRevision.current || currentProductId.current !== productId) return false;
        setPhotos(values.photos); setFormError(''); return true;
      }, (errors) => { if (revision === photoRevision.current && currentProductId.current === productId) showErrors(errors); });
    } finally { if (revision === photoRevision.current) photoPending.current = false; }
  };

  useEffect(() => {
    setSuppliers([]); setSupplierId(''); setSupplierError('');
    if (!isOpen || !selectedProduct?.id) { setSupplierLoading(false); return; }
    const productId = selectedProduct.id;
    let current = true;
    setSupplierLoading(true);
    void (async () => {
      try {
        const values = await validateQuery({ productId });
        if (!values || !current) return;
        const result = await withTimeout(fetchSuppliersForProductResult(values.productId, () => current), 22000, null, 'indisponibilidade:fornecedores-formulario');
        if (!current) return;
        if (!result || result.error) throw result?.error || new Error('A consulta de fornecedores excedeu o prazo.');
        setSuppliers(result.data); setSupplierId(result.data.length === 1 ? result.data[0].id : '');
      } catch (error) { if (current) setSupplierError(error instanceof Error ? error.message : 'Não foi possível consultar fornecedores.'); }
      finally { if (current) setSupplierLoading(false); }
    })();
    return () => { current = false; };
  }, [isOpen, selectedProduct?.id, supplierRevision, validateQuery]);

  const clearDraft = () => {
    photoRevision.current += 1; photoPending.current = false;
    setSelectedProduct(null); setSelectedVariation(undefined); setQuantity('1');
    setReason(UNAVAILABILITY_REASONS[0]); setTreatment(UNAVAILABILITY_TREATMENTS[0]);
    setObservation(''); setSupplierId(''); setPhotos([]);
  };
  const resetForm = () => { if (submitting.current) return false; clearDraft(); return true; };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!active.current || submitting.current || completed.current || guard.active || guard.error) return false;
    if (photoPending.current) { setFormError('Aguarde a validação das fotos.'); return false; }
    submitting.current = true; setIsLoading(true); setFormError('');
    // Capture the identity and payload before the async resolver, without reading later edits.
    const product = selectedProduct ? { ...selectedProduct } : null;
    const variation = selectedVariation ? { ...selectedVariation } : undefined;
    let accepting = true;
    const token = Symbol('stock-unavailability'); currentToken.current = token;
    const stillCurrent = () => active.current && accepting && !guard.error
      && currentProductId.current === product?.id && currentVariationId.current === variation?.id;
    try {
      return await form.validateAndRun(formValues, async (values) => {
        if (!stillCurrent() || !product || !variation) return false;
        guard.active = token;
        const confirmation = await withTimeout(createStockUnavailability({ product: { ...product, id: values.productId },
          variation: { ...variation, id: values.variationId }, quantity: values.quantity, reason: values.reason, treatment: values.treatment,
          physicalLocation: values.physicalLocation, observation: values.observation, supplierId: values.supplierId || null, photos: values.photos }, stillCurrent),
        60000, null, 'indisponibilidade:registrar-formulario');
        if (!confirmation?.id) throw new StockUnavailabilityUnconfirmedError();
        if (!stillCurrent()) return false;
        completed.current = true; guard.active = null; clearDraft(); toast.success('Indisponibilidade registrada com sucesso!');
        try { onSuccess(); } catch { setFormError('Registro confirmado, mas a lista não foi atualizada. Recarregue a página.'); }
        return true;
      }, showErrors);
    } catch (error) {
      const message = error instanceof Error ? error.message
        : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Não foi possível registrar a indisponibilidade.';
      if ((error as { uncertain?: boolean })?.uncertain) guard.error = message;
      if (active.current) { setFormError(message); toast.error(message); }
      return false;
    } finally {
      accepting = false; submitting.current = false;
      if (guard.active === token) guard.active = null;
      if (active.current) setIsLoading(false);
    }
  };

  return {
    state: { isLoading, formError, operationBlocked: Boolean(guard.error) || completed.current, selectedProduct, selectedVariation,
      quantity, reason, treatment, physicalLocation, observation, suppliers, supplierId, photos, supplierLoading, supplierError,
      isFieldsDisabled: !selectedVariation || isLoading || Boolean(guard.error) || completed.current },
    actions: { setSelectedProduct, setSelectedVariation, setQuantity, setReason, setTreatment, setSupplierId, setObservation,
      setPhotos: selectPhotos, handleSubmit, resetForm, retrySuppliers: () => setSupplierRevision((revision) => revision + 1) },
  };
}
