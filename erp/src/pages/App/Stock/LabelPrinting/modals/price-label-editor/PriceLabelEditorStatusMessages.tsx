import React from 'react';

interface PriceLabelEditorStatusMessagesProps {
  actionError: string;
  artQueryError: string;
  saveError: string;
  opportunityQueryError: string;
  canRetrySave: boolean;
  isArtConfigLoading: boolean;
  actionBusy: boolean;
  onRetryArtQuery: () => void;
  onRetrySave: () => void;
  onRetryOpportunityQuery: () => void;
}

export const PriceLabelEditorStatusMessages: React.FC<PriceLabelEditorStatusMessagesProps> = ({
  actionError,
  artQueryError,
  saveError,
  opportunityQueryError,
  canRetrySave,
  isArtConfigLoading,
  actionBusy,
  onRetryArtQuery,
  onRetrySave,
  onRetryOpportunityQuery,
}) => (
  <>
    {(artQueryError || saveError || opportunityQueryError || actionError) && (
      <div role="alert" className="shrink-0 bg-red-50 p-3 text-sm text-red-800">
        {actionError && <p>{actionError}</p>}
        {artQueryError && (
          <p>
            {artQueryError}{' '}
            <button type="button" onClick={onRetryArtQuery}>
              Consultar arte novamente
            </button>
          </p>
        )}
        {saveError && (
          <p>
            {saveError}{' '}
            {canRetrySave && (
              <button type="button" onClick={onRetrySave}>
                Tentar salvar novamente
              </button>
            )}
          </p>
        )}
        {opportunityQueryError && (
          <p>
            {opportunityQueryError}{' '}
            <button type="button" onClick={onRetryOpportunityQuery}>
              Consultar oportunidades novamente
            </button>
          </p>
        )}
      </div>
    )}
    {isArtConfigLoading && (
      <div role="status" className="shrink-0 bg-blue-50 p-3 text-sm text-blue-800">
        <i aria-hidden="true" className="bi bi-arrow-repeat animate-spin mr-2" />
        Consultando a arte da etiqueta...
      </div>
    )}
    {actionBusy && (
      <div role="status" className="shrink-0 bg-blue-50 p-3 text-sm text-blue-800">
        <i aria-hidden="true" className="bi bi-arrow-repeat animate-spin mr-2" />
        Preparando a ação da arte...
      </div>
    )}
  </>
);
