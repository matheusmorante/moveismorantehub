import React from 'react';
import type {
  OrderFiscalSituation,
  ReplacementPendingAction,
} from '@/pages/utils/nfe/orderFiscalBadgeRules';

interface FiscalSituationNoticeProps {
  readonly situation?: OrderFiscalSituation;
  /** Executa a ação principal recomendada (ex: emitir nova nota, continuar rascunho, corrigir) */
  readonly onExecuteAction?: (actionKind: ReplacementPendingAction) => void;
  /** Leva à aba Vinculadas, onde estão a NF original, os estornos e a nova nota. */
  readonly onOpenLinked?: () => void;
}

interface NoticeContent {
  readonly title: string;
  readonly message: string;
  readonly reasonLabel: string;
  readonly actionLabel: string;
  readonly actionIcon: string;
  readonly className: string;
  readonly iconClassName: string;
  readonly icon: string;
}

const ACTION_CONFIG: Record<
  ReplacementPendingAction,
  { title: string; message: string; actionLabel: string; actionIcon: string }
> = {
  awaiting_new_invoice: {
    title: 'Nova nota fiscal necessária',
    message:
      'A nota fiscal anterior foi cancelada ou estornada após a alteração do pedido. É necessário emitir uma nova nota fiscal com os dados atualizados.',
    actionLabel: 'Emitir nova nota fiscal',
    actionIcon: 'bi-receipt',
  },
  draft: {
    title: 'Emissão não transmitida',
    message:
      'A emissão não chegou a ser transmitida. O sistema deve preservar o rascunho e permitir continuar o procedimento.',
    actionLabel: 'Continuar emissão',
    actionIcon: 'bi-play-fill',
  },
  rejected: {
    title: 'Nova nota fiscal rejeitada pela SEFAZ',
    message:
      'A tentativa de emissão foi rejeitada pela SEFAZ. Corrija os dados fiscais apontados para retransmitir.',
    actionLabel: 'Corrigir emissão',
    actionIcon: 'bi-pencil-square',
  },
  transmission_uncertain: {
    title: 'Transmissão com resultado incerto',
    message:
      'O resultado da transmissão é incerto. Consulte a situação na SEFAZ antes de qualquer nova tentativa.',
    actionLabel: 'Consultar situação',
    actionIcon: 'bi-arrow-repeat',
  },
  prior_regularization_failed: {
    title: 'Regularização fiscal pendente',
    message:
      'Não foi possível confirmar o cancelamento ou estorno da nota fiscal anterior. Resolva esta pendência antes de emitir uma nova nota fiscal.',
    actionLabel: 'Resolver regularização anterior',
    actionIcon: 'bi-exclamation-octagon-fill',
  },
  authorized: {
    title: 'Nota fiscal regularizada',
    message: 'A operação fiscal deste pedido está regularizada.',
    actionLabel: 'Ver documento',
    actionIcon: 'bi-check-circle-fill',
  },
};

/**
 * Amarelo = ação fiscal necessária (regularização concluída, falta a nova NF).
 * Vermelho/laranja = falha real ou resultado incerto na regularização da nota anterior.
 * Texto escuro sobre amarelo segue o contraste exigido (#3b1900 sobre âmbar).
 */
