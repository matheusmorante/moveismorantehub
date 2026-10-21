import { describe, expect, it } from 'vitest';
import {
  isFiscalRegularizationBlockingStatus,
  resolveOrderFiscalBadgePair,
  type FiscalDocumentStatusRow,
  type FiscalOperationDraftStatusRow,
  type FiscalOrderEditReplacementRow,
  type OrderFiscalBadgeStatuses,
} from '../orderFiscalBadgeRules';

type Env = 1 | 2;
const ENVIRONMENTS: ReadonlyArray<{ env: Env; label: 'NF' | 'NFH'; authorized: string }> = [
  { env: 1, label: 'NF', authorized: 'autorizada' },
  { env: 2, label: 'NFH', authorized: 'homologada' },
];

const doc = (
  env: Env,
  id: string,
  status: string,
  createdAt: string,
  extra: Partial<FiscalDocumentStatusRow> = {}
): FiscalDocumentStatusRow => ({
  id,
  order_id: 'order-1',
  status,
  document_type: 'outbound',
  ambiente: env,
  created_at: createdAt,
  ...extra,
});

const estornoDraft = (
  env: Env,
  originalId: string,
  status: string,
  createdAt = '2026-10-20T11:00:00Z'
): FiscalOperationDraftStatusRow => ({
  id: `draft-${originalId}-${status}`,
  original_document_id: originalId,
  operation_kind: 'estorno',
  environment: env,
  status,
  created_at: createdAt,
});

const replacement = (
  env: Env,
  originalId: string,
  status: FiscalOrderEditReplacementRow['status'],
  kind: 'cancel' | 'estorno',
  replacementDocumentId: string | null = null
): FiscalOrderEditReplacementRow => ({
  original_document_id: originalId,
  environment: env,
  reversal_kind: kind,
  status,
  replacement_document_id: replacementDocumentId,
});

const statusOf = (pair: OrderFiscalBadgeStatuses, env: Env) =>
  env === 2 ? pair.homologation : pair.production;

