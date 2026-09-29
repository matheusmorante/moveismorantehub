import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import { Product, Variation } from '@/pages/types/product.type';
import { createStockUnavailability } from '@/pages/utils/stockUnavailabilityService';

interface UnavailabilityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REASONS = ['Avaria', 'Defeito', 'Separação para devolução ao fornecedor', 'Outro'];

const TREATMENTS = ['Devolução ao fornecedor', 'Descarte/perda', 'Outro'];

const LOCATIONS = ['Depósito', 'Mostruário', 'Outro'];

export default function UnavailabilityFormModal({
  isOpen,
  onClose,
  onSuccess,
}: UnavailabilityFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<Variation | undefined>(undefined);

  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [treatment, setTreatment] = useState<string>(TREATMENTS[0]);
  const physicalLocation = 'Depósito';
  const [observation, setObservation] = useState<string>('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState<string>('');
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data } = await supabase
        .from('suppliers')
        .select('id, fantasy_name')
        .order('fantasy_name');
      if (data) setSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error('Selecione um produto.');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
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
      setSelectedProduct(null);
      setSelectedVariation(undefined);
      setQuantity('1');
      setReason(REASONS[0]);
      setTreatment(TREATMENTS[0]);

      setObservation('');
      setSupplierId('');
      setPhotos([]);

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao registrar:', error);
      toast.error(error.message || 'Erro ao registrar indisponibilidade.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 animate-scale-in">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-20">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Registrar Indisponibilidade
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Produto *</label>
            <ProductAutocomplete
              variationsOnly
              isSelected={!!selectedVariation}
              onSelect={(prod, vari) => {
                setSelectedProduct(prod);
                setSelectedVariation(vari);
              }}
              onChange={() => {
                setSelectedProduct(null);
                setSelectedVariation(undefined);
              }}
            />
            {!selectedVariation && (
              <p role="status" className="mt-1 text-xs text-amber-700">
                Selecione uma variação; produtos sem variação não podem gerar movimentação.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="unavailability-quantity" className="block text-sm font-semibold mb-1">
                Quantidade *
              </label>
              <input
                id="unavailability-quantity"
                aria-label="Quantidade *"
                type="number"
                required
                min="1"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Local Físico *</label>
              <select
                value={physicalLocation}
                onChange={(e) => setPhysicalLocation(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                {LOCATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Motivo *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="unavailability-treatment"
                className="block text-sm font-semibold mb-1"
              >
                Tratativa *
              </label>
              <select
                id="unavailability-treatment"
                aria-label="Tratativa *"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
              >
                {TREATMENTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="unavailability-supplier" className="block text-sm font-semibold mb-1">
              Fornecedor (Obrigatório para devolução)
            </label>
            <select
              id="unavailability-supplier"
              aria-label="Fornecedor"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
            >
              <option value="">Selecione...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fantasy_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Fotos</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setPhotos(Array.from(e.target.files || []))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Observação</label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedProduct || !selectedVariation}
              className="px-5 py-2 bg-red-600 text-white rounded font-bold"
            >
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
