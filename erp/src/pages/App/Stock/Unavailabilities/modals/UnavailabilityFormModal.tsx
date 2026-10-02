import ProductAutocomplete from '@/components/ProductAutocomplete';
import { useUnavailabilityForm } from '../hooks/useUnavailabilityForm';
import {
  UNAVAILABILITY_REASONS,
  UNAVAILABILITY_TREATMENTS,
  type UnavailabilityFormModalProps,
} from '../types/unavailabilityForm.types';

export default function UnavailabilityFormModal({
  isOpen,
  onClose,
  onSuccess,
}: UnavailabilityFormModalProps) {
  const { state, actions } = useUnavailabilityForm({ isOpen, onSuccess });

  if (!isOpen) return null;

  const handleClose = () => {
    actions.resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <button
        type="button"
        aria-label="Fechar modal"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-default"
        onClick={handleClose}
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 animate-scale-in">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-20">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Registrar Indisponibilidade
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={actions.handleSubmit} className="p-6 space-y-5">
          {/* Seleção do Produto e Variação */}
          <div>
            <span className="block text-sm font-semibold mb-1">
              Produto{' '}
              <span className="text-red-600" aria-hidden="true">
                *
              </span>
            </span>
            <ProductAutocomplete
              variationsOnly
              isSelected={!!state.selectedVariation}
              onSelect={(prod, vari) => {
                actions.setSelectedProduct(prod);
                actions.setSelectedVariation(vari);
              }}
              onChange={() => {
                actions.setSelectedProduct(null);
                actions.setSelectedVariation(undefined);
              }}
            />
            {!state.selectedVariation && (
              <p role="status" className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Selecione uma variação; produtos sem variação não podem gerar movimentação.
              </p>
            )}
          </div>

          {/* Quantidade e Motivo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="unavailability-quantity" className="block text-sm font-semibold mb-1">
                Quantidade{' '}
                <span className="text-red-600" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="unavailability-quantity"
                aria-label="Quantidade *"
                type="number"
                required
                min="1"
                step="0.01"
                disabled={state.isFieldsDisabled}
                value={state.quantity}
                onChange={(e) => actions.setQuantity(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="unavailability-reason" className="block text-sm font-semibold mb-1">
                Motivo{' '}
                <span className="text-red-600" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="unavailability-reason"
                aria-label="Motivo *"
                disabled={state.isFieldsDisabled}
                value={state.reason}
                onChange={(e) => actions.setReason(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {UNAVAILABILITY_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tratativa */}
          <div>
            <label htmlFor="unavailability-treatment" className="block text-sm font-semibold mb-1">
              Tratativa{' '}
              <span className="text-red-600" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="unavailability-treatment"
              aria-label="Tratativa *"
              disabled={state.isFieldsDisabled}
              value={state.treatment}
              onChange={(e) => actions.setTreatment(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {UNAVAILABILITY_TREATMENTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Fornecedor Alvo (condicional a devolução) */}
          {state.treatment === 'Devolução ao fornecedor' && (
            <div>
              <label htmlFor="unavailability-supplier" className="block text-sm font-semibold mb-1">
                Fornecedor Alvo{' '}
                <span className="text-red-600" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="unavailability-supplier"
                aria-label="Fornecedor Alvo *"
                disabled={state.isFieldsDisabled}
                value={state.supplierId}
                onChange={(e) => actions.setSupplierId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Selecione o fornecedor alvo...</option>
                {state.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fantasy_name}
                  </option>
                ))}
              </select>
              {state.selectedVariation && state.suppliers.length === 0 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Nenhum fornecedor vinculado a este produto.
                </p>
              )}
            </div>
          )}

          {/* Fotos */}
          <div>
            <label htmlFor="unavailability-photos" className="block text-sm font-semibold mb-1">
              Fotos
            </label>
            <input
              id="unavailability-photos"
              type="file"
              multiple
              accept="image/*"
              disabled={state.isFieldsDisabled}
              onChange={(e) => actions.setPhotos(Array.from(e.target.files || []))}
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Observação (com padrão de borda apenas embaixo) */}
          <div>
            <label
              htmlFor="unavailability-observation"
              className="block text-sm font-semibold mb-1"
            >
              Observação
            </label>
            <textarea
              id="unavailability-observation"
              aria-label="Observação"
              disabled={state.isFieldsDisabled}
              value={state.observation}
              onChange={(e) => actions.setObservation(e.target.value)}
              placeholder="Detalhes adicionais (opcional)..."
              className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm text-slate-800 dark:text-slate-100 rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              rows={3}
            />
          </div>

          {/* Ações do Rodapé */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={state.isLoading}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={state.isLoading || !state.selectedProduct || !state.selectedVariation}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.isLoading ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
