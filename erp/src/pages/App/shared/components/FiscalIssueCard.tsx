import { useState, type PropsWithChildren } from 'react';
import type {
  FiscalIssueTechnicalDetails,
  FiscalIssueTone,
} from '@/pages/utils/nfe/fiscalIssuePresentation';

export type {
  FiscalIssueTechnicalDetails,
  FiscalIssueTone,
} from '@/pages/utils/nfe/fiscalIssuePresentation';

interface FiscalIssueCardProps extends PropsWithChildren {
  tone: FiscalIssueTone;
  title: string;
  description: string;
  nextStep?: string;
  technicalDetails?: FiscalIssueTechnicalDetails;
  onClose?: () => void;
}

const toneClasses: Record<FiscalIssueTone, string> = {
  attention:
    'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100',
  error:
    'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100',
  info: 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100',
};

const technicalRows = (details?: FiscalIssueTechnicalDetails) => {
  if (!details) return [];
  return [
    ['Código', details.apiCode],
    ['HTTP', details.httpStatus],
    ['Transporte', details.transportCode],
    ['Etapa', details.diagnosticStage],
    ['Categoria', details.diagnosticCategory],
    ['Código SEFAZ', details.sefazCode],
    ['Resposta SEFAZ', details.sefazMessage],
    ['Documento', details.documentNumber],
    ['Tentativa', details.emissionRequestId],
    ['Documento anterior', details.documentId],
    ['Diagnóstico', details.diagnosticId],
    ['Banco', details.databaseCode],
    [
      'Ambiente',
      details.environment === 1
        ? 'Produção'
        : details.environment === 2
          ? 'Homologação'
          : undefined,
    ],
    ['Modelo', details.model],
  ].filter((row): row is [string, string | number] => row[1] !== undefined && row[1] !== '');
};

export const FiscalIssueCard: React.FC<FiscalIssueCardProps> = ({
  tone,
  title,
  description,
  nextStep,
  technicalDetails,
  onClose,
  children,
}) => {
  const [copyFeedback, setCopyFeedback] = useState('');
  const rows = technicalRows(technicalDetails);
  const copyTechnicalDetails = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(
        rows.map(([label, value]) => `${label}: ${value}`).join('\n')
      );
      setCopyFeedback('Detalhes copiados.');
    } catch {
      setCopyFeedback('Não foi possível copiar. Selecione os detalhes técnicos para copiá-los.');
    }
  };

  return (
    <section
      role="alert"
      aria-live="polite"
      data-testid="fiscal-issue-card"
      className={`rounded-2xl border p-4 text-xs ${toneClasses[tone]}`}
    >
      <h2 className="font-black text-sm">{title}</h2>
      <p className="mt-1 leading-relaxed">{description}</p>
      {nextStep && (
        <p className="mt-2 leading-relaxed">
          <strong>O que fazer agora:</strong> {nextStep}
        </p>
      )}
      {children ? <div className="mt-3 space-y-2">{children}</div> : null}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 rounded-xl border border-current/30 px-4 py-2 font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        >
          Fechar
        </button>
      )}
      {rows.length > 0 && (
        <details
          className="mt-3 border-t border-current/20 pt-2"
          data-testid="fiscal-technical-details"
        >
          <summary className="cursor-pointer font-semibold">Ver detalhes técnicos</summary>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="fiscal-copy-details"
              onClick={() => void copyTechnicalDetails()}
              className="rounded-lg border border-current/30 px-3 py-1.5 font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              Copiar detalhes
            </button>
            {copyFeedback && (
              <span role="status" aria-live="polite">
                {copyFeedback}
              </span>
            )}
          </div>
          <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[max-content_1fr]">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="font-semibold">{label}:</dt>
                <dd className="break-all font-mono">{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </section>
  );
};