const NOTICE_BY_STATUS: Partial<Record<OrderFiscalSituation['status'], NoticeContent>> = {
  reissue_required: {
    title: 'Nova nota fiscal necessária',
    message:
      'A nota fiscal anterior foi cancelada ou estornada após a alteração do pedido. É necessário emitir uma nova nota fiscal com os dados atualizados.',
    reasonLabel: 'Última tentativa da nova nota',
    actionLabel: 'Emitir nova nota fiscal',
    actionIcon: 'bi-receipt',
    className: 'border-amber-700 bg-amber-400 text-[#3b1900]',
    iconClassName: 'text-[#3b1900]',
    icon: 'bi-exclamation-triangle-fill',
  },
  regularization_failed: {
    title: 'Regularização fiscal pendente',
    message:
      'Não foi possível confirmar o cancelamento ou estorno da nota fiscal anterior. Resolva esta pendência antes de emitir uma nova nota fiscal.',
    reasonLabel: 'Motivo registrado',
    actionLabel: 'Resolver regularização anterior',
    actionIcon: 'bi-exclamation-octagon-fill',
    className:
      'border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100',
    iconClassName: 'text-red-600 dark:text-red-300',
    icon: 'bi-exclamation-octagon-fill',
  },
  regularization_uncertain: {
    title: 'Regularização fiscal pendente',
    message:
      'O resultado do cancelamento ou estorno da nota fiscal anterior é incerto. Consulte a SEFAZ e reconcilie o documento antes de qualquer reenvio ou de emitir uma nova nota fiscal; nenhuma nova nota de estorno é gerada automaticamente.',
    reasonLabel: 'Último retorno registrado',
    actionLabel: 'Consultar situação',
    actionIcon: 'bi-arrow-repeat',
    className:
      'border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-100',
    iconClassName: 'text-orange-600 dark:text-orange-300',
    icon: 'bi-question-octagon-fill',
  },
};

export const FiscalSituationNotice: React.FC<FiscalSituationNoticeProps> = ({
  situation,
  onExecuteAction,
  onOpenLinked,
}) => {
  const baseContent = situation ? NOTICE_BY_STATUS[situation.status] : undefined;
  if (!situation || !baseContent) return null;

  const actionKind: ReplacementPendingAction =
    situation.actionKind ||
    (situation.status === 'regularization_failed'
      ? 'prior_regularization_failed'
      : situation.status === 'regularization_uncertain'
      ? 'transmission_uncertain'
      : 'awaiting_new_invoice');

  const actionOverride = situation.status === 'reissue_required' && situation.actionKind
    ? ACTION_CONFIG[situation.actionKind]
    : undefined;

  const title = actionOverride?.title || baseContent.title;
  const message = actionOverride?.message || baseContent.message;
  const actionLabel = actionOverride?.actionLabel || baseContent.actionLabel;
  const actionIcon = actionOverride?.actionIcon || baseContent.actionIcon;

  return (
    <section
      role="status"
      aria-label={title}
      data-fiscal-situation={situation.status}
      data-action-kind={actionKind}
      className={`flex flex-col gap-3 border-b px-4 py-3 text-xs sm:px-6 sm:flex-row sm:items-start sm:justify-between ${baseContent.className}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <i aria-hidden="true" className={`bi ${baseContent.icon} mt-0.5 text-base shrink-0 ${baseContent.iconClassName}`} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black tracking-wide text-xs uppercase px-1.5 py-0.5 rounded bg-black/10">
              {situation.environment === 2 ? 'NFH' : 'NF'}
            </span>
            <p className="text-sm font-black">{title}</p>
          </div>

          <p className="font-semibold leading-relaxed">{message}</p>

          {situation.previousDocumentNumber ? (
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-black/15 bg-black/10 px-2 py-0.5 font-mono text-[11px] font-bold">
                <span>NF anterior nº {situation.previousDocumentNumber}</span>
                <span>·</span>
                <span className="capitalize">{situation.previousDocumentClosure || 'Estornada'}</span>
              </span>
            </div>
          ) : null}

          {situation.reason ? (
            <p className="break-words font-semibold text-[11px] opacity-95">
              {baseContent.reasonLabel}: {situation.reason}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:self-center">
        {onExecuteAction && actionKind !== 'authorized' ? (
          <button
            type="button"
            onClick={() => onExecuteAction(actionKind)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#3b1900] px-3.5 py-2 text-xs font-black text-amber-300 shadow transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b1900] dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300"
          >
            <i aria-hidden="true" className={`bi ${actionIcon}`} />
            <span>{actionLabel}</span>
          </button>
        ) : null}

        {onOpenLinked ? (
          <button
            type="button"
            onClick={onOpenLinked}
            className="shrink-0 rounded-lg border border-current px-3 py-1.5 font-bold underline-offset-2 hover:underline"
          >
            Ver documentos vinculados
          </button>
        ) : null}
      </div>
    </section>
  );
};
