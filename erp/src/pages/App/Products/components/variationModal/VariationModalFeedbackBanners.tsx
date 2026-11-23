import React from 'react';

interface VariationModalFeedbackBannersProps {
  readonly loading: boolean;
  readonly error: string;
  readonly loadingParentImages: boolean;
  readonly parentImagesError: string;
  readonly onRetryParentImages: () => void;
}

export const VariationModalFeedbackBanners: React.FC<VariationModalFeedbackBannersProps> = ({
  loading,
  error,
  loadingParentImages,
  parentImagesError,
  onRetryParentImages,
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

      {loadingParentImages && (
        <p role="status" className="text-sm text-slate-600">
          Carregando fotos do produto pai...
        </p>
      )}

      {parentImagesError && (
        <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {parentImagesError}{' '}
          <button
            type="button"
            onClick={onRetryParentImages}
            disabled={loading || loadingParentImages}
            className="underline font-bold ml-1 cursor-pointer"
          >
            Consultar novamente
          </button>
        </div>
      )}
    </>
  );
};
