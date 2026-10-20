import type {
  OrderFiscalBadgeStatus,
  ReplacementPendingAction,
} from '@/pages/utils/nfe/orderFiscalBadgeRules';

export type FiscalPendencyType =
  | 'awaiting_new_invoice'
  | 'draft'
  | 'rejected'
  | 'transmission_uncertain'
  | 'prior_regularization_failed'
  | 'prior_regularization_uncertain'
  | 'processing';

export interface FiscalPendencyItem {
  readonly id: string;
  readonly orderId: string;
  readonly orderIndex: string | number;
  readonly customerName: string;
  readonly customerDocument: string;
  readonly pendencyType: FiscalPendencyType;
  readonly environment: 1 | 2;
  readonly model: '55' | '65';
  readonly originalDocumentId?: string | null;
  readonly originalDocumentNumber?: number | string | null;
  readonly originalDocumentClosure?: 'estornada' | 'cancelada' | null;
  readonly currentDocumentId?: string | null;
  readonly currentDocumentNumber?: number | string | null;
  readonly currentAttemptStatus?: string | null;
  readonly draftId?: string | null;
  readonly identifiedAt: string;
  readonly situationStatus: OrderFiscalBadgeStatus;
  readonly reason?: string | null;
  readonly actionKind: ReplacementPendingAction;
  readonly actionLabel: string;
  readonly actionIcon: string;
}

export interface FiscalPendenciesFilters {
  readonly pendencyType: 'all' | FiscalPendencyType;
  readonly situation: 'all' | OrderFiscalBadgeStatus;
  readonly environment: 'all' | '1' | '2';
  readonly model: 'all' | '55' | '65';
  readonly period: 'all' | 'today' | '7days' | '30days' | 'currentMonth' | 'custom';
  readonly customDateFrom?: string;
  readonly customDateTo?: string;
  readonly search: string;
}

export interface FiscalPendencyTypeConfig {
  readonly label: string;
  readonly description: string;
  readonly badgeClass: string;
  readonly icon: string;
  readonly defaultAction: {
    readonly kind: ReplacementPendingAction;
    readonly label: string;
    readonly icon: string;
  };
}

export const FISCAL_PENDENCY_TYPE_CONFIG: Record<FiscalPendencyType, FiscalPendencyTypeConfig> = {
  awaiting_new_invoice: {
    label: 'Nova emissão necessária',
    description: 'NF anterior já regularizada; pedido continua ativo e aguarda nova nota.',
    badgeClass: 'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    icon: 'bi-receipt',
    defaultAction: {
      kind: 'awaiting_new_invoice',
      label: 'Emitir nova NF',
      icon: 'bi-receipt',
    },
  },
  draft: {
    label: 'Rascunho pendente',
    description: 'Nova nota fiscal preparada, mas ainda não transmitida à SEFAZ.',
    badgeClass: 'border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
    icon: 'bi-pencil-square',
    defaultAction: {
      kind: 'draft',
      label: 'Continuar emissão',
      icon: 'bi-play-fill',
    },
  },
  rejected: {
    label: 'Emissão rejeitada',
    description: 'Nova nota fiscal foi rejeitada pela SEFAZ e necessita de correção cadastral/tributária.',
    badgeClass: 'border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
    icon: 'bi-x-octagon-fill',
    defaultAction: {
      kind: 'rejected',
      label: 'Corrigir emissão',
      icon: 'bi-wrench-adjustable',
    },
  },
  transmission_uncertain: {
    label: 'Transmissão incerta',
    description: 'Resultado da transmissão desconhecido; requer consulta e reconciliação com a SEFAZ.',
    badgeClass: 'border-orange-300 bg-orange-100 text-orange-950 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200',
    icon: 'bi-question-octagon-fill',
    defaultAction: {
      kind: 'transmission_uncertain',
      label: 'Consultar situação',
      icon: 'bi-arrow-repeat',
    },
  },
  prior_regularization_failed: {
    label: 'Regularização com erro',
    description: 'Falha ao estornar ou cancelar a nota anterior; bloqueia nova emissão até resolução.',
    badgeClass: 'border-red-400 bg-red-100 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
    icon: 'bi-exclamation-octagon-fill',
    defaultAction: {
      kind: 'prior_regularization_failed',
      label: 'Resolver regularização',
      icon: 'bi-exclamation-octagon-fill',
    },
  },
  prior_regularization_uncertain: {
    label: 'Regularização incerta',
    description: 'Resultado incerto do cancelamento ou estorno anterior na SEFAZ.',
    badgeClass: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
    icon: 'bi-question-circle-fill',
    defaultAction: {
      kind: 'prior_regularization_uncertain',
      label: 'Consultar regularização',
      icon: 'bi-arrow-repeat',
    },
  },
  processing: {
    label: 'Processamento em andamento',
    description: 'Fluxo fiscal iniciado e aguardando processamento da SEFAZ.',
    badgeClass: 'border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
    icon: 'bi-hourglass-split',
    defaultAction: {
      kind: 'processing',
      label: 'Ver processamento',
      icon: 'bi-hourglass-split',
    },
  },
};
