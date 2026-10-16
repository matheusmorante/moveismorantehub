import React from 'react';

interface VariationModalFeedbackBannersProps {
  readonly loading: boolean;
  readonly error: string;
  readonly referenceLoading: { attributes: boolean; images: boolean };
  readonly referenceErrors: { attributes: string; images: string };
  readonly onRetryReferences: () => void;
}

export const VariationModalFeedbackBanners: React.FC<VariationModalFeedbackBannersProps> = ({
  loading,
  error,
  referenceLoading,
  referenceErrors,
  onRetryReferences,
}) => {
  return (
    <>
      {loading && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-800"
        >
          <i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" />
          Salvando e aguardando a confirmação da variação...
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {(referenceLoading.attributes || referenceLoading.images) && (
        <p role="status" className="text-sm text-slate-600">
          Carregando atributos e fotos do produto pai...
        </p>
      )}

      {(referenceErrors.attributes || referenceErrors.images) && (
        <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {[referenceErrors.attributes, referenceErrors.images].filter(Boolean).join(' ')}{' '}
          <button
            type="button"
            onClick={onRetryReferences}
            disabled={loading || referenceLoading.attributes || referenceLoading.images}
            className="underline font-bold ml-1 cursor-pointer"
          >
            Consultar novamente
          </button>
        </div>
      )}
    </>
  );
};