describe.each(ENVIRONMENTS)('situação fiscal do pedido — $label', ({ env, authorized }) => {
  const original = doc(env, 'nf-1', authorized, '2026-10-20T10:00:00Z');

  it('NF autorizada sem pendências permanece verde (issued)', () => {
    const pair = resolveOrderFiscalBadgePair([original], [], false, Date.now(), []);
    expect(statusOf(pair, env)).toBe('issued');
  });

  it('pedido cancelado com estorno autorizado: roxo (reversed), sem exigir nova NF', () => {
    const pair = resolveOrderFiscalBadgePair(
      [original],
      [estornoDraft(env, 'nf-1', 'authorized')],
      true,
      Date.now(),
      [replacement(env, 'nf-1', 'ready_to_reissue', 'estorno')]
    );
    expect(statusOf(pair, env)).toBe('reversed');
  });

  it('pedido cancelado com NF formalmente cancelada: estado de cancelamento fiscal', () => {
    const cancelled = doc(env, 'nf-1', 'cancelada', '2026-10-20T10:00:00Z', {
      cancellationEventStatus: 'registered',
    });
    const pair = resolveOrderFiscalBadgePair([cancelled], [], true, Date.now(), []);
    expect(statusOf(pair, env)).toBe('cancelled');
  });

  it('edição com estorno autorizado e sem nova NF: amarelo (reissue_required)', () => {
    const pair = resolveOrderFiscalBadgePair(
      [original],
      [estornoDraft(env, 'nf-1', 'authorized')],
      false,
      Date.now(),
      [replacement(env, 'nf-1', 'ready_to_reissue', 'estorno')]
    );
    expect(statusOf(pair, env)).toBe('reissue_required');
    expect(env === 2 ? pair.homologationDocumentId : pair.productionDocumentId).toBe('nf-1');
  });

  it('edição com cancelamento fiscal autorizado e sem nova NF: amarelo', () => {
    const cancelled = doc(env, 'nf-1', 'cancelada', '2026-10-20T10:00:00Z', {
      cancellationEventStatus: 'registered',
    });
    const pair = resolveOrderFiscalBadgePair([cancelled], [], false, Date.now(), [
      replacement(env, 'nf-1', 'ready_to_reissue', 'cancel'),
    ]);
    expect(statusOf(pair, env)).toBe('reissue_required');
  });

  it('edição com nova NF autorizada: verde (issued)', () => {
    const next = doc(env, 'nf-2', authorized, '2026-10-20T12:00:00Z');
    const pair = resolveOrderFiscalBadgePair(
      [original, next],
      [estornoDraft(env, 'nf-1', 'authorized')],
      false,
      Date.now(),
      [replacement(env, 'nf-1', 'completed', 'estorno', 'nf-2')]
    );
    expect(statusOf(pair, env)).toBe('issued');
  });

  it('nova NF rejeitada após regularização concluída: mantém o alerta amarelo e aponta a nota rejeitada', () => {
    const rejected = doc(env, 'nf-2', 'rejeitada', '2026-10-20T12:00:00Z');
    const pair = resolveOrderFiscalBadgePair(
      [original, rejected],
      [estornoDraft(env, 'nf-1', 'authorized')],
      false,
      Date.now(),
      [replacement(env, 'nf-1', 'replacement_prepared', 'estorno')]
    );
    expect(statusOf(pair, env)).toBe('reissue_required');
    expect(env === 2 ? pair.homologationDocumentId : pair.productionDocumentId).toBe('nf-2');
  });

  it('edição com falha no estorno: erro de regularização e nova emissão bloqueada', () => {
    const pair = resolveOrderFiscalBadgePair(
      [original],
      [estornoDraft(env, 'nf-1', 'rejected')],
      false,
      Date.now(),
      [replacement(env, 'nf-1', 'awaiting_reversal', 'estorno')]
    );
    expect(statusOf(pair, env)).toBe('regularization_failed');
    expect(isFiscalRegularizationBlockingStatus(statusOf(pair, env))).toBe(true);
    expect(pair.readyToReissueHml).toBeUndefined();
    expect(pair.readyToReissueProd).toBeUndefined();
  });

  it.each(['transmitting', 'unknown'])(
    'estorno com resultado incerto (%s): pendência de reconciliação, sem nova emissão',
    (draftStatus) => {
      const pair = resolveOrderFiscalBadgePair(
        [original],
        [estornoDraft(env, 'nf-1', draftStatus)],
        false,
        Date.now(),
        [replacement(env, 'nf-1', 'awaiting_reversal', 'estorno')]
      );
      expect(statusOf(pair, env)).toBe('regularization_uncertain');
      expect(isFiscalRegularizationBlockingStatus(statusOf(pair, env))).toBe(true);
    }
  );

  it('cancelamento fiscal com resultado desconhecido: pendência de reconciliação', () => {
    const uncertain = doc(env, 'nf-1', authorized, '2026-10-20T10:00:00Z', {
      cancellationEventStatus: 'unknown',
    });
    const pair = resolveOrderFiscalBadgePair([uncertain], [], false, Date.now(), []);
    expect(statusOf(pair, env)).toBe('regularization_uncertain');
  });

  it('pedido cancelado com falha na regularização: erro (prioridade sobre o status comercial)', () => {
    const failed = doc(env, 'nf-1', authorized, '2026-10-20T10:00:00Z', {
      cancellationEventStatus: 'rejected',
    });
    const pair = resolveOrderFiscalBadgePair([failed], [], true, Date.now(), []);
    expect(statusOf(pair, env)).toBe('regularization_failed');
  });

  it('o status comercial sozinho não prova regularização: pedido cancelado com NF ativa e sem registro fiscal fica issued', () => {
    const pair = resolveOrderFiscalBadgePair([original], [], true, Date.now(), []);
    expect(statusOf(pair, env)).toBe('issued');
  });

  it('não presume edição: pedido ativo com NF estornada sem intenção de edição mantém o estado de estorno', () => {
    const pair = resolveOrderFiscalBadgePair(
      [original],
      [estornoDraft(env, 'nf-1', 'authorized')],
      false,
      Date.now(),
      []
    );
    expect(statusOf(pair, env)).toBe('reversed');
  });

  it('edição pendente de nova NF e depois cancelada comercialmente: resultado final sem nova emissão', () => {
    const pair = resolveOrderFiscalBadgePair(
      [original],
      [estornoDraft(env, 'nf-1', 'authorized')],
      true,
      Date.now(),
      [replacement(env, 'nf-1', 'ready_to_reissue', 'estorno')]
    );
    expect(statusOf(pair, env)).toBe('reversed');
  });

  it('um estorno rejeitado mais recente não rebaixa a regularização já confirmada por outro estorno autorizado', () => {
    const pair = resolveOrderFiscalBadgePair(
      [original],
      [
        estornoDraft(env, 'nf-1', 'authorized', '2026-10-20T11:00:00Z'),
        estornoDraft(env, 'nf-1', 'rejected', '2026-10-20T12:00:00Z'),
      ],
      false,
      Date.now(),
      [replacement(env, 'nf-1', 'ready_to_reissue', 'estorno')]
    );
    expect(statusOf(pair, env)).toBe('reissue_required');
  });

  it('reconhece regularização por documento de estorno autorizado diretamente na lista de documentos', () => {
    const estornoDoc: FiscalDocumentStatusRow = {
      id: 'estorno-1',
      order_id: 'order-1',
      status: authorized,
      document_type: 'estorno',
      ambiente: env,
      created_at: '2026-10-20T11:00:00Z',
      original_document_id: 'nf-1',
    };
    const pair = resolveOrderFiscalBadgePair(
      [original, estornoDoc],
      [],
      false,
      Date.now(),
      [replacement(env, 'nf-1', 'ready_to_reissue', 'estorno')]
    );
    expect(statusOf(pair, env)).toBe('reissue_required');
  });

  it('mantém pendência de nova emissão se a substituição não possui documento substituto persistido', () => {
    const pair = resolveOrderFiscalBadgePair(
      [original],
      [estornoDraft(env, 'nf-1', 'authorized')],
      false,
      Date.now(),
      [replacement(env, 'nf-1', 'completed', 'estorno', null)]
    );
    expect(statusOf(pair, env)).toBe('reissue_required');
  });
});

describe('isolamento entre ambientes', () => {
  it('pendência em homologação não altera o rótulo de produção', () => {
    const production = doc(1, 'nf-prod', 'autorizada', '2026-10-20T10:00:00Z');
    const hml = doc(2, 'nf-hml', 'homologada', '2026-10-20T10:00:00Z');
    const pair = resolveOrderFiscalBadgePair(
      [production, hml],
      [estornoDraft(2, 'nf-hml', 'authorized')],
      false,
      Date.now(),
      [replacement(2, 'nf-hml', 'ready_to_reissue', 'estorno')]
    );
    expect(pair.production).toBe('issued');
    expect(pair.homologation).toBe('reissue_required');
  });
});
